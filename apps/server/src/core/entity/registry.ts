/**
 * EntitySchemaRegistry
 *
 * Central registry where all modules register their EntitySchema instances
 * during boot. Provides runtime validation, TypeScript generation,
 * OpenAPI schema generation, and form schema generation.
 *
 * @category Core
 * @packageDocumentation
 */

import { NotFoundError } from "../errors/index";
import type { EntitySchema, FieldSchema, FieldType, ValidationResult } from "./schema";
import { Validators } from "./schema";
import { ValidationError } from "./schema";

// ---------------------------------------------------------------------------
// EntitySchemaRegistry interface (per docs/architecture/core.md §2)
// ---------------------------------------------------------------------------

export interface EntitySchemaRegistry {
  /** Register or overwrite an EntitySchema. */
  register(schema: EntitySchema): void;

  /**
   * Get a registered schema by name.
   * @throws NotFoundError if the schema is not registered.
   */
  get(name: string): EntitySchema;

  /**
   * Return all registered schemas, optionally filtered by namespace.
   */
  getAll(namespace?: string): EntitySchema[];

  /**
   * Validate a plain data object against the named schema.
   * Runs required checks + all field validators. Collects ALL failures.
   * @throws NotFoundError if the entity schema is not registered.
   */
  validate(entityName: string, data: unknown): ValidationResult;

  /**
   * Generate a TypeScript interface string for the named schema.
   * @throws NotFoundError if the entity schema is not registered.
   */
  generateTypeScript(entityName: string): string;

  /**
   * Generate a JSON Schema / OpenAPI-compatible schema object.
   * @throws NotFoundError if the entity schema is not registered.
   */
  generateOpenAPISchema(entityName: string): object;

  /**
   * Generate a UI form schema (field list with type, label, required).
   * @throws NotFoundError if the entity schema is not registered.
   */
  generateFormSchema(entityName: string): object;
}

// ---------------------------------------------------------------------------
// FieldType → TypeScript type mapping
// ---------------------------------------------------------------------------

const FIELD_TYPE_TO_TS: Record<FieldType, string> = {
  string: "string",
  number: "number",
  boolean: "boolean",
  date: "number", // Timestamp
  enum: "string", // refined to union when enumValues present
  ref: "string",  // ID
  "ref[]": "string[]",
  json: "Record<string, unknown>",
  money: "{ amount: number; currency: string }",
  "geo.point": "{ lat: number; lng: number }",
  "geo.polygon": "{ type: 'Polygon'; coordinates: number[][][] }",
  "geo.linestring": "{ type: 'LineString'; coordinates: number[][] }",
};

// ---------------------------------------------------------------------------
// FieldType → OpenAPI type mapping
// ---------------------------------------------------------------------------

function fieldToOpenAPIProperty(field: FieldSchema): Record<string, unknown> {
  switch (field.type) {
    case "string":
      return { type: "string" };
    case "number":
      return { type: "number" };
    case "boolean":
      return { type: "boolean" };
    case "date":
      return { type: "integer", format: "int64", description: "Unix epoch ms" };
    case "enum":
      return { type: "string", enum: field.enumValues ?? [] };
    case "ref":
      return { type: "string", format: "ulid", description: `Reference to ${field.refEntity}` };
    case "ref[]":
      return {
        type: "array",
        items: { type: "string", format: "ulid" },
        description: `References to ${field.refEntity}`,
      };
    case "json":
      return { type: "object" };
    case "money":
      return {
        type: "object",
        properties: {
          amount: { type: "integer" },
          currency: { type: "string", pattern: "^[A-Z]{3}$" },
        },
        required: ["amount", "currency"],
      };
    case "geo.point":
      return {
        type: "object",
        properties: {
          lat: { type: "number" },
          lng: { type: "number" },
        },
        required: ["lat", "lng"],
      };
    case "geo.polygon":
      return {
        type: "object",
        properties: {
          type: { type: "string", enum: ["Polygon"] },
          coordinates: { type: "array", items: { type: "array" } },
        },
      };
    case "geo.linestring":
      return {
        type: "object",
        properties: {
          type: { type: "string", enum: ["LineString"] },
          coordinates: { type: "array", items: { type: "array" } },
        },
      };
    default:
      return { type: "string" };
  }
}

// ---------------------------------------------------------------------------
// FieldType → form input type
// ---------------------------------------------------------------------------

