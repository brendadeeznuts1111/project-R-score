/**
 * Install hygiene board — embedded snapshot + optional live refresh of
 * /registry/install-hygiene-report.json via portal fetch-json (GET, timeout, Accept).
 * Status colors: green = passed · yellow = review · red = blocked · dim = information/missing
 *
 * Live refresh errors are non-fatal (embed wins). Debug live fetch:
 *   ?portal_fetch_debug=1  or  localStorage.PORTAL_FETCH_DEBUG=1
 * (Browser cannot use Bun's fetch `verbose: true` — Bun-only extension.)
 *
 * @see docs/UNIFIED.md
 * @see lib/monitoring/install-hygiene-slice.ts
 * @see docs/harness/tenants/public-plane.md
 * @see https://bun.com/docs/runtime/networking/fetch#request-options
 * @see https://bun.com/docs/runtime/networking/fetch#sending-an-http-request
 */
import { bindCopyButtons } from '../copy-cli.js';
import { fetchJsonResult, isPortalFetchDebug } from '../fetch-json.js';

export const INSTALL_HYGIENE_SOURCE = '/registry/install-hygiene-report.json';
export const INSTALL_HYGIENE_SCHEMA = 1;
/** DOM id for the baked report snapshot (vault/failures pattern). */
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
    return {
      tone: 'missing',
      label: 'missing',
      reasons: ['No install-hygiene report is available.'],
    };
  }
  if (report.schemaVersion !== INSTALL_HYGIENE_SCHEMA) {
    return {
      tone: 'yellow',
      label: 'review needed',
      reasons: [
        `Report schema ${String(report.schemaVersion)} does not match supported schema ${INSTALL_HYGIENE_SCHEMA}.`,
      ],
    };
  }
  /** @type {string[]} */
  const reasons = [];
  const cache = /** @type {Record<string, unknown>} */ (report.installCache || {});
  const npm = /** @type {Record<string, unknown>} */ (report.npmInstall || {});
  const verify = /** @type {Record<string, unknown>} */ (report.installVerify || {});

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

  if (reasons.length === 0 && report.ok === true) {
    return { tone: 'green', label: 'healthy', reasons: [] };
  }
  if (verify.ok === false || npm.ok === false) {
    return { tone: 'red', label: 'blocked', reasons };
  }
  return { tone: 'yellow', label: 'review needed', reasons };
}

/**
 * Plain-text summary for copy, no-script rendering, and page metadata.
 * @param {Record<string, unknown>|null|undefined} report
 * @returns {string}
 */
export function buildTextSummary(report) {
  if (!report || report.kind !== 'install-hygiene') {
    return 'install hygiene: missing report — run bun run bake:install-hygiene';
  }
  const { tone, label, reasons } = toneFromReport(report);
  const cache = /** @type {Record<string, unknown>} */ (report.installCache || {});
  const npm = /** @type {Record<string, unknown>} */ (report.npmInstall || {});
  const verify = /** @type {Record<string, unknown>} */ (report.installVerify || {});
  const lines = [
    `install hygiene: ${label}`,
    `generated: ${String(report.generatedAt || '—')}`,
    `Bun runtime: ${String(report.bunVersion || '—')}`,
    `cache usage: ${String(cache.sizeHuman || '—')}; cleanup threshold: ${String(cache.thresholdHuman || '—')}; cleanup recommended: ${cache.wouldPrune === true ? 'yes' : cache.wouldPrune === false ? 'no' : 'unknown'}`,
    `package-manager policy: ${npm.ok === true ? 'clean' : npm.ok === false ? 'failed' : 'unknown'}`,
    `installation verification: ${verify.ok === true ? 'passed' : verify.ok === false ? 'failed' : 'unknown'}`,
  ];
  if (reasons.length) lines.push(`reason: ${reasons.join(' ')}`);
  if (cache.bunPmCacheMismatch) {
    lines.push(`cache-path comparison: ${String(cache.bunPmCacheMismatch)}`);
  }
  return lines.join('\n');
}

/**
 * Operator actions (copy-CLI ready). Color-coded by urgency.
 * @param {Record<string, unknown>|null|undefined} report
 * @returns {{ title: string, cli: string, tone: Tone, why: string }[]}
 */
