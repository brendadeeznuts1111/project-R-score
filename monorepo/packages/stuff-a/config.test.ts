import { describe, test, expect } from "bun:test";
import { DEFAULT_PORT, DEFAULT_TEST_PORT, AUTH, FEATURES, getConfig, serverUrl, wsUrl, userByIdRoute } from "./config";

describe("config validation", () => {
  test("ports should not collide", () => {
    expect(DEFAULT_PORT).not.toBe(DEFAULT_TEST_PORT);
  });

  test("port ranges are valid", () => {
    expect(DEFAULT_PORT).toBeGreaterThanOrEqual(1024);
    expect(DEFAULT_PORT).toBeLessThanOrEqual(65535);
  });

  test("AUTH configuration is accessible", () => {
    expect(AUTH.BCRYPT_COST).toBe(10);
    expect(AUTH.BEARER_PREFIX).toBe("Bearer ");
    expect(AUTH.API_TOKEN_ENV).toBe("STUFF_API_TOKEN");
  });

  test("AUTH.API_TOKEN reads from env", () => {
    // In test env, STUFF_API_TOKEN is not set
    expect(AUTH.API_TOKEN).toBeUndefined();
  });

  test("getConfig returns config sections", () => {
    const routes = getConfig("ROUTES");
    expect(routes.USERS).toBe("/users");
    expect(routes.HEALTH).toBe("/health");

    const limits = getConfig("LIMITS");
    expect(limits.RATE_LIMIT_MAX_REQUESTS).toBe(100);
  });

  test("FEATURES.isEnabled returns boolean for boolean features", () => {
    expect(typeof FEATURES.isEnabled("ENABLE_METRICS")).toBe("boolean");
    expect(typeof FEATURES.isEnabled("RATE_LIMITING")).toBe("boolean");
  });

  test("FEATURES.isEnabled handles rollout percentage with userId", () => {
    // NEW_DASHBOARD_ROLLOUT is 0 by default, so always false
    const result = FEATURES.isEnabled("NEW_DASHBOARD_ROLLOUT", { userId: "test-user" });
    expect(result).toBe(false);
  });

  test("FEATURES.isEnabled returns false for unknown feature", () => {
    expect(FEATURES.isEnabled("NONEXISTENT_FEATURE")).toBe(false);
  });

  test("serverUrl and wsUrl produce correct URLs", () => {
    expect(serverUrl(3000, "localhost")).toBe("http://localhost:3000");
    expect(wsUrl(3000, "localhost")).toBe("ws://localhost:3000");
  });

  test("userByIdRoute produces correct path", () => {
    expect(userByIdRoute("abc-123")).toBe("/users/abc-123");
  });
});
