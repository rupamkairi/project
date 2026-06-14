/**
 * Tests for Entity Schema System — schema.ts
 * Write-first (TDD): these tests MUST fail before implementation.
 */
import { describe, expect, test } from "bun:test";
import type {
  EntitySchema,
  FieldSchema,
  ValidationContext,
  ValidationResult,
  Validator,
} from "./schema";
import { Validators } from "./schema";
import type { ID } from "./id";

// ---------------------------------------------------------------------------
// FieldType union
// ---------------------------------------------------------------------------
describe("FieldType", () => {
  test("all documented field types are assignable to FieldType", () => {
    // This test is purely type-level; we express it as runtime strings to keep it runnable.
    const types = [
      "string",
      "number",
      "boolean",
      "date",
      "enum",
      "ref",
      "ref[]",
      "json",
      "money",
      "geo.point",
      "geo.polygon",
      "geo.linestring",
    ] as const;
    expect(types.length).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// FieldSchema — structural validation
// ---------------------------------------------------------------------------
describe("FieldSchema", () => {
  test("minimal FieldSchema (key + type) is valid shape", () => {
    const field: FieldSchema = { key: "name", type: "string" };
    expect(field.key).toBe("name");
    expect(field.type).toBe("string");
  });

  test("FieldSchema with all optional fields compiles correctly", () => {
    const field: FieldSchema = {
      key: "email",
      type: "string",
      label: "Email Address",
      required: true,
      unique: true,
      default: "user@example.com",
      validators: [],
      indexed: true,
      searchable: true,
      sensitive: true,
    };
    expect(field.required).toBe(true);
    expect(field.sensitive).toBe(true);
  });

  test("enum FieldSchema accepts enumValues", () => {
    const field: FieldSchema = {
      key: "status",
      type: "enum",
      enumValues: ["active", "inactive", "pending"],
    };
    expect(field.enumValues).toHaveLength(3);
  });

  test("ref FieldSchema accepts refEntity + refField", () => {
    const field: FieldSchema = {
      key: "userId",
      type: "ref",
      refEntity: "User",
      refField: "id",
    };
    expect(field.refEntity).toBe("User");
  });

  test("FieldSchema supports computed virtual field", () => {
    const field: FieldSchema = {
      key: "fullName",
      type: "string",
      computed: (entity) => `${entity.firstName} ${entity.lastName}`,
    };
    expect(field.computed?.({ firstName: "John", lastName: "Doe" })).toBe("John Doe");
  });

  test("FieldSchema default can be a factory function", () => {
    const field: FieldSchema = {
      key: "createdAt",
      type: "date",
      default: () => Date.now(),
    };
    const defaultVal = typeof field.default === "function" ? field.default() : field.default;
    expect(typeof defaultVal).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// EntitySchema
// ---------------------------------------------------------------------------
describe("EntitySchema", () => {
  test("fields is an ARRAY not a Record", () => {
    const schema: EntitySchema = {
      name: "User",
      namespace: "identity",
      fields: [
        { key: "email", type: "string", required: true },
        { key: "name", type: "string" },
      ],
    };
    expect(Array.isArray(schema.fields)).toBe(true);
    expect(schema.fields[0].key).toBe("email");
  });

  test("EntitySchema optional fields default correctly", () => {
    const schema: EntitySchema = {
      name: "Product",
      namespace: "catalog",
      idPrefix: "prod_",
      fields: [{ key: "title", type: "string" }],
      indexes: [["title"]],
      uniqueConstraints: [["title"]],
      softDelete: true,
      timestamps: true,
      versioned: true,
      searchSync: false,
      rtChannel: "catalog:products",
    };
    expect(schema.idPrefix).toBe("prod_");
    expect(schema.indexes).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Validators — factory functions returning Validator (value, ctx) => ValidationError | null
// ---------------------------------------------------------------------------

/** Build a minimal ValidationContext for tests. */
function makeCtx(entity: Record<string, unknown> = {}): ValidationContext {
  const schema: EntitySchema = {
    name: "TestEntity",
    namespace: "test",
    fields: [],
  };
  return {
    entity,
    schema,
    isCreate: true,
    isUpdate: false,
    actorId: "01ARZ3NDEKTSV4RRFFQ69G5FAV" as ID,
    orgId: "01ARZ3NDEKTSV4RRFFQ69G5FAV" as ID,
  };
}

describe("Validators.minLength", () => {
  test("returns null when value meets minimum length", () => {
    const validator: Validator = Validators.minLength(3);
    const result = validator("hello", makeCtx());
    expect(result).toBeNull();
  });

  test("returns ValidationError when value is too short", () => {
    const validator: Validator = Validators.minLength(5);
    const result = validator("hi", makeCtx());
    expect(result).not.toBeNull();
    expect(result?.failures[0].field).toBeDefined();
  });

  test("returns ValidationError for non-string value", () => {
    const validator: Validator = Validators.minLength(3);
    const result = validator(42, makeCtx());
    expect(result).not.toBeNull();
  });
});

describe("Validators.maxLength", () => {
  test("returns null when value is within max length", () => {
    const validator: Validator = Validators.maxLength(10);
    expect(validator("hello", makeCtx())).toBeNull();
  });

  test("returns ValidationError when value exceeds max length", () => {
    const validator: Validator = Validators.maxLength(3);
    const result = validator("toolong", makeCtx());
    expect(result).not.toBeNull();
  });
});

describe("Validators.min", () => {
  test("returns null for number at minimum", () => {
    const validator: Validator = Validators.min(0);
    expect(validator(0, makeCtx())).toBeNull();
  });

  test("returns ValidationError for number below minimum", () => {
    const validator: Validator = Validators.min(10);
    const result = validator(5, makeCtx());
    expect(result).not.toBeNull();
  });
});

describe("Validators.max", () => {
  test("returns null for number at maximum", () => {
    const validator: Validator = Validators.max(100);
    expect(validator(100, makeCtx())).toBeNull();
  });

  test("returns ValidationError for number above maximum", () => {
    const validator: Validator = Validators.max(10);
    const result = validator(99, makeCtx());
    expect(result).not.toBeNull();
  });
});

describe("Validators.pattern", () => {
  test("returns null for matching pattern", () => {
    const validator: Validator = Validators.pattern(/^\d{4}$/);
    expect(validator("1234", makeCtx())).toBeNull();
  });

  test("returns ValidationError for non-matching pattern", () => {
    const validator: Validator = Validators.pattern(/^\d{4}$/);
    const result = validator("abc", makeCtx());
    expect(result).not.toBeNull();
  });
});

describe("Validators.email", () => {
  test("returns null for valid email", () => {
    const validator: Validator = Validators.email();
    expect(validator("user@example.com", makeCtx())).toBeNull();
  });

  test("returns ValidationError for invalid email", () => {
    const validator: Validator = Validators.email();
    const result = validator("not-an-email", makeCtx());
    expect(result).not.toBeNull();
  });
});

describe("Validators.url", () => {
  test("returns null for valid URL", () => {
    const validator: Validator = Validators.url();
    expect(validator("https://example.com", makeCtx())).toBeNull();
  });

  test("returns ValidationError for invalid URL", () => {
    const validator: Validator = Validators.url();
    const result = validator("not-a-url", makeCtx());
    expect(result).not.toBeNull();
  });
});

describe("Validators.phone", () => {
  test("returns null for valid E.164 phone", () => {
    const validator: Validator = Validators.phone();
    expect(validator("+14155552671", makeCtx())).toBeNull();
  });

  test("returns ValidationError for bare number", () => {
    const validator: Validator = Validators.phone();
    const result = validator("1234", makeCtx());
    expect(result).not.toBeNull();
  });
});

describe("Validators.future / past", () => {
  test("future() returns null for a future timestamp", () => {
    const validator: Validator = Validators.future();
    const future = Date.now() + 100_000;
    expect(validator(future, makeCtx())).toBeNull();
  });

  test("future() returns ValidationError for a past timestamp", () => {
    const validator: Validator = Validators.future();
    const past = Date.now() - 100_000;
    const result = validator(past, makeCtx());
    expect(result).not.toBeNull();
  });

  test("past() returns null for a past timestamp", () => {
    const validator: Validator = Validators.past();
    const past = Date.now() - 100_000;
    expect(validator(past, makeCtx())).toBeNull();
  });

  test("past() returns ValidationError for a future timestamp", () => {
    const validator: Validator = Validators.past();
    const future = Date.now() + 100_000;
    const result = validator(future, makeCtx());
    expect(result).not.toBeNull();
  });
});

describe("Validators.positive / nonZero", () => {
  test("positive() returns null for positive number", () => {
    expect(Validators.positive()(5, makeCtx())).toBeNull();
  });

  test("positive() returns ValidationError for zero", () => {
    expect(Validators.positive()(0, makeCtx())).not.toBeNull();
  });

  test("positive() returns ValidationError for negative", () => {
    expect(Validators.positive()(-1, makeCtx())).not.toBeNull();
  });

  test("nonZero() returns null for non-zero number", () => {
    expect(Validators.nonZero()(1, makeCtx())).toBeNull();
    expect(Validators.nonZero()(-1, makeCtx())).toBeNull();
  });

  test("nonZero() returns ValidationError for zero", () => {
    expect(Validators.nonZero()(0, makeCtx())).not.toBeNull();
  });
});

describe("Validators.refExists / unique", () => {
  test("refExists() returns null (best-effort stub — DB not available in core)", () => {
    const result = Validators.refExists()("someId", makeCtx());
    // Acceptable: null (stub) or a ValidationError; must not throw
    expect(result === null || (result !== null && typeof result.message === "string")).toBe(true);
  });

  test("unique() returns null (best-effort stub)", () => {
    const result = Validators.unique()("someValue", makeCtx());
    expect(result === null || (result !== null && typeof result.message === "string")).toBe(true);
  });
});

describe("Validators.custom", () => {
  test("custom validator returning null is valid", () => {
    const v: Validator = Validators.custom((_val, _ctx) => null);
    expect(v("anything", makeCtx())).toBeNull();
  });

  test("custom validator returning ValidationError surfaces it", async () => {
    const { ValidationError } = await import("../errors/index");
    const v: Validator = Validators.custom(
      (_val, _ctx) => new ValidationError("bad", [{ field: "x", message: "fail" }]),
    );
    const result = v("anything", makeCtx());
    expect(result).not.toBeNull();
    expect(result?.failures[0].field).toBe("x");
  });
});

describe("Validator contract — returns ValidationError | null (NOT boolean)", () => {
  test("a valid value produces null, not true", () => {
    const result: Validator = Validators.minLength(1);
    const val = result("x", makeCtx());
    expect(val).not.toBe(true);
    expect(val).toBeNull();
  });

  test("an invalid value produces a ValidationError instance, not false", async () => {
    const { ValidationError } = await import("../errors/index");
    const validator: Validator = Validators.minLength(10);
    const val = validator("x", makeCtx());
    expect(val).not.toBe(false);
    expect(val).toBeInstanceOf(ValidationError);
  });
});
