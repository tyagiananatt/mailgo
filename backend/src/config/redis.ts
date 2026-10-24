import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
};

// Singleton Redis connection for general Redis operations (rate limiting, cache)
export const redisClient = new Redis(redisConfig);

redisClient.on('connect', () => {
  console.log('✅ Redis connected successfully on port', redisConfig.port);
});

redisClient.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
});
