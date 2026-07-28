// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Partner package-group forum metadata + topic SSOT (factory read plane).
 *
 * **Partner package forums** (`TOC Ops · {CODE} · {DisplayName}`) share one topic plan
 * for every partner — see `PARTNER_PACKAGE_FORUM_TOPIC_PLAN` / `PACKAGE_GROUP_FORUM_TOPICS`.
 * Thread ids differ per chat; titles and map keys do not.
 *
 * **House surfaces** (`hq`, `sandbox`, `all-accounting`, …) use a separate topic grammar —
 * see `lib/telegram/surfaces.ts` · `HANDSHAKE_HOUSE_FORUM_TOPICS` in handshake-catalog.
 *
 * Written by toc-ops MTProto create-forum or factory Bot API enhance; consumed by handshake verify + desk tooling.
 *
 * Map key rule: `title.toLowerCase()` (e.g. `Liquidity/Outs` → `liquidity/outs`).
 */
import type { Database } from 'bun:sqlite';
import type { OpsChannelTopic } from '../channels/ops-channel-event.ts';
import { joinPath } from '../path-bun.ts';
import { packageGroupRegistryByChatId } from './package-group-registry.ts';

/** Full topic plan shown to operators (General is implicit thread 1). */
export const PACKAGE_GROUP_FORUM_TOPICS = [
  'General',
  'Ops',
  'Alerts',
  'Liquidity/Outs',
  'Accounting',
] as const;

/** Topics created via MTProto / Bot API `createForumTopic` (not General). */
export const PACKAGE_GROUP_FORUM_TOPICS_MTProto = [
  'Ops',
  'Alerts',
  'Liquidity/Outs',
  'Accounting',
] as const;

/** `topicsThreadMap` keys for package forums (aligned to topic titles). */
export const PACKAGE_GROUP_FORUM_TOPIC_KEYS = {
  general: 'general',
  ops: 'ops',
  alerts: 'alerts',
  liquidityOuts: 'liquidity/outs',
  accounting: 'accounting',
} as const;

/** @deprecated Prefer `PACKAGE_GROUP_FORUM_TOPIC_KEYS.liquidityOuts`. */
export const PACKAGE_GROUP_LIQUIDITY_OUTS_TOPIC_KEY = PACKAGE_GROUP_FORUM_TOPIC_KEYS.liquidityOuts;

/** @deprecated Prefer `PACKAGE_GROUP_FORUM_TOPIC_KEYS.accounting`. */
export const PACKAGE_GROUP_ACCOUNTING_TOPIC_KEY = PACKAGE_GROUP_FORUM_TOPIC_KEYS.accounting;

/** One row in the standardized partner package forum topic plan. */
export type PartnerPackageForumTopicPlanRow = {
  /** Bot API / Telegram topic title (case-sensitive). */
  title: (typeof PACKAGE_GROUP_FORUM_TOPICS)[number];
  /** Key in `topicsThreadMap` and routing lookups. */
  mapKey: string;
  role: string;
  /** Created via `createForumTopic` (false for implicit General). */
  botCreated: boolean;
};

/**
 * Partner package forum topic plan — identical for every partner CODE (SPEN, ASH, BIL, …).
 * Machine ref: `bun run telegram:handshake:catalog --json` → `packageForumTopics`.
 */
export const PARTNER_PACKAGE_FORUM_TOPIC_PLAN: readonly PartnerPackageForumTopicPlanRow[] = [
  { title: 'General', mapKey: 'general', role: 'Implicit thread 1', botCreated: false },
  { title: 'Ops', mapKey: 'ops', role: 'House ops posts', botCreated: true },
  { title: 'Alerts', mapKey: 'alerts', role: 'Outbox alerts routing', botCreated: true },
  {
    title: 'Liquidity/Outs',
    mapKey: 'liquidity/outs',
    role: 'Pinned seat capital desk + rails pipe intake',
    botCreated: true,
  },
  {
    title: 'Accounting',
    mapKey: 'accounting',
    role: 'Deposit/withdraw/bet-slip proof (screenshots)',
    botCreated: true,
  },
] as const;

/** Map a partner forum topic title to its `topicsThreadMap` key. */
export function packageGroupTopicMapKey(title: string): string {
  return title.trim().toLowerCase();
}

