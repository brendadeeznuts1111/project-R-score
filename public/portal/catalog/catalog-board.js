/**
 * Account catalog board — /api/catalog or /registry/catalog-snapshot.json
 * @see bun run bake:scrape-wire-taxonomy
 */
import { bindCopyButtons } from '../copy-cli.js';
import { fetchJsonResult } from '../fetch-json.js';

/** @type {any[]} */
let accounts = [];
/** @type {any} */
let snapshotMeta = null;
/** @type {any} */
let wirePayload = null;
/** @type {any} */
let auditReport = null;

let query = '';
let statusFilter = '';
let categoryFilters = new Set();
let sortKey = 'name';
let loading = false;

const $ = id => document.getElementById(id);

function esc(value) {
  const el = document.createElement('div');
  el.textContent = value == null ? '' : String(value);
  return el.innerHTML;
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
  const cats = params.get('category');
  return {
    q: params.get('q') || '',
    status: params.get('status') || '',
    category: cats ? cats.split(',').filter(Boolean) : [],
    sort: params.get('sort') || 'name',
  };
}

function writeHash() {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (statusFilter) params.set('status', statusFilter);
  if (categoryFilters.size) params.set('category', [...categoryFilters].sort().join(','));
  if (sortKey !== 'name') params.set('sort', sortKey);
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
  statusFilter = h.status;
  categoryFilters = new Set(h.category);
  sortKey = h.sort;
  syncControls();
}

function syncControls() {
  const qEl = $('cat-q');
  const sortEl = $('sort-select');
  const clear = $('cat-clear');
  if (qEl && qEl.value !== query) qEl.value = query;
  if (sortEl) sortEl.value = sortKey;
  if (clear) {
    clear.disabled = !(query || statusFilter || categoryFilters.size || sortKey !== 'name');
  }
}

function allCategories() {
  return [...new Set(accounts.map(a => a.category).filter(Boolean))].sort();
}

function filteredAccounts() {
  const q = query.toLowerCase().trim();
  const cats =
    categoryFilters.size > 0 ? categoryFilters : new Set(allCategories());
  return accounts.filter(a => {
    if (statusFilter && a.status !== statusFilter) return false;
    if (!cats.has(a.category)) return false;
    if (!q) return true;
    const hay = `${a.platform ?? ''} ${a.account_identifier ?? ''} ${a.partner_name ?? ''}`.toLowerCase();
    return hay.includes(q);
  });
}

function sortedAccounts(rows) {
  const list = [...rows];
  if (sortKey === 'balance') list.sort((a, b) => (b.balance || 0) - (a.balance || 0));
  else if (sortKey === 'date') list.sort((a, b) => new Date(b.opened_at || 0) - new Date(a.opened_at || 0));
  else list.sort((a, b) => (a.platform || '').localeCompare(b.platform || ''));
  return list;
}

function showSkeletons() {
  const stats = $('cat-stats');
  if (stats) {
    stats.innerHTML = Array.from({ length: 4 }, () => `<div class="portal-skeleton"></div>`).join('');
  }
  const gate = $('cat-gate');
  if (gate) {
    gate.className = 'portal-gate';
    gate.innerHTML = '<span class="dot" aria-hidden="true"></span>…';
  }
  const meta = $('cat-baked');
  if (meta) meta.textContent = 'loading…';
  const err = $('cat-error');
  if (err) {
    err.hidden = true;
    err.innerHTML = '';
  }
  $('loading')?.classList.remove('hidden');
  $('dashboard')?.classList.add('hidden');
}

function showMissingCatalog(msg = '') {
  $('loading')?.classList.add('hidden');
  $('dashboard')?.classList.add('hidden');

  const gate = $('cat-gate');
  if (gate) {
    gate.className = 'portal-gate bad';
    gate.innerHTML = '<span class="dot" aria-hidden="true"></span>missing';
  }
  const meta = $('cat-baked');
  if (meta) meta.textContent = 'catalog unavailable';

  const stats = $('cat-stats');
  if (stats) stats.innerHTML = '';

  const err = $('cat-error');
  if (err) {
    err.hidden = false;
    err.innerHTML = `<div class="portal-error" role="alert">
      <h3>Catalog unavailable</h3>
      <p>Could not load <code>/api/catalog</code> or <code>/registry/catalog-snapshot.json</code>. Deploy a static snapshot or connect the database.</p>
      ${msg ? `<p><code>${esc(msg)}</code></p>` : ''}
      <div class="portal-error-actions">
        <button type="button" class="portal-clear" id="cat-retry">Retry</button>
        <a class="portal-clear" href="/registry/catalog-snapshot.json" style="display:inline-flex;align-items:center;text-decoration:none">Open JSON</a>
      </div>
      <p class="dim" style="margin-top:10px;margin-bottom:0">Local: connect DB for live API · static: ensure catalog snapshot is baked and deployed</p>
    </div>`;
    bindCopyButtons(err);
    $('cat-retry')?.addEventListener('click', () => void loadCatalog());
  }
}

