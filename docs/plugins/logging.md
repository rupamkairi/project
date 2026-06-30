# Logging Plugin

The logging plugin provides structured HTTP request logging and application log shipping. It adds a middleware layer that captures per-request context and forwards logs to external services.

This is **infrastructure-level logging** (requests, errors, traces). Application-level logging within business logic uses Core's `Logger` primitive directly.

---

## Architecture position

```
Core Logger primitive  → lightweight structured logger used inside modules/composes
Logging plugin         → HTTP middleware + log shipper to external services
```

The logging plugin wraps Core's Logger with request context and an external transport. It does not replace Core Logger — it enriches it.

---

## Packages

| Package | Purpose |
|---------|---------|
| `@projectx/plugin-logging-server` | Elysia middleware, log context, transport adapters |

No web package. Logging is server-side only.

---

## Providers

| Provider | When to use |
|----------|------------|
| `StdoutJSONProvider` | Default. Writes newline-delimited JSON to stdout. Works with any log aggregator (Datadog, Logtail, Cloudwatch via agent). |
| `DatadogProvider` | Ships directly to Datadog Logs API. Adds `dd.trace_id`, `dd.span_id`. |
| `LogtailProvider` | Ships to Better Stack (Logtail) via HTTP ingestion. |
| `AxiomProvider` | Ships to Axiom via their ingest API. |

---

## Server integration

### Factory

```typescript
import { createLoggingPlugin } from "@projectx/plugin-logging-server";

const logging = createLoggingPlugin({
  provider: "stdout-json",   // "stdout-json" | "datadog" | "logtail" | "axiom"
  level: "info",             // "debug" | "info" | "warn" | "error"
  pretty: env.isDev,         // pretty-print in development
  redact: ["password", "token", "secret", "authorization"],  // fields to mask
});
```

### Shell registration

```typescript
// apps/server/src/index.ts
app
  .use(security.plugin)
  .use(logging.plugin)   // <— register before composes
  .use(auth.plugin)
  .use(createPlatformCompose(mediator))
  .use(createCrmCompose(mediator));
```

---

## What the middleware logs

Each request produces one log line on completion:

```json
{
  "level": "info",
  "time": "2026-06-14T10:23:45.123Z",
  "req": {
    "method": "POST",
    "path": "/platform/users/invite",
    "query": {},
    "ip": "203.0.113.42",
    "userAgent": "Mozilla/5.0 ..."
  },
  "res": {
    "status": 200,
    "durationMs": 47
  },
  "ctx": {
    "compose": "platform",
    "actorId": "01HX...",
    "orgId": "01HY...",
    "traceId": "abc123"
  }
}
```

**Always included:** `level`, `time`, `req.method`, `req.path`, `res.status`, `res.durationMs`  
**Included when auth middleware runs first:** `ctx.actorId`, `ctx.orgId`  
**Included when compose prefix matches:** `ctx.compose`

---

## Application log API

Inside route handlers and module code, use the logger from context:

```typescript
// In an Elysia handler
app.post("/users/invite", ({ log, body }) => {
  log.info({ actorId: body.actorId }, "invite dispatched");
  // ...
});
```

The `log` object is the same structured logger, pre-enriched with request context. All application logs ship through the same provider as request logs.

---

## Provider configuration

### `DatadogProvider`

```typescript
createLoggingPlugin({
  provider: "datadog",
  datadog: {
    apiKey: env.DD_API_KEY,
    site: "datadoghq.eu",   // or "datadoghq.com"
    service: "projectx",
    env: env.NODE_ENV,
    version: env.APP_VERSION,
  },
});
```

### `LogtailProvider`

```typescript
createLoggingPlugin({
  provider: "logtail",
  logtail: {
    sourceToken: env.LOGTAIL_TOKEN,
  },
});
```

### `AxiomProvider`

```typescript
createLoggingPlugin({
  provider: "axiom",
  axiom: {
    token: env.AXIOM_TOKEN,
    dataset: "projectx-logs",
  },
});
```

---

## Log levels

| Level | Use for |
|-------|---------|
| `debug` | Detailed traces, query params, variable values. Dev only. |
| `info` | Normal operations: requests, commands dispatched, events emitted. |
| `warn` | Recoverable issues: retried operations, deprecated paths, near-limit states. |
| `error` | Unrecoverable errors: unhandled exceptions, DB failures, external service errors. |

Set `level: "debug"` in development, `level: "info"` in production.

---

## Sensitive data redaction

Fields listed in `redact` are replaced with `[REDACTED]` before any log is written or shipped. Applies to request body, response body (if logged), and headers.

Default redact list: `["password", "token", "refreshToken", "secret", "authorization", "cookie"]`

---

## Correlation IDs

The logging plugin reads `X-Trace-Id` from incoming request headers and includes it as `ctx.traceId` in every log line for that request. If no header is present, it generates a ULID trace ID.

Pass the same `X-Trace-Id` from your frontend API client to correlate browser → server logs.
