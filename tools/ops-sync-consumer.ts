#!/usr/bin/env bun
/**
 * Consume portal ops-sync events from R2 channel → SQLite tree_nodes.
 *
 * Requires R2 credentials (config/r2-env.ts). Run on Bun host with OPS_DB_PATH.
 */
import { resolveR2BridgeConfig } from '../scripts/lib/r2-bridge.ts';
import { AccountService } from '../lib/operations/account-service.ts';
import { openOperationsDb } from '../lib/operations/db.ts';
import { processOpsSyncQueue } from '../lib/operations/ops-sync.ts';

async function main(): Promise<void> {
  let r2;
  try {
    r2 = resolveR2BridgeConfig();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const db = openOperationsDb();
  const svc = new AccountService(db);
  try {
    const result = await processOpsSyncQueue(db, svc, r2);
    console.log(`ops-sync: processed=${result.processed} lastSeq=${result.lastSeq}`);
  } finally {
    svc.close();
    db.close();
  }
}

if (import.meta.main) {
  await main();
}
