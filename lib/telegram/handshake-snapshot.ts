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
};

export type TelegramHandshakeSnapshot = {
  schema: 'factorywager.telegram-handshake.v1';
  generatedAt: string;
  source: 'snapshot';
  partners: number;
  inviteGaps: number;
  blocked: number;
  operatorReady: number;
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
  rows: TelegramHandshakePartnerRow[];
  commands: TelegramHandshakeSnapshot['commands'];
};

function tableExists(db: Database, name: string): boolean {
  const row = db
    .query(`SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = $n LIMIT 1`)
    .get({ $n: name }) as { ok: number } | null;
  return row != null;
}

function rowToWire(r: HandshakeReadinessRow): TelegramHandshakePartnerRow {
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
    rows: [],
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
  opts?: { jsonlPath?: string }
): Promise<TelegramHandshakeSnapshot | null> {
  if (!tableExists(db, 'package_group_registry')) return null;

  const registry = listPackageGroupRegistry(db);
  if (registry.length === 0) return null;

  const jsonlPath = opts?.jsonlPath ?? PENDING_PACKAGE_GROUPS_JSONL;
  const readinessRows: HandshakeReadinessRow[] = [];
  for (const reg of registry) {
    readinessRows.push(
      await assessHandshakeReadiness({ db, partnerCode: reg.partnerCode, jsonlPath })
    );
  }

  const rows = readinessRows
    .map(rowToWire)
    .sort((a, b) => a.partnerCode.localeCompare(b.partnerCode));
  const inviteGaps = rows.filter(r => r.needsPartnerInForum).length;
  const blocked = rows.filter(r => r.phase === 'blocked').length;
  const operatorReady = rows.filter(r => r.phase === 'operator_ready').length;

  return {
    schema: 'factorywager.telegram-handshake.v1',
    generatedAt: new Date().toISOString(),
    source: 'snapshot',
    partners: rows.length,
    inviteGaps,
    blocked,
    operatorReady,
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
    rows: snap.rows,
    commands: snap.commands,
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
  opts?: { jsonlPath?: string }
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
