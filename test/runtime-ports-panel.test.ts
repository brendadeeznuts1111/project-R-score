import { afterAll, describe, expect, test } from "bun:test";
import { RuntimePortsPanel } from "../dashboard/components/RuntimePorts";

describe("RuntimePortsPanel", () => {
  test("scan() returns runtime ports payload from provided base", async () => {
    const server = Bun.serve({
      port: 0,
      fetch(req) {
        const url = new URL(req.url);
        if (url.pathname === "/api/control/runtime/ports") {
          return Response.json({
            requestedPort: 3401,
            activePort: 3402,
            remapped: true,
            fallbackAllowed: true,
            requestedPortOwner: { ownerPid: 123, ownerCommand: "bun" },
            activePortOwner: { ownerPid: 456, ownerCommand: "bun" },
          });
        }
        return new Response("not found", { status: 404 });
      },
    });

    try {
      const panel = new RuntimePortsPanel(`http://localhost:${server.port}`);
      const result = await panel.scan();
      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
      expect(result.requestedPort).toBe(3401);
      expect(result.activePort).toBe(3402);
      expect(result.remapped).toBe(true);
      expect(result.fallbackAllowed).toBe(true);
    } finally {
      server.stop(true);
    }
  });

  test("scan() reports failure when endpoint is unavailable", async () => {
    const panel = new RuntimePortsPanel("http://localhost:65534", { autoStart: false });
    const result = await panel.scan();
    expect(result.ok).toBe(false);
    expect(typeof result.error).toBe("string");
  });
});
