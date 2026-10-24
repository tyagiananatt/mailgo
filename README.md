# MailGo — Production-Grade Distributed Email Scheduler & Dashboard 🚀

A distributed email scheduler service and interactive management dashboard built with **TypeScript**, **Node.js/Express**, **BullMQ**, **Redis**, **Prisma ORM**, **Ethereal Fake SMTP**, and **React (Vite + Tailwind CSS)**.

Designed to handle high-throughput email queuing, custom delayed scheduling, concurrency control, per-sender rate limiting, server crash recovery, and live monitoring.

---

## 📑 Table of Contents
- [Tech Stack](#-tech-stack)
- [Architecture Overview](#-architecture-overview)
  - [1. How Scheduling Works (No Cron!)](#1-how-scheduling-works-no-cron)
  - [2. Persistence & Crash Recovery on Restart](#2-persistence--crash-recovery-on-restart)
  - [3. Rate Limiting, Delay & Concurrency](#3-rate-limiting-delay--concurrency)
  - [4. Idempotency & Fault Tolerance](#4-idempotency--fault-tolerance)
- [Features Implemented](#-features-implemented)
  - [Backend Features](#backend-features)
  - [Frontend Features](#frontend-features)
- [Environment Variables Setup](#-environment-variables-setup)
- [How to Set Up Ethereal Email](#-how-to-set-up-ethereal-email)
- [How to Run the Backend](#-how-to-run-the-backend)
- [How to Run the Frontend](#-how-to-run-the-frontend)
- [Queue Monitoring (Bull-Board)](#-queue-monitoring-bull-board)
- [Slack Rate-Limit Alerting](#-slack-rate-limit-alerting)

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Backend Framework** | Node.js, Express.js, TypeScript |
| **Task Queue & Delayed Jobs** | BullMQ, Redis (Sorted Sets `ZSET`) |
| **Database & ORM** | Prisma ORM, SQLite (`file:./dev.db`) / PostgreSQL ready |
| **SMTP Provider** | Ethereal Email (Fake SMTP sandbox with web preview URLs) |
| **Search Engine** | Elasticsearch client with seamless DB fallback |
| **Alerting** | Slack Incoming Webhooks & OAuth Block Kit |
| **Queue Monitoring** | Bull-Board UI (`@bull-board/express`) |
| **Frontend UI** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons |

---

## 🏗 Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │              React UI                  │
                      │  (Vite + TypeScript + Tailwind CSS)    │
                      └──────────────────┬─────────────────────┘
                                         │ REST API / Auth
                                         ▼
                      ┌────────────────────────────────────────┐
                      │           Express.js Server            │
                      │       (TypeScript + Prisma ORM)        │
                      └──────────┬──────────────────┬──────────┘
                                 │                  │
                1. Save & Verify │                  │ 2. Enqueue Job
                                 ▼                  ▼
                    ┌─────────────────┐    ┌─────────────────┐
                    │  SQLite / DB    │    │  Redis + BullMQ │
                    │ (Prisma Models) │    │  (Delayed ZSET) │
                    └─────────────────┘    └────────┬────────┘
                                                    │
                                                    │ 3. Worker Pop (Concurrency: 5)
                                                    ▼
                                           ┌─────────────────┐
                                           │  BullMQ Worker  │
                                           │  Rate Limiter   │
                                           └────────┬────────┘
                                                    │
                           ┌────────────────────────┴────────────────────────┐
                           ▼                                                 ▼
                ┌──────────────────────┐                          ┌──────────────────────┐
                │  Ethereal Fake SMTP  │                          │  Slack Webhook Alert │
                │ (Generated Web View) │                          │ (Hourly Limit Hit)   │
                └──────────────────────┘                          └──────────────────────┘
```

### 1. How Scheduling Works (No Cron!)
- **Why No Cron?** Traditional cron mechanisms (`node-cron`, `agenda`) poll every minute, causing database read pressure, clock drift (up to 59s lag), and race conditions across multiple server instances.
- **The BullMQ Solution**: BullMQ leverages **Redis Sorted Sets (`ZSET`)** where job execution timestamps serve as scores. When a job's scheduled timestamp arrives, Redis instantly pops the job and triggers the event for exactly one worker with sub-millisecond precision.
- **Immediate vs. Scheduled**:
  - Immediate send: Job is queued with `delay = 0` (or minimal buffer) and dispatched right away.
  - Scheduled send: Job is queued with `delay = max(0, scheduledAt - now)` and waits in Redis until that exact timestamp.

### 2. Persistence & Crash Recovery on Restart
- **Dual-Layer Durability**: Every scheduled email is committed to the relational database (`Email` table with status `SCHEDULED`) **before** being passed to Redis.
- **Reconciliation on Boot**:
  - When the server boots (or recovers from a crash/restart), the reconciliation service (`reconcilePendingEmails()`) automatically queries the database for all records with `status: 'SCHEDULED'`.
  - It cross-checks Redis: if the job is missing from the queue, it recalculates the remaining delay (`max(0, scheduledAt - Date.now())`) and re-enqueues it into BullMQ.
  - If the scheduled time has already passed while the server was down, the delay is `0` and it executes immediately.

### 3. Rate Limiting, Delay & Concurrency
- **Worker Concurrency**: Set via `WORKER_CONCURRENCY=5` in `.env`. The BullMQ worker processes up to 5 jobs simultaneously across async worker threads without blocking the event loop.
- **Inter-Email Delay Throttle**: A configurable delay between individual email dispatches (default `2 seconds`, adjustable per batch). This throttles outgoing bursts, preventing provider anti-spam triggers.
- **Per-Sender Hourly Rate Limiting**:
  - Uses atomic Redis counters keyed by `email_rate:{senderEmail}:{YYYY-MM-DD-HH}` with an automatic 2-hour TTL.
  - Thread-safe across multiple instances via atomic Redis `INCR`.
  - **Zero Job Dropping (Automatic Rescheduling)**:
    - If `currentCount > hourlyLimit`, the email is **never** dropped or marked failed.
    - The worker calculates the milliseconds remaining until the top of the next hour window (`nextHour = new Date(); nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0)`).
    - It reschedules the job in BullMQ to fire at the beginning of the next hour.
    - Dispatches a Slack alert notifying administrators that the sender reached their limit and has been deferred.

### 4. Idempotency & Fault Tolerance
- Every queued job has its `jobId` explicitly set to `emailRecord.id`.
- Before sending, the worker performs an atomic DB query to ensure the status is still `SCHEDULED`.
- If an email has already been marked `SENT` or `CANCELLED`, the worker skips execution.
- Failed attempts automatically retry up to 3 times with exponential backoff (`delay: 5000ms`).

---

## 🌟 Features Implemented

### Backend Features
- [x] **BullMQ + Redis Job Queue**: Sub-millisecond delayed jobs without cron polling.
- [x] **Crash Recovery & Reconciliation**: Auto-resumes pending scheduled jobs on server reboot.
- [x] **Concurrency Management**: Configurable concurrent workers (`WORKER_CONCURRENCY=5`).
- [x] **Inter-Email Delay Throttle**: Per-batch / per-job delay (default 2s) between sends.
- [x] **Hourly Rate Limiter**: Per-sender atomic hourly limit with rollover rescheduling.
- [x] **Slack Rate-Limit Alerting**: Dispatches Slack Block Kit alerts when limits are exceeded.
- [x] **Ethereal Fake SMTP Integration**: Automatically captures emails in sandbox inboxes and provides preview URLs.
- [x] **Full-Text Search Engine**: Elasticsearch client with automatic relational DB query fallback.
- [x] **Google OAuth 2.0 & Session Auth**: Secure login with automatic sender profile creation.
- [x] **Leads File Parser**: Accepts CSV/TXT files via multipart upload or regex parsing for bulk recipient imports.
- [x] **Bull-Board Live UI**: Web dashboard at `/admin/queues` for inspecting Redis queues in real-time.
- [x] **Database Purge Tool**: Built-in `npm run clean` to wipe demo/test data.

### Frontend Features
- [x] **Authentication Page**: Google Sign-In and email/password login.
- [x] **Navigation Sidebar**: Brand identity (`A.T`), dynamic user avatar & initial, live counters for Scheduled and Sent emails, Slack integration shortcut, and Bull-Board link.
- [x] **Scheduled & Sent Email Tables**: Tabbed inbox views with status badges, recipient email tags, subject previews, timestamps, and search filtering.
- [x] **Detail Email View**: Email reader with back navigation, sender metadata, attachment previews, and **"View on Ethereal"** external link.
- [x] **Compose Modal (Figma Match)**:
  - **Top Actions**: Paperclip attachment button, Clock scheduler button, and green outline Send pill.
  - **Send Later Popover**: Opens below the clock icon with "Pick date & time", "Tomorrow" preset, Cancel, and Done buttons.
  - **Immediate vs. Scheduled Toggle**: Main button dynamically displays **"Send"** (immediate dispatch) or **"Send Later"** (scheduled dispatch).
  - **Lead List Upload**: Button to import recipients directly from CSV or TXT files.
  - **Multi-Recipient Input**: Add recipients via tags, with easy removal and keyboard shortcuts.
  - **Rich Formatting Toolbar**: Bold, italic, underline, strike, alignment, ordered/bullet lists, quotes, and links.
- [x] **Slack Configuration Modal**: Configure webhook URL with test notification trigger.
- [x] **Live Queue Monitor Modal**: Real-time modal displaying active, waiting, delayed, and completed job counts.

---

## 🔑 Environment Variables Setup

Create a `.env` file in the `backend/` directory (you can copy `backend/.env.example`):

```bash
cp backend/.env.example backend/.env
```

### Configuration Reference (`backend/.env`):

```env
# Server
PORT=5000
NODE_ENV=development

# Database (Local SQLite default, zero-config)
DATABASE_URL="file:./dev.db"

# Redis (BullMQ Queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Scheduler & Concurrency
WORKER_CONCURRENCY=5
DEFAULT_DELAY_BETWEEN_EMAILS_SECONDS=2
DEFAULT_HOURLY_LIMIT=100

# Elasticsearch (Optional - defaults to DB search if disabled)
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_INDEX=emails

# Ethereal Email (Leave blank to auto-generate a disposable testing account)
ETHEREAL_USER=
ETHEREAL_PASS=

# Slack Integration (Optional for rate-limit notifications)
SLACK_WEBHOOK_URL=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_REDIRECT_URI=http://localhost:5000/api/slack/callback

# Google OAuth 2.0 (For Google Sign-In)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
```

---

## 📧 How to Set Up Ethereal Email

Ethereal is a fake SMTP service created by Nodemailer for testing email applications safely without sending spam to real email addresses.

### Automatic Setup (Default - No Setup Required!)
If you leave `ETHEREAL_USER` and `ETHEREAL_PASS` empty in `backend/.env`:
1. When the backend starts, Nodemailer will automatically create a temporary Ethereal testing account on the fly.
2. Credentials will be logged to the console:
   ```
   📬 Created disposable Ethereal test account: xyz@ethereal.email
   ```
3. Whenever an email is sent, a unique **preview URL** is generated:
   ```
   Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
   ```
4. You can click this link in your terminal or in the frontend Email Detail view to view the rendered email in your browser!

### Custom Ethereal Account (Optional)
If you want persistent inbox history:
1. Go to [https://ethereal.email/create](https://ethereal.email/create).
2. Copy the generated **Email address** and **Password**.
3. Paste them into `backend/.env`:
   ```env
   ETHEREAL_USER=your_generated_email@ethereal.email
   ETHEREAL_PASS=your_generated_password
   ```

---

## 🖥️ How to Run the Backend

### Prerequisites
- Node.js (v18+)
- Redis running on port `6379`

You can start Redis using Docker:
```bash
docker run -d --name email-redis -p 6379:6379 redis:alpine
```
*(Or use `docker-compose up -d redis` from the project root)*

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Initialize Database
```bash
npx prisma db push
```

*(Optional: Run `npm run clean` at any time to purge existing test emails and queues)*

### Step 3: Start the Backend Server & Worker
```bash
npm run dev
```

The backend server, BullMQ queue, and worker will start concurrently on:
```
http://localhost:5000
```

---

## 💻 How to Run the Frontend

### Step 1: Install Dependencies
In a new terminal window:
```bash
cd frontend
npm install
```

### Step 2: Start Vite Dev Server
```bash
npm run dev
```

The React frontend will be accessible at:
```
http://localhost:3000
```

---

## 📊 Queue Monitoring (Bull-Board)

You can monitor the live BullMQ Redis queues, active jobs, delayed schedules, and failed jobs via the embedded **Bull-Board UI**:

1. Start the backend.
2. Open your browser and navigate to:
   ```
   http://localhost:5000/admin/queues
   ```
3. You can inspect:
   - **Delayed**: Emails scheduled for future delivery.
   - **Active**: Emails currently being processed by the worker.
   - **Completed**: Successfully delivered emails with their Ethereal preview URLs.
   - **Failed**: Any retried or failed jobs.

---

## 🔔 Slack Rate-Limit Alerting

To receive Slack alerts when a sender exceeds their hourly rate limit:

1. Create a free Slack Incoming Webhook at [https://api.slack.com/apps](https://api.slack.com/apps).
2. In the dashboard sidebar, click **Slack Alerting** (or set `SLACK_WEBHOOK_URL` in `backend/.env`).
3. Paste your Webhook URL and click **Save & Test Connection**.
4. When any sender hits the rate limit (e.g. >100 emails/hour), an alert is instantly posted to your Slack channel!
