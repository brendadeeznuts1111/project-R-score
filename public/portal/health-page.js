/**
 * Health diagnostic surface — /portal/health/
 * Probes /api/health (and fallbacks) for its own banner; topbar dot stays on data.js.
 *
 * @see docs/portal-foundation.md
 */
const $ = id => document.getElementById(id);

const CANONICAL_URLS = {
  CLOUDFLARE_API_TOKEN:
    'https://developers.cloudflare.com/fundamentals/api/get-started/create-token/',
  GITHUB_TOKEN:
    'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens',
  GITHUB_ACCESS_TOKEN:
    'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens',
  GH_TOKEN: 'https://cli.github.com/manual/gh_auth_login',
  'R2 binding REGISTRY_BUCKET':
    'https://developers.cloudflare.com/r2/buckets/public-buckets/',
  ASSETS: 'https://developers.cloudflare.com/pages/functions/api-reference/#envassets',
  BUN_VERSION: 'https://bun.com/docs/runtime/bunfig#install',
  SKIP_DEPENDENCY_INSTALL: 'https://bun.com/docs/runtime/bunfig#install',
  NODE_ENV: 'https://bun.com/docs/runtime/environment-variables',
  'Bun.stringWidth': 'https://bun.com/docs/runtime/utils#bun-stringwidth',
  'Bun.deepEquals': 'https://bun.com/docs/runtime/utils#bun-deepequals',
  'Bun.escapeHTML': 'https://bun.com/docs/runtime/utils#bun-escapehtml',
  'Bun.write': 'https://bun.com/docs/runtime/file-io#writing-files-bun-write',
  'Bun.inspect': 'https://bun.com/docs/runtime/utils#bun-inspect',
  'Bun.CryptoHasher': 'https://bun.com/docs/runtime/hashing',
};

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function canonicalUrl(key) {
  return CANONICAL_URLS[key] || null;
}

function linkHtml(key) {
  const url = canonicalUrl(key);
  const label = esc(key);
  if (url) {
    return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  }
  return label;
}

function card(title, val, sub = '', cls = '') {
  return `<article class="health-card ${cls}">
    <h3>${esc(title)}</h3>
    <div class="val">${esc(String(val))}</div>
    ${sub ? `<div class="sub">${esc(sub)}</div>` : ''}
  </article>`;
}

function skeletonCards(n = 8) {
  return Array.from(
    { length: n },
    () => '<div class="health-card skeleton skeleton-card" aria-hidden="true"></div>'
  ).join('');
}

