# Auth Plugin

The auth plugin is the HTTP authentication layer. It validates tokens, resolves sessions, and populates `SystemContext` with the current actor on every request.

It is **not** the identity domain. The identity module owns actors, sessions, roles, and permissions as DB records. The auth plugin owns token verification and the HTTP middleware that makes authentication work.

---

## Architecture position

```
identity module   → domain data: Actor, Session, Role, Permission (DB records)
auth plugin       → transport layer: token validation, session resolution, middleware

Platform compose  → wires them: configures auth plugin with LocalJWT + identity session lookup
                 → provides /auth/* routes (login, logout, register, reset)
Other composes   → receive ctx.actor automatically from auth middleware
Shell            → registers auth plugin ONCE before mounting any compose
```

The compose is where identity module and auth plugin meet. Other composes receive auth context without needing to know how it works.

---

## Packages

| Package | Purpose |
|---------|---------|
| `@projectx/plugin-auth-server` | Elysia middleware, token validation, /auth/* routes |
| `@projectx/plugin-auth-web` | `useAuth()` hook, `AuthGuard`, API interceptor |

---

## Providers

| Provider | When to use |
|----------|------------|
| `LocalJWTProvider` | Default. Signs/verifies JWTs. Looks up sessions in identity module DB. |
| `Auth0Provider` | Delegates token verification to Auth0. No local session store needed. |
| `ClerkProvider` | Delegates to Clerk. Clerk manages sessions. |
| `SupabaseAuthProvider` | Delegates to Supabase Auth. |

---

## Server integration

### Factory

```typescript
import { createAuthPlugin } from "@projectx/plugin-auth-server";

const auth = createAuthPlugin({
  provider: "local-jwt",
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: "8h",
    refreshExpiresIn: "30d",
  },
  // passed by Platform compose at boot — identity module session lookup
  sessionLookup: (sessionId: string) => identity.queries.getSession(sessionId),
  // optional: skip auth on specific paths
  publicPaths: ["/platform/auth/login", "/platform/auth/register", "/health"],
});
```

### Shell registration

```typescript
// apps/server/src/index.ts
const auth = createAuthPlugin({ ... });

app
  .use(auth.plugin)      // registers middleware globally
  .use(platformCompose)  // /platform — also adds /platform/auth/* routes
  .use(crmCompose)       // /crm — receives ctx.actor automatically
  .use(erpCompose);      // /erp — receives ctx.actor automatically
```

The auth plugin middleware runs before every compose handler. It populates `ctx.actor` and `ctx.org` in `SystemContext` or returns `401` for unauthenticated requests on protected paths.

### What the middleware does

1. Extract Bearer token from `Authorization` header
2. Verify token signature via active provider
3. Decode session ID from token payload
4. Look up session record (via `sessionLookup` callback or provider-native lookup)
5. Check session is not expired or revoked
6. Populate `SystemContext` with `{ actorId, orgId, roles, permissions }`
7. On failure: return `401 Unauthorized` (public paths pass through)

### Auth routes (provided by auth plugin, mounted by Platform compose)

Platform compose mounts these via the auth plugin's route factory:

```
POST   /platform/auth/login            → validate credentials → issue token pair
POST   /platform/auth/logout           → revoke session
POST   /platform/auth/refresh          → rotate access token using refresh token
GET    /platform/auth/me               → return current actor from session
POST   /platform/auth/register         → create actor (admin-only or invite flow)
POST   /platform/auth/verify-email     → activate actor
POST   /platform/auth/forgot-password  → trigger password reset email
POST   /platform/auth/reset-password   → apply new password from reset token
```

These routes call identity module commands (`identity.login`, `identity.logout`, etc.) and return JWT pairs.

---

## Web integration

### Install

```typescript
// apps/web/src/providers.tsx
import { AuthProvider } from "@projectx/plugin-auth-web";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider loginPath="/login" apiBase="/platform/auth">
      {children}
    </AuthProvider>
  );
}
```

### `useAuth()` hook

```typescript
import { useAuth } from "@projectx/plugin-auth-web";

function Header() {
  const { actor, isAuthenticated, logout } = useAuth();

  return (
    <div>
      {isAuthenticated ? (
        <>
          <span>{actor.email}</span>
          <button onClick={logout}>Sign out</button>
        </>
      ) : null}
    </div>
  );
}
```

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `actor` | `Actor \| null` | Current authenticated actor |
| `isAuthenticated` | `boolean` | Whether session is active |
| `isLoading` | `boolean` | Auth state resolving |
| `login(email, password)` | `Promise<void>` | Authenticate and store tokens |
| `logout()` | `Promise<void>` | Revoke session, clear tokens, redirect |
| `refreshToken()` | `Promise<void>` | Rotate access token |

### `AuthGuard` component

Redirects to login if not authenticated:

```typescript
import { AuthGuard } from "@projectx/plugin-auth-web";

// In a TanStack Router route loader or component:
<AuthGuard>
  <DashboardPage />
</AuthGuard>
```

### API interceptor

The web package exports a configured fetch client that auto-attaches the Bearer token and handles `401` responses by attempting a token refresh before redirecting to login:

```typescript
import { createAuthClient } from "@projectx/plugin-auth-web";

export const api = createAuthClient({ base: "/platform/auth" });

// Use in compose API clients:
const response = await api.get("/platform/users");
```

---

## Token storage

Tokens are stored in `httpOnly` cookies by default (no XSS exposure). Configure in factory:

```typescript
createAuthPlugin({
  tokenStorage: "cookie",      // "cookie" (default) | "memory"
  cookie: {
    secure: true,
    sameSite: "lax",
    domain: env.COOKIE_DOMAIN,
  },
});
```

---

## Multi-compose deployment

Auth plugin is registered once at the shell. All composes in the same deployment share the authentication layer. Platform compose provides the login/logout routes; other composes do not need to know where tokens come from.

```
Shell: auth.plugin → platform (/platform/*) → crm (/crm/*) → erp (/erp/*)
                         ↑
                   owns /auth/* routes
                   configures LocalJWT with identity session lookup
```

If a deployment has no Platform compose (e.g., a standalone CRM deployment), the CRM compose must configure the auth plugin itself and provide its own auth routes.

---

## Composing with identity module

Platform compose wires the two together at boot:

```typescript
// composes/platform/server/src/index.ts
import { createAuthPlugin } from "@projectx/plugin-auth-server";
import { identityModule } from "../../modules/identity";

export const platformCompose = new Elysia({ prefix: "/platform" })
  .use(
    createAuthPlugin({
      provider: "local-jwt",
      jwt: { secret: env.JWT_SECRET, expiresIn: "8h" },
      sessionLookup: (id) => identityModule.queries.getSession(id),
    }).routes  // mounts /auth/* under /platform
  )
  // ... other platform routes
```

The identity module never imports from the auth plugin. The auth plugin receives a callback; it does not know it is talking to the identity module.

---

## Security notes

- Access tokens expire in 8h by default; refresh tokens in 30d
- Refresh tokens are single-use (rotated on each refresh)
- Sessions are stored in DB; revocation is immediate (no need to wait for token expiry)
- `publicPaths` must be explicit; all other paths require a valid session by default
- For OAuth2/OIDC providers (Auth0, Clerk), the plugin verifies JWTs using the provider's JWKS endpoint
