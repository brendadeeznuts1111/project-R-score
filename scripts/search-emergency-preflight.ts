#!/usr/bin/env bun

type Step = {
  id: string;
  command: string[];
};

type StepResult = {
  id: string;
  code: number;
  durationMs: number;
};

const STEPS: Step[] = [
  { id: 'security:guard:deps', command: ['bun', 'run', 'security:guard:deps'] },
  { id: 'security:audit', command: ['bun', 'run', 'security:audit'] },
  { id: 'search:policy:check', command: ['bun', 'run', 'search:policy:check'] },
  { id: 'search:status:unified:strict', command: ['bun', 'run', 'search:status:unified:strict'] },
  { id: 'search:bench:gate', command: ['bun', 'run', 'search:bench:gate', '--json'] },
  { id: 'search-dashboard-unified-api.test.ts', command: ['bun', 'test', './tests/search-dashboard-unified-api.test.ts'] },
];

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

async function runStep(step: Step): Promise<StepResult> {
  const started = Date.now();
  console.log(`\n[preflight] start ${step.id}`);
  console.log(`[preflight] cmd   ${step.command.join(' ')}`);

  const proc = Bun.spawn(step.command, {
    cwd: process.cwd(),
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const code = await proc.exited;
  const durationMs = Date.now() - started;

  if (code === 0) {
    console.log(`[preflight] pass  ${step.id} (${fmtDuration(durationMs)})`);
  } else {
    console.error(`[preflight] fail  ${step.id} exit=${code} (${fmtDuration(durationMs)})`);
  }
  return { id: step.id, code, durationMs };
}

async function main(): Promise<void> {
  const started = new Date().toISOString();
  console.log(`[preflight] startedAt=${started}`);
  console.log(`[preflight] cwd=${process.cwd()}`);

  const results: StepResult[] = [];
  for (const step of STEPS) {
    const result = await runStep(step);
    results.push(result);
    if (result.code !== 0) {
      break;
    }
  }

  const failed = results.find((r) => r.code !== 0) || null;
  console.log('\n[preflight] summary');
  for (const r of results) {
    const status = r.code === 0 ? 'PASS' : `FAIL(${r.code})`;
    console.log(`- ${r.id}: ${status} in ${fmtDuration(r.durationMs)}`);
  }

  if (failed) {
    console.error(`[preflight] blocked by ${failed.id}`);
    process.exit(1);
  }
  console.log('[preflight] all checks passed');
}

if (import.meta.main) {
  await main();
}

