import {
  parseAdapterId,
  parseCanonicalOutIdentity,
  parsePartnerCallSign,
  parsePartnerCode,
  parseSourceSystemId,
} from '../core/identifiers.ts';
import type {
  AdapterId,
  ConnectorSnapshot,
  OutId,
  PartnerCallSign,
  PartnerCode,
  SourceSystemId,
} from '../core/types.ts';

export const LEGACY_PARTNERS_OPS_SCHEMA = 'factorywager.partners-ops.v2';
export const LEGACY_PARTNERS_OPS_INPUT_REF = '/registry/partners-ops.json';

const LEGACY_SOURCE_SYSTEM_ID = parseSourceSystemId('factorywager-partners-ops');
const LEGACY_ADAPTER_ID = parseAdapterId('legacy-partners-ops');
const LEGACY_SEAT_CALL_SIGN_RE = /^([A-Z]{3,6})-[0-9]{3}(?:-SUB[0-9]{2}){1,2}$/;
const LEGACY_OUT_STATUSES = [
  'ready',
  'deferred',
  'paused',
  'blocked',
  'partial',
  'funded',
] as const;

type WireRecord = Record<string, unknown>;

function assertRecord(value: unknown, path: string): asserts value is WireRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object`);
  }
}

function assertArray(value: unknown, path: string): asserts value is unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${path} must be an array`);
}

function parseExactString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    throw new TypeError(`${path} must be a non-empty exact string`);
  }
  return value;
}

function parseCanonicalUtcTime(value: unknown, path: string): string {
  const timestamp = parseExactString(value, path);
  if (!Number.isFinite(Date.parse(timestamp)) || new Date(timestamp).toISOString() !== timestamp) {
    throw new TypeError(`${path} must be a canonical UTC ISO timestamp`);
  }
  return timestamp;
}

export type LegacyObservationSource = {
  sourceSystemId: SourceSystemId;
  adapterId: AdapterId;
  adapterVersion: '2';
  observedAt: string;
  sourceRecordRef: string;
};

export type LegacyOutVisibilityObservation = {
  sourceRecordRef: string;
  outId: OutId;
  observedBookSlug: string;
  observedStatus: (typeof LEGACY_OUT_STATUSES)[number];
};

export type LegacyPartnerVisibilityObservation = {
  partnerCode: PartnerCode;
  baseCallSign?: PartnerCallSign;
  seatCallSign?: string;
  observedPhase: string;
  outs: LegacyOutVisibilityObservation[];
  source: LegacyObservationSource;
};

export type LegacyPartnerProjection = {
  sourceSchema: typeof LEGACY_PARTNERS_OPS_SCHEMA;
  connectorSnapshot: ConnectorSnapshot;
  partners: LegacyPartnerVisibilityObservation[];
};

function parseLegacyCallSign(
  value: unknown,
  partnerCode: PartnerCode,
  path: string
): Pick<LegacyPartnerVisibilityObservation, 'baseCallSign' | 'seatCallSign'> {
  const callSign = parseExactString(value, path);
  try {
    return { baseCallSign: parsePartnerCallSign(callSign, partnerCode) };
  } catch {
    const match = LEGACY_SEAT_CALL_SIGN_RE.exec(callSign);
    if (!match || match[1] !== partnerCode) {
      throw new TypeError(`${path} must be a base or nested seat call sign for ${partnerCode}`);
    }
    return { seatCallSign: callSign };
  }
}

function parseLegacyOutStatus(
  value: unknown,
  path: string
): LegacyOutVisibilityObservation['observedStatus'] {
  const status = parseExactString(value, path);
  if (!(LEGACY_OUT_STATUSES as readonly string[]).includes(status)) {
    throw new TypeError(`${path} must be a recognized legacy out status`);
  }
  return status as LegacyOutVisibilityObservation['observedStatus'];
}

/**
 * Select compatibility observations from partners-ops v2 without promoting
 * them to canonical lifecycle, out status, book identity, or domain facts.
 * Credentials, funding targets, money, Telegram, limits, and colors are ignored.
 */
