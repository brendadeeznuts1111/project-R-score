/**
 * Partner onboard package CLI backing — resolve, dry-run, idempotency.
 */
import { describe, expect, test } from 'bun:test';
import { randomUUIDv7 } from 'bun';
import { openOperationsDb } from '../lib/operations/db.ts';
import {
  applyPartnerOnboardPackage,
  buildOnboardChecklist,
  listUnboundAgentSeats,
  planPartnerOnboardPackage,
  resolveOnboardTreeNodeId,
} from '../lib/operations/partner-onboard-package.ts';
import { bindPartnerProfile } from '../lib/operations/partner-profile-bridge.ts';
import { getChatChannelMeta } from '../lib/telegram/flows/channel-meta.ts';
import { asTreeNodeId } from '../lib/types/branded/operations.ts';

function seedExpert(db: ReturnType<typeof openOperationsDb>, now: string): string {
  const expertId = randomUUIDv7();
  db.run(
    `INSERT INTO experts (id, name, sport, market, edge_score, active, created_at)
     VALUES ($id, 'Edge NBA', 'NBA', 'totals', 0.74, 1, $n)`,
    { $id: expertId, $n: now }
  );
  return expertId;
}

function seedAgent(
  db: ReturnType<typeof openOperationsDb>,
  opts: { callSign: string; parentId?: string; expertId?: string }, // brand-ok — seed wire
  now: string
): string {
  const id = randomUUIDv7();
  db.run(
    `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, call_sign, telegram_id, active, created_at)
     VALUES ($id, 'agent', $parent, $expert, $name, $cs, NULL, 1, $now)`,
    {
      $id: id,
      $parent: opts.parentId ?? null,
      $expert: opts.expertId ?? null,
      $name: `TOC ${opts.callSign}`,
      $cs: opts.callSign,
      $now: now,
    }
  );
  return id;
}

