/**
 * Portal executive dashboard — /portal/dashboard/
 * Composes monitoring + ops-summary + Bun defaults (+ channel meta).
 * @see docs/portal-foundation.md
 */

function esc(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtTime(iso) {
  if (!iso) return '—';
  const s = String(iso);
  return s.length >= 19 ? `${s.slice(0, 19).replace('T', ' ')} UTC` : s;
}

function fmtMoney(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return `$${Number(n).toLocaleString('en-US')}`;
}

function statusClass(ok, warn) {
  if (ok) return 'ok';
  if (warn) return 'warn';
  return 'bad';
}

async function fetchJson(urls, timeoutMs = 8000) {
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) continue;
      return { data: await res.json(), source: url };
    } catch {
      /* try next */
    }
  }
  return null;
}

function mergeRouting(mon, ops) {
  const r = mon?.routeStats?.routing || ops?.routing || {};
  return {
    passed: r.passed ?? 0,
    total: r.total ?? 0,
    httpOk: r.httpOk ?? 0,
    criticalFailed: r.criticalFailed ?? 0,
    p95Ms: r.p95Ms,
    errorRate: r.errorRate ?? 0,
    proofHash: r.proofHash,
    baseUrl: r.baseUrl,
    routes: r.routes || ops?.routing?.routes || [],
  };
}

/** Normalize local compact `/api/defaults` vs edge/raw proof shape. */
function normalizeDefaults(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.summary && typeof raw.summary === 'object') return raw;
  if (raw.passed != null || raw.total != null || raw.status) {
    return {
      bunVersion: raw.bunVersion,
      bunRevision: raw.bunRevision,
      proofHash: raw.proofHash,
      timestamp: raw.generated || raw.timestamp,
      summary: {
        passed: raw.passed,
        total: raw.total,
        status: raw.status,
      },
      tests: Array.isArray(raw.tests) ? raw.tests : [],
    };
  }
  return raw;
}

function card(title, val, sub = '', cls = '') {
  return `<div class="dash-card ${cls}"><h3>${esc(title)}</h3><div class="val">${esc(val)}</div>${
    sub ? `<div class="sub">${esc(sub)}</div>` : ''
  }</div>`;
}

function renderProofTiles(mon, ops, defaults) {
  const bun = mon?.bunApiProof || {};
  const bu = ops?.bunUtils || {};
  const rc = mon?.registryClientProof || ops?.registryClient || {};
  const dc = mon?.docsCoverageProof || ops?.docsCoverage || {};
  const tax = ops?.proofTaxonomy || {};
  const net = mon?.networkingProof;
  const defSum = defaults?.summary || {};
  const tiles = [
    {
      title: 'Bun defaults',
      val: `${defSum.passed ?? '?'}/${defSum.total ?? '?'}`,
      sub: defaults?.proofHash ? `${defaults.proofHash.slice(0, 16)}…` : defSum.status || '',
      ok: defSum.status === 'pass' || (defSum.passed != null && defSum.passed >= defSum.total),
      href: '/api/defaults',
    },
    {
      title: 'Bun utils',
      val: `${bun.demosPassed ?? bu.passed ?? '?'}/${bun.demosTotal ?? bu.total ?? '?'}`,
      sub: bu.bunVersion ? `Bun ${bu.bunVersion}` : bun.generated ? fmtTime(bun.generated) : '',
      ok: (bu.failed ?? 0) === 0 && (bu.passed ?? bun.demosPassed ?? 0) >= (bu.total ?? bun.demosTotal ?? 1),
      href: '/registry/@factorywager/bun-utils-test/latest.json',
    },
    {
      title: 'Registry client',
      val: rc.available === false ? 'n/a' : `${rc.passed ?? '?'}/${rc.total ?? '?'}`,
      sub: rc.status || '',
      ok: rc.status === 'pass' || (rc.passed != null && rc.total != null && rc.passed >= rc.total),
      href: rc.path || '/registry/registry-client-proof.json',
    },
    {
      title: 'Docs coverage',
      val: dc.available === false ? 'n/a' : dc.ok ? 'ok' : 'drift',
      sub: dc.catalogTracked != null ? `${dc.catalogTracked}/${dc.catalogTotal} tracked` : '',
      ok: dc.ok !== false,
      href: dc.path || '/registry/docs-coverage-proof.json',
    },
    {
      title: 'Networking',
      val: net ? (net.allOk ? 'ok' : 'degraded') : ops?.networking?.available === false ? 'n/a' : '—',
      sub: net?.proofHash ? `${net.proofHash.slice(0, 16)}…` : '',
      ok: net ? net.allOk : ops?.networking?.allOk,
      href: '/registry/networking-proof.json',
    },
    {
      title: 'Proof taxonomy',
      val: tax.available === false ? 'n/a' : tax.ok ? `${tax.contractsOk ?? '?'}/${tax.contracts ?? '?'}` : 'fail',
      sub: tax.consistencyOk != null ? `${tax.consistencyOk}/${tax.consistencyTotal} consistency` : '',
      ok: tax.ok === true,
      href: tax.path || '/registry/proof-taxonomy-audit.json',
    },
  ];
  return `<div class="dash-proof-grid">${tiles
    .map(
      (t) =>
        `<a class="dash-proof ${statusClass(t.ok, t.ok === undefined)}" href="${esc(t.href)}"><h4>${esc(
          t.title
        )}</h4><div class="val">${esc(t.val)}</div><div class="sub">${esc(t.sub)}</div></a>`
    )
    .join('')}</div>`;
}

