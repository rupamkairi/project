import { Elysia } from "elysia";
import { createLocalJwtProvider } from "./providers/local-jwt";
import { createAuthMiddleware } from "./middleware";
import { createAuthRoutes } from "./routes/auth";
import type { AuthConfig, AuthPlugin } from "./types";

export function createAuthPlugin(config: AuthConfig): AuthPlugin {
  const provider = createLocalJwtProvider(config.jwt);
  const middleware = createAuthMiddleware(config, provider);
  const routes = createAuthRoutes(config, provider);

  const plugin = new Elysia({ name: "@projectx/plugin-auth" })
    .use(middleware)
    .use(routes);

  return {
    plugin,
    middleware,
    config,
    issueToken: (payload) => provider.issueToken(payload),
    verifyToken: (token) => provider.verifyToken(token),
  };
}

export type {
  AuthConfig,
  AuthPlugin,
  AuthSession,
  AuthActor,
  RegisterPayload,
  JwtConfig,
  AuthProvider,
} from "./types";

export { createAuthMiddleware } from "./middleware";
export { createLocalJwtProvider } from "./providers/local-jwt";
