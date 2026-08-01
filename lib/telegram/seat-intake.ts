// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth (via fitVisible / Bun.stringWidth)
/**
 * Seat intake model — record types, parsing, normalization, and pure desk helpers.
 *
 * Leaf module extracted from `seat-capital-desk.ts` (strong import-cycle burn-down):
 * desk rendering/publishing stays in `seat-capital-desk.ts`; copy/markup/partner-message
 * and forum-accounting consumers import this leaf instead of the desk. The desk
 * re-exports everything here for backward compatibility.
 *
 * **Bun natives (legacy pre path only)**
 * - [`fitVisible`](../console-depth.ts) · [`stringWidth`](https://bun.com/docs/runtime/utils#bun-stringwidth) from `bun`
 *   for column pad/truncate (emoji / wide chars).
 * - [`Bun.file`](https://bun.com/docs/runtime/file-io#reading-files-bun-file) for intake JSON under `reports/telegram/seat-intake/`.
 */
import { stringWidth } from 'bun';
import { fitVisible } from '../console-depth.ts';
import { joinPath } from '../path-bun.ts';
import { bold, escapeHtml } from './templates/escape.ts';

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

export function formatDeskTimestamp(now: Date): string {
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
    Math.max(2, stringWidth(SEAT_DESK_OUT_NUM_COL), ...rows.map(r => stringWidth(r.num)))
  );
  const wBook = Math.min(
    18,
    Math.max(4, stringWidth('BOOK'), ...rows.map(r => stringWidth(r.book)))
  );
  const wUser = Math.min(
    10,
    Math.max(8, stringWidth('USERNAME'), ...rows.map(r => stringWidth(r.username)))
  );
  const wRail = Math.min(
    12,
    Math.max(7, stringWidth(SEAT_DESK_DEPOSIT_METHOD_COL), ...rows.map(r => stringWidth(r.rail)))
  );
  const wSend = Math.min(
    12,
    Math.max(7, stringWidth('SEND TO'), ...rows.map(r => stringWidth(r.sendTo)))
  );
  const wMaxBet = Math.min(
    8,
    Math.max(7, stringWidth(SEAT_DESK_MAX_BET_COL), ...rows.map(r => stringWidth(r.maxBet)))
  );
  const wFreeplay = Math.min(
    8,
    Math.max(
      7,
      stringWidth(SEAT_DESK_FREEPLAY_PCT_COL),
      ...rows.map(r => stringWidth(r.freeplayPct))
    )
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
  /**
   * Optional book max vs desk maxBet compare line (from partner_account_limits).
   * Filled only when snapshot/bake enrichment runs — not dual-written.
   */
  bookMaxLine?: string;
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
    pinned: hydrated.desk?.pinned ?? hydrated.desk?.messageId != null,
    hasTelegramDesk: hydrated.desk?.messageId != null,
    deskUpdatedAt: hydrated.desk?.updatedAt ?? null,
  };
}
