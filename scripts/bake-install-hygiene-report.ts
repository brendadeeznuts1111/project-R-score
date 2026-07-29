#!/usr/bin/env bun
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
/**
 * Bake install-hygiene audit report for portal/registry.
 *
 *   bun run bake:install-hygiene
 *
 * Collects:
 *   - install-cache slice (lib/monitoring/install-cache-slice.ts)
 *   - npm-install check result (scripts/check-npm-install.ts)
 *   - bun run install:verify --dry-run --json
 *
 * Writes:
 *   public/registry/install-hygiene-report.json
 *   offline embed into public/portal/install-hygiene/index.html
 */
export {};

import { joinPath } from '../lib/path-bun.ts';
import { collectInstallCacheMonitoringSlice } from '../lib/monitoring/install-cache-slice.ts';
import { runNpmInstallCheck } from './check-npm-install.ts';

const ROOT = `${import.meta.dir}/..`;
const OUT_PATH = joinPath(ROOT, 'public/registry/install-hygiene-report.json');
const BOARD_HTML = joinPath(ROOT, 'public/portal/install-hygiene/index.html');
const EMBED_ID = 'install-hygiene-embed';

export type InstallVerifyDryRun = {
  ok: boolean;
  failed: number;
  strict: boolean;
  dryRun: boolean;
  checks: Array<{ ok: boolean; label: string; detail?: string }>;
};

