/**
 * Surfaces inventory board — reads /registry/surfaces-state.json (schema v2).
 * @see lib/surfaces/README.md
 * @see scripts/bake-surfaces.ts
 */
import { bindCopyButtons } from '../copy-cli.js';
import { fetchJsonResult } from '../fetch-json.js';

const STATE_URL = '/registry/surfaces-state.json';

/** @type {any} */
let state = null;
let query = '';
let statusFilter = '';
let accessFilter = '';
let backendFilter = '';
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

function parseHash(hash = location.hash) {
  const params = new URLSearchParams(String(hash).replace(/^#/, ''));
  return {
    status: params.get('status') || '',
    access: params.get('access') || '',
    backend: params.get('backend') || '',
    q: params.get('q') || '',
  };
}

function writeHash() {
  const params = new URLSearchParams();
  if (statusFilter) params.set('status', statusFilter);
  if (accessFilter) params.set('access', accessFilter);
  if (backendFilter) params.set('backend', backendFilter);
  if (query) params.set('q', query);
  const fragment = params.toString();
  history.replaceState(
    null,
    '',
    `${location.pathname}${location.search}${fragment ? `#${fragment}` : ''}`
  );
}

function applyHash(hash = location.hash) {
  const h = parseHash(hash);
  statusFilter = h.status;
  accessFilter = h.access;
  backendFilter = h.backend;
  query = h.q;
  syncControls();
}

function syncControls() {
  const qEl = $('sf-q');
  const st = $('sf-status');
  const ac = $('sf-access');
  const be = $('sf-backend');
  const clear = $('sf-clear');
  if (qEl && qEl.value !== query) qEl.value = query;
  if (st) st.value = statusFilter;
  if (ac) ac.value = accessFilter;
  if (be) be.value = backendFilter;
  if (clear) {
    clear.disabled = !(statusFilter || accessFilter || backendFilter || query);
  }
}

function hasActiveFilters() {
  return Boolean(statusFilter || accessFilter || backendFilter || query);
}

function statusTone(status) {
  if (status === 'live') return 'ok';
  if (status === 'vanity' || status === 'staged' || status === 'placeholder') return 'warn';
  if (status === 'retired' || status === 'broken' || status === 'dangling') return 'bad';
  return 'muted';
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

function filteredSurfaces(surfaces) {
  const q = query.toLowerCase().trim();
  return surfaces.filter(s => {
    if (statusFilter && s.status !== statusFilter) return false;
    if (accessFilter && s.access !== accessFilter) return false;
    if (backendFilter && s.backendCode !== backendFilter) return false;
    if (!q) return true;
    const hay = [s.id, s.host, s.subdomain, s.apex, s.pagesProject, s.backend]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}

function showSkeletons() {
  const stats = $('sf-stats');
  if (stats) {
    stats.innerHTML = Array.from({ length: 6 }, () => `<div class="portal-skeleton"></div>`).join('');
  }
  const body = $('sf-body');
  if (body) {
    body.innerHTML = '<tr><td colspan="7" class="dim">Loading surfaces-state.json…</td></tr>';
  }
  const gate = $('sf-gate');
  if (gate) {
    gate.className = 'portal-gate';
    gate.innerHTML = '<span class="dot" aria-hidden="true"></span>…';
  }
  const meta = $('sf-meta');
  if (meta) meta.textContent = 'loading…';
  const err = $('sf-error');
  if (err) {
    err.hidden = true;
    err.innerHTML = '';
  }
}

function showMissingBake() {
  const gate = $('sf-gate');
  if (gate) {
    gate.className = 'portal-gate bad';
    gate.innerHTML = '<span class="dot" aria-hidden="true"></span>missing';
  }
  const meta = $('sf-meta');
  if (meta) meta.textContent = 'bake unavailable';
  const stats = $('sf-stats');
  if (stats) stats.innerHTML = '';
  const chips = $('sf-chips');
  if (chips) chips.innerHTML = '—';
  const lanes = $('sf-lanes');
  if (lanes) lanes.textContent = '—';
  const count = $('sf-count');
  if (count) count.textContent = '0 shown';

  const err = $('sf-error');
  if (err) {
    err.hidden = false;
    err.innerHTML = `<div class="portal-error" role="alert">
      <h3>Surfaces bake unavailable</h3>
      <p>Could not load <code>/registry/surfaces-state.json</code>. Run the bake locally or retry after deploy.</p>
      <div class="portal-error-actions">
        <button type="button" class="portal-clear" id="sf-retry">Retry</button>
        <a class="portal-clear" href="/registry/surfaces-state.json" style="display:inline-flex;align-items:center;text-decoration:none">Open JSON</a>
      </div>
      <p class="dim" style="margin-top:10px;margin-bottom:0">Local fix: <code data-copy>bun run surfaces:bake</code> · verify <code data-copy>bun run surfaces:check</code></p>
    </div>`;
    bindCopyButtons(err);
    $('sf-retry')?.addEventListener('click', () => void load());
  }

  const body = $('sf-body');
  if (body) {
    body.innerHTML =
      '<tr><td colspan="7" class="dim">Missing /registry/surfaces-state.json — use Retry above or run <code>bun run surfaces:bake</code></td></tr>';
  }
}

function showFetchError(msg) {
  showMissingBake();
  const err = $('sf-error');
  if (err && !err.hidden) {
    const box = err.querySelector('.portal-error');
    if (box) {
      box.insertAdjacentHTML(
        'beforeend',
        `<p><code>${esc(msg)}</code></p>`
      );
    }
  }
}

function renderHero(ok) {
  const gate = $('sf-gate');
  const meta = $('sf-meta');
  if (!gate || !state) return;
  gate.className = `portal-gate ${ok ? 'ok' : 'drift'}`;
  gate.innerHTML = `<span class="dot" aria-hidden="true"></span>${ok ? 'ok' : 'drift'}`;
  const s = state.summary || {};
  if (meta) {
    meta.textContent = `v${state.schemaVersion ?? '?'} · generated ${ageLabel(state.generatedAt)} · total=${s.total ?? state.surfaces?.length ?? 0}`;
  }
  const err = $('sf-error');
  if (err) {
    err.hidden = true;
    err.innerHTML = '';
  }
}

function renderStats() {
  const stats = $('sf-stats');
  if (!stats || !state) return;

  const s = state.summary || {};
  const ok = Boolean(state.crossCheck?.ok && (state.schemaVersion ?? 0) >= 2);
  const items = [
    {
      label: 'Cross-check',
      value: ok ? 'ok' : 'DRIFT',
      hint: ok ? 'Access + Pages pins' : 'see bake issues',
      cls: ok ? 'ok' : 'bad',
      filter: null,
    },
    {
      label: 'Total',
      value: String(s.total ?? state.surfaces?.length ?? 0),
      hint: 'edge surfaces',
      cls: 'muted',
      filter: null,
    },
  ];

  for (const [status, n] of Object.entries(s.byStatus ?? {}).sort((a, b) => b[1] - a[1])) {
    items.push({
      label: status,
      value: String(n),
      hint: 'filter by status',
      cls: statusTone(status),
      filter: { kind: 'status', value: status },
    });
  }

  for (const [backend, n] of Object.entries(s.byBackendCode ?? {}).sort((a, b) => b[1] - a[1])) {
    items.push({
      label: backend,
      value: String(n),
      hint: 'filter by backend',
      cls: backend === 'none' ? 'muted' : '',
      filter: { kind: 'backend', value: backend },
    });
  }

  items.push(
    {
      label: 'Lanes',
      value: String(s.lanes ?? state.publishLanes?.length ?? 0),
      hint: 'publish lanes',
      cls: 'muted',
      filter: null,
    },
    {
      label: 'Apexes',
      value: String(s.apexes?.length ?? 0),
      hint: 'root domains',
      cls: 'muted',
      filter: null,
    }
  );

  stats.innerHTML = items
    .map(item => {
      const active =
        item.filter?.kind === 'status'
          ? statusFilter === item.filter.value
          : item.filter?.kind === 'backend'
            ? backendFilter === item.filter.value
            : false;
      const disabled = item.filter == null ? ' disabled' : '';
      const activeCls = active ? ' active' : '';
      const dataAttr = item.filter
        ? item.filter.kind === 'status'
          ? ` data-status-filter="${esc(item.filter.value)}"`
          : ` data-backend-filter="${esc(item.filter.value)}"`
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

  for (const btn of stats.querySelectorAll('[data-status-filter]')) {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-status-filter') ?? '';
      statusFilter = statusFilter === next ? '' : next;
      syncControls();
      writeHash();
      renderStats();
      renderRows();
    });
  }
  for (const btn of stats.querySelectorAll('[data-backend-filter]')) {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-backend-filter') ?? '';
      backendFilter = backendFilter === next ? '' : next;
      syncControls();
      writeHash();
      renderStats();
      renderRows();
    });
  }
}

function renderChips() {
  const chips = $('sf-chips');
  if (!chips || !state) return;
  const s = state.summary || {};
  const parts = [];
  for (const a of s.apexes ?? []) parts.push(`<span class="sf-chip">apex ${esc(a)}</span>`);
  for (const d of s.accessDomains ?? []) {
    parts.push(`<span class="sf-chip">access ${esc(d)}</span>`);
  }
  for (const [k, n] of Object.entries(s.byBackendCode ?? {})) {
    parts.push(`<span class="sf-chip">${esc(k)} ×${n}</span>`);
  }
  chips.innerHTML = parts.join('') || '—';
}

function renderFilterOptions() {
  const surfaces = Array.isArray(state?.surfaces) ? state.surfaces : [];
  fillSelect($('sf-status'), new Set(surfaces.map(x => x.status).filter(Boolean)), 'all status');
  fillSelect($('sf-access'), new Set(surfaces.map(x => x.access).filter(Boolean)), 'all access');
  fillSelect(
    $('sf-backend'),
    new Set(surfaces.map(x => x.backendCode).filter(Boolean)),
    'all backend'
  );
}

function renderRows() {
  const body = $('sf-body');
  const count = $('sf-count');
  if (!body || !state) return;

  const surfaces = Array.isArray(state.surfaces) ? state.surfaces : [];
  const rows = filteredSurfaces(surfaces);
  if (count) count.textContent = `${rows.length} shown`;

  body.innerHTML = rows.length
    ? rows
        .map(s => {
          const rowCls =
            s.status === 'live'
              ? 'row-ok'
              : s.status === 'retired' || s.status === 'broken' || s.status === 'dangling'
                ? 'row-bad'
                : s.status === 'vanity' || s.status === 'staged'
                  ? 'row-warn'
                  : '';
          return `<tr class="${rowCls}">
        <td class="mono"><code>${esc(s.id)}</code></td>
        <td class="mono"><code>${esc(s.host)}</code></td>
        <td class="mono"><code>${esc(s.subdomain ?? '—')}</code></td>
        <td><span class="sf-pill ${esc(s.status)}">${esc(s.status)}</span></td>
        <td>${esc(s.access)}</td>
        <td class="mono"><code>${esc(s.backendCode ?? '—')}</code></td>
        <td class="mono"><code>${esc(s.pagesProject ?? '—')}</code></td>
      </tr>`;
        })
        .join('')
    : `<tr><td colspan="7" class="dim">${hasActiveFilters() ? 'No surfaces match filters' : 'No surfaces in bake'}</td></tr>`;
}

function renderLanes() {
  const lanes = $('sf-lanes');
  if (!lanes || !state) return;
  const list = Array.isArray(state.publishLanes) ? state.publishLanes : [];
  lanes.innerHTML = list.length
    ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>id</th><th>protocol</th><th>entry</th></tr></thead><tbody>${list
        .map(
          l =>
            `<tr><td class="mono"><code>${esc(l.id)}</code></td><td>${esc(l.protocol)}</td><td class="mono"><code>${esc(l.entry)}</code></td></tr>`
        )
        .join('')}</tbody></table></div>`
    : '—';
}

function renderAll() {
  if (!state || state.kind !== 'surfaces-state') {
    showMissingBake();
    return;
  }

  const ok = Boolean(state.crossCheck?.ok && (state.schemaVersion ?? 0) >= 2);
  renderHero(ok);
  renderStats();
  renderChips();
  renderFilterOptions();
  syncControls();
  renderRows();
  renderLanes();
}

function wireFilters() {
  $('sf-q')?.addEventListener('input', () => {
    query = ($('sf-q')?.value ?? '').trim();
    writeHash();
    syncControls();
    renderStats();
    renderRows();
  });
  $('sf-status')?.addEventListener('change', () => {
    statusFilter = $('sf-status')?.value ?? '';
    writeHash();
    syncControls();
    renderStats();
    renderRows();
  });
  $('sf-access')?.addEventListener('change', () => {
    accessFilter = $('sf-access')?.value ?? '';
    writeHash();
    syncControls();
    renderRows();
  });
  $('sf-backend')?.addEventListener('change', () => {
    backendFilter = $('sf-backend')?.value ?? '';
    writeHash();
    syncControls();
    renderStats();
    renderRows();
  });
  $('sf-clear')?.addEventListener('click', () => {
    query = '';
    statusFilter = '';
    accessFilter = '';
    backendFilter = '';
    syncControls();
    writeHash();
    renderStats();
    renderRows();
  });

  window.addEventListener('hashchange', () => {
    applyHash();
    if (!state) return;
    renderStats();
    renderRows();
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
    showFetchError(msg);
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
