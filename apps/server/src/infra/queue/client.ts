// Queue client - BullMQ + Redis

import Redis from "ioredis";
import { Queue as BullQueue, Worker as BullWorker } from "bullmq";
import { env } from "../env";

// Create Redis connection for queue
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Track created queues and workers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const queues = new Map<string, any>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const workers = new Map<string, any>();

// Create a queue
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createQueue(name: string): any {
  if (queues.has(name)) {
    return queues.get(name)!;
  }

  const queue = new BullQueue(name, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connection: redis as any,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 100,
    },
  });

  queues.set(name, queue);
  return queue;
}

// Create a worker
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createWorker(
  name: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  processor: (job: any) => Promise<unknown>,
  options?: {
    concurrency?: number;
    lockDuration?: number;
  },
): BullWorker {
  if (workers.has(name)) {
    return workers.get(name)!;
  }

  const worker = new BullWorker(name, processor, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connection: redis as any,
    concurrency: options?.concurrency ?? 5,
    lockDuration: options?.lockDuration ?? 30000,
  });

  workers.set(name, worker);
  return worker;
}

// Close all queues and workers
export async function closeQueueConnections(): Promise<void> {
  await Promise.all([
    ...Array.from(queues.values()).map((q: any) => q.close()),
    ...Array.from(workers.values()).map((w: any) => w.close()),
  ]);
  await redis.quit();
}
