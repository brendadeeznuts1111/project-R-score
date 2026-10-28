// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @updated bun:sqlite · fixed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @updated bun:sqlite · fixed v0.3.0 · 2022-12-07 · https://bun.com/blog/bun-v0.3.0
// @updated bun:sqlite · fixed v0.5.6 · 2023-02-09 · https://bun.com/blog/bun-v0.5.6
// @updated bun:sqlite · changed v0.6.8 · 2023-06-09 · https://bun.com/blog/bun-v0.6.8
// @updated bun:sqlite · fixed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @updated bun:sqlite · changed v0.7.1 · 2023-07-29 · https://bun.com/blog/bun-v0.7.1
// @updated bun:sqlite · fixed v0.7.3 · 2023-08-06 · https://bun.com/blog/bun-v0.7.3
// @updated bun:sqlite · fixed v1.0.3 · 2023-09-22 · https://bun.com/blog/bun-v1.0.3
// @updated bun:sqlite · fixed v1.0.7 · 2023-10-20 · https://bun.com/blog/bun-v1.0.7
// @updated bun:sqlite · fixed v1.0.10 · 2023-11-07 · https://bun.com/blog/bun-v1.0.10
// @updated bun:sqlite · fixed v1.0.12 · 2023-11-16 · https://bun.com/blog/bun-v1.0.12
// @updated bun:sqlite · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated bun:sqlite · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated bun:sqlite · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated bun:sqlite · changed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated bun:sqlite · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated bun:sqlite · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated bun:sqlite · fixed v1.0.29 · 2024-02-23 · https://bun.com/blog/bun-v1.0.29
// @updated bun:sqlite · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated bun:sqlite · fixed v1.1.4 · 2024-04-16 · https://bun.com/blog/bun-v1.1.4
// @updated bun:sqlite · fixed v1.1.5 · 2024-04-26 · https://bun.com/blog/bun-v1.1.5
// @updated bun:sqlite · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated bun:sqlite · changed v1.1.14 · 2024-06-19 · https://bun.com/blog/bun-v1.1.14
// @updated bun:sqlite · fixed v1.1.14 · 2024-06-19 · https://bun.com/blog/bun-v1.1.14
// @updated bun:sqlite · fixed v1.1.16 · 2024-06-23 · https://bun.com/blog/bun-v1.1.16
// @updated bun:sqlite · fixed v1.1.34 · 2024-11-02 · https://bun.com/blog/bun-v1.1.34
// @updated bun:sqlite · changed v1.1.38 · 2024-11-29 · https://bun.com/blog/bun-v1.1.38
// @updated bun:sqlite · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated bun:sqlite · changed v1.2.6 · 2025-03-25 · https://bun.com/blog/bun-v1.2.6
// @updated bun:sqlite · changed v1.2.17 · 2025-06-21 · https://bun.com/blog/bun-v1.2.17
// @updated bun:sqlite · changed v1.2.18 · 2025-07-03 · https://bun.com/blog/bun-v1.2.18
// @updated bun:sqlite · fixed v1.2.18 · 2025-07-03 · https://bun.com/blog/bun-v1.2.18
// @updated bun:sqlite · changed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated bun:sqlite · changed v1.2.21 · 2025-08-25 · https://bun.com/blog/bun-v1.2.21
// @updated bun:sqlite · fixed v1.3.2 · 2025-11-08 · https://bun.com/blog/bun-v1.3.2
// @updated bun:sqlite · changed v1.3.3 · 2025-11-21 · https://bun.com/blog/bun-v1.3.3
// @updated bun:sqlite · fixed v1.3.4 · 2025-12-06 · https://bun.com/blog/bun-v1.3.4
// @updated bun:sqlite · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated bun:sqlite · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified bun:sqlite · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/sqlite
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/sqlite
// @see https://bun.com/docs/runtime/bun-apis — Bun.mmap
/**
 * Package-group handshake snapshot for portal / ops-summary bake.
 *
 *   public/registry/telegram-handshake.json  — full rows
 *   ops-summary.telegramHandshake            — rollup slice
 */
import type { Database } from 'bun:sqlite';
import { assessHandshakeReadiness, type HandshakeReadinessRow } from './handshake-readiness.ts';
import {
  listPackageGroupRegistry,
  PENDING_PACKAGE_GROUPS_JSONL,
} from './package-group-registry.ts';
import { formatDmSeatStatus } from './dm-seat-designation.ts';
import { formatMembershipDeskCell } from './package-group-membership.ts';

export const TELEGRAM_HANDSHAKE_REGISTRY_REL = 'public/registry/telegram-handshake.json';
export const TELEGRAM_HANDSHAKE_REGISTRY_PATH = '/registry/telegram-handshake.json' as const;
export const TELEGRAM_HANDSHAKE_CATALOG_REGISTRY_REL =
  'public/registry/telegram-handshake-catalog.json';
export const TELEGRAM_HANDSHAKE_CATALOG_REGISTRY_PATH =
  '/registry/telegram-handshake-catalog.json' as const;

