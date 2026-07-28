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
import {
  readHashState,
  writeHashState,
  applyFilters,
  collectTypes,
  collectScopes,
  collectTags,
} from './search.js';
import { computeHealth, healthClass } from './health.js';
import { tenantRegistryPaths, resolveTenantId } from './components/sidebar.js';

const REGISTRY_FRESHNESS_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// ── DOM refs ─────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);

let tenantsCache = [];
let registrySource = 'snapshot';

// ── Fetch registry ───────────────────────────────────────────────────────

async function fetchRegistry(tenantId = resolveTenantId(), tenants = tenantsCache) {
  const paths = tenantRegistryPaths(tenantId, tenants);
  const attempts = [
    { mode: 'edge', url: paths.proxy },
    { mode: 'snapshot', url: paths.static },
  ];

  for (const { mode, url } of attempts) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('json') && !ct.includes('javascript')) continue;
      const data = await res.json();
      if (!data || typeof data !== 'object' || !data.packages) continue;
      registrySource = mode;
      return data;
    } catch {
      /* try next source */
    }
  }

  throw new Error('Cannot load registry from proxy or static snapshot.');
}

function updateRegistryBanner(mode) {
  const banner = $('registry-banner');
  const text = $('banner-text');
  const freshness = $('registry-freshness');
  if (!banner || !text || !freshness || !registryIndex) return;

  const updated = registryIndex.lastUpdated ? new Date(registryIndex.lastUpdated) : null;
  const updatedAt = updated && Number.isFinite(updated.getTime()) ? updated.getTime() : null;
  const ageMs = updatedAt === null ? null : Math.max(0, Date.now() - updatedAt);
  const stale = ageMs !== null && ageMs > REGISTRY_FRESHNESS_THRESHOLD_MS;
  const ageHours = ageMs === null ? null : Math.floor(ageMs / (60 * 60 * 1000));
  const ageLabel = ageHours === null
    ? 'age unknown'
    : ageHours < 1
      ? '<1h old'
      : ageHours < 48
        ? `${ageHours}h old`
        : `${Math.floor(ageHours / 24)}d old`;

  banner.dataset.source = mode;
  banner.dataset.freshness = ageMs === null ? 'unknown' : stale ? 'stale' : 'fresh';
  text.textContent = updatedAt !== null
    ? `${mode === 'edge' ? 'Edge' : 'Snapshot'} · updated ${updated.toLocaleDateString()} · ${updated.toLocaleTimeString()}`
    : mode === 'edge' ? 'Edge registry' : 'Registry snapshot';
  freshness.className = `registry-freshness registry-freshness--${banner.dataset.freshness}`;
  freshness.textContent = ageMs === null ? 'Unknown freshness' : `${stale ? 'Stale' : 'Fresh'} · ${ageLabel}`;
  freshness.title = updatedAt !== null
    ? `Registry data timestamp: ${updated.toLocaleString()}. Freshness threshold: 24 hours.`
    : 'Registry data does not include a valid last-updated timestamp.';
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

  updateFilterSummary(filtered.length, packages.length, state);
  focusedCardIndex = Math.min(focusedCardIndex, filtered.length - 1);

  if (filtered.length === 0) {
    focusedCardIndex = -1;
    grid.innerHTML = `<div class="pkg-no-results">
      <strong>No packages match this filter set.</strong>
      <button type="button" class="filter-clear filter-clear--empty">Clear filters</button>
    </div>`;
    grid.querySelector('.filter-clear')?.addEventListener('click', clearFilters);
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

  updateRegistryBanner(registrySource);
}

// ── Search & filter UI ─────────────────────────────────────────────────

function buildFilterUI(packages) {
  const types = collectTypes(packages);
  const scopes = collectScopes(packages);
  const tags = collectTags(packages);
  const state = readHashState();

  // Type chips
  const typeChips = $('filter-types');
  renderFilterChips(typeChips, types, 'type', state.types);

  // npm scope chips
  const scopeChips = $('filter-scopes');
  renderFilterChips(scopeChips, scopes, 'scope', state.scopes);

  // Sort
  $('sort-select').value = state.sort;

  $('sort-select').onchange = e => {
    const state = readHashState();
    state.sort = e.target.value;
    writeHashState(state);
  };
  $('clear-filters').onclick = clearFilters;

  // Restore search box from hash
  $('search').value = state.query;
  updateFilterSummary(
    applyFilters(packages, state).length,
    packages.length,
    state,
  );
}

function renderFilterChips(container, values, kind, selectedValues) {
  const fragment = document.createDocumentFragment();
  for (const value of values) {
    const active = selectedValues.includes(value);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `filter-chip${kind === 'scope' ? ' filter-chip--scope' : ''}${active ? ' active' : ''}`;
    button.dataset[kind] = value;
    button.setAttribute('aria-pressed', String(active));
    button.textContent = value;
    button.addEventListener('click', () => toggleFilter(kind, value));
    fragment.append(button);
  }
  container.replaceChildren(fragment);
}

function toggleFilter(kind, value) {
  const state = readHashState();
  const arr = kind === 'type' ? state.types : kind === 'scope' ? state.scopes : state.tags;
  const idx = arr.indexOf(value);
  if (idx === -1) arr.push(value);
  else arr.splice(idx, 1);
  writeHashState(state);
}

function hasActiveFilters(state) {
  return Boolean(state.query || state.types.length || state.scopes.length || state.tags.length);
}

function updateFilterSummary(filteredCount, totalCount, state) {
  const summary = $('filter-summary');
  const clear = $('clear-filters');
  if (!summary || !clear) return;

  const selectedScopes = state.scopes.length
    ? ` · ${state.scopes.length === 1 ? 'Scope' : 'Scopes'}: ${state.scopes.join(', ')}`
    : '';
  summary.textContent = `${filteredCount} of ${totalCount} ${totalCount === 1 ? 'package' : 'packages'}${selectedScopes}`;
  clear.disabled = !hasActiveFilters(state);
}

function clearFilters() {
  const hadHash = Boolean(window.location.hash);
  window.location.hash = '';
  $('search').value = '';
  focusedCardIndex = -1;
  if (!hadHash) syncFiltersFromHash();
  $('search').focus();
}

function syncFiltersFromHash() {
  if (!registryIndex) return;
  focusedCardIndex = -1;
  const packages = Object.entries(registryIndex.packages || {});
  buildFilterUI(packages);
  renderGrid(packages);
}

// ── Debounced search ────────────────────────────────────────────────────

let searchTimer = 0;

function debouncedSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const state = readHashState();
    state.query = $('search').value;
    writeHashState(state);
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

// ── Help overlay ───────────────────────────────────────────────────────

function toggleHelpOverlay() {
  const existing = document.getElementById('help-overlay');
  if (existing) {
    existing.remove();
    return;
  }
  document.body.insertAdjacentHTML('beforeend', `
    <div id="help-overlay" class="help-overlay" role="dialog" aria-label="Keyboard shortcuts">
      <div class="help-panel">
        <button type="button" class="help-close" aria-label="Close">&times;</button>
        <h2>Keyboard Shortcuts</h2>
        <table class="help-table">
          <tr><td><kbd>↓</kbd> <kbd>j</kbd></td><td>Next card</td></tr>
          <tr><td><kbd>↑</kbd> <kbd>k</kbd></td><td>Previous card</td></tr>
          <tr><td><kbd>Enter</kbd></td><td>Open detail modal</td></tr>
          <tr><td><kbd>Esc</kbd></td><td>Close modal / overlay</td></tr>
          <tr><td><kbd>c</kbd></td><td>Clear all filters</td></tr>
          <tr><td><kbd>/</kbd></td><td>Focus search</td></tr>
          <tr><td><kbd>g</kbd> <kbd>g</kbd></td><td>Scroll to top</td></tr>
          <tr><td><kbd>G</kbd></td><td>Scroll to bottom</td></tr>
          <tr><td><kbd>r</kbd></td><td>Refresh registry</td></tr>
          <tr><td><kbd>?</kbd> <kbd>h</kbd></td><td>Toggle this help</td></tr>
        </table>
      </div>
    </div>
  `);
  const overlay = document.getElementById('help-overlay');
  overlay?.querySelector('.help-close')?.addEventListener('click', () => overlay.remove());
  overlay?.addEventListener('click', e => {
    if (e.target === overlay) overlay.remove();
  });
}

// ── Init ────────────────────────────────────────────────────────────────

async function reloadRegistry(tenantId, tenants) {
  const data = await fetchRegistry(tenantId, tenants);
  registryIndex = data;
  $('loading')?.classList.add('hidden');
  $('dashboard')?.classList.remove('hidden');
  $('error-banner')?.classList.add('hidden');
  renderAll(data);
}

async function init() {
  try {
    await reloadRegistry(resolveTenantId(), tenantsCache);

    document.addEventListener('portal:tenant', async e => {
      const { tenantId, tenants } = e.detail || {};
      if (tenants?.length) tenantsCache = tenants;
      if (!tenantId) return;
      $('loading')?.classList.remove('hidden');
      try {
        await reloadRegistry(tenantId, tenantsCache);
      } catch (err) {
        $('error-banner')?.classList.remove('hidden');
        $('error-text').textContent = err.message;
      }
    });

    $('search').addEventListener('input', debouncedSearch);
    window.addEventListener('hashchange', syncFiltersFromHash);

    // Deep-link: auto-open modal if hash contains project=foo
    const hashState = readHashState();
    const deepProject = hashState.query?.startsWith?.('project:')
      ? hashState.query.replace('project:', '')
      : hashState.project;
    if (deepProject && registryIndex?.packages?.[deepProject]) {
      showDetail(deepProject, registryIndex.packages[deepProject]);
    }

    // ── Keyboard navigation ──────────────────────────────────────────

    let lastKey = '';
    let lastKeyTime = 0;

    document.addEventListener('keydown', e => {
      // Don't intercept when typing in input fields
      if (e.target.matches('input, textarea, select, button, [contenteditable="true"]')) return;
      if (e.metaKey || e.ctrlKey) return;

      const cardCount = document.querySelectorAll('.pkg-card').length;
      const modal = document.getElementById('detail-overlay');

      // Modal is open — only handle Escape
      if (modal) {
        if (e.key === 'Escape') modal.querySelector('.detail-close')?.click();
        return;
      }

      switch (true) {
        // Navigation
        case e.key === 'ArrowDown' || e.key === 'j':
          e.preventDefault();
          focusedCardIndex = Math.min(focusedCardIndex + 1, Math.max(cardCount - 1, 0));
          updateCardFocus();
          break;
        case e.key === 'ArrowUp' || e.key === 'k':
          e.preventDefault();
          focusedCardIndex = Math.max(focusedCardIndex - 1, 0);
          updateCardFocus();
          break;
        case e.key === 'Enter' && focusedCardIndex >= 0:
          e.preventDefault();
          openFocusedCard();
          break;
        // Clear filters (mirrors Bun dev server's c + Enter)
        case e.key === 'c':
          e.preventDefault();
          clearFilters();
          break;
        // Quick search focus
        case e.key === '/' && !e.target.closest('input'):
          e.preventDefault();
          $('search').focus();
          break;
        // Scroll
        case e.key === 'g':
          if (lastKey === 'g' && Date.now() - lastKeyTime < 400) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            lastKey = '';
          }
          break;
        case e.key === 'G':
          e.preventDefault();
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          break;
        // Help overlay
        case e.key === '?':
        case e.key === 'h':
          e.preventDefault();
          toggleHelpOverlay();
          break;
        // Refresh
        case e.key === 'r':
          e.preventDefault();
          location.reload();
          break;
      }

      if (e.key === 'g') {
        lastKey = 'g';
        lastKeyTime = Date.now();
      } else if (e.key !== 'Shift') {
        lastKey = '';
      }
    });
  } catch (err) {
    $('loading').classList.add('hidden');
    $('error-banner').classList.remove('hidden');
    $('error-text').textContent = err.message;
  }
}

document.addEventListener('DOMContentLoaded', init);
