// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { openOperationsDb } from '../lib/operations/db.ts';
import { asTreeNodeId } from '../lib/types/branded.ts';
import { FactorialEngine } from '../lib/experiments/engine.ts';
import {
  clusterKeyForNode,
  dailyCheck,
  launchPhase,
} from '../lib/experiments/runner.ts';
import { currentSwitchbackPeriod } from '../lib/experiments/switchback.ts';

describe('experiment runner', () => {
  test('clusterKeyForNode prefers expert then parent', () => {
    expect(
      clusterKeyForNode(
        { id: 'a', expert_id: 'e1', parent_id: 'p1', type: 'agent' },
        'expert'
      )
    ).toBe('expert:e1');
    expect(
      clusterKeyForNode(
        { id: 'a', expert_id: null, parent_id: 'p1', type: 'agent' },
        'expert'
      )
    ).toBe('parent:p1');
    expect(
      clusterKeyForNode(
        { id: 'a', expert_id: null, parent_id: null, type: 'partner' },
        'parent'
      )
    ).toBe('default');
  });

  test('launchPhase switchback schedules eligible nodes', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const expertId = Bun.randomUUIDv7();
    db.run(
      `INSERT INTO experts (id, name, sport, market, active, created_at)
       VALUES ($id, 'E', 'nba', 'spread', 1, $n)`,
      { $id: expertId, $n: now }
    );
    const p1 = Bun.randomUUIDv7();
    const p2 = Bun.randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, expert_id, active, status, created_at)
       VALUES ($a, 'partner', 'P1', $e, 1, 'partner', $n),
              ($b, 'partner', 'P2', $e, 1, 'partner', $n)`,
      { $a: p1, $b: p2, $e: expertId, $n: now }
    );

    const result = launchPhase(db, {
      phase: 1,
      protocol: 'switchback',
      periodDays: 7,
      washoutDays: 1,
      sandbox: true,
    });
    expect(result.protocol).toBe('switchback');
    expect(result.switchbackScheduled).toBe(2);
    expect(result.assigned).toBe(0);
    expect(result.experiment.status).toBe('active');

    const cur = currentSwitchbackPeriod(db, result.experiment.id, asTreeNodeId(p1));
    expect(cur).not.toBeNull();
    db.close();
  });

  test('launchPhase between uses cluster assign', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const expertId = Bun.randomUUIDv7();
    db.run(
      `INSERT INTO experts (id, name, sport, market, active, created_at)
       VALUES ($id, 'E', 'nba', 'spread', 1, $n)`,
      { $id: expertId, $n: now }
    );
    const p1 = Bun.randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, expert_id, active, status, created_at)
       VALUES ($a, 'partner', 'P1', $e, 1, 'partner', $n)`,
      { $a: p1, $e: expertId, $n: now }
    );

    const result = launchPhase(db, {
      phase: 1,
      protocol: 'between',
      sandbox: true,
    });
    expect(result.assigned).toBe(1);
    expect(result.switchbackScheduled).toBe(0);

    const engine = new FactorialEngine(db);
    const a = engine.getAssignment(result.experiment.id, asTreeNodeId(p1));
    expect(a).not.toBeNull();
    db.close();
  });

  test('dailyCheck harm pause is operational not statistical', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const result = launchPhase(db, {
      phase: 1,
      protocol: 'between',
      sandbox: true,
      harmDelta: 0.05,
      harmMinN: 2,
    });
    // No partners — create one and assign
    const p1 = Bun.randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, active, status, created_at)
       VALUES ($a, 'partner', 'P1', 1, 'partner', $n)`,
      { $a: p1, $n: now }
    );
    const engine = new FactorialEngine(db);
    const variants = engine.listVariants(result.experiment.id);
    const staticV = variants.find(v => (v.config as { routing?: string }).routing === 'static')!;
    const dynamicV = variants.find(v => (v.config as { routing?: string }).routing === 'dynamic')!;
    engine.assignToConfig(result.experiment.id, asTreeNodeId(p1), staticV.config);

    // Second partner on dynamic
    const p2 = Bun.randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, active, status, created_at)
       VALUES ($a, 'partner', 'P2', 1, 'partner', $n)`,
      { $a: p2, $n: now }
    );
    engine.assignToConfig(result.experiment.id, asTreeNodeId(p2), dynamicV.config);

    for (let i = 0; i < 3; i++) {
      engine.recordMetric({
        experimentId: result.experiment.id,
        partnerId: asTreeNodeId(p1),
        value: 0.6,
        metricName: 'win_rate',
      });
      engine.recordMetric({
        experimentId: result.experiment.id,
        partnerId: asTreeNodeId(p2),
        value: 0.4,
        metricName: 'win_rate',
      });
    }

    const check = dailyCheck(db, result.experiment.id);
    expect(check.pausedForHarm).toBe(true);
    expect(check.status).toBe('paused');
    expect(check.note).toMatch(/Operational harm pause/);
    db.close();
  });
});
