/**
 * Repository Pattern — C10
 *
 * Data access interfaces and base repository implementation.
 * Enforces org scoping, soft-delete filtering, optimistic locking,
 * and entity lifecycle (timestamps, versioning) automatically.
 *
 * @category Core
 * @packageDocumentation
 */

import type {
  Entity,
  ID,
  Timestamp,
  EntitySchema,
  ValidationContext,
  ValidationResult,
} from "../entity";
import type { EventOutbox } from "../event";
import { NotFoundError, ValidationError } from "../errors";
import type { PaginatedResult, SortSpec } from "../primitives";

// ---------------------------------------------------------------------------
// Transaction
// ---------------------------------------------------------------------------

/**
 * Minimal transaction handle.
 *
 * Passed to `transaction()` callbacks and to `EventOutbox.write(event, tx)`.
 *
 * @category Core
 */
export interface Transaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

// ---------------------------------------------------------------------------
// DbQuery
// ---------------------------------------------------------------------------

/**
 * Opaque query descriptor produced by `BaseRepository.buildQuery()`.
 *
 * Concrete adapters interpret sql/params; additional keys are adapter-specific.
 *
 * @category Core
 */
export interface DbQuery {
  sql?: string;
  params?: unknown[];
  [k: string]: unknown;
}

// ---------------------------------------------------------------------------
// DatabaseAdapter
// ---------------------------------------------------------------------------

/**
 * Database adapter interface for raw database access.
 *
 * Implementations translate the generic query/mutation contracts into
 * driver-specific calls (Bun.sql, Prisma, etc.).
 *
 * @category Core
 */
export interface DatabaseAdapter {
  /**
   * Executes a select query and returns typed rows.
   */
  select<R>(q: DbQuery): Promise<R[]>;

  /**
   * Inserts a row into a table and returns the created row.
   */
  insert<R>(table: string, row: Record<string, unknown>): Promise<R>;

  /**
   * Updates an existing row identified by id and returns the updated row.
   */
  update<R>(table: string, id: ID, patch: Record<string, unknown>): Promise<R>;

  /**
   * Deletes a row permanently (hard delete).
   */
  deleteRow(table: string, id: ID): Promise<void>;

  /**
   * Executes a function inside a database transaction.
   */
  transaction<R>(fn: (tx: Transaction) => Promise<R>): Promise<R>;

  /**
   * Executes a raw SQL query and returns plain objects.
   *
   * Escape hatch for complex queries (aggregate reports, spatial joins).
   */
  raw<R>(query: string, params?: unknown[]): Promise<R[]>;
}

// ---------------------------------------------------------------------------
// FilterOperator & Filter
// ---------------------------------------------------------------------------

/**
 * Filter operator types.
 *
 * @category Core
 */
export type FilterOperator =
  | "eq" // Equal
  | "neq" // Not equal
  | "gt" // Greater than
  | "gte" // Greater than or equal
  | "lt" // Less than
  | "lte" // Less than or equal
  | "in" // In array
  | "nin" // Not in array
  | "contains" // String contains
  | "exists"; // Field exists

/**
 * Filter definition for queries.
 *
 * @example
 * ```typescript
 * const filters: Filter<User>[] = [
 *   { field: "status", op: "eq", value: "active" },
 *   { field: "age", op: "gte", value: 18 },
 * ];
 * ```
 *
 * @category Core
 */
export interface Filter<T = unknown> {
  /** Field name to filter on. */
  field: string;
  /** Comparison operator. */
  op: FilterOperator;
  /** Value to compare against. */
  value: T;
}

// ---------------------------------------------------------------------------
// QueryOptions (flat — not nested)
// ---------------------------------------------------------------------------

/**
 * Query options for repository operations.
 *
 * All fields are flat (not nested inside a sub-object).
 *
 * @category Core
 */
export interface QueryOptions {
  /** Page number (1-indexed, default: 1). */
  page?: number;
  /** Items per page (default: 50, max: 500). */
  limit?: number;
  /** Sort specifications. */
  sort?: SortSpec[];
  /** Ref fields to eagerly load. */
  include?: string[];
  /** Include soft-deleted records (default: false). */
  withDeleted?: boolean;
}

// Re-export PaginatedResult so callers import from one place.
export type { PaginatedResult } from "../primitives";

// ---------------------------------------------------------------------------
// Repository interface
// ---------------------------------------------------------------------------

/**
 * Repository interface — the only way code touches the database.
 *
 * Callers NEVER pass orgId: it is auto-injected by BaseRepository.
 *
 * @typeParam T - Entity type
 *
 * @category Core
 */
export interface Repository<T extends Entity> {
  // Single entity reads
  findById(id: ID, opts?: Pick<QueryOptions, "withDeleted">): Promise<T | null>;
  findByIdOrFail(id: ID, opts?: Pick<QueryOptions, "withDeleted">): Promise<T>;

  // Collection reads — Filter<unknown> because value type is a field value, not the entity
  findMany(filter: Filter, opts?: QueryOptions): Promise<PaginatedResult<T>>;
  findOne(filter: Filter, opts?: QueryOptions): Promise<T | null>;
  findAll(filter: Filter, opts?: QueryOptions): Promise<T[]>;
  count(filter: Filter): Promise<number>;
  exists(filter: Filter): Promise<boolean>;

