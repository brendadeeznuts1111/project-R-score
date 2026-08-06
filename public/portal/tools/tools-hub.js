/**
// deploy-stamp: 20260801T212029Z
 * Tools hub — baked-data freshness, last snapshot widget, copy-to-clipboard for CLI.
 * Static Pages only: no Bun.spawn from the browser.
 *
 * Baked data status: status pills · group filters · full CLI + copy · tenant chip.
 */

import { bindCopyButtons } from '../copy-cli.js';
import { fetchJsonResult } from '../fetch-json.js';
import { BAKE_SOURCES, ageLabel, pickGeneratedAt } from '../command-centre-core.js';
import { escHtml, renderPortalTableRows } from '../components/portal-ui.js';

/** Freshness thresholds (ms). */
const FRESH_MS = 24 * 60 * 60 * 1000;
const STALE_MS = 7 * 24 * 60 * 60 * 1000;

const BAKE_STATUS_COLS = [
  { key: 'status', label: 'Status' },
  { key: 'group', label: 'Group' },
  { key: 'artifact', label: 'Artifact' },
  { key: 'board', label: 'Board' },
  { key: 'cli', label: 'CLI' },
];

const BAKE_AGE_COLS = [
  { key: 'status', label: 'Status' },
  { key: 'artifact', label: 'Artifact' },
  { key: 'age', label: 'Age' },
  { key: 'summary', label: 'Summary' },
];

const GROUP_LABEL = {
  registry: 'Registry',
  ops: 'Ops',
  harness: 'Harness',
  secrets: 'Secrets',
  other: 'Other',
};

/** Shared bakes plus tools-hub-only rows. */
const BAKES = [
  ...BAKE_SOURCES,
  {
    id: 'portal-weave',
    label: 'portal-weave',
    href: '/registry/portal-weave.json',
    board: '/portal/ops/#portal-weave-panel',
    cli: 'bun run ops:snapshot --no-routing',
    group: 'ops',
  },
  {
    id: 'vault-map',
    label: 'vault-map',
    href: '/registry/vault-map.json',
    board: '/portal/env/',
    cli: 'bun run portal-cli secret map',
    group: 'secrets',
  },
  {
    id: 'capability-map',
    label: 'capability-map-subset',
    href: '/registry/capability-map-subset.json',
    board: '/portal/tools/#capabilities',
    cli: 'bun run portal-cli capabilities health',
    group: 'harness',
  },
  {
    id: 'doctor-state',
    label: 'doctor-state',
    href: '/registry/doctor-state.json',
    board: '/portal/doctor/',
    cli: 'bun run bake:doctor',
    group: 'harness',
  },
  {
    id: 'tennis-agent-auth',
    label: 'tennis/agent-auth',
    href: '/registry/tennis/agent-auth.json',
    board: '/portal/tennis/',
    cli: 'bun run tennis:agent-auth:bake',
    group: 'ops',
  },
  {
    id: 'env-inventory',
    label: 'env-inventory',
    href: '/registry/env-inventory.json',
    board: '/portal/env/',
    cli: 'bun run env:inventory:bake',
    group: 'secrets',
  },
  {
    id: 'bun-cli-reference',
    label: 'bun-cli-reference',
    href: '/registry/bun-cli-reference.json',
    board: '/portal/tools/#bun-cli',
    cli: 'bun tools/bake-bun-cli-reference.ts',
    group: 'harness',
  },
].filter((b, i, arr) => arr.findIndex(x => x.id === b.id) === i);

function activeTenant() {
  try {
    return new URLSearchParams(location.search).get('tenant') || 'factory';
  } catch {
    return 'factory';
  }
}

/** @param {string|null|undefined} iso */
function ageStatus(iso) {
  if (!iso) return { key: 'missing', label: 'no date' };
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return { key: 'old', label: 'unknown' };
  const age = Date.now() - t;
  if (age < FRESH_MS) return { key: 'ok', label: 'fresh' };
  if (age < STALE_MS) return { key: 'stale', label: 'stale' };
  return { key: 'old', label: 'old' };
}

