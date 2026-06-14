/**
 * Core Primitives tests
 *
 * Tests for moneyFormat (including zero-decimal currencies), Logger importability,
 * and Result/Ok/Err importability from both canonical and legacy locations.
 *
 * @see core.md §1 (primitives), §12 (errors)
 */

import { describe, it, expect } from "bun:test";

// ---------------------------------------------------------------------------
// moneyFormat — imported from canonical location
// ---------------------------------------------------------------------------
import { moneyFormat, moneyAdd, moneySubtract, moneyMultiply } from "./index";

// ---------------------------------------------------------------------------
// Logger — importable from canonical location (primitives/logger)
// ---------------------------------------------------------------------------
import type { Logger } from "./logger";

// ---------------------------------------------------------------------------
// Logger — importable from legacy location (context/index)
// ---------------------------------------------------------------------------
import type { Logger as LoggerFromContext } from "../context/index";

// ---------------------------------------------------------------------------
// Result/Ok/Err — importable from canonical location (primitives/result)
// ---------------------------------------------------------------------------
import { Ok, Err } from "./result";
import type { Result } from "./result";

// ---------------------------------------------------------------------------
// Result/Ok/Err — importable from legacy location (errors/index)
// ---------------------------------------------------------------------------
import { Ok as OkFromErrors, Err as ErrFromErrors } from "../errors/index";
import type { Result as ResultFromErrors } from "../errors/index";
import { CoreError } from "../errors/index";

// ---------------------------------------------------------------------------
// moneyFormat tests
// ---------------------------------------------------------------------------

describe("moneyFormat", () => {
  describe("standard (two-decimal) currencies", () => {
    it("formats USD (divides by 100)", () => {
      const result = moneyFormat({ amount: 999, currency: "USD" });
      // 999 cents → $9.99
      expect(result).toBe("$9.99");
    });

    it("formats EUR (divides by 100)", () => {
      const result = moneyFormat({ amount: 500, currency: "EUR" });
      // 500 cents → €5.00
      expect(result).toContain("5");
      expect(result).toContain("€");
    });

    it("formats INR (divides by 100)", () => {
      const result = moneyFormat({ amount: 100, currency: "INR" }, "en-IN");
      // 100 paise → ₹1.00
      expect(result).toContain("1");
    });

    it("formats 0 USD correctly", () => {
      const result = moneyFormat({ amount: 0, currency: "USD" });
      expect(result).toBe("$0.00");
    });
  });

  describe("zero-decimal currencies (no division)", () => {
    it("formats JPY without dividing by 100", () => {
      // JPY has no minor unit — 500 yen stays 500
      const result = moneyFormat({ amount: 500, currency: "JPY" });
      expect(result).toContain("500");
      expect(result).toContain("¥");
    });

    it("formats KRW without dividing by 100", () => {
      const result = moneyFormat({ amount: 1000, currency: "KRW" });
      expect(result).toContain("1,000");
    });

    it("formats VND without dividing by 100", () => {
      const result = moneyFormat({ amount: 25000, currency: "VND" });
      expect(result).toContain("25,000");
    });

    it("is case-insensitive for currency code", () => {
      // Lowercase currency code should still be recognized as zero-decimal
      const upper = moneyFormat({ amount: 500, currency: "JPY" });
      const lower = moneyFormat({ amount: 500, currency: "jpy" });
      expect(upper).toBe(lower);
    });
  });

  describe("locale support", () => {
    it("accepts a custom locale", () => {
      // Should not throw
      expect(() =>
        moneyFormat({ amount: 999, currency: "EUR" }, "de-DE"),
      ).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// moneyAdd / moneySubtract / moneyMultiply — basic smoke tests
// ---------------------------------------------------------------------------

describe("moneyAdd", () => {
  it("adds two same-currency values", () => {
    expect(moneyAdd({ amount: 100, currency: "USD" }, { amount: 200, currency: "USD" })).toEqual({
      amount: 300,
      currency: "USD",
    });
  });

  it("throws on currency mismatch", () => {
    expect(() =>
      moneyAdd({ amount: 100, currency: "USD" }, { amount: 100, currency: "EUR" }),
    ).toThrow();
  });
});

describe("moneySubtract", () => {
  it("subtracts two same-currency values", () => {
    expect(
      moneySubtract({ amount: 500, currency: "USD" }, { amount: 200, currency: "USD" }),
    ).toEqual({ amount: 300, currency: "USD" });
  });
});

describe("moneyMultiply", () => {
  it("multiplies and rounds", () => {
    expect(moneyMultiply({ amount: 333, currency: "USD" }, 3)).toEqual({
      amount: 999,
      currency: "USD",
    });
  });
});

// ---------------------------------------------------------------------------
// Logger importability — compile-time check via type usage
// ---------------------------------------------------------------------------

describe("Logger type importability", () => {
  it("Logger is importable from primitives/logger", () => {
    // If Logger wasn't exported from ./logger, the import above would cause a
    // TypeScript compile error. This runtime check confirms the module loads.
    const mockLogger: Logger = {
      fatal: () => {},
      error: () => {},
      warn: () => {},
      info: () => {},
      debug: () => {},
      trace: () => {},
      child: function () { return this; },
    };
    expect(typeof mockLogger.info).toBe("function");
  });

  it("Logger is importable from context/index (legacy path)", () => {
    const mockLogger: LoggerFromContext = {
      fatal: () => {},
      error: () => {},
      warn: () => {},
      info: () => {},
      debug: () => {},
      trace: () => {},
      child: function () { return this; },
    };
    expect(typeof mockLogger.debug).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// Result/Ok/Err importability
// ---------------------------------------------------------------------------

describe("Result/Ok/Err from primitives/result", () => {
  it("Ok creates a successful result", () => {
    const r: Result<number> = Ok(42);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toBe(42);
    }
  });

  it("Err creates a failed result", () => {
    const e = new CoreError("TEST", "test error");
    const r: Result<number> = Err(e);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe(e);
    }
  });
});

describe("Result/Ok/Err from errors/index (legacy path)", () => {
  it("OkFromErrors creates a successful result", () => {
    const r: ResultFromErrors<string> = OkFromErrors("hello");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toBe("hello");
    }
  });

  it("ErrFromErrors creates a failed result", () => {
    const e = new CoreError("TEST", "test error");
    const r: ResultFromErrors<string> = ErrFromErrors(e);
    expect(r.ok).toBe(false);
  });
});
