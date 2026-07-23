/**
 * Operations dashboard — 6-panel grid with error, loading, retry, and polling.
 */
class OperationsDashboard extends HTMLElement {
  data = null;
  retries = 0;
  maxRetries = 3;

  async connectedCallback() {
    this.innerHTML = `
      <div class="ops-dashboard">
        <div id="ops-error" class="ops-banner error hidden"></div>
        <div id="ops-loading" class="ops-loading">
          <div class="spinner"></div><p>Loading operations data…</p>
        </div>
        <div id="ops-grid" class="ops-grid hidden">
          <section class="ops-panel">
            <h2>Liquidity</h2>
            <div class="ops-metric" id="total-liquidity">$0</div>
          </section>
          <section class="ops-panel">
            <h2>Experts</h2>
            <ul id="expert-list"></ul>
          </section>
          <section class="ops-panel">
            <h2>Agent Tree</h2>
            <div id="tree-viz"></div>
          </section>
          <section class="ops-panel wide">
            <h2>Today's Plays</h2>
            <div class="ops-source" id="ops-source"></div>
            <table id="plays-table"><thead><tr><th>Time</th><th>Expert</th><th>Event</th><th>Pick</th><th>Odds</th><th>Sent</th><th>Placed</th></tr></thead><tbody></tbody></table>
          </section>
          <section class="ops-panel">
            <h2>Rails</h2>
            <div id="rail-status"></div>
          </section>
          <section class="ops-panel">
            <h2>Hardware</h2>
            <div id="phone-inventory"></div>
          </section>
        </div>
      </div>
    `;

    await this.load();
    this.render();
    this.startPolling();
  }

  async load() {
    const loading = this.querySelector('#ops-loading');
    const error = this.querySelector('#ops-error');
    const grid = this.querySelector('#ops-grid');
    loading.classList.remove('hidden');
    error.classList.add('hidden');
    grid.classList.add('hidden');

    try {
      // Try live API first (Pages Function)
      const res = await fetch('/api/operations/summary');
      if (res.ok) {
        this.data = await res.json();
        this.retries = 0;
        loading.classList.add('hidden');
        grid.classList.remove('hidden');
        return;
      }
    } catch { /* fall through to snapshot */ }

    // Try static snapshot fallback
    try {
      const res = await fetch('/registry/ops-summary.json');
      if (res.ok) {
        this.data = await res.json();
        this.retries = 0;
        loading.classList.add('hidden');
        grid.classList.remove('hidden');
        return;
      }
    } catch { /* fall through to error */ }

    this.retries++;
    loading.classList.add('hidden');
    if (this.retries <= this.maxRetries) {
      setTimeout(() => this.load(), 3000);
      error.innerHTML = `<p>⚠️ Retrying (${this.retries}/${this.maxRetries})…</p>`;
      error.classList.remove('hidden');
    } else {
      error.innerHTML = `<p>⚠️ Could not load operations data.</p>
        <p class="error-hint">Deploy a static snapshot to public/registry/ops-summary.json or connect a live database.</p>
        <button class="retry-btn">Retry</button>`;
      error.classList.remove('hidden');
      error.querySelector('.retry-btn').addEventListener('click', () => {
        this.retries = 0;
        this.load();
      });
    }
  }

  startPolling() {
    setInterval(async () => {
      try {
        const res = await fetch('/api/operations/summary');
        if (res.ok) { this.data = await res.json(); this.render(); return; }
      } catch {}
      // Fallback to static snapshot
      try {
        const res = await fetch('/registry/ops-summary.json');
        if (res.ok) { this.data = await res.json(); this.render(); }
      } catch {}
    }, 30_000);
  }

  render() {
    if (!this.data) return;
    const d = this.data;

    // Source indicator
    const src = this.querySelector('#ops-source');
    if (src) src.textContent = d.source === 'live' ? 'Live' : 'Snapshot';

    // Liquidity
    const liq = this.querySelector('#total-liquidity');
    if (liq) liq.textContent = '$' + (d.liquidity?.total ?? 0).toLocaleString();

    // Experts
    const expList = this.querySelector('#expert-list');
    if (expList) {
      expList.innerHTML = (d.experts || []).map(e => `
        <li class="${e.active ? 'active' : 'inactive'}">
          <span>${e.name}</span>
          <small>${e.sport} ${e.market} · Edge: ${e.edge_score}%</small>
        </li>
      `).join('');
    }

    // Tree
    const tree = this.querySelector('#tree-viz');
    if (tree) {
      const t = d.tree || {};
      tree.innerHTML = `
        <div class="tree-counts">
          <span>Partners: ${t.partners ?? 0}</span>
          <span>Agents: ${t.agents ?? 0}</span>
          <span>Sub-agents: ${t.subAgents ?? 0}</span>
        </div>
        <div>Downstream: $${(t.downstreamLiquidity ?? 0).toLocaleString()}</div>
      `;
    }

    // Plays
    const tbody = this.querySelector('#plays-table tbody');
    if (tbody) {
      tbody.innerHTML = (d.plays || []).map(p => `
        <tr>
          <td>${(p.sent_at || '').slice(11, 16)}</td>
          <td>${p.expert_name || ''}</td>
          <td>${p.event || ''}</td>
          <td>${p.selection || ''}</td>
          <td>${p.odds > 0 ? '+' : ''}${p.odds}</td>
          <td>${p.sent_count ?? 0}</td>
          <td>${p.placed_count ?? 0}</td>
        </tr>
      `).join('');
    }

    // Rails
    const rail = this.querySelector('#rail-status');
    if (rail) {
      rail.innerHTML = (d.rails || []).map(r => `
        <div class="rail-row">
          <span>${r.type}</span>
          <span>$${(r.total_sent ?? 0).toLocaleString()}</span>
          <span>${((r.total_sent / (r.monthly_limit || 1)) * 100).toFixed(0)}%</span>
        </div>
      `).join('');
    }

    // Phones
    const phones = this.querySelector('#phone-inventory');
    if (phones) {
      const ph = d.phones || {};
      phones.innerHTML = `
        <span>Inventory: ${ph.inventory ?? 0}</span>
        <span>Issued: ${ph.issued ?? 0}</span>
        <span>Returned: ${ph.returned ?? 0}</span>
      `;
    }
  }
}

customElements.define('operations-dashboard', OperationsDashboard);
