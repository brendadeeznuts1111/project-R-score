import type {
  AttentionReasonCode,
  AdapterId,
  CurrencyCode,
  ExternalAccountId,
  ExternalPartnerId,
  LedgerEntryId,
  OutId,
  PartnerCallSign,
  PartnerCode,
  ProfileDocumentVersion,
  RailId,
  SportsbookId,
  SourceSystemId,
  TreeNodeId,
} from './types.ts';

export const PARTNER_CODE_PATTERN = '^[A-Z]{3,6}$';
export const PARTNER_CALL_SIGN_PATTERN = '^([A-Z]{3,6})-([0-9]{3})$';
export const CANONICAL_OUT_ID_PATTERN = '^out-([A-Z]{3,6})-([1-9][0-9]*)$';

const PARTNER_CODE_RE = new RegExp(PARTNER_CODE_PATTERN);
const PARTNER_CALL_SIGN_RE = new RegExp(PARTNER_CALL_SIGN_PATTERN);
const CANONICAL_OUT_ID_RE = new RegExp(CANONICAL_OUT_ID_PATTERN);
const SLUG_ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const CURRENCY_CODE_RE = /^[A-Z]{3}$/;
const ATTENTION_REASON_RE = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/;

function parseExactString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    throw new TypeError(`${label} must be a non-empty exact string`);
  }
  return value;
}

export function parsePartnerCode(value: unknown): PartnerCode {
  const code = parseExactString(value, 'PartnerCode');
  if (!PARTNER_CODE_RE.test(code)) throw new TypeError(`Invalid PartnerCode: ${code}`);
  return code as PartnerCode;
}

export function parsePartnerCallSign(value: unknown, expectedCode?: PartnerCode): PartnerCallSign {
  const callSign = parseExactString(value, 'PartnerCallSign');
  const match = PARTNER_CALL_SIGN_RE.exec(callSign);
  if (!match || (expectedCode !== undefined && match[1] !== expectedCode)) {
    throw new TypeError(`Invalid PartnerCallSign: ${callSign}`);
  }
  return callSign as PartnerCallSign;
}

export function parseProfileDocumentVersion(value: unknown): ProfileDocumentVersion {
  return parseExactString(value, 'ProfileDocumentVersion') as ProfileDocumentVersion;
}

export type CanonicalOutIdentity = {
  outId: OutId;
  partnerCode: PartnerCode;
  sequence: number;
};

export function parseCanonicalOutIdentity(value: unknown): CanonicalOutIdentity {
  const raw = parseExactString(value, 'OutId');
  const match = CANONICAL_OUT_ID_RE.exec(raw);
  if (!match) throw new TypeError(`Invalid canonical OutId: ${raw}`);
  const sequence = Number(match[2]);
  if (!Number.isSafeInteger(sequence) || sequence <= 0) {
    throw new TypeError(`OutId sequence must be a positive safe integer: ${raw}`);
  }
  return {
    outId: raw as OutId,
    partnerCode: parsePartnerCode(match[1]),
    sequence,
  };
}

export function parseCanonicalOutId(value: unknown): OutId {
  return parseCanonicalOutIdentity(value).outId;
}

export function parseCurrencyCode(value: unknown): CurrencyCode {
  const code = parseExactString(value, 'CurrencyCode');
  if (!CURRENCY_CODE_RE.test(code)) throw new TypeError(`Invalid CurrencyCode: ${code}`);
  return code as CurrencyCode;
}

export function parseSportsbookId(value: unknown): SportsbookId {
  const id = parseExactString(value, 'SportsbookId');
  if (!SLUG_ID_RE.test(id)) throw new TypeError(`Invalid SportsbookId: ${id}`);
  return id as SportsbookId;
}

export function parseTreeNodeId(value: unknown): TreeNodeId {
  return parseExactString(value, 'TreeNodeId') as TreeNodeId;
}

export function parseRailId(value: unknown): RailId {
  return parseExactString(value, 'RailId') as RailId;
}

export function parseLedgerEntryId(value: unknown): LedgerEntryId {
  return parseExactString(value, 'LedgerEntryId') as LedgerEntryId;
}

export function parseAttentionReasonCode(value: unknown): AttentionReasonCode {
  const code = parseExactString(value, 'AttentionReasonCode');
  if (!ATTENTION_REASON_RE.test(code)) {
    throw new TypeError(`Invalid AttentionReasonCode: ${code}`);
  }
  return code as AttentionReasonCode;
}

export function parseSourceSystemId(value: unknown): SourceSystemId {
  const id = parseExactString(value, 'SourceSystemId');
  if (!SLUG_ID_RE.test(id)) throw new TypeError(`Invalid SourceSystemId: ${id}`);
  return id as SourceSystemId;
}

export function parseAdapterId(value: unknown): AdapterId {
  const id = parseExactString(value, 'AdapterId');
  if (!SLUG_ID_RE.test(id)) throw new TypeError(`Invalid AdapterId: ${id}`);
  return id as AdapterId;
}

export function parseExternalPartnerId(value: unknown): ExternalPartnerId {
  return parseExactString(value, 'ExternalPartnerId') as ExternalPartnerId;
}

export function parseExternalAccountId(value: unknown): ExternalAccountId {
  return parseExactString(value, 'ExternalAccountId') as ExternalAccountId;
}
