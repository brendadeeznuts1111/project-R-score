import { afterEach, describe, expect, it } from "bun:test";
import { handleInternalHealth, handleUpdateCookies } from "../../src/api/internal-routes";

const originalEnv = {
  INTERNAL_API_TOKEN: process.env.INTERNAL_API_TOKEN,
  NODE_ENV: process.env.NODE_ENV,
};

afterEach(() => {
  for (const [name, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe("Sports Terminal internal route authentication", () => {
  it("fails closed in production when INTERNAL_API_TOKEN is not configured", async () => {
    delete process.env.INTERNAL_API_TOKEN;
    process.env.NODE_ENV = "production";

    const healthResponse = handleInternalHealth(
      new Request("http://localhost/api/internal/health")
    );
    const updateResponse = await handleUpdateCookies(
      new Request("http://localhost/api/internal/update-cookies", { method: "POST" })
    );

    expect(healthResponse.status).toBe(401);
    expect(updateResponse.status).toBe(401);
  });

  it("rejects an invalid token before parsing the update payload", async () => {
    process.env.INTERNAL_API_TOKEN = "configured-internal-token";
    process.env.NODE_ENV = "production";

    const response = await handleUpdateCookies(
      new Request("http://localhost/api/internal/update-cookies", {
        method: "POST",
        headers: { "X-Internal-Token": "wrong-token" },
      })
    );

    expect(response.status).toBe(401);
  });

  it("accepts the configured bearer token before validating the payload", async () => {
    process.env.INTERNAL_API_TOKEN = "configured-internal-token";
    process.env.NODE_ENV = "production";

    const response = await handleUpdateCookies(
      new Request("http://localhost/api/internal/update-cookies", {
        method: "POST",
        headers: { Authorization: "Bearer configured-internal-token" },
      })
    );

    expect(response.status).toBe(400);
  });
});
