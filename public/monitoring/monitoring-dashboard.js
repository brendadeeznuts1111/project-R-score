/**
 * Client dashboard for /monitoring — composes /api/monitoring + ops-summary fallback.
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
  return s.length >= 19 ? s.slice(0, 19).replace('T', ' ') + ' UTC' : s;
}

function card(title, val, sub = '', cls = '', href = '') {
  const inner = `<h3>${esc(title)}</h3><div class="val">${esc(val)}</div>${
    sub ? `<div class="sub">${esc(sub)}</div>` : ''
  }`;
  if (href) {
    return `<a class="mon-card mon-card-link ${cls}" href="${esc(href)}">${inner}</a>`;
  }
  return `<div class="mon-card ${cls}">${inner}</div>`;
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
      return { data: await res.json(), source: url };
    } catch {
      /* try next */
    }
  }
  return null;
}

function readEmbed() {
  const el = document.getElementById('monitoring-embed');
  if (!el?.textContent?.trim()) return null;
  try {
    const parsed = JSON.parse(el.textContent);
    if (parsed?.mon && typeof parsed.mon === 'object') return parsed;
  } catch {
    /* invalid embed */
  }
  return null;
}

async function loadData() {
  const mon = await fetchJson(['/api/monitoring', '/registry/monitoring.json']);
  if (!mon) throw new Error('No monitoring data');
  const ops = await fetchJson(['/registry/ops-summary.json', '/api/operations/summary']);
  return { mon: mon.data, monSource: mon.source, ops: ops?.data ?? null, opsSource: ops?.source ?? null };
}

function mergeRouting(mon, ops) {
  const r = mon.routeStats?.routing || ops?.routing || {};
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

function renderEnvTable(env) {
  const rows = env?.table;
  if (!Array.isArray(rows) || !rows.length) {
    return '<p class="mon-empty">No env table — run <code>bun run ops:snapshot</code></p>';
  }
  const body = rows
    .map((row) => {
      const st = String(row.Status || '');
      const cls =
        st === 'set' || st === 'ok' ? 'st-ok' : st === 'missing' ? 'st-bad' : 'st-warn';
      return `<tr>
        <td class="mono">${esc(row.Key)}</td>
        <td>${esc(row.Group)}</td>
        <td>${esc(row.Severity)}</td>
        <td class="${cls}">${esc(row.Status)}</td>
        <td class="mono dim">${esc(row.Detail)}</td>
      </tr>`;
    })
    .join('');
  const sum = env.summary || {};
  return `<p class="mon-section-meta">${
    sum.total ?? rows.length
  } checks · ${sum.ok ?? '—'} ok · ${sum.requiredMissing ?? 0} required missing · <a href="/portal/env/">Env portal</a> · <a href="/api/env">JSON</a></p>
  <div class="mon-table-wrap"><table class="mon-table">
    <thead><tr><th>Key</th><th>Group</th><th>Severity</th><th>Status</th><th>Detail</th></tr></thead>
    <tbody>${body}</tbody>
  </table></div>`;
}

function renderRoutesTable(routing) {
  const routes = routing.routes || [];
  if (!routes.length) {
    return `<p class="mon-empty">Routing routes unavailable — <a href="/portal/ops/">Ops</a> · run <code>bun run ops:snapshot --force-routing</code></p>`;
  }
  const failed = routes.filter((r) => !r.pass);
  const body = routes
    .slice()
    .sort((a, b) => (a.critical === b.critical ? 0 : a.critical ? -1 : 1))
    .map((r) => {
      const cls = r.pass ? 'st-ok' : r.critical ? 'st-bad' : 'st-warn';
      return `<tr class="${r.critical ? 'critical' : ''}">
        <td class="mono">${esc(r.path)}</td>
        <td class="${cls}">${r.pass ? 'pass' : 'fail'}</td>
        <td>${r.status}</td>
        <td>${r.timeMs != null && Number.isFinite(Number(r.timeMs)) ? `${Number(r.timeMs).toFixed(1)}ms` : '—'}</td>
        <td>${r.critical ? 'yes' : '—'}</td>
        <td class="mono dim">${esc(r.contentType || '')}</td>
      </tr>`;
    })
    .join('');
  return `<p class="mon-section-meta">${routing.passed}/${routing.total} passed · base ${esc(
    routing.baseUrl || '—'
  )} · p95 ${routing.p95Ms != null ? `${routing.p95Ms.toFixed(1)}ms` : '—'} · ${
    failed.length ? `<span class="st-bad">${failed.length} failed</span>` : '<span class="st-ok">all pass</span>'
  }</p>
  <div class="mon-table-wrap"><table class="mon-table">
    <thead><tr><th>Path</th><th>Probe</th><th>HTTP</th><th>Latency</th><th>Critical</th><th>Type</th></tr></thead>
    <tbody>${body}</tbody>
  </table></div>`;
}

function renderProofTiles(mon, ops) {
  const bun = mon.bunApiProof || {};
  const bu = ops?.bunUtils || {};
  const rc = mon.registryClientProof || ops?.registryClient || {};
  const dc = mon.docsCoverageProof || ops?.docsCoverage || {};
  const net = mon.networkingProof;
  const tiles = [
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
      sub: rc.status || rc.path || '',
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
      sub: net?.proofHash ? net.proofHash.slice(0, 16) + '…' : '',
      ok: net ? net.allOk : ops?.networking?.allOk,
      href: '/registry/networking-proof.json',
    },
    {
      title: 'TG handshake',
      val: ops?.telegramHandshake?.available
        ? `${ops.telegramHandshake.inviteGaps ?? 0} gap(s)`
        : 'n/a',
      sub: ops?.telegramHandshake?.available
        ? `${ops.telegramHandshake.operatorReady ?? 0}/${ops.telegramHandshake.partners ?? 0} operator_ready`
        : '',
      ok: ops?.telegramHandshake?.available
        ? (ops.telegramHandshake.inviteGaps ?? 0) === 0
        : undefined,
      href: '/portal/ops/#telegram-handshake',
    },
  ];
  return `<div class="mon-proof-grid">${tiles
    .map(
      (t) =>
        `<a class="mon-proof ${statusClass(t.ok, t.ok === undefined)}" href="${esc(t.href)}"><h4>${esc(
          t.title
        )}</h4><div class="val">${esc(t.val)}</div><div class="sub">${esc(t.sub)}</div></a>`
    )
    .join('')}</div>`;
}