export const PACKAGE_GROUP_FORUMS_META_DIR = 'reports/telegram/forums';

export type PackageGroupForumTopicMeta = {
  title: string;
  messageThreadId: number | null;
};

export type PackageGroupForumMetadata = {
  partnerCode: string;
  title: string;
  displayName: string;
  chatId: string; // brand-ok
  chatRef: string;
  inviteLink: string;
  topics: PackageGroupForumTopicMeta[];
  iconUploaded: boolean;
  iconError?: string;
  backfilled?: boolean;
  topicsComplete?: boolean;
  topicsThreadMap?: Record<string, number>;
  /** Pinned accounting topic prompt (partner forum). */
  accountingPromptMessageId?: number;
  accountingPromptPostedAt?: string;
  createdAt: string;
  updatedAt?: string;
};

export function packageGroupForumMetadataPath(
  partnerCode: string,
  rootDir = PACKAGE_GROUP_FORUMS_META_DIR
): string {
  return joinPath(rootDir, `${partnerCode.toUpperCase().trim()}.json`);
}

export function generalForumTopicMeta(): PackageGroupForumTopicMeta {
  return { title: 'General', messageThreadId: 1 };
}

/** Bot API TELEGRAM_TOPICS-style map (lowercase keys; General = 1). */
export function packageGroupTopicsThreadMap(
  topics: readonly PackageGroupForumTopicMeta[]
): Record<string, number> {
  const out: Record<string, number> = { general: 1 };
  for (const t of topics) {
    if (t.messageThreadId != null && t.messageThreadId > 0) {
      out[packageGroupTopicMapKey(t.title)] = t.messageThreadId;
    }
  }
  return out;
}

export function parsePackageGroupForumMetadata(raw: unknown): PackageGroupForumMetadata | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.partnerCode !== 'string' || typeof o.chatId !== 'string') return null;
  if (!Array.isArray(o.topics)) return null;
  const topics: PackageGroupForumTopicMeta[] = [];
  for (const item of o.topics) {
    if (!item || typeof item !== 'object') continue;
    const t = item as Record<string, unknown>;
    if (typeof t.title !== 'string') continue;
    topics.push({
      title: t.title,
      messageThreadId:
        typeof t.messageThreadId === 'number'
          ? t.messageThreadId
          : t.messageThreadId === null
            ? null
            : null,
    });
  }
  return {
    partnerCode: o.partnerCode,
    title: typeof o.title === 'string' ? o.title : '',
    displayName: typeof o.displayName === 'string' ? o.displayName : o.partnerCode,
    chatId: o.chatId,
    chatRef: typeof o.chatRef === 'string' ? o.chatRef : `tg:chat:${o.chatId}`,
    inviteLink: typeof o.inviteLink === 'string' ? o.inviteLink : '',
    topics,
    iconUploaded: o.iconUploaded === true,
    iconError: typeof o.iconError === 'string' ? o.iconError : undefined,
    backfilled: o.backfilled === true,
    topicsComplete: o.topicsComplete === true,
    topicsThreadMap:
      o.topicsThreadMap && typeof o.topicsThreadMap === 'object'
        ? (o.topicsThreadMap as Record<string, number>)
        : undefined,
    accountingPromptMessageId:
      typeof o.accountingPromptMessageId === 'number' ? o.accountingPromptMessageId : undefined,
    accountingPromptPostedAt:
      typeof o.accountingPromptPostedAt === 'string' ? o.accountingPromptPostedAt : undefined,
    createdAt: typeof o.createdAt === 'string' ? o.createdAt : new Date(0).toISOString(),
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : undefined,
  };
}

export function topicsPlanComplete(topics: readonly PackageGroupForumTopicMeta[]): boolean {
  return topics.every(t => t.messageThreadId != null && t.messageThreadId > 0);
}

export type ForumMetadataAssessment = {
  present: boolean;
  topicsComplete: boolean;
  iconState: 'uploaded' | 'failed' | 'missing' | 'backfilled';
};