function escapeHtml(s) {
  return escHtml(s);
}

function summarizeBake(id, data) {
  if (!data) return '';
  if (id === 'failures' && data.totals) {
    return ` · failures=${data.totals.failures ?? 0}`;
  }
  if (id === 'packages' && Array.isArray(data.packages)) {
    return ` · pkgs=${data.packages.length} · grade=${data.grade ?? '—'}`;
  }
  if (id === 'vault-health' && data.summary) {
    const s = data.summary;
    return ` · active=${s.activeItems ?? '—'} · healthy=${s.healthy ?? '—'}`;
  }
  if (id === 'capability-map') {
    const n = data.rowCount ?? data.rows?.length ?? '—';
    const pc = data.summary?.protocolCounts;
    const proto = pc
      ? Object.entries(pc)
          .map(([k, v]) => `${k}=${v}`)
          .join(' ')
      : '';
    return ` · rows=${n}${proto ? ` · ${proto}` : ''} · schema v${data.schemaVersion ?? '?'}`;
  }
  if (id === 'doctor-state') {
    const s = data.summary || {};
    return ` · tone=${data.tone ?? '—'} · ${s.passed ?? '?'}/${s.checkCount ?? '?'} passed · fatalFail=${s.failedFatal ?? 0}`;
  }
  if (id === 'portal-weave' && data.summary) {
    const s = data.summary;
    return ` · schema v${data.schemaVersion ?? 2} · scripts=${s.scripts ?? '—'} · surfaces=${s.surfaces ?? '—'}`;
  }
  if (id === 'monorepo-health') {
    return ` · score=${data.score ?? '—'} · grade=${data.grade ?? '—'}`;
  }
  if (id === 'ops-summary') {
    const p = data.tree?.partners ?? data.partners ?? '—';
    return ` · partners=${p} · source=${data.source ?? '—'}`;
  }
  if (id === 'tennis-agent-auth') {
    return ` · status=${data.status ?? data.configured ?? '—'}`;
  }
  if (id === 'env-inventory') {
    const n = data.keys?.length ?? data.summary?.keyCount ?? data.count ?? '—';
    return ` · keys=${n}`;
  }
  if (id === 'bun-cli-reference' && data.summary) {
    return ` · flags=${data.summary.flags ?? '—'} · groups=${data.summary.groups ?? '—'} · bun ${data.bunVersion ?? '?'}`;
  }
  return '';
}

/** @type {{ b: object, ok: boolean, status: string, statusLabel: string, at: string|null, extra: string, sort: number }[]} */
let bakeRowsCache = [];
let bakeFilterGroup = 'all';

function filteredBakeRows() {
  return bakeRowsCache.filter(r => bakeFilterGroup === 'all' || r.b.group === bakeFilterGroup);
}

function renderBakeRows() {
  const tbody = document.getElementById('bake-status-body');
  if (!tbody) return;
  const rows = filteredBakeRows();
  tbody.innerHTML = renderPortalTableRows(
    BAKE_STATUS_COLS,
    rows.map(r => {
      const g = r.b.group || 'other';
      const gLabel = GROUP_LABEL[g] || g;
      const pill = `<span class="bake-status-pill ${escapeHtml(r.status)}">${escapeHtml(r.statusLabel)}</span>`;
      const art = r.ok
        ? `<a href="${escapeHtml(r.b.href)}">${escapeHtml(r.b.label)}</a>`
        : escapeHtml(r.b.label);
      const cli = escapeHtml(r.b.cli || '');
      return [
        { html: pill },
        { html: `<span class="bake-group-tag">${escapeHtml(gLabel)}</span>` },
        { html: art },
        { html: `<a href="${escapeHtml(r.b.board)}">board</a>` },
        {
          html:
            `<button type="button" class="copy-cli" data-cli="${cli}" title="Copy rebake CLI">copy</button>` +
            `<code class="bake-cli" title="${cli}">${cli}</code>`,
        },
      ];
    }),
    {
      emptyMessage: 'No bakes in this group',
      rowClass: i => {
        const r = rows[i];
        if (r.status === 'missing') return 'missing';
        if (r.status === 'stale' || r.status === 'old') return 'stale';
        return undefined;
      },
      rowAttrs: i => {
        const r = rows[i];
        return {
          'data-group': r.b.group || 'other',
          'data-status': r.status,
        };
      },
    }
  );
  renderBakeAgeRows();
  bindCopyButtons();
}

