/**
 * Operations dashboard — live `/api/operations/summary` or static
 * `/registry/ops-summary.json` (Cloudflare Pages snapshot from `ops:snapshot`).
 * Includes factorial experiments (C4), coverage prediction (C5),
 * growth metrics, Bun utils runtime proof, and routing proof.
 */
import {
  renderVerificationResults,
  renderVerificationTableRow,
} from './verification-card.js';
import './channel-filter.js';

/** Format summary.bySubsystem for ops panel subtitle. */
function formatBySubsystem(bySubsystem) {
  if (!bySubsystem || typeof bySubsystem !== 'object') return '';
  const parts = Object.entries(bySubsystem)
    .filter(([, v]) => v && typeof v.total === 'number' && v.total > 0)
    .map(([k, v]) => `${k} ${v.passed}/${v.total}`);
  return parts.length ? ` · ${parts.join(' · ')}` : '';
}

/** Rows duplicated in install-platform panel — omit from release card/table preview. */
function releasePreviewRows(results) {
  return (results || []).filter(r => !String(r.name || '').startsWith('install platform:'));
}

class OperationsDashboard extends HTMLElement {
  data = null;
  docIndex = null;
  releaseFeatures = null;
  releaseFeaturesPath = '/registry/release-features.json';
  verificationIndex = null;
  installPlatform = null;
  installEnv = null;
  networkingProof = null;
  registryClient = null;
  docsCoverage = null;
  bunRuntimeNits = null;
  bundlerLoaders = null;
  proofTaxonomyAudit = null;
  retries = 0;
  maxRetries = 3;

