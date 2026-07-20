#!/usr/bin/env bun
/**
 * Copy well-known secrets from Bun.env into Bun.secrets (OS credential store).
 *
 * Usage:
 *   bun scripts/secrets-migrate.ts
 *   bun scripts/secrets-migrate.ts --dry-run
 *   bun run secrets:migrate
 *
 * @see https://bun.com/docs/runtime/secrets — Bun.secrets
 * @see https://bun.com/docs/runtime/environment-variables — Bun.env
 */

import {
  SECRETS_SERVICE,
  SecretNames,
  getAppSecret,
  setAppSecret,
  secretsRuntime,
} from '../lib/security/secrets-manager';

const DRY = Bun.argv.includes('--dry-run');

const KEYS = Object.values(SecretNames);

async function main(): Promise<void> {
  const info = secretsRuntime();
  console.info('Bun.secrets migrate');
  console.info(
    `  platform: ${info.platform}  backend: ${info.backend}  available: ${info.available}`
  );
  console.info(`  service:  ${SECRETS_SERVICE}`);
  console.info(`  mode:     ${DRY ? 'dry-run' : 'write'}`);
  console.info('');

  if (!info.available && !DRY) {
    console.error('Bun.secrets is unavailable on this runtime — aborting');
    process.exit(1);
  }

  let migrated = 0;
  let skipped = 0;
  let missing = 0;

  for (const name of KEYS) {
    const fromEnv = Bun.env[name]?.trim();
    if (!fromEnv) {
      console.info(`  · ${name}: no env value — skip`);
      missing++;
      continue;
    }

    const existing = info.available ? await getAppSecret(name, { envKeys: [] }) : null;
    // getAppSecret with empty envKeys still may read env via adapter default —
    // check OS only by attempting set when env present.
    if (existing && existing === fromEnv) {
      console.info(`  = ${name}: already in store`);
      skipped++;
      continue;
    }

    if (DRY) {
      console.info(`  → ${name}: would migrate (${fromEnv.length} chars)`);
      migrated++;
      continue;
    }

    try {
      await setAppSecret(name, fromEnv);
      console.info(`  ✓ ${name}: stored in Bun.secrets`);
      migrated++;
    } catch (e) {
      console.error(`  ✗ ${name}: ${(e as Error).message}`);
      process.exitCode = 1;
    }
  }

  console.info('');
  console.info(`done: migrated=${migrated} skipped=${skipped} missing_env=${missing}`);
}

if (import.meta.main) {
  await main();
}
