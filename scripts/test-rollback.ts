#!/usr/bin/env bun

/**
 * 🔄 FactoryWager Rollback Testing v5.1
 *
 * Test rollback procedures with dry-run capabilities
 *
 * @version 5.1
 */

import { VersionedSecretManager } from '../lib/security/versioned-secrets.ts';
import { styled } from '../lib/theme/colors.ts';
import { secrets } from 'bun';

type SecretApiMode = 'legacy-manager' | 'service-name';

function getArgValue(name: string): string {
  const direct = Bun.argv.find((arg) => arg.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const idx = Bun.argv.findIndex((arg) => arg === name);
  if (idx >= 0 && idx + 1 < Bun.argv.length) return Bun.argv[idx + 1];
  return '';
}

async function detectSecretApiMode(service: string): Promise<SecretApiMode> {
  try {
    await secrets.get({ service, name: '__rollback_probe__' });
    return 'service-name';
  } catch {
    return 'legacy-manager';
  }
}

async function getCurrentAndTarget(
  key: string,
  targetVersion: string,
  service: string,
  mode: SecretApiMode,
  versionedManager: VersionedSecretManager
): Promise<{
  current: { value: string; version: string };
  target: { value: string; version: string };
}> {
  if (mode === 'legacy-manager') {
    const current = await versionedManager.getWithVersion(key);
    const target = await versionedManager.getWithVersion(key, targetVersion);
    return {
      current: { value: String(current.value ?? ''), version: String(current.version ?? 'current') },
      target: { value: String(target.value ?? ''), version: String(target.version ?? targetVersion) },
    };
  }

  const currentValue = await secrets.get({ service, name: key });
  const targetValue = await secrets.get({ service, name: `${key}@${targetVersion}` });
  if (targetValue == null) {
    throw new Error(`Version ${targetVersion} not found for ${key} in service "${service}"`);
  }
  return {
    current: { value: String(currentValue ?? ''), version: 'current' },
    target: { value: String(targetValue), version: targetVersion },
  };
}

async function main() {
  const args = Bun.argv.slice(2);
  const key = args[0];
  const targetVersion = args[1];
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const service = getArgValue('--service') || process.env.BUN_SECRETS_SERVICE || 'default';

  if (!key || !targetVersion) {
    console.info(styled('❌ Usage: test-rollback.ts <key> <version> [--dry-run] [--force]', 'error'));
    process.exit(1);
  }

  console.info(styled('🔄 FactoryWager Rollback Testing v5.1', 'accent'));
  console.info(styled('======================================', 'muted'));
  console.info('');

  if (dryRun) {
    console.info(styled('🔍 DRY RUN MODE - No changes will be made', 'warning'));
    console.info('');
  }

  try {
    console.info(styled(`🎯 Testing rollback: ${key} → ${targetVersion}`, 'primary'));
    console.info(styled(`🧰 Secrets service: ${service}`, 'muted'));
    console.info('');

    const mode = await detectSecretApiMode(service);
    const versionedManager = new VersionedSecretManager(service);
    const { current, target } = await getCurrentAndTarget(
      key,
      targetVersion,
      service,
      mode,
      versionedManager
    );

    // Get current state
    console.info(styled('📊 Current State:', 'accent'));
    console.info(styled(`   Version: ${current.version}`, 'primary'));
    console.info(styled(`   Value: ${String(current.value).substring(0, 30)}...`, 'muted'));
    console.info('');

    // Get target state
    console.info(styled('🎯 Target State:', 'accent'));
    console.info(styled(`   Version: ${target.version}`, 'primary'));
    console.info(styled(`   Value: ${String(target.value).substring(0, 30)}...`, 'muted'));
    console.info('');

    // Show diff
    const diff = {
      changed: current.value !== target.value,
      lengthChange: target.value.length - current.value.length,
      similarity: current.value === target.value ? 1 : 0,
    };
    console.info(styled('🔍 Change Analysis:', 'accent'));
    console.info(styled(`   Changed: ${diff.changed ? 'Yes' : 'No'}`, diff.changed ? 'warning' : 'success'));
    if (diff.changed) {
      console.info(styled(`   Length change: ${diff.lengthChange} characters`, 'muted'));
      console.info(styled(`   Similarity: ${(diff.similarity * 100).toFixed(1)}%`, 'muted'));
    }
    console.info('');

    // Test rollback
    console.info(styled('🧪 Testing Rollback:', 'accent'));
    const rollbackResult =
      mode === 'legacy-manager'
        ? await versionedManager.rollback(
            key,
            targetVersion,
            { confirm: !force, reason: 'Testing rollback procedure', dryRun }
          )
        : dryRun
          ? {
              success: true,
              dryRun: true,
              from: current.version,
              to: targetVersion,
              reason: 'Testing rollback procedure',
              cancelled: false,
            }
          : await (async () => {
              await secrets.set({
                service,
                name: key,
                value: target.value,
              });
              return {
                success: true,
                dryRun: false,
                from: current.version,
                to: targetVersion,
                reason: 'Testing rollback procedure',
                cancelled: false,
              };
            })();

    if (rollbackResult.cancelled) {
      console.info(styled('❌ Rollback cancelled by user', 'muted'));
    } else {
      console.info(styled('✅ Rollback test completed', 'success'));
      console.info(styled(`   Success: ${rollbackResult.success}`, rollbackResult.success ? 'success' : 'error'));
      console.info(styled(`   Dry run: ${rollbackResult.dryRun}`, 'muted'));
      console.info(styled(`   From: ${rollbackResult.from}`, 'muted'));
      console.info(styled(`   To: ${rollbackResult.to}`, 'primary'));
      console.info(styled(`   Reason: ${rollbackResult.reason}`, 'muted'));
    }

    // Show rollback impact analysis
    console.info('');
    console.info(styled('📊 Impact Analysis:', 'accent'));
    console.info(styled('   • Services using this secret: Check dependent systems', 'muted'));
    console.info(styled('   • API endpoints affected: Verify after rollback', 'muted'));
    console.info(styled('   • Database connections: Test connectivity', 'muted'));
    console.info(styled('   • Cache invalidation: Clear relevant caches', 'muted'));

    // Recommendations
    console.info('');
    console.info(styled('💡 Recommendations:', 'primary'));
    if (diff.changed) {
      console.info(styled('   • Test rollback in staging environment first', 'warning'));
      console.info(styled('   • Monitor application logs during rollback', 'warning'));
      console.info(styled('   • Have rollback plan ready', 'warning'));
    } else {
      console.info(styled('   • Low-risk rollback (no value changes)', 'success'));
      console.info(styled('   • Can proceed with confidence', 'success'));
    }

    console.info('');
    console.info(styled('📖 Documentation:', 'accent'));
    console.info(styled('   https://bun.com/docs/runtime/secrets/rollback', 'primary'));
    console.info(styled('   https://factorywager.com/docs/secrets/testing', 'primary'));

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(styled(`❌ Rollback test failed: ${message}`, 'error'));
    process.exit(1);
  }
}

main().catch(error => {
  console.error(styled(`💥 Fatal error: ${error.message}`, 'error'));
  process.exit(1);
});
