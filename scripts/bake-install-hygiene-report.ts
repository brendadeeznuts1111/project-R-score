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
 *   embedded snapshot in public/portal/install-hygiene/index.html
 */

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
  if (cache.wouldPrune === true) {
    reasons.push('Install cache exceeds the configured cleanup threshold.');
  }
  if (npm.ok === false) {
    reasons.push('Disallowed package-manager install commands were found.');
  }
  if (verify.ok === false) reasons.push('Installation verification failed.');
  if (report.ok === false && reasons.length === 0) {
    reasons.push('The report is unhealthy for an unspecified reason.');
  }

  let tone = 'yellow';
  let label = 'review needed';
  if (reasons.length === 0 && report.ok === true) {
    tone = 'green';
    label = 'healthy';
  } else if (verify.ok === false || npm.ok === false) {
    tone = 'red';
    label = 'blocked';
  }

  const size = typeof cache.sizeBytes === 'number' ? cache.sizeBytes : null;
  const thr = typeof cache.thresholdBytes === 'number' ? cache.thresholdBytes : null;
  let meterHtml = '';
  if (size != null && thr != null && thr > 0) {
    const ratio = size / thr;
    const pct = Math.round(ratio * 100);
    let mTone = 'green';
    if (ratio > 1) mTone = 'yellow';
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
      k: 'status',
      v: report.ok === true ? 'healthy' : overallTone === 'red' ? 'blocked' : 'review needed',
      t: overallTone,
    },
    {
      k: 'cache usage',
      v: String(cache.sizeHuman ?? '—'),
      t: pruneTone === 'yellow' ? 'yellow' : 'neutral',
    },
    {
      k: 'cleanup recommended',
      v: cache.wouldPrune === true ? 'yes' : cache.wouldPrune === false ? 'no' : '—',
      t: pruneTone,
    },
    {
      k: 'package-manager policy',
      v: npm.ok === true ? 'clean' : npm.ok === false ? 'failed' : '—',
      t: npm.ok === true ? 'green' : npm.ok === false ? 'red' : 'neutral',
    },
    {
      k: 'installation verification',
      v: verify.ok === true ? 'passed' : verify.ok === false ? 'failed' : '—',
      t: verify.ok === true ? 'green' : verify.ok === false ? 'red' : 'neutral',
    },
    { k: 'Bun runtime', v: String(report.bunVersion ?? '—'), t: 'neutral' },
  ];
  const statsHtml = stats
    .map(
      s =>
        `<div class="doc-stat doc-stat--${s.t}" data-tone="${s.t}"><div class="k">${escHtml(s.k)}</div><div class="v">${escHtml(s.v)}</div></div>`
    )
    .join('');

  // Plain text only (no nested tags) so SSR inject cannot corrupt HTML via early </span>
  const reasonsHtml =
    reasons.length > 0
      ? `${escHtml(tone === 'red' ? 'blocked' : 'review needed')}: ${escHtml(reasons.join(' '))}`
      : 'passed: All install checks passed.';

  const gen = String(report.generatedAt ?? '—');
  const metaHtml = `generated ${escHtml(gen)} · Bun ${escHtml(String(report.bunVersion ?? '?'))} · embedded snapshot`;

  const summaryText = [
    `install hygiene: ${label}`,
    `generated: ${gen}`,
    `Bun runtime: ${String(report.bunVersion ?? '—')}`,
    `cache usage: ${String(cache.sizeHuman ?? '—')}; cleanup threshold: ${String(cache.thresholdHuman ?? '—')}; cleanup recommended: ${cache.wouldPrune === true ? 'yes' : cache.wouldPrune === false ? 'no' : 'unknown'}`,
    `package-manager policy: ${npm.ok === true ? 'clean' : npm.ok === false ? 'failed' : 'unknown'}`,
    `installation verification: ${verify.ok === true ? 'passed' : verify.ok === false ? 'failed' : 'unknown'}`,
    reasons.length ? `reason: ${reasons.join(' ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return { tone, label, reasonsHtml, metaHtml, statsHtml, meterHtml, summaryText };
}

/** Replace innerHTML of the first element with id=domKey (depth-aware). */
function replaceDomInner(html: string, domKey: string, inner: string): string {
  const idAttr = `id="${domKey}"`;
  const idPos = html.indexOf(idAttr);
  if (idPos < 0) return html;
  const openStart = html.lastIndexOf('<', idPos);
  if (openStart < 0) return html;
  const openEnd = html.indexOf('>', idPos);
  if (openEnd < 0) return html;
  const tagMatch = /^<\s*([a-zA-Z0-9-]+)/.exec(html.slice(openStart, openEnd + 1));
  if (!tagMatch) return html;
  const tag = tagMatch[1]!;
  const openTag = html.slice(openStart, openEnd + 1);
  if (openTag.trim().endsWith('/>')) return html; // void
  let depth = 1;
  let i = openEnd + 1;
  const openRe = new RegExp(`<${tag}\\b`, 'gi');
  const closeRe = new RegExp(`</${tag}\\s*>`, 'gi');
  while (i < html.length && depth > 0) {
    openRe.lastIndex = i;
    closeRe.lastIndex = i;
    const nextOpen = openRe.exec(html);
    const nextClose = closeRe.exec(html);
    if (!nextClose) break;
    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++;
      i = nextOpen.index + nextOpen[0].length;
    } else {
      depth--;
      if (depth === 0) {
        // Keep the closing tag; replace only the inner HTML.
        return html.slice(0, openEnd + 1) + inner + html.slice(nextClose.index);
      }
      i = nextClose.index + nextClose[0].length;
    }
  }
  return html;
}

function replaceDomClass(html: string, domKey: string, className: string): string {
  // class may appear before or after id=
  const reAfter = new RegExp(`id="${domKey}" class="[^"]*"`);
  if (reAfter.test(html)) return html.replace(reAfter, `id="${domKey}" class="${className}"`);
  const reBefore = new RegExp(`class="[^"]*" id="${domKey}"`);
  if (reBefore.test(html)) return html.replace(reBefore, `class="${className}" id="${domKey}"`);
  return html.replace(`id="${domKey}"`, `id="${domKey}" class="${className}"`);
}

/** Inject compact JSON and no-script-ready content into the board HTML. */
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
  html = replaceDomClass(html, 'ih-tone', `doc-badge ${ssr.tone}`);
  html = replaceDomInner(html, 'ih-tone', escHtml(ssr.label));
  html = replaceDomClass(html, 'ih-shell', `doc-wrap ih-shell ih-shell--${ssr.tone}`);
  html = replaceDomInner(html, 'ih-meta', ssr.metaHtml);
  html = replaceDomClass(
    html,
    'ih-reasons',
    `ih-reasons ih-reasons--${ssr.tone === 'missing' ? 'yellow' : ssr.tone}`
  );
  // unhide reasons
  html = html.replace(/id="ih-reasons"([^>]*)\shidden/, `id="ih-reasons"$1`);
  html = replaceDomInner(html, 'ih-reasons', ssr.reasonsHtml);
  html = replaceDomInner(html, 'ih-stats', ssr.statsHtml);
  html = replaceDomInner(html, 'ih-cache-meter', ssr.meterHtml);
  html = replaceDomInner(html, 'ih-summary-text', escHtml(ssr.summaryText));
  html = replaceDomInner(html, 'ih-source', 'embedded snapshot');

  await Bun.write(BOARD_HTML, html);
}

if (import.meta.main) {
  await bakeInstallHygieneReport();
}
