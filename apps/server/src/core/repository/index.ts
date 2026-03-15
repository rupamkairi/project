/**
 * Repository Pattern
 *
 * Data access interfaces and base repository implementation.
 *
 * @category Core
 * @packageDocumentation
 */

import type { Entity, ID } from "../entity";
import type { PageOptions, PaginatedResult } from "../primitives";

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
 * const filters: Filter[] = [
 *   { field: "status", op: "eq", value: "active" },
 *   { field: "age", op: "gte", value: 18 },
 *   { field: "email", op: "contains", value: "@example.com" }
 * ];
 * ```
 *
 * @category Core
 */
export interface Filter<T = unknown> {
  /**
   * Field name to filter on
   */
  field: string;

  /**
   * Comparison operator
   */
  op: FilterOperator;

  /**
   * Value to compare against
   */
  value: T;
}

/**
 * Query options for repository operations.
 *
 * @category Core
 */
export interface QueryOptions {
  /**
   * Filter criteria
   */
  filters?: Filter[];

  /**
   * Pagination options
   */
  page?: PageOptions;

  /**
   * Include soft-deleted entities
   */
  includeDeleted?: boolean;
}

/**
 * Base repository interface for data access.
 *
 * Provides CRUD operations with multi-tenancy support.
 *
 * @typeParam T - Entity type
 *
 * @example
 * ```typescript
 * interface UserRepository extends Repository<User> {
 *   findByEmail(email: string): Promise<User | null>;
 *   findByRole(role: string): Promise<User[]>;
 * }
 * ```
 *
 * @category Core
 */
export interface Repository<T extends Entity> {
  /**
   * Finds an entity by ID.
   *
   * @param id - Entity ID
   * @returns Entity or null if not found
   */
  findById(id: ID): Promise<T | null>;

  /**
   * Finds all entities for an organization.
   *
   * @param orgId - Organization ID
   * @returns Array of entities
   */
  findByOrgId(orgId: ID): Promise<T[]>;

  /**
   * Finds a single entity matching criteria.
   *
   * @param orgId - Organization ID
   * @param filters - Filter criteria
   * @returns Entity or null
   */
  findOne(orgId: ID, filters: Filter[]): Promise<T | null>;

  /**
   * Finds all entities matching criteria with pagination.
   *
   * @param orgId - Organization ID
   * @param opts - Query options (filters, pagination)
   * @returns Paginated result
   */
  findAll(orgId: ID, opts?: QueryOptions): Promise<PaginatedResult<T>>;

  /**
   * Saves an entity (create or update).
   *
   * @param entity - Entity to save
   * @returns Saved entity
   */
  save(entity: T): Promise<T>;

  /**
   * Deletes an entity permanently.
   *
   * @param id - Entity ID
   * @param orgId - Organization ID
   */
  delete(id: ID, orgId: ID): Promise<void>;

  /**
   * Soft-deletes an entity (marks as deleted).
   *
   * @param id - Entity ID
   * @param orgId - Organization ID
   * @returns Updated entity
   */
  softDelete(id: ID, orgId: ID): Promise<T>;
}

/**
 * Base repository implementation helper.
 *
 * Provides default implementation for soft-delete with organization validation.
 *
 * @typeParam T - Entity type
 *
 * @example
 * ```typescript
 * class UserRepository extends BaseRepository<User> {
 *   async findById(id: ID): Promise<User | null> {
 *     // Implement using your data access layer
 *   }
 *
 *   async findByOrgId(orgId: ID): Promise<User[]> {
 *     // Implement organization-scoped query
 *   }
 *
 *   // ... implement other abstract methods
 * }
 * ```
 *
 * @category Core
 */
export abstract class BaseRepository<
  T extends Entity,
> implements Repository<T> {
  /**
   * Finds an entity by ID.
   *
   * @param id - Entity ID
   * @returns Entity or null
   */
  abstract findById(id: ID): Promise<T | null>;

  /**
   * Finds all entities for an organization.
   *
   * @param orgId - Organization ID
   * @returns Array of entities
   */
  abstract findByOrgId(orgId: ID): Promise<T[]>;

  /**
   * Finds a single entity matching criteria.
   *
   * @param orgId - Organization ID
   * @param filters - Filter criteria
   * @returns Entity or null
   */
  abstract findOne(orgId: ID, filters: Filter[]): Promise<T | null>;

  /**
   * Finds all entities with pagination.
   *
   * @param orgId - Organization ID
   * @param opts - Query options
   * @returns Paginated result
   */
  abstract findAll(orgId: ID, opts?: QueryOptions): Promise<PaginatedResult<T>>;

  /**
   * Saves an entity.
   *
   * @param entity - Entity to save
   * @returns Saved entity
   */
  abstract save(entity: T): Promise<T>;

  /**
   * Deletes an entity permanently.
   *
   * @param id - Entity ID
   * @param orgId - Organization ID
   */
  abstract delete(id: ID, orgId: ID): Promise<void>;

  /**
   * Soft-deletes an entity with organization validation.
   *
   * @param id - Entity ID
   * @param orgId - Organization ID
   * @returns Updated entity
   *
   * @throws Error if entity not found or organization mismatch
   */
  async softDelete(id: ID, orgId: ID): Promise<T> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error("Entity not found");
    }
    if (entity.organizationId !== orgId) {
      throw new Error("Organization mismatch");
    }
    return this.save({
      ...entity,
      deletedAt: Date.now() as any,
      updatedAt: Date.now() as any,
      version: entity.version + 1,
    });
  }
}
