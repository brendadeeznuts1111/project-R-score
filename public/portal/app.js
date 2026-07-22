/**
 * Portal app — orchestrator. Fetches registry, delegates rendering to
 * card.js, filter state to search.js, health to health.js.
 *
 * Data sources (tried in order):
 *   1. Pages Function proxy: /api/registry/registry.json (R2 binding)
 *   2. Static fallback: /registry/registry.json (build snapshot)
 *
 * Never call r2.cloudflarestorage.com from the browser — credentials stay
 * on the edge (claim factory-registry-pages-proxy-v1).
 */

import { renderCard, showDetail } from './card.js';
import { readHashState, writeHashState, applyFilters, collectTypes, collectTags } from './search.js';
import { computeHealth, healthClass } from './health.js';

// ── DOM refs ─────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);

// ── Fetch registry ───────────────────────────────────────────────────────

async function fetchRegistry() {
  // 1. Pages Function proxy (R2 binding, allowlisted keys, edge-cached)
  try {
    const res = await fetch('/api/registry/registry.json',
      { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      setHealth('ok', 'Live');
      return await res.json();
    }
  } catch { /* fall through */ }

  // 2. Static snapshot fallback (no credentials in browser)
  try {
    const res = await fetch('/registry/registry.json',
      { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      setHealth('degraded', 'Snapshot');
      return await res.json();
    }
  } catch { /* fall through */ }

  throw new Error('Cannot load registry from proxy or static snapshot.');
}

// ── Render pipeline ──────────────────────────────────────────────────────

let registryIndex = null;

function renderAll(data) {
  registryIndex = data;
  const packages = Object.entries(data.packages || {});
  $('pkg-count').textContent = packages.length;

  updateStats(packages);
  buildFilterUI(packages);
  renderGrid(packages);
}

function renderGrid(packages) {
  const state = readHashState();
  const filtered = applyFilters(packages, state);
  const grid = $('package-grid');

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="pkg-no-results">No packages match</div>`;
    return;
  }

  grid.innerHTML = filtered.map(([name, info]) => renderCard(name, info)).join('');

  // Wire click handlers
  grid.querySelectorAll('.pkg-card').forEach(card => {
    card.addEventListener('click', e => {
      // Don't trigger detail if clicking detail button itself (handled below)
      if (e.target.closest('.pkg-detail-btn')) return;
    });
  });
  grid.querySelectorAll('.pkg-detail-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const name = btn.dataset.name;
      const info = registryIndex.packages[name];
      if (info) showDetail(name, info);
    });
  });

  updateUrlFromState(state);
}

function updateStats(packages) {
  const allVersions = packages.reduce((sum, [, info]) =>
    sum + (info.releases ? Object.keys(info.releases).length : info.versions.length), 0);
  const types = new Set();
  let totalHealth = 0;
  for (const [, info] of packages) {
    const r = info.releases?.[String(info['dist-tags']?.latest)];
    if (r?.type) types.add(r.type);
    totalHealth += computeHealth(r, info.versions?.length || 0).score;
  }
  const avgHealth = packages.length ? Math.round(totalHealth / packages.length) : 0;

  $('stat-packages').innerHTML = `${packages.length} <span>packages</span>`;
  $('stat-versions').innerHTML = `${allVersions} <span>versions</span>`;
  $('stat-types').innerHTML = `${types.size} <span>types</span>`;
  $('stat-health').innerHTML = `${avgHealth}/100 <span>avg health</span>`;
}

// ── Search & filter UI ─────────────────────────────────────────────────

function buildFilterUI(packages) {
  const types = collectTypes(packages);
  const tags = collectTags(packages);
  const state = readHashState();

  // Type chips
  const typeChips = $('filter-types');
  typeChips.innerHTML = types.map(t => {
    const active = state.types.includes(t);
    return `<button class="filter-chip ${active ? 'active' : ''}" data-type="${t}">${t}</button>`;
  }).join('');

  // Sort
  $('sort-select').value = state.sort;

  // Events
  typeChips.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => toggleFilter('type', btn.dataset.type));
  });

  $('sort-select').addEventListener('change', e => {
    const state = readHashState();
    state.sort = e.target.value;
    writeHashState(state);
    renderGrid(Object.entries(registryIndex.packages || {}));
  });

  $('search').addEventListener('input', e => {
    const state = readHashState();
    state.query = e.target.value;
    writeHashState(state);
    renderGrid(Object.entries(registryIndex.packages || {}));
  });

  // Restore search box from hash
  $('search').value = state.query;
}

function toggleFilter(kind, value) {
  const state = readHashState();
  const arr = kind === 'type' ? state.types : state.tags;
  const idx = arr.indexOf(value);
  if (idx === -1) arr.push(value);
  else arr.splice(idx, 1);
  writeHashState(state);
  renderGrid(Object.entries(registryIndex.packages || {}));
  buildFilterUI(Object.entries(registryIndex.packages || {}));
}

function updateUrlFromState(state) {
  writeHashState(state);
}

// ── Health indicator ────────────────────────────────────────────────────

function setHealth(klass, label) {
  const dot = $('health-dot');
  const lbl = $('health-label');
  if (dot) dot.className = `health-dot ${klass}`;
  if (lbl) lbl.textContent = label;
}

// ── Init ────────────────────────────────────────────────────────────────

async function init() {
  try {
    const data = await fetchRegistry();
    $('loading').classList.add('hidden');
    $('dashboard').classList.remove('hidden');
    renderAll(data);

    // Poll health every 30s
    setInterval(async () => {
      try {
        const res = await fetch('/api/registry/registry.json',
          { signal: AbortSignal.timeout(3000) });
        if (res.ok) setHealth('ok', 'Live');
        else setHealth('degraded', 'Slow');
      } catch {
        setHealth('degraded', 'Offline');
      }
    }, 30_000);
  } catch (err) {
    $('loading').classList.add('hidden');
    $('error-banner').classList.remove('hidden');
    $('error-text').textContent = err.message;
    setHealth('fail', 'Offline');
  }
}

document.addEventListener('DOMContentLoaded', init);
