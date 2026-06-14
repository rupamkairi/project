/**
 * Adapter Registry
 *
 * Core defines the interfaces. Modules consume them. Compose registers
 * the concrete implementations. Nothing above Core ever imports a vendor
 * SDK directly.
 *
 * One active implementation per AdapterType is stored (register overwrites).
 * Selection from config across multiple vendor impls (e.g. both Stripe and
 * Razorpay for "payment") is a later concern — the registry returns whichever
 * impl was last registered for the given type.
 *
 * @see docs/architecture/core.md §13
 * @see docs/architecture/master-architecture.md §4.4
 *
 * @category Core
 * @packageDocumentation
 */

import { IntegrationError } from "../errors";
import type { Money } from "../primitives";
import type { DomainEvent } from "../event";

// ---------------------------------------------------------------------------
// AdapterType — verbatim from core.md §13
// ---------------------------------------------------------------------------

/**
 * All recognised external adapter types.
 *
 * @category Core
 */
export type AdapterType =
  | "storage"
  | "notification.email"
  | "notification.sms"
  | "notification.push"
  | "notification.whatsapp"
  | "notification.webhook"
  | "payment"
  | "geo"
  | "search"
  | "fx-rates"
  | "ocr"
  | "translate";

// ---------------------------------------------------------------------------
// AdapterRegistry interface — verbatim from core.md §13
// ---------------------------------------------------------------------------

/**
 * Registry that maps each AdapterType to its active implementation.
 *
 * @category Core
 */
export interface AdapterRegistry {
  /** Returns the registered adapter for the given type. Throws if absent. */
  get<T>(type: AdapterType): T;
  /** Registers (or overwrites) the active implementation for a type. */
  register<T>(type: AdapterType, adapter: T): void;
  /** Returns true if an implementation is registered for the given type. */
  has(type: AdapterType): boolean;
}

// ---------------------------------------------------------------------------
// createAdapterRegistry — Map-backed implementation
// ---------------------------------------------------------------------------

/**
 * Creates a new in-memory AdapterRegistry backed by a Map.
 *
 * `get` throws {@link IntegrationError} when the type is not registered.
 * `register` stores (or replaces) the active implementation for a type.
 * `has` checks whether an implementation is currently registered.
 *
 * @returns A fresh AdapterRegistry instance
 *
 * @category Core
 */
export function createAdapterRegistry(): AdapterRegistry {
  const store = new Map<AdapterType, unknown>();

  return {
    get<T>(type: AdapterType): T {
      if (!store.has(type)) {
        throw new IntegrationError(
          `No adapter registered for type "${type}". Register an implementation before calling get().`,
          { adapterType: type },
        );
      }
      return store.get(type) as T;
    },

    register<T>(type: AdapterType, adapter: T): void {
      store.set(type, adapter);
    },

    has(type: AdapterType): boolean {
      return store.has(type);
    },
  };
}

// ---------------------------------------------------------------------------
// Storage & CDN — master-architecture §4.4
// ---------------------------------------------------------------------------

/**
 * Metadata supplied when uploading a file.
 *
 * Open-ended so adapters can accept provider-specific options.
 *
 * @category Core
 */
export interface FileMeta {
  mimeType?: string;
  size?: number;
  [k: string]: unknown;
}

/**
 * Represents a successfully stored file.
 *
 * @category Core
 */
export interface StoredFile {
  /** Storage key (path) */
  key: string;
  /** CDN or direct URL */
  url: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** ETag for cache validation */
  etag: string;
}

/**
 * Adapter for object storage / CDN (S3, GCS, R2, local filesystem, …).
 *
 * @category Core
 */
