#!/usr/bin/env bun

import { existsSync, mkdirSync, readdirSync } from 'node:fs';

const DEFAULT_URL = 'http://localhost:3001/ops/status';
const SCRIPT_PATH = '/Users/nolarose/Projects/barbershop/sampling-profile.ts';
const DASHBOARD_PATH = '/Users/nolarose/Projects/barbershop/barbershop-dashboard.ts';
const UPLOAD_LATEST_PATH = '/Users/nolarose/Projects/barbershop/upload-latest-profile.ts';
const LIST_R2_PATH = '/Users/nolarose/Projects/barbershop/list-r2-profiles.ts';
const WORKLOAD_PATH = '/Users/nolarose/Projects/barbershop/profile-workload.ts';
const LOG_ROOT = '/Users/nolarose/Projects/logs/profiles';
const PROFILE_OUTPUT_DIR = 'logs/profiles/runtime';

const COLORS = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m'
};

function wrapAnsiLine(text: string, columns = Number(process.env.COLUMNS || 100)) {
  const wrap = (Bun as unknown as {
    wrapAnsi?: (input: string, width: number, options?: { hard?: boolean; wordWrap?: boolean; trim?: boolean }) => string;
  }).wrapAnsi;
  if (typeof wrap === 'function') {
    return wrap(text, columns, { wordWrap: true, trim: false });
  }
  return text;
}

function out(text: string) {
  console.log(wrapAnsiLine(text));
}

function help() {
  console.log(`Barbershop Profiling CLI

Usage:
  bun run barbershop/profile-cli.ts <command> [options]

Commands:
  run        Run sampling profile (passes options through)
  shot       Ensure dashboard is up, then run quick local sample
  shot:r2    Ensure dashboard is up, then run required R2 sample
  status     Check dashboard reachability + R2 env readiness
  upload-latest Upload latest local sampling-profile.tar.gz + summary.json to R2
  list-r2    List recent profile objects from R2
  cpu-md     Run Bun CPU profiler markdown output on workload
  heap-md    Run Bun heap profiler markdown output on workload
  quick      Fast local sample (25 iters, 200us, no R2)
  local      Local sample only (no R2 upload)
  r2         Sample and require R2 upload success
  latest     Show latest profile output directory
  help       Show this help

Examples:
  bun run barbershop/profile-cli.ts quick
  bun run barbershop/profile-cli.ts shot
  bun run barbershop/profile-cli.ts status
  bun run barbershop/profile-cli.ts list-r2 --max=30
  bun run barbershop/profile-cli.ts cpu-md --iterations=250
  bun run barbershop/profile-cli.ts heap-md --iterations=250
  bun run barbershop/profile-cli.ts run --url=${DEFAULT_URL} --iterations=250 --interval-us=100
  bun run barbershop/profile-cli.ts r2 --url=${DEFAULT_URL}
`);
}

function latestDir() {
  if (!existsSync(LOG_ROOT)) return null;
  const dirs = readdirSync(LOG_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('sampling-'))
    .map((entry) => entry.name);
  if (!dirs.length) return null;
  dirs.sort((a, b) => b.localeCompare(a));
  return `${LOG_ROOT}/${dirs[0]}`;
}

function runSampling(args: string[]) {
  const child = Bun.spawn({
    cmd: ['bun', 'run', SCRIPT_PATH, ...args],
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit'
  });
  return child.exited;
}

function runUploadLatest(args: string[]) {
  const child = Bun.spawn({
    cmd: ['bun', 'run', UPLOAD_LATEST_PATH, ...args],
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit'
  });
  return child.exited;
}

function runListR2(args: string[]) {
  const child = Bun.spawn({
    cmd: ['bun', 'run', LIST_R2_PATH, ...args],
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit'
  });
  return child.exited;
}

function ensureArg(args: string[], key: string, value: string) {
  if (args.some((arg) => arg.startsWith(`${key}=`))) return args;
  return [`${key}=${value}`, ...args];
}

function runRuntimeProfile(kind: 'cpu-md' | 'heap-md', args: string[]) {
  mkdirSync(PROFILE_OUTPUT_DIR, { recursive: true });
  const baseArgs = ensureArg(ensureArg(args, '--url', DEFAULT_URL), '--iterations', '250');
  const flags =
    kind === 'cpu-md'
      ? ['--cpu-prof', '--cpu-prof-md', '--cpu-prof-dir', PROFILE_OUTPUT_DIR]
      : ['--heap-prof-md', '--heap-prof-dir', PROFILE_OUTPUT_DIR];
  const child = Bun.spawn({
    cmd: ['bun', ...flags, WORKLOAD_PATH, ...baseArgs],
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit'
  });
  return child.exited;
}

async function isReachable(url: string) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

function extractPort(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
  } catch {
    return '3001';
  }
}

function urlFromArgs(args: string[]) {
  const matched = args.find((arg) => arg.startsWith('--url='));
  return matched ? matched.slice('--url='.length) : DEFAULT_URL;
}