function renderHero() {
  const gate = $('cat-gate');
  const meta = $('cat-baked');
  if (!gate) return;

  const loaded = accounts.length > 0 || snapshotMeta;
  const auditOk = auditReport?.ok;
  let tone = 'ok';
  let label = 'loaded';
  if (!loaded) {
    tone = 'bad';
    label = 'missing';
  } else if (auditReport && auditOk === false) {
    tone = 'warn';
    label = 'audit warn';
  }

  gate.className = `portal-gate ${tone}`;
  gate.innerHTML = `<span class="dot" aria-hidden="true"></span>${label}`;

  if (meta) {
    const parts = [];
    if (snapshotMeta?.generatedAt) {
      parts.push(`snapshot ${ageLabel(snapshotMeta.generatedAt)}`);
    }
    if (snapshotMeta?.source) parts.push(`source ${snapshotMeta.source}`);
    parts.push(`${accounts.length} accounts`);
    if (wirePayload?.summary) {
      const s = wirePayload.summary;
      parts.push(
        `wire ${s.books ?? '?'} books · ${s.states ?? '?'} states`
      );
    }
    meta.textContent = parts.join(' · ') || 'live catalog';
  }

  const err = $('cat-error');
  if (err && loaded) {
    err.hidden = true;
    err.innerHTML = '';
  }
}

function renderStats() {
  const stats = $('cat-stats');
  if (!stats) return;

  const active = accounts.filter(a => a.status === 'active').length;
  const cats = new Set(accounts.map(a => a.category));
  const bal = accounts.reduce((s, a) => s + (a.balance || 0), 0);

  const items = [
    {
      label: 'Accounts',
      value: String(accounts.length),
      hint: 'clear filters',
      cls: 'muted',
      filter: { kind: 'reset' },
    },
    {
      label: 'Active',
      value: String(active),
      hint: 'filter active',
      cls: active === accounts.length ? 'ok' : '',
      filter: { kind: 'status', value: 'active' },
    },
    {
      label: 'Categories',
      value: String(cats.size),
      hint: 'distinct lanes',
      cls: 'muted',
      filter: null,
    },
    {
      label: 'Balance',
      value: '$' + bal.toLocaleString(),
      hint: 'total across accounts',
      cls: 'muted',
      filter: null,
    },
  ];

  stats.innerHTML = items
    .map(item => {
      const activeStat =
        item.filter?.kind === 'status'
          ? statusFilter === item.filter.value
          : false;
      const disabled = item.filter == null ? ' disabled' : '';
      const activeCls = activeStat ? ' active' : '';
      const dataAttr =
        item.filter?.kind === 'status'
          ? ` data-status-filter="${esc(item.filter.value)}"`
          : item.filter?.kind === 'reset'
            ? ' data-filter-reset="true"'
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
      renderFilters();
      renderGrid();
    });
  }
  for (const btn of stats.querySelectorAll('[data-filter-reset]')) {
    btn.addEventListener('click', () => {
      query = '';
      statusFilter = '';
      categoryFilters.clear();
      sortKey = 'name';
      syncControls();
      writeHash();
      renderStats();
      renderFilters();
      renderGrid();
    });
  }
}

function renderFilters() {
  const cats = allCategories();
  const chips = $('filter-chips');
  if (!chips) return;

  if (!categoryFilters.size) cats.forEach(c => categoryFilters.add(c));

  chips.innerHTML = cats
    .map(c => {
      const on = categoryFilters.has(c);
      return `<button type="button" class="filter-chip ${on ? 'active' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`;
    })
    .join('');

  chips.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      if (!cat) return;
      if (categoryFilters.size === cats.length) {
        categoryFilters.clear();
        categoryFilters.add(cat);
      } else if (categoryFilters.has(cat)) {
        categoryFilters.delete(cat);
        if (!categoryFilters.size) cats.forEach(c => categoryFilters.add(c));
      } else {
        categoryFilters.add(cat);
      }
      syncControls();
      writeHash();
      renderFilters();
      renderGrid();
    });
  });
}

