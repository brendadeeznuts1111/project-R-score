// @see https://bun.com/docs/runtime/sqlite
/**
 * Seat ↔ Telegram resolution — tree_nodes.telegram_id (primary) + ops_chat_channel_meta (shared DM).
 *
 * One human may operate ASH-001 and BIL-001 from the same private chat. Only the first bind
 * sets tree_nodes.telegram_id (UNIQUE); later seats merge into ChatChannelMeta instead.
 * Bot commands use `activeCallSign` on meta (`/seat BIL-001`).
 */
import type { Database } from 'bun:sqlite';
import type { TreeNodeId } from '../../types/branded/operations.ts';
import {
  ensureChatChannelMetaSchema,
  getChatChannelMeta,
  upsertChatChannelMeta,
} from './channel-meta.ts';
import type { OpsFlowNode } from './types.ts';
import { getPackageGroupRegistry, listPackageGroupRegistry } from '../package-group-registry.ts';
import {
  loadPackageGroupForumMetadata,
  PACKAGE_GROUP_FORUMS_META_DIR,
} from '../package-group-forum.ts';
import { getKnownChatById } from '../known-chats.ts';
import {
  assessPackageGroupDmSeat,
  formatDmSeatStatus,
  type DmSeatStatus,
} from '../dm-seat-designation.ts';
import {
  formatMembershipDeskCell,
  interpretPackageGroupMemberCount,
  type PackageGroupMembershipTell,
} from '../package-group-membership.ts';
import { partnerCodeFromCallSign, tryPartnerCodeArg } from '../handshake-ref.ts';

export function telegramIdWireLinked(telegramId: string | null | undefined): boolean {
  // brand-ok — tree_nodes.telegram_id wire
  if (!telegramId || telegramId.startsWith('pending-')) return false;
  // Placeholder refs (seed/demo) — not Bot API DM targets
  if (telegramId.startsWith('tg:')) return false;
  return true;
}

function resolvePartnerCodeFromCallSign(callSign: string): string | null {
  return partnerCodeFromCallSign(callSign) ?? tryPartnerCodeArg(callSign);
}

