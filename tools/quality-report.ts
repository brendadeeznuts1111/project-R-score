#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds
import { resolve } from 'node:path';
import { acceptQualityBaseline } from '../lib/quality/baseline.ts';
import { canonicalJsonDigests, parseCanonicalJsonValue } from '../lib/quality/canonical-json.ts';
import { invariantExitCode, runInvariantLanes } from '../lib/quality/invariant-runner.ts';
import { createQualityReport } from '../lib/quality/report.ts';
import { writeQualityReport } from '../lib/quality/report-store.ts';
import type { QualityCheck } from '../lib/quality/result.ts';

const repoRoot = resolve(import.meta.dir, '..');

function option(args: readonly string[], name: string): string | undefined {
  const prefix = `${name}=`;
  const inline = args.find(arg => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function requiredOption(args: readonly string[], name: string): string {
  const value = option(args, name);
  if (!value?.trim()) throw new TypeError(`missing required option ${name}`);
  return value;
}

async function repositoryRevision(): Promise<string | undefined> {
  const child = Bun.spawn(['git', 'rev-parse', 'HEAD'], {
    cwd: repoRoot,
    stdout: 'pipe',
    stderr: 'ignore',
  });
  if ((await child.exited) !== 0) return undefined;
  return (await new Response(child.stdout).text()).trim() || undefined;
}

async function repositoryDirty(): Promise<boolean | undefined> {
  const child = Bun.spawn(['git', 'status', '--porcelain=v1'], {
    cwd: repoRoot,
    stdout: 'pipe',
    stderr: 'ignore',
  });
  if ((await child.exited) !== 0) return undefined;
  return (await new Response(child.stdout).text()).length > 0;
}

function runId(timestamp: string): string {
  return `invariants-${timestamp
    .toLowerCase()
    .replaceAll(/[^a-z0-9]/g, '')
    .slice(0, 17)}`;
}

async function runInvariantReport(args: readonly string[]): Promise<number> {
  const outputRoot = resolve(repoRoot, option(args, '--out') ?? 'public/reports');
  const startedNs = Bun.nanoseconds();
  const lanes = await runInvariantLanes({ cwd: repoRoot, inheritOutput: true });
  const exitCode = invariantExitCode(lanes);
  const durationNs = Math.floor(Bun.nanoseconds() - startedNs);
  const generatedAt = new Date().toISOString();
  const checks: QualityCheck[] = lanes.map(lane => {
    const evidence = {
      command: lane.command,
      file: lane.file,
      exitCode: lane.exitCode,
      durationNs: lane.durationNs,
    };
    return {
      id: lane.id,
      owner: lane.owner,
      layer: lane.layer,
      severity: 'error',
      passed: lane.exitCode === 0,
      changed: false,
      semanticDigest: canonicalJsonDigests(parseCanonicalJsonValue(evidence)).sha3_256,
      snapshotApproval: lane.snapshotApproval,
      evidence,
    };
  });
  const [revision, dirty] = await Promise.all([repositoryRevision(), repositoryDirty()]);
  const report = createQualityReport({
    runId: runId(generatedAt),
    scope: 'invariants',
    generatedAt,
    runtime: { bunVersion: Bun.version, bunRevision: Bun.revision },
    source: {
      command: 'bun run test:invariants',
      exitCode,
      durationNs,
      ...(revision ? { repositoryRevision: revision } : {}),
      ...(dirty === undefined ? {} : { repositoryDirty: dirty }),
    },
    checks,
  });
  const paths = await writeQualityReport(report, outputRoot);
  console.log(
    JSON.stringify(
      {
        verdict: report.summary.verdict,
        runId: report.runId,
        durationNs,
        durationMs: durationNs / 1_000_000,
        history: paths.historyHtml,
        latest: paths.latestHtml,
      },
      null,
      2
    )
  );
  return exitCode;
}

async function acceptBaseline(args: readonly string[]): Promise<number> {
  if (!args.includes('--accept')) {
    throw new Error('baseline mutation requires the explicit --accept flag');
  }
  const reportPath = resolve(repoRoot, requiredOption(args, '--report'));
  const candidatePath = resolve(repoRoot, requiredOption(args, '--candidate'));
  const baselinePath = resolve(repoRoot, requiredOption(args, '--baseline'));
  const scope = requiredOption(args, '--scope');
  const expected = requiredOption(args, '--expect-baseline');
  const expectedBaselineSha3 = expected === 'none' ? null : expected;
  if (expectedBaselineSha3 !== null && !/^[a-f0-9]{64}$/.test(expectedBaselineSha3)) {
    throw new TypeError('--expect-baseline must be none or a lowercase SHA3-256 digest');
  }
  const accepted = await acceptQualityBaseline({
    report: await Bun.file(reportPath).json(),
    candidate: await Bun.file(candidatePath).json(),
    scope,
    baselinePath,
    expectedBaselineSha3,
  });
  console.log(JSON.stringify(accepted, null, 2));
  return 0;
}

export function usage(): string {
  return `Usage:
  bun tools/quality-report.ts run [--out <directory>]
  bun tools/quality-report.ts accept --accept --report <report.json> --candidate <candidate.json> --baseline <baseline.json> --scope <scope> --expect-baseline <sha3|none>`;
}

export async function main(args = Bun.argv.slice(2)): Promise<number> {
  const command = args[0] ?? 'run';
  if (command === 'run') return runInvariantReport(args.slice(1));
  if (command === 'accept') return acceptBaseline(args.slice(1));
  if (command === '--help' || command === '-h' || command === 'help') {
    console.log(usage());
    return 0;
  }
  throw new TypeError(`unknown quality report command: ${command}\n${usage()}`);
}

if (import.meta.main) {
  try {
    process.exit(await main());
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
