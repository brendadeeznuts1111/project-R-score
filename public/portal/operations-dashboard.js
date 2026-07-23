/**
 * Operations dashboard — live `/api/operations/summary` or static
 * `/registry/ops-summary.json` (Cloudflare Pages snapshot from `ops:snapshot`).
 * Includes factorial experiments (C4), coverage prediction (C5),
 * growth metrics, Bun utils runtime proof, and routing proof.
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
          <section class="ops-panel">
            <h2>Growth</h2>
            <div class="ops-metric" id="growth-plays">0</div>
            <div class="ops-sub" id="growth-detail"></div>
            <ul id="growth-top"></ul>
          </section>
          <section class="ops-panel">
            <h2>Bun utils proof</h2>
            <div class="ops-metric" id="bun-utils-pass">—</div>
            <div class="ops-sub" id="bun-utils-detail"></div>
            <div class="ops-mono" id="bun-utils-hash"></div>
            <a class="ops-link" id="bun-utils-link" href="/registry/@factorywager/bun-utils-test/latest.json">Full proof JSON</a>
          </section>
          <section class="ops-panel">
            <h2>Routing proof</h2>
            <div class="ops-metric" id="routing-pass">—</div>
            <div class="ops-sub" id="routing-detail"></div>
            <div class="ops-mono" id="routing-hash"></div>
            <ul id="routing-crit"></ul>
            <a class="ops-link" id="routing-link" href="/registry/@factorywager/routing-test/latest.json">Full routing JSON</a>
          </section>
          <section class="ops-panel">
            <h2>Experiments</h2>
            <div class="ops-metric" id="exp-active">0</div>
            <div class="ops-sub" id="exp-status"></div>
            <ul id="exp-list"></ul>
          </section>
          <section class="ops-panel">
            <h2>Coverage prediction</h2>
            <div class="ops-metric" id="pred-mae">—</div>
            <div class="ops-sub" id="pred-detail"></div>
            <a class="ops-link" id="pred-report-link" href="/registry/prediction/report.html">Open report</a>
            <img id="pred-chart" class="ops-chart hidden" alt="Coverage prediction chart" width="100%" />
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
      const res = await fetch('/api/operations/summary');
      if (res.ok) {
        this.data = await res.json();
        this.retries = 0;
        loading.classList.add('hidden');
        grid.classList.remove('hidden');
        return;
      }
    } catch {
      /* fall through to snapshot */
    }

    try {
      const res = await fetch('/registry/ops-summary.json');
      if (res.ok) {
        this.data = await res.json();
        this.retries = 0;
        loading.classList.add('hidden');
        grid.classList.remove('hidden');
        return;
      }
    } catch {
      /* fall through to error */
    }

    this.retries++;
    loading.classList.add('hidden');
    if (this.retries <= this.maxRetries) {
      setTimeout(() => this.load(), 3000);
      error.innerHTML = `<p>⚠️ Retrying (${this.retries}/${this.maxRetries})…</p>`;
      error.classList.remove('hidden');
    } else {
      error.innerHTML = `<p>⚠️ Could not load operations data.</p>
        <p class="error-hint">Local: <code>bun run serve:public</code> (live <code>/api/operations/summary</code> from data/operations.db). Pages: <code>bun run ops:snapshot</code> then deploy public/registry/*.</p>
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
        if (res.ok) {
          this.data = await res.json();
          this.render();
          return;
        }
      } catch {
        /* ignore */
      }
      try {
        const res = await fetch('/registry/ops-summary.json');
        if (res.ok) {
          this.data = await res.json();
          this.render();
        }
      } catch {
        /* ignore */
      }
    }, 30_000);
  }

  render() {
    if (!this.data) return;
    const d = this.data;

    const src = this.querySelector('#ops-source');
    if (src) {
      const when = d.generated ? ` · ${String(d.generated).slice(0, 19)}Z` : '';
      src.textContent = (d.source === 'live' ? 'Live' : 'Snapshot') + when;
    }

    const liq = this.querySelector('#total-liquidity');
    if (liq) liq.textContent = '$' + (d.liquidity?.total ?? 0).toLocaleString();

    const expList = this.querySelector('#expert-list');
    if (expList) {
      expList.innerHTML = (d.experts || [])
        .map(
          e => `
        <li class="${e.active ? 'active' : 'inactive'}">
          <span>${e.name}</span>
          <small>${e.sport} ${e.market} · Edge: ${e.edge_score}%</small>
        </li>
      `
        )
        .join('');
    }

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

    // Growth metrics (period rollup)
    const growth = d.growth || {
      period: '—',
      playsReceived: 0,
      playsPlaced: 0,
      volume: 0,
      pnl: 0,
      nodes: 0,
      top: [],
    };
    const growthPlays = this.querySelector('#growth-plays');
    if (growthPlays) {
      growthPlays.textContent = String((growth.playsReceived ?? 0) + (growth.playsPlaced ?? 0));
    }
    const growthDetail = this.querySelector('#growth-detail');
    if (growthDetail) {
      growthDetail.textContent =
        `${growth.period || '—'} · recv ${growth.playsReceived ?? 0} · placed ${growth.playsPlaced ?? 0}` +
        ` · vol $${Number(growth.volume ?? 0).toLocaleString()}` +
        ` · pnl $${Number(growth.pnl ?? 0).toLocaleString()}` +
        ` · nodes ${growth.nodes ?? 0}`;
    }
    const growthTop = this.querySelector('#growth-top');
    if (growthTop) {
      growthTop.innerHTML = (growth.top || [])
        .slice(0, 5)
        .map(
          n => `
        <li>
          <span class="ops-mono">${String(n.nodeId || '').slice(0, 8)}</span>
          <small>r${n.playsReceived ?? 0} · p${n.playsPlaced ?? 0} · $${Number(n.volume ?? 0).toLocaleString()}</small>
        </li>
      `
        )
        .join('');
    }

    // Bun utils proof
    const bun = d.bunUtils || {
      bunVersion: '—',
      proofHash: '',
      passed: 0,
      total: 0,
      failed: 0,
    };
    const bunPass = this.querySelector('#bun-utils-pass');
    if (bunPass) {
      bunPass.textContent =
        bun.total > 0 ? `${bun.passed}/${bun.total}` : '—';
      bunPass.classList.toggle('ok', bun.total > 0 && bun.failed === 0);
      bunPass.classList.toggle('bad', bun.failed > 0);
    }
    const bunDetail = this.querySelector('#bun-utils-detail');
    if (bunDetail) {
      bunDetail.textContent =
        bun.total > 0
          ? `Bun v${bun.bunVersion} · ${bun.failed === 0 ? 'all pass' : bun.failed + ' fail'}`
          : 'Run bun run bun:utils-proof:write + ops:snapshot';
    }
    const bunHash = this.querySelector('#bun-utils-hash');
    if (bunHash) {
      bunHash.textContent = bun.proofHash
        ? `sha256 ${String(bun.proofHash).slice(0, 16)}…`
        : '';
    }

    // Routing proof (last artifact embedded in summary)
    const rt = d.routing || { available: false };
    const routingPass = this.querySelector('#routing-pass');
    if (routingPass) {
      if (rt.available && rt.total > 0) {
        routingPass.textContent = `${rt.passed}/${rt.total}`;
        routingPass.classList.toggle('ok', (rt.failed ?? 0) === 0 && (rt.criticalFailed ?? 0) === 0);
        routingPass.classList.toggle('bad', (rt.failed ?? 0) > 0 || (rt.criticalFailed ?? 0) > 0);
      } else {
        routingPass.textContent = '—';
        routingPass.classList.remove('ok', 'bad');
      }
    }
    const routingDetail = this.querySelector('#routing-detail');
    if (routingDetail) {
      routingDetail.textContent = rt.available
        ? `httpOk ${rt.httpOk ?? 0} · p50 ${rt.p50Ms ?? 0}ms · p95 ${rt.p95Ms ?? 0}ms · max ${rt.maxMs ?? 0}ms` +
          ` · err ${(Number(rt.errorRate ?? 0) * 100).toFixed(0)}%` +
          ` · critFail ${rt.criticalFailed ?? 0}` +
          ` · Δreg ${rt.regressions ?? 0}` +
          (rt.cache ? ` · cache ${rt.cache}` : '')
        : 'Run bun run routing:proof:write or ops:snapshot';
    }
    const routingHash = this.querySelector('#routing-hash');
    if (routingHash) {
      routingHash.textContent = rt.proofHash
        ? `sha256 ${String(rt.proofHash).slice(0, 16)}…`
        : '';
    }
    const routingCrit = this.querySelector('#routing-crit');
    if (routingCrit) {
      const routes = rt.routes || [];
      if (routes.length) {
        routingCrit.innerHTML = routes
          .slice(0, 6)
          .map(
            r => `
          <li class="${r.pass ? 'active' : 'inactive'}">
            <span class="ops-mono">${r.path}</span>
            <small>${r.status} · ${r.timeMs}ms${r.critical ? ' · crit' : ''}${r.pass ? '' : ' · FAIL'}</small>
          </li>`
          )
          .join('');
      } else {
        const paths = rt.criticalFailedPaths || [];
        routingCrit.innerHTML = paths
          .slice(0, 5)
          .map(p => `<li><span class="ops-mono">${p}</span><small>critical</small></li>`)
          .join('');
      }
    }

    // Experiments (C4)
    const exp = d.experiments || { byStatus: {}, active: 0, recent: [] };
    const expActive = this.querySelector('#exp-active');
    if (expActive) expActive.textContent = String(exp.active ?? 0);
    const expStatus = this.querySelector('#exp-status');
    if (expStatus) {
      const parts = Object.entries(exp.byStatus || {}).map(([k, v]) => `${k}: ${v}`);
      expStatus.textContent = parts.length ? parts.join(' · ') : 'No experiments yet';
    }
    const expUl = this.querySelector('#exp-list');
    if (expUl) {
      expUl.innerHTML = (exp.recent || [])
        .slice(0, 5)
        .map(
          e => `
        <li class="${e.status === 'active' ? 'active' : 'inactive'}">
          <span>${e.name}</span>
          <small>${e.status} · ${e.variants}v · ${e.assignments}a · ${e.metrics}m</small>
        </li>
      `
        )
        .join('');
    }

    // Prediction (C5)
    const cov = d.prediction?.coverage || { mae: 0, rmse: 0, bias: 0, n: 0 };
    const predMae = this.querySelector('#pred-mae');
    if (predMae) {
      predMae.textContent = cov.n > 0 ? `MAE ${Number(cov.mae).toFixed(2)}` : 'No rows';
    }
    const predDetail = this.querySelector('#pred-detail');
    if (predDetail) {
      predDetail.textContent =
        cov.n > 0
          ? `n=${cov.n} · RMSE ${Number(cov.rmse).toFixed(2)} · bias ${Number(cov.bias).toFixed(2)}`
          : 'Run ops:prediction backtest + report, then ops:snapshot for Pages';
    }
    const chart = this.querySelector('#pred-chart');
    if (chart) {
      // Prefer PNG (Bun.Image from WebView); fall back to SVG artifact
      const trySrc = ['/registry/prediction/coverage-chart.png', '/registry/prediction/coverage-chart.svg'];
      let i = 0;
      const next = () => {
        if (i >= trySrc.length) {
          chart.classList.add('hidden');
          return;
        }
        const src = trySrc[i++] + '?t=' + (d.generated || Date.now());
        chart.onload = () => chart.classList.remove('hidden');
        chart.onerror = () => next();
        chart.src = src;
      };
      next();
    }

    const tbody = this.querySelector('#plays-table tbody');
    if (tbody) {
      tbody.innerHTML = (d.plays || [])
        .map(
          p => `
        <tr>
          <td>${(p.sent_at || '').slice(11, 16)}</td>
          <td>${p.expert_name || ''}</td>
          <td>${p.event || ''}</td>
          <td>${p.selection || ''}</td>
          <td>${p.odds > 0 ? '+' : ''}${p.odds}</td>
          <td>${p.sent_count ?? 0}</td>
          <td>${p.placed_count ?? 0}</td>
        </tr>
      `
        )
        .join('');
    }

    const rail = this.querySelector('#rail-status');
    if (rail) {
      rail.innerHTML = (d.rails || [])
        .map(
          r => `
        <div class="rail-row">
          <span>${r.type}</span>
          <span>$${(r.total_sent ?? 0).toLocaleString()}</span>
          <span>${((r.total_sent / (r.monthly_limit || 1)) * 100).toFixed(0)}%</span>
        </div>
      `
        )
        .join('');
    }

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
