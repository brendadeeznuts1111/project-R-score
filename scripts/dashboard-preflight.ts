#!/usr/bin/env bun

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseBooleanEnv, resolveDashboardEnvConfig } from './lib/dashboard-env';

const ROOT = resolve(import.meta.dir, '..');
const DASHBOARD_ENV = resolveDashboardEnvConfig(3456);
const REQUESTED_PORT = DASHBOARD_ENV.port;
const MIN_BUN = [1, 3, 9] as const;
const RECOMMENDED_BUN = [1, 3, 10] as const;
const ALLOW_CANARY_BUN = parseBooleanEnv(process.env.ALLOW_CANARY_BUN, false);
const DASHBOARD_HOST = DASHBOARD_ENV.host || '127.0.0.1';

type Level = 'PASS' | 'WARN' | 'FAIL';
type Check = { name: string; level: Level; detail: string };

const checks: Check[] = [];

function addCheck(name: string, level: Level, detail: string) {
  checks.push({ name, level, detail });
}

function parseSemver(input: string): [number, number, number] {
  const core = input.split('-')[0];
  const [maj, min, patch] = core.split('.').map((v) => Number.parseInt(v, 10) || 0);
  return [maj, min, patch];
}

function compareSemver(a: [number, number, number], b: readonly [number, number, number]): number {
  if (a[0] !== b[0]) return a[0] - b[0];
  if (a[1] !== b[1]) return a[1] - b[1];
  return a[2] - b[2];
}

function isPortInUse(port: number): boolean {
  try {
    const output = Bun.spawnSync(
      ['lsof', '-nP', '-iTCP:' + String(port), '-sTCP:LISTEN'],
      { stdout: 'pipe', stderr: 'pipe' }
    );
    return output.exitCode === 0 && new TextDecoder().decode(output.stdout).trim().length > 0;
  } catch {
    return false;
  }
}

function getPortOwner(port: number): string {
  try {
    const output = Bun.spawnSync(
      ['lsof', '-nP', '-iTCP:' + String(port), '-sTCP:LISTEN'],
      { stdout: 'pipe', stderr: 'pipe' }
    );
    if (output.exitCode !== 0) return 'unknown';
    const text = new TextDecoder().decode(output.stdout).trim();
    const lines = text.split('\n');
    if (lines.length < 2) return 'unknown';
    const cols = lines[1].trim().split(/\s+/);
    return `${cols[0] ?? 'unknown'} pid=${cols[1] ?? 'unknown'}`;
  } catch {
    return 'unknown';
  }
}

function getPortOwnerPid(port: number): number | null {
  try {
    const output = Bun.spawnSync(
      ['lsof', '-nP', '-iTCP:' + String(port), '-sTCP:LISTEN'],
      { stdout: 'pipe', stderr: 'pipe' }
    );
    if (output.exitCode !== 0) return null;
    const text = new TextDecoder().decode(output.stdout).trim();
    const lines = text.split('\n');
    if (lines.length < 2) return null;
    const cols = lines[1].trim().split(/\s+/);
    const pid = Number.parseInt(cols[1] ?? '', 10);
    return Number.isFinite(pid) ? pid : null;
  } catch {
    return null;
  }
}

function commandForPid(pid: number): string {
  try {
    const output = Bun.spawnSync(
      ['ps', '-o', 'command=', '-p', String(pid)],
      { stdout: 'pipe', stderr: 'pipe' }
    );
    if (output.exitCode !== 0) return '';
    return new TextDecoder().decode(output.stdout).trim();
  } catch {
    return '';
  }
}

async function waitForRoute(url: string, timeoutMs = 12000): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return true;
    } catch {
      // Keep trying
    }
    await Bun.sleep(250);
  }
  return false;
}

function chooseProbePort(start = 3490): number {
  for (let i = 0; i < 60; i += 1) {
    const candidate = start + i;
    if (!isPortInUse(candidate)) return candidate;
  }
  return 0;
}

async function verifyRoutes(probePort: number): Promise<void> {
  const child = Bun.spawn(['bun', 'dashboard/dashboard-server.ts'], {
    cwd: ROOT,
    env: {
      ...process.env,
      DASHBOARD_HOST,
      DASHBOARD_PORT: String(probePort),
      ALLOW_PORT_FALLBACK: 'false',
    },
    stdout: 'pipe',
    stderr: 'pipe',
  });

  try {
    const healthUrl = `http://${DASHBOARD_HOST}:${probePort}/api/health`;
    const dashboardUrl = `http://${DASHBOARD_HOST}:${probePort}/api/dashboard`;
    const runtimeUrl = `http://${DASHBOARD_HOST}:${probePort}/api/dashboard/runtime`;

    const ready = await waitForRoute(healthUrl);
    if (!ready) {
      const stderrText = await new Response(child.stderr).text();
      addCheck('route-contract', 'FAIL', `server did not become ready on ${probePort}; ${stderrText.trim()}`);
      return;
    }

    const [healthRes, dashRes, runtimeRes] = await Promise.all([
      fetch(healthUrl),
      fetch(dashboardUrl),
      fetch(runtimeUrl),
    ]);

    if (healthRes.status !== 200 || dashRes.status !== 200 || runtimeRes.status !== 200) {
      addCheck(
        'route-contract',
        'FAIL',
        `unexpected status codes health=${healthRes.status} dashboard=${dashRes.status} runtime=${runtimeRes.status}`
      );
      return;
    }

    const health = await healthRes.json() as Record<string, unknown>;
    const runtime = await runtimeRes.json() as Record<string, unknown>;
    const requiredHealth = ['status', 'timestamp', 'service', 'version', 'runtime', 'checks'];
    const missingHealth = requiredHealth.filter((k) => !(k in health));
    const requiredRuntime = ['bunVersion', 'bunRevision', 'platform', 'arch', 'pid', 'port', 'startedAt', 'uptimeSec'];
    const missingRuntime = requiredRuntime.filter((k) => !(k in runtime));

    if (missingHealth.length > 0 || missingRuntime.length > 0) {
      addCheck(
        'route-contract',
        'FAIL',
        `schema mismatch missing health=[${missingHealth.join(',')}] runtime=[${missingRuntime.join(',')}]`
      );
      return;
    }

    addCheck('route-contract', 'PASS', `validated /api/health /api/dashboard /api/dashboard/runtime on port ${probePort}`);
  } finally {
    child.kill();
    await child.exited;
  }
}

