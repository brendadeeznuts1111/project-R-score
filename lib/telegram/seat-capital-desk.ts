// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth (via fitVisible / widthOf)
// @see https://bun.com/reference/bun/sliceAnsi — Bun.sliceAnsi (truncate in fitVisible)
// @see https://core.telegram.org/bots/api#inputrichmessage — Bot API 10.1 rich_message
// @see https://core.telegram.org/type/RichText — MTProto RichText (client TL; see rich-message.ts map)
/**
 * Package seat capital desk — one pinned Telegram message per call-sign.
 *
 * **Render modes** (soft-fallback chain in `publishSeatCapitalDesk`)
 * - **rich / blocks** (preferred): `sendRichMessage` / `editMessageText` +
 *   `InputRichMessage.blocks` — typed `RichText` tree ([`rich-message.ts`](./rich-message.ts)),
 *   built by `buildSeatCapitalDeskRichBlocks` / `buildSeatCapitalDeskRichMessage`.
 * - **rich / html** (fallback when `blocks` is rejected as unsupported): same tree
 *   rendered to extended HTML via `serializeRichBlocksToHtml` — see
 *   `formatSeatCapitalDeskRichHtml` / `buildSeatCapitalDeskRichMessageHtml`.
 * - **legacy** (fallback when rich_message itself is unsupported): HTML `parse_mode` +
 *   `<pre>` monospace table (`formatSeatCapitalDeskHtml`).
 *
 * **Bun natives (legacy pre path only)**
 * - [`fitVisible` / `widthOf`](../console-depth.ts) → [`Bun.stringWidth`](https://bun.com/docs/runtime/utils#bun-stringwidth)
 *   for column pad/truncate (emoji / wide chars).
 * - [`Bun.file`](https://bun.com/docs/runtime/file-io#reading-files-bun-file) for intake JSON under `reports/telegram/seat-intake/`.
 *
 * **Interactivity**: inline keyboard under the message (`sd:*` callbacks) — see
 * [`seat-desk-callback.ts`](./seat-desk-callback.ts). Table cells stay display-only.
 *
 * Columns: # · BOOK · USERNAME · DEPOSIT METHOD · SEND TO · MAX BET · FP% DEP (+ STATUS in rich mode). Partner code omitted — desk lives in the partner forum thread. Passwords stay in intake JSON only.
 */
import { bold, escapeHtml } from './templates/escape.ts';
import {
  blockChecklist,
  blockDetails,
  blockDivider,
  blockHeading,
  blockParagraph,
  blockTable,
  buildInputRichMessageBlocks,
  buildInputRichMessageHtml,
  isRichMessageUnsupported,
  rtBold,
  rtConcat,
  rtItalic,
  rtMarked,
  serializeRichBlocksToHtml,
  type InputRichBlock,
  type InputRichMessage,
  type RichText,
  type RichTableCellBlock,
} from './rich-message.ts';
import { loadTelegramEnv } from './telegram-config.ts';
import {
  editTelegramMessage,
  editRichTelegramMessage,
  isTelegramMessageNotModified,
  sendRichTelegramMessage,
  sendTelegramBotMessage,
  telegramApiCall,
} from './telegram-api.ts';
import {
  loadPackageGroupForumMetadata,
  PACKAGE_GROUP_ACCOUNTING_TOPIC_KEY,
  PACKAGE_GROUP_FORUMS_META_DIR,
  PACKAGE_GROUP_LIQUIDITY_OUTS_TOPIC_KEY,
  resolvePackageGroupForumThread,
} from './package-group-forum.ts';
import { DEFAULT_OPS_DB_PATH, openOperationsDb } from '../operations/db.ts';
import { ensurePartnerForumAccounting } from './partner-forum-accounting.ts';
import { fitVisible, widthOf } from '../console-depth.ts';
import { joinPath } from '../path-bun.ts';
import { buildSeatDeskRootMarkup } from './seat-desk-markup.ts';

export const SEAT_INTAKE_DIR = 'reports/telegram/seat-intake';

/** Desk table column header (display label for paymentRail). */
export const SEAT_DESK_DEPOSIT_METHOD_COL = 'DEPOSIT METHOD';
export const SEAT_DESK_MAX_BET_COL = 'MAX BET';
export const SEAT_DESK_FREEPLAY_PCT_COL = 'FP% DEP';
export const SEAT_DESK_PARTNER_COL = 'PARTNER';
export const SEAT_DESK_OUT_NUM_COL = '#';

/** Sequential out number on desk (1-based). */
export function outSequenceNumber(index: number): string {
  return String(index + 1);
}

/** Known CASHOUT rails partners may assign per book. */
export const PAYMENT_RAIL_NAMES = [
  'Cash App',
  'CashApp',
  'Venmo',
  'PayPal',
  'Zelle',
  'Apple Pay',
] as const;

export type SeatOut = {
  /** Sequential out id (e.g. SPEN-1) — one book per out. */
  outId?: string; // brand-ok — seat out token (e.g. SPEN-1)
  /** Sportsbook site / brand (URL or label). */
  book: string;
  /** @deprecated alias for book */
  url?: string;
  /** Book login — shown as USERNAME on desk. */
  bookLogin?: string;
  /** @deprecated use bookLogin */
  user?: string;
  /** Book password — local intake only. */
  password?: string;
  /** CASHOUT rail SPEN assigns for this book (Venmo, CashApp, …). */
  paymentRail?: string;
  /** Handle / email house sends to on that rail (@user, $cashtag, email). */
  sendTo?: string;
  /** @deprecated split into paymentRail + sendTo */
  depositTo?: string;
  /** @deprecated use paymentRail + sendTo */
  depositMethods?: string[] | string;
  note?: string;
  primary?: boolean;
  /** Optional sportsbook balance (informational only — not a FUND gate). */
  balance?: string;
  /** How partner withdraws from this book to CASHOUT rail. */
  withdrawPath?: string;
  /** Per-book max bet limit (e.g. $500, 2.5u). */
  maxBet?: string;
  /** Freeplay match % on deposits (e.g. 100%, 50). */
  freeplay?: string;
  /** Per-out desk override — `deferred` skips FUND pressure / Fill. */
  deskStatus?: 'deferred';
};

export type SeatFundStatus = 'blocked' | 'ready' | 'funded' | 'partial';

/** STATUS column — auto-derived fund states plus manual per-out overrides. */
export type SeatOutDisplayStatus = SeatFundStatus | 'deferred';

export type SeatIntakeRecord = {
  partnerCode: string;
  callSign: string;
  outs: SeatOut[];
  /** Manual override; auto-derived when omitted. */
  fundStatus?: SeatFundStatus;
  defaultPaymentRail?: string;
  defaultSendTo?: string;
  /** @deprecated split into defaultPaymentRail + defaultSendTo */
  defaultDepositTo?: string;
  /** @deprecated use outs[] — merged at load for legacy files */
  primarySeat?: {
    site?: string;
    username?: string;
    password?: string;
  };
  recordedAt?: string;
  desk?: {
    chatId: string; // brand-ok
    messageThreadId: number;
    messageId: number;
    updatedAt: string;
    pinned?: boolean;
  };
};