async function fetchJson(url) {
  try {
    const res = await fetch(url, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return { data: await res.json(), source: url, etag: res.headers.get('ETag') };
  } catch {
    return null;
  }
}

async function fetchHealth() {
  for (const url of ['/api/health', '/health']) {
    const hit = await fetchJson(url);
    if (hit?.data) return hit;
  }

  try {
    const [ops, mon] = await Promise.all([
      fetch('/registry/ops-summary.json').then(r => (r.ok ? r.json() : null)),
      fetch('/registry/monitoring.json').then(r => (r.ok ? r.json() : null)),
    ]);
    if (ops || mon) {
      return {
        source: 'static-artifacts',
        etag: null,
        data: {
          status: 'ok',
          runtime: 'static-fallback',
          edge: true,
          artifacts: {
            opsSummary: {
              exists: Boolean(ops),
              generated: ops?.generated ?? null,
            },
          },
          monitoring: mon
            ? { packageCount: mon.packageCount, dodQueue: mon.dodQueue }
            : null,
          toc: ops?.toc ?? null,
          channels: ops?.channels ?? null,
          loop: ops?.loop ?? null,
          bun: ops?.bunUtils?.bunVersion ?? mon?.bunVersion ?? null,
        },
      };
    }
  } catch {
    /* empty */
  }
  return null;
}

function routingSlice(d) {
  const rs = d.routeStats || {};
  return rs.routing && typeof rs.routing === 'object' ? rs.routing : null;
}

function renderPlane(opsLike) {
  const el = $('ops-plane');
  if (!el) return;

  const toc = opsLike?.toc;
  const loop = opsLike?.loop;
  const channels = opsLike?.channels;

  if (!toc && !loop && !channels) {
    el.innerHTML = `<article class="plane-card">
      <h3>Operate glance</h3>
      <p class="plane-detail">No TOC/loop slice on this health payload — open
        <a class="ops-link" href="/registry/ops-summary.json">ops-summary.json</a>
        or <a class="ops-link" href="/portal/dashboard/">Executive Dashboard</a>.</p>
    </article>`;
    return;
  }

  let tocBlock = '';
  if (toc?.available) {
    const crit = toc.criticalBottlenecks ?? 0;
    const openBn = toc.openBottlenecks ?? 0;
    const cls = crit > 0 ? 'bad' : openBn > 0 ? 'warn' : 'ok';
    const tioe =
      toc.throughputT != null && toc.throughputI != null && toc.throughputOE != null
        ? `T ${toc.throughputT} · I ${toc.throughputI} · OE ${toc.throughputOE}`
        : 'T/I/OE n/a';
    tocBlock = `<article class="plane-card ${cls}" data-plane="toc">
      <h3>TOC Ops <span class="badge-demo">DEMO</span></h3>
      <div class="plane-metric">${esc(String(toc.warmed ?? 0))}
        <span class="plane-unit">warmed</span></div>
      <p class="plane-detail">${esc(String(toc.warming ?? 0))} warming ·
        ${esc(String(toc.confirmedRails ?? 0))} rails ·
        ${esc(String(openBn))} bottlenecks</p>
      <p class="plane-sub">${esc(tioe)}</p>
      <div class="plane-actions">
        <a class="ops-link" href="/portal/toc/">TOC board</a>
        <a class="ops-link" href="/portal/dashboard/">Dashboard</a>
      </div>
    </article>`;
  } else {
    tocBlock = `<article class="plane-card">
      <h3>TOC Ops</h3>
      <p class="plane-detail">Fixture missing — <code>bun run ops:seed:toc</code></p>
      <div class="plane-actions"><a class="ops-link" href="/portal/toc/">TOC board</a></div>
    </article>`;
  }

  const failRate =
    channels?.failRate != null ? `${Math.round(channels.failRate * 100)}%` : null;
  const capParts = [];
  if (loop?.capitalEfficiencyProxy != null) {
    capParts.push(`CE ${Number(loop.capitalEfficiencyProxy).toFixed(2)}`);
  }
  if (loop?.limitEfficiencyProxy != null) {
    capParts.push(`LE ${Number(loop.limitEfficiencyProxy).toFixed(2)}`);
  }
  if (loop?.processReturnProxy != null) {
    capParts.push(`RP ${Number(loop.processReturnProxy).toFixed(2)}`);
  }
  const capLine = capParts.length ? ` · ${capParts.join(' · ')}` : '';

  const loopBlock = `<article class="plane-card" data-plane="loop">
    <h3>Channels · loop</h3>
    <div class="plane-metric">${esc(
      channels?.sent != null ? String(channels.sent) : String(loop?.outboxSent ?? '—')
    )} <span class="plane-unit">sent</span></div>
    <p class="plane-detail">
      pending ${esc(String(channels?.pending ?? loop?.outboxPending ?? '—'))} ·
      failed ${esc(String(channels?.failed ?? loop?.outboxFailed ?? '—'))}
      ${failRate != null ? ` · fail ${esc(failRate)}` : ''}
    </p>
    <p class="plane-sub">${
      loop
        ? esc(
            `dispatch ${loop.dispatched ?? 0} · settle ${loop.settled ?? 0}` +
              (typeof loop.loopCompletionRate === 'number'
                ? ` · ${Math.round(loop.loopCompletionRate * 100)}% complete`
                : '')
          )
        : 'loop slice n/a on edge health'
    }${esc(capLine)}</p>
    <div class="plane-actions">
      <a class="ops-link" href="/portal/ops/">Full Ops</a>
      <a class="ops-link" href="/registry/ops-summary.json">ops-summary</a>
    </div>
  </article>`;

  el.innerHTML = tocBlock + loopBlock;
}

async function enrichFromOpsSummary(d) {
  const needs =
    !d.toc?.available || d.loop == null || d.channels == null;
  if (!needs) return d;
  try {
    const res = await fetch('/registry/ops-summary.json', { credentials: 'same-origin' });
    if (!res.ok) return d;
    const ops = await res.json();
    return {
      ...d,
      toc: d.toc?.available ? d.toc : (ops.toc ?? d.toc),
      loop: d.loop ?? ops.loop,
      channels: d.channels ?? ops.channels,
      tree: d.tree ?? ops.tree,
    };
  } catch {
    return d;
  }
}

function applyDefaultsCard(sliceOrProof, sourceLabel) {
  const cardEl = document.querySelector('#cards [data-card="defaults"]');
  if (!cardEl) return true;
  const passed = sliceOrProof.passed ?? sliceOrProof.summary?.passed;
  const total = sliceOrProof.total ?? sliceOrProof.summary?.total;
  const status = sliceOrProof.status ?? sliceOrProof.summary?.status;
  const allOk =
    status === 'pass' || (passed != null && total != null && passed === total);
  cardEl.querySelector('.val').textContent =
    passed != null && total != null ? `${passed}/${total}` : '—';
  cardEl.querySelector('.sub').textContent = [
    sliceOrProof.bunVersion ? `Bun ${sliceOrProof.bunVersion}` : null,
    sliceOrProof.proofHash
      ? `sha ${String(sliceOrProof.proofHash).slice(0, 12)}…`
      : sourceLabel,
  ]
    .filter(Boolean)
    .join(' · ');
  cardEl.className = `health-card ${allOk ? 'ok' : sliceOrProof.available === false ? 'warn' : 'bad'}`;
  return true;
}

async function fillDefaultsCard(embedded) {
  if (embedded?.available) {
    applyDefaultsCard(embedded, embedded.path || 'health.defaults');
    return;
  }
  const urls = [
    '/registry/defaults-proof.json',
    '/api/defaults',
    '/registry/bun-defaults-proof.json',
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) continue;
      applyDefaultsCard(await res.json(), url);
      return;
    } catch {
      /* next */
    }
  }
  const cardEl = document.querySelector('#cards [data-card="defaults"]');
  if (cardEl) {
    cardEl.querySelector('.val').textContent = '—';
    cardEl.querySelector('.sub').textContent = 'defaults proof unavailable';
    cardEl.className = 'health-card warn';
  }
}