  async connectedCallback() {
    this.innerHTML = `
      <div class="ops-dashboard">
        <div id="ops-error" class="ops-banner error hidden"></div>
        <div id="ops-loading" class="ops-loading">
          <div class="skeleton skeleton-card" aria-busy="true" aria-label="Loading operations data">
            <div class="skeleton-line" style="width:40%"></div>
            <div class="skeleton-line" style="width:80%"></div>
            <div class="skeleton-line" style="width:60%"></div>
            <div class="skeleton-line" style="width:70%"></div>
          </div>
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
            <ul id="routing-routes"></ul>
            <ul id="routing-crit"></ul>
            <a class="ops-link" id="routing-link" href="/registry/@factorywager/routing-test/latest.json">Full routing JSON</a>
            <a class="ops-link" href="/registry/static.json">Static composite</a>
          </section>
          <section class="ops-panel">
            <h2>API documentation</h2>
            <div class="ops-metric" id="doc-refs-stable">—</div>
            <div class="ops-sub" id="doc-refs-detail"></div>
            <div class="ops-mono" id="doc-refs-hash"></div>
            <a class="ops-link" href="/api/doc-refs">Full doc index JSON</a>
            <a class="ops-link" href="/api/doc-refs/script.meta">Pipe metadata</a>
          </section>
          <section class="ops-panel wide">
            <h2>Networking verification</h2>
            <div class="ops-metric" id="networking-pass">—</div>
            <div class="ops-sub" id="networking-detail"></div>
            <div class="ops-mono" id="networking-hash"></div>
            <a class="ops-link" id="networking-link" href="/registry/networking-proof.json">Full networking proof JSON</a>
            <a class="ops-link" href="https://bun.com/docs/runtime/networking/fetch" target="_blank" rel="noopener">Bun fetch networking</a>
          </section>
          <section class="ops-panel wide">
            <h2>Install platform verification</h2>
            <div class="ops-metric" id="install-platform-pass">—</div>
            <div class="ops-sub" id="install-platform-detail"></div>
            <a class="ops-link" id="install-platform-link" href="/registry/install-platform.json">Full install platform proof JSON</a>
            <table id="install-platform-table" class="ops-table hidden">
              <thead><tr><th>Aspect</th><th>Status</th><th>Docs</th></tr></thead>
              <tbody></tbody>
            </table>
          </section>
          <section class="ops-panel wide">
            <h2>Install env + scoped registry verification</h2>
            <div class="ops-metric" id="install-env-pass">—</div>
            <div class="ops-sub" id="install-env-detail"></div>
            <a class="ops-link" id="install-env-link" href="/registry/install-env-proof.json">Full install env proof JSON</a>
            <a class="ops-link" href="https://bun.com/docs/pm/cli/install#configuring-with-environment-variables" target="_blank" rel="noopener">Bun install env vars</a>
            <table id="install-env-table" class="ops-table hidden">
              <thead><tr><th>Env var</th><th>Status</th><th>Docs</th></tr></thead>
              <tbody></tbody>
            </table>
          </section>
          <section class="ops-panel wide">
            <h2>Docs coverage (RSS + reference)</h2>
            <div class="ops-metric" id="docs-coverage-pass">—</div>
            <div class="ops-sub" id="docs-coverage-detail"></div>
            <div class="ops-mono" id="docs-coverage-hash"></div>
            <a class="ops-link" id="docs-coverage-link" href="/registry/docs-coverage-proof.json">Full docs coverage proof JSON</a>
            <a class="ops-link" href="https://bun.com/reference" target="_blank" rel="noopener" title="Meta · stable — Complete generated API reference">Bun API Reference</a>
          </section>
          <section class="ops-panel wide">
            <h2>Registry client SDK</h2>
            <div class="ops-metric" id="registry-client-pass">—</div>
            <div class="ops-sub" id="registry-client-detail"></div>
            <div class="ops-mono" id="registry-client-hash"></div>
            <a class="ops-link" id="registry-client-link" href="/registry/registry-client-proof.json">Full registry client proof JSON</a>
            <a class="ops-link" href="https://github.com/brendadeeznuts1111/project-R-score/blob/main/docs/registry-client.md" target="_blank" rel="noopener">Registry client docs</a>
            <table id="registry-client-table" class="ops-table hidden">
              <thead><tr><th>Probe</th><th>Status</th><th>Docs</th></tr></thead>
              <tbody></tbody>
            </table>
          </section>
          <section class="ops-panel wide">
            <h2>Bun runtime nits (Phase 1)</h2>
            <div class="ops-metric" id="runtime-nits-pass">—</div>
            <div class="ops-sub" id="runtime-nits-detail"></div>
            <div class="ops-mono" id="runtime-nits-hash"></div>
            <a class="ops-link" id="runtime-nits-link" href="/registry/bun-runtime-nits-proof.json">Full runtime nits proof JSON</a>
            <a class="ops-link" href="https://github.com/brendadeeznuts1111/project-R-score/blob/main/docs/bun-runtime-nits.md" target="_blank" rel="noopener">Runtime nits docs</a>
            <table id="runtime-nits-table" class="ops-table hidden">
              <thead><tr><th>Probe</th><th>Category</th><th>Status</th><th>Docs</th></tr></thead>
              <tbody></tbody>
            </table>
          </section>
          <section class="ops-panel wide">
            <h2>Bundler loaders (Asset Processing)</h2>
            <div class="ops-metric" id="bundler-loaders-pass">—</div>
            <div class="ops-sub" id="bundler-loaders-detail"></div>
            <div class="ops-mono" id="bundler-loaders-hash"></div>
            <a class="ops-link" id="bundler-loaders-link" href="/registry/bundler-loaders-proof.json">Full bundler loaders proof JSON</a>
            <a class="ops-link" href="https://bun.com/docs/bundler/loaders#css" target="_blank" rel="noopener">CSS loader</a>
            <a class="ops-link" href="https://bun.com/docs/bundler#content-types" target="_blank" rel="noopener">Asset Processing</a>
            <table id="bundler-loaders-table" class="ops-table hidden">
              <thead><tr><th>Probe</th><th>Status</th><th>Docs</th></tr></thead>
              <tbody></tbody>
            </table>
          </section>
          <section class="ops-panel wide">
            <h2>Proof taxonomy audit</h2>
            <div class="ops-metric" id="taxonomy-pass">—</div>
            <div class="ops-sub" id="taxonomy-detail"></div>
            <div class="ops-mono" id="taxonomy-hash"></div>
            <a class="ops-link" id="taxonomy-link" href="/registry/proof-taxonomy-audit.json">Full taxonomy audit JSON</a>
            <a class="ops-link" href="https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/verification/proof-taxonomy.ts" target="_blank" rel="noopener">Contract SSOT</a>
            <table id="taxonomy-table" class="ops-table hidden">
              <thead><tr><th>Artifact</th><th>Subsystem</th><th>Rows</th><th>Status</th></tr></thead>
              <tbody></tbody>
            </table>
          </section>
          <section class="ops-panel wide">
            <h2>Bun release verification</h2>
            <div class="ops-metric" id="release-pass">—</div>
            <div class="ops-sub" id="release-detail"></div>
            <div class="ops-mono" id="release-hash"></div>
            <div class="ops-mono" id="release-channel"></div>
            <div class="ops-mono" id="release-meta-bake"></div>
            <a class="ops-link" id="release-link" href="/registry/release-features.json">Full release proof JSON</a>
            <a class="ops-link" href="/registry/channel-meta-bake.json">Channel meta bake JSON</a>
            <a class="ops-link" href="https://bun.com/blog/bun-v1.3.14" target="_blank" rel="noopener">Bun v1.3.14 blog</a>
            <channel-filter></channel-filter>
            <div id="release-features-cards" class="verification-cards hidden"></div>
            <script type="application/ld+json" id="release-jsonld"></script>
            <table id="release-features-table" class="ops-table hidden">
              <thead><tr><th>Test</th><th>Status</th><th>Docs</th></tr></thead>
              <tbody></tbody>
            </table>
          </section>
          <section class="ops-panel">
            <h2>Snapshot health</h2>
            <div class="ops-metric" id="snap-packages">—</div>
            <div class="ops-sub" id="snap-detail"></div>
            <div class="ops-mono" id="snap-source"></div>
            <a class="ops-link" href="/api/monitoring">Live monitoring API</a>
            <a class="ops-link" href="/api/registry/static">/api/registry/static</a>
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

    this.addEventListener('proof-snapshot-change', async e => {
      const path = e.detail?.path || '';
      await this.loadReleaseFeatures(path || undefined);
      this.render();
      const filter = this.querySelector('channel-filter');
      filter?.applyFilter?.();
    });

    await this.load();
    this.render();
    this.startPolling();
  }

  async loadDocIndex() {
    this.docIndex = null;
    for (const url of ['/api/doc-refs', '/registry/doc-index.json']) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          this.docIndex = await res.json();
          return;
        }
      } catch {
        /* try next */
      }
    }
  }

  async loadReleaseFeatures(path) {
    const url = path && String(path).trim()
      ? String(path)
      : '/registry/release-features.json';
    this.releaseFeatures = null;
    this.releaseFeaturesPath = url;
    try {
      const res = await fetch(url);
      if (res.ok) this.releaseFeatures = await res.json();
    } catch {
      /* snapshot optional */
    }
    const link = this.querySelector('#release-link');
    if (link) link.setAttribute('href', url);
  }

  async loadVerificationIndex() {
    this.verificationIndex = null;
    try {
      const res = await fetch('/registry/verification-index.json');
      if (res.ok) this.verificationIndex = await res.json();
    } catch {
      /* optional */
    }
    const filter = this.querySelector('channel-filter');
    if (filter && typeof filter.setSnapshots === 'function') {
      filter.setSnapshots(this.verificationIndex?.snapshots || [], this.releaseFeaturesPath || '');
    }
  }

  async loadInstallPlatform() {
    this.installPlatform = null;
    try {
      const res = await fetch('/registry/install-platform.json');
      if (res.ok) this.installPlatform = await res.json();
    } catch {
      /* snapshot optional */
    }
  }

  async loadInstallEnv() {
    this.installEnv = null;
    try {
      const res = await fetch('/registry/install-env-proof.json');
      if (res.ok) this.installEnv = await res.json();
    } catch {
      /* snapshot optional */
    }
  }

  async loadNetworkingProof() {
    this.networkingProof = null;
    try {
      const res = await fetch('/registry/networking-proof.json');
      if (res.ok) this.networkingProof = await res.json();
    } catch {
      /* snapshot optional */
    }
  }

  async loadRegistryClient() {
    this.registryClient = null;
    try {
      const res = await fetch('/registry/registry-client-proof.json');
      if (res.ok) this.registryClient = await res.json();
    } catch {
      /* snapshot optional */
    }
  }

  async loadDocsCoverage() {
    this.docsCoverage = null;
    try {
      const res = await fetch('/registry/docs-coverage-proof.json');
      if (res.ok) this.docsCoverage = await res.json();
    } catch {
      /* snapshot optional */
    }
  }

  async loadBunRuntimeNits() {
    this.bunRuntimeNits = null;
    try {
      const res = await fetch('/registry/bun-runtime-nits-proof.json');
      if (res.ok) this.bunRuntimeNits = await res.json();
    } catch {
      /* snapshot optional */
    }
  }

  async loadBundlerLoaders() {
    this.bundlerLoaders = null;
    try {
      const res = await fetch('/registry/bundler-loaders-proof.json');
      if (res.ok) this.bundlerLoaders = await res.json();
    } catch {
      /* snapshot optional */
    }
  }

  async loadProofTaxonomyAudit() {
    this.proofTaxonomyAudit = null;
    try {
      const res = await fetch('/registry/proof-taxonomy-audit.json');
      if (res.ok) this.proofTaxonomyAudit = await res.json();
    } catch {
      /* optional — run bun run verify:proof-taxonomy:save */
    }
  }

  async loadVerificationArtifacts() {
    await this.loadDocIndex();
    await this.loadReleaseFeatures();
    await this.loadVerificationIndex();
    await this.loadInstallPlatform();
    await this.loadInstallEnv();
    await this.loadNetworkingProof();
    await this.loadRegistryClient();
    await this.loadDocsCoverage();
    await this.loadBunRuntimeNits();
    await this.loadBundlerLoaders();
    await this.loadProofTaxonomyAudit();
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
        await this.loadVerificationArtifacts();
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
        await this.loadVerificationArtifacts();
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
      error.innerHTML = `<div class="error-state">
          <h3>Operations summary unavailable</h3>
          <p>Could not load live ops data. Local: run <code>bun run serve:public</code>. Pages: generate a snapshot then deploy <code>public/registry/*</code>.</p>
          <code class="error-code">OPS_SUMMARY_UNAVAILABLE: /api/operations/summary</code>
          <button type="button" class="retry-btn error-action">Retry</button>
        </div>`;
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
      const errPct =
        rt.errorRate != null ? ` · err ${(Number(rt.errorRate) * 100).toFixed(0)}%` : '';
      const cacheNote = rt.stale ? ' · STALE' : rt.cached ? ' · cached' : '';
      routingDetail.textContent = rt.available
        ? `httpOk ${rt.httpOk ?? 0} · mean ${rt.meanMs ?? 0}ms · p50 ${rt.p50Ms ?? 0}ms · p95 ${rt.p95Ms ?? 0}ms · max ${rt.maxMs ?? 0}ms` +
          ` · critFail ${rt.criticalFailed ?? 0}` +
          ` · Δreg ${rt.regressions ?? 0}` +
          errPct +
          cacheNote
        : 'Run bunx --bun ops-snapshot (or routing:proof:write)';
    }
    const routingHash = this.querySelector('#routing-hash');
    if (routingHash) {
      routingHash.textContent = rt.proofHash
        ? `sha256 ${String(rt.proofHash).slice(0, 16)}…`
        : '';
    }
    const routingRoutes = this.querySelector('#routing-routes');
    if (routingRoutes) {
      const rows = Array.isArray(rt.routes) ? rt.routes : [];
      const show = rows.filter(r => !r.pass).slice(0, 4);
      const fallback = rows.slice(0, 3);
      const list = show.length ? show : fallback;
      routingRoutes.innerHTML = list
        .map(
          r => `
        <li class="${r.pass ? 'active' : 'inactive'}">
          <span class="ops-mono">${r.path}</span>
          <small>${r.pass ? 'pass' : 'FAIL'} · ${r.status} · ${r.timeMs}ms${r.critical ? ' · crit' : ''}</small>
        </li>`
        )
        .join('');
    }
    const routingCrit = this.querySelector('#routing-crit');
    if (routingCrit) {
      const paths = rt.criticalFailedPaths || [];
      routingCrit.innerHTML = paths
        .slice(0, 5)
        .map(p => `<li><span class="ops-mono">${p}</span><small>critical</small></li>`)
        .join('');
    }

    const doc = this.docIndex || {};
    const docStable = this.querySelector('#doc-refs-stable');
    if (docStable) {
      const stable = doc.byStability?.stable ?? 0;
      const total = doc.totalEntries ?? 0;
      if (total > 0) {
        docStable.textContent = `${stable} stable`;
        docStable.classList.toggle('ok', stable > 0);
        docStable.classList.remove('bad');
      } else {
        docStable.textContent = '—';
        docStable.classList.remove('ok', 'bad');
      }
    }
    const docDetail = this.querySelector('#doc-refs-detail');
    if (docDetail) {
      const total = doc.totalEntries ?? 0;
      docDetail.textContent =
        total > 0
          ? `${total} APIs indexed · defaults docs ${doc.defaultsCoverage?.passed ? '✅' : '❌'}`
          : 'Run bun tools/build-doc-index.ts --save';
    }
    const docHash = this.querySelector('#doc-refs-hash');
    if (docHash) {
      docHash.textContent = doc.proofHash
        ? `sha256 ${String(doc.proofHash).slice(0, 16)}…`
        : '';
    }

    const tax = this.proofTaxonomyAudit || {};
    const taxPass = this.querySelector('#taxonomy-pass');
    if (taxPass) {
      const audits = tax.audits || [];
      if (audits.length > 0) {
        const okCount = audits.filter(a => a.ok).length;
        taxPass.textContent = tax.ok ? `${okCount}/${audits.length} contracts` : `${okCount}/${audits.length} failing`;
        taxPass.classList.toggle('ok', tax.ok === true);
        taxPass.classList.toggle('bad', tax.ok !== true);
      } else {
        taxPass.textContent = '—';
        taxPass.classList.remove('ok', 'bad');
      }
    }
    const taxDetail = this.querySelector('#taxonomy-detail');
    if (taxDetail) {
      if (tax.timestamp) {
        const consistency = tax.consistency || [];
        const cOk = consistency.filter(c => c.ok).length;
        const cTotal = consistency.length;
        const cBit = cTotal > 0 ? ` · consistency ${cOk}/${cTotal}` : '';
        taxDetail.textContent = `audited ${String(tax.timestamp).slice(0, 19)}${cBit}`;
      } else {
        taxDetail.textContent = 'Run bun run verify:proof-taxonomy:save';
      }
    }
    const taxHash = this.querySelector('#taxonomy-hash');
    if (taxHash) {
      taxHash.textContent = tax.proofHash ? `sha256 ${String(tax.proofHash).slice(0, 16)}…` : '';
    }
    const taxTable = this.querySelector('#taxonomy-table');
    const taxTbody = taxTable?.querySelector('tbody');
    const taxRows = tax.audits || [];
    if (taxTable && taxTbody) {
      if (taxRows.length > 0) {
        taxTable.classList.remove('hidden');
        taxTbody.innerHTML = taxRows
          .map(a => {
            const file = String(a.path || '').split('/').pop() || a.path;
            const rowLabel = a.rows > 0 ? String(a.rows) : 'report';
            const status = a.ok ? '✅' : '❌';
            const subBadge = a.primarySubsystem
              ? `<span class="version-badge subsystem-${a.primarySubsystem}">${a.primarySubsystem}</span>`
              : '—';
            return `<tr><td><a href="${a.reportPath || '#'}" class="ops-link">${file}</a></td><td>${subBadge}</td><td>${rowLabel}</td><td>${status}</td></tr>`;
          })
          .join('');
      } else {
        taxTable.classList.add('hidden');
        taxTbody.innerHTML = '';
      }
    }

    const rel = this.releaseFeatures || {};
    const relPass = this.querySelector('#release-pass');
    if (relPass) {
      const total = rel.summary?.total ?? 0;
      const passed = rel.summary?.passed ?? 0;
      if (total > 0) {
        relPass.textContent = `${passed}/${total} passed`;
        relPass.classList.toggle('ok', passed === total);
        relPass.classList.toggle('bad', passed < total);
      } else {
        relPass.textContent = '—';
        relPass.classList.remove('ok', 'bad');
      }
    }
    const relDetail = this.querySelector('#release-detail');
    if (relDetail) {
      const tags = rel.semanticTags;
      if (tags) {
        const match =
          tags.targetMatchesRuntime === true
            ? ' · runtime✓'
            : tags.targetMatchesRuntime === false
              ? ' · runtime≠'
              : '';
        const canary = tags.canaryCommitShort ? ` · canary ${tags.canaryCommitShort}` : '';
        relDetail.textContent = `channel ${tags.channel} → ${tags.targetVersion}${canary}${match} · runtime ${tags.runtimeVersion} · ${rel.releaseNotes?.length ?? 0} notes${formatBySubsystem(rel.summary?.bySubsystem)}`;
      } else if (rel.bunVersion) {
        relDetail.textContent = `Bun ${rel.bunVersion} · ${rel.releaseNotes?.length ?? 0} release notes tracked`;
      } else {
        relDetail.textContent = 'Run bun tools/verify-bun-release.ts --save';
      }
    }
    const relChannel = this.querySelector('#release-channel');
    if (relChannel) {
      const tags = rel.semanticTags;
      if (tags) {
        const bits = [`provenance ${tags.provenanceId}`];
        if (tags.testSuiteCommit) bits.push(`commit ${String(tags.testSuiteCommit).slice(0, 8)}`);
        if (tags.channelResolveSource) bits.push(`via ${tags.channelResolveSource}`);
        if (tags.channelPublishedAt) bits.push(`published ${String(tags.channelPublishedAt).slice(0, 10)}`);
        if (this.releaseFeaturesPath && this.releaseFeaturesPath !== '/registry/release-features.json') {
          bits.push(`view ${this.releaseFeaturesPath}`);
        }
        relChannel.textContent = bits.join(' · ');
      } else {
        relChannel.textContent = '';
      }
    }
    const relHash = this.querySelector('#release-hash');
    if (relHash) {
      relHash.textContent = rel.proofHash
        ? `sha256 ${String(rel.proofHash).slice(0, 16)}…`
        : '';
    }
    const relBake = this.querySelector('#release-meta-bake');
    if (relBake) {
      const cm = d.channelMeta;
      if (cm?.available) {
        const src = cm.sources
          ? ` · sources ${cm.sources.release}/${cm.sources.nits}/${cm.sources.bundler}/${cm.sources.networking}`
          : '';
        const when = cm.updatedAt ? ` · baked ${String(cm.updatedAt).slice(0, 19)}` : '';
        const stale = cm.stale ? ' · STALE vs release-features' : '';
        relBake.textContent = `meta bake ${cm.passed ?? '—'}/${cm.total ?? '—'} ${cm.status ?? ''}${src}${when}${stale}`;
        relBake.classList.toggle('ok', cm.ok === true && !cm.stale);
        relBake.classList.toggle('bad', cm.ok === false || cm.stale === true);
      } else {
        relBake.textContent = 'meta bake — run bun run verify:channel:meta';
        relBake.classList.remove('ok', 'bad');
      }
    }
    const relCards = this.querySelector('#release-features-cards');
    const relTable = this.querySelector('#release-features-table');
    const relTbody = relTable?.querySelector('tbody');
    const relJsonLd = this.querySelector('#release-jsonld');
    const rows = rel.results || [];
    const previewRows = releasePreviewRows(rows);
    const previewProof = rel.semanticTags ? { ...rel, results: previewRows } : rel;

    if (rel.semanticTags && relCards && previewRows.length > 0) {
      relCards.classList.remove('hidden');
      relCards.innerHTML = renderVerificationResults(previewProof, 12);
      if (relTable) relTable.classList.add('hidden');
    } else if (relTable && relTbody) {
      if (relCards) relCards.classList.add('hidden');
      if (previewRows.length > 0) {
        relTable.classList.remove('hidden');
        relTbody.innerHTML = previewRows.slice(0, 12).map(r => renderVerificationTableRow(r)).join('');
      } else {
        relTable.classList.add('hidden');
        relTbody.innerHTML = '';
      }
    }

    if (relJsonLd && rel.jsonLd) {
      relJsonLd.textContent = JSON.stringify(rel.jsonLd);
    } else if (relJsonLd) {
      relJsonLd.textContent = '';
    }

    const net = this.networkingProof || {};
    const netPass = this.querySelector('#networking-pass');
    if (netPass) {
      const g = net.global;
      if (g?.checksTotal) {
        netPass.textContent = `${g.checksPassed}/${g.checksTotal} checks`;
        netPass.classList.toggle('ok', net.allOk === true);
        netPass.classList.toggle('bad', net.allOk !== true);
      } else {
        netPass.textContent = '—';
      }
    }
    const netDetail = this.querySelector('#networking-detail');
    if (netDetail) {
      netDetail.textContent = net.bunVersion
        ? `subsystem ${net.subsystem ?? 'networking'} · ${net.targets?.length ?? 0} targets · base ${net.base ?? '—'}${net.remote ? ' · remote' : ''}`
        : 'Run bun tools/verify-networking.ts --local-only --save';
    }
    const netHash = this.querySelector('#networking-hash');
    if (netHash) {
      netHash.textContent = net.proofHash ? `sha256 ${String(net.proofHash).slice(0, 16)}…` : '';
    }

    const ip = this.installPlatform || {};
    const ipPass = this.querySelector('#install-platform-pass');
    if (ipPass) {
      const s = ip.summary;
      if (s?.total) {
        ipPass.textContent = `${s.passed}/${s.total} aspects`;
        ipPass.classList.toggle('ok', s.status === 'pass');
        ipPass.classList.toggle('bad', s.status !== 'pass');
      } else {
        ipPass.textContent = '—';
      }
    }
    const ipDetail = this.querySelector('#install-platform-detail');
    if (ipDetail) {
      ipDetail.textContent = ip.bunVersion
        ? `Bun ${ip.bunVersion}${ip.dryRun ? ' · dry-run' : ''} · ${(ip.results || []).filter(r => r.canonical).length}/${(ip.results || []).length} with canonical URLs${formatBySubsystem(ip.summary?.bySubsystem)}`
        : 'Run bun tools/verify-install-platform.ts --save';
    }
    const ipTable = this.querySelector('#install-platform-table');
    const ipTbody = ipTable?.querySelector('tbody');
    const ipRows = ip.results || [];
    if (ipTable && ipTbody) {
      if (ipRows.length > 0) {
        ipTable.classList.remove('hidden');
        ipTbody.innerHTML = ipRows
          .map(r =>
            renderVerificationTableRow({
              name: r.name.replace(/^install platform: /, ''),
              passed: r.passed,
              canonical: r.canonical,
              canonicalKind: r.canonicalKind,
              canonicalStability: r.canonicalStability,
              subsystem: r.subsystem ?? 'package-manager',
              _links: r._links,
            })
          )
          .join('');
      } else {
        ipTable.classList.add('hidden');
        ipTbody.innerHTML = '';
      }
    }

    const ie = this.installEnv || {};
    const iePass = this.querySelector('#install-env-pass');
    if (iePass) {
      const s = ie.summary;
      if (s?.total) {
        iePass.textContent = `${s.passed}/${s.total} env probes`;
        iePass.classList.toggle('ok', s.status === 'pass');
        iePass.classList.toggle('bad', s.status !== 'pass');
      } else {
        iePass.textContent = '—';
      }
    }
    const ieDetail = this.querySelector('#install-env-detail');
    if (ieDetail) {
      ieDetail.textContent = ie.bunVersion
        ? `Bun ${ie.bunVersion} · ${(ie.results || []).filter(r => r.canonical).length}/${(ie.results || []).length} with canonical URLs`
        : 'Run bun tools/verify-install-env.ts --save';
    }
    const ieTable = this.querySelector('#install-env-table');
    const ieTbody = ieTable?.querySelector('tbody');
    const ieRows = ie.results || [];
    if (ieTable && ieTbody) {
      if (ieRows.length > 0) {
        ieTable.classList.remove('hidden');
        ieTbody.innerHTML = ieRows
          .map(r =>
            renderVerificationTableRow({
              ...r,
              name: r.name ?? r.envVar,
              subsystem: r.subsystem ?? 'package-manager',
            })
          )
          .join('');
      } else {
        ieTable.classList.add('hidden');
        ieTbody.innerHTML = '';
      }
    }

    const dc =
      this.docsCoverage ||
      (d.docsCoverage?.available
        ? {
            summary: {
              ok: d.docsCoverage.ok,
              missingCanonicalCount: d.docsCoverage.missingCanonicalCount,
              indexStale: d.docsCoverage.indexStale,
            },
            canonical: {
              catalogTracked: d.docsCoverage.catalogTracked,
              catalogTotal: d.docsCoverage.catalogTotal,
              overlayTracked: d.docsCoverage.overlayTracked,
              overlayTotal: d.docsCoverage.overlayTotal,
            },
            reference: {
              moduleCount: d.docsCoverage.referenceModuleCount,
              pageCount: d.docsCoverage.referencePageCount,
            },
            proofHash: d.docsCoverage.proofHash,
          }
        : {});
    const dcPass = this.querySelector('#docs-coverage-pass');
    if (dcPass) {
      if (dc.summary?.ok === true) {
        dcPass.textContent = '✅';
        dcPass.classList.add('ok');
        dcPass.classList.remove('bad');
      } else if (dc.summary) {
        dcPass.textContent = dc.summary.missingCanonicalCount
          ? `⚠️ ${dc.summary.missingCanonicalCount} gaps`
          : '⚠️';
        dcPass.classList.toggle('ok', false);
        dcPass.classList.toggle('bad', true);
      } else {
        dcPass.textContent = '—';
      }
    }
    const dcDetail = this.querySelector('#docs-coverage-detail');
    if (dcDetail) {
      const cat = dc.canonical;
      const ref = dc.reference;
      if (cat?.catalogTotal != null) {
        dcDetail.textContent = `catalog ${cat.catalogTracked}/${cat.catalogTotal} · overlay ${cat.overlayTracked}/${cat.overlayTotal} · reference ${ref?.moduleCount ?? '—'} modules`;
      } else {
        dcDetail.textContent = 'Run bun run verify:docs-coverage:save';
      }
    }
    const dcHash = this.querySelector('#docs-coverage-hash');
    if (dcHash) {
      dcHash.textContent = dc.proofHash ? `sha256 ${String(dc.proofHash).slice(0, 16)}…` : '';
    }

    const rc =
      this.registryClient ||
      (d.registryClient?.available
        ? {
            sdkVersion: d.registryClient.sdkVersion,
            bunVersion: d.bunUtils?.bunVersion,
            proofHash: d.registryClient.proofHash,
            summary: {
              passed: d.registryClient.passed,
              total: d.registryClient.total,
              status: d.registryClient.status,
            },
          }
        : {});
    const rcPass = this.querySelector('#registry-client-pass');
    if (rcPass) {
      const s = rc.summary;
      if (s?.total) {
        rcPass.textContent = s.status === 'pass' ? '✅' : `${s.passed}/${s.total} probes`;
        rcPass.classList.toggle('ok', s.status === 'pass');
        rcPass.classList.toggle('bad', s.status !== 'pass');
      } else {
        rcPass.textContent = '—';
      }
    }
    const rcDetail = this.querySelector('#registry-client-detail');
    if (rcDetail) {
      rcDetail.textContent = rc.sdkVersion
        ? `SDK v${rc.sdkVersion} · Bun ${rc.bunVersion ?? '?'} · ${(rc.results || []).filter(r => r.canonical).length}/${(rc.results || []).length} with canonical URLs`
        : 'Run bun tools/verify-registry-client.ts --save';
    }
    const rcHash = this.querySelector('#registry-client-hash');
    if (rcHash) {
      rcHash.textContent = rc.proofHash ? `sha256 ${String(rc.proofHash).slice(0, 16)}…` : '';
    }
    const rcTable = this.querySelector('#registry-client-table');
    const rcTbody = rcTable?.querySelector('tbody');
    const rcRows = rc.results || [];
    if (rcTable && rcTbody) {
      if (rcRows.length > 0) {
        rcTable.classList.remove('hidden');
        rcTbody.innerHTML = rcRows.map(r => renderVerificationTableRow(r)).join('');
      } else {
        rcTable.classList.add('hidden');
        rcTbody.innerHTML = '';
      }
    }

    const nits = this.bunRuntimeNits || {};
    const nitsPass = this.querySelector('#runtime-nits-pass');
    if (nitsPass) {
      const s = nits.summary;
      if (s?.total) {
        nitsPass.textContent = s.status === 'pass' ? '✅' : `${s.passed}/${s.total} probes`;
        nitsPass.classList.toggle('ok', s.status === 'pass');
        nitsPass.classList.toggle('bad', s.status !== 'pass');
      } else {
        nitsPass.textContent = '—';
      }
    }
    const nitsDetail = this.querySelector('#runtime-nits-detail');
    if (nitsDetail) {
      nitsDetail.textContent = nits.bunVersion
        ? `Bun ${nits.bunVersion} · inspect · streams · url · file-io · ${(nits.results || []).filter(r => r.canonical).length}/${(nits.results || []).length} canonical${formatBySubsystem(nits.summary?.bySubsystem)}`
        : 'Run bun tools/verify-bun-runtime-nits.ts --save';
    }
    const nitsHash = this.querySelector('#runtime-nits-hash');
    if (nitsHash) {
      nitsHash.textContent = nits.proofHash ? `sha256 ${String(nits.proofHash).slice(0, 16)}…` : '';
    }
    const nitsTable = this.querySelector('#runtime-nits-table');
    const nitsTbody = nitsTable?.querySelector('tbody');
    const nitsRows = nits.results || [];
    if (nitsTable && nitsTbody) {
      if (nitsRows.length > 0) {
        nitsTable.classList.remove('hidden');
        nitsTbody.innerHTML = nitsRows
          .map(r =>
            renderVerificationTableRow({
              name: `${r.category}: ${r.name || r.probe}`,
              passed: r.passed,
              canonical: r.canonical,
              canonicalKind: r.canonicalKind,
              subsystem: r.subsystem ?? 'runtime',
              _links: r._links,
            })
          )
          .join('');
      } else {
        nitsTable.classList.add('hidden');
        nitsTbody.innerHTML = '';
      }
    }

    const bundler = this.bundlerLoaders || {};
    const bundlerPass = this.querySelector('#bundler-loaders-pass');
    if (bundlerPass) {
      const s = bundler.summary;
      if (s?.total) {
        bundlerPass.textContent = s.status === 'pass' ? '✅' : `${s.passed}/${s.total} probes`;
        bundlerPass.classList.toggle('ok', s.status === 'pass');
        bundlerPass.classList.toggle('bad', s.status !== 'pass');
      } else {
        bundlerPass.textContent = '—';
      }
    }
    const bundlerDetail = this.querySelector('#bundler-loaders-detail');
    if (bundlerDetail) {
      bundlerDetail.textContent = bundler.bunVersion
        ? `Bun ${bundler.bunVersion} · css · jsonc · subsystem bundler${formatBySubsystem(bundler.summary?.bySubsystem)}`
        : 'Run bun run verify:bundler:save';
    }
    const bundlerHash = this.querySelector('#bundler-loaders-hash');
    if (bundlerHash) {
      bundlerHash.textContent = bundler.proofHash
        ? `sha256 ${String(bundler.proofHash).slice(0, 16)}…`
        : '';
    }
    const bundlerTable = this.querySelector('#bundler-loaders-table');
    const bundlerTbody = bundlerTable?.querySelector('tbody');
    const bundlerRows = bundler.results || [];
    if (bundlerTable && bundlerTbody) {
      if (bundlerRows.length > 0) {
        bundlerTable.classList.remove('hidden');
        bundlerTbody.innerHTML = bundlerRows
          .map(r =>
            renderVerificationTableRow({
              name: r.loader ? `${r.loader}: ${r.name || r.probe}` : r.name || r.probe,
              passed: r.passed,
              canonical: r.canonical,
              canonicalKind: r.canonicalKind,
              subsystem: r.subsystem ?? 'bundler',
              _links: r._links,
            })
          )
          .join('');
      } else {
        bundlerTable.classList.add('hidden');
        bundlerTbody.innerHTML = '';
      }
    }

    // Snapshot health card (packages from tree/registry hints + generation)
    const snapPkgs = this.querySelector('#snap-packages');
    if (snapPkgs) {
      const n = d.tree?.partners != null ? (d.packageCount ?? null) : null;
      // Prefer routing total as "routes probed" proxy when packageCount absent
      snapPkgs.textContent =
        d.bunUtils?.total != null
          ? `${d.bunUtils.passed ?? 0}/${d.bunUtils.total} utils`
          : '—';
      snapPkgs.classList.toggle('ok', (d.bunUtils?.failed ?? 0) === 0 && (d.bunUtils?.total ?? 0) > 0);
      snapPkgs.classList.toggle('bad', (d.bunUtils?.failed ?? 0) > 0);
      void n;
    }
    const snapDetail = this.querySelector('#snap-detail');
    if (snapDetail) {
      const liq = d.liquidity?.total ?? 0;
      const exp = d.experiments?.active ?? 0;
      const predN = d.prediction?.coverage?.n ?? 0;
      const cm = d.channelMeta;
      const metaBit = cm?.available
        ? ` · meta ${cm.passed ?? '—'}/${cm.total ?? '—'}${cm.stale ? ' stale' : ''}`
        : '';
      snapDetail.textContent = `liquidity $${Number(liq).toLocaleString()} · experiments ${exp} · prediction n=${predN}${metaBit}`;
    }
    const snapSource = this.querySelector('#snap-source');
    if (snapSource) {
      const cm = d.channelMeta;
      const metaSrc =
        cm?.sources != null
          ? ` · meta ${cm.sources.release}/${cm.sources.nits}/${cm.sources.bundler}/${cm.sources.networking}`
          : '';
      snapSource.textContent = d.generated
        ? `${d.source || 'snapshot'} · ${String(d.generated).slice(0, 19)}${metaSrc}`
        : metaSrc.trim();
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

function esc(s) {
  if (typeof s !== 'string') return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return s.replace(/[&<>"']/g, ch => map[ch]);
}

customElements.define('operations-dashboard', OperationsDashboard);
