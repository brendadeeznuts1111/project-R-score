// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  loadOnboardingDefaultsSync,
  resetOnboardingDefaultsCache,
  templateIdForOnboardingSource,
} from '../lib/operations/onboarding-config.ts';
import {
  DEFAULT_TEMPLATE_ID,
  evaluateForNode,
  loadPartnerTemplateSync,
  listPartnerTemplateIds,
  templateIdForSource,
} from '../lib/operations/partner-profile-bridge.ts';
import { bindPartnerProfile } from '../lib/operations/partner-profile-bridge.ts';
import { openOperationsDb } from '../lib/operations/db.ts';
import { asTreeNodeId } from '../lib/types/branded/operations.ts';

describe('partner template TOML', () => {
  test('listPartnerTemplateIds includes shipped templates', () => {
    const ids = listPartnerTemplateIds();
    expect(ids).toContain('default-prospect');
    expect(ids).toContain('partner-active');
  });

  test('loadPartnerTemplateSync reads default-prospect.toml SoR', () => {
    const t = loadPartnerTemplateSync('default-prospect');
    expect(String(t.template_id)).toBe('default-prospect');
    expect(t.name).toBe('Default Prospect');
    expect(t.sor.max_exposure_per_signal).toBe(2500);
    expect(t.sor.arb_allowed).toBe(false);
    expect(t.sor.steam_allowed).toBe(true);
  });

  test('loadPartnerTemplateSync reads partner-active.toml with higher limits', () => {
    const t = loadPartnerTemplateSync('partner-active');
    expect(String(t.template_id)).toBe('partner-active');
    expect(t.sor.max_exposure_per_signal).toBe(5000);
    expect(t.sor.predictive_allowed).toBe(true);
  });

  test('templateIdForSource maps referral and promoted sources', () => {
    resetOnboardingDefaultsCache();
    expect(String(templateIdForSource('referral'))).toBe(DEFAULT_TEMPLATE_ID);
    expect(String(templateIdForSource('promoted'))).toBe('partner-active');
    expect(String(templateIdForOnboardingSource(undefined))).toBe(DEFAULT_TEMPLATE_ID);
  });

  test('gate uses TOML arb block for default-prospect binding', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const nodeId = Bun.randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, telegram_id, active, status, created_at)
       VALUES ($id, 'agent', 'T', 'tg-t', 1, 'active', $n)`,
      { $id: nodeId, $n: new Date().toISOString() }
    );
    bindPartnerProfile(db, asTreeNodeId(nodeId));
    const gate = evaluateForNode(db, asTreeNodeId(nodeId), {
      suggestedStake: 100,
      signalType: 'arb',
    });
    expect(gate.allowed).toBe(false);
    db.close();
  });

  test('onboarding defaults load from config', () => {
    resetOnboardingDefaultsCache();
    const cfg = loadOnboardingDefaultsSync();
    expect(cfg.defaultExpertSport).toBe('NBA');
    expect(cfg.defaultCutPercentage).toBe(10);
    expect(cfg.defaultTemplateBySource.portal).toBe(DEFAULT_TEMPLATE_ID);
  });
});
