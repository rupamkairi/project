/**
 * Tests for EntitySchemaRegistry — registry.ts
 * Write-first (TDD): these tests MUST fail before implementation.
 */
import { describe, expect, test } from "bun:test";
import type { EntitySchema, ValidationResult } from "./schema";
import { Validators } from "./schema";
import { createEntitySchemaRegistry } from "./registry";
import type { EntitySchemaRegistry } from "./registry";

// ---------------------------------------------------------------------------
// Shared test schema
// ---------------------------------------------------------------------------
const UserSchema: EntitySchema = {
  name: "User",
  namespace: "identity",
  idPrefix: "usr_",
  fields: [
    {
      key: "email",
      type: "string",
      required: true,
      unique: true,
      validators: [Validators.email()],
    },
    {
      key: "name",
      type: "string",
      required: true,
      validators: [Validators.minLength(2), Validators.maxLength(100)],
    },
    {
      key: "age",
      type: "number",
      validators: [Validators.min(0), Validators.max(150)],
    },
    {
      key: "role",
      type: "enum",
      enumValues: ["admin", "member", "viewer"],
    },
  ],
  softDelete: true,
  timestamps: true,
  versioned: true,
};

const ProductSchema: EntitySchema = {
  name: "Product",
  namespace: "catalog",
  idPrefix: "prod_",
  fields: [
    { key: "title", type: "string", required: true },
    { key: "price", type: "money" },
  ],
};

