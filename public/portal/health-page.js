/**
 * Health diagnostic surface — /portal/health/
 * Probes /api/health (and fallbacks) for its own banner; topbar dot stays on data.js.
 * Live check table probes each known surface with Hostname · Port · Status · Kind · Plane ·
 * Source · Version · Resources · Detail.
 *
 * @see docs/portal-foundation.md
 */
const $ = id => document.getElementById(id);

/** @typedef {'ok'|'warn'|'bad'|'skip'} LiveTone */
/** @typedef {'edge-health'|'registry-bake'|'proof'|'board'|'inventory'|'ops-rollup'|'doctor'} LiveKind */
/** @typedef {'edge'|'public'|'document'|'operate'|'harness'|'infra'} LivePlane */

/**
 * Curated same-origin probes. Each row is one independent check (not a card rollup).
 * kind = what the check is · plane = which control plane owns it.
 */
const LIVE_PROBES = [
  {
    id: 'api-health',
    surface: 'Edge health API',
    what: 'Live edge status JSON for this origin',
    kind: 'edge-health',
    plane: 'edge',
    path: '/api/health',
    accept: 'application/json',
  },
  {
    id: 'raw-health',
    surface: 'Raw /health',
    what: 'Alias path — same edge payload shape',
    kind: 'edge-health',
    plane: 'edge',
    path: '/health',
    accept: 'application/json',
  },
  {
    id: 'ops-summary',
    surface: 'Ops summary bake',
    what: 'Operate rollup (TOC · loop · channels)',
    kind: 'ops-rollup',
    plane: 'operate',
    path: '/registry/ops-summary.json',
    accept: 'application/json',
  },
  {
    id: 'toc-ops',
    surface: 'TOC ops fixture',
    what: 'Drum/Buffer/Rope demo bake',
    kind: 'ops-rollup',
    plane: 'operate',
    path: '/registry/toc-ops.json',
    accept: 'application/json',
  },
  {
    id: 'monorepo-health',
    surface: 'Monorepo health score',
    what: 'Harness gate score · grade · metrics',
    kind: 'registry-bake',
    plane: 'harness',
    path: '/registry/monorepo-health.json',
    accept: 'application/json',
  },
  {
    id: 'doctor-state',
    surface: 'Portal doctor state',
    what: 'Unified doctor bake (linker · bunfig · catalog)',
    kind: 'doctor',
    plane: 'harness',
    path: '/registry/doctor-state.json',
    accept: 'application/json',
  },
  {
    id: 'defaults-proof',
    surface: 'Defaults proof',
    what: 'Bun defaults verification pin',
    kind: 'proof',
    plane: 'document',
    path: '/registry/defaults-proof.json',
    accept: 'application/json',
  },
  {
    id: 'portal-weave',
    surface: 'Portal weave proof',
    what: 'Portal surface / capability weave map',
    kind: 'proof',
    plane: 'document',
    path: '/registry/portal-weave.json',
    accept: 'application/json',
  },
  {
    id: 'monitoring',
    surface: 'Monitoring bake',
    what: 'Package / DOD monitoring snapshot',
    kind: 'registry-bake',
    plane: 'public',
    path: '/registry/monitoring.json',
    accept: 'application/json',
  },
  {
    id: 'static-aggregate',
    surface: 'Static aggregate',
    what: 'Public-plane static registry index',
    kind: 'registry-bake',
    plane: 'public',
    path: '/registry/static.json',
    accept: 'application/json',
  },
  {
    id: 'surfaces-state',
    surface: 'Surfaces inventory',
    what: 'Host / subdomain / Access inventory bake',
    kind: 'inventory',
    plane: 'public',
    path: '/registry/surfaces-state.json',
    accept: 'application/json',
  },
  {
    id: 'vps-health',
    surface: 'VPS infrastructure',
    what: 'Host uptime · disk · services bake',
    kind: 'registry-bake',
    plane: 'infra',
    path: '/registry/vps-health.json',
    accept: 'application/json',
  },
  {
    id: 'health-board',
    surface: 'Health board HTML',
    what: 'This portal page is reachable as static asset',
    kind: 'board',
    plane: 'public',
    path: '/portal/health/',
    accept: 'text/html',
  },
];

