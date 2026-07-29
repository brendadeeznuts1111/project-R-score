/**
 * Install hygiene board — reads /registry/install-hygiene-report.json.
 * @see docs/UNIFIED.md
 * @see lib/monitoring/install-hygiene-slice.ts
 * @see docs/harness/tenants/public-plane.md
 */
import { bindCopyButtons } from '../copy-cli.js';
import { fetchJsonResult } from '../fetch-json.js';

export const INSTALL_HYGIENE_SOURCE = '/registry/install-hygiene-report.json';
export const INSTALL_HYGIENE_SCHEMA = 1;

/**
 * @param {unknown} s
 * @returns {string}
 */
export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {string|null|undefined} iso
 * @returns {string}
 */
export function ageLabel(iso) {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return String(iso);
  const mins = Math.round((Date.now() - t) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

/**
 * Board tone from bake: green | yellow | red | missing
 * @param {Record<string, unknown>|null|undefined} report
 * @returns {{ tone: string, label: string, reasons: string[] }}
 */
export function toneFromReport(report) {
  if (!report || report.kind !== 'install-hygiene') {
    return { tone: 'missing', label: 'missing', reasons: ['No install-hygiene bake'] };
  }
  if (report.schemaVersion !== INSTALL_HYGIENE_SCHEMA) {
    return {
      tone: 'yellow',
      label: 'schema',
      reasons: [`schemaVersion ${String(report.schemaVersion)} ≠ ${INSTALL_HYGIENE_SCHEMA}`],
    };
  }
  /** @type {string[]} */
  const reasons = [];
  const cache = /** @type {Record<string, unknown>} */ (report.installCache || {});
  const npm = /** @type {Record<string, unknown>} */ (report.npmInstall || {});
  const verify = /** @type {Record<string, unknown>} */ (report.installVerify || {});

  if (cache.wouldPrune === true) reasons.push('cache over prune threshold');
  if (npm.ok === false) reasons.push('npm-install policy violations');
  if (verify.ok === false) reasons.push('install:verify failed');
  if (report.ok === false && reasons.length === 0) reasons.push('report.ok=false');

  if (reasons.length === 0 && report.ok === true) {
    return { tone: 'green', label: 'healthy', reasons: [] };
  }
  if (verify.ok === false || npm.ok === false) {
    return { tone: 'red', label: 'fail', reasons };
  }
  return { tone: 'yellow', label: 'attention', reasons };
}

/**
 * @param {Record<string, unknown>|null|undefined} report
 * @returns {{ k: string, v: string, bad?: boolean }[]}
 */
export function buildStatRows(report) {
  if (!report || report.kind !== 'install-hygiene') return [];
  const cache = /** @type {Record<string, unknown>} */ (report.installCache || {});
  const npm = /** @type {Record<string, unknown>} */ (report.npmInstall || {});
  const verify = /** @type {Record<string, unknown>} */ (report.installVerify || {});
  const violations = Array.isArray(npm.violations) ? npm.violations.length : 0;
  const failed = typeof verify.failed === 'number' ? verify.failed : 0;
  return [
    {
      k: 'overall',
      v: report.ok === true ? 'ok' : 'attention',
      bad: report.ok !== true,
    },
    {
      k: 'cache size',
      v: String(cache.sizeHuman || '—'),
      bad: cache.wouldPrune === true,
    },
    {
      k: 'would prune',
      v: cache.wouldPrune === true ? 'yes' : cache.wouldPrune === false ? 'no' : '—',
      bad: cache.wouldPrune === true,
    },
    {
      k: 'npm install',
      v: npm.ok === true ? `clean (${violations})` : npm.ok === false ? `${violations} hit` : '—',
      bad: npm.ok === false,
    },
    {
      k: 'install:verify',
      v: verify.ok === true ? `pass (${failed} fail)` : verify.ok === false ? `${failed} fail` : '—',
      bad: verify.ok === false,
    },
    {
      k: 'bun',
      v: String(report.bunVersion || '—'),
    },
  ];
}

/**
 * @param {Record<string, unknown>|null|undefined} report
 * @returns {string} HTML table body rows
 */
export function renderVerifyCheckRows(report) {
  const verify = /** @type {Record<string, unknown>} */ (report?.installVerify || {});
  const checks = Array.isArray(verify.checks) ? verify.checks : [];
  if (!checks.length) {
    return '<tr><td colspan="3" class="dim">No install:verify checks in bake</td></tr>';
  }
  return checks
    .map(c => {
      const row = /** @type {Record<string, unknown>} */ (c || {});
      const ok = row.ok === true;
      return `<tr class="${ok ? '' : 'fail'}">
        <td>${ok ? '✓' : '✗'}</td>
        <td>${esc(row.label)}</td>
        <td class="dim">${esc(row.detail)}</td>
      </tr>`;
    })
    .join('');
}

/**
 * @param {Record<string, unknown>|null|undefined} report
 */
export function renderInstallHygieneReport(report) {
  const toneEl = document.getElementById('ih-tone');
  const meta = document.getElementById('ih-meta');
  const stats = document.getElementById('ih-stats');
  const cacheBody = document.getElementById('ih-cache-body');
  const verifyBody = document.getElementById('ih-verify-body');
  const npmBody = document.getElementById('ih-npm-body');
  const reasonsEl = document.getElementById('ih-reasons');
  if (!toneEl) return;

  const { tone, label, reasons } = toneFromReport(report);
  toneEl.textContent = label;
  toneEl.className = `doc-badge ${tone === 'missing' ? 'yellow' : tone}`;

  if (!report || report.kind !== 'install-hygiene') {
    if (meta) {
      meta.textContent =
        'No install-hygiene bake — run: bun run bake:install-hygiene · or ops:snapshot';
    }
    if (stats) stats.innerHTML = '';
    if (cacheBody) {
      cacheBody.innerHTML = '<tr><td colspan="2" class="dim">Missing report</td></tr>';
    }
    if (verifyBody) {
      verifyBody.innerHTML =
        '<tr><td colspan="3" class="dim">Missing /registry/install-hygiene-report.json</td></tr>';
    }
    if (npmBody) npmBody.innerHTML = '<p class="dim">—</p>';
    if (reasonsEl) reasonsEl.textContent = '';
    return;
  }

  if (meta) {
    const rev =
      typeof report.bunRevision === 'string' ? report.bunRevision.slice(0, 8) : '';
    meta.textContent = `generated ${ageLabel(/** @type {string} */ (report.generatedAt))} · bun ${String(report.bunVersion || '?')}${rev ? ` (${rev})` : ''} · bake:install-hygiene`;
  }

  if (reasonsEl) {
    reasonsEl.textContent = reasons.length ? `Attention: ${reasons.join(' · ')}` : '';
  }

  if (stats) {
    stats.innerHTML = buildStatRows(report)
      .map(
        row =>
          `<div class="doc-stat${row.bad ? ' bad' : ''}"><div class="k">${esc(row.k)}</div><div class="v">${esc(row.v)}</div></div>`
      )
      .join('');
  }

  const cache = /** @type {Record<string, unknown>} */ (report.installCache || {});
  if (cacheBody) {
    const rows = [
      ['available', String(cache.available ?? '—')],
      ['size', String(cache.sizeHuman ?? '—')],
      ['threshold', String(cache.thresholdHuman ?? '—')],
      ['would prune', String(cache.wouldPrune ?? '—')],
      ['prune reason', String(cache.pruneReason ?? '—')],
      ['cache dir', String(cache.cacheDir ?? '—')],
      ['bun pm cache path', String(cache.bunPmCachePath ?? '—')],
      ['pm cache mismatch', String(cache.bunPmCacheMismatch ?? '—')],
      ['collected', String(cache.collectedAt ?? '—')],
    ];
    cacheBody.innerHTML = rows
      .map(
        ([k, v]) =>
          `<tr class="${k === 'would prune' && cache.wouldPrune === true ? 'fail' : ''}"><td>${esc(k)}</td><td><code>${esc(v)}</code></td></tr>`
      )
      .join('');
  }

  if (verifyBody) verifyBody.innerHTML = renderVerifyCheckRows(report);

  if (npmBody) {
    const npm = /** @type {Record<string, unknown>} */ (report.npmInstall || {});
    const violations = Array.isArray(npm.violations) ? npm.violations : [];
    const allowed = Array.isArray(npm.allowedPaths) ? npm.allowedPaths : [];
    if (violations.length) {
      npmBody.innerHTML = `<p class="dim">Violations (${violations.length})</p><ul>${violations
        .slice(0, 40)
        .map(v => `<li><code>${esc(typeof v === 'string' ? v : JSON.stringify(v))}</code></li>`)
        .join('')}</ul>`;
    } else {
      npmBody.innerHTML = `<p class="dim">No production-path npm/yarn/pnpm install hits · allowlist ${allowed.length} path(s)</p>
        <ul class="dim">${allowed.map(p => `<li><code>${esc(p)}</code></li>`).join('')}</ul>`;
    }
  }
}

async function load() {
  const r = await fetchJsonResult(INSTALL_HYGIENE_SOURCE);
  renderInstallHygieneReport(r.ok ? /** @type {Record<string, unknown>} */ (r.data) : null);
}

if (typeof document !== 'undefined') {
  bindCopyButtons(document);
  void load();
}