/** Age + payload summary — separate panel, theme tone colors. */
function renderBakeAgeRows() {
  const tbody = document.getElementById('bake-age-body');
  if (!tbody) return;
  const rows = filteredBakeRows();
  tbody.innerHTML = renderPortalTableRows(
    BAKE_AGE_COLS,
    rows.map(r => {
      const pill = `<span class="bake-status-pill ${escapeHtml(r.status)}">${escapeHtml(r.statusLabel)}</span>`;
      const art = r.ok
        ? `<a href="${escapeHtml(r.b.href)}">${escapeHtml(r.b.label)}</a>`
        : escapeHtml(r.b.label);
      const age = r.ok
        ? escapeHtml(ageLabel(r.at))
        : `missing (${escapeHtml(String(r.httpStatus ?? 'err'))})`;
      const summary = r.ok
        ? escapeHtml((r.extra || '').replace(/^\s*·\s*/, '') || '—')
        : '<span class="dim">—</span>';
      return [
        { html: pill },
        { html: art },
        { html: age, className: 'bake-age-cell' },
        { html: summary, className: 'bake-summary-cell' },
      ];
    }),
    {
      emptyMessage: 'No bakes in this group',
      rowAttrs: i => {
        const r = rows[i];
        return {
          'data-status': r.status,
          'data-group': r.b.group || 'other',
        };
      },
    }
  );
}

function renderBakeMeta() {
  const meta = document.getElementById('bake-status-meta');
  if (!meta) return;
  const tenant = activeTenant();
  const total = bakeRowsCache.length;
  const ok = bakeRowsCache.filter(r => r.status === 'ok').length;
  const stale = bakeRowsCache.filter(r => r.status === 'stale' || r.status === 'old').length;
  const missing = bakeRowsCache.filter(r => r.status === 'missing').length;
  const groups = [...new Set(bakeRowsCache.map(r => r.b.group || 'other'))];
  meta.innerHTML =
    `<strong>${total} artifacts</strong> · ` +
    `<strong>${ok} fresh</strong> · ` +
    `<strong>${stale} stale/old</strong> · ` +
    `<strong>${missing} missing</strong> · ` +
    `tenant=<code>${escapeHtml(tenant)}</code> · ` +
    `groups: ${groups.map(g => GROUP_LABEL[g] || g).join(' · ')} · ` +
    `thresholds: fresh &lt;24h · stale &lt;7d · old ≥7d · ` +
    `<a href="/registry/portal-weave.json">weave</a>`;
}

function renderBakeFilters() {
  const el = document.getElementById('bake-filters');
  if (!el) return;
  const counts = { all: bakeRowsCache.length };
  for (const r of bakeRowsCache) {
    const g = r.b.group || 'other';
    counts[g] = (counts[g] || 0) + 1;
  }
  const order = ['all', 'registry', 'ops', 'harness', 'secrets', 'other'];
  el.innerHTML = order
    .filter(g => g === 'all' || counts[g])
    .map(g => {
      const label = g === 'all' ? 'All' : GROUP_LABEL[g] || g;
      const active = bakeFilterGroup === g ? ' active' : '';
      return `<button type="button" class="bake-filter-btn${active}" data-group="${escapeHtml(g)}">${escapeHtml(label)} (${counts[g] || 0})</button>`;
    })
    .join('');
  el.querySelectorAll('.bake-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      bakeFilterGroup = btn.getAttribute('data-group') || 'all';
      renderBakeFilters();
      renderBakeRows();
    });
  });
}

