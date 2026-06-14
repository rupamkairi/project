import * as jose from "jose";
import type { JwtConfig } from "../types";

export interface JwtProvider {
  issueToken(payload: { actorId: string; orgId: string; sessionId: string }): Promise<string>;
  issueRefreshToken(payload: { actorId: string; orgId: string; sessionId: string }): Promise<string>;
  verifyToken(token: string): Promise<{ actorId: string; orgId: string; sessionId: string } | null>;
  verifyRefreshToken(token: string): Promise<{ actorId: string; orgId: string; sessionId: string } | null>;
}

export function createLocalJwtProvider(config: JwtConfig): JwtProvider {
  const secret = new TextEncoder().encode(config.secret);
  const refreshSecret = new TextEncoder().encode(config.secret + ":refresh");

  async function issueToken(payload: {
    actorId: string;
    orgId: string;
    sessionId: string;
  }): Promise<string> {
    return new jose.SignJWT({
      sub: payload.actorId,
      orgId: payload.orgId,
      sessionId: payload.sessionId,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(config.expiresIn)
      .sign(secret);
  }

  async function issueRefreshToken(payload: {
    actorId: string;
    orgId: string;
    sessionId: string;
  }): Promise<string> {
    return new jose.SignJWT({
      sub: payload.actorId,
      orgId: payload.orgId,
      sessionId: payload.sessionId,
      type: "refresh",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(config.refreshExpiresIn ?? "30d")
      .sign(refreshSecret);
  }

  async function verifyToken(
    token: string,
  ): Promise<{ actorId: string; orgId: string; sessionId: string } | null> {
    try {
      const { payload } = await jose.jwtVerify(token, secret);
      if (!payload.sub || !payload.sessionId) return null;
      return {
        actorId: payload.sub,
        orgId: payload.orgId as string,
        sessionId: payload.sessionId as string,
      };
    } catch {
      return null;
    }
  }

  async function verifyRefreshToken(
    token: string,
  ): Promise<{ actorId: string; orgId: string; sessionId: string } | null> {
    try {
      const { payload } = await jose.jwtVerify(token, refreshSecret);
      if (!payload.sub || !payload.sessionId || payload.type !== "refresh") return null;
      return {
        actorId: payload.sub,
        orgId: payload.orgId as string,
        sessionId: payload.sessionId as string,
      };
    } catch {
      return null;
    }
  }

  return { issueToken, issueRefreshToken, verifyToken, verifyRefreshToken };
}
