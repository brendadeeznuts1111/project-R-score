#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn
/**
 * Run the JUnit lane, then bake its report without hiding the test exit code.
 * Report generation is best-effort after a failed/crashed test process so the
 * original failure remains authoritative.
 */
import { bunSpawnArgs } from '../lib/bun-executable.ts';

async function run(script: string): Promise<number> {
  const child = Bun.spawn(bunSpawnArgs(['run', script]), {
    cwd: import.meta.dir + '/..',
    env: { ...Bun.env },
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });
  return (await child.exited) ?? 1;
}

export function selectCiReportExitCode(testCode: number, reportCode: number): number {
  return testCode !== 0 ? testCode : reportCode;
}

export async function main(): Promise<void> {
  const testCode = await run('test:ci');
  const reportCode = await run('failures:bake');
  process.exit(selectCiReportExitCode(testCode, reportCode));
}

if (import.meta.main) await main();
