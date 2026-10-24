import { Queue, JobsOptions } from 'bullmq';
import { redisConfig } from '../config/redis.js';

export const EMAIL_QUEUE_NAME = 'email-queue';

export interface EmailJobData {
  emailId: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  scheduledAt: string;
  delaySeconds: number;
  hourlyLimit: number;
}

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

export async function addEmailJob(data: EmailJobData, delayMs?: number) {
  const scheduledTime = new Date(data.scheduledAt).getTime();
  const calculatedDelay = delayMs !== undefined ? delayMs : Math.max(0, scheduledTime - Date.now());

  const jobOptions: JobsOptions = {
    jobId: data.emailId, // Guarantees idempotency
    delay: calculatedDelay,
  };

  const job = await emailQueue.add('send-email', data, jobOptions);
  console.log(`⏱️ Queued email [${data.emailId}] with delay of ${calculatedDelay}ms (Job ID: ${job.id})`);
  return job;
}

export async function addBulkEmailJobs(emails: EmailJobData[]) {
  const now = Date.now();
  const jobs = emails.map((email) => {
    const scheduledTime = new Date(email.scheduledAt).getTime();
    const delay = Math.max(0, scheduledTime - now);

    return {
      name: 'send-email',
      data: email,
      opts: {
        jobId: email.emailId,
        delay,
      },
    };
  });

  const addedJobs = await emailQueue.addBulk(jobs);
  console.log(`📦 Bulk queued ${addedJobs.length} email jobs into BullMQ.`);
  return addedJobs;
}