async function main() {
  console.log('Dashboard preflight');
  console.log(`cwd=${ROOT}`);
  console.log(`bun=${Bun.version}`);
  console.log(`revision=${readBunRevision()}`);
  console.log(`platform=${process.platform}`);
  console.log(`arch=${process.arch}`);
  console.log('');

  const bunParsed = parseSemver(Bun.version);
  if (compareSemver(bunParsed, MIN_BUN) < 0) {
    addCheck('bun-version-minimum', 'FAIL', `bun ${Bun.version} is below minimum ${MIN_BUN.join('.')}`);
  } else {
    addCheck('bun-version-minimum', 'PASS', `bun ${Bun.version} meets minimum ${MIN_BUN.join('.')}`);
  }

  const isCanary = Bun.version.includes('canary') || readBunRevision().includes('canary');
  if (isCanary && !ALLOW_CANARY_BUN) {
    addCheck('bun-stability', 'WARN', 'canary build detected; set ALLOW_CANARY_BUN=true to suppress warning');
  } else if (isCanary) {
    addCheck('bun-stability', 'PASS', 'canary build explicitly allowed');
  } else {
    addCheck('bun-stability', 'PASS', 'stable bun build detected');
  }

  if (compareSemver(bunParsed, RECOMMENDED_BUN) < 0) {
    addCheck('bun-version-recommended', 'WARN', `recommended bun is ${RECOMMENDED_BUN.join('.')}+ stable`);
  } else {
    addCheck('bun-version-recommended', 'PASS', `bun ${Bun.version} is at or above recommended ${RECOMMENDED_BUN.join('.')}`);
  }

  const requiredFiles = [
    'dashboard/dashboard-server.ts',
    'dashboard/web-dashboard.html',
    'dashboard/navigation-hub.html',
  ];
  for (const relativePath of requiredFiles) {
    const absolute = resolve(ROOT, relativePath);
    addCheck(
      `required-file:${relativePath}`,
      existsSync(absolute) ? 'PASS' : 'FAIL',
      existsSync(absolute) ? 'found' : 'missing'
    );
  }

  if (isPortInUse(REQUESTED_PORT)) {
    const owner = getPortOwner(REQUESTED_PORT);
    const ownerPid = getPortOwnerPid(REQUESTED_PORT);
    const ownerCmd = ownerPid ? commandForPid(ownerPid) : '';
    if (ownerCmd.includes('dashboard/dashboard-server.ts')) {
      addCheck('dashboard-port', 'PASS', `port ${REQUESTED_PORT} already owned by active dashboard process pid=${ownerPid}`);
    } else {
      addCheck('dashboard-port', 'WARN', `port ${REQUESTED_PORT} in use by ${owner}`);
    }
  } else {
    addCheck('dashboard-port', 'PASS', `port ${REQUESTED_PORT} available`);
  }

  const probePort = chooseProbePort(3490);
  if (probePort === 0) {
    addCheck('route-contract', 'FAIL', 'unable to allocate probe port in range 3490-3549');
  } else {
    await verifyRoutes(probePort);
  }

  for (const check of checks) {
    const prefix = check.level === 'PASS' ? 'PASS' : check.level === 'WARN' ? 'WARN' : 'FAIL';
    console.log(`${prefix} ${check.name}: ${check.detail}`);
  }

  const failCount = checks.filter((c) => c.level === 'FAIL').length;
  const warnCount = checks.filter((c) => c.level === 'WARN').length;
  console.log('');
  console.log(`Summary: ${checks.length - failCount - warnCount} pass, ${warnCount} warn, ${failCount} fail`);
  process.exit(failCount > 0 ? 1 : 0);
}

function readBunRevision(): string {
  try {
    const output = Bun.spawnSync(['bun', '--revision'], { stdout: 'pipe', stderr: 'pipe' });
    if (output.exitCode !== 0) return 'unknown';
    const text = new TextDecoder().decode(output.stdout).trim();
    return text || 'unknown';
  } catch {
    return 'unknown';
  }
}

main();
