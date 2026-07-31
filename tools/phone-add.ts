#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/sqlite
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * Add a phone into inventory.
 *
 *   bun run phone:add -- --model "Pixel 8" --carrier Verizon [--id phone_x] [--imei …]
 *   bun run phone:add -- --assign CALL-OR-NODE-ID   # issue after create
 */
import { Database } from 'bun:sqlite';
import { jsonOut } from '../lib/console-depth.ts';
import { migrateSchema } from '../lib/operations/schema.ts';
import { AccountService } from '../lib/operations/account-service.ts';
import { addPhone } from '../lib/operations/phone-sportsbook-journal.ts';
import { resolveOnboardTreeNodeId } from '../lib/operations/partner-onboard-package.ts';

function argValue(flag: string): string | undefined {
  const i = Bun.argv.indexOf(flag);
  if (i < 0) return undefined;
  return Bun.argv[i + 1];
}

function main(): void {
  const dbPath = Bun.env.OPERATIONS_DB ?? 'operations.db';
  const db = new Database(dbPath);
  migrateSchema(db);

  const result = addPhone(db, {
    id: argValue('--id'),
    model: argValue('--model'),
    imei: argValue('--imei'),
    carrier: argValue('--carrier'),
    dataPlan: argValue('--data-plan'),
  });

  const assign = argValue('--assign');
  if (assign) {
    const nodeId = resolveOnboardTreeNodeId(db, assign);
    new AccountService(db).issuePhone(result.phoneId, nodeId as string);
  }

  if (Bun.argv.includes('--json')) {
    jsonOut({ ...result, assignedTo: assign ?? null });
  } else {
    console.log(
      `phone ${result.created ? 'created' : 'exists'}: ${result.phoneId}` +
        (assign ? ` · issued to ${assign}` : '')
    );
  }
}

if (import.meta.main) main();