function renderExperts(experts) {
  if (!Array.isArray(experts) || !experts.length) {
    return '<p class="dash-empty">No experts in ops summary — empty DB is valid on Pages snapshot.</p>';
  }
  const body = experts
    .slice(0, 8)
    .map((e) => {
      const active = e.active ? 'active' : 'inactive';
      return `<li class="${active}"><span>${esc(e.name)} <small>${esc(e.sport)} · ${esc(e.market)}</small></span><small>edge ${(
        Number(e.edge_score) || 0
      ).toFixed(2)}</small></li>`;
    })
    .join('');
  return `<ul class="dash-list">${body}</ul>`;
}

function renderPlays(plays) {
  if (!Array.isArray(plays) || !plays.length) {
    return '<p class="dash-empty">No recent plays.</p>';
  }
  const body = plays
    .slice(0, 6)
    .map((p) => {
      const res = String(p.result || 'pending');
      const cls = res === 'win' ? 'st-ok' : res === 'loss' ? 'st-bad' : 'st-warn';
      return `<tr>
        <td>${esc(p.sport)}</td>
        <td class="mono">${esc(p.event)}</td>
        <td class="mono">${esc(p.selection)}</td>
        <td>${esc(p.expert_name || '')}</td>
        <td class="${cls}">${esc(res)}</td>
      </tr>`;
    })
    .join('');
  return `<div class="dash-table-wrap"><table class="dash-table">
    <thead><tr><th>Sport</th><th>Event</th><th>Pick</th><th>Expert</th><th>Result</th></tr></thead>
    <tbody>${body}</tbody>
  </table></div>`;
}

function renderDefaultsTable(defaults) {
  const tests = defaults?.tests;
  if (!Array.isArray(tests) || !tests.length) {
    return '<p class="dash-empty">Defaults proof unavailable — try <code>/api/defaults</code> locally.</p>';
  }
  const body = tests
    .map(
      (t) =>
        `<tr><td>${esc(t.name)}</td><td class="dim">${esc(t.expected)}</td><td class="${
          t.passed ? 'st-ok' : 'st-bad'
        }">${t.passed ? 'pass' : 'fail'}</td></tr>`
    )
    .join('');
  const hash = defaults.proofHash ? `<p class="dash-hash mono">proof ${esc(defaults.proofHash)}</p>` : '';
  return `${hash}<div class="dash-table-wrap"><table class="dash-table">
    <thead><tr><th>Test</th><th>Expected</th><th>Result</th></tr></thead>
    <tbody>${body}</tbody>
  </table></div>`;
}