export function seatIntakePath(callSign: string, rootDir = SEAT_INTAKE_DIR): string {
  return joinPath(rootDir, `${callSign.toUpperCase().trim()}.json`);
}

function outBook(out: SeatOut): string {
  return (out.book ?? out.url ?? '').trim();
}

function outBookLogin(out: SeatOut): string | undefined {
  return (out.bookLogin ?? out.user)?.trim() || undefined;
}

/** Partner-scoped sequential out label: SPEN-1, SPEN-2, … */
export function formatOutId(partnerCode: string, index: number): string {
  return `${partnerCode.toUpperCase().trim()}-${index + 1}`;
}

function normalizeRailLabel(raw: string): string {
  const t = raw.trim();
  if (/^cash\s*app$/i.test(t)) return 'CashApp';
  return t.replace(/\s+/g, ' ');
}

/** Parse per-out desk status (`deferred`, common typo `defered`). */
export function tryParseDeskStatus(raw: string | null | undefined): 'deferred' | undefined {
  if (raw == null || raw === '') return undefined;
  const t = raw.trim().toLowerCase();
  if (t === 'deferred' || t === 'defered') return 'deferred';
  throw new Error(`Invalid desk status "${raw}" — use deferred`);
}

export function isOutDeferred(out: SeatOut): boolean {
  return out.deskStatus === 'deferred';
}

/** Parse partner payment line: `Venmo @x`, `SPEN-1 | Venmo | @x`, or `rail | sendTo`. */
export function parsePaymentLine(raw: string): { paymentRail?: string; sendTo?: string } {
  const t = raw.trim();
  if (!t || t === '—') return {};

  if (t.includes('|')) {
    const parts = t
      .split('|')
      .map(s => s.trim())
      .filter(Boolean);
    if (parts.length >= 3 && /^[A-Z]{2,12}-\d+$/.test(parts[0]!.toUpperCase())) {
      return {
        paymentRail: normalizeRailLabel(parts[1]!),
        sendTo: parts[2]!.trim() || undefined,
      };
    }
    if (parts.length >= 2) {
      return {
        paymentRail: normalizeRailLabel(parts[0]!),
        sendTo: parts[1]!.trim() || undefined,
      };
    }
  }

  for (const rail of PAYMENT_RAIL_NAMES) {
    if (t.toLowerCase().startsWith(rail.toLowerCase())) {
      const sendTo = t.slice(rail.length).trim();
      return { paymentRail: normalizeRailLabel(rail), sendTo: sendTo || undefined };
    }
  }

  return { sendTo: t };
}

function hydrateOutPayment(out: SeatOut): SeatOut {
  const next: SeatOut = {
    ...out,
    book: outBook(out),
    bookLogin: outBookLogin(out),
  };
  if (next.paymentRail?.trim() || next.sendTo?.trim()) return next;
  if (next.depositTo?.trim()) {
    const parsed = parsePaymentLine(next.depositTo);
    return {
      ...next,
      paymentRail: parsed.paymentRail,
      sendTo: parsed.sendTo,
    };
  }
  return next;
}

function assignOutIds(partnerCode: string, outs: SeatOut[]): SeatOut[] {
  const code = partnerCode.toUpperCase().trim();
  return outs.map((out, i) => ({
    ...hydrateOutPayment(out),
    outId: out.outId?.trim() || formatOutId(code, i),
  }));
}

function normalizeOuts(record: SeatIntakeRecord): SeatOut[] {
  const code = record.partnerCode.toUpperCase().trim();
  if (record.outs?.length) {
    return assignOutIds(
      code,
      record.outs.filter(o => outBook(o))
    );
  }
  const seat = record.primarySeat;
  if (seat?.site?.trim()) {
    return assignOutIds(code, [
      {
        book: seat.site.trim(),
        bookLogin: seat.username?.trim(),
        password: seat.password?.trim(),
        primary: true,
      },
    ]);
  }
  return [];
}

function hydrateRecordDefaults(record: SeatIntakeRecord): SeatIntakeRecord {
  if (record.defaultPaymentRail?.trim() || record.defaultSendTo?.trim()) return record;
  if (!record.defaultDepositTo?.trim()) return record;
  const parsed = parsePaymentLine(record.defaultDepositTo);
  return {
    ...record,
    defaultPaymentRail: parsed.paymentRail,
    defaultSendTo: parsed.sendTo,
  };
}

export function normalizeSeatIntake(record: SeatIntakeRecord): SeatIntakeRecord {
  return hydrateRecordDefaults({ ...record, outs: normalizeOuts(record) });
}

export async function loadSeatIntake(
  callSign: string,
  rootDir = SEAT_INTAKE_DIR
): Promise<SeatIntakeRecord | null> {
  const path = seatIntakePath(callSign, rootDir);
  const file = Bun.file(path);
  if (!(await file.exists())) return null;
  try {
    return normalizeSeatIntake((await file.json()) as SeatIntakeRecord);
  } catch {
    return null;
  }
}

export async function saveSeatIntake(
  record: SeatIntakeRecord,
  rootDir = SEAT_INTAKE_DIR
): Promise<string> {
  const path = seatIntakePath(record.callSign, rootDir);
  await Bun.write(path, `${JSON.stringify(normalizeSeatIntake(record), null, 2)}\n`);
  return path;
}

/** Pad/truncate a monospace table cell by visible columns (emoji/ANSI safe). */
function padCell(value: string, cols: number): string {
  return fitVisible(value, cols, { ellipsis: '…' });
}

function pendingCell(value: string | undefined, fallback?: string): string {
  const v = value?.trim() || fallback?.trim();
  return v || '—';
}

function outPaymentRail(out: SeatOut, defaultRail?: string): string {
  return pendingCell(out.paymentRail, defaultRail);
}

function outSendTo(out: SeatOut, defaultSendTo?: string): string {
  return pendingCell(out.sendTo, defaultSendTo);
}

function outUsername(out: SeatOut): string {
  return outBookLogin(out) || '—';
}

/** Display freeplay % on deposits — normalizes bare numbers to `N%`. */
export function formatFreeplayPct(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (/%/.test(t)) return t;
  if (/^\d+(\.\d+)?$/.test(t)) return `${t}%`;
  return t;
}

function outMaxBet(out: SeatOut): string {
  return pendingCell(out.maxBet);
}

function outFreeplayPct(out: SeatOut): string {
  const raw = out.freeplay?.trim();
  if (!raw) return '—';
  return formatFreeplayPct(raw);
}

/** Normalize out id token: `1` → `SPEN-1`, `SPEN-1` unchanged. */
export function resolveOutId(partnerCode: string, token: string): string {
  const t = token.trim().toUpperCase();
  const code = partnerCode.toUpperCase().trim();
  if (/^[A-Z]{2,12}-\d+$/.test(t)) return t;
  const n = Number.parseInt(t, 10);
  if (Number.isFinite(n) && n > 0) return formatOutId(code, n - 1);
  throw new Error(`Invalid out id "${token}" — use SPEN-1 or 1`);
}

