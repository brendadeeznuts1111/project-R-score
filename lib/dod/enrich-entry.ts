// @see https://bun.com/docs/runtime/image#metadata — Bun.Image.metadata()
// @see https://bun.com/reference/bun/Image/Format — Bun.Image.Format
// @released Bun.Image.Format · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://core.telegram.org/api/links — t.me/c private message links
/**
 * Portal / bake enrichment for DOD queue rows:
 * accounting figure, Telegram message deep-link, stripped Bun.Image metadata.
 */

import { expectedAmountFromRow, reconcileDodAmounts } from './reconcile.ts';
import { isBunImageFormat } from '../image-metadata.ts';

/** First plausible dollar amount in OCR text, e.g. "$12,345.67" → 12345.67. */
export function extractAccountingAmount(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const m = text.match(/\$\s?([\d,]+(?:\.\d{1,2})?)/);
  if (!m) return undefined;
  const n = Number(m[1]!.replace(/,/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

/** Agent-learning strip of Bun.Image.metadata() — no full EXIF dump. */
export type DodImageMetaStrip = {
  width: number | null;
  height: number | null;
  format: Bun.Image.Format | null;
  /** Encoded byte length when known (storage / evidence). */
  size?: number | null;
  exif: {
    dateTimeOriginal?: string;
    software?: string;
    deviceModel?: string;
  };
  gps: { lat: number; lng: number } | null;
  /** True when EXIF was absent (typical phone screenshot). */
  missingExif: boolean;
};

export type TelegramMessageLinkInput = {
  chatId?: string | number | null; // brand-ok — Telegram Bot API chat id (opaque wire)
  messageId?: string | number | null; // brand-ok — Telegram message id (opaque wire)
  threadId?: string | number | null; // brand-ok — Telegram forum topic / thread id
  /** Public @username channel/group (no @). */
  username?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  return s ? s : null;
}

/**
 * Strip Bun.Image.metadata() (or a partial object) to a stable learning shape.
 */
export function parseBunImageMetaStrip(meta: unknown): DodImageMetaStrip | null {
  if (!isRecord(meta)) return null;
  const width = parseFiniteNumber(meta.width);
  const height = parseFiniteNumber(meta.height);
  const rawFormat = parseNonEmptyString(meta.format)?.toLowerCase();
  const format = isBunImageFormat(rawFormat) ? rawFormat : null;
  const size = parseFiniteNumber(meta.size);

  const exifRaw = isRecord(meta.exif) ? meta.exif : null;
  const device = exifRaw && isRecord(exifRaw.Device) ? exifRaw.Device : null;
  const dateTimeOriginal =
    parseNonEmptyString(exifRaw?.DateTimeOriginal) ??
    parseNonEmptyString(exifRaw?.dateTimeOriginal);
  const software = parseNonEmptyString(exifRaw?.Software) ?? parseNonEmptyString(exifRaw?.software);
  const deviceModel =
    parseNonEmptyString(device?.Model) ??
    parseNonEmptyString(exifRaw?.deviceModel) ??
    parseNonEmptyString(meta.deviceModel);

  const gpsRaw = isRecord(meta.gps) ? meta.gps : null;
  const lat = parseFiniteNumber(gpsRaw?.lat ?? gpsRaw?.latitude ?? meta.geo_lat);
  const lng = parseFiniteNumber(gpsRaw?.lng ?? gpsRaw?.longitude ?? meta.geo_lng);
  const gps = lat != null && lng != null ? { lat, lng } : null;

  const missingExif = !dateTimeOriginal && !software && !deviceModel;

  if (width == null && height == null && !format && missingExif && !gps) return null;

  return {
    width,
    height,
    format,
    size,
    exif: {
      ...(dateTimeOriginal ? { dateTimeOriginal } : {}),
      ...(software ? { software } : {}),
      ...(deviceModel ? { deviceModel } : {}),
    },
    gps,
    missingExif,
  };
}

/**
 * Build a Telegram deep link to the message (and forum topic when present).
 * Supergroup/channel Bot API ids (`-100…`) become `t.me/c/{idWithoutPrefix}/…`.
 */
export function telegramMessageDeepLink(input: TelegramMessageLinkInput): string | null {
  const messageId = parseFiniteNumber(input.messageId);
  if (messageId == null || messageId <= 0 || !Number.isInteger(messageId)) return null;

  const username = parseNonEmptyString(input.username)?.replace(/^@/, '');
  const threadId = parseFiniteNumber(input.threadId);
  const threadSeg =
    threadId != null && threadId > 0 && Number.isInteger(threadId) ? `${threadId}/` : '';

  if (username && /^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(username)) {
    return `https://t.me/${username}/${threadSeg}${messageId}`;
  }

  const chatRaw = input.chatId;
  if (chatRaw == null || chatRaw === '') return null;
  const chatNum = parseFiniteNumber(chatRaw);
  if (chatNum == null) return null;

  let channelPart: string;
  const abs = Math.abs(chatNum);
  const asStr = String(Math.trunc(chatNum));
  if (asStr.startsWith('-100') && asStr.length > 4) {
    channelPart = asStr.slice(4);
  } else if (chatNum < 0) {
    channelPart = String(abs);
  } else {
    channelPart = String(Math.trunc(abs));
  }
  if (!/^\d{5,}$/.test(channelPart)) return null;

  return `https://t.me/c/${channelPart}/${threadSeg}${messageId}`;
}

/** Enrich a SQLite/bake DOD row for portal boards and agent consumers. */
export function enrichDodEntry(row: Record<string, unknown>): Record<string, unknown> {
  const extracted =
    parseNonEmptyString(row.extracted_text) ?? parseNonEmptyString(row.extractedText) ?? undefined;

  const accountingFromCol = parseFiniteNumber(row.accounting_amount ?? row.accountingAmount);
  const accounting_amount = accountingFromCol ?? extractAccountingAmount(extracted) ?? null;

  const expected_amount = expectedAmountFromRow(row);
  const reconcile = reconcileDodAmounts(expected_amount, accounting_amount);
  const reconciled =
    row.reconciled === 1 || row.reconciled === true
      ? true
      : row.reconciled === 0 || row.reconciled === false
        ? Boolean(row.reconciled)
        : reconcile.reconciled;

  let image_meta: DodImageMetaStrip | null = null;
  if (isRecord(row.image_meta)) {
    image_meta = parseBunImageMetaStrip(row.image_meta);
  } else if (typeof row.image_meta_json === 'string' && row.image_meta_json.trim()) {
    try {
      image_meta = parseBunImageMetaStrip(JSON.parse(row.image_meta_json));
    } catch {
      image_meta = null;
    }
  } else {
    image_meta = parseBunImageMetaStrip({
      width: row.image_width,
      height: row.image_height,
      format: row.image_format,
      size: row.image_size,
      exif: {
        Device: { Model: row.device_model },
        Software: row.image_software,
        DateTimeOriginal: row.image_taken_at,
      },
      gps:
        row.geo_lat != null && row.geo_lng != null ? { lat: row.geo_lat, lng: row.geo_lng } : null,
      deviceModel: row.device_model,
    });
  }

  const telegram_chat_id =
    parseNonEmptyString(row.telegram_chat_id) ??
    (parseFiniteNumber(row.telegram_chat_id) != null
      ? String(parseFiniteNumber(row.telegram_chat_id))
      : parseNonEmptyString(row.telegramChatId));
  const telegram_message_id =
    parseFiniteNumber(row.telegram_message_id) ?? parseFiniteNumber(row.telegramMessageId);
  const telegram_thread_id =
    parseFiniteNumber(row.telegram_thread_id) ?? parseFiniteNumber(row.telegramThreadId);
  const telegram_username =
    parseNonEmptyString(row.telegram_username) ?? parseNonEmptyString(row.telegramUsername);
  const telegram_topic =
    parseNonEmptyString(row.telegram_topic) ?? parseNonEmptyString(row.telegramTopic) ?? null;

  const telegram_deep_link =
    parseNonEmptyString(row.telegram_deep_link) ??
    parseNonEmptyString(row.telegramDeepLink) ??
    telegramMessageDeepLink({
      chatId: telegram_chat_id,
      messageId: telegram_message_id,
      threadId: telegram_thread_id,
      username: telegram_username,
    });

  return {
    ...row,
    accounting_amount,
    expected_amount: reconcile.expected ?? expected_amount,
    reconcile_status: reconcile.status,
    reconcile_delta: reconcile.delta,
    reconcile_banner: reconcile.banner,
    reconciled,
    image_meta,
    telegram_chat_id,
    telegram_message_id,
    telegram_thread_id,
    telegram_username,
    telegram_topic,
    telegram_deep_link,
  };
}

/** Parse wire/SQLite DOD rows into portal-enriched records. */
export function parseDodQueueEntries(rows: unknown[]): Record<string, unknown>[] {
  return rows.filter(isRecord).map(enrichDodEntry);
}

/** @deprecated Use {@link parseDodQueueEntries}. */
export const enrichDodEntries = parseDodQueueEntries;
