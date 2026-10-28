import { escapeHtml } from '../escape-html.ts';
import {
  canonicalJsonDigests,
  canonicalJsonText,
  parseCanonicalJsonValue,
  type CanonicalJson,
  type CanonicalJsonDigests,
} from './canonical-json.ts';
import {
  summarizeQualityChecks,
  type QualityCheck,
  type QualityLayer,
  type QualitySeverity,
  type QualitySummary,
  type SnapshotApproval,
} from './result.ts';
import { semanticJsonDiff, type SemanticDiff } from './semantic-diff.ts';

export const QUALITY_REPORT_SCHEMA_VERSION = 1 as const;

export type QualityRuntimeEvidence = {
  bunVersion: string;
  bunRevision: string;
};

export type QualitySourceEvidence = {
  repositoryRevision?: string;
  repositoryDirty?: boolean;
  command?: string;
  exitCode?: number;
  durationNs?: number;
  seed?: number;
};

export type QualityReportCheck = Omit<QualityCheck, 'evidence'> & {
  evidence?: CanonicalJson;
};

export type QualitySnapshotEvidence = {
  baseline: CanonicalJsonDigests | null;
  candidate: CanonicalJsonDigests;
  diff: SemanticDiff;
};

export type QualityReportCore = {
  schemaVersion: typeof QUALITY_REPORT_SCHEMA_VERSION;
  runId: string;
  scope: string;
  generatedAt: string;
  runtime: QualityRuntimeEvidence;
  source: QualitySourceEvidence;
  summary: QualitySummary;
  checks: QualityReportCheck[];
  snapshot?: QualitySnapshotEvidence;
};

export type QualityReport = QualityReportCore & {
  /** Digest of the canonical report core, excluding this integrity field. */
  integrity: CanonicalJsonDigests;
};

export type CreateQualityReportInput = {
  runId: string;
  scope: string;
  generatedAt: string;
  runtime: QualityRuntimeEvidence;
  source?: QualitySourceEvidence;
  checks: readonly QualityCheck[];
  snapshot?: {
    baseline?: CanonicalJson;
    candidate: CanonicalJson;
    maxChanges?: number;
  };
};

const REPORT_ID_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/;

function assertReportId(label: string, value: string): void {
  if (!REPORT_ID_RE.test(value)) {
    throw new TypeError(`${label} must match ${REPORT_ID_RE}`);
  }
}

function assertIsoTimestamp(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    throw new TypeError('generatedAt must be a UTC ISO timestamp');
  }
  if (!Number.isFinite(Date.parse(value))) throw new TypeError('generatedAt must be valid');
}

function canonicalCheck(check: QualityCheck): QualityReportCheck {
  return {
    ...check,
    ...(check.evidence === undefined ? {} : { evidence: parseCanonicalJsonValue(check.evidence) }),
  };
}

function reportCoreJson(core: QualityReportCore): CanonicalJson {
  return parseCanonicalJsonValue(core);
}

export function createQualityReport(input: CreateQualityReportInput): QualityReport {
  assertReportId('runId', input.runId);
  assertReportId('scope', input.scope);
  assertIsoTimestamp(input.generatedAt);
  if (!input.runtime.bunVersion.trim() || !input.runtime.bunRevision.trim()) {
    throw new TypeError('runtime version and revision must be non-empty');
  }
  if (input.source?.exitCode !== undefined && !Number.isSafeInteger(input.source.exitCode)) {
    throw new TypeError('source exitCode must be a safe integer');
  }
  if (
    input.source?.durationNs !== undefined &&
    (!Number.isSafeInteger(input.source.durationNs) || input.source.durationNs < 0)
  ) {
    throw new TypeError('source durationNs must be a non-negative safe integer');
  }

  const checks = input.checks.map(canonicalCheck);
  const summary = summarizeQualityChecks(checks);
  const snapshot = input.snapshot
    ? {
        baseline:
          input.snapshot.baseline === undefined
            ? null
            : canonicalJsonDigests(input.snapshot.baseline),
        candidate: canonicalJsonDigests(input.snapshot.candidate),
        diff: semanticJsonDiff(input.snapshot.baseline ?? null, input.snapshot.candidate, {
          maxChanges: input.snapshot.maxChanges,
        }),
      }
    : undefined;
  if (snapshot && snapshot.diff.changed !== checks.some(check => check.changed)) {
    throw new TypeError('snapshot diff and quality check changed state disagree');
  }

  const core: QualityReportCore = {
    schemaVersion: QUALITY_REPORT_SCHEMA_VERSION,
    runId: input.runId,
    scope: input.scope,
    generatedAt: input.generatedAt,
    runtime: { ...input.runtime },
    source: { ...(input.source ?? {}) },
    summary,
    checks,
    ...(snapshot ? { snapshot } : {}),
  };
  return { ...core, integrity: canonicalJsonDigests(reportCoreJson(core)) };
}