describe('partner onboard package', () => {
  test('resolve by call sign and UUID', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    seedExpert(db, now);
    const agentId = seedAgent(db, { callSign: 'ASH-001' }, now);

    expect(resolveOnboardTreeNodeId(db, 'ASH-001')).toEqual(asTreeNodeId(agentId));
    expect(resolveOnboardTreeNodeId(db, agentId)).toEqual(asTreeNodeId(agentId));
    expect(() => resolveOnboardTreeNodeId(db, 'ZZZ-999')).toThrow(/Unknown call sign/);
    db.close();
  });

  test('dry-run plan does not write bindings or outbox', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const expertId = seedExpert(db, now);
    const agentId = seedAgent(db, { callSign: 'PAT-001', expertId }, now);
    const tid = asTreeNodeId(agentId);

    const plan = planPartnerOnboardPackage(db, tid, { source: 'portal' });
    const result = applyPartnerOnboardPackage(db, plan, { dryRun: true, source: 'portal' });

    expect(result.status).toBe('dry-run');
    expect(plan.alreadyOnboarded).toBe(false);

    const bound = db
      .query('SELECT COUNT(*) AS n FROM partner_profile_bindings')
      .get() as { n: number };
    const outbox = db
      .query('SELECT COUNT(*) AS n FROM ops_channel_outbox')
      .get() as { n: number };
    expect(bound.n).toBe(0);
    expect(outbox.n).toBe(0);
    db.close();
  });

  test('idempotent skip on second apply without new outbox', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const expertId = seedExpert(db, now);
    const agentId = seedAgent(
      db,
      { callSign: 'NOV-001', expertId, parentId: randomUUIDv7() },
      now
    );
    db.run(`UPDATE tree_nodes SET telegram_id = '424242' WHERE id = $id`, { $id: agentId });
    const tid = asTreeNodeId(agentId);

    const plan1 = planPartnerOnboardPackage(db, tid, { source: 'portal' });
    const first = applyPartnerOnboardPackage(db, plan1, { source: 'portal' });
    expect(first.status).toBe('ok');

    const outboxAfterFirst = db
      .query('SELECT COUNT(*) AS n FROM ops_channel_outbox WHERE event_type = $e')
      .get({ $e: 'partner.welcome' }) as { n: number };
    expect(outboxAfterFirst.n).toBe(1);

    const meta = getChatChannelMeta(db, '424242');
    expect(meta?.callSigns).toContain('NOV-001');

    const plan2 = planPartnerOnboardPackage(db, tid, { source: 'portal' });
    expect(plan2.alreadyOnboarded).toBe(true);
    const second = applyPartnerOnboardPackage(db, plan2, { source: 'portal' });
    expect(second.status).toBe('skip');

    const outboxAfterSecond = db
      .query('SELECT COUNT(*) AS n FROM ops_channel_outbox WHERE event_type = $e')
      .get({ $e: 'partner.welcome' }) as { n: number };
    expect(outboxAfterSecond.n).toBe(1);
    db.close();
  });

  test('force re-bind updates binding timestamp', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const expertId = seedExpert(db, now);
    const agentId = seedAgent(db, { callSign: 'ASH-002', expertId }, now);
    const tid = asTreeNodeId(agentId);

    bindPartnerProfile(db, tid);
    const before = db
      .query('SELECT updated_at FROM partner_profile_bindings WHERE tree_node_id = $id')
      .get({ $id: agentId }) as { updated_at: string };

    await Bun.sleep(5);

    const plan = planPartnerOnboardPackage(db, tid, { source: 'portal', force: true });
    expect(plan.alreadyOnboarded).toBe(false);
    const result = applyPartnerOnboardPackage(db, plan, { source: 'portal', force: true });
    expect(result.status).toBe('ok');

    const after = db
      .query('SELECT updated_at FROM partner_profile_bindings WHERE tree_node_id = $id')
      .get({ $id: agentId }) as { updated_at: string };
    expect(after.updated_at >= before.updated_at).toBe(true);
    db.close();
  });

  test('listUnboundAgentSeats returns only agents without bindings', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    seedExpert(db, now);
    const boundId = seedAgent(db, { callSign: 'ASH-001' }, now);
    seedAgent(db, { callSign: 'ASH-003' }, now);

    bindPartnerProfile(db, asTreeNodeId(boundId));

    const seats = listUnboundAgentSeats(db);
    expect(seats).toHaveLength(1);
    expect(seats[0]!.callSign).toBe('ASH-003');
    db.close();
  });

  test('apply attaches message template ids and enqueues onboard.complete', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const expertId = seedExpert(db, now);
    const agentId = seedAgent(db, { callSign: 'ASH-010', expertId }, now);
    const phoneId = randomUUIDv7();
    db.run(
      `INSERT INTO phones (id, model, carrier, status, assigned_to, issued_at)
       VALUES ($id, 'Pixel 7', 'T-Mobile', 'issued', $agent, $now)`,
      { $id: phoneId, $agent: agentId, $now: now }
    );
    db.run(`UPDATE tree_nodes SET telegram_id = '777', phone_id = $p WHERE id = $id`, {
      $p: phoneId,
      $id: agentId,
    });
    const tid = asTreeNodeId(agentId);

    const plan = planPartnerOnboardPackage(db, tid, { source: 'portal' });
    expect(plan.phoneLabel).toBe('Pixel 7');
    expect(plan.messageTemplates.welcomeTemplate).toBe('partner.welcome.v1');

    const result = applyPartnerOnboardPackage(db, plan, { source: 'portal' });
    expect(result.status).toBe('ok');
    expect(result.onboardCompleteEventId).toBeDefined();

    const meta = db
      .query('SELECT metadata_json FROM partner_profile_bindings WHERE tree_node_id = $id')
      .get({ $id: agentId }) as { metadata_json: string };
    const parsed = JSON.parse(meta.metadata_json) as {
      welcomeTemplate: string;
      phoneLabel: string;
    };
    expect(parsed.welcomeTemplate).toBe('partner.welcome.v1');
    expect(parsed.phoneLabel).toBe('Pixel 7');

    const complete = db
      .query('SELECT COUNT(*) AS n FROM ops_channel_outbox WHERE event_type = $e')
      .get({ $e: 'partner.onboard.complete' }) as { n: number };
    expect(complete.n).toBe(1);
    db.close();
  });

  test('buildOnboardChecklist reflects link + template state', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const expertId = seedExpert(db, now);
    const agentId = seedAgent(db, { callSign: 'PAT-010', expertId }, now);
    const tid = asTreeNodeId(agentId);

    const unlinked = buildOnboardChecklist(db, tid);
    expect(unlinked.checklist.telegramLinked).toBe(false);
    expect(unlinked.checklist.consumeReady).toBe(false);
    expect(unlinked.lines.some(l => l.includes('telegram-link-chat'))).toBe(true);

    db.run(`UPDATE tree_nodes SET telegram_id = '888001' WHERE id = $id`, { $id: agentId });
    bindPartnerProfile(db, tid);

    const linked = buildOnboardChecklist(db, tid);
    expect(linked.checklist.telegramLinked).toBe(true);
    expect(linked.lines.some(l => l.includes('Profile bound'))).toBe(true);
    db.close();
  });
});
