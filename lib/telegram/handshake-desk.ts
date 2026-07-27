// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Unified package-group desk view — registry + known chats + handshake verify.
 */
import type { Database } from 'bun:sqlite';
import {
  getPackageGroupRegistry,
  listPackageGroupRegistry,
  parsePartnerCode,
  type PackageGroupRegistryRow,
} from './package-group-registry.ts';
import { getKnownChatById, upsertKnownChat, type KnownChatRow } from './known-chats.ts';
import { refreshKnownChats } from './refresh-known-chats.ts';
import { getChat } from './telegram-api.ts';
import {
  assessPackageGroupDmSeat,
  formatDmSeatStatus,
  type DmSeatStatus,
} from './dm-seat-designation.ts';
import {
  interpretPackageGroupMemberCount,
  type PackageGroupMembershipTell,
} from './package-group-membership.ts';
import { verifyPackageGroupHandshake } from './verify-package-group-handshake.ts';
import {
  assessForumMetadata,
  formatPackageGroupTopicsEnv,
  loadPackageGroupForumMetadata,
  PACKAGE_GROUP_FORUMS_META_DIR,
} from './package-group-forum.ts';

export type HandshakeDeskRow = {
  partnerCode: string;
  handshakeOk: boolean;
  checksPassed: number;
  checksTotal: number;
  chatId: string; // brand-ok
  registryTitle: string;
  telegramTitle: string | null;
  liveTitle: string | null;
  titleMatch: boolean | null;
  chatType: string | null;
  isForum: boolean | null;
  memberCount: number | null;
  membershipTell: PackageGroupMembershipTell;
  surfaceSlug: string | null;
  botStatus: string | null;
  active: boolean | null;
  hasInvite: boolean;
  requestedBy: string | null;
  dmSeatStatus: DmSeatStatus;
  dmTelegramId: string | null; // brand-ok — Telegram user id wire
  forumMetaPresent: boolean;
  forumTopicsComplete: boolean;
  forumIconState: 'uploaded' | 'failed' | 'missing' | 'backfilled';
  forumTopicsEnv: string | null;
};

export type BuildHandshakeDeskOpts = {
  db: Database;
  partnerCodes?: string[];
  jsonlPath?: string;
  forumsMetaDir?: string;
  telegramToken?: string | null;
  /** Refresh known-chat rows via getChat before assemble. */
  refresh?: boolean;
  /** Include live getChat title match column. */
  live?: boolean;
  /** Run full handshake verify per row (default true). */
  verify?: boolean;
};

function knownChatForId(
  db: Database,
  chatId: string // brand-ok — Telegram chat_id wire
): KnownChatRow | null {
  return getKnownChatById(db, chatId);
}

async function deskRowForRegistry(
  db: Database,
  reg: PackageGroupRegistryRow,
  opts: BuildHandshakeDeskOpts
): Promise<HandshakeDeskRow> {
  const known = knownChatForId(db, reg.chatId);
  let liveTitle: string | null = null;
  let titleMatch: boolean | null = null;

  if (opts.live && opts.telegramToken) {
    const live = await getChat(opts.telegramToken, reg.chatId);
    if (live.ok) {
      liveTitle = live.chat.title ?? null;
      titleMatch = liveTitle === reg.title;
    }
  }

  let handshakeOk = true;
  let checksPassed = 0;
  let checksTotal = 0;
  if (opts.verify !== false) {
    const verify = await verifyPackageGroupHandshake({
      db,
      partnerCode: reg.partnerCode,
      jsonlPath: opts.jsonlPath,
      forumsMetaDir: opts.forumsMetaDir ?? PACKAGE_GROUP_FORUMS_META_DIR,
      live: opts.live,
      telegramToken: opts.telegramToken,
    });
    handshakeOk = verify.ok;
    checksPassed = verify.checks.filter(c => c.ok).length;
    checksTotal = verify.checks.length;
  }

  const dmSeat = assessPackageGroupDmSeat(db, reg.partnerCode);
  const dmId = dmSeat.telegramId;

  const forumMeta = await loadPackageGroupForumMetadata(reg.partnerCode, {
    rootDir: opts.forumsMetaDir ?? PACKAGE_GROUP_FORUMS_META_DIR,
  });
  const forumAssessment = assessForumMetadata(forumMeta);

  return {
    partnerCode: reg.partnerCode,
    handshakeOk,
    checksPassed,
    checksTotal,
    chatId: reg.chatId,
    registryTitle: reg.title,
    telegramTitle: known?.title ?? null,
    liveTitle,
    titleMatch,
    chatType: known?.chatType ?? null,
    isForum: known?.isForum ?? null,
    memberCount: known?.memberCount ?? null,
    membershipTell: interpretPackageGroupMemberCount(known?.memberCount ?? null, {
      dmSeatStatus: dmSeat.status,
    }),
    surfaceSlug: known?.surfaceSlug ?? null,
    botStatus: known?.botStatus ?? null,
    active: known?.active ?? null,
    hasInvite: Boolean(reg.inviteLink?.trim()),
    requestedBy: reg.requestedBy,
    dmSeatStatus: dmSeat.status,
    dmTelegramId: dmId,
    forumMetaPresent: forumAssessment.present,
    forumTopicsComplete: forumAssessment.topicsComplete,
    forumIconState: forumAssessment.iconState,
    forumTopicsEnv: forumMeta ? formatPackageGroupTopicsEnv(forumMeta) : null,
  };
}