function parseStringArray(raw: string): string[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

const FLOW_NODE_SELECT = `SELECT id, type, parent_id, expert_id, name, telegram_id, call_sign
  FROM tree_nodes WHERE active = 1`;

export type TreeNodeTelegramOwner = {
  id: string; // brand-ok
  callSign: string | null;
  name: string;
};

function loadFlowNodeByCallSign(db: Database, callSign: string): OpsFlowNode | null {
  return db
    .query(`${FLOW_NODE_SELECT} AND call_sign = $cs LIMIT 1`)
    .get({ $cs: callSign.trim() }) as OpsFlowNode | null;
}

function loadFlowNodeById(db: Database, id: string): OpsFlowNode | null {
  // brand-ok — tree_nodes PK
  return db
    .query(`${FLOW_NODE_SELECT} AND id = $id LIMIT 1`)
    .get({ $id: id }) as OpsFlowNode | null;
}

/** Active seat that already owns this telegram_id on tree_nodes (excluding optional node). */
export function findTreeNodeOwningTelegramId(
  db: Database,
  telegramId: string, // brand-ok
  excludeNodeId?: string // brand-ok
): TreeNodeTelegramOwner | null {
  const row = db
    .query(
      `SELECT id, call_sign, name FROM tree_nodes
       WHERE active = 1 AND telegram_id = $tg
         AND ($exclude IS NULL OR id != $exclude)
       LIMIT 1`
    )
    .get({ $tg: telegramId, $exclude: excludeNodeId ?? null }) as {
    id: string; // brand-ok
    call_sign: string | null;
    name: string;
  } | null;
  if (!row) return null;
  return { id: row.id, callSign: row.call_sign, name: row.name };
}

/** Resolve DM chat id from ChatChannelMeta when seat shares a Telegram user with another seat. */
export function resolveSeatTelegramIdFromMeta(
  db: Database,
  opts: { callSign?: string | null; treeNodeId?: TreeNodeId }
): string | null {
  ensureChatChannelMetaSchema(db);
  const rows = db
    .query(`SELECT chat_id, call_signs_json, tree_node_ids_json FROM ops_chat_channel_meta`)
    .all() as Array<{
    chat_id: string; // brand-ok
    call_signs_json: string;
    tree_node_ids_json: string;
  }>;

  for (const row of rows) {
    const callSigns = parseStringArray(row.call_signs_json);
    const nodeIds = parseStringArray(row.tree_node_ids_json);
    if (opts.callSign?.trim() && callSigns.includes(opts.callSign.trim())) {
      return row.chat_id;
    }
    if (opts.treeNodeId && nodeIds.includes(opts.treeNodeId as string)) {
      return row.chat_id;
    }
  }
  return null;
}

/** Effective Telegram DM id for a seat — tree_nodes first, then shared ChatChannelMeta. */
export function resolveSeatTelegramId(
  db: Database,
  opts: { callSign?: string | null; treeNodeId?: TreeNodeId }
): string | null {
  if (opts.treeNodeId) {
    const row = db
      .query(`SELECT telegram_id, call_sign FROM tree_nodes WHERE id = $id AND active = 1`)
      .get({ $id: opts.treeNodeId as string }) as {
      telegram_id: string | null; // brand-ok
      call_sign: string | null;
    } | null;
    if (row && telegramIdWireLinked(row.telegram_id)) return row.telegram_id!.trim();
    const fromMeta = resolveSeatTelegramIdFromMeta(db, {
      treeNodeId: opts.treeNodeId,
      callSign: opts.callSign ?? row?.call_sign,
    });
    if (fromMeta) return fromMeta;
  }

  if (opts.callSign?.trim()) {
    const row = db
      .query(`SELECT telegram_id FROM tree_nodes WHERE active = 1 AND call_sign = $cs LIMIT 1`)
      .get({ $cs: opts.callSign.trim() }) as { telegram_id: string | null } | null; // brand-ok
    if (row && telegramIdWireLinked(row.telegram_id)) return row.telegram_id!.trim();
    return resolveSeatTelegramIdFromMeta(db, { callSign: opts.callSign });
  }

  return null;
}

/** Call-signs reachable from this Telegram user (primary tree row + shared meta). */
export function listCallSignsForTelegramUser(
  db: Database,
  telegramUserId: string // brand-ok
): string[] {
  const out = new Set<string>();
  const primary = db
    .query(`${FLOW_NODE_SELECT} AND telegram_id = $tg`)
    .all({ $tg: telegramUserId }) as OpsFlowNode[];
  for (const n of primary) {
    if (n.call_sign?.trim()) out.add(n.call_sign.trim());
  }
  const meta = getChatChannelMeta(db, telegramUserId);
  for (const cs of meta?.callSigns ?? []) {
    if (cs.trim()) out.add(cs.trim());
  }
  return [...out].sort();
}

/** Resolve bot command context seat (shared-DM aware). */
export function resolveFlowNodeForTelegram(
  db: Database,
  telegramUserId: string, // brand-ok
  opts?: { callSignHint?: string | null }
): OpsFlowNode | null {
  const chatId = telegramUserId.trim();
  const meta = getChatChannelMeta(db, chatId);
  const hint = opts?.callSignHint?.trim() || meta?.activeCallSign?.trim() || null;

  if (hint) {
    const byHint = loadFlowNodeByCallSign(db, hint);
    if (byHint && seatAuthorizedForTelegramUser(db, chatId, byHint.id)) return byHint;
  }

  const signs = listCallSignsForTelegramUser(db, chatId);
  if (signs.length === 1) {
    return loadFlowNodeByCallSign(db, signs[0]!);
  }

  if (signs.length > 1) {
    const owner = findTreeNodeOwningTelegramId(db, chatId);
    if (owner) {
      const node = loadFlowNodeById(db, owner.id);
      if (node) return node;
    }
    return loadFlowNodeByCallSign(db, signs[0]!);
  }

  return db
    .query(`${FLOW_NODE_SELECT} AND telegram_id = $tg LIMIT 1`)
    .get({ $tg: chatId }) as OpsFlowNode | null;
}

/** Whether treeNodeId is operable from this Telegram user (primary or shared meta). */
export function seatAuthorizedForTelegramUser(
  db: Database,
  telegramUserId: string, // brand-ok
  treeNodeId: string // brand-ok
): boolean {
  const row = db
    .query(`SELECT telegram_id FROM tree_nodes WHERE id = $id AND active = 1`)
    .get({ $id: treeNodeId }) as { telegram_id: string | null } | null; // brand-ok
  if (row?.telegram_id === telegramUserId) return true;
  const meta = getChatChannelMeta(db, telegramUserId);
  return meta?.treeNodeIds.includes(treeNodeId) ?? false;
}

export function setActiveCallSignForTelegram(
  db: Database,
  telegramUserId: string, // brand-ok
  callSign: string
): { ok: true; activeCallSign: string } | { ok: false; reason: string } {
  const cs = callSign.trim();
  if (!cs) return { ok: false, reason: 'call-sign required' };
  const allowed = listCallSignsForTelegramUser(db, telegramUserId);
  if (!allowed.includes(cs)) {
    return { ok: false, reason: `not linked — use one of: ${allowed.join(', ') || '(none)'}` };
  }
  const existing = getChatChannelMeta(db, telegramUserId);
  const base = existing ?? {
    chatId: telegramUserId,
    treeNodeIds: [],
    callSigns: allowed,
    locale: 'en' as const,
    topics: {},
  };
  upsertChatChannelMeta(db, { ...base, activeCallSign: cs });
  return { ok: true, activeCallSign: cs };
}

export function handleOpsSeatCommand(
  db: Database,
  telegramUserId: string, // brand-ok
  args: string[]
): string {
  const signs = listCallSignsForTelegramUser(db, telegramUserId);
  if (signs.length === 0) {
    return 'No linked seats. Link via portal onboarding or `bun tools/telegram-link-chat.ts CODE-001 <telegram_id>`.';
  }

  const pick = args[0]?.trim();
  if (!pick) {
    const meta = getChatChannelMeta(db, telegramUserId);
    const active =
      meta?.activeCallSign ?? findTreeNodeOwningTelegramId(db, telegramUserId)?.callSign;
    const lines = [
      '*Linked seats*',
      ...signs.map(s => {
        const mark = s === active ? ' ← active' : '';
        return `• \`${s}\`${mark}`;
      }),
      '',
      'Switch: `/seat BIL-001`',
    ];
    return lines.join('\n');
  }

  const result = setActiveCallSignForTelegram(db, telegramUserId, pick);
  if (!result.ok) return `❌ ${result.reason}`;
  const node = resolveFlowNodeForTelegram(db, telegramUserId, {
    callSignHint: result.activeCallSign,
  });
  return [`✅ Active seat: *${result.activeCallSign}*`, node ? `Name: ${node.name}` : '']
    .filter(Boolean)
    .join('\n');
}

export type LinkTelegramConflict = {
  kind: 'shared_dm';
  owner: TreeNodeTelegramOwner;
};

/** Whether binding chatId to treeNodeId must skip tree_nodes.telegram_id (UNIQUE). */
export function detectTelegramLinkConflict(
  db: Database,
  chatId: string, // brand-ok
  treeNodeId: TreeNodeId
): LinkTelegramConflict | null {
  const owner = findTreeNodeOwningTelegramId(db, chatId, treeNodeId as string);
  if (!owner) return null;
  return { kind: 'shared_dm', owner };
}

export type SeatMapEntry = {
  telegramId: string; // brand-ok
  callSign: string;
  treeNodeId: string; // brand-ok
  seatName: string;
  primary: boolean;
  sharedDm: boolean;
  active: boolean;
  partnerCode: string | null;
  packageForumChatId: string | null; // brand-ok — telegram forum chat wire
  forumTopics: string | null;
};

export async function buildSeatTelegramMap(
  db: Database,
  forumsMetaDir = PACKAGE_GROUP_FORUMS_META_DIR
): Promise<SeatMapEntry[]> {
  ensureChatChannelMetaSchema(db);
  const registry = listPackageGroupRegistry(db);
  const byCode = new Map(registry.map(r => [r.partnerCode, r]));

  const metaRows = db
    .query(
      `SELECT chat_id, call_signs_json, tree_node_ids_json, active_call_sign FROM ops_chat_channel_meta`
    )
    .all() as Array<{
    chat_id: string; // brand-ok
    call_signs_json: string;
    tree_node_ids_json: string;
    active_call_sign: string | null;
  }>;

  const entries: SeatMapEntry[] = [];
  const seen = new Set<string>();

  for (const meta of metaRows) {
    const callSigns = parseStringArray(meta.call_signs_json);
    const nodeIds = parseStringArray(meta.tree_node_ids_json);
    const owner = findTreeNodeOwningTelegramId(db, meta.chat_id);

    for (const cs of callSigns) {
      const node =
        loadFlowNodeByCallSign(db, cs) ??
        (nodeIds[0] ? loadFlowNodeById(db, nodeIds[callSigns.indexOf(cs)] ?? nodeIds[0]!) : null);
      if (!node) continue;
      const key = `${meta.chat_id}:${cs}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const code = resolvePartnerCodeFromCallSign(cs);
      const reg = code ? (byCode.get(code) ?? getPackageGroupRegistry(db, code)) : null;
      let forumTopics: string | null = null;
      if (reg) {
        const fm = await loadPackageGroupForumMetadata(reg.partnerCode, { rootDir: forumsMetaDir });
        if (fm?.topicsThreadMap) {
          forumTopics = Object.entries(fm.topicsThreadMap)
            .map(([k, v]) => `${k}=${v}`)
            .join(' ');
        }
      }

      entries.push({
        telegramId: meta.chat_id,
        callSign: cs,
        treeNodeId: node.id,
        seatName: node.name,
        primary: owner?.callSign === cs,
        sharedDm: owner != null && owner.callSign !== cs,
        active: meta.active_call_sign === cs || (!meta.active_call_sign && owner?.callSign === cs),
        partnerCode: code,
        packageForumChatId: reg?.chatId ?? null,
        forumTopics,
      });
    }
  }

  const orphanPrimary = db
    .query(`${FLOW_NODE_SELECT} AND telegram_id IS NOT NULL AND telegram_id NOT LIKE 'pending-%'`)
    .all() as OpsFlowNode[];

  for (const node of orphanPrimary) {
    if (!node.call_sign?.trim()) continue;
    if (!telegramIdWireLinked(node.telegram_id)) continue;
    const key = `${node.telegram_id}:${node.call_sign}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const code = resolvePartnerCodeFromCallSign(node.call_sign);
    const reg = code ? getPackageGroupRegistry(db, code) : null;
    let forumTopics: string | null = null;
    if (reg) {
      const fm = await loadPackageGroupForumMetadata(reg.partnerCode, { rootDir: forumsMetaDir });
      if (fm?.topicsThreadMap) {
        forumTopics = Object.entries(fm.topicsThreadMap)
          .map(([k, v]) => `${k}=${v}`)
          .join(' ');
      }
    }
    entries.push({
      telegramId: node.telegram_id,
      callSign: node.call_sign,
      treeNodeId: node.id,
      seatName: node.name,
      primary: true,
      sharedDm: false,
      active: true,
      partnerCode: code,
      packageForumChatId: reg?.chatId ?? null,
      forumTopics,
    });
  }

  return entries.sort((a, b) => a.callSign.localeCompare(b.callSign));
}

export function formatSeatTelegramMapTable(entries: readonly SeatMapEntry[]): string[] {
  if (entries.length === 0) return ['(no linked seats)'];

  const lines = [
    'SEAT          TELEGRAM_ID     PRIMARY  ACTIVE  PKG   PACKAGE_FORUM_CHAT     FORUM_TOPICS',
    '------------  --------------  -------  ------  ----  ---------------------  ------------------',
  ];

  for (const e of entries) {
    lines.push(
      `${e.callSign.padEnd(12)}  ${e.telegramId.padEnd(14)}  ${(e.primary ? 'yes' : 'share').padEnd(7)}  ${(e.active ? '●' : '·').padEnd(6)}  ${(e.partnerCode ?? '—').padEnd(4)}  ${(e.packageForumChatId ?? '—').padEnd(21)}  ${e.forumTopics ?? '—'}`
    );
  }
  return lines;
}

export type PartnerPackageMapEntry = {
  partnerCode: string;
  forumChatId: string; // brand-ok
  registryTitle: string;
  requestedBy: string | null;
  dmSeatStatus: DmSeatStatus;
  dmTelegramId: string | null; // brand-ok
  dmResolvedVia: 'seat' | 'shared-meta' | 'none';
  forumTopics: string | null;
  membershipTell: PackageGroupMembershipTell;
};

export async function buildPartnerPackageMap(
  db: Database,
  forumsMetaDir = PACKAGE_GROUP_FORUMS_META_DIR
): Promise<PartnerPackageMapEntry[]> {
  const out: PartnerPackageMapEntry[] = [];
  for (const reg of listPackageGroupRegistry(db)) {
    const dmSeat = assessPackageGroupDmSeat(db, reg.partnerCode);
    const dmId = dmSeat.telegramId;
    let dmResolvedVia: PartnerPackageMapEntry['dmResolvedVia'] = 'none';
    if (dmId) {
      const onTree = db
        .query(`SELECT 1 FROM tree_nodes WHERE active = 1 AND telegram_id = $tg LIMIT 1`)
        .get({ $tg: dmId });
      dmResolvedVia = onTree ? 'seat' : 'shared-meta';
    }
    const fm = await loadPackageGroupForumMetadata(reg.partnerCode, { rootDir: forumsMetaDir });
    const known = getKnownChatById(db, reg.chatId);
    const membershipTell = interpretPackageGroupMemberCount(known?.memberCount ?? null, {
      dmSeatStatus: dmSeat.status,
    });
    const forumTopics = fm?.topicsThreadMap
      ? Object.entries(fm.topicsThreadMap)
          .map(([k, v]) => `${k}=${v}`)
          .join(' ')
      : null;
    out.push({
      partnerCode: reg.partnerCode,
      forumChatId: reg.chatId,
      registryTitle: reg.title,
      requestedBy: reg.requestedBy,
      dmSeatStatus: dmSeat.status,
      dmTelegramId: dmId,
      dmResolvedVia,
      forumTopics,
      membershipTell,
    });
  }
  return out.sort((a, b) => a.partnerCode.localeCompare(b.partnerCode));
}

export function formatPartnerPackageMapTable(entries: readonly PartnerPackageMapEntry[]): string[] {
  if (entries.length === 0) return ['(no package_group_registry rows)'];

  const lines = [
    'CODE  FORUM_CHAT_ID      MEM        DM_SEAT       DM_STATUS                      DM_TELEGRAM     FORUM_TOPICS',
    '----  -----------------  ---------  ------------  -----------------------------  --------------  ------------------',
  ];
  for (const e of entries) {
    const status = formatDmSeatStatus(e.dmSeatStatus);
    const mem = formatMembershipDeskCell(e.membershipTell, e.dmSeatStatus).padEnd(9);
    lines.push(
      `${e.partnerCode.padEnd(4)}  ${e.forumChatId.padEnd(17)}  ${mem}  ${(e.requestedBy ?? '—').padEnd(12)}  ${status.padEnd(29)}  ${(e.dmTelegramId ?? '—').padEnd(14)}  ${e.forumTopics ?? '—'}`
    );
  }
  return lines;
}