async function ensureDashboard(url: string) {
  if (await isReachable(url)) return;
  const port = extractPort(url);
  const bunBin = process.execPath;
  const starter = Bun.spawn({
    cmd: [
      'sh',
      '-lc',
      `env AUTO_UNREF=false PORT=${port} ${bunBin} ${DASHBOARD_PATH} >/tmp/barbershop-dashboard.log 2>&1`
    ],
    env: { ...process.env },
    stdin: 'ignore',
    stdout: 'ignore',
    stderr: 'ignore',
    detached: true
  });
  starter.unref();
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    await Bun.sleep(400);
    if (await isReachable(url)) return;
  }
  throw new Error(`[profile-cli] dashboard not reachable after auto-start: ${url}`);
}

const [command = 'help', ...rest] = Bun.argv.slice(2);

switch (command) {
  case 'help':
  case '--help':
  case '-h': {
    help();
    process.exit(0);
  }
  case 'run': {
    const hasUrl = rest.some((arg) => arg.startsWith('--url='));
    const args = hasUrl ? rest : [`--url=${DEFAULT_URL}`, ...rest];
    const code = await runSampling(args);
    process.exit(code);
  }
  case 'quick': {
    const args = [
      `--url=${DEFAULT_URL}`,
      '--iterations=25',
      '--interval-us=200',
      '--upload-r2=false',
      ...rest
    ];
    const code = await runSampling(args);
    process.exit(code);
  }
  case 'shot': {
    await ensureDashboard(DEFAULT_URL);
    const args = [
      `--url=${DEFAULT_URL}`,
      '--iterations=25',
      '--interval-us=200',
      '--upload-r2=false',
      ...rest
    ];
    const code = await runSampling(args);
    process.exit(code);
  }
  case 'shot:r2': {
    await ensureDashboard(DEFAULT_URL);
    const args = [
      `--url=${DEFAULT_URL}`,
      '--iterations=25',
      '--interval-us=200',
      '--upload-r2=true',
      '--require-r2=true',
      ...rest
    ];
    const code = await runSampling(args);
    process.exit(code);
  }
  case 'local': {
    const args = [`--url=${DEFAULT_URL}`, '--upload-r2=false', ...rest];
    const code = await runSampling(args);
    process.exit(code);
  }
  case 'status': {
    const dashboardUp = await isReachable(DEFAULT_URL);
    const hasEnvR2 =
      Boolean(process.env.R2_ACCESS_KEY_ID) &&
      Boolean(process.env.R2_SECRET_ACCESS_KEY) &&
      (Boolean(process.env.R2_ENDPOINT) || Boolean(process.env.R2_ACCOUNT_ID)) &&
      (Boolean(process.env.R2_BUCKET) || Boolean(process.env.R2_BUCKET_NAME));
    out(
      `${COLORS.cyan}[profile-cli]${COLORS.reset} dashboard=${dashboardUp ? `${COLORS.green}up` : `${COLORS.red}down`}${COLORS.reset} url=${DEFAULT_URL}`
    );
    out(
      `${COLORS.cyan}[profile-cli]${COLORS.reset} r2_env=${hasEnvR2 ? `${COLORS.green}ready` : `${COLORS.yellow}missing`}${COLORS.reset}`
    );
    process.exit(dashboardUp ? 0 : 1);
  }
  case 'upload-latest': {
    const code = await runUploadLatest(rest);
    process.exit(code);
  }
  case 'list-r2': {
    const code = await runListR2(rest);
    process.exit(code);
  }
  case 'cpu-md': {
    const target = urlFromArgs(rest);
    await ensureDashboard(target);
    out(`${COLORS.gray}[profile-cli] writing cpu profiles to ${PROFILE_OUTPUT_DIR}${COLORS.reset}`);
    const code = await runRuntimeProfile('cpu-md', rest);
    process.exit(code);
  }
  case 'heap-md': {
    const target = urlFromArgs(rest);
    await ensureDashboard(target);
    out(`${COLORS.gray}[profile-cli] writing heap profiles to ${PROFILE_OUTPUT_DIR}${COLORS.reset}`);
    const code = await runRuntimeProfile('heap-md', rest);
    process.exit(code);
  }
  case 'r2': {
    const args = [`--url=${DEFAULT_URL}`, '--upload-r2=true', '--require-r2=true', ...rest];
    const code = await runSampling(args);
    process.exit(code);
  }
  case 'latest': {
    const dir = latestDir();
    if (!dir) {
      out(`${COLORS.yellow}[profile-cli] no sampling profiles found${COLORS.reset}`);
      process.exit(1);
    }
    out(`${COLORS.cyan}[profile-cli]${COLORS.reset} latest=${dir}`);
    const entries = ['summary.json', 'sampling-profile.tar.gz', 'functions.txt', 'bytecodes.txt', 'stack-traces.txt'];
    for (const file of entries) {
      const path = `${dir}/${file}`;
      if (await Bun.file(path).exists()) {
        out(path);
      }
    }
    process.exit(0);
  }
  default: {
    out(`${COLORS.red}[profile-cli] unknown command: ${command}${COLORS.reset}`);
    help();
    process.exit(1);
  }
}
