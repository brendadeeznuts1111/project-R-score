#!/usr/bin/env bun

// scripts/setup-lifecycle.ts

import { factorywagerSecretsLifecycle } from '../lib/secrets/config/factorywager-secrets-lifecycle';
import { BUN_DOCS } from '../lib/utils/docs/urls';

interface LifecycleOptions {
  config?: string;
  dryRun?: boolean;
  validate?: boolean;
  force?: boolean;
}

function parseArgs(): LifecycleOptions {
  const options: LifecycleOptions = {};

  for (let i = 1; i < Bun.argv.length; i++) {
    const arg = Bun.argv[i];

    if (arg === '--config' && Bun.argv[i + 1]) {
      options.config = Bun.argv[++i];
    }
    if (arg === '--dry-run') options.dryRun = true;
    if (arg === '--validate') options.validate = true;
    if (arg === '--force') options.force = true;
    if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }
  }

  return options;
}

function showHelp() {
  console.info('⚙️  Setup Lifecycle Schedules');
  console.info('============================');
  console.info();
  console.info('Configure automated secret rotation and lifecycle management.');
  console.info();
  console.info('Options:');
  console.info('  --config <file>   Configuration file (YAML)');
  console.info('  --dry-run         Show what would be configured without doing it');
  console.info('  --validate        Validate configuration only');
  console.info('  --force           Force reconfiguration of existing rules');
  console.info('  --help, -h        Show this help');
  console.info();
  console.info('Examples:');
  console.info('  bun setup-lifecycle.ts --config factorywager-secrets-lifecycle.yaml');
  console.info('  bun setup-lifecycle.ts --config config.yaml --validate');
  console.info('  bun setup-lifecycle.ts --config config.yaml --dry-run');
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

  console.info(styled('⚙️  Lifecycle Setup', 'primary'));
  console.info(styled('================', 'muted'));
  console.info();

  if (options.dryRun) {
    console.info(styled('🔍 DRY RUN MODE - No changes will be made', 'warning'));
    console.info();
  }

  try {
    // Step 1: Load configuration
    const configFile = options.config || 'factorywager-secrets-lifecycle.yaml';
    console.info(styled('📁 Step 1: Loading configuration...', 'info'));
    console.info(styled(`   File: ${configFile}`, 'muted'));

    const config = await factorywagerSecretsLifecycle.loadConfig(configFile);

    console.info(
      styled(`   ✅ Loaded v${config.version} with ${config.rules.length} rules`, 'success')
    );
    console.info();

    // Step 2: Validate configuration
    console.info(styled('🔍 Step 2: Validating configuration...', 'info'));

    const validation = await factorywagerSecretsLifecycle.validateConfig();

    // Debug output
    console.info(styled('   🔍 Debug - Audit config:', 'info'));
    console.info(styled(`      enabled: ${config.audit.enabled}`, 'muted'));
    console.info(styled(`      r2Bucket: ${config.audit.r2Bucket}`, 'muted'));

    if (!validation.valid) {
      console.info(styled('   ❌ Configuration validation failed:', 'error'));
      validation.errors.forEach(error => {
        console.info(styled(`      • ${error}`, 'warning'));
      });
      process.exit(1);
    }

    console.info(styled('   ✅ Configuration is valid', 'success'));
    console.info();

    if (options.validate) {
      console.info(styled('✅ Validation complete - configuration is ready', 'success'));
      return;
    }

    // Step 3: Show configuration summary
    console.info(styled('📋 Step 3: Configuration summary...', 'info'));

    const scheduleTypes = config.rules.reduce(
      (acc, rule) => {
        if (rule.schedule) {
          acc[rule.schedule.type] = (acc[rule.schedule.type] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    const severityCount = config.rules.reduce(
      (acc, rule) => {
        const severity = rule.metadata?.severity || 'MEDIUM';
        acc[severity] = (acc[severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    console.info(styled(`   Rules: ${config.rules.length}`, 'primary'));
    console.info(styled(`   • Cron-based: ${scheduleTypes.cron || 0}`, 'muted'));
    console.info(styled(`   • Interval-based: ${scheduleTypes.interval || 0}`, 'muted'));
    console.info(styled(`   • Event-based: ${scheduleTypes.event || 0}`, 'muted'));
    console.info(
      styled(`   • Expiration-based: ${config.rules.filter(r => r.expiration).length}`, 'muted')
    );
    console.info();
    console.info(styled('   Severity distribution:', 'info'));
    Object.entries(severityCount).forEach(([severity, count]) => {
      const color = severity === 'CRITICAL' ? 'error' : severity === 'HIGH' ? 'warning' : 'muted';
      console.info(styled(`   • ${severity}: ${count}`, color));
    });
    console.info();

    // Step 4: Apply configuration
    if (options.dryRun) {
      console.info(styled('🔄 Step 4: Would apply configuration...', 'info'));

      config.rules.forEach(rule => {
        console.info(styled(`   • ${rule.key}: ${rule.schedule?.type || rule.action}`, 'muted'));
      });

      console.info();
      console.info(styled('💡 Remove --dry-run to apply the configuration', 'info'));
    } else {
      console.info(styled('🔄 Step 4: Applying configuration...', 'info'));

      await factorywagerSecretsLifecycle.applyConfig();

      console.info(styled('   ✅ Configuration applied successfully', 'success'));
      console.info();
    }

    // Step 5: Generate setup report
    if (!options.dryRun) {
      console.info(styled('📊 Step 5: Generating setup report...', 'info'));

      const status = await factorywagerSecretsLifecycle.getStatus();

      console.info(styled('   📊 Setup Summary:', 'primary'));
      console.info(styled(`   • Version: ${status.version}`, 'muted'));
      console.info(styled(`   • Rules Applied: ${status.rulesApplied}`, 'success'));
      console.info(styled(`   • Active Rotations: ${status.activeRotations}`, 'info'));
      console.info(
        styled(`   • Last Applied: ${new Date(status.lastApplied).toLocaleString()}`, 'muted')
      );
      console.info();

      console.info(styled('🔗 Next steps:', 'accent'));
      console.info(styled('   • Monitor: bun monitor-expirations.ts', 'muted'));
      console.info(styled('   • Dashboard: bun serve-dashboard.ts', 'muted'));
      console.info(styled('   • Audit: bun security-audit.ts', 'muted'));
    }

    console.info(styled('🎉 Lifecycle setup completed!', 'success'));
  } catch (error) {
    console.error(styled(`❌ Setup failed: ${error.message}`, 'error'));
    process.exit(1);
  }
}

// Run the setup
main().catch(console.error);
