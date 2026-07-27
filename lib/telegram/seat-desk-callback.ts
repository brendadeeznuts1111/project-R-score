/**
 * Seat capital desk callback handler — async Telegram I/O (sd:* grammar).
 * @see https://core.telegram.org/bots/api#callbackquery — inline callback entry
 * @see docs/harness/tenants/seat-capital-desk.md
 */
import {
  loadSeatIntake,
  outSequenceNumber,
  patchSeatOut,
  publishSeatCapitalDesk,
  saveSeatIntake,
  findSeatOutIndex,
  type SeatIntakeRecord,
} from './seat-capital-desk.ts';
import {
  buildSeatDeskFieldPickerMarkup,
  buildSeatDeskRailPickerMarkup,
  buildSeatDeskRootMarkup,
  isSeatDeskCallback,
  parseSeatDeskCallback,
  SEAT_DESK_RAIL_CODES,
} from './seat-desk-markup.ts';
import {
  seatDeskPendingExpiry,
  setSeatDeskPending,
  type SeatDeskPendingAction,
} from './seat-desk-pending.ts';
import { editMessageReplyMarkup, sendTelegramBotMessage } from './telegram-api.ts';

export type SeatDeskCallbackContext = {
  token: string;
  data: string;
  chatId: string; // brand-ok
  messageId: number;
  userId: string; // brand-ok
  messageThreadId?: number;
};

export type SeatDeskCallbackResult = {
  ok: boolean;
  toast: string;
};

function outNumLabel(record: SeatIntakeRecord, outId: string): string {
  // brand-ok — seat out token
  try {
    return outSequenceNumber(findSeatOutIndex(record, outId));
  } catch {
    return outId;
  }
}

function authDeskMessage(record: SeatIntakeRecord, chatId: string): boolean {
  // brand-ok — Telegram chat_id wire
  if (!record.desk?.chatId) return false;
  return String(record.desk.chatId) === String(chatId);
}

async function loadAuthorizedIntake(
  callSign: string,
  chatId: string // brand-ok — Telegram chat_id wire
): Promise<SeatIntakeRecord | null> {
  const record = await loadSeatIntake(callSign);
  if (!record || !authDeskMessage(record, chatId)) return null;
  return record;
}

async function editDeskMarkup(
  token: string,
  record: SeatIntakeRecord,
  markup: Record<string, unknown>
): Promise<boolean> {
  const desk = record.desk;
  if (!desk?.messageId) return false;
  const r = await editMessageReplyMarkup(token, {
    chatId: desk.chatId,
    messageId: desk.messageId,
    replyMarkup: markup,
  });
  return r.ok;
}

async function promptSeatDeskForceReply(
  ctx: SeatDeskCallbackContext,
  record: SeatIntakeRecord,
  parsed: { callSign: string; outId: string }, // brand-ok — seat out token
  field: SeatDeskPendingAction['field'],
  opts: { prompt: string; placeholder: string }
): Promise<SeatDeskCallbackResult> {
  const threadId = ctx.messageThreadId ?? record.desk?.messageThreadId;
  const sent = await sendTelegramBotMessage(ctx.token, {
    chatId: ctx.chatId,
    text: opts.prompt,
    parseMode: 'HTML',
    messageThreadId: threadId,
    forceReply: {
      selective: true,
      input_field_placeholder: opts.placeholder,
    },
  });
  if (!sent.ok || sent.messageId == null) {
    return { ok: false, toast: sent.description ?? 'Could not send prompt.' };
  }
  await setSeatDeskPending(ctx.userId, {
    callSign: parsed.callSign,
    outId: parsed.outId,
    field,
    promptMessageId: sent.messageId,
    chatId: ctx.chatId,
    threadId: threadId ?? record.desk!.messageThreadId,
    expiresAt: seatDeskPendingExpiry(),
  });
  const ok = await editDeskMarkup(ctx.token, record, buildSeatDeskRootMarkup(record));
  const fieldLabels: Record<SeatDeskPendingAction['field'], string> = {
    sendTo: 'send-to',
    bookLogin: 'username',
    maxBet: 'max bet',
    freeplay: 'freeplay %',
  };
  return {
    ok: sent.ok,
    toast: ok ? `Reply to the prompt with ${fieldLabels[field]}` : 'Prompt sent.',
  };
}