export function findSeatOutIndex(record: SeatIntakeRecord, outId: string): number {
  // brand-ok — seat out token
  const normalized = normalizeOuts(record);
  const idx = normalized.findIndex(o => o.outId === outId.toUpperCase().trim());
  if (idx < 0) throw new Error(`Out not found: ${outId}`);
  return idx;
}

export type PatchSeatOutInput = {
  paymentRail?: string | null;
  sendTo?: string | null;
  /** @deprecated splits into paymentRail + sendTo */
  depositTo?: string | null;
  bookLogin?: string | null;
  /** @deprecated use bookLogin */
  user?: string | null;
  note?: string | null;
  balance?: string | null;
  withdrawPath?: string | null;
  maxBet?: string | null;
  freeplay?: string | null;
  deskStatus?: 'deferred' | null;
  primary?: boolean;
};

/** Patch one out by outId; returns updated record (not saved). */
export function patchSeatOut(
  record: SeatIntakeRecord,
  outId: string, // brand-ok — seat out token
  patch: PatchSeatOutInput
): SeatIntakeRecord {
  const resolved = resolveOutId(record.partnerCode, outId);
  const idx = findSeatOutIndex(record, resolved);
  const outs = [...normalizeOuts(record)];
  const current = outs[idx]!;
  const next: SeatOut = { ...current };

  if (patch.depositTo !== undefined) {
    if (patch.depositTo?.trim()) {
      const parsed = parsePaymentLine(patch.depositTo);
      next.paymentRail = parsed.paymentRail;
      next.sendTo = parsed.sendTo;
      next.depositTo = patch.depositTo.trim();
    } else {
      next.paymentRail = undefined;
      next.sendTo = undefined;
      next.depositTo = undefined;
    }
  }
  if (patch.paymentRail !== undefined) {
    next.paymentRail = patch.paymentRail?.trim()
      ? normalizeRailLabel(patch.paymentRail)
      : undefined;
  }
  if (patch.sendTo !== undefined) {
    next.sendTo = patch.sendTo?.trim() || undefined;
  }
  const loginPatch = patch.bookLogin ?? patch.user;
  if (loginPatch !== undefined) {
    next.bookLogin = loginPatch?.trim() || undefined;
    next.user = next.bookLogin;
  }
  if (patch.note !== undefined) {
    next.note = patch.note?.trim() ? patch.note.trim() : undefined;
  }
  if (patch.balance !== undefined) {
    next.balance = patch.balance?.trim() ? patch.balance.trim() : undefined;
  }
  if (patch.withdrawPath !== undefined) {
    next.withdrawPath = patch.withdrawPath?.trim() ? patch.withdrawPath.trim() : undefined;
  }
  if (patch.maxBet !== undefined) {
    next.maxBet = patch.maxBet?.trim() ? patch.maxBet.trim() : undefined;
  }
  if (patch.freeplay !== undefined) {
    next.freeplay = patch.freeplay?.trim() ? formatFreeplayPct(patch.freeplay) : undefined;
  }
  if (patch.deskStatus !== undefined) {
    next.deskStatus = patch.deskStatus ?? undefined;
  }
  if (patch.primary === true) {
    for (const o of outs) o.primary = false;
    next.primary = true;
  } else if (patch.primary === false) {
    next.primary = false;
  }

  outs[idx] = next;
  return { ...record, outs };
}

/** Fill empty paymentRail / sendTo from partner defaults. */
export function applyDefaultPayment(record: SeatIntakeRecord): SeatIntakeRecord {
  const hydrated = hydrateRecordDefaults(record);
  const rail = hydrated.defaultPaymentRail?.trim();
  const sendTo = hydrated.defaultSendTo?.trim();
  if (!rail && !sendTo) return hydrated;
  const outs = normalizeOuts(hydrated).map(out => ({
    ...out,
    paymentRail: out.paymentRail?.trim() || rail,
    sendTo: out.sendTo?.trim() || sendTo,
  }));
  return { ...hydrated, outs };
}

/** Staging send-to placeholder — mirrors ASH `@ash.hr.fl` / NOV `@nov.newpartner` harness pattern. */
export function harnessStagingSendTo(partnerCode: string): string {
  return `@${partnerCode.toLowerCase().trim()}.newpartner`;
}

/** Fill missing default rail/send-to and propagate to outs (single-operator harness). */
export function applyHarnessStagingRails(record: SeatIntakeRecord): SeatIntakeRecord {
  const code = record.partnerCode.toUpperCase().trim();
  const withDefaults: SeatIntakeRecord = {
    ...record,
    defaultPaymentRail: record.defaultPaymentRail?.trim() || 'Venmo',
    defaultSendTo: record.defaultSendTo?.trim() || harnessStagingSendTo(code),
  };
  return applyDefaultPayment(withDefaults);
}

/** Harness book login when partner has not confirmed via Fill yet. */
export function harnessStagingBookLogin(partnerCode: string, outIndex: number): string {
  return `${partnerCode.toLowerCase().trim()}${outIndex + 1}.staging`;
}

const HARNESS_STAGING_TERMS = { maxBet: '500', freeplay: '25%' } as const;

/**
 * Single-operator harness closure — rails, staging logins, default book terms.
 * Does not replace real `@partner` send-tos when already set (e.g. ASH `@ash.hr.fl`).
 */
export function applyHarnessStagingIntake(record: SeatIntakeRecord): SeatIntakeRecord {
  let next = applyHarnessStagingRails(record);
  const code = next.partnerCode.toUpperCase().trim();
  const outs = normalizeOuts(next).map((out, i) => {
    if (isOutDeferred(out)) return out;
    const patched: SeatOut = { ...out };
    if (!outBookLogin(out)) {
      patched.bookLogin = harnessStagingBookLogin(code, i);
      const note = out.note?.trim();
      patched.note = note
        ? `${note} · harness login — replace via Fill Username`
        : 'harness login — replace via Fill Username';
    }
    if (!out.maxBet?.trim()) patched.maxBet = HARNESS_STAGING_TERMS.maxBet;
    if (!out.freeplay?.trim()) patched.freeplay = HARNESS_STAGING_TERMS.freeplay;
    return patched;
  });
  return { ...next, outs };
}

/** @deprecated use applyDefaultPayment */
export const applyDefaultDepositTo = applyDefaultPayment;

const OUT_FIELD_ALIASES: Record<string, keyof PatchSeatOutInput> = {
  rail: 'paymentRail',
  deposit: 'paymentRail',
  depositMethod: 'paymentRail',
  paymentRail: 'paymentRail',
  sendTo: 'sendTo',
  depositTo: 'depositTo',
  bookLogin: 'bookLogin',
  username: 'bookLogin',
  user: 'bookLogin',
  note: 'note',
  balance: 'balance',
  withdrawPath: 'withdrawPath',
  maxBet: 'maxBet',
  maxbet: 'maxBet',
  max_bet: 'maxBet',
  freeplay: 'freeplay',
  freeplayPct: 'freeplay',
  fpPct: 'freeplay',
  status: 'deskStatus',
  deskStatus: 'deskStatus',
};