const CANONICAL_URLS = {
  CLOUDFLARE_API_TOKEN:
    'https://developers.cloudflare.com/fundamentals/api/get-started/create-token/',
  GITHUB_TOKEN:
    'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens',
  GITHUB_ACCESS_TOKEN:
    'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens',
  GH_TOKEN: 'https://cli.github.com/manual/gh_auth_login',
  'R2 binding REGISTRY_BUCKET': 'https://developers.cloudflare.com/r2/buckets/public-buckets/',
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

const WIKI_BASE = 'https://wiki.factory-wager.com';
const PACKAGE_MAP_URL = '/portal/packages/';
const HEALTH_FIELD_CONCEPTS = {
  surface: 'ui.semantic.surface',
  hostname: 'ui.semantic.hostname',
  port: 'ui.semantic.port',
  status: 'ui.semantic.status',
  kind: 'ui.semantic.kind',
  plane: 'ui.semantic.plane',
  source: 'ui.semantic.source',
  version: 'ui.semantic.version',
  resources: 'ui.semantic.resources',
};

const PLANE_RESOURCES = {
  edge: {
    wiki: `${WIKI_BASE}/docs/portal-foundation.html`,
    package: PACKAGE_MAP_URL,
  },
  public: {
    wiki: `${WIKI_BASE}/docs/harness/tenants/public-plane.html`,
    package: PACKAGE_MAP_URL,
  },
  document: {
    wiki: `${WIKI_BASE}/docs/harness/PROOF.html`,
    package: PACKAGE_MAP_URL,
  },
  operate: {
    wiki: `${WIKI_BASE}/docs/harness/tenants/ops-snapshot.html`,
    package: PACKAGE_MAP_URL,
  },
  harness: {
    wiki: `${WIKI_BASE}/docs/harness/README.html`,
    package: PACKAGE_MAP_URL,
  },
  infra: {
    wiki: `${WIKI_BASE}/docs/harness/tenants/tunnel-inventory.html`,
    package: PACKAGE_MAP_URL,
  },
};

const CARD_RESOURCES = {
  status: {
    wiki: PLANE_RESOURCES.edge.wiki,
    artifact: '/api/health',
  },
  checked: {
    wiki: PLANE_RESOURCES.edge.wiki,
    artifact: '/health',
  },
  'ops-summary': {
    wiki: PLANE_RESOURCES.operate.wiki,
    artifact: '/registry/ops-summary.json',
  },
  registry: {
    wiki: `${WIKI_BASE}/registry-index.html`,
    artifact: '/registry/registry.json',
  },
  routing: {
    wiki: `${WIKI_BASE}/docs/platform-routing.html`,
    artifact: '/registry/ops-summary.json',
  },
  'api-proof': {
    wiki: `${WIKI_BASE}/docs/BUN_NATIVE_CAPABILITIES.html`,
    artifact: '/tools/bun-api-coverage-proof.json',
  },
  toc: {
    wiki: `${WIKI_BASE}/docs/harness/tenants/toc-ops.html`,
    artifact: '/registry/toc-ops.json',
  },
  taxonomy: {
    wiki: `${WIKI_BASE}/docs/harness/PROOF.html`,
    artifact: '/registry/proof-taxonomy-audit.json',
  },
  defaults: {
    wiki: `${WIKI_BASE}/docs/UNIFIED.html`,
    artifact: '/registry/defaults-proof.json',
  },
  compliance: {
    wiki: `${WIKI_BASE}/docs/harness/tenants/compliance-portal.html`,
    artifact: '/registry/compliance-board.json',
    portal: '/portal/compliance/',
  },
  'limit-raises': {
    wiki: `${WIKI_BASE}/docs/harness/tenants/partner-limits.html`,
    artifact: '/registry/limit-raises.json',
    portal: '/portal/limits/',
  },
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

function resourceLinks(resource = {}) {
  return `<nav class="health-resource-links" aria-label="Resource mappings">
    <a href="${esc(resource.wiki || `${WIKI_BASE}/wiki-index.html`)}" target="_blank" rel="noopener noreferrer">Wiki</a>
    <a href="${esc(resource.package || PACKAGE_MAP_URL)}">Package</a>
    <a href="${esc(resource.artifact || '/portal/health/')}">Artifact</a>
    ${resource.portal ? `<a href="${esc(resource.portal)}">Portal</a>` : ''}
  </nav>`;
}

function card({ id, title, value, sub = '', tone = 'skip', version = 'schema v1' }) {
  const resource = CARD_RESOURCES[id] || {};
  return `<article class="health-card" data-card="${esc(id)}" data-tone="${esc(tone)}">
    <header class="health-card-header">
      <h3>${esc(title)}</h3>
      <span class="health-card-version">${esc(version)}</span>
    </header>
    <div class="val">${esc(String(value))}</div>
    ${sub ? `<div class="sub">${esc(sub)}</div>` : ''}
    ${resourceLinks(resource)}
  </article>`;
}

function skeletonCards(n = 8) {
  return `<section class="health-card-group health-card-group--loading" aria-label="Loading health cards">
    <div class="health-card-group-grid">
      ${Array.from(
        { length: n },
        () => '<div class="health-card skeleton skeleton-card" aria-hidden="true"></div>'
      ).join('')}
    </div>
  </section>`;
}

function ageLabel(iso) {
  if (!iso) return null;
  const t = Date.parse(String(iso));
  if (!Number.isFinite(t)) return String(iso).slice(0, 19);
  const sec = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`;
  const days = Math.round(sec / 86400);
  return `${days}d ago · ${String(iso).slice(0, 10)}`;
}

function isStale(iso, maxHours) {
  if (!iso) return false;
  const t = Date.parse(String(iso));
  if (!Number.isFinite(t)) return false;
  return Date.now() - t > maxHours * 3600 * 1000;
}

/**
 * Interpret a live probe response into tone + human detail.
 * @returns {{ tone: LiveTone, statusLabel: string, detail: string }}
 */
function interpretProbe(probe, res, body, ms, err) {
  if (err) {
    return {
      tone: 'bad',
      statusLabel: 'error',
      detail: String(err.message || err).slice(0, 120),
    };
  }
  if (!res) {
    return { tone: 'bad', statusLabel: 'no response', detail: 'fetch failed' };
  }

  const http = res.status;
  const redirectOrAccess =
    http === 302 ||
    http === 401 ||
    http === 403 ||
    (typeof res.url === 'string' && /cloudflareaccess|cdn-cgi\/access/i.test(res.url));

  if (redirectOrAccess && http !== 200) {
    return {
      tone: 'warn',
      statusLabel: `HTTP ${http} · Access?`,
      detail: 'Protected or redirected (CF Access / auth) — not a public bake fail',
    };
  }

  if (http >= 500) {
    return { tone: 'bad', statusLabel: `HTTP ${http}`, detail: `${ms}ms · server error` };
  }
  if (http === 404) {
    return {
      tone: 'warn',
      statusLabel: 'HTTP 404',
      detail: 'Missing artifact — bake or deploy may be required',
    };
  }
  if (http < 200 || http >= 400) {
    return {
      tone: 'bad',
      statusLabel: `HTTP ${http}`,
      detail: `${ms}ms · unexpected status`,
    };
  }

  // HTML board probe — success is reachability
  if (probe.accept === 'text/html') {
    return {
      tone: 'ok',
      statusLabel: `HTTP ${http}`,
      detail: `board live · ${ms}ms`,
    };
  }

  const data = body && typeof body === 'object' ? body : null;
  if (!data) {
    return {
      tone: 'warn',
      statusLabel: `HTTP ${http}`,
      detail: `non-JSON or empty · ${ms}ms`,
    };
  }

  switch (probe.id) {
    case 'api-health':
    case 'raw-health': {
      const st = String(data.status || '—');
      const ok = st === 'ok' || st === 'healthy';
      const parts = [
        `status ${st}`,
        data.runtime || (data.edge ? 'edge' : null),
        data.checkedAt ? ageLabel(data.checkedAt) : null,
        data.schemaVersion != null ? `schema v${data.schemaVersion}` : null,
        `${ms}ms`,
      ].filter(Boolean);
      return {
        tone: ok ? 'ok' : 'bad',
        statusLabel: ok ? `HTTP ${http} · ${st}` : `HTTP ${http} · ${st}`,
        detail: parts.join(' · '),
      };
    }
    case 'ops-summary': {
      const gen = data.generated ?? data.generatedAt;
      const stale = isStale(gen, 48);
      return {
        tone: stale ? 'warn' : 'ok',
        statusLabel: stale ? `HTTP ${http} · stale` : `HTTP ${http}`,
        detail: [
          gen ? `generated ${ageLabel(gen)}` : 'no generated ts',
          data.toc?.available != null ? `toc ${data.toc.available ? 'yes' : 'no'}` : null,
          data.loop != null ? 'loop slice' : null,
          `${ms}ms`,
        ]
          .filter(Boolean)
          .join(' · '),
      };
    }
    case 'toc-ops': {
      const gen = data.generated ?? data.generatedAt;
      return {
        tone: 'ok',
        statusLabel: `HTTP ${http}`,
        detail: [
          gen ? ageLabel(gen) : 'fixture present',
          data.warmed != null ? `${data.warmed} warmed` : null,
          `${ms}ms`,
        ]
          .filter(Boolean)
          .join(' · '),
      };
    }
    case 'monorepo-health': {
      const score = data.score;
      const grade = String(data.grade || '').toLowerCase();
      const gen = data.generatedAt ?? data.generated;
      const stale = isStale(gen, 36);
      let tone = 'ok';
      if (grade === 'critical' || (typeof score === 'number' && score < 40)) tone = 'bad';
      else if (grade === 'warning' || grade === 'needs-attention' || stale) tone = 'warn';
      return {
        tone,
        statusLabel:
          score != null ? `HTTP ${http} · ${score}${grade ? ` ${grade}` : ''}` : `HTTP ${http}`,
        detail: [
          gen ? `baked ${ageLabel(gen)}` : null,
          stale ? 'stale bake' : null,
          data.metrics?.cyclicDependencyCount != null
            ? `cycles ${data.metrics.cyclicDependencyCount}`
            : null,
          data.gate ? `gate ${data.gate}` : null,
          `${ms}ms`,
        ]
          .filter(Boolean)
          .join(' · '),
      };
    }
    case 'doctor-state': {
      const summary = data.summary || data;
      const failed = summary.failed ?? summary.fail ?? data.failedCount ?? data.failed;
      const passed = summary.passed ?? summary.pass ?? data.passedCount;
      const total = summary.total ?? data.total;
      const ok =
        data.ok === true || failed === 0 || (passed != null && total != null && passed === total);
      const gen = data.generatedAt ?? data.generated;
      return {
        tone: ok ? 'ok' : failed != null && failed > 0 ? 'bad' : 'warn',
        statusLabel:
          passed != null && total != null
            ? `HTTP ${http} · ${passed}/${total}`
            : data.ok === true
              ? `HTTP ${http} · ok`
              : `HTTP ${http}`,
        detail: [gen ? ageLabel(gen) : null, failed != null ? `${failed} failed` : null, `${ms}ms`]
          .filter(Boolean)
          .join(' · '),
      };
    }
    case 'defaults-proof': {
      const passed = data.passed ?? data.summary?.passed;
      const total = data.total ?? data.summary?.total;
      const status = data.status ?? data.summary?.status;
      const allOk = status === 'pass' || (passed != null && total != null && passed === total);
      return {
        tone: allOk ? 'ok' : 'bad',
        statusLabel:
          passed != null && total != null ? `HTTP ${http} · ${passed}/${total}` : `HTTP ${http}`,
        detail: [
          data.bunVersion ? `Bun ${data.bunVersion}` : null,
          data.proofHash ? `sha ${String(data.proofHash).slice(0, 10)}…` : null,
          `${ms}ms`,
        ]
          .filter(Boolean)
          .join(' · '),
      };
    }
    case 'portal-weave': {
      const n =
        data.surfaces?.length ?? data.entries?.length ?? data.rows?.length ?? data.count ?? null;
      return {
        tone: 'ok',
        statusLabel: `HTTP ${http}`,
        detail: [
          n != null ? `${n} entries` : 'weave present',
          data.generatedAt || data.generated ? ageLabel(data.generatedAt || data.generated) : null,
          `${ms}ms`,
        ]
          .filter(Boolean)
          .join(' · '),
      };
    }
    case 'monitoring': {
      return {
        tone: 'ok',
        statusLabel: `HTTP ${http}`,
        detail:
          [
            data.packageCount != null ? `${data.packageCount} packages` : null,
            data.dodQueue != null ? `DOD ${data.dodQueue}` : null,
            data.generatedAt || data.generated
              ? ageLabel(data.generatedAt || data.generated)
              : null,
            `${ms}ms`,
          ]
            .filter(Boolean)
            .join(' · ') || `${ms}ms`,
      };
    }
    case 'static-aggregate': {
      return {
        tone: 'ok',
        statusLabel: `HTTP ${http}`,
        detail: `aggregate present · ${ms}ms`,
      };
    }
    case 'surfaces-state': {
      const surfaces =
        data.surfaces?.length ?? data.inventory?.surfaces?.length ?? data.count ?? null;
      const schema = data.schemaVersion ?? data.version;
      return {
        tone: 'ok',
        statusLabel: `HTTP ${http}`,
        detail: [
          surfaces != null ? `${surfaces} surfaces` : 'inventory present',
          schema != null ? `schema v${schema}` : null,
          data.generatedAt ? ageLabel(data.generatedAt) : null,
          `${ms}ms`,
        ]
          .filter(Boolean)
          .join(' · '),
      };
    }
    case 'vps-health': {
      return {
        tone: data.hostname ? 'ok' : 'warn',
        statusLabel: `HTTP ${http}`,
        detail: [
          data.hostname || null,
          data.uptime ? `up ${data.uptime}` : null,
          data.disk?.percent ? `disk ${data.disk.percent}` : null,
          `${ms}ms`,
        ]
          .filter(Boolean)
          .join(' · '),
      };
    }
    default: {
      return {
        tone: 'ok',
        statusLabel: `HTTP ${http}`,
        detail: `${ms}ms`,
      };
    }
  }
}

async function probeOne(probe) {
  const t0 = performance.now();
  try {
    const res = await fetch(probe.path, {
      credentials: 'same-origin',
      headers: { Accept: probe.accept || 'application/json' },
      redirect: 'follow',
    });
    const ms = Math.round(performance.now() - t0);
    let body = null;
    if (probe.accept !== 'text/html') {
      try {
        body = await res.json();
      } catch {
        body = null;
      }
    } else {
      // Consume body so the connection can close; board probe only needs status.
      try {
        await res.text();
      } catch {
        /* ignore */
      }
    }
    const interpreted = interpretProbe(probe, res, body, ms, null);
    return { probe, res, body, ms, ...interpreted };
  } catch (e) {
    const ms = Math.round(performance.now() - t0);
    const interpreted = interpretProbe(probe, null, null, ms, e);
    return { probe, res: null, body: null, ms, ...interpreted };
  }
}

function targetForProbe(probe) {
  const url = new URL(probe.path, window.location.href);
  return {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? '443' : '80'),
    source: `${url.pathname}${url.search}`,
  };
}

function versionForProbe(result) {
  const data = result.body;
  if (data?.schemaVersion != null) return `schema v${data.schemaVersion}`;
  if (data?.bunVersion) return `Bun ${data.bunVersion}`;
  if (data?.version != null) return `v${data.version}`;
  if (result.probe.accept === 'text/html') return 'HTML';
  return 'JSON';
}

function semanticValue(field, label, className, attribute = '') {
  const conceptId = HEALTH_FIELD_CONCEPTS[field];
  return `<a class="${esc(className)}" href="/portal/glossary/#glossary:${esc(conceptId)}"
    target="_blank" rel="noopener" title="Open ${esc(label)} semantic definition"
    ${attribute}>${esc(label)}</a>`;
}

function toneBadge(tone, label) {
  return `<a class="tone-badge" data-tone="${esc(tone)}"
    href="/portal/glossary/#glossary:${HEALTH_FIELD_CONCEPTS.status}"
    target="_blank" rel="noopener" title="Open Status semantic definition">
    <span class="tone-dot" aria-hidden="true"></span>
    <span>${esc(label)}</span>
  </a>`;
}

function probeResourceLinks(probe) {
  const resource = PLANE_RESOURCES[probe.plane] || {};
  return `<nav class="live-resource-links" aria-label="${esc(probe.surface)} resources">
    <a href="${esc(probe.path)}" target="_blank" rel="noopener">Artifact</a>
    <a href="${esc(resource.package || PACKAGE_MAP_URL)}">Package</a>
    <a href="${esc(resource.wiki || `${WIKI_BASE}/wiki-index.html`)}" target="_blank" rel="noopener noreferrer">Wiki</a>
  </nav>`;
}

function renderLiveContext(results) {
  const el = $('live-context');
  if (!el) return;
  const counts = { ok: 0, warn: 0, bad: 0, skip: 0 };
  for (const r of results) counts[r.tone] = (counts[r.tone] || 0) + 1;
  const origin = typeof location !== 'undefined' ? location.origin : '—';
  const when = new Date().toISOString().slice(0, 19) + 'Z';
  const archiveSummary = $('live-archive-summary');
  if (archiveSummary) {
    archiveSummary.textContent = [
      `${results.length} checks`,
      `${counts.bad} fail`,
      `${counts.warn} attention`,
      counts.skip ? `${counts.skip} skip` : null,
    ]
      .filter(Boolean)
      .join(' · ');
    archiveSummary.dataset.tone = counts.bad ? 'bad' : counts.warn ? 'warn' : 'ok';
  }
  el.innerHTML = `
    <span><strong>Origin</strong> <code>${esc(origin)}</code></span>
    <span><strong>Probed</strong> ${esc(when)}</span>
    <span class="live-counts">
      <strong>Results</strong>
      <span class="c-ok">${counts.ok} ok</span> ·
      <span class="c-warn">${counts.warn} attention</span> ·
      <span class="c-bad">${counts.bad} fail</span>
      ${counts.skip ? ` · ${counts.skip} skip` : ''}
      · ${results.length} checks
    </span>
    <span><strong>Scope</strong> same-origin only (browser; no cross-subdomain Access probes)</span>
  `;
}

function renderLiveTable(results) {
  const tbody = $('live-body');
  if (!tbody) return;
  if (!results.length) {
    tbody.innerHTML = '<tr><td colspan="10">No probes configured</td></tr>';
    return;
  }
  tbody.innerHTML = results
    .map(r => {
      const p = r.probe;
      const target = targetForProbe(p);
      return `<tr data-probe="${esc(p.id)}" data-tone="${esc(r.tone)}">
        <td>
          ${semanticValue('surface', p.surface, 'surface-name semantic-value')}
          <span class="surface-what">${esc(p.what || '')}</span>
        </td>
        <td class="mono live-host">${semanticValue('hostname', target.hostname, 'semantic-value')}</td>
        <td class="mono live-port">${semanticValue('port', target.port, 'semantic-value')}</td>
        <td>${toneBadge(r.tone, r.statusLabel)}</td>
        <td>${semanticValue('kind', p.kind, 'kind-chip')}</td>
        <td>${semanticValue('plane', p.plane, 'plane-chip', `data-plane="${esc(p.plane)}"`)}</td>
        <td class="mono live-source">${esc(target.source)}</td>
        <td>${semanticValue('version', versionForProbe(r), 'version-chip')}</td>
        <td>${probeResourceLinks(p)}</td>
        <td class="detail">${esc(r.detail)}</td>
      </tr>`;
    })
    .join('');
}

async function runLiveChecks() {
  const tbody = $('live-body');
  const ctx = $('live-context');
  if (tbody) {
    tbody.innerHTML = LIVE_PROBES.map(p => {
      const target = targetForProbe(p);
      return `<tr data-probe="${esc(p.id)}" data-tone="skip">
          <td>${semanticValue('surface', p.surface, 'surface-name semantic-value')}<span class="surface-what">${esc(p.what || '')}</span></td>
          <td class="mono live-host">${semanticValue('hostname', target.hostname, 'semantic-value')}</td>
          <td class="mono live-port">${semanticValue('port', target.port, 'semantic-value')}</td>
          <td>${toneBadge('skip', 'probing')}</td>
          <td>${semanticValue('kind', p.kind, 'kind-chip')}</td>
          <td>${semanticValue('plane', p.plane, 'plane-chip', `data-plane="${esc(p.plane)}"`)}</td>
          <td class="mono live-source">${esc(target.source)}</td>
          <td>${semanticValue('version', 'pending', 'version-chip')}</td>
          <td>${probeResourceLinks(p)}</td>
          <td class="detail">probing</td>
        </tr>`;
    }).join('');
  }
  if (ctx) {
    ctx.innerHTML = `<span>Probing <strong>${LIVE_PROBES.length}</strong> surfaces on <code>${esc(location.origin)}</code>…</span>`;
  }

  const results = await Promise.all(LIVE_PROBES.map(probeOne));
  // Stable catalog order
  const byId = new Map(results.map(r => [r.probe.id, r]));
  const ordered = LIVE_PROBES.map(p => byId.get(p.id)).filter(Boolean);
  renderLiveContext(ordered);
  renderLiveTable(ordered);
  return ordered;
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
          monitoring: mon ? { packageCount: mon.packageCount, dodQueue: mon.dodQueue } : null,
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

  const failRate = channels?.failRate != null ? `${Math.round(channels.failRate * 100)}%` : null;
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
  const needs = !d.toc?.available || d.loop == null || d.channels == null;
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
  const allOk = status === 'pass' || (passed != null && total != null && passed === total);
  cardEl.querySelector('.val').textContent =
    passed != null && total != null ? `${passed}/${total}` : '—';
  cardEl.querySelector('.sub').textContent = [
    sliceOrProof.bunVersion ? `Bun ${sliceOrProof.bunVersion}` : null,
    sliceOrProof.proofHash ? `sha ${String(sliceOrProof.proofHash).slice(0, 12)}…` : sourceLabel,
  ]
    .filter(Boolean)
    .join(' · ');
  cardEl.dataset.tone = allOk ? 'ok' : sliceOrProof.available === false ? 'warn' : 'bad';
  cardEl.querySelector('.health-card-version').textContent = sliceOrProof.bunVersion
    ? `Bun ${sliceOrProof.bunVersion}`
    : 'proof v1';
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
    cardEl.dataset.tone = 'warn';
  }
}

function cardGroup(id, title, description, cards) {
  return `<section class="health-card-group" data-card-group="${esc(id)}" aria-labelledby="health-group-${esc(id)}">
    <header class="health-card-group-header">
      <div>
        <p class="health-card-group-kicker">${esc(id)}</p>
        <h2 id="health-group-${esc(id)}">${esc(title)}</h2>
      </div>
      <p>${esc(description)}</p>
    </header>
    <div class="health-card-group-grid">${cards.join('')}</div>
  </section>`;
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
  const schemaVersion = `schema v${d.schemaVersion ?? 1}`;

  const routingCard = routing
    ? card({
        id: 'routing',
        title: 'Routing proof',
        value: `${routing.passed ?? '—'}/${routing.total ?? '—'}`,
        sub:
          [
            routing.criticalFailed != null ? `${routing.criticalFailed} critical fail` : null,
            routing.meanMs != null ? `mean ${Math.round(routing.meanMs)}ms` : null,
            routing.p95Ms != null ? `p95 ${Math.round(routing.p95Ms)}ms` : null,
          ]
            .filter(Boolean)
            .join(' · ') || 'from ops snapshot',
        tone:
          routing.criticalFailed > 0 || routing.failed > 0
            ? 'bad'
            : routing.passed === routing.total
              ? 'ok'
              : 'warn',
        version: routing.schemaVersion ? `schema v${routing.schemaVersion}` : 'proof v1',
      })
    : card({
        id: 'routing',
        title: 'Route static',
        value: rs.staticRoutes != null ? String(rs.staticRoutes) : '—',
        sub:
          rs.staticHits != null
            ? `${rs.staticHits} hits · ${rs.notModified304 ?? 0}×304`
            : rs.note || 'edge: see routing proof after snapshot',
        tone: 'warn',
        version: 'route v1',
      });

  const runtimeCards = [
    card({
      id: 'status',
      title: 'Status',
      value: String(d.status || '—'),
      sub: d.platform || d.runtime || '',
      tone: ok ? 'ok' : 'bad',
      version: schemaVersion,
    }),
    card({
      id: 'checked',
      title: 'Checked',
      value: d.checkedAt
        ? String(d.checkedAt).slice(11, 19) + 'Z'
        : d.serve?.etagScope
          ? 'shared'
          : '—',
      sub: d.checkedAt ? String(d.checkedAt).slice(0, 10) : d.serve?.etagScope || 'no timestamp',
      tone: d.checkedAt || d.serve?.etagScope ? 'ok' : 'warn',
      version: 'probe v1',
    }),
    card({
      id: 'api-proof',
      title: 'API proof',
      value: proof.available
        ? proofSum.demosPassed != null && proofSum.demos != null
          ? `${proofSum.demosPassed}/${proofSum.demos}`
          : 'available'
        : '—',
      sub: [
        proof.bunVersion ? `Bun ${proof.bunVersion}` : null,
        proofSum.apisVerified != null ? `${proofSum.apisVerified}/${proofSum.apis} APIs` : null,
        proof.generated ? String(proof.generated).slice(0, 10) : null,
      ]
        .filter(Boolean)
        .join(' · '),
      tone:
        proof.available && (proofSum.demosPassed == null || proofSum.demosPassed === proofSum.demos)
          ? 'ok'
          : 'warn',
      version: proof.bunVersion ? `Bun ${proof.bunVersion}` : 'proof v1',
    }),
  ];

  const artifactCards = [
    card({
      id: 'ops-summary',
      title: 'Ops summary',
      value:
        arts.exists === false ? 'missing' : arts.generated ? 'present' : arts.exists ? 'yes' : '—',
      sub: arts.generated
        ? `${String(arts.generated).slice(0, 19)} · ${arts.source || 'artifact'}`
        : '',
      tone: arts.exists === false ? 'bad' : 'ok',
      version: 'artifact v1',
    }),
    card({
      id: 'registry',
      title: 'Registry',
      value:
        reg.packages != null
          ? String(reg.packages)
          : mon.packageCount != null
            ? String(mon.packageCount)
            : '—',
      sub:
        reg.versions != null
          ? `${reg.versions} versions`
          : mon.dodQueue != null
            ? `DOD ${mon.dodQueue}`
            : 'packages',
      tone: reg.packages != null || mon.packageCount != null ? 'ok' : 'warn',
      version: reg.versions != null ? `${reg.versions} versions` : 'catalog v1',
    }),
    card({
      id: 'defaults',
      title: 'Defaults',
      value: '…',
      sub: 'loading proof…',
      tone: 'skip',
      version: 'proof v1',
    }),
  ];

  const verificationCards = [
    routingCard,
    card({
      id: 'taxonomy',
      title: 'Taxonomy audit',
      value:
        d.proofTaxonomy?.available && d.proofTaxonomy.contracts != null
          ? `${d.proofTaxonomy.contractsOk ?? '?'}/${d.proofTaxonomy.contracts}`
          : '—',
      sub: d.proofTaxonomy?.available
        ? `ok=${d.proofTaxonomy.ok} · ${d.proofTaxonomy.source || 'audit'}`
        : 'proof-taxonomy-audit',
      tone: d.proofTaxonomy?.available ? (d.proofTaxonomy.ok ? 'ok' : 'bad') : 'warn',
      version: 'audit v1',
    }),
  ];

  const operationsCards = [
    card({
      id: 'toc',
      title: 'TOC warmed',
      value: d.toc?.available ? String(d.toc.warmed ?? 0) : '—',
      sub: d.toc?.available
        ? `${d.toc.openBottlenecks ?? 0} bottlenecks · ${d.toc.confirmedRails ?? 0} rails`
        : 'enrich from ops-summary',
      tone: d.toc?.available
        ? d.toc.criticalBottlenecks > 0
          ? 'bad'
          : d.toc.openBottlenecks > 0
            ? 'warn'
            : 'ok'
        : 'warn',
      version: 'ops v1',
    }),
  ];

  const cb = d.artifacts?.complianceBoard;
  if (cb && typeof cb === 'object') {
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
    operationsCards.push(
      card({
        id: 'compliance',
        title: 'Compliance',
        value: cbVal,
        sub: cbSub || (cb.exists ? 'board' : 'optional bake'),
        tone: !cb.exists ? 'warn' : cb.ok ? 'ok' : 'bad',
        version: 'artifact v1',
      })
    );
  }

  const lr = d.artifacts?.limitRaises;
  if (lr && typeof lr === 'object') {
    const lrVal = !lr.exists
      ? 'missing'
      : lr.raises != null
        ? String(lr.raises)
        : lr.ok
          ? 'ok'
          : '—';
    const lrSub = !lr.exists
      ? 'optional bake · bun run ops:snapshot'
      : [
          lr.partners != null ? `${lr.partners} partners` : null,
          lr.lookbackHours != null ? `${lr.lookbackHours}h lookback` : null,
          lr.generated ? String(lr.generated).slice(0, 19) : null,
        ]
          .filter(Boolean)
          .join(' · ');
    operationsCards.push(
      card({
        id: 'limit-raises',
        title: 'Limit raises',
        value: lrVal,
        sub: lrSub || (lr.exists ? 'board' : 'optional bake'),
        tone: !lr.exists ? 'warn' : lr.ok ? 'ok' : 'bad',
        version: 'artifact v1',
      })
    );
  }

  $('cards').innerHTML = [
    cardGroup(
      'runtime',
      'Runtime',
      'Edge state, probe time, and Bun API capability proof.',
      runtimeCards
    ),
    cardGroup(
      'artifacts',
      'Packages & artifacts',
      'Versioned registry and proof outputs consumed by the portal.',
      artifactCards
    ),
    cardGroup(
      'verification',
      'Verification',
      'Routing and taxonomy gates that establish release confidence.',
      verificationCards
    ),
    cardGroup(
      'operations',
      'Operations',
      'TOC, compliance, and partner-limit operating signals.',
      operationsCards
    ),
  ].join('');
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
    $('banner').className = 'health-banner';
    $('banner').dataset.tone = 'bad';
    $('banner-title').textContent = 'Health unavailable';
    $('banner-meta').textContent = 'Could not reach /api/health, /health, or static snapshots';
    $('cards').innerHTML = '';
    renderPlane(null);
    raw.textContent = 'No data';
    $('env-body').innerHTML = '<tr><td colspan="5">No payload</td></tr>';
    return;
  }

  const d = payload.data;
  const ok = d.status === 'ok' || d.status === 'healthy';
  $('banner').className = 'health-banner';
  $('banner').dataset.tone = ok ? 'ok' : 'bad';
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

  // Live check table runs in parallel with edge health rollup.
  const livePromise = runLiveChecks();

  const payload = await fetchHealth();
  if (payload?.data) {
    payload.data = await enrichFromOpsSummary(payload.data);
  }
  render(payload);
  await livePromise;
  document.dispatchEvent(new CustomEvent('portal:health-ready', { detail: payload }));
}

async function loadVpsStatus() {
  const panel = $('vps-panel');
  if (!panel) return;
  try {
    const res = await fetch('/registry/vps-health.json', { credentials: 'same-origin' });
    if (!res.ok) {
      panel.innerHTML = '<p class="st-bad">VPS unreachable</p>';
      return;
    }
    const d = await res.json();
    const ok = s => s === 'active' || s?.startsWith('Up');
    const cls = s => (ok(s) ? 'st-ok' : 'st-bad');
    panel.innerHTML = `
      <table class="env-table">
        <thead><tr><th>Host</th><th>Uptime</th><th>Disk</th><th>Memory</th></tr></thead>
        <tbody>
          <tr>
            <td class="mono">${d.hostname || '?'}</td>
            <td>${d.uptime || '?'}</td>
            <td class="${cls(d.disk?.percent?.replace('%', '') > 85 ? 'st-bad' : 'st-ok')}">${d.disk?.percent || '?'} (${d.disk?.free || '?'} free)</td>
            <td class="${d.memory?.available?.replace('Gi', '') > 2 ? 'st-ok' : 'st-warn'}">${d.memory?.used || '?'} / ${d.memory?.total || '?'} (${d.memory?.available || '?'} free)</td>
          </tr>
        </tbody>
      </table>
      <table class="env-table" style="margin-top:8px">
        <thead><tr><th>Service</th><th>Status</th></tr></thead>
        <tbody>
          ${Object.entries(d.services || {})
            .map(
              ([name, status]) => `
            <tr><td class="mono">${name}</td><td class="${cls(status)}">${status}</td></tr>
          `
            )
            .join('')}
          ${Object.entries(d.docker || {})
            .map(
              ([name, status]) => `
            <tr><td class="mono">${name} <span style="opacity:0.5">(docker)</span></td><td class="${cls(status)}">${status}</td></tr>
          `
            )
            .join('')}
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
  // Document-plane verification pins (closes surfaces orphan triage "document" set)
  void import('./proof-index.js').then(m =>
    m.mountProofIndex(document.getElementById('proof-index-host'))
  );
  setInterval(() => void load(), 15_000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
