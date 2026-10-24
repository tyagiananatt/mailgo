import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

function getRedisConfig(): any {
  if (process.env.REDIS_URL) {
    try {
      const u = new URL(process.env.REDIS_URL);
      const isTls = u.protocol === 'rediss:';
      return {
        host: u.hostname,
        port: Number(u.port) || 6379,
        username: u.username ? decodeURIComponent(u.username) : undefined,
        password: u.password ? decodeURIComponent(u.password) : undefined,
        tls: isTls ? { rejectUnauthorized: false } : undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      };
    } catch {
      // Fallback to host/port
    }
  }

  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

export const redisConfig = getRedisConfig();

// Singleton Redis connection for general Redis operations (rate limiting, cache)
export const redisClient = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      ...(process.env.REDIS_URL.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {}),
    })
  : new Redis(redisConfig);

redisClient.on('connect', () => {
  console.log('✅ Redis connected successfully on', process.env.REDIS_URL ? 'Cloud URL' : `port ${redisConfig.port}`);
});

redisClient.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
});