export function buildRecommendedActions(report) {
  /** @type {{ title: string, cli: string, tone: Tone, why: string }[]} */
  const actions = [
    {
      title: 'Refresh the report and embedded snapshot',
      cli: 'bun run bake:install-hygiene',
      tone: 'neutral',
      why: 'Updates the registry report and the page snapshot shown when live refresh is unavailable.',
    },
    {
      title: 'Run installation verification',
      cli: 'bun run install:verify --dry-run --json',
      tone: 'neutral',
      why: 'Runs the same non-destructive verification used to build this report.',
    },
  ];
  if (!report || report.kind !== 'install-hygiene') {
    actions[0].tone = 'yellow';
    return actions;
  }
  const cache = /** @type {Record<string, unknown>} */ (report.installCache || {});
  const npm = /** @type {Record<string, unknown>} */ (report.npmInstall || {});
  const verify = /** @type {Record<string, unknown>} */ (report.installVerify || {});

  if (cache.wouldPrune === true) {
    actions.push({
      title: 'Preview install-cache cleanup',
      cli: 'bun run install:cache:lifecycle',
      tone: 'yellow',
      why: String(cache.pruneReason || 'cache over BUN_CACHE_PRUNE_MAX_MB threshold'),
    });
    actions.push({
      title: 'Clean the install cache',
      cli: 'bun run install:cache:prune',
      tone: 'yellow',
      why: 'Deletes Bun install-cache entries only when the configured threshold is exceeded.',
    });
  }
  if (cache.bunPmCacheMismatch) {
    actions.push({
      title: "Verify Bun's reported cache path",
      cli: 'bun scripts/check-bun-pm-cache.ts',
      tone: 'yellow',
      why: String(cache.bunPmCacheMismatch),
    });
  }
  if (npm.ok === false) {
    actions.push({
      title: 'Review package-manager policy violations',
      cli: 'bun scripts/check-npm-install.ts',
      tone: 'red',
      why: 'Production paths must not invoke npm, Yarn, or pnpm install commands.',
    });
  }
  if (verify.ok === false) {
    actions.push({
      title: 'Investigate installation verification',
      cli: 'bun run install:verify',
      tone: 'red',
      why: 'Review and repair the failed install-policy, cache, or lockfile checks.',
    });
  }
  return actions;
}

/**
 * Cache fill ratio 0–1+ for meter (null if unknown).
 * @param {Record<string, unknown>|null|undefined} cache
 * @returns {{ ratio: number, pct: number, tone: Tone, label: string }|null}
 */
