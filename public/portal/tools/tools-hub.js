/**
 * Tools hub — baked-data freshness, last snapshot widget, copy-to-clipboard for CLI.
 * Static Pages only: no Bun.spawn from the browser.
 */

import { bindCopyButtons } from '../copy-cli.js';
import { fetchJsonResult } from '../fetch-json.js';
import { BAKE_SOURCES, ageLabel, pickGeneratedAt } from '../command-centre-core.js';

/** Shared bakes plus tools-hub-only vault-map row. */
const BAKES = [
  ...BAKE_SOURCES,
  {
    id: 'vault-map',
    label: 'vault-map',
    href: '/registry/vault-map.json',
    board: '/portal/env/',
    cli: 'bun run portal-cli secret map',
  },
  {
    id: 'capability-map',
    label: 'capability-map-subset',
    href: '/registry/capability-map-subset.json',
    board: '/portal/tools/#capabilities',
    cli: 'bun run portal-cli dashboard --view=capabilities',
  },
].filter((b, i, arr) => arr.findIndex(x => x.id === b.id) === i);

async function fillBakeStatus() {
  const tbody = document.getElementById('bake-status-body');
  if (!tbody) return;
  const rows = await Promise.all(
    BAKES.map(async b => {
      const r = await fetchJsonResult(b.href);
      if (!r.ok) {
        return `<tr class="warn"><td>${b.label}</td><td class="dim">missing (${r.status ?? 'err'})</td><td><a href="${b.board}">board</a></td><td><button type="button" class="copy-cli" data-cli="${b.cli}">copy bake</button></td></tr>`;
      }
      const at = pickGeneratedAt(r.data);
      let extra = '';
      if (b.id === 'failures' && r.data?.totals) {
        extra = ` · failures=${r.data.totals.failures ?? 0}`;
      }
      if (b.id === 'packages' && Array.isArray(r.data?.packages)) {
        extra = ` · pkgs=${r.data.packages.length} · grade=${r.data.grade ?? '—'}`;
      }
      if (b.id === 'vault-health' && r.data?.summary) {
        const s = r.data.summary;
        extra = ` · active=${s.activeItems ?? '—'} · healthy=${s.healthy ?? '—'}`;
      }
      if (b.id === 'capability-map' && r.data) {
        const n = r.data.rowCount ?? r.data.rows?.length ?? '—';
        const pc = r.data.summary?.protocolCounts;
        const proto = pc
          ? Object.entries(pc)
              .map(([k, v]) => `${k}=${v}`)
              .join(' ')
          : '';
        extra = ` · rows=${n}${proto ? ` · ${proto}` : ''} · schema v${r.data.schemaVersion ?? '?'}`;
      }
      return `<tr><td><a href="${b.href}">${b.label}</a></td><td>${ageLabel(at)}${extra}</td><td><a href="${b.board}">board</a></td><td><button type="button" class="copy-cli" data-cli="${b.cli}">copy</button></td></tr>`;
    })
  );
  tbody.innerHTML = rows.join('');
}

/**
 * Last snapshots — best-effort. Prefer public registry if present; else local path is not on Pages.
 */
async function fillSnapshotWidget() {
  const el = document.getElementById('snapshot-widget');
  if (!el) return;
  // Optional bake path (not required) — fail soft to CLI hint
  // Real public artifact only (no phantom portal-snapshot-last.json)
  const url = '/registry/catalog-snapshot.json';
  const r = await fetchJsonResult(url);
  if (r.ok && r.data) {
    const n = Array.isArray(r.data?.accounts)
      ? r.data.accounts.length
      : r.data?.summary?.accounts ?? '—';
    el.innerHTML = `<p class="dim">Catalog snapshot · accounts=${n} · <a href="${url}">JSON</a> · generated ${ageLabel(pickGeneratedAt(r.data))}</p>
      <p class="dim">Scope snapshots (local tree, not Pages):
      <button type="button" class="copy-cli" data-cli="bun run portal-cli snapshot list">copy</button>
      <code>portal-cli snapshot list</code> ·
      <button type="button" class="copy-cli" data-cli="bun run portal-cli snapshot last --scope prediction">copy</button>
      <code>portal-cli snapshot last --scope prediction</code></p>`;
    return;
  }
  el.innerHTML = `<p class="dim">Catalog snapshot missing · scope snapshots live in local <code>snapshots/</code> (not Pages).</p>
    <p class="dim">List: <button type="button" class="copy-cli" data-cli="bun run portal-cli snapshot list">copy</button>
    <code>portal-cli snapshot list</code></p>`;
}

