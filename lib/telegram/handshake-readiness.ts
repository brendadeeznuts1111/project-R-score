// @see https://bun.com/docs/runtime/sqlite
/**
 * End-to-end package-group handshake readiness — phased gates before operator Telegram id.
 */
import type { Database } from 'bun:sqlite';
import {
  assessPackageGroupDmSeat,
  formatDmSeatStatus,
  type DmSeatAssessment,
} from './dm-seat-designation.ts';
import {
  loadPackageGroupForumMetadata,
  PACKAGE_GROUP_FORUMS_META_DIR,
  resolvePackageGroupTopicsForChat,
  threadIdForPackageGroupOutboxTopic,
  topicsPlanComplete,
  validateForumMetadataAgainstRegistry,
} from './package-group-forum.ts';
import { getKnownChatById } from './known-chats.ts';
import {
  formatMembershipDeskCell,
  interpretPackageGroupMemberCount,
  type PackageGroupMembershipTell,
} from './package-group-membership.ts';
import { getPackageGroupRegistry, PENDING_PACKAGE_GROUPS_JSONL } from './package-group-registry.ts';
import {
  assessHandshakeLanes,
  formatHandshakeLaneReport,
  type HandshakeLaneReport,
} from './handshake-lanes.ts';
import {
  verifyPackageGroupHandshake,
  type HandshakeVerifyResult,
} from './verify-package-group-handshake.ts';

export type ReadinessPhase = 'blocked' | 'forum_ready' | 'designated' | 'operator_ready';

export type HandshakeReadinessRow = {
  partnerCode: string;
  phase: ReadinessPhase;
  registryOk: boolean;
  forumOk: boolean;
  forumTopicsOk: boolean;
  handshakeOk: boolean;
  dmSeat: DmSeatAssessment;
  membershipTell: PackageGroupMembershipTell;
  outboxRoutingOk: boolean;
  outboxRoutingDetail: string;
  verify: HandshakeVerifyResult;
  gaps: string[];
  nextSteps: string[];
  /** Present when deep assessment requested. */
  lanes?: HandshakeLaneReport;
};

function derivePhase(row: {
  registryOk: boolean;
  forumOk: boolean;
  dmSeat: DmSeatAssessment;
  handshakeOk: boolean;
}): ReadinessPhase {
  if (!row.registryOk || !row.forumOk) return 'blocked';
  if (row.dmSeat.status === 'none') return 'forum_ready';
  if (row.dmSeat.status === 'designated') return 'designated';
  if (row.dmSeat.welcomeDmReady && row.handshakeOk) return 'operator_ready';
  return 'forum_ready';
}

export async function assessHandshakeReadiness(opts: {
  db: Database;
  partnerCode: string;
  jsonlPath?: string;
  forumsMetaDir?: string;
  telegramToken?: string | null;
  live?: boolean;
  deep?: boolean;
}): Promise<HandshakeReadinessRow> {
  const forumsMetaDir = opts.forumsMetaDir ?? PACKAGE_GROUP_FORUMS_META_DIR;
  const verify = await verifyPackageGroupHandshake({
    db: opts.db,
    partnerCode: opts.partnerCode,
    jsonlPath: opts.jsonlPath ?? PENDING_PACKAGE_GROUPS_JSONL,
    forumsMetaDir,
    live: opts.live,
    telegramToken: opts.telegramToken,
  });

  const reg = getPackageGroupRegistry(opts.db, opts.partnerCode);
  const dmSeat = assessPackageGroupDmSeat(opts.db, opts.partnerCode);
  const known = reg ? getKnownChatById(opts.db, reg.chatId) : null;
  const membershipTell = interpretPackageGroupMemberCount(known?.memberCount ?? null, {
    dmSeatStatus: dmSeat.status,
  });
  const meta = reg
    ? await loadPackageGroupForumMetadata(reg.partnerCode, { rootDir: forumsMetaDir })
    : null;

  let forumOk = false;
  let forumTopicsOk = false;
  if (reg && meta) {
    const v = validateForumMetadataAgainstRegistry(meta, reg.partnerCode, reg.chatId);
    forumOk = v.ok;
    forumTopicsOk = topicsPlanComplete(meta.topics);
  }

  let outboxRoutingOk = false;
  let outboxRoutingDetail = 'no registry';
  if (reg) {
    const topics = await resolvePackageGroupTopicsForChat(opts.db, reg.chatId, forumsMetaDir);
    if (topics) {
      const alerts = threadIdForPackageGroupOutboxTopic(topics.topics, 'alerts');
      const plays = threadIdForPackageGroupOutboxTopic(topics.topics, 'plays');
      outboxRoutingOk = alerts != null && plays != null;
      outboxRoutingDetail = `alerts→${alerts ?? '?'} plays→${plays ?? '?'}`;
    } else {
      outboxRoutingDetail = 'forum metadata missing — run forum-metadata-sync';
    }
  }

  const gaps: string[] = [];
  const nextSteps: string[] = [];

  if (!reg) gaps.push('package_group_registry missing');
  if (!forumOk) gaps.push('forum metadata missing or chat_id mismatch');
  if (forumOk && !forumTopicsOk) gaps.push('forum topic thread ids incomplete');
  if (dmSeat.status === 'none') {
    gaps.push('DM seat not designated');
    nextSteps.push(dmSeat.nextStep);
  } else if (dmSeat.status === 'designated') {
    gaps.push(`operator ${dmSeat.callSign} designated — telegram id not linked yet`);
    nextSteps.push(dmSeat.nextStep);
  }
  if (membershipTell.status === 'understaffed') {
    gaps.push(`forum members: ${membershipTell.detail}`);
    nextSteps.push('bun run telegram:handshake:desk --refresh');
  } else if (membershipTell.needsPartnerInForum) {
    gaps.push('forum invite pending — partner linked via DM but not in group (expect 3·OK)');
    if (reg?.inviteLink) nextSteps.push(`send invite: ${reg.inviteLink}`);
  } else if (membershipTell.status === 'unknown') {
    nextSteps.push('bun run telegram:handshake:desk --refresh');
  }
  if (!outboxRoutingOk && reg)
    nextSteps.push('bun run forum-metadata-sync CODE --apply --ensure-topics (toc-ops)');
  for (const c of verify.checks.filter(c => !c.ok)) {
    gaps.push(`${c.id}: ${c.detail}`);
  }
  if (verify.nextAction && !verify.ok) nextSteps.push(verify.nextAction);

  const registryOk = reg != null;
  const handshakeOk = verify.ok;
  const phase = derivePhase({ registryOk, forumOk, dmSeat, handshakeOk });

  if (phase === 'operator_ready') {
    nextSteps.unshift('ready for welcome DM + bot commands');
  } else if (phase === 'designated') {
    nextSteps.unshift(`forum + routing OK — awaiting operator telegram for ${dmSeat.callSign}`);
  }

  return {
    partnerCode: opts.partnerCode.toUpperCase(),
    phase,
    registryOk,
    forumOk,
    forumTopicsOk,
    handshakeOk,
    dmSeat,
    membershipTell,
    outboxRoutingOk,
    outboxRoutingDetail,
    verify,
    gaps,
    nextSteps: [...new Set(nextSteps)],
    lanes: opts.deep
      ? await assessHandshakeLanes({
          db: opts.db,
          partnerCode: opts.partnerCode,
          jsonlPath: opts.jsonlPath ?? PENDING_PACKAGE_GROUPS_JSONL,
          forumsMetaDir,
        })
      : undefined,
  };
}

