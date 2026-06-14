/**
 * Queue & Scheduler tests
 *
 * Tests for InMemoryQueue and InMemoryScheduler per core.md §9.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  InMemoryQueue,
  InMemoryScheduler,
} from "./index";
import type {
  Job,
  JobOptions,
  JobHandler,
  ScheduledJob,
  SchedulerOptions,
} from "./index";
import { createSystemContext } from "../context";
import type { SystemContext } from "../context";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCtx(): SystemContext {
  return createSystemContext({});
}

// ---------------------------------------------------------------------------
// Queue — add / process round-trip
// ---------------------------------------------------------------------------

describe("InMemoryQueue — add / process round-trip", () => {
  it("add returns a Job with expected shape", async () => {
    const queue = new InMemoryQueue();
    const job = await queue.add("email.send", { to: "a@b.com" });

    expect(job.id).toBeTruthy();
    expect(job.name).toBe("email.send");
    expect(job.payload).toEqual({ to: "a@b.com" });
    expect(job.status).toBe("waiting");
    expect(job.attempts).toBe(0);
    expect(typeof job.createdAt).toBe("number");
    expect(job.processedAt).toBeUndefined();
    expect(job.completedAt).toBeUndefined();
    expect(job.failedReason).toBeUndefined();
  });

  it("process + _runJob executes the handler and marks the job completed", async () => {
    const queue = new InMemoryQueue();
    const ctx = makeCtx();

    const received: string[] = [];
    queue.process<{ to: string }>("email.send", async (job, _ctx) => {
      received.push(job.payload.to);
    });

    const job = await queue.add("email.send", { to: "x@y.com" });
    await queue._runJob(job.id, ctx);

    const updated = await queue.getJob<{ to: string }>(job.id);
    expect(updated?.status).toBe("completed");
    expect(updated?.attempts).toBe(1);
    expect(updated?.processedAt).toBeDefined();
    expect(updated?.completedAt).toBeDefined();
    expect(received).toEqual(["x@y.com"]);
  });

  it("_runJob passes SystemContext to the handler", async () => {
    const queue = new InMemoryQueue();
    const ctx = makeCtx();

    const receivedCtxRef: { value: SystemContext | null } = { value: null };
    queue.process("context.check", async (_job, handlerCtx) => {
      receivedCtxRef.value = handlerCtx;
    });

    const job = await queue.add("context.check", {});
    await queue._runJob(job.id, ctx);

    expect(receivedCtxRef.value).toBe(ctx);
  });

  it("failed handler moves job to DLQ", async () => {
    const queue = new InMemoryQueue();
    const ctx = makeCtx();

    queue.process("fail.always", async () => {
      throw new Error("boom");
    });

    const job = await queue.add("fail.always", {});
    await queue._runJob(job.id, ctx);

    const updated = await queue.getJob(job.id);
    expect(updated?.status).toBe("failed");
    expect(updated?.failedReason).toContain("boom");

    const dlq = await queue.getDLQ("fail.always");
    expect(dlq.length).toBe(1);
    expect(dlq[0].id).toBe(job.id);
  });
});

// ---------------------------------------------------------------------------
// Queue — addBatch
// ---------------------------------------------------------------------------

describe("InMemoryQueue — addBatch", () => {
  it("addBatch returns one Job per payload", async () => {
    const queue = new InMemoryQueue();
    const payloads = [{ n: 1 }, { n: 2 }, { n: 3 }];
    const jobs = await queue.addBatch("process.item", payloads);

    expect(jobs.length).toBe(3);
    expect(jobs[0].payload).toEqual({ n: 1 });
    expect(jobs[1].payload).toEqual({ n: 2 });
    expect(jobs[2].payload).toEqual({ n: 3 });
    expect(jobs[0].name).toBe("process.item");
  });

  it("addBatch returns empty array for empty payloads", async () => {
    const queue = new InMemoryQueue();
    const jobs = await queue.addBatch("process.item", []);
    expect(jobs).toEqual([]);
  });

  it("all batch jobs have unique IDs", async () => {
    const queue = new InMemoryQueue();
    const jobs = await queue.addBatch("process.item", [1, 2, 3, 4, 5]);
    const ids = jobs.map((j) => j.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Queue — cancel
// ---------------------------------------------------------------------------

describe("InMemoryQueue — cancel", () => {
  it("cancel removes the job so getJob returns null", async () => {
    const queue = new InMemoryQueue();
    const job = await queue.add("task.a", { x: 1 });

    await queue.cancel(job.id);
    const found = await queue.getJob(job.id);
    expect(found).toBeNull();
  });

  it("cancel on unknown id does not throw", async () => {
    const queue = new InMemoryQueue();
    await expect(queue.cancel("unknown-id" as any)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Queue — drain
// ---------------------------------------------------------------------------

describe("InMemoryQueue — drain", () => {
  it("drain resolves without error", async () => {
    const queue = new InMemoryQueue();
    await queue.add("batch.process", { item: 1 });
    await expect(queue.drain("batch.process")).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Queue — getDLQ & replayDLQ
// ---------------------------------------------------------------------------

describe("InMemoryQueue — getDLQ & replayDLQ", () => {
  it("getDLQ returns empty array when nothing has failed", async () => {
    const queue = new InMemoryQueue();
    const dlq = await queue.getDLQ("no.failures");
    expect(dlq).toEqual([]);
  });

  it("replayDLQ moves jobs back to waiting", async () => {
    const queue = new InMemoryQueue();
    const ctx = makeCtx();

    let callCount = 0;
    queue.process("retry.me", async () => {
      callCount += 1;
      if (callCount === 1) throw new Error("first failure");
    });

    const job = await queue.add("retry.me", { attempt: 1 });
    await queue._runJob(job.id, ctx);

    // Job should be in DLQ
    let dlq = await queue.getDLQ("retry.me");
    expect(dlq.length).toBe(1);

    // Replay all
    await queue.replayDLQ("retry.me");

    // DLQ should be cleared
    dlq = await queue.getDLQ("retry.me");
    expect(dlq.length).toBe(0);

    // Job should be back to waiting
    const requeued = await queue.getJob(job.id);
    expect(requeued?.status).toBe("waiting");
    expect(requeued?.attempts).toBe(0);
    expect(requeued?.failedReason).toBeUndefined();
  });

  it("replayDLQ with limit only replays N jobs", async () => {
    const queue = new InMemoryQueue();
    const ctx = makeCtx();

    queue.process("bulk.fail", async () => {
      throw new Error("always fails");
    });

    const jobs = await queue.addBatch("bulk.fail", [1, 2, 3]);
    for (const j of jobs) {
      await queue._runJob(j.id, ctx);
    }

    let dlq = await queue.getDLQ("bulk.fail");
    expect(dlq.length).toBe(3);

    // Replay only 2
    await queue.replayDLQ("bulk.fail", 2);

    dlq = await queue.getDLQ("bulk.fail");
    expect(dlq.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Queue — JobOptions.priority union type
// ---------------------------------------------------------------------------

describe("JobOptions — priority union", () => {
  it("accepts 'critical' priority", async () => {
    const queue = new InMemoryQueue();
    const opts: JobOptions = { priority: "critical" };
    const job = await queue.add("high.prio", { x: 1 }, opts);
    expect(job.status).toBe("waiting");
  });

  it("accepts 'standard' priority", async () => {
    const queue = new InMemoryQueue();
    const opts: JobOptions = { priority: "standard" };
    const job = await queue.add("std.prio", {}, opts);
    expect(job.status).toBe("waiting");
  });

  it("accepts 'bulk' priority", async () => {
    const queue = new InMemoryQueue();
    const opts: JobOptions = { priority: "bulk" };
    const job = await queue.add("bulk.prio", {}, opts);
    expect(job.status).toBe("waiting");
  });

  it("jobId (idempotency key) deduplicates adds", async () => {
    const queue = new InMemoryQueue();
    const opts: JobOptions = { jobId: "idem-123" };
    const job1 = await queue.add("idempotent.task", { v: 1 }, opts);
    const job2 = await queue.add("idempotent.task", { v: 2 }, opts);
    expect(job1.id).toBe(job2.id);
    // Second add is ignored — payload unchanged
    expect(job2.payload).toEqual({ v: 1 });
  });

  it("delay option marks job as delayed", async () => {
    const queue = new InMemoryQueue();
    const job = await queue.add("delayed.task", {}, { delay: 5000 });
    expect(job.status).toBe("delayed");
  });
});

// ---------------------------------------------------------------------------
// Queue — JobHandler receives SystemContext
// ---------------------------------------------------------------------------

describe("JobHandler — receives SystemContext", () => {
  it("handler ctx.actor.type defaults to 'system'", async () => {
    const queue = new InMemoryQueue();
    const ctx = makeCtx();

    const captured: { type: string | null } = { type: null };
    queue.process("ctx.actor.check", async (_job, handlerCtx) => {
      captured.type = handlerCtx.actor.type;
    });

    const job = await queue.add("ctx.actor.check", {});
    await queue._runJob(job.id, ctx);

    expect(captured.type).toBe("system");
  });

  it("handler receives same ctx object that was passed to _runJob", async () => {
    const queue = new InMemoryQueue();
    const ctx = makeCtx();
    const ctxRef: SystemContext[] = [];

    queue.process("ctx.ref.check", async (_job, handlerCtx) => {
      ctxRef.push(handlerCtx);
    });

    const job = await queue.add("ctx.ref.check", {});
    await queue._runJob(job.id, ctx);

    expect(ctxRef[0]).toBe(ctx);
  });
});

// ---------------------------------------------------------------------------
// Scheduler — define / cancel / pause / resume / list / getNext
// ---------------------------------------------------------------------------

describe("InMemoryScheduler — define", () => {
  it("define registers a job visible in list()", () => {
    const scheduler = new InMemoryScheduler();
    scheduler.define("nightly-report", "0 0 * * *", async () => {});

    const jobs = scheduler.list();
    expect(jobs.length).toBe(1);
    expect(jobs[0].name).toBe("nightly-report");
    expect(jobs[0].cron).toBe("0 0 * * *");
    expect(jobs[0].status).toBe("active");
    expect(typeof jobs[0].next).toBe("number");
  });

  it("define with opts stores the job as active", () => {
    const scheduler = new InMemoryScheduler();
    const opts: SchedulerOptions = { timezone: "UTC", overlap: false, catchUp: true };
    scheduler.define("tz-job", "*/5 * * * *", async () => {}, opts);

    const jobs = scheduler.list();
    expect(jobs[0].status).toBe("active");
  });
});

