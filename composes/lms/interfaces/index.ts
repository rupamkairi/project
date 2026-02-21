type ID = string;
type Timestamp = number;
type Meta = Record<string, unknown>;

interface Money {
  amount: number;
  currency: string;
}

interface Entity {
  id: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  organizationId: ID;
  meta: Meta;
}

interface DomainEvent<T = unknown> {
  id: ID;
  type: string;
  aggregateId: ID;
  aggregateType: string;
  payload: T;
  occurredAt: Timestamp;
  actorId?: ID;
  orgId: ID;
  causedBy?: ID;
  correlationId: ID;
  version: number;
}

interface Command<T = unknown> {
  type: string;
  payload: T;
  actorId: ID;
  orgId: ID;
  correlationId: ID;
}

interface Query<T = unknown> {
  type: string;
  params: T;
  actorId: ID;
  orgId: ID;
}

interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(
    pattern: string,
    handler: (event: DomainEvent) => Promise<void>,
  ): () => void;
}

type Action =
  | string
  | { type: string; params: Record<string, unknown> }
  | { type: "emit"; event: string }
  | { type: "dispatch"; command: string; payload?: Record<string, unknown> }
  | { type: "assign"; field: string; value: unknown };

type RuleExpr =
  | { field: string; op: Op; value?: unknown }
  | { and: RuleExpr[] }
  | { or: RuleExpr[] }
  | { not: RuleExpr }
  | { ref: string };

interface Transition<S> {
  target: S;
  guard?: RuleExpr;
  actions?: Action[];
}

interface StateNode<S extends string, E extends string> {
  on?: Partial<Record<E, Transition<S>>>;
  entry?: Action[];
  exit?: Action[];
  meta?: { label: string; color: string };
  label?: string;
  terminal?: boolean;
}

interface StateMachine<S extends string, E extends string> {
  id: string;
  entityType?: string;
  initial: S;
  states: Record<S, StateNode<S, E>>;
}

interface FSMEngine {
  register(machine: StateMachine<string, string>): void;
  transition(
    entityType: string,
    entityId: ID,
    event: string,
    context: unknown,
  ): Promise<unknown>;
  getState(entityType: string, entityId: ID): Promise<string | null>;
}

type Op =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "contains"
  | "matches"
  | "exists";

interface RuleEngine {
  evaluate(expr: RuleExpr, context: Record<string, unknown>): boolean;
  register(id: string, expr: RuleExpr): void;
  resolve(id: string): RuleExpr | undefined;
}

