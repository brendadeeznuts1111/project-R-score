/**
 * Command centre widget builders — pure functions for home dashboard + tests.
 * Consumes the same baked registry JSON as nav-badges and tools-hub.
 *
 * @see public/index.html · public/portal/command-centre.js
 * @see public/portal/nav-badges.js
 */

import {
  pickFailuresBadge,
  pickHealthBadge,
  pickPackagesBadge,
  pickVaultBadge,
  toneHealthBadge,
  toneVaultBadge,
} from './nav-badges.js';

/**
 * Shared bake sources — tools hub and command centre freshness strip.
 * Optional `group`: registry | ops | harness | secrets (tools board clusters).
 */
export const BAKE_SOURCES = [
  {
    id: 'packages',
    label: 'packages-graph-map',
    href: '/registry/packages-graph-map.json',
    board: '/portal/packages/',
    cli: 'bun run portal-cli pm graph',
    group: 'registry',
  },
  {
    id: 'failures',
    label: 'failures',
    href: '/registry/failures.json',
    board: '/portal/failures/',
    cli: 'bun run failures:bake',
    group: 'harness',
  },
  {
    id: 'vault-health',
    label: 'vault-health',
    href: '/registry/vault-health.json',
    board: '/portal/vault/',
    cli: 'bun run vault:health:bake',
    group: 'secrets',
  },
  {
    id: 'monorepo-health',
    label: 'monorepo-health',
    href: '/registry/monorepo-health.json',
    board: '/portal/health/',
    cli: 'bun run monorepo:health:bake',
    group: 'harness',
  },
  {
    id: 'ops-summary',
    label: 'ops-summary',
    href: '/registry/ops-summary.json',
    board: '/portal/ops/',
    cli: 'bun run ops:snapshot --no-routing',
    group: 'ops',
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
];

const ATTENTION_GRADES = new Set(['critical', 'needs-improvement']);

/** @param {string|null|undefined} iso */
export function ageLabel(iso) {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const mins = Math.round((Date.now() - t) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago · ${iso.slice(0, 10)}`;
}

/** @param {object|null|undefined} data */
export function pickGeneratedAt(data) {
  return data?.generatedAt || data?.generated || data?.capturedAt || data?.timestamp || null;
}

/**
 * Doctor board widget from public/registry/doctor-state.json.
 * @param {object|null|undefined} doctorState
 */
export function buildDoctorWidget(doctorState) {
  const toneRaw = doctorState?.tone;
  const tone =
    toneRaw === 'green' || toneRaw === 'yellow' || toneRaw === 'red'
      ? toneRaw
      : doctorState?.ok
        ? 'green'
        : doctorState
          ? 'yellow'
          : 'yellow';
  const summary = doctorState?.summary ?? {};
  const byGroup = doctorState?.byGroup && typeof doctorState.byGroup === 'object'
    ? doctorState.byGroup
    : {};
  const failedGroups = Object.entries(byGroup)
    .filter(([, v]) => (v?.failed ?? 0) > 0)
    .map(([g, v]) => ({
      group: g,
      failed: v?.failed ?? 0,
      total: v?.total ?? 0,
      fatalFailed: v?.fatalFailed ?? 0,
    }));
  return {
    ok: doctorState?.ok === true,
    tone,
    present: doctorState?.kind === 'portal-doctor-state',
    checkCount: summary.checkCount ?? 0,
    passed: summary.passed ?? 0,
    failed: summary.failed ?? 0,
    failedFatal: summary.failedFatal ?? 0,
    byGroup,
    failedGroups,
    generatedAt: pickGeneratedAt(doctorState),
    boardHref: doctorState?.board || '/portal/doctor/',
    href: doctorState?.href || '/registry/doctor-state.json',
    cli: doctorState?.cli || 'bun run portal:doctor',
    bakeCli: 'bun run bake:doctor',
  };
}

/**
 * @param {object|null|undefined} monorepo
 * @param {object|null|undefined} failures
 */
export function buildHealthWidget(monorepo, failures) {
  const score = pickHealthBadge(monorepo);
  const tone = toneHealthBadge(score);
  const grade = monorepo?.grade ?? '—';
  const failureCount = pickFailuresBadge(failures);
  const healthy = failures?.healthy !== false && (failureCount ?? 0) === 0;
  const generatedAt = pickGeneratedAt(monorepo) || pickGeneratedAt(failures);
  return {
    score,
    tone,
    grade,
    failureCount: failureCount ?? 0,
    healthy,
    generatedAt,
    boardHref: '/portal/health/',
    auditCli: 'bun run monorepo:health:bake',
    failuresCli: 'bun run failures:bake',
  };
}

/**
 * @param {object|null|undefined} packagesGraph
 * @param {number} [limit=3]
 */
export function pickAttentionPackages(packagesGraph, limit = 3) {
  const pkgs = Array.isArray(packagesGraph?.packages) ? packagesGraph.packages : [];
  return pkgs
    .filter(p => p && typeof p === 'object' && ATTENTION_GRADES.has(String(p.grade ?? '')))
    .sort((a, b) => (a.score ?? 100) - (b.score ?? 100))
    .slice(0, limit)
    .map(p => ({
      name: String(p.name ?? p.package ?? '—'),
      grade: String(p.grade ?? '—'),
      score: typeof p.score === 'number' ? p.score : null,
    }));
}

/**
 * @param {object|null|undefined} packagesGraph
 * @param {object|null|undefined} monitoring
 */
export function buildRegistryWidget(packagesGraph, monitoring) {
  const packageCount =
    pickPackagesBadge(packagesGraph) ?? monitoring?.packageCount ?? null;
  const graphGrade = packagesGraph?.grade ?? '—';
  const graphScore = packagesGraph?.score ?? null;
  const dodFlagged = monitoring?.dodByStatus?.flagged ?? monitoring?.dodQueue ?? 0;
  const attentionPackages = pickAttentionPackages(packagesGraph);
  const attention =
    attentionPackages.length +
    (graphScore != null && graphScore < 80 ? 1 : 0) +
    (typeof dodFlagged === 'number' && dodFlagged > 0 ? dodFlagged : 0);
  return {
    packageCount,
    graphGrade,
    graphScore,
    attention,
    attentionPackages,
    versionCount: monitoring?.versionCount ?? null,
    generatedAt: pickGeneratedAt(packagesGraph) || pickGeneratedAt(monitoring),
    boardHref: '/portal/packages/',
    cli: 'bun run portal-cli pm graph',
  };
}

/**
 * @param {object|null|undefined} vaultHealth
 */
export function buildVaultWidget(vaultHealth) {
  const activeItems = pickVaultBadge(vaultHealth);
  const tone = toneVaultBadge(activeItems);
  const summary = vaultHealth?.summary;
  const referencedOk =
    typeof summary?.referencedOk === 'number'
      ? summary.referencedOk
      : Array.isArray(vaultHealth?.referenced)
        ? vaultHealth.referenced.filter(r => r?.status === 'ok').length
        : null;
  return {
    activeItems,
    tone,
    healthy: vaultHealth?.healthy !== false,
    referencedOk,
    generatedAt: pickGeneratedAt(vaultHealth),
    boardHref: '/portal/vault/',
    cli: 'bun run vault:health:bake',
    gateCli: 'bun run portal-cli vault health',
  };
}

/**
 * @param {Array<{ id: string, label: string, board: string, cli: string, generatedAt?: string|null, ok?: boolean }>} rows
 */
export function buildBakeFreshnessWidget(rows) {
  return {
    rows: rows.map(r => ({
      id: r.id,
      label: r.label,
      board: r.board,
      cli: r.cli,
      generatedAt: r.generatedAt ?? null,
      ok: r.ok !== false,
    })),
    rebakeCli: 'bun run ops:snapshot --no-routing',
  };
}

/**
 * @param {Record<string, object|null|undefined>} payloads keyed by BAKE_SOURCES id
 */
export function buildBakeFreshnessFromPayloads(payloads) {
  return buildBakeFreshnessWidget(
    BAKE_SOURCES.map(src => ({
      id: src.id,
      label: src.label,
      board: src.board,
      cli: src.cli,
      generatedAt: pickGeneratedAt(payloads[src.id]),
      ok: payloads[src.id] != null,
    }))
  );
}

/**
 * Normalize snapshot rows from index manifests or catalog fallback.
 * @param {object[]|null|undefined} indexEntries
 * @param {object|null|undefined} catalogSnapshot
 * @param {number} [limit=5]
 */
export function buildSnapshotWidget(indexEntries, catalogSnapshot, limit = 5) {
  /** @type {{ scope: string, capturedAt: string, id: string }[]} */
  const rows = [];
  if (Array.isArray(indexEntries) && indexEntries.length > 0) {
    for (const m of [...indexEntries].reverse()) {
      if (!m?.id) continue;
      rows.push({
        scope: String(m.scope ?? m.reportType ?? '—'),
        capturedAt: String(m.capturedAt ?? ''),
        id: String(m.id),
      });
      if (rows.length >= limit) break;
    }
  }
  const source =
    rows.length > 0 ? 'local-index' : catalogSnapshot ? 'catalog-fallback' : 'none';
  if (rows.length === 0 && catalogSnapshot) {
    rows.push({
      scope: 'catalog',
      capturedAt: String(pickGeneratedAt(catalogSnapshot) ?? ''),
      id: 'catalog-snapshot',
    });
  }
  return {
    rows,
    source,
    listCli: 'bun run portal-cli snapshot list',
    runCli: 'bun run portal-cli snapshot run --scope portal',
    toolsHref: '/portal/tools/#snapshots',
  };
}

/**
 * @param {object|null|undefined} capabilityMap
 */
export function buildCapabilityWidget(capabilityMap) {
  const rows = Array.isArray(capabilityMap?.rows) ? capabilityMap.rows : [];
  let bun = 0;
  let proton = 0;
  let other = 0;
  for (const r of rows) {
    const t = String(r.type ?? '').toLowerCase();
    const cap = String(r.capability ?? '').toLowerCase();
    const api = String(r.api ?? '').toLowerCase();
    if (
      t === 'secrets' ||
      t === 'ssh' ||
      cap.includes('vault') ||
      cap.includes('pass-cli') ||
      api.includes('pass-cli')
    ) {
      proton += 1;
    } else if (
      api.includes('bun.') ||
      cap.includes('bun') ||
      t === 'runtime' ||
      t === 'io' ||
      t === 'test'
    ) {
      bun += 1;
    } else {
      other += 1;
    }
  }
  return {
    rowCount: capabilityMap?.rowCount ?? rows.length,
    bun,
    proton,
    other,
    generatedAt: pickGeneratedAt(capabilityMap),
    href: '/portal/tools/#capabilities',
    cli: 'bun run portal-cli capabilities health',
  };
}

/** Quick actions surfaced on the home command centre. */
export const QUICK_ACTIONS = [
  {
    id: 'snapshot-portal',
    label: 'Snapshot portal',
    cli: 'bun run portal-cli snapshot run --scope portal',
    group: 'ops',
  },
  {
    id: 'snapshot-prediction',
    label: 'Snapshot prediction',
    cli: 'bun run portal-cli snapshot run --scope prediction',
    group: 'ops',
  },
  {
    id: 'health-bake',
    label: 'Bake health',
    cli: 'bun run monorepo:health:bake',
    group: 'harness',
  },
  {
    id: 'failures-bake',
    label: 'Bake failures',
    cli: 'bun run failures:bake',
    group: 'harness',
  },
  {
    id: 'doctor-run',
    label: 'Portal doctor',
    cli: 'bun run portal:doctor --verbose',
    group: 'harness',
  },
  {
    id: 'ops-snapshot',
    label: 'Ops snapshot',
    cli: 'bun run ops:snapshot --no-routing',
    group: 'ops',
  },
  {
    id: 'packages-rebake',
    label: 'Packages graph',
    cli: 'bun run portal-cli pm graph --update',
    group: 'registry',
  },
  {
    id: 'vault-health',
    label: 'Vault health gate',
    cli: 'bun run portal-cli vault health',
    group: 'secrets',
  },
  {
    id: 'secret-map',
    label: 'Secret map',
    cli: 'bun run portal-cli secret map',
    group: 'secrets',
  },
];

/** Grouped key links — mirrors chrome-catalog data-group lanes. */
export const LINK_GROUPS = [
  {
    group: 'harness',
    label: 'Harness',
    links: [
      { href: '/portal/tools/', label: 'Portal CLI hub' },
      { href: '/portal/health/', label: 'Health' },
      { href: '/portal/doctor/', label: 'Doctor' },
      { href: '/portal/failures/', label: 'Failures' },
    ],
  },
  {
    group: 'registry',
    label: 'Registry',
    links: [
      { href: '/portal/', label: 'Registry portal' },
      { href: '/portal/packages/', label: 'Packages graph' },
      { href: '/portal/catalog/', label: 'Catalog' },
      { href: '/portal/skills/', label: 'Skills' },
    ],
  },
  {
    group: 'ops',
    label: 'Ops',
    links: [
      { href: '/portal/ops/', label: 'Operations' },
      { href: '/registry/prediction/report/', label: 'Prediction report' },
      { href: '/portal/dashboard/', label: 'Executive dashboard' },
      { href: '/monitoring/', label: 'Monitoring' },
      { href: '/portal/limits/', label: 'Limits' },
    ],
  },
  {
    group: 'secrets',
    label: 'Secrets',
    links: [
      { href: '/portal/vault/', label: 'Vault health' },
      { href: '/portal/env/', label: 'Env / vault map' },
    ],
  },
  {
    group: 'plane',
    label: 'Plane',
    links: [
      { href: '/portal/dod/', label: 'DOD review' },
      { href: '/portal/compliance/', label: 'Compliance' },
    ],
  },
  {
    group: 'other',
    label: 'Other',
    links: [
      { href: '/registry/ops-summary.json', label: 'Ops summary JSON' },
      { href: 'https://wiki.factory-wager.com/wiki-index.html', label: 'Wiki index' },
      { href: 'https://github.com/brendadeeznuts1111/project-R-score', label: 'Source' },
    ],
  },
];

/**
 * Aggregate dashboard payload from fetched artifacts.
 * @param {object} input
 */
export function aggregateCommandCentre(input) {
  const {
    monorepoHealth = null,
    failures = null,
    packagesGraph = null,
    monitoring = null,
    capabilityMap = null,
    catalogSnapshot = null,
    snapshotIndex = null,
    opsSummary = null,
    vaultHealth = null,
    bakePayloads = null,
    doctorState = null,
  } = input;
  const bakeFreshness =
    bakePayloads != null
      ? buildBakeFreshnessFromPayloads(bakePayloads)
      : buildBakeFreshnessWidget([]);
  const doctor =
    doctorState ??
    (bakePayloads != null ? bakePayloads['doctor-state'] ?? null : null);
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    health: buildHealthWidget(monorepoHealth, failures),
    doctor: buildDoctorWidget(doctor),
    registry: buildRegistryWidget(packagesGraph, monitoring),
    vault: buildVaultWidget(vaultHealth),
    bakeFreshness,
    snapshots: buildSnapshotWidget(snapshotIndex, catalogSnapshot),
    capabilities: buildCapabilityWidget(capabilityMap),
    opsGeneratedAt: pickGeneratedAt(opsSummary),
    quickActions: QUICK_ACTIONS,
    linkGroups: LINK_GROUPS,
  };
}
/* force-upload 1785619313 */
