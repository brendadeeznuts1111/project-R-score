import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { createHTTPServer } from "../src/server";

let server: ReturnType<typeof createHTTPServer>;
let BASE_URL: string;

describe("Sports API", () => {
  beforeAll(() => {
    // Start the HTTP server before tests on a random available port
    server = createHTTPServer(0);
    // Get the actual port the server is listening on
    const port = (server as any).port || 3000;
    BASE_URL = `http://localhost:${port}`;
  });

  afterAll(() => {
    // Stop the server after tests
    if (server) {
      server.stop();
    }
  });

  test("GET /health returns ok", async () => {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.timestamp).toBeNumber();
  });

  test("GET /api returns API info", async () => {
    const res = await fetch(`${BASE_URL}/api`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.message).toBe("Sports API");
    expect(data.version).toBe("0.1.0");
  });

  test("GET /unknown returns 404", async () => {
    const res = await fetch(`${BASE_URL}/unknown`);
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.code).toBe("ROUTE_NOT_FOUND");
    expect(data.message).toBe("API endpoint does not exist");
  });
});
