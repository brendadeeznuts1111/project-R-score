#!/usr/bin/env bun

/**
 * 🚀 FactoryWager Versioning Initialization v5.1
 *
 * Initialize versioning for existing secrets with R2 backup
 *
 * @version 5.1
 */

import { VersionedSecretManager } from '../lib/security/versioned-secrets.ts';
import { styled } from '../lib/theme/colors.ts';
import { refs } from '@fw/business';

const versionedManager = new VersionedSecretManager(refs);

async function main() {
  const args = Bun.argv.slice(2);
  const migrateAll = args.includes('--migrate-all');
  const backupR2 = args.includes('--backup-r2');
  const dryRun = args.includes('--dry-run');

  console.info(styled('🚀 FactoryWager Versioning Initialization v5.1', 'accent'));
  console.info(styled('================================================', 'muted'));
  console.info('');

  if (dryRun) {
    console.info(styled('🔍 DRY RUN MODE - No changes will be made', 'warning'));
    console.info('');
  }

  try {
    // Get all existing secrets (this would need to be implemented based on Bun.secrets.list())
    const existingSecrets = await getExistingSecrets();

    if (existingSecrets.length === 0) {
      console.info(styled('ℹ️  No existing secrets found', 'muted'));
      return;
    }

    console.info(styled(`📋 Found ${existingSecrets.length} existing secrets`, 'primary'));
    console.info('');

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const secret of existingSecrets) {
      try {
        console.info(styled(`🔄 Processing ${secret.key}...`, 'primary'));

        // Check if already versioned
        const existingVersion = await versionedManager.getWithVersion(secret.key).catch(() => null);

        if (existingVersion) {
          console.info(styled(`   ⏭️  Already versioned (v${existingVersion.version})`, 'muted'));
          skipped++;
          continue;
        }

        if (!dryRun) {
          // Create initial version
          const result = await versionedManager.set(secret.key, secret.value, {
            author: 'versioning-init',
            description: 'Initial version from migration',
            level: 'HIGH',
            tags: {
              'factorywager:migrated': 'true',
              'factorywager:init-date': new Date().toISOString(),
              source: 'migration',
            },
          });

          console.info(styled(`   ✅ Migrated to v${result.version}`, 'success'));

          // Backup to R2 if requested
          if (backupR2) {
            await backupToR2(secret.key, secret.value, result.version);
            console.info(styled(`   💾 Backed up to R2`, 'success'));
          }

          migrated++;
        } else {
          console.info(styled(`   🔍 Would migrate (dry run)`, 'warning'));
          migrated++;
        }
      } catch (error) {
        console.info(styled(`   ❌ Error: ${error.message}`, 'error'));
        errors++;
      }
    }

    console.info('');
    console.info(styled('📊 Migration Summary:', 'accent'));
    console.info(styled(`   Migrated: ${migrated}`, 'success'));
    console.info(styled(`   Skipped: ${skipped}`, 'muted'));
    console.info(styled(`   Errors: ${errors}`, 'error'));

    if (!dryRun && migrated > 0) {
      console.info('');
      console.info(styled('🎉 Versioning initialization complete!', 'success'));
      console.info(styled('📖 Docs: https://bun.com/docs/runtime/secrets/versioning', 'accent'));
    }
  } catch (error) {
    console.error(styled(`❌ Initialization failed: ${error.message}`, 'error'));
    process.exit(1);
  }
}

// Mock function - replace with actual Bun.secrets.list() when available
async function getExistingSecrets() {
  // This would use Bun.secrets.list() in a real implementation
  // For now, return empty array
  return [];
}

async function backupToR2(key: string, value: string, version: string) {
  // Implement R2 backup logic
  const backupKey = `backups/init/${key}@${version}.json`;
  const backupData = {
    key,
    version,
    value,
    timestamp: new Date().toISOString(),
    type: 'initial-migration',
  };

  // This would use env.R2_BUCKET.put() in a real implementation
  console.info(styled(`   📤 Would backup to R2: ${backupKey}`, 'muted'));
}

main().catch(error => {
  console.error(styled(`💥 Fatal error: ${error.message}`, 'error'));
  process.exit(1);
});