/**
 * Capability subset SSOT: /registry/capability-map-subset.json
 * Fallback rows only if bake missing (keep in sync with registry file).
 * Full matrix: AGENTS.md#grounded-capability-map
 */
/**
 * Fallback when bake missing:
 * [capability, type, protocol, version, api, status, usedIn, sourceUrl]
 */
const CAPABILITY_FALLBACK = [
  ['Vault config (TOML)', 'config', 'Bun', 'Bun ≥1.4', 'import with { type: "toml" }', 'Available', 'config/vault-map.toml', 'https://bun.sh/docs/runtime/loaders#toml'],
  ['Secret inject', 'secrets', 'pass-cli', 'pass-cli ≥2.2', 'pass-cli inject -i/-o', 'Implemented', 'portal-cli secret inject', ''],
  ['Vault & item list', 'secrets', 'pass-cli', 'pass-cli ≥2.2', 'pass-cli vault list · item list', 'Implemented', 'portal-cli secret vaults', ''],
  ['Secret view', 'secrets', 'pass-cli', 'pass-cli ≥2.2', 'pass-cli item view', 'Implemented', 'portal-cli secret get', ''],
  ['Snapshot testing', 'test', 'Bun', 'Bun ≥1.0', 'expect().toMatchSnapshot()', 'Implemented', 'portal-cli vault health', 'https://bun.com/docs/test/snapshots'],
  ['Update snapshots', 'test', 'Bun', 'Bun ≥1.0', 'bun test --update-snapshots', 'Implemented', 'portal-cli vault health --update', ''],
  ['Pack workspace', 'pkg', 'Bun', 'Bun ≥1.0', 'bun pm pack', 'Implemented', 'portal-cli pm pack', ''],
  ['List deps', 'pkg', 'Bun', 'Bun ≥1.0', 'bun pm ls', 'Implemented', 'portal-cli pm ls', ''],
  ['Packages graph', 'pkg', 'Bun', 'Bun ≥1.0', 'packages-graph-map bake · portal-cli pm graph', 'Implemented', 'portal-cli pm graph', ''],
  ['Security scanner', 'security', 'Bun', 'Bun ≥1.4', 'bun pm scan · [install.security]', 'Implemented', 'portal-cli scanner doctor', 'https://bun.com/docs/pm/security-scanner-api'],
  ['Dashboard launcher', 'cli', 'Bun', 'Bun ≥1.0', 'portal-cli dashboard --view', 'Implemented', '/', ''],
  ['ANSI color', 'display', 'Bun', 'Bun ≥1.0', 'Bun.color(hex, "ansi-16m")', 'Implemented', 'vault-map status lines', ''],
  ['File I/O', 'io', 'Bun', 'Bun ≥1.0', 'Bun.file · Bun.write', 'Implemented', 'bakes · snapshots', ''],
];

/** @type {string[][]} */
let capabilityRows = CAPABILITY_FALLBACK.slice();
/** @type {{ generatedAt?: string, source?: string, schemaVersion?: number, summary?: object }|null} */
let capabilityMeta = null;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Normalize registry JSON rows to
 * [capability, type, protocol, version, api, status, usedIn, sourceUrl].
 * @param {object|null} data
 * @returns {string[][]}
 */
