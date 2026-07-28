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
    :host { display: block; font-family: system-ui, sans-serif; }
    .lcc-table { width: 100%; border-collapse: collapse; font-size: 0.85em; margin: 4px 0; }
    .lcc-table th, .lcc-table td { padding: 4px 6px; text-align: left; border-bottom: 1px solid var(--border, #ddd); }
    .lcc-table th { font-weight: 600; color: var(--text-dim, #666); }
    .lcc-up { color: #16a34a; }
    .lcc-down { color: #dc2626; }
    .lcc-score-bar { display: inline-block; height: 8px; border-radius: 4px; background: linear-gradient(90deg, #dc2626, #f59e0b, #16a34a); min-width: 40px; }
    .lcc-summary { display: flex; gap: 1em; padding: 6px 0; color: var(--text-dim, #666); font-size: 0.85em; }
    .lcc-summary span { display: flex; align-items: center; gap: 3px; }
    .lcc-empty { color: var(--text-dim, #999); font-style: italic; padding: 1em; text-align: center; }
    .lcc-toolbar { display: flex; gap: 0.5em; align-items: center; margin-bottom: 4px; }
    .lcc-toolbar button, .lcc-toolbar a { padding: 2px 8px; border: 1px solid var(--border, #ccc); border-radius: 4px; background: var(--card, #f5f5f5); cursor: pointer; font-size: 0.8em; text-decoration: none; color: inherit; }
    .lcc-toolbar button:hover, .lcc-toolbar a:hover { background: var(--accent, #e0e0e0); }
  </style>`;

const TEMPLATE = `
  ${STYLE}
  <div class="lcc-toolbar">
    <span id="lcc-title" style="font-weight:600;flex:1">Limit changes</span>
    <button id="lcc-export" title="Download CSV">⬇ CSV</button>
    <a id="lcc-link" href="/portal/limits/">📊 Details</a>
  </div>
  <div id="lcc-summary" class="lcc-summary"></div>
  <div id="lcc-table-wrap"></div>
  <div id="lcc-empty" class="lcc-empty">Loading...</div>
`;

export class LimitChangesCard extends HTMLElement {
  static observedAttributes = ['partner', 'hours', 'limit', 'show-all', 'compact'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = TEMPLATE;
    this._data = null;
    this._loading = false;
  }

  connectedCallback() {
    this.shadowRoot.getElementById('lcc-export').addEventListener('click', () => this._exportCsv());
    if (!this._data) this.load();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.load();
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
  }

  /** External data setter (skip fetch). */
  set data(payload) {
    this._processData(payload);
  }

  _processData(payload) {
    this._loading = false;
    const empty = this.shadowRoot.getElementById('lcc-empty');
    const changes = (payload.limitChanges ?? []);
    if (changes.length === 0) {
      empty.textContent = 'No limit changes found.';
      this.shadowRoot.getElementById('lcc-summary').textContent = '';
      this.shadowRoot.getElementById('lcc-table-wrap').innerHTML = '';
      return;
    }

    const partnerFilter = this.getAttribute('partner');
    const maxHours = Number(this.getAttribute('hours')) || 48;
    const maxRows = Number(this.getAttribute('limit')) || 10;
    const showAll = this.hasAttribute('show-all');
    const isCompact = this.hasAttribute('compact');
    const since = Date.now() - maxHours * 3600 * 1000;

    let filtered = changes.filter(c => {
      if (partnerFilter && c.node_id !== partnerFilter) return false;
      if (!showAll && c.direction === 'down') return false;
      return true;
    }).slice(0, maxRows);

    if (filtered.length === 0) {
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
    const avgScore = filtered.reduce((s, c) => s + ((c.multi_factor_score ?? 0)), 0) / filtered.length;
    this.shadowRoot.getElementById('lcc-summary').innerHTML = `
      <span>📊 ${filtered.length} changes</span>
      <span style="color:#16a34a">🚀 ${raises}</span>
      ${downs > 0 ? `<span style="color:#dc2626">⬇ ${downs}</span>` : ''}
      <span>${netDelta >= 0 ? '+' : ''}$${Math.abs(netDelta).toLocaleString()} net</span>
      ${avgScore > 0 ? `<span>🧮 ${(avgScore * 100).toFixed(0)}% avg</span>` : ''}
    `;

    // Table
    const headers = ['Dir', 'Book', 'Sport', 'Market', 'Type', 'Old', 'New', '±$', isCompact ? '' : 'Score', isCompact ? '' : '🔮', 'When'].filter(Boolean);
    this.shadowRoot.getElementById('lcc-table-wrap').innerHTML = `
      <table class="lcc-table">
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${filtered.map(c => {
          const dir = c.direction === 'down' ? '⬇' : '🚀';
          const dirCls = c.direction === 'down' ? 'lcc-down' : 'lcc-up';
          const oldVal = c.previous_max != null ? `$${Number(c.previous_max).toLocaleString()}` : '—';
          const newVal = c.new_limit != null ? `$${Number(c.new_limit).toLocaleString()}` : '—';
          const delta = c.previous_max != null && c.new_limit != null
            ? `${c.new_limit >= c.previous_max ? '+' : ''}$${(c.new_limit - c.previous_max).toLocaleString()}`
            : '—';
          const score = c.multi_factor_score;
          const predRaise = c.predicted_raise_prob;
          const scoreCell = isCompact ? '' : `<td>${score != null ? `<div class="lcc-score-bar" style="width:${score * 100}%"></div> ${(score * 100).toFixed(0)}%` : '···'}</td>`;
          const predCell = isCompact ? '' : `<td>${predRaise != null ? `<div class="lcc-score-bar" style="width:${predRaise * 100}%"></div> ${(predRaise * 100).toFixed(0)}%` : '—'}</td>`;
          const when = c.increased_at != null ? new Date(c.increased_at * 1000).toLocaleDateString() : '—';
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
        }).join('')}</tbody>
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
    const headers = ['direction', 'sportsbook', 'sport_id', 'market_id', 'bet_type', 'previous_max', 'new_limit', 'delta', 'score', 'increased_at'];
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
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
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
