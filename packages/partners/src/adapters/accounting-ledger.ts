/**
 * Canonical partner accounting-ledger adapter.
 *
 * Projects `partner_ledger` wire rows into scoped BalancePosition + recent
 * PartnerDashboardLedgerEntry values with integer minor-unit MoneyAmount and
 * structured AccountScope. Pure parse/adapt only — no I/O, no SQLite open.
 *
 * Authority boundary:
 *   - Authors: partners[].accounting.balancePositions, recentEntries
 *   - May derive: per-out OutFundingStatus from out-scoped balances only
 *   - Never authors: lifecycle, Telegram, or OutOperationalStatus
 *
 * Legacy free-form account_scope strings (`global` | `rail:…` | `book:…`) are
 * parsed here; colon-delimited scopes never leave this adapter.
 */
import {
  parseAdapterId,
  parseCanonicalOutId,
  parseCurrencyCode,
  parseLedgerEntryId,
  parsePartnerCode,
  parseRailId,
  parseSourceSystemId,
} from '../core/identifiers.ts';
import {
  type AccountScope,
  type BalancePosition,
  type FactProvenance,
  type MoneyAmount,
  type OutFundingStatus,
  type OutId,
  type PartnerCode,
  type PartnerDashboardLedgerEntry,
} from '../core/types.ts';
import { wireArray, wireRecord, wireText, wireTimestamp } from './wire.ts';

export const PARTNER_ACCOUNTING_LEDGER_ADAPTER_ID = parseAdapterId('accounting-ledger');
export const PARTNER_ACCOUNTING_LEDGER_ADAPTER_VERSION = '1' as const;
export const PARTNER_ACCOUNTING_SOURCE_SYSTEM_ID = parseSourceSystemId('root-operations-db');
export const PARTNER_ACCOUNTING_INPUT_REF = 'partner_ledger' as const;

/** Storage entry types from partner_ledger CHECK constraint. */
export const PARTNER_LEDGER_ENTRY_TYPES = [
  'initial_capital',
  'deposit',
  'credit',
  'settlement',
  'free_roll',
] as const;
export type PartnerLedgerEntryType = (typeof PARTNER_LEDGER_ENTRY_TYPES)[number];

const DEFAULT_RECENT_ENTRY_LIMIT = 20;

export type ParsedLedgerRow = {
  id: ReturnType<typeof parseLedgerEntryId>;
  partnerCode: PartnerCode;
  entryType: PartnerLedgerEntryType;
  amount: MoneyAmount;
  balanceAfter: MoneyAmount;
  accountScope: AccountScope;
  postedAt: string;
  proofRef?: string;
  /** Legacy free-form scope string before structured parse (provenance). */
  originalAccountScope: string;
};

export type PartnerOutFundingObservation = {
  outId: OutId;
  fundingStatus: OutFundingStatus;
};

/**
 * Per-partner accounting observation. Keyed by PartnerCode with full
 * FactProvenance; never carries lifecycle/Telegram/operational status.
 */
export type PartnerAccountingObservation = {
  partnerCode: PartnerCode;
  balancePositions: BalancePosition[];
  recentEntries: PartnerDashboardLedgerEntry[];
  /**
   * Out-scoped funding only. Absent outs stay unknown for the builder.
   * Never OutOperationalStatus.
   */
  outFunding: PartnerOutFundingObservation[];
  provenance: FactProvenance;
};

export type AdaptAccountingFromLedgerRowsOptions = {
  /** Observation clock; defaults to latest row postedAt or epoch when empty. */
  observedAt?: string;
  /** Max recent entries per partner (newest first). Default 20. */
  recentEntryLimit?: number;
  /**
   * Map legacy `book:<bookKey>` scopes to canonical OutId.
   * Keys may be bare bookKey or `CODE:bookKey`.
   */
  bookKeyToOutId?: Readonly<Record<string, unknown>>;
  /** sourceRecordRef prefix; default partner_ledger. */
  sourceRecordRefPrefix?: string;
};

function wireSafeInteger(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new TypeError(`${path} must be a safe integer`);
  }
  return value;
}

function pickField(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined) return row[key];
  }
  return undefined;
}

function isLedgerEntryType(value: string): value is PartnerLedgerEntryType {
  return (PARTNER_LEDGER_ENTRY_TYPES as readonly string[]).includes(value);
}

/**
 * Parse MoneyAmount from wire: `{ currency, minorUnits }` only.
 * Rejects major-unit floats and non-safe integers.
 */
export function parseMoneyAmount(value: unknown, path: string): MoneyAmount {
  const record = wireRecord(value, path);
  const keys = Object.keys(record).sort();
  const expected = ['currency', 'minorUnits'];
  if (keys.length !== expected.length || keys.some((k, i) => k !== expected[i]!)) {
    throw new TypeError(`${path} must be { currency, minorUnits }`);
  }
  return {
    currency: parseCurrencyCode(record.currency),
    minorUnits: wireSafeInteger(record.minorUnits, `${path}.minorUnits`),
  };
}