function renderCards(d) {
  const ok = d.status === 'ok' || d.status === 'healthy';
  const arts = d.artifacts?.opsSummary || {};
  const rs = d.routeStats || {};
  const routing = routingSlice(d);
  const reg = d.registry || {};
  const mon = d.monitoring || {};
  const proof = d.bunApiProof || {};
  const proofSum = proof.summary || {};

  const routingCard = routing
    ? card(
        'Routing proof',
        `${routing.passed ?? '—'}/${routing.total ?? '—'}`,
        [
          routing.criticalFailed != null ? `${routing.criticalFailed} critical fail` : null,
          routing.meanMs != null ? `mean ${Math.round(routing.meanMs)}ms` : null,
          routing.p95Ms != null ? `p95 ${Math.round(routing.p95Ms)}ms` : null,
        ]
          .filter(Boolean)
          .join(' · ') || 'from ops snapshot',
        routing.criticalFailed > 0 || routing.failed > 0
          ? 'bad'
          : routing.passed === routing.total
            ? 'ok'
            : 'warn'
      )
    : card(
        'Route static',
        rs.staticRoutes != null ? String(rs.staticRoutes) : '—',
        rs.staticHits != null
          ? `${rs.staticHits} hits · ${rs.notModified304 ?? 0}×304`
          : rs.note || 'edge: see routing proof after snapshot',
        'warn'
      );

  const html = [
    card('Status', String(d.status || '—'), d.platform || d.runtime || '', ok ? 'ok' : 'bad'),
    card(
      'Checked',
      d.checkedAt ? String(d.checkedAt).slice(11, 19) + 'Z' : '—',
      d.checkedAt ? String(d.checkedAt).slice(0, 10) : d.serve?.etagScope || 'no timestamp'
    ),
    card(
      'Ops summary',
      arts.exists === false ? 'missing' : arts.generated ? 'present' : arts.exists ? 'yes' : '—',
      arts.generated
        ? `${String(arts.generated).slice(0, 19)} · ${arts.source || 'artifact'}`
        : '',
      arts.exists === false ? 'bad' : 'ok'
    ),
    card(
      'Registry',
      reg.packages != null
        ? String(reg.packages)
        : mon.packageCount != null
          ? String(mon.packageCount)
          : '—',
      reg.versions != null
        ? `${reg.versions} versions`
        : mon.dodQueue != null
          ? `DOD ${mon.dodQueue}`
          : 'packages'
    ),
    routingCard,
    card(
      'API proof',
      proof.available
        ? proofSum.demosPassed != null && proofSum.demos != null
          ? `${proofSum.demosPassed}/${proofSum.demos}`
          : 'available'
        : '—',
      [
        proof.bunVersion ? `Bun ${proof.bunVersion}` : null,
        proofSum.apisVerified != null ? `${proofSum.apisVerified}/${proofSum.apis} APIs` : null,
        proof.generated ? String(proof.generated).slice(0, 10) : null,
      ]
        .filter(Boolean)
        .join(' · '),
      proof.available &&
        (proofSum.demosPassed == null || proofSum.demosPassed === proofSum.demos)
        ? 'ok'
        : proof.available
          ? 'warn'
          : 'warn'
    ),
    card(
      'TOC warmed',
      d.toc?.available ? String(d.toc.warmed ?? 0) : '—',
      d.toc?.available
        ? `${d.toc.openBottlenecks ?? 0} bottlenecks · ${d.toc.confirmedRails ?? 0} rails`
        : 'enrich from ops-summary',
      d.toc?.available
        ? d.toc.criticalBottlenecks > 0
          ? 'bad'
          : d.toc.openBottlenecks > 0
            ? 'warn'
            : 'ok'
        : 'warn'
    ),
    card(
      'Taxonomy audit',
      d.proofTaxonomy?.available && d.proofTaxonomy.contracts != null
        ? `${d.proofTaxonomy.contractsOk ?? '?'}/${d.proofTaxonomy.contracts}`
        : '—',
      d.proofTaxonomy?.available
        ? `ok=${d.proofTaxonomy.ok} · ${d.proofTaxonomy.source || 'audit'}`
        : 'proof-taxonomy-audit',
      d.proofTaxonomy?.available
        ? d.proofTaxonomy.ok
          ? 'ok'
          : 'bad'
        : 'warn'
    ),
    `<article class="health-card warn" data-card="defaults">
      <h3>Defaults</h3>
      <div class="val">…</div>
      <div class="sub">loading proof…</div>
    </article>`,
  ];

  // Optional compliance board card (artifacts.complianceBoard from edge/local health).
  const cb = d.artifacts?.complianceBoard;
  if (cb && typeof cb === 'object') {
    const cbCls = !cb.exists ? 'warn' : cb.ok ? 'ok' : 'bad';
    const cbVal = !cb.exists
      ? 'missing'
      : cb.enhancements != null
        ? String(cb.enhancements)
        : cb.ok
          ? 'ok'
          : 'fail';
    const cbSub = [
      cb.shadowMismatches != null ? `${cb.shadowMismatches} shadow mismatch` : null,
      cb.geoProfiles != null ? `${cb.geoProfiles} geo` : null,
      cb.hmac === true ? 'HMAC' : cb.exists ? 'integrity-only' : null,
      cb.generated ? String(cb.generated).slice(0, 19) : null,
    ]
      .filter(Boolean)
      .join(' · ');
    const portalHref = esc(cb.portal || '/portal/compliance/');
    html.push(`<article class="health-card ${cbCls}" data-card="compliance">
      <h3>Compliance</h3>
      <div class="val">${esc(cbVal)}</div>
      <div class="sub">${esc(cbSub || (cb.exists ? 'board' : 'optional bake'))}</div>
      <div class="sub"><a class="ops-link" href="${portalHref}">portal/compliance</a> · <a class="ops-link" href="/api/compliance">API</a></div>
    </article>`);
  }

  $('cards').innerHTML = html.join('');
  void fillDefaultsCard(d.defaults);
}

