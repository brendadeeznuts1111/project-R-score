// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Package-group forum metadata + topic SSOT (factory read plane).
 *
 * Written by toc-ops MTProto create-forum; consumed by handshake verify + desk tooling.
 * Keep topic lists aligned with toc-ops-repo `forum-defaults.ts`.
 */
import { joinPath } from './path-bun.ts';

/** Full topic plan shown to operators (General is implicit thread 1). */
export const PACKAGE_GROUP_FORUM_TOPICS = ['General', 'Ops', 'Alerts'] as const;

/** Topics created via MTProto `CreateForumTopic` (not General). */
export const PACKAGE_GROUP_FORUM_TOPICS_MTProto = ['Ops', 'Alerts'] as const;

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
  createdAt: string;
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
      out[t.title.toLowerCase()] = t.messageThreadId;
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
    createdAt: typeof o.createdAt === 'string' ? o.createdAt : new Date(0).toISOString(),
  };
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
  return {
    ok: true,
    detail: meta.iconUploaded
      ? 'metadata OK · icon uploaded'
      : meta.backfilled
        ? 'metadata OK · backfilled (no icon)'
        : 'metadata OK · icon not uploaded',
  };
}
