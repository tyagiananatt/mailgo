import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { emailQueue } from './queues/emailQueue.js';
import { createEmailWorker } from './queues/emailWorker.js';
import { reconcilePendingEmails } from './queues/reconciliation.js';
import { initElasticsearch } from './services/elasticService.js';
import { getTransporter } from './services/smtpService.js';

import emailRoutes from './routes/emailRoutes.js';
import slackRoutes from './routes/slackRoutes.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// 1. Setup Bull-Board for Real-Time Queue Monitoring
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

// 2. Health & Status Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'reachinbox-email-scheduler',
    timestamp: new Date().toISOString(),
    bullBoardUrl: `http://localhost:${PORT}/admin/queues`,
  });
});

// 3. API Routes
app.use('/api/emails', emailRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/auth', authRoutes);

// 4. Start Server, Initialize Services, and Workers
async function bootstrap() {
  try {
    // Initialize Ethereal SMTP transporter
    await getTransporter();

    // Initialize Elasticsearch
    await initElasticsearch();

    // Start Worker
    const worker = createEmailWorker();
    console.log(`👷 BullMQ worker started with concurrency ${process.env.WORKER_CONCURRENCY || 5}`);

    // Reconcile pending emails in DB to guarantee restart persistence
    await reconcilePendingEmails();

    app.listen(PORT, () => {
      console.log(`\n🚀 Server listening on port ${PORT}`);
      console.log(`📊 Bull-Board Dashboard: http://localhost:${PORT}/admin/queues`);
      console.log(`📬 API Endpoints: http://localhost:${PORT}/api/emails`);
    });
  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
