/**
 * Tests for IDGenerator interface + default implementation — id.ts
 */
import { describe, expect, test } from "bun:test";
import { createIdGenerator, defaultIdGenerator } from "./id";
import type { IDGenerator } from "./id";

describe("IDGenerator interface — defaultIdGenerator", () => {
  const gen: IDGenerator = defaultIdGenerator;

  test("generate() returns a 26-character ULID string", () => {
    const id = gen.generate();
    expect(typeof id).toBe("string");
    expect(id.length).toBe(26);
  });

  test("generate() produces unique IDs on successive calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => gen.generate()));
    expect(ids.size).toBe(100);
  });

  test("generateFor(namespace) prepends namespace + underscore", () => {
    const id = gen.generateFor("ord");
    expect(id.startsWith("ord_")).toBe(true);
    expect(id.length).toBe(30); // 'ord_' (4) + 26
  });

  test("generateFor(namespace) uses different namespaces correctly", () => {
    const invId = gen.generateFor("inv");
    const txnId = gen.generateFor("txn");
    expect(invId.startsWith("inv_")).toBe(true);
    expect(txnId.startsWith("txn_")).toBe(true);
  });

  test("isValid returns true for a generated ULID", () => {
    const id = gen.generate();
    expect(gen.isValid(id)).toBe(true);
  });

  test("isValid returns false for a non-ULID string", () => {
    expect(gen.isValid("not-a-ulid")).toBe(false);
    expect(gen.isValid("")).toBe(false);
    expect(gen.isValid("short")).toBe(false);
  });

  test("isValid handles prefixed IDs as invalid plain ULIDs", () => {
    const prefixed = gen.generateFor("ord");
    // The full prefixed ID is NOT a bare ULID
    expect(gen.isValid(prefixed)).toBe(false);
  });

  test("extractTimestamp returns a reasonable Unix ms timestamp", () => {
    const before = Date.now();
    const id = gen.generate();
    const after = Date.now();
    const ts = gen.extractTimestamp(id);
    // Allow a few ms slack
    expect(ts).toBeGreaterThanOrEqual(before - 10);
    expect(ts).toBeLessThanOrEqual(after + 10);
  });

  test("extractTimestamp round-trip is consistent", () => {
    const id = gen.generate();
    const ts1 = gen.extractTimestamp(id);
    const ts2 = gen.extractTimestamp(id);
    expect(ts1).toBe(ts2);
  });
});

describe("createIdGenerator factory", () => {
  test("returns an IDGenerator instance", () => {
    const gen = createIdGenerator();
    const id = gen.generate();
    expect(gen.isValid(id)).toBe(true);
  });

  test("multiple factory instances produce valid and unique IDs", () => {
    const g1 = createIdGenerator();
    const g2 = createIdGenerator();
    const id1 = g1.generate();
    const id2 = g2.generate();
    expect(id1).not.toBe(id2);
    expect(g1.isValid(id1)).toBe(true);
    expect(g2.isValid(id2)).toBe(true);
  });
});
