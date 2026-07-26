// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { randomUUIDv7 } from 'bun';
import { openOperationsDb } from '../lib/operations/db.ts';
import { AccountService } from '../lib/operations/account-service.ts';
import { applyOpsSyncEvent } from '../lib/operations/ops-sync.ts';
import { publishAndDispatch } from '../lib/operations/play-dispatcher.ts';
import { PlaySigner } from '../lib/operations/play-signing.ts';
import { bindPartnerProfile } from '../lib/operations/partner-profile-bridge.ts';
import {
  applyPartnerOnboardPackage,
  planPartnerOnboardPackage,
} from '../lib/operations/partner-onboard-package.ts';
import { ensurePosition } from '../lib/operations/liquidity.ts';
import { handlePlayCallback } from '../lib/telegram/play-callback.ts';
import { processChannelOutbox } from '../lib/channels/outbox.ts';
import { asTreeNodeId } from '../lib/types/branded/operations.ts';

describe('partner onboarding e2e', () => {
  test('portal assign → expert → telegram link welcome → play ack', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    const svc = new AccountService(db);
    const now = new Date().toISOString();
    const expertId = randomUUIDv7();

    db.run(
      `INSERT INTO experts (id, name, sport, market, edge_score, active, created_at)
       VALUES ($id, 'Edge NBA', 'NBA', 'totals', 0.74, 1, $n)`,
      { $id: expertId, $n: now }
    );

    expect(
      applyOpsSyncEvent(
        svc,
        {
          type: 'account_assigned',
          tenantId: 'factory',
          oidcSubject: 'sub-e2e',
          email: 'e2e@factory-wager.com',
          source: 'portal',
        },
        db
      )
    ).toBe(true);

    expect(
      applyOpsSyncEvent(
        svc,
        {
          type: 'telegram_linked',
          tenantId: 'factory',
          oidcSubject: 'sub-e2e',
          email: 'e2e@factory-wager.com',
          telegramUserId: '424242',
          source: 'telegram',
        },
        db
      )
    ).toBe(true);

    const node = db
      .query('SELECT id, expert_id, telegram_id FROM tree_nodes WHERE oidc_subject = $o')
      .get({ $o: 'sub-e2e' }) as { id: string; expert_id: string; telegram_id: string }; // brand-ok
    expect(node.expert_id).toBe(expertId);
    expect(node.telegram_id).toBe('424242');

    const meta = (await import('../lib/telegram/flows/channel-meta.ts')).getChatChannelMeta(
      db,
      '424242'
    );
    expect(meta?.chatId).toBe('424242');
    expect(meta?.topics?.identity).toBe(1);

    const welcome = db
      .query(
        `SELECT COUNT(*) AS n FROM ops_channel_outbox WHERE event_type = 'partner.welcome' AND projectors LIKE '%telegram%'`
      )
      .get() as { n: number };
    expect(welcome.n).toBeGreaterThan(0);

    db.run(`UPDATE tree_nodes SET telegram_id = '424242' WHERE id = $id`, { $id: node.id });
    bindPartnerProfile(db, asTreeNodeId(node.id));
    ensurePosition(db, node.id, '_all', 5000);

    const signer = new PlaySigner();
    const result = await publishAndDispatch(
      signer,
      {
        expertId,
        sport: 'NBA',
        market: 'spread',
        event: 'LAL @ BOS',
        selection: 'LAL -3',
        odds: -110,
        stakeRecommended: 100,
        confidence: 72,
      },
      db,
      { flush: false }
    );

    const outbox = db
      .query(`SELECT payload_json FROM ops_channel_outbox WHERE event_type = 'play.dispatched' LIMIT 1`)
      .get() as { payload_json: string } | null;
    expect(outbox).not.toBeNull();
    const payload = JSON.parse(outbox!.payload_json) as {
      replyMarkup?: { inline_keyboard: unknown[] };
    };
    expect(payload.replyMarkup?.inline_keyboard?.length).toBeGreaterThan(0);

    await processChannelOutbox(db, { deliver: false });

    const ack = handlePlayCallback(db, '424242', `play:${result.id}:${node.id}:placed`);
    expect(ack.ok).toBe(true);

    svc.close();
    db.close();
  });

  test('onboard package apply → welcome + onboard.complete → play ack', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const expertId = randomUUIDv7();
    const agentId = randomUUIDv7();

    db.run(
      `INSERT INTO experts (id, name, sport, market, edge_score, active, created_at)
       VALUES ($id, 'Edge NBA', 'NBA', 'totals', 0.74, 1, $n)`,
      { $id: expertId, $n: now }
    );
    db.run(
      `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, call_sign, telegram_id, active, status, created_at)
       VALUES ($id, 'agent', NULL, $eid, 'TOC PAT', 'PAT-001', '515151', 1, 'active', $n)`,
      { $id: agentId, $eid: expertId, $n: now }
    );
    ensurePosition(db, agentId, '_all', 5000);

    const tid = asTreeNodeId(agentId);
    const plan = planPartnerOnboardPackage(db, tid, { source: 'portal' });
    const applied = applyPartnerOnboardPackage(db, plan, { source: 'portal' });
    expect(applied.status).toBe('ok');
    expect(applied.onboardCompleteEventId).toBeDefined();

    const welcome = db
      .query(
        `SELECT COUNT(*) AS n FROM ops_channel_outbox WHERE event_type = 'partner.welcome'`
      )
      .get() as { n: number };
    expect(welcome.n).toBe(1);

    const complete = db
      .query(
        `SELECT COUNT(*) AS n FROM ops_channel_outbox WHERE event_type = 'partner.onboard.complete'`
      )
      .get() as { n: number };
    expect(complete.n).toBe(1);

    const signer = new PlaySigner();
    const result = await publishAndDispatch(
      signer,
      {
        expertId,
        sport: 'NBA',
        market: 'spread',
        event: 'MIA @ NYK',
        selection: 'MIA +4',
        odds: -110,
        stakeRecommended: 100,
        confidence: 68,
      },
      db,
      { flush: false }
    );

    await processChannelOutbox(db, { deliver: false });
    const ack = handlePlayCallback(db, '515151', `play:${result.id}:${agentId}:placed`);
    expect(ack.ok).toBe(true);
    db.close();
  });
});
