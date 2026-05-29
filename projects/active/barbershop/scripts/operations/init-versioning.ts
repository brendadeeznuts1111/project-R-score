#!/usr/bin/env bun

// scripts/init-versioning.ts

import { factoryWagerSecurityCitadel } from '../lib/secrets/core/factorywager-security-citadel';
import { secretManager } from '../lib/secrets/core/secrets';
import { BUN_DOCS } from '../lib/utils/docs/urls';

interface InitOptions {
  migrateAll?: boolean;
  backupR2?: boolean;
  dryRun?: boolean;
  force?: boolean;
}

function parseArgs(): InitOptions {
  const options: InitOptions = {};

  for (let i = 1; i < Bun.argv.length; i++) {
    const arg = Bun.argv[i];

    if (arg === '--migrate-all') options.migrateAll = true;
    if (arg === '--backup-r2') options.backupR2 = true;
    if (arg === '--dry-run') options.dryRun = true;
    if (arg === '--force') options.force = true;
    if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }
  }

  return options;
}

function showHelp() {
  console.info('🔄 Initialize Versioning for Existing Secrets');
  console.info('==========================================');
  console.info();
  console.info('Migrate existing secrets to immutable versioning system.');
  console.info();
  console.info('Options:');
  console.info('  --migrate-all    Migrate all existing secrets');
  console.info('  --backup-r2      Create backup in R2 before migration');
  console.info('  --dry-run        Show what would be migrated without doing it');
  console.info('  --force          Force migration even if already versioned');
  console.info('  --help, -h       Show this help');
  console.info();
  console.info('Examples:');
  console.info('  bun init-versioning.ts --migrate-all --backup-r2');
  console.info('  bun init-versioning.ts --dry-run');
}

function styled(
  text: string,
  type: 'success' | 'warning' | 'error' | 'info' | 'primary' | 'accent' | 'muted'
): string {
  const colors = {
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    info: '\x1b[36m',
    primary: '\x1b[34m',
    accent: '\x1b[35m',
    muted: '\x1b[90m',
  };
  const reset = '\x1b[0m';
  return `${colors[type]}${text}${reset}`;
}

async function main() {
  const options = parseArgs();

  console.info(styled('🔄 Initializing Versioning System', 'primary'));
  console.info(styled('================================', 'muted'));
  console.info();

  if (options.dryRun) {
    console.info(styled('🔍 DRY RUN MODE - No changes will be made', 'warning'));
    console.info();
  }

  try {
    // Step 1: Discover existing secrets
    console.info(styled('📋 Step 1: Discovering existing secrets...', 'info'));
    const existingSecrets = await discoverExistingSecrets();

    console.info(styled(`   Found ${existingSecrets.length} existing secrets`, 'success'));
    existingSecrets.forEach(secret => {
      console.info(styled(`   • ${secret.key}`, 'muted'));
    });
    console.info();

    // Step 2: Create backup if requested
    if (options.backupR2 && !options.dryRun) {
      console.info(styled('💾 Step 2: Creating R2 backup...', 'info'));
      await createBackupInR2(existingSecrets);
      console.info(styled('   ✅ Backup created in R2', 'success'));
      console.info();
    } else if (options.backupR2 && options.dryRun) {
      console.info(styled('💾 Step 2: Would create R2 backup', 'info'));
      console.info();
    }

    // Step 3: Migrate to versioning system
    if (options.migrateAll) {
      console.info(styled('🔄 Step 3: Migrating to versioning system...', 'info'));

      for (const secret of existingSecrets) {
        const alreadyVersioned = await checkIfVersioned(secret.key);

        if (alreadyVersioned && !options.force) {
          console.info(styled(`   ⏭️  Skipping ${secret.key} (already versioned)`, 'muted'));
          continue;
        }

        if (options.dryRun) {
          console.info(styled(`   🔄 Would migrate: ${secret.key}`, 'info'));
        } else {
          await migrateSecretToVersioning(secret);
          console.info(styled(`   ✅ Migrated: ${secret.key}`, 'success'));
        }
      }
      console.info();
    }

    // Step 4: Generate initial reports
    if (!options.dryRun) {
      console.info(styled('📊 Step 4: Generating initial reports...', 'info'));
      await generateInitialReports(existingSecrets);
      console.info(styled('   ✅ Reports generated', 'success'));
      console.info();
    }

    console.info(styled('🎉 Versioning initialization completed!', 'success'));

    if (options.dryRun) {
      console.info(styled('💡 Remove --dry-run to perform actual migration', 'info'));
    }
  } catch (error) {
    console.error(styled(`❌ Initialization failed: ${error.message}`, 'error'));
    process.exit(1);
  }
}

async function discoverExistingSecrets(): Promise<
  Array<{ key: string; service: string; name: string }>
