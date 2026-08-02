/**
 * Opportunity projection for the append-only partner-ops event stream.
 *
 * Opportunities model pipeline work. Commercial deal terms remain owned by
 * TocDealTerms and are referenced here only by agreement id.
 */
import type { PartnerOpsEvent } from './partner-ops-events.ts';

export const OPPORTUNITY_STAGES = [
  'new',
  'qualifying',
  'proposal',
  'contracting',
  'won',
  'lost',
] as const;

export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number];

export type OpportunityHistoryEntry = {
  at: string;
  code: PartnerOpsEvent['code'];
  conceptId: string; // brand-ok — glossary concept key
  stage?: OpportunityStage;
  previousStage?: OpportunityStage;
  note?: string;
};

export type PartnersOpsOpportunity = {
  id: string; // brand-ok — opportunity wire id (opp-{PARTNER}-{token})
  partnerCode: string; // brand-ok — partner CODE wire
  title: string;
  stage: OpportunityStage;
  accountIds: string[]; // brand-ok — linked external/account-registry ids
  agreementIds: string[]; // brand-ok — TocDealTerms dealId references
  owner?: string;
  value?: number;
  nextAction?: string;
  openedAt: string;
  updatedAt: string;
  history: OpportunityHistoryEntry[];
};

const OPPORTUNITY_EVENT_CODES = new Set<PartnerOpsEvent['code']>([
  'OPPORTUNITY_CREATED',
  'OPPORTUNITY_STAGE_CHANGED',
  'OPPORTUNITY_ACCOUNT_LINKED',
  'OPPORTUNITY_AGREEMENT_CREATED',
]);

export function isOpportunityStage(value: string): value is OpportunityStage {
  return (OPPORTUNITY_STAGES as readonly string[]).includes(value);
}

function unique(existing: readonly string[], incoming: readonly string[] | undefined): string[] {
  return [...new Set([...existing, ...(incoming ?? [])].filter(Boolean))];
}

function latestAt(a: string, b: string): string {
  return a.localeCompare(b) >= 0 ? a : b;
}

/** Rebuild current opportunity state deterministically from the complete event stream. */
export function foldPartnerOpportunities(
  events: readonly PartnerOpsEvent[],
  partnerCode: string // brand-ok — partner CODE wire
): PartnersOpsOpportunity[] {
  const normalizedPartner = partnerCode.trim().toUpperCase();
  const projected = new Map<string, PartnersOpsOpportunity>();
  const ordered = events
    .filter(event => String(event.partnerCode || '').toUpperCase() === normalizedPartner)
    .filter(event => OPPORTUNITY_EVENT_CODES.has(event.code) && Boolean(event.opportunityId))
    .filter(event =>
      new RegExp(`^opp-${normalizedPartner}-[A-Za-z0-9-]+$`, 'i').test(event.opportunityId!)
    )
    .map((event, index) => ({ event, index }))
    .sort((a, b) => a.event.at.localeCompare(b.event.at) || a.index - b.index);

  for (const { event } of ordered) {
    const id = event.opportunityId!;
    let opportunity = projected.get(id);
    if (!opportunity) {
      if (event.code !== 'OPPORTUNITY_CREATED') continue;
      opportunity = {
        id,
        partnerCode: normalizedPartner,
        title: event.title?.trim() || id,
        stage: event.stage && isOpportunityStage(event.stage) ? event.stage : 'new',
        accountIds: [],
        agreementIds: [],
        ...(event.owner?.trim() ? { owner: event.owner.trim() } : {}),
        ...(event.value != null && Number.isFinite(event.value) ? { value: event.value } : {}),
        ...(event.nextAction?.trim() ? { nextAction: event.nextAction.trim() } : {}),
        openedAt: event.at,
        updatedAt: event.at,
        history: [],
      };
      projected.set(id, opportunity);
    }

    if (event.code === 'OPPORTUNITY_CREATED') {
      opportunity.title = event.title?.trim() || opportunity.title;
      opportunity.openedAt =
        event.at.localeCompare(opportunity.openedAt) < 0 ? event.at : opportunity.openedAt;
    }
    if (
      (event.code === 'OPPORTUNITY_CREATED' || event.code === 'OPPORTUNITY_STAGE_CHANGED') &&
      event.stage &&
      isOpportunityStage(event.stage)
    ) {
      opportunity.stage = event.stage;
    }
    if (event.owner?.trim()) opportunity.owner = event.owner.trim();
    if (event.value != null && Number.isFinite(event.value)) opportunity.value = event.value;
    if (event.nextAction?.trim()) opportunity.nextAction = event.nextAction.trim();
    if (event.code === 'OPPORTUNITY_CREATED' || event.code === 'OPPORTUNITY_ACCOUNT_LINKED') {
      opportunity.accountIds = unique(opportunity.accountIds, event.accountIds);
    }
    if (event.code === 'OPPORTUNITY_CREATED' || event.code === 'OPPORTUNITY_AGREEMENT_CREATED') {
      opportunity.agreementIds = unique(opportunity.agreementIds, event.agreementIds);
    }
    opportunity.updatedAt = latestAt(opportunity.updatedAt, event.at);
    opportunity.history.push({
      at: event.at,
      code: event.code,
      conceptId: event.conceptId,
      ...(event.stage && isOpportunityStage(event.stage) ? { stage: event.stage } : {}),
      ...(event.previousStage && isOpportunityStage(event.previousStage)
        ? { previousStage: event.previousStage }
        : {}),
      ...(event.note ? { note: event.note } : {}),
    });
  }

  return [...projected.values()].sort(
    (a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id)
  );
}
