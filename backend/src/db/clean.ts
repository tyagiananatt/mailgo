import prisma from './prisma.js';
import { Client } from '@elastic/elasticsearch';
import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

async function clean() {
  console.log('🧹 Purging all demo data from database...');

  const deletedEmails = await prisma.email.deleteMany({});
  console.log(`🗑️ Deleted ${deletedEmails.count} email records.`);

  const deletedRateLimits = await prisma.rateLimitLog.deleteMany({});
  console.log(`🗑️ Deleted ${deletedRateLimits.count} rate limit logs.`);

  const deletedSlack = await prisma.slackIntegration.deleteMany({});
  console.log(`🗑️ Deleted ${deletedSlack.count} Slack integrations.`);

  const deletedSenders = await prisma.senderAccount.deleteMany({});
  console.log(`🗑️ Deleted ${deletedSenders.count} sender accounts.`);

  const deletedUsers = await prisma.user.deleteMany({});
  console.log(`🗑️ Deleted ${deletedUsers.count} users.`);

  // Clean Elasticsearch if running
  try {
    const esNode = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';
    const esIndex = process.env.ELASTICSEARCH_INDEX || 'emails';
    const es = new Client({ node: esNode, requestTimeout: 2000 });
    const exists = await es.indices.exists({ index: esIndex });
    if (exists) {
      await es.indices.delete({ index: esIndex });
      console.log(`🗑️ Deleted Elasticsearch index '${esIndex}'.`);
    }
  } catch (err: any) {
    console.log(`ℹ️ Elasticsearch: ${err.message}`);
  }

  // Clean Redis queue keys if running
  try {
    const redisHost = process.env.REDIS_HOST || '127.0.0.1';
    const redisPort = Number(process.env.REDIS_PORT) || 6379;
    const redis = new Redis({
      host: redisHost,
      port: redisPort,
      connectTimeout: 2000,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    await redis.connect();
    const keys = await redis.keys('bull:email-queue:*');
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`🗑️ Deleted ${keys.length} BullMQ Redis queue keys.`);
    }
    await redis.quit();
  } catch (err: any) {
    console.log(`ℹ️ Redis: ${err.message}`);
  }

  console.log('✅ All demo data successfully purged!');
}

clean()
  .catch((e) => {
    console.error('❌ Clean error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
