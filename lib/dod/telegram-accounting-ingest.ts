// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/utils#bun-escapehtml — Bun.escapeHTML
/**
 * Package Accounting + house all-accounting photo → DODVerifier.process.
 */
import type { Database } from 'bun:sqlite';
import {
  PACKAGE_GROUP_ACCOUNTING_TOPIC_KEY,
  PACKAGE_GROUP_FORUMS_META_DIR,
  loadPackageGroupForumMetadata,
  packageGroupTopicsThreadMap,
} from '../telegram/package-group-forum.ts';
import { packageGroupRegistryByChatId } from '../telegram/package-group-registry.ts';
import {
  DEFAULT_ACCOUNTING_SURFACE,
  HOUSE_FORUMS_META_DIR,
  loadHouseForumMetadata,
} from '../telegram/house-forum-metadata.ts';
import { HANDSHAKE_PARTNER_CODE_RE, tryPartnerCodeArg } from '../telegram/handshake-ref.ts';
import { findFlowNodeByTelegram } from '../telegram/flows/registry.ts';
import { recordChatImage } from '../telegram/flows/media.ts';
import { loadTelegramEnv } from '../telegram/telegram-config.ts';
import { downloadTelegramFile } from '../telegram/telegram-api.ts';
import { ALL_ACCOUNTING_FORUM_TOPICS } from '../telegram/surfaces.ts';
import { parseDodId, type DodId } from '../types/branded.ts';
import { telegramMessageDeepLink } from './enrich-entry.ts';
import { DODVerifier, type DODSubmission, type DODVerification } from './verifier.ts';

const DOD_TYPES = ['balance', 'slip', 'receipt', 'id', 'location', 'device'] as const;
type DodType = (typeof DOD_TYPES)[number];

export type AccountingForumTarget = {
  kind: 'package' | 'house';
  chatId: string; // brand-ok — Telegram chat_id wire
  threadId?: number;
  topicKey: string;
  partnerCode?: string;
};

export type AccountingDodIngestDeps = {
  token: string;
  db: Database;
  dbPath: string;
  forumsMetaDir?: string;
  houseMetaDir?: string;
  accountingChatId?: string; // brand-ok — Telegram chat_id wire
  evidenceRoot?: string;
  registryPath?: string;
  downloadFile?: (token: string, fileId: string) => Promise<Uint8Array>; // brand-ok — Telegram file_id wire
  processSubmission?: (
    submission: DODSubmission,
    opts: { dbPath: string; evidenceRoot?: string; registryPath?: string }
  ) => Promise<DODVerification>;
  skipMediaRecord?: boolean;
};

export type AccountingDodIngestResult = {
  handled: boolean;
  replyText: string;
  dodId?: DodId;
  duplicate?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseMessageId(message: Record<string, unknown>): number | null {
  const id = message.message_id;
  return typeof id === 'number' && Number.isInteger(id) && id > 0 ? id : null;
}

function parseThreadId(message: Record<string, unknown>): number | undefined {
  const id = message.message_thread_id;
  return typeof id === 'number' && id > 0 ? id : undefined;
}

function parseChatId(message: Record<string, unknown>): string | null {
  const chat = message.chat;
  if (!isRecord(chat)) return null;
  const id = chat.id;
  if (typeof id === 'number' && Number.isFinite(id)) return String(Math.trunc(id));
  if (typeof id === 'string' && id.trim()) return id.trim();
  return null;
}

function parseCaption(message: Record<string, unknown>): string {
  return typeof message.caption === 'string' ? message.caption.trim() : '';
}

function submittedAtFromMessage(message: Record<string, unknown>): string {
  const ts = message.date;
  if (typeof ts === 'number' && ts > 0) return new Date(ts * 1000).toISOString();
  return new Date().toISOString();
}

export function extractTelegramImageFileId(message: Record<string, unknown>): string | null {
  const photos = message.photo;
  if (Array.isArray(photos) && photos.length > 0) {
    const largest = photos[photos.length - 1];
    if (isRecord(largest) && typeof largest.file_id === 'string') return largest.file_id;
  }
  const doc = message.document;
  if (isRecord(doc)) {
    const mime = String(doc.mime_type ?? '');
    if (mime.startsWith('image/') && typeof doc.file_id === 'string') return doc.file_id;
  }
  return null;
}

export function extractPartnerCodeHint(text: string | undefined): string | null {
  if (!text?.trim()) return null;
  const s = text.trim();
  const prefix = s.match(/^([A-Z]{3,6})\s*(?:·|\|)/u);
  if (prefix && HANDSHAKE_PARTNER_CODE_RE.test(prefix[1]!)) return prefix[1]!;
  const call = s.match(/\b([A-Z]{3,6})-\d{3}\b/);
  if (call && HANDSHAKE_PARTNER_CODE_RE.test(call[1]!)) return call[1]!;
  const bare = s.match(/\b([A-Z]{3,6})\b/);
  if (bare && HANDSHAKE_PARTNER_CODE_RE.test(bare[1]!)) return bare[1]!;
  const first = s.split(/\s+/)[0];
  return first ? tryPartnerCodeArg(first) : null;
}

export function parseDodCaption(caption: string | undefined): {
  type: DodType;
  platformHint?: string;
  partnerCode?: string;
} {
  const text = (caption ?? '').trim();
  const partnerCode = extractPartnerCodeHint(text) ?? undefined;
  const cmd = text.match(
    /(?:^|\s)\/?dod\s+(balance|slip|receipt|id|location|device)(?:\s+(\S+))?/i
  );
  if (cmd) {
    return {
      type: cmd[1]!.toLowerCase() as DodType,
      platformHint: cmd[2]?.trim() || undefined,
      partnerCode,
    };
  }
  for (const t of DOD_TYPES) {
    if (new RegExp(`^${t}\\b`, 'i').test(text)) {
      return { type: t, partnerCode };
    }
  }
  return { type: 'slip', partnerCode };
}

function houseTopicKey(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, '-');
}