// ---------------------------------------------------------------------------
// register / get / getAll
// ---------------------------------------------------------------------------
describe("EntitySchemaRegistry — register / get / getAll", () => {
  test("register then get returns the same schema", () => {
    const registry: EntitySchemaRegistry = createEntitySchemaRegistry();
    registry.register(UserSchema);
    expect(registry.get("User")).toBe(UserSchema);
  });

  test("get throws NotFoundError for missing schema", () => {
    const registry: EntitySchemaRegistry = createEntitySchemaRegistry();
    expect(() => registry.get("DoesNotExist")).toThrow();
  });

  test("getAll returns all schemas when no namespace filter", () => {
    const registry: EntitySchemaRegistry = createEntitySchemaRegistry();
    registry.register(UserSchema);
    registry.register(ProductSchema);
    const all = registry.getAll();
    expect(all.length).toBe(2);
  });

  test("getAll with namespace filter returns only matching schemas", () => {
    const registry: EntitySchemaRegistry = createEntitySchemaRegistry();
    registry.register(UserSchema);
    registry.register(ProductSchema);
    const identity = registry.getAll("identity");
    expect(identity.length).toBe(1);
    expect(identity[0].name).toBe("User");
  });

  test("register overwrites schema with same name", () => {
    const registry: EntitySchemaRegistry = createEntitySchemaRegistry();
    registry.register(UserSchema);
    const updated: EntitySchema = { ...UserSchema, idPrefix: "u_" };
    registry.register(updated);
    expect(registry.get("User").idPrefix).toBe("u_");
  });
});

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------
describe("EntitySchemaRegistry.validate", () => {
  test("valid data returns { valid: true, errors: [] }", () => {
    const registry: EntitySchemaRegistry = createEntitySchemaRegistry();
    registry.register(UserSchema);
    const result: ValidationResult = registry.validate("User", {
      email: "alice@example.com",
      name: "Alice",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("missing required field returns { valid: false, errors: [...] }", () => {
    const registry: EntitySchemaRegistry = createEntitySchemaRegistry();
    registry.register(UserSchema);
    const result: ValidationResult = registry.validate("User", {
      name: "Alice",
      // email missing
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("invalid email format returns validation failure on email field", () => {
    const registry: EntitySchemaRegistry = createEntitySchemaRegistry();
    registry.register(UserSchema);
    const result: ValidationResult = registry.validate("User", {
      email: "not-an-email",
      name: "Alice",
    });
    expect(result.valid).toBe(false);
    const emailErr = result.errors.find(
      (e) => e.failures.some((f) => f.field === "email"),
    );
    expect(emailErr).toBeDefined();
  });

  test("name below minLength returns validation failure on name field", () => {
    const registry: EntitySchemaRegistry = createEntitySchemaRegistry();
    registry.register(UserSchema);
    const result: ValidationResult = registry.validate("User", {
      email: "user@example.com",
      name: "A", // too short (min 2)
    });
    expect(result.valid).toBe(false);
    const nameErr = result.errors.find(
      (e) => e.failures.some((f) => f.field === "name"),
    );
    expect(nameErr).toBeDefined();
  });

  test("age above max returns validation failure", () => {
    const registry: EntitySchemaRegistry = createEntitySchemaRegistry();
    registry.register(UserSchema);
    const result: ValidationResult = registry.validate("User", {
      email: "user@example.com",
      name: "Alice",
      age: 200,
    });
    expect(result.valid).toBe(false);
  });

  test("multiple validation failures are all collected (not short-circuit)", () => {
    const registry: EntitySchemaRegistry = createEntitySchemaRegistry();
    registry.register(UserSchema);
    // Both email invalid AND name too short
    const result: ValidationResult = registry.validate("User", {
      email: "bad",
      name: "A",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  test("validate throws for unknown entity name", () => {
    const registry: EntitySchemaRegistry = createEntitySchemaRegistry();
    expect(() => registry.validate("GhostEntity", {})).toThrow();
  });
});

// ---------------------------------------------------------------------------
// generateTypeScript
// ---------------------------------------------------------------------------
describe("EntitySchemaRegistry.generateTypeScript", () => {
  test("returns a string containing the entity name as an interface", () => {
    const registry: EntitySchemaRegistry = createEntitySchemaRegistry();
    registry.register(UserSchema);
    const ts = registry.generateTypeScript("User");
    expect(typeof ts).toBe("string");
    expect(ts).toContain("User");
    expect(ts).toContain("interface");
  });

  test("includes field names in generated TypeScript", () => {
    const registry: EntitySchemaRegistry = createEntitySchemaRegistry();
    registry.register(UserSchema);
    const ts = registry.generateTypeScript("User");
    expect(ts).toContain("email");
    expect(ts).toContain("name");
  });

  test("throws for unknown entity", () => {
    const registry: EntitySchemaRegistry = createEntitySchemaRegistry();
    expect(() => registry.generateTypeScript("Ghost")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// generateOpenAPISchema
// ---------------------------------------------------------------------------
describe("EntitySchemaRegistry.generateOpenAPISchema", () => {
  test("returns an object with type = object", () => {
    const registry: EntitySchemaRegistry = createEntitySchemaRegistry();
    registry.register(UserSchema);
    const openapi = registry.generateOpenAPISchema("User");
    expect(typeof openapi).toBe("object");
    expect((openapi as Record<string, unknown>).type).toBe("object");
  });

  test("includes properties key with field schemas", () => {
    const registry: EntitySchemaRegistry = createEntitySchemaRegistry();
    registry.register(UserSchema);
    const openapi = registry.generateOpenAPISchema("User") as Record<string, unknown>;
    expect(openapi.properties).toBeDefined();
    expect((openapi.properties as Record<string, unknown>).email).toBeDefined();
  });

  test("required fields appear in OpenAPI required array", () => {
    const registry: EntitySchemaRegistry = createEntitySchemaRegistry();
    registry.register(UserSchema);
    const openapi = registry.generateOpenAPISchema("User") as Record<string, unknown>;
    expect(Array.isArray(openapi.required)).toBe(true);
    expect((openapi.required as string[]).includes("email")).toBe(true);
  });

  test("throws for unknown entity", () => {
    const registry: EntitySchemaRegistry = createEntitySchemaRegistry();
    expect(() => registry.generateOpenAPISchema("Ghost")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// generateFormSchema
// ---------------------------------------------------------------------------
describe("EntitySchemaRegistry.generateFormSchema", () => {
  test("returns an object with a fields array", () => {
    const registry: EntitySchemaRegistry = createEntitySchemaRegistry();
    registry.register(UserSchema);
    const form = registry.generateFormSchema("User") as Record<string, unknown>;
    expect(typeof form).toBe("object");
    expect(Array.isArray(form.fields)).toBe(true);
  });

  test("each form field has key and type", () => {
    const registry: EntitySchemaRegistry = createEntitySchemaRegistry();
    registry.register(UserSchema);
    const form = registry.generateFormSchema("User") as { fields: Array<{ key: string; type: string }> };
    const emailField = form.fields.find((f) => f.key === "email");
    expect(emailField).toBeDefined();
    expect(emailField?.type).toBeDefined();
  });

  test("throws for unknown entity", () => {
    const registry: EntitySchemaRegistry = createEntitySchemaRegistry();
    expect(() => registry.generateFormSchema("Ghost")).toThrow();
  });
});