function renderGrid() {
  const grid = $('account-grid');
  const count = $('cat-count');
  if (!grid) return;

  const filtered = sortedAccounts(filteredAccounts());
  if (count) {
    count.textContent = `${filtered.length} shown${filtered.length !== accounts.length ? ` · ${accounts.length} total` : ''}`;
  }

  grid.innerHTML = filtered.length
    ? filtered
        .map(
          a => `
          <div class="account-card ${esc(a.status)}">
            <div class="account-header">
              <span class="account-platform">${esc(a.platform || '—')}</span>
              <span class="account-identifier">${esc(a.account_identifier || '—')}</span>
            </div>
            <div class="account-meta">
              <span class="account-category">${esc(a.category)}${a.sub_category ? ` · ${esc(a.sub_category)}` : ''}</span>
              <span class="status-badge status-${esc(a.status)}">${esc(a.status)}</span>
            </div>
            <div class="account-balance">$${(a.balance || 0).toLocaleString()}</div>
            <div class="account-footer">
              <span class="partner-name">${esc(a.partner_name || '—')} (${esc(a.partner_type || '—')})</span>
              <span>${a.opened_at ? new Date(a.opened_at).toLocaleDateString() : '—'}</span>
            </div>
          </div>
        `
        )
        .join('')
    : '<div class="cat-empty">No accounts match.</div>';
}

function isChipHex(hex) {
  return typeof hex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(hex);
}

function wireChip(label, key, conceptId, detail = '', hex = '', colorKey = '') {
  const body = `${esc(label)} <code>${esc(key)}</code>${detail ? ` · ${esc(detail)}` : ''}`;
  const safeHex = isChipHex(hex) ? hex : '';
  const style = safeHex ? ` style="--chip-color:${safeHex}"` : '';
  const colorAttr = colorKey
    ? ` data-color-key="${esc(colorKey)}"`
    : key
      ? ` data-color-key="${esc(key)}"`
      : '';
  const tagAttrs = `${style}${colorAttr}`;
  if (!conceptId) return `<span class="wire-chip"${tagAttrs}>${body}</span>`;
  const href = `/portal/glossary/#glossary:${encodeURIComponent(conceptId)}`;
  return `<a class="wire-chip" href="${href}" data-glossary-concept="${esc(conceptId)}"${tagAttrs}>${body}</a>`;
}

function renderScrapeWire(payload) {
  wirePayload = payload;
  const s = payload.summary || {};
  if ($('scrape-wire-meta')) {
    $('scrape-wire-meta').textContent =
      ` (${s.books ?? '?'} books · ${s.sports ?? '?'} sports · ${s.markets ?? '?'} markets · ${s.phases ?? '?'} phases · ${s.states ?? '?'} states)`;
  }
  $('wire-stats').innerHTML = [
    ['books', s.books],
    ['sports', s.sports],
    ['leagues', s.leagues],
    ['markets', s.markets],
    ['phases', s.phases],
    ['states', s.states],
    ['book aliases', s.bookAliases],
    ['league aliases', s.leagueAliases],
  ]
    .map(([label, n]) => `<span class="wire-stat"><strong>${esc(n ?? '—')}</strong> ${esc(label)}</span>`)
    .join('');

  const books = Array.isArray(payload.bookRegistry) ? payload.bookRegistry : [];
  $('wire-books').innerHTML = books.length
    ? books
        .map(row =>
          wireChip(
            `#${row.rank} ${row.label}`,
            row.key,
            row.conceptId,
            '',
            row.hex || '',
            row.colorKey || row.key
          )
        )
        .join('')
    : '<span class="wire-stat">No bookRegistry in bake</span>';

  const sports = Array.isArray(payload.sportRegistry) ? payload.sportRegistry : [];
  $('wire-sports').innerHTML = sports.length
    ? sports
        .map(row =>
          wireChip(row.label, row.key, row.conceptId, '', row.hex || '', row.colorKey || row.key)
        )
        .join('')
    : '<span class="wire-stat">No sportRegistry in bake</span>';

  const leagues = Array.isArray(payload.leagueRegistry) ? payload.leagueRegistry : [];
  $('wire-leagues').innerHTML = leagues.length
    ? leagues
        .map(row =>
          wireChip(row.label, row.key, row.conceptId, row.sport, row.hex || '', row.colorKey || row.key)
        )
        .join('')
    : '<span class="wire-stat">No leagueRegistry in bake</span>';

  const markets = Array.isArray(payload.marketRegistry) ? payload.marketRegistry : [];
  $('wire-markets').innerHTML = markets.length
    ? markets.map(row => wireChip(row.label, row.key, row.conceptId, row.tier)).join('')
    : (Array.isArray(payload.markets) ? payload.markets : [])
        .map(key => `<span class="wire-chip"><code>${esc(key)}</code></span>`)
        .join('');

  const phases = Array.isArray(payload.phaseRegistry) ? payload.phaseRegistry : [];
  $('wire-phases').innerHTML = phases.length
    ? phases.map(row => wireChip(row.label, row.key, row.conceptId)).join('')
    : ['pregame', 'live'].map(key => `<span class="wire-chip"><code>${esc(key)}</code></span>`).join('');

  const states = Array.isArray(payload.stateRegistry) ? payload.stateRegistry : [];
  $('wire-states').innerHTML = states.length
    ? states
        .map(
          row =>
            `<div class="wire-state"><code>${esc(row.key || row.code)}</code><span>${esc(row.label)}</span></div>`
        )
        .join('')
    : '<span class="wire-stat">No stateRegistry in bake</span>';

  renderHero();
}