async function fillBakeStatus() {
  const tbody = document.getElementById('bake-status-body');
  if (!tbody) return;

  const results = await Promise.all(
    BAKES.map(async b => {
      const r = await fetchJsonResult(b.href);
      if (!r.ok) {
        return {
          b,
          ok: false,
          status: 'missing',
          statusLabel: 'missing',
          at: null,
          extra: '',
          httpStatus: r.status,
          sort: 0,
        };
      }
      const at = pickGeneratedAt(r.data);
      const st = ageStatus(at);
      const sort = st.key === 'missing' ? 0 : st.key === 'old' ? 1 : st.key === 'stale' ? 2 : 3;
      return {
        b,
        ok: true,
        status: st.key,
        statusLabel: st.label,
        at,
        extra: summarizeBake(b.id, r.data),
        httpStatus: 200,
        sort,
      };
    })
  );

  // Attention first: missing → old → stale → fresh; then by group label
  bakeRowsCache = results.sort((a, b) => {
    if (a.sort !== b.sort) return a.sort - b.sort;
    const ga = a.b.group || 'other';
    const gb = b.b.group || 'other';
    if (ga !== gb) return ga.localeCompare(gb);
    return String(a.b.label).localeCompare(String(b.b.label));
  });

  renderBakeMeta();
  renderBakeFilters();
  renderBakeRows();
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
      : (r.data?.summary?.accounts ?? '—');
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
  [
    'Vault config (TOML)',
    'config',
    'Bun',
    'Bun ≥1.4',
    'import with { type: "toml" }',
    'Available',
    'config/vault-map.toml',
    'https://bun.sh/docs/runtime/loaders#toml',
  ],
  [
    'Secret inject',
    'secrets',
    'pass-cli',
    'pass-cli ≥2.2',
    'pass-cli inject -i/-o',
    'Implemented',
    'portal-cli secret inject',
    '',
  ],
  [
    'Vault & item list',
    'secrets',
    'pass-cli',
    'pass-cli ≥2.2',
    'pass-cli vault list · item list',
    'Implemented',
    'portal-cli secret vaults',
    '',
  ],
  [
    'Secret view',
    'secrets',
    'pass-cli',
    'pass-cli ≥2.2',
    'pass-cli item view',
    'Implemented',
    'portal-cli secret get',
    '',
  ],
  [
    'Snapshot testing',
    'test',
    'Bun',
    'Bun ≥1.0',
    'expect().toMatchSnapshot()',
    'Implemented',
    'portal-cli vault health',
    'https://bun.com/docs/test/snapshots',
  ],
  [
    'Update snapshots',
    'test',
    'Bun',
    'Bun ≥1.0',
    'bun test --update-snapshots',
    'Implemented',
    'portal-cli vault health --update',
    '',
  ],
  [
    'Pack workspace',
    'pkg',
    'Bun',
    'Bun ≥1.0',
    'bun pm pack',
    'Implemented',
    'portal-cli pm pack',
    '',
  ],
  ['List deps', 'pkg', 'Bun', 'Bun ≥1.0', 'bun pm ls', 'Implemented', 'portal-cli pm ls', ''],
  [
    'Packages graph',
    'pkg',
    'Bun',
    'Bun ≥1.0',
    'packages-graph-map bake · portal-cli pm graph',
    'Implemented',
    'portal-cli pm graph',
    '',
  ],
  [
    'Security scanner',
    'security',
    'Bun',
    'Bun ≥1.4',
    'bun pm scan · [install.security]',
    'Implemented',
    'portal-cli scanner doctor',
    'https://bun.com/docs/pm/security-scanner-api',
  ],
  [
    'Linker policy verification',
    'config',
    'Bun',
    'Bun ≥1.4',
    'bun.lock configVersion field',
    'Implemented',
    'portal-cli doctor · install:verify',
    'https://bun.com/docs/pm/cli/install#default-strategy',
  ],
  [
    'Unified Doctor',
    'dev',
    'Bun',
    'Bun ≥1.4',
    'bun run portal:doctor',
    'Implemented',
    'CI, developer checks',
    '',
  ],
  [
    'Bunfig (machine)',
    'config',
    'Bun',
    'Bun ≥1.4',
    '~/.bunfig.toml',
    'Implemented',
    'Machine-level policy',
    'https://bun.com/docs/runtime/bunfig',
  ],
  [
    'Bunfig (project)',
    'config',
    'Bun',
    'Bun ≥1.4',
    './bunfig.toml',
    'Implemented',
    'Project-level overrides',
    'https://bun.com/docs/runtime/bunfig',
  ],
  [
    'Bunfig merge',
    'config',
    'Bun',
    'Bun ≥1.4',
    'Shallow merge: machine → project',
    'Implemented',
    'Effective config resolution',
    '',
  ],
  [
    'Doctor groups',
    'dev',
    'Bun',
    'Bun ≥1.4',
    'linker, bakes, catalog, bunfig, runtime, infra, gates',
    'Implemented',
    'Group-based checks',
    '',
  ],
  [
    'Dashboard launcher',
    'cli',
    'Bun',
    'Bun ≥1.0',
    'portal-cli dashboard --view',
    'Implemented',
    '/',
    '',
  ],
  [
    'ANSI color',
    'display',
    'Bun',
    'Bun ≥1.0',
    'Bun.color(hex, "ansi-16m")',
    'Implemented',
    'vault-map status lines',
    '',
  ],
  [
    'File I/O',
    'io',
    'Bun',
    'Bun ≥1.0',
    'Bun.file · Bun.write',
    'Implemented',
    'bakes · snapshots',
    '',
  ],
];

