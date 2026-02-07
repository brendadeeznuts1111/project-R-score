#!/usr/bin/env bun

// scripts/factorywager-lifecycle.ts

import { factorywagerSecretsLifecycle } from '../lib/secrets/config/factorywager-secrets-lifecycle';
import { BUN_DOCS } from '../lib/utils/docs/urls';

const args = Bun.argv.slice(2);
const command = args[0];

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

function showHelp() {
  console.log(styled('🏭 FactoryWager Secrets Lifecycle Manager', 'accent'));
  console.log(styled('==========================================', 'muted'));
  console.log();
  console.log(styled('Manage FactoryWager secrets lifecycle configuration.', 'info'));
  console.log();
  console.log(styled('Commands:', 'primary'));
  console.log('  load <config-file>              Load configuration from YAML file');
  console.log('  apply                           Apply loaded configuration');
  console.log('  validate                        Validate configuration syntax');
  console.log('  status                          Show current status');
  console.log('  export                          Export configuration with status');
  console.log('  help                            Show this help');
  console.log();
  console.log(styled('Examples:', 'primary'));
  console.log(
    '  bun run scripts/factorywager-lifecycle.ts load factorywager-secrets-lifecycle.yaml'
  );
  console.log('  bun run scripts/factorywager-lifecycle.ts apply');
  console.log('  bun run scripts/factorywager-lifecycle.ts status');
  console.log();
  console.log(styled('Configuration Format:', 'info'));
  console.log('  See factorywager-secrets-lifecycle.yaml for example format');
  console.log();
  console.log(styled(`📖 Documentation: ${BUN_DOCS.factorywager.lifecycle}`, 'accent'));
}

async function handleLoad() {
  const configFile = args[1];

  if (!configFile) {
    console.log(styled('❌ Missing configuration file', 'error'));
    console.log(styled('Usage: load <config-file>', 'muted'));
    return;
  }

  try {
    console.log(styled(`📁 Loading configuration: ${configFile}`, 'info'));

    const config = await factorywagerSecretsLifecycle.loadConfig(configFile);

    console.log(styled('✅ Configuration loaded successfully!', 'success'));
    console.log(styled(`   Version: ${config.version}`, 'primary'));
    console.log(styled(`   Rules: ${config.rules.length}`, 'muted'));
    console.log(
      styled(
        `   Audit: ${config.audit.enabled ? 'enabled' : 'disabled'}`,
        config.audit.enabled ? 'success' : 'warning'
      )
    );
    console.log(
      styled(`   Documentation: ${config.documentation.autoGenerate ? 'auto' : 'manual'}`, 'info')
    );

    // Show rule summary
    console.log();
    console.log(styled('📋 Rules Summary:', 'info'));

    const scheduleTypes = config.rules.reduce(
      (acc, rule) => {
        if (rule.schedule) {
          acc[rule.schedule.type] = (acc[rule.schedule.type] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    const expirationRules = config.rules.filter(rule => rule.expiration).length;

    console.log(styled(`   • Cron-based: ${scheduleTypes.cron || 0}`, 'muted'));
    console.log(styled(`   • Interval-based: ${scheduleTypes.interval || 0}`, 'muted'));
    console.log(styled(`   • Event-based: ${scheduleTypes.event || 0}`, 'muted'));
    console.log(styled(`   • Expiration-based: ${expirationRules}`, 'muted'));
  } catch (error) {
    console.log(styled(`❌ Failed to load configuration: ${error.message}`, 'error'));
    process.exit(1);
  }
}

async function handleApply() {
  try {
    console.log(styled('🔄 Applying FactoryWager configuration...', 'warning'));

    await factorywagerSecretsLifecycle.applyConfig();

    console.log();
    console.log(styled('✅ Configuration applied successfully!', 'success'));
    console.log(styled('   All rules have been processed and scheduled.', 'info'));
  } catch (error) {
    console.log(styled(`❌ Failed to apply configuration: ${error.message}`, 'error'));
    process.exit(1);
  }
}

async function handleValidate() {
  try {
    console.log(styled('🔍 Validating configuration...', 'info'));

    const result = await factorywagerSecretsLifecycle.validateConfig();

    if (result.valid) {
      console.log(styled('✅ Configuration is valid!', 'success'));
      console.log(styled('   All rules and settings are properly configured.', 'info'));
    } else {
      console.log(styled('❌ Configuration validation failed:', 'error'));
      console.log();
      result.errors.forEach(error => {
        console.log(styled(`   • ${error}`, 'warning'));
      });
      process.exit(1);
    }
  } catch (error) {
    console.log(styled(`❌ Validation error: ${error.message}`, 'error'));
    process.exit(1);
  }
}

async function handleStatus() {
  try {
    console.log(styled('📊 FactoryWager Lifecycle Status', 'primary'));
    console.log(styled('================================', 'muted'));

    const status = await factorywagerSecretsLifecycle.getStatus();

    console.log(styled(`📋 Version: ${status.version}`, 'info'));
    console.log(styled(`📝 Rules Applied: ${status.rulesApplied}`, 'success'));
    console.log(styled(`⏰ Active Rotations: ${status.activeRotations}`, 'primary'));
    console.log(
      styled(
        `⚠️  Expiring Soon: ${status.expiringSoon}`,
        status.expiringSoon > 0 ? 'warning' : 'success'
      )
    );
    console.log(
      styled(`🕐 Last Applied: ${new Date(status.lastApplied).toLocaleString()}`, 'muted')
    );

    if (status.expiringSoon > 0) {
      console.log();
      console.log(styled('⚠️  Action Required:', 'warning'));
      console.log(styled('   Some secrets are expiring soon. Check them with:', 'info'));
      console.log(styled('   bun run scripts/secret-version-cli.ts expirations', 'muted'));
    }
  } catch (error) {
    console.log(styled(`❌ Failed to get status: ${error.message}`, 'error'));
    process.exit(1);
  }
}

async function handleExport() {
  try {
    console.log(styled('📤 Exporting configuration...', 'info'));

    const exportData = await factorywagerSecretsLifecycle.exportConfig();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `factorywager-lifecycle-export-${timestamp}.json`;

    await Bun.write(filename, exportData);

    console.log(styled('✅ Configuration exported successfully!', 'success'));
    console.log(styled(`   File: ${filename}`, 'primary'));
    console.log(styled(`   Size: ${exportData.length} bytes`, 'muted'));
  } catch (error) {
    console.log(styled(`❌ Failed to export: ${error.message}`, 'error'));
    process.exit(1);
  }
}

async function main() {
  try {
    switch (command) {
      case 'load':
        await handleLoad();
        break;

      case 'apply':
        await handleApply();
        break;

      case 'validate':
        await handleValidate();
        break;

      case 'status':
        await handleStatus();
        break;

      case 'export':
        await handleExport();
        break;

      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;

      default:
        if (!command) {
          showHelp();
        } else {
          console.log(styled(`❌ Unknown command: ${command}`, 'error'));
          console.log(styled('Use "help" to see available commands', 'muted'));
        }
    }
  } catch (error) {
    console.error(styled(`❌ Error: ${error.message}`, 'error'));
    process.exit(1);
  }
}

// Run the CLI
main().catch(console.error);
