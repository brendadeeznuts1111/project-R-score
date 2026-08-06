/**
 * Concepts board — /portal/concepts/
 * @see /registry/concepts-state.json · bun run concepts:bake
 * @see docs/DOMAIN_CONCEPT_SHAPE.md
 */

const STATE_URL = '/registry/concepts-state.json';
const GRAPH_URL = '/registry/concepts-graph.json';

const BOARD_HREF = {
  'partner-history': '/portal/partner-history/',
  partners: '/portal/partners/',
  limits: '/portal/limits/',
  account: '/portal/account/',
  compliance: '/portal/compliance/',
  glossary: '/portal/glossary/',
  brands: '/portal/brands/',
  surfaces: '/portal/surfaces/',
  packages: '/portal/packages/',
  ops: '/portal/ops/',
  health: '/portal/health/',
  vault: '/portal/vault/',
  tools: '/portal/tools/',
  tennis: '/portal/tennis/',
  toc: '/portal/toc/',
};

/** @type {any} */
let state = null;
let domainFilter = '';
let kindFilter = '';
let statusFilter = '';
let namespaceFilter = '';
let query = '';
let groupByDomain = false;
let sortKey = 'id';
let sortDir = 1;
let loading = false;

const $ = id => document.getElementById(id);

function esc(s) {
  return String(s ?? '').replace(
    /[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
  );
}

function pill(k, cls = k) {
  return `<span class="cx-pill ${esc(cls)}">${esc(k)}</span>`;
}

function pct(n) {
  return `${Math.round((n ?? 0) * 100)}%`;
}

function parseHash(hash = location.hash) {
  const params = new URLSearchParams(String(hash).replace(/^#/, ''));
  return {
    domain: params.get('domain') || '',
    kind: params.get('kind') || '',
    status: params.get('status') || '',
    ns: params.get('ns') || '',
    q: params.get('q') || '',
    group: params.get('group') === '1',
    sort: params.get('sort') || 'id',
    dir: params.get('dir') === 'desc' ? -1 : 1,
  };
}

function writeHash() {
  const params = new URLSearchParams();
  if (domainFilter) params.set('domain', domainFilter);
  if (kindFilter) params.set('kind', kindFilter);
  if (statusFilter) params.set('status', statusFilter);
  if (namespaceFilter) params.set('ns', namespaceFilter);
  if (query) params.set('q', query);
  if (groupByDomain) params.set('group', '1');
  if (sortKey !== 'id') params.set('sort', sortKey);
  if (sortDir === -1) params.set('dir', 'desc');
  const fragment = params.toString();
  history.replaceState(
    null,
    '',
    `${location.pathname}${location.search}${fragment ? `#${fragment}` : ''}`
  );
}

function applyHash(hash = location.hash) {
  const h = parseHash(hash);
  domainFilter = h.domain;
  kindFilter = h.kind;
  statusFilter = h.status;
  namespaceFilter = h.ns;
  query = h.q;
  groupByDomain = h.group;
  sortKey = h.sort;
  sortDir = h.dir;
  syncControls();
}

function syncControls() {
  const domainSel = $('cx-domain');
  const kindSel = $('cx-kind');
  const statusSel = $('cx-status');
  const nsSel = $('cx-ns');
  const q = $('cx-q');
  const group = $('cx-group-domain');
  if (domainSel) domainSel.value = domainFilter;
  if (kindSel) kindSel.value = kindFilter;
  if (statusSel) statusSel.value = statusFilter;
  if (nsSel) nsSel.value = namespaceFilter;
  if (q && q.value !== query) q.value = query;
  if (group) group.checked = groupByDomain;
  const clear = $('cx-clear');
  if (clear) {
    clear.disabled = !(
      domainFilter ||
      kindFilter ||
      statusFilter ||
      namespaceFilter ||
      query ||
      groupByDomain ||
      sortKey !== 'id' ||
      sortDir !== 1
    );
  }
}

function uniqueValues(key) {
  return [...new Set((state?.concepts ?? []).map(c => c[key]).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
}

function filteredConcepts() {
  return (state?.concepts ?? []).filter(c => {
    if (domainFilter && c.domain !== domainFilter) return false;
    if (kindFilter && c.kind !== kindFilter) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    if (namespaceFilter && c.namespace !== namespaceFilter) return false;
    if (query) {
      const hay = `${c.id} ${c.label} ${c.group} ${c.provenance}`.toLowerCase();
      if (!hay.includes(query.toLowerCase())) return false;
    }
    return true;
  });
}

function sortedConcepts(rows) {
  const key = sortKey;
  const dir = sortDir;
  return [...rows].sort((a, b) => {
    if (groupByDomain) {
      const d = a.domain.localeCompare(b.domain);
      if (d) return d;
    }
    let av = a[key];
    let bv = b[key];
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    av = String(av ?? '');
    bv = String(bv ?? '');
    return av.localeCompare(bv) * dir;
  });
}

function renderHero() {
  const gate = state?.gate ?? 'unset';
  const ok = gate === 'pass';
  $('cx-gate').className = `cx-gate ${ok ? 'pass' : 'fail'}`;
  $('cx-gate').innerHTML = `<span class="dot" aria-hidden="true"></span>${esc(gate)}`;
  const baked = state?.bakedAt ? new Date(state.bakedAt) : null;
  $('cx-baked').textContent = baked
    ? `baked ${baked.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC')} · ${state.summary?.totalPortal ?? 0} concepts · schema v${state.schemaVersion ?? 1}`
    : 'bake missing';
}

function renderStats() {
  const s = state?.summary ?? {};
  const ok = state?.gate === 'pass';
  const items = [
    {
      key: 'gate',
      label: 'Gate',
      value: state?.gate ?? 'unset',
      hint: ok ? 'audit + coverage pass' : 'see issues below',
      cls: ok ? 'ok' : 'bad',
      filter: null,
    },
    {
      key: 'total',
      label: 'Concepts',
      value: s.totalPortal ?? 0,
      hint: 'portal vocabulary',
      cls: '',
      filter: { kind: '' },
    },
    {
      key: 'prov',
      label: 'Provenance',
      value: pct(s.provenanceCoverage),
      hint: `${s.withProvenance ?? 0} tagged`,
      cls: (s.provenanceCoverage ?? 0) >= 1 ? 'ok' : 'warn',
      filter: null,
    },
    {
      key: 'used',
      label: 'Used UI',
      value: s.usedUi ?? 0,
      hint: 'bound in boards',
      cls: 'ok',
      filter: { kind: 'used' },
    },
    {
      key: 'unused',
      label: 'Unused',
      value: s.unusedUi ?? 0,
      hint: 'defined, not referenced',
      cls: (s.unusedUi ?? 0) > 0 ? 'warn' : 'muted',
      filter: { kind: 'unused' },
    },
    {
      key: 'surface',
      label: 'Surface-only',
      value: s.surfaceOnly ?? 0,
      hint: 'surface map orphans',
      cls: (s.surfaceOnly ?? 0) > 0 ? 'muted' : '',
      filter: { kind: 'surface-only' },
    },
  ];

  $('cx-stats').innerHTML = items
    .map(item => {
      const kindTarget = item.filter?.kind;
      const active = kindTarget !== undefined && kindFilter === kindTarget;
      const disabled = item.filter == null ? ' disabled' : '';
      const activeCls = active ? ' active' : '';
      const filterAttr =
        kindTarget !== undefined ? ` data-kind-filter="${esc(kindTarget)}"` : '';
      return (
        `<button type="button" class="cx-stat ${item.cls}${activeCls}"${disabled}${filterAttr}>` +
        `<span class="k">${esc(item.label)}</span>` +
        `<span class="v">${esc(item.value)}</span>` +
        `<span class="hint">${esc(item.hint)}</span>` +
        `</button>`
      );
    })
    .join('');

  for (const btn of $('cx-stats').querySelectorAll('[data-kind-filter]')) {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-kind-filter') ?? '';
      kindFilter = kindFilter === next ? '' : next;
      syncControls();
      writeHash();
      renderStats();
      renderRows();
    });
  }
}

function renderIssues() {
  const box = $('cx-issues');
  if (!box) return;
  const failures = state?.failures ?? [];
  const meta = state?.metadataIssues ?? [];
  const s = state?.summary ?? {};
  const extras = [];
  if (s.metadataIssues) extras.push(`${s.metadataIssues} metadata issue(s)`);
  if (s.surfaceOrphans) extras.push(`${s.surfaceOrphans} surface orphan(s)`);
  if (s.inventoryMisses) extras.push(`${s.inventoryMisses} inventory miss(es)`);
  if (s.deprecatedUsed) extras.push(`${s.deprecatedUsed} deprecated-in-use`);
  if (s.bakeDrift) extras.push(`${s.bakeDrift} bake drift`);

  const lines = [
    ...failures.map(f => String(f)),
    ...meta.map(m => (typeof m === 'string' ? m : JSON.stringify(m))),
    ...extras,
  ];

  if (!lines.length && state?.gate === 'pass') {
    box.classList.remove('visible');
    box.innerHTML = '';
    return;
  }

  box.classList.add('visible');
  box.innerHTML =
    `<h2>Audit issues</h2>` +
    (lines.length
      ? `<ul>${lines
          .slice(0, 12)
          .map(l => `<li>${esc(l)}</li>`)
          .join('')}</ul>`
      : `<p class="dim">Gate ${esc(state?.gate ?? 'fail')} — re-run <code>bun run concept:audit -- --strict</code></p>`);
}

function renderDomainTiles() {
  const tiles = state?.domainSummary ?? [];
  const sel = $('cx-domain');
  if (sel) {
    const current = domainFilter;
    sel.innerHTML =
      `<option value="">all</option>` +
      tiles.map(d => `<option value="${esc(d.domain)}">${esc(d.domain)}</option>`).join('');
    if ([...sel.options].some(o => o.value === current)) sel.value = current;
  }

  const max = Math.max(1, ...tiles.map(d => d.count || 0));
  $('cx-domains').innerHTML =
    `<button type="button" class="cx-domain-tile${domainFilter === '' ? ' active' : ''}" data-domain="">` +
    `<div class="name">all</div>` +
    `<div class="meta">${state?.summary?.totalPortal ?? 0} concepts</div>` +
    `<div class="cx-domain-bar" aria-hidden="true"><span style="width:100%"></span></div>` +
    `</button>` +
    tiles
      .map(d => {
        const prov =
          d.provenancePct != null
            ? `${d.provenancePct}% provenance`
            : d.count
              ? `${Math.round(((d.provenance ?? 0) / d.count) * 100)}% provenance`
              : '—';
        const usedPct = d.count ? Math.round(((d.used ?? 0) / d.count) * 100) : 0;
        const width = Math.round(((d.count || 0) / max) * 100);
        return (
          `<button type="button" class="cx-domain-tile${domainFilter === d.domain ? ' active' : ''}" data-domain="${esc(d.domain)}">` +
          `<div class="name">${esc(d.domain)}</div>` +
          `<div class="meta">${d.count} · ${d.used} used · ${d.unused} unused · ${esc(prov)}</div>` +
          `<div class="cx-domain-bar" aria-hidden="true" title="${usedPct}% used">` +
          `<span style="width:${width}%"></span></div>` +
          `</button>`
        );
      })
      .join('');

  for (const btn of $('cx-domains').querySelectorAll('[data-domain]')) {
    btn.addEventListener('click', () => {
      domainFilter = btn.getAttribute('data-domain') ?? '';
      syncControls();
      writeHash();
      renderDomainTiles();
      renderRows();
    });
  }
}

function renderBoards() {
  const box = $('cx-boards');
  if (!box) return;
  const boards = [...(state?.boards ?? [])].sort((a, b) => (b.usages ?? 0) - (a.usages ?? 0));
  if (!boards.length) {
    box.innerHTML = `<p class="dim">No board usage rollup in bake.</p>`;
    return;
  }
  box.innerHTML = boards
    .slice(0, 8)
    .map(b => {
      const href = BOARD_HREF[b.board];
      const name = href
        ? `<a href="${esc(href)}">${esc(b.board)}</a>`
        : esc(b.board);
      return (
        `<div class="cx-board-tile">` +
        `<div class="name">${name}</div>` +
        `<div class="meta">${b.usages ?? 0} usages · ${b.files ?? 0} files · allowlist ${b.allowlist ?? 0}</div>` +
        `</div>`
      );
    })
    .join('');
}

function renderFilterOptions() {
  const statusSel = $('cx-status');
  const nsSel = $('cx-ns');
  if (statusSel) {
    const current = statusFilter;
    statusSel.innerHTML =
      `<option value="">all</option>` +
      uniqueValues('status')
        .map(v => `<option value="${esc(v)}">${esc(v)}</option>`)
        .join('');
    if ([...statusSel.options].some(o => o.value === current)) statusSel.value = current;
  }
  if (nsSel) {
    const current = namespaceFilter;
    nsSel.innerHTML =
      `<option value="">all</option>` +
      uniqueValues('namespace')
        .map(v => `<option value="${esc(v)}">${esc(v)}</option>`)
        .join('');
    if ([...nsSel.options].some(o => o.value === current)) nsSel.value = current;
  }
}

function renderSortHeaders() {
  for (const th of document.querySelectorAll('.cx-table th.sortable')) {
    const key = th.getAttribute('data-sort');
    if (!key) continue;
    if (key === sortKey) th.setAttribute('aria-sort', sortDir === 1 ? 'ascending' : 'descending');
    else th.removeAttribute('aria-sort');
  }
}

function renderRows() {
  const rows = sortedConcepts(filteredConcepts());
  $('cx-count').textContent = `${rows.length} shown`;
  let lastDomain = null;
  renderSortHeaders();
  $('cx-rows').innerHTML =
    rows
      .map(c => {
        let groupRow = '';
        if (groupByDomain && c.domain !== lastDomain) {
          lastDomain = c.domain;
          groupRow = `<tr class="cx-group-row"><td colspan="9">${esc(c.domain)}</td></tr>`;
        }
        const statusCls = `status-${String(c.status || 'unknown').toLowerCase()}`;
        return (
          groupRow +
          `<tr>` +
          `<td class="mono"><a href="/portal/glossary/#glossary:${esc(c.id)}">${esc(c.id)}</a></td>` +
          `<td>${esc(c.label)}</td>` +
          `<td class="mono">${esc(c.domain)}</td>` +
          `<td class="mono dim">${esc(c.namespace ?? '')}</td>` +
          `<td class="mono dim">${esc(c.group)}</td>` +
          `<td>${pill(c.status, statusCls)}</td>` +
          `<td class="mono dim">${esc(c.provenance || '—')}</td>` +
          `<td class="mono">${esc(c.usage)}</td>` +
          `<td>${pill(c.kind)}</td>` +
          `</tr>`
        );
      })
      .join('') || '<tr><td colspan="9" class="dim">no concepts match filters</td></tr>';
}

async function renderGraphSummary() {
  const box = $('cx-graph-stats');
  if (!box) return;
  try {
    const res = await fetch(GRAPH_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const g = await res.json();
    const s = g.summary ?? {};
    box.innerHTML = [
      ['Nodes', s.nodes ?? 0, 'Graph vertices'],
      ['Edges', s.edges ?? 0, 'All relations'],
      ['seeAlso', s.seeAlsoEdges ?? 0, 'Concept links'],
      ['Used', s.used ?? 0, 'Bound in UI'],
    ]
      .map(
        ([k, v, hint]) =>
          `<div class="cx-stat" disabled><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span><span class="hint">${esc(hint)}</span></div>`
      )
      .join('');
  } catch {
    box.innerHTML = `<div class="cx-stat muted" disabled><span class="k">Graph</span><span class="v" style="font-size:14px">bake missing</span><span class="hint">bun run concept:graph:bake</span></div>`;
  }
}

function showSkeletons() {
  $('cx-stats').innerHTML = Array.from({ length: 6 }, () => `<div class="cx-skeleton"></div>`).join(
    ''
  );
  $('cx-domains').innerHTML = Array.from(
    { length: 4 },
    () => `<div class="cx-skeleton" style="min-height:84px"></div>`
  ).join('');
  $('cx-boards').innerHTML = Array.from(
    { length: 4 },
    () => `<div class="cx-skeleton" style="min-height:72px"></div>`
  ).join('');
  $('cx-rows').innerHTML = `<tr><td colspan="9" class="dim">loading concepts-state.json…</td></tr>`;
}

function showError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  $('cx-stats').innerHTML = '';
  $('cx-domains').innerHTML = '';
  $('cx-boards').innerHTML = '';
  $('cx-gate').className = 'cx-gate fail';
  $('cx-gate').innerHTML = `<span class="dot" aria-hidden="true"></span>error`;
  $('cx-baked').textContent = 'unavailable';
  $('cx-rows').innerHTML = `<tr><td colspan="9">
    <div class="cx-error">
      <h3>Concepts bake unavailable</h3>
      <p>Could not load <code>/registry/concepts-state.json</code>.</p>
      <p><code>${esc(msg)}</code></p>
      <div class="actions">
        <button type="button" id="cx-retry">Retry</button>
        <a class="btn" href="/registry/concepts-state.json">Open JSON</a>
        <a class="btn" href="https://github.com/brendadeeznuts1111/project-R-score/blob/main/docs/DOMAIN_CONCEPT_SHAPE.md" target="_blank" rel="noopener noreferrer">Operator model</a>
      </div>
      <p class="dim" style="margin-top:10px">Local fix: <code>bun run concepts:bake</code></p>
    </div>
  </td></tr>`;
  $('cx-retry')?.addEventListener('click', () => void load());
}

function bindFilters() {
  $('cx-domain')?.addEventListener('change', () => {
    domainFilter = $('cx-domain').value;
    writeHash();
    renderDomainTiles();
    renderRows();
  });
  $('cx-kind')?.addEventListener('change', () => {
    kindFilter = $('cx-kind').value;
    writeHash();
    renderStats();
    renderRows();
  });
  $('cx-status')?.addEventListener('change', () => {
    statusFilter = $('cx-status').value;
    writeHash();
    renderRows();
  });
  $('cx-ns')?.addEventListener('change', () => {
    namespaceFilter = $('cx-ns').value;
    writeHash();
    renderRows();
  });
  $('cx-group-domain')?.addEventListener('change', () => {
    groupByDomain = $('cx-group-domain').checked;
    writeHash();
    renderRows();
  });
  $('cx-q')?.addEventListener('input', () => {
    query = ($('cx-q').value ?? '').trim();
    writeHash();
    syncControls();
    renderRows();
  });
  $('cx-clear')?.addEventListener('click', () => {
    domainFilter = '';
    kindFilter = '';
    statusFilter = '';
    namespaceFilter = '';
    query = '';
    groupByDomain = false;
    sortKey = 'id';
    sortDir = 1;
    syncControls();
    writeHash();
    renderStats();
    renderDomainTiles();
    renderRows();
  });

  for (const th of document.querySelectorAll('.cx-table th.sortable')) {
    th.addEventListener('click', () => {
      const key = th.getAttribute('data-sort');
      if (!key) return;
      if (sortKey === key) sortDir *= -1;
      else {
        sortKey = key;
        sortDir = key === 'usage' ? -1 : 1;
      }
      writeHash();
      renderRows();
    });
  }

  window.addEventListener('hashchange', () => {
    applyHash();
    if (!state) return;
    renderStats();
    renderDomainTiles();
    renderRows();
  });
}

async function load() {
  if (loading) return;
  loading = true;
  showSkeletons();
  try {
    const res = await fetch(STATE_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state = await res.json();
    applyHash();
    renderHero();
    renderStats();
    renderIssues();
    renderFilterOptions();
    renderDomainTiles();
    renderBoards();
    syncControls();
    renderRows();
    await renderGraphSummary();
  } catch (e) {
    showError(e);
    await renderGraphSummary();
  } finally {
    loading = false;
  }
}

function pollIntervalMs() {
  const meta = document.querySelector('meta[name="portal-poll-ms"]');
  const n = Number(meta?.content || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

bindFilters();
applyHash();
void load();

const pollMs = pollIntervalMs();
if (pollMs) {
  setInterval(() => {
    if (document.visibilityState === 'visible') void load();
  }, pollMs);
}
