import { Elysia } from "elysia";
import type { AuthConfig, AuthActor } from "./types";
import type { JwtProvider } from "./providers/local-jwt";

export function createAuthMiddleware(config: AuthConfig, provider: JwtProvider) {
  const publicPaths = config.publicPaths ?? [];

  return new Elysia({ name: "@projectx/auth-middleware" })
    .derive({ as: "global" }, async ({ headers, request }) => {
      const authHeader = headers.authorization;
      const token =
        authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

      if (!token) return { actor: null as AuthActor | null };

      const claims = await provider.verifyToken(token);
      if (!claims) return { actor: null as AuthActor | null };

      const session = config.onResolveSession
        ? await config.onResolveSession(claims.sessionId)
        : null;

      if (!session) return { actor: null as AuthActor | null };

      const now = new Date();
      if (session.expiresAt < now) return { actor: null as AuthActor | null };
      if (session.revokedAt) return { actor: null as AuthActor | null };

      const roles = session.roles.length > 0
        ? session.roles
        : config.onGetRoles
          ? await config.onGetRoles(claims.actorId)
          : [];

      const actor: AuthActor = {
        id: claims.actorId,
        orgId: claims.orgId,
        sessionId: claims.sessionId,
        roles,
      };

      return { actor };
    })
    .onBeforeHandle({ as: "global" }, ({ actor, request, set }) => {
      const path = new URL(request.url).pathname;
      const isPublic = publicPaths.some((p) => path.startsWith(p));
      if (!isPublic && !actor) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
    });
}
