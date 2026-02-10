#!/usr/bin/env bun

const HOST = process.env.DASHBOARD_HOST || "localhost";
const PORT = Number.parseInt(process.env.DASHBOARD_PORT || "3011", 10);
const URL = `ws://${HOST}:${PORT}/ws/capacity`;

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

  try {
    const message = await new Promise<any>((resolve, reject) => {
      const ws = new WebSocket(URL);
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
  } catch (error) {
    checks.push({
      name: "websocket-runner",
      ok: false,
      details: error instanceof Error ? error.message : String(error),
    });
  }

  printChecks(checks);
  const failed = checks.filter((c) => !c.ok);
  console.log(`Checked ${checks.length} websocket assertions against ${URL}`);
  return failed.length === 0 ? 0 : 1;
}

const code = await run();
process.exit(code);
