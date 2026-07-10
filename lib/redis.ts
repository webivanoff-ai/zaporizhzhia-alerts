import Redis from 'ioredis';

function createRedisClient() {
  if (!process.env.UPSTASH_REDIS_URL || !process.env.UPSTASH_REDIS_TOKEN) {
    throw new Error('Upstash Redis credentials not configured');
  }

  return new Redis({
    host: process.env.UPSTASH_REDIS_URL,
    port: 443,
    password: process.env.UPSTASH_REDIS_TOKEN,
    tls: {},
    maxRetriesPerRequest: 3,
  });
}

const globalForRedis = global as unknown as { redis: Redis };

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}