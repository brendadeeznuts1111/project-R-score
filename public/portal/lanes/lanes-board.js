/**
 * Workspace lane cross-map board — reads /registry/workspace-lane-map.json.
 * @see docs/harness/tenants/workspace-lane-cross-map.md
 */
import { bindCopyButtons } from '../copy-cli.js';
import { fetchJsonResult } from '../fetch-json.js';

const STATE_URL = '/registry/workspace-lane-map.json';

/** @type {any} */
let state = null;
let query = '';
let chromeFilter = '';
let conceptFilter = '';

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

function chips(values) {
  if (!values?.length) return '<span class="dim">—</span>';
  return values.map(v => `<code class="lane-chip">${esc(v)}</code>`).join(' ');
}

function parseHash(hash = location.hash) {
  const params = new URLSearchParams(String(hash).replace(/^#/, ''));
  return {
    q: params.get('q') || '',
    chrome: params.get('chrome') || '',
    concept: params.get('concept') || '',
  };
}

function writeHash() {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (chromeFilter) params.set('chrome', chromeFilter);
  if (conceptFilter) params.set('concept', conceptFilter);
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
  chromeFilter = h.chrome;
  conceptFilter = h.concept;
  syncControls();
}

function syncControls() {
  const qEl = $('lanes-q');
  const chrome = $('lanes-chrome');
  const concept = $('lanes-concept');
  const clear = $('lanes-clear');
  if (qEl && qEl.value !== query) qEl.value = query;
  if (chrome) chrome.value = chromeFilter;
  if (concept) concept.value = conceptFilter;
  if (clear) clear.disabled = !(query || chromeFilter || conceptFilter);
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

function laneLabel(id) {
  const row = (state?.sessionLanes ?? []).find(l => l.id === id);
  return row?.display ?? id;
}

function filteredCorrelations() {
  const q = query.toLowerCase().trim();
  return (state?.correlations ?? []).filter(row => {
    if (chromeFilter && !(row.chromeDomains ?? []).includes(chromeFilter)) return false;
    if (conceptFilter && !(row.conceptDomains ?? []).includes(conceptFilter)) return false;
    if (!q) return true;
    const hay = [
      row.sessionLane,
      laneLabel(row.sessionLane),
      ...(row.chromeDomains ?? []),
      ...(row.conceptDomains ?? []),
      ...(row.commitScopeHints ?? []),
      row.rationale ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}

function renderStats() {
  const el = $('lanes-stats');
  if (!el || !state) return;
  el.innerHTML = [
    ['Session lanes', state.sessionLanes?.length ?? 0],
    ['Chrome domains', state.chromeDomains?.length ?? 0],
    ['Concept domains', state.conceptDomains?.length ?? 0],
    ['Correlations', state.correlations?.length ?? 0],
  ]
    .map(
      ([label, n]) =>
        `<div class="portal-stat"><span class="portal-stat-value">${esc(n)}</span><span class="portal-stat-label">${esc(label)}</span></div>`
    )
    .join('');
}

function renderTable() {
  const tbody = $('lanes-rows');
  const count = $('lanes-count');
  if (!tbody) return;
  const rows = filteredCorrelations();
  if (count) count.textContent = `${rows.length} row${rows.length === 1 ? '' : 's'}`;
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="dim">No correlations match filters.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows
    .map(
      row => `<tr>
      <td><code>${esc(row.sessionLane)}</code><div class="dim">${esc(laneLabel(row.sessionLane))}</div></td>
      <td>${chips(row.chromeDomains)}</td>
      <td>${chips(row.conceptDomains)}</td>
      <td>${chips(row.commitScopeHints)}</td>
      <td>${esc(row.rationale)}</td>
    </tr>`
    )
    .join('');
}

function renderMeta() {
  const gate = $('lanes-gate');
  const meta = $('lanes-meta');
  if (!state) return;
  if (gate) {
    const ok = state.kind === 'workspace-lane-map' && state.principle === 'correlations-not-containment';
    gate.textContent = ok ? 'correlations · not containment' : 'unexpected schema';
    gate.className = `portal-gate ${ok ? 'ok' : 'warn'}`;
  }
  if (meta) {
    meta.textContent = `baked ${ageLabel(state.bakedAt)} · claim ${state.claim ?? '—'}`;
  }
}

function bindControls() {
  $('lanes-q')?.addEventListener('input', e => {
    query = e.target.value;
    writeHash();
    renderTable();
    syncControls();
  });
  $('lanes-chrome')?.addEventListener('change', e => {
    chromeFilter = e.target.value;
    writeHash();
    renderTable();
    syncControls();
  });
  $('lanes-concept')?.addEventListener('change', e => {
    conceptFilter = e.target.value;
    writeHash();
    renderTable();
    syncControls();
  });
  $('lanes-clear')?.addEventListener('click', () => {
    query = '';
    chromeFilter = '';
    conceptFilter = '';
    writeHash();
    syncControls();
    renderTable();
  });
  window.addEventListener('hashchange', () => {
    applyHash();
    renderTable();
  });
}

async function load() {
  const err = $('lanes-error');
  const result = await fetchJsonResult(STATE_URL);
  if (!result.ok) {
    if (err) {
      err.hidden = false;
      err.textContent = `Failed to load ${STATE_URL}: ${result.error ?? 'unknown'}`;
    }
    return;
  }
  state = result.data;
  if (err) err.hidden = true;

  const chromeIds = new Set((state.chromeDomains ?? []).map(d => d.id));
  const conceptIds = new Set((state.conceptDomains ?? []).map(d => d.id));
  for (const row of state.correlations ?? []) {
    for (const c of row.chromeDomains ?? []) chromeIds.add(c);
    for (const c of row.conceptDomains ?? []) conceptIds.add(c);
  }
  fillSelect($('lanes-chrome'), chromeIds, 'all chrome');
  fillSelect($('lanes-concept'), conceptIds, 'all concepts');

  applyHash();
  renderMeta();
  renderStats();
  renderTable();
  bindCopyButtons(document);
}

bindControls();
load();
