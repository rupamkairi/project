/**
 * Repository — TDD test suite
 *
 * Tests for BaseRepository: org scoping, lifecycle, soft-delete,
 * restore, validation, and transaction delegation.
 *
 * @category Core
 */

import { test, expect, describe, beforeEach } from "bun:test";
import {
  BaseRepository,
  type DatabaseAdapter,
  type DbQuery,
  type Transaction,
  type Filter,
  type QueryOptions,
} from "./index";
import type { Entity, EntitySchema, ID } from "../entity";
import type { EventOutbox } from "../event";
import type { DomainEvent } from "../event";
import { NotFoundError, ValidationError } from "../errors";
import { generateId } from "../entity";

// ---------------------------------------------------------------------------
// Test entity type
// ---------------------------------------------------------------------------

interface TestEntity extends Entity {
  name: string;
  status: "active" | "inactive";
}

// ---------------------------------------------------------------------------
// Fake in-memory DatabaseAdapter
// ---------------------------------------------------------------------------

class FakeDb implements DatabaseAdapter {
  rows: Map<string, Record<string, unknown>> = new Map();

  async select<R>(q: DbQuery): Promise<R[]> {
    const all = Array.from(this.rows.values()) as R[];
    // Apply filters from q — minimal: filter by id or organizationId
    if (q.params && Array.isArray(q.params)) {
      // Our buildQuery encodes params as [orgId, id?]
      const [orgId, id] = q.params as string[];
      if (id !== undefined) {
        return all.filter((r) => {
          const row = r as Record<string, unknown>;
          return row["organizationId"] === orgId && row["id"] === id;
        }) as R[];
      }
      return all.filter((r) => {
        const row = r as Record<string, unknown>;
        return row["organizationId"] === orgId;
      }) as R[];
    }
    return all;
  }

  async insert<R>(
    _table: string,
    row: Record<string, unknown>,
  ): Promise<R> {
    const id = row["id"] as string;
    this.rows.set(id, { ...row });
    return { ...row } as R;
  }

  async update<R>(
    _table: string,
    id: ID,
    patch: Record<string, unknown>,
  ): Promise<R> {
    const existing = this.rows.get(id);
    if (!existing) throw new Error(`Row ${id} not found`);
    const updated = { ...existing, ...patch };
    this.rows.set(id, updated);
    return { ...updated } as R;
  }

  async deleteRow(_table: string, id: ID): Promise<void> {
    this.rows.delete(id);
  }

  async transaction<R>(fn: (tx: Transaction) => Promise<R>): Promise<R> {
    const tx: Transaction = {
      commit: async () => {},
      rollback: async () => {},
    };
    return fn(tx);
  }