/** @type {string[][]} */
let capabilityRows = CAPABILITY_FALLBACK.map(padCapabilityRow);
/** @type {{ generatedAt?: string, source?: string, schemaVersion?: number, summary?: object }|null} */
let capabilityMeta = null;

/**
 * Normalize registry JSON rows to
 * [capability, type, protocol, version, api, status, usedIn, sourceUrl].
 * @param {object|null} data
 * @returns {string[][]}
 */
function padCapabilityRow(r) {
  const a = (Array.isArray(r) ? r : []).map(String);
  while (a.length < 10) a.push('');
  return a.slice(0, 10);
}

export function normalizeCapabilityRows(data) {
  if (!data || !Array.isArray(data.rows) || data.rows.length === 0) {
    return CAPABILITY_FALLBACK.map(padCapabilityRow);
  }
  return data.rows.map(r => {
    if (Array.isArray(r)) {
      // Legacy 4-tuple → pad type/protocol/version/source
      if (r.length === 4) {
        return [String(r[0]), '—', '—', '—', String(r[1]), String(r[2]), String(r[3]), '', '', ''];
      }
      const arr = r.map(String);
      while (arr.length < 10) arr.push('');
      return arr.slice(0, 10);
    }
    const bunApi = String(r.bunApi ?? '');
    const protonCli = String(r.protonCli ?? '');
    let protocol = String(r.protocol ?? '');
    if (!protocol || protocol === 'undefined') {
      const hasBun = bunApi && bunApi !== '—';
      const hasProton = protonCli && protonCli !== '—';
      protocol =
        hasBun && hasProton ? 'Bun + pass-cli' : hasBun ? 'Bun' : hasProton ? 'pass-cli' : '—';
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
      typeof r.minBun === 'string' ? r.minBun : '',
      typeof r.minPassCli === 'string' ? r.minPassCli : '',
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
    .map(([cap, type, protocol, version, api, status, used, sourceUrl, minBun, minPassCli]) => {
      const capCell = sourceUrl
        ? `${escapeHtml(cap)} <a class="cap-source" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer" title="docs">↗</a>`
        : escapeHtml(cap);
      const floors = [minBun ? `bun≥${minBun}` : '', minPassCli ? `pass≥${minPassCli}` : '']
        .filter(Boolean)
        .join(' · ');
      const verCell = floors
        ? `${escapeHtml(version)}<div class="dim" style="font-size:10px">${escapeHtml(floors)}</div>`
        : escapeHtml(version);
      return `<tr>
          <td>${capCell}</td>
          <td><span class="group-tag">${escapeHtml(type)}</span></td>
          <td><code>${escapeHtml(protocol)}</code></td>
          <td class="dim">${verCell}</td>
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
    meta.textContent = `${capabilityRows.length} rows · schema v${capabilityMeta.schemaVersion ?? '?'} · generated ${capabilityMeta.generatedAt || '—'} · source ${capabilityMeta.source || 'AGENTS.md'}${proto ? ` · ${proto}` : ''} · columns: type · protocol · version · api · optional source link · rebake: bun run bake:capabilities · gate: portal-cli capabilities health · doctor: portal-cli capabilities doctor · check:snapshots · full: /registry/capability-map-full.json`;
  }
}

/** @type {object|null} */
let bunCliRef = null;

function renderBunCliReference(filter = '') {
  const root = document.getElementById('bun-cli-accordion');
  const meta = document.getElementById('bun-cli-meta');
  if (!root) return;
  if (!bunCliRef?.groups?.length) {
    root.innerHTML = `<p class="dim">Missing <a href="/registry/bun-cli-reference.json">bun-cli-reference.json</a> · run <code>bun tools/bake-bun-cli-reference.ts</code></p>`;
    if (meta) meta.textContent = 'not baked';
    return;
  }
  const q = filter.trim().toLowerCase();
  let total = 0;
  const openFirst = !q;
  root.innerHTML = bunCliRef.groups
    .map((group, idx) => {
      const flags = (group.flags || []).filter(f => {
        if (!q) return true;
        const hay =
          `${f.flag} ${f.short || ''} ${f.description || ''} ${f.type || ''}`.toLowerCase();
        return hay.includes(q);
      });
      if (!flags.length) return '';
      total += flags.length;
      const open = openFirst ? idx === 0 : true;
      const chev = open ? '▾' : '▸';
      const rows = flags
        .map(f => {
          const flagLabel = f.short ? `${f.short}, ${f.flag}` : f.flag;
          const type = f.type || 'boolean';
          let def = f.default;
          if ((def == null || def === '') && type === 'boolean') def = 'false';
          const defText = def == null || def === '' ? '—' : String(def);
          const docs = f.url
            ? ` <a class="cap-source" href="${escapeHtml(f.url)}" target="_blank" rel="noopener noreferrer" title="docs">↗</a>`
            : '';
          // curated is a catalog badge, not part of the description
          const curatedTitle = f.curated ? ' title="Curated in config/runtime-flags.json"' : '';
          const curatedDot = f.curated
            ? ' <span class="type-badge" title="Curated in config/runtime-flags.json">★</span>'
            : '';
          return `<tr${curatedTitle}>
            <td><span class="flag-badge">${escapeHtml(flagLabel)}</span>${docs}${curatedDot}</td>
            <td><span class="type-badge">${escapeHtml(type)}</span></td>
            <td><span class="default-val">${escapeHtml(defText)}</span></td>
            <td>${escapeHtml(f.description || '')}</td>
          </tr>`;
        })
        .join('');
      return `<div class="cli-group" data-group="${escapeHtml(group.id)}">
        <div class="cli-group-header" role="button" tabindex="0" aria-expanded="${open}">
          <span><span class="chev">${chev}</span> ${escapeHtml(group.label)}</span>
          <span class="dim">${flags.length} flags</span>
        </div>
        <div class="cli-group-body${open ? ' open' : ''}">
          <table class="portal-table cli-table">
            <thead><tr><th>Flag</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
    })
    .join('');

  if (meta) {
    const s = bunCliRef.summary || {};
    meta.textContent = `${total} shown · ${s.flags ?? '—'} total · ${s.groups ?? '—'} groups · bun ${bunCliRef.bunVersion || '?'} · baked ${String(bunCliRef.generated || '').slice(0, 19)}`;
  }

  root.querySelectorAll('.cli-group-header').forEach(header => {
    const toggle = () => {
      const body = header.nextElementSibling;
      if (!body) return;
      const open = body.classList.toggle('open');
      header.setAttribute('aria-expanded', open ? 'true' : 'false');
      const chev = header.querySelector('.chev');
      if (chev) chev.textContent = open ? '▾' : '▸';
    };
    header.addEventListener('click', toggle);
    header.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });
}

async function fillBunCliReference() {
  const r = await fetchJsonResult('/registry/bun-cli-reference.json');
  bunCliRef = r.ok ? r.data : null;
  renderBunCliReference('');
  document.getElementById('bun-cli-filter')?.addEventListener('input', e => {
    renderBunCliReference(e.target?.value || '');
  });
}

/**
 * Board → artifact glossary from weave surfaces (optional artifact/category/description).
 */
async function fillSurfaceMap() {
  const tbody = document.getElementById('surface-map-body');
  const meta = document.getElementById('surface-map-meta');
  if (!tbody) return;
  const r = await fetchJsonResult('/registry/portal-weave.json');
  if (!r.ok || !Array.isArray(r.data?.surfaces)) {
    tbody.innerHTML = `<tr><td colspan="5" class="dim">portal-weave.json missing or stale</td></tr>`;
    return;
  }
  const related = r.data.related || {};
  const rows = r.data.surfaces
    .filter(s => s.href && (s.artifact || s.cli || s.description || s.note))
    .map(s => {
      let art = s.artifact || '';
      if (art && !art.startsWith('/') && related[art]) art = related[art];
      const cat = s.category || s.group || '—';
      const desc = s.description || s.note || '—';
      const cli = s.cli || '';
      const title = s.title || s.label || s.id || '—';
      const board = `<a href="${escapeHtml(s.href)}">${escapeHtml(title)}</a>`;
      const artCell = art
        ? `<a href="${escapeHtml(art)}"><code>${escapeHtml(art)}</code></a>`
        : '<span class="dim">—</span>';
      const cliCell = cli
        ? `<button type="button" class="copy-cli" data-cli="${escapeHtml(cli)}">copy</button> <code class="bake-cli" title="${escapeHtml(cli)}">${escapeHtml(cli)}</code>`
        : '<span class="dim">—</span>';
      return `<tr data-category="${escapeHtml(cat)}">
        <td>${board}</td>
        <td><span class="bake-group-tag">${escapeHtml(cat)}</span></td>
        <td>${artCell}</td>
        <td>${cliCell}</td>
        <td class="dim">${escapeHtml(desc)}</td>
      </tr>`;
    });
  tbody.innerHTML = rows.length
    ? rows.join('')
    : `<tr><td colspan="5" class="dim">No surfaces with artifact/cli yet — rebake portal-weave</td></tr>`;
  if (meta) {
    const withArt = r.data.surfaces.filter(s => s.artifact).length;
    meta.innerHTML =
      `From weave · <strong>${r.data.surfaces.length} surfaces</strong> · ` +
      `<strong>${withArt} with artifact</strong> · schema v${r.data.schemaVersion ?? 2} · ` +
      `baked ${escapeHtml(String(r.data.generated || '').slice(0, 19))} · ` +
      `<a href="/registry/portal-weave.json">portal-weave.json</a>`;
  }
  bindCopyButtons();
}

export async function initToolsHub() {
  await fillBakeStatus();
  await fillSurfaceMap();
  await fillSnapshotWidget();
  await fillBunCliReference();
  await loadCapabilityRows();
  fillCapabilityTable();
  document.getElementById('capability-filter')?.addEventListener('input', fillCapabilityTable);
  bindCopyButtons();
  // Re-bind after dynamic rows
  const observer = new MutationObserver(() => bindCopyButtons());
  const bake = document.getElementById('bake-status-body');
  if (bake) observer.observe(bake, { childList: true });
  const bakeAge = document.getElementById('bake-age-body');
  if (bakeAge) observer.observe(bakeAge, { childList: true });
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

// force-upload 1785619291
/* force 1785619491 */
// force 1785619628
// force 1785620343
