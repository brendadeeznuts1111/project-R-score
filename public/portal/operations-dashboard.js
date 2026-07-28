/**
 * Operations dashboard — live `/api/operations/summary` or static
 * `/registry/ops-summary.json` (Cloudflare Pages snapshot from `ops:snapshot`).
 * Includes factorial experiments (C4), coverage prediction (C5),
 * growth metrics, Bun utils runtime proof, and routing proof.
 */
import { renderVerificationResults, renderVerificationTableRow } from './verification-card.js';
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

/** Diverse preview: up to limitPer per subsystem so filters see non-runtime rows. */
function releasePreviewRowsBySubsystem(results, limitPer = 3, maxTotal = 12) {
  const filtered = releasePreviewRows(results);
  const order = ['runtime', 'package-manager', 'networking', 'bundler', 'test', 'other'];
  const bySub = new Map();
  for (const r of filtered) {
    const key = r.subsystem || 'other';
    if (!bySub.has(key)) bySub.set(key, []);
    bySub.get(key).push(r);
  }
  const out = [];
  const used = new Set();
  for (const sub of [...order, ...[...bySub.keys()].filter(k => !order.includes(k))]) {
    for (const r of (bySub.get(sub) || []).slice(0, limitPer)) {
      if (out.length >= maxTotal) return out;
      out.push(r);
      used.add(r.name);
    }
  }
  for (const r of filtered) {
    if (out.length >= maxTotal) break;
    if (used.has(r.name)) continue;
    out.push(r);
  }
  return out;
}

