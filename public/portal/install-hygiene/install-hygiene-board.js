/**
 * Install hygiene board — reads /registry/install-hygiene-report.json.
 * Color code: green = ok · yellow = attention · red = fail · dim = neutral/missing
 *
 * @see docs/UNIFIED.md
 * @see lib/monitoring/install-hygiene-slice.ts
 * @see docs/harness/tenants/public-plane.md
 */
import { bindCopyButtons } from '../copy-cli.js';
import { fetchJsonResult } from '../fetch-json.js';

export const INSTALL_HYGIENE_SOURCE = '/registry/install-hygiene-report.json';
export const INSTALL_HYGIENE_SCHEMA = 1;
/** DOM id for offline bake embed (vault/failures pattern). */
export const INSTALL_HYGIENE_EMBED_ID = 'install-hygiene-embed';

/** @typedef {'green'|'yellow'|'red'|'neutral'|'missing'} Tone */

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
 * @param {Tone} tone
 * @returns {string} CSS class fragment (green|yellow|red|neutral)
 */
export function toneClass(tone) {
  if (tone === 'missing') return 'yellow';
  if (tone === 'green' || tone === 'yellow' || tone === 'red' || tone === 'neutral') return tone;
  return 'neutral';
}

/**
 * Status chip HTML (colored pill).
 * @param {Tone} tone
 * @param {string} text
 */
export function statusChip(tone, text) {
  const cls = toneClass(tone);
  return `<span class="ih-chip ih-chip--${cls}" data-tone="${esc(cls)}">${esc(text)}</span>`;
}

/**
 * Board tone from bake: green | yellow | red | missing
 * @param {Record<string, unknown>|null|undefined} report
 * @returns {{ tone: Tone, label: string, reasons: string[] }}
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
 * @returns {{ k: string, v: string, tone: Tone }[]}
 */
export function buildStatRows(report) {
  if (!report || report.kind !== 'install-hygiene') return [];
  const cache = /** @type {Record<string, unknown>} */ (report.installCache || {});
  const npm = /** @type {Record<string, unknown>} */ (report.npmInstall || {});
  const verify = /** @type {Record<string, unknown>} */ (report.installVerify || {});
  const violations = Array.isArray(npm.violations) ? npm.violations.length : 0;
  const failed = typeof verify.failed === 'number' ? verify.failed : 0;

  /** @type {Tone} */
  let overallTone = 'neutral';
  if (report.ok === true) overallTone = 'green';
  else if (verify.ok === false || npm.ok === false) overallTone = 'red';
  else overallTone = 'yellow';

  /** @type {Tone} */
  const pruneTone =
    cache.wouldPrune === true ? 'yellow' : cache.wouldPrune === false ? 'green' : 'neutral';

  return [
    {
      k: 'overall',
      v: report.ok === true ? 'ok' : overallTone === 'red' ? 'fail' : 'attention',
      tone: overallTone,
    },
    {
      k: 'cache size',
      v: String(cache.sizeHuman || '—'),
      tone: pruneTone === 'yellow' ? 'yellow' : 'neutral',
    },
    {
      k: 'would prune',
      v: cache.wouldPrune === true ? 'yes' : cache.wouldPrune === false ? 'no' : '—',
      tone: pruneTone,
    },
    {
      k: 'npm install',
      v: npm.ok === true ? `clean (${violations})` : npm.ok === false ? `${violations} hit` : '—',
      tone: npm.ok === true ? 'green' : npm.ok === false ? 'red' : 'neutral',
    },
    {
      k: 'install:verify',
      v: verify.ok === true ? `pass (${failed} fail)` : verify.ok === false ? `${failed} fail` : '—',
      tone: verify.ok === true ? 'green' : verify.ok === false ? 'red' : 'neutral',
    },
    {
      k: 'bun',
      v: String(report.bunVersion || '—'),
      tone: 'neutral',
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
      const tone = ok ? 'green' : 'red';
      return `<tr class="ih-row--${tone}" data-tone="${tone}">
        <td>${statusChip(tone, ok ? 'pass' : 'fail')}</td>
        <td>${esc(row.label)}</td>
        <td class="dim">${esc(row.detail)}</td>
      </tr>`;
    })
    .join('');
}

/**
 * Cache table rows with per-field tone (green / yellow / red / neutral).
 * @param {Record<string, unknown>} cache
 */
