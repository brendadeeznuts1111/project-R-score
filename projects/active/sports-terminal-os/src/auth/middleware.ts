/** Request authentication and role authorization for the native Bun router. */

import { jwtVerify, type JWTPayload } from "jose";
import { getActiveSession } from "@auth/session";
import { AuthError, ForbiddenError } from "@utils/errors";
import type { AuthContext, AuthenticatedUser, UserRole } from "@utils/types";

const encoder = new TextEncoder();
const SESSION_COOKIE_NAME = "buckeye_session_id";
const ADMIN_ROLES: ReadonlySet<UserRole> = new Set(["admin", "superadmin", "dev"]);

function requestId(req: Request): string {
  return req.headers.get("X-Request-ID") || `req_${Bun.randomUUIDv7().slice(0, 12)}`;
}

async function constantTimeEqual(left: string, right: string): Promise<boolean> {
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index++) {
    difference |= leftBytes[index]! ^ rightBytes[index]!;
  }
  return difference === 0;
}

function cookieValue(req: Request, name: string): string | null {
  const cookie = req.headers.get("Cookie");
  if (!cookie) return null;
  for (const field of cookie.split(";")) {
    const separator = field.indexOf("=");
    if (separator < 0 || field.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(field.slice(separator + 1).trim());
    } catch {
      throw new AuthError("Malformed session cookie", "INVALID_SESSION_COOKIE");
    }
  }
  return null;
}

function normalizedRole(value: unknown): UserRole {
  if (value === "admin" || value === "superadmin") return value;
  return "user";
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) return undefined;
  return value;
}

function userFromJwt(payload: JWTPayload): AuthenticatedUser {
  if (typeof payload.sub !== "string" || !payload.sub.trim()) {
    throw new AuthError("JWT is missing its subject", "INVALID_JWT_SUBJECT");
  }
  const login = typeof payload.login === "string" ? payload.login : undefined;
  const email = typeof payload.email === "string" ? payload.email : undefined;
  const permissions = stringArray(payload.permissions);
  return {
    id: payload.sub,
    role: normalizedRole(payload.role),
    ...(login ? { login } : {}),
    ...(email ? { email } : {}),
    ...(permissions ? { permissions } : {}),
    ...(typeof payload.iat === "number" ? { iat: payload.iat } : {}),
    ...(typeof payload.exp === "number" ? { exp: payload.exp } : {}),
    ...(typeof payload.jti === "string" ? { jti: payload.jti } : {}),
  };
}

async function authenticateApiKey(req: Request, apiKey: string): Promise<AuthContext> {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected || !(await constantTimeEqual(apiKey, expected))) {
    throw new AuthError("Invalid API key", "INVALID_API_KEY");
  }
  return {
    user: { id: "admin-api-key", role: "admin" },
    method: "apikey",
    requestId: requestId(req),
  };
}

async function authenticateJwt(req: Request, token: string): Promise<AuthContext> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new AuthError("JWT authentication is not configured", "JWT_NOT_CONFIGURED");
  try {
    const { payload } = await jwtVerify(token, encoder.encode(secret), { algorithms: ["HS256"] });
    return { user: userFromJwt(payload), method: "jwt", requestId: requestId(req) };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError("Invalid or expired bearer token", "INVALID_JWT");
  }
}

function authenticateSession(req: Request, sessionId: string): AuthContext {
  const session = getActiveSession(sessionId);
  if (!session) throw new AuthError("Invalid or expired session", "INVALID_SESSION");
  const metadata = session.metadata;
  const id = typeof metadata?.userId === "string" ? metadata.userId : session.sessionId;
  const login = typeof metadata?.login === "string" ? metadata.login : undefined;
  return {
    user: { id, role: normalizedRole(metadata?.role), ...(login ? { login } : {}) },
    method: "session",
    requestId: requestId(req),
  };
}

export async function authenticateOptional(req: Request): Promise<AuthContext | null> {
  const apiKey = req.headers.get("X-API-Key");
  if (apiKey) return authenticateApiKey(req, apiKey);

  const authorization = req.headers.get("Authorization");
  if (authorization) {
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match?.[1]) throw new AuthError("Malformed Authorization header", "INVALID_AUTH_HEADER");
    return authenticateJwt(req, match[1]);
  }

  const sessionId = cookieValue(req, SESSION_COOKIE_NAME);
  if (sessionId) return authenticateSession(req, sessionId);

  if (process.env.DEV_BYPASS_JWT === "true" && process.env.NODE_ENV !== "production") {
    return {
      user: { id: "development", role: "dev" },
      method: "dev_bypass",
      requestId: requestId(req),
    };
  }

  return null;
}

export async function authenticate(req: Request): Promise<AuthContext> {
  const context = await authenticateOptional(req);
  if (!context) throw new AuthError("Authentication required");
  return context;
}

export function requireAdmin(auth: AuthContext): void {
  if (!ADMIN_ROLES.has(auth.user.role)) {
    throw new ForbiddenError("Administrator access required", "ADMIN_REQUIRED");
  }
}