function renderKvTable(title, obj) {
  const rows = Object.entries(obj || {});
  if (!rows.length) return `<h2 class="mon-h2">${esc(title)}</h2><p class="mon-empty">none</p>`;
  const body = rows
    .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`)
    .join('');
  return `<h2 class="mon-h2">${esc(title)}</h2><div class="mon-table-wrap narrow"><table class="mon-table"><tbody>${body}</tbody></table></div>`;
}

export function renderMonitoringDashboard(payload) {
  const { mon, monSource, ops } = payload;
  const routing = mergeRouting(mon, ops);
  const integrity = mon.lastIntegrity || {};
  const env = mon.env || {};
  const intOk = integrity.status === 'ok' && (integrity.failures ?? 0) === 0;
  const routeOk = routing.total > 0 && routing.passed >= routing.total && (routing.criticalFailed ?? 0) === 0;
  const envOk = (env.summary?.requiredMissing ?? 0) === 0;
  const overallOk = intOk && routeOk && envOk;

  const bannerCls = overallOk ? 'ok' : routeOk && envOk ? 'warn' : 'bad';
  const meta = [
    `snapshot ${fmtTime(mon.timestamp || mon.snapshotAt)}`,
    `source ${mon.source || '—'}`,
    monSource.replace(/^\//, ''),
    ops ? 'ops-summary merged' : null,
    'refresh 30s',
  ]
    .filter(Boolean)
    .join(' · ');

  return {
    bannerCls,
    meta,
    overallTitle: overallOk ? 'Monitoring healthy' : routeOk ? 'Monitoring degraded' : 'Attention required',
    cardsHtml: [
      card('Packages', mon.packageCount ?? '—', `${mon.versionCount ?? '—'} versions`),
      card('Routing', routing.total ? `${routing.passed}/${routing.total}` : '—', routing.baseUrl || '', statusClass(routeOk)),
      card('Integrity', integrity.status || 'unknown', fmtTime(integrity.timestamp), statusClass(intOk)),
      card('Env checks', env.summary ? `${env.summary.ok}/${env.summary.total}` : '—', `${env.summary?.requiredMissing ?? 0} required missing`, statusClass(envOk)),
      card('DOD queue', mon.dodQueue ?? 0, Object.keys(mon.dodByStatus || {}).length ? JSON.stringify(mon.dodByStatus) : 'empty', '', '/portal/dod/'),
      card('Platforms', Object.values(mon.platformSummary || {}).reduce((a, b) => a + b, 0) || '0', `api yes ${mon.platformApiAvailable?.yes ?? 0} · no ${mon.platformApiAvailable?.no ?? 0}`),
      card('Experiments', mon.experimentsActive ?? 0),
      card('Prediction', mon.predictionN ?? 0, mon.predictionN ? 'coverage report available' : '', mon.predictionN ? 'ok' : '', mon.predictionN ? '/registry/prediction/report/' : ''),
      card(
        'TG invite gaps',
        ops?.telegramHandshake?.available ? ops.telegramHandshake.inviteGaps ?? 0 : '—',
        ops?.telegramHandshake?.available
          ? `${ops.telegramHandshake.partners ?? 0} package groups · ${ops.telegramHandshake.operatorReady ?? 0} ready`
          : 'run ops:snapshot',
        ops?.telegramHandshake?.available
          ? (ops.telegramHandshake.inviteGaps ?? 0) === 0
            ? 'ok'
            : 'bad'
          : '',
        '/portal/ops/'
      ),
    ].join(''),
    sectionsHtml: `
      <section class="mon-section"><h2 class="mon-h2">Proof artifacts</h2>${renderProofTiles(mon, ops)}</section>
      <section class="mon-section"><h2 class="mon-h2">Routing probes</h2>${renderRoutesTable(routing)}</section>
      <section class="mon-section"><h2 class="mon-h2">Environment</h2>${renderEnvTable(env)}</section>
      ${renderKvTable('Platform status', mon.platformSummary)}
      ${renderKvTable('DOD by status', mon.dodByStatus)}
      <section class="mon-section mon-actions">
        <a href="/portal/ops/">Ops dashboard</a>
        <a href="/portal/dod/">DOD queue</a>
        <a href="/portal/skills/">Skills</a>
        <a href="/portal/health/">Health</a>
        <a href="/api/monitoring">JSON</a>
        <a href="/registry/monitoring.json">Snapshot</a>
        <a href="/registry/prediction/report/">Prediction report</a>
        <a href="/registry/portal-weave.json">Portal weave</a>
      </section>`,
  };
}

export async function initMonitoringDashboard() {
  const banner = document.getElementById('mon-banner');
  const meta = document.getElementById('mon-meta');
  const cards = document.getElementById('mon-cards');
  const sections = document.getElementById('mon-sections');
  if (!banner || !meta || !cards || !sections) return;

  const apply = (payload, live = true) => {
    const view = renderMonitoringDashboard(payload);
    banner.className = `mon-banner ${view.bannerCls}`;
    const title = document.getElementById('mon-banner-title');
    if (title) title.textContent = view.overallTitle;
    meta.textContent = live ? view.meta : `${view.meta} · embedded snapshot`;
    cards.innerHTML = view.cardsHtml;
    sections.innerHTML = view.sectionsHtml;
  };

  const embed = readEmbed();
  if (embed) {
    try {
      apply(
        {
          mon: embed.mon,
          monSource: 'embed',
          ops: embed.ops ?? null,
          opsSource: embed.ops ? 'embed' : null,
        },
        false
      );
    } catch (e) {
      console.warn('[monitoring] embed render failed', e);
    }
  }

  try {
    const payload = await loadData();
    apply(payload, true);
  } catch (e) {
    if (!embed) {
      banner.className = 'mon-banner bad';
      const title = document.getElementById('mon-banner-title');
      if (title) title.textContent = 'Monitoring unavailable';
      meta.innerHTML =
        '<span class="st-bad">Failed to load — local: <code>bun run serve:public</code> · Pages: <code>bun run ops:snapshot</code></span>';
      sections.textContent = e instanceof Error ? e.message : String(e);
    } else {
      meta.textContent = `${meta.textContent} · live refresh failed`;
    }
  }
}

if (typeof document !== 'undefined') {
  initMonitoringDashboard();
  setInterval(initMonitoringDashboard, 30_000);
}