interface Filter {
  where?: Record<string, unknown>;
  orderBy?: Record<string, "asc" | "desc">;
  limit?: number;
  offset?: number;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface Transaction {
  findById(id: ID): Promise<Entity | null>;
  save(entity: Entity): Promise<Entity>;
  delete(id: ID): Promise<void>;
}

interface Repository<T extends Entity> {
  findById(id: ID): Promise<T | null>;
  findMany(filter: Filter): Promise<PaginatedResult<T>>;
  findOne(filter: Filter): Promise<T | null>;
  save(entity: Partial<T> & { id?: ID }): Promise<T>;
  delete(id: ID): Promise<void>;
  transaction<R>(fn: (tx: Transaction) => Promise<R>): Promise<R>;
}

interface Job {
  id: ID;
  name: string;
  data: unknown;
  status: "waiting" | "active" | "completed" | "failed" | "delayed";
  progress: number;
  attemptsMade: number;
}

interface JobOptions {
  delay?: number;
  attempts?: number;
  priority?: "critical" | "standard" | "bulk";
}

interface Queue {
  add(name: string, data: unknown, opts?: JobOptions): Promise<Job>;
  getJob(id: ID): Promise<Job | null>;
}

interface Scheduler {
  schedule(
    cron: string,
    name: string,
    data: unknown,
    opts?: { repeat?: { cron: string } },
  ): Promise<void>;
  cancel(name: string): Promise<void>;
}

interface RealtimeGateway {
  broadcast(channel: string, event: string, payload: unknown): Promise<void>;
  subscribe(clientId: ID, channels: string[]): void;
  unsubscribe(clientId: ID, channels: string[]): void;
}

interface DatabaseClient {
  query<T>(sql: string, params: unknown[]): Promise<T[]>;
  execute(sql: string, params: unknown[]): Promise<void>;
}

interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

interface ActorContext {
  actor: {
    id: ID;
    roles: string[];
    orgId: ID;
    type: "human" | "system" | "api_key";
  };
  org: {
    id: ID;
    slug: string;
    settings: Record<string, unknown>;
  };
  correlationId: ID;
}

interface PaymentOrder {
  id: ID;
  orgId: ID;
  userId: ID;
  amount: Money;
  description: string;
  metadata?: Meta;
}

interface PaymentSession {
  id: string;
  url: string;
  status: "pending" | "completed" | "expired" | "cancelled";
  expiresAt: Timestamp;
}

interface PaymentResult {
  transactionId: string;
  status: "succeeded" | "failed" | "cancelled";
  amount: Money;
  processedAt: Timestamp;
}

interface RefundResult {
  refundId: string;
  status: "pending" | "succeeded" | "failed";
  amount: Money;
}

interface WebhookEvent {
  id: string;
  type: string;
  data: unknown;
  processed: boolean;
}

interface MeetingSession {
  id: ID;
  orgId: ID;
  hostId: ID;
  title: string;
  scheduledStart: Timestamp;
  scheduledEnd: Timestamp;
  settings?: {
    autoRecord?: boolean;
    muteOnEntry?: boolean;
    waitingRoom?: boolean;
  };
}

interface MeetingDetails {
  id: string;
  hostUrl: string;
  participantUrl: string;
  status: "waiting" | "started" | "ended";
  startedAt?: Timestamp;
  endedAt?: Timestamp;
}

interface RecordingDetails {
  id: string;
  url: string;
  duration: number;
  size: number;
  format: string;
}

interface StoredFile {
  key: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: Timestamp;
}

interface NotificationPayload {
  type: "email" | "sms" | "push" | "in_app";
  subject?: string;
  body: string;
  data?: Meta;
}

interface NotificationResult {
  id: string;
  status: "sent" | "delivered" | "failed";
  deliveredAt?: Timestamp;
}

interface PaymentAdapter {
  createPaymentSession(order: PaymentOrder): Promise<PaymentSession>;
  capturePayment(sessionId: string): Promise<PaymentResult>;
  refund(transactionId: string, amount: Money): Promise<RefundResult>;
  handleWebhook(payload: unknown, signature: string): Promise<WebhookEvent>;
}

interface VideoMeetingAdapter {
  createMeeting(session: MeetingSession): Promise<MeetingDetails>;
  getMeeting(meetingId: string): Promise<MeetingDetails>;
  endMeeting(meetingId: string): Promise<void>;
  getRecording(meetingId: string): Promise<RecordingDetails | null>;
}

interface StorageAdapter {
  upload(
    key: string,
    file: Buffer,
    meta?: Record<string, unknown>,
  ): Promise<StoredFile>;
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
  delete(key: string): Promise<void>;
}

interface NotificationAdapter {
  send(to: string, message: NotificationPayload): Promise<NotificationResult>;
}

interface LMSPluginConfig {
  features: {
    enableCertificates: boolean;
    enableCohorts: boolean;
    enableLiveSessions: boolean;
    enableQuizzes: boolean;
    enablePeerReview: boolean;
  };
  defaults: {
    completionThreshold: number;
    refundWindowDays: number;
    inactivityNudgeDays: number;
    sessionReminderMinutes: number[];
    maxQuizAttempts: number;
    certificateExpiresAfterDays: number | null;
  };
  adapters: {
    payment?: PaymentAdapter;
    videoMeeting?: VideoMeetingAdapter;
    storage?: StorageAdapter;
    notification?: NotificationAdapter;
  };
}

interface LMSPluginContext {
  eventBus: EventBus;
  fsmEngine: FSMEngine;
  ruleEngine: RuleEngine;
  queue: Queue;
  scheduler: Scheduler;
  realtime: RealtimeGateway;
  db: DatabaseClient;
  logger: Logger;
  dispatch: <R = unknown>(command: Command) => Promise<R>;
  query: <R = unknown>(query: Query) => Promise<R>;
  config: LMSPluginConfig;
}

export type {
  ID,
  Timestamp,
  Meta,
  Money,
  Entity,
  DomainEvent,
  Command,
  Query,
  EventBus,
  Action,
  RuleExpr,
  Transition,
  StateNode,
  StateMachine,
  FSMEngine,
  Op,
  RuleEngine,
  Filter,
  PaginatedResult,
  Transaction,
  Repository,
  Job,
  JobOptions,
  Queue,
  Scheduler,
  RealtimeGateway,
  DatabaseClient,
  Logger,
  ActorContext,
  PaymentOrder,
  PaymentSession,
  PaymentResult,
  RefundResult,
  WebhookEvent,
  MeetingSession,
  MeetingDetails,
  RecordingDetails,
  StoredFile,
  NotificationPayload,
  NotificationResult,
  PaymentAdapter,
  VideoMeetingAdapter,
  StorageAdapter,
  NotificationAdapter,
  LMSPluginConfig,
  LMSPluginContext,
};
