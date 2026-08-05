/**
 * Bookmakers registry board — bake-driven table + filters.
 *
 * @see docs/portal-foundation.md
 * @see docs/harness/tenants/bookmakers-registry.md
 * @see public/portal/bookmakers.md
 */

import { bindCopyButtons } from '../copy-cli.js';
import { bootGlossaryUx } from '../components/glossary-ux.js';

export const REGISTRY_URL = '/registry/bookmakers.json';
export const GLOSSARY_URL = '/registry/domain-glossary.json';
const POLL_MS = 60_000;

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}

/** Normalize bake map or list into sorted book rows. */
export function normalizeBooks(payload) {
  const raw = payload?.bookmakers;
  let list = [];
  if (Array.isArray(raw)) list = raw;
  else if (raw && typeof raw === 'object') list = Object.values(raw);
  return list
    .filter(b => b && typeof b === 'object')
    .map(b => ({
      id: String(b.id || ''),
      label: String(b.label || b.id || ''),
      domain: String(b.domain || ''),
      fetcherType: String(b.fetcherType || b.fetcher || ''),
      supportedSports: Array.isArray(b.supportedSports) ? b.supportedSports.map(String) : [],
      regions: Array.isArray(b.regions) ? b.regions : [],
      color: b.color ? String(b.color) : '',
      restBaseUrl: b.restBaseUrl ? String(b.restBaseUrl) : '',
      envVars: Array.isArray(b.envVars) ? b.envVars.map(String) : [],
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Region chips: {country, stateCode?} | string. */
export function formatRegion(region) {
  if (region == null) return '';
  if (typeof region === 'string') return region;
  if (typeof region === 'object') {
    const country = region.country || region.countryCode || '';
    const state = region.stateCode || region.state || '';
    if (country && state) return `${country}-${state}`;
    return String(country || state || JSON.stringify(region));
  }
  return String(region);
}

export function bookStatus(book) {
  if (book.id && book.domain && book.fetcherType) return 'ok';
  return 'incomplete';
}

export function filterBooks(books, { fetcher = 'all', q = '' } = {}) {
  const query = String(q || '')
    .trim()
    .toLowerCase();
  const fetcherKey = String(fetcher || 'all').toLowerCase();
  return books.filter(b => {
    if (fetcherKey !== 'all' && String(b.fetcherType).toLowerCase() !== fetcherKey) return false;
    if (!query) return true;
    const hay = [b.id, b.label, b.domain, b.fetcherType, ...(b.supportedSports || [])]
      .join(' ')
      .toLowerCase();
    return hay.includes(query);
  });
}

export function countByFetcher(books) {
  const counts = { all: books.length, rest: 0, webview: 0, seat: 0, other: 0 };
  for (const b of books) {
    const t = String(b.fetcherType || '').toLowerCase();
    if (t === 'rest' || t === 'webview' || t === 'seat') counts[t] += 1;
    else if (t) counts.other += 1;
  }
  return counts;
}

export function uniqueSports(books) {
  const set = new Set();
  for (const b of books) for (const s of b.supportedSports || []) set.add(s);
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function fmtRel(iso) {
  if (!iso) return null;
  const t = Date.parse(String(iso));
  if (!Number.isFinite(t)) return null;
  const sec = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (sec < 45) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export function sportsChipsHtml(sports, glossaryIds) {
  return (sports || [])
    .map(s => {
      const concept = `sport.${s}`;
      const wired = glossaryIds && glossaryIds.has(concept);
      return wired
        ? `<a class="chip" data-glossary-concept="${esc(concept)}" href="/portal/glossary/#glossary:${esc(concept)}">${esc(s)}</a>`
        : `<span class="chip">${esc(s)}</span>`;
    })
    .join('');
}

export function regionsHtml(regions) {
  const parts = (regions || []).map(formatRegion).filter(Boolean);
  if (!parts.length) return '<span class="dim">—</span>';
  return parts.map(r => `<span class="chip chip-muted">${esc(r)}</span>`).join('');
}

export function rowHtml(book, glossaryIds) {
  const status = bookStatus(book);
  const color = book.color
    ? `<span class="dot" style="background:${esc(book.color)}" title="${esc(book.color)}"></span>`
    : '';
  const domainCell = book.domain
    ? `<a class="domain-link" href="https://${esc(book.domain.replace(/^https?:\/\//, ''))}" target="_blank" rel="noopener noreferrer"><code>${esc(book.domain)}</code></a>`
    : '<span class="dim">—</span>';
  const fetcher = book.fetcherType
    ? `<span class="fetcher-pill fetcher-${esc(book.fetcherType)}">${esc(book.fetcherType)}</span>`
    : '<span class="dim">—</span>';
  return `<tr data-id="${esc(book.id)}" data-fetcher="${esc(book.fetcherType)}">
    <td class="col-id">${color}<code>${esc(book.id || '?')}</code></td>
    <td>${esc(book.label || '?')}</td>
    <td>${domainCell}</td>
    <td>${fetcher}</td>
    <td class="col-sports">${sportsChipsHtml(book.supportedSports, glossaryIds)}</td>
    <td class="col-regions">${regionsHtml(book.regions)}</td>
    <td class="${status === 'ok' ? 'state-ok' : 'state-err'}">${status}</td>
  </tr>`;
}

export function statsHtml(summary, counts) {
  const s = summary || {};
  const rows = [
    { k: 'Books', v: s.count ?? counts.all, hint: 'registry rows', tone: 'muted' },
    { k: 'Webview', v: s.webview ?? counts.webview, hint: 'browser fetcher', tone: 'muted' },
    { k: 'REST', v: s.rest ?? counts.rest, hint: 'API fetcher', tone: 'muted' },
    { k: 'Seat', v: s.seat ?? counts.seat, hint: 'seat / soft books', tone: 'muted' },
    {
      k: 'Sports',
      v: Array.isArray(s.sports) ? s.sports.length : uniqueSports([]).length,
      hint: 'unique sports',
      tone: 'muted',
    },
  ];
  return rows
    .map(
      r => `<div class="portal-stat ${esc(r.tone)}">
        <div class="k">${esc(r.k)}</div>
        <div class="v">${esc(r.v)}</div>
        <div class="hint">${esc(r.hint)}</div>
      </div>`
    )
    .join('');
}

export async function loadGlossarySportIds() {
  const ids = new Set();
  try {
    const res = await fetch(GLOSSARY_URL, { headers: { Accept: 'application/json' } });
    if (!res.ok) return ids;
    const payload = await res.json();
    const entries = Array.isArray(payload)
      ? payload
      : (payload.entries ?? payload.concepts ?? []);
    for (const e of entries) {
      if (e && typeof e.id === 'string') ids.add(e.id);
    }
  } catch {
    /* plain chips */
  }
  return ids;
}

export async function fetchBake() {
  const res = await fetch(REGISTRY_URL, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function setGate(el, { ok, label }) {
  if (!el) return;
  el.className = `portal-gate ${ok ? 'ok' : 'bad'}`;
  el.innerHTML = `<span class="dot" aria-hidden="true"></span>${esc(label)}`;
}

export function initBookmakersBoard(root = document) {
  const metaEl = root.getElementById('bookmakers-meta');
  const bodyEl = root.getElementById('bookmakers-body');
  const countEl = root.getElementById('bookmakers-count');
  const statsEl = root.getElementById('bookmakers-stats');
  const sportsEl = root.getElementById('bookmakers-sports');
  const gateEl = root.getElementById('bookmakers-gate');
  const bakedEl = root.getElementById('bookmakers-baked');
  const filterEl = root.getElementById('bookmakers-filter');
  const searchEl = root.getElementById('bookmakers-search');
  const shownEl = root.getElementById('bookmakers-shown');
  if (!metaEl || !bodyEl) return;

  bindCopyButtons(root);

  let books = [];
  let glossaryIds = new Set();
  let summary = {};
  let artifact = {};
  let audit = { ok: true, issues: [] };
  let generatedAt = null;

  const paint = () => {
    const fetcher = filterEl?.value || 'all';
    const q = searchEl?.value || '';
    const filtered = filterBooks(books, { fetcher, q });
    const counts = countByFetcher(books);

    if (countEl) countEl.textContent = String(books.length);
    if (shownEl) {
      shownEl.textContent =
        filtered.length === books.length
          ? `${books.length} books`
          : `${filtered.length}/${books.length} shown`;
    }

    if (statsEl) {
      const sports = uniqueSports(books);
      statsEl.innerHTML = statsHtml(
        {
          ...summary,
          sports: summary.sports?.length ? summary.sports : sports,
        },
        counts
      );
    }

    if (sportsEl) {
      const sports = Array.isArray(summary.sports) && summary.sports.length
        ? summary.sports
        : uniqueSports(books);
      sportsEl.innerHTML = sports.length
        ? sportsChipsHtml(sports, glossaryIds)
        : '<span class="dim">No sports listed</span>';
    }

    const rel = fmtRel(generatedAt);
    if (bakedEl) {
      bakedEl.textContent = [
        artifact.version ? `v${artifact.version}` : null,
        rel ? `baked ${rel}` : generatedAt || null,
        artifact.source || null,
      ]
        .filter(Boolean)
        .join(' · ');
    }

    setGate(gateEl, {
      ok: audit.ok !== false,
      label: audit.ok === false ? 'audit fail' : 'audit ok',
    });

    metaEl.innerHTML = [
      `name <b>${esc(artifact.name ?? '?')}</b>`,
      `version <b>${esc(artifact.version ?? '?')}</b>`,
      artifact.checksum
        ? `checksum <code title="${esc(artifact.checksum)}">${esc(artifact.checksum.slice(0, 12))}…</code>`
        : null,
      generatedAt ? `generated <code>${esc(generatedAt)}</code>` : null,
      artifact.source ? `source <code>${esc(artifact.source)}</code>` : null,
      audit.ok !== false
        ? `<span class="state-ok">audit ok</span>`
        : `<span class="state-err">audit: ${esc((audit.issues || []).join('; ') || 'failed')}</span>`,
    ]
      .filter(Boolean)
      .join(' · ');

    if (filtered.length === 0) {
      bodyEl.innerHTML =
        '<tr><td colspan="7" class="dim">No books match this filter</td></tr>';
    } else {
      bodyEl.innerHTML = filtered.map(b => rowHtml(b, glossaryIds)).join('');
    }
    bootGlossaryUx();
  };

  async function refresh() {
    try {
      const payload = await fetchBake();
      glossaryIds = await loadGlossarySportIds();
      books = normalizeBooks(payload);
      summary = payload.summary || {};
      artifact = payload.artifact || {};
      audit = payload.audit || { ok: true, issues: [] };
      generatedAt = payload.generatedAt || null;
      paint();
    } catch (err) {
      setGate(gateEl, { ok: false, label: 'load failed' });
      if (metaEl) {
        metaEl.innerHTML = `<span class="state-err">load failed: ${esc(err.message)}</span>`;
      }
      if (bodyEl) {
        bodyEl.innerHTML = `<tr><td colspan="7" class="state-err">${esc(err.message)}</td></tr>`;
      }
    }
  }

  filterEl?.addEventListener('change', paint);
  searchEl?.addEventListener('input', paint);
  root.getElementById('bookmakers-refresh')?.addEventListener('click', e => {
    e.preventDefault();
    void refresh();
  });

  void refresh();
  setInterval(() => void refresh(), POLL_MS);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initBookmakersBoard());
  } else {
    initBookmakersBoard();
  }
}
