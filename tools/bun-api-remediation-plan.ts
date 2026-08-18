#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @updated Bun.argv · changed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @verified Bun.argv · Bun v1.3.14 · 2026-08-18 · https://bun.com/reference/bun/argv
// @see https://bun.com/docs/runtime/bun-apis — Bun APIs
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version

import { CANONICAL_REFS, resolveApiAlias } from './bun-doc-refs.ts';
import {
  scanBunApiDrift,
  type BunApiDriftFinding,
  type BunApiDriftReport,
} from './bun-api-drift.ts';

/** A read-only classification. This tool never edits source or lockfiles. */
export type BunApiRemediationItem = BunApiDriftFinding & {
  api: string;
  canonicalUrl?: string;
  classification: 'documented-runtime-gap' | 'undocumented-runtime-gap';
  action: 'pin-or-upgrade-runtime' | 'manual-review';
};

export type BunApiRemediationPlan = {
  version: 1;
  generatedBy: { bunVersion: string; bunRevision: string };
  source: Pick<BunApiDriftReport, 'targets' | 'scannedFileCount' | 'occurrenceCount'>;
  items: BunApiRemediationItem[];
};

function apiName(finding: BunApiDriftFinding): string {
  return finding.surface === 'namespace' ? `Bun.${finding.member}` : `bun export ${finding.member}`;
}

function canonicalUrlFor(finding: BunApiDriftFinding): string | undefined {
  if (finding.surface !== 'namespace') return undefined;
  const full = `Bun.${finding.member}`;
  const resolved = resolveApiAlias(full);
  // Only exact references are actionable. A documented parent (for example,
  // Bun.markdown) does not prove that an unknown nested member exists.
  return CANONICAL_REFS[full] ?? CANONICAL_REFS[resolved];
}

export function buildBunApiRemediationPlan(report: BunApiDriftReport): BunApiRemediationPlan {
  return {
    version: 1,
    generatedBy: report.runtime,
    source: {
      targets: report.targets,
      scannedFileCount: report.scannedFileCount,
      occurrenceCount: report.occurrenceCount,
    },
    items: report.findings.map(finding => {
      const canonicalUrl = canonicalUrlFor(finding);
      return {
        ...finding,
        api: apiName(finding),
        ...(canonicalUrl ? { canonicalUrl } : {}),
        classification: canonicalUrl ? 'documented-runtime-gap' : 'undocumented-runtime-gap',
        action: canonicalUrl ? 'pin-or-upgrade-runtime' : 'manual-review',
      };
    }),
  };
}

export function formatBunApiRemediationPlan(plan: BunApiRemediationPlan): string {
  const lines = [
    `Bun API remediation plan (read-only; Bun ${plan.generatedBy.bunVersion})`,
    `Scanned ${plan.source.scannedFileCount} file(s), ${plan.source.occurrenceCount} occurrence(s).`,
  ];
  for (const item of plan.items) {
    const location = `${item.file}:${item.line}:${item.column}`;
    const reference = item.canonicalUrl ? ` — ${item.canonicalUrl}` : '';
    lines.push(`${location} ${item.api}: ${item.action}${reference}`);
  }
  if (plan.items.length === 0) lines.push('No unsupported Bun APIs found.');
  return lines.join('\n');
}

function parseMax(value: string): number {
  if (!/^\d+$/.test(value))
    throw new Error(`--max must be a non-negative integer, received: ${value}`);
  return Number(value);
}

export async function runBunApiRemediationPlanCli(argv: readonly string[]): Promise<number> {
  let json = false;
  let max = 0;
  const targets: string[] = [];
  for (const argument of argv) {
    if (argument === '--json') json = true;
    else if (argument.startsWith('--max=')) max = parseMax(argument.slice('--max='.length));
    else if (argument === '--help') {
      console.info('Usage: bun tools/bun-api-remediation-plan.ts [--json] [--max=N] <paths...>');
      console.info('Read-only: classify runtime drift and link official Bun references.');
      return 0;
    } else if (argument.startsWith('--')) throw new Error(`unknown option: ${argument}`);
    else targets.push(argument);
  }
  const plan = buildBunApiRemediationPlan(await scanBunApiDrift(targets));
  if (json)
    console.info(
      JSON.stringify({ ...plan, max, passed: plan.source.occurrenceCount <= max }, null, 2)
    );
  else console.info(formatBunApiRemediationPlan(plan));
  return plan.source.occurrenceCount <= max ? 0 : 1;
}

if (import.meta.main) {
  try {
    process.exitCode = await runBunApiRemediationPlanCli(Bun.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