export function assessForumMetadata(
  meta: PackageGroupForumMetadata | null | undefined
): ForumMetadataAssessment {
  if (!meta) {
    return { present: false, topicsComplete: false, iconState: 'missing' };
  }
  const topicsComplete = meta.topicsComplete === true || topicsPlanComplete(meta.topics);
  let iconState: ForumMetadataAssessment['iconState'] = 'missing';
  if (meta.iconUploaded) iconState = 'uploaded';
  else if (meta.iconError) iconState = 'failed';
  else if (meta.backfilled) iconState = 'backfilled';
  return { present: true, topicsComplete, iconState };
}

/** Suggested TELEGRAM_TOPICS JSON snippet for package forum routing. */
export function formatPackageGroupTopicsEnv(meta: PackageGroupForumMetadata): string {
  const map = meta.topicsThreadMap ?? packageGroupTopicsThreadMap(meta.topics);
  return JSON.stringify(map, null, 2);
}

export async function savePackageGroupForumMetadata(
  meta: PackageGroupForumMetadata,
  opts?: { rootDir?: string }
): Promise<string> {
  const path = packageGroupForumMetadataPath(meta.partnerCode, opts?.rootDir);
  const enriched: PackageGroupForumMetadata = {
    ...meta,
    topicsComplete: topicsPlanComplete(meta.topics),
    topicsThreadMap: packageGroupTopicsThreadMap(meta.topics),
    updatedAt: new Date().toISOString(),
  };
  await Bun.write(path, `${JSON.stringify(enriched, null, 2)}\n`);
  return path;
}

/** Register a live forum topic thread id (manual create or toc-ops sync bootstrap). */
export async function registerPackageGroupForumTopic(
  partnerCode: string,
  title: string,
  messageThreadId: number,
  opts?: { rootDir?: string }
): Promise<{ path: string; meta: PackageGroupForumMetadata }> {
  if (messageThreadId <= 0) {
    throw new Error(`Invalid messageThreadId for ${title}`);
  }
  const code = partnerCode.toUpperCase().trim();
  const existing = await loadPackageGroupForumMetadata(code, opts);
  if (!existing) {
    throw new Error(`No forum metadata for ${code}`);
  }
  const topics = [...existing.topics];
  const idx = topics.findIndex(t => t.title.toLowerCase() === title.toLowerCase());
  if (idx >= 0) topics[idx] = { title: topics[idx]!.title, messageThreadId };
  else topics.push({ title, messageThreadId });
  const meta: PackageGroupForumMetadata = { ...existing, topics };
  const path = await savePackageGroupForumMetadata(meta, opts);
  return { path, meta: (await loadPackageGroupForumMetadata(code, opts))! };
}

export async function loadPackageGroupForumMetadata(
  partnerCode: string,
  opts?: { rootDir?: string }
): Promise<PackageGroupForumMetadata | null> {
  const path = packageGroupForumMetadataPath(partnerCode, opts?.rootDir);
  const file = Bun.file(path);
  if (!(await file.exists())) return null;
  try {
    return parsePackageGroupForumMetadata(await file.json());
  } catch {
    return null;
  }
}

export function validateForumMetadataAgainstRegistry(
  meta: PackageGroupForumMetadata,
  partnerCode: string,
  expectedChatId: string // brand-ok — Telegram chat_id wire compare
): { ok: boolean; detail: string } {
  const code = partnerCode.toUpperCase().trim();
  if (meta.partnerCode.toUpperCase() !== code) {
    return { ok: false, detail: `metadata partner ${meta.partnerCode} != ${code}` };
  }
  if (meta.chatId !== expectedChatId) {
    return {
      ok: false,
      detail: `metadata chat_id ${meta.chatId} != registry ${expectedChatId}`,
    };
  }
  const general = meta.topics.find(t => t.title === 'General');
  if (!general || general.messageThreadId !== 1) {
    return { ok: false, detail: 'metadata missing General topic thread 1' };
  }
  for (const required of PACKAGE_GROUP_FORUM_TOPICS_MTProto) {
    if (!meta.topics.some(t => t.title === required)) {
      return { ok: false, detail: `metadata missing topic ${required}` };
    }
  }
  if (meta.iconError) {
    return { ok: true, detail: `metadata OK (icon failed: ${meta.iconError})` };
  }
  if (!topicsPlanComplete(meta.topics)) {
    return {
      ok: true,
      detail: 'metadata OK · topic thread ids incomplete (run ct forum-metadata-sync --apply)',
    };
  }
  return {
    ok: true,
    detail: meta.iconUploaded
      ? 'metadata OK · icon uploaded'
      : meta.backfilled
        ? 'metadata OK · backfilled (no icon)'
        : 'metadata OK · icon not uploaded',
  };
}

