#!/usr/bin/env bun
import {
  applyDashboardTestEnv,
  getDashboardTestConfig,
  withDashboardServer,
} from "./lib/dashboard-test-server";

type CheckResult = {
  name: string;
  ok: boolean;
  details: string;
};

function printChecks(checks: CheckResult[]) {
  for (const c of checks) {
    console.log(`[${c.ok ? "PASS" : "FAIL"}] ${c.name} :: ${c.details}`);
  }
}

async function run(): Promise<number> {
  const checks: CheckResult[] = [];
  const { host, port, base } = getDashboardTestConfig();
  const wsUrl = `ws://${host}:${port}/ws/capacity`;

  try {
    const message = await new Promise<any>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      const timeout = setTimeout(() => {
        try {
          ws.close();
        } catch {}
        reject(new Error("timeout waiting for websocket payload"));
      }, 6000);

      ws.onopen = () => {
        try {
          ws.send("ping");
        } catch {}
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("websocket connection error"));
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data || "{}"));
          if (payload?.type === "pong") {
            return;
          }
          clearTimeout(timeout);
          ws.close();
          resolve(payload);
        } catch (error) {
          clearTimeout(timeout);
          ws.close();
          reject(error);
        }
      };
    });

    const hasShape =
      typeof message?.generatedAt === "string" &&
      typeof message?.capacity?.summary === "string" &&
      typeof message?.bottleneck?.kind === "string" &&
      Number.isFinite(message?.headroom?.connections?.pct) &&
      Number.isFinite(message?.headroom?.workers?.pct);

    checks.push({
      name: "websocket-capacity-shape",
      ok: hasShape,
      details: `payload=${JSON.stringify({
        generatedAt: message?.generatedAt,
        bottleneck: message?.bottleneck,
        capacity: message?.capacity,
      })}`,
    });

    const socketRuntimeRes = await fetch(`${base}/api/control/socket/runtime`);
    const socketRuntime = await socketRuntimeRes.json();
    checks.push({
      name: "websocket-runtime-counters",
      ok:
        socketRuntimeRes.status === 200 &&
        Number.isFinite(socketRuntime?.sockets?.totalConnections) &&
        Number.isFinite(socketRuntime?.sockets?.totalMessages) &&
        Number.isFinite(socketRuntime?.sockets?.broadcastCount),
      details: `socketRuntime=${JSON.stringify({
        totalConnections: socketRuntime?.sockets?.totalConnections,
        totalMessages: socketRuntime?.sockets?.totalMessages,
        broadcastCount: socketRuntime?.sockets?.broadcastCount,
      })}`,
    });
  } catch (error) {
    checks.push({
      name: "websocket-runner",
      ok: false,
      details: error instanceof Error ? error.message : String(error),
    });
  }

  printChecks(checks);
  const failed = checks.filter((c) => !c.ok);
  console.log(`Checked ${checks.length} websocket assertions against ${wsUrl}`);
  return failed.length === 0 ? 0 : 1;
}

export async function runDashboardWebsocketChecks(): Promise<number> {
  return run();
}

if (import.meta.main) {
  const config = getDashboardTestConfig();
  applyDashboardTestEnv(config);
  const code = await withDashboardServer(config.host, config.port, runDashboardWebsocketChecks);
  process.exit(code);
}