function releaseHasChannelMetaEmbeds(results) {
  return (results || []).some(r =>
    /^(runtime-nits:|bundler:|networking:)/.test(String(r.name || ''))
  );
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
  cloudflareTokenScope = null;
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
            <h2>Partner profiles</h2>
            <div class="ops-metric" id="partners-bound">0</div>
            <div class="ops-sub" id="partners-detail"></div>
            <ul id="partners-recent"></ul>
          </section>
          <section class="ops-panel">
            <h2>📊 Limit changes</h2>
            <div class="ops-metric" id="limits-count">0</div>
            <div class="ops-sub" id="limits-detail"></div>
            <div class="ops-sub" id="limits-patterns-detail" hidden></div>
            <div class="ops-sub" id="limits-predict-detail" hidden></div>
            <table id="limits-table" style="width:100%;font-size:0.85em;margin-top:4px">
              <thead><tr><th>Partner</th><th>Book</th><th>Sport</th><th>Market</th><th>Type</th><th>Old</th><th>New</th><th>Influence</th><th>When</th></tr></thead>
              <tbody id="limits-tbody"></tbody>
            </table>
            <a class="ops-link" href="/portal/limits/">Limits board</a>
            <a class="ops-link" href="/portal/partner-history/">Partner history</a>
            <a class="ops-link" href="/registry/limit-raises.json">limit-raises.json</a>
          </section>
          <section class="ops-panel">
            <h2>Ops channels</h2>
            <div class="ops-metric" id="channels-pending">0</div>
            <div class="ops-sub" id="channels-detail"></div>
          </section>
          <section class="ops-panel wide" id="telegram-handshake" data-subsystem="telegram">
            <h2>Package handshake <span class="version-badge subsystem-other">telegram</span></h2>
            <div class="ops-metric" id="telegram-handshake-gaps">—</div>
            <div class="ops-sub" id="telegram-handshake-detail"></div>
            <label class="ops-sub" id="telegram-handshake-filter-wrap" hidden>
              <input type="checkbox" id="telegram-handshake-gaps-only" />
              gaps only (2·house!)
            </label>
            <table id="telegram-handshake-table" class="ops-table hidden" aria-label="Package group handshake partners">
              <thead>
                <tr>
                  <th>CODE</th>
                  <th>Phase</th>
                  <th>MEM</th>
                  <th>Seat</th>
                  <th>Verify</th>
                  <th>Lanes</th>
                  <th>Invite</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
            <ul id="telegram-handshake-commands" class="ops-weave-scripts hidden"></ul>
            <a class="ops-link" id="telegram-handshake-json" href="/registry/telegram-handshake.json">Handshake JSON</a>
            <a class="ops-link" id="telegram-handshake-catalog" href="/registry/telegram-handshake-catalog.json">Catalog JSON</a>
          </section>
          <section class="ops-panel wide" id="seat-capital-desk" data-subsystem="telegram">
            <h2>Seat capital desk <span class="version-badge subsystem-other">telegram</span></h2>
            <div class="ops-metric" id="seat-capital-desk-metric">—</div>
            <div class="ops-sub" id="seat-capital-desk-detail"></div>
            <table id="seat-capital-desk-table" class="ops-table hidden" aria-label="Seat capital desks">
              <thead>
                <tr>
                  <th>Call</th>
                  <th>FUND</th>
                  <th>Outs</th>
                  <th>Incomplete</th>
                  <th>Pinned</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
            <div id="seat-capital-desk-expand" class="ops-sub"></div>
            <ul id="seat-capital-desk-commands" class="ops-weave-scripts hidden"></ul>
            <a class="ops-link" id="seat-capital-desk-json" href="/registry/seat-capital-desk.json">Seat desk JSON</a>
          </section>
          <section class="ops-panel">
            <h2>Ops loop</h2>
            <div class="ops-metric" id="loop-completion">0%</div>
            <div class="ops-sub" id="loop-detail"></div>
          </section>
          <section class="ops-panel">
            <h2>TOC Ops <span class="ops-badge" title="Operate-lite gates baked; Soft mutations not on Pages">DEMO</span></h2>
            <div class="ops-metric" id="toc-warmed">—</div>
            <div class="ops-sub" id="toc-detail"></div>
            <div class="ops-sub" id="toc-enforcement"></div>
            <a class="ops-link" href="/portal/toc/">Open TOC board (read-only)</a>
            <a class="ops-link" href="/portal/compliance/">MA/NJ compliance</a>
          </section>
          <section class="ops-panel" id="compliance-panel" data-subsystem="compliance">
            <h2>Compliance <span class="ops-badge" title="Baked MA/NJ board · shadow matrix · discrete geo">MA/NJ</span></h2>
            <div class="ops-metric" id="compliance-metric">—</div>
            <div class="ops-sub" id="compliance-detail"></div>
            <div class="ops-sub" id="compliance-geo"></div>
            <a class="ops-link" href="/portal/compliance/">Open compliance board</a>
            <a class="ops-link" href="/registry/compliance-board.json">Board JSON</a>
            <a class="ops-link" href="/api/compliance">API snapshot</a>
          </section>
          <section class="ops-panel" id="monorepo-health-panel" data-subsystem="harness">
            <h2>Monorepo health <span class="ops-badge" title="claim monorepo-health-score · gate check:monorepo-health">harness</span></h2>
            <div class="ops-metric" id="monorepo-health-metric">—</div>
            <div class="ops-sub" id="monorepo-health-detail"></div>
            <div class="ops-sub" id="monorepo-health-metrics"></div>
            <a class="ops-link" href="/portal/toc/#harness">TOC harness glance</a>
            <a class="ops-link" href="/portal/packages/">Packages map</a>
            <a class="ops-link" href="/registry/monorepo-health.json">Health JSON</a>
            <a class="ops-link" href="/registry/portal-chrome.json">Chrome registry</a>
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
          <section class="ops-panel wide" data-subsystem="networking">
            <h2>Networking verification <span class="version-badge subsystem-networking">networking</span></h2>
            <div class="ops-metric" id="networking-pass">—</div>
            <div class="ops-sub" id="networking-detail"></div>
            <div class="ops-mono" id="networking-hash"></div>
            <a class="ops-link" id="networking-link" href="/registry/networking-proof.json">Full networking proof JSON</a>
            <a class="ops-link" href="https://bun.com/docs/runtime/networking/fetch" target="_blank" rel="noopener">Bun fetch networking</a>
          </section>
          <section class="ops-panel wide" data-subsystem="package-manager">
            <h2>Install platform verification <span class="version-badge subsystem-package-manager">package-manager</span></h2>
            <div class="ops-metric" id="install-platform-pass">—</div>
            <div class="ops-sub" id="install-platform-detail"></div>
            <a class="ops-link" id="install-platform-link" href="/registry/install-platform.json">Full install platform proof JSON</a>
            <table id="install-platform-table" class="ops-table hidden">
              <thead><tr><th>Aspect</th><th>Status</th><th>Docs</th></tr></thead>
              <tbody></tbody>
            </table>
          </section>
          <section class="ops-panel wide" data-subsystem="package-manager">
            <h2>Install env + scoped registry verification <span class="version-badge subsystem-package-manager">package-manager</span></h2>
            <div class="ops-metric" id="install-env-pass">—</div>
            <div class="ops-sub" id="install-env-detail"></div>
            <a class="ops-link" id="install-env-link" href="/registry/install-env-proof.json">Full install env proof JSON</a>
            <a class="ops-link" href="https://bun.com/docs/pm/cli/install#configuring-with-environment-variables" target="_blank" rel="noopener">Bun install env vars</a>
            <table id="install-env-table" class="ops-table hidden">
              <thead><tr><th>Env var</th><th>Status</th><th>Docs</th></tr></thead>
              <tbody></tbody>
            </table>
          </section>
          <section class="ops-panel wide" data-subsystem="other">
            <h2>Docs coverage (RSS + reference) <span class="version-badge subsystem-other">other</span></h2>
            <div class="ops-metric" id="docs-coverage-pass">—</div>
            <div class="ops-sub" id="docs-coverage-detail"></div>
            <div class="ops-mono" id="docs-coverage-hash"></div>
            <a class="ops-link" id="docs-coverage-link" href="/registry/docs-coverage-proof.json">Full docs coverage proof JSON</a>
            <a class="ops-link" href="https://bun.com/reference" target="_blank" rel="noopener" title="Meta · stable — Complete generated API reference">Bun API Reference</a>
            <table id="docs-coverage-table" class="ops-table hidden">
              <thead><tr><th>Lane</th><th>Status</th><th>Detail</th></tr></thead>
              <tbody></tbody>
            </table>
          </section>
          <section class="ops-panel wide" data-subsystem="other">
            <h2>Cloudflare token scope + MCP catalog <span class="version-badge subsystem-other">other</span></h2>
            <div class="ops-metric" id="cloudflare-token-pass">—</div>
            <div class="ops-sub" id="cloudflare-token-detail"></div>
            <div class="ops-mono" id="cloudflare-token-hash"></div>
            <a class="ops-link" id="cloudflare-token-link" href="/registry/cloudflare-token-scope-proof.json">Token scope proof JSON</a>
            <a class="ops-link" href="/.well-known/mcp.json">/.well-known/mcp.json</a>
            <a class="ops-link" href="/registry/cloudflare-pages-preflight.json">Preflight report JSON</a>
            <div class="ops-sub" id="cloudflare-preflight-detail"></div>
            <table id="cloudflare-token-table" class="ops-table hidden">
              <thead><tr><th>Server</th><th>Status</th><th>URL</th></tr></thead>
              <tbody></tbody>
            </table>
          </section>
          <section class="ops-panel wide" data-subsystem="package-manager">
            <h2>Registry client SDK <span class="version-badge subsystem-package-manager">package-manager</span></h2>
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
          <section class="ops-panel wide" data-subsystem="runtime">
            <h2>Bun runtime nits (Phase 1) <span class="version-badge subsystem-runtime">runtime</span></h2>
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
          <section class="ops-panel" data-subsystem="runtime">
            <h2>Ratchet <span class="version-badge subsystem-runtime">ratchet</span></h2>
            <div class="ops-metric" id="ratchet-pass">—</div>
            <div class="ops-sub" id="ratchet-detail"></div>
            <div class="ops-mono" id="ratchet-hash"></div>
            <a class="ops-link" href="/registry/ratchet.json">Ratchet DB JSON</a>
            <a class="ops-link" href="https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/verification/ratchet.ts" target="_blank" rel="noopener">Ratchet source</a>
          </section>
          <section class="ops-panel" data-subsystem="other">
            <h2>Official guides <span class="version-badge subsystem-other">guides</span></h2>
            <div class="ops-metric" id="guides-pass">—</div>
            <div class="ops-sub" id="guides-detail"></div>
            <div class="ops-mono" id="guides-hash"></div>
            <a class="ops-link" href="/registry/guides-proof.json">Guides proof JSON</a>
            <a class="ops-link" href="https://bun.com/guides" target="_blank" rel="noopener">Bun guides</a>
          </section>
          <section class="ops-panel wide" data-subsystem="bundler">
            <h2>Bundler loaders (Asset Processing) <span class="version-badge subsystem-bundler">bundler</span></h2>
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
          <section class="ops-panel wide" data-subsystem="mixed">
            <h2>Proof taxonomy audit <span class="version-badge">mixed</span></h2>
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
          <section class="ops-panel wide" data-subsystem="mixed">
            <h2>Bun release verification <span class="version-badge" id="release-mode-badge">—</span></h2>
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
            <div class="ops-callout hidden" id="pred-empty-callout">
              No backtest rows yet —
              <code>bun run ops:snapshot:demo</code> or
              <code>bun run ops:prediction backtest</code>.
              <a href="/registry/prediction/report/">Open report</a>
            </div>
            <div class="ops-metric" id="pred-mae">—</div>
            <div class="ops-sub" id="pred-quality"></div>
            <div class="ops-sub" id="pred-detail"></div>
            <div class="ops-sub" id="pred-strip"></div>
            <a class="ops-link" id="pred-report-link" href="/registry/prediction/report/">Open report</a>
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
          <section class="ops-panel wide" id="portal-weave-panel">
            <h2>Portal weave</h2>
            <div class="ops-sub">Cross-surface links · <a href="/registry/portal-weave.json">portal-weave.json</a></div>
            <div id="portal-weave-surfaces" class="ops-weave-links"></div>
            <h3 class="ops-weave-h3">Wiki (GitHub Pages)</h3>
            <div id="portal-weave-wiki" class="ops-weave-links ops-weave-wiki"></div>
            <h3 class="ops-weave-h3">Operator scripts</h3>
            <ul id="portal-weave-scripts" class="ops-weave-scripts"></ul>
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
    const url = path && String(path).trim() ? String(path) : '/registry/release-features.json';
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

  async loadCloudflareTokenScope() {
    this.cloudflareTokenScope = null;
    try {
      const res = await fetch('/registry/cloudflare-token-scope-proof.json');
      if (res.ok) this.cloudflareTokenScope = await res.json();
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

  async loadRatchet() {
    this.ratchet = null;
    try {
      const res = await fetch('/registry/ratchet.json');
      if (res.ok) this.ratchet = await res.json();
    } catch {
      /* ratchet optional */
    }
  }

  async loadGuides() {
    this.guides = null;
    try {
      const res = await fetch('/registry/guides-proof.json');
      if (res.ok) this.guides = await res.json();
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

  async loadPortalWeave() {
    this.portalWeave = null;
    try {
      const res = await fetch('/registry/portal-weave.json');
      if (res.ok) this.portalWeave = await res.json();
    } catch {
      /* optional — baked by ops:snapshot */
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
    await this.loadCloudflareTokenScope();
    await this.loadBunRuntimeNits();
    await this.loadRatchet();
    await this.loadGuides();
    await this.loadBundlerLoaders();
    await this.loadProofTaxonomyAudit();
    await this.loadPortalWeave();
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
          <p>Could not load live ops data. Local: run <code>bun run serve:public</code> then <code>bun run ops:diagnose</code>. Pages: generate a snapshot then deploy <code>public/registry/*</code>.</p>
          <p class="error-hint"><a class="ops-link" href="/portal/ops.md">Ops runbook (MD)</a> · two pipelines: API assemble vs portal registry fetches</p>
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
      let label = 'Unknown';
      if (d.source === 'live') label = 'Live';
      else if (d.source === 'snapshot' && d.fallback === 'db-unavailable') {
        label = 'Snapshot (DB fallback)';
      } else if (d.source === 'snapshot') label = 'Snapshot';
      src.textContent = `${label}${when}`;
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

    const partnersBound = this.querySelector('#partners-bound');
    const partnersDetail = this.querySelector('#partners-detail');
    const partnersRecent = this.querySelector('#partners-recent');
    const tocWarmed = this.querySelector('#toc-warmed');
    const tocDetail = this.querySelector('#toc-detail');
    const tocEnf = this.querySelector('#toc-enforcement');
    if (tocWarmed && d.toc) {
      if (d.toc.available) {
        tocWarmed.textContent = String(d.toc.warmed ?? 0);
        if (tocDetail) {
          const idLink = d.toc.identityLinked
            ? `identity ${d.toc.identityPartners ?? 0} linked`
            : 'identity unlinked';
          const focus = d.toc.enforcementFocus ? `focus ${d.toc.enforcementFocus}` : 'no enf';
          const fails =
            d.toc.enforcementFailed != null ? `${d.toc.enforcementFailed} gate fails` : '';
          const topProc = d.toc.topRankedProcess ? `next ${d.toc.topRankedProcess}` : '';
          const settle =
            d.toc.settlementFloatRatio != null
              ? `settle ${Math.round(d.toc.settlementFloatRatio * 100)}%`
              : '';
          const principal =
            d.toc.principalOutstandingTotal != null
              ? `principal $${Math.round(d.toc.principalOutstandingTotal)}`
              : '';
          const settled = d.toc.playsSettled != null ? `${d.toc.playsSettled} settled` : '';
          const openTasks = d.toc.openTasks != null ? `${d.toc.openTasks} open tasks` : '';
          const bn = d.toc.openBottlenecks != null ? `${d.toc.openBottlenecks} bottlenecks` : '';
          tocDetail.textContent =
            `DEMO · ${idLink} · ${focus}${fails ? ` · ${fails}` : ''}${topProc ? ` · ${topProc}` : ''}${settle ? ` · ${settle}` : ''}${principal ? ` · ${principal}` : ''} · ` +
            `${d.toc.warming ?? 0} warming · ${d.toc.onboarding ?? 0} onboarding · ` +
            `${d.toc.openOnb ?? 0} ONB · ${d.toc.playsPending ?? 0} plays` +
            `${settled ? ` · ${settled}` : ''}` +
            `${openTasks ? ` · ${openTasks}` : ''}` +
            `${bn ? ` · ${bn}` : ''} · ` +
            `${d.toc.activeExperiments ?? 0} experiments`;
        }
        if (tocEnf) {
          const t = d.toc.throughputT;
          const i = d.toc.throughputI;
          const oe = d.toc.throughputOE;
          const crit = d.toc.enforcementCritical;
          const top = d.toc.topRankedProcess;
          const avgRP = d.toc.avgRP;
          const playable = d.toc.playableDrums != null ? ` · ${d.toc.playableDrums} playable` : '';
          const geo =
            d.toc.presenceUniqueZips != null
              ? ` · ${d.toc.presenceUniqueZips} zips` +
                (d.toc.presenceIpv6 != null ? ` · ${d.toc.presenceIpv6} ipv6` : '') +
                (d.toc.presenceUniqueAsns != null ? ` · ${d.toc.presenceUniqueAsns} ASN` : '')
              : '';
          const venue =
            d.toc.venueKinds != null
              ? ` · ${d.toc.venueKinds} venue kinds` +
                (d.toc.venueExchanges != null ? ` · ${d.toc.venueExchanges} exch` : '') +
                (d.toc.venueCrypto != null ? ` · ${d.toc.venueCrypto} crypto` : '')
              : '';
          const prof =
            d.toc.expertLiquidityAvailable != null
              ? ` · liq $${Math.round(d.toc.expertLiquidityAvailable)}` +
                (d.toc.avgAgentClvBps != null
                  ? ` · CLV ${Number(d.toc.avgAgentClvBps).toFixed(1)}bps`
                  : '') +
                (d.toc.openDeals != null ? ` · ${d.toc.openDeals} deals` : '') +
                (d.toc.profilePhones != null ? ` · ${d.toc.profilePhones} phones` : '')
              : '';
          const channel =
            d.toc.messageLogEntries != null
              ? ` · ${d.toc.messageLogEntries} msgs` +
                (d.toc.messageLogSlaBreaches ? ` · ${d.toc.messageLogSlaBreaches} SLA` : '') +
                (d.toc.avgExperimentLiftPct != null
                  ? ` · lift ${(Number(d.toc.avgExperimentLiftPct) * 100).toFixed(0)}%`
                  : '') +
                (d.toc.rotorSamples != null ? ` · rotor ${d.toc.rotorSamples}` : '') +
                (d.toc.capitalMoves != null ? ` · cap ${d.toc.capitalMoves}` : '') +
                (d.toc.warmCyclesOpen != null ? ` · warmΔ ${d.toc.warmCyclesOpen}` : '') +
                (d.toc.gate12Events != null ? ` · g12 ${d.toc.gate12Events}` : '') +
                (d.toc.balanceSheetsOk != null ? ` · sheet ${d.toc.balanceSheetsOk}` : '') +
                (d.toc.releaseCards != null ? ` · rel ${d.toc.releaseCards}` : '') +
                (d.toc.deferredPlays != null && d.toc.deferredPlays > 0
                  ? ` · defer ${d.toc.deferredPlays}`
                  : '') +
                (d.toc.pendingExposureTotal != null && d.toc.pendingExposureTotal > 0
                  ? ` · exp $${Math.round(d.toc.pendingExposureTotal)}`
                  : '') +
                (d.toc.complianceOpen != null && d.toc.complianceOpen > 0
                  ? ` · cf ${d.toc.complianceOpen}`
                  : '') +
                (d.toc.slaBreaches7d != null && d.toc.slaBreaches7d > 0
                  ? ` · slaΔ ${d.toc.slaBreaches7d}`
                  : '') +
                (d.toc.wdQueuedTotal != null && d.toc.wdQueuedTotal > 0
                  ? ` · wd ${d.toc.wdQueuedTotal}`
                  : '') +
                (d.toc.wdBlockedTotal != null && d.toc.wdBlockedTotal > 0
                  ? ` · wd⛔ ${d.toc.wdBlockedTotal}`
                  : '') +
                (d.toc.onbChecklistPending != null && d.toc.onbChecklistPending > 0
                  ? ` · onb ${d.toc.onbChecklistPending}`
                  : '') +
                (d.toc.playSettlementPending != null && d.toc.playSettlementPending > 0
                  ? ` · settle ${d.toc.playSettlementPending}`
                  : '') +
                (d.toc.exceptionResolutionOpen != null && d.toc.exceptionResolutionOpen > 0
                  ? ` · ex ${d.toc.exceptionResolutionOpen}`
                  : '')
              : '';
          const tioe =
            t != null
              ? `T $${Math.round(t)} · I $${Math.round(i ?? 0)} · OE $${Math.round(oe ?? 0)}` +
                (crit != null ? ` · ${crit} critical` : '') +
                playable +
                geo +
                venue +
                prof +
                channel
              : 'T/I/OE not baked — reseed toc';
          const ret =
            top != null
              ? ` · next ${top}` + (avgRP != null ? ` · avg R_P ${Number(avgRP).toFixed(3)}` : '')
              : '';
          tocEnf.textContent = tioe + ret;
        }
      } else if (tocDetail) {
        tocDetail.textContent = 'Fixture missing — bun run ops:seed:toc';
        if (tocEnf) tocEnf.textContent = '';
      }
    }

    const cmpMetric = this.querySelector('#compliance-metric');
    const cmpDetail = this.querySelector('#compliance-detail');
    const cmpGeo = this.querySelector('#compliance-geo');
    if (cmpMetric) {
      const c = d.compliance;
      if (c?.available) {
        cmpMetric.textContent = c.enhancements ?? (c.ok ? 'ok' : 'fail');
        cmpMetric.classList.toggle('ok', c.ok === true);
        cmpMetric.classList.toggle('bad', c.ok === false);
        if (cmpDetail) {
          const states = (c.states || ['MA', 'NJ']).join('/');
          const mm = c.shadowMismatches != null ? ` · shadow Δ ${c.shadowMismatches}` : '';
          const ab =
            c.shadowAllow != null ? ` · allow ${c.shadowAllow}/block ${c.shadowBlock ?? 0}` : '';
          const hmac = c.hmac ? ' · HMAC' : ' · integrity-only';
          cmpDetail.textContent = `${states}${mm}${ab}${hmac}${c.scoreHint ? ` · ${c.scoreHint}` : ''}`;
        }
        if (cmpGeo) {
          cmpGeo.textContent =
            c.geoProfiles != null
              ? `${c.geoProfiles} geo profiles (state|age|location|zip)`
              : 'geo profiles not on board — re-bake compliance';
        }
      } else {
        cmpMetric.textContent = '—';
        cmpMetric.classList.remove('ok', 'bad');
        if (cmpDetail) cmpDetail.textContent = 'Board missing — bun run compliance:bake';
        if (cmpGeo) cmpGeo.textContent = '';
      }
    }

    const mhMetric = this.querySelector('#monorepo-health-metric');
    const mhDetail = this.querySelector('#monorepo-health-detail');
    const mhMetrics = this.querySelector('#monorepo-health-metrics');
    if (mhMetric) {
      const m = d.monorepoHealth;
      if (m?.available && m.score != null) {
        mhMetric.textContent = String(m.score);
        mhMetric.classList.toggle('ok', m.grade === 'healthy');
        mhMetric.classList.toggle(
          'bad',
          m.grade === 'critical' || m.ok === false
        );
        if (mhDetail) {
          mhDetail.textContent = `${m.grade || '—'} · formula v${m.formulaVersion ?? '?'}${
            m.bunVersion ? ` · bun ${m.bunVersion}` : ''
          }`;
        }
        if (mhMetrics) {
          const parts = [];
          if (m.cyclicDependencyCount != null) parts.push(`cycles ${m.cyclicDependencyCount}`);
          if (m.largeFilePercent != null)
            parts.push(`large ${Number(m.largeFilePercent).toFixed(1)}%`);
          if (m.deadCodePercent != null)
            parts.push(`dead ${Number(m.deadCodePercent).toFixed(1)}%`);
          if (m.fileCount != null) parts.push(`files ${m.fileCount}`);
          mhMetrics.textContent = parts.length ? parts.join(' · ') : 'metrics n/a';
        }
      } else {
        mhMetric.textContent = '—';
        mhMetric.classList.remove('ok', 'bad');
        if (mhDetail)
          mhDetail.textContent = 'Missing — bun run monorepo:health:bake · ops:snapshot';
        if (mhMetrics) mhMetrics.textContent = '';
      }
    }

    if (partnersBound && d.partners) {
      partnersBound.textContent = String(d.partners.bound ?? 0);
      const lifecycle = d.partners.byLifecycle ?? {};
      const parts = Object.entries(lifecycle).map(([k, v]) => `${k}: ${v}`);
      if (partnersDetail) {
        partnersDetail.textContent =
          `${d.partners.unboundAgents ?? 0} unbound nodes` +
          (parts.length ? ` · ${parts.join(' · ')}` : '');
      }
      if (partnersRecent) {
        partnersRecent.innerHTML = (d.partners.recent ?? [])
          .slice(0, 5)
          .map(
            p =>
              `<li><span>${p.name}</span><small>${p.partnerTemplate ?? p.templateId} · ${p.lifecycleStatus}</small></li>`
          )
          .join('');
      }
    }

    // ── Limit changes panel ──
    const limitsCount = this.querySelector('#limits-count');
    const limitsDetail = this.querySelector('#limits-detail');
    const limitsPatternsDetail = this.querySelector('#limits-patterns-detail');
    const limitsPredictDetail = this.querySelector('#limits-predict-detail');
    const limitsTbody = this.querySelector('#limits-tbody');
    if (limitsCount && d.limitChanges) {
      const lims = d.limitChanges;
      limitsCount.textContent = String(lims.length);
      if (limitsDetail) {
        const raises = lims.filter(r => r.direction === 'up').length;
        const downs = lims.filter(r => r.direction === 'down').length;
        limitsDetail.textContent =
          `🚀${raises} ⬇️${downs} · Last: ${lims[0]?.message ?? 'none'}`;
      }
      if (limitsPatternsDetail) {
        const p = d.limitPatterns;
        if (p && (p.books?.length || p.states?.length || p.downlineNodes != null)) {
          const topBooks = (p.books ?? [])
            .slice(0, 3)
            .map(b => b.key)
            .filter(Boolean)
            .join(', ');
          const topStates = (p.states ?? [])
            .slice(0, 3)
            .map(s => s.key)
            .filter(Boolean)
            .join(', ');
          const cov =
            p.audit?.coveragePct != null
              ? `${Number(p.audit.coveragePct).toFixed(0)}% audit`
              : null;
          const bits = [
            topBooks ? `books ${topBooks}` : null,
            topStates ? `states ${topStates}` : null,
            p.downlineNodes != null ? `downline ${p.downlineNodes}` : null,
            cov,
          ].filter(Boolean);
          limitsPatternsDetail.hidden = bits.length === 0;
          limitsPatternsDetail.innerHTML = bits.length
            ? `Patterns · ${esc(bits.join(' · '))} · <a class="ops-link" href="/portal/limits/">board</a>`
            : '';
        } else {
          limitsPatternsDetail.hidden = true;
          limitsPatternsDetail.textContent = '';
        }
      }
      if (limitsPredictDetail) {
        const lr = d.prediction?.limitRaise;
        if (lr && (lr.n ?? 0) > 0) {
          limitsPredictDetail.hidden = false;
          const last = lr.lastPredicted ? ` · last ${String(lr.lastPredicted).slice(0, 19)}` : '';
          limitsPredictDetail.textContent = `limitRaise MAE ${Number(lr.mae ?? 0).toFixed(3)} · n=${lr.n}${last}`;
        } else {
          limitsPredictDetail.hidden = true;
          limitsPredictDetail.textContent = '';
        }
      }
      if (limitsTbody) {
        limitsTbody.innerHTML = lims
          .slice(0, 10)
          .map(r => {
            const drivers = (r.top_contributing_factors ?? []).join(', ');
            const proof = r.context_proof?.valid
              ? 'context proof verified'
              : r.context_proof?.signed
                ? 'signed context; proof not verified'
                : 'unsigned or pending context';
            const title = drivers ? `Drivers: ${drivers} · ${proof}` : `Drivers pending · ${proof}`;
            const score = r.context_available
              ? `${Math.round((r.multi_factor_score ?? 0) * 100)}`
              : 'pending';
            return `<tr><td>${esc(r.node_id?.slice(0, 12) ?? '—')}</td><td>${esc(r.sportsbook)}</td><td>${esc(r.sport_id)}</td><td>${esc(r.market_id)}</td><td>${esc(r.bet_type)}</td><td>$${Number(r.previous_max).toLocaleString()}</td><td><strong>$${Number(r.new_limit).toLocaleString()}</strong></td><td>${r.direction === 'down' ? '⬇️' : '🚀'}</td><td><span class="version-badge subsystem-other" title="${esc(title)}">${esc(score)}</span></td><td>${new Date(r.increased_at * 1000).toLocaleDateString()}</td></tr>`;
          })
          .join('');
      }
    }

    const channelsPending = this.querySelector('#channels-pending');
    const channelsDetail = this.querySelector('#channels-detail');
    if (channelsPending && d.channels) {
      channelsPending.textContent = String(d.channels.pending ?? 0);
      const failPct = ((d.channels.failRate ?? 0) * 100).toFixed(1);
      if (channelsDetail) {
        channelsDetail.textContent =
          `sent ${d.channels.sent ?? 0} · failed ${d.channels.failed ?? 0} · fail ${failPct}%` +
          (d.channels.oldestPendingAt
            ? ` · oldest ${String(d.channels.oldestPendingAt).slice(0, 19)}`
            : '');
      }
    }

    const tgHs = d.telegramHandshake;
    const tgGaps = this.querySelector('#telegram-handshake-gaps');
    const tgDetail = this.querySelector('#telegram-handshake-detail');
    const tgFilterWrap = this.querySelector('#telegram-handshake-filter-wrap');
    const tgGapsOnly = this.querySelector('#telegram-handshake-gaps-only');
    const tgTable = this.querySelector('#telegram-handshake-table');
    const tgTbody = tgTable?.querySelector('tbody');
    const tgCommands = this.querySelector('#telegram-handshake-commands');
    const tgCatalogLink = this.querySelector('#telegram-handshake-catalog');
    if (tgGaps && tgHs) {
      if (tgHs.available) {
        tgGaps.textContent = String(tgHs.inviteGaps ?? 0);
        tgGaps.classList.toggle('ok', (tgHs.inviteGaps ?? 0) === 0);
        tgGaps.classList.toggle('bad', (tgHs.inviteGaps ?? 0) > 0);
        const when = tgHs.generatedAt ? ` · baked ${String(tgHs.generatedAt).slice(0, 19)}` : '';
        if (tgDetail) {
          tgDetail.textContent = `${tgHs.partners ?? 0} linked · ${tgHs.operatorReady ?? 0} operator_ready · ${tgHs.designated ?? 0} designated · ${tgHs.forumReady ?? 0} forum_ready · ${tgHs.blocked ?? 0} blocked · verify fail ${tgHs.verifyFailPartners ?? 0} · lane fail ${tgHs.laneFailPartners ?? 0}${when}`;
        }
        if (tgFilterWrap) tgFilterWrap.hidden = false;
        if (tgCatalogLink && tgHs.catalogPath) tgCatalogLink.href = tgHs.catalogPath;
        if (tgGapsOnly && !tgGapsOnly.dataset.bound) {
          tgGapsOnly.dataset.bound = '1';
          tgGapsOnly.addEventListener('change', () => this.render());
        }
        const gapsOnly = tgGapsOnly?.checked === true;
        const rows = (tgHs.rows ?? []).filter(r => !gapsOnly || r.needsPartnerInForum);
        if (tgTable && tgTbody && rows.length > 0) {
          tgTable.classList.remove('hidden');
          tgTbody.innerHTML = rows
            .map(r => {
              const invite =
                r.needsPartnerInForum && r.inviteLink
                  ? r.inviteSentAt
                    ? `sent ${String(r.inviteSentAt).slice(0, 10)}`
                    : 'pending'
                  : r.inviteLink
                    ? 'stored'
                    : '—';
              const phaseClass =
                r.phase === 'blocked' ? 'match-no' : r.phase === 'operator_ready' ? 'match-ok' : '';
              const memClass = r.needsPartnerInForum ? 'match-no' : '';
              const verify =
                r.verifyTotal != null
                  ? `${r.verifyPassed ?? '?'}/${r.verifyTotal}`
                  : r.handshakeOk
                    ? 'OK'
                    : 'FAIL';
              const lanes = r.lanesTotal != null ? `${r.lanesOk ?? '?'}/${r.lanesTotal}` : '—';
              const detail =
                r.gapCount > 0 ||
                r.needsPartnerInForum ||
                (r.verifyFails || []).length ||
                (r.laneFails || []).length
                  ? `<details class="ops-handshake-detail"><summary>${esc(r.topGap || 'details')}</summary>${
                      r.inviteLink
                        ? `<p class="ops-mono"><a href="${esc(r.inviteLink)}" rel="noopener">${esc(r.inviteLink)}</a></p>`
                        : ''
                    }${
                      (r.verifyFails || [])
                        .map(
                          f =>
                            `<p class="ops-sub match-no">verify <code>${esc(f.id)}</code>: ${esc(f.detail)}</p>`
                        )
                        .join('') || ''
                    }${
                      (r.laneFails || [])
                        .map(
                          f =>
                            `<p class="ops-sub">lane <code>${esc(f.id)}</code> (${esc(f.group)}): ${esc(f.detail)}</p>`
                        )
                        .join('') || ''
                    }${
                      (r.nextSteps || []).map(s => `<p class="ops-sub">→ ${esc(s)}</p>`).join('') ||
                      ''
                    }${
                      (r.lanesBlocked || []).length
                        ? `<p class="ops-sub">blocked until link: ${esc(r.lanesBlocked.join(', '))}</p>`
                        : ''
                    }</details>`
                  : '';
              return `<tr class="${r.needsPartnerInForum ? 'ops-row-warn' : ''}">
                <td><code>${esc(r.partnerCode)}</code>${detail}</td>
                <td><span class="version-badge ${phaseClass}">${esc(r.phase)}</span></td>
                <td><span class="version-badge ${memClass}">${esc(r.membershipCell)}</span></td>
                <td>${esc(r.callSign ?? '—')}</td>
                <td>${esc(verify)}</td>
                <td>${esc(lanes)}</td>
                <td>${esc(invite)}</td>
              </tr>`;
            })
            .join('');
        } else if (tgTable) {
          tgTable.classList.add('hidden');
          if (tgTbody) tgTbody.innerHTML = '';
        }
        if (tgCommands && tgHs.commands) {
          tgCommands.classList.remove('hidden');
          tgCommands.innerHTML = Object.entries(tgHs.commands)
            .map(
              ([k, cmd]) =>
                `<li><span class="ops-mono">${esc(cmd)}</span> <small>(${esc(k)})</small></li>`
            )
            .join('');
        }
      } else {
        tgGaps.textContent = '—';
        tgGaps.classList.remove('ok', 'bad');
        if (tgDetail) {
          tgDetail.textContent =
            'No package groups — link via telegram:ops link-package-group, then bun run ops:snapshot';
        }
        if (tgFilterWrap) tgFilterWrap.hidden = true;
        if (tgTable) tgTable.classList.add('hidden');
        if (tgCommands) tgCommands.classList.add('hidden');
      }
    }

    const scd = d.seatCapitalDesk;
    const scdMetric = this.querySelector('#seat-capital-desk-metric');
    const scdDetail = this.querySelector('#seat-capital-desk-detail');
    const scdTable = this.querySelector('#seat-capital-desk-table');
    const scdTbody = scdTable?.querySelector('tbody');
    const scdExpand = this.querySelector('#seat-capital-desk-expand');
    const scdCommands = this.querySelector('#seat-capital-desk-commands');
    if (scdMetric && scd) {
      if (scd.available && scd.desks > 0) {
        const incomplete = scd.incompleteOuts ?? 0;
        const blocked = scd.blocked ?? 0;
        scdMetric.textContent = String(incomplete);
        scdMetric.classList.toggle('ok', incomplete === 0 && blocked === 0);
        scdMetric.classList.toggle('bad', incomplete > 0 || blocked > 0);
        const when = scd.generatedAt ? ` · baked ${String(scd.generatedAt).slice(0, 19)}` : '';
        if (scdDetail) {
          scdDetail.textContent = `${scd.desks} desks · blocked ${blocked} · partial ${scd.partial ?? 0} · ready ${scd.ready ?? 0} · funded ${scd.funded ?? 0}${when}`;
        }

        const rows = scd.rows ?? [];
        if (scdTable && scdTbody && rows.length > 0) {
          scdTable.classList.remove('hidden');
          scdTbody.innerHTML = rows
            .map(r => {
              const fundClass =
                r.fundStatus === 'blocked'
                  ? 'match-no'
                  : r.fundStatus === 'funded' || r.fundStatus === 'ready'
                    ? 'match-ok'
                    : '';
              return `<tr class="${(r.incompleteOuts ?? 0) > 0 ? 'ops-row-warn' : ''}">
                <td><code>${esc(r.callSign)}</code></td>
                <td><span class="version-badge ${fundClass}">${esc(r.fundStatus)}</span></td>
                <td>${esc(String(r.outs?.length ?? 0))}</td>
                <td>${esc(String(r.incompleteOuts ?? 0))}</td>
                <td>${r.pinned ? 'yes' : 'no'}</td>
              </tr>`;
            })
            .join('');
        } else if (scdTable) {
          scdTable.classList.add('hidden');
          if (scdTbody) scdTbody.innerHTML = '';
        }

        if (scdExpand) {
          const focusRows = rows.filter(r => (r.incompleteOuts ?? 0) > 0);
          const expandRows = focusRows.length > 0 ? focusRows : rows.slice(0, 1);
          scdExpand.innerHTML = expandRows
            .map(r => {
              const outsSummary =
                (r.outs ?? [])
                  .map(o => {
                    const bookMax =
                      o.bookMaxLine && o.bookMaxLine !== 'Book max (last known): no book history'
                        ? ` · ${esc(o.bookMaxLine)}`
                        : o.maxBet && o.maxBet !== '—'
                          ? ` · maxBet ${esc(o.maxBet)}`
                          : '';
                    return `${esc(o.outNum)} ${esc(o.book)} · ${esc(o.status)}${bookMax}`;
                  })
                  .join('<br>') || 'no outs on desk';
              const checklist =
                (r.checklist ?? [])
                  .map(c => `<li>${c.done ? '☑' : '☐'} ${esc(c.label)}</li>`)
                  .join('') || '<li>no checklist items</li>';
              return `<details class="ops-handshake-detail"><summary>${esc(r.callSign)} — ${esc(r.fundStatus)} (${esc(String(r.incompleteOuts ?? 0))} incomplete)</summary>
                <p class="ops-mono">${outsSummary}</p>
                <ul class="ops-weave-scripts">${checklist}</ul>
              </details>`;
            })
            .join('');
        }

        if (scdCommands && scd.commands) {
          scdCommands.classList.remove('hidden');
          scdCommands.innerHTML = Object.entries(scd.commands)
            .map(
              ([k, cmd]) =>
                `<li><span class="ops-mono">${esc(cmd)}</span> <small>(${esc(k)})</small></li>`
            )
            .join('');
        }
      } else {
        scdMetric.textContent = '—';
        scdMetric.classList.remove('ok', 'bad');
        if (scdDetail) {
          scdDetail.textContent =
            'No seat desks — run bun run seat:desk:post, then bun run ops:snapshot';
        }
        if (scdTable) scdTable.classList.add('hidden');
        if (scdTbody) scdTbody.innerHTML = '';
        if (scdExpand) scdExpand.innerHTML = '';
        if (scdCommands) scdCommands.classList.add('hidden');
      }
    }

    const loopCompletion = this.querySelector('#loop-completion');
    const loopDetail = this.querySelector('#loop-detail');
    if (loopCompletion && d.loop) {
      const rate = Number(d.loop.loopCompletionRate ?? 0);
      loopCompletion.textContent = `${(rate * 100).toFixed(0)}%`;
      loopCompletion.classList.toggle('ok', rate >= 0.6);
      loopCompletion.classList.toggle('bad', rate < 0.6 && d.loop.dispatched > 0);
      if (loopDetail) {
        const capParts = [];
        if (d.loop.capitalEfficiencyProxy != null) {
          capParts.push(`CE ${Number(d.loop.capitalEfficiencyProxy).toFixed(2)}`);
        }
        if (d.loop.limitEfficiencyProxy != null) {
          capParts.push(`LE ${Number(d.loop.limitEfficiencyProxy).toFixed(2)}`);
        }
        if (d.loop.processReturnProxy != null) {
          capParts.push(`RP ${Number(d.loop.processReturnProxy).toFixed(2)}`);
        }
        loopDetail.textContent =
          `disp ${d.loop.dispatched ?? 0} · full ${d.loop.settledViaFullLoop ?? 0}` +
          ` · manual ${d.loop.manualStepsPerCycle ?? 0}` +
          ` · outbox fail ${d.loop.outboxFailed ?? 0}` +
          (d.loop.oldestPendingAgeSec != null ? ` · oldest ${d.loop.oldestPendingAgeSec}s` : '') +
          ` · gate +${d.loop.gatedAllow ?? 0}/~${d.loop.gatedAdjust ?? 0}/-${d.loop.gatedDeny ?? 0}` +
          (d.loop.gatedDefer != null && d.loop.gatedDefer > 0
            ? ` · defer ${d.loop.gatedDefer}`
            : '') +
          (d.loop.loopCompletionRateByPlay != null
            ? ` · play ${Math.round(Number(d.loop.loopCompletionRateByPlay) * 100)}%`
            : '') +
          (d.loop.projectorBackend
            ? ` · projector ${d.loop.projectorBackend}` +
              (d.loop.projectorBucket ? `:${d.loop.projectorBucket}` : '') +
              (d.loop.projectorDurable ? '' : ' (attr)')
            : '') +
          (capParts.length ? ` · ${capParts.join(' · ')}` : '');
      }
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
      bunPass.textContent = bun.total > 0 ? `${bun.passed}/${bun.total}` : '—';
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
      bunHash.textContent = bun.proofHash ? `sha256 ${String(bun.proofHash).slice(0, 16)}…` : '';
    }

    // Routing proof (last artifact embedded in summary)
    const rt = d.routing || { available: false };
    const routingPass = this.querySelector('#routing-pass');
    if (routingPass) {
      if (rt.available && rt.total > 0) {
        routingPass.textContent = `${rt.passed}/${rt.total}`;
        routingPass.classList.toggle(
          'ok',
          (rt.failed ?? 0) === 0 && (rt.criticalFailed ?? 0) === 0
        );
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
      routingHash.textContent = rt.proofHash ? `sha256 ${String(rt.proofHash).slice(0, 16)}…` : '';
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
      docHash.textContent = doc.proofHash ? `sha256 ${String(doc.proofHash).slice(0, 16)}…` : '';
    }

    const tax = this.proofTaxonomyAudit || {};
    const pt = d.proofTaxonomy;
    const taxPass = this.querySelector('#taxonomy-pass');
    if (taxPass) {
      const audits = tax.audits || [];
      if (audits.length > 0) {
        const okCount = audits.filter(a => a.ok).length;
        taxPass.textContent = tax.ok
          ? `${okCount}/${audits.length} contracts`
          : `${okCount}/${audits.length} failing`;
        taxPass.classList.toggle('ok', tax.ok === true);
        taxPass.classList.toggle('bad', tax.ok !== true);
      } else if (pt?.available && pt.contracts != null) {
        const okCount = pt.contractsOk ?? 0;
        taxPass.textContent = pt.ok
          ? `${okCount}/${pt.contracts} contracts`
          : `${okCount}/${pt.contracts} failing`;
        taxPass.classList.toggle('ok', pt.ok === true);
        taxPass.classList.toggle('bad', pt.ok !== true);
      } else {
        taxPass.textContent = '—';
        taxPass.classList.remove('ok', 'bad');
      }
    }
    const taxDetail = this.querySelector('#taxonomy-detail');
    if (taxDetail) {
      const ts = tax.timestamp || pt?.timestamp;
      if (ts) {
        const consistency = tax.consistency || [];
        const cOk =
          consistency.length > 0 ? consistency.filter(c => c.ok).length : (pt?.consistencyOk ?? 0);
        const cTotal = consistency.length > 0 ? consistency.length : (pt?.consistencyTotal ?? 0);
        const cBit = cTotal > 0 ? ` · consistency ${cOk}/${cTotal}` : '';
        taxDetail.textContent = `audited ${String(ts).slice(0, 19)}${cBit}`;
      } else {
        taxDetail.textContent = 'Run bun run verify:proof-taxonomy:save';
      }
    }
    const taxHash = this.querySelector('#taxonomy-hash');
    if (taxHash) {
      const hash = tax.proofHash || pt?.proofHash;
      taxHash.textContent = hash ? `sha256 ${String(hash).slice(0, 16)}…` : '';
    }
    const taxTable = this.querySelector('#taxonomy-table');
    const taxTbody = taxTable?.querySelector('tbody');
    const taxRows =
      (tax.audits && tax.audits.length > 0 ? tax.audits : null) ||
      (pt?.audits && pt.audits.length > 0 ? pt.audits : []);
    if (taxTable && taxTbody) {
      if (taxRows.length > 0) {
        taxTable.classList.remove('hidden');
        taxTbody.innerHTML = taxRows
          .map(a => {
            const file =
              String(a.path || '')
                .split('/')
                .pop() || a.path;
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
        if (tags.channelPublishedAt)
          bits.push(`published ${String(tags.channelPublishedAt).slice(0, 10)}`);
        if (
          this.releaseFeaturesPath &&
          this.releaseFeaturesPath !== '/registry/release-features.json'
        ) {
          bits.push(`view ${this.releaseFeaturesPath}`);
        }
        relChannel.textContent = bits.join(' · ');
      } else {
        relChannel.textContent = '';
      }
    }
    const relHash = this.querySelector('#release-hash');
    if (relHash) {
      relHash.textContent = rel.proofHash ? `sha256 ${String(rel.proofHash).slice(0, 16)}…` : '';
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
    const modeBadge = this.querySelector('#release-mode-badge');
    if (modeBadge) {
      const hasMeta = releaseHasChannelMetaEmbeds(rows);
      const cm = d.channelMeta;
      if (hasMeta && cm?.stale) {
        modeBadge.textContent = `meta · ${rows.length} rows · STALE bake`;
        modeBadge.className = 'version-badge match-no';
      } else if (hasMeta) {
        modeBadge.textContent = `meta · ${rows.length} rows`;
        modeBadge.className = 'version-badge match-ok';
      } else if (cm?.type === 'ChannelMetaBakeInvalid' || cm?.stale) {
        modeBadge.textContent = 'bare release · bake invalid';
        modeBadge.className = 'version-badge match-no';
      } else {
        modeBadge.textContent = rows.length ? `bare release · ${rows.length} rows` : '—';
        modeBadge.className = 'version-badge';
      }
    }
    const previewRows = releasePreviewRowsBySubsystem(rows, 3, 12);
    const previewProof = rel.semanticTags ? { ...rel, results: previewRows } : rel;

    if (rel.semanticTags && relCards && previewRows.length > 0) {
      relCards.classList.remove('hidden');
      relCards.innerHTML = renderVerificationResults(previewProof, 12);
      if (relTable) relTable.classList.add('hidden');
    } else if (relTable && relTbody) {
      if (relCards) relCards.classList.add('hidden');
      if (previewRows.length > 0) {
        relTable.classList.remove('hidden');
        relTbody.innerHTML = previewRows
          .slice(0, 12)
          .map(r => renderVerificationTableRow(r))
          .join('');
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
    const dcTable = this.querySelector('#docs-coverage-table');
    const dcTbody = dcTable?.querySelector('tbody');
    const dcLanes = dc.lanes || [];
    if (dcTable && dcTbody) {
      if (dcLanes.length > 0) {
        dcTable.classList.remove('hidden');
        dcTbody.innerHTML = dcLanes
          .map(lane =>
            renderVerificationTableRow({
              name: lane.name,
              passed: lane.passed,
              subsystem: lane.subsystem,
              expected: lane.expected,
              actual: lane.actual,
              canonical: dc._links?.docs,
            })
          )
          .join('');
      } else {
        dcTable.classList.add('hidden');
        dcTbody.innerHTML = '';
      }
    }

    const cf =
      this.cloudflareTokenScope ||
      (d.cloudflareTokenScope?.available
        ? {
            summary: {
              ok: d.cloudflareTokenScope.ok,
              status: d.cloudflareTokenScope.status,
              tier: d.cloudflareTokenScope.tier,
              staticOk: d.cloudflareTokenScope.staticOk,
              liveOk: d.cloudflareTokenScope.liveOk,
            },
            mcpCatalog: {
              ok: d.cloudflareTokenScope.mcpCatalogOk,
              serverCount: d.cloudflareTokenScope.serverCount,
            },
            liveProbe: { available: d.cloudflareTokenScope.liveAvailable },
            proofHash: d.cloudflareTokenScope.proofHash,
          }
        : {});
    const cfPass = this.querySelector('#cloudflare-token-pass');
    if (cfPass) {
      if (cf.summary?.ok === true) {
        cfPass.textContent = '✅';
        cfPass.classList.add('ok');
        cfPass.classList.remove('bad');
      } else if (cf.summary?.status === 'partial') {
        cfPass.textContent = `⚠️ ${cf.summary.tier ?? 'partial'}`;
        cfPass.classList.toggle('ok', false);
        cfPass.classList.toggle('bad', true);
      } else if (cf.summary) {
        cfPass.textContent = '❌';
        cfPass.classList.toggle('ok', false);
        cfPass.classList.toggle('bad', true);
      } else {
        cfPass.textContent = '—';
      }
    }
    const cfDetail = this.querySelector('#cloudflare-token-detail');
    if (cfDetail) {
      const tier = cf.summary?.tier ?? '—';
      const live = cf.liveProbe?.available
        ? cf.summary?.liveOk === true
          ? 'live ✅'
          : 'live ❌'
        : 'live skipped';
      const catalog = cf.mcpCatalog?.ok
        ? `catalog ${cf.mcpCatalog.serverCount ?? 5}/5`
        : 'catalog ❌';
      cfDetail.textContent = `${catalog} · tier ${tier} · ${live}`;
    }
    const cfPreflight = this.querySelector('#cloudflare-preflight-detail');
    const pf = d.cloudflarePages;
    if (cfPreflight) {
      if (pf?.available && pf.steps?.length) {
        const bad = pf.steps.filter(s => !s.ok);
        cfPreflight.textContent = pf.ok
          ? `preflight ✅ (${pf.steps.length} steps)`
          : `preflight ❌ — ${bad.map(s => s.id).join(', ')}`;
      } else {
        cfPreflight.textContent = 'Run bun run cloudflare:preflight --save';
      }
    }
    const cfHash = this.querySelector('#cloudflare-token-hash');
    if (cfHash) {
      cfHash.textContent = cf.proofHash ? `sha256 ${String(cf.proofHash).slice(0, 16)}…` : '';
    }
    const cfTable = this.querySelector('#cloudflare-token-table');
    const cfTbody = cfTable?.querySelector('tbody');
    const cfRows = cf.mcpCatalog?.rows || [];
    if (cfTable && cfTbody) {
      if (cfRows.length > 0) {
        cfTable.classList.remove('hidden');
        cfTbody.innerHTML = cfRows
          .map(r =>
            renderVerificationTableRow({
              name: r.name,
              passed: r.ok,
              subsystem: 'other',
              expected: r.repoUrl ?? '—',
              actual: r.wellKnownUrl ?? '—',
            })
          )
          .join('');
      } else {
        cfTable.classList.add('hidden');
        cfTbody.innerHTML = '';
        fetch('/.well-known/mcp.json')
          .then(r => (r.ok ? r.json() : null))
          .then(wk => {
            if (!wk?.servers?.length || !cfTable || !cfTbody) return;
            cfTable.classList.remove('hidden');
            cfTbody.innerHTML = wk.servers
              .map(s =>
                renderVerificationTableRow({
                  name: s.name,
                  passed: true,
                  subsystem: 'other',
                  expected: s.url ?? '—',
                  actual: s.transport ?? 'http',
                })
              )
              .join('');
          })
          .catch(() => {});
      }
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
        ? `SDK v${rc.sdkVersion} · Bun ${rc.bunVersion ?? '?'} · ${(rc.results || []).filter(r => r.canonical).length}/${(rc.results || []).length} with canonical URLs${formatBySubsystem(rc.summary?.bySubsystem)}`
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

    // ── Ratchet panel ──
    const ratchet = this.ratchet || {};
    const ratchetStable = ratchet.channels?.stable || ratchet.channels?.latest;
    const ratchetPass = this.querySelector('#ratchet-pass');
    if (ratchetPass) {
      if (ratchetStable?.summary) {
        const s = ratchetStable.summary;
        const ok = s.passed === s.total;
        ratchetPass.textContent = ok ? '✅' : `${s.passed}/${s.total}`;
        ratchetPass.classList.toggle('ok', ok);
        ratchetPass.classList.toggle('bad', !ok);
      } else {
        ratchetPass.textContent = '—';
      }
    }
    const ratchetDetail = this.querySelector('#ratchet-detail');
    if (ratchetDetail) {
      ratchetDetail.textContent = ratchetStable
        ? `${ratchetStable.version} · verified ${(ratchetStable.verifiedAt || '').slice(0, 10)} · commit ${ratchetStable.provenance?.testSuiteCommit || '—'}`
        : 'No ratchet record — run bun run ratchet';
    }
    const ratchetHash = this.querySelector('#ratchet-hash');
    if (ratchetHash) {
      ratchetHash.textContent = ratchetStable?.proofHash
        ? `🔒 ${ratchetStable.proofHash.slice(0, 16)}…`
        : '';
    }

    // ── Official guides panel ──
    const guides = this.guides || {};
    const guidesPass = this.querySelector('#guides-pass');
    if (guidesPass) {
      const s = guides.summary;
      if (s?.total) {
        guidesPass.textContent = s.status === 'pass' ? '✅' : `${s.passed}/${s.total}`;
        guidesPass.classList.toggle('ok', s.status === 'pass');
        guidesPass.classList.toggle('bad', s.status !== 'pass');
      } else {
        guidesPass.textContent = '—';
      }
    }
    const guidesDetail = this.querySelector('#guides-detail');
    if (guidesDetail) {
      const resources = (guides.results || []).filter(
        r => !r.name.startsWith('install guide:')
      ).length;
      guidesDetail.textContent = guides.timestamp
        ? `guides index · install guide · /get · ${resources} URLs + 2 command dry-runs · ${guides.timestamp.slice(0, 10)}`
        : 'No guides proof — run bun run verify:guides:save';
    }
    const guidesHash = this.querySelector('#guides-hash');
    if (guidesHash) {
      guidesHash.textContent = guides.proofHash ? `🔒 ${guides.proofHash.slice(0, 16)}…` : '';
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
      if (bundler.bunVersion) {
        const loaders = [
          ...new Set((bundler.results || []).map(r => r.loader).filter(Boolean)),
        ].join(' · ');
        const loaderBit = loaders || 'loaders';
        bundlerDetail.textContent = `Bun ${bundler.bunVersion} · ${loaderBit} · subsystem bundler${formatBySubsystem(bundler.summary?.bySubsystem)}`;
      } else {
        bundlerDetail.textContent = 'Run bun run verify:bundler:save';
      }
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
        d.bunUtils?.total != null ? `${d.bunUtils.passed ?? 0}/${d.bunUtils.total} utils` : '—';
      snapPkgs.classList.toggle(
        'ok',
        (d.bunUtils?.failed ?? 0) === 0 && (d.bunUtils?.total ?? 0) > 0
      );
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
    const predEmpty = this.querySelector('#pred-empty-callout');
    if (predEmpty) {
      predEmpty.classList.toggle('hidden', cov.n > 0);
    }
    const predMae = this.querySelector('#pred-mae');
    if (predMae) {
      predMae.textContent = cov.n > 0 ? `MAE ${Number(cov.mae).toFixed(2)}` : 'No rows';
    }
    const predQuality = this.querySelector('#pred-quality');
    if (predQuality) {
      if (cov.n > 0 && cov.quality) {
        const q =
          cov.quality === 'good'
            ? 'Good fit'
            : cov.quality === 'fair'
              ? 'Fair fit'
              : cov.quality === 'poor'
                ? 'High error'
                : 'Unknown';
        const tr = cov.trend || 'unknown';
        const w5 =
          cov.within5Pct != null ? ` · ≤5 ${Number(cov.within5Pct).toFixed(0)}%` : '';
        predQuality.textContent = `${q} · ${tr}${w5}`;
      } else {
        predQuality.textContent = '';
      }
    }
    const predDetail = this.querySelector('#pred-detail');
    if (predDetail) {
      predDetail.textContent =
        cov.n > 0
          ? `n=${cov.n} · RMSE ${Number(cov.rmse).toFixed(2)} · bias ${Number(cov.bias).toFixed(2)}` +
            (cov.errorStdDev != null ? ` · σ ${Number(cov.errorStdDev).toFixed(2)}` : '') +
            (cov.worstDate ? ` · worst ${cov.worstDate}` : '')
          : 'Run bun run ops:snapshot:demo to seed + bake for Pages';
    }
    const predStrip = this.querySelector('#pred-strip');
    if (predStrip) {
      if (cov.n > 0 && cov.within5Status) {
        const target = cov.within5Target ?? 65;
        const tone = cov.stripTone || 'unknown';
        const decay = cov.decayDetected ? ' · decay warning' : '';
        predStrip.textContent = `Within 5: ${Number(cov.within5Pct ?? 0).toFixed(0)}% (target ${target}%) · trend ${cov.trend || '—'}${decay} · ${tone}`;
      } else {
        predStrip.textContent = '';
      }
    }
    const chart = this.querySelector('#pred-chart');
    if (chart) {
      // Prefer PNG (Bun.Image from WebView); fall back to SVG artifact
      const trySrc = [
        '/registry/prediction/coverage-chart.png',
        '/registry/prediction/coverage-chart.svg',
      ];
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

    const weave = this.portalWeave;
    const weaveSurfaces = this.querySelector('#portal-weave-surfaces');
    if (weaveSurfaces) {
      const surfaces = weave?.surfaces?.length
        ? weave.surfaces
        : [
            { label: 'Monitoring', href: '/monitoring/' },
            { label: 'DOD', href: '/portal/dod/' },
            { label: 'Skills', href: '/portal/skills/' },
            { label: 'Prediction', href: '/registry/prediction/report/' },
          ];
      weaveSurfaces.innerHTML = surfaces
        .map(
          s =>
            `<a class="ops-link" href="${esc(s.href)}" title="${esc(s.note || '')}">${esc(s.label)}</a>`
        )
        .join('');
    }
    const weaveWiki = this.querySelector('#portal-weave-wiki');
    if (weaveWiki) {
      const wikiLinks = weave?.wiki?.length ? weave.wiki : [];
      weaveWiki.innerHTML = wikiLinks.length
        ? wikiLinks
            .map(
              w =>
                `<a class="ops-link" href="${esc(w.href)}" target="_blank" rel="noopener noreferrer" title="${esc(w.note || '')}">${esc(w.label)}</a>`
            )
            .join('')
        : '<span class="ops-muted">Rebake portal-weave.json for wiki links</span>';
    }
    const weaveScripts = this.querySelector('#portal-weave-scripts');
    if (weaveScripts) {
      const scripts = weave?.scripts?.length
        ? weave.scripts
        : [
            { label: 'Demo snapshot', cmd: 'bun run ops:snapshot:demo' },
            { label: 'Reference discovery', cmd: 'bun run reference:discover:check' },
          ];
      weaveScripts.innerHTML = scripts
        .map(
          s =>
            `<li><code>${esc(s.cmd)}</code>${s.doc ? ` · <a href="/${esc(s.doc)}">doc</a>` : ''}</li>`
        )
        .join('');
    }
  }
}

function esc(s) {
  if (typeof s !== 'string') return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return s.replace(/[&<>"']/g, ch => map[ch]);
}

customElements.define('operations-dashboard', OperationsDashboard);