function renderEnv(d) {
  const env = d.env || {};
  const summary = env.summary || {};
  const table = env.table || [];
  const miss = env.requiredMissingKeys || [];
  $('env-summary').textContent = table.length
    ? `${summary.ok ?? '—'}/${summary.total ?? table.length} ok · missing ${summary.missing ?? 0} · required gaps ${summary.requiredMissing ?? 0}` +
      (miss.length ? ` · need: ${miss.join(', ')}` : '') +
      (summary.note ? ` · ${summary.note}` : '')
    : 'Env table only on origin (bun run env:check) or /api/health after deploy';

  const tbody = $('env-body');
  if (!table.length) {
    tbody.innerHTML =
      '<tr><td colspan="5">No env checklist in payload. Run <code>bun run env:check</code> locally or open origin <code>/health</code>.</td></tr>';
    return;
  }
  tbody.innerHTML = table
    .map(row => {
      const st = String(row.Status || '');
      const cls =
        st.includes('✗') || st === 'missing' || st === 'placeholder'
          ? 'st-bad'
          : st === 'default' || st === 'edge-n/a' || st === 'binding'
            ? 'st-warn'
            : 'st-ok';
      return `<tr>
        <td class="mono">${linkHtml(row.Key)}</td>
        <td>${esc(row.Group)}</td>
        <td>${esc(row.Severity)}</td>
        <td class="${cls}">${esc(st)}</td>
        <td>${esc(row.Detail || '')}</td>
      </tr>`;
    })
    .join('');
}

