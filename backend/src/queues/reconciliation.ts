import prisma from '../db/prisma.js';
import { emailQueue, addEmailJob } from './emailQueue.js';

export async function reconcilePendingEmails(): Promise<void> {
  console.log('🔄 [Reconciliation] Checking database for pending scheduled emails...');

  try {
    const scheduledEmails = await prisma.email.findMany({
      where: { status: 'SCHEDULED' },
    });

    console.log(`📊 [Reconciliation] Found ${scheduledEmails.length} pending scheduled emails in DB.`);

    let restoredCount = 0;
    const now = Date.now();

    for (const email of scheduledEmails) {
      // Check if job already exists in BullMQ
      const existingJob = await emailQueue.getJob(email.id);

      if (!existingJob) {
        const scheduledTime = new Date(email.scheduledAt).getTime();
        const delayMs = Math.max(0, scheduledTime - now);

        await addEmailJob(
          {
            emailId: email.id,
            senderEmail: email.senderEmail,
            recipientEmail: email.recipientEmail,
            subject: email.subject,
            scheduledAt: email.scheduledAt.toISOString(),
            delaySeconds: email.delaySeconds,
            hourlyLimit: email.hourlyLimit,
          },
          delayMs
        );

        restoredCount++;
        console.log(`   ✨ Restored job for email ${email.id} (due in ${Math.round(delayMs / 1000)}s)`);
      }
    }

    if (restoredCount > 0) {
      console.log(`✅ [Reconciliation] Successfully restored ${restoredCount} jobs into BullMQ.`);
    } else {
      console.log('✅ [Reconciliation] All scheduled emails are already properly queued in BullMQ.');
    }
  } catch (err: any) {
    console.error('❌ [Reconciliation] Error reconciling pending emails:', err.message);
  }
}