function renderAudit(report) {
  auditReport = report;
  const badge = $('wire-audit');
  if (!badge) return;
  const errors = report?.summary?.errors ?? '?';
  const warnings = report?.summary?.warnings ?? '?';
  badge.className = `portal-gate ${report?.ok ? 'ok' : 'fail'}`;
  badge.innerHTML = report?.ok
    ? `<span class="dot" aria-hidden="true"></span>audit ok · ${warnings} warn`
    : `<span class="dot" aria-hidden="true"></span>audit fail · ${errors} err`;
  badge.title = `bun run schema:audit:check · ${report?.generatedAt ?? 'unknown time'}`;
  renderHero();
}

function renderDashboard() {
  $('loading')?.classList.add('hidden');
  $('dashboard')?.classList.remove('hidden');
  renderHero();
  renderStats();
  renderFilters();
  renderGrid();
}

async function loadRelatedBakes() {
  try {
    const res = await fetch('/registry/scrape-wire-taxonomy.json', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (res.ok) renderScrapeWire(await res.json());
    else if ($('wire-stats')) $('wire-stats').textContent = `scrape-wire-taxonomy HTTP ${res.status}`;
  } catch (err) {
    if ($('wire-stats')) {
      $('wire-stats').textContent =
        err instanceof Error ? err.message : 'Failed to load scrape-wire-taxonomy';
    }
  }

  try {
    const res = await fetch('/registry/scrape-wire-schema-audit.json', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    renderAudit(await res.json());
  } catch (err) {
    const badge = $('wire-audit');
    if (badge) {
      badge.className = 'portal-gate warn';
      badge.innerHTML = '<span class="dot" aria-hidden="true"></span>audit unavailable';
      badge.title = err instanceof Error ? err.message : 'Failed to load schema audit';
    }
  }

  try {
    const res = await fetch('/registry/content-type-matrix.json', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const j = await res.json();
      const s = j.summary;
      if (s && $('ct-matrix-meta')) {
        $('ct-matrix-meta').textContent = ` (${s.pass ?? '?'}/${s.total ?? '?'} pass)`;
      }
    }
  } catch {
    /* optional */
  }

  try {
    const res = await fetch('/registry/harness-skills-catalog.json', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const j = await res.json();
      const n = Array.isArray(j.skills) ? j.skills.length : 0;
      if ($('harness-skills-meta')) {
        $('harness-skills-meta').textContent = n ? ` (${n} skills)` : '';
      }
    }
  } catch {
    /* optional */
  }
}

async function loadCatalog() {
  if (loading) return;
  loading = true;
  showSkeletons();

  try {
    const res = await fetch('/api/catalog');
    if (res.ok) {
      const data = await res.json();
      accounts = data.accounts ?? [];
      snapshotMeta = { source: 'api', generatedAt: data.generatedAt ?? null };
      applyHash();
      renderDashboard();
      loading = false;
      return;
    }
  } catch {
    /* fall through */
  }

  const r = await fetchJsonResult('/registry/catalog-snapshot.json');
  if (r.ok && r.data) {
    accounts = r.data.accounts ?? [];
    snapshotMeta = { source: r.data.source ?? 'snapshot', generatedAt: r.data.generatedAt ?? null };
    applyHash();
    renderDashboard();
    loading = false;
    return;
  }

  showMissingCatalog(r.error ?? '');
  loading = false;
}

export async function initCatalogBoard() {
  applyHash();
  void loadRelatedBakes();

  $('cat-q')?.addEventListener('input', e => {
    query = e.target.value;
    syncControls();
    writeHash();
    renderGrid();
  });
  $('sort-select')?.addEventListener('change', e => {
    sortKey = e.target.value;
    syncControls();
    writeHash();
    renderGrid();
  });
  $('cat-clear')?.addEventListener('click', () => {
    query = '';
    statusFilter = '';
    categoryFilters.clear();
    sortKey = 'name';
    syncControls();
    writeHash();
    renderStats();
    renderFilters();
    renderGrid();
  });

  window.addEventListener('hashchange', () => {
    applyHash();
    if (accounts.length) {
      renderStats();
      renderFilters();
      renderGrid();
    }
  });

  await loadCatalog();
  bindCopyButtons();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      void initCatalogBoard();
    });
  } else {
    void initCatalogBoard();
  }
}
