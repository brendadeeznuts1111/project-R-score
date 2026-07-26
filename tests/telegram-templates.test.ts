/**
 * Telegram template registry + ChatChannelMeta + renderForNode.
 */
import { describe, expect, test } from 'bun:test';
import { randomUUIDv7 } from 'bun';
import { enqueuePartnerWelcomeEvent } from '../lib/channels/outbox.ts';
import { openOperationsDb } from '../lib/operations/db.ts';
import { bindPartnerProfile } from '../lib/operations/partner-profile-bridge.ts';
import {
  getChatChannelMeta,
  linkTelegramChat,
  normalizeTelegramChatRef,
  rememberTemplateMessageId,
} from '../lib/telegram/flows/channel-meta.ts';
import { escapeHtml } from '../lib/telegram/templates/escape.ts';
import { renderTemplate } from '../lib/telegram/templates/registry.ts';
import { renderForNode } from '../lib/telegram/templates/render.ts';
import { asPartnerTemplateId, asTreeNodeId } from '../lib/types/branded/operations.ts';

describe('telegram templates', () => {
  test('escapeHtml escapes markup', () => {
    expect(escapeHtml('a<b>&"')).toBe('a&lt;b&gt;&amp;&quot;');
  });

  test('renderTemplate welcome + balances include keyboard textKeys', () => {
    const welcome = renderTemplate('partner.welcome.v1', {
      locale: 'en',
      displayName: 'TOC ASH-001',
      callSign: 'ASH-001',
      parentName: 'ASH',
      expertName: 'NBA',
      partnerTemplate: 'default-prospect',
      phoneLabel: 'Vegas Main',
      sportsbook: 'Hard Rock',
      jurisdiction: 'FL',
    });
    expect(welcome.parseMode).toBe('HTML');
    expect(welcome.text).toContain('ASH-001');
    expect(welcome.text).toContain('Vegas Main');
    expect(welcome.keyboard?.rows[0]?.[0]?.callbackData).toBe('f:status');

    const accounts = renderTemplate('accounts.v1', {
      locale: 'en',
      callSign: 'ASH-001',
      detailLines: ['hardrock: <b>user1</b> — $2500 (active)'],
    });
    expect(accounts.text).toContain('user1');
    expect(accounts.keyboard?.rows[0]?.[0]?.callbackData).toBe('f:accounts:r');

    const menu = renderTemplate('menu.v1', {
      locale: 'en',
      callSign: 'ASH-001',
      menuTitle: 'Menu',
      menuSubtitle: 'TOC ASH-001 · ASH-001',
      menuHint: 'Pick a card below.',
    });
    expect(menu.text).toContain('Menu');
    expect(menu.keyboard?.rows.some(r => r.some(b => b.callbackData === 'f:tree'))).toBe(true);

    const balances = renderTemplate('balances.v1', {
      locale: 'en',
      callSign: 'ASH-001',
      soft: { partner: 10, expert: 5, house: 2 },
      principalOut: 1000,
      hard: 2500,
      pending: 1,
    });
    expect(balances.text).toContain('Hard:');
    expect(balances.keyboard?.rows.some(r => r.some(b => b.callbackData === 'f:balances:r'))).toBe(
      true
    );
  });

  test('renderForNode pulls seat Soft + phone label', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const agentId = randomUUIDv7();
    const phoneId = randomUUIDv7();
    db.run(
      `INSERT INTO phones (id, model, carrier, status, assigned_to, issued_at)
       VALUES ($id, 'iPhone 12', 'Verizon', 'issued', $agent, $now)`,
      { $id: phoneId, $agent: agentId, $now: now }
    );
    db.run(
      `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, call_sign, telegram_id, phone_id, active, created_at)
       VALUES ($id, 'agent', NULL, NULL, 'TOC ASH-001', 'ASH-001', '999', $phone, 1, $now)`,
      { $id: agentId, $phone: phoneId, $now: now }
    );
    bindPartnerProfile(db, asTreeNodeId(agentId), {
      templateId: asPartnerTemplateId('default-prospect'),
    });
    db.run(
      `INSERT INTO sb_accounts (id, agent_id, book, username, balance, status, created_at)
       VALUES ($aid, $agent, 'hardrock', 'user1', 2500, 'active', $now)`,
      { $aid: randomUUIDv7(), $agent: agentId, $now: now }
    );

    const rendered = renderForNode(db, 'balances.v1', asTreeNodeId(agentId));
    expect(rendered?.text).toContain('ASH-001');
    expect(rendered?.text).toContain('2,500');

    const welcome = renderForNode(db, 'partner.welcome.v1', asTreeNodeId(agentId));
    expect(welcome?.text).toContain('iPhone 12');
    db.close();
  });

  test('enqueuePartnerWelcomeEvent uses HTML template + replyMarkup', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const agentId = randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, call_sign, telegram_id, active, created_at)
       VALUES ($id, 'agent', 'TOC', 'PAT-001', '424242', 1, $now)`,
      { $id: agentId, $now: now }
    );
    const binding = bindPartnerProfile(db, asTreeNodeId(agentId));
    const evt = enqueuePartnerWelcomeEvent(db, {
      treeNodeId: binding.treeNodeId,
      profileKey: binding.profileKey as string,
      partnerTemplate: binding.templateId,
      lifecycleStatus: binding.lifecycleStatus,
      telegramId: '424242',
      nodeName: 'TOC',
    });
    expect(evt).not.toBeNull();
    expect(evt!.payload.parseMode).toBe('HTML');
    expect(String(evt!.payload.text)).toContain('<b>');
    expect(evt!.payload.replyMarkup).toBeDefined();
    db.close();
  });

  test('linkTelegramChat writes ChatChannelMeta and tree_nodes.telegram_id', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const agentId = randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, call_sign, telegram_id, active, created_at)
       VALUES ($id, 'agent', 'TOC', 'NOV-001', NULL, 1, $now)`,
      { $id: agentId, $now: now }
    );

    expect(normalizeTelegramChatRef('tg:chat:-10099')).toBe('-10099');
    const meta = linkTelegramChat(db, {
      treeNodeId: asTreeNodeId(agentId),
      callSign: 'NOV-001',
      chatId: 'tg:chat:-10099',
    });
    expect(meta.chatId).toBe('-10099');
    expect(meta.callSigns).toContain('NOV-001');
    expect(meta.treeNodeIds).toContain(agentId);

    const node = db
      .query('SELECT telegram_id FROM tree_nodes WHERE id = $id')
      .get({ $id: agentId }) as { telegram_id: string };
    expect(node.telegram_id).toBe('-10099');

    rememberTemplateMessageId(db, '-10099', 'balances.v1', 55);
    const again = getChatChannelMeta(db, '-10099');
    expect(again?.lastTemplateIds?.['balances.v1']).toBe(55);

    const { deliverFlowOutput } = await import('../lib/telegram/flows/deliver.ts');
    let editCalls = 0;
    const origSend = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('editMessageText')) {
        editCalls++;
        return new Response('{"ok":true}', { status: 200 });
      }
      if (url.includes('sendMessage')) {
        throw new Error('expected edit not send');
      }
      return origSend(input, init);
    }) as typeof fetch;
    try {
      const delivered = await deliverFlowOutput(
        { text: '<b>Balances</b>', parseMode: 'HTML', templateId: 'balances.v1' },
        { token: 't', chatId: '-10099', db }
      );
      expect(delivered.ok).toBe(true);
      expect(editCalls).toBe(1);
    } finally {
      globalThis.fetch = origSend;
    }

    db.close();
  });

  test('gate.blocked.v1 and onboard.complete.v1 render', () => {
    const gate = renderTemplate('gate.blocked.v1', {
      locale: 'en',
      callSign: 'ASH-001',
      gateReason: 'Soft < Ready',
    });
    expect(gate.text).toContain('Soft &lt; Ready');
    expect(gate.keyboard?.rows[0]?.[0]?.callbackData).toBe('f:menu');

    const complete = renderTemplate('onboard.complete.v1', {
      locale: 'en',
      callSign: 'ASH-001',
      partnerTemplate: 'default-prospect',
      expertName: 'NBA',
      parentName: 'ASH',
    });
    expect(complete.text).toContain('Onboard complete');
  });
});