describe("InMemoryScheduler — cancel", () => {
  it("cancel removes the job from list()", () => {
    const scheduler = new InMemoryScheduler();
    scheduler.define("to-cancel", "0 * * * *", async () => {});
    scheduler.cancel("to-cancel");

    const jobs = scheduler.list();
    expect(jobs.length).toBe(0);
  });

  it("cancel on non-existent name does not throw", () => {
    const scheduler = new InMemoryScheduler();
    expect(() => scheduler.cancel("ghost")).not.toThrow();
  });
});

describe("InMemoryScheduler — pause / resume", () => {
  it("pause changes status to 'paused'", () => {
    const scheduler = new InMemoryScheduler();
    scheduler.define("pausable", "0 * * * *", async () => {});
    scheduler.pause("pausable");

    const jobs = scheduler.list();
    expect(jobs[0].status).toBe("paused");
  });

  it("resume changes status back to 'active'", () => {
    const scheduler = new InMemoryScheduler();
    scheduler.define("resumable", "0 * * * *", async () => {});
    scheduler.pause("resumable");
    scheduler.resume("resumable");

    const jobs = scheduler.list();
    expect(jobs[0].status).toBe("active");
  });

  it("pause on non-existent name does not throw", () => {
    const scheduler = new InMemoryScheduler();
    expect(() => scheduler.pause("ghost")).not.toThrow();
  });

  it("resume on non-existent name does not throw", () => {
    const scheduler = new InMemoryScheduler();
    expect(() => scheduler.resume("ghost")).not.toThrow();
  });
});

