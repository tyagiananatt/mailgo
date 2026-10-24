import { Worker, Job } from 'bullmq';
import { redisConfig, redisClient } from '../config/redis.js';
import { EMAIL_QUEUE_NAME, EmailJobData, addEmailJob } from './emailQueue.js';
import prisma from '../db/prisma.js';
import { sendMail } from '../services/smtpService.js';
import { updateEmailStatusInElastic } from '../services/elasticService.js';
import { sendRateLimitSlackAlert } from '../services/slackService.js';

const concurrency = Number(process.env.WORKER_CONCURRENCY) || 5;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getCurrentHourWindow(date: Date = new Date()): string {
  // Returns e.g. "2026-10-24T01"
  return date.toISOString().substring(0, 13);
}

export function getNextHourWindowTime(date: Date = new Date()): Date {
  const next = new Date(date);
  next.setHours(next.getHours() + 1, 0, 0, 0);
  return next;
}

export function createEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { emailId, senderEmail, delaySeconds, hourlyLimit } = job.data;
      console.log(`\n⚙️ [Worker] Processing job ${job.id} for email ${emailId} (Sender: ${senderEmail})`);

      // 1. Fetch email record from DB and verify idempotency
      const emailRecord = await prisma.email.findUnique({
        where: { id: emailId },
      });

      if (!emailRecord) {
        console.warn(`⚠️ [Worker] Email record ${emailId} not found in DB. Skipping.`);
        return { status: 'skipped', reason: 'record_not_found' };
      }

      if (emailRecord.status === 'SENT') {
        console.log(`ℹ️ [Worker] Email ${emailId} was already sent. Skipping to prevent duplicate send.`);
        return { status: 'already_sent' };
      }

      if (emailRecord.status === 'CANCELLED') {
        console.log(`ℹ️ [Worker] Email ${emailId} is cancelled. Skipping.`);
        return { status: 'cancelled' };
      }

      // 2. Atomic Rate Limit Check per sender per hour window
      const hourWindow = getCurrentHourWindow();
      const rateLimitKey = `email_rate:${senderEmail}:${hourWindow}`;

      const currentCount = await redisClient.incr(rateLimitKey);
      if (currentCount === 1) {
        await redisClient.expire(rateLimitKey, 7200); // 2 hour TTL
      }

      const effectiveHourlyLimit = emailRecord.hourlyLimit || hourlyLimit || Number(process.env.DEFAULT_HOURLY_LIMIT) || 100;

      if (currentCount > effectiveHourlyLimit) {
        // Roll back the counter since this email wasn't actually sent
        await redisClient.decr(rateLimitKey);

        const nextHour = getNextHourWindowTime();
        const delayToNextHour = nextHour.getTime() - Date.now() + Math.floor(Math.random() * 2000); // add small jitter

        console.warn(`🚨 [Worker] Sender ${senderEmail} exceeded hourly limit (${effectiveHourlyLimit}/hr). Current count: ${currentCount - 1}.`);
        console.log(`⏳ Deferring email ${emailId} to next window at ${nextHour.toISOString()} (delay: ${delayToNextHour}ms).`);

        // Update DB record
        await prisma.email.update({
          where: { id: emailId },
          data: {
            scheduledAt: nextHour,
            errorMessage: `Hourly rate limit exceeded (${effectiveHourlyLimit}/hr). Deferred to ${nextHour.toLocaleTimeString()}.`,
          },
        });

        // Record Rate Limit Log
        await prisma.rateLimitLog.upsert({
          where: {
            senderEmail_hourWindow: {
              senderEmail,
              hourWindow,
            },
          },
          update: {
            count: effectiveHourlyLimit,
            alertedSlack: true,
          },
          create: {
            senderEmail,
            hourWindow,
            count: effectiveHourlyLimit,
            alertedSlack: true,
          },
        });

        // Trigger Slack Notification
        await sendRateLimitSlackAlert({
          senderEmail,
          hourlyLimit: effectiveHourlyLimit,
          currentCount: effectiveHourlyLimit,
          rescheduledTime: nextHour,
          emailSubject: emailRecord.subject,
          recipientEmail: emailRecord.recipientEmail,
        });

        // Reschedule job into BullMQ for the next hour window
        await addEmailJob(
          {
            ...job.data,
            scheduledAt: nextHour.toISOString(),
          },
          delayToNextHour
        );

        return {
          status: 'rate_limited_and_rescheduled',
          rescheduledTo: nextHour.toISOString(),
        };
      }

      // 3. Under rate limit: Proceed to send via Ethereal SMTP
      try {
        let attachments: any[] | undefined = undefined;
        if (emailRecord.metadata) {
          try {
            const parsed = JSON.parse(emailRecord.metadata);
            if (Array.isArray(parsed.attachments)) {
              attachments = parsed.attachments;
            }
          } catch {
            // Ignore parse errors
          }
        }

        const sendResult = await sendMail({
          from: emailRecord.senderEmail,
          to: emailRecord.recipientEmail,
          subject: emailRecord.subject,
          body: emailRecord.body,
          attachments,
        });

        const sentAt = new Date();

        // 4. Update Database
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'SENT',
            sentAt,
            messageId: sendResult.messageId,
            previewUrl: sendResult.previewUrl,
            errorMessage: null,
          },
        });

        // 5. Update Elasticsearch
        await updateEmailStatusInElastic(emailId, 'SENT', sentAt);

        // 6. Apply configurable delay throttle between email sends
        const interEmailDelaySeconds = emailRecord.delaySeconds || delaySeconds || Number(process.env.DEFAULT_DELAY_BETWEEN_EMAILS_SECONDS) || 2;
        if (interEmailDelaySeconds > 0) {
          console.log(`⏱️ Throttling worker for ${interEmailDelaySeconds}s before next send...`);
          await sleep(interEmailDelaySeconds * 1000);
        }

        return {
          status: 'sent',
          messageId: sendResult.messageId,
          previewUrl: sendResult.previewUrl,
        };
      } catch (sendError: any) {
        console.error(`❌ [Worker] Failed to send email ${emailId}:`, sendError.message);

        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'FAILED',
            errorMessage: sendError.message,
            retryCount: { increment: 1 },
          },
        });

        await updateEmailStatusInElastic(emailId, 'FAILED');
        throw sendError; // Triggers BullMQ retry backoff
      }
    },
    {
      connection: redisConfig,
      concurrency,
    }
  );

  worker.on('completed', (job: Job) => {
    console.log(`✅ [Worker] Job ${job.id} completed successfully.`);
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(`💥 [Worker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