/**
 * Map a free-form partner_ledger.account_scope string onto AccountScope.
 * `global` / empty / null → partner scope for the owning PartnerCode.
 * `rail:<method>:<id>` → rail scope (RailId = method:id).
 * `book:<bookKey>` → out scope via bookKeyToOutId (required).
 * Structured objects pass through with brand validation.
 */
export function parseAccountScope(
  value: unknown,
  partnerCode: PartnerCode,
  path: string,
  options?: { bookKeyToOutId?: Readonly<Record<string, unknown>> }
): { scope: AccountScope; originalValue: string } {
  if (value === null || value === undefined || value === '') {
    return {
      scope: { kind: 'partner', partnerCode },
      originalValue: 'global',
    };
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    const record = wireRecord(value, path);
    const kind = wireText(record.kind, `${path}.kind`);
    if (kind === 'partner') {
      const code = parsePartnerCode(record.partnerCode);
      if (code !== partnerCode) {
        throw new TypeError(`${path}.partnerCode must match row partner ${partnerCode}`);
      }
      return {
        scope: { kind: 'partner', partnerCode: code },
        originalValue: `partner:${code}`,
      };
    }
    if (kind === 'out') {
      const outId = parseCanonicalOutId(record.outId);
      return {
        scope: { kind: 'out', outId },
        originalValue: `out:${outId}`,
      };
    }
    if (kind === 'rail') {
      const railId = parseRailId(record.railId);
      return {
        scope: { kind: 'rail', railId },
        originalValue: `rail:${railId}`,
      };
    }
    throw new TypeError(`${path}.kind must be partner|out|rail`);
  }

  if (typeof value !== 'string') {
    throw new TypeError(`${path} must be a string or AccountScope object`);
  }
  const raw = value.trim();
  if (raw !== value) {
    throw new TypeError(`${path} must be an exact string (no surrounding whitespace)`);
  }
  if (raw === 'global') {
    return {
      scope: { kind: 'partner', partnerCode },
      originalValue: raw,
    };
  }
  if (raw.startsWith('rail:')) {
    const rest = raw.slice('rail:'.length);
    if (!rest.length || !/^[a-z]+:.+/.test(rest)) {
      throw new TypeError(
        `${path} rail scope must match rail:<method>:<id> (got ${JSON.stringify(raw)})`
      );
    }
    return {
      scope: { kind: 'rail', railId: parseRailId(rest) },
      originalValue: raw,
    };
  }
  if (raw.startsWith('book:')) {
    const bookKey = raw.slice('book:'.length);
    if (!bookKey.length) {
      throw new TypeError(`${path} book scope requires a non-empty bookKey`);
    }
    const map = options?.bookKeyToOutId ?? {};
    const qualified = `${partnerCode}:${bookKey}`;
    const candidate = map[qualified] ?? map[bookKey];
    if (candidate === undefined) {
      throw new TypeError(
        `${path} book scope ${JSON.stringify(raw)} has no OutId mapping for partner ${partnerCode}`
      );
    }
    const outId = parseCanonicalOutId(candidate);
    return {
      scope: { kind: 'out', outId },
      originalValue: raw,
    };
  }
  throw new TypeError(
    `${path} must be global|rail:<method>:<id>|book:<bookKey> (got ${JSON.stringify(raw)})`
  );
}

function scopeSortKey(scope: AccountScope): string {
  if (scope.kind === 'partner') return `partner:${scope.partnerCode}`;
  if (scope.kind === 'out') return `out:${scope.outId}`;
  return `rail:${scope.railId}`;
}

function moneyFromMinorFields(
  amountMinor: unknown,
  currencyRaw: unknown,
  path: string
): MoneyAmount {
  return {
    currency: parseCurrencyCode(currencyRaw),
    minorUnits: wireSafeInteger(amountMinor, path),
  };
}

/**
 * Parse one partner_ledger wire row (snake_case SQLite dump or camelCase projection).
 * Money is accepted only as integer minor units — never major-unit floats.
 */