/** Apply `fundStatus=blocked` or `SPEN-1.rail=Venmo` style field updates. */
export function applyIntakeField(record: SeatIntakeRecord, spec: string): SeatIntakeRecord {
  const eq = spec.indexOf('=');
  if (eq <= 0) throw new Error(`Invalid field spec: ${spec}`);
  const key = spec.slice(0, eq).trim();
  const rawValue = spec.slice(eq + 1).trim();
  const value = rawValue === '' || rawValue === '—' ? null : rawValue;

  if (key === 'fundStatus') {
    if (value && !['blocked', 'ready', 'funded', 'partial'].includes(value)) {
      throw new Error(`Invalid fundStatus: ${value}`);
    }
    return { ...record, fundStatus: (value as SeatFundStatus | null) ?? undefined };
  }

  const dot = key.indexOf('.');
  if (dot > 0) {
    const outToken = key.slice(0, dot);
    const field = key.slice(dot + 1);
    const patchKey = OUT_FIELD_ALIASES[field];
    if (!patchKey) throw new Error(`Unknown out field: ${field}`);
    if (patchKey === 'deskStatus') {
      const deskStatus = value === null ? null : tryParseDeskStatus(value);
      return patchSeatOut(record, outToken, { deskStatus });
    }
    return patchSeatOut(record, outToken, { [patchKey]: value });
  }

  throw new Error(`Unknown field: ${key} (use fundStatus=… or SPEN-1.rail=…)`);
}

export function resolveFundStatus(record: SeatIntakeRecord): {
  status: SeatFundStatus;
  detail: string;
} {
  if (record.fundStatus === 'funded') {
    return { status: 'funded', detail: 'house float sent' };
  }
  if (record.fundStatus === 'partial') {
    return { status: 'partial', detail: 'some books incomplete' };
  }
  if (record.fundStatus === 'ready') {
    return { status: 'ready', detail: 'all books ready — FUND can proceed' };
  }

  const hydrated = hydrateRecordDefaults(record);
  const outs = normalizeOuts(hydrated);
  const lead = outs.find(o => o.primary) ?? outs[0];
  if (!lead) return { status: 'blocked', detail: 'no books on desk' };

  const leadId = lead.outId ?? formatOutId(hydrated.partnerCode, 0);
  const defRail = hydrated.defaultPaymentRail?.trim();
  const defSend = hydrated.defaultSendTo?.trim();
  const rail = lead.paymentRail?.trim() || defRail;
  const send = lead.sendTo?.trim() || defSend;
  if (!rail || !send) {
    return { status: 'blocked', detail: `awaiting deposit method + send-to on ${leadId}` };
  }

  const leadIndex = Math.max(
    0,
    outs.findIndex(o => o.outId === leadId)
  );
  const incompleteOthers = outs.filter((out, i) => {
    if (i === leadIndex) return false;
    if (isOutDeferred(out)) return false;
    return isSeatOutIncomplete(out, defRail, defSend);
  });
  if (incompleteOthers.length > 0) {
    const n = incompleteOthers.length;
    return {
      status: 'partial',
      detail: `lead ready — ${n} book${n === 1 ? '' : 's'} still need fields`,
    };
  }
  return { status: 'ready', detail: 'intake complete — FUND can proceed' };
}

export function formatFundStatusLine(record: SeatIntakeRecord): string {
  const { status, detail } = resolveFundStatus(record);
  return `FUND: ${status} — ${detail}`;
}

export function formatSeatOutList(record: SeatIntakeRecord): string[] {
  const hydrated = hydrateRecordDefaults(record);
  const defRail = hydrated.defaultPaymentRail?.trim();
  const defSend = hydrated.defaultSendTo?.trim();
  const lines = ['# BOOK                         USERNAME   DEPOSIT METHOD  SEND TO'];
  for (let i = 0; i < normalizeOuts(hydrated).length; i++) {
    const out = normalizeOuts(hydrated)[i]!;
    lines.push(
      `${padCell(outSequenceNumber(i), 2)} ${padCell(displayBook(outBook(out)), 24)} ${padCell(outUsername(out), 10)} ${padCell(outPaymentRail(out, defRail), 10)} ${padCell(outSendTo(out, defSend), 16)}`
    );
  }
  if (defRail || defSend) {
    lines.push('', `default deposit method: ${defRail ?? '—'}  send-to: ${defSend ?? '—'}`);
  }
  return lines;
}

/**
 * Reply template line (last line of full copy paste) — targets first incomplete out.
 */
export const SEAT_DESK_PIPE_FORMAT_LINES = [
  '1 | Venmo | @handle',
  'DEFAULT | CashApp | $sign',
] as const;

export function buildSeatDeskTableCopyReplyLine(record: SeatIntakeRecord): string {
  const idx = firstIncompleteOutIndex(record);
  const num = idx != null ? outSequenceNumber(idx) : '1';
  return `Reply: ${num} | Venmo | @handle`;
}

/** Missing fields that block FUND / STATUS / Fill payment flow. */
export function listOutMissingFieldLabels(
  out: SeatOut,
  defaultRail?: string,
  defaultSendTo?: string
): string[] {
  if (isOutDeferred(out)) return [];
  const missing: string[] = [];
  if (outUsername(out) === '—') missing.push('username');
  if (outPaymentRail(out, defaultRail) === '—') missing.push('deposit method');
  if (outSendTo(out, defaultSendTo) === '—') missing.push('send-to');
  return missing;
}

/** Extended todo list — includes book terms (max bet, freeplay %). */
export function listOutTodoMissingFieldLabels(
  out: SeatOut,
  defaultRail?: string,
  defaultSendTo?: string
): string[] {
  const missing = listOutMissingFieldLabels(out, defaultRail, defaultSendTo);
  if (outMaxBet(out) === '—') missing.push('max');
  if (outFreeplayPct(out) === '—') missing.push('fp%');
  return missing;
}

/** True when any desk-visible field is still empty (defaults apply). */
export function isSeatOutIncomplete(
  out: SeatOut,
  defaultRail?: string,
  defaultSendTo?: string
): boolean {
  return listOutMissingFieldLabels(out, defaultRail, defaultSendTo).length > 0;
}

/** True when Fill should offer edits (fund gaps or book terms max/fp%). */
export function isSeatOutFillable(
  out: SeatOut,
  defaultRail?: string,
  defaultSendTo?: string
): boolean {
  if (isOutDeferred(out)) return false;
  return listOutTodoMissingFieldLabels(out, defaultRail, defaultSendTo).length > 0;
}

