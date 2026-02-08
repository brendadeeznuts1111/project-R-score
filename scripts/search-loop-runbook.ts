#!/usr/bin/env bun

import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type LoopStatus = {
  latestSnapshotId?: string | null;
  queryPack?: string | null;
  warnings?: string[];
  loopClosed?: boolean;
  loopClosedReason?: string;
  coverage?: {
    lines?: number;
    files?: number;
    roots?: string[];
    overlapMode?: string;
  } | null;
};

async function main(): Promise<void> {
  const statusPath = resolve('reports/search-loop-status-latest.json');
  const outPath = resolve('reports/search-loop-runbook-latest.md');

  let status: LoopStatus | null = null;
  if (existsSync(statusPath)) {
    try {
      status = JSON.parse(await readFile(statusPath, 'utf8')) as LoopStatus;
    } catch {
      status = null;
    }
  }

  const warnings = Array.isArray(status?.warnings) ? status!.warnings : [];
  const lines: string[] = [];
  lines.push('# Search Loop Runbook');
  lines.push('');
  lines.push('## Intent');
  lines.push('- Keep the local search loop decisionable from CLI to dashboard signal without manual data stitching.');
  lines.push('- Canonical KPI is searchable LOC coverage.');
  lines.push('- Soft-gate warnings are visible, never hard-failing commands.');
  lines.push('');
  lines.push('## Step-by-Step Commands');
  lines.push('1. `bun run search:coverage:loc:wide`');
  lines.push('2. `bun run search:bench:snapshot:core:wide:local`');
  lines.push('3. `bun run search:loop:status`');
  lines.push('4. `bun run search:loop:runbook`');
  lines.push('5. `bun run search:bench:dashboard`');
  lines.push('');
  lines.push('## Expected Artifacts');
  lines.push('- `reports/search-benchmark/latest.json`');
  lines.push('- `reports/search-benchmark/latest.md`');
  lines.push('- `reports/search-benchmark/index.json`');
  lines.push('- `reports/search-coverage-loc-latest.json`');
  lines.push('- `reports/search-loop-status-latest.json`');
  lines.push('- `reports/search-loop-status-latest.md`');
  lines.push('- `reports/search-loop-runbook-latest.md`');
  lines.push('');
  lines.push('## How To Interpret Statuses');
  lines.push('- `pass`: stage meets expected local loop condition.');
  lines.push('- `warn`: stage is usable but needs action (typically latency/memory pressure).');
  lines.push('- `fail`: stage blocks reliable loop closure and should be fixed before next batch.');
  lines.push('');
  lines.push('## Common Failure Patterns');
  lines.push('- Missing same-pack baseline: run the same pack twice before judging trend deltas.');
  lines.push('- Missing coverage artifact: run `search:coverage:loc:wide` before status generation.');
  lines.push('- Dashboard drift: snapshot id/warnings mismatch between loop-status and loaded latest.');
  lines.push('- Latency warning with stable quality: likely runtime contention or warm-up variance.');
  lines.push('');
  lines.push('## Next Action Matrix');
  lines.push('- If `latency_p95_warn`: rerun warm-up + snapshot and inspect CPU profile (`search:bench:snapshot:core:wide:profile`).');
  lines.push('- If `heap_peak_warn` or `rss_peak_warn`: run heap profile markdown and inspect retained roots/classes.');
  lines.push('- If quality/slop warnings: run cleanup report and isolate noisy families before moving more modules.');
  lines.push('- If dashboard parity fail: regenerate loop status and reload dashboard local latest.');
  lines.push('');
  lines.push('## Current Snapshot');
  lines.push(`- latestSnapshotId: \`${status?.latestSnapshotId || 'n/a'}\``);
  lines.push(`- queryPack: \`${status?.queryPack || 'n/a'}\``);
  lines.push(`- loopClosed: \`${status?.loopClosed ? 'yes' : 'no'}\``);
  lines.push(`- loopClosedReason: ${status?.loopClosedReason || 'n/a'}`);
  lines.push(`- activeWarnings: ${warnings.length > 0 ? warnings.join(', ') : 'none'}`);
  lines.push(`- coverageLOC: ${status?.coverage?.lines ?? 'n/a'} lines across ${status?.coverage?.files ?? 'n/a'} files`);
  lines.push(`- coverageRoots: ${(status?.coverage?.roots || []).join(', ') || 'n/a'}`);
  lines.push(`- overlapMode: \`${status?.coverage?.overlapMode || 'n/a'}\``);
  lines.push('');

  await writeFile(outPath, `${lines.join('\n')}\n`);
  console.log(`[search:loop:runbook] wrote ${outPath}`);
}

await main();

