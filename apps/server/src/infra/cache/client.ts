// Cache client - Redis

import Redis from "ioredis";
import { env } from "../env";

// Separate Redis connection for cache (not shared with queue)
export const cacheRedis = new Redis(env.REDIS_URL, {
  keyPrefix: `px:${env.APP_VERSION}:`,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Get a value
export async function get(key: string): Promise<string | null> {
  return cacheRedis.get(key);
}

// Set a value with optional TTL
export async function set(
  key: string,
  value: string,
  ttlSeconds?: number,
): Promise<void> {
  if (ttlSeconds) {
    await cacheRedis.setex(key, ttlSeconds, value);
  } else {
    await cacheRedis.set(key, value);
  }
}

// Delete a key
export async function del(key: string): Promise<void> {
  await cacheRedis.del(key);
}

// Check if key exists
export async function exists(key: string): Promise<boolean> {
  const result = await cacheRedis.exists(key);
  return result === 1;
}

// Get multiple keys
export async function mget(keys: string[]): Promise<(string | null)[]> {
  return cacheRedis.mget(...keys);
}

// Set multiple keys
export async function mset(
  items: Array<{ key: string; value: string; ttlSeconds?: number }>,
): Promise<void> {
  const pipeline = cacheRedis.pipeline();
  for (const item of items) {
    if (item.ttlSeconds) {
      pipeline.setex(item.key, item.ttlSeconds, item.value);
    } else {
      pipeline.set(item.key, item.value);
    }
  }
  await pipeline.exec();
}

// Increment a counter
export async function incr(key: string): Promise<number> {
  return cacheRedis.incr(key);
}

// Decrement a counter
export async function decr(key: string): Promise<number> {
  return cacheRedis.decr(key);
}

// Get TTL in seconds
export async function ttl(key: string): Promise<number> {
  return cacheRedis.ttl(key);
}

// Close connection
export async function closeCache(): Promise<void> {
  await cacheRedis.quit();
}
