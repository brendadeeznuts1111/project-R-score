// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { openOperationsDb } from '../lib/operations/db.ts';
import {
  claimNextTask,
  claimTask,
  completeTask,
  enqueueTask,
  failTask,
  listTasks,
} from '../lib/provisioning/queue.ts';
import { runAutomatedTestTask } from '../lib/provisioning/run-automated.ts';

describe('provisioning queue', () => {
  test('enqueue → claim → complete state machine', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const partnerId = Bun.randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, active, status, created_at)
       VALUES ($id, 'partner', 'P', 1, 'partner', $n)`,
      { $id: partnerId, $n: now }
    );
    db.run(
      `INSERT INTO platforms (id, name, category, sub_category, url, active, status, created_at)
       VALUES ('sandbox-book', 'Sandbox', 'sportsbook', 'sandbox', 'https://sandbox.example', 1, 'active', $n)`,
      { $n: now }
    );

    const task = enqueueTask(db, {
      platformId: 'sandbox-book',
      partnerId,
      mode: 'automated_test',
    });
    expect(task.step).toBe('pending');

    const claimed = claimTask(db, task.id, 'worker-1');
    expect(claimed.step).toBe('in_progress');
    expect(claimed.assigned_to).toBe('worker-1');

    const done = completeTask(db, task.id, { notes: 'ok' });
    expect(done.step).toBe('completed');
    expect(done.notes).toBe('ok');

    const pending = listTasks(db, { step: 'pending' });
    expect(pending).toHaveLength(0);
    db.close();
  });

  test('fail increments retry_count', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const partnerId = Bun.randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, active, status, created_at)
       VALUES ($id, 'agent', 'A', 1, 'active', $n)`,
      { $id: partnerId, $n: now }
    );
    const task = enqueueTask(db, {
      platformId: 'sandbox-book',
      partnerId,
      mode: 'manual',
    });
    claimNextTask(db, 'ops', 'manual');
    const failed = failTask(db, task.id, 'kyc missing');
    expect(failed.step).toBe('failed');
    expect(failed.retry_count).toBe(1);
    expect(failed.last_error).toBe('kyc missing');
    db.close();
  });

  test('runAutomatedTestTask dry-run completes without WebView', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const partnerId = Bun.randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, active, status, created_at)
       VALUES ($id, 'partner', 'P', 1, 'partner', $n)`,
      { $id: partnerId, $n: now }
    );
    db.run(
      `INSERT INTO platforms (id, name, category, sub_category, url, active, status, created_at)
       VALUES ('sandbox-book', 'Sandbox', 'sportsbook', 'sandbox', 'https://sandbox.example', 1, 'active', $n)`,
      { $n: now }
    );
    const task = enqueueTask(db, {
      platformId: 'sandbox-book',
      partnerId,
      mode: 'automated_test',
    });
    const result = await runAutomatedTestTask(db, {
      taskId: task.id,
      credentials: { username: 'u', password: 'p', email: 'e@x.com' },
      dryRun: true,
    });
    expect(result.ok).toBe(true);
    expect(listTasks(db, { step: 'completed' })).toHaveLength(1);
    db.close();
  });

  test('runAutomatedTestTask rejects manual mode', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    const partnerId = Bun.randomUUIDv7();
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, active, status, created_at)
       VALUES ($id, 'partner', 'P', 1, 'partner', $n)`,
      { $id: partnerId, $n: now }
    );
    const task = enqueueTask(db, {
      platformId: 'sandbox-book',
      partnerId,
      mode: 'manual',
    });
    const result = await runAutomatedTestTask(db, {
      taskId: task.id,
      credentials: { username: 'u', password: 'p', email: 'e@x.com' },
      dryRun: true,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not automated_test/);
    db.close();
  });
});