export type TelegramHandshakeVerifyFail = {
  id: string; // brand-ok — opaque handshake check label
  detail: string;
};

export type TelegramHandshakeLaneFail = {
  id: string; // brand-ok — lane label
  group: string;
  detail: string;
};

export type TelegramHandshakePartnerRow = {
  partnerCode: string;
  phase: HandshakeReadinessRow['phase'];
  membershipCell: string;
  handshakeOk: boolean;
  needsPartnerInForum: boolean;
  inviteLink: string | null;
  inviteSentAt: string | null;
  dmSeatStatus: string;
  callSign: string | null;
  gapCount: number;
  topGap: string | null;
  verifyPassed: number;
  verifyTotal: number;
  verifyFails: TelegramHandshakeVerifyFail[];
  lanesOk: number | null;
  lanesTotal: number | null;
  lanesBlocked: string[];
  laneFails: TelegramHandshakeLaneFail[];
  nextSteps: string[];
};

export type TelegramHandshakeSnapshot = {
  schema: 'factorywager.telegram-handshake.v1';
  generatedAt: string;
  source: 'snapshot';
  partners: number;
  inviteGaps: number;
  blocked: number;
  operatorReady: number;
  forumReady: number;
  designated: number;
  verifyFailPartners: number;
  laneFailPartners: number;
  catalogPath: typeof TELEGRAM_HANDSHAKE_CATALOG_REGISTRY_PATH;
  rows: TelegramHandshakePartnerRow[];
  commands: {
    inviteGap: string;
    sendInviteAll: string;
    desk: string;
    readiness: string;
  };
};

export type TelegramHandshakeSummarySlice = {
  available: boolean;
  path: typeof TELEGRAM_HANDSHAKE_REGISTRY_PATH;
  generatedAt: string | null;
  partners: number;
  inviteGaps: number;
  blocked: number;
  operatorReady: number;
  forumReady: number;
  designated: number;
  verifyFailPartners: number;
  laneFailPartners: number;
  rows: TelegramHandshakePartnerRow[];
  commands: TelegramHandshakeSnapshot['commands'];
  catalogPath: typeof TELEGRAM_HANDSHAKE_CATALOG_REGISTRY_PATH;
};

function tableExists(db: Database, name: string): boolean {
  const row = db
    .query(`SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = $n LIMIT 1`)
    .get({ $n: name }) as { ok: number } | null;
  return row != null;
}

function rowToWire(r: HandshakeReadinessRow): TelegramHandshakePartnerRow {
  const lanes = r.lanes;
  return {
    partnerCode: r.partnerCode,
    phase: r.phase,
    membershipCell: formatMembershipDeskCell(r.membershipTell, r.dmSeat.status),
    handshakeOk: r.handshakeOk,
    needsPartnerInForum: r.membershipTell.needsPartnerInForum,
    inviteLink: r.inviteLink,
    inviteSentAt: r.inviteSentAt,
    dmSeatStatus: formatDmSeatStatus(r.dmSeat.status),
    callSign: r.dmSeat.callSign,
    gapCount: r.gaps.length,
    topGap: r.gaps[0] ?? null,
    verifyPassed: r.verify.checks.filter(c => c.ok).length,
    verifyTotal: r.verify.checks.length,
    verifyFails: r.verify.checks
      .filter(c => !c.ok)
      .slice(0, 6)
      .map(c => ({ id: c.id, detail: c.detail })),
    lanesOk: lanes ? lanes.lanes.filter(l => l.ok).length : null,
    lanesTotal: lanes ? lanes.lanes.length : null,
    lanesBlocked: lanes?.blockedUntilLink ?? [],
    laneFails: lanes
      ? lanes.lanes
          .filter(l => !l.ok)
          .slice(0, 8)
          .map(l => ({ id: l.id, group: l.group, detail: l.detail }))
      : [],
    nextSteps: r.nextSteps.slice(0, 4),
  };
}

export function emptyTelegramHandshakeSummarySlice(): TelegramHandshakeSummarySlice {
  return {
    available: false,
    path: TELEGRAM_HANDSHAKE_REGISTRY_PATH,
    generatedAt: null,
    partners: 0,
    inviteGaps: 0,
    blocked: 0,
    operatorReady: 0,
    forumReady: 0,
    designated: 0,
    verifyFailPartners: 0,
    laneFailPartners: 0,
    rows: [],
    catalogPath: TELEGRAM_HANDSHAKE_CATALOG_REGISTRY_PATH,
    commands: {
      inviteGap: 'bun run telegram:handshake:invite-gap',
      sendInviteAll: 'bun run telegram:ops -- send-forum-invite --all',
      desk: 'bun run telegram:handshake:desk',
      readiness: 'bun run telegram:handshake:readiness --invite-gap',
    },
  };
}

