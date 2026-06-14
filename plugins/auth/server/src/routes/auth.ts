import { Elysia, t } from "elysia";
import type { AuthConfig } from "../types";
import type { JwtProvider } from "../providers/local-jwt";

function parseExpiresIn(expiresIn: string): Date {
  const now = Date.now();
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return new Date(now + 8 * 60 * 60 * 1000);
  const [, num, unit] = match;
  const ms: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return new Date(now + parseInt(num) * (ms[unit] ?? 3_600_000));
}

export function createAuthRoutes(config: AuthConfig, provider: JwtProvider) {
  return new Elysia({ prefix: "/auth" })
    .post(
      "/login",
      async ({ body, set, request }) => {
        if (!config.onLogin) {
          set.status = 501;
          return { error: "Login not configured" };
        }

        const { email, password } = body;
        const ip =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          request.headers.get("x-real-ip") ??
          "unknown";
        const userAgent = request.headers.get("user-agent") ?? "unknown";
        const expiresAt = parseExpiresIn(config.jwt.expiresIn);

        try {
          // identity module verifies credentials + creates session
          const { actorId, orgId, sessionId } = await config.onLogin(
            email,
            password,
            ip,
            userAgent,
            expiresAt,
          );

          // auth plugin issues JWT with sessionId in claims
          const token = await provider.issueToken({ actorId, orgId, sessionId });
          const refreshToken = config.jwt.refreshExpiresIn
            ? await provider.issueRefreshToken({ actorId, orgId, sessionId })
            : undefined;

          return { token, ...(refreshToken ? { refreshToken } : {}), actorId };
        } catch (err) {
          set.status = 401;
          return { error: err instanceof Error ? err.message : "Authentication failed" };
        }
      },
      {
        body: t.Object({
          email: t.String({ format: "email" }),
          password: t.String({ minLength: 1 }),
        }),
      },
    )
    .post("/logout", async ({ headers, set }) => {
      if (!config.onLogout) return { success: true };

      const authHeader = headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        set.status = 401;
        return { error: "No token provided" };
      }

      const token = authHeader.slice(7);
      const claims = await provider.verifyToken(token);
      if (!claims) {
        set.status = 401;
        return { error: "Invalid token" };
      }

      await config.onLogout(claims.sessionId);
      return { success: true };
    })
    .get("/me", async ({ headers, set }) => {
      const authHeader = headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        set.status = 401;
        return { error: "No token provided" };
      }

      const token = authHeader.slice(7);
      const claims = await provider.verifyToken(token);
      if (!claims) {
        set.status = 401;
        return { error: "Invalid token" };
      }

      if (!config.onResolveSession) {
        return { actorId: claims.actorId, orgId: claims.orgId };
      }

      const session = await config.onResolveSession(claims.sessionId);
      if (!session) {
        set.status = 401;
        return { error: "Session not found or expired" };
      }

      if (session.expiresAt < new Date() || session.revokedAt) {
        set.status = 401;
        return { error: "Session expired" };
      }

      return {
        actorId: session.actorId,
        orgId: session.orgId,
        roles: session.roles,
        sessionId: session.sessionId,
      };
    })
    .post(
      "/refresh",
      async ({ body, set }) => {
        if (!config.onRefresh) {
          set.status = 501;
          return { error: "Token refresh not configured" };
        }

        const { refreshToken } = body;
        const claims = await provider.verifyRefreshToken(refreshToken);
        if (!claims) {
          set.status = 401;
          return { error: "Invalid refresh token" };
        }

        const newExpiresAt = parseExpiresIn(config.jwt.expiresIn);

        try {
          const { actorId, orgId } = await config.onRefresh(claims.sessionId, newExpiresAt);
          const newToken = await provider.issueToken({ actorId, orgId, sessionId: claims.sessionId });
          const newRefreshToken = config.jwt.refreshExpiresIn
            ? await provider.issueRefreshToken({ actorId, orgId, sessionId: claims.sessionId })
            : undefined;

          return { token: newToken, ...(newRefreshToken ? { refreshToken: newRefreshToken } : {}) };
        } catch (err) {
          set.status = 401;
          return { error: err instanceof Error ? err.message : "Refresh failed" };
        }
      },
      {
        body: t.Object({ refreshToken: t.String() }),
      },
    )
    .post(
      "/register",
      async ({ body, set }) => {
        if (!config.onRegister) {
          set.status = 501;
          return { error: "Registration not configured" };
        }

        try {
          const result = await config.onRegister(body);
          return { actorId: result.actorId };
        } catch (err) {
          set.status = 400;
          return { error: err instanceof Error ? err.message : "Registration failed" };
        }
      },
      {
        body: t.Object({
          email: t.String({ format: "email" }),
          password: t.String({ minLength: 8 }),
          firstName: t.Optional(t.String()),
          lastName: t.Optional(t.String()),
          organizationId: t.String(),
        }),
      },
    )
    .post(
      "/forgot-password",
      async ({ body }) => {
        if (config.onForgotPassword) {
          try {
            await config.onForgotPassword(body.email, body.orgId);
          } catch {
            // don't leak whether email exists
          }
        }
        return { success: true };
      },
      {
        body: t.Object({
          email: t.String({ format: "email" }),
          orgId: t.String(),
        }),
      },
    )
    .post(
      "/reset-password",
      async ({ body, set }) => {
        if (!config.onResetPassword) {
          set.status = 501;
          return { error: "Password reset not configured" };
        }

        try {
          await config.onResetPassword(body.token, body.newPassword);
          return { success: true };
        } catch (err) {
          set.status = 400;
          return { error: err instanceof Error ? err.message : "Reset failed" };
        }
      },
      {
        body: t.Object({
          token: t.String(),
          newPassword: t.String({ minLength: 8 }),
        }),
      },
    );
}
