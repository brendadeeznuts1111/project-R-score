/**
 * Console format board — reads /registry/console-format-state.json (bun run console-format:bake).
 * @see lib/console-depth.ts · scripts/lint-console-format.ts
 */
import { bindCopyButtons } from '../copy-cli.js';
import { fetchJsonResult } from '../fetch-json.js';

const STATE_URL = '/registry/console-format-state.json';

/** @type {any} */
let state = null;
let query = '';
let patternFilter = '';
let loading = false;

const $ = id => document.getElementById(id);

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ageLabel(iso) {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const mins = Math.round((Date.now() - t) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function repoUrl(p) {
  return `https://github.com/brendadeeznuts1111/project-R-score/blob/main/${encodeURI(p)}`;
}

function parseHash(hash = location.hash) {
  const params = new URLSearchParams(String(hash).replace(/^#/, ''));
  return {
    q: params.get('q') || '',
    pattern: params.get('pattern') || '',
  };
}

function writeHash() {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (patternFilter) params.set('pattern', patternFilter);
  const fragment = params.toString();
  history.replaceState(
    null,
    '',
    `${location.pathname}${location.search}${fragment ? `#${fragment}` : ''}`
  );
}

function applyHash(hash = location.hash) {
  const h = parseHash(hash);
  query = h.q;
  patternFilter = h.pattern;
  syncControls();
}

function syncControls() {
  const qEl = $('cf-q');
  const pat = $('cf-pattern');
  const clear = $('cf-clear');
  if (qEl && qEl.value !== query) qEl.value = query;
  if (pat) pat.value = patternFilter;
  if (clear) clear.disabled = !(query || patternFilter);
}

function hasActiveFilters() {
  return Boolean(query || patternFilter);
}

function fillSelect(el, values, allLabel) {
  if (!el) return;
  const cur = el.value;
  const opts = [`<option value="">${esc(allLabel)}</option>`].concat(
    [...values].sort().map(v => `<option value="${esc(v)}">${esc(v)}</option>`)
  );
  el.innerHTML = opts.join('');
  if ([...values].includes(cur)) el.value = cur;
}

function showSkeletons() {
  const stats = $('cf-stats');
  if (stats) {
    stats.innerHTML = Array.from({ length: 4 }, () => `<div class="portal-skeleton"></div>`).join('');
  }
  const gate = $('cf-gate');
  if (gate) {
    gate.className = 'portal-gate';
    gate.innerHTML = '<span class="dot" aria-hidden="true"></span>…';
  }
  const meta = $('cf-meta');
  if (meta) meta.textContent = 'loading…';
  const err = $('cf-error');
  if (err) {
    err.hidden = true;
    err.innerHTML = '';
  }
}

function showMissingBake(msg = '') {
  const gate = $('cf-gate');
  if (gate) {
    gate.className = 'portal-gate bad';
    gate.innerHTML = '<span class="dot" aria-hidden="true"></span>missing';
  }
  const meta = $('cf-meta');
  if (meta) meta.textContent = 'bake unavailable';
  const stats = $('cf-stats');
  if (stats) stats.innerHTML = '';

  const err = $('cf-error');
  if (err) {
    err.hidden = false;
    err.innerHTML = `<div class="portal-error" role="alert">
      <h3>Console format bake unavailable</h3>
      <p>Could not load <code>/registry/console-format-state.json</code>. Run the bake locally or retry after deploy.</p>
      ${msg ? `<p><code>${esc(msg)}</code></p>` : ''}
      <div class="portal-error-actions">
        <button type="button" class="portal-clear" id="cf-retry">Retry</button>
        <a class="portal-clear" href="/registry/console-format-state.json" style="display:inline-flex;align-items:center;text-decoration:none">Open JSON</a>
      </div>
      <p class="dim" style="margin-top:10px;margin-bottom:0">Local fix: <code data-copy>bun run console-format:bake</code> · gate <code data-copy>bun run check:console-format</code></p>
    </div>`;
    bindCopyButtons(err);
    $('cf-retry')?.addEventListener('click', () => void load());
  }

  $('cf-patterns').innerHTML =
    '<tr><td colspan="4" class="dim">Missing bake — use Retry above or run <code>bun run console-format:bake</code></td></tr>';
  $('cf-files').innerHTML = '<tr><td colspan="3" class="dim">—</td></tr>';
  $('cf-links').innerHTML = '<tr><td colspan="2" class="dim">—</td></tr>';
  $('cf-files-count').textContent = '0 shown';
}

function renderHero() {
  const gate = $('cf-gate');
  const meta = $('cf-meta');
  if (!gate || !state) return;

  const ok = state.gate === 'pass';
  gate.className = `portal-gate ${ok ? 'pass' : 'fail'}`;
  gate.innerHTML = `<span class="dot" aria-hidden="true"></span>${esc(state.gate ?? 'unset')}`;

  if (meta) {
    meta.textContent = `baked ${ageLabel(state.bakedAt)} · ${state.current?.total ?? 0} hits · Δ ${state.deltaVsBaseline ?? 0} vs baseline · schema v${state.schemaVersion ?? '?'}`;
  }

  const err = $('cf-error');
  if (err) {
    err.hidden = true;
    err.innerHTML = '';
  }
}

function renderStats() {
  const stats = $('cf-stats');
  if (!stats || !state) return;

  const ok = state.gate === 'pass';
  const delta = state.deltaVsBaseline ?? 0;
  const total = state.current?.total ?? 0;

  /** @type {{ label: string, value: string, hint: string, cls: string, filter: { kind: string, value: string } | null }[]} */
  const items = [
    {
      label: 'Gate',
      value: state.gate ?? 'unset',
      hint: ok ? 'ratchet pass' : 'see hits below',
      cls: ok ? 'ok' : 'bad',
      filter: null,
    },
    {
      label: 'Total hits',
      value: String(total),
      hint: 'current scan',
      cls: total > (state.baseline?.total ?? 0) ? 'bad' : 'ok',
      filter: null,
    },
    {
      label: 'Δ baseline',
      value: delta > 0 ? `+${delta}` : String(delta),
      hint: 'ratchet may only go down',
      cls: delta > 0 ? 'bad' : 'ok',
      filter: null,
    },
  ];

  for (const p of state.patterns ?? []) {
    const cur = state.current?.byPattern?.[p.id] ?? 0;
    if (cur > 0 || patternFilter === p.id) {
      items.push({
        label: p.id,
        value: String(cur),
        hint: 'filter pattern',
        cls: cur > (state.baseline?.byPattern?.[p.id] ?? cur) ? 'bad' : cur ? 'warn' : 'muted',
        filter: { kind: 'pattern', value: p.id },
      });
    }
  }

  stats.innerHTML = items
    .map(item => {
      const active = item.filter?.kind === 'pattern' && patternFilter === item.filter.value;
      const disabled = item.filter == null ? ' disabled' : '';
      const activeCls = active ? ' active' : '';
      const dataAttr =
        item.filter?.kind === 'pattern'
          ? ` data-pattern-filter="${esc(item.filter.value)}"`
          : '';
      return (
        `<button type="button" class="portal-stat ${item.cls}${activeCls}"${disabled}${dataAttr}>` +
        `<span class="k">${esc(item.label)}</span>` +
        `<span class="v">${esc(item.value)}</span>` +
        `<span class="hint">${esc(item.hint)}</span>` +
        `</button>`
      );
    })
    .join('');

  for (const btn of stats.querySelectorAll('[data-pattern-filter]')) {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-pattern-filter') ?? '';
      patternFilter = patternFilter === next ? '' : next;
      syncControls();
      writeHash();
      renderStats();
      renderPatterns();
      renderFiles();
    });
  }
}

function renderFilterOptions() {
  fillSelect(
    $('cf-pattern'),
    new Set((state?.patterns ?? []).map(p => p.id).filter(Boolean)),
    'all patterns'
  );
}

function renderPatterns() {
  const body = $('cf-patterns');
  if (!body || !state) return;

  const rows = (state.patterns ?? []).filter(p => {
    if (patternFilter && p.id !== patternFilter) return false;
    return true;
  });

  body.innerHTML = rows.length
    ? rows
        .map(p => {
          const cur = state.current?.byPattern?.[p.id] ?? 0;
          const base = state.baseline?.byPattern?.[p.id];
          const rowCls = cur > (base ?? cur) ? 'row-bad' : cur > 0 ? 'row-warn' : 'row-ok';
          return `<tr class="${rowCls}">
        <td class="mono">${esc(p.id)}</td>
        <td class="mono">${cur}</td>
        <td class="mono">${base == null ? '—' : base}</td>
        <td class="dim">${esc(p.rule)}</td>
      </tr>`;
        })
        .join('')
    : '<tr><td colspan="4" class="dim">No patterns in bake</td></tr>';
}

function renderFiles() {
  const body = $('cf-files');
  const count = $('cf-files-count');
  if (!body || !state) return;

  let rows = state.topFiles ?? [];
  const q = query.toLowerCase().trim();
  if (q) rows = rows.filter(f => f.file.toLowerCase().includes(q));

  if (count) count.textContent = `${rows.length} shown`;

  body.innerHTML = rows.length
    ? rows
        .map(f => {
          const over = f.hits > (f.baseline ?? 0);
          const rowCls = over ? 'row-bad' : 'row-ok';
          return `<tr class="${rowCls}">
        <td class="mono">${esc(f.file)}</td>
        <td class="mono">${f.hits}</td>
        <td class="mono">${f.baseline ?? '—'}</td>
      </tr>`;
        })
        .join('')
    : `<tr><td colspan="3" class="dim">${hasActiveFilters() ? 'No files match filters' : 'No files in bake'}</td></tr>`;
}

function renderLinks() {
  const body = $('cf-links');
  if (!body || !state) return;

  body.innerHTML = [
    ['state', '/registry/console-format-state.json', '/registry/console-format-state.json'],
    ...Object.entries(state.links ?? {}).map(([k, p]) => [k, p, repoUrl(p)]),
  ]
    .map(
      ([k, p, href]) =>
        `<tr><td>${esc(k)}</td><td class="mono"><a href="${esc(href)}"${href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(p)}</a></td></tr>`
    )
    .join('');
}

function renderAll() {
  if (!state || state.kind !== 'console-format-state') {
    showMissingBake();
    return;
  }
  renderHero();
  renderStats();
  renderFilterOptions();
  syncControls();
  renderPatterns();
  renderFiles();
  renderLinks();
}

function wireFilters() {
  $('cf-q')?.addEventListener('input', () => {
    query = ($('cf-q')?.value ?? '').trim();
    writeHash();
    syncControls();
    renderFiles();
  });
  $('cf-pattern')?.addEventListener('change', () => {
    patternFilter = $('cf-pattern')?.value ?? '';
    writeHash();
    syncControls();
    renderStats();
    renderPatterns();
    renderFiles();
  });
  $('cf-clear')?.addEventListener('click', () => {
    query = '';
    patternFilter = '';
    syncControls();
    writeHash();
    renderStats();
    renderPatterns();
    renderFiles();
  });

  window.addEventListener('hashchange', () => {
    applyHash();
    if (!state) return;
    renderStats();
    renderPatterns();
    renderFiles();
  });
}

async function load() {
  if (loading) return;
  loading = true;
  showSkeletons();
  try {
    const res = await fetchJsonResult(STATE_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(res.error || `HTTP ${res.status ?? 'error'}`);
    state = res.data;
    applyHash();
    renderAll();
  } catch (e) {
    state = null;
    const msg = e instanceof Error ? e.message : String(e);
    showMissingBake(msg);
  } finally {
    loading = false;
  }
}

function pollIntervalMs() {
  const meta = document.querySelector('meta[name="portal-poll-ms"]');
  const n = Number(meta?.content || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

bindCopyButtons(document);
wireFilters();
applyHash();
void load();

const pollMs = pollIntervalMs();
if (pollMs) {
  setInterval(() => {
    if (document.visibilityState === 'visible') void load();
  }, pollMs);
}
