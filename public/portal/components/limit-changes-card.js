/**
 * <limit-changes-card> — reusable web component for limit changes.
 *
 * Usage:
 *   <limit-changes-card partner="partner-42" hours="48" limit="5"></limit-changes-card>
 *   <limit-changes-card limit="10" show-all></limit-changes-card>
 *
 * Attributes:
 *   partner   — node_id to scope (omit for all partners)
 *   sportsbook— sportsbook id filter
 *   direction — "up" | "down"
 *   hours     — lookback window (default 48; 0 = all loaded)
 *   limit     — max rows (default 10)
 *   show-all  — show both raises and decreases (default shows raises only)
 *   compact   — omit score / factors / activity columns
 */
import {
  PARTNER_HISTORY_COPY,
  PARTNER_HISTORY_GLOSSARY,
  partnerHistoryGlossaryHref,
} from '../partner-history/glossary-map.js';
import { resolveSportsbook } from '../partner-history/sportsbook-catalog.js';
import { resolveSportLeague } from '../partner-history/sport-league-map.js';

const G = PARTNER_HISTORY_GLOSSARY;
const COPY = PARTNER_HISTORY_COPY;

const STYLE = `
  <style>
    :host {
      display: block;
      color: var(--text, #e6edf3);
      font-family: var(--font-sans, Inter, system-ui, sans-serif);
      --lcc-up: var(--partner-ops-operator-ready, var(--tone-ok, #3fb950));
      --lcc-down: var(--partner-ops-rejected, var(--tone-bad, #f85149));
      --lcc-warn: var(--partner-ops-deferred, var(--tone-warn, #d29922));
      --lcc-border: var(--border, #30363d);
      --lcc-surface: var(--surface, #161b22);
      --lcc-muted: var(--text-dim, #8b949e);
    }
    .lcc-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5em;
      align-items: center;
      margin-bottom: 8px;
    }
    .lcc-toolbar #lcc-title {
      flex: 1;
      min-width: 8rem;
      font-weight: 600;
      font-size: 0.95em;
    }
    .lcc-toolbar button,
    .lcc-toolbar a {
      padding: 4px 10px;
      border: 1px solid var(--lcc-border);
      border-radius: 6px;
      background: var(--lcc-surface);
      cursor: pointer;
      font-size: 0.8em;
      text-decoration: none;
      color: inherit;
    }
    .lcc-toolbar button:hover,
    .lcc-toolbar a:hover {
      border-color: var(--accent, #58a6ff);
      color: var(--accent, #58a6ff);
    }
    .lcc-summary {
      display: flex;
      flex-wrap: wrap;
      gap: 0.85em 1.25em;
      padding: 4px 2px 10px;
      color: var(--lcc-muted);
      font-size: 0.82em;
    }
    .lcc-summary span { display: inline-flex; align-items: center; gap: 4px; }
    .lcc-empty {
      color: var(--lcc-muted);
      font-style: italic;
      padding: 1.5em;
      text-align: center;
      border: 1px dashed var(--lcc-border);
      border-radius: 8px;
    }
    #lcc-table-wrap {
      overflow: auto;
      border: 1px solid var(--lcc-border);
      border-radius: 8px;
      background: var(--lcc-surface);
      max-height: min(70vh, 720px);
    }
    .lcc-table {
      width: 100%;
      min-width: 1280px;
      border-collapse: collapse;
      font-size: 0.82em;
      margin: 0;
    }
    .lcc-table caption {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
    }
    .lcc-table th,
    .lcc-table td {
      padding: 8px 10px;
      text-align: left;
      border-bottom: 1px solid rgba(48, 54, 61, 0.45);
      vertical-align: top;
    }
    .lcc-table th {
      position: sticky;
      top: 0;
      z-index: 1;
      font-weight: 600;
      font-size: 0.78em;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      color: var(--lcc-muted);
      background: var(--lcc-surface);
      border-bottom: 1px solid var(--lcc-border);
      white-space: nowrap;
    }
    .lcc-table tbody tr:hover td { background: rgba(255, 255, 255, 0.025); }
    .lcc-table tr.lcc-row-up td:first-child { box-shadow: inset 3px 0 0 var(--lcc-up); }
    .lcc-table tr.lcc-row-down td:first-child { box-shadow: inset 3px 0 0 var(--lcc-down); }
    .lcc-up { color: var(--lcc-up); font-weight: 600; }
    .lcc-down { color: var(--lcc-down); font-weight: 600; }
    .lcc-num {
      font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .lcc-account {
      font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
      font-size: 0.92em;
      color: var(--accent, #58a6ff);
      text-decoration: none;
    }
    .lcc-account:hover { text-decoration: underline; }
    .lcc-book-cell {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 6px;
    }
    .lcc-book {
      font-weight: 600;
    }
    .lcc-book-int,
    .lcc-book-ext,
    .lcc-book-type {
      font-size: 0.85em;
      color: var(--accent, #58a6ff);
      text-decoration: none;
      opacity: 0.85;
    }
    .lcc-book-type { font-weight: 500; }
    .lcc-book-int:hover,
    .lcc-book-ext:hover,
    .lcc-book-type:hover {
      opacity: 1;
      text-decoration: underline;
    }
    .lcc-book-links {
      display: inline-flex;
      gap: 4px;
      align-items: center;
      font-weight: 400;
    }
    .lcc-book-sep { color: var(--lcc-muted); opacity: 0.7; }
    .lcc-market { color: var(--lcc-muted); font-size: 0.92em; }
    .lcc-meter {
      display: grid;
      grid-template-columns: minmax(48px, 72px) auto;
      gap: 6px;
      align-items: center;
      min-width: 96px;
    }
    .lcc-meter-track {
      height: 6px;
      border-radius: 999px;
      background: rgba(139, 148, 158, 0.25);
      overflow: hidden;
    }
    .lcc-meter-fill {
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--lcc-down), var(--lcc-warn), var(--lcc-up));
    }
    .lcc-meter-label {
      font-family: var(--font-mono, ui-monospace, monospace);
      font-variant-numeric: tabular-nums;
      font-size: 0.92em;
      color: var(--lcc-muted);
    }
    .lcc-factors { display: flex; flex-wrap: wrap; gap: 4px; max-width: 220px; }
    .lcc-factor {
      display: inline-block;
      padding: 1px 6px;
      border: 1px solid var(--lcc-border);
      border-radius: 999px;
      color: var(--lcc-muted);
      font-size: 0.72em;
      font-family: var(--font-mono, ui-monospace, monospace);
      white-space: nowrap;
    }
    .lcc-when { white-space: nowrap; }
    .lcc-when time { display: block; font-variant-numeric: tabular-nums; }
    .lcc-when small { color: var(--lcc-muted); font-size: 0.85em; }
    .lcc-muted { color: var(--lcc-muted); }
    .semantic-label { color: inherit; text-decoration: underline dotted; text-underline-offset: 2px; }
  </style>`;

