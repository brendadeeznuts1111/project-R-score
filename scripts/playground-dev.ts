#!/usr/bin/env bun
import { join } from "node:path";
import { RuntimeEnv } from "../lib/env/runtime";

const PROJECT_ROOT = process.cwd();
const SERVER_ENTRY = "scratch/bun-v1.3.9-examples/playground-web/server.ts";
const SERVER_MATCH = "scratch/bun-v1.3.9-examples/playground-web/server.ts";

function runCapture(cmd: string[]): string {
  const out = Bun.spawnSync({
    cmd,
    cwd: PROJECT_ROOT,
    stdout: "pipe",
    stderr: "pipe",
  });
  return out.stdout.toString().trim();
}

function getListenerPid(port: number): number | null {
  const raw = runCapture(["lsof", "-t", `-iTCP:${port}`, "-sTCP:LISTEN"]);
  const first = raw.split("\n").map((line) => line.trim()).find(Boolean);
  if (!first) return null;
  const pid = Number.parseInt(first, 10);
  return Number.isFinite(pid) ? pid : null;
}

function getProcessCommand(pid: number): string {
  return runCapture(["ps", "-p", String(pid), "-o", "command="]);
}

async function waitPortFree(port: number, timeoutMs = 3000): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (!getListenerPid(port)) return true;
    await Bun.sleep(100);
  }
  return false;
}

async function ensurePortOwnerSafe(port: number): Promise<void> {
  const pid = getListenerPid(port);
  if (!pid) return;

  const cmd = getProcessCommand(pid);
  if (!cmd.includes(SERVER_MATCH)) {
    console.error(`[playground:dev] Port ${port} is owned by a different process.`);
    console.error(`[playground:dev] pid=${pid} cmd=${cmd || "unknown"}`);
    console.error(
      `[playground:dev] Stop that process or choose another port via PLAYGROUND_PORT before starting playground.`
    );
    process.exit(1);
  }

  console.log(`[playground:dev] Restarting existing playground process pid=${pid} on port ${port}.`);
  Bun.spawnSync({ cmd: ["kill", "-TERM", String(pid)], cwd: PROJECT_ROOT });
  const freed = await waitPortFree(port, 3000);
  if (!freed) {
    console.warn(`[playground:dev] Graceful stop timed out; forcing kill pid=${pid}.`);
    Bun.spawnSync({ cmd: ["kill", "-KILL", String(pid)], cwd: PROJECT_ROOT });
    const forcedFreed = await waitPortFree(port, 1500);
    if (!forcedFreed) {
      console.error(`[playground:dev] Unable to free port ${port} after SIGKILL.`);
      process.exit(1);
    }
  }
}

async function main() {
  const runtime = RuntimeEnv.validate();
  const port = runtime.port;
  process.env.PLAYGROUND_PORT = String(port);
  process.env.PORT = process.env.PORT || String(port);
  process.env.PLAYGROUND_HOST = process.env.PLAYGROUND_HOST || runtime.host;
  process.env.PLAYGROUND_ALLOW_PORT_FALLBACK =
    process.env.PLAYGROUND_ALLOW_PORT_FALLBACK || String(runtime.allowFallback);
  process.env.PLAYGROUND_PORT_RANGE = process.env.PLAYGROUND_PORT_RANGE || runtime.portRange;
  process.env.PLAYGROUND_RUNTIME_ORIGINS =
    process.env.PLAYGROUND_RUNTIME_ORIGINS || runtime.runtimeOrigins.join(",");
  process.env.PLAYGROUND_RUNTIME_STALE_MS =
    process.env.PLAYGROUND_RUNTIME_STALE_MS || String(runtime.runtimeStaleMs);

  await ensurePortOwnerSafe(port);

  const serverPath = join(PROJECT_ROOT, SERVER_ENTRY);
  const child = Bun.spawn({
    cmd: ["bun", "--watch", serverPath],
    cwd: PROJECT_ROOT,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    env: process.env,
  });

  const startedAt = new Date().toISOString();
  console.log(
    `[playground:dev] Started watch mode at ${startedAt} (host=${runtime.host}, port=${port}, fallback=${process.env.PLAYGROUND_ALLOW_PORT_FALLBACK}, range=${process.env.PLAYGROUND_PORT_RANGE})`
  );

  const exitCode = await child.exited;
  process.exit(exitCode ?? 0);
}

await main();