export async function handleSeatDeskCallback(
  ctx: SeatDeskCallbackContext
): Promise<SeatDeskCallbackResult | null> {
  if (!isSeatDeskCallback(ctx.data)) return null;

  const parsed = parseSeatDeskCallback(ctx.data);
  if (!parsed) {
    return { ok: false, toast: 'Unknown desk action.' };
  }

  if (parsed.op === 'refresh') {
    const record = await loadAuthorizedIntake(parsed.callSign, ctx.chatId);
    if (!record) return { ok: false, toast: 'Desk not found for this chat.' };
    await publishSeatCapitalDesk({ token: ctx.token, record, pin: false });
    return { ok: true, toast: 'Desk refreshed.' };
  }

  if (parsed.op === 'back') {
    const record = await loadAuthorizedIntake(parsed.callSign, ctx.chatId);
    if (!record) return { ok: false, toast: 'Desk not found.' };
    const ok = await editDeskMarkup(ctx.token, record, buildSeatDeskRootMarkup(record));
    return { ok, toast: ok ? 'Back' : 'Could not update keyboard.' };
  }

  if (parsed.op === 'fill') {
    const record = await loadAuthorizedIntake(parsed.callSign, ctx.chatId);
    if (!record) return { ok: false, toast: 'Desk not found.' };
    const ok = await editDeskMarkup(
      ctx.token,
      record,
      buildSeatDeskFieldPickerMarkup(parsed.callSign, parsed.outId, record)
    );
    return {
      ok,
      toast: ok
        ? `Out ${outNumLabel(record, parsed.outId)} — choose field`
        : 'Keyboard update failed.',
    };
  }

  if (parsed.op === 'pick' && parsed.field === 'rail') {
    const record = await loadAuthorizedIntake(parsed.callSign, ctx.chatId);
    if (!record) return { ok: false, toast: 'Desk not found.' };
    const ok = await editDeskMarkup(
      ctx.token,
      record,
      buildSeatDeskRailPickerMarkup(parsed.callSign, parsed.outId)
    );
    return { ok, toast: ok ? 'Pick deposit method' : 'Keyboard update failed.' };
  }

  if (parsed.op === 'pick' && parsed.field === 'send') {
    const record = await loadAuthorizedIntake(parsed.callSign, ctx.chatId);
    if (!record) return { ok: false, toast: 'Desk not found.' };
    const num = outNumLabel(record, parsed.outId);
    return promptSeatDeskForceReply(ctx, record, parsed, 'sendTo', {
      prompt: `Out ${num} send-to — reply with @handle, $cashtag, or email:`,
      placeholder: `${num} @handle or email`,
    });
  }

  if (parsed.op === 'pick' && parsed.field === 'user') {
    const record = await loadAuthorizedIntake(parsed.callSign, ctx.chatId);
    if (!record) return { ok: false, toast: 'Desk not found.' };
    return promptSeatDeskForceReply(ctx, record, parsed, 'bookLogin', {
      prompt: `Out ${outNumLabel(record, parsed.outId)} username — reply with book login:`,
      placeholder: `${outNumLabel(record, parsed.outId)} book login`,
    });
  }

  if (parsed.op === 'pick' && parsed.field === 'max') {
    const record = await loadAuthorizedIntake(parsed.callSign, ctx.chatId);
    if (!record) return { ok: false, toast: 'Desk not found.' };
    const num = outNumLabel(record, parsed.outId);
    return promptSeatDeskForceReply(ctx, record, parsed, 'maxBet', {
      prompt: `Out ${num} max bet — reply with limit (e.g. 500, $1k):`,
      placeholder: `${num} max bet`,
    });
  }

  if (parsed.op === 'pick' && parsed.field === 'fp') {
    const record = await loadAuthorizedIntake(parsed.callSign, ctx.chatId);
    if (!record) return { ok: false, toast: 'Desk not found.' };
    const num = outNumLabel(record, parsed.outId);
    return promptSeatDeskForceReply(ctx, record, parsed, 'freeplay', {
      prompt: `Out ${num} freeplay % — reply with deposit match (e.g. 25 or 25%):`,
      placeholder: `${num} fp%`,
    });
  }

  if (parsed.op === 'setRail') {
    const record = await loadAuthorizedIntake(parsed.callSign, ctx.chatId);
    if (!record) return { ok: false, toast: 'Desk not found.' };
    const railName = SEAT_DESK_RAIL_CODES[parsed.railCode];
    if (!railName) return { ok: false, toast: 'Unknown rail.' };
    const next = patchSeatOut(record, parsed.outId, { paymentRail: railName });
    await saveSeatIntake(next);
    await publishSeatCapitalDesk({ token: ctx.token, record: next, pin: false });
    return {
      ok: true,
      toast: `Out ${outNumLabel(record, parsed.outId)} deposit method: ${railName}`,
    };
  }

  return { ok: false, toast: 'Unknown action.' };
}

export { isSeatDeskCallback } from './seat-desk-markup.ts';
