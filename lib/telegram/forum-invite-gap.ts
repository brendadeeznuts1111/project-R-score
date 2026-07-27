// @see https://bun.com/docs/runtime/sqlite
/**
 * Forum invite gap — operator linked via DM but partner not in package forum yet (2·house!).
 *
 * Send path: DM operator with registry invite_link + append ack_forum_invite_sent JSONL.
 */
import type { Database } from 'bun:sqlite';
import {
  appendAckForumInviteSent,
  getPackageGroupRegistry,
  latestForumInviteSentAck,
  listPackageGroupRegistry,
  PENDING_PACKAGE_GROUPS_JSONL,
  readPackageGroupEventLog,
} from './package-group-registry.ts';
import { assessPackageGroupDmSeat } from './dm-seat-designation.ts';
import { getKnownChatById } from './known-chats.ts';
import {
  formatMembershipDeskCell,
  interpretPackageGroupMemberCount,
} from './package-group-membership.ts';
import type { HandshakeReadinessRow } from './handshake-readiness.ts';
import { sendTelegramBotMessage } from './telegram-api.ts';
import { setActiveCallSignForTelegram } from './flows/seat-telegram.ts';

export type ForumInviteGapRow = {
  partnerCode: string;
  callSign: string | null;
  telegramId: string | null; // brand-ok — operator DM wire
  inviteLink: string | null;
  membershipCell: string;
  inviteSentAt: string | null;
  canSend: boolean;
  blockReason: string | null;
};

export function forumInviteGapFromReadiness(row: HandshakeReadinessRow): ForumInviteGapRow | null {
  if (!row.membershipTell.needsPartnerInForum) return null;
  return {
    partnerCode: row.partnerCode,
    callSign: row.dmSeat.callSign,
    telegramId: row.dmSeat.telegramId,
    inviteLink: row.inviteLink,
    membershipCell: formatMembershipDeskCell(row.membershipTell, row.dmSeat.status),
    inviteSentAt: row.inviteSentAt,
    canSend: Boolean(row.inviteLink?.trim() && row.dmSeat.telegramId),
    blockReason: !row.inviteLink?.trim()
      ? 'no invite_link in registry'
      : !row.dmSeat.telegramId
        ? 'operator telegram not linked'
        : null,
  };
}

export async function buildForumInviteGapRow(
  db: Database,
  partnerCode: string,
  jsonlPath = PENDING_PACKAGE_GROUPS_JSONL
): Promise<ForumInviteGapRow | null> {
  const reg = getPackageGroupRegistry(db, partnerCode);
  if (!reg) return null;
  const dmSeat = assessPackageGroupDmSeat(db, partnerCode);
  const known = getKnownChatById(db, reg.chatId);
  const membershipTell = interpretPackageGroupMemberCount(known?.memberCount ?? null, {
    dmSeatStatus: dmSeat.status,
  });
  if (!membershipTell.needsPartnerInForum) return null;

  const log = await readPackageGroupEventLog(jsonlPath);
  const sent = latestForumInviteSentAck(log, partnerCode);

  const row: ForumInviteGapRow = {
    partnerCode: reg.partnerCode,
    callSign: dmSeat.callSign,
    telegramId: dmSeat.telegramId,
    inviteLink: reg.inviteLink,
    membershipCell: formatMembershipDeskCell(membershipTell, dmSeat.status),
    inviteSentAt: sent?.timestamp ?? null,
    canSend: Boolean(reg.inviteLink?.trim() && dmSeat.telegramId),
    blockReason: !reg.inviteLink?.trim()
      ? 'no invite_link in registry'
      : !dmSeat.telegramId
        ? 'operator telegram not linked'
        : null,
  };
  return row;
}

export function formatForumInviteDmText(opts: {
  partnerCode: string;
  registryTitle: string;
  inviteLink: string;
  callSign?: string | null;
}): string {
  const seat = opts.callSign?.trim();
  const lines = [
    `<b>Join your package forum</b>`,
    `Partner: <code>${opts.partnerCode}</code>`,
    `Group: <code>${opts.registryTitle}</code>`,
    seat ? `Seat: <code>${seat}</code>` : '',
    '',
    `You're linked for DMs — please join the package group so alerts and plays route correctly.`,
    `<a href="${opts.inviteLink}">Open forum invite</a>`,
    '',
    `After you join, expect member count <b>3·OK</b> (bot + house + you).`,
  ];
  return lines.filter(l => l !== '').join('\n');
}

