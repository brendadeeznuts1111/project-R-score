/**
 * Home command centre — live widgets from baked registry JSON.
 * Loopback serve-public adds snapshot index + run actions via /api/portal/*.
 */

import { bindCopyButtons } from './copy-cli.js';
import { fetchJson } from './fetch-json.js';
import {
  QUICK_ACTIONS,
  LINK_GROUPS,
  BAKE_SOURCES,
  ageLabel,
  aggregateCommandCentre,
} from './command-centre-core.js';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isLoopbackHost() {
  const h = location.hostname;
  return h === '127.0.0.1' || h === 'localhost' || h === '::1';
}

async function loadBakePayloads() {
  /** @type {Record<string, object|null>} */
  const payloads = {};
  await Promise.all(
    BAKE_SOURCES.map(async src => {
      payloads[src.id] = await fetchJson(src.href);
    })
  );
  return payloads;
}

async function loadDashboard() {
  const api = await fetchJson('/api/portal/dashboard');
  if (api?.schemaVersion === 1) return api;

  const [
    monorepoHealth,
    failures,
    packagesGraph,
    monitoring,
    capabilityMap,
    catalogSnapshot,
    opsSummary,
    vaultHealth,
    bakePayloads,
  ] = await Promise.all([
    fetchJson('/registry/monorepo-health.json'),
    fetchJson('/registry/failures.json'),
    fetchJson('/registry/packages-graph-map.json'),
    fetchJson('/registry/monitoring.json'),
    fetchJson('/registry/capability-map-subset.json'),
    fetchJson('/registry/catalog-snapshot.json'),
    fetchJson('/registry/ops-summary.json'),
    fetchJson('/registry/vault-health.json'),
    loadBakePayloads(),
  ]);

  return aggregateCommandCentre({
    monorepoHealth,
    failures,
    packagesGraph,
    monitoring,
    capabilityMap,
    catalogSnapshot,
    opsSummary,
    vaultHealth,
    bakePayloads,
    snapshotIndex: null,
  });
}

/** @param {ReturnType<typeof aggregateCommandCentre>} data */
function dashboardHasData(data) {
  return Boolean(
    data.health?.score != null ||
      data.registry?.packageCount != null ||
      data.vault?.activeItems != null ||
      data.doctor?.present ||
      data.bakeFreshness?.rows?.some(r => r.ok)
  );
}

function badgeHtml(tone, label) {
  return `<span class="nav-badge nav-badge--${tone}">${esc(label)}</span>`;
}

function renderHealth(w) {
  const scoreLabel = w.score != null ? `${Math.round(w.score)}/100` : '—';
  const statusLine = w.healthy
    ? 'No critical test failures'
    : `${w.failureCount} test failure(s)`;
  return `
    <article class="cc-widget" data-group="harness">
      <header class="cc-widget-head">
        <h2>Health</h2>
        ${badgeHtml(w.tone, scoreLabel)}
      </header>
      <p class="cc-stat">${esc(statusLine)} · grade ${esc(w.grade)}</p>
      <p class="cc-meta">Updated ${esc(ageLabel(w.generatedAt))}</p>
      <div class="cc-actions">
        <a class="cc-btn" href="${esc(w.boardHref)}">View board</a>
        <button type="button" class="copy-cli cc-btn cc-btn--ghost" data-cli="${esc(w.auditCli)}">copy bake</button>
        ${!w.healthy ? `<button type="button" class="copy-cli cc-btn cc-btn--ghost" data-cli="${esc(w.failuresCli)}">copy failures bake</button>` : ''}
      </div>
    </article>`;
}

