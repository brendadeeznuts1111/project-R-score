#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/sqlite
/**
 * Provisioning queue CLI.
 *
 *   bun tools/provision-queue.ts enqueue --platform=sandbox-book --partner=<id> --mode=automated_test
 *   bun tools/provision-queue.ts list [--step=pending]
 *   bun tools/provision-queue.ts claim --to=ops
 *   bun tools/provision-queue.ts retry --id=<task> [--max-retries=3]
 *   PROVISION_PASSWORD=... bun tools/provision-queue.ts run-automated --id=<task> [--dry-run]
 */
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';
import {
  claimNextTask,
  DEFAULT_MAX_PROVISION_RETRIES,
  enqueueTask,
  listTasks,
  requeueFailedTask,
  type ProvisionMode,
  type ProvisionStep,
} from '../lib/provisioning/queue.ts';
import { runAutomatedTestTask } from '../lib/provisioning/run-automated.ts';
import { parseOperationId } from '../lib/types/branded.ts';
import { logDepth, logTable } from '../lib/console/index.ts';
import {
  applyUnknownLongOptionGuardFor,
  PROVISION_QUEUE_ALLOWED_LONG,
} from '../lib/docs/ref-id-tool-flags.ts';

export { PROVISION_QUEUE_ALLOWED_LONG };

const dbPath = Bun.env.OPS_DB_PATH || DEFAULT_OPS_DB_PATH;
const args = import.meta.main
  ? applyUnknownLongOptionGuardFor('provision:queue', process.argv.slice(2))
  : Bun.argv.slice(2);
const cmd = args[0] ?? 'help';

function flag(name: string): string | undefined {
  const hit = args.find(a => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

function has(name: string): boolean {
  return args.includes(`--${name}`);
}

const db = openOperationsDb({ path: dbPath });

try {
  switch (cmd) {
    case 'enqueue': {
      const platformId = flag('platform');
      const partnerId = flag('partner');
      const mode = (flag('mode') ?? 'automated_test') as ProvisionMode;
      if (!platformId || !partnerId) {
        console.error(
          'Usage: enqueue --platform=<id> --partner=<id> [--mode=manual|automated_test]'
        );
        process.exit(1);
      }
      if (mode !== 'manual' && mode !== 'automated_test') {
        console.error('mode must be manual or automated_test');
        process.exit(1);
      }
      const task = enqueueTask(db, { platformId, partnerId, mode });
      logDepth(task);
      break;
    }
    case 'list': {
      const step = flag('step') as ProvisionStep | undefined;
      const mode = flag('mode') as ProvisionMode | undefined;
      const rows = listTasks(db, { step, mode, limit: 50 });
      logTable(
        rows.map(r => ({
          id: r.id.slice(0, 8),
          platform: r.platform_id,
          partner: r.partner_id.slice(0, 8),
          mode: r.mode,
          step: r.step,
          error: r.last_error?.slice(0, 40) ?? '',
        }))
      );
      break;
    }
    case 'claim': {
      const to = flag('to') ?? 'ops';
      const mode = flag('mode') as ProvisionMode | undefined;
      const task = claimNextTask(db, to, mode);
      if (!task) {
        console.log('No pending tasks');
      } else {
        logDepth(task);
      }
      break;
    }
    case 'retry': {
      const id = flag('id');
      if (!id) {
        console.error('Usage: retry --id=<task> [--max-retries=3]');
        process.exit(1);
      }
      const rawMaxRetries = flag('max-retries');
      const maxRetries = rawMaxRetries ? Number(rawMaxRetries) : DEFAULT_MAX_PROVISION_RETRIES;
      const task = requeueFailedTask(db, parseOperationId(id), maxRetries);
      logDepth(task);
      break;
    }
    case 'run-automated': {
      const id = flag('id');
      if (!id) {
        console.error(
          'Usage: run-automated --id=<task> [--dry-run] (credentials via PROVISION_* env)'
        );
        process.exit(1);
      }
      const result = await runAutomatedTestTask(db, {
        taskId: parseOperationId(id),
        credentials: {
          username: Bun.env.PROVISION_USERNAME ?? `test_${Date.now().toString(36)}`,
          password: Bun.env.PROVISION_PASSWORD || `Test${Math.random().toString(36).slice(2, 10)}!`,
          email: Bun.env.PROVISION_EMAIL ?? `test_${Date.now().toString(36)}@test.factorywager.com`,
        },
        dryRun: has('dry-run'),
        dbPath,
        encryptionKey: Bun.env.PROVISION_ENCRYPTION_KEY,
      });
      logDepth(result);
      process.exit(result.ok ? 0 : 1);
      break;
    }
    default:
      console.log(`Usage:
  enqueue --platform=<id> --partner=<id> [--mode=manual|automated_test]
  list [--step=pending] [--mode=automated_test]
  claim [--to=ops] [--mode=automated_test]
  retry --id=<task> [--max-retries=3]
  run-automated --id=<task> [--dry-run]

Set PROVISION_USERNAME, PROVISION_PASSWORD, and PROVISION_EMAIL through a secure
environment injector to keep the sandbox credentials out of process arguments.
When omitted, run-automated generates test-only values.
`);
  }
} finally {
  db.close();
}
