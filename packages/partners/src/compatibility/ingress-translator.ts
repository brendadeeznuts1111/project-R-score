import { parseCanonicalOutId, parsePartnerCode } from '../core/identifiers.ts';
import type { OutId } from '../core/types.ts';

export const LEGACY_SEAT_OUT_TOKEN_PATTERN = '^([A-Z]{3,6})-([1-9][0-9]*)$';
export const INGRESS_TRANSLATION_COUNTER = 'partner_ingress_translation_total';
export const LEGACY_OUT_ID_WARNING_CODE = 'partner.out_id.legacy_translated';
const LEGACY_SEAT_OUT_TOKEN_RE = new RegExp(LEGACY_SEAT_OUT_TOKEN_PATTERN);

export type OutIdIngressTranslation =
  | { outId: OutId; translated: false }
  | {
      outId: OutId;
      translated: true;
      originalValue: string;
      mappingId: 'legacy-seat-out-token';
      deprecation: {
        warningCode: typeof LEGACY_OUT_ID_WARNING_CODE;
        counter: typeof INGRESS_TRANSLATION_COUNTER;
      };
    };

export type IngressTranslator = {
  translateOutId(value: unknown): OutIdIngressTranslation;
};

export function translateOutIdIngress(value: unknown): OutIdIngressTranslation {
  if (typeof value !== 'string') throw new TypeError('OutId ingress value must be a string');
  try {
    return { outId: parseCanonicalOutId(value), translated: false };
  } catch {
    const match = LEGACY_SEAT_OUT_TOKEN_RE.exec(value);
    if (!match) throw new TypeError(`Unknown OutId ingress mapping: ${value}`);
    const code = parsePartnerCode(match[1]);
    return {
      outId: parseCanonicalOutId(`out-${code}-${match[2]}`),
      translated: true,
      originalValue: value,
      mappingId: 'legacy-seat-out-token',
      deprecation: {
        warningCode: LEGACY_OUT_ID_WARNING_CODE,
        counter: INGRESS_TRANSLATION_COUNTER,
      },
    };
  }
}

export const ingressTranslator: IngressTranslator = {
  translateOutId: translateOutIdIngress,
};