export async function resolveAccountingForumTarget(
  db: Database,
  message: Record<string, unknown>,
  opts: Pick<AccountingDodIngestDeps, 'forumsMetaDir' | 'houseMetaDir' | 'accountingChatId'> = {}
): Promise<AccountingForumTarget | null> {
  const chatId = parseChatId(message);
  if (!chatId) return null;
  const threadId = parseThreadId(message);
  const reg = packageGroupRegistryByChatId(db).get(chatId);
  if (reg) {
    const meta = await loadPackageGroupForumMetadata(reg.partnerCode, {
      rootDir: opts.forumsMetaDir ?? PACKAGE_GROUP_FORUMS_META_DIR,
    });
    const map = meta?.topicsThreadMap ?? (meta ? packageGroupTopicsThreadMap(meta.topics) : null);
    const accountingThread = map?.[PACKAGE_GROUP_ACCOUNTING_TOPIC_KEY];
    if (accountingThread != null && threadId === accountingThread) {
      return {
        kind: 'package',
        chatId,
        threadId,
        topicKey: PACKAGE_GROUP_ACCOUNTING_TOPIC_KEY,
        partnerCode: reg.partnerCode,
      };
    }
    return null;
  }
  const accountingChatId =
    opts.accountingChatId?.trim() || loadTelegramEnv().accountingChatId?.trim() || null;
  const houseMeta = await loadHouseForumMetadata(DEFAULT_ACCOUNTING_SURFACE, {
    rootDir: opts.houseMetaDir ?? HOUSE_FORUMS_META_DIR,
  });
  const houseChatId = houseMeta?.chatId ?? accountingChatId;
  if (!houseChatId || chatId !== houseChatId) return null;
  const map = houseMeta?.topicsThreadMap ?? {};
  for (const title of ALL_ACCOUNTING_FORUM_TOPICS) {
    const key = houseTopicKey(title);
    const tid = map[key];
    if (tid != null && threadId === tid) {
      return { kind: 'house', chatId, threadId, topicKey: key };
    }
  }
  return null;
}

export function resolveIngestAgentId(
  db: Database,
  telegramUserId: string, // brand-ok — Telegram user id wire
  partnerCode?: string | null
): string | null {
  const node = findFlowNodeByTelegram(db, telegramUserId);
  if (node?.id) return node.id;
  const code = partnerCode?.trim().toUpperCase();
  if (!code || !HANDSHAKE_PARTNER_CODE_RE.test(code)) return null;
  // Prefer seats with a real telegram_id, any active node type under the CODE.
  const row = db
    .query(
      `SELECT id FROM tree_nodes
       WHERE active = 1
         AND (
           UPPER(COALESCE(call_sign, '')) = $c
           OR UPPER(COALESCE(call_sign, '')) LIKE $prefix
           OR UPPER(id) = $c
         )
       ORDER BY CASE
         WHEN telegram_id IS NOT NULL AND telegram_id NOT LIKE 'pending-%' THEN 0
         ELSE 1
       END
       LIMIT 1`
    )
    .get({ $c: code, $prefix: `${code}-%` }) as { id: string } | null; // brand-ok — tree_nodes PK
  return row?.id ?? null;
}