describe("InMemoryScheduler — list", () => {
  it("list returns all defined jobs", () => {
    const scheduler = new InMemoryScheduler();
    scheduler.define("job-a", "0 0 * * *", async () => {});
    scheduler.define("job-b", "0 12 * * *", async () => {});
    scheduler.define("job-c", "*/30 * * * *", async () => {});

    const jobs = scheduler.list();
    expect(jobs.length).toBe(3);
    const names = jobs.map((j) => j.name).sort();
    expect(names).toEqual(["job-a", "job-b", "job-c"]);
  });

  it("list returns empty array when no jobs defined", () => {
    const scheduler = new InMemoryScheduler();
    expect(scheduler.list()).toEqual([]);
  });

  it("list returns ScheduledJob shape for each entry", () => {
    const scheduler = new InMemoryScheduler();
    scheduler.define("shape-check", "0 0 * * *", async () => {});

    const [job] = scheduler.list();
    const typed: ScheduledJob = job;  // TypeScript shape assertion
    expect(typeof typed.name).toBe("string");
    expect(typeof typed.cron).toBe("string");
    expect(typeof typed.next).toBe("number");
    expect(["active", "paused"]).toContain(typed.status);
  });
});

describe("InMemoryScheduler — getNext", () => {
  it("getNext returns a future timestamp for a defined job", () => {
    const scheduler = new InMemoryScheduler();
    scheduler.define("future-job", "0 0 * * *", async () => {});

    const next = scheduler.getNext("future-job");
    expect(next).not.toBeNull();
    expect(next).toBeGreaterThan(Date.now() - 1000);
  });

  it("getNext returns null for an unknown job", () => {
    const scheduler = new InMemoryScheduler();
    expect(scheduler.getNext("ghost")).toBeNull();
  });

  it("getNext after pause still returns the stored next value", () => {
    const scheduler = new InMemoryScheduler();
    scheduler.define("paused-job", "0 0 * * *", async () => {});
    const before = scheduler.getNext("paused-job");
    scheduler.pause("paused-job");
    // next is not cleared on pause, only status changes
    expect(scheduler.getNext("paused-job")).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// Scheduler — runOnce
// ---------------------------------------------------------------------------

describe("InMemoryScheduler — runOnce", () => {
  it("runOnce registers a one-shot job", () => {
    const scheduler = new InMemoryScheduler();
    const at = new Date(Date.now() + 60_000);

    scheduler.runOnce("one-shot", at, { campaign: "promo" }, async () => {});

    const jobs = scheduler.list();
    expect(jobs.length).toBe(1);
    expect(jobs[0].name).toBe("one-shot");
    expect(jobs[0].next).toBe(at.getTime());
    expect(jobs[0].status).toBe("active");
  });

  it("runOnce accepts Timestamp (number) for at", () => {
    const scheduler = new InMemoryScheduler();
    const at = Date.now() + 30_000;

    scheduler.runOnce("ts-shot", at, {}, async () => {});

    expect(scheduler.getNext("ts-shot")).toBe(at);
  });
});
