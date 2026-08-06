// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Send a Telegram ops signal for a bookmaker / partner desk.
 *
 * Resolves chat_id from:
 * 1) partners-ops.json partner.telegram.chatId (via book outs)
 * 2) ops book contact.telegram / telegramHandle
 * 3) TELEGRAM_DEFAULT_CHAT_ID env fallback
 *
 * @see lib/bookmakers/merge.ts
 * @see public/registry/partners-ops.json
 */

// eslint-disable-next-line no-restricted-imports -- sync partner signal join
import { readFileSync } from 'node:fs';
import { joinPath } from '../path-bun.ts';
import { loadMergedRegistry, type MergedBook, type MergedRegistry } from '../bookmakers/merge.ts';
import { loadTelegramEnv } from '../telegram/telegram-config.ts';
import { sendTelegramBotMessage } from '../telegram/telegram-api.ts';
import { ROOT } from './paths.ts';

const DEFAULT_PARTNERS_OPS = joinPath(ROOT, 'public/registry/partners-ops.json');

/** Normalize env chat ids (`neg-100…` → `-100…`) and bare numeric strings. */
export function normalizeSignalChatId(raw: string): string | null {
  let id = raw.trim();
  if (!id) return null;
  if (/^tg:chat:/i.test(id)) id = id.replace(/^tg:chat:/i, '');
  if (/^neg[-_]?/i.test(id)) id = '-' + id.replace(/^neg[-_]?/i, '');
  if (!/^-?\d+$/.test(id)) return null;
  return id;
}

export type PartnerTelegramTarget = {
  // brand-ok — opaque research/wire id
  chatId: string; // brand-ok — opaque research/wire id
  partnerCode: string | null;
  topicId: number | null;
  source: 'partners-ops' | 'ops-contact' | 'env-default';
};

type OpsPartnerTelegram = {
  code?: string; // brand-ok — opaque research/wire id
  telegram?: { chatId?: string; topicIds?: Record<string, number> }; // brand-ok — opaque research/wire id
  outs?: Array<{ book?: { slug?: string; id?: string } }>; // brand-ok — opaque research/wire id
};

function readPartnersOps(path = DEFAULT_PARTNERS_OPS): OpsPartnerTelegram[] {
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as {
      partners?: OpsPartnerTelegram[];
    };
    return raw.partners ?? [];
  } catch {
    return [];
  }
}

/** book slug/id → preferred telegram target (first partner with a chatId wins). */
export function buildBookTelegramIndex(
  partnersOpsPath = DEFAULT_PARTNERS_OPS
): Record<string, PartnerTelegramTarget> {
  const index: Record<string, PartnerTelegramTarget> = {};
  for (const partner of readPartnersOps(partnersOpsPath)) {
    const rawChat = partner.telegram?.chatId?.trim();
    const chatId = rawChat ? (normalizeSignalChatId(rawChat) ?? rawChat) : '';
    if (!chatId) continue;
    const topicId = partner.telegram?.topicIds?.alerts ?? partner.telegram?.topicIds?.ops ?? null;
    const target: PartnerTelegramTarget = {
      chatId,
      partnerCode: partner.code ?? null,
      topicId: typeof topicId === 'number' ? topicId : null,
      source: 'partners-ops',
    };
    for (const out of partner.outs ?? []) {
      const slug = (out.book?.slug || out.book?.id?.replace(/^book-/, '') || '')
        .trim()
        .toLowerCase();
      if (!slug || index[slug]) continue;
      index[slug] = target;
    }
  }
  return index;
}

