/**
 * <limit-changes-card> — reusable web component for limit changes.
 *
 * Usage:
 *   <limit-changes-card partner="partner-42" hours="48" limit="5"></limit-changes-card>
 *   <limit-changes-card limit="10" show-all></limit-changes-card>
 *
 * Attributes:
 *   partner   — node_id to scope (omit for all partners)
 *   hours     — lookback window (default 48)
 *   limit     — max rows (default 10)
 *   show-all  — show both raises and decreases (default shows raises only)
 *   compact   — single-line format (no score/details)
 *   data-*    — override render when data supplied externally
 */
const STYLE = `
  <style>
    :host {
      display: block;
      font-family: system-ui, sans-serif;
      --lcc-up: var(--partner-ops-operator-ready, var(--tone-ok, #3fb950));
      --lcc-down: var(--partner-ops-rejected, var(--tone-bad, #f85149));
      --lcc-warn: var(--partner-ops-deferred, var(--tone-warn, #d29922));
    }
    #lcc-table-wrap { overflow-x: auto; border: 1px solid var(--border, #ddd); border-radius: 6px; }
    .lcc-table { width: 100%; min-width: 760px; border-collapse: collapse; font-size: 0.85em; margin: 0; }
    .lcc-table th, .lcc-table td { padding: 4px 6px; text-align: left; border-bottom: 1px solid var(--border, #ddd); }
    .lcc-table th { font-weight: 600; color: var(--text-dim, #666); }
    .lcc-up { color: var(--lcc-up); }
    .lcc-down { color: var(--lcc-down); }
    .lcc-score-bar { display: inline-block; height: 8px; border-radius: 4px; background: linear-gradient(90deg, var(--lcc-down), var(--lcc-warn), var(--lcc-up)); min-width: 40px; }
    .lcc-summary { display: flex; flex-wrap: wrap; gap: 1em; padding: 6px 0; color: var(--text-dim, #666); font-size: 0.85em; }
    .lcc-summary span { display: flex; align-items: center; gap: 3px; }
    .lcc-empty { color: var(--text-dim, #999); font-style: italic; padding: 1em; text-align: center; }
    .lcc-toolbar { display: flex; flex-wrap: wrap; gap: 0.5em; align-items: center; margin-bottom: 4px; }
    .lcc-toolbar button, .lcc-toolbar a { padding: 2px 8px; border: 1px solid var(--border, #ccc); border-radius: 4px; background: var(--card, #f5f5f5); cursor: pointer; font-size: 0.8em; text-decoration: none; color: inherit; }
    .lcc-toolbar button:hover, .lcc-toolbar a:hover { background: var(--accent, #e0e0e0); }
  </style>`;

