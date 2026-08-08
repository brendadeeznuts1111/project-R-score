#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
import { applyUnknownLongOptionGuard } from '../lib/docs/ref-id-tool-flags.ts';
import { jsonOut, logTable } from '../lib/console-depth.ts';
import { runThreadResearchCycle } from '../lib/research/thread-improvement.ts';

const args = new Set(
  applyUnknownLongOptionGuard(Bun.argv.slice(2), ['run', 'json'], {
    cliName: 'threads:research',
  }).filter(value => value !== '--')
);
const executeAgents = args.has('--run');
const result = await runThreadResearchCycle({ executeAgents });

if (args.has('--json')) {
  jsonOut(result);
} else {
  logTable(
    result.targets.map(target => ({
      ref: target.thread.ref,
      lane: target.thread.lane,
      score: target.baselineScore,
      goal: target.targetScore,
      gain: target.deficitClosed,
      entrypoint: target.lane.entrypoint,
    }))
  );
  console.info(
    executeAgents
      ? `Wrote ${result.reports.length} read-only research brief(s); failures=${result.failures.length}.`
      : 'Plan only. Pass --run to launch three ephemeral read-only Codex research agents.'
  );
}

if (result.failures.length > 0) process.exitCode = 1;