export function resolveTelegramTarget( // brand-ok — opaque research/wire id
  partnerId: string, // brand-ok — opaque research/wire id
  opts: {
    registry?: MergedRegistry;
    partnersOpsPath?: string;
    topic?: string;
  } = {}
): PartnerTelegramTarget | null {
  const registry = opts.registry ?? loadMergedRegistry();
  const book =
    registry.books[partnerId] ??
    Object.values(registry.books).find(b => b.slug === partnerId || b.id === partnerId);
  if (!book) return null;

  const index = buildBookTelegramIndex(opts.partnersOpsPath);
  const byOps = index[book.id.toLowerCase()] ?? index[book.slug.toLowerCase()];
  if (byOps) {
    if (opts.topic) {
      const partners = readPartnersOps(opts.partnersOpsPath);
      const partner = partners.find(p => p.code === byOps.partnerCode);
      const topicId = partner?.telegram?.topicIds?.[opts.topic];
      if (typeof topicId === 'number') {
        return { ...byOps, topicId };
      }
    }
    return byOps;
  }

  const handle = book.contact?.telegramHandle ?? book.contact?.telegram ?? null;
  if (handle && String(handle).trim()) {
    const chatId = normalizeSignalChatId(String(handle)) ?? String(handle).trim();
    return {
      chatId,
      partnerCode: null,
      topicId: null,
      source: 'ops-contact',
    };
  }

  const tg = loadTelegramEnv();
  const envChat =
    normalizeSignalChatId(Bun.env.TELEGRAM_DEFAULT_CHAT_ID ?? '') ??
    normalizeSignalChatId(tg.opsChatId ?? '');
  if (envChat) {
    return {
      chatId: envChat,
      partnerCode: null,
      topicId: null,
      source: 'env-default',
    };
  }

  return null;
}

export type SendPartnerSignalResult =
  | {
      ok: true; // brand-ok — opaque research/wire id
      chatId: string; // brand-ok — opaque research/wire id
      partnerCode: string | null;
      source: PartnerTelegramTarget['source'];
      telegramMessageId?: number;
    }
  | { ok: false; status: number; error: string; details?: string };

export async function sendPartnerSignal(input: {
  // brand-ok — opaque research/wire id
  partnerId: string; // brand-ok — opaque research/wire id
  message: string;
  topic?: string;
  registry?: MergedRegistry;
  book?: MergedBook;
}): Promise<SendPartnerSignalResult> {
  const registry = input.registry ?? loadMergedRegistry();
  const book =
    input.book ??
    registry.books[input.partnerId] ??
    Object.values(registry.books).find(b => b.slug === input.partnerId || b.id === input.partnerId);

  if (!book) {
    return { ok: false, status: 404, error: 'Partner not found' };
  }

  const target = resolveTelegramTarget(book.id, {
    registry,
    topic: input.topic,
  });
  if (!target) {
    return { ok: false, status: 404, error: 'No Telegram handle for this partner' };
  }

  const chatId = normalizeSignalChatId(target.chatId) ?? target.chatId;
  const botToken = loadTelegramEnv().effectiveToken;
  if (!botToken) {
    return {
      ok: false,
      status: 500,
      error: 'Telegram bot token not configured (TELEGRAM_BOT_FACTORY or TELEGRAM_BOT_TOKEN)',
    };
  }

  const label = book.label || book.id;
  const text = [
    '🔔 Signal from Bun Agent',
    `Partner: ${label} (\`${book.id}\`)`,
    target.partnerCode ? `Desk: ${target.partnerCode}` : null,
    '',
    input.message,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const sent = await sendTelegramBotMessage(botToken, {
      chatId,
      text,
      parseMode: 'Markdown',
      messageThreadId: typeof target.topicId === 'number' ? target.topicId : undefined,
    });
    if (!sent.ok) {
      console.error('Telegram send failed:', sent.description ?? sent.errorCode);
      return {
        ok: false,
        status: 500,
        error: 'Telegram send failed',
        details: sent.description ?? String(sent.errorCode ?? ''),
      };
    }
    return {
      ok: true,
      chatId,
      partnerCode: target.partnerCode,
      source: target.source,
      telegramMessageId: sent.messageId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 500, error: 'Telegram send failed', details: message };
  }
}
