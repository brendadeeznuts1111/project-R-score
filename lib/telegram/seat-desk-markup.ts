/**
 * Seat capital desk inline keyboards — sd:* callback grammar (≤64 UTF-8 bytes).
 * @see https://core.telegram.org/bots/api#inlinekeyboardbutton — callback_data limit
 * @see https://core.telegram.org/bots/api#copytextbutton — Copy table buttons (≤256 UTF-8 bytes)
 */
import {
  buildSeatDeskTableCopyBody,
  buildSeatDeskTableCopyReplyLine,
  buildSeatDeskTableCopyText,
  buildSeatDeskTodoCopyText,
  formatOutId,
  isSeatOutIncomplete,
  listOutMissingFieldLabels,
  normalizeSeatIntake,
  outSequenceNumber,
  type SeatIntakeRecord,
} from './seat-capital-desk.ts';

/** Telegram CopyTextButton payload limit (Bot API 7.11+). */
export const TELEGRAM_COPY_TEXT_MAX = 256;

/** Split text into chunks ≤ max UTF-8 bytes for InlineKeyboardButton.copy_text. */
export function splitTelegramCopyText(text: string, max = TELEGRAM_COPY_TEXT_MAX): string[] {
  if (callbackDataUtf8ByteLength(text) <= max) return [text];
  const lines = text.split('\n');
  const chunks: string[] = [];
  let current = '';
  for (const line of lines) {
    const next = current ? `${current}\n${line}` : line;
    if (callbackDataUtf8ByteLength(next) > max) {
      if (current) chunks.push(current);
      current = line;
      while (callbackDataUtf8ByteLength(current) > max) {
        current = [...current].slice(0, -1).join('');
      }
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks.length ? chunks : [text.slice(0, max)];
}

export type InlineCallbackBtn = { text: string; callback_data: string };
export type InlineCopyBtn = { text: string; copy_text: { text: string } };
export type InlineBtn = InlineCallbackBtn | InlineCopyBtn;

/** Short rail codes for sd:rail: callbacks. */
export const SEAT_DESK_RAIL_CODES: Record<string, string> = {
  v: 'Venmo',
  c: 'CashApp',
  p: 'PayPal',
  z: 'Zelle',
  a: 'Apple Pay',
};

export const SEAT_DESK_RAIL_CODE_BY_NAME: Record<string, string> = {
  Venmo: 'v',
  CashApp: 'c',
  'Cash App': 'c',
  PayPal: 'p',
  Zelle: 'z',
  'Apple Pay': 'a',
};

export type SeatDeskCallback =
  | { op: 'refresh'; callSign: string }
  | { op: 'back'; callSign: string }
  | { op: 'fill'; callSign: string; outId: string } // brand-ok — seat out token
  | { op: 'pick'; callSign: string; outId: string; field: 'rail' | 'send' | 'user' } // brand-ok
  | { op: 'setRail'; callSign: string; outId: string; railCode: string }; // brand-ok

export function isSeatDeskCallback(data: string): boolean {
  const d = data.trim();
  return d.startsWith('sd:') || d.startsWith('seat:desk:');
}

/** Telegram inline `callback_data` byte length (UTF-8), not display width. */
export function callbackDataUtf8ByteLength(data: string): number {
  return new TextEncoder().encode(data).length;
}

export function parseSeatDeskCallback(data: string): SeatDeskCallback | null {
  const d = data.trim();
  const refresh = /^sd:r:([A-Z0-9-]+)$/i.exec(d);
  if (refresh) return { op: 'refresh', callSign: refresh[1]!.toUpperCase() };

  const back = /^sd:b:([A-Z0-9-]+)$/i.exec(d);
  if (back) return { op: 'back', callSign: back[1]!.toUpperCase() };

  const fill = /^sd:f:([A-Z0-9-]+):([A-Z0-9-]+)$/i.exec(d);
  if (fill) {
    return {
      op: 'fill',
      callSign: fill[1]!.toUpperCase(),
      outId: fill[2]!.toUpperCase(),
    };
  }

  const pick = /^sd:p:([A-Z0-9-]+):([A-Z0-9-]+):(rail|send|user)$/i.exec(d);
  if (pick) {
    return {
      op: 'pick',
      callSign: pick[1]!.toUpperCase(),
      outId: pick[2]!.toUpperCase(),
      field: pick[3]!.toLowerCase() as 'rail' | 'send' | 'user',
    };
  }

  const setRail = /^sd:rail:([A-Z0-9-]+):([A-Z0-9-]+):([a-z])$/i.exec(d);
  if (setRail) {
    return {
      op: 'setRail',
      callSign: setRail[1]!.toUpperCase(),
      outId: setRail[2]!.toUpperCase(),
      railCode: setRail[3]!.toLowerCase(),
    };
  }

  return null;
}

export { isSeatOutIncomplete };

/** Incomplete outs in desk order. */
export function listIncompleteOuts(record: SeatIntakeRecord): SeatOut[] {
  const hydrated = normalizeSeatIntake(record);
  const defRail = hydrated.defaultPaymentRail?.trim();
  const defSend = hydrated.defaultSendTo?.trim();
  const incomplete: SeatOut[] = [];
  for (let i = 0; i < hydrated.outs.length; i++) {
    const out = hydrated.outs[i]!;
    if (isSeatOutIncomplete(out, defRail, defSend)) incomplete.push(out);
  }
  return incomplete;
}

function inlineKeyboard(rows: InlineBtn[][]): Record<string, unknown> {
  return { inline_keyboard: rows };
}

/** Copy-text buttons for desk table (sits above Fill row — not inside table cells). */
export function buildSeatDeskCopyButtonRows(record: SeatIntakeRecord): InlineBtn[][] {
  const tableChunks = splitTelegramCopyText(buildSeatDeskTableCopyBody(record));
  const todoChunks = splitTelegramCopyText(buildSeatDeskTodoCopyText(record));
  const replyText = buildSeatDeskTableCopyReplyLine(record);

  const tableBtns: InlineCopyBtn[] = tableChunks.map((text, i) => ({
    text: tableChunks.length > 1 ? `📋 Table ${i + 1}/${tableChunks.length}` : '📋 Copy table',
    copy_text: { text },
  }));
  const todoBtns: InlineCopyBtn[] = todoChunks.map((text, i) => ({
    text: todoChunks.length > 1 ? `📋 Todo ${i + 1}/${todoChunks.length}` : '📋 Copy todo',
    copy_text: { text },
  }));

  return [[...tableBtns, ...todoBtns, { text: '📋 Copy reply', copy_text: { text: replyText } }]];
}

export function buildSeatDeskRootMarkup(record: SeatIntakeRecord): Record<string, unknown> {
  const callSign = record.callSign.toUpperCase().trim();
  const hydrated = normalizeSeatIntake(record);
  const defRail = hydrated.defaultPaymentRail?.trim();
  const defSend = hydrated.defaultSendTo?.trim();
  const rows: InlineBtn[][] = [...buildSeatDeskCopyButtonRows(record)];

  for (let i = 0; i < hydrated.outs.length; i++) {
    const out = hydrated.outs[i]!;
    if (!isSeatOutIncomplete(out, defRail, defSend)) continue;
    const outId = out.outId ?? formatOutId(record.partnerCode, i);
    rows.push([
      {
        text: `${outSequenceNumber(i)} · Fill`,
        callback_data: `sd:f:${callSign}:${outId}`,
      },
    ]);
  }

  rows.push([{ text: '↻ Refresh', callback_data: `sd:r:${callSign}` }]);
  return inlineKeyboard(rows);
}

export function buildSeatDeskFieldPickerMarkup(
  callSign: string,
  outId: string, // brand-ok — seat out token
  record: SeatIntakeRecord
): Record<string, unknown> {
  const cs = callSign.toUpperCase().trim();
  const oid = outId.toUpperCase().trim();
  const hydrated = normalizeSeatIntake(record);
  const defRail = hydrated.defaultPaymentRail?.trim();
  const defSend = hydrated.defaultSendTo?.trim();
  const out = hydrated.outs.find(o => o.outId === oid);
  const missing = out ? listOutMissingFieldLabels(out, defRail, defSend) : [];
  const row: InlineBtn[] = [];
  if (missing.includes('username')) {
    row.push({ text: 'Username', callback_data: `sd:p:${cs}:${oid}:user` });
  }
  if (missing.includes('deposit method')) {
    row.push({ text: 'Deposit method', callback_data: `sd:p:${cs}:${oid}:rail` });
  }
  if (missing.includes('send-to')) {
    row.push({ text: 'Send-to', callback_data: `sd:p:${cs}:${oid}:send` });
  }
  row.push({ text: '← Back', callback_data: `sd:b:${cs}` });
  return inlineKeyboard([row]);
}

export function buildSeatDeskRailPickerMarkup(
  callSign: string,
  outId: string // brand-ok — seat out token
): Record<string, unknown> {
  const cs = callSign.toUpperCase().trim();
  const oid = outId.toUpperCase().trim();
  const rails: InlineBtn[] = Object.entries(SEAT_DESK_RAIL_CODES).map(([code, name]) => ({
    text: name,
    callback_data: `sd:rail:${cs}:${oid}:${code}`,
  }));
  const rows: InlineBtn[][] = [];
  for (let i = 0; i < rails.length; i += 2) {
    rows.push(rails.slice(i, i + 2));
  }
  rows.push([{ text: '← Back', callback_data: `sd:f:${cs}:${oid}` }]);
  return inlineKeyboard(rows);
}
