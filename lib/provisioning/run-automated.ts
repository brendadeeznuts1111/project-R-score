// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @updated bun:sqlite · fixed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @updated bun:sqlite · fixed v0.3.0 · 2022-12-07 · https://bun.com/blog/bun-v0.3.0
// @updated bun:sqlite · fixed v0.5.6 · 2023-02-09 · https://bun.com/blog/bun-v0.5.6
// @updated bun:sqlite · changed v0.6.8 · 2023-06-09 · https://bun.com/blog/bun-v0.6.8
// @updated bun:sqlite · fixed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @updated bun:sqlite · changed v0.7.1 · 2023-07-29 · https://bun.com/blog/bun-v0.7.1
// @updated bun:sqlite · fixed v0.7.3 · 2023-08-06 · https://bun.com/blog/bun-v0.7.3
// @updated bun:sqlite · fixed v1.0.3 · 2023-09-22 · https://bun.com/blog/bun-v1.0.3
// @updated bun:sqlite · fixed v1.0.7 · 2023-10-20 · https://bun.com/blog/bun-v1.0.7
// @updated bun:sqlite · fixed v1.0.10 · 2023-11-07 · https://bun.com/blog/bun-v1.0.10
// @updated bun:sqlite · fixed v1.0.12 · 2023-11-16 · https://bun.com/blog/bun-v1.0.12
// @updated bun:sqlite · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated bun:sqlite · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated bun:sqlite · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated bun:sqlite · changed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated bun:sqlite · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated bun:sqlite · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated bun:sqlite · fixed v1.0.29 · 2024-02-23 · https://bun.com/blog/bun-v1.0.29
// @updated bun:sqlite · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated bun:sqlite · fixed v1.1.4 · 2024-04-16 · https://bun.com/blog/bun-v1.1.4
// @updated bun:sqlite · fixed v1.1.5 · 2024-04-26 · https://bun.com/blog/bun-v1.1.5
// @updated bun:sqlite · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated bun:sqlite · changed v1.1.14 · 2024-06-19 · https://bun.com/blog/bun-v1.1.14
// @updated bun:sqlite · fixed v1.1.14 · 2024-06-19 · https://bun.com/blog/bun-v1.1.14
// @updated bun:sqlite · fixed v1.1.16 · 2024-06-23 · https://bun.com/blog/bun-v1.1.16
// @updated bun:sqlite · fixed v1.1.34 · 2024-11-02 · https://bun.com/blog/bun-v1.1.34
// @updated bun:sqlite · changed v1.1.38 · 2024-11-29 · https://bun.com/blog/bun-v1.1.38
// @updated bun:sqlite · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated bun:sqlite · changed v1.2.6 · 2025-03-25 · https://bun.com/blog/bun-v1.2.6
// @updated bun:sqlite · changed v1.2.17 · 2025-06-21 · https://bun.com/blog/bun-v1.2.17
// @updated bun:sqlite · changed v1.2.18 · 2025-07-03 · https://bun.com/blog/bun-v1.2.18
// @updated bun:sqlite · fixed v1.2.18 · 2025-07-03 · https://bun.com/blog/bun-v1.2.18
// @updated bun:sqlite · changed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated bun:sqlite · changed v1.2.21 · 2025-08-25 · https://bun.com/blog/bun-v1.2.21
// @updated bun:sqlite · fixed v1.3.2 · 2025-11-08 · https://bun.com/blog/bun-v1.3.2
// @updated bun:sqlite · changed v1.3.3 · 2025-11-21 · https://bun.com/blog/bun-v1.3.3
// @updated bun:sqlite · fixed v1.3.4 · 2025-12-06 · https://bun.com/blog/bun-v1.3.4
// @updated bun:sqlite · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated bun:sqlite · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified bun:sqlite · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/sqlite
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — WebView
// @see https://bun.com/docs/runtime/sqlite
/**
 * Execute an automated_test provisioning task via sandbox-gated provisionAccounts.
 */
import type { Database } from 'bun:sqlite';
import {
  provisionAccounts,
  type CredentialBundle,
  type ProvisionResult,
} from '../automation/provision-accounts.ts';
import type { OperationId } from '../types/branded.ts';
import { claimTask, completeTask, failTask, getTask } from './queue.ts';
import { ensureProvisioningSchema } from './schema.ts';

export type RunAutomatedOpts = {
  taskId: OperationId;
  credentials: CredentialBundle;
  encryptionKey?: string;
  dbPath?: string;
  /** Skip WebView — for unit tests; marks completed with synthetic account note. */
  dryRun?: boolean;
};

export async function runAutomatedTestTask(
  db: Database,
  opts: RunAutomatedOpts
): Promise<{
  ok: boolean;
  taskId: OperationId;
  error?: string;
  accountId?: ProvisionResult['accountId'];
}> {
  ensureProvisioningSchema(db);
  const task = getTask(db, opts.taskId);
  if (!task) return { ok: false, taskId: opts.taskId, error: 'Task not found' };
  if (task.mode !== 'automated_test') {
    return { ok: false, taskId: opts.taskId, error: 'Task mode is not automated_test' };
  }

  if (task.step === 'pending') {
    claimTask(db, task.id, 'automated');
  } else if (task.step !== 'in_progress') {
    return { ok: false, taskId: opts.taskId, error: `Task is ${task.step}` };
  }

  if (opts.dryRun) {
    completeTask(db, task.id, {
      notes: 'dry-run automated_test (no WebView)',
    });
    return { ok: true, taskId: task.id };
  }

  try {
    const results = await provisionAccounts({
      platformId: task.platform_id,
      partnerIds: [task.partner_id],
      credentials: [opts.credentials],
      encryptionKey: opts.encryptionKey,
      dbPath: opts.dbPath,
      timeout: 30_000,
    });
    const r = results[0];
    if (!r?.success) {
      failTask(db, task.id, r?.error ?? 'provisionAccounts failed');
      return { ok: false, taskId: task.id, error: r?.error };
    }
    completeTask(db, task.id, {
      notes: `account ${r.accountId}`,
    });
    return { ok: true, taskId: task.id, accountId: r.accountId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    failTask(db, task.id, msg);
    return { ok: false, taskId: task.id, error: msg };
  }
}