async function runInstallVerifyDryRun(): Promise<InstallVerifyDryRun> {
  const proc = Bun.spawnSync(['bun', 'run', 'install:verify', '--dry-run', '--json'], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const text = proc.stdout ? new TextDecoder().decode(proc.stdout).trim() : '';
  try {
    const parsed = JSON.parse(text) as InstallVerifyDryRun;
    return parsed;
  } catch {
    return {
      ok: false,
      failed: 0,
      strict: false,
      dryRun: true,
      checks: [
        {
          ok: false,
          label: 'install:verify parse',
          detail: `non-JSON output (exit ${proc.exitCode}): ${text.slice(0, 200)}`,
        },
      ],
    };
  }
}

export type InstallHygieneBakeResult = {
  ok: boolean;
  path: string;
};

export async function bakeInstallHygieneReport(opts?: {
  outPath?: string;
  log?: boolean;
}): Promise<InstallHygieneBakeResult> {
  const outPath = opts?.outPath ?? OUT_PATH;
  const [installCache, npmInstall, installVerify] = await Promise.all([
    collectInstallCacheMonitoringSlice(),
    runNpmInstallCheck(),
    runInstallVerifyDryRun(),
  ]);

  const report = {
    schemaVersion: 1,
    kind: 'install-hygiene',
    generatedAt: new Date().toISOString(),
    bunVersion: Bun.version,
    bunRevision: Bun.revision,
    installCache,
    npmInstall: {
      ok: npmInstall.ok,
      violations: npmInstall.violations,
      violationCount: npmInstall.violations.length,
      allowedPaths: npmInstall.allowedPaths,
    },
    installVerify,
    ok: !installCache.wouldPrune && npmInstall.ok && installVerify.ok,
  };

  await Bun.write(outPath, `${JSON.stringify(report, null, 2)}\n`);
  await injectBoardEmbed(report as Record<string, unknown>);
  if (opts?.log !== false) {
    const cacheText = installCache.available
      ? `${installCache.sizeHuman ?? 'unknown'}`
      : 'unavailable';
    const npmText = npmInstall.ok ? 'clean' : `${npmInstall.violations.length} violations`;
    const verifyText = installVerify.ok ? 'pass' : `${installVerify.failed} failed`;
    console.log(
      `[install-hygiene] bake → ${outPath.replace(ROOT + '/', '')} · board embed · ok=${report.ok} · cache=${cacheText} · npm=${npmText} · verify=${verifyText}`
    );
  }
  return { ok: report.ok, path: outPath };
}

/** Escape for HTML text nodes (not attributes with quotes complex). */
function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * No-JS / mobile-first paint from bake (module board still re-renders fully).
 * Mirrors toneFromReport / buildStatRows / cacheMeterFromSlice lightly.
 */
function buildSsrFragments(report: Record<string, unknown>): {
  tone: string;
  label: string;
  reasonsHtml: string;
  metaHtml: string;
  statsHtml: string;
  meterHtml: string;
  summaryText: string;
} {
  const cache = (report.installCache ?? {}) as Record<string, unknown>;
  const npm = (report.npmInstall ?? {}) as Record<string, unknown>;
  const verify = (report.installVerify ?? {}) as Record<string, unknown>;
  const reasons: string[] = [];
  if (cache.wouldPrune === true) reasons.push('cache over prune threshold');
  if (npm.ok === false) reasons.push('npm-install policy violations');
  if (verify.ok === false) reasons.push('install:verify failed');
  if (report.ok === false && reasons.length === 0) reasons.push('report.ok=false');

  let tone = 'yellow';
  let label = 'attention';
  if (reasons.length === 0 && report.ok === true) {
    tone = 'green';
    label = 'healthy';
  } else if (verify.ok === false || npm.ok === false) {
    tone = 'red';
    label = 'fail';
  }

  const size = typeof cache.sizeBytes === 'number' ? cache.sizeBytes : null;
  const thr = typeof cache.thresholdBytes === 'number' ? cache.thresholdBytes : null;
  let meterHtml = '';
  if (size != null && thr != null && thr > 0) {
    const ratio = size / thr;
    const pct = Math.round(ratio * 100);
    let mTone = 'green';
    if (ratio > 1) mTone = 'yellow';
    if (ratio > 1.5) mTone = 'red';
    const width = Math.min(100, Math.round((Math.min(ratio, 1.5) / 1.5) * 100));
    const labelM = `${String(cache.sizeHuman ?? '?')} / ${String(cache.thresholdHuman ?? '?')} (${pct}%)`;
    meterHtml = `<div class="ih-meter ih-meter--${mTone}" title="${escHtml(labelM)}"><div class="ih-meter-track"><div class="ih-meter-fill" style="width:${width}%"></div><div class="ih-meter-mark" style="left:67%" title="threshold"></div></div><div class="ih-meter-label">${escHtml(labelM)}</div></div>`;
  }

  const overallTone =
    report.ok === true ? 'green' : verify.ok === false || npm.ok === false ? 'red' : 'yellow';
  const pruneTone =
    cache.wouldPrune === true ? 'yellow' : cache.wouldPrune === false ? 'green' : 'neutral';
  const stats = [
    {
      k: 'overall',
      v: report.ok === true ? 'ok' : overallTone === 'red' ? 'fail' : 'attention',
      t: overallTone,
    },
    {
      k: 'cache size',
      v: String(cache.sizeHuman ?? '—'),
      t: pruneTone === 'yellow' ? 'yellow' : 'neutral',
    },
    {
      k: 'would prune',
      v: cache.wouldPrune === true ? 'yes' : cache.wouldPrune === false ? 'no' : '—',
      t: pruneTone,
    },
    {
      k: 'npm install',
      v: npm.ok === true ? 'clean' : npm.ok === false ? 'fail' : '—',
      t: npm.ok === true ? 'green' : npm.ok === false ? 'red' : 'neutral',
    },
    {
      k: 'install:verify',
      v: verify.ok === true ? 'pass' : verify.ok === false ? 'fail' : '—',
      t: verify.ok === true ? 'green' : verify.ok === false ? 'red' : 'neutral',
    },
    { k: 'bun', v: String(report.bunVersion ?? '—'), t: 'neutral' },
  ];
  const statsHtml = stats
    .map(
      s =>
        `<div class="doc-stat doc-stat--${s.t}" data-tone="${s.t}"><div class="k">${escHtml(s.k)}</div><div class="v">${escHtml(s.v)}</div></div>`
    )
    .join('');

  const reasonsHtml =
    reasons.length > 0
      ? `<span class="ih-chip ih-chip--${tone}">${escHtml(tone === 'red' ? 'fail' : 'attention')}</span> ${escHtml(reasons.join(' · '))}`
      : `<span class="ih-chip ih-chip--green">ok</span> All planes clean`;

  const gen = String(report.generatedAt ?? '—');
  const metaHtml = `generated ${escHtml(gen)} · bun <span class="ih-chip ih-chip--neutral">${escHtml(String(report.bunVersion ?? '?'))}</span> · offline SSR bake`;

  const summaryText = [
    `install-hygiene · ${label} (${tone})`,
    `generated: ${gen}`,
    `bun: ${String(report.bunVersion ?? '—')}`,
    `cache: ${String(cache.sizeHuman ?? '—')} / ${String(cache.thresholdHuman ?? '—')} prune=${String(cache.wouldPrune)}`,
    `npm: ${npm.ok === true ? 'clean' : npm.ok === false ? 'FAIL' : '—'}`,
    `install:verify: ${verify.ok === true ? 'pass' : verify.ok === false ? 'FAIL' : '—'}`,
    reasons.length ? `reasons: ${reasons.join('; ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return { tone, label, reasonsHtml, metaHtml, statsHtml, meterHtml, summaryText };
}

function replaceIdInner(html: string, id: string, inner: string): string {
  // brand-ok — HTML element id
  // brand-ok — HTML element id
  const re = new RegExp(`(id="${id}"[^>]*>)([\\s\\S]*?)(</(?:span|div|p|pre)>)`);
  if (!re.test(html)) return html;
  return html.replace(re, `$1${inner}$3`);
}

function replaceIdOpenClass(html: string, id: string, className: string): string {
  // brand-ok — HTML element id
  // brand-ok — HTML element id
  // class may appear before or after id=
  const reAfter = new RegExp(`id="${id}" class="[^"]*"`);
  if (reAfter.test(html)) return html.replace(reAfter, `id="${id}" class="${className}"`);
  const reBefore = new RegExp(`class="[^"]*" id="${id}"`);
  if (reBefore.test(html)) return html.replace(reBefore, `class="${className}" id="${id}"`);
  return html.replace(`id="${id}"`, `id="${id}" class="${className}"`);
}

/** Offline SSOT: inject compact JSON + no-JS SSR paint into the board HTML. */
async function injectBoardEmbed(report: Record<string, unknown>): Promise<void> {
  const htmlFile = Bun.file(BOARD_HTML);
  if (!(await htmlFile.exists())) return;
  let html = await htmlFile.text();
  const compact = JSON.stringify(report);
  const embed = `<script type="application/json" id="${EMBED_ID}">${compact}</script>`;
  const re = new RegExp(`<script type="application/json" id="${EMBED_ID}">[\\s\\S]*?</script>`);
  if (re.test(html)) {
    html = html.replace(re, embed);
  } else {
    html = html.replace(
      '<link rel="stylesheet" href="/portal/style.css" />',
      `<link rel="stylesheet" href="/portal/style.css" />\n  ${embed}`
    );
  }

  const ssr = buildSsrFragments(report);
  html = replaceIdOpenClass(html, 'ih-tone', `doc-badge ${ssr.tone}`);
  html = replaceIdInner(html, 'ih-tone', escHtml(ssr.label));
  html = replaceIdOpenClass(html, 'ih-shell', `doc-wrap ih-shell ih-shell--${ssr.tone}`);
  html = replaceIdInner(html, 'ih-meta', ssr.metaHtml);
  html = replaceIdOpenClass(
    html,
    'ih-reasons',
    `ih-reasons ih-reasons--${ssr.tone === 'missing' ? 'yellow' : ssr.tone}`
  );
  // unhide reasons
  html = html.replace(/id="ih-reasons"([^>]*)\shidden/, `id="ih-reasons"$1`);
  html = replaceIdInner(html, 'ih-reasons', ssr.reasonsHtml);
  html = replaceIdInner(html, 'ih-stats', ssr.statsHtml);
  html = replaceIdInner(html, 'ih-cache-meter', ssr.meterHtml);
  html = replaceIdInner(html, 'ih-summary-text', escHtml(ssr.summaryText));
  html = replaceIdInner(
    html,
    'ih-source',
    `<span class="ih-chip ih-chip--neutral" data-tone="neutral">offline SSR</span>`
  );

  await Bun.write(BOARD_HTML, html);
}

if (import.meta.main) {
  await bakeInstallHygieneReport();
}
