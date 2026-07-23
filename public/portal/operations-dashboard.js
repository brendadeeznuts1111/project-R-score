/**
 * Operations dashboard — custom element with 6-panel layout.
 *
 * Panels: liquidity, experts, tree, plays, rails, phones.
 * Each panel fetches from /api/operations/summary.
 */
class OperationsDashboard extends HTMLElement {
  data: Record<string, unknown> | null = null;

  async connectedCallback() {
    this.innerHTML = `
      <div class="ops-dashboard">
        <div class="ops-grid">
          <section class="ops-panel" id="panel-liquidity">
            <h2>Liquidity</h2>
            <div class="ops-metric" id="total-liquidity">$0</div>
          </section>
          <section class="ops-panel" id="panel-experts">
            <h2>Experts</h2>
            <ul id="expert-list"></ul>
          </section>
          <section class="ops-panel" id="panel-tree">
            <h2>Agent Tree</h2>
            <div id="tree-viz"></div>
          </section>
          <section class="ops-panel wide" id="panel-plays">
            <h2>Today's Plays</h2>
            <table id="plays-table"><thead><tr><th>Time</th><th>Expert</th><th>Event</th><th>Pick</th><th>Odds</th><th>Sent</th><th>Placed</th></tr></thead><tbody></tbody></table>
          </section>
          <section class="ops-panel" id="panel-rails">
            <h2>Rails</h2>
            <div id="rail-status"></div>
          </section>
          <section class="ops-panel" id="panel-phones">
            <h2>Hardware</h2>
            <div id="phone-inventory"></div>
          </section>
        </div>
      </div>
    `;

    await this.load();
    this.render();
  }

  async load() {
    try {
      const res = await fetch("/api/operations/summary");
      this.data = await res.json();
    } catch {
      this.data = null;
    }
  }

  render() {
    if (!this.data) return;
    const d = this.data as Record<string, any>;

    // Liquidity
    const liq = this.querySelector("#total-liquidity");
    if (liq) liq.textContent = `$${(d.liquidity?.total ?? 0).toLocaleString()}`;

    // Experts
    const expList = this.querySelector("#expert-list");
    if (expList) {
      expList.innerHTML = (d.experts || []).map((e: any) => `
        <li class="${e.active ? 'active' : 'inactive'}">
          <span>${e.name}</span>
          <small>${e.sport} ${e.market} · Edge: ${e.edge_score}%</small>
        </li>
      `).join("");
    }

    // Tree
    const tree = this.querySelector("#tree-viz");
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
    const tbody = this.querySelector("#plays-table tbody");
    if (tbody) {
      tbody.innerHTML = (d.plays || []).map((p: any) => `
        <tr>
          <td>${(p.sent_at || "").slice(11, 16)}</td>
          <td>${p.expert_name || ""}</td>
          <td>${p.event || ""}</td>
          <td>${p.selection || ""}</td>
          <td>${p.odds > 0 ? "+" : ""}${p.odds}</td>
          <td>${p.sent_count ?? 0}</td>
          <td>${p.placed_count ?? 0}</td>
        </tr>
      `).join("");
    }

    // Rails
    const railStatus = this.querySelector("#rail-status");
    if (railStatus) {
      railStatus.innerHTML = (d.rails || []).map((r: any) => `
        <div class="rail-row">
          <span>${r.type}</span>
          <span>$${(r.total_sent ?? 0).toLocaleString()}</span>
          <span>${((r.total_sent / (r.monthly_limit || 1)) * 100).toFixed(0)}%</span>
        </div>
      `).join("");
    }

    // Phones
    const phones = this.querySelector("#phone-inventory");
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

customElements.define("operations-dashboard", OperationsDashboard);
