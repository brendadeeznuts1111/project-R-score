import { describe, test, expect } from "bun:test";
import { DEFAULT_PORT, DEFAULT_TEST_PORT, AUTH } from "./config";

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
});