const TEMPLATE = `
  ${STYLE}
  <div class="lcc-toolbar">
    <a id="lcc-title" class="semantic-label" href="${partnerHistoryGlossaryHref(G.limitChanges)}" data-glossary-concept="${G.limitChanges}">Limit changes</a>
    <button id="lcc-export" type="button" title="Download CSV" data-glossary-concept="${G.csv}" aria-label="Export CSV">CSV</button>
    <a id="lcc-link" href="/portal/limits/" title="Limits board" data-glossary-concept="${G.limitOverview}">Limits</a>
    <a href="/portal/partner-history/" title="Partner history" data-glossary-concept="${G.page}">History</a>
    <a href="/registry/limit-raises.json" title="Baked registry JSON" data-glossary-concept="${G.json}">JSON</a>
  </div>
  <div id="lcc-summary" class="lcc-summary" role="status" aria-live="polite"></div>
  <div id="lcc-table-wrap"></div>
  <div id="lcc-empty" class="lcc-empty" data-glossary-concept="${G.skeletonTable}" aria-busy="true">${COPY.skeletonTable}</div>
`;

function shortAccount(nodeId) {
  if (!nodeId) return '—';
  const raw = String(nodeId);
  if (raw.length <= 14) return raw;
  if (/^[0-9a-f-]{20,}$/i.test(raw)) return `${raw.slice(0, 8)}…${raw.slice(-4)}`;
  return `${raw.slice(0, 12)}…`;
}