function renderChannel(ops, release) {
  const cm = ops?.channelMeta || {};
  const sum = release?.summary || {};
  const channel = cm.channel || sum.channel || '—';
  const target = cm.targetVersion || sum.version || '—';
  const passed = cm.passed ?? sum.passed;
  const total = cm.total ?? sum.total;
  const by = cm.bySubsystem || sum.bySubsystem || {};
  const subs = Object.entries(by)
    .filter(([, v]) => v && typeof v.total === 'number' && v.total > 0)
    .map(([k, v]) => `${k} ${v.passed}/${v.total}`)
    .join(' · ');
  const ok = cm.ok !== false && (sum.status === 'pass' || (passed != null && passed >= total));
  return {
    html: `<div class="dash-channel ${statusClass(ok)}">
      <div class="dash-channel-main">
        <span class="lbl">Release channel</span>
        <span class="val">${esc(channel)} · ${esc(target)}</span>
        <span class="sub">${passed ?? '?'}/${total ?? '?'} features${cm.stale ? ' · stale bake' : ''}</span>
      </div>
      <div class="dash-channel-subs dim">${esc(subs || 'no subsystem rollup')}</div>
      <div class="dash-actions tight">
        <a href="/portal/ops/">Ops verification</a>
        <a href="/registry/release-features.json">release-features.json</a>
        <a href="/registry/channel-meta-bake.json">channel-meta bake</a>
      </div>
    </div>`,
    ok,
  };
}

function renderRoutingStrip(routing) {
  const ok = routing.total > 0 && routing.passed >= routing.total && (routing.criticalFailed ?? 0) === 0;
  const failed = (routing.routes || []).filter((r) => !r.pass);
  return `<div class="dash-strip">
    <div><span class="lbl">Routing</span> <span class="${statusClass(ok)}">${
      routing.total ? `${routing.passed}/${routing.total}` : '—'
    }</span></div>
    <div class="dim">base ${esc(routing.baseUrl || '—')}</div>
    <div class="dim">p95 ${routing.p95Ms != null ? `${Number(routing.p95Ms).toFixed(1)}ms` : '—'}</div>
    <div>${
      failed.length
        ? `<span class="st-bad">${failed.length} failed</span>`
        : '<span class="st-ok">all pass</span>'
    }</div>
    <a href="/monitoring/">Full probes</a>
  </div>`;
}