> {
  // In a real implementation, this would scan Bun secrets or a registry
  // For demo purposes, we'll return some example secrets

  const secrets = [
    { key: 'api:github_token', service: 'api', name: 'github_token' },
    { key: 'database:password', service: 'database', name: 'password' },
    { key: 'jwt:secret', service: 'jwt', name: 'secret' },
    { key: 'stripe:webhook_secret', service: 'stripe', name: 'webhook_secret' },
    { key: 'redis:auth', service: 'redis', name: 'auth' },
  ];

  // Try to get actual values to verify they exist
  const existingSecrets = [];

  for (const secret of secrets) {
    try {
      const value = await secretManager.getSecret(secret.service, secret.name);
      if (value) {
        existingSecrets.push(secret);
      }
    } catch (error) {
      // Secret doesn't exist or can't be accessed
    }
  }

  return existingSecrets;
}

async function checkIfVersioned(key: string): Promise<boolean> {
  try {
    const history = await factoryWagerSecurityCitadel.getSecretTimeline(key, 1);
    return history.length > 0;
  } catch (error) {
    return false;
  }
}

async function createBackupInR2(
  secrets: Array<{ key: string; service: string; name: string }>
): Promise<void> {
  const backupData = {
    timestamp: new Date().toISOString(),
    version: '1.0',
    secrets: [],
  };

  for (const secret of secrets) {
    try {
      const value = await secretManager.getSecret(secret.service, secret.name);
      backupData.secrets.push({
        key: secret.key,
        value: value,
        discovered: new Date().toISOString(),
      });
    } catch (error) {
      backupData.secrets.push({
        key: secret.key,
        error: error.message,
        discovered: new Date().toISOString(),
      });
    }
  }

  // Store backup in R2
  const backupKey = `backups/versioning-init-${Date.now()}.json`;
  const backupContent = JSON.stringify(backupData, null, 2);

  const r2Credentials = {
    accountId: '7a470541a704caaf91e71efccc78fd36',
    accessKeyId: '84c87a7398c721036cd6e95df42d718c',
    secretAccessKey: '8a99fcc8f6202fc3961fa3e889318ced8228a483b7e57e788fb3cba5e5592015',
    bucketName: 'bun-executables',
  };

  const endpoint = `https://${r2Credentials.accountId}.r2.cloudflarestorage.com`;
  const url = `${endpoint}/${r2Credentials.bucketName}/${backupKey}`;

  const authString = `${r2Credentials.accessKeyId}:${r2Credentials.secretAccessKey}`;
  const authHeader = `Basic ${btoa(authString)}`;

  await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
      'x-amz-content-sha256': await Bun.hash(backupContent),
      'x-amz-meta-backup-type': 'versioning-initialization',
      'x-amz-meta-factorywager-version': '5.1',
    },
    body: backupContent,
  });
}

async function migrateSecretToVersioning(secret: {
  key: string;
  service: string;
  name: string;
}): Promise<void> {
  const value = await secretManager.getSecret(secret.service, secret.name);

  await factoryWagerSecurityCitadel.createImmutableVersion(
    secret.key,
    value,
    'versioning-migration',
    'Migrated to immutable versioning system',
    {
      severity: 'MEDIUM',
      tags: { migration: 'true', 'original-format': 'bun-secrets' },
      compliance: {
        dataClassification: 'INTERNAL',
        retentionDays: 365,
        auditRequired: true,
      },
    }
  );
}

async function generateInitialReports(secrets: Array<{ key: string }>): Promise<void> {
  const report = {
    migration: {
      timestamp: new Date().toISOString(),
      version: '5.1',
      totalSecrets: secrets.length,
      migrated: secrets.length,
    },
    secrets: [],
    factorywager: {
      version: '5.1',
      compliance: 'enabled',
      audit: 'enabled',
    },
  };

  for (const secret of secrets) {
    try {
      const timeline = await factoryWagerSecurityCitadel.getSecretTimeline(secret.key, 5);
      report.secrets.push({
        key: secret.key,
        versions: timeline.length,
        latestVersion: timeline[0]?.version || 'unknown',
        status: 'migrated',
      });
    } catch (error) {
      report.secrets.push({
        key: secret.key,
        error: error.message,
        status: 'failed',
      });
    }
  }

  // Store report in R2
  const reportKey = `reports/versioning-initialization-${Date.now()}.json`;
  const reportContent = JSON.stringify(report, null, 2);

  const r2Credentials = {
    accountId: '7a470541a704caaf91e71efccc78fd36',
    accessKeyId: '84c87a7398c721036cd6e95df42d718c',
    secretAccessKey: '8a99fcc8f6202fc3961fa3e889318ced8228a483b7e57e788fb3cba5e5592015',
    bucketName: 'bun-executables',
  };

  const endpoint = `https://${r2Credentials.accountId}.r2.cloudflarestorage.com`;
  const url = `${endpoint}/${r2Credentials.bucketName}/${reportKey}`;

  const authString = `${r2Credentials.accessKeyId}:${r2Credentials.secretAccessKey}`;
  const authHeader = `Basic ${btoa(authString)}`;

  await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
      'x-amz-content-sha256': await Bun.hash(reportContent),
      'x-amz-meta-report-type': 'versioning-initialization',
      'x-amz-meta-factorywager-version': '5.1',
    },
    body: reportContent,
  });
}

// Run the initialization
main().catch(console.error);