function accountCell(nodeId) {
  if (!nodeId) return '<span class="lcc-muted">—</span>';
  const masked = shortAccount(nodeId);
  const isMasked = masked !== String(nodeId);
  return `<a class="lcc-account" href="/portal/account/?account=${encodeURIComponent(nodeId)}" title="${escapeText(nodeId)}" data-glossary-concept="${isMasked ? G.skeletonRowField : G.accountColumn}">${escapeText(masked)}</a>`;
}

function evidenceCellHtml(proof) {
  if (proof?.valid === true) {
    return `<td data-glossary-concept="${G.evidenceColumn}"><span class="lcc-up" data-glossary-concept="${G.ariaEvidenceVerified}" aria-label="Signature valid">Signed</span></td>`;
  }
  if (proof) {
    return `<td data-glossary-concept="${G.evidenceColumn}"><span class="lcc-down" data-glossary-concept="${G.ariaProofMissing}" aria-label="Warning, invalid signed context evidence">Invalid</span></td>`;
  }
  return `<td data-glossary-concept="${G.evidenceColumn}"><span class="lcc-muted" data-glossary-concept="${G.ariaProofMissing}" aria-label="Warning, no signed context evidence">—</span></td>`;
}

function formatMoney(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `$${Number(value).toLocaleString()}`;
}

function formatCount(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString();
}

function formatDelta(previous, next) {
  if (previous == null || next == null) return '—';
  const delta = Number(next) - Number(previous);
  if (!Number.isFinite(delta)) return '—';
  if (delta === 0) return '$0';
  const sign = delta > 0 ? '+' : '−';
  return `${sign}$${Math.abs(delta).toLocaleString()}`;
}

function formatWhen(unixSeconds) {
  if (unixSeconds == null) return { label: '—', detail: '', iso: '' };
  const date = new Date(unixSeconds * 1000);
  if (Number.isNaN(date.getTime())) return { label: '—', detail: '', iso: '' };
  return {
    label: date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' }),
    detail: date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
    iso: date.toISOString(),
  };
}

function meterHtml(score, concept = G.influenceColumn, label = 'influence') {
  if (score == null || Number.isNaN(Number(score))) {
    return '<span class="lcc-muted">—</span>';
  }
  const pct = Math.max(0, Math.min(100, Math.round(Number(score) * 100)));
  return `<div class="lcc-meter" title="${pct}% ${escapeText(label)}" data-glossary-concept="${concept}">
    <div class="lcc-meter-track"><div class="lcc-meter-fill" style="width:${pct}%"></div></div>
    <span class="lcc-meter-label">${pct}%</span>
  </div>`;
}

function factorsHtml(factors) {
  if (!Array.isArray(factors) || factors.length === 0) {
    return '<span class="lcc-muted">—</span>';
  }
  return `<div class="lcc-factors" data-glossary-concept="${G.factorsColumn}">${factors
    .slice(0, 3)
    .map(f => `<span class="lcc-factor">${escapeText(f)}</span>`)
    .join('')}</div>`;
}

