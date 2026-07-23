// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — WebView
// @see https://bun.com/docs/runtime/sqlite
/**
 * Execute an automated_test provisioning task via sandbox-gated provisionAccounts.
 */
import type { Database } from 'bun:sqlite';
import { provisionAccounts, type CredentialBundle } from '../automation/provision-accounts.ts';
import { claimTask, completeTask, failTask, getTask } from './queue.ts';
import { ensureProvisioningSchema } from './schema.ts';

export type RunAutomatedOpts = {
  taskId: string; // brand-ok
  credentials: CredentialBundle;
  encryptionKey?: string;
  dbPath?: string;
  /** Skip WebView — for unit tests; marks completed with synthetic account note. */
  dryRun?: boolean;
};

export async function runAutomatedTestTask(
  db: Database,
  opts: RunAutomatedOpts
): Promise<{ ok: boolean; taskId: string; error?: string; accountId?: string }> {
  // brand-ok x2 — provisioning task IDs, not domain types
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
