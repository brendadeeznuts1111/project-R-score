import { afterEach, describe, expect, it } from "bun:test";
import { SignJWT } from "jose";
import { AuthError, ForbiddenError } from "../../src/utils/errors";
import { authenticate, authenticateOptional, requireAdmin } from "../../src/auth/middleware";

const originalEnv = {
  ADMIN_API_TOKEN: process.env.ADMIN_API_TOKEN,
  DEV_BYPASS_JWT: process.env.DEV_BYPASS_JWT,
  JWT_SECRET: process.env.JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV,
};

afterEach(() => {
  for (const [name, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe("Sports Terminal authentication middleware", () => {
  it("accepts the configured API key as an administrator", async () => {
    process.env.ADMIN_API_TOKEN = "configured-admin-token";
    const context = await authenticate(
      new Request("http://localhost/api/health/detailed", {
        headers: { "X-API-Key": "configured-admin-token", "X-Request-ID": "req_test" },
      })
    );

    expect(context).toEqual({
      user: { id: "admin-api-key", role: "admin" },
      method: "apikey",
      requestId: "req_test",
    });
    expect(() => requireAdmin(context)).not.toThrow();
  });

  it("verifies HS256 bearer tokens and normalizes non-admin roles", async () => {
    process.env.JWT_SECRET = "test-secret-that-is-at-least-32-chars-long";
    const token = await new SignJWT({ role: "viewer", permissions: ["partners:read"] })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("viewer-1")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));

    const context = await authenticate(
      new Request("http://localhost/api/dashboard/metrics", {
        headers: { Authorization: `Bearer ${token}` },
      })
    );

    expect(context.method).toBe("jwt");
    expect(context.user).toEqual(
      expect.objectContaining({ id: "viewer-1", role: "user", permissions: ["partners:read"] })
    );
    expect(() => requireAdmin(context)).toThrow(ForbiddenError);
  });

  it("rejects invalid presented credentials instead of treating them as optional", async () => {
    process.env.ADMIN_API_TOKEN = "configured-admin-token";
    await expect(
      authenticateOptional(
        new Request("http://localhost/api/benchmark", { headers: { "X-API-Key": "wrong" } })
      )
    ).rejects.toBeInstanceOf(AuthError);
  });

  it("allows the explicit development bypass but never in production", async () => {
    process.env.DEV_BYPASS_JWT = "true";
    process.env.NODE_ENV = "development";
    expect((await authenticate(new Request("http://localhost/api/rules"))).method).toBe("dev_bypass");

    process.env.NODE_ENV = "production";
    await expect(authenticate(new Request("http://localhost/api/rules"))).rejects.toBeInstanceOf(AuthError);
  });
});