export function renderCacheRowsSimple(cache) {
  /** @type {{ k: string, v: string, tone: Tone }[]} */
  const rows = [
    {
      k: 'available',
      v: String(cache.available ?? '—'),
      tone: cache.available === true ? 'green' : cache.available === false ? 'red' : 'neutral',
    },
    {
      k: 'size',
      v: String(cache.sizeHuman ?? '—'),
      tone: cache.wouldPrune === true ? 'yellow' : 'neutral',
    },
    { k: 'threshold', v: String(cache.thresholdHuman ?? '—'), tone: 'neutral' },
    {
      k: 'would prune',
      v: String(cache.wouldPrune ?? '—'),
      tone: cache.wouldPrune === true ? 'yellow' : cache.wouldPrune === false ? 'green' : 'neutral',
    },
    {
      k: 'prune reason',
      v: String(cache.pruneReason ?? '—'),
      tone: cache.wouldPrune === true ? 'yellow' : 'neutral',
    },
    { k: 'cache dir', v: String(cache.cacheDir ?? '—'), tone: 'neutral' },
    { k: 'bun pm cache path', v: String(cache.bunPmCachePath ?? '—'), tone: 'neutral' },
    {
      k: 'pm cache mismatch',
      v: String(cache.bunPmCacheMismatch ?? 'none'),
      tone: cache.bunPmCacheMismatch ? 'yellow' : 'green',
    },
    { k: 'collected', v: String(cache.collectedAt ?? '—'), tone: 'neutral' },
  ];
  return rows
    .map(r => {
      const val =
        r.tone === 'neutral'
          ? `<code>${esc(r.v)}</code>`
          : statusChip(r.tone, r.v.length > 72 ? `${r.v.slice(0, 69)}…` : r.v);
      return `<tr class="ih-row--${r.tone}" data-tone="${r.tone}"><td>${esc(r.k)}</td><td>${val}</td></tr>`;
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
  const shell = document.getElementById('ih-shell');
  const cachePanel = document.getElementById('ih-panel-cache');
  const verifyPanel = document.getElementById('ih-panel-verify');
  const npmPanel = document.getElementById('ih-panel-npm');
  if (!toneEl) return;

  const { tone, label, reasons } = toneFromReport(report);
  const badgeTone = toneClass(tone);
  toneEl.textContent = label;
  toneEl.className = `doc-badge ${badgeTone}`;
  toneEl.dataset.tone = badgeTone;
  if (shell) {
    shell.dataset.tone = badgeTone;
    shell.className = `doc-wrap ih-shell ih-shell--${badgeTone}`;
  }

  if (!report || report.kind !== 'install-hygiene') {
    if (meta) {
      meta.textContent =
        'No offline embed / registry bake — run: bun run bake:install-hygiene (writes JSON + HTML embed)';
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
    if (reasonsEl) {
      reasonsEl.textContent = '';
      reasonsEl.className = 'ih-reasons';
      reasonsEl.hidden = true;
    }
    return;
  }

  if (meta) {
    const rev = typeof report.bunRevision === 'string' ? report.bunRevision.slice(0, 8) : '';
    meta.innerHTML = `generated ${esc(ageLabel(/** @type {string} */ (report.generatedAt)))} · bun <span class="ih-chip ih-chip--neutral">${esc(String(report.bunVersion || '?'))}${rev ? ` · ${esc(rev)}` : ''}</span> · bake:install-hygiene`;
  }

  if (reasonsEl) {
    if (reasons.length) {
      reasonsEl.hidden = false;
      reasonsEl.className = `ih-reasons ih-reasons--${badgeTone}`;
      reasonsEl.innerHTML = `${statusChip(badgeTone === 'red' ? 'red' : 'yellow', badgeTone === 'red' ? 'fail' : 'attention')} ${esc(reasons.join(' · '))}`;
    } else {
      reasonsEl.hidden = false;
      reasonsEl.className = 'ih-reasons ih-reasons--green';
      reasonsEl.innerHTML = `${statusChip('green', 'ok')} All planes clean`;
    }
  }

  if (stats) {
    stats.innerHTML = buildStatRows(report)
      .map(
        row =>
          `<div class="doc-stat doc-stat--${row.tone}" data-tone="${row.tone}"><div class="k">${esc(row.k)}</div><div class="v">${esc(row.v)}</div></div>`
      )
      .join('');
  }

  const cache = /** @type {Record<string, unknown>} */ (report.installCache || {});
  if (cacheBody) cacheBody.innerHTML = renderCacheRowsSimple(cache);
  if (cachePanel) {
    cachePanel.dataset.tone = cache.wouldPrune === true ? 'yellow' : 'green';
    cachePanel.className = `doc-panel doc-panel--${cache.wouldPrune === true ? 'yellow' : 'green'}`;
  }

  if (verifyBody) verifyBody.innerHTML = renderVerifyCheckRows(report);
  const verify = /** @type {Record<string, unknown>} */ (report.installVerify || {});
  if (verifyPanel) {
    const vt = verify.ok === true ? 'green' : verify.ok === false ? 'red' : 'neutral';
    verifyPanel.dataset.tone = vt;
    verifyPanel.className = `doc-panel doc-panel--${vt}`;
  }

  if (npmBody) {
    const npm = /** @type {Record<string, unknown>} */ (report.npmInstall || {});
    const violations = Array.isArray(npm.violations) ? npm.violations : [];
    const allowed = Array.isArray(npm.allowedPaths) ? npm.allowedPaths : [];
    if (violations.length) {
      npmBody.innerHTML = `<p>${statusChip('red', `${violations.length} violation(s)`)}</p><ul class="ih-list--red">${violations
        .slice(0, 40)
        .map(v => `<li><code>${esc(typeof v === 'string' ? v : JSON.stringify(v))}</code></li>`)
        .join('')}</ul>`;
    } else {
      npmBody.innerHTML = `<p>${statusChip('green', 'clean')} No production-path npm/yarn/pnpm install hits · allowlist ${allowed.length} path(s)</p>
        <ul class="dim">${allowed.map(p => `<li><code>${esc(p)}</code></li>`).join('')}</ul>`;
    }
  }
  if (npmPanel) {
    const npm = /** @type {Record<string, unknown>} */ (report.npmInstall || {});
    const nt = npm.ok === true ? 'green' : npm.ok === false ? 'red' : 'neutral';
    npmPanel.dataset.tone = nt;
    npmPanel.className = `doc-panel doc-panel--${nt}`;
  }
}

/**
 * Offline-first: read baked embed from the page (no network).
 * @returns {Record<string, unknown>|null}
 */
export function readInstallHygieneEmbed(doc = typeof document !== 'undefined' ? document : null) {
  if (!doc) return null;
  const el = doc.getElementById(INSTALL_HYGIENE_EMBED_ID);
  if (!el) return null;
  const raw = (el.textContent || '').trim();
  if (!raw || raw === 'null' || raw === '{}') return null;
  try {
    const data = JSON.parse(raw);
    if (data && typeof data === 'object' && data.kind === 'install-hygiene') {
      return /** @type {Record<string, unknown>} */ (data);
    }
  } catch {
    /* ignore corrupt embed */
  }
  return null;
}

/**
 * Prefer offline embed; refresh from registry when fetch works (optional live).
 * @returns {Promise<Record<string, unknown>|null>}
 */
export async function loadInstallHygieneReport() {
  const embedded = readInstallHygieneEmbed();
  // Always render embed first so the board works with no network / broken static host.
  if (embedded) {
    // Non-blocking refresh when online
    void fetchJsonResult(INSTALL_HYGIENE_SOURCE).then(r => {
      if (r.ok && r.data && /** @type {Record<string, unknown>} */ (r.data).kind === 'install-hygiene') {
        const live = /** @type {Record<string, unknown>} */ (r.data);
        const embAt = Date.parse(String(embedded.generatedAt || ''));
        const liveAt = Date.parse(String(live.generatedAt || ''));
        if (!Number.isFinite(embAt) || (Number.isFinite(liveAt) && liveAt >= embAt)) {
          renderInstallHygieneReport(live);
        }
      }
    });
    return embedded;
  }
  const r = await fetchJsonResult(INSTALL_HYGIENE_SOURCE);
  if (r.ok && r.data) return /** @type {Record<string, unknown>} */ (r.data);
  return null;
}

async function load() {
  const report = await loadInstallHygieneReport();
  renderInstallHygieneReport(report);
}

if (typeof document !== 'undefined') {
  bindCopyButtons(document);
  void load();
}
