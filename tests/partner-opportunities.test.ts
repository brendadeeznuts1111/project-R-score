// @see https://bun.com/docs/test/writing-tests — bun:test
import { describe, expect, test } from 'bun:test';
import { buildPartnerOpsEvent } from '../lib/telegram/partner-ops-events.ts';
import { foldPartnerOpportunities } from '../lib/telegram/partner-opportunities.ts';

describe('partner opportunity projection', () => {
  test('folds creation, stage, account, and agreement events deterministically', () => {
    const events = [
      buildPartnerOpsEvent('OPPORTUNITY_AGREEMENT_CREATED', {
        at: '2026-08-04T12:00:00.000Z',
        partnerCode: 'ASH',
        opportunityId: 'opp-ASH-001',
        agreementIds: ['deal-ash-standard'],
      }),
      buildPartnerOpsEvent('OPPORTUNITY_CREATED', {
        at: '2026-08-01T12:00:00.000Z',
        partnerCode: 'ASH',
        opportunityId: 'opp-ASH-001',
        title: 'Second sportsbook account',
        owner: 'ops',
        value: 12000,
        nextAction: 'Confirm account owner',
      }),
      buildPartnerOpsEvent('OPPORTUNITY_STAGE_CHANGED', {
        at: '2026-08-02T12:00:00.000Z',
        partnerCode: 'ASH',
        opportunityId: 'opp-ASH-001',
        previousStage: 'new',
        stage: 'qualifying',
      }),
      buildPartnerOpsEvent('OPPORTUNITY_ACCOUNT_LINKED', {
        at: '2026-08-03T12:00:00.000Z',
        partnerCode: 'ASH',
        opportunityId: 'opp-ASH-001',
        accountIds: ['account-42', 'account-42'],
      }),
    ];

    const first = foldPartnerOpportunities(events, 'ASH');
    const replay = foldPartnerOpportunities(events, 'ASH');
    expect(replay).toEqual(first);
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({
      id: 'opp-ASH-001',
      stage: 'qualifying',
      accountIds: ['account-42'],
      agreementIds: ['deal-ash-standard'],
      openedAt: '2026-08-01T12:00:00.000Z',
      updatedAt: '2026-08-04T12:00:00.000Z',
    });
    expect(first[0]?.history).toHaveLength(4);
  });

  test('ignores orphan mutations and events belonging to another partner', () => {
    const events = [
      buildPartnerOpsEvent('OPPORTUNITY_STAGE_CHANGED', {
        partnerCode: 'ASH',
        opportunityId: 'opp-ASH-orphan',
        stage: 'won',
      }),
      buildPartnerOpsEvent('OPPORTUNITY_CREATED', {
        partnerCode: 'PAT',
        opportunityId: 'opp-PAT-001',
        title: 'Other partner',
      }),
    ];
    expect(foldPartnerOpportunities(events, 'ASH')).toEqual([]);
  });
});
