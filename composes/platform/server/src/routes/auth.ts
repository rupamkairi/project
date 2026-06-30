// Platform Auth Routes - Login, logout, me, refresh

import Elysia from "elysia";
import { t } from "elysia";
import { createHash } from "node:crypto";
import { db } from "@db/client";
import { actors, sessions } from "@db/schema/identity";
import { eq, and, isNull } from "drizzle-orm";
import { generateId } from "@core/entity";
import * as jose from "jose";
import { env } from "@infra/env";

async function createAccessToken(
  payload: Record<string, unknown>,
): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN || "7d")
    .sign(secret);
}

async function verifyToken(token: string): Promise<jose.JWTPayload | null> {
  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createAuthRoutes() {
  return new Elysia({ prefix: "/auth" })
  .post(
    "/login",
    async ({ body, set, request }) => {
      const { email, password } = body as { email: string; password: string };

      const [actor] = await db
        .select()
        .from(actors)
        .where(and(eq(actors.email, email), isNull(actors.deletedAt)))
        .limit(1);

      if (!actor) {
        set.status = 401;
        return { error: "Invalid credentials" };
      }

      if (actor.status !== "active") {
        set.status = 403;
        return { error: "Account is not active" };
      }

      const validPassword = actor.passwordHash
        ? await Bun.password.verify(password, actor.passwordHash)
        : false;

      if (!validPassword) {
        set.status = 401;
        return { error: "Invalid credentials" };
      }

      const token = await createAccessToken({
        sub: actor.id,
        email: actor.email,
        orgId: actor.organizationId,
      });

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000);

      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip") ??
        "unknown";
      const userAgent = request.headers.get("user-agent") ?? "unknown";

      await db.insert(sessions).values({
        id: generateId(),
        organizationId: actor.organizationId,
        actorId: actor.id,
        tokenHash: hashToken(token),
        expiresAt,
        ip,
        userAgent,
        createdAt: now,
        updatedAt: now,
        version: 1,
        deletedAt: null,
        meta: {},
      });

      await db
        .update(actors)
        .set({ lastLoginAt: now, updatedAt: now })
        .where(eq(actors.id, actor.id));

      return {
        token,
        actor: {
          id: actor.id,
          email: actor.email,
          firstName: actor.firstName,
          lastName: actor.lastName,
          avatarUrl: actor.avatarUrl,
        },
      };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 1 }),
      }),
    },
  )
  .post("/logout", async ({ headers, set }) => {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401;
      return { error: "No token provided" };
    }

    const token = authHeader.slice(7);
    const tokenHash = hashToken(token);

    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.tokenHash, tokenHash));

    return { success: true };
  })
  .get("/me", async ({ headers, set }) => {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401;
      return { error: "No token provided" };
    }

    const token = authHeader.slice(7);
    const payload = await verifyToken(token);

    if (!payload || !payload.sub) {
      set.status = 401;
      return { error: "Invalid token" };
    }

    const [actor] = await db
      .select()
      .from(actors)
      .where(eq(actors.id, payload.sub as string))
      .limit(1);

    if (!actor) {
      set.status = 404;
      return { error: "Actor not found" };
    }

    return {
      id: actor.id,
      email: actor.email,
      firstName: actor.firstName,
      lastName: actor.lastName,
      avatarUrl: actor.avatarUrl,
      status: actor.status,
      type: actor.type,
    };
  })
  .post("/refresh", async ({ headers, set }) => {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401;
      return { error: "No token provided" };
    }

    const token = authHeader.slice(7);
    const payload = await verifyToken(token);

    if (!payload || !payload.sub) {
      set.status = 401;
      return { error: "Invalid token" };
    }

    // Create new token
    const newToken = await createAccessToken({
      sub: payload.sub as string,
      email: payload.email as string,
      orgId: payload.orgId as string,
    });

    return { token: newToken };
  });
}

export type AuthRoutes = ReturnType<typeof createAuthRoutes>;
