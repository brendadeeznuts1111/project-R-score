// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  OPS_VIEW_COLLAPSE_BACKLOG,
  OPS_VIEW_MVP_CONCEPT_IDS,
  opsViewGlossaryConcepts,
} from '../lib/telegram/ops-view-glossary.ts';
import {
  buildPerAccountAccountingView,
  conceptIdForPartnerOpsEvent,
} from '../lib/telegram/ops-accounting-view.ts';
import { telegramGlossaryConcepts } from '../lib/telegram/telegram-glossary.ts';
import { TELEGRAM_GLOSSARY_CONCEPT_IDS } from '../lib/telegram/handshake-catalog.ts';
import { PARTNER_OPS_CONCEPT_COLORS } from '../lib/telegram/partner-ops-color-kernel.ts';

describe('ops-view glossary MVP', () => {
  test('ships dimension roots + per-account chrome without Kalshi collisions', () => {
    const concepts = opsViewGlossaryConcepts();
    const ids = concepts.map(c => c.id);
    expect(ids).toEqual([...OPS_VIEW_MVP_CONCEPT_IDS]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id.startsWith('ops.view.')).toBe(true);
      expect(id in PARTNER_OPS_CONCEPT_COLORS).toBe(true);
    }
    const deposits = concepts.find(c => c.id === 'ops.view.account_deposits');
    expect(deposits?.seeAlso).toContain('accounting.deposit');
    expect(deposits?.seeAlso).toContain('event.deposit.received');
    expect(concepts.find(c => c.id === 'ops.view.account_net')?.kind).toBe('composite');
  });

  test('telegram message chrome IDs stay aligned with handshake catalog', () => {
    const messageIds = telegramGlossaryConcepts()
      .map(c => c.id)
      .filter(
        id =>
          id.startsWith('telegram.message.') ||
          id.startsWith('telegram.status.') ||
          id.startsWith('telegram.action.')
      );
    expect(messageIds).toContain('telegram.message.command');
    expect(messageIds).toContain('telegram.message.alert');
    expect(messageIds).not.toContain('telegram.status.read');
    for (const id of messageIds) {
      expect(TELEGRAM_GLOSSARY_CONCEPT_IDS).toContain(id);
      expect(id in PARTNER_OPS_CONCEPT_COLORS).toBe(true);
    }
  });

  test('buildPerAccountAccountingView sums deposit rows and tags concept ids', () => {
    const view = buildPerAccountAccountingView({
      code: 'ASH',
      accounting: {
        fundStatus: 'open',
        incompleteOuts: 1,
        deposits: [
          { amount: 100, date: '2026-07-01', rail: 'venmo' },
          { amount: 50, date: '2026-07-02', rail: 'zelle' },
        ],
        credits: [{ amount: 25, date: '2026-07-03' }],
        freeRoll: { total: 100, used: 10 },
        ledger: [],
      },
    });
    expect(view).not.toBeNull();
    expect(view!.type).toBe('per_account');
    expect(view!.partnerCode).toBe('ASH');
    expect(view!.summary.deposits).toBe(150);
    expect(view!.summary.credits).toBe(25);
    expect(view!.summary.freeRollApplied).toBe(10);
    expect(view!.summary.net).toBe(175);
    expect(view!.conceptIds.dimension).toBe('ops.view.per_account');
    expect(view!.conceptIds.deposits).toBe('ops.view.account_deposits');
    expect(conceptIdForPartnerOpsEvent('DEPOSIT_RECEIVED')).toBe('event.deposit.received');
  });

  test('domain-glossary bake includes ops.view and telegram.message MVP ids', async () => {
    const bake = await Bun.file('public/registry/domain-glossary.json').json();
    const ids = new Set(bake.concepts.map((c: { id: string }) => c.id)); // brand-ok — glossary concept keys
    for (const id of OPS_VIEW_MVP_CONCEPT_IDS) {
      expect(ids.has(id)).toBe(true);
    }
    expect(ids.has('telegram.message.command')).toBe(true);
    expect(ids.has('telegram.action.pin')).toBe(true);
    expect(bake.sources.opsViewAuthority).toBe('lib/telegram/ops-view-glossary.ts');
  });

  test('collapse backlog never mints deferred ids and targets exist in bake', async () => {
    const minted = new Set<string>(OPS_VIEW_MVP_CONCEPT_IDS);
    const bake = await Bun.file('public/registry/domain-glossary.json').json();
    const bakeIds = new Set(bake.concepts.map((c: { id: string }) => c.id)); // brand-ok — glossary concept keys
    for (const [deferred, target] of Object.entries(OPS_VIEW_COLLAPSE_BACKLOG)) {
      expect(minted.has(deferred)).toBe(false);
      expect(bakeIds.has(deferred)).toBe(false);
      expect(bakeIds.has(target)).toBe(true);
    }
  });
});