export async function buildHandshakeDesk(
  opts: BuildHandshakeDeskOpts
): Promise<{ rows: HandshakeDeskRow[] }> {
  let registry = listPackageGroupRegistry(opts.db);
  if (opts.partnerCodes?.length) {
    const want = new Set(
      opts.partnerCodes.map(c => parsePartnerCode(c)).filter((c): c is string => c != null)
    );
    registry = registry.filter(r => want.has(r.partnerCode));
  }

  if (opts.refresh && opts.telegramToken && registry.length > 0) {
    for (const reg of registry) {
      if (!getKnownChatById(opts.db, reg.chatId)) {
        const live = await getChat(opts.telegramToken, reg.chatId);
        if (live.ok) {
          upsertKnownChat(opts.db, {
            chat: {
              id: live.chat.id,
              type: live.chat.type,
              title: live.chat.title,
              username: live.chat.username,
              first_name: live.chat.first_name,
              last_name: live.chat.last_name,
              is_forum: live.chat.is_forum,
            },
            source: 'manual',
          });
        }
      }
    }
    await refreshKnownChats({
      db: opts.db,
      token: opts.telegramToken,
      chatIds: registry.map(r => r.chatId),
      filter: 'all',
    });
  }

  const rows: HandshakeDeskRow[] = [];
  for (const reg of registry) {
    rows.push(await deskRowForRegistry(opts.db, reg, opts));
  }
  return { rows };
}

export function formatHandshakeDeskTable(rows: HandshakeDeskRow[]): string[] {
  if (rows.length === 0) return ['(no package_group_registry rows)'];

  const trunc = (s: string | null, max: number): string => {
    if (!s) return '—';
    return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
  };

  const liveCol = (r: HandshakeDeskRow): string => {
    if (r.liveTitle != null) {
      return r.titleMatch === true
        ? 'match'
        : r.titleMatch === false
          ? 'MISMATCH'
          : trunc(r.liveTitle, 12);
    }
    if (r.telegramTitle === r.registryTitle && r.telegramTitle) return 'cached=OK';
    if (r.telegramTitle && r.registryTitle && r.telegramTitle !== r.registryTitle)
      return 'cached≠reg';
    return '—';
  };

  const botCol = (r: HandshakeDeskRow): string => {
    if (!r.botStatus) return '—';
    const s = r.botStatus.toLowerCase();
    if (s === 'administrator') return 'admin';
    if (s === 'member') return 'member';
    return r.botStatus.slice(0, 8);
  };

  const verifyCol = (r: HandshakeDeskRow): string =>
    r.checksTotal > 0
      ? r.handshakeOk
        ? `${r.checksPassed}/${r.checksTotal}`
        : `FAIL ${r.checksPassed}/${r.checksTotal}`
      : r.handshakeOk
        ? 'OK'
        : 'FAIL';

  const lines = [
    'CODE  CHAT_ID           REGISTRY_TITLE          LIVE    TYPE          MEMBERS       SURFACE       INV  BOT     VERIFY',
    '----  ----------------  ----------------------  ------  ------------  ------------  ------------  ---  ------  ------',
  ];

  for (const r of rows) {
    const type = r.chatType != null ? r.chatType + (r.isForum ? '*' : '') : '—';
    const mem = r.memberCount != null ? `${r.memberCount}·${r.membershipTell.label}` : '—';
    const surface = (r.surfaceSlug ?? '—').slice(0, 12);
    lines.push(
      `${r.partnerCode.padEnd(4)}  ${r.chatId.padEnd(16)}  ${trunc(r.registryTitle, 22).padEnd(22)}  ${liveCol(r).padEnd(6)}  ${type.padEnd(12)}  ${mem.padEnd(12)}  ${surface.padEnd(12)}  ${(r.hasInvite ? 'yes' : 'no').padEnd(3)}  ${botCol(r).padEnd(6)}  ${verifyCol(r)}`
    );
  }

  return lines;
}

export function formatHandshakeDeskDetail(rows: HandshakeDeskRow[]): string[] {
  const out: string[] = [];
  for (const r of rows) {
    out.push(
      `${r.partnerCode} · ${r.handshakeOk ? 'OK' : 'FAIL'} (${r.checksPassed}/${r.checksTotal})`,
      `  chat: ${r.chatId}  registry: ${r.registryTitle}`,
      `  known: ${r.telegramTitle ?? '—'}  live: ${r.liveTitle ?? '—'}  type: ${r.chatType ?? '—'}${r.isForum ? '+forum' : ''}`,
      `  members: ${r.membershipTell.detail}${r.memberCount != null ? ` (n=${r.memberCount})` : ''}`,
      `  surface: ${r.surfaceSlug ?? '—'}  bot: ${r.botStatus ?? '—'}  invite: ${r.hasInvite ? 'yes' : 'no'}`,
      `  forum meta: ${r.forumMetaPresent ? (r.forumTopicsComplete ? 'topics OK' : 'topics partial') : 'none'}  icon: ${r.forumIconState}`,
      r.forumTopicsEnv ? `  topics env: TELEGRAM_TOPICS=${r.forumTopicsEnv}` : '  topics env: —',
      `  dm seat: ${r.requestedBy ?? '—'} · ${formatDmSeatStatus(r.dmSeatStatus)}${r.dmTelegramId ? ` → ${r.dmTelegramId}` : ''}`,
      ''
    );
  }
  return out;
}
