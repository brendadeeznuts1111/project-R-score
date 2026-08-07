#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Test failures bake — parses Bun JUnit XML into:
 *   public/registry/failures.json        (machine report)
 *   public/portal/failures/index.html    (baked board with per-failure replay commands)
 *
 * Input: tmp/junit*.xml by default (produced by `bun run test:ci*`), or
 * explicit files via `--from <file…>`.
 *
 *   bun run failures:bake
 *   bun test tests/ --reporter=junit --reporter-outfile=tmp/junit.xml; bun run failures:bake
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { joinPath } from '../lib/path-bun.ts';
import { escapeHtml } from '../lib/escape-html.ts';
import {
  escHtml,
  renderPortalPanel,
  renderPortalStatGrid,
  renderPortalTable,
} from '../lib/portal/ui-html.ts';
import {
  buildFailuresReport,
  FAILURES_STALE_MS,
  type TestFailuresReport,
} from '../lib/failure-report.ts';

const ROOT = joinPath(import.meta.dir, '..');
const OUT_JSON = joinPath(ROOT, 'public', 'registry', 'failures.json');
const OUT_HTML = joinPath(ROOT, 'public', 'portal', 'failures', 'index.html');
const NO_FAIL = Bun.argv.includes('--no-fail');

function formatEnvLine(report: TestFailuresReport): string {
  const e = report.env ?? {};
  const bits: string[] = [];
  if (e.commit) bits.push(`commit <code>${escapeHtml(e.commit.slice(0, 12))}</code>`);
  if (e.hostname) bits.push(`host <code>${escapeHtml(e.hostname)}</code>`);
  if (e.ci) {
    bits.push(
      `ci <a href="${escapeHtml(e.ci)}">${escapeHtml(e.ci.replace(/^https?:\/\//, '').slice(0, 48))}</a>`
    );
  }
  return bits.length ? ` · ${bits.join(' · ')}` : '';
}

/** Export for unit coverage of the stale-board template. */
export function renderHtml(report: TestFailuresReport): string {
  const t = report.totals;
  const gateCls = t.failures ? 'fail' : 'pass';
  const gateLabel = t.failures ? `${t.failures} failing` : 'healthy';

  const failTable = renderPortalTable(
    [
      { key: 'file', label: 'File' },
      { key: 'name', label: 'Test' },
      { key: 'error', label: 'Error' },
      { key: 'replay', label: 'Replay' },
    ],
    report.failures.map(f => [
      { html: `<code>${escHtml(f.file)}</code>` },
      f.name,
      {
        html: escHtml((f.message.split('\n')[0] ?? '').slice(0, 120)),
        className: 'dim',
      },
      {
        html: `<code>${escHtml(f.replayFile)}</code><br/><code>${escHtml(f.replayTest)}</code>`,
        className: 'replay',
      },
    ]),
    {
      className: 'tf-table',
      density: 'compact',
      emptyMessage: 'No failing tests in the latest JUnit run ✓',
      rowClass: () => 'fail',
    }
  );

  const sourceAt = report.sourceAt || report.generatedAt;

  return `<!DOCTYPE html>
<!-- @see docs/portal-foundation.md — baked by tools/failures-bake.ts; do not edit -->
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="portal-poll-ms" content="60000" />
  <title>Failures · FactoryWager</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/portal/style.css" />
  <script type="application/json" id="test-failures-embed">${JSON.stringify(report)}</script>
  <style>
    .tf-stale { background: rgba(248,81,73,.08); border: 1px solid var(--red, #f85149); color: var(--red, #f85149); border-radius: var(--radius); padding: 10px 14px; margin: 0 0 16px; font-size: 12px; line-height: 1.5; }
    .tf-stale strong { font-weight: 650; }
    /* Specialty tones only — base table from .portal-table */
    .portal-table.tf-table tr.fail td { color: var(--red, #f85149); }
    .portal-table.tf-table td.ok { color: var(--green, #3fb950); }
    .portal-table.tf-table td.replay code { font-size: 11px; color: var(--text-dim); }
    .dim { color: var(--text-dim); font-size: 11px; }
    .portal-stat { cursor: default; }
    .portal-stat:hover { transform: none; box-shadow: none; }
  </style>
</head>
<body>
  <nav id="tenant-sidebar" class="tenant-sidebar" aria-label="Tenants"></nav>
  <header class="topbar">
    <div class="topbar-inner">
      <h1 class="logo">
        <span class="logo-icon">■</span>
        <span class="brand-wordmark">FactoryWager</span>
        <span class="brand-badge">ops</span>
        <span class="logo-page">Failures</span>
      </h1>
      <nav class="topbar-nav" aria-label="Primary"></nav>
    </div>
  </header>
  <main class="portal-page">
    <div id="tf-stale-banner" class="tf-stale" hidden></div>
    <section class="portal-hero portal-hero--card" aria-labelledby="tf-hero-title">
      <p class="portal-eyebrow">JUnit · replay commands</p>
      <h2 id="tf-hero-title">Test failures board</h2>
      <p class="hero-sub">
        Latest suite totals with per-failure <code>bun test</code> replay lines.
        Refresh via <code>bun run failures:bake</code> after a JUnit run.
        Bun embeds <code>ci</code> / <code>commit</code> in JUnit when env is set
        (<a href="https://bun.com/docs/test/reporters#environment-variables-in-junit-reports">docs</a>).
      </p>
      <div class="portal-hero-meta">
        <span class="portal-gate ${gateCls}" aria-live="polite"><span class="dot" aria-hidden="true"></span>${gateLabel}</span>
        <span class="portal-baked">suite ${escapeHtml(sourceAt)} · baked ${escapeHtml(report.generatedAt)}</span>
        <div class="portal-source-links" aria-label="Related artifacts">
          <a href="/registry/failures.json">failures.json</a>
          <a href="/portal/doctor/">doctor</a>
          <a href="/portal/health/">health</a>
        </div>
      </div>
    </section>
    <p class="dim">Sources: ${escapeHtml(report.sources.join(', '))}${formatEnvLine(report)}</p>
    <div class="portal-stat-grid" aria-label="Failures summary">
      ${renderPortalStatGrid([
        { label: 'Tests', value: t.tests },
        { label: 'Failures', value: t.failures, tone: t.failures ? 'bad' : 'ok' },
        { label: 'Skipped', value: t.skipped },
        { label: 'Time (s)', value: t.timeSeconds },
      ])}
    </div>
    ${renderPortalPanel('Failing tests & dev replay', failTable, {
      desc: 'Copy the replay line into a local shell to reproduce.',
    })}
    <p class="dim">Reproduce: <code>bun test &lt;file&gt;</code> · pinpoint: <code>--test-name-pattern "&lt;name&gt;"</code> · refresh board: run the suite with <code>--reporter=junit --reporter-outfile=tmp/junit.xml</code> then <code>bun run failures:bake</code>.</p>
  </main>
  <script type="module" src="/portal/data.js"></script>
  <script type="module" src="/portal/topbar.js"></script>
  <script type="module" src="/portal/components/sidebar.js"></script>
  <script type="module" src="/portal/components/notification.js"></script>
  <script type="module" src="/portal/components/footer.js"></script>
  <script>
    // Stale-board guard: committed Pages HTML can outlive the suite it shows.
    // Prefer sourceAt (JUnit mtime) over generatedAt (bake wall-clock) so re-baking
    // an old junit file cannot fake freshness.
    (function () {
      try {
        const embed = document.getElementById('test-failures-embed');
        if (!embed || !embed.textContent) return;
        const report = JSON.parse(embed.textContent);
        const anchor = report.sourceAt || report.generatedAt;
        const ageMs = Date.now() - new Date(anchor).getTime();
        const STALE_MS = ${FAILURES_STALE_MS};
        if (!(ageMs > STALE_MS)) return;
        const days = Math.floor(ageMs / 86400000);
        const hours = Math.floor((ageMs % 86400000) / 3600000);
        const banner = document.getElementById('tf-stale-banner');
        if (!banner) return;
        banner.hidden = false;
        const age = days + 'd ' + hours + 'h ago';
        banner.innerHTML = report.healthy
          ? '<strong>⚠ Stale green board</strong> — suite source ' + age +
            ' (' + anchor + '). Green is meaningless; re-run the suite, then <code>bun run failures:bake</code>.'
          : '<strong>⚠ Board is stale</strong> — suite source ' + age +
            ' (' + anchor + '). Failure list may be outdated; re-run the suite, then <code>bun run failures:bake</code>.';
      } catch (_) { /* ignore embed parse errors */ }
    })();
  </script>
</body>
</html>
`;
}

