import {
  parseAdapterId,
  parsePartnerCallSign,
  parsePartnerCode,
  parseSourceSystemId,
} from '../core/identifiers.ts';
import type { FactProvenance, PartnerCallSign, PartnerCode } from '../core/types.ts';
import {
  wireArray,
  wireBoolean,
  wireNonnegativeInteger,
  wireRecord,
  wireText,
  wireTimestamp,
} from './wire.ts';

export const TELEGRAM_HANDSHAKE_SCHEMA_V1 = 'factorywager.telegram-handshake.v1' as const;
export const TELEGRAM_HANDSHAKE_PHASES = [
  'blocked',
  'forum_ready',
  'designated',
  'operator_ready',
] as const;
export type TelegramHandshakePhase = (typeof TELEGRAM_HANDSHAKE_PHASES)[number];

export type PartnerCommunicationObservation = {
  partnerCode: PartnerCode;
  callSign: PartnerCallSign;
  phase: TelegramHandshakePhase;
  handshakeOk: boolean;
  dmLinkage: 'linked' | 'unlinked' | 'unknown';
  gapCount: number;
  topGap: string | null;
  nextSteps: string[];
  membershipDetailExposed: false;
  configuredTopicsExposed: false;
  observedAt: string;
  provenance: FactProvenance;
};

function dmLinkage(value: string): PartnerCommunicationObservation['dmLinkage'] {
  const normalized = value.toLowerCase();
  if (normalized.startsWith('linked')) return 'linked';
  if (normalized === 'none' || normalized.includes('unlinked') || normalized.includes('missing')) {
    return 'unlinked';
  }
  return 'unknown';
}

/** Public-safe projection; invite URLs and presentation-only membership cells are discarded. */
export function parseTelegramHandshakeArtifact(value: unknown): PartnerCommunicationObservation[] {
  const root = wireRecord(value, 'telegram');
  if (root.schema !== TELEGRAM_HANDSHAKE_SCHEMA_V1) {
    throw new TypeError(`telegram.schema must be ${TELEGRAM_HANDSHAKE_SCHEMA_V1}`);
  }
  const observedAt = wireTimestamp(root.generatedAt, 'telegram.generatedAt');
  const observations = wireArray(root.rows, 'telegram.rows').map((raw, index) => {
    const path = `telegram.rows[${index}]`;
    const row = wireRecord(raw, path);
    const partnerCode = parsePartnerCode(row.partnerCode);
    const callSign = parsePartnerCallSign(row.callSign, partnerCode);
    const phase = wireText(row.phase, `${path}.phase`);
    if (!TELEGRAM_HANDSHAKE_PHASES.includes(phase as TelegramHandshakePhase)) {
      throw new TypeError(`${path}.phase is not a supported handshake phase`);
    }
    const handshakeOk = wireBoolean(row.handshakeOk, `${path}.handshakeOk`);
    const dmSeatStatus = wireText(row.dmSeatStatus, `${path}.dmSeatStatus`);
    const topGap = row.topGap === null ? null : wireText(row.topGap, `${path}.topGap`);
    const nextSteps = wireArray(row.nextSteps, `${path}.nextSteps`).map((step, stepIndex) =>
      wireText(step, `${path}.nextSteps[${stepIndex}]`)
    );
    return {
      partnerCode,
      callSign,
      phase: phase as TelegramHandshakePhase,
      handshakeOk,
      dmLinkage: dmLinkage(dmSeatStatus),
      gapCount: wireNonnegativeInteger(row.gapCount, `${path}.gapCount`),
      topGap,
      nextSteps,
      membershipDetailExposed: false as const,
      configuredTopicsExposed: false as const,
      observedAt,
      provenance: {
        sourceSystemId: parseSourceSystemId('factorywager-telegram'),
        sourceRecordRef: `handshake:${partnerCode}`,
        adapterId: parseAdapterId('telegram-handshake-v1'),
        adapterVersion: '1',
        observedAt,
        originalValue: `${phase}:${handshakeOk}`,
        mappingMethod: 'identity' as const,
        confidence: 'exact' as const,
      },
    };
  });
  const codes = observations.map(row => row.partnerCode);
  if (new Set(codes).size !== codes.length) {
    throw new TypeError('telegram.rows contains duplicate PartnerCode');
  }
  return observations.sort((left, right) => left.partnerCode.localeCompare(right.partnerCode));
}
