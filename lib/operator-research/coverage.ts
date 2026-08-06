// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
import {
  ensureEvidenceStore,
  getEvidence,
  parseMarketsJson,
  type AddEvidenceInput,
} from './evidence.ts';
import { loadOperators } from './operators.ts';
import { COVERAGE_REPORT_JSON, COVERAGE_REPORT_MD, ensureResearchDirs } from './paths.ts';
import type { CoverageReport, CoverageRow, EvidenceRow } from './types.ts';

function uniq(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function scoreRow(expectedMarkets: string[], observedMarkets: string[], stackOk: boolean): number {
  if (expectedMarkets.length === 0) return stackOk ? 1 : 0;
  const hit = expectedMarkets.filter(m => observedMarkets.includes(m)).length;
  const marketScore = hit / expectedMarkets.length;
  return Number((marketScore * 0.75 + (stackOk ? 0.25 : 0)).toFixed(3));
}

export function buildCoverageRows(
  operators: Awaited<ReturnType<typeof loadOperators>>,
  evidence: EvidenceRow[]
): CoverageRow[] {
  return operators.map(op => {
    const observed = evidence.filter(
      e => e.operatorId === op.id || e.host === op.host || e.url.includes(op.host)
    );
    const stackRows = observed.filter(e => e.type === 'stack' || e.type === 'enrich');
    const bestStack = stackRows
      .filter(e => e.provider && e.provider !== 'unknown')
      .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0];

    const marketsObserved = uniq(observed.flatMap(e => parseMarketsJson(e.marketsJson)));
    const fetchOk = observed.some(e => {
      if (e.type !== 'enrich') return false;
      try {
        const p = JSON.parse(e.payloadJson) as { fetch?: { ok?: boolean } };
        return Boolean(p.fetch?.ok);
      } catch {
        return false;
      }
    });
    const screenshotOk = observed.some(e => e.type === 'screenshot');

    const stackProvider = bestStack?.provider ?? null;
    const stackOk = Boolean(
      stackProvider && op.expectedStack.some(s => s.toLowerCase() === stackProvider.toLowerCase())
    );
    const gapMarkets = op.markets.filter(m => !marketsObserved.includes(m));
    const gapStack = stackOk
      ? []
      : op.expectedStack.filter(s => s.toLowerCase() !== (stackProvider ?? '').toLowerCase());

    const notes: string[] = [];
    if (!fetchOk) notes.push('fetch not ok (live or fixture)');
    if (!screenshotOk) notes.push('no screenshot evidence');
    if (!stackProvider) notes.push('no stack detection');
    if (stackProvider && !stackOk) {
      notes.push(`stack mismatch: expected [${op.expectedStack.join(', ')}] got ${stackProvider}`);
    }

    return {
      name: op.name,
      id: op.id,
      host: op.host,
      identity: op.identity,
      expected: { markets: op.markets, geo: op.geo, stack: op.expectedStack },
      observed: {
        markets: marketsObserved,
        geo: [], // geo not inferred from HTML in this pass
        stack: stackProvider,
        stackConfidence: bestStack?.confidence ?? null,
        fetchOk,
        screenshotOk,
        evidenceCount: observed.length,
      },
      gap: { markets: gapMarkets, geo: op.geo, stack: gapStack },
      score: scoreRow(op.markets, marketsObserved, stackOk),
      notes,
    };
  });
}

export function formatCoverageMarkdown(report: CoverageReport): string {
  const lines: string[] = [
    '# Partner Coverage Report',
    '',
    `Generated: ${report.generatedAt}`,
    `Bun: ${report.bunVersion}`,
    `Operators: ${report.operators}`,
    `Mean coverage score: ${(report.meanScore * 100).toFixed(1)}%`,
    '',
    '| Operator | Host | Score | Stack (obs) | Markets gap | Notes |',
    '|----------|------|------:|-------------|-------------|-------|',
  ];
  for (const row of report.rows) {
    const stack = row.observed.stack
      ? `${row.observed.stack} (${row.observed.stackConfidence ?? 0}%)`
      : '—';
    const gap = row.gap.markets.length ? row.gap.markets.join(', ') : '—';
    const notes = row.notes.length ? row.notes.join('; ') : '—';
    lines.push(
      `| ${row.name} | ${row.host} | ${(row.score * 100).toFixed(0)}% | ${stack} | ${gap} | ${notes} |`
    );
  }
  lines.push('', '## Detailed rows', '');
  for (const row of report.rows) {
    lines.push(`### ${row.name} (\`${row.identity}\`)`);
    lines.push('');
    lines.push(`- Host: \`${row.host}\``);
    lines.push(`- Score: **${(row.score * 100).toFixed(1)}%**`);
    lines.push(`- Expected markets: ${row.expected.markets.join(', ') || '—'}`);
    lines.push(`- Observed markets: ${row.observed.markets.join(', ') || '—'}`);
    lines.push(`- Expected geo: ${row.expected.geo.join(', ') || '—'}`);
    lines.push(`- Expected stack: ${row.expected.stack.join(', ') || '—'}`);
    lines.push(
      `- Observed stack: ${row.observed.stack ?? '—'} (${row.observed.stackConfidence ?? 0}%)`
    );
    lines.push(
      `- Fetch ok: ${row.observed.fetchOk} · Screenshot ok: ${row.observed.screenshotOk} · Evidence rows: ${row.observed.evidenceCount}`
    );
    if (row.gap.markets.length) lines.push(`- Market gap: ${row.gap.markets.join(', ')}`);
    if (row.gap.stack.length) lines.push(`- Stack gap: ${row.gap.stack.join(', ')}`);
    if (row.notes.length) lines.push(`- Notes: ${row.notes.join('; ')}`);
    lines.push('');
  }
  return lines.join('\n');
}

export async function generateCoverageReport(
  opts: {
    detailed?: boolean;
    outputMd?: string;
    outputJson?: string;
  } = {}
): Promise<CoverageReport> {
  await ensureResearchDirs();
  await ensureEvidenceStore();
  const operators = await loadOperators();
  const evidence = getEvidence();
  const rows = buildCoverageRows(operators, evidence).sort((a, b) => a.name.localeCompare(b.name));
  const meanScore = rows.length === 0 ? 0 : rows.reduce((sum, r) => sum + r.score, 0) / rows.length;

  const report: CoverageReport = {
    generatedAt: new Date().toISOString(),
    bunVersion: Bun.version,
    operators: rows.length,
    meanScore: Number(meanScore.toFixed(3)),
    rows,
  };

  const jsonPath = opts.outputJson ?? COVERAGE_REPORT_JSON;
  const mdPath = opts.outputMd ?? COVERAGE_REPORT_MD;
  await Bun.write(jsonPath, JSON.stringify(report, null, 2));
  if (opts.detailed !== false) {
    await Bun.write(mdPath, formatCoverageMarkdown(report));
  }
  return report;
}

/** Re-export for CLI detect-stack store path typing convenience. */
export type { AddEvidenceInput };