function markdownCell(value: string | number | boolean): string {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function displayMs(durationNs: number | undefined): string {
  return durationNs === undefined ? '—' : `${(durationNs / 1_000_000).toFixed(3)} ms`;
}

function verdictTone(verdict: QualitySummary['verdict']): 'ok' | 'warn' | 'bad' {
  if (verdict === 'passed') return 'ok';
  if (verdict === 'failed') return 'bad';
  return 'warn';
}

export function renderQualityReportJson(report: QualityReport): string {
  return `${canonicalJsonText(parseCanonicalJsonValue(report))}\n`;
}

export function renderQualityReportMarkdown(report: QualityReport): string {
  const lines = [
    `# Quality report: ${report.scope}`,
    '',
    `- Verdict: **${report.summary.verdict}**`,
    `- Run: \`${report.runId}\``,
    `- Generated: ${report.generatedAt}`,
    `- Bun: ${report.runtime.bunVersion} (${report.runtime.bunRevision})`,
    `- Repository: ${report.source.repositoryRevision ?? 'unknown'}${report.source.repositoryDirty === undefined ? '' : report.source.repositoryDirty ? ' (dirty)' : ' (clean)'}`,
    `- Duration: ${displayMs(report.source.durationNs)}`,
    `- Integrity SHA3-256: \`${report.integrity.sha3_256}\``,
    '',
    '## Summary',
    '',
    '| Total | Passed | Failed | Changed | Technical | Domain | Policy |',
    '| ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    `| ${report.summary.total} | ${report.summary.passed} | ${report.summary.failed} | ${report.summary.changed} | ${report.summary.byLayer.technical} | ${report.summary.byLayer.domain} | ${report.summary.byLayer.policy} |`,
    '',
    '## Checks',
    '',
    '| Check | Owner | Layer | Result | Changed | Approval |',
    '| --- | --- | --- | --- | --- | --- |',
    ...report.checks.map(
      check =>
        `| ${markdownCell(check.id)} | ${markdownCell(check.owner)} | ${check.layer} | ${check.passed ? 'pass' : 'fail'} | ${check.changed ? 'yes' : 'no'} | ${check.snapshotApproval} |`
    ),
  ];
  if (report.snapshot) {
    lines.push(
      '',
      '## Snapshot comparison',
      '',
      `- Candidate SHA3-256: \`${report.snapshot.candidate.sha3_256}\``,
      `- Baseline SHA3-256: ${report.snapshot.baseline ? `\`${report.snapshot.baseline.sha3_256}\`` : 'none'}`,
      `- Semantic changes: ${report.snapshot.diff.totalChanges}${report.snapshot.diff.truncated ? ' (display truncated)' : ''}`,
      '',
      '| Operation | JSON Pointer | Before | After |',
      '| --- | --- | --- | --- |',
      ...report.snapshot.diff.changes.map(
        change =>
          `| ${change.operation} | \`${markdownCell(change.path)}\` | \`${markdownCell(change.before === undefined ? '—' : canonicalJsonText(change.before))}\` | \`${markdownCell(change.after === undefined ? '—' : canonicalJsonText(change.after))}\` |`
      )
    );
  }
  lines.push('', '---', '', 'Generated by `bun run quality:report`.', '');
  return lines.join('\n');
}

