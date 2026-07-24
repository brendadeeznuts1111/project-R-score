/**
 * Operations Dashboard app — /portal/dashboard/
 * Prefers static /registry/* proofs (Cloudflare Pages) with /api/* fallbacks.
 *
 * @see docs/portal-foundation.md
 * @see public/portal/verification-card.js
 * @see public/portal/channel-filter.js
 */
import {
  renderVerificationResults,
  renderVerificationTableRow,
} from './verification-card.js';
import './channel-filter.js';

const $ = id => document.getElementById(id);

function esc(s) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function fetchJson(url) {
  try {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) return { _error: true, _status: res.status, _url: url };
    return await res.json();
  } catch (e) {
    return { _error: true, _message: e instanceof Error ? e.message : String(e), _url: url };
  }
}

function isOk(obj) {
  return obj && !obj._error;
}

function summaryPass(obj) {
  const s = obj?.summary;
  if (!s) return null;
  if (typeof s.passed === 'number' && typeof s.total === 'number') {
    return { passed: s.passed, total: s.total, status: s.status };
  }
  return null;
}

function formatBySubsystem(bySubsystem) {
  if (!bySubsystem || typeof bySubsystem !== 'object') return '';
  return Object.entries(bySubsystem)
    .filter(([, v]) => v && typeof v.total === 'number' && v.total > 0)
    .map(([k, v]) => `${k} ${v.passed}/${v.total}`)
    .join(' · ');
}

function hasMetaEmbeds(results) {
  return (results || []).some(r =>
    /^(runtime-nits:|bundler:|networking:)/.test(String(r.name || ''))
  );
}

