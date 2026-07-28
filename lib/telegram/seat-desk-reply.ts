// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://core.telegram.org/bots/api#forcereply — ForceReply send-to prompts
/**
 * Seat desk free-text intake — ForceReply replies + pipe lines in topic.
 * @see docs/harness/tenants/seat-capital-desk.md
 */
import {
  formatOutId,
  formatFreeplayPct,
  loadSeatIntake,
  normalizeSeatIntake,
  parsePaymentLine,
  patchSeatOut,
  publishSeatCapitalDesk,
  saveSeatIntake,
  type SeatIntakeRecord,
} from './seat-capital-desk.ts';
import { formatMaxBetSetConfirm, tryLookupBookMaxForOut } from './seat-desk-book-max.ts';
import {
  clearSeatDeskPending,
  getSeatDeskPending,
  type SeatDeskPendingAction,
} from './seat-desk-pending.ts';

export type SeatDeskReplyResult =
  | { handled: false }
  | { handled: true; ok: boolean; message: string; callSign?: string };

const SEND_TO_MAX_LEN = 64;
const BOOK_LOGIN_MAX_LEN = 48;
const MAX_BET_MAX_LEN = 24;
const FREEPLAY_MAX_LEN = 16;

export function validateSendTo(raw: string): string | null {
  const t = raw.trim();
  if (!t || t.length > SEND_TO_MAX_LEN) return null;
  if (/^\s+$/.test(t)) return null;
  return t;
}

export function validateBookLogin(raw: string): string | null {
  const t = raw.trim();
  if (!t || t.length > BOOK_LOGIN_MAX_LEN) return null;
  if (/^\s+$/.test(t)) return null;
  return t;
}

export function validateMaxBet(raw: string): string | null {
  const t = raw.trim();
  if (!t || t.length > MAX_BET_MAX_LEN) return null;
  if (/^\s+$/.test(t)) return null;
  return t;
}

export function validateFreeplay(raw: string): string | null {
  const t = raw.trim();
  if (!t || t.length > FREEPLAY_MAX_LEN) return null;
  if (/^\s+$/.test(t)) return null;
  return formatFreeplayPct(t);
}

