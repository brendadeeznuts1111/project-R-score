import { randomUUID } from "node:crypto";

import { serverConfig } from "./server-config";
import type { AuthSession } from "./store";

export function createSession(memberId: string): AuthSession {
  const createdAt = new Date().toISOString();
  return {
    token: randomUUID(),
    memberId,
    createdAt,
    expiresAt: new Date(Date.now() + serverConfig.sessionTtlMs).toISOString(),
  };
}

function parseCookies(request: Request): Map<string, string> {
  const cookieHeader = request.headers.get("cookie");
  const cookies = new Map<string, string>();
  if (!cookieHeader) return cookies;

  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (!name) continue;
    cookies.set(name, decodeURIComponent(rest.join("=")));
  }

  return cookies;
}

export function authTokenFromRequest(request: Request): string | null {
  return parseCookies(request).get(serverConfig.sessionCookieName) ?? null;
}

function baseCookie(token: string, expiresAt: string): string {
  const segments = [
    `${serverConfig.sessionCookieName}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${new Date(expiresAt).toUTCString()}`,
  ];

  if (serverConfig.secureCookies) {
    segments.push("Secure");
  }

  return segments.join("; ");
}

export function setSessionCookie(session: AuthSession): string {
  return baseCookie(session.token, session.expiresAt);
}

export function clearSessionCookie(): string {
  const segments = [
    `${serverConfig.sessionCookieName}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    `Expires=${new Date(0).toUTCString()}`,
  ];

  if (serverConfig.secureCookies) {
    segments.push("Secure");
  }

  return segments.join("; ");
}
