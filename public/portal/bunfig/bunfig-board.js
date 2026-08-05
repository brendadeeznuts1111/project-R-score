/**
 * Bunfig board — reads /registry/bunfig-state.json (bun run bunfig:bake).
 * @see docs/UNIFIED.md
 */
import { bindCopyButtons } from '../copy-cli.js';
import { fetchJsonResult } from '../fetch-json.js';

const STATE_URL = '/registry/bunfig-state.json';

/** @type {any} */
let state = null;
let query = '';
let sourceFilter = '';
let driftFilter = '';
let planeFilter = '';
let loading = false;

const $ = id => document.getElementById(id);

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmt(v) {
  if (v == null) return '—';
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
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

function pill(s) {
  return `<span class="bf-pill ${esc(s)}">${esc(s)}</span>`;
}

function parseHash(hash = location.hash) {
  const params = new URLSearchParams(String(hash).replace(/^#/, ''));
  return {
    q: params.get('q') || '',
    source: params.get('source') || '',
    drift: params.get('drift') || '',
    plane: params.get('plane') || '',
  };
}

function writeHash() {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (sourceFilter) params.set('source', sourceFilter);
  if (driftFilter) params.set('drift', driftFilter);
  if (planeFilter) params.set('plane', planeFilter);
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
  sourceFilter = h.source;
  driftFilter = h.drift;
  planeFilter = h.plane;
  syncControls();
}

function syncControls() {
  const qEl = $('bf-q');
  const src = $('bf-source');
  const drift = $('bf-drift');
  const plane = $('bf-plane');
  const clear = $('bf-clear');
  if (qEl && qEl.value !== query) qEl.value = query;
  if (src) src.value = sourceFilter;
  if (drift) drift.value = driftFilter;
  if (plane) plane.value = planeFilter;
  if (clear) {
    clear.disabled = !(query || sourceFilter || driftFilter || planeFilter);
  }
}

function hasActiveFilters() {
  return Boolean(query || sourceFilter || driftFilter || planeFilter);
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

function filteredKeys() {
  const q = query.toLowerCase().trim();
  return (state?.keys ?? []).filter(k => {
    if (sourceFilter && k.source !== sourceFilter) return false;
    if (driftFilter === 'yes' && !k.drift) return false;
    if (driftFilter === 'no' && k.drift) return false;
    if (!q) return true;
    const hay = `${k.key} ${k.effective} ${k.source} ${k.owner}`.toLowerCase();
    return hay.includes(q);
  });
}

function filteredScopes() {
  const q = query.toLowerCase().trim();
  return (state?.scopes ?? []).filter(s => {
    if (planeFilter && s.plane !== planeFilter) return false;
    if (!q) return true;
    const hay = `${s.scope} ${s.url} ${s.plane} ${(s.usedBy ?? []).join(' ')} ${s.tokenEnv}`.toLowerCase();
    return hay.includes(q);
  });
}

function gateFailCount() {
  return Object.values(state?.gates ?? {}).filter(g => !g.ok).length;
}

function showSkeletons() {
  const stats = $('bf-stats');
  if (stats) {
    stats.innerHTML = Array.from({ length: 4 }, () => `<div class="portal-skeleton"></div>`).join('');
  }
  const gate = $('bf-gate');
  if (gate) {
    gate.className = 'portal-gate';
    gate.innerHTML = '<span class="dot" aria-hidden="true"></span>…';
  }
  const meta = $('bf-meta');
  if (meta) meta.textContent = 'loading…';
  const err = $('bf-error');
  if (err) {
    err.hidden = true;
    err.innerHTML = '';
  }
}

function showMissingBake(msg = '') {
  const gate = $('bf-gate');
  if (gate) {
    gate.className = 'portal-gate bad';
    gate.innerHTML = '<span class="dot" aria-hidden="true"></span>missing';
  }
  const meta = $('bf-meta');
  if (meta) meta.textContent = 'bake unavailable';
  const stats = $('bf-stats');
  if (stats) stats.innerHTML = '';

  const err = $('bf-error');
  if (err) {
    err.hidden = false;
    err.innerHTML = `<div class="portal-error" role="alert">
      <h3>Bunfig bake unavailable</h3>
      <p>Could not load <code>/registry/bunfig-state.json</code>. Run the bake locally or retry after deploy.</p>
      ${msg ? `<p><code>${esc(msg)}</code></p>` : ''}
      <div class="portal-error-actions">
        <button type="button" class="portal-clear" id="bf-retry">Retry</button>
        <a class="portal-clear" href="/registry/bunfig-state.json" style="display:inline-flex;align-items:center;text-decoration:none">Open JSON</a>
      </div>
      <p class="dim" style="margin-top:10px;margin-bottom:0">Local fix: <code data-copy>bun run bunfig:bake</code> · gate <code data-copy>portal-cli bunfig check</code></p>
    </div>`;
    bindCopyButtons(err);
    $('bf-retry')?.addEventListener('click', () => void load());
  }

  $('bf-keys').innerHTML =
    '<tr><td colspan="5" class="dim">Missing bake — use Retry above or run <code>bun run bunfig:bake</code></td></tr>';
  $('bf-scopes').innerHTML = '<tr><td colspan="5" class="dim">—</td></tr>';
  $('bf-gates').innerHTML = '<tr><td colspan="3" class="dim">—</td></tr>';
  $('bf-keys-count').textContent = '0 shown';
  $('bf-scopes-count').textContent = '0 shown';
}

function renderHero() {
  const gate = $('bf-gate');
  const meta = $('bf-meta');
  if (!gate || !state) return;

  const healthy = state.summary?.healthy === true;
  const fails = gateFailCount();
  const tone = healthy && fails === 0 ? 'ok' : fails > 0 || !healthy ? 'bad' : 'warn';

  gate.className = `portal-gate ${tone}`;
  gate.innerHTML = `<span class="dot" aria-hidden="true"></span>${healthy ? 'healthy' : 'drift'}`;

  if (meta) {
    meta.textContent = `generated ${ageLabel(state.generatedAt)} · ${state.summary?.trackedKeys ?? state.keys?.length ?? 0} keys · schema v${state.schemaVersion ?? '?'}`;
  }

  const err = $('bf-error');
  if (err) {
    err.hidden = true;
    err.innerHTML = '';
  }
}

function renderStats() {
  const stats = $('bf-stats');
  if (!stats || !state) return;

  const healthy = state.summary?.healthy === true;
  const driftCount = state.summary?.driftKeys?.length ?? 0;
  const keys = state.keys ?? [];
  const machineCount = keys.filter(k => k.source === 'machine').length;
  const projectCount = keys.filter(k => k.source === 'project').length;
  const fails = gateFailCount();

  const items = [
    {
      label: 'Healthy',
      value: healthy ? 'yes' : 'no',
      hint: healthy ? 'install policy gate' : 'filter drift rows',
      cls: healthy ? 'ok' : 'bad',
      filter: healthy ? null : { kind: 'drift', value: 'yes' },
    },
    {
      label: 'Tracked keys',
      value: String(state.summary?.trackedKeys ?? keys.length),
      hint: 'effective install keys',
      cls: 'muted',
      filter: null,
    },
    {
      label: 'Drift keys',
      value: String(driftCount),
      hint: 'filter drift rows',
      cls: driftCount ? 'bad' : 'ok',
      filter: { kind: 'drift', value: 'yes' },
    },
    {
      label: 'Machine',
      value: String(machineCount),
      hint: 'filter machine source',
      cls: '',
      filter: { kind: 'source', value: 'machine' },
    },
    {
      label: 'Project',
      value: String(projectCount),
      hint: 'filter project source',
      cls: '',
      filter: { kind: 'source', value: 'project' },
    },
    {
      label: 'Gate fails',
      value: String(fails),
      hint: fails ? 'scroll to gates' : 'all gates ok',
      cls: fails ? 'bad' : 'ok',
      filter: fails ? { kind: 'scroll', value: 'gates' } : null,
    },
  ];

  stats.innerHTML = items
    .map(item => {
      const active =
        item.filter?.kind === 'drift'
          ? driftFilter === item.filter.value
          : item.filter?.kind === 'source'
            ? sourceFilter === item.filter.value
            : false;
      const disabled = item.filter == null ? ' disabled' : '';
      const activeCls = active ? ' active' : '';
      const dataAttr = item.filter
        ? item.filter.kind === 'drift'
          ? ` data-drift-filter="${esc(item.filter.value)}"`
          : item.filter.kind === 'source'
            ? ` data-source-filter="${esc(item.filter.value)}"`
            : ` data-scroll="${esc(item.filter.value)}"`
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

  for (const btn of stats.querySelectorAll('[data-drift-filter]')) {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-drift-filter') ?? '';
      driftFilter = driftFilter === next ? '' : next;
      syncControls();
      writeHash();
      renderStats();
      renderKeys();
    });
  }
  for (const btn of stats.querySelectorAll('[data-source-filter]')) {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-source-filter') ?? '';
      sourceFilter = sourceFilter === next ? '' : next;
      syncControls();
      writeHash();
      renderStats();
      renderKeys();
    });
  }
  for (const btn of stats.querySelectorAll('[data-scroll]')) {
    btn.addEventListener('click', () => {
      $('bf-gates-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

function renderFilterOptions() {
  const keys = state?.keys ?? [];
  fillSelect($('bf-source'), new Set(keys.map(k => k.source).filter(Boolean)), 'all sources');
  const scopes = state?.scopes ?? [];
  fillSelect($('bf-plane'), new Set(scopes.map(s => s.plane).filter(Boolean)), 'all planes');
}

function renderKeys() {
  const body = $('bf-keys');
  const count = $('bf-keys-count');
  if (!body || !state) return;

  const rows = filteredKeys();
  if (count) count.textContent = `${rows.length} shown`;

  body.innerHTML = rows.length
    ? rows
        .map(k => {
          const rowCls = k.drift ? 'row-bad' : 'row-ok';
          return `<tr class="${rowCls}">
        <td class="mono">${esc(k.key)}</td>
        <td class="mono">${esc(fmt(k.effective))}</td>
        <td>${pill(k.source)}</td>
        <td class="dim">${esc(k.owner)}</td>
        <td class="${k.drift ? 'st-bad' : 'st-ok'}">${k.drift ? 'DRIFT' : ''}</td>
      </tr>`;
        })
        .join('')
    : `<tr><td colspan="5" class="dim">${hasActiveFilters() ? 'No keys match filters' : 'No keys in bake'}</td></tr>`;
}

function renderScopes() {
  const body = $('bf-scopes');
  const count = $('bf-scopes-count');
  const note = $('bf-scope-note');
  if (!body || !state) return;

  const rows = filteredScopes();
  if (count) count.textContent = `${rows.length} shown`;

  body.innerHTML = rows.length
    ? rows
        .map(s => {
          const rowCls = (s.usedBy ?? []).length ? 'row-ok' : 'row-warn';
          return `<tr class="${rowCls}">
        <td class="mono">${esc(s.scope)}</td>
        <td class="mono">${esc(s.url ?? '—')}</td>
        <td>${pill(s.plane ?? 'unset')}</td>
        <td class="dim">${(s.usedBy ?? []).length || '—'}</td>
        <td class="mono">${esc(s.tokenEnv ?? '—')}</td>
      </tr>`;
        })
        .join('')
    : `<tr><td colspan="5" class="dim">${planeFilter || query ? 'No scopes match filters' : 'No scopes in bake'}</td></tr>`;

  if (note) {
    note.textContent = state.registry?.prodHost
      ? `Dev plane = loopback registry on this machine. Production installs of @factorywager/* go via the prod host: ${state.registry.prodHost} (Pages Functions + R2 — see docs/platform-routing.md). Scopes with zero workspace packages cover legacy/external consumers.`
      : '';
  }
}

function renderGates() {
  const body = $('bf-gates');
  if (!body || !state) return;

  const entries = Object.entries(state.gates ?? {});
  body.innerHTML = entries.length
    ? entries
        .map(([name, g]) => {
          const rowCls = g.ok ? 'row-ok' : 'row-bad';
          return `<tr class="${rowCls}">
        <td>${esc(name)}</td>
        <td class="${g.ok ? 'st-ok' : 'st-bad'}">${g.ok ? 'ok' : 'FAIL'}</td>
        <td class="dim">${esc(g.exitCode)}</td>
      </tr>`;
        })
        .join('')
    : '<tr><td colspan="3" class="dim">No gates in bake</td></tr>';
}

function renderAll() {
  if (!state || state.kind !== 'bunfig-state') {
    showMissingBake();
    return;
  }
  renderHero();
  renderStats();
  renderFilterOptions();
  syncControls();
  renderKeys();
  renderScopes();
  renderGates();
}

function wireFilters() {
  $('bf-q')?.addEventListener('input', () => {
    query = ($('bf-q')?.value ?? '').trim();
    writeHash();
    syncControls();
    renderKeys();
    renderScopes();
  });
  $('bf-source')?.addEventListener('change', () => {
    sourceFilter = $('bf-source')?.value ?? '';
    writeHash();
    syncControls();
    renderStats();
    renderKeys();
  });
  $('bf-drift')?.addEventListener('change', () => {
    driftFilter = $('bf-drift')?.value ?? '';
    writeHash();
    syncControls();
    renderStats();
    renderKeys();
  });
  $('bf-plane')?.addEventListener('change', () => {
    planeFilter = $('bf-plane')?.value ?? '';
    writeHash();
    syncControls();
    renderScopes();
  });
  $('bf-clear')?.addEventListener('click', () => {
    query = '';
    sourceFilter = '';
    driftFilter = '';
    planeFilter = '';
    syncControls();
    writeHash();
    renderStats();
    renderKeys();
    renderScopes();
  });

  window.addEventListener('hashchange', () => {
    applyHash();
    if (!state) return;
    renderStats();
    renderKeys();
    renderScopes();
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
