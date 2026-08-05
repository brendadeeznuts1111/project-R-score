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
  buildFailuresReport,
  FAILURES_STALE_MS,
  type TestFailuresReport,
} from '../lib/failure-report.ts';

const ROOT = joinPath(import.meta.dir, '..');
const OUT_JSON = joinPath(ROOT, 'public', 'registry', 'failures.json');
const OUT_HTML = joinPath(ROOT, 'public', 'portal', 'failures', 'index.html');
const NO_FAIL = Bun.argv.includes('--no-fail');

/** Export for unit coverage of the stale-board template. */
export function renderHtml(report: TestFailuresReport): string {
  const t = report.totals;
  const stat = (k: string, v: string | number, cls = '') =>
    `<div class="tf-stat ${cls}"><div class="k">${k}</div><div class="v">${v}</div></div>`;
  const rows = report.failures.length
    ? report.failures
        .map(
          f => `<tr class="fail">
        <td><code>${escapeHtml(f.file)}</code></td>
        <td>${escapeHtml(f.name)}</td>
        <td class="dim">${escapeHtml(f.message.split('\n')[0] ?? '').slice(0, 120)}</td>
        <td class="replay">
          <code>${escapeHtml(f.replayFile)}</code><br/>
          <code>${escapeHtml(f.replayTest)}</code>
        </td>
      </tr>`
        )
        .join('\n')
    : '<tr><td colspan="4" class="ok">No failing tests in the latest JUnit run ✓</td></tr>';

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
    .tf-wrap { max-width: 1200px; margin: 0 auto; padding: 0 24px 48px; }
    .tf-stats { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; margin: 16px 0 20px; }
    .tf-stat { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 14px; }
    .tf-stat .k { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--text-dim); }
    .tf-stat .v { font-size: 22px; font-weight: 650; font-variant-numeric: tabular-nums; }
    .tf-stat.bad .v { color: var(--red, #f85149); }
    .tf-stat.ok .v { color: var(--green, #3fb950); }
    .tf-panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 18px; margin-bottom: 16px; }
    .tf-panel h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .5px; color: var(--text-dim); margin: 0 0 12px; }
    .tf-stale { background: rgba(248,81,73,.08); border: 1px solid var(--red, #f85149); color: var(--red, #f85149); border-radius: var(--radius); padding: 10px 14px; margin: 0 0 16px; font-size: 12px; line-height: 1.5; }
    .tf-stale strong { font-weight: 650; }
    .tf-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .tf-table th { text-align: left; padding: 6px 8px; color: var(--text-dim); font-weight: 500; border-bottom: 1px solid var(--border); }
    .tf-table td { padding: 6px 8px; border-bottom: 1px solid rgba(48,54,61,.4); vertical-align: top; }
    .tf-table tr.fail td { color: var(--red, #f85149); }
    .tf-table td.ok { color: var(--green, #3fb950); }
    .tf-table td.replay code { font-size: 11px; color: var(--text-dim); }
    .dim { color: var(--text-dim); font-size: 11px; }
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
  <main class="tf-wrap">
    <div id="tf-stale-banner" class="tf-stale" hidden></div>
    <p class="dim">Latest JUnit results (${escapeHtml(report.sources.join(', '))}) · suite ${escapeHtml(sourceAt)} · baked ${escapeHtml(report.generatedAt)} · <code>bun run failures:bake</code></p>
    <div class="tf-stats">
      ${stat('Tests', t.tests)}
      ${stat('Failures', t.failures, t.failures ? 'bad' : 'ok')}
      ${stat('Skipped', t.skipped)}
      ${stat('Time (s)', t.timeSeconds)}
    </div>
    <div class="tf-panel">
      <h2>Failing tests &amp; dev replay</h2>
      <table class="tf-table">
        <thead><tr><th>File</th><th>Test</th><th>Error</th><th>Replay</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
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