function renderDoctor(w) {
  const badgeTone = w.tone === 'green' ? 'ok' : w.tone === 'red' ? 'bad' : 'warn';
  const label = w.present
    ? `${w.passed}/${w.checkCount} · ${w.tone}`
    : 'missing';
  const groupLine =
    Array.isArray(w.failedGroups) && w.failedGroups.length > 0
      ? w.failedGroups.map(g => `${g.group} ${g.failed}/${g.total}`).join(' · ')
      : w.present
        ? 'All groups green'
        : 'Run bake:doctor';
  return `
    <article class="cc-widget" data-group="harness">
      <header class="cc-widget-head">
        <h2>Doctor</h2>
        ${badgeHtml(badgeTone, label)}
      </header>
      <p class="cc-stat">${esc(groupLine)}</p>
      <p class="cc-meta">Updated ${esc(ageLabel(w.generatedAt))} · fatalFail=${esc(String(w.failedFatal ?? 0))}</p>
      <div class="cc-actions">
        <a class="cc-btn" href="${esc(w.boardHref || '/portal/doctor/')}">View board</a>
        <button type="button" class="copy-cli cc-btn cc-btn--ghost" data-cli="${esc(w.cli || 'bun run portal:doctor')}">copy CLI</button>
        <button type="button" class="copy-cli cc-btn cc-btn--ghost" data-cli="${esc(w.bakeCli || 'bun run bake:doctor')}">copy bake</button>
        ${isLoopbackHost() ? `<button type="button" class="cc-btn cc-btn--primary" id="cc-doctor-run">Run doctor</button>` : ''}
      </div>
      <p class="cc-meta" id="cc-doctor-status" aria-live="polite"></p>
    </article>`;
}

function renderRegistry(w) {
  const pkgs = w.packageCount != null ? String(w.packageCount) : '—';
  const attentionList =
    Array.isArray(w.attentionPackages) && w.attentionPackages.length > 0
      ? `<li>Attention: ${w.attentionPackages.map(p => esc(`${p.name} (${p.grade})`)).join(', ')}</li>`
      : '';
  return `
    <article class="cc-widget" data-group="registry">
      <header class="cc-widget-head">
        <h2>Registry</h2>
        ${badgeHtml('neutral', w.graphGrade)}
      </header>
      <ul class="cc-list">
        <li>${esc(pkgs)} workspace packages · graph ${w.graphScore != null ? esc(String(w.graphScore)) : '—'}/100</li>
        <li>${esc(String(w.attention))} need attention · ${w.versionCount != null ? esc(String(w.versionCount)) : '—'} registry versions</li>
        ${attentionList}
      </ul>
      <p class="cc-meta">Updated ${esc(ageLabel(w.generatedAt))}</p>
      <div class="cc-actions">
        <a class="cc-btn" href="${esc(w.boardHref)}">View packages</a>
        <button type="button" class="copy-cli cc-btn cc-btn--ghost" data-cli="${esc(w.cli)}">copy graph</button>
      </div>
    </article>`;
}

function renderVault(w) {
  const active = w.activeItems != null ? String(w.activeItems) : '—';
  const refOk = w.referencedOk != null ? String(w.referencedOk) : '—';
  return `
    <article class="cc-widget" data-group="secrets">
      <header class="cc-widget-head">
        <h2>Vault</h2>
        ${badgeHtml(w.tone, active)}
      </header>
      <ul class="cc-list">
        <li>${esc(active)} active vault items</li>
        <li>${esc(refOk)} env references ok</li>
      </ul>
      <p class="cc-meta">Updated ${esc(ageLabel(w.generatedAt))}</p>
      <div class="cc-actions">
        <a class="cc-btn" href="${esc(w.boardHref)}">View vault</a>
        <button type="button" class="copy-cli cc-btn cc-btn--ghost" data-cli="${esc(w.cli)}">copy bake</button>
        <button type="button" class="copy-cli cc-btn cc-btn--ghost" data-cli="${esc(w.gateCli)}">copy gate</button>
      </div>
    </article>`;
}

function renderBakeFreshness(w) {
  const chips = (w.rows || [])
    .map(r => {
      const cls = r.ok ? 'cc-bake-chip' : 'cc-bake-chip cc-bake-chip--warn';
      const age = r.ok ? ageLabel(r.generatedAt) : 'missing';
      return `<span class="${cls}"><a href="${esc(r.board)}">${esc(r.label)}</a> · ${esc(age)}</span>`;
    })
    .join('');
  return `
    <article class="cc-widget cc-widget--wide" data-group="registry">
      <header class="cc-widget-head">
        <h2>Bake freshness</h2>
      </header>
      <div class="cc-bake-strip">${chips || '<span class="cc-meta">No bakes loaded</span>'}</div>
      <div class="cc-actions">
        <button type="button" class="copy-cli cc-btn cc-btn--ghost" data-cli="${esc(w.rebakeCli)}">copy ops snapshot</button>
        <a class="cc-btn" href="/portal/tools/">CLI tools hub</a>
      </div>
    </article>`;
}

