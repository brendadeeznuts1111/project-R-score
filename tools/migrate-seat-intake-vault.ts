#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
/**
 * migrate-seat-intake-vault.ts — phase 2 migration: move plaintext seat-intake
 * passwords into partner_vault, replacing them with vaultKey refs.
 *
 *   bun run partner:vault:migrate [--db <path>] [--intake-dir <dir>]
 *
 * Idempotent — outs without a password are skipped. Exits 1 when the ops DB
 * has no active tree node for an intake call-sign (partner not onboarded).
 *
 * @see docs/design/unified-partner-profile.md — phase 2
 */

import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
import { migrateSeatIntakePasswordsToVault } from '../lib/partner-profile/register';

async function main(): Promise<void> {
  const argv = applyUnknownLongOptionGuardFor('partner:vault:migrate', Bun.argv.slice(2));
  const dbFlag = argv.indexOf('--db');
  const intakeFlag = argv.indexOf('--intake-dir');
  const dbPath = dbFlag !== -1 ? argv[dbFlag + 1] : undefined;
  const intakeDir = intakeFlag !== -1 ? argv[intakeFlag + 1] : undefined;

  const { migrated, files } = await migrateSeatIntakePasswordsToVault(dbPath, intakeDir);
  console.log(
    `✓ Migrated ${migrated} intake file(s) to partner_vault: ${files.join(', ') || '(none — nothing to migrate)'}`
  );
}

if (import.meta.main) {
  main().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
