#!/usr/bin/env bun

/**
 * ⏰ FactoryWager Lifecycle Setup v5.1
 *
 * Set up automated lifecycle management for secrets
 *
 * @version 5.1
 */

import { SecretLifecycleManager } from '../lib/security/secret-lifecycle.ts';
import { styled } from '../lib/theme/colors.ts';
import { YAML } from "bun"; // Assuming yaml library is available

const lifecycleManager = new SecretLifecycleManager();

async function main() {
  const args = Bun.argv.slice(2);
  const configFile = args.find(arg => arg.startsWith('--config='))?.split('=')[1] || 'factorywager-secrets-lifecycle.yaml';
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');

  console.log(styled('⏰ FactoryWager Lifecycle Setup v5.1', 'accent'));
  console.log(styled('=====================================', 'muted'));
  console.log('');

  if (dryRun) {
    console.log(styled('🔍 DRY RUN MODE - No schedules will be created', 'warning'));
    console.log('');
  }

  try {
    // Read configuration file
    const configContent = await Bun.file(configFile).text();
    const config = YAML.parse(configContent);

    if (!config.version || config.version !== '5.1') {
      console.log(styled('⚠️  Config version mismatch. Expected v5.1', 'warning'));
    }

    console.log(styled(`📋 Processing ${config.rules?.length || 0} lifecycle rules`, 'primary'));
    console.log('');

    let scheduled = 0;
    let skipped = 0;
    let errors = 0;

    for (const rule of config.rules || []) {
      try {
        if (verbose) {
          console.log(styled(`🔄 Setting up ${rule.key}...`, 'primary'));
        }

        const result = await lifecycleManager.scheduleRotation(rule.key, {
          key: rule.key,
          schedule: rule.schedule,
          action: rule.action || 'rotate',
          metadata: rule.metadata || {}
        });

        if (!dryRun) {
          console.log(styled(`   ✅ Scheduled: ${result.ruleId}`, 'success'));
          console.log(styled(`   Next run: ${result.nextRotation}`, 'muted'));
          scheduled++;
        } else {
          console.log(styled(`   🔍 Would schedule (dry run)`, 'warning'));
          scheduled++;
        }

      } catch (error) {
        console.log(styled(`   ❌ Error: ${error.message}`, 'error'));
        errors++;
      }
    }

    // Set up audit configuration
    if (config.audit) {
      console.log('');
      console.log(styled('📊 Audit Configuration:', 'accent'));

      if (config.audit.enabled) {
        console.log(styled('   ✅ Audit enabled', 'success'));
        console.log(styled(`   Retention: ${config.audit.retentionDays} days`, 'muted'));
        console.log(styled(`   Visual metadata: ${config.audit.visualMetadata}`, 'muted'));
        console.log(styled(`   R2 Bucket: ${config.audit.r2Bucket}`, 'muted'));
      }
    }

    // Set up documentation generation
    if (config.documentation) {
      console.log('');
      console.log(styled('📚 Documentation Configuration:', 'accent'));

      if (config.documentation.autoGenerate) {
        console.log(styled('   ✅ Auto-generation enabled', 'success'));
        console.log(styled(`   Include in audit: ${config.documentation.includeInAudit}`, 'muted'));
        console.log(styled(`   Domains: ${config.documentation.domains.join(', ')}`, 'muted'));
      }
    }

    console.log('');
    console.log(styled('📊 Setup Summary:', 'accent'));
    console.log(styled(`   Scheduled: ${scheduled}`, 'success'));
    console.log(styled(`   Skipped: ${skipped}`, 'muted'));
    console.log(styled(`   Errors: ${errors}`, 'error'));

    if (!dryRun && scheduled > 0) {
      console.log('');
      console.log(styled('🎉 Lifecycle setup complete!', 'success'));
      console.log(styled('📖 Docs: https://bun.com/docs/runtime/secrets/lifecycle-management', 'accent'));
    }

  } catch (error) {
    console.error(styled(`❌ Setup failed: ${error.message}`, 'error'));
    process.exit(1);
  }
}

main().catch(error => {
  console.error(styled(`💥 Fatal error: ${error.message}`, 'error'));
  process.exit(1);
});