export function parsePartnerLedgerRow(
  value: unknown,
  path: string,
  options?: { bookKeyToOutId?: Readonly<Record<string, unknown>> }
): ParsedLedgerRow {
  const row = wireRecord(value, path);
  const partnerCode = parsePartnerCode(pickField(row, 'partnerCode', 'partner_code'));
  const id = parseLedgerEntryId(pickField(row, 'id'));
  const typeRaw = wireText(pickField(row, 'type', 'entryType'), `${path}.type`);
  if (!isLedgerEntryType(typeRaw)) {
    throw new TypeError(
      `${path}.type must be one of ${PARTNER_LEDGER_ENTRY_TYPES.join('|')} (got ${JSON.stringify(typeRaw)})`
    );
  }

  const currency = pickField(row, 'currency');
  const amountField = pickField(row, 'amount');
  let amount: MoneyAmount;
  if (amountField !== undefined && typeof amountField === 'object' && amountField !== null) {
    amount = parseMoneyAmount(amountField, `${path}.amount`);
  } else {
    const amountMinor = pickField(row, 'amountMinor', 'amount_minor');
    if (amountMinor === undefined) {
      throw new TypeError(
        `${path} requires amount_minor/amountMinor or amount:{currency,minorUnits}`
      );
    }
    amount = moneyFromMinorFields(amountMinor, currency, `${path}.amount_minor`);
  }

  const balanceField = pickField(row, 'balanceAfter', 'balance_after');
  let balanceAfter: MoneyAmount;
  if (balanceField !== undefined && typeof balanceField === 'object' && balanceField !== null) {
    balanceAfter = parseMoneyAmount(balanceField, `${path}.balanceAfter`);
  } else {
    const balanceMinor = pickField(row, 'balanceAfterMinor', 'balance_after_minor');
    if (balanceMinor === undefined) {
      throw new TypeError(
        `${path} requires balance_after_minor/balanceAfterMinor or balanceAfter:{currency,minorUnits}`
      );
    }
    balanceAfter = moneyFromMinorFields(
      balanceMinor,
      currency ?? amount.currency,
      `${path}.balance_after_minor`
    );
  }

  if (amount.currency !== balanceAfter.currency) {
    throw new TypeError(`${path} amount and balanceAfter currencies must match`);
  }

  const postedAt = wireTimestamp(
    pickField(row, 'postedAt', 'createdAt', 'created_at'),
    `${path}.postedAt`
  );

  const scopeRaw = pickField(row, 'accountScope', 'account_scope');
  const { scope, originalValue } = parseAccountScope(
    scopeRaw,
    partnerCode,
    `${path}.accountScope`,
    {
      bookKeyToOutId: options?.bookKeyToOutId,
    }
  );

  const proofRaw = pickField(row, 'proofRef', 'proof');
  const proofRef =
    proofRaw === null || proofRaw === undefined
      ? undefined
      : wireText(proofRaw, `${path}.proofRef`);

  return {
    id,
    partnerCode,
    entryType: typeRaw,
    amount,
    balanceAfter,
    accountScope: scope,
    postedAt,
    ...(proofRef !== undefined ? { proofRef } : {}),
    originalAccountScope: originalValue,
  };
}

function buildObservationProvenance(input: {
  partnerCode: PartnerCode;
  observedAt: string;
  originalValue: string;
  sourceRecordRefPrefix: string;
}): FactProvenance {
  return {
    sourceSystemId: PARTNER_ACCOUNTING_SOURCE_SYSTEM_ID,
    sourceRecordRef: `${input.sourceRecordRefPrefix}:${input.partnerCode}`,
    adapterId: PARTNER_ACCOUNTING_LEDGER_ADAPTER_ID,
    adapterVersion: PARTNER_ACCOUNTING_LEDGER_ADAPTER_VERSION,
    observedAt: input.observedAt,
    originalValue: input.originalValue,
    mappingMethod: 'identity',
    confidence: 'exact',
  };
}

function deriveOutFunding(positions: readonly BalancePosition[]): PartnerOutFundingObservation[] {
  const byOut = new Map<OutId, number>();
  for (const position of positions) {
    if (position.accountScope.kind !== 'out') continue;
    const prior = byOut.get(position.accountScope.outId) ?? 0;
    byOut.set(position.accountScope.outId, prior + position.amount.minorUnits);
  }
  return [...byOut.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([outId, minorUnits]) => ({
      outId,
      fundingStatus: (minorUnits > 0 ? 'funded' : 'unfunded') as OutFundingStatus,
    }));
}

