import { Request, Response } from 'express';
import prisma from '../db/prisma.js';
import { addEmailJob, addBulkEmailJobs } from '../queues/emailQueue.js';
import { indexEmailInElastic, searchEmails } from '../services/elasticService.js';
import { z } from 'zod';

const ScheduleEmailSchema = z.object({
  senderEmail: z.string().email(),
  recipients: z.array(z.string().email()).min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  scheduledAt: z.string().optional(),
  delaySeconds: z.number().int().min(0).default(2),
  hourlyLimit: z.number().int().min(1).default(100),
  attachments: z.array(z.any()).optional(),
});

export async function scheduleEmail(req: Request, res: Response) {
  try {
    const parseResult = ScheduleEmailSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: parseResult.error.format() });
    }

    const {
      senderEmail,
      recipients,
      subject,
      body,
      scheduledAt,
      delaySeconds,
      hourlyLimit,
      attachments,
    } = parseResult.data;

    // Find or create sender account
    let sender = await prisma.senderAccount.findUnique({
      where: { email: senderEmail },
    });

    if (!sender) {
      const name = senderEmail.split('@')[0].replace(/[._]/g, ' ');
      sender = await prisma.senderAccount.create({
        data: {
          email: senderEmail,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          isDefault: false,
        },
      });
    }

    const targetScheduledDate = scheduledAt ? new Date(scheduledAt) : new Date();
    const metadataString = attachments && attachments.length > 0 ? JSON.stringify({ attachments }) : null;

    const createdEmails = [];
    const jobsToQueue = [];

    // Create DB records & queue jobs
    for (const recipient of recipients) {
      const emailRecord = await prisma.email.create({
        data: {
          senderId: sender.id,
          senderEmail: sender.email,
          recipientEmail: recipient,
          subject,
          body,
          status: 'SCHEDULED',
          scheduledAt: targetScheduledDate,
          delaySeconds,
          hourlyLimit,
          metadata: metadataString,
        },
      });

      createdEmails.push(emailRecord);

      // Index in Elasticsearch
      await indexEmailInElastic({
        id: emailRecord.id,
        senderId: sender.id,
        senderEmail: sender.email,
        recipientEmail: recipient,
        subject,
        body,
        status: 'SCHEDULED',
        scheduledAt: targetScheduledDate,
        createdAt: emailRecord.createdAt,
      });

      jobsToQueue.push({
        emailId: emailRecord.id,
        senderEmail: sender.email,
        recipientEmail: recipient,
        subject,
        scheduledAt: targetScheduledDate.toISOString(),
        delaySeconds,
        hourlyLimit,
      });
    }

    // Add to BullMQ
    if (jobsToQueue.length === 1) {
      await addEmailJob(jobsToQueue[0]);
    } else {
      await addBulkEmailJobs(jobsToQueue);
    }

    return res.status(201).json({
      success: true,
      count: createdEmails.length,
      emails: createdEmails,
    });
  } catch (err: any) {
    console.error('❌ Error scheduling email:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
}

export async function parseCsvLeads(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please upload a CSV or TXT file.' });
    }

    const content = req.file.buffer.toString('utf-8');
    // Extract emails using strict email regex
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = content.match(emailRegex) || [];

    // Deduplicate emails
    const uniqueEmails = Array.from(new Set(matches.map((e) => e.toLowerCase().trim())));

    return res.json({
      success: true,
      count: uniqueEmails.length,
      emails: uniqueEmails,
    });
  } catch (err: any) {
    console.error('❌ Error parsing leads file:', err);
    return res.status(500).json({ error: 'Failed to parse file', message: err.message });
  }
}

export async function getEmails(req: Request, res: Response) {
  try {
    const { status, query, senderEmail, page, limit } = req.query;

    const result = await searchEmails({
      status: status as string,
      query: query as string,
      senderEmail: senderEmail as string,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });

    return res.json(result);
  } catch (err: any) {
    console.error('❌ Error fetching emails:', err);
    return res.status(500).json({ error: 'Failed to fetch emails', message: err.message });
  }
}

export async function getEmailById(req: Request, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const email = await prisma.email.findUnique({
      where: { id },
      include: { sender: true },
    });

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    return res.json(email);
  } catch (err: any) {
    console.error('❌ Error fetching email by id:', err);
    return res.status(500).json({ error: 'Failed to fetch email', message: err.message });
  }
}

export async function cancelScheduledEmail(req: Request, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const email = await prisma.email.findUnique({ where: { id } });

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    if (email.status !== 'SCHEDULED') {
      return res.status(400).json({ error: `Cannot cancel email with status '${email.status}'` });
    }

    const updated = await prisma.email.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return res.json({ success: true, email: updated });
  } catch (err: any) {
    console.error('❌ Error cancelling email:', err);
    return res.status(500).json({ error: 'Failed to cancel email', message: err.message });
  }
}

export async function getStats(req: Request, res: Response) {
  try {
    const [scheduledCount, sentCount, failedCount] = await Promise.all([
      prisma.email.count({ where: { status: 'SCHEDULED' } }),
      prisma.email.count({ where: { status: 'SENT' } }),
      prisma.email.count({ where: { status: 'FAILED' } }),
    ]);

    return res.json({
      scheduledCount,
      sentCount,
      failedCount,
    });
  } catch (err: any) {
    console.error('❌ Error fetching stats:', err);
    return res.status(500).json({ error: 'Failed to fetch stats', message: err.message });
  }
}

export async function getSenders(req: Request, res: Response) {
  try {
    let senders = await prisma.senderAccount.findMany({
      orderBy: { isDefault: 'desc' },
    });

    if (senders.length === 0) {
      const users = await prisma.user.findMany();
      for (const u of users) {
        const sender = await prisma.senderAccount.upsert({
          where: { email: u.email },
          update: {},
          create: {
            email: u.email,
            name: u.name,
            isDefault: true,
          },
        });
        senders.push(sender);
      }
    }

    return res.json(senders);
  } catch (err: any) {
    console.error('❌ Error fetching senders:', err);
    return res.status(500).json({ error: 'Failed to fetch senders', message: err.message });
  }
}