function fieldToFormType(field: FieldSchema): string {
  switch (field.type) {
    case "string":
      return "text";
    case "number":
      return "number";
    case "boolean":
      return "checkbox";
    case "date":
      return "datetime";
    case "enum":
      return "select";
    case "ref":
      return "ref";
    case "ref[]":
      return "ref-multi";
    case "json":
      return "json";
    case "money":
      return "money";
    case "geo.point":
      return "geo-point";
    case "geo.polygon":
      return "geo-polygon";
    case "geo.linestring":
      return "geo-linestring";
    default:
      return "text";
  }
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Create a new EntitySchemaRegistry instance.
 * Each call returns an isolated registry — suitable for testing.
 */
export function createEntitySchemaRegistry(): EntitySchemaRegistry {
  const _store = new Map<string, EntitySchema>();

  function _get(name: string): EntitySchema {
    const schema = _store.get(name);
    if (!schema) {
      throw new NotFoundError(`EntitySchema "${name}" is not registered`, { entityName: name });
    }
    return schema;
  }

  function _buildValidationContext(schema: EntitySchema, data: Record<string, unknown>) {
    return {
      entity: data,
      schema,
      isCreate: true,
      isUpdate: false,
      actorId: "" as string,
      orgId: "" as string,
    };
  }

  return {
    register(schema) {
      _store.set(schema.name, schema);
    },

    get(name) {
      return _get(name);
    },

    getAll(namespace?: string) {
      const all = Array.from(_store.values());
      if (namespace === undefined) return all;
      return all.filter((s) => s.namespace === namespace);
    },

    validate(entityName, data) {
      const schema = _get(entityName);
      const record = (data ?? {}) as Record<string, unknown>;
      const errors: ValidationError[] = [];

      const ctx = _buildValidationContext(schema, record);

      for (const field of schema.fields) {
        const value = record[field.key];

        // --- Required check ---
        if (field.required && (value === undefined || value === null || value === "")) {
          errors.push(
            new ValidationError("Validation failed", [
              { field: field.key, message: `Field "${field.key}" is required` },
            ]),
          );
          // Still run other validators even if required fails, so we collect all errors
        }

        // --- Skip validators if value is absent (non-required empty fields are ok) ---
        if (value === undefined || value === null) {
          continue;
        }

        // --- Run field validators ---
        if (field.validators && field.validators.length > 0) {
          for (const validator of field.validators) {
            const err = validator(value, ctx);
            if (err !== null) {
              // Wrap the error to include the field name if it's generic
              const failures = err.failures.map((f) =>
                f.field === "_" ? { field: field.key, message: f.message } : f,
              );
              errors.push(new ValidationError(err.message, failures));
            }
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    },

    generateTypeScript(entityName) {
      const schema = _get(entityName);

      const lines: string[] = [`/** Auto-generated — do not edit. */`, `interface ${schema.name} {`];

      for (const field of schema.fields) {
        const tsType =
          field.type === "enum" && field.enumValues?.length
            ? field.enumValues.map((v) => `"${v}"`).join(" | ")
            : FIELD_TYPE_TO_TS[field.type] ?? "unknown";

        const optional = field.required ? "" : "?";
        const comment = field.label ? `  /** ${field.label} */\n` : "";
        lines.push(`${comment}  ${field.key}${optional}: ${tsType};`);
      }

      lines.push("}");
      return lines.join("\n");
    },

    generateOpenAPISchema(entityName) {
      const schema = _get(entityName);

      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const field of schema.fields) {
        properties[field.key] = {
          ...fieldToOpenAPIProperty(field),
          ...(field.label ? { description: field.label } : {}),
        };
        if (field.required) {
          required.push(field.key);
        }
      }

      const result: Record<string, unknown> = {
        type: "object",
        properties,
      };

      if (required.length > 0) {
        result.required = required;
      }

      return result;
    },

    generateFormSchema(entityName) {
      const schema = _get(entityName);

      const fields = schema.fields.map((field) => ({
        key: field.key,
        type: fieldToFormType(field),
        label: field.label ?? field.key,
        required: field.required ?? false,
        ...(field.enumValues ? { options: field.enumValues.map((v) => ({ value: v, label: v })) } : {}),
        ...(field.refEntity ? { refEntity: field.refEntity } : {}),
      }));

      return { fields };
    },
  };
}
