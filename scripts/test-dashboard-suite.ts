#!/usr/bin/env bun

const HOST = process.env.DASHBOARD_HOST || "localhost";
const PORT = Number.parseInt(process.env.DASHBOARD_PORT || "3011", 10);
const BASE = `http://${HOST}:${PORT}`;
const SERVER_CMD = ["bun", "run", "start:dashboard:playground"];

async function isUp(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/health`);
    return res.status === 200;
  } catch {
    return false;
  }
}

async function waitForUp(timeoutMs = 12000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isUp()) return true;
    await Bun.sleep(250);
  }
  return false;
}

function spawnCmd(cmd: string[]) {
  return Bun.spawn({
    cmd,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "ignore",
    env: {
      ...process.env,
      DASHBOARD_HOST: HOST,
      DASHBOARD_PORT: String(PORT),
    },
  });
}

async function run(): Promise<number> {
  let serverProc: ReturnType<typeof Bun.spawn> | null = null;
  let startedHere = false;

  try {
    const alreadyUp = await isUp();
    if (!alreadyUp) {
      serverProc = spawnCmd(SERVER_CMD);
      startedHere = true;
      const ready = await waitForUp();
      if (!ready) {
        console.error(`[FAIL] dashboard-server-start :: did not become healthy at ${BASE}`);
        return 1;
      }
    }

    const mini = spawnCmd(["bun", "run", "test:dashboard:mini"]);
    const miniCode = await mini.exited;
    if (miniCode !== 0) return miniCode;

    const endpoints = spawnCmd(["bun", "run", "test:dashboard:endpoints"]);
    const endpointCode = await endpoints.exited;
    if (endpointCode !== 0) return endpointCode;

    const websocket = spawnCmd(["bun", "run", "test:dashboard:websocket"]);
    const websocketCode = await websocket.exited;
    if (websocketCode !== 0) return websocketCode;

    console.log("[PASS] dashboard-suite :: mini + endpoints + websocket green");
    return 0;
  } finally {
    if (startedHere && serverProc) {
      serverProc.kill();
      await serverProc.exited.catch(() => {});
    }
  }
}

const code = await run();
process.exit(code);