export function findDodByTelegramMessage(
  db: Database,
  chatId: string, // brand-ok — Telegram chat_id wire
  messageId: number
): { id: DodId } | null {
  const row = db
    .query(
      `SELECT id FROM dod_submissions
       WHERE telegram_chat_id = $chat AND telegram_message_id = $msg
       LIMIT 1`
    )
    .get({ $chat: chatId, $msg: messageId }) as { id?: unknown } | null;
  return row ? { id: parseDodId(row.id) } : null;
}

function successReply(
  verification: DODVerification,
  submission: DODSubmission,
  target: AccountingForumTarget
): string {
  const link = telegramMessageDeepLink({
    chatId: submission.telegramChatId,
    messageId: submission.telegramMessageId,
    threadId: submission.telegramThreadId,
    username: submission.telegramUsername,
  });
  const parts = [
    `✅ DOD queued · <code>${verification.dodId.slice(0, 8)}</code>`,
    `type <b>${submission.type}</b> · status <b>${verification.status}</b>`,
  ];
  if (target.partnerCode) parts.push(`CODE <b>${Bun.escapeHTML(target.partnerCode)}</b>`);
  if (link) parts.push(`<a href="${Bun.escapeHTML(link)}">Open message</a>`);
  parts.push(`Review: /portal/dod/`);
  return parts.join('\n');
}

export async function ingestAccountingDodPhoto(
  message: Record<string, unknown>,
  deps: AccountingDodIngestDeps
): Promise<AccountingDodIngestResult> {
  const noop = { handled: false, replyText: '' };
  const fileId = extractTelegramImageFileId(message);
  if (!fileId) return noop;
  const target = await resolveAccountingForumTarget(deps.db, message, deps);
  if (!target) return noop;
  const chatId = target.chatId;
  const messageId = parseMessageId(message);
  if (messageId == null) return noop;
  const caption = parseCaption(message);
  const parsed = parseDodCaption(caption);
  let partnerCode = parsed.partnerCode ?? target.partnerCode ?? null;
  if (target.kind === 'house' && !partnerCode) {
    return {
      handled: true,
      replyText:
        '⚠️ House Accounting photo requires partner CODE in caption (e.g. <code>ASH · slip</code> or <code>BIL-001</code>).',
    };
  }
  if (target.kind === 'package' && !partnerCode) partnerCode = target.partnerCode ?? null;
  const existing = findDodByTelegramMessage(deps.db, chatId, messageId);
  if (existing) {
    return {
      handled: true,
      duplicate: true,
      dodId: existing.id,
      replyText: `ℹ️ Already ingested · <code>${existing.id.slice(0, 8)}</code>`,
    };
  }
  const from = message.from;
  const telegramUserId = isRecord(from) && from.id != null ? String(from.id) : '';
  const agentId = resolveIngestAgentId(deps.db, telegramUserId, partnerCode);
  if (!agentId) {
    return {
      handled: true,
      replyText:
        '⚠️ Could not resolve agent — link Telegram via <code>/register</code> or post from a registered seat.',
    };
  }
  try {
    const download = deps.downloadFile ?? downloadTelegramFile;
    const rawImage = await download(deps.token, fileId);
    const chat = message.chat;
    const username =
      isRecord(chat) && typeof chat.username === 'string' ? chat.username : undefined;
    const submission: DODSubmission = {
      id: Bun.randomUUIDv7(),
      agentId,
      type: parsed.type,
      rawImage,
      submittedAt: submittedAtFromMessage(message),
      partnerCode: partnerCode ?? undefined,
      telegramChatId: chatId,
      telegramMessageId: messageId,
      telegramThreadId: target.threadId,
      telegramUsername: username,
      telegramTopic: target.topicKey,
      ...(parsed.platformHint ? { platformHint: parsed.platformHint } : {}),
    };
    const processSubmission =
      deps.processSubmission ??
      (async (sub, o) => {
        using verifier = new DODVerifier(o.dbPath, {
          evidenceRoot: o.evidenceRoot,
          registryPath: o.registryPath,
        });
        return verifier.process(sub);
      });
    const verification = await processSubmission(submission, {
      dbPath: deps.dbPath,
      evidenceRoot: deps.evidenceRoot,
      registryPath: deps.registryPath,
    });
    if (!deps.skipMediaRecord) {
      await recordChatImage(deps.db, {
        chatId,
        messageId,
        fileId,
        purpose: 'proof',
        caption: caption || undefined,
        callSign: partnerCode ? `${partnerCode}-001` : undefined,
        createdAt: submission.submittedAt,
      });
    }
    return {
      handled: true,
      dodId: verification.dodId,
      replyText: successReply(verification, submission, {
        ...target,
        partnerCode: partnerCode ?? undefined,
      }),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { handled: true, replyText: `❌ DOD ingest failed: ${Bun.escapeHTML(msg)}` };
  }
}
