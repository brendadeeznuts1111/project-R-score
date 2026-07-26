/** Fixed `generatedAt` for deterministic fixture / seed-narrative assertions. */
export const DEMO_GENERATED_AT = '2026-07-24T00:00:00.000Z' as const;

/** Partner codes in fixture order (ASH Drum · PAT PLAY · NOV ONB). */
export const DEMO_PARTNER_CODES = ['ASH', 'PAT', 'NOV'] as const;

export type DemoPartnerCode = (typeof DEMO_PARTNER_CODES)[number];

export function partnerByCode<T extends { partnerCode: string }>(
  partners: T[],
  code: DemoPartnerCode
): T {
  const p = partners.find(x => x.partnerCode === code);
  if (!p) throw new Error(`missing demo partner ${code}`);
  return p;
}
