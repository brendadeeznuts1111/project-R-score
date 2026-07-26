/**
 * runFlow edit-in-place via lastTemplateIds; ops-sync ChatChannelMeta link.
 */
import { describe, expect, test } from 'bun:test';
import { randomUUIDv7 } from 'bun';
import { openOperationsDb } from '../lib/operations/db.ts';
import { AccountService } from '../lib/operations/account-service.ts';
import { applyOpsSyncEvent } from '../lib/operations/ops-sync.ts';
import { attachOpsLoopCrosslink } from '../lib/operations/toc-ops-seed.ts';
import { buildDemoTocOpsFixture } from '../lib/toc-ops/fixture.ts';
import {
  getChatChannelMeta,
  linkTelegramChat,
  rememberTemplateMessageId,
} from '../lib/telegram/flows/channel-meta.ts';
import { runFlow } from '../lib/telegram/flows/registry.ts';
import { bindPartnerProfile } from '../lib/operations/partner-profile-bridge.ts';
import { asTreeNodeId } from '../lib/types/branded/operations.ts';

describe('telegram flow edit-in-place', () => {
  test('runFlow reuses lastTemplateIds for slash command refresh', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const agentId = randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, call_sign, telegram_id, active, created_at)
       VALUES ($id, 'agent', 'Agent', 'PAT-001', '4242', 1, $now)`,
      { $id: agentId, $now: now }
    );
    bindPartnerProfile(db, asTreeNodeId(agentId));
    linkTelegramChat(db, {
      treeNodeId: asTreeNodeId(agentId),
      callSign: 'PAT-001',
      chatId: '4242',
      bindTreeNode: false,
    });
    rememberTemplateMessageId(db, '4242', 'status.v1', 88);

    const output = runFlow(db, ':memory:', {
      flowId: 'status',
      chatId: '4242',
      userId: '4242',
    });
    expect(output.editMessageId).toBe(88);
    expect(output.templateId).toBe('status.v1');
    db.close();
  });

  test('refresh callback keeps explicit messageId from callback context', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const agentId = randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, call_sign, telegram_id, active, created_at)
       VALUES ($id, 'agent', 'Agent', 'PAT-001', '4242', 1, $now)`,
      { $id: agentId, $now: now }
    );
    bindPartnerProfile(db, asTreeNodeId(agentId));
    linkTelegramChat(db, {
      treeNodeId: asTreeNodeId(agentId),
      callSign: 'PAT-001',
      chatId: '4242',
      bindTreeNode: false,
    });
    rememberTemplateMessageId(db, '4242', 'balances.v1', 99);

    const output = runFlow(db, ':memory:', {
      flowId: 'balances',
      chatId: '4242',
      userId: '4242',
      callbackData: 'f:balances:r',
      editMessageId: 12,
    });
    expect(output.editMessageId).toBe(12);
    db.close();
  });
});

describe('ops-sync telegram_linked', () => {
  test('upserts ChatChannelMeta when telegram links portal account', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const svc = new AccountService(db);

    applyOpsSyncEvent(
      svc,
      {
        type: 'account_assigned',
        tenantId: 'factory',
        oidcSubject: 'sub-link',
        email: 'link@factory-wager.com',
        source: 'portal',
      },
      db
    );

    applyOpsSyncEvent(
      svc,
      {
        type: 'telegram_linked',
        tenantId: 'factory',
        oidcSubject: 'sub-link',
        email: 'link@factory-wager.com',
        telegramUserId: '515151',
        source: 'telegram',
      },
      db
    );

    const meta = getChatChannelMeta(db, '515151');
    expect(meta?.chatId).toBe('515151');
    expect(meta?.topics?.identity).toBe(1);
    expect(meta?.topics?.plays).toBe(1);
    db.close();
  });
});

describe('toc ops loop crosslink', () => {
  test('attachOpsLoopCrosslink adds opsLoop slice from live metrics', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const fixture = buildDemoTocOpsFixture();
    const enriched = attachOpsLoopCrosslink(db, fixture);
    expect(enriched.opsLoop).toBeDefined();
    expect(typeof enriched.opsLoop!.loopCompletionRate).toBe('number');
    db.close();
  });
});