/** Up to limitPer per subsystem for diverse cards. */
function diversifyBySubsystem(results, limitPer = 2, maxTotal = 12) {
  const order = ['runtime', 'package-manager', 'networking', 'bundler', 'test', 'other'];
  const filtered = (results || []).filter(
    r => !String(r.name || '').startsWith('install platform:')
  );
  const bySub = new Map();
  for (const r of filtered) {
    const k = r.subsystem || 'other';
    if (!bySub.has(k)) bySub.set(k, []);
    bySub.get(k).push(r);
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

function metricCard({ label, value, detail, cls = '', href }) {
  const val = href
    ? `<a class="val ${cls}" href="${esc(href)}">${esc(String(value))}</a>`
    : `<div class="val ${cls}">${esc(String(value))}</div>`;
  return `<article class="card metric-card" data-label="${esc(label)}">
    <div class="lbl">${esc(label)}</div>
    ${val}
    <div class="d">${esc(detail || '')}</div>
  </article>`;
}

function renderSkeleton() {
  const sk = n =>
    Array.from({ length: n }, () => '<div class="card skeleton skeleton-card" aria-hidden="true"></div>').join(
      ''
    );
  $('kpi-grid').innerHTML = sk(8);
  $('subsystem-grid').innerHTML = sk(4);
  $('release-cards').innerHTML =
    '<div class="skeleton skeleton-card" style="min-height:120px"></div>';
}

function proofStatusCls(sum) {
  if (!sum) return 'warn';
  if (sum.status === 'pass' || sum.passed === sum.total) return 'ok';
  if (sum.passed === 0) return 'err';
  return 'warn';
}

function renderKpis(ctx) {
  const { def, mon, release, installPlatform, installEnv, bundler, nits, taxonomy, ops } = ctx;
  const relSum = summaryPass(release);
  const taxOk = taxonomy?.ok === true;
  const taxAudits = taxonomy?.audits?.length ?? 0;
  const taxPass = taxonomy?.audits?.filter(a => a.ok).length ?? 0;
  const tree = ops?.tree;
  const partners = tree?.partners ?? mon?.tree?.partners;

  const cards = [
    {
      label: 'Release verification',
      value: relSum ? `${relSum.passed}/${relSum.total}` : '—',
      detail: hasMetaEmbeds(release?.results)
        ? `meta · ${release?.semanticTags?.channel || '?'}@${release?.semanticTags?.targetVersion || '?'}`
        : release?.semanticTags
          ? `bare · Bun ${release.bunVersion || '?'}`
          : 'Run verify:channel:meta',
      cls: proofStatusCls(relSum),
      href: '/registry/release-features.json',
    },
    {
      label: 'Taxonomy contracts',
      value: taxAudits ? `${taxPass}/${taxAudits}` : '—',
      detail: taxOk ? 'all green' : taxonomy?._error ? 'unavailable' : 'see audit',
      cls: taxOk ? 'ok' : taxAudits ? 'err' : 'warn',
      href: '/registry/proof-taxonomy-audit.json',
    },
    {
      label: 'Install platform',
      value: (() => {
        const s = summaryPass(installPlatform);
        return s ? `${s.passed}/${s.total}` : '—';
      })(),
      detail: installPlatform?.dryRun ? 'dry-run aspects' : 'aspects',
      cls: proofStatusCls(summaryPass(installPlatform)),
      href: '/registry/install-platform.json',
    },
    {
      label: 'Install env',
      value: (() => {
        const s = summaryPass(installEnv);
        return s ? `${s.passed}/${s.total}` : '—';
      })(),
      detail: 'BUN_CONFIG_* + scopes',
      cls: proofStatusCls(summaryPass(installEnv)),
      href: '/registry/install-env-proof.json',
    },
    {
      label: 'Bundler loaders',
      value: (() => {
        const s = summaryPass(bundler);
        return s ? `${s.passed}/${s.total}` : '—';
      })(),
      detail: 'css · jsonc · ts · text · file',
      cls: proofStatusCls(summaryPass(bundler)),
      href: '/registry/bundler-loaders-proof.json',
    },
    {
      label: 'Runtime nits',
      value: (() => {
        const s = summaryPass(nits);
        return s ? `${s.passed}/${s.total}` : '—';
      })(),
      detail: 'inspect · streams · url · file',
      cls: proofStatusCls(summaryPass(nits)),
      href: '/registry/bun-runtime-nits-proof.json',
    },
    {
      label: 'Bun defaults',
      value:
        def?.summary?.passed != null
          ? `${def.summary.passed}/${def.summary.total}`
          : def?.passed != null
            ? `${def.passed}/${def.total}`
            : '—',
      detail: def?.bunVersion ? `Bun ${def.bunVersion}` : def?.status || 'defaults proof',
      cls:
        (def?.summary?.passed ?? def?.passed) === (def?.summary?.total ?? def?.total) ? 'ok' : 'warn',
      href: '/registry/defaults-proof.json',
    },
    {
      label: 'Tree / liquidity',
      value: partners != null ? String(partners) : ops?.liquidity?.total ?? mon?.dodQueue ?? '—',
      detail:
        partners != null
          ? `${tree?.agents ?? 0} agents · $${ops?.liquidity?.total ?? '—'}`
          : mon?.experimentsActive != null
            ? `${mon.experimentsActive} experiments`
            : 'ops-summary',
      cls: partners != null || ops?.liquidity ? 'ok' : 'warn',
      href: '/registry/ops-summary.json',
    },
  ];

  $('kpi-grid').innerHTML = cards.map(metricCard).join('');
}

function renderSubsystems(release) {
  const by = release?.summary?.bySubsystem || {};
  const pillars = [
    'runtime',
    'package-manager',
    'networking',
    'bundler',
    'test',
    'other',
  ];
  const html = pillars
    .filter(p => by[p]?.total)
    .map(p => {
      const b = by[p];
      const cls = b.passed === b.total ? 'ok' : b.passed === 0 ? 'err' : 'warn';
      return metricCard({
        label: p,
        value: `${b.passed}/${b.total}`,
        detail: 'release meta rollup',
        cls: `subsystem-${p} ${cls}`,
      });
    });
  $('subsystem-grid').innerHTML =
    html.join('') ||
    '<p class="empty-hint">No bySubsystem on release proof — run <code>bun run verify:channel:meta</code>.</p>';
}

function renderReleaseSection(release, bake) {
  const tags = release?.semanticTags || {};
  const results = release?.results || [];
  const meta = hasMetaEmbeds(results);
  const modeEl = $('release-mode');
  if (modeEl) {
    if (meta && bake?.type === 'ChannelMetaBake' && !bake.stale) {
      modeEl.textContent = `meta · ${results.length} rows · bake ${bake.passed}/${bake.total}`;
      modeEl.className = 'version-badge match-ok';
    } else if (meta) {
      modeEl.textContent = `meta · ${results.length} rows`;
      modeEl.className = 'version-badge match-ok';
    } else if (bake?.type === 'ChannelMetaBakeInvalid' || bake?.stale) {
      modeEl.textContent = 'bare · bake invalid';
      modeEl.className = 'version-badge match-no';
    } else {
      modeEl.textContent = results.length ? `bare · ${results.length} rows` : '—';
      modeEl.className = 'version-badge';
    }
  }

  const detail = $('release-detail');
  if (detail) {
    if (tags.channel) {
      detail.textContent = `channel ${tags.channel} → ${tags.targetVersion || '?'} · runtime ${tags.runtimeVersion || release?.bunVersion || '?'} · ${formatBySubsystem(release?.summary?.bySubsystem)}`;
    } else {
      detail.textContent = release?._error
        ? 'Release proof unavailable'
        : 'Load /registry/release-features.json';
    }
  }

  const hash = $('release-hash');
  if (hash) {
    hash.textContent = release?.proofHash
      ? `sha256 ${String(release.proofHash).slice(0, 16)}…`
      : '';
  }

  const preview = diversifyBySubsystem(results, 2, 12);
  const cards = $('release-cards');
  if (cards) {
    if (preview.length && tags) {
      cards.innerHTML = renderVerificationResults({ results: preview, semanticTags: tags }, 12);
    } else if (preview.length) {
      cards.innerHTML = `<table class="ops-table"><thead><tr><th>Test</th><th>Status</th><th>Docs</th></tr></thead><tbody>${preview
        .map(r => renderVerificationTableRow(r))
        .join('')}</tbody></table>`;
    } else {
      cards.innerHTML = '<p class="empty-hint">No release results.</p>';
    }
  }

  // Apply channel-filter after cards mount
  requestAnimationFrame(() => {
    document.querySelector('channel-filter')?.applyFilter?.();
  });
}

function renderDefaults(def) {
  const el = $('defaults-tbl');
  if (!el) return;
  const tests = def?.tests || def?.results || [];
  if (!tests.length) {
    el.innerHTML =
      '<h2>Bun defaults</h2><p class="empty-hint">No defaults proof — try <a href="/registry/defaults-proof.json">defaults-proof.json</a> or /api/defaults.</p>';
    return;
  }
  const rows = tests
    .map(
      t =>
        `<tr><td>${esc(t.name)}</td><td class="mono">${esc(String(t.expected ?? '').slice(0, 80))}</td><td>${t.passed ? '✅' : '❌'}</td></tr>`
    )
    .join('');
  const hash = def.proofHash || def.summary?.proofHash || '';
  el.innerHTML = `<h2>Bun defaults verification</h2>
    <table class="ops-table"><thead><tr><th>Test</th><th>Expected</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
    ${hash ? `<p class="proof-line"><span class="phash">sha256 ${esc(String(hash).slice(0, 24))}…</span></p>` : ''}`;
}

function renderTaxonomy(taxonomy) {
  const el = $('taxonomy-tbl');
  if (!el) return;
  const audits = taxonomy?.audits || [];
  if (!audits.length) {
    el.innerHTML =
      '<h2>Proof taxonomy</h2><p class="empty-hint">No audit — run <code>bun run verify:proof-taxonomy:save</code>.</p>';
    return;
  }
  const rows = audits
    .map(a => {
      const file = String(a.path || '').split('/').pop() || a.path;
      const sub = a.primarySubsystem
        ? `<span class="version-badge subsystem-${esc(a.primarySubsystem)}">${esc(a.primarySubsystem)}</span>`
        : '—';
      return `<tr><td><a class="ops-link" href="${esc(a.reportPath || '#')}">${esc(file)}</a></td><td>${sub}</td><td>${a.rows > 0 ? a.rows : 'report'}</td><td>${a.ok ? '✅' : '❌'}</td></tr>`;
    })
    .join('');
  const cOk = (taxonomy.consistency || []).filter(c => c.ok).length;
  const cTot = (taxonomy.consistency || []).length;
  el.innerHTML = `<h2>Proof taxonomy audit</h2>
    <p class="section-sub">${taxonomy.ok ? '✅' : '❌'} contracts · consistency ${cOk}/${cTot}</p>
    <table class="ops-table"><thead><tr><th>Artifact</th><th>Subsystem</th><th>Rows</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderErrors(failed) {
  const el = $('errors');
  if (!el) return;
  if (!failed.length) {
    el.innerHTML = '';
    el.classList.add('hidden');
    return;
  }
  el.classList.remove('hidden');
  el.innerHTML = `<div class="err-box" role="alert">
    <strong>Some data sources failed</strong>
    <ul>${failed.map(f => `<li><code>${esc(f.url)}</code> — ${esc(String(f.status || f.message || 'error'))}</li>`).join('')}</ul>
    <button type="button" class="btn" id="retry-btn">Retry</button>
    <a class="ops-link" href="/portal/ops">Open full Ops dashboard</a>
  </div>`;
  $('retry-btn')?.addEventListener('click', () => load());
}

export async function load() {
  renderSkeleton();
  $('ts').textContent = 'Loading…';
  $('errors')?.classList.add('hidden');

  const urls = {
    def: ['/api/defaults', '/registry/defaults-proof.json', '/registry/bun-defaults-proof.json'],
    mon: ['/api/monitoring', '/registry/monitoring.json'],
    release: ['/registry/release-features.json', '/api/release'],
    installPlatform: ['/registry/install-platform.json'],
    installEnv: ['/registry/install-env-proof.json'],
    bundler: ['/registry/bundler-loaders-proof.json'],
    nits: ['/registry/bun-runtime-nits-proof.json'],
    taxonomy: ['/registry/proof-taxonomy-audit.json'],
    ops: ['/registry/ops-summary.json'],
    bake: ['/registry/channel-meta-bake.json'],
  };

  async function firstOk(list) {
    for (const u of list) {
      const j = await fetchJson(u);
      if (isOk(j)) return j;
    }
    return list.length ? await fetchJson(list[0]) : { _error: true };
  }

  const [
    def,
    mon,
    release,
    installPlatform,
    installEnv,
    bundler,
    nits,
    taxonomy,
    ops,
    bake,
  ] = await Promise.all([
    firstOk(urls.def),
    firstOk(urls.mon),
    firstOk(urls.release),
    firstOk(urls.installPlatform),
    firstOk(urls.installEnv),
    firstOk(urls.bundler),
    firstOk(urls.nits),
    firstOk(urls.taxonomy),
    firstOk(urls.ops),
    firstOk(urls.bake),
  ]);

  const failed = [def, mon, release, taxonomy]
    .filter(x => x?._error)
    .map(x => ({ url: x._url, status: x._status, message: x._message }));

  const ctx = {
    def,
    mon,
    release,
    installPlatform,
    installEnv,
    bundler,
    nits,
    taxonomy,
    ops,
    bake,
  };

  renderKpis(ctx);
  renderSubsystems(isOk(release) ? release : null);
  renderReleaseSection(isOk(release) ? release : null, isOk(bake) ? bake : null);
  renderDefaults(isOk(def) ? def : null);
  renderTaxonomy(isOk(taxonomy) ? taxonomy : null);
  renderErrors(failed);

  $('ts').textContent = `Updated ${new Date().toLocaleTimeString()}`;
  document.dispatchEvent(new CustomEvent('portal:dashboard-ready', { detail: ctx }));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => load());
} else {
  load();
}

document.getElementById('refresh-btn')?.addEventListener('click', () => load());