function renderSnapshots(w) {
  const rows =
    w.rows.length > 0
      ? w.rows
          .map(
            r =>
              `<li><span class="cc-dot"></span> ${esc(r.scope)} <span class="cc-meta">${esc(ageLabel(r.capturedAt))}</span></li>`
          )
          .join('')
      : '<li class="cc-meta">No snapshots on this plane — run locally</li>';
  const hint =
    w.source === 'local-index'
      ? 'From local snapshots/index.jsonl (dev server)'
      : w.source === 'catalog-fallback'
        ? 'Catalog bake fallback — scope snapshots are local-only on Pages'
        : 'Scope snapshots live in trusted shell';
  return `
    <article class="cc-widget" data-group="ops">
      <header class="cc-widget-head">
        <h2>Recent snapshots</h2>
      </header>
      <ul class="cc-list cc-list--snap">${rows}</ul>
      <p class="cc-meta">${esc(hint)}</p>
      <div class="cc-actions">
        <a class="cc-btn" href="${esc(w.toolsHref)}">Snapshot tools</a>
        <button type="button" class="copy-cli cc-btn cc-btn--ghost" data-cli="${esc(w.listCli)}">copy list</button>
        <button type="button" class="copy-cli cc-btn cc-btn--ghost" data-cli="${esc(w.runCli)}">copy run</button>
      </div>
    </article>`;
}

function renderQuickActions(loopback) {
  const buttons = QUICK_ACTIONS.map(a => {
    const runBtn = loopback
      ? `<button type="button" class="run-action cc-btn cc-btn--primary" data-action="${esc(a.id)}">Run</button>`
      : '';
    return `<div class="cc-qa-row" data-group="${esc(a.group)}">
      <code class="cc-qa-cmd">${esc(a.cli)}</code>
      <div class="cc-qa-btns">
        <button type="button" class="copy-cli cc-btn cc-btn--ghost" data-cli="${esc(a.cli)}">copy</button>
        ${runBtn}
      </div>
    </div>`;
  }).join('');
  return `
    <article class="cc-widget cc-widget--wide" data-group="harness">
      <header class="cc-widget-head">
        <h2>Quick actions</h2>
      </header>
      <p class="cc-meta">${loopback ? 'Loopback dev server — Run spawns CLI. Pages copies only.' : 'Copy CLI into a trusted shell — Pages cannot spawn your toolchain.'}</p>
      <div class="cc-qa-grid">${buttons}</div>
      <p class="cc-meta" id="action-status" aria-live="polite"></p>
    </article>`;
}

function renderCapabilities(w) {
  return `
    <article class="cc-widget" data-group="harness">
      <header class="cc-widget-head">
        <h2>Capability map</h2>
        ${badgeHtml('neutral', String(w.rowCount))}
      </header>
      <ul class="cc-list">
        <li>Bun / runtime: ${esc(String(w.bun))}</li>
        <li>Proton / secrets: ${esc(String(w.proton))}</li>
        <li>Other: ${esc(String(w.other))}</li>
      </ul>
      <p class="cc-meta">Subset bake · ${esc(ageLabel(w.generatedAt))}</p>
      <div class="cc-actions">
        <a class="cc-btn" href="${esc(w.href)}">Open full map</a>
        <button type="button" class="copy-cli cc-btn cc-btn--ghost" data-cli="${esc(w.cli)}">copy rebake</button>
      </div>
    </article>`;
}

function renderLinks() {
  const groups = LINK_GROUPS.map(g => {
    const links = g.links
      .map(l => `<a href="${esc(l.href)}" data-group="${esc(g.group)}">${esc(l.label)}</a>`)
      .join('<span class="cc-sep">·</span>');
    return `<div class="cc-link-group" data-group="${esc(g.group)}">
      <span class="cc-group-label">${esc(g.label)}</span>
      <div class="cc-link-row">${links}</div>
    </div>`;
  }).join('');
  return `
    <article class="cc-widget cc-widget--wide" data-group="other">
      <header class="cc-widget-head">
        <h2>Key links</h2>
      </header>
      <div class="cc-links">${groups}</div>
    </article>`;
}

