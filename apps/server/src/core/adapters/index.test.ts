/**
 * Adapter Registry Tests
 *
 * Tests for AdapterRegistry, AdapterType, createAdapterRegistry,
 * and the adapter interface contracts from master-architecture §4.4.
 */

import { test, expect, describe } from "bun:test";
import {
  createAdapterRegistry,
  type AdapterType,
  type AdapterRegistry,
  type StorageAdapter,
  type StoredFile,
  type FileMeta,
  type NotificationAdapter,
  type NotificationPayload,
  type NotificationResult,
  type PaymentAdapter,
  type PaymentOrder,
  type PaymentSession,
  type PaymentResult,
  type RefundResult,
  type PaymentTransaction,
  type WebhookEvent,
  type GeoAdapter,
  type Coordinates,
  type Address,
  type TravelMode,
  type Route,
  type Matrix,
  type SearchAdapter,
  type SearchQuery,
  type SearchResult,
} from "./index";
import type { Money } from "../primitives";
import type { DomainEvent } from "../event";

// ---------------------------------------------------------------------------
// Fake implementations for testing
// ---------------------------------------------------------------------------

const fakeStoredFile: StoredFile = {
  key: "uploads/test.png",
  url: "https://cdn.example.com/uploads/test.png",
  size: 1024,
  mimeType: "image/png",
  etag: "abc123",
};

const fakeStorageAdapter: StorageAdapter = {
  async upload(_key: string, _file: Buffer, _meta: FileMeta) {
    return fakeStoredFile;
  },
  async download(_key: string) {
    return Buffer.from("data");
  },
  async getSignedUrl(_key: string, _expiresIn: number) {
    return "https://signed.example.com/key?sig=xyz";
  },
  async delete(_key: string) {},
  async move(_fromKey: string, _toKey: string) {},
};

const fakeNotificationAdapter: NotificationAdapter = {
  channel: "email",
  async send(_to: string, _message: NotificationPayload): Promise<NotificationResult> {
    return { success: true, messageId: "msg-001" };
  },
  async health() {
    return true;
  },
};

const fakeMoney: Money = { amount: 1000, currency: "USD" };

const fakePaymentAdapter: PaymentAdapter = {
  async createPaymentSession(_order: PaymentOrder): Promise<PaymentSession> {
    return { sessionId: "sess-001", url: "https://pay.example.com/sess-001", expiresAt: Date.now() + 3600000 };
  },
  async capturePayment(_sessionId: string): Promise<PaymentResult> {
    return { success: true, transactionId: "txn-001" };
  },
  async refund(_transactionId: string, _amount: Money): Promise<RefundResult> {
    return { success: true, refundId: "ref-001" };
  },
  async getTransaction(_id: string): Promise<PaymentTransaction> {
    return { id: "txn-001", amount: fakeMoney, status: "captured", createdAt: Date.now() };
  },
  async handleWebhook(_payload: unknown, _signature: string): Promise<WebhookEvent> {
    return { type: "payment.captured", data: {} };
  },
};

const fakeGeoAdapter: GeoAdapter = {
  async geocode(_address: string): Promise<Coordinates> {
    return { lat: 52.52, lng: 13.405 };
  },
  async reverseGeocode(_coords: Coordinates): Promise<Address> {
    return { street: "Unter den Linden", city: "Berlin", country: "DE" };
  },
  async getRoute(
    _origin: Coordinates,
    _destinations: Coordinates[],
    _mode: TravelMode,
  ): Promise<Route> {
    return { distanceMeters: 1000, durationSeconds: 600, polyline: "" };
  },
  async getDistanceMatrix(
    _origins: Coordinates[],
    _destinations: Coordinates[],
  ): Promise<Matrix> {
    return { rows: [] };
  },
};

const fakeDomainEvent: DomainEvent = {
  id: "evt-001" as any,
  type: "test.event",
  aggregateId: "agg-001" as any,
  aggregateType: "Test",
  payload: {},
  occurredAt: Date.now() as any,
  orgId: "org-001" as any,
  correlationId: "corr-001" as any,
  version: 1,
  source: "test",
};

const fakeSearchAdapter: SearchAdapter = {
  async index(_collection: string, _documents: Record<string, unknown>[]) {},
  async search(_collection: string, _query: SearchQuery): Promise<SearchResult> {
    return { hits: [], total: 0 };
  },
  async delete(_collection: string, _ids: string[]) {},
  async sync(_collection: string, _event: DomainEvent) {},
};

// ---------------------------------------------------------------------------
// Registry behaviour tests
// ---------------------------------------------------------------------------