function escapeText(value) {
  if (value == null) return '—';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Wire `bet_type` is overloaded: structure (straight/parlay) or phase (pregame/live).
 * Cell glossary + label follow the value so the column is never a bare "Type".
 */
function structurePhaseCell(betType) {
  const raw = String(betType ?? '')
    .trim()
    .toLowerCase();
  if (raw === 'live' || raw === 'in_play' || raw === 'in-play') {
    return {
      label: 'Live',
      concept: G.phaseColumn,
      title: 'Market phase · ops.limits.market_phase',
    };
  }
  if (raw === 'pregame') {
    return {
      label: 'Pregame',
      concept: G.phaseColumn,
      title: 'Market phase · ops.limits.market_phase',
    };
  }
  if (raw === 'parlay' || raw === 'multi') {
    return {
      label: 'Parlay',
      concept: G.structureColumn,
      title: 'Multi / parlay structure · ops.limits.multi_structure',
    };
  }
  if (raw === 'straight' || raw === 'single') {
    return {
      label: 'Straight',
      concept: G.structureColumn,
      title: 'Multi / parlay structure · ops.limits.multi_structure',
    };
  }
  return {
    label: betType == null || betType === '' ? '—' : String(betType),
    concept: G.structureColumn,
    title: 'Wire bet_type (structure or phase)',
  };
}

function columnHeader(label, concept, title) {
  return `<th scope="col"><a class="semantic-label" href="${partnerHistoryGlossaryHref(concept)}" data-glossary-concept="${concept}" title="${escapeText(title)}">${label}</a></th>`;
}

function sportsbookCell(sportsbookId) {
  const book = resolveSportsbook(sportsbookId);
  const links = [
    `<a class="lcc-book-int" href="${book.internalHref}" title="Partners board · ${escapeText(book.id || 'book')}">Internal</a>`,
  ];
  if (book.externalUrl) {
    links.push(
      `<a class="lcc-book-ext" href="${escapeText(book.externalUrl)}" target="_blank" rel="noopener noreferrer" title="External sportsbook site">External</a>`
    );
  }
  if (book.type && book.typeLabel) {
    links.push(
      `<a class="lcc-book-type" href="${book.typeGlossaryHref}" data-glossary-concept="${book.typeGlossaryId}" title="${escapeText(book.typeGlossaryId)} · wire ${escapeText(book.type)}">${escapeText(book.typeLabel)}</a>`
    );
  }
  return `<span class="lcc-book-cell"><a class="semantic-label lcc-book" href="${book.glossaryHref}" data-glossary-concept="${G.sportsbookColumn}" title="scrape.book · ${escapeText(book.id || 'unknown')}">${escapeText(book.label)}</a><span class="lcc-book-links">${links.join('<span class="lcc-book-sep">·</span>')}</span></span>`;
}

function sportCell(sportId) {
  const sl = resolveSportLeague(sportId);
  return `<a class="semantic-label" href="${sl.sportHref}" data-glossary-concept="${sl.sportConcept}" title="${escapeText(sl.sportConcept)}">${escapeText(sl.sportLabel)}</a>`;
}

function leagueCell(sportId) {
  const sl = resolveSportLeague(sportId);
  if (!sl.leagueLabel || sl.leagueLabel === '—') {
    return '<span class="lcc-muted">—</span>';
  }
  const href = sl.leagueHref ?? partnerHistoryGlossaryHref(G.leagueColumn);
  const concept = sl.leagueConcept ?? G.leagueColumn;
  return `<a class="semantic-label" href="${href}" data-glossary-concept="${concept}" title="${escapeText(concept)}">${escapeText(sl.leagueLabel)}</a>`;
}

function nodeActivity(payload, nodeId) {
  if (!nodeId || !payload?.nodeActivity) return null;
  return payload.nodeActivity[nodeId] ?? null;
}

function activityValueCell(value, concept, formatter = formatMoney) {
  if (value == null || Number.isNaN(Number(value))) {
    return `<td class="lcc-num lcc-muted" data-glossary-concept="${concept}">—</td>`;
  }
  return `<td class="lcc-num" data-glossary-concept="${concept}">${formatter(value)}</td>`;
}

function activityRowCells(activity) {
  const a = activity ?? {};
  return [
    activityValueCell(a.deposits, G.depositsColumn),
    activityValueCell(a.withdraws, G.withdrawsColumn),
    activityValueCell(a.betVolume, G.betVolumeColumn),
    activityValueCell(a.betsPlaced, G.betsPlacedColumn, formatCount),
    activityValueCell(a.betsWon, G.betsWonColumn, formatCount),
    activityValueCell(a.avgWager, G.avgWagerColumn),
  ].join('');
}

export class LimitChangesCard extends HTMLElement {
  static observedAttributes = [
    'partner',
    'sportsbook',
    'direction',
    'hours',
    'limit',
    'show-all',
    'compact',
  ];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = TEMPLATE;
    this._data = null;
    this._payload = null;
    this._loading = false;
    this._loadVersion = 0;
  }

  connectedCallback() {
    this.shadowRoot.getElementById('lcc-export').addEventListener('click', () => this._exportCsv());
    if (!this._data) this.load();
  }

  attributeChangedCallback() {
    if (!this.isConnected) return;
    if (this._payload) this._processData(this._payload);
    else this.load();
  }

  async load() {
    if (this._loading) return;
    this._loading = true;
    const loadVersion = ++this._loadVersion;
    const empty = this.shadowRoot.getElementById('lcc-empty');
    empty.setAttribute('data-glossary-concept', G.skeletonTable);
    empty.setAttribute('aria-busy', 'true');
    empty.textContent = COPY.skeletonTable;
    try {
      const res = await fetch('/api/operations/summary');
      if (res.ok) {
        const payload = await res.json();
        if (loadVersion !== this._loadVersion) return;
        this._processData(payload);
        return;
      }
    } catch {}
    try {
      const res = await fetch('/registry/ops-summary.json');
      if (res.ok) {
        const payload = await res.json();
        if (loadVersion !== this._loadVersion) return;
        this._processData(payload);
        return;
      }
    } catch {}
    if (loadVersion !== this._loadVersion) return;
    empty.removeAttribute('aria-busy');
    empty.setAttribute('data-glossary-concept', G.skeletonRetry);
    empty.innerHTML = `Could not load limit data. <button type="button" data-glossary-concept="${G.skeletonRetry}">${COPY.skeletonRetry}</button>`;
    empty.querySelector('button')?.addEventListener('click', () => {
      this._loading = false;
      this.load();
    });
    this._loading = false;
  }

  set data(payload) {
    this._loadVersion += 1;
    this._loading = false;
    this._payload = payload;
    this._processData(payload);
  }

  _processData(payload) {
    this._loading = false;
    this._payload = payload;
    const empty = this.shadowRoot.getElementById('lcc-empty');
    const wrap = this.shadowRoot.getElementById('lcc-table-wrap');
    const summary = this.shadowRoot.getElementById('lcc-summary');
    const changes = payload?.limitChanges ?? [];

    if (changes.length === 0) {
      this._data = [];
      empty.removeAttribute('aria-busy');
      empty.setAttribute('data-glossary-concept', G.recentChanges);
      empty.textContent = 'No limit changes found.';
      summary.textContent = '';
      wrap.innerHTML = '';
      return;
    }

    const partnerFilter = this.getAttribute('partner');
    const sportsbookFilter = this.getAttribute('sportsbook');
    const directionFilter = this.getAttribute('direction');
    const hoursAttribute = this.getAttribute('hours');
    const maxHours = hoursAttribute == null ? 48 : Math.max(0, Number(hoursAttribute) || 0);
    const maxRows = Number(this.getAttribute('limit')) || 10;
    const showAll = this.hasAttribute('show-all');
    const isCompact = this.hasAttribute('compact');
    const since = maxHours > 0 ? Date.now() - maxHours * 3600 * 1000 : 0;

    const filtered = changes
      .filter(c => {
        if (partnerFilter && c.node_id !== partnerFilter) return false;
        if (sportsbookFilter && c.sportsbook !== sportsbookFilter) return false;
        if (directionFilter && c.direction !== directionFilter) return false;
        if (!showAll && c.direction === 'down') return false;
        if (since && (c.increased_at == null || c.increased_at * 1000 < since)) return false;
        return true;
      })
      .sort((left, right) => (right.increased_at ?? 0) - (left.increased_at ?? 0))
      .slice(0, maxRows);

    if (filtered.length === 0) {
      this._data = [];
      empty.removeAttribute('aria-busy');
      empty.setAttribute('data-glossary-concept', G.recentChanges);
      empty.textContent = 'No matching limit changes.';
      summary.textContent = '';
      wrap.innerHTML = '';
      return;
    }

    empty.removeAttribute('aria-busy');
    empty.textContent = '';
    this._data = filtered;

    const raises = filtered.filter(c => c.direction === 'up').length;
    const downs = filtered.filter(c => c.direction === 'down').length;
    const netDelta = filtered.reduce((s, c) => s + ((c.new_limit ?? 0) - (c.previous_max ?? 0)), 0);
    const scored = filtered.filter(c => c.context_available && c.multi_factor_score != null);
    const avgScore = scored.reduce((s, c) => s + c.multi_factor_score, 0) / (scored.length || 1);
    const windowLabel = maxHours > 0 ? `${maxHours}h window` : 'all loaded';
    const netLabel =
      netDelta === 0
        ? '$0 net'
        : `${netDelta > 0 ? '+' : '−'}$${Math.abs(netDelta).toLocaleString()} high-water net`;

    summary.innerHTML = `
      <span data-glossary-concept="${G.visibleChanges}">${filtered.length} shown · ${windowLabel}</span>
      <span class="lcc-up" data-glossary-concept="${G.raises}">↑ ${raises} raises</span>
      ${downs > 0 ? `<span class="lcc-down" data-glossary-concept="${G.decreases}">↓ ${downs} decreases</span>` : ''}
      <span data-glossary-concept="${G.netChange}">${netLabel}</span>
      ${scored.length ? `<span data-glossary-concept="${G.avgInfluence}">${Math.round(avgScore * 100)}% avg influence</span>` : ''}
    `;

    const showAccount = !partnerFilter;
    const showFactors =
      !isCompact &&
      filtered.some(c => Array.isArray(c.top_contributing_factors) && c.top_contributing_factors.length);
    const showScore = !isCompact;
    const showActivity = !isCompact;
    const hasPredictions = !isCompact && filtered.some(c => c.predicted_raise_prob != null);
    const showEvidence = !isCompact && filtered.some(c => c.context_proof != null);

    const headers = [
      [
        'Change',
        G.directionColumn,
        'Raise or cut vs the prior limit · ops.limits.change_direction',
      ],
      showAccount
        ? ['Account', G.accountColumn, 'Partner-tree account / node · ops.limits.account']
        : null,
      [
        'Sportsbook',
        G.sportsbookColumn,
        'Sportsbook identity · scrape.book (glossary + partners board + external site)',
      ],
      ['Sport', G.sportColumn, 'Competition catalog sport · ops.limits.sport'],
      ['League', G.leagueColumn, 'Competition catalog league · ops.limits.league'],
      [
        'Market type',
        G.marketTypeColumn,
        'Bet market family (spread, total, moneyline…) · ops.limits.market_type',
      ],
      [
        'Structure / phase',
        G.structureColumn,
        'Straight or parlay (ops.limits.multi_structure); pregame or live (ops.limits.market_phase). Wire field: bet_type.',
      ],
      [
        'Prior limit',
        G.priorLimitColumn,
        'Previous effective max wager / high-water · ops.limits.effective_limit',
      ],
      [
        'New limit',
        G.newLimitColumn,
        'Observed effective max wager after the change · ops.limits.effective_limit',
      ],
      ['Delta', G.deltaColumn, 'Signed USD change vs prior · ops.limits.limit_delta'],
      showActivity
        ? ['Deposits', G.depositsColumn, 'Account deposits · accounting.deposit']
        : null,
      showActivity
        ? ['Withdraws', G.withdrawsColumn, 'Account withdrawals · accounting.withdrawal']
        : null,
      showActivity
        ? ['Bet volume', G.betVolumeColumn, 'Total bet volume · ops.limits.pattern_surface']
        : null,
      showActivity
        ? ['Bets', G.betsPlacedColumn, 'Bets placed · ops.limits.pattern_surface']
        : null,
      showActivity
        ? ['Bets won', G.betsWonColumn, 'Winning bets · ops.limits.pattern_surface']
        : null,
      showActivity
        ? ['Avg wager', G.avgWagerColumn, 'Average wager size · ops.limits.effective_limit']
        : null,
      showScore
        ? [
            'Influence',
            G.influenceColumn,
            'Multi-factor influence score · ops.limits.influence_score',
          ]
        : null,
      showFactors
        ? [
            'Top factors',
            G.factorsColumn,
            'Top contributing factors for the influence score · ops.limits.influence_score',
          ]
        : null,
      showEvidence
        ? [
            'Evidence',
            G.evidenceColumn,
            `Signed context proof · ${G.evidenceColumn} · ${COPY.skeletonEvidence} (${G.skeletonEvidence})`,
          ]
        : null,
      hasPredictions
        ? [
            'Prediction',
            G.predictionColumn,
            'Predicted raise probability · ops.limits.prediction',
          ]
        : null,
      [
        'Observed',
        G.observedColumn,
        'When the limit change was recorded · section.recentLimitChanges',
      ],
    ].filter(Boolean);

    const totalAvailable = changes.length;
    const caption = `Partner limit changes, ${filtered.length} of ${totalAvailable} visible`;
    wrap.innerHTML = `
      <table class="portal-table lcc-table" aria-label="${escapeText(caption)}" data-glossary-concept="${G.ariaTableCaption}">
        <caption data-glossary-concept="${G.ariaTableCaption}">${escapeText(caption)}. Sorted newest first. Structure / phase is wire bet_type: straight/parlay or pregame/live.</caption>
        <thead><tr>${headers.map(([label, concept, title]) => columnHeader(label, concept, title)).join('')}</tr></thead>
        <tbody>${filtered
          .map(c => {
            const isDown = c.direction === 'down';
            const dirCls = isDown ? 'lcc-down' : 'lcc-up';
            const rowCls = isDown ? 'lcc-row-down' : 'lcc-row-up';
            const dirLabel = isDown ? '↓ Cut' : '↑ Raise';
            const when = formatWhen(c.increased_at);
            const score =
              c.context_available && c.multi_factor_score != null ? c.multi_factor_score : null;
            const structure = structurePhaseCell(c.bet_type);
            const activity = nodeActivity(payload, c.node_id);
            const evidenceCell = showEvidence ? evidenceCellHtml(c.context_proof) : '';
            const predRaise = c.predicted_raise_prob;
            const predCell = hasPredictions
              ? `<td data-glossary-concept="${G.predictionColumn}">${
                  predRaise != null
                    ? meterHtml(predRaise, G.predictionColumn, 'prediction')
                    : '<span class="lcc-muted">—</span>'
                }</td>`
              : '';
            return `<tr class="${rowCls}">
              <td class="${dirCls}" data-glossary-concept="${G.directionColumn}">${dirLabel}</td>
              ${showAccount ? `<td>${accountCell(c.node_id)}</td>` : ''}
              <td>${sportsbookCell(c.sportsbook)}</td>
              <td>${sportCell(c.sport_id)}</td>
              <td>${leagueCell(c.sport_id)}</td>
              <td class="lcc-market" data-glossary-concept="${G.marketTypeColumn}">${escapeText(c.market_id)}</td>
              <td data-glossary-concept="${structure.concept}" title="${escapeText(structure.title)}">${escapeText(structure.label)}</td>
              <td class="lcc-num" data-glossary-concept="${G.priorLimitColumn}">${formatMoney(c.previous_max)}</td>
              <td class="lcc-num" data-glossary-concept="${G.newLimitColumn}"><strong>${formatMoney(c.new_limit)}</strong></td>
              <td class="lcc-num ${dirCls}" data-glossary-concept="${G.deltaColumn}">${formatDelta(c.previous_max, c.new_limit)}</td>
              ${showActivity ? activityRowCells(activity) : ''}
              ${showScore ? `<td>${meterHtml(score)}</td>` : ''}
              ${showFactors ? `<td>${factorsHtml(c.top_contributing_factors)}</td>` : ''}
              ${evidenceCell}
              ${predCell}
              <td class="lcc-when" title="${escapeText(when.iso)}" data-glossary-concept="${G.observedColumn}">
                <time datetime="${escapeText(when.iso)}">${escapeText(when.label)}</time>
                ${when.detail ? `<small>${escapeText(when.detail)}</small>` : ''}
              </td>
            </tr>`;
          })
          .join('')}</tbody>
      </table>`;
  }

  _exportCsv() {
    if (!this._data || this._data.length === 0) return;
    const exportBtn = this.shadowRoot.getElementById('lcc-export');
    const rowCount = this._data.length;
    exportBtn?.setAttribute('aria-busy', 'true');
    exportBtn?.setAttribute(
      'aria-label',
      `Exporting ${rowCount} rows · ${G.ariaExportProgress}`
    );
    exportBtn?.setAttribute('data-glossary-concept', G.ariaExportProgress);
    const isCompact = this.hasAttribute('compact');
    const headers = [
      'direction',
      'node_id',
      'sportsbook',
      'sportsbook_label',
      'sport_id',
      'sport_concept',
      'league_concept',
      'market_id',
      'bet_type',
      'previous_max',
      'new_limit',
      'delta',
      ...(isCompact
        ? []
        : [
            'deposits',
            'withdraws',
            'bet_volume',
            'bets_placed',
            'bets_won',
            'avg_wager',
          ]),
      'score',
      'top_factors',
      'increased_at',
    ];
    const rows = this._data.map(c => {
      const book = resolveSportsbook(c.sportsbook);
      const sl = resolveSportLeague(c.sport_id);
      const activity = nodeActivity(this._payload, c.node_id) ?? {};
      const base = [
        c.direction,
        c.node_id ?? '',
        c.sportsbook ?? '',
        book.label,
        c.sport_id ?? '',
        sl.sportConcept,
        sl.leagueConcept ?? '',
        c.market_id ?? '',
        c.bet_type ?? '',
        c.previous_max ?? '',
        c.new_limit ?? '',
        c.previous_max != null && c.new_limit != null ? c.new_limit - c.previous_max : '',
      ];
      const activityCols = isCompact
        ? []
        : [
            activity.deposits ?? '',
            activity.withdraws ?? '',
            activity.betVolume ?? '',
            activity.betsPlaced ?? '',
            activity.betsWon ?? '',
            activity.avgWager ?? '',
          ];
      return [
        ...base,
        ...activityCols,
        c.multi_factor_score ?? '',
        Array.isArray(c.top_contributing_factors) ? c.top_contributing_factors.join('|') : '',
        c.increased_at != null ? new Date(c.increased_at * 1000).toISOString() : '',
      ];
    });
    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `limit-changes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    exportBtn?.removeAttribute('aria-busy');
    exportBtn?.setAttribute('aria-label', 'Export CSV');
    exportBtn?.setAttribute('data-glossary-concept', G.csv);
  }
}

customElements.define('limit-changes-card', LimitChangesCard);