function htmlValue(value: CanonicalJson | undefined): string {
  return value === undefined ? '—' : escapeHtml(canonicalJsonText(value));
}

export function renderQualityReportHtml(report: QualityReport): string {
  const tone = verdictTone(report.summary.verdict);
  const checks = report.checks
    .map(
      check => `<tr>
        <th scope="row"><code>${escapeHtml(check.id)}</code></th>
        <td>${escapeHtml(check.owner)}</td>
        <td>${escapeHtml(check.layer)}</td>
        <td><span class="tone-chip tone-${check.passed ? 'ok' : 'bad'}">${check.passed ? 'pass' : 'fail'}</span></td>
        <td>${check.changed ? 'yes' : 'no'}</td>
        <td>${escapeHtml(check.snapshotApproval)}</td>
      </tr>`
    )
    .join('\n');
  const diffRows =
    report.snapshot?.diff.changes
      .map(
        change => `<tr>
          <td>${escapeHtml(change.operation)}</td>
          <th scope="row"><code>${escapeHtml(change.path)}</code></th>
          <td><code>${htmlValue(change.before)}</code></td>
          <td><code>${htmlValue(change.after)}</code></td>
        </tr>`
      )
      .join('\n') ?? '';
  const snapshotSection = report.snapshot
    ? `<section aria-labelledby="quality-diff-title">
      <h2 id="quality-diff-title">Snapshot comparison</h2>
      <dl class="quality-meta">
        <div><dt>Candidate SHA3-256</dt><dd><code>${report.snapshot.candidate.sha3_256}</code></dd></div>
        <div><dt>Baseline SHA3-256</dt><dd><code>${report.snapshot.baseline?.sha3_256 ?? 'none'}</code></dd></div>
        <div><dt>Semantic changes</dt><dd>${report.snapshot.diff.totalChanges}${report.snapshot.diff.truncated ? ' (display truncated)' : ''}</dd></div>
      </dl>
      <div class="portal-table-wrap" tabindex="0" aria-label="Semantic changes table">
        <table class="portal-table">
          <caption>Bounded semantic changes from the accepted baseline</caption>
          <thead><tr><th scope="col">Operation</th><th scope="col">JSON Pointer</th><th scope="col">Before</th><th scope="col">After</th></tr></thead>
          <tbody>${diffRows || '<tr><td colspan="4">No semantic changes.</td></tr>'}</tbody>
        </table>
      </div>
    </section>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>Quality report · ${escapeHtml(report.scope)}</title>
  <link rel="stylesheet" href="/portal/style.css">
  <style>
    .quality-shell { width: min(1120px, calc(100% - 2rem)); margin-inline: auto; }
    .quality-header, .quality-nav, .quality-section, .quality-meta-panel, .quality-footer { margin-block: 1rem; }
    .quality-nav ul { display: flex; flex-wrap: wrap; gap: .75rem; padding: 0; list-style: none; }
    .quality-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(15rem, 22rem); gap: 1rem; align-items: start; }
    .quality-meta { display: grid; gap: .65rem; }
    .quality-meta div { display: grid; gap: .15rem; }
    .quality-meta dt { color: var(--muted, #9ca3af); font-size: .8rem; text-transform: uppercase; }
    .quality-meta dd { margin: 0; overflow-wrap: anywhere; }
    .quality-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr)); gap: .75rem; }
    .quality-summary div, .quality-section, .quality-meta-panel { padding: 1rem; border: 1px solid var(--border, #334155); border-radius: .75rem; background: var(--surface, #111827); }
    .quality-summary strong { display: block; font-size: 1.5rem; }
    .quality-footer { padding-block: 1rem 2rem; color: var(--muted, #9ca3af); }
    @media (max-width: 760px) { .quality-grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <a class="portal-skip-link" href="#quality-main">Skip to quality report</a>
  <header class="quality-header quality-shell" aria-labelledby="quality-title">
    <p class="portal-eyebrow">Project R quality evidence</p>
    <h1 id="quality-title">Quality report: ${escapeHtml(report.scope)}</h1>
    <p><span class="tone-chip tone-${tone}">${escapeHtml(report.summary.verdict)}</span> Generated ${escapeHtml(report.generatedAt)}</p>
  </header>
  <nav class="quality-nav quality-shell" aria-label="Quality report formats">
    <ul><li><a href="./report.json">JSON</a></li><li><a href="./report.md">Markdown</a></li><li><a href="/portal/">Portal home</a></li></ul>
  </nav>
  <main id="quality-main" class="quality-shell" tabindex="-1">
    <div class="quality-grid">
      <div>
        <section class="quality-section" aria-labelledby="quality-summary-title">
          <h2 id="quality-summary-title">Summary</h2>
          <div class="quality-summary">
            <div><span>Total</span><strong>${report.summary.total}</strong></div>
            <div><span>Passed</span><strong>${report.summary.passed}</strong></div>
            <div><span>Failed</span><strong>${report.summary.failed}</strong></div>
            <div><span>Changed</span><strong>${report.summary.changed}</strong></div>
          </div>
        </section>
        <section class="quality-section" aria-labelledby="quality-checks-title">
          <h2 id="quality-checks-title">Checks</h2>
          <div class="portal-table-wrap" tabindex="0" aria-label="Quality checks table">
            <table class="portal-table">
              <caption>Invariant and snapshot evidence by owner</caption>
              <thead><tr><th scope="col">Check</th><th scope="col">Owner</th><th scope="col">Layer</th><th scope="col">Result</th><th scope="col">Changed</th><th scope="col">Approval</th></tr></thead>
              <tbody>${checks || '<tr><td colspan="6">No checks were reported.</td></tr>'}</tbody>
            </table>
          </div>
        </section>
${snapshotSection}
      </div>
      <aside class="quality-meta-panel" aria-labelledby="quality-metadata-title">
        <h2 id="quality-metadata-title">Run metadata</h2>
        <dl class="quality-meta">
          <div><dt>Run</dt><dd><code>${escapeHtml(report.runId)}</code></dd></div>
          <div><dt>Bun</dt><dd>${escapeHtml(report.runtime.bunVersion)}</dd></div>
          <div><dt>Revision</dt><dd><code>${escapeHtml(report.runtime.bunRevision)}</code></dd></div>
          <div><dt>Repository state</dt><dd>${report.source.repositoryDirty === undefined ? 'unknown' : report.source.repositoryDirty ? 'dirty' : 'clean'}</dd></div>
          <div><dt>Repository revision</dt><dd><code>${escapeHtml(report.source.repositoryRevision ?? '—')}</code></dd></div>
          <div><dt>Command</dt><dd><code>${escapeHtml(report.source.command ?? '—')}</code></dd></div>
          <div><dt>Duration</dt><dd>${displayMs(report.source.durationNs)}</dd></div>
          <div><dt>Integrity SHA3-256</dt><dd><code>${report.integrity.sha3_256}</code></dd></div>
        </dl>
      </aside>
    </div>
  </main>
  <footer class="quality-footer quality-shell">
    <p>Project R quality evidence · generated by <code>bun run quality:report</code></p>
  </footer>
</body>
</html>
`;
}

export const QUALITY_REPORT_ENUMS = {
  layers: ['technical', 'domain', 'policy'] satisfies QualityLayer[],
  severities: ['error', 'warning', 'review'] satisfies QualitySeverity[],
  approvals: ['eligible', 'manual-only', 'forbidden'] satisfies SnapshotApproval[],
};
