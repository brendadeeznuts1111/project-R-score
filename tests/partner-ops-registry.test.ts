// @see https://bun.com/docs/test/index#run-tests — bun:test
import { describe, expect, test } from 'bun:test';
import {
  classifyBookType,
  classifyDepositMethod,
  classifyOutStatus,
  mapHandshakePhase,
  parseBookType,
  bookTypeWire,
  buildPartnersOpsRegistry,
  exportPartnersOpsRegistry,
  validatePartnersOpsRegistry,
  PARTNERS_OPS_SCHEMA,
} from '../lib/telegram/partner-ops-registry.ts';
import { partnerOpsColorMap, partnerOpsConceptColorWire } from '../lib/telegram/partner-ops-color-kernel.ts';
import { partnerOpsGlossaryConcepts } from '../lib/telegram/partner-ops-glossary.ts';
import { PARTNER_OPS_EVENT_CODES, buildPartnerOpsEvent } from '../lib/telegram/partner-ops-events.ts';
import { createTestWorkspace } from './harness.ts';

describe('partner-ops classifiers', () => {
  test('book / rail / out / phase maps', () => {
    expect(classifyBookType('Hard Rock Florida', new Set(['hardrock']))).toBe('legal');
    expect(classifyBookType('Crypto Bet Co', new Set())).toBe('crypto');
    expect(classifyBookType('Agent PPH Desk', new Set())).toBe('pph');
    expect(classifyBookType('Fliff Sweepstakes', new Set())).toBe('sweepstakes');
    expect(classifyBookType('PrizePicks props', new Set())).toBe('sweepstakes');
    expect(classifyBookType('Betfair Exchange', new Set())).toBe('exchange');
    expect(classifyBookType('Kalshi markets', new Set())).toBe('exchange');
    expect(classifyBookType('Mystery Book', new Set())).toBe('offshore');
    expect(classifyDepositMethod('Venmo')).toBe('venmo');
    expect(classifyDepositMethod('Cash App')).toBe('cashapp');
    expect(classifyDepositMethod('house credit')).toBe('credit');
    expect(classifyOutStatus('deferred')).toBe('deferred');
    expect(classifyOutStatus('ready')).toBe('ready');
    expect(mapHandshakePhase('operator_ready')).toBe('operator_ready');
    expect(mapHandshakePhase('forum_ready')).toBe('onboarding');
    expect(mapHandshakePhase('blocked')).toBe('incomplete');
    expect(parseBookType('legal-us')).toBe('legal');
    expect(parseBookType('crpyto')).toBe('crypto');
    expect(parseBookType('sweepstakes')).toBe('sweepstakes');
    expect(parseBookType('exchange')).toBe('exchange');
    expect(parseBookType('pph')).toBe('pph');
    expect(bookTypeWire('legal')).toBe('legal-us');
    expect(bookTypeWire('crypto')).toBe('crypto');
    expect(bookTypeWire('exchange')).toBe('exchange');
  });
});

describe('partner-ops color + glossary', () => {
  test('every concept color resolves via Bun.color', () => {
    const map = partnerOpsColorMap();
    expect(Object.keys(map).length).toBeGreaterThan(20);
    for (const wire of Object.values(map)) {
      expect(wire.hex).toMatch(/^#[0-9A-F]{6}$/i);
      expect(wire.token).toMatch(/^--partner-ops-[a-z_]+$/);
    }
    expect(partnerOpsConceptColorWire('partner.phase.operator_ready').colorKey).toBe('tennis');
    expect(partnerOpsConceptColorWire('ops.limits.effective_limit').colorKey).toBe('research');
    expect(partnerOpsConceptColorWire('publish.ssot_flow_soft').colorKey).toBe('tennis');
    expect(partnerOpsConceptColorWire('publish.pm_proof').colorKey).toBe('kalshi');
    expect(partnerOpsConceptColorWire('publish.mode.soft').colorKey).toBe('middleware');
    expect(partnerOpsConceptColorWire('publish.mode.strict').colorKey).toBe('trading');
    expect(Object.keys(map).length).toBe(65);
  });

  test('Factory overlay glossary stays collision-free; events map to event.*', () => {
    const concepts = partnerOpsGlossaryConcepts();
    const ids = concepts.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every(id => id.includes('.'))).toBe(true);
    // Shared cores live in Kalshi glossary — Factory only overlays extras.
    expect(ids).not.toContain('accounting.free_roll');
    expect(ids).not.toContain('partner.phase.operator_ready');
    expect(ids).toContain('telegram.topic.liquidity');
    expect(ids).toContain('partner.ops.event');
    expect(ids).toContain('deposit.method.cashapp');
    expect(PARTNER_OPS_EVENT_CODES).toContain('DEPOSIT_RECEIVED');
    expect(buildPartnerOpsEvent('DEPOSIT_RECEIVED', { partnerCode: 'ASH', amount: 1 }).conceptId).toBe(
      'event.deposit.received'
    );
  });
});