function projectPartner(
  partnerCode: PartnerCode,
  rows: ParsedLedgerRow[],
  options: {
    observedAt: string;
    recentEntryLimit: number;
    sourceRecordRefPrefix: string;
  }
): PartnerAccountingObservation {
  // Chronological order matches partner_ledger listLedgerEntries (oldest first).
  const ordered = [...rows].sort((left, right) => {
    const byTime = left.postedAt.localeCompare(right.postedAt);
    if (byTime !== 0) return byTime;
    return left.id.localeCompare(right.id);
  });

  // Latest balanceAfter per AccountScope is the scoped position.
  const latestByScope = new Map<string, ParsedLedgerRow>();
  for (const row of ordered) {
    latestByScope.set(scopeSortKey(row.accountScope), row);
  }

  const balancePositions: BalancePosition[] = [...latestByScope.values()]
    .sort((left, right) =>
      scopeSortKey(left.accountScope).localeCompare(scopeSortKey(right.accountScope))
    )
    .map(row => ({
      accountScope: row.accountScope,
      amount: {
        currency: row.balanceAfter.currency,
        minorUnits: row.balanceAfter.minorUnits,
      },
      effectiveAt: row.postedAt,
    }));

  const recentEntries: PartnerDashboardLedgerEntry[] = [...ordered]
    .reverse()
    .slice(0, options.recentEntryLimit)
    .map(row => ({
      id: row.id,
      entryType: row.entryType,
      amount: row.amount,
      balanceAfter: row.balanceAfter,
      accountScope: row.accountScope,
      postedAt: row.postedAt,
      ...(row.proofRef !== undefined ? { proofRef: row.proofRef } : {}),
    }));

  const last = ordered[ordered.length - 1];
  const originalValue = last
    ? `${last.entryType}:${last.balanceAfter.currency}:${last.balanceAfter.minorUnits}`
    : 'empty';

  return {
    partnerCode,
    balancePositions,
    recentEntries,
    outFunding: deriveOutFunding(balancePositions),
    provenance: buildObservationProvenance({
      partnerCode,
      observedAt: options.observedAt,
      originalValue,
      sourceRecordRefPrefix: options.sourceRecordRefPrefix,
    }),
  };
}

/**
 * Adapt partner_ledger rows into per-PartnerCode accounting observations.
 * Pure: caller supplies already-fetched rows; this module never opens SQLite.
 */
export function adaptAccountingFromLedgerRows(
  // eslint-disable-next-line harness/no-unknown-function-param -- wire/ledger edge
  rows: unknown,
  options?: AdaptAccountingFromLedgerRowsOptions
): PartnerAccountingObservation[] {
  const list = wireArray(rows, 'partner_ledger');
  const recentEntryLimit = options?.recentEntryLimit ?? DEFAULT_RECENT_ENTRY_LIMIT;
  if (!Number.isSafeInteger(recentEntryLimit) || recentEntryLimit < 0) {
    throw new TypeError('recentEntryLimit must be a non-negative safe integer');
  }
  const sourceRecordRefPrefix = options?.sourceRecordRefPrefix ?? PARTNER_ACCOUNTING_INPUT_REF;

  const parsed = list.map((raw, index) =>
    parsePartnerLedgerRow(raw, `partner_ledger[${index}]`, {
      bookKeyToOutId: options?.bookKeyToOutId,
    })
  );

  const ids = parsed.map(row => row.id);
  if (new Set(ids).size !== ids.length) {
    throw new TypeError('partner_ledger contains duplicate LedgerEntryId');
  }

  const byPartner = new Map<PartnerCode, ParsedLedgerRow[]>();
  for (const row of parsed) {
    const bucket = byPartner.get(row.partnerCode);
    if (bucket) bucket.push(row);
    else byPartner.set(row.partnerCode, [row]);
  }

  const latestPosted =
    parsed.length === 0
      ? '1970-01-01T00:00:00.000Z'
      : [...parsed].sort((a, b) => b.postedAt.localeCompare(a.postedAt))[0]!.postedAt;
  const observedAt = options?.observedAt ?? latestPosted;
  if (options?.observedAt !== undefined) {
    wireTimestamp(options.observedAt, 'observedAt');
  }

  return [...byPartner.keys()]
    .sort((a, b) => a.localeCompare(b))
    .map(partnerCode =>
      projectPartner(partnerCode, byPartner.get(partnerCode)!, {
        observedAt,
        recentEntryLimit,
        sourceRecordRefPrefix,
      })
    );
}

/**
 * Adapt a JSON ledger snapshot artifact:
 * `{ generatedAt?, rows: [...] }` or bare row array.
 */
export function adaptAccountingFromLedgerSnapshot(
  // eslint-disable-next-line harness/no-unknown-function-param -- wire/bake edge
  snapshot: unknown,
  options?: AdaptAccountingFromLedgerRowsOptions
): PartnerAccountingObservation[] {
  if (Array.isArray(snapshot)) {
    return adaptAccountingFromLedgerRows(snapshot, options);
  }
  const root = wireRecord(snapshot, 'accountingSnapshot');
  const rows = wireArray(
    root.rows ?? root.entries ?? root.partner_ledger,
    'accountingSnapshot.rows'
  );
  const observedAt =
    options?.observedAt ??
    (typeof root.generatedAt === 'string'
      ? wireTimestamp(root.generatedAt, 'accountingSnapshot.generatedAt')
      : undefined);
  return adaptAccountingFromLedgerRows(rows, {
    ...options,
    ...(observedAt !== undefined ? { observedAt } : {}),
  });
}