/** Parse `SPEN-1 | Venmo | @handle` or `DEFAULT | CashApp | $sign`. */
export function parseSeatDeskPipeLine(
  text: string,
  record: SeatIntakeRecord
): { outId?: string; paymentRail?: string; sendTo?: string } | null {
  // brand-ok — seat out token
  const t = text.trim();
  if (!t.includes('|')) return null;

  const parts = t
    .split('|')
    .map(s => s.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;

  if (parts[0]!.toUpperCase() === 'DEFAULT') {
    const parsed = parsePaymentLine(parts.slice(1).join(' | '));
    if (!parsed.paymentRail && !parsed.sendTo && parts.length >= 2) {
      return {
        paymentRail: parsePaymentLine(parts[1]!).paymentRail,
        sendTo: parts[2]?.trim() || parsePaymentLine(parts.slice(1).join(' ')).sendTo,
      };
    }
    return parsed;
  }

  if (/^[A-Z]{2,12}-\d+$/.test(parts[0]!.toUpperCase())) {
    return {
      outId: parts[0]!.toUpperCase(),
      ...parsePaymentLine(parts.slice(1).join(' | ')),
    };
  }

  if (/^\d+$/.test(parts[0]!)) {
    const n = Number.parseInt(parts[0]!, 10);
    if (n > 0) {
      return {
        outId: formatOutId(record.partnerCode, n - 1),
        ...parsePaymentLine(parts.slice(1).join(' | ')),
      };
    }
  }

  return null;
}

function authDeskChat(record: SeatIntakeRecord, chatId: string): boolean {
  // brand-ok — Telegram chat_id wire
  const deskChat = record.desk?.chatId;
  if (!deskChat) return false;
  return String(deskChat) === String(chatId);
}

async function applyPipeLineAndPublish(
  token: string,
  record: SeatIntakeRecord,
  parsed: { outId?: string; paymentRail?: string; sendTo?: string } // brand-ok — seat out token
): Promise<SeatDeskReplyResult> {
  let next = record;
  if (parsed.outId) {
    next = patchSeatOut(next, parsed.outId, {
      paymentRail: parsed.paymentRail ?? undefined,
      sendTo: parsed.sendTo ?? undefined,
    });
  } else {
    next = {
      ...next,
      ...(parsed.paymentRail ? { defaultPaymentRail: parsed.paymentRail } : {}),
      ...(parsed.sendTo ? { defaultSendTo: parsed.sendTo } : {}),
    };
  }
  await saveSeatIntake(next);
  await publishSeatCapitalDesk({ token, record: next });
  return {
    handled: true,
    ok: true,
    message: `Updated ${next.callSign} desk.`,
    callSign: next.callSign,
  };
}

export async function handleSeatDeskReply(opts: {
  token: string;
  userId: string; // brand-ok
  chatId: string; // brand-ok
  text: string;
  replyToMessageId?: number;
  messageThreadId?: number;
}): Promise<SeatDeskReplyResult> {
  const pending = await getSeatDeskPending(opts.userId);
  if (pending) {
    const result = await handlePendingReply(opts, pending);
    if (result.handled) return result;
  }

  const trimmed = opts.text.trim();
  if (!trimmed.includes('|')) return { handled: false };

  const callSignMatch = trimmed.match(/([A-Z]{2,12}-\d{3})/i);
  const startsWithOutNum = /^\d+\s*\|/.test(trimmed);
  const callSign = callSignMatch?.[1]?.toUpperCase();
  if (!callSign && !trimmed.toUpperCase().startsWith('DEFAULT') && !startsWithOutNum) {
    return { handled: false };
  }

  const targetCallSign =
    callSign ?? (await findCallSignForDeskChat(opts.chatId, opts.messageThreadId));
  if (!targetCallSign) return { handled: false };

  const record = await loadSeatIntake(targetCallSign);
  if (!record || !authDeskChat(record, opts.chatId)) return { handled: false };

  const parsed = parseSeatDeskPipeLine(trimmed, record);
  if (!parsed || (!parsed.outId && !parsed.paymentRail && !parsed.sendTo)) {
    return { handled: false };
  }

  return applyPipeLineAndPublish(opts.token, record, parsed);
}

async function findCallSignForDeskChat(
  chatId: string, // brand-ok
  threadId?: number
): Promise<string | null> {
  const dir = 'reports/telegram/seat-intake';
  const glob = new Bun.Glob('*.json');
  for await (const rel of glob.scan(dir)) {
    const file = Bun.file(`${dir}/${rel}`);
    try {
      const record = normalizeSeatIntake((await file.json()) as SeatIntakeRecord);
      if (
        record.desk?.chatId === chatId &&
        (threadId == null || record.desk.messageThreadId === threadId)
      ) {
        return record.callSign;
      }
    } catch {
      /* skip */
    }
  }
  return null;
}

async function handlePendingReply(
  opts: {
    token: string;
    userId: string; // brand-ok
    chatId: string; // brand-ok
    text: string;
    replyToMessageId?: number;
  },
  pending: SeatDeskPendingAction
): Promise<SeatDeskReplyResult> {
  if (String(opts.chatId) !== pending.chatId) return { handled: false };
  if (opts.replyToMessageId !== pending.promptMessageId) return { handled: false };

  const sendTo = pending.field === 'sendTo' ? validateSendTo(opts.text) : null;
  const bookLogin = pending.field === 'bookLogin' ? validateBookLogin(opts.text) : null;
  const maxBet = pending.field === 'maxBet' ? validateMaxBet(opts.text) : null;
  const freeplay = pending.field === 'freeplay' ? validateFreeplay(opts.text) : null;
  if (pending.field === 'sendTo' && !sendTo) {
    return { handled: true, ok: false, message: 'Invalid send-to (max 64 chars).' };
  }
  if (pending.field === 'bookLogin' && !bookLogin) {
    return { handled: true, ok: false, message: 'Invalid username (max 48 chars).' };
  }
  if (pending.field === 'maxBet' && !maxBet) {
    return { handled: true, ok: false, message: 'Invalid max bet (max 24 chars).' };
  }
  if (pending.field === 'freeplay' && !freeplay) {
    return { handled: true, ok: false, message: 'Invalid freeplay % (max 16 chars).' };
  }

  const record = await loadSeatIntake(pending.callSign);
  if (!record) {
    await clearSeatDeskPending(opts.userId);
    return { handled: true, ok: false, message: 'Intake record missing.' };
  }

  const next =
    pending.field === 'sendTo'
      ? patchSeatOut(record, pending.outId, { sendTo: sendTo! })
      : pending.field === 'bookLogin'
        ? patchSeatOut(record, pending.outId, { bookLogin: bookLogin! })
        : pending.field === 'maxBet'
          ? patchSeatOut(record, pending.outId, { maxBet: maxBet! })
          : patchSeatOut(record, pending.outId, { freeplay: freeplay! });
  await saveSeatIntake(next);
  await publishSeatCapitalDesk({ token: opts.token, record: next });
  await clearSeatDeskPending(opts.userId);

  let maxBetMessage = `${pending.outId} max bet set.`;
  if (pending.field === 'maxBet' && maxBet) {
    const compare = tryLookupBookMaxForOut(next, pending.outId);
    maxBetMessage = formatMaxBetSetConfirm({
      outId: pending.outId,
      deskMaxBet: maxBet,
      bookMax: compare?.bookMax ?? null,
    });
  }

  const fieldDone: Record<SeatDeskPendingAction['field'], string> = {
    sendTo: `${pending.outId} send-to set.`,
    bookLogin: `${pending.outId} username set.`,
    maxBet: maxBetMessage,
    freeplay: `${pending.outId} freeplay % set.`,
  };

  return {
    handled: true,
    ok: true,
    message: fieldDone[pending.field],
    callSign: pending.callSign,
  };
}
