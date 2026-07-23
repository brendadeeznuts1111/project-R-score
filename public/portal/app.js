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

let healthFailures = 0;
let lastHealthState = 'unknown';
const HEALTH_FAIL_THRESHOLD = 2;

function setHealth(klass, label) {
  const dot = $('health-dot');
  const lbl = $('health-label');
  if (dot) dot.className = `health-dot ${klass}`;
  if (lbl) {
    const failures = healthFailures > 0 ? ` · ${healthFailures} missed` : '';
    lbl.textContent = `${label}${failures}`;
  }
  lastHealthState = klass;
}

/** Stale-while-revalidate: only downgrade after N consecutive failures. */
function updateHealth(healthy) {
  if (healthy) {
    healthFailures = 0;
    setHealth('ok', 'Live');
  } else {
    healthFailures++;
    if (healthFailures >= HEALTH_FAIL_THRESHOLD) {
      setHealth('degraded', 'Degraded');
    } else if (lastHealthState === 'ok') {
      setHealth('ok', 'Live'); // keep showing ok with missed count
    }
  }
}

// ── Debounced search ────────────────────────────────────────────────────

let searchTimer = 0;

function debouncedSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const state = readHashState();
    state.query = $('search').value;
    writeHashState(state);
    renderGrid(Object.entries(registryIndex.packages || {}));
  }, 200);
}

// ── Keyboard nav ────────────────────────────────────────────────────────

let focusedCardIndex = -1;

function updateCardFocus() {
  const cards = document.querySelectorAll('.pkg-card');
  cards.forEach((c, i) => {
    c.classList.toggle('focused', i === focusedCardIndex);
    if (i === focusedCardIndex) c.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}

function openFocusedCard() {
  const cards = document.querySelectorAll('.pkg-card');
  const card = cards[focusedCardIndex];
  if (!card) return;
  const name = card.dataset.name;
  const info = registryIndex?.packages?.[name];
  if (info) showDetail(name, info);
}

// ── Init ────────────────────────────────────────────────────────────────

async function init() {
  try {
    const data = await fetchRegistry();
    $('loading').classList.add('hidden');
    $('dashboard').classList.remove('hidden');
    renderAll(data);

    // Debounced search
    $('search').addEventListener('input', debouncedSearch);

    // Deep-link: auto-open modal if hash contains project=foo
    const hashState = readHashState();
    const deepProject = hashState.query?.startsWith?.('project:')
      ? hashState.query.replace('project:', '')
      : new URLSearchParams(window.location.hash.slice(1)).get('project');
    if (deepProject && registryIndex?.packages?.[deepProject]) {
      showDetail(deepProject, registryIndex.packages[deepProject]);
    }

    // Keyboard nav
    document.addEventListener('keydown', e => {
      if (document.getElementById('detail-overlay')) return; // modal handles own keys
      const cardCount = document.querySelectorAll('.pkg-card').length;
      if (!cardCount) return;
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        focusedCardIndex = Math.min(focusedCardIndex + 1, cardCount - 1);
        updateCardFocus();
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        focusedCardIndex = Math.max(focusedCardIndex - 1, 0);
        updateCardFocus();
      } else if (e.key === 'Enter' && focusedCardIndex >= 0) {
        e.preventDefault();
        openFocusedCard();
      }
    });

    // Poll health every 30s with stale-while-revalidate
    setInterval(async () => {
      try {
        const res = await fetch('/api/registry/registry.json',
          { signal: AbortSignal.timeout(3000) });
        updateHealth(res.ok);
      } catch {
        updateHealth(false);
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