export type SendForumInviteResult =
  | {
      ok: true;
      partnerCode: string;
      telegramId: string; // brand-ok
      messageId?: number;
      ackAppended: boolean;
      skipped?: false;
    }
  | {
      ok: true;
      partnerCode: string;
      skipped: true;
      reason: string;
    }
  | {
      ok: false;
      partnerCode: string;
      reason: string;
    };

export async function sendForumInviteDm(opts: {
  db: Database;
  token: string;
  partnerCode: string;
  jsonlPath?: string;
  dryRun?: boolean;
  force?: boolean;
}): Promise<SendForumInviteResult> {
  const code = opts.partnerCode.toUpperCase().trim();
  const jsonlPath = opts.jsonlPath ?? PENDING_PACKAGE_GROUPS_JSONL;
  const gap = await buildForumInviteGapRow(opts.db, code, jsonlPath);

  if (!gap) {
    return { ok: false, partnerCode: code, reason: 'no forum invite gap (not 2·house!)' };
  }
  if (gap.blockReason) {
    return { ok: false, partnerCode: code, reason: gap.blockReason };
  }

  const reg = getPackageGroupRegistry(opts.db, code)!;
  const inviteLink = reg.inviteLink!.trim();
  const telegramId = gap.telegramId!; // brand-ok
  const callSign = gap.callSign ?? reg.requestedBy ?? `${code}-001`;

  if (gap.inviteSentAt && !opts.force) {
    return {
      ok: true,
      partnerCode: code,
      skipped: true,
      reason: `invite already sent at ${gap.inviteSentAt} — pass force to resend`,
    };
  }

  const text = formatForumInviteDmText({
    partnerCode: code,
    registryTitle: reg.title,
    inviteLink,
    callSign,
  });

  if (opts.dryRun) {
    return {
      ok: true,
      partnerCode: code,
      telegramId,
      ackAppended: false,
    };
  }

  const switched = setActiveCallSignForTelegram(opts.db, telegramId, callSign);
  if (!switched.ok && gap.callSign) {
    // Non-fatal — DM still sends; bot context may need /seat
  }

  const sent = await sendTelegramBotMessage(opts.token, {
    chatId: telegramId,
    text,
    parseMode: 'HTML',
  });

  if (!sent.ok) {
    return {
      ok: false,
      partnerCode: code,
      reason: sent.description ?? 'sendMessage failed',
    };
  }

  const ack = await appendAckForumInviteSent({
    partnerCode: code,
    callSign,
    chatId: telegramId,
    inviteLink,
    path: jsonlPath,
    force: opts.force,
  });

  return {
    ok: true,
    partnerCode: code,
    telegramId,
    messageId: sent.messageId,
    ackAppended: ack.appended,
  };
}

export async function sendForumInviteDmsForGaps(opts: {
  db: Database;
  token: string;
  partnerCodes?: string[];
  jsonlPath?: string;
  dryRun?: boolean;
  force?: boolean;
}): Promise<SendForumInviteResult[]> {
  const jsonlPath = opts.jsonlPath ?? PENDING_PACKAGE_GROUPS_JSONL;
  const codes =
    opts.partnerCodes?.map(c => c.toUpperCase()) ??
    listPackageGroupRegistry(opts.db).map(r => r.partnerCode);

  const results: SendForumInviteResult[] = [];
  for (const code of codes) {
    const gap = await buildForumInviteGapRow(opts.db, code, jsonlPath);
    if (!gap) continue;
    results.push(
      await sendForumInviteDm({
        db: opts.db,
        token: opts.token,
        partnerCode: code,
        jsonlPath,
        dryRun: opts.dryRun,
        force: opts.force,
      })
    );
  }
  return results;
}