export function renderExecutiveDashboard(payload) {
  const { mon, monSource, ops, opsSource, defaults, defaultsSource, release } = payload;
  const routing = mergeRouting(mon, ops);
  const env = mon?.env || {};
  const integrity = mon?.lastIntegrity || {};
  const growth = ops?.growth || {};
  const tree = ops?.tree || {};
  const liquidity = ops?.liquidity?.total;
  const channel = renderChannel(ops, release);

  const routeOk = routing.total > 0 && routing.passed >= routing.total && (routing.criticalFailed ?? 0) === 0;
  const envOk = (env.summary?.requiredMissing ?? 0) === 0;
  const defOk =
    defaults?.summary?.status === 'pass' ||
    (defaults?.summary?.passed != null && defaults.summary.passed >= defaults.summary.total);
  const overallOk = routeOk && envOk && defOk && channel.ok !== false;

  const bannerCls = overallOk ? 'ok' : routeOk && envOk ? 'warn' : 'bad';
  const meta = [
    `mon ${fmtTime(mon?.timestamp || mon?.snapshotAt)}`,
    monSource ? monSource.replace(/^\//, '') : null,
    ops ? `ops ${opsSource?.replace(/^\//, '') || ops.source || '—'}` : null,
    defaultsSource ? `defaults ${defaultsSource.replace(/^\//, '')}` : null,
    'refresh 30s',
  ]
    .filter(Boolean)
    .join(' · ');

  const pkgCount = mon?.packageCount ?? 0;
  const verCount = mon?.versionCount ?? 0;
  const defSum = defaults?.summary || {};

  return {
    bannerCls,
    meta,
    overallTitle: overallOk ? 'Operations healthy' : routeOk ? 'Operations degraded' : 'Attention required',
    cardsHtml: [
      card('Registry', pkgCount || '—', `${verCount} versions`, pkgCount > 0 ? 'ok' : 'bad'),
      card(
        'Bun defaults',
        defSum.passed != null ? `${defSum.passed}/${defSum.total}` : '—',
        defSum.status || 'N/A',
        statusClass(defOk)
      ),
      card(
        'Routing',
        routing.total ? `${routing.passed}/${routing.total}` : '—',
        routing.baseUrl || '',
        statusClass(routeOk)
      ),
      card(
        'Liquidity',
        fmtMoney(liquidity),
        tree.partners != null ? `${tree.partners} partners · ${tree.agents ?? 0} agents` : 'ops summary',
        liquidity != null ? 'ok' : ''
      ),
      card(
        'Growth',
        growth.playsReceived != null ? String(growth.playsReceived) : '—',
        growth.period
          ? `${growth.period} · placed ${growth.playsPlaced ?? 0} · ${fmtMoney(growth.pnl)}`
          : 'period n/a',
        growth.playsReceived != null ? 'ok' : ''
      ),
      card(
        'Channel',
        ops?.channelMeta?.channel || release?.summary?.channel || '—',
        `target ${ops?.channelMeta?.targetVersion || release?.summary?.version || '—'}`,
        statusClass(channel.ok)
      ),
      card(
        'Env checks',
        env.summary ? `${env.summary.ok}/${env.summary.total}` : '—',
        `${env.summary?.requiredMissing ?? 0} required missing`,
        statusClass(envOk)
      ),
      card(
        'Experiments',
        String(ops?.experiments?.active ?? mon?.experimentsActive ?? 0),
        mon?.predictionN ? `prediction n=${mon.predictionN}` : 'factorial / switchback',
        'ok'
      ),
      card(
        'DOD queue',
        String(mon?.dodQueue ?? 0),
        Object.keys(mon?.dodByStatus || {}).length
          ? Object.entries(mon.dodByStatus)
              .map(([k, v]) => `${k}:${v}`)
              .join(' · ')
          : 'pending reviews',
        (mon?.dodQueue ?? 0) === 0 ? 'ok' : 'warn'
      ),
    ].join(''),
    sectionsHtml: `
      ${renderRoutingStrip(routing)}
      ${channel.html}
      <div class="dash-two">
        <section class="dash-section">
          <h2 class="dash-h2">Experts</h2>
          ${renderExperts(ops?.experts)}
        </section>
        <section class="dash-section">
          <h2 class="dash-h2">Agent tree</h2>
          <div class="dash-tree">
            <span><b>${esc(tree.partners ?? 0)}</b> partners</span>
            <span><b>${esc(tree.agents ?? 0)}</b> agents</span>
            <span><b>${esc(tree.subAgents ?? 0)}</b> sub-agents</span>
            <span><b>${esc(fmtMoney(tree.downstreamLiquidity))}</b> downstream</span>
          </div>
          <h2 class="dash-h2" style="margin-top:18px">Rails</h2>
          <ul class="dash-list">
            ${(ops?.rails || [])
              .map(
                (r) =>
                  `<li><span>${esc(r.type)}</span><small>${fmtMoney(r.total_sent)} / ${fmtMoney(
                    r.monthly_limit
                  )}</small></li>`
              )
              .join('') || '<li class="dim">none</li>'}
          </ul>
        </section>
      </div>
      <section class="dash-section">
        <h2 class="dash-h2">Recent plays</h2>
        ${renderPlays(ops?.plays)}
      </section>
      <section class="dash-section">
        <h2 class="dash-h2">Proof artifacts</h2>
        ${renderProofTiles(mon, ops, defaults)}
      </section>
      <section class="dash-section">
        <h2 class="dash-h2">Bun defaults verification</h2>
        <p class="dash-section-meta">Bun ${esc(defaults?.bunVersion || '?')} · ${esc(
          defaults?.bunRevision || ''
        )} · integrity ${esc(integrity.status || 'unknown')}</p>
        ${renderDefaultsTable(defaults)}
      </section>
      <section class="dash-section dash-actions">
        <a href="/portal/ops/">Ops dashboard</a>
        <a href="/monitoring/">Monitoring</a>
        <a href="/portal/health/">Health</a>
        <a href="/portal/env/">Env</a>
        <a href="/api/operations/summary">Ops summary JSON</a>
        <a href="/api/monitoring">Monitoring JSON</a>
        <a href="/registry/prediction/report.html">Prediction report</a>
      </section>`,
  };
}

async function loadData() {
  const [mon, ops, defaults, release] = await Promise.all([
    fetchJson(['/api/monitoring', '/registry/monitoring.json']),
    fetchJson(['/api/operations/summary', '/registry/ops-summary.json']),
    fetchJson([
      '/api/defaults?format=raw',
      '/api/defaults',
      '/registry/defaults-proof.json',
    ]),
    fetchJson(['/registry/release-features.json']),
  ]);
  if (!mon && !ops) throw new Error('No monitoring or ops-summary data');
  return {
    mon: mon?.data ?? null,
    monSource: mon?.source ?? null,
    ops: ops?.data ?? null,
    opsSource: ops?.source ?? null,
    defaults: normalizeDefaults(defaults?.data),
    defaultsSource: defaults?.source ?? null,
    release: release?.data ?? null,
  };
}

export async function initExecutiveDashboard() {
  const banner = document.getElementById('dash-banner');
  const meta = document.getElementById('dash-meta');
  const cards = document.getElementById('dash-cards');
  const sections = document.getElementById('dash-sections');
  const loading = document.getElementById('dash-loading');
  if (!banner || !meta || !cards || !sections) return;

  const apply = (payload) => {
    const view = renderExecutiveDashboard(payload);
    loading?.classList.add('hidden');
    banner.className = `dash-banner ${view.bannerCls}`;
    const title = document.getElementById('dash-banner-title');
    if (title) title.textContent = view.overallTitle;
    meta.textContent = view.meta;
    cards.innerHTML = view.cardsHtml;
    sections.innerHTML = view.sectionsHtml;
  };

  try {
    const payload = await loadData();
    apply(payload);
  } catch (e) {
    loading?.classList.add('hidden');
    banner.className = 'dash-banner bad';
    const title = document.getElementById('dash-banner-title');
    if (title) title.textContent = 'Dashboard unavailable';
    meta.innerHTML =
      '<span class="st-bad">Failed to load — local: <code>bun run serve:public</code> · Pages: <code>bun run ops:snapshot</code></span>';
    sections.innerHTML = `<div class="dash-error">
      <p>${esc(e instanceof Error ? e.message : String(e))}</p>
      <code class="error-code">DASHBOARD_UNAVAILABLE</code>
      <button type="button" class="retry-btn" id="dash-retry">Retry</button>
    </div>`;
    document.getElementById('dash-retry')?.addEventListener('click', () => initExecutiveDashboard());
  }
}

if (typeof document !== 'undefined') {
  initExecutiveDashboard();
  setInterval(initExecutiveDashboard, 30_000);
  document.getElementById('dash-refresh')?.addEventListener('click', () => initExecutiveDashboard());
}