export interface StorageAdapter {
  upload(key: string, file: Buffer, meta: FileMeta): Promise<StoredFile>;
  download(key: string): Promise<Buffer>;
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
  delete(key: string): Promise<void>;
  move(fromKey: string, toKey: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Notification — master-architecture §4.4
// ---------------------------------------------------------------------------

/**
 * Payload for an outbound notification.
 *
 * @category Core
 */
export interface NotificationPayload {
  subject?: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Result returned after attempting to send a notification.
 *
 * @category Core
 */
export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Adapter for a single notification channel
 * (email, SMS, push, WhatsApp, webhook, in-app).
 *
 * @category Core
 */
export interface NotificationAdapter {
  channel: "email" | "sms" | "push" | "whatsapp" | "webhook" | "in-app";
  send(to: string, message: NotificationPayload): Promise<NotificationResult>;
  health(): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Payment — master-architecture §4.4
// ---------------------------------------------------------------------------

/**
 * An order submitted to the payment gateway.
 *
 * @category Core
 */
export interface PaymentOrder {
  amount: Money;
  currency: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * A payment session returned by the gateway (redirect URL, etc.).
 *
 * @category Core
 */
export interface PaymentSession {
  sessionId: string;
  url: string;
  expiresAt: number;
  metadata?: Record<string, unknown>;
}

/**
 * Result of a payment capture.
 *
 * @category Core
 */
export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

/**
 * Result of a refund request.
 *
 * @category Core
 */
export interface RefundResult {
  success: boolean;
  refundId?: string;
  error?: string;
}

/**
 * Payment-level transaction record returned by getTransaction().
 *
 * NOTE: The architecture doc names this "Transaction" but the Core database
 * transaction type (a DB tx handle used for atomic writes) will be introduced
 * in step C10 under the same name. To avoid a name clash, this payment-domain
 * concept is named PaymentTransaction here.
 *
 * @category Core
 */
export interface PaymentTransaction {
  id: string;
  amount: Money;
  status: string;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

/**
 * Normalised webhook event emitted after gateway verification.
 *
 * @category Core
 */
export interface WebhookEvent {
  type: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Adapter for payment gateways (Stripe, Razorpay, PayU, PhonePe, …).
 *
 * @category Core
 */
export interface PaymentAdapter {
  createPaymentSession(order: PaymentOrder): Promise<PaymentSession>;
  capturePayment(sessionId: string): Promise<PaymentResult>;
  refund(transactionId: string, amount: Money): Promise<RefundResult>;
  /**
   * Returns the payment-level transaction record.
   *
   * Returns {@link PaymentTransaction} (not the DB transaction type introduced
   * in C10) to avoid a naming collision.
   */
  getTransaction(id: string): Promise<PaymentTransaction>;
  handleWebhook(payload: unknown, signature: string): Promise<WebhookEvent>;
}

// ---------------------------------------------------------------------------
// Geospatial — master-architecture §4.4
// ---------------------------------------------------------------------------

/**
 * WGS-84 coordinate pair.
 *
 * @category Core
 */
export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Human-readable postal address.
 *
 * @category Core
 */
export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  [k: string]: unknown;
}

/**
 * Routing travel modes.
 *
 * @category Core
 */
export type TravelMode = "driving" | "walking" | "cycling" | "transit";

/**
 * A computed route between an origin and one or more destinations.
 *
 * @category Core
 */
export interface Route {
  distanceMeters: number;
  durationSeconds: number;
  /** Encoded polyline or GeoJSON string */
  polyline?: string;
  legs?: Array<{ distanceMeters: number; durationSeconds: number }>;
}

/**
 * Distance/duration matrix result.
 *
 * @category Core
 */
export interface Matrix {
  rows: Array<{
    elements?: Array<{
      distanceMeters: number;
      durationSeconds: number;
    }>;
  }>;
}

/**
 * Adapter for geospatial services (Google Maps, Mapbox, OSRM, …).
 *
 * @category Core
 */
export interface GeoAdapter {
  geocode(address: string): Promise<Coordinates>;
  reverseGeocode(coords: Coordinates): Promise<Address>;
  getRoute(
    origin: Coordinates,
    destinations: Coordinates[],
    mode: TravelMode,
  ): Promise<Route>;
  getDistanceMatrix(
    origins: Coordinates[],
    destinations: Coordinates[],
  ): Promise<Matrix>;
}

// ---------------------------------------------------------------------------
// Search — master-architecture §4.4
// ---------------------------------------------------------------------------

/**
 * Query submitted to a search adapter.
 *
 * @category Core
 */
export interface SearchQuery {
  query: string;
  filters?: Record<string, unknown>;
  page?: number;
  limit?: number;
  sort?: Array<{ field: string; order: "asc" | "desc" }>;
}

/**
 * Result returned from a search adapter.
 *
 * @category Core
 */
export interface SearchResult {
  hits: Array<Record<string, unknown>>;
  total: number;
  page?: number;
}

/**
 * Adapter for full-text / vector search engines
 * (Typesense, Algolia, Meilisearch, PG full-text, …).
 *
 * @category Core
 */
export interface SearchAdapter {
  index(collection: string, documents: Record<string, unknown>[]): Promise<void>;
  search(collection: string, query: SearchQuery): Promise<SearchResult>;
  delete(collection: string, ids: string[]): Promise<void>;
  /** Event-driven index update */
  sync(collection: string, event: DomainEvent): Promise<void>;
}