const TEMPLATE = `
  ${STYLE}
  <div class="lcc-toolbar">
    <span id="lcc-title" style="font-weight:600;flex:1">Limit changes</span>
    <button id="lcc-export" title="Download CSV">⬇ CSV</button>
    <a id="lcc-link" href="/portal/limits/" title="Limits board">📊 Limits</a>
    <a href="/portal/partner-history/" title="Partner history">Partners</a>
    <a href="/registry/limit-raises.json" title="Baked registry JSON">JSON</a>
  </div>
  <div id="lcc-summary" class="lcc-summary" role="status" aria-live="polite"></div>
  <div id="lcc-table-wrap"></div>
  <div id="lcc-empty" class="lcc-empty">Loading...</div>
`;

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

  /** Load data from ops-summary API. */
  async load() {
    if (this._loading) return;
    this._loading = true;
    const empty = this.shadowRoot.getElementById('lcc-empty');
    try {
      const res = await fetch('/api/operations/summary');
      if (res.ok) {
        const payload = await res.json();
        this._processData(payload);
        return;
      }
    } catch {}
    try {
      const res = await fetch('/registry/ops-summary.json');
      if (res.ok) {
        const payload = await res.json();
        this._processData(payload);
        return;
      }
    } catch {}
    empty.textContent = '⚠️ Could not load limit data.';
    this._loading = false;
  }

  /** External data setter (skip fetch). */
  set data(payload) {
    this._payload = payload;
    this._processData(payload);
  }

  _processData(payload) {
    this._loading = false;
    this._payload = payload;
    const empty = this.shadowRoot.getElementById('lcc-empty');
    const changes = payload.limitChanges ?? [];
    if (changes.length === 0) {
      this._data = [];
      empty.textContent = 'No limit changes found.';
      this.shadowRoot.getElementById('lcc-summary').textContent = '';
      this.shadowRoot.getElementById('lcc-table-wrap').innerHTML = '';
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

    let filtered = changes
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
      empty.textContent = 'No matching limit changes.';
      this.shadowRoot.getElementById('lcc-summary').textContent = '';
      this.shadowRoot.getElementById('lcc-table-wrap').innerHTML = '';
      return;
    }

    empty.textContent = '';
    this._data = filtered;

    // Summary
    const raises = filtered.filter(c => c.direction === 'up').length;
    const downs = filtered.filter(c => c.direction === 'down').length;
    const netDelta = filtered.reduce((s, c) => s + ((c.new_limit ?? 0) - (c.previous_max ?? 0)), 0);
    const scored = filtered.filter(c => c.context_available && c.multi_factor_score != null);
    const avgScore = scored.reduce((s, c) => s + c.multi_factor_score, 0) / (scored.length || 1);
    this.shadowRoot.getElementById('lcc-summary').innerHTML = `
      <span>${filtered.length} changes</span>
      <span class="lcc-up">↑ ${raises}</span>
      ${downs > 0 ? `<span class="lcc-down">↓ ${downs}</span>` : ''}
      <span>${netDelta > 0 ? '+' : netDelta < 0 ? '-' : ''}$${Math.abs(netDelta).toLocaleString()} high-water net</span>
      ${scored.length ? `<span>${(avgScore * 100).toFixed(0)}% avg influence</span>` : ''}
    `;

    // Table
    const hasPredictions = !isCompact && filtered.some(c => c.predicted_raise_prob != null);
    const headers = [
      'Direction',
      'Book',
      'Sport',
      'Market',
      'Type',
      'Prior high-water',
      'New',
      'Delta',
      isCompact ? '' : 'Influence',
      hasPredictions ? 'Prediction' : '',
      'When',
    ].filter(Boolean);
    this.shadowRoot.getElementById('lcc-table-wrap').innerHTML = `
      <table class="lcc-table" aria-label="Filtered partner limit changes">
        <caption style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)">Limit changes sorted newest first</caption>
        <thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead>
        <tbody>${filtered
          .map(c => {
            const dir = c.direction === 'down' ? '↓ decrease' : '↑ raise';
            const dirCls = c.direction === 'down' ? 'lcc-down' : 'lcc-up';
            const oldVal =
              c.previous_max != null ? `$${Number(c.previous_max).toLocaleString()}` : '—';
            const newVal = c.new_limit != null ? `$${Number(c.new_limit).toLocaleString()}` : '—';
            const deltaValue =
              c.previous_max != null && c.new_limit != null ? c.new_limit - c.previous_max : null;
            const delta =
              deltaValue != null
                ? `${deltaValue > 0 ? '+' : deltaValue < 0 ? '-' : ''}$${Math.abs(deltaValue).toLocaleString()}`
                : '—';
            const score = c.context_available ? c.multi_factor_score : null;
            const predRaise = c.predicted_raise_prob;
            const scoreCell = isCompact
              ? ''
              : `<td>${score != null ? `<div class="lcc-score-bar" style="width:${score * 100}%"></div> ${(score * 100).toFixed(0)}%` : '···'}</td>`;
            const predCell = hasPredictions
              ? `<td>${predRaise != null ? `<div class="lcc-score-bar" style="width:${predRaise * 100}%"></div> ${(predRaise * 100).toFixed(0)}%` : '—'}</td>`
              : '';
            const when =
              c.increased_at != null ? new Date(c.increased_at * 1000).toLocaleDateString() : '—';
            return `<tr>
            <td class="${dirCls}">${dir}</td>
            <td>${this._esc(c.sportsbook)}</td>
            <td>${this._esc(c.sport_id)}</td>
            <td>${this._esc(c.market_id)}</td>
            <td>${this._esc(c.bet_type)}</td>
            <td>${oldVal}</td>
            <td><strong>${newVal}</strong></td>
            <td>${delta}</td>
            ${scoreCell}
            ${predCell}
            <td>${when}</td>
          </tr>`;
          })
          .join('')}</tbody>
      </table>`;
  }

  _esc(s) {
    if (s == null) return '—';
    const d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
  }

  _exportCsv() {
    if (!this._data || this._data.length === 0) return;
    const headers = [
      'direction',
      'sportsbook',
      'sport_id',
      'market_id',
      'bet_type',
      'previous_max',
      'new_limit',
      'delta',
      'score',
      'increased_at',
    ];
    const rows = this._data.map(c => [
      c.direction,
      c.sportsbook,
      c.sport_id,
      c.market_id,
      c.bet_type,
      c.previous_max ?? '',
      c.new_limit ?? '',
      c.previous_max != null && c.new_limit != null ? c.new_limit - c.previous_max : '',
      c.multi_factor_score ?? '',
      c.increased_at != null ? new Date(c.increased_at * 1000).toISOString() : '',
    ]);
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
  }
}

customElements.define('limit-changes-card', LimitChangesCard);