function renderRoutingTable(d) {
  const el = $('routing-body');
  const wrap = $('routing-section');
  if (!el || !wrap) return;
  const routing = routingSlice(d);
  const routes = routing?.routes;
  if (!Array.isArray(routes) || !routes.length) {
    wrap.classList.add('hidden');
    return;
  }
  wrap.classList.remove('hidden');
  $('routing-summary').textContent = [
    `${routing.passed}/${routing.total} pass`,
    routing.baseUrl ? `base ${routing.baseUrl}` : null,
    routing.proofHash ? `sha ${String(routing.proofHash).slice(0, 12)}…` : null,
    routing.timestamp ? String(routing.timestamp).slice(0, 19) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  el.innerHTML = routes
    .slice(0, 24)
    .map(r => {
      const cls = r.pass ? 'st-ok' : 'st-bad';
      return `<tr>
        <td class="mono">${esc(r.path)}</td>
        <td class="${cls}">${esc(String(r.status))}</td>
        <td>${r.critical ? 'yes' : '—'}</td>
        <td class="mono">${r.timeMs != null ? esc(String(Math.round(r.timeMs))) : '—'}</td>
        <td>${r.pass ? 'pass' : 'fail'}</td>
      </tr>`;
    })
    .join('');
}

function render(payload) {
  const raw = $('raw');
  if (!payload?.data) {
    $('banner').className = 'health-banner bad';
    $('banner-title').textContent = 'Health unavailable';
    $('banner-meta').textContent =
      'Could not reach /api/health, /health, or static snapshots';
    $('cards').innerHTML = '';
    renderPlane(null);
    raw.textContent = 'No data';
    $('env-body').innerHTML =
      '<tr><td colspan="5">No payload</td></tr>';
    return;
  }

  const d = payload.data;
  const ok = d.status === 'ok' || d.status === 'healthy';
  $('banner').className = `health-banner ${ok ? 'ok' : 'bad'}`;
  $('banner-title').textContent = ok ? 'System healthy' : `Status: ${d.status}`;
  $('banner-meta').textContent = [
    `source ${payload.source}`,
    d.runtime || d.edge ? 'edge/pages' : 'origin',
    d.schemaVersion != null ? `schema v${d.schemaVersion}` : null,
    d.bun ? `Bun ${d.bun}` : null,
    payload.etag ? `ETag ${payload.etag.slice(0, 18)}…` : null,
    d.checkedAt || d.serve?.etagScope || null,
  ]
    .filter(Boolean)
    .join(' · ');

  renderCards(d);
  renderPlane(d);
  renderEnv(d);
  renderRoutingTable(d);
  raw.textContent = JSON.stringify(d, null, 2);
}

export async function load() {
  $('banner-title').textContent = 'Checking health…';
  $('banner-meta').textContent = 'Probing /api/health and /health';
  $('cards').innerHTML = skeletonCards(8);
  const plane = $('ops-plane');
  if (plane) {
    plane.innerHTML =
      '<div class="plane-card skeleton skeleton-card" style="min-height:120px" aria-hidden="true"></div>' +
      '<div class="plane-card skeleton skeleton-card" style="min-height:120px" aria-hidden="true"></div>';
  }

  const payload = await fetchHealth();
  if (payload?.data) {
    payload.data = await enrichFromOpsSummary(payload.data);
  }
  render(payload);
  document.dispatchEvent(
    new CustomEvent('portal:health-ready', { detail: payload })
  );
}

async function loadVpsStatus() {
  const panel = $('vps-panel');
  if (!panel) return;
  try {
    const res = await fetch('/registry/vps-health.json', { credentials: 'same-origin' });
    if (!res.ok) { panel.innerHTML = '<p class="st-bad">VPS unreachable</p>'; return; }
    const d = await res.json();
    const ok = (s) => s === 'active' || s?.startsWith('Up');
    const cls = (s) => ok(s) ? 'st-ok' : 'st-bad';
    panel.innerHTML = `
      <table class="env-table">
        <thead><tr><th>Host</th><th>Uptime</th><th>Disk</th><th>Memory</th></tr></thead>
        <tbody>
          <tr>
            <td class="mono">${d.hostname || '?'}</td>
            <td>${d.uptime || '?'}</td>
            <td class="${cls(d.disk?.percent?.replace('%','') > 85 ? 'st-bad' : 'st-ok')}">${d.disk?.percent || '?'} (${d.disk?.free || '?'} free)</td>
            <td class="${d.memory?.available?.replace('Gi','') > 2 ? 'st-ok' : 'st-warn'}">${d.memory?.used || '?'} / ${d.memory?.total || '?'} (${d.memory?.available || '?'} free)</td>
          </tr>
        </tbody>
      </table>
      <table class="env-table" style="margin-top:8px">
        <thead><tr><th>Service</th><th>Status</th></tr></thead>
        <tbody>
          ${Object.entries(d.services || {}).map(([name, status]) => `
            <tr><td class="mono">${name}</td><td class="${cls(status)}">${status}</td></tr>
          `).join('')}
          ${Object.entries(d.docker || {}).map(([name, status]) => `
            <tr><td class="mono">${name} <span style="opacity:0.5">(docker)</span></td><td class="${cls(status)}">${status}</td></tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch {
    if (panel) panel.innerHTML = '<p class="st-bad">VPS status unavailable</p>';
  }
}

function boot() {
  $('btn-refresh')?.addEventListener('click', e => {
    e.preventDefault();
    void load();
  });
  void load();
  void loadVpsStatus();
  setInterval(() => void load(), 15_000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
