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
  console.info(styled('🏭 FactoryWager Secrets Lifecycle Manager', 'accent'));
  console.info(styled('==========================================', 'muted'));
  console.info();
  console.info(styled('Manage FactoryWager secrets lifecycle configuration.', 'info'));
  console.info();
  console.info(styled('Commands:', 'primary'));
  console.info('  load <config-file>              Load configuration from YAML file');
  console.info('  apply                           Apply loaded configuration');
  console.info('  validate                        Validate configuration syntax');
  console.info('  status                          Show current status');
  console.info('  export                          Export configuration with status');
  console.info('  help                            Show this help');
  console.info();
  console.info(styled('Examples:', 'primary'));
  console.info(
    '  bun run scripts/factorywager-lifecycle.ts load factorywager-secrets-lifecycle.yaml'
  );
  console.info('  bun run scripts/factorywager-lifecycle.ts apply');
  console.info('  bun run scripts/factorywager-lifecycle.ts status');
  console.info();
  console.info(styled('Configuration Format:', 'info'));
  console.info('  See factorywager-secrets-lifecycle.yaml for example format');
  console.info();
  console.info(styled(`📖 Documentation: ${BUN_DOCS.factorywager.lifecycle}`, 'accent'));
}

async function handleLoad() {
  const configFile = args[1];

  if (!configFile) {
    console.info(styled('❌ Missing configuration file', 'error'));
    console.info(styled('Usage: load <config-file>', 'muted'));
    return;
  }

  try {
    console.info(styled(`📁 Loading configuration: ${configFile}`, 'info'));

    const config = await factorywagerSecretsLifecycle.loadConfig(configFile);

    console.info(styled('✅ Configuration loaded successfully!', 'success'));
    console.info(styled(`   Version: ${config.version}`, 'primary'));
    console.info(styled(`   Rules: ${config.rules.length}`, 'muted'));
    console.info(
      styled(
        `   Audit: ${config.audit.enabled ? 'enabled' : 'disabled'}`,
        config.audit.enabled ? 'success' : 'warning'
      )
    );
    console.info(
      styled(`   Documentation: ${config.documentation.autoGenerate ? 'auto' : 'manual'}`, 'info')
    );

    // Show rule summary
    console.info();
    console.info(styled('📋 Rules Summary:', 'info'));

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

    console.info(styled(`   • Cron-based: ${scheduleTypes.cron || 0}`, 'muted'));
    console.info(styled(`   • Interval-based: ${scheduleTypes.interval || 0}`, 'muted'));
    console.info(styled(`   • Event-based: ${scheduleTypes.event || 0}`, 'muted'));
    console.info(styled(`   • Expiration-based: ${expirationRules}`, 'muted'));
  } catch (error) {
    console.info(styled(`❌ Failed to load configuration: ${error.message}`, 'error'));
    process.exit(1);
  }
}

async function handleApply() {
  try {
    console.info(styled('🔄 Applying FactoryWager configuration...', 'warning'));

    await factorywagerSecretsLifecycle.applyConfig();

    console.info();
    console.info(styled('✅ Configuration applied successfully!', 'success'));
    console.info(styled('   All rules have been processed and scheduled.', 'info'));
  } catch (error) {
    console.info(styled(`❌ Failed to apply configuration: ${error.message}`, 'error'));
    process.exit(1);
  }
}

async function handleValidate() {
  try {
    console.info(styled('🔍 Validating configuration...', 'info'));

    const result = await factorywagerSecretsLifecycle.validateConfig();

    if (result.valid) {
      console.info(styled('✅ Configuration is valid!', 'success'));
      console.info(styled('   All rules and settings are properly configured.', 'info'));
    } else {
      console.info(styled('❌ Configuration validation failed:', 'error'));
      console.info();
      result.errors.forEach(error => {
        console.info(styled(`   • ${error}`, 'warning'));
      });
      process.exit(1);
    }
  } catch (error) {
    console.info(styled(`❌ Validation error: ${error.message}`, 'error'));
    process.exit(1);
  }
}

async function handleStatus() {
  try {
    console.info(styled('📊 FactoryWager Lifecycle Status', 'primary'));
    console.info(styled('================================', 'muted'));

    const status = await factorywagerSecretsLifecycle.getStatus();

    console.info(styled(`📋 Version: ${status.version}`, 'info'));
    console.info(styled(`📝 Rules Applied: ${status.rulesApplied}`, 'success'));
    console.info(styled(`⏰ Active Rotations: ${status.activeRotations}`, 'primary'));
    console.info(
      styled(
        `⚠️  Expiring Soon: ${status.expiringSoon}`,
        status.expiringSoon > 0 ? 'warning' : 'success'
      )
    );
    console.info(
      styled(`🕐 Last Applied: ${new Date(status.lastApplied).toLocaleString()}`, 'muted')
    );

    if (status.expiringSoon > 0) {
      console.info();
      console.info(styled('⚠️  Action Required:', 'warning'));
      console.info(styled('   Some secrets are expiring soon. Check them with:', 'info'));
      console.info(styled('   bun run scripts/secret-version-cli.ts expirations', 'muted'));
    }
  } catch (error) {
    console.info(styled(`❌ Failed to get status: ${error.message}`, 'error'));
    process.exit(1);
  }
}

async function handleExport() {
  try {
    console.info(styled('📤 Exporting configuration...', 'info'));

    const exportData = await factorywagerSecretsLifecycle.exportConfig();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `factorywager-lifecycle-export-${timestamp}.json`;

    await Bun.write(filename, exportData);

    console.info(styled('✅ Configuration exported successfully!', 'success'));
    console.info(styled(`   File: ${filename}`, 'primary'));
    console.info(styled(`   Size: ${exportData.length} bytes`, 'muted'));
  } catch (error) {
    console.info(styled(`❌ Failed to export: ${error.message}`, 'error'));
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
          console.info(styled(`❌ Unknown command: ${command}`, 'error'));
          console.info(styled('Use "help" to see available commands', 'muted'));
        }
    }
  } catch (error) {
    console.error(styled(`❌ Error: ${error.message}`, 'error'));
    process.exit(1);
  }
}

// Run the CLI
main().catch(console.error);