async function main(): Promise<void> {
  const fromIdx = Bun.argv.indexOf('--from');
  const explicit = fromIdx >= 0 ? Bun.argv.slice(fromIdx + 1) : [];
  const allMode = Bun.argv.includes('--all');
  let files: string[];
  if (explicit.length > 0) {
    files = explicit;
  } else {
    const found = [
      ...new Bun.Glob('tmp/junit*.xml').scanSync({ cwd: ROOT, onlyFiles: true }),
    ].sort();
    if (allMode) {
      files = found;
    } else {
      // Default: newest file only — stale junit files from crashed runs would
      // flood the board with historical "(worker crashed)" rows.
      let newest: string | undefined;
      let newestM = 0;
      for (const f of found) {
        const st = await Bun.file(joinPath(ROOT, f)).stat();
        if (st.mtimeMs > newestM) {
          newestM = st.mtimeMs;
          newest = f;
        }
      }
      files = newest ? [newest] : [];
    }
  }

  if (files.length === 0) {
    console.error(
      'No JUnit files found (tmp/junit*.xml). Run: bun run test:ci (or --from <file…>)'
    );
    process.exit(1);
  }

  const docs = [];
  for (const f of files) {
    const path = f.startsWith('/') ? f : joinPath(ROOT, f);
    if (!(await Bun.file(path).exists())) {
      console.error(`warn: missing ${f} — skipped`);
      continue;
    }
    const file = Bun.file(path);
    const st = await file.stat();
    docs.push({ source: f, xml: await file.text(), mtimeMs: st.mtimeMs });
  }

  const report = buildFailuresReport(docs);
  await Bun.write(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await Bun.write(OUT_HTML, renderHtml(report));

  console.log(
    `test-failures: ${report.totals.tests} tests · ${report.totals.failures} failures · sources=${docs.length} · sourceAt=${report.sourceAt}`
  );
  for (const f of report.failures) {
    console.log(`  ✗ ${f.file} › ${f.name}`);
    console.log(`    replay: ${f.replayTest}`);
  }
  console.log(`baked: ${OUT_JSON}`);
  console.log(`baked: ${OUT_HTML}`);
  if (!report.healthy && !NO_FAIL) process.exit(1);
}

if (isModuleEntrypoint(import.meta)) {
  await main();
}