  async raw<R>(_query: string, _params?: unknown[]): Promise<R[]> {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Fake EventOutbox
// ---------------------------------------------------------------------------

class FakeOutbox implements EventOutbox {
  written: Array<{ event: DomainEvent; tx: unknown }> = [];

  async write(event: DomainEvent, tx: Transaction): Promise<void> {
    this.written.push({ event, tx });
  }

  async pollUnpublished(limit: number): Promise<import("../event").OutboxRecord[]> {
    return [];
  }

  async markPublished(_id: ID): Promise<void> {}

  async writeBatch(_events: DomainEvent[], _tx?: Transaction): Promise<void> {}

  async markFailed(_id: ID, _error: string): Promise<void> {}
}

// ---------------------------------------------------------------------------
// TestRepository — concrete BaseRepository for testing
// ---------------------------------------------------------------------------

const TEST_SCHEMA: EntitySchema = {
  name: "TestEntity",
  namespace: "test",
  idPrefix: "test_",
  fields: [
    { key: "name", type: "string", required: true },
    { key: "status", type: "enum", enumValues: ["active", "inactive"] },
  ],
};

class TestRepository extends BaseRepository<TestEntity> {
  buildQuery(filter: Filter): DbQuery {
    // minimal: encode as [orgId, id?]
    if (filter.field === "id" && filter.op === "eq") {
      return { sql: "SELECT * FROM test WHERE org = ? AND id = ?", params: [this.orgId, filter.value] };
    }
    return { sql: "SELECT * FROM test WHERE org = ?", params: [this.orgId] };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ORG_A = "org_AAAAAAAAAAAAAAAAAAAAAAAAA";
const ORG_B = "org_BBBBBBBBBBBBBBBBBBBBBBBBB";

function makeEntity(overrides: Partial<TestEntity> = {}): TestEntity {
  const now = Date.now();
  return {
    id: generateId(),
    organizationId: ORG_A,
    name: "Test",
    status: "active",
    createdAt: now,
    updatedAt: now,
    version: 1,
    meta: {},
    ...overrides,
  };
}

function makeRepo(orgId: ID = ORG_A, db?: FakeDb, outbox?: FakeOutbox) {
  const fakeDb = db ?? new FakeDb();
  const fakeOutbox = outbox ?? new FakeOutbox();
  const repo = new TestRepository(TEST_SCHEMA, fakeDb, fakeOutbox, orgId);
  return { repo, db: fakeDb, outbox: fakeOutbox };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Repository — org scoping", () => {
  test("findById returns null for entity belonging to another org", async () => {
    const { repo, db } = makeRepo(ORG_A);

    // Seed a row for ORG_B
    const id = generateId();
    db.rows.set(id, {
      id,
      organizationId: ORG_B,
      name: "Other org entity",
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      meta: {},
    });

    const result = await repo.findById(id);
    expect(result).toBeNull();
  });

  test("findById returns entity when org matches", async () => {
    const { repo, db } = makeRepo(ORG_A);

    const entity = makeEntity();
    db.rows.set(entity.id, entity as unknown as Record<string, unknown>);

    const result = await repo.findById(entity.id);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(entity.id);
  });
});

describe("Repository — save lifecycle", () => {
  test("save sets createdAt, updatedAt, version=1 on insert", async () => {
    const { repo, outbox } = makeRepo();

    const entity = makeEntity({ createdAt: 0, updatedAt: 0, version: 0 });
    const saved = await repo.save(entity);

    expect(saved.createdAt).toBeGreaterThan(0);
    expect(saved.updatedAt).toBeGreaterThan(0);
    expect(saved.version).toBe(1);
  });

  test("save increments version on update (entity already exists)", async () => {
    const { repo, db } = makeRepo();

    const entity = makeEntity({ version: 1 });
    db.rows.set(entity.id, entity as unknown as Record<string, unknown>);

    const updated = await repo.save({ ...entity, name: "Updated" });
    expect(updated.version).toBe(2);
    expect(updated.name).toBe("Updated");
  });

  test("save publishes event to outbox", async () => {
    const { repo, outbox } = makeRepo();

    const entity = makeEntity();
    await repo.save(entity);

    expect(outbox.written.length).toBeGreaterThan(0);
  });

  test("save injects organizationId from repo orgId", async () => {
    const { repo } = makeRepo(ORG_A);

    const entity = makeEntity({ organizationId: ORG_B }); // caller passes wrong org
    const saved = await repo.save(entity);

    expect(saved.organizationId).toBe(ORG_A);
  });
});

describe("Repository — soft-delete", () => {
  test("delete soft-deletes: sets deletedAt", async () => {
    const { repo, db } = makeRepo();

    const entity = makeEntity();
    db.rows.set(entity.id, entity as unknown as Record<string, unknown>);

    await repo.delete(entity.id);

    const row = db.rows.get(entity.id) as Record<string, unknown>;
    expect(row["deletedAt"]).toBeDefined();
    expect(typeof row["deletedAt"]).toBe("number");
  });

  test("deleted entity is hidden from findById by default", async () => {
    const { repo, db } = makeRepo();

    const entity = makeEntity({ deletedAt: Date.now() });
    db.rows.set(entity.id, entity as unknown as Record<string, unknown>);

    const result = await repo.findById(entity.id);
    expect(result).toBeNull();
  });

  test("deleted entity is visible with withDeleted=true", async () => {
    const { repo, db } = makeRepo();

    const entity = makeEntity({ deletedAt: Date.now() });
    db.rows.set(entity.id, entity as unknown as Record<string, unknown>);

    const result = await repo.findById(entity.id, { withDeleted: true });
    expect(result).not.toBeNull();
    expect(result!.id).toBe(entity.id);
  });
});

describe("Repository — restore", () => {
  test("restore clears deletedAt", async () => {
    const { repo, db } = makeRepo();

    const entity = makeEntity({ deletedAt: Date.now() - 1000 });
    db.rows.set(entity.id, entity as unknown as Record<string, unknown>);

    const restored = await repo.restore(entity.id);
    expect(restored.deletedAt).toBeUndefined();
  });

  test("restore returns entity with incremented version", async () => {
    const { repo, db } = makeRepo();

    const entity = makeEntity({ version: 3, deletedAt: Date.now() - 1000 });
    db.rows.set(entity.id, entity as unknown as Record<string, unknown>);

    const restored = await repo.restore(entity.id);
    expect(restored.version).toBe(4);
  });
});

describe("Repository — findByIdOrFail", () => {
  test("throws NotFoundError when entity not found", async () => {
    const { repo } = makeRepo();

    await expect(repo.findByIdOrFail("nonexistent-id")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  test("returns entity when found", async () => {
    const { repo, db } = makeRepo();

    const entity = makeEntity();
    db.rows.set(entity.id, entity as unknown as Record<string, unknown>);

    const result = await repo.findByIdOrFail(entity.id);
    expect(result.id).toBe(entity.id);
  });
});

describe("Repository — schema validation", () => {
  test("rejects entity missing required field with ValidationError", async () => {
    const { repo } = makeRepo();

    const entity = makeEntity({ name: undefined as unknown as string });

    await expect(repo.save(entity)).rejects.toBeInstanceOf(ValidationError);
  });

  test("accepts entity with all required fields", async () => {
    const { repo } = makeRepo();

    const entity = makeEntity({ name: "Valid Name" });

    await expect(repo.save(entity)).resolves.toBeDefined();
  });
});

describe("Repository — transaction", () => {
  test("transaction delegates to db.transaction", async () => {
    const db = new FakeDb();
    let transactionCalled = false;

    db.transaction = async <R>(fn: (tx: Transaction) => Promise<R>): Promise<R> => {
      transactionCalled = true;
      const tx: Transaction = {
        commit: async () => {},
        rollback: async () => {},
      };
      return fn(tx);
    };

    const outbox = new FakeOutbox();
    const repo = new TestRepository(TEST_SCHEMA, db, outbox, ORG_A);

    await repo.transaction(async (tx) => {
      return "result";
    });

    expect(transactionCalled).toBe(true);
  });
});

describe("Repository — hardDelete and findMany", () => {
  test("hardDelete removes row permanently", async () => {
    const { repo, db } = makeRepo();

    const entity = makeEntity();
    db.rows.set(entity.id, entity as unknown as Record<string, unknown>);

    await repo.hardDelete(entity.id);

    expect(db.rows.has(entity.id)).toBe(false);
  });

  test("findMany returns paginated result scoped to org", async () => {
    const { repo, db } = makeRepo(ORG_A);

    // Seed 3 entities: 2 for ORG_A, 1 for ORG_B
    const e1 = makeEntity({ name: "E1" });
    const e2 = makeEntity({ name: "E2" });
    const e3 = makeEntity({ name: "E3", organizationId: ORG_B });

    db.rows.set(e1.id, e1 as unknown as Record<string, unknown>);
    db.rows.set(e2.id, e2 as unknown as Record<string, unknown>);
    db.rows.set(e3.id, e3 as unknown as Record<string, unknown>);

    const filter: Filter<string> = { field: "organizationId", op: "eq", value: ORG_A };
    const result = await repo.findMany(filter);

    expect(result.data.length).toBe(2);
    expect(result.data.every((e) => e.organizationId === ORG_A)).toBe(true);
  });
});