export function formatHandshakeReadinessTable(rows: readonly HandshakeReadinessRow[]): string[] {
  if (rows.length === 0) return ['(no partners)'];

  const lines = [
    'CODE  PHASE           MEM        REG  FORUM  TOPICS  DM_SEAT                      OUTBOX  HS',
    '----  --------------  ---------  ---  -----  ------  ---------------------------  ------  --',
  ];

  for (const r of rows) {
    const dm = r.dmSeat.callSign
      ? `${r.dmSeat.callSign} ${formatDmSeatStatus(r.dmSeat.status)}`
      : formatDmSeatStatus(r.dmSeat.status);
    const mem = formatMembershipDeskCell(r.membershipTell, r.dmSeat.status).padEnd(9);
    lines.push(
      `${r.partnerCode.padEnd(4)}  ${r.phase.padEnd(14)}  ${mem}  ${yn(r.registryOk)}   ${yn(r.forumOk)}    ${yn(r.forumTopicsOk)}     ${dm.slice(0, 27).padEnd(27)}  ${yn(r.outboxRoutingOk)}     ${yn(r.handshakeOk)}`
    );
  }
  return lines;
}

function yn(v: boolean): string {
  return v ? 'OK' : '—';
}

export function formatHandshakeReadinessDetail(row: HandshakeReadinessRow): string[] {
  const out = [
    `${row.partnerCode} · phase=${row.phase}`,
    `  registry: ${row.registryOk ? 'OK' : 'missing'}  forum: ${row.forumOk ? 'OK' : 'gap'}  topics: ${row.forumTopicsOk ? 'complete' : 'partial'}`,
    `  dm seat: ${row.dmSeat.callSign ?? '—'} · ${formatDmSeatStatus(row.dmSeat.status)}`,
    `  members: ${row.membershipTell.detail}${row.membershipTell.memberCount != null ? ` (${formatMembershipDeskCell(row.membershipTell, row.dmSeat.status)})` : ''}`,
    `  outbox routing: ${row.outboxRoutingDetail}`,
    `  handshake verify: ${row.handshakeOk ? 'OK' : 'FAIL'} (${row.verify.checks.filter(c => c.ok).length}/${row.verify.checks.length})`,
  ];
  if (row.gaps.length) {
    out.push('  gaps:');
    for (const g of row.gaps) out.push(`    · ${g}`);
  }
  if (row.nextSteps.length) {
    out.push('  next:');
    for (const s of row.nextSteps) out.push(`    → ${s}`);
  }
  if (row.lanes) {
    out.push('');
    for (const line of formatHandshakeLaneReport(row.lanes)) {
      out.push(line.startsWith('  ') ? line : `  ${line}`);
    }
  }
  return out;
}
