// Repository interfaces for data access

import type { Entity, ID } from "../entity";
import type { PageOptions, PaginatedResult } from "../primitives";

// Filter definition for queries
export interface Filter<T = unknown> {
  field: string;
  op:
    | "eq"
    | "neq"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "in"
    | "nin"
    | "contains"
    | "exists";
  value: T;
}

// Query options
export interface QueryOptions {
  filters?: Filter[];
  page?: PageOptions;
  includeDeleted?: boolean;
}

// Base Repository interface
export interface Repository<T extends Entity> {
  // CRUD operations
  findById(id: ID): Promise<T | null>;
  findByOrgId(orgId: ID): Promise<T[]>;
  findOne(orgId: ID, filters: Filter[]): Promise<T | null>;
  findAll(orgId: ID, opts?: QueryOptions): Promise<PaginatedResult<T>>;
  save(entity: T): Promise<T>;
  delete(id: ID, orgId: ID): Promise<void>;
  softDelete(id: ID, orgId: ID): Promise<T>;
}

// Base Repository implementation helper
export abstract class BaseRepository<
  T extends Entity,
> implements Repository<T> {
  abstract findById(id: ID): Promise<T | null>;
  abstract findByOrgId(orgId: ID): Promise<T[]>;
  abstract findOne(orgId: ID, filters: Filter[]): Promise<T | null>;
  abstract findAll(orgId: ID, opts?: QueryOptions): Promise<PaginatedResult<T>>;
  abstract save(entity: T): Promise<T>;
  abstract delete(id: ID, orgId: ID): Promise<void>;

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
