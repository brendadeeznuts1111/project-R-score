import { describe, expect, test } from 'bun:test';
import {
  ALL_ACCOUNTING_SURFACE_SLUG,
  formatTocOpsGroupTitle,
  getSurface,
  listSurfaceSlugs,
  loadTelegramSurfacesMap,
} from '../lib/telegram/surfaces.ts';
import { forumTopicNamesForSurface } from '../lib/telegram/branding.ts';
import { buildAllAccountingChannelPrompt, buildHouseForumWelcomePrompt } from '../lib/telegram/seat-desk-partner-message.ts';

describe('all-accounting surface', () => {
  test('registered in TOC_OPS_SURFACES', () => {
    expect(listSurfaceSlugs()).toContain(ALL_ACCOUNTING_SURFACE_SLUG);
    const s = getSurface(ALL_ACCOUNTING_SURFACE_SLUG);
    expect(s?.concern).toBe('accounting');
    expect(formatTocOpsGroupTitle(s!)).toBe('TOC Ops · Accounting');
  });

  test('forum topics are Deposits / Withdrawals / Reconcile', () => {
    expect(forumTopicNamesForSurface(ALL_ACCOUNTING_SURFACE_SLUG)).toEqual([
      'Deposits',
      'Withdrawals',
      'Reconcile',
    ]);
  });

  test('TELEGRAM_ACCOUNTING_CHAT_ID merges into surfaces map', () => {
    const map = loadTelegramSurfacesMap({
      TELEGRAM_ACCOUNTING_CHAT_ID: '-100777',
    });
    expect(map[ALL_ACCOUNTING_SURFACE_SLUG]).toBe('-100777');
  });

  test('buildAllAccountingChannelPrompt describes cross-partner rollup', () => {
    const msg = buildAllAccountingChannelPrompt();
    expect(msg).toContain('all accounting');
    expect(msg).toContain('package forum · Accounting topic');
  });

  test('buildHouseForumWelcomePrompt covers hq and sandbox', () => {
    const hq = buildHouseForumWelcomePrompt('hq');
    expect(hq).toContain('TOC Ops · HQ');
    expect(hq).toContain('alerts');
    const sandbox = buildHouseForumWelcomePrompt('sandbox');
    expect(sandbox).toContain('sandbox');
    expect(sandbox).toContain('scratch');
    expect(buildHouseForumWelcomePrompt('all-accounting')).toContain('all accounting');
  });
});
