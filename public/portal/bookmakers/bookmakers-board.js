/**
 * Bookmakers registry board — bake-driven table + filters.
 *
 * @see docs/portal-foundation.md
 * @see docs/harness/tenants/bookmakers-registry.md
 * @see public/portal/bookmakers.md
 */

import { bindCopyButtons } from '../copy-cli.js';
import { bootGlossaryUx } from '../components/glossary-ux.js';
import {
  escHtml,
  renderPortalStatGrid,
  renderPortalTableRows,
  renderPortalToolbar,
} from '../components/portal-ui.js';

export const REGISTRY_URL = '/registry/bookmakers.json';
export const DESK_COVERAGE_URL = '/registry/bookmakers-desk-coverage.json';
export const GLOSSARY_URL = '/registry/domain-glossary.json';
const POLL_MS = 60_000;

/** Column contract for the main books table (static thead in index.html). */
export const BOOK_COLS = [
  { key: 'id', label: 'ID' },
  { key: 'label', label: 'Label' },
  { key: 'domain', label: 'Domain' },
  { key: 'fetcher', label: 'Fetcher' },
  { key: 'maxBet', label: 'Max bet' },
  { key: 'lifecycle', label: 'Lifecycle' },
  { key: 'sports', label: 'Sports' },
  { key: 'regions', label: 'Regions' },
  { key: 'status', label: 'Status' },
];

/** @deprecated prefer escHtml from portal-ui — kept as board export for tests */
export function esc(value) {
  return escHtml(value);
}

