import { afterAll, describe, expect, test } from "bun:test";
import { UltraResilientFetch } from "../src/fetch/resilient-ultra";

const servers: Array<{ stop: () => void }> = [];

afterAll(() => {
  for (const server of servers) server.stop();
});

describe("UltraResilientFetch", () => {
  test("fails over to healthy origin and records metrics", async () => {
    const healthy = Bun.serve({
      port: 0,
      fetch(req) {
        const url = new URL(req.url);
        if (url.pathname === "/api/health") {
          return Response.json({ status: "ok", service: "test" });
        }
        return new Response("not-found", { status: 404 });
      },
    });
    servers.push(healthy);

    const client = new UltraResilientFetch({
      origins: [
        { url: "http://localhost:3999", weight: 5, priority: 1 },
        { url: `http://localhost:${healthy.port}`, weight: 100, priority: 2 },
      ],
      retries: 2,
      timeoutMs: 1000,
      backoffMs: 10,
      circuitBreaker: {
        enabled: true,
        failureThreshold: 1,
        resetTimeoutMs: 500,
        halfOpenMaxCalls: 1,
      },
      predictive: {
        enabled: true,
        latencyThresholdMs: 500,
        errorRateThreshold: 0.5,
      },
      metrics: {
        enabled: true,
      },
    });

    const response = await client.fetch("/api/health");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");

    const report = client.getMetricsReport() as { metricsSampleSize: number; circuitBreakers: Record<string, { state: string }> };
    expect(report.metricsSampleSize).toBeGreaterThan(0);
    expect(report.circuitBreakers["http://localhost:3999"]?.state).toBe("open");

    client.close();
  });
});

