import axios from 'axios';
import prisma from '../db/prisma.js';

export interface RateLimitAlertData {
  senderEmail: string;
  hourlyLimit: number;
  currentCount: number;
  rescheduledTime: Date;
  emailSubject?: string;
  recipientEmail?: string;
}

export async function getActiveSlackIntegration() {
  const integration = await prisma.slackIntegration.findFirst({
    where: { isConnected: true },
    include: { user: true },
  });
  return integration;
}

export async function sendSlackMessage(webhookUrl: string, messagePayload: any): Promise<boolean> {
  try {
    await axios.post(webhookUrl, messagePayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    });
    return true;
  } catch (err: any) {
    console.error('❌ Failed to post message to Slack webhook:', err.response?.data || err.message);
    return false;
  }
}

export async function sendRateLimitSlackAlert(data: RateLimitAlertData): Promise<{ notified: boolean; reason?: string }> {
  try {
    const slackIntegration = await getActiveSlackIntegration();

    if (!slackIntegration || !slackIntegration.webhookUrl || !slackIntegration.isConnected) {
      // User hasn't connected Slack; do not crash, simply ignore
      return { notified: false, reason: 'Slack is not connected by user' };
    }

    const minutesRemaining = Math.max(1, Math.round((data.rescheduledTime.getTime() - Date.now()) / 60000));

    const payload = {
      text: `🚨 [ReachInbox] Rate limit exceeded for sender: ${data.senderEmail}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚨 Outreach Hourly Rate Limit Hit',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `The sender *${data.senderEmail}* has reached their configured hourly threshold. Subsequent emails have been safely deferred to prevent provider penalties.`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Sender Account:*\n\`${data.senderEmail}\``,
            },
            {
              type: 'mrkdwn',
              text: `*Hourly Limit:*\n\`${data.hourlyLimit} emails / hr\``,
            },
            {
              type: 'mrkdwn',
              text: `*Current Counter:*\n\`${data.currentCount}\``,
            },
            {
              type: 'mrkdwn',
              text: `*Next Send Window:*\n\`in ~${minutesRemaining} min (${data.rescheduledTime.toLocaleTimeString()})\``,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '🛡️ *Idempotency & Safety:* No emails were dropped. BullMQ has rescheduled this job to the top of the next hour window.',
            },
          ],
        },
      ],
    };

    const sent = await sendSlackMessage(slackIntegration.webhookUrl, payload);
    if (sent) {
      console.log(`🔔 Sent live Slack rate-limit alert for sender: ${data.senderEmail}`);
      return { notified: true };
    }
    return { notified: false, reason: 'Slack webhook HTTP call failed' };
  } catch (err: any) {
    console.error('❌ Error in sendRateLimitSlackAlert:', err.message);
    return { notified: false, reason: err.message };
  }
}

export async function sendTestSlackAlert(webhookUrl: string): Promise<boolean> {
  const payload = {
    text: '✅ [ReachInbox] Slack connection verified successfully!',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🎉 ReachInbox Slack Alert Connected!',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'This confirms your Slack channel is hooked up to the ReachInbox Email Scheduler. When an hourly email rate limit is hit, you will receive an instant notification here.',
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Sent at ${new Date().toLocaleString()}`,
          },
        ],
      },
    ],
  };

  return sendSlackMessage(webhookUrl, payload);
}