  // Writes
  save(entity: T): Promise<T>;
  saveBatch(entities: T[]): Promise<T[]>;
  delete(id: ID): Promise<void>;
  hardDelete(id: ID): Promise<void>;
  restore(id: ID): Promise<T>;

  // Transactions
  transaction<R>(fn: (tx: Transaction) => Promise<R>): Promise<R>;

  // Raw escape hatch
  raw<R = unknown>(query: string, params?: unknown[]): Promise<R[]>;
}

// ---------------------------------------------------------------------------
// BaseRepository
// ---------------------------------------------------------------------------

/**
 * Abstract base class for all repository implementations.
 *
 * Handles:
 * - Injecting `organizationId` into all reads and writes automatically
 * - Setting `createdAt`/`updatedAt` on save
 * - Incrementing `version` on every update (optimistic concurrency)
 * - Filtering out soft-deleted records by default
 * - Validating entity against EntitySchema before every save
 * - Publishing to EventOutbox within the same transaction after save
 *
 * @typeParam T - Entity type
 *
 * @category Core
 */
export abstract class BaseRepository<T extends Entity>
  implements Repository<T>
{
  constructor(
    protected readonly schema: EntitySchema,
    protected readonly db: DatabaseAdapter,
    protected readonly outbox: EventOutbox,
    protected readonly orgId: ID,
  ) {}

  /**
   * Builds a DB-specific query descriptor from a filter.
   *
   * Concrete implementations provide this to translate Filter<T> into a
   * database-specific query object.
   */
  abstract buildQuery(filter: Filter): DbQuery;

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  /**
   * Validates entity against schema fields.
   *
   * Loops field validators, collects all failures, throws ValidationError if any.
   */
  protected validateEntity(entity: T): void {
    const failures: Array<{ field: string; message: string }> = [];

    for (const fieldSchema of this.schema.fields) {
      const value = (entity as Record<string, unknown>)[fieldSchema.key];

      // Required field check
      if (
        fieldSchema.required &&
        (value === undefined || value === null || value === "")
      ) {
        failures.push({
          field: fieldSchema.key,
          message: `${fieldSchema.key} is required`,
        });
        continue;
      }

      // Run field validators if present
      if (fieldSchema.validators && value !== undefined && value !== null) {
        const ctx: ValidationContext = {
          entity: entity as unknown as Record<string, unknown>,
          schema: this.schema,
          isCreate: entity.version === 0 || entity.version === 1,
          isUpdate: entity.version > 1,
          actorId: this.orgId, // best available without full context
          orgId: this.orgId,
        };

        for (const validator of fieldSchema.validators) {
          const result = validator(value, ctx);
          if (result !== null) {
            failures.push(...result.failures);
          }
        }
      }
    }

    if (failures.length > 0) {
      throw new ValidationError("Entity validation failed", failures);
    }
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /**
   * Returns true when the row should be hidden (soft-deleted and withDeleted not set).
   */
  private isSoftDeletedHidden(
    entity: T,
    withDeleted: boolean | undefined,
  ): boolean {
    return entity.deletedAt !== undefined && !withDeleted;
  }

  /**
   * Builds the ID-based filter and delegates to db.select.
   */
  private async selectById(id: ID): Promise<T[]> {
    const q = this.buildQuery({ field: "id", op: "eq", value: id } as unknown as Filter<T>);
    return this.db.select<T>(q);
  }

  /**
   * Builds the general filter and delegates to db.select.
   */
  private async selectByFilter(filter: Filter): Promise<T[]> {
    const q = this.buildQuery(filter);
    return this.db.select<T>(q);
  }

  // -------------------------------------------------------------------------
  // Reads
  // -------------------------------------------------------------------------

  async findById(
    id: ID,
    opts?: Pick<QueryOptions, "withDeleted">,
  ): Promise<T | null> {
    const rows = await this.selectById(id);

    // Filter: must belong to this org
    const row = rows.find((r) => r.organizationId === this.orgId) ?? null;
    if (!row) return null;

    // Filter soft-deleted unless withDeleted=true
    if (this.isSoftDeletedHidden(row, opts?.withDeleted)) return null;

    return row;
  }

  async findByIdOrFail(
    id: ID,
    opts?: Pick<QueryOptions, "withDeleted">,
  ): Promise<T> {
    const entity = await this.findById(id, opts);
    if (!entity) {
      throw new NotFoundError(`Entity not found: ${id}`, { id });
    }
    return entity;
  }

  async findMany(
    filter: Filter,
    opts?: QueryOptions,
  ): Promise<PaginatedResult<T>> {
    const allRows = await this.selectByFilter(filter);

    // Scope to org and optionally include deleted
    const scoped = allRows.filter((r) => {
      if (r.organizationId !== this.orgId) return false;
      if (this.isSoftDeletedHidden(r, opts?.withDeleted)) return false;
      return true;
    });

    const page = opts?.page ?? 1;
    const limit = Math.min(opts?.limit ?? 50, 500);
    const total = scoped.length;

    // Sort
    const sortSpecs = opts?.sort;
    let sorted = [...scoped];
    if (sortSpecs && sortSpecs.length > 0) {
      sorted = sorted.sort((a, b) => {
        for (const spec of sortSpecs) {
          const aVal = (a as Record<string, unknown>)[spec.field];
          const bVal = (b as Record<string, unknown>)[spec.field];
          if (aVal === bVal) continue;
          const cmp = aVal! < bVal! ? -1 : 1;
          return spec.order === "asc" ? cmp : -cmp;
        }
        return 0;
      });
    }

    const start = (page - 1) * limit;
    const data = sorted.slice(start, start + limit);

    return {
      data,
      total,
      page,
      limit,
      hasNext: page * limit < total,
    };
  }

  async findOne(filter: Filter, opts?: QueryOptions): Promise<T | null> {
    const result = await this.findMany(filter, { ...opts, limit: 1 });
    return result.data[0] ?? null;
  }

  async findAll(filter: Filter, opts?: QueryOptions): Promise<T[]> {
    const allRows = await this.selectByFilter(filter);

    return allRows.filter((r) => {
      if (r.organizationId !== this.orgId) return false;
      if (this.isSoftDeletedHidden(r, opts?.withDeleted)) return false;
      return true;
    });
  }

  async count(filter: Filter): Promise<number> {
    const rows = await this.findAll(filter);
    return rows.length;
  }

  async exists(filter: Filter): Promise<boolean> {
    const n = await this.count(filter);
    return n > 0;
  }

  // -------------------------------------------------------------------------
  // Writes
  // -------------------------------------------------------------------------

  async save(entity: T): Promise<T> {
    // Always inject the repo's orgId — callers never supply it
    const now = Date.now() as Timestamp;

    // Check if this is an insert or update
    const existingRows = await this.selectById(entity.id);
    const existing = existingRows.find((r) => r.organizationId === this.orgId);

    let saved: T;

    if (!existing) {
      // Insert — set lifecycle fields, force version = 1
      const toInsert: T = {
        ...entity,
        organizationId: this.orgId,
        createdAt: now,
        updatedAt: now,
        version: 1,
      };

      // Validate before insert
      this.validateEntity(toInsert);

      saved = await this.db.insert<T>(this.schema.name, toInsert as unknown as Record<string, unknown>);
    } else {
      // Update — bump version, update timestamp
      const patch: Partial<T> = {
        ...entity,
        organizationId: this.orgId,
        updatedAt: now,
        version: (existing.version + 1) as T["version"],
        // Preserve original createdAt
        createdAt: existing.createdAt,
      };

      // Validate before update (merge patch onto existing for validation)
      const merged = { ...existing, ...patch } as T;
      this.validateEntity(merged);

      saved = await this.db.update<T>(
        this.schema.name,
        entity.id,
        patch as unknown as Record<string, unknown>,
      );
    }

    // Publish to outbox (within an implicit transaction context)
    await this.db.transaction(async (tx) => {
      await this.outbox.write(
        {
          id: entity.id,
          type: `${this.schema.namespace}.${this.schema.name.toLowerCase()}.saved`,
          aggregateId: saved.id,
          aggregateType: this.schema.name,
          payload: saved,
          occurredAt: now,
          orgId: this.orgId,
          correlationId: entity.id,
          version: saved.version,
          source: this.schema.namespace,
        },
        tx,
      );
    });

    return saved;
  }

  async saveBatch(entities: T[]): Promise<T[]> {
    const results: T[] = [];
    for (const entity of entities) {
      results.push(await this.save(entity));
    }
    return results;
  }

  async delete(id: ID): Promise<void> {
    const now = Date.now() as Timestamp;
    const existing = await this.findById(id);
    if (!existing) return; // already gone or not in this org — no-op

    await this.db.update<T>(this.schema.name, id, {
      deletedAt: now,
      updatedAt: now,
      version: existing.version + 1,
    } as Record<string, unknown>);
  }

  async hardDelete(id: ID): Promise<void> {
    await this.db.deleteRow(this.schema.name, id);
  }

  async restore(id: ID): Promise<T> {
    const now = Date.now() as Timestamp;
    // We need to find even soft-deleted entities
    const rows = await this.selectById(id);
    const existing = rows.find((r) => r.organizationId === this.orgId);

    if (!existing) {
      throw new NotFoundError(`Entity not found for restore: ${id}`, { id });
    }

    const restored = await this.db.update<T>(this.schema.name, id, {
      deletedAt: undefined,
      updatedAt: now,
      version: existing.version + 1,
    } as Record<string, unknown>);

    return restored;
  }

  // -------------------------------------------------------------------------
  // Transactions & raw
  // -------------------------------------------------------------------------

  async transaction<R>(fn: (tx: Transaction) => Promise<R>): Promise<R> {
    return this.db.transaction(fn);
  }

  async raw<R = unknown>(query: string, params?: unknown[]): Promise<R[]> {
    return this.db.raw<R>(query, params);
  }
}