/** First out (desk order) with missing fields — for copy/reply hints. */
export function firstIncompleteOutIndex(record: SeatIntakeRecord): number | null {
  const hydrated = hydrateRecordDefaults(record);
  const outs = normalizeOuts(hydrated);
  const defRail = hydrated.defaultPaymentRail?.trim();
  const defSend = hydrated.defaultSendTo?.trim();
  for (let i = 0; i < outs.length; i++) {
    const out = outs[i]!;
    if (isOutDeferred(out)) continue;
    if (isSeatOutIncomplete(out, defRail, defSend)) return i;
  }
  return null;
}

/** Copy todo list — outs with missing fields only. */
export function buildSeatDeskTodoCopyText(record: SeatIntakeRecord): string {
  const hydrated = hydrateRecordDefaults(record);
  const outs = normalizeOuts(hydrated);
  const defRail = hydrated.defaultPaymentRail?.trim();
  const defSend = hydrated.defaultSendTo?.trim();
  const lines = [`${hydrated.callSign.toUpperCase()} todos`];
  for (let i = 0; i < outs.length; i++) {
    const out = outs[i]!;
    if (isOutDeferred(out)) continue;
    const missing = listOutTodoMissingFieldLabels(outs[i]!, defRail, defSend);
    if (!missing.length) continue;
    lines.push(`out ${outSequenceNumber(i)} need ${missing.join(', ')}`);
  }
  if (lines.length === 1) lines.push('all outs complete');
  return lines.join('\n');
}

/** Table body for copy — `#` column is out number only (no partner code per row). */
export function buildSeatDeskTableCopyBody(record: SeatIntakeRecord): string {
  const hydrated = hydrateRecordDefaults(record);
  const outs = normalizeOuts(hydrated);
  const defRail = hydrated.defaultPaymentRail?.trim();
  const defSend = hydrated.defaultSendTo?.trim();

  const lines = [hydrated.callSign.toUpperCase(), `# BOOK USER DM SEND MAX FP%`];
  for (let i = 0; i < outs.length; i++) {
    const out = outs[i]!;
    lines.push(
      [
        outSequenceNumber(i),
        displayBook(outBook(out)),
        outUsername(out),
        outPaymentRail(out, defRail),
        outSendTo(out, defSend),
        outMaxBet(out),
        outFreeplayPct(out),
      ].join(' ')
    );
  }
  return lines.join('\n');
}

/**
 * Plain-text table for CopyTextButton — space-separated rows (partner paste format).
 * @see https://core.telegram.org/bots/api#copytextbutton — Bot API 7.11+
 */
export function buildSeatDeskTableCopyText(record: SeatIntakeRecord): string {
  return `${buildSeatDeskTableCopyBody(record)}\n${buildSeatDeskTableCopyReplyLine(record)}`;
}

function displayBook(book: string): string {
  return book
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '');
}

