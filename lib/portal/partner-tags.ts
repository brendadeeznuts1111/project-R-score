/**
 * Partner domain filter tag taxonomy.
 *
 * Reconciliation with the portal framework:
 * - Every tag references a SHIPPED glossary concept id (Kalshi cores +
 *   Factory overlay). Aggregate tags (funding/location groups) reference
 *   multiple concept ids via `members`.
 * - Proposed-new concept ids (out.status.zero_balance, deposit.method.btc/eth/
 *   usdt/cash, location.*) carry `proposed: true` (🟠) and are skipped by the
 *   integration validator — they are NOT implemented.
 * - Tags carry no colors: consumers resolve colors through
 *   partnerOpsConceptColorWire() using the referenced concept id.
 */

export type PartnerTag =
  | {
      id: string; // brand-ok — filter tag key (UI chrome, not a domain entity id)
      label: string;
      glossaryId: string; // brand-ok — single glossary concept key
      proposed?: boolean;
    }
  | {
      id: string; // brand-ok — filter tag key (UI chrome, not a domain entity id)
      label: string;
      members: readonly string[]; // brand-ok — aggregate of concept keys
      proposed?: boolean;
    };

export const PARTNER_TAGS = {
  phase: [
    { id: 'tag.phase.onboarding', label: 'Onboarding', glossaryId: 'partner.phase.onboarding' },
    { id: 'tag.phase.ready', label: 'Ready', glossaryId: 'partner.phase.operator_ready' },
    { id: 'tag.phase.incomplete', label: 'Incomplete', glossaryId: 'partner.phase.incomplete' },
    { id: 'tag.phase.paused', label: 'Paused', glossaryId: 'partner.phase.paused' },
  ],
  bookType: [
    { id: 'tag.book.legal', label: 'Legal', glossaryId: 'book.type.legal' },
    { id: 'tag.book.pph', label: 'PPH', glossaryId: 'book.type.pph' },
    { id: 'tag.book.crypto', label: 'Crypto', glossaryId: 'book.type.crypto' },
    { id: 'tag.book.offshore', label: 'Offshore', glossaryId: 'book.type.offshore' },
  ],
  status: [
    { id: 'tag.status.ready', label: 'Ready', glossaryId: 'out.status.ready' },
    { id: 'tag.status.deferred', label: 'Deferred', glossaryId: 'out.status.deferred' },
    { id: 'tag.status.paused', label: 'Paused', glossaryId: 'out.status.paused' },
    { id: 'tag.status.blocked', label: 'Blocked', glossaryId: 'out.status.blocked' },
    { id: 'tag.status.partial', label: 'Partial', glossaryId: 'out.status.partial' },
    { id: 'tag.status.funded', label: 'Funded', glossaryId: 'out.status.funded' },
    {
      id: 'tag.status.zero_balance',
      label: 'Zero balance',
      glossaryId: 'out.status.zero_balance', // 🟠 proposed-new
      proposed: true,
    },
  ],
  funding: [
    {
      id: 'tag.funding.ecash',
      label: 'E-Cash',
      members: [
        'deposit.method.venmo',
        'deposit.method.cashapp',
        'deposit.method.zelle',
        'deposit.method.paypal',
      ],
    },
    {
      id: 'tag.funding.crypto',
      label: 'Crypto',
      members: ['deposit.method.btc', 'deposit.method.eth', 'deposit.method.usdt'], // 🟠 proposed-new rails
      proposed: true,
    },
    {
      id: 'tag.funding.traditional',
      label: 'Traditional',
      members: ['deposit.method.wire'],
    },
    {
      id: 'tag.funding.cash',
      label: 'Cash',
      glossaryId: 'deposit.method.cash', // 🟠 proposed-new
      proposed: true,
    },
    { id: 'tag.funding.credit', label: 'Credit', members: ['deposit.method.credit'] },
  ],
  location: [
    {
      id: 'tag.location.us_legal',
      label: 'US legal',
      members: ['location.state', 'location.device'], // 🟠 proposed-new
      proposed: true,
    },
    {
      id: 'tag.location.us_pph',
      label: 'US PPH',
      members: ['location.city'], // 🟠 proposed-new
      proposed: true,
    },
    {
      id: 'tag.location.offshore',
      label: 'Offshore',
      members: ['location.country', 'location.ip'], // 🟠 proposed-new
      proposed: true,
    },
  ],
} as const satisfies Record<string, readonly PartnerTag[]>;

export type PartnerTagGroup = keyof typeof PARTNER_TAGS;

/** All tags, flattened. */
export function allPartnerTags(): readonly PartnerTag[] {
  return Object.values(PARTNER_TAGS).flat();
}

/** Reverse lookup: which tags reference a given glossary concept id. */
export function tagsForGlossaryId(
  glossaryId: string /* brand-ok — glossary concept key */
): readonly PartnerTag[] {
  return allPartnerTags().filter(tag =>
    'glossaryId' in tag ? tag.glossaryId === glossaryId : tag.members.includes(glossaryId)
  );
}

/** All concept ids referenced by tags (for the integration validator). */
export function partnerTagGlossaryIds(): string[] {
  const ids: string[] = [];
  for (const tag of allPartnerTags()) {
    if ('glossaryId' in tag) ids.push(tag.glossaryId);
    else ids.push(...tag.members);
  }
  return ids;
}