export function parseLegacyPartnersOpsProjection(input: unknown): LegacyPartnerProjection {
  assertRecord(input, 'legacyOps');
  if (input.schema !== LEGACY_PARTNERS_OPS_SCHEMA || input.version !== '2') {
    throw new TypeError(`legacyOps must use ${LEGACY_PARTNERS_OPS_SCHEMA} version 2`);
  }
  const generatedAt = parseCanonicalUtcTime(input.generatedAt, 'legacyOps.generatedAt');
  assertRecord(input.validation, 'legacyOps.validation');
  if (input.validation.ok !== true) {
    throw new TypeError('legacyOps.validation.ok must be true');
  }
  assertArray(input.partners, 'legacyOps.partners');

  const partnerCodes = new Set<string>();
  const outIds = new Set<string>();
  const partners = input.partners.map(
    (rawPartner, partnerIndex): LegacyPartnerVisibilityObservation => {
      const partnerPath = `legacyOps.partners[${partnerIndex}]`;
      assertRecord(rawPartner, partnerPath);
      const partnerCode = parsePartnerCode(rawPartner.code);
      if (partnerCodes.has(partnerCode)) {
        throw new TypeError('legacyOps.partners contains duplicate PartnerCode');
      }
      partnerCodes.add(partnerCode);
      const callSigns = parseLegacyCallSign(
        rawPartner.callSign,
        partnerCode,
        `${partnerPath}.callSign`
      );
      const observedPhase = parseExactString(rawPartner.phase, `${partnerPath}.phase`);
      assertArray(rawPartner.outs, `${partnerPath}.outs`);

      const outs = rawPartner.outs.map((rawOut, outIndex): LegacyOutVisibilityObservation => {
        const outPath = `${partnerPath}.outs[${outIndex}]`;
        assertRecord(rawOut, outPath);
        const outIdentity = parseCanonicalOutIdentity(rawOut.id);
        if (outIdentity.partnerCode !== partnerCode) {
          throw new TypeError(`${outPath}.id must belong to ${partnerCode}`);
        }
        if (outIds.has(outIdentity.outId)) {
          throw new TypeError('legacyOps contains duplicate OutId');
        }
        outIds.add(outIdentity.outId);
        assertRecord(rawOut.book, `${outPath}.book`);
        return {
          sourceRecordRef: `${LEGACY_PARTNERS_OPS_INPUT_REF}#/partners/${partnerIndex}/outs/${outIndex}`,
          outId: outIdentity.outId,
          observedBookSlug: parseExactString(rawOut.book.slug, `${outPath}.book.slug`),
          observedStatus: parseLegacyOutStatus(rawOut.status, `${outPath}.status`),
        };
      });

      return {
        partnerCode,
        ...callSigns,
        observedPhase,
        outs,
        source: {
          sourceSystemId: LEGACY_SOURCE_SYSTEM_ID,
          adapterId: LEGACY_ADAPTER_ID,
          adapterVersion: '2',
          observedAt: generatedAt,
          sourceRecordRef: `${LEGACY_PARTNERS_OPS_INPUT_REF}#/partners/${partnerIndex}`,
        },
      };
    }
  );

  partners.sort((left, right) =>
    left.partnerCode < right.partnerCode ? -1 : left.partnerCode > right.partnerCode ? 1 : 0
  );
  return {
    sourceSchema: LEGACY_PARTNERS_OPS_SCHEMA,
    connectorSnapshot: {
      dataStatus: 'ok',
      observedAt: generatedAt,
      inputRef: LEGACY_PARTNERS_OPS_INPUT_REF,
    },
    partners,
  };
}

export type LegacyPartnerProjectionPort = {
  parse: typeof parseLegacyPartnersOpsProjection;
};

export const legacyPartnerProjectionPort: LegacyPartnerProjectionPort = {
  parse: parseLegacyPartnersOpsProjection,
};