export type PackageGroupTopicsLookup = {
  partnerCode: string;
  topics: Record<string, number>;
};

/**
 * Resolve forum thread map for a package-group chat (registry + metadata file).
 * Returns null when chat is not a linked package group or metadata is absent.
 */
export async function resolvePackageGroupTopicsForChat(
  db: Database,
  chatId: string, // brand-ok — Telegram chat_id wire
  forumsMetaDir = PACKAGE_GROUP_FORUMS_META_DIR
): Promise<PackageGroupTopicsLookup | null> {
  const reg = packageGroupRegistryByChatId(db).get(chatId);
  if (!reg) return null;
  const meta = await loadPackageGroupForumMetadata(reg.partnerCode, { rootDir: forumsMetaDir });
  if (!meta) return null;
  return {
    partnerCode: reg.partnerCode,
    topics: meta.topicsThreadMap ?? packageGroupTopicsThreadMap(meta.topics),
  };
}

/** Resolve a forum thread by logical topic key (`liquidity/outs`, `accounting`, …). */
export async function resolvePackageGroupForumThread(
  partnerCode: string,
  topicKey: string,
  forumsMetaDir = PACKAGE_GROUP_FORUMS_META_DIR
): Promise<{ chatId: string; messageThreadId: number }> {
  // brand-ok — Telegram chat_id wire
  const code = partnerCode.toUpperCase().trim();
  const key = topicKey.toLowerCase();
  const meta = await loadPackageGroupForumMetadata(code, { rootDir: forumsMetaDir });
  if (!meta?.chatId) {
    throw new Error(`No forum metadata for ${code}`);
  }
  const map = meta.topicsThreadMap ?? packageGroupTopicsThreadMap(meta.topics);
  const threadId = map[key];
  if (threadId == null || threadId <= 0) {
    throw new Error(`No ${key} topic for ${code}`);
  }
  return { chatId: meta.chatId, messageThreadId: threadId };
}

/**
 * Forum thread for ops outbox rows posted to a package-group chat.
 * Keys are lowercase (`general`, `ops`, `alerts`) from metadata `topicsThreadMap`.
 */
export function threadIdForPackageGroupOutboxTopic(
  topics: Record<string, number>,
  topic: OpsChannelTopic,
  eventType?: string
): number | undefined {
  if (eventType === 'partner.welcome') return undefined;

  // Limit raises land next to seat capital desk traffic (Liquidity/Outs), then Alerts.
  if (eventType === 'account.limit_raise') {
    for (const key of ['liquidity/outs', 'alerts', 'ops'] as const) {
      const id = topics[key];
      if (id != null && id > 0) return id;
    }
  }

  const direct = topics[topic.toLowerCase()];
  if (direct != null && direct > 0) return direct;

  const aliases: Partial<Record<OpsChannelTopic, string[]>> = {
    alerts: ['alerts'],
    dod: ['alerts', 'dod'],
    plays: ['ops', 'plays'],
    provisioning: ['ops', 'provisioning', 'onboard'],
    identity: ['ops', 'identity', 'welcome'],
    toc: ['liquidity/outs', 'ops', 'toc'],
    experiments: ['general', 'experiments'],
  };

  for (const key of aliases[topic] ?? [topic]) {
    const id = topics[key];
    if (id != null && id > 0) return id;
  }

  return undefined;
}

/** Operator handoff: TELEGRAM_TOPICS snippet for a package forum (per-chat routing). */
export function formatPackageGroupTopicsHandoff(meta: PackageGroupForumMetadata): string[] {
  const map = meta.topicsThreadMap ?? packageGroupTopicsThreadMap(meta.topics);
  const compact = JSON.stringify(map);
  const threads = Object.entries(map)
    .filter(([key]) => key !== 'general')
    .map(([key, id]) => `${key}=${id}`)
    .join('  ');
  return [`TELEGRAM_TOPICS=${compact}`, `  general=${map.general ?? 1}  ${threads}`];
}
