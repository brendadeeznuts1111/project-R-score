import {
  parseAdapterId,
  parseCanonicalOutId,
  parseCurrencyCode,
  parsePartnerCallSign,
  parsePartnerCode,
  parseSourceSystemId,
  parseSportsbookId,
} from '../core/identifiers.ts';
import type { CredentialReadiness, OutLimitFact } from '../core/out-capabilities.ts';
import type {
  FactProvenance,
  MoneyAmount,
  OutId,
  PartnerCallSign,
  PartnerCode,
  SportsbookId,
} from '../core/types.ts';
import {
  wireArray,
  wireBoolean,
  wireNonnegativeInteger,
  wireRecord,
  wireText,
  wireTimestamp,
} from './wire.ts';

export const TENNIS_CAPACITY_ARTIFACT_KIND = 'tennis-partner-contracts' as const;
export const TENNIS_CAPACITY_ARTIFACT_VERSION = 1 as const;
export const TENNIS_CAPACITY_RUNTIME = 'https://tennis.factory-wager.com' as const;

export type TennisOutCapacityObservation = {
  partnerCode: PartnerCode;
  callSign: PartnerCallSign;
  outId: OutId;
  externalBookRef: string | null;
  sportsbookId?: SportsbookId;
  sportsbookResolution: 'mapped' | 'unresolved';
  sourceStatus: string;
  active: boolean;
  credentials: CredentialReadiness;
  maxStake?: MoneyAmount;
  maxStakeFact?: OutLimitFact;
  observedAt: string;
  provenance: FactProvenance;
};

export type TennisCapacityProjection = {
  source: 'live' | 'offline-join' | 'empty';
  executionEvidence: boolean;
  observations: TennisOutCapacityObservation[];
  unresolvedBookRefs: string[];
};

export type ParseTennisCapacityOptions = {
  /** Exact producer book reference to canonical SportsbookId map. */
  bookRefMap?: Readonly<Record<string, unknown>>;
};

function proof(observedAt: string, outId: OutId, originalValue: string): FactProvenance {
  return {
    sourceSystemId: parseSourceSystemId('tennis-hq'),
    sourceRecordRef: `capacity:${outId}`,
    adapterId: parseAdapterId('tennis-capacity-v1'),
    adapterVersion: '1',
    observedAt,
    originalValue,
    mappingMethod: 'identity',
    confidence: 'exact',
  };
}

/** Parse the public Tennis contract artifact without importing Tennis producer code. */
export function parseTennisCapacityArtifact(
  value: unknown,
  options: ParseTennisCapacityOptions = {}
): TennisCapacityProjection {
  const root = wireRecord(value, 'tennis');
  if (root.schemaVersion !== TENNIS_CAPACITY_ARTIFACT_VERSION) {
    throw new TypeError('tennis.schemaVersion must be 1');
  }
  if (root.kind !== TENNIS_CAPACITY_ARTIFACT_KIND) {
    throw new TypeError(`tennis.kind must be ${TENNIS_CAPACITY_ARTIFACT_KIND}`);
  }
  if (root.runtimeUrl !== TENNIS_CAPACITY_RUNTIME) {
    throw new TypeError(`tennis.runtimeUrl must be ${TENNIS_CAPACITY_RUNTIME}`);
  }
  const observedAt = wireTimestamp(root.generatedAt, 'tennis.generatedAt');
  const source = wireText(root.source, 'tennis.source');
  if (source !== 'live' && source !== 'offline-join' && source !== 'empty') {
    throw new TypeError('tennis.source must be live|offline-join|empty');
  }
  const contracts = wireRecord(root.contractPaths, 'tennis.contractPaths');
  if (
    contracts.partnersCapacity !== `${TENNIS_CAPACITY_RUNTIME}/api/v1/partners/capacity` ||
    contracts.accountingFinance !== `${TENNIS_CAPACITY_RUNTIME}/api/v1/accounting/finance`
  ) {
    throw new TypeError('tennis.contractPaths must target authenticated v1 partner contracts');
  }

  const observations: TennisOutCapacityObservation[] = [];
  const unresolved = new Set<string>();
  for (const [partnerIndex, partnerRaw] of wireArray(root.partners, 'tennis.partners').entries()) {
    const partnerPath = `tennis.partners[${partnerIndex}]`;
    const partner = wireRecord(partnerRaw, partnerPath);
    const partnerCode = parsePartnerCode(partner.partnerCode);
    const callSign = parsePartnerCallSign(partner.callSign, partnerCode);
    for (const [outIndex, outRaw] of wireArray(partner.outs, `${partnerPath}.outs`).entries()) {
      const path = `${partnerPath}.outs[${outIndex}]`;
      const out = wireRecord(outRaw, path);
      const outId = parseCanonicalOutId(out.outId);
      if (!String(outId).startsWith(`out-${partnerCode}-`)) {
        throw new TypeError(`${path}.outId must belong to ${partnerCode}`);
      }
      const outCode = parsePartnerCode(out.partnerCode);
      if (outCode !== partnerCode) throw new TypeError(`${path}.partnerCode must match parent`);
      parsePartnerCallSign(out.callSign, partnerCode);
      const sourceStatus = wireText(out.status, `${path}.status`);
      const secretsConfigured =
        out.secretsConfigured === null
          ? null
          : wireBoolean(out.secretsConfigured, `${path}.secretsConfigured`);
      const credentials: CredentialReadiness =
        secretsConfigured === true
          ? 'configured'
          : secretsConfigured === false
            ? 'missing'
            : 'unknown';
      const externalBookRef = out.bookId === null ? null : wireText(out.bookId, `${path}.bookId`);
      const mapped = externalBookRef ? options.bookRefMap?.[externalBookRef] : undefined;
      const sportsbookId = mapped === undefined ? undefined : parseSportsbookId(mapped);
      if (externalBookRef && !sportsbookId) unresolved.add(externalBookRef);
      const perBetMaxCents =
        out.perBetMaxCents === null
          ? null
          : wireNonnegativeInteger(out.perBetMaxCents, `${path}.perBetMaxCents`);
      const maxStake =
        source === 'live' && perBetMaxCents !== null
          ? ({
              currency: parseCurrencyCode('USD'),
              minorUnits: perBetMaxCents,
            } satisfies MoneyAmount)
          : undefined;
      const provenance = proof(observedAt, outId, sourceStatus);
      observations.push({
        partnerCode,
        callSign,
        outId,
        externalBookRef,
        ...(sportsbookId ? { sportsbookId } : {}),
        sportsbookResolution: sportsbookId ? 'mapped' : 'unresolved',
        sourceStatus,
        active: source === 'live' && sourceStatus === 'active',
        credentials,
        ...(maxStake ? { maxStake } : {}),
        ...(maxStake
          ? {
              maxStakeFact: {
                kind: 'max_stake',
                status: 'known',
                amount: maxStake,
                scope: {},
                provenance,
              },
            }
          : {}),
        observedAt,
        provenance,
      });
    }
  }
  return {
    source,
    executionEvidence: source === 'live',
    observations,
    unresolvedBookRefs: [...unresolved].sort(),
  };
}
