#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
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

const DRY = Bun.argv.includes('--dry-run');
const SERVICE = Bun.env.FW_SECRETS_SERVICE?.trim() || 'com.factorywager.app';

const KEYS = [
  'MASTER_TOKEN_HMAC_KEY',
  'CSRF_SECRET',
  'COOKIE_SECRET',
  'JWT_SECRET',
  'REGISTRY_JWT_SECRET',
  'VARIANT_SECRET',
] as const;

async function main(): Promise<void> {
  const available = typeof Bun.secrets?.get === 'function';
  console.info('Bun.secrets migrate');
  console.info(`  service: ${SERVICE}`);
  console.info(`  available: ${available}`);
  console.info(`  mode: ${DRY ? 'dry-run' : 'write'}`);
  console.info('');

  if (!available && !DRY) {
    console.error('Bun.secrets is unavailable — aborting');
    process.exit(1);
  }

  let migrated = 0;
  let skipped = 0;
  let missing = 0;

  for (const name of KEYS) {
    const fromEnv = Bun.env[name]?.trim();
    if (!fromEnv) {
      console.info(`  · ${name}: no Bun.env value — skip`);
      missing++;
      continue;
    }

    let existing: string | null = null;
    if (available) {
      try {
        existing = await Bun.secrets.get({ service: SERVICE, name });
      } catch {
        existing = null;
      }
    }

    if (existing === fromEnv) {
      console.info(`  = ${name}: already in Bun.secrets`);
      skipped++;
      continue;
    }

    if (DRY) {
      console.info(`  → ${name}: would set (${fromEnv.length} chars)`);
      migrated++;
      continue;
    }

    try {
      await Bun.secrets.set({ service: SERVICE, name, value: fromEnv });
      console.info(`  ✓ ${name}: Bun.secrets.set`);
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
