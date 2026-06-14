# Security Plugin

The security plugin provides HTTP hardening middleware: security headers, rate limiting, CORS, and IP access control.

It runs **before** auth and compose handlers so protections apply to every request including login endpoints.

---

## Architecture position

```
Shell registration order:
  security.plugin   ← first: headers + rate limiting + IP checks
  logging.plugin    ← second: request logging
  auth.plugin       ← third: token validation
  composes          ← last: business routes
```

Register security before everything else. Rate limiting and IP checks must reject requests before they consume any resources.

---

## Packages

| Package | Purpose |
|---------|---------|
| `@projectx/plugin-security-server` | Security headers, rate limiting, CORS, IP rules |

No web package. Security hardening is server-side only.

---

## Server integration

### Factory

```typescript
import { createSecurityPlugin } from "@projectx/plugin-security-server";

const security = createSecurityPlugin({
  headers: true,              // enable security headers (default: true)
  cors: {
    origins: ["https://app.example.com"],
    credentials: true,
  },
  rateLimit: {
    provider: "memory",       // "memory" (dev) | "redis" (prod)
    global: { max: 200, windowMs: 60_000 },   // 200 req/min per IP globally
    routes: {
      "/platform/auth/login":    { max: 10,  windowMs: 60_000 },  // 10/min
      "/platform/auth/register": { max: 5,   windowMs: 60_000 },  // 5/min
      "/platform/auth/forgot-password": { max: 3, windowMs: 300_000 }, // 3/5min
    },
  },
  ip: {
    allowlist: [],            // if non-empty, only these IPs pass
    blocklist: [],            // always rejected regardless of allowlist
  },
});
```

### Shell registration

```typescript
// apps/server/src/index.ts
app
  .use(security.plugin)  // first
  .use(logging.plugin)
  .use(auth.plugin)
  .use(platformCompose)
  .use(crmCompose);
```

---

## Security headers

When `headers: true`, the plugin sets these on every response:

| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `0` (modern browsers use CSP; this header is deprecated) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Content-Security-Policy` | Configurable (see below) |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

### CSP configuration

```typescript
createSecurityPlugin({
  headers: {
    csp: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'nonce-{nonce}'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
});
```

---

## Rate limiting

### Providers

**`memory`** — in-process sliding window counter. Zero deps. Not shared across server instances.  
Use in development and single-instance deployments.

**`redis`** — Redis-backed sliding window. Shared across all instances.  
Use in production and multi-instance deployments.

```typescript
rateLimit: {
  provider: "redis",
  redis: {
    url: env.REDIS_URL,
  },
  global: { max: 500, windowMs: 60_000 },
}
```

### Rate limit keys

By default, rate limits are keyed by **client IP**.

After auth middleware runs, per-actor limits are also available (keyed by `actorId`):

```typescript
routes: {
  "/platform/users": {
    max: 100,
    windowMs: 60_000,
    keyBy: "actor",    // "ip" (default) | "actor" | "org"
  },
}
```

### Rate limit response

```
HTTP 429 Too Many Requests
Retry-After: 45
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1718358225

{ "error": "rate_limit_exceeded", "retryAfterSeconds": 45 }
```

---

## CORS

```typescript
cors: {
  origins: ["https://app.example.com", "https://admin.example.com"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  headers: ["Content-Type", "Authorization", "X-Trace-Id"],
  credentials: true,
  maxAge: 86400,   // preflight cache in seconds
}
```

For local development, use:

```typescript
cors: {
  origins: env.isDev ? ["http://localhost:3000"] : ["https://app.example.com"],
  credentials: true,
}
```

---

## IP access control

### Allowlist

If `allowlist` is non-empty, only listed IPs (or CIDR ranges) can reach the server. All others get `403 Forbidden`.

```typescript
ip: {
  allowlist: ["10.0.0.0/8", "192.168.1.0/24"],
}
```

Useful for admin deployments accessible only from a VPN.

### Blocklist

Listed IPs/CIDRs are always rejected with `403 Forbidden`, regardless of allowlist.

```typescript
ip: {
  blocklist: ["203.0.113.42", "198.51.100.0/24"],
}
```

Both lists support IPv4 and IPv6 CIDR notation. Lists are checked on every request — runtime-updatable if loaded from DB or config service.

---

## Trusted proxies

When running behind a reverse proxy (Nginx, Cloudflare), client IPs arrive in `X-Forwarded-For`. Configure trusted proxy count so the plugin reads the correct IP:

```typescript
createSecurityPlugin({
  trustedProxies: 1,   // trust one hop (e.g. Nginx)
  // for Cloudflare: trustedProxies: "cloudflare"  → reads CF-Connecting-IP
});
```

---

## Multi-compose note

Security plugin is registered once at the shell. All composes share the same security configuration. Route-specific rate limits target paths across all composes — use full path prefixes:

```typescript
routes: {
  "/platform/auth/login": { max: 10, windowMs: 60_000 },
  "/crm/contacts":        { max: 300, windowMs: 60_000 },
}
```