export async function buildTelegramHandshakeSnapshot(
  db: Database,
  opts?: { jsonlPath?: string; telegramToken?: string | null }
): Promise<TelegramHandshakeSnapshot | null> {
  if (!tableExists(db, 'package_group_registry')) return null;

  const registry = listPackageGroupRegistry(db);
  if (registry.length === 0) return null;

  const jsonlPath = opts?.jsonlPath ?? PENDING_PACKAGE_GROUPS_JSONL;
  const readinessRows: HandshakeReadinessRow[] = [];
  for (const reg of registry) {
    readinessRows.push(
      await assessHandshakeReadiness({
        db,
        partnerCode: reg.partnerCode,
        jsonlPath,
        deep: true,
        telegramToken: opts?.telegramToken,
      })
    );
  }

  const rows = readinessRows
    .map(rowToWire)
    .sort((a, b) => a.partnerCode.localeCompare(b.partnerCode));
  const inviteGaps = rows.filter(r => r.needsPartnerInForum).length;
  const blocked = rows.filter(r => r.phase === 'blocked').length;
  const operatorReady = rows.filter(r => r.phase === 'operator_ready').length;
  const forumReady = rows.filter(r => r.phase === 'forum_ready').length;
  const designated = rows.filter(r => r.phase === 'designated').length;
  const verifyFailPartners = rows.filter(r => !r.handshakeOk).length;
  const laneFailPartners = rows.filter(
    r => r.lanesTotal != null && r.lanesOk != null && r.lanesOk < r.lanesTotal
  ).length;

  return {
    schema: 'factorywager.telegram-handshake.v1',
    generatedAt: new Date().toISOString(),
    source: 'snapshot',
    partners: rows.length,
    inviteGaps,
    blocked,
    operatorReady,
    forumReady,
    designated,
    verifyFailPartners,
    laneFailPartners,
    catalogPath: TELEGRAM_HANDSHAKE_CATALOG_REGISTRY_PATH,
    rows,
    commands: emptyTelegramHandshakeSummarySlice().commands,
  };
}

export function snapshotToSummarySlice(
  snap: TelegramHandshakeSnapshot | null
): TelegramHandshakeSummarySlice {
  if (!snap) return emptyTelegramHandshakeSummarySlice();
  return {
    available: true,
    path: TELEGRAM_HANDSHAKE_REGISTRY_PATH,
    generatedAt: snap.generatedAt,
    partners: snap.partners,
    inviteGaps: snap.inviteGaps,
    blocked: snap.blocked,
    operatorReady: snap.operatorReady,
    forumReady: snap.forumReady ?? 0,
    designated: snap.designated ?? 0,
    verifyFailPartners: snap.verifyFailPartners ?? 0,
    laneFailPartners: snap.laneFailPartners ?? 0,
    rows: snap.rows,
    commands: snap.commands,
    catalogPath: snap.catalogPath ?? TELEGRAM_HANDSHAKE_CATALOG_REGISTRY_PATH,
  };
}

export function loadTelegramHandshakeSummarySlice(
  absPath: string = TELEGRAM_HANDSHAKE_REGISTRY_REL
): TelegramHandshakeSummarySlice {
  try {
    const mapped = Bun.mmap(absPath);
    const snap = JSON.parse(new TextDecoder().decode(mapped)) as TelegramHandshakeSnapshot;
    if (snap.schema !== 'factorywager.telegram-handshake.v1') {
      return emptyTelegramHandshakeSummarySlice();
    }
    return snapshotToSummarySlice(snap);
  } catch {
    return emptyTelegramHandshakeSummarySlice();
  }
}

export async function exportTelegramHandshakeSnapshot(
  db: Database,
  root = process.cwd(),
  opts?: { jsonlPath?: string; telegramToken?: string | null }
): Promise<TelegramHandshakeSummarySlice> {
  const rel = TELEGRAM_HANDSHAKE_REGISTRY_REL;
  const abs = root.endsWith('/') ? `${root}${rel}` : `${root}/${rel}`;
  const snap = await buildTelegramHandshakeSnapshot(db, opts);
  const slice = snapshotToSummarySlice(snap);

  if (snap) {
    const dir = abs.slice(0, abs.lastIndexOf('/'));
    if (dir) await Bun.$`mkdir -p ${dir}`.quiet();
    await Bun.write(abs, `${JSON.stringify(snap, null, 2)}\n`);
  }

  return slice;
}

export async function exportTelegramHandshakeCatalog(root = process.cwd()): Promise<string> {
  const { buildHandshakeCatalog } = await import('./handshake-catalog.ts');
  const { applyOverridesToCatalog, loadCatalogOverrides } =
    await import('./catalog-research/merge.ts');
  const rel = TELEGRAM_HANDSHAKE_CATALOG_REGISTRY_REL;
  const abs = root.endsWith('/') ? `${root}${rel}` : `${root}/${rel}`;
  const dir = abs.slice(0, abs.lastIndexOf('/'));
  if (dir) await Bun.$`mkdir -p ${dir}`.quiet();
  const overrides = await loadCatalogOverrides(root);
  const catalog = applyOverridesToCatalog(buildHandshakeCatalog(), overrides);
  await Bun.write(abs, `${JSON.stringify(catalog, null, 2)}\n`);
  return abs;
}