function renderErrorPanel() {
  const rebakeCli = 'bun run ops:snapshot --no-routing';
  return `
    <article class="cc-error" role="alert">
      <h2>Dashboard data unavailable</h2>
      <p>Registry bakes did not load. Rebake the public plane or open this page via local serve-public.</p>
      <div class="cc-actions">
        <button type="button" class="copy-cli cc-btn cc-btn--primary" data-cli="${esc(rebakeCli)}">copy rebake</button>
        <a class="cc-btn" href="/portal/tools/">CLI tools hub</a>
      </div>
    </article>`;
}

function bindRunActions(root = document) {
  const status = document.getElementById('action-status');
  root.querySelectorAll('.run-action').forEach(btn => {
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', async () => {
      const action = btn.getAttribute('data-action');
      if (!action) return;
      btn.disabled = true;
      if (status) status.textContent = `Running ${action}…`;
      try {
        const res = await fetch('/api/portal/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ action }),
        });
        const body = await res.json().catch(() => ({}));
        if (status) {
          status.textContent = res.ok
            ? `✓ ${action} finished${body.generatedAt ? ` · ${body.generatedAt}` : ''}`
            : `✗ ${body.error || res.statusText}`;
        }
        if (res.ok) void refresh();
      } catch (e) {
        if (status) status.textContent = `✗ ${String(e?.message || e)}`;
      } finally {
        btn.disabled = false;
      }
    });
  });
}

function renderAll(data) {
  const loopback = isLoopbackHost();
  const grid = document.getElementById('cc-grid');
  const stamp = document.getElementById('cc-updated');
  if (!grid) return;

  if (!dashboardHasData(data)) {
    grid.innerHTML = renderErrorPanel();
    if (stamp) stamp.textContent = 'No registry data loaded';
    bindCopyButtons(grid);
    return;
  }

  grid.innerHTML = [
    renderBakeFreshness(data.bakeFreshness),
    renderHealth(data.health),
    renderDoctor(data.doctor || { present: false, tone: 'yellow' }),
    renderRegistry(data.registry),
    renderVault(data.vault),
    renderSnapshots(data.snapshots),
    renderCapabilities(data.capabilities),
    renderQuickActions(loopback),
    renderLinks(),
  ].join('');
  if (stamp) {
    stamp.textContent = `Data refreshed ${ageLabel(data.generatedAt)} · ops ${ageLabel(data.opsGeneratedAt)}`;
  }
  bindCopyButtons(grid);
  bindRunActions(grid);
  bindDoctorRun(grid);
}

function bindDoctorRun(root = document) {
  const btn = root.querySelector('#cc-doctor-run');
  if (!btn || btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';
  const status = root.querySelector('#cc-doctor-status') || document.getElementById('cc-doctor-status');
  btn.addEventListener('click', async () => {
    if (!isLoopbackHost()) {
      if (status) status.textContent = 'Loopback only — use: bun run bake:doctor';
      return;
    }
    btn.disabled = true;
    if (status) status.textContent = 'Running portal doctor…';
    try {
      const res = await fetch('/api/doctor/run', {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });
      const body = await res.json().catch(() => ({}));
      if (status) {
        status.textContent = res.ok
          ? `✓ tone=${body.tone ?? '—'} · ${body.summary?.passed ?? '?'}/${body.summary?.checkCount ?? '?'} passed`
          : `✗ ${body.error || res.statusText}`;
      }
      if (res.ok) void refresh();
    } catch (e) {
      if (status) status.textContent = `✗ ${String(e?.message || e)}`;
    } finally {
      btn.disabled = false;
    }
  });
}

async function refresh() {
  const data = await loadDashboard();
  renderAll(data);
}

export async function initCommandCentre() {
  await refresh();
  document.getElementById('cc-refresh')?.addEventListener('click', () => {
    void refresh();
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      void initCommandCentre();
    });
  } else {
    void initCommandCentre();
  }
}