function formatDeskTimestamp(now: Date): string {
  return now.toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function bookLabel(out: SeatOut): string {
  return displayBook(outBook(out));
}

/** Monospace table for Telegram HTML &lt;pre&gt; (4096 char message budget). */
export function buildSeatOutDeskLines(record: SeatIntakeRecord): string[] {
  const hydrated = hydrateRecordDefaults(record);
  const outs = normalizeOuts(hydrated);
  if (!outs.length) {
    return ['(no books yet — SPEN adds outs as books are confirmed)'];
  }

  const defRail = hydrated.defaultPaymentRail?.trim();
  const defSend = hydrated.defaultSendTo?.trim();
  const rows = outs.map((out, i) => ({
    num: outSequenceNumber(i),
    outId: out.outId ?? formatOutId(hydrated.partnerCode, i),
    book: bookLabel(out),
    username: outUsername(out),
    rail: outPaymentRail(out, defRail),
    sendTo: outSendTo(out, defSend),
    maxBet: outMaxBet(out),
    freeplayPct: outFreeplayPct(out),
    note: out.note?.trim(),
  }));

  const wNum = Math.min(
    3,
    Math.max(2, widthOf(SEAT_DESK_OUT_NUM_COL), ...rows.map(r => widthOf(r.num)))
  );
  const wBook = Math.min(18, Math.max(4, widthOf('BOOK'), ...rows.map(r => widthOf(r.book))));
  const wUser = Math.min(
    10,
    Math.max(8, widthOf('USERNAME'), ...rows.map(r => widthOf(r.username)))
  );
  const wRail = Math.min(
    12,
    Math.max(7, widthOf(SEAT_DESK_DEPOSIT_METHOD_COL), ...rows.map(r => widthOf(r.rail)))
  );
  const wSend = Math.min(12, Math.max(7, widthOf('SEND TO'), ...rows.map(r => widthOf(r.sendTo))));
  const wMaxBet = Math.min(
    8,
    Math.max(7, widthOf(SEAT_DESK_MAX_BET_COL), ...rows.map(r => widthOf(r.maxBet)))
  );
  const wFreeplay = Math.min(
    8,
    Math.max(7, widthOf(SEAT_DESK_FREEPLAY_PCT_COL), ...rows.map(r => widthOf(r.freeplayPct)))
  );

  const rowLine = (
    num: string,
    book: string,
    username: string,
    rail: string,
    sendTo: string,
    maxBet: string,
    freeplayPct: string
  ) =>
    `${padCell(num, wNum)} │ ${padCell(book, wBook)} │ ${padCell(username, wUser)} │ ${padCell(rail, wRail)} │ ${padCell(sendTo, wSend)} │ ${padCell(maxBet, wMaxBet)} │ ${padCell(freeplayPct, wFreeplay)}`.trimEnd();

  const lines = [
    rowLine(
      SEAT_DESK_OUT_NUM_COL,
      'BOOK',
      'USERNAME',
      SEAT_DESK_DEPOSIT_METHOD_COL,
      'SEND TO',
      SEAT_DESK_MAX_BET_COL,
      SEAT_DESK_FREEPLAY_PCT_COL
    ),
    `${'─'.repeat(wNum)}─┼─${'─'.repeat(wBook)}─┼─${'─'.repeat(wUser)}─┼─${'─'.repeat(wRail)}─┼─${'─'.repeat(wSend)}─┼─${'─'.repeat(wMaxBet)}─┼─${'─'.repeat(wFreeplay)}`,
    ...rows.map(r => rowLine(r.num, r.book, r.username, r.rail, r.sendTo, r.maxBet, r.freeplayPct)),
  ];

  const notes = rows.filter(r => r.note);
  if (notes.length) {
    lines.push('', 'Notes');
    for (const r of notes) {
      lines.push(`  ${r.num} — ${r.note}`);
    }
  }

  lines.push(
    '',
    '# = sequential out on desk',
    'SPEN fills DEPOSIT METHOD + SEND TO (where we send float)',
    'Reply: 1 | Venmo | @yourhandle'
  );
  return lines;
}

export function formatSeatCapitalDeskHtml(record: SeatIntakeRecord, now = new Date()): string {
  const tableLines = buildSeatOutDeskLines(record);
  const fund = resolveFundStatus(record);

  return [
    bold(`${record.callSign} · Capital desk`),
    `<i>${escapeHtml(formatDeskTimestamp(now))} CT</i>`,
    `<i>FUND ${fund.status} — ${escapeHtml(fund.detail)}</i>`,
    '',
    `<pre>${escapeHtml(tableLines.join('\n'))}</pre>`,
  ].join('\n');
}

function outHasRail(out: SeatOut, defaultRail?: string): boolean {
  return Boolean(out.paymentRail?.trim() || defaultRail?.trim());
}

function outHasSendTo(out: SeatOut, defaultSendTo?: string): boolean {
  return Boolean(out.sendTo?.trim() || defaultSendTo?.trim());
}

/** Per-out STATUS column value — record-level funded/partial overrides the lead row. */
function outRowStatus(
  out: SeatOut,
  opts: {
    defaultRail?: string;
    defaultSendTo?: string;
    isLead: boolean;
    overallStatus: SeatFundStatus;
  }
): SeatOutDisplayStatus {
  if (isOutDeferred(out)) return 'deferred';
  if (opts.isLead && (opts.overallStatus === 'funded' || opts.overallStatus === 'partial')) {
    return opts.overallStatus;
  }
  if (!outHasRail(out, opts.defaultRail) || !outHasSendTo(out, opts.defaultSendTo)) {
    return 'blocked';
  }
  return 'ready';
}

/** Passwordless out row for dashboard/Telegram-shared rendering. */
export type SeatDeskOutView = {
  outNum: string;
  book: string;
  username: string;
  depositMethod: string;
  sendTo: string;
  maxBet: string;
  freeplayPct: string;
  status: SeatOutDisplayStatus;
  incomplete: boolean;
  note?: string;
  balance?: string;
  withdrawPath?: string;
};

export type SeatDeskChecklistItem = { done: boolean; label: string };

/** Passwordless desk view model — shared by Telegram rich blocks and the ops dashboard panel. */
export type SeatDeskViewModel = {
  callSign: string;
  partnerCode: string;
  fundStatus: SeatFundStatus;
  fundDetail: string;
  outs: SeatDeskOutView[];
  checklist: SeatDeskChecklistItem[];
  incompleteOuts: number;
  pinned: boolean;
  hasTelegramDesk: boolean;
  deskUpdatedAt: string | null;
};

/**
 * Build the shared desk view model (outs table + checklist) — no passwords.
 * `buildSeatCapitalDeskRichBlocks` sources its table/checklist from this so
 * STATUS + checklist stay single-sourced between Telegram and the dashboard.
 */
export function buildSeatDeskViewModel(record: SeatIntakeRecord): SeatDeskViewModel {
  const hydrated = hydrateRecordDefaults(record);
  const outs = normalizeOuts(hydrated);
  const defRail = hydrated.defaultPaymentRail?.trim();
  const defSend = hydrated.defaultSendTo?.trim();
  const fund = resolveFundStatus(record);
  const lead = outs.find(o => o.primary) ?? outs[0];
  const leadId = lead?.outId;

  const outViews: SeatDeskOutView[] = outs.map((out, i) => {
    const isLead = leadId != null ? out.outId === leadId : i === 0;
    const status = outRowStatus(out, {
      defaultRail: defRail,
      defaultSendTo: defSend,
      isLead,
      overallStatus: fund.status,
    });
    return {
      outNum: outSequenceNumber(i),
      book: bookLabel(out),
      username: outUsername(out),
      depositMethod: outPaymentRail(out, defRail),
      sendTo: outSendTo(out, defSend),
      maxBet: outMaxBet(out),
      freeplayPct: outFreeplayPct(out),
      status,
      incomplete: isSeatOutIncomplete(out, defRail, defSend),
      note: out.note?.trim() || undefined,
      balance: out.balance?.trim() || undefined,
      withdrawPath: out.withdrawPath?.trim() || undefined,
    };
  });

  const checklistItems: SeatDeskChecklistItem[] = [];
  if (lead) {
    const leadIndex = Math.max(
      0,
      outs.findIndex(o => o.outId === leadId)
    );
    const leadNum = outSequenceNumber(leadIndex);
    checklistItems.push({
      done: outHasRail(lead, defRail),
      label: `Out ${leadNum} deposit method confirmed`,
    });
    checklistItems.push({ done: outHasSendTo(lead, defSend), label: `Out ${leadNum} send-to set` });
  }
  for (let i = 0; i < outs.length; i++) {
    const out = outs[i]!;
    if (leadId != null && out.outId === leadId) continue;
    if (isOutDeferred(out)) {
      checklistItems.push({ done: true, label: `Out ${outSequenceNumber(i)} deferred` });
      continue;
    }
    const num = outSequenceNumber(i);
    if (outUsername(out) === '—') {
      checklistItems.push({ done: false, label: `Out ${num} username` });
    }
    if (!outHasRail(out, defRail)) {
      checklistItems.push({ done: false, label: `Out ${num} deposit method confirmed` });
    }
    if (!outHasSendTo(out, defSend)) {
      checklistItems.push({ done: false, label: `Out ${num} send-to set` });
    }
  }
  if (checklistItems.length > 0 && checklistItems.every(item => item.done)) {
    checklistItems.push({ done: true, label: 'All books ready for FUND' });
  } else if (checklistItems.length === 0) {
    checklistItems.push({ done: true, label: 'All books ready for FUND' });
  }

  return {
    callSign: hydrated.callSign,
    partnerCode: hydrated.partnerCode,
    fundStatus: fund.status,
    fundDetail: fund.detail,
    outs: outViews,
    checklist: checklistItems,
    incompleteOuts: outViews.filter(o => o.incomplete).length,
    pinned: hydrated.desk?.pinned === true,
    hasTelegramDesk: hydrated.desk?.messageId != null,
    deskUpdatedAt: hydrated.desk?.updatedAt ?? null,
  };
}

/** FUND line emphasis. */
function fundStatusRichText(status: SeatFundStatus): RichText {
  return status === 'blocked' ? rtMarked(rtBold(status)) : rtBold(status);
}

/** STATUS column emphasis. */
function outStatusRichText(status: SeatOutDisplayStatus): RichText {
  if (status === 'deferred') return rtItalic(rtBold('Deferred'));
  if (status === 'blocked') return rtMarked(rtBold(status));
  return rtBold(status);
}

/**
 * Typed `InputRichBlock[]` tree for the desk message — heading, FUND line,
 * #/BOOK/USERNAME/DEPOSIT METHOD/SEND TO/MAX BET/FP% DEP/STATUS table, per-out detail
 * sections, a funding checklist, and an Actions section. Serializes to HTML
 * via `serializeRichBlocksToHtml` for the HTML fallback / legacy-compatible view.
 */
export function buildSeatCapitalDeskRichBlocks(
  record: SeatIntakeRecord,
  now = new Date()
): InputRichBlock[] {
  const vm = buildSeatDeskViewModel(record);

  const blocks: InputRichBlock[] = [
    blockHeading(`${record.callSign} · Capital desk`, 2),
    blockParagraph(rtItalic(`${formatDeskTimestamp(now)} CT`)),
    blockParagraph(rtConcat('FUND ', fundStatusRichText(vm.fundStatus), ' — ', vm.fundDetail)),
    blockDivider(),
  ];

  const header: RichTableCellBlock[] = [
    { text: SEAT_DESK_OUT_NUM_COL, is_header: true },
    { text: 'BOOK', is_header: true },
    { text: 'USERNAME', is_header: true },
    { text: SEAT_DESK_DEPOSIT_METHOD_COL, is_header: true },
    { text: 'SEND TO', is_header: true },
    { text: SEAT_DESK_MAX_BET_COL, is_header: true },
    { text: SEAT_DESK_FREEPLAY_PCT_COL, is_header: true },
    { text: 'STATUS', is_header: true },
  ];
  const rows: RichTableCellBlock[][] = vm.outs.map(out => [
    { text: out.outNum },
    { text: out.book },
    { text: out.username },
    { text: out.depositMethod },
    { text: out.sendTo },
    { text: out.maxBet },
    { text: out.freeplayPct },
    { text: outStatusRichText(out.status) },
  ]);
  blocks.push(blockTable([header, ...rows], { isBordered: true, isStriped: true }));
  blocks.push(blockDivider());

  const detailBlocks: InputRichBlock[] = [];
  for (const out of vm.outs) {
    const fields: InputRichBlock[] = [];
    if (out.balance) fields.push(blockParagraph(`Balance: ${out.balance}`));
    if (out.withdrawPath) fields.push(blockParagraph(`Withdraw: ${out.withdrawPath}`));
    if (out.note) fields.push(blockParagraph(`Note: ${out.note}`));
    if (fields.length) {
      detailBlocks.push(blockDetails(`Out ${out.outNum} – ${out.book}`, fields));
    }
  }
  blocks.push(...detailBlocks);

  blocks.push(blockDivider());
  blocks.push(blockChecklist(vm.checklist));

  blocks.push(blockHeading('Actions', 3));
  const hintOut = firstIncompleteOutIndex(record);
  const replyHint =
    hintOut != null
      ? `${outSequenceNumber(hintOut)} | Venmo | @yourhandle`
      : '1 | Venmo | @yourhandle';
  blocks.push(blockParagraph(`Copy table · Copy todo · Fill per out, or reply: ${replyHint}`));

  return blocks;
}

/** Bot API 10.1 extended HTML for sendRichMessage / editMessageText rich_message. */
export function formatSeatCapitalDeskRichHtml(record: SeatIntakeRecord, now = new Date()): string {
  return serializeRichBlocksToHtml(buildSeatCapitalDeskRichBlocks(record, now));
}

/** `InputRichMessage.blocks` (preferred) — typed RichText tree. */
export function buildSeatCapitalDeskRichMessage(
  record: SeatIntakeRecord,
  now = new Date()
): InputRichMessage {
  return buildInputRichMessageBlocks(buildSeatCapitalDeskRichBlocks(record, now));
}

/** `InputRichMessage.html` — fallback for servers that reject `blocks`. */
export function buildSeatCapitalDeskRichMessageHtml(
  record: SeatIntakeRecord,
  now = new Date()
): InputRichMessage {
  return buildInputRichMessageHtml(formatSeatCapitalDeskRichHtml(record, now));
}

export { buildSeatDeskRootMarkup as buildSeatDeskReplyMarkup } from './seat-desk-markup.ts';

/** Liquidity/Outs forum thread for a call-sign (desk metadata preferred). */
export async function resolveSeatDeskLiquidityThread(
  record: SeatIntakeRecord,
  forumsMetaDir?: string
): Promise<{ chatId: string; messageThreadId: number }> {
  // brand-ok — Telegram chat_id wire
  const desk = record.desk;
  if (desk?.chatId && desk.messageThreadId != null && desk.messageThreadId > 0) {
    return { chatId: desk.chatId, messageThreadId: desk.messageThreadId };
  }

  const code = record.partnerCode.toUpperCase().trim();
  return resolvePackageGroupForumThread(
    code,
    PACKAGE_GROUP_LIQUIDITY_OUTS_TOPIC_KEY,
    forumsMetaDir ?? PACKAGE_GROUP_FORUMS_META_DIR
  );
}

export type PostPackageGroupForumThreadMessageResult = {
  ok: boolean;
  messageId?: number;
  chatId: string; // brand-ok — Telegram chat_id wire
  messageThreadId: number;
  topicKey: string;
  description?: string;
};

/** Plain-text post to a package-group forum topic (accounting proof, etc.). */
export async function postPackageGroupForumThreadMessage(opts: {
  token: string;
  partnerCode: string;
  topicKey: string;
  text: string;
  forumsMetaDir?: string;
}): Promise<PostPackageGroupForumThreadMessageResult> {
  const { chatId, messageThreadId } = await resolvePackageGroupForumThread(
    opts.partnerCode,
    opts.topicKey,
    opts.forumsMetaDir
  );
  const sent = await sendTelegramBotMessage(opts.token, {
    chatId,
    text: opts.text,
    messageThreadId,
  });
  return {
    ok: sent.ok,
    messageId: sent.messageId,
    chatId,
    messageThreadId,
    topicKey: opts.topicKey.toLowerCase(),
    description: sent.description,
  };
}

export async function postSeatDeskAccountingThreadMessage(opts: {
  token: string;
  record: SeatIntakeRecord;
  text: string;
  forumsMetaDir?: string;
}): Promise<PostPackageGroupForumThreadMessageResult> {
  return postPackageGroupForumThreadMessage({
    token: opts.token,
    partnerCode: opts.record.partnerCode,
    topicKey: PACKAGE_GROUP_ACCOUNTING_TOPIC_KEY,
    text: opts.text,
    forumsMetaDir: opts.forumsMetaDir,
  });
}

export type PostSeatDeskLiquidityThreadMessageResult = {
  ok: boolean;
  messageId?: number;
  chatId: string; // brand-ok — Telegram chat_id wire
  messageThreadId: number;
  description?: string;
};

/** Plain-text partner thread post (topic prompts — not the pinned desk). */
export async function postSeatDeskLiquidityThreadMessage(opts: {
  token: string;
  record: SeatIntakeRecord;
  text: string;
  forumsMetaDir?: string;
}): Promise<PostSeatDeskLiquidityThreadMessageResult> {
  const { chatId, messageThreadId } = await resolveSeatDeskLiquidityThread(
    opts.record,
    opts.forumsMetaDir
  );
  const sent = await sendTelegramBotMessage(opts.token, {
    chatId,
    text: opts.text,
    messageThreadId,
  });
  return {
    ok: sent.ok,
    messageId: sent.messageId,
    chatId,
    messageThreadId,
    description: sent.description,
  };
}

export type PublishSeatCapitalDeskOpts = {
  token: string;
  record: SeatIntakeRecord;
  forumsMetaDir?: string;
  intakeDir?: string;
  pin?: boolean;
};

export type PublishSeatCapitalDeskResult = {
  callSign: string;
  chatId: string; // brand-ok
  messageThreadId: number;
  messageId: number;
  created: boolean;
  pinned: boolean;
  intakePath: string;
  renderMode: 'rich' | 'legacy';
};

export async function publishSeatCapitalDesk(
  opts: PublishSeatCapitalDeskOpts
): Promise<PublishSeatCapitalDeskResult> {
  const record = normalizeSeatIntake(opts.record);
  const code = record.partnerCode.toUpperCase().trim();
  const meta = await loadPackageGroupForumMetadata(code, {
    rootDir: opts.forumsMetaDir ?? PACKAGE_GROUP_FORUMS_META_DIR,
  });
  if (!meta?.chatId) {
    throw new Error(`No forum metadata for ${code}`);
  }

  const threadId = meta.topicsThreadMap?.['liquidity/outs'];
  if (threadId == null || threadId <= 0) {
    throw new Error(`No liquidity/outs topic for ${code}`);
  }

  const now = new Date();
  const replyMarkup = buildSeatDeskRootMarkup(record);
  const preferRich = loadTelegramEnv().seatDeskRichMessages;
  const existing = record.desk;
  let messageId = 0;
  let created = false;
  let renderMode: 'rich' | 'legacy' = 'legacy';

  const canEditExisting =
    existing?.messageId && existing.chatId === meta.chatId && existing.messageThreadId === threadId;

  const sendOrEditRich = (richMessage: InputRichMessage) =>
    canEditExisting
      ? editRichTelegramMessage(opts.token, {
          chatId: meta.chatId,
          messageId: existing!.messageId,
          richMessage,
          replyMarkup,
        })
      : sendRichTelegramMessage(opts.token, {
          chatId: meta.chatId,
          richMessage,
          messageThreadId: threadId,
          replyMarkup,
        });

  if (preferRich) {
    // 1. Prefer typed `blocks` — falls back to extended HTML, then legacy <pre>
    //    below, whenever the server soft-rejects the payload (old Bot API / disabled feature).
    let attempt = await sendOrEditRich(buildSeatCapitalDeskRichMessage(record, now));

    if (!attempt.ok && isRichMessageUnsupported(attempt)) {
      attempt = await sendOrEditRich(buildSeatCapitalDeskRichMessageHtml(record, now));
    }

    if (attempt.ok || (canEditExisting && isTelegramMessageNotModified(attempt))) {
      messageId = canEditExisting ? existing!.messageId : attempt.messageId!;
      created = !canEditExisting;
      renderMode = 'rich';
    } else if (!isRichMessageUnsupported(attempt)) {
      throw new Error(attempt.description ?? 'rich_message failed');
    }
  }

  if (renderMode === 'legacy') {
    const text = formatSeatCapitalDeskHtml(record, now);
    if (canEditExisting) {
      const edited = await editTelegramMessage(opts.token, {
        chatId: meta.chatId,
        messageId: existing!.messageId,
        text,
        parseMode: 'HTML',
        replyMarkup,
      });
      if (!edited.ok && !isTelegramMessageNotModified(edited)) {
        throw new Error(edited.description ?? 'editMessageText failed');
      }
      messageId = existing!.messageId;
    } else {
      const sent = await sendTelegramBotMessage(opts.token, {
        chatId: meta.chatId,
        text,
        parseMode: 'HTML',
        messageThreadId: threadId,
        replyMarkup,
      });
      if (!sent.ok || sent.messageId == null) {
        throw new Error(sent.description ?? 'sendMessage failed');
      }
      messageId = sent.messageId;
      created = true;
    }
  }

  let pinned = false;
  if (opts.pin !== false) {
    const pin = await telegramApiCall(opts.token, 'pinChatMessage', {
      chat_id: meta.chatId,
      message_id: messageId,
      disable_notification: true,
    });
    pinned = pin.ok;
  }

  const next: SeatIntakeRecord = {
    ...record,
    desk: {
      chatId: meta.chatId,
      messageThreadId: threadId,
      messageId,
      updatedAt: new Date().toISOString(),
    },
  };
  const intakePath = await saveSeatIntake(next, opts.intakeDir ?? SEAT_INTAKE_DIR);

  try {
    const db = openOperationsDb({
      path: Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH,
    });
    try {
      await ensurePartnerForumAccounting({
        db,
        token: opts.token,
        partnerCode: next.partnerCode,
        callSign: next.callSign,
        forumsMetaDir: opts.forumsMetaDir,
        intakeDir: opts.intakeDir,
        ensureTopics: true,
        postPrompt: true,
      });
    } finally {
      db.close();
    }
  } catch {
    /* desk publish must not fail when accounting topic bootstrap fails */
  }

  return {
    callSign: record.callSign,
    chatId: meta.chatId,
    messageThreadId: threadId,
    messageId,
    created,
    pinned,
    intakePath,
    renderMode,
  };
}

export async function pinSeatCapitalDesk(opts: {
  token: string;
  record: SeatIntakeRecord;
  intakeDir?: string;
}): Promise<boolean> {
  const desk = opts.record.desk;
  if (!desk?.messageId) throw new Error('No desk message_id — run post/refresh first');
  const pin = await telegramApiCall(opts.token, 'pinChatMessage', {
    chat_id: desk.chatId,
    message_id: desk.messageId,
    disable_notification: true,
  });
  if (pin.ok) {
    await saveSeatIntake(
      { ...opts.record, desk: { ...desk, pinned: true, updatedAt: new Date().toISOString() } },
      opts.intakeDir
    );
  }
  return pin.ok;
}

export async function unpinSeatCapitalDesk(opts: {
  token: string;
  record: SeatIntakeRecord;
  intakeDir?: string;
}): Promise<boolean> {
  const desk = opts.record.desk;
  if (!desk?.messageId) throw new Error('No desk message_id');
  const unpin = await telegramApiCall(opts.token, 'unpinChatMessage', {
    chat_id: desk.chatId,
    message_id: desk.messageId,
  });
  if (unpin.ok) {
    await saveSeatIntake(
      { ...opts.record, desk: { ...desk, pinned: false, updatedAt: new Date().toISOString() } },
      opts.intakeDir
    );
  }
  return unpin.ok;
}

export async function deleteSeatCapitalDesk(opts: {
  token: string;
  record: SeatIntakeRecord;
  intakeDir?: string;
}): Promise<boolean> {
  const desk = opts.record.desk;
  if (!desk?.messageId) throw new Error('No desk message_id');
  const del = await telegramApiCall(opts.token, 'deleteMessage', {
    chat_id: desk.chatId,
    message_id: desk.messageId,
  });
  if (del.ok) {
    const { desk: _removed, ...rest } = opts.record;
    await saveSeatIntake(rest, opts.intakeDir);
  }
  return del.ok;
}

/** Force new send (ignore stored message_id). */
export async function postSeatCapitalDesk(
  opts: PublishSeatCapitalDeskOpts & { forceNew?: boolean }
): Promise<PublishSeatCapitalDeskResult> {
  const record = opts.forceNew
    ? normalizeSeatIntake({ ...opts.record, desk: undefined })
    : opts.record;
  return publishSeatCapitalDesk({ ...opts, record });
}