describe("createAdapterRegistry", () => {
  test("register + get round-trip with a StorageAdapter", () => {
    const registry = createAdapterRegistry();
    registry.register("storage", fakeStorageAdapter);
    const retrieved = registry.get<StorageAdapter>("storage");
    expect(retrieved).toBe(fakeStorageAdapter);
  });

  test("has() returns false before registration", () => {
    const registry = createAdapterRegistry();
    expect(registry.has("storage")).toBe(false);
  });

  test("has() returns true after registration", () => {
    const registry = createAdapterRegistry();
    registry.register("storage", fakeStorageAdapter);
    expect(registry.has("storage")).toBe(true);
  });

  test("get() throws IntegrationError for unregistered type", () => {
    const registry = createAdapterRegistry();
    expect(() => registry.get("payment")).toThrow();
  });

  test("get() error message mentions the adapter type", () => {
    const registry = createAdapterRegistry();
    let errorMessage = "";
    try {
      registry.get("geo");
    } catch (e: unknown) {
      if (e instanceof Error) errorMessage = e.message;
    }
    expect(errorMessage).toContain("geo");
  });

  test("register overwrites: second registration replaces the first", () => {
    const registry = createAdapterRegistry();

    const first: StorageAdapter = { ...fakeStorageAdapter };
    const second: StorageAdapter = { ...fakeStorageAdapter };

    registry.register("storage", first);
    registry.register("storage", second);

    const retrieved = registry.get<StorageAdapter>("storage");
    expect(retrieved).toBe(second);
    expect(retrieved).not.toBe(first);
  });

  test("different adapter types are stored independently", () => {
    const registry = createAdapterRegistry();
    registry.register("storage", fakeStorageAdapter);
    registry.register("notification.email", fakeNotificationAdapter);

    expect(registry.get<StorageAdapter>("storage")).toBe(fakeStorageAdapter);
    expect(registry.get<NotificationAdapter>("notification.email")).toBe(
      fakeNotificationAdapter,
    );
    expect(registry.has("notification.sms")).toBe(false);
  });

  test("all AdapterType values are accepted by register/has/get", () => {
    const registry = createAdapterRegistry();
    const types: AdapterType[] = [
      "storage",
      "notification.email",
      "notification.sms",
      "notification.push",
      "notification.whatsapp",
      "notification.webhook",
      "payment",
      "geo",
      "search",
      "fx-rates",
      "ocr",
      "translate",
    ];

    for (const t of types) {
      expect(registry.has(t)).toBe(false);
      registry.register(t, { stub: t });
      expect(registry.has(t)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Type-level compile checks — if this file compiles the contracts are correct
// ---------------------------------------------------------------------------

describe("adapter interface type-level checks", () => {
  test("StorageAdapter: fake impl satisfies the interface", async () => {
    const result = await fakeStorageAdapter.upload("key", Buffer.from("x"), { mimeType: "text/plain" });
    expect(result.key).toBeDefined();
    expect(result.url).toBeDefined();
    expect(result.size).toBeDefined();
    expect(result.mimeType).toBeDefined();
    expect(result.etag).toBeDefined();
  });

  test("NotificationAdapter: fake impl satisfies the interface", async () => {
    const result = await fakeNotificationAdapter.send("a@b.com", { body: "hello" });
    expect(result.success).toBe(true);
    expect(fakeNotificationAdapter.channel).toBe("email");
    expect(await fakeNotificationAdapter.health()).toBe(true);
  });

  test("PaymentAdapter: fake impl satisfies the interface", async () => {
    const session = await fakePaymentAdapter.createPaymentSession({ amount: fakeMoney, currency: "USD", description: "test" });
    expect(session.sessionId).toBeDefined();

    const capture = await fakePaymentAdapter.capturePayment("sess-001");
    expect(capture.success).toBe(true);

    const refund = await fakePaymentAdapter.refund("txn-001", fakeMoney);
    expect(refund.success).toBe(true);

    const tx = await fakePaymentAdapter.getTransaction("txn-001");
    expect(tx.id).toBeDefined();

    const wh = await fakePaymentAdapter.handleWebhook({}, "sig");
    expect(wh.type).toBeDefined();
  });

  test("GeoAdapter: fake impl satisfies the interface", async () => {
    const coords = await fakeGeoAdapter.geocode("Berlin");
    expect(coords.lat).toBeDefined();
    expect(coords.lng).toBeDefined();

    const addr = await fakeGeoAdapter.reverseGeocode({ lat: 52, lng: 13 });
    expect(addr).toBeDefined();

    const route = await fakeGeoAdapter.getRoute({ lat: 52, lng: 13 }, [{ lat: 53, lng: 14 }], "driving");
    expect(route).toBeDefined();

    const matrix = await fakeGeoAdapter.getDistanceMatrix([{ lat: 52, lng: 13 }], [{ lat: 53, lng: 14 }]);
    expect(matrix).toBeDefined();
  });

  test("SearchAdapter: fake impl satisfies the interface", async () => {
    await fakeSearchAdapter.index("items", [{ id: "1" }]);
    const result = await fakeSearchAdapter.search("items", { query: "test" });
    expect(result.total).toBe(0);
    await fakeSearchAdapter.delete("items", ["1"]);
    await fakeSearchAdapter.sync("items", fakeDomainEvent);
  });

  test("AdapterRegistry interface is satisfied by createAdapterRegistry()", () => {
    // Type assertion: the returned value must satisfy AdapterRegistry
    const registry: AdapterRegistry = createAdapterRegistry();
    expect(registry).toBeDefined();
  });
});
