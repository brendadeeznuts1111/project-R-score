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
  probeLinkedSeatInForum,
  type PackageGroupMembershipTell,
} from './package-group-membership.ts';
import {
  getPackageGroupRegistry,
  PENDING_PACKAGE_GROUPS_JSONL,
  readPackageGroupEventLog,
  latestForumInviteSentAck,
} from './package-group-registry.ts';
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
  inviteLink: string | null;
  /** Latest ack_forum_invite_sent timestamp when gap active. */
  inviteSentAt: string | null;
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
  if ((row.dmSeat.status === 'linked' || row.dmSeat.status === 'shared') && !row.handshakeOk) {
    return 'blocked';
  }
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

  let linkedSeatInForum = false;
  if (
    opts.telegramToken &&
    reg &&
    dmSeat.telegramId &&
    (dmSeat.status === 'linked' || dmSeat.status === 'shared')
  ) {
    linkedSeatInForum = await probeLinkedSeatInForum(
      opts.telegramToken,
      reg.chatId,
      dmSeat.telegramId
    );
  }

  const membershipTell = interpretPackageGroupMemberCount(known?.memberCount ?? null, {
    dmSeatStatus: dmSeat.status,
    linkedSeatInForum,
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
  const jsonlPath = opts.jsonlPath ?? PENDING_PACKAGE_GROUPS_JSONL;
  const code = opts.partnerCode.toUpperCase().trim();
  const eventLog = membershipTell.needsPartnerInForum
    ? await readPackageGroupEventLog(jsonlPath)
    : [];
  const inviteSent = membershipTell.needsPartnerInForum
    ? latestForumInviteSentAck(eventLog, code)
    : null;

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
    if (inviteSent) {
      nextSteps.push(`invite DM sent at ${inviteSent.timestamp} — awaiting partner join`);
      if (reg?.inviteLink) nextSteps.push(`join forum: ${reg.inviteLink}`);
    } else {
      if (reg?.inviteLink) nextSteps.push(`send invite: ${reg.inviteLink}`);
      nextSteps.push(`bun run telegram:ops -- send-forum-invite ${code}`);
    }
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
    inviteLink: reg?.inviteLink ?? null,
    inviteSentAt: inviteSent?.timestamp ?? null,
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
          telegramToken: opts.telegramToken,
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
    row.membershipTell.needsPartnerInForum && row.inviteLink
      ? `  forum invite: ${row.inviteLink}${row.inviteSentAt ? ` · sent ${row.inviteSentAt}` : ' · not sent yet'}`
      : '',
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
  return out.filter(Boolean);
}

/** Partners where operator DM is linked but forum still bot+house only. */
export function filterForumInviteGapRows(
  rows: readonly HandshakeReadinessRow[]
): HandshakeReadinessRow[] {
  return rows.filter(r => r.membershipTell.needsPartnerInForum);
}

export function formatForumInviteGapReport(rows: readonly HandshakeReadinessRow[]): string[] {
  const gaps = filterForumInviteGapRows(rows);
  if (gaps.length === 0) {
    return ['(no forum invite gaps — all linked partners at 3·OK or designated/pre-link)'];
  }
  const lines = [
    'FORUM INVITE GAP · operator linked via DM · partner not in group yet',
    'CODE  MEM        SEAT         SENT                 INVITE',
    '----  ---------  -----------  -------------------  ------',
  ];
  for (const r of gaps) {
    const invite = r.inviteLink?.trim() || '(no invite in registry)';
    const mem = formatMembershipDeskCell(r.membershipTell, r.dmSeat.status);
    const seat = r.dmSeat.callSign ?? '—';
    const sent = r.inviteSentAt ? r.inviteSentAt.slice(0, 19) : '—';
    lines.push(
      `${r.partnerCode.padEnd(4)}  ${mem.padEnd(9)}  ${seat.padEnd(11)}  ${sent.padEnd(19)}  ${invite}`
    );
  }
  lines.push('', 'After partner joins, expect MEM 3·OK (bot + house + partner).');
  return lines;
}