export function cacheMeterFromSlice(cache) {
  if (!cache || typeof cache !== 'object') return null;
  const size = typeof cache.sizeBytes === 'number' ? cache.sizeBytes : null;
  const thr = typeof cache.thresholdBytes === 'number' ? cache.thresholdBytes : null;
  if (size == null || thr == null || thr <= 0) return null;
  const ratio = size / thr;
  const pct = Math.round(ratio * 100);
  /** @type {Tone} */
  let tone = 'green';
  if (ratio > 1) tone = 'yellow';
  const label = `${cache.sizeHuman || '?'} / ${cache.thresholdHuman || '?'} (${pct}%)`;
  return { ratio, pct, tone, label };
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
      k: 'status',
      v: report.ok === true ? 'healthy' : overallTone === 'red' ? 'blocked' : 'review needed',
      tone: overallTone,
    },
    {
      k: 'cache usage',
      v: String(cache.sizeHuman || '—'),
      tone: pruneTone === 'yellow' ? 'yellow' : 'neutral',
    },
    {
      k: 'cleanup recommended',
      v: cache.wouldPrune === true ? 'yes' : cache.wouldPrune === false ? 'no' : '—',
      tone: pruneTone,
    },
    {
      k: 'package-manager policy',
      v:
        npm.ok === true
          ? `clean · ${violations} violations`
          : npm.ok === false
            ? `${violations} violations`
            : '—',
      tone: npm.ok === true ? 'green' : npm.ok === false ? 'red' : 'neutral',
    },
    {
      k: 'installation verification',
      v:
        verify.ok === true
          ? `passed · ${failed} failures`
          : verify.ok === false
            ? `${failed} failures`
            : '—',
      tone: verify.ok === true ? 'green' : verify.ok === false ? 'red' : 'neutral',
    },
    {
      k: 'Bun runtime',
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
    return '<tr><td colspan="3" class="dim">No installation-verification checks are included in this report.</td></tr>';
  }
  return checks
    .map(c => {
      const row = /** @type {Record<string, unknown>} */ (c || {});
      const ok = row.ok === true;
      const tone = ok ? 'green' : 'red';
      return `<tr class="ih-row--${tone}" data-tone="${tone}">
        <td>${statusChip(tone, ok ? 'passed' : 'failed')}</td>
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
      k: 'cache readable',
      v: cache.available === true ? 'yes' : cache.available === false ? 'no' : '—',
      tone: cache.available === true ? 'green' : cache.available === false ? 'red' : 'neutral',
    },
    {
      k: 'current usage',
      v: String(cache.sizeHuman ?? '—'),
      tone: cache.wouldPrune === true ? 'yellow' : 'neutral',
    },
    { k: 'cleanup threshold', v: String(cache.thresholdHuman ?? '—'), tone: 'neutral' },
    {
      k: 'cleanup recommended',
      v: cache.wouldPrune === true ? 'yes' : cache.wouldPrune === false ? 'no' : '—',
      tone: cache.wouldPrune === true ? 'yellow' : cache.wouldPrune === false ? 'green' : 'neutral',
    },
    {
      k: 'cleanup reason',
      v: String(cache.pruneReason ?? '—'),
      tone: cache.wouldPrune === true ? 'yellow' : 'neutral',
    },
    { k: 'configured cache directory', v: String(cache.cacheDir ?? '—'), tone: 'neutral' },
    { k: 'Bun-reported cache path', v: String(cache.bunPmCachePath ?? '—'), tone: 'neutral' },
    {
      k: 'cache-path comparison',
      v: String(cache.bunPmCacheMismatch ?? 'none'),
      tone: cache.bunPmCacheMismatch ? 'yellow' : 'green',
    },
    { k: 'measured at', v: String(cache.collectedAt ?? '—'), tone: 'neutral' },
  ];
  return rows
    .map(r => {
      const val = r.tone === 'neutral' ? `<code>${esc(r.v)}</code>` : statusChip(r.tone, r.v);
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
  const meterEl = document.getElementById('ih-cache-meter');
  const actionsEl = document.getElementById('ih-actions');
  const sourceEl = document.getElementById('ih-source');
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

  if (sourceEl && report && typeof report === 'object' && '_source' in report) {
    const src = String(report._source || 'unknown');
    const st = src === 'live' ? 'green' : src === 'embed' ? 'neutral' : 'yellow';
    sourceEl.innerHTML = statusChip(
      st,
      src === 'live' ? 'live registry' : src === 'embed' ? 'embedded snapshot' : src
    );
  } else if (sourceEl && report?.kind === 'install-hygiene') {
    sourceEl.innerHTML = statusChip('neutral', 'embedded snapshot');
  }

  if (!report || report.kind !== 'install-hygiene') {
    if (meta) {
      meta.textContent =
        'No embedded snapshot or registry report. Run bun run bake:install-hygiene to generate both.';
    }
    if (stats) stats.innerHTML = '';
    if (meterEl) meterEl.innerHTML = '';
    if (actionsEl) {
      actionsEl.innerHTML = renderActionsHtml(buildRecommendedActions(null));
      bindCopyButtons(document);
    }
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
    meta.innerHTML = `generated ${esc(ageLabel(/** @type {string} */ (report.generatedAt)))} · Bun <span class="ih-chip ih-chip--neutral">${esc(String(report.bunVersion || '?'))}${rev ? ` · ${esc(rev)}` : ''}</span> · bake:install-hygiene`;
  }

  const summaryPre = document.getElementById('ih-summary-text');
  if (summaryPre) summaryPre.textContent = buildTextSummary(report);

  const copySummary = document.getElementById('ih-copy-summary');
  if (copySummary && !copySummary.dataset.bound) {
    copySummary.dataset.bound = '1';
    copySummary.addEventListener('click', async () => {
      const text = buildTextSummary(
        readInstallHygieneEmbed() ||
          (await fetchJsonResult(INSTALL_HYGIENE_SOURCE).then(r =>
            r.ok ? /** @type {Record<string, unknown>} */ (r.data) : null
          ))
      );
      try {
        await navigator.clipboard.writeText(text);
        copySummary.textContent = 'copied';
        setTimeout(() => {
          copySummary.textContent = 'Copy summary';
        }, 1200);
      } catch {
        copySummary.textContent = 'copy failed';
      }
    });
  }

  if (reasonsEl) {
    if (reasons.length) {
      reasonsEl.hidden = false;
      reasonsEl.className = `ih-reasons ih-reasons--${badgeTone}`;
      reasonsEl.innerHTML = `${statusChip(
        badgeTone === 'red' ? 'red' : 'yellow',
        badgeTone === 'red' ? 'blocked' : 'review needed'
      )} ${esc(reasons.join(' · '))}`;
    } else {
      reasonsEl.hidden = false;
      reasonsEl.className = 'ih-reasons ih-reasons--green';
      reasonsEl.innerHTML = `${statusChip('green', 'passed')} All install checks passed.`;
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
  if (meterEl) {
    const meter = cacheMeterFromSlice(cache);
    if (meter) {
      const fill = Math.min(meter.ratio, 1.5) / 1.5; // cap bar at 150% scale
      const width = Math.min(100, Math.round(fill * 100));
      meterEl.innerHTML = `<div class="ih-meter ih-meter--${meter.tone}" title="${esc(meter.label)}">
        <div class="ih-meter-track"><div class="ih-meter-fill" style="width:${width}%"></div>
        <div class="ih-meter-mark" style="left:${Math.min(100, Math.round((1 / 1.5) * 100))}%" title="threshold"></div></div>
        <div class="ih-meter-label">${esc(meter.label)}</div>
      </div>`;
    } else {
      meterEl.innerHTML = '';
    }
  }
  if (cachePanel) {
    cachePanel.dataset.tone = cache.wouldPrune === true ? 'yellow' : 'green';
    cachePanel.className = `doc-panel doc-panel--${cache.wouldPrune === true ? 'yellow' : 'green'}`;
  }

  if (actionsEl) {
    actionsEl.innerHTML = renderActionsHtml(buildRecommendedActions(report));
    bindCopyButtons(document);
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
      npmBody.innerHTML = `<p>${statusChip('green', 'clean')} No disallowed npm, Yarn, or pnpm install commands were found in production paths.</p>
        <p class="dim">${allowed.length} documented exception path(s):</p>
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
 * @param {Record<string, unknown>} report
 * @param {'embed'|'live'} source
 */
function withSource(report, source) {
  return { ...report, _source: source };
}

/**
 * @param {import('../fetch-json.js').FetchJsonErr|object} r
 * @returns {string}
 */
export function formatLiveFetchStatus(r) {
  if (!r || r.ok) return '';
  const kind = /** @type {string} */ (r.kind || 'network');
  const detail = r.status != null ? `${kind} HTTP ${r.status}` : `${kind}: ${r.error || 'failed'}`;
  return `Live update failed (${detail}). Showing the embedded snapshot.`;
}

/**
 * Show request details only when portal fetch debugging is explicitly enabled.
 * @param {string[]} lines
 */
export function renderFetchDebugPanel(lines) {
  const el = document.getElementById('ih-fetch-debug');
  if (!el) return;
  if (!isPortalFetchDebug() || !lines.length) {
    el.hidden = true;
    el.textContent = '';
    return;
  }
  el.hidden = false;
  el.textContent = [
    'Portal fetch debug',
    `Source: ${INSTALL_HYGIENE_SOURCE}`,
    ...lines,
    'Browser requests do not support Bun fetch verbose:true.',
    'Docs: https://bun.com/docs/runtime/networking/fetch#request-options',
  ].join('\n');
}

/**
 * @param {object} r
 * @returns {string[]}
 */
export function describeFetchResultLines(r) {
  if (!r) return ['[portal-fetch] no result'];
  if (r.ok) {
    const data = /** @type {Record<string, unknown>} */ (r.data || {});
    return [
      `[portal-fetch] ${r.status ?? 200} OK ${r.contentType || ''}`.trim(),
      `[portal-fetch] kind=${String(data.kind || '?')} generatedAt=${String(data.generatedAt || '?')} ok=${String(data.ok)}`,
    ];
  }
  return [
    `[portal-fetch] ${r.kind || 'error'}${r.status != null ? ` HTTP ${r.status}` : ''}`,
    `[portal-fetch] ${r.error || 'failed'}`,
  ];
}

/**
 * Prefer the embedded snapshot; refresh from the registry when fetch works.
 * @returns {Promise<Record<string, unknown>|null>}
 */
export async function loadInstallHygieneReport() {
  const embedded = readInstallHygieneEmbed();
  const debugLines = [
    `[portal-fetch] GET ${INSTALL_HYGIENE_SOURCE}`,
    `[portal-fetch] embedded snapshot=${embedded ? 'available' : 'missing'}`,
  ];

  // Always render embed first so the board works with no network / broken static host.
  if (embedded) {
    // Non-blocking refresh when online (GET only · timeout · Accept: json)
    void fetchJsonResult(INSTALL_HYGIENE_SOURCE, { timeoutMs: 5000, method: 'GET' }).then(r => {
      const statusEl = document.getElementById('ih-fetch-status');
      const lines = [...debugLines, ...describeFetchResultLines(r)];
      if (
        r.ok &&
        r.data &&
        /** @type {Record<string, unknown>} */ (r.data).kind === 'install-hygiene'
      ) {
        const live = /** @type {Record<string, unknown>} */ (r.data);
        const embAt = Date.parse(String(embedded.generatedAt || ''));
        const liveAt = Date.parse(String(live.generatedAt || ''));
        if (!Number.isFinite(embAt) || (Number.isFinite(liveAt) && liveAt >= embAt)) {
          renderInstallHygieneReport(withSource(live, 'live'));
          if (statusEl) {
            if (isPortalFetchDebug()) {
              statusEl.hidden = false;
              statusEl.className = 'ih-fetch-status ih-fetch-status--ok';
              statusEl.textContent = 'Live update succeeded; the registry report is current.';
            } else {
              statusEl.hidden = true;
              statusEl.textContent = '';
            }
          }
          lines.push('[portal-fetch] applied live report');
          renderFetchDebugPanel(lines);
          return;
        }
        lines.push('[portal-fetch] kept the newer embedded snapshot');
        if (statusEl && isPortalFetchDebug()) {
          statusEl.hidden = false;
          statusEl.className = 'ih-fetch-status ih-fetch-status--ok';
          statusEl.textContent = 'The embedded snapshot is newer than the live registry report.';
        }
        renderFetchDebugPanel(lines);
        return;
      }
      if (statusEl && !r.ok) {
        statusEl.hidden = false;
        statusEl.className = 'ih-fetch-status ih-fetch-status--warn';
        statusEl.textContent = formatLiveFetchStatus(r);
      }
      renderFetchDebugPanel(lines);
    });
    renderFetchDebugPanel(
      debugLines.concat('[portal-fetch] showing the embedded snapshot while live update runs')
    );
    return withSource(embedded, 'embed');
  }
  const r = await fetchJsonResult(INSTALL_HYGIENE_SOURCE, { timeoutMs: 5000, method: 'GET' });
  const lines = [...debugLines, ...describeFetchResultLines(r)];
  if (
    r.ok &&
    r.data &&
    /** @type {Record<string, unknown>} */ (r.data).kind === 'install-hygiene'
  ) {
    renderFetchDebugPanel(
      lines.concat('[portal-fetch] applied live report; no snapshot available')
    );
    return withSource(/** @type {Record<string, unknown>} */ (r.data), 'live');
  }
  const statusEl = document.getElementById('ih-fetch-status');
  if (statusEl && !r.ok) {
    statusEl.hidden = false;
    statusEl.className = 'ih-fetch-status ih-fetch-status--warn';
    statusEl.textContent =
      formatLiveFetchStatus(r) || 'Live refresh failed and no embedded snapshot is available.';
  }
  renderFetchDebugPanel(lines);
  return null;
}

/**
 * @param {{ title: string, cli: string, tone: Tone, why: string }[]} actions
 */
export function renderActionsHtml(actions) {
  if (!actions.length) return '<p class="dim">No actions</p>';
  return `<ul class="ih-action-list">${actions
    .map(
      a => `<li class="ih-action ih-action--${a.tone}" data-tone="${a.tone}">
      <div class="ih-action-head">
        ${statusChip(
          a.tone,
          a.tone === 'neutral'
            ? 'optional'
            : a.tone === 'yellow'
              ? 'recommended'
              : a.tone === 'red'
                ? 'required'
                : 'complete'
        )}
        <strong>${esc(a.title)}</strong>
        <button type="button" class="copy-cli" data-cli="${esc(a.cli)}">copy</button>
      </div>
      <code class="ih-action-cli">${esc(a.cli)}</code>
      <p class="dim">${esc(a.why)}</p>
    </li>`
    )
    .join('')}</ul>`;
}

async function load() {
  const report = await loadInstallHygieneReport();
  renderInstallHygieneReport(report);
}

if (typeof document !== 'undefined') {
  bindCopyButtons(document);
  void load();
}