/** Domain from v0.3 `domain` or v0.4 `urls.web`. */
export function bookDomain(b) {
  if (b?.domain) return String(b.domain).replace(/^https?:\/\//i, '');
  const web = b?.urls?.web;
  if (typeof web === 'string' && web) {
    try {
      return new URL(web).host;
    } catch {
      return web.replace(/^https?:\/\//i, '').replace(/\/$/, '');
    }
  }
  return '';
}

/** Normalize bake map or list into sorted book rows (v0.3 + v0.4). */
export function normalizeBooks(payload) {
  const raw = payload?.bookmakers;
  let list = [];
  if (Array.isArray(raw)) list = raw;
  else if (raw && typeof raw === 'object') list = Object.values(raw);
  return list
    .filter(b => b && typeof b === 'object')
    .map(b => {
      const id = String(b.id || b.slug || '');
      const slug = String(b.slug || b.id || '');
      const sports = Array.isArray(b.sports)
        ? b.sports.map(String)
        : Array.isArray(b.supportedSports)
          ? b.supportedSports.map(String)
          : [];
      return {
        id,
        slug,
        label: String(b.label || id),
        skin: b.skin ? String(b.skin) : '',
        brandGroup: b.brandGroup ? String(b.brandGroup) : '',
        domain: bookDomain(b),
        fetcherType: String(b.fetcher || b.fetcherType || ''),
        supportedSports: sports,
        regions: Array.isArray(b.regions) ? b.regions : [],
        color: b.color ? String(b.color) : '',
        lifecycle: Array.isArray(b.lifecycle) ? b.lifecycle.map(String) : [],
        liquidityTier: b.limits?.liquidityTier ? String(b.limits.liquidityTier) : '',
        maxBetUsd:
          typeof b.limits?.maxBetUsd === 'number' && Number.isFinite(b.limits.maxBetUsd)
            ? b.limits.maxBetUsd
            : null,
        minBetUsd:
          typeof b.limits?.minBetUsd === 'number' && Number.isFinite(b.limits.minBetUsd)
            ? b.limits.minBetUsd
            : null,
        note: b.note ? String(b.note) : '',
      };
    })
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

/** v0.4 mode A: id is the route slug (id === slug). */
export function slugEqualsId(book) {
  if (!book?.id) return false;
  if (!book.slug) return true; // v0.3: id alone is the slug
  return book.id === book.slug;
}

export function filterBooks(books, { fetcher = 'all', tier = 'all', q = '' } = {}) {
  const query = String(q || '')
    .trim()
    .toLowerCase();
  const fetcherKey = String(fetcher || 'all').toLowerCase();
  const tierKey = String(tier || 'all').toLowerCase();
  return books.filter(b => {
    if (fetcherKey !== 'all' && String(b.fetcherType).toLowerCase() !== fetcherKey) return false;
    if (tierKey !== 'all' && String(b.liquidityTier || '').toLowerCase() !== tierKey) return false;
    if (!query) return true;
    const hay = [
      b.id,
      b.slug,
      b.label,
      b.skin,
      b.brandGroup,
      b.domain,
      b.fetcherType,
      b.liquidityTier,
      b.maxBetUsd != null ? String(b.maxBetUsd) : '',
      ...(b.supportedSports || []),
      ...(b.lifecycle || []),
    ]
      .join(' ')
      .toLowerCase();
    return hay.includes(query);
  });
}

export function lifecycleChipsHtml(modes) {
  return (modes || [])
    .map(m => `<span class="portal-chip portal-chip--muted">${esc(m)}</span>`)
    .join('');
}

export function formatMaxBet(n) {
  if (n == null || !Number.isFinite(Number(n))) return null;
  return `$${Number(n).toLocaleString('en-US')}`;
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
        ? `<a class="portal-chip" data-glossary-concept="${esc(concept)}" href="/portal/glossary/#glossary:${esc(concept)}">${esc(s)}</a>`
        : `<span class="portal-chip">${esc(s)}</span>`;
    })
    .join('');
}

export function regionsHtml(regions) {
  const parts = (regions || []).map(formatRegion).filter(Boolean);
  if (!parts.length) return '<span class="dim">—</span>';
  return parts.map(r => `<span class="portal-chip portal-chip--muted">${esc(r)}</span>`).join('');
}

/** Cell fragments for one book row (shared with `rowHtml` / paint). */
export function bookCells(book, glossaryIds) {
  const status = bookStatus(book);
  const color = book.color
    ? `<span class="portal-dot" style="background:${esc(book.color)}" title="${esc(book.color)}"></span>`
    : '';
  const brandBits = [
    book.skin ? `<div class="book-skin">${esc(book.skin)}</div>` : '',
    book.brandGroup ? `<div class="book-brand dim">${esc(book.brandGroup)}</div>` : '',
  ].join('');
  const domainCell = book.domain
    ? `<a class="domain-link" href="https://${esc(book.domain.replace(/^https?:\/\//, ''))}" target="_blank" rel="noopener noreferrer"><code>${esc(book.domain)}</code></a>`
    : '<span class="dim">—</span>';
  const fetcher = book.fetcherType
    ? `<span class="portal-pill portal-pill--${esc(book.fetcherType)}">${esc(book.fetcherType)}</span>`
    : '<span class="dim">—</span>';
  const tier = book.liquidityTier
    ? `<div class="dim" style="margin-top:4px;font-size:11px">${esc(book.liquidityTier)}</div>`
    : '';
  const maxBet = formatMaxBet(book.maxBetUsd);
  const maxCell = maxBet
    ? `<span class="max-bet">${esc(maxBet)}</span>`
    : '<span class="dim">—</span>';
  const life = lifecycleChipsHtml(book.lifecycle);
  return [
    { html: `${color}<code>${esc(book.id || '?')}</code>`, className: 'col-id' },
    { html: `<div class="book-label">${esc(book.label || '?')}</div>${brandBits}` },
    { html: domainCell },
    { html: `${fetcher}${tier}` },
    { html: maxCell, className: 'col-max' },
    { html: life || '<span class="dim">—</span>', className: 'col-life' },
    { html: sportsChipsHtml(book.supportedSports, glossaryIds), className: 'col-sports' },
    { html: regionsHtml(book.regions), className: 'col-regions' },
    {
      html: status,
      className: `status-text ${status === 'ok' ? 'ok' : 'bad'}`,
    },
  ];
}

export function rowHtml(book, glossaryIds) {
  return renderPortalTableRows(BOOK_COLS, [bookCells(book, glossaryIds)], {
    rowAttrs: () => ({
      'data-id': book.id || '',
      'data-slug': book.slug || book.id || '',
      'data-fetcher': book.fetcherType || '',
      'data-tier': book.liquidityTier || '',
    }),
  });
}

export function statsHtml(summary, counts) {
  const s = summary || {};
  return renderPortalStatGrid([
    { label: 'Books', value: s.count ?? counts.all, hint: 'registry rows', tone: 'muted' },
    {
      label: 'Webview',
      value: s.webview ?? counts.webview,
      hint: 'browser fetcher',
      tone: 'muted',
    },
    { label: 'REST', value: s.rest ?? counts.rest, hint: 'API fetcher', tone: 'muted' },
    { label: 'Seat', value: s.seat ?? counts.seat, hint: 'seat / soft books', tone: 'muted' },
    {
      label: 'Sports',
      value: Array.isArray(s.sports) ? s.sports.length : uniqueSports([]).length,
      hint: 'unique sports',
      tone: 'muted',
    },
  ]);
}

export async function loadGlossarySportIds() {
  const ids = new Set();
  try {
    const res = await fetch(GLOSSARY_URL, { headers: { Accept: 'application/json' } });
    if (!res.ok) return ids;
    const payload = await res.json();
    const entries = Array.isArray(payload) ? payload : (payload.entries ?? payload.concepts ?? []);
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

export function deskCoverageHtml(report) {
  if (!report || !Array.isArray(report.hits)) return '';
  const unmatched = report.hits.filter(h => h.class === 'unmatched');
  const placeholders = report.hits.filter(h => h.class === 'placeholder');
  const lines = [];
  lines.push(
    `<span><b>${esc(report.matched ?? 0)}</b> matched</span>`,
    `<span><b>${esc(report.placeholder ?? 0)}</b> placeholder</span>`,
    `<span class="status-text ${unmatched.length ? 'bad' : 'ok'}"><b>${esc(report.unmatched ?? 0)}</b> unmatched</span>`,
    report.registryUnused?.length
      ? `<span class="dim">${esc(report.registryUnused.length)} registry unused</span>`
      : null
  );
  const hitHtml = [...unmatched, ...placeholders]
    .map(h => {
      const max = h.maxBetUsd != null ? ` · max$${esc(h.maxBetUsd)}` : '';
      const id = h.registryId ? ` → <code>${esc(h.registryId)}</code>` : '';
      return `<span class="portal-chip ${h.class === 'unmatched' ? 'status-text bad' : 'portal-chip--muted'}">[${esc(h.class)}] ${esc(h.deskBook)}${id}${max}</span>`;
    })
    .join(' ');
  return {
    meta: lines.filter(Boolean).join(' · '),
    hits: hitHtml || '<span class="dim">All desk books matched</span>',
  };
}

export async function fetchDeskCoverage() {
  try {
    const res = await fetch(DESK_COVERAGE_URL, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function setGate(el, { ok, label }) {
  if (!el) return;
  el.className = `portal-gate ${ok ? 'ok' : 'bad'}`;
  el.innerHTML = `<span class="dot" aria-hidden="true"></span>${esc(label)}`;
}

function mountBookmakersToolbar(root) {
  const toolbar = root.getElementById('bookmakers-toolbar');
  if (!toolbar) return;
  toolbar.outerHTML = renderPortalToolbar(toolbar.innerHTML, {
    ariaLabel: toolbar.getAttribute('aria-label') || 'Filter books',
    className: 'bookmakers-toolbar',
  });
}

export function initBookmakersBoard(root = document) {
  mountBookmakersToolbar(root);
  const metaEl = root.getElementById('bookmakers-meta');
  const bodyEl = root.getElementById('bookmakers-body');
  const countEl = root.getElementById('bookmakers-count');
  const statsEl = root.getElementById('bookmakers-stats');
  const sportsEl = root.getElementById('bookmakers-sports');
  const gateEl = root.getElementById('bookmakers-gate');
  const bakedEl = root.getElementById('bookmakers-baked');
  const filterEl = root.getElementById('bookmakers-filter');
  const tierEl = root.getElementById('bookmakers-tier');
  const searchEl = root.getElementById('bookmakers-search');
  const shownEl = root.getElementById('bookmakers-shown');
  const deskCard = root.getElementById('desk-coverage-card');
  const deskMeta = root.getElementById('bookmakers-desk-meta');
  const deskHits = root.getElementById('bookmakers-desk-hits');
  if (!metaEl || !bodyEl) return;

  bindCopyButtons(root);

  let books = [];
  let glossaryIds = new Set();
  let summary = {};
  let artifact = {};
  let audit = { ok: true, issues: [] };
  let generatedAt = null;
  let deskReport = null;

  const paint = () => {
    const fetcher = filterEl?.value || 'all';
    const tier = tierEl?.value || 'all';
    const q = searchEl?.value || '';
    const filtered = filterBooks(books, { fetcher, tier, q });
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
      const sports =
        Array.isArray(summary.sports) && summary.sports.length
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
        ? `<span class="status-text ok">audit ok</span>`
        : `<span class="status-text bad">audit: ${esc((audit.issues || []).join('; ') || 'failed')}</span>`,
    ]
      .filter(Boolean)
      .join(' · ');

    if (deskCard && deskMeta && deskHits) {
      if (deskReport) {
        deskCard.hidden = false;
        const view = deskCoverageHtml(deskReport);
        deskMeta.innerHTML = view.meta;
        deskHits.innerHTML = view.hits;
      } else {
        deskCard.hidden = true;
      }
    }

    bodyEl.innerHTML = renderPortalTableRows(
      BOOK_COLS,
      filtered.map(b => bookCells(b, glossaryIds)),
      {
        emptyMessage: 'No books match this filter',
        rowAttrs: i => {
          const b = filtered[i];
          return {
            'data-id': b.id || '',
            'data-slug': b.slug || b.id || '',
            'data-fetcher': b.fetcherType || '',
            'data-tier': b.liquidityTier || '',
          };
        },
      }
    );
    bootGlossaryUx();
  };

  async function refresh() {
    try {
      const payload = await fetchBake();
      glossaryIds = await loadGlossarySportIds();
      deskReport = await fetchDeskCoverage();
      books = normalizeBooks(payload);
      summary = payload.summary || {};
      artifact = payload.artifact || {};
      audit = payload.audit || { ok: true, issues: [] };
      generatedAt = payload.generatedAt || null;
      paint();
    } catch (err) {
      setGate(gateEl, { ok: false, label: 'load failed' });
      if (metaEl) {
        metaEl.innerHTML = `<span class="status-text bad">load failed: ${esc(err.message)}</span>`;
      }
      if (bodyEl) {
        bodyEl.innerHTML = renderPortalTableRows(BOOK_COLS, [], {
          emptyHtml: `<tr><td colspan="${BOOK_COLS.length}" class="status-text bad">${esc(err.message)}</td></tr>`,
        });
      }
    }
  }

  filterEl?.addEventListener('change', paint);
  tierEl?.addEventListener('change', paint);
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
