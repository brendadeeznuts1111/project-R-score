#!/usr/bin/env bun
// @see https://bun.com/docs/bundler/index#watch-mode — --watch
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
import { RuntimeEnv } from '../lib/env/runtime';

const joinPath = (...parts: string[]) => parts.filter(Boolean).join('/').replace(/\/+/g, '/');

const PROJECT_ROOT = process.cwd();
const SERVER_ENTRY = 'scratch/bun-v1.3.9-examples/playground-web/server.ts';
const SERVER_MATCH = 'scratch/bun-v1.3.9-examples/playground-web/server.ts';

function runCapture(cmd: string[]): string {
  const out = Bun.spawnSync({
    cmd,
    cwd: PROJECT_ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  return out.stdout.toString().trim();
}

function getListenerPid(port: number): number | null {
  const raw = runCapture(['lsof', '-t', `-iTCP:${port}`, '-sTCP:LISTEN']);
  const first = raw
    .split('\n')
    .map(line => line.trim())
    .find(Boolean);
  if (!first) return null;
  const pid = Number.parseInt(first, 10);
  return Number.isFinite(pid) ? pid : null;
}

function getProcessCommand(pid: number): string {
  return runCapture(['ps', '-p', String(pid), '-o', 'command=']);
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
    console.error(`[playground:dev] pid=${pid} cmd=${cmd || 'unknown'}`);
    console.error(
      `[playground:dev] Stop that process or choose another port via PLAYGROUND_PORT before starting playground.`
    );
    process.exit(1);
  }

  console.info(
    `[playground:dev] Restarting existing playground process pid=${pid} on port ${port}.`
  );
  Bun.spawnSync({ cmd: ['kill', '-TERM', String(pid)], cwd: PROJECT_ROOT });
  const freed = await waitPortFree(port, 3000);
  if (!freed) {
    console.warn(`[playground:dev] Graceful stop timed out; forcing kill pid=${pid}.`);
    Bun.spawnSync({ cmd: ['kill', '-KILL', String(pid)], cwd: PROJECT_ROOT });
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
  Bun.env.PLAYGROUND_PORT = String(port);
  Bun.env.PORT = Bun.env.PORT || String(port);
  Bun.env.PLAYGROUND_HOST = Bun.env.PLAYGROUND_HOST || runtime.host;
  Bun.env.PLAYGROUND_ALLOW_PORT_FALLBACK =
    Bun.env.PLAYGROUND_ALLOW_PORT_FALLBACK || String(runtime.allowFallback);
  Bun.env.PLAYGROUND_PORT_RANGE = Bun.env.PLAYGROUND_PORT_RANGE || runtime.portRange;
  Bun.env.PLAYGROUND_RUNTIME_ORIGINS =
    Bun.env.PLAYGROUND_RUNTIME_ORIGINS || runtime.runtimeOrigins.join(',');
  Bun.env.PLAYGROUND_RUNTIME_STALE_MS =
    Bun.env.PLAYGROUND_RUNTIME_STALE_MS || String(runtime.runtimeStaleMs);

  await ensurePortOwnerSafe(port);

  const serverPath = joinPath(PROJECT_ROOT, SERVER_ENTRY);
  const child = Bun.spawn({
    cmd: ['bun', '--watch', serverPath],
    cwd: PROJECT_ROOT,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
    env: Bun.env,
  });

  const startedAt = new Date().toISOString();
  console.info(
    `[playground:dev] Started watch mode at ${startedAt} (host=${runtime.host}, port=${port}, fallback=${Bun.env.PLAYGROUND_ALLOW_PORT_FALLBACK}, range=${Bun.env.PLAYGROUND_PORT_RANGE})`
  );

  const exitCode = await child.exited;
  process.exit(exitCode ?? 0);
}

if (import.meta.main) {
  await main();
}