export function normalizeCapabilityRows(data) {
  if (!data || !Array.isArray(data.rows) || data.rows.length === 0) {
    return CAPABILITY_FALLBACK.slice();
  }
  return data.rows.map(r => {
    if (Array.isArray(r)) {
      // Legacy 4-tuple → pad type/protocol/version/source
      if (r.length === 4) {
        return [String(r[0]), '—', '—', '—', String(r[1]), String(r[2]), String(r[3]), ''];
      }
      const arr = r.map(String);
      while (arr.length < 8) arr.push('');
      return arr.slice(0, 8);
    }
    const bunApi = String(r.bunApi ?? '');
    const protonCli = String(r.protonCli ?? '');
    let protocol = String(r.protocol ?? '');
    if (!protocol || protocol === 'undefined') {
      const hasBun = bunApi && bunApi !== '—';
      const hasProton = protonCli && protonCli !== '—';
      protocol =
        hasBun && hasProton
          ? 'Bun + pass-cli'
          : hasBun
            ? 'Bun'
            : hasProton
              ? 'pass-cli'
              : '—';
    }
    const src = typeof r.source === 'string' && r.source.startsWith('http') ? r.source : '';
    return [
      String(r.capability ?? r.name ?? ''),
      String(r.type ?? '—'),
      protocol,
      String(r.version ?? '—'),
      String(r.api ?? r.bunApi ?? r.protonCli ?? ''),
      String(r.status ?? ''),
      String(r.usedIn ?? r.used_in ?? ''),
      src,
    ];
  });
}

async function loadCapabilityRows() {
  const r = await fetchJsonResult('/registry/capability-map-subset.json');
  if (r.ok && r.data) {
    capabilityRows = normalizeCapabilityRows(r.data);
    capabilityMeta = {
      generatedAt: r.data.generatedAt,
      source: r.data.source,
      schemaVersion: r.data.schemaVersion,
      summary: r.data.summary,
    };
  }
}

function fillCapabilityTable() {
  const tbody = document.getElementById('capability-body');
  if (!tbody) return;
  const q = (document.getElementById('capability-filter')?.value || '').toLowerCase();
  const rows = capabilityRows.filter(r => !q || r.join(' ').toLowerCase().includes(q));
  tbody.innerHTML = rows
    .map(([cap, type, protocol, version, api, status, used, sourceUrl]) => {
      const capCell = sourceUrl
        ? `${escapeHtml(cap)} <a class="cap-source" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer" title="docs">↗</a>`
        : escapeHtml(cap);
      return `<tr>
          <td>${capCell}</td>
          <td><span class="group-tag">${escapeHtml(type)}</span></td>
          <td><code>${escapeHtml(protocol)}</code></td>
          <td class="dim">${escapeHtml(version)}</td>
          <td><code>${escapeHtml(api)}</code></td>
          <td>${escapeHtml(status)}</td>
          <td><code>${escapeHtml(used)}</code></td>
        </tr>`;
    })
    .join('');
  const meta = document.getElementById('capability-meta');
  if (meta && capabilityMeta) {
    const pc = capabilityMeta.summary?.protocolCounts;
    const proto = pc
      ? Object.entries(pc)
          .map(([k, v]) => `${k}=${v}`)
          .join(' · ')
      : '';
    meta.textContent = `${capabilityRows.length} rows · schema v${capabilityMeta.schemaVersion ?? '?'} · generated ${capabilityMeta.generatedAt || '—'} · source ${capabilityMeta.source || 'AGENTS.md'}${proto ? ` · ${proto}` : ''} · columns: type · protocol · version · api · optional source link · rebake: bun run bake:capabilities`;
  }
}

export async function initToolsHub() {
  await fillBakeStatus();
  await fillSnapshotWidget();
  await loadCapabilityRows();
  fillCapabilityTable();
  document.getElementById('capability-filter')?.addEventListener('input', fillCapabilityTable);
  bindCopyButtons();
  // Re-bind after dynamic rows
  const observer = new MutationObserver(() => bindCopyButtons());
  const bake = document.getElementById('bake-status-body');
  if (bake) observer.observe(bake, { childList: true });
  const snap = document.getElementById('snapshot-widget');
  if (snap) observer.observe(snap, { childList: true });
}

// Browser only — do not auto-run when imported from bun:test
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      void initToolsHub();
    });
  } else {
    void initToolsHub();
  }
}
