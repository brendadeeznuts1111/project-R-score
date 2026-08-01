import { describe, expect, test } from 'bun:test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  analyzeGeneralTopicBehavior,
  analyzePartnerTopicIconMetadata,
  analyzeSeatCapitalDeskGaps,
  runDeterministicAnalyzers,
} from '../lib/telegram/catalog-research/analyzers.ts';
import { loadCatalogResearchContext } from '../lib/telegram/catalog-research/context.ts';
import { runCatalogResearchAgent } from '../lib/telegram/catalog-research/agent.ts';
import { buildHandshakeCatalog } from '../lib/telegram/handshake-catalog.ts';
import { isValidForumTopicIconColor, validateForumTopicIconSuggestion } from '../lib/telegram/catalog-research/validators.ts';
import { PARTNER_TOPIC_ICON_SUGGESTIONS } from '../lib/telegram/catalog-research/suggested-icons.ts';
import { CATALOG_ENHANCEMENT_SCHEMA } from '../lib/telegram/catalog-research/types.ts';

describe('telegram-catalog-research', () => {
  test('partner icon suggestions use valid Bot API color range', () => {
    for (const icon of Object.values(PARTNER_TOPIC_ICON_SUGGESTIONS)) {
      expect(isValidForumTopicIconColor(icon.iconColor)).toBe(true);
      expect(validateForumTopicIconSuggestion(icon).ok).toBe(true);
    }
  });

  test('analyzePartnerTopicIconMetadata proposes catalog metadata for each bot-created topic', () => {
    const catalog = buildHandshakeCatalog();
    const proposals = analyzePartnerTopicIconMetadata(catalog);
    expect(proposals.length).toBe(4);
    expect(proposals.every(p => p.action === 'addTopicIconMetadata')).toBe(true);
    expect(proposals.every(p => p.autoApplySafe)).toBe(true);
  });

  test('analyzeSeatCapitalDeskGaps proposes harness-staging for blocked capital desks', () => {
    const proposals = analyzeSeatCapitalDeskGaps({
      catalogPath: '',
      forumsMetaDir: '',
      partnerCodes: ['BIL'],
      forumMetaByPartner: new Map(),
      houseMetaBySurface: new Map(),
      seatCapitalByPartner: new Map([
        [
          'BIL',
          {
            callSign: 'BIL-001',
            fundStatus: 'blocked',
            fundDetail: 'lead out missing send-to',
            incompleteOuts: 1,
          },
        ],
      ]),
      allAccountingPromptPosted: false,
    });
    const blocked = proposals.find(p => p.id.includes('capital-blocked'));
    expect(blocked?.applyCommand).toBe('bun run seat:desk:harness-staging BIL-001');
  });

  test('analyzeGeneralTopicBehavior documents implicit General thread', () => {
    const catalog = buildHandshakeCatalog();
    const proposals = analyzeGeneralTopicBehavior(catalog);
    expect(proposals).toHaveLength(1);
    expect(proposals[0]?.action).toBe('documentBehavior');
    expect(proposals[0]?.autoApplySafe).toBe(true);
  });

  test('buildHandshakeCatalog seeds pinnedTemplateRefs for partner + house prompts', () => {
    const catalog = buildHandshakeCatalog();
    const refs = catalog.seatDeskTemplates.pinnedTemplateRefs;
    expect(refs['partner:accounting']?.templateId).toBe('topic-accounting');
    expect(refs['partner:liquidity/outs:intake']?.templateId).toBe('topic-intake');
    expect(refs['partner:liquidity/outs:rails']?.templateId).toBe('topic-rails');
    expect(refs['house:all-accounting']?.templateId).toBe('all-accounting-channel');
  });

  test('applyProposalToOverrides records documentBehavior notes', async () => {
    const { applyProposalToOverrides } = await import('../lib/telegram/catalog-research/apply.ts');
    const { emptyCatalogOverrides } = await import('../lib/telegram/catalog-research/merge.ts');
    const overrides = emptyCatalogOverrides();
    const ok = applyProposalToOverrides(overrides, {
      id: 'doc-general',
      severity: 'info',
      target: { kind: 'catalog', section: 'packageForumTopics' },
      action: 'documentBehavior',
      title: 'General is implicit',
      reason: 'thread 1',
      evidence: ['botCreated=false'],
      autoApplySafe: true,
    });
    expect(ok).toBe(true);
    expect(overrides.behaviorNotes['doc-general']?.title).toBe('General is implicit');
    expect(overrides.appliedChangeIds).toContain('doc-general');
  });

  test('runCatalogResearchAgent flags missing accounting prompt from forum metadata', async () => {
    const dir = join(tmpdir(), `catalog-research-${Date.now()}`);
    const forumsDir = join(dir, 'forums');
    await mkdir(forumsDir, { recursive: true });
    await writeFile(
      join(forumsDir, 'TST.json'),
      `${JSON.stringify({
        partnerCode: 'TST',
        title: 'TOC Ops · TST · Test',
        displayName: 'Test',
        chatId: '-10099',
        chatRef: 'tg:chat:-10099',
        inviteLink: '',
        topics: [
          { title: 'General', messageThreadId: 1 },
          { title: 'Ops', messageThreadId: 2 },
          { title: 'Alerts', messageThreadId: 3 },
          { title: 'Liquidity/Outs', messageThreadId: 4 },
          { title: 'Accounting', messageThreadId: 5 },
        ],
        iconUploaded: false,
        createdAt: '2026-01-01T00:00:00.000Z',
      })}\n`
    );

    const report = await runCatalogResearchAgent({
      partnerCodes: ['TST'],
      forumsMetaDir: forumsDir,
    });

    expect(report.schema).toBe(CATALOG_ENHANCEMENT_SCHEMA);
    expect(report.changes.length).toBeGreaterThanOrEqual(3);
    expect(report.meta.catalogPath).toContain('telegram-handshake-catalog');
    expect(report.signals.systemTimeZone.length).toBeGreaterThan(0);
    expect(report.catalog.packageForumTopics.plan).toContain('Accounting');
    const acct = report.proposals.find(p => p.id.includes('accounting-prompt'));
    expect(acct?.severity).toBe('action');
    expect(acct?.applyCommand).toContain('--accounting-prompt');

    await rm(dir, { recursive: true, force: true });
  });

  test('loadCatalogResearchContext reads partner forum gaps', async () => {
    const dir = join(tmpdir(), `ctx-${Date.now()}`);
    const forumsDir = join(dir, 'forums');
    const houseForumsDir = join(dir, 'house');
    await mkdir(forumsDir, { recursive: true });
    await mkdir(houseForumsDir, { recursive: true });
    await writeFile(
      join(forumsDir, 'GAP.json'),
      `${JSON.stringify({
        partnerCode: 'GAP',
        title: 'x',
        displayName: 'x',
        chatId: '-1',
        chatRef: 'tg:chat:-1',
        inviteLink: '',
        topics: [
          { title: 'General', messageThreadId: 1 },
          { title: 'Ops', messageThreadId: 2 },
        ],
        iconUploaded: false,
        createdAt: '2026-01-01T00:00:00.000Z',
      })}\n`
    );
    await writeFile(
      join(houseForumsDir, 'hq.json'),
      `${JSON.stringify({
        surfaceSlug: 'hq',
        title: 'HQ',
        chatId: '-2',
        chatRef: 'tg:chat:-2',
        topics: [],
        topicsThreadMap: { general: 1 },
        welcomePromptMessageId: 7,
        topicsComplete: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      })}\n`
    );

    const { context } = await loadCatalogResearchContext({
      partnerCodes: ['GAP'],
      forumsMetaDir: forumsDir,
      houseForumsMetaDir: houseForumsDir,
    });
    const live = context.forumMetaByPartner.get('GAP');
    expect(live?.missingTopics).toContain('Alerts');
    expect(live?.topicsComplete).toBe(false);
    expect(context.houseMetaBySurface.get('hq')?.welcomePromptPosted).toBe(true);

    const proposals = runDeterministicAnalyzers(buildHandshakeCatalog(), context);
    expect(proposals.some(p => p.title.includes('GAP: incomplete topic plan'))).toBe(true);

    await rm(dir, { recursive: true, force: true });
  });

  test('applyCatalogEnhancements merges safe icon metadata into overrides', async () => {
    const dir = join(tmpdir(), `apply-${Date.now()}`);
    const reportsDir = join(dir, 'reports/telegram');
    await mkdir(reportsDir, { recursive: true });

    const { runCatalogResearchAgent, exportCatalogEnhancementReport } = await import(
      '../lib/telegram/catalog-research/agent.ts'
    );
    const report = await runCatalogResearchAgent({
      partnerCodes: [],
      forumsMetaDir: join(dir, 'forums'),
      root: dir,
    });
    await exportCatalogEnhancementReport(report, dir);

    const { applyCatalogEnhancements } = await import('../lib/telegram/catalog-research/apply.ts');
    const result = await applyCatalogEnhancements({ root: dir, safeOnly: true });
    expect(result.applied).toBeGreaterThan(0);

    const overrides = await Bun.file(join(dir, 'reports/telegram/catalog-overrides.json')).json();
    expect(overrides.partnerTopicIcons?.accounting?.emoji).toBe('📸');

    await rm(dir, { recursive: true, force: true });
  });
});
