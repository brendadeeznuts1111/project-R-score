import { parseAdapterId, parsePartnerCallSign, parsePartnerCode } from '../core/identifiers.ts';
import {
  CANONICAL_PROFILE_SOURCE_SYSTEM_ID,
  type AdapterId,
  type PartnerCallSign,
  type PartnerCode,
  type SourceSystemId,
} from '../core/types.ts';

export const PARTNER_PROFILE_COVERAGE_SCHEMA_V1 = 'factorywager.partner-profile-coverage.v1';
export const PARTNER_PROFILE_COVERAGE_INPUT_REF = '/registry/partner-profile-coverage.json';
export const PARTNER_PROFILE_COVERAGE_ADAPTER_ID = parseAdapterId('profile-coverage-artifact');

type WireRecord = Record<string, unknown>;

export type PartnerProfileCoverageEntry = {
  callSign: PartnerCallSign;
  profileDocumentVersion: string;
};

export type PartnerProfileCoverageArtifact = {
  schema: typeof PARTNER_PROFILE_COVERAGE_SCHEMA_V1;
  generatedAt: string;
  evidenceByPartnerCode: Record<string, PartnerProfileCoverageEntry>;
};

export interface PartnerProfileCoverageReadPort {
  read(): Promise<PartnerProfileCoverageArtifact>;
}

export type PartnerProfileCoverageEvidence = PartnerProfileCoverageEntry & {
  partnerCode: PartnerCode;
  source: {
    sourceSystemId: SourceSystemId;
    adapterId: AdapterId;
    adapterVersion: '1';
    observedAt: string;
    sourceRecordRef: string;
  };
};

export type PartnerProfileCoverageResult = {
  presentCodes: PartnerCode[];
  missingCodes: PartnerCode[];
  complete: boolean;
};

function isRecord(value: unknown): value is WireRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertRecord(value: unknown, path: string): asserts value is WireRecord {
  if (!isRecord(value)) throw new TypeError(`${path} must be a plain object`);
}

function assertExactKeys(value: WireRecord, expected: readonly string[], path: string): void {
  const actual = Object.keys(value).sort();
  const canonical = [...expected].sort();
  if (actual.length !== canonical.length || actual.some((key, index) => key !== canonical[index])) {
    throw new TypeError(`${path} must contain exactly: ${canonical.join(', ')}`);
  }
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

function parseCoverageProfiles(
  value: unknown,
  path: string
): Record<string, PartnerProfileCoverageEntry> {
  assertRecord(value, path);
  const profiles: Record<string, PartnerProfileCoverageEntry> = {};
  for (const rawCode of Object.keys(value).sort()) {
    const partnerCode = parsePartnerCode(rawCode);
    const entryPath = `${path}.${partnerCode}`;
    const rawEntry = value[rawCode];
    assertRecord(rawEntry, entryPath);
    assertExactKeys(rawEntry, ['callSign', 'profileDocumentVersion'], entryPath);
    profiles[partnerCode] = {
      callSign: parsePartnerCallSign(rawEntry.callSign, partnerCode),
      profileDocumentVersion: parseExactString(
        rawEntry.profileDocumentVersion,
        `${entryPath}.profileDocumentVersion`
      ),
    };
  }
  return profiles;
}

/** Parse the intentionally redacted public identity-coverage artifact. */
export function parsePartnerProfileCoverageArtifact(
  input: unknown
): PartnerProfileCoverageArtifact {
  assertRecord(input, 'profileCoverage');
  assertExactKeys(input, ['schema', 'generatedAt', 'evidenceByPartnerCode'], 'profileCoverage');
  if (input.schema !== PARTNER_PROFILE_COVERAGE_SCHEMA_V1) {
    throw new TypeError(`profileCoverage.schema must be ${PARTNER_PROFILE_COVERAGE_SCHEMA_V1}`);
  }
  return {
    schema: PARTNER_PROFILE_COVERAGE_SCHEMA_V1,
    generatedAt: parseCanonicalUtcTime(input.generatedAt, 'profileCoverage.generatedAt'),
    evidenceByPartnerCode: parseCoverageProfiles(
      input.evidenceByPartnerCode,
      'profileCoverage.evidenceByPartnerCode'
    ),
  };
}

/**
 * Project only identity coverage from validated private profiles. Unknown fields
 * are deliberately ignored so secrets and operational policy cannot cross the boundary.
 */
export function buildPartnerProfileCoverageArtifact(
  privateProfiles: Record<string, unknown>,
  generatedAt: string
): PartnerProfileCoverageArtifact {
  const evidenceByPartnerCode: Record<string, PartnerProfileCoverageEntry> = {};
  for (const rawCode of Object.keys(privateProfiles).sort()) {
    const partnerCode = parsePartnerCode(rawCode);
    const rawProfile = privateProfiles[rawCode];
    assertRecord(rawProfile, `privateProfiles.${partnerCode}`);
    assertRecord(rawProfile.identity, `privateProfiles.${partnerCode}.identity`);
    assertRecord(rawProfile.meta, `privateProfiles.${partnerCode}.meta`);
    const identityCode = parsePartnerCode(rawProfile.identity.code);
    if (identityCode !== partnerCode) {
      throw new TypeError(`privateProfiles.${partnerCode}.identity.code must match its record key`);
    }
    evidenceByPartnerCode[partnerCode] = {
      callSign: parsePartnerCallSign(rawProfile.identity.callSign, partnerCode),
      profileDocumentVersion: parseExactString(
        rawProfile.meta.version,
        `privateProfiles.${partnerCode}.meta.version`
      ),
    };
  }
  return parsePartnerProfileCoverageArtifact({
    schema: PARTNER_PROFILE_COVERAGE_SCHEMA_V1,
    generatedAt,
    evidenceByPartnerCode,
  });
}

/** Emit source-qualified evidence without promoting lifecycle or operational phase. */
export function adaptPartnerProfileCoverageArtifact(
  artifact: PartnerProfileCoverageArtifact
): PartnerProfileCoverageEvidence[] {
  const parsed = parsePartnerProfileCoverageArtifact(artifact);
  return Object.entries(parsed.evidenceByPartnerCode).map(([rawCode, profile]) => {
    const partnerCode = parsePartnerCode(rawCode);
    return {
      partnerCode,
      ...profile,
      source: {
        sourceSystemId: CANONICAL_PROFILE_SOURCE_SYSTEM_ID,
        adapterId: PARTNER_PROFILE_COVERAGE_ADAPTER_ID,
        adapterVersion: '1',
        observedAt: parsed.generatedAt,
        sourceRecordRef: `${PARTNER_PROFILE_COVERAGE_INPUT_REF}#/evidenceByPartnerCode/${partnerCode}`,
      },
    };
  });
}

export function derivePartnerProfileCoverage(
  artifact: PartnerProfileCoverageArtifact,
  visibleCodes: readonly PartnerCode[]
): PartnerProfileCoverageResult {
  const parsed = parsePartnerProfileCoverageArtifact(artifact);
  const requested = visibleCodes.map(parsePartnerCode);
  if (new Set(requested).size !== requested.length) {
    throw new TypeError('visibleCodes must not contain duplicate PartnerCode values');
  }
  requested.sort();
  const presentCodes = requested.filter(code => parsed.evidenceByPartnerCode[code] !== undefined);
  const missingCodes = requested.filter(code => parsed.evidenceByPartnerCode[code] === undefined);
  return { presentCodes, missingCodes, complete: missingCodes.length === 0 };
}