describe('partners-ops registry bake', () => {
  test('builds v2 registry from seat + handshake without collisions', async () => {
    const registry = await buildPartnersOpsRegistry();
    expect(registry.schema).toBe(PARTNERS_OPS_SCHEMA);
    expect(registry.version).toBe('2');
    expect(registry.partners.length).toBeGreaterThan(0);
    expect(registry.validation.ok).toBe(true);
    expect(registry.eventCodes).toEqual([...PARTNER_OPS_EVENT_CODES]);
    const codes = registry.partners.map(p => p.code);
    expect(new Set(codes).size).toBe(codes.length);
    const calls = registry.partners.map(p => p.callSign);
    expect(new Set(calls).size).toBe(calls.length);
    const ash = registry.partners.find(p => p.code === 'ASH');
    expect(ash?.outs[0]?.id).toMatch(/^out-ASH-\d+$/);
    expect(ash?.outs[0]?.funding.methodConceptId).toMatch(/^deposit\.method\./);
    expect(ash?.phaseConceptId).toMatch(/^partner\.phase\./);
    expect(ash?.tracking.accounts.total).toBe(ash?.outs.length);
    expect(ash?.tracking.limits.tracked).toBeGreaterThan(0);
    expect(ash?.tracking.communication.topicsRequired).toBe(5);
    expect(registry.sources.limitPatterns).toBe('/registry/limit-raises.json');
    expect(registry.summary.accounts).toBe(registry.summary.outs);
  });

  test('validate catches duplicate partner codes', () => {
    const sample = {
      code: 'ASH',
      callSign: 'ASH-001',
      phase: 'operator_ready' as const,
      phaseConceptId: 'partner.phase.operator_ready' as const,
      phaseColor: partnerOpsConceptColorWire('partner.phase.operator_ready'),
      telegram: { chatId: null, topicIds: {} },
      outs: [],
      accounting: {
        fundStatus: 'ready',
        incompleteOuts: 0,
        deposits: [],
        credits: [],
        freeRoll: { total: 0, used: 0 },
        ledger: [],
      },
      tracking: {
        accounts: { total: 0, ready: 0, deferred: 0, blocked: 0 },
        limits: { tracked: 0, missing: 0, coveragePct: 0 },
        communication: {
          chatLinked: false,
          topicsConfigured: 0,
          topicsRequired: 5,
          ready: false,
        },
        accounting: {
          depositVolume: 0,
          creditVolume: 0,
          ledgerEvents: 0,
          freeRollPercent: 0,
          freeRollApplied: 0,
        },
      },
    };
    const issues = validatePartnersOpsRegistry(
      [sample, { ...sample, callSign: 'ASH-002' }],
      new Set(['partner.phase.operator_ready'])
    );
    expect(issues.some(i => i.code === 'partner_code_dup')).toBe(true);
  });

  test('export writes public registry', async () => {
    await using workspace = await createTestWorkspace('partner-ops-registry-');
    const registry = await exportPartnersOpsRegistry(process.cwd(), workspace.root);
    const baked = await Bun.file(workspace.resolve('public/registry/partners-ops.json')).json();
    expect(baked.schema).toBe(PARTNERS_OPS_SCHEMA);
    expect(baked.partners.length).toBe(registry.partners.length);
  });
});
