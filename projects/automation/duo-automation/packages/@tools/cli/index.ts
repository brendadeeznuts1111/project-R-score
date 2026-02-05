#!/usr/bin/env bun
/**
 * packages/cli/index.ts - Empire Pro v3.7 CLI Entry Point
 * Production-grade infrastructure management with full service integration
 * 
 * Architecture:
 * 1. Global service initialization (config, logger, audit)
 * 2. Command registration via CommandRegistry
 * 3. CLI command execution with error handling
 * 4. Audit logging and status tracking
 */

import { Command } from 'commander';
import { 
  getGlobalConfigService,
  setGlobalConfigService 
} from './services/config.service';
import { 
  getGlobalCommandService,
  setGlobalCommandService 
} from './services/command.service';
import {
  getGlobalLogger,
  setGlobalLogger
} from './utils/logger';
import {
  getGlobalErrorHandler,
  setGlobalErrorHandler
} from './utils/error-handler';
import {
  getGlobalAuditService,
  setGlobalAuditService
} from './services/audit.service';
import { getGlobalRegistry } from './utils/command-registry';
import { Logger, LogLevel } from './utils/logger';
import { ConfigService } from './services/config.service';
import { CommandService } from './services/command.service';
import { AuditService } from './services/audit.service';
import { ErrorHandler } from './utils/error-handler';
import { createStatusCommand } from './commands/status.command';
import { getGlobalSecretsService, setGlobalSecretsService } from './services/secrets.service';
import { setupCLI } from './services/cli-setup.service';
import { SecretsService } from './services/secrets.service';
import { createConfigCommand } from './commands/config-command';
import { createStatusCommand } from './commands/status.command';
import { createSecretsCommand } from './commands/secrets-command';
import { createStatusSecretsCommand } from './commands/status-secrets-command';
import { createInfoCommand } from './commands/info-command';
import { createAuditCommand } from './commands/audit-command';
import { createCatalogCommand } from './commands/catalog-command';

/**
 * Initialize global services - called on startup
 */
async function initializeServices(): Promise<{
  logger: Logger;
  configService: ConfigService;
  commandService: CommandService;
  auditService: AuditService;
  secretsService: any;
}> {
  // Initialize logger first
  const logger = new Logger({
    level: LogLevel.Info,
    useColors: true,
    useTimestamps: true
  });
  setGlobalLogger(logger);

  logger.info('🚀 Empire Pro CLI v3.7 - Initializing Services');

  // Initialize config service
  const configService = new ConfigService({ logger });
  await configService.initialize();
  setGlobalConfigService(configService);

  // Initialize error handler
  const errorHandler = new ErrorHandler({
    logger,
    exitOnFatal: false,
    retryConfig: {
      maxAttempts: 3,
      initialDelayMs: 100,
      backoffMultiplier: 2
    }
  });
  setGlobalErrorHandler(errorHandler);

  // Initialize audit service
  const auditService = new AuditService({
    logger,
    persistPath: configService.getScopedPath('audit.log'),
    actor: Bun.env.USER || 'cli-user'
  });
  await auditService.load();
  setGlobalAuditService(auditService);

  // Initialize command service
  const commandService = new CommandService({
    logger,
    validateInputs: true,
    recordAudit: true
  });
  setGlobalCommandService(commandService);

  // Initialize secrets service
  const secretsService = getGlobalSecretsService();
  setGlobalSecretsService(secretsService);

  logger.info('✅ All services initialized successfully', {
    scope: configService.getScope(),
    platform: configService.getPlatformRecommendations().platform
  });

  return { logger, configService, commandService, auditService, secretsService };
}

/**
 * Register all available commands
 */
function registerCommands(
  registry: ReturnType<typeof getGlobalRegistry>,
  configService: ConfigService,
  auditService: AuditService
): void {
  // Register status command
  const statusCommand = createStatusCommand(configService, auditService);
  registry.register(statusCommand);

  // Additional commands would be registered here:
  // registry.register(createHealthCommand(...));
  // registry.register(createSecretsCommand(...));
  // registry.register(createConfigCommand(...));
  // registry.register(createAuditCommand(...));
  // registry.register(createInitCommand(...));
}

/**
 * Setup CLI with Commander.js
 */
async function setupCLI(): Promise<void> {
  const { logger, configService, commandService, auditService, secretsService } = await initializeServices();

  const program = new Command();
  program
    .name('empire')
    .description('Empire Pro Infrastructure Management CLI (v3.7)')
    .version('3.7.0')
    .option('-v, --verbose', 'Enable verbose logging')
    .option('--debug', 'Enable debug mode')
    .hook('preAction', (thisCommand) => {
      if (thisCommand.opts().verbose) {
        const debugLogger = new Logger({ level: LogLevel.Debug, useColors: true });
        setGlobalLogger(debugLogger);
      }
    });

  // Register all commands
  const registry = getGlobalRegistry();
  registerCommands(registry, configService, auditService);

  // === HELP COMMAND ===
  program
    .command('help [command]')
    .description('Display help for commands')
    .action((commandName?: string) => {
      if (commandName) {
        console.log(commandService.getHelp(commandName));
      } else {
        console.log(commandService.getHelp());
      }
    });

  // === STATUS COMMAND ===
  program
    .command('status')
    .description('Display system status and health')
    .option('--format <format>', 'Output format (table|json|markdown)', 'table')
    .option('--browser', 'Open in browser')
    .action(async (options) => {
      try {
        const result = await commandService.execute('status', options);
        logger.info('Status command executed', result);
      } catch (error) {
        logger.error('Status command failed', { error });
        process.exit(1);
      }
    });

  // === CONFIG COMMAND ===
  program
    .command('config')
    .description('Manage CLI configuration')
    .option('--show', 'Show current configuration')
    .option('--scope <scope>', 'Show scope configuration')
    .option('--validate', 'Validate configuration')
    .action((options) => {
      try {
        if (options.show) {
          const config = configService.exportSanitized();
          console.log(JSON.stringify(config, null, 2));
        } else if (options.scope) {
          const scope = configService.getScope();
          console.log(`Current Scope: ${scope}`);
        } else if (options.validate) {
          const validation = configService.validateConfiguration();
          if (validation.valid) {
            logger.info('✅ Configuration is valid');
          } else {
            logger.error('❌ Configuration validation failed', validation);
            process.exit(1);
          }
        } else {
          console.log('Use --show, --scope, or --validate options');
        }
      } catch (error) {
        logger.error('Config command failed', { error });
        process.exit(1);
      }
    });

  // === SECRETS COMMAND ===
  program
    .command('secrets')
    .description('Manage enterprise secrets with Bun.secrets')
    .option('--set <name:value>', 'Set a secret (name:value format)')
    .option('--get <name>', 'Get a secret value')
    .option('--delete <name>', 'Delete a secret')
    .option('--list', 'List all secret names')
    .option('--export', 'Export all secrets (for backup)')
    .option('--import <file>', 'Import secrets from file')
    .option('--sync <worker>', 'Sync secrets to Cloudflare Worker')
    .option('--health', 'Check secrets service health')
    .option('--info', 'Show platform and storage info')
    .action(async (options) => {
      try {
        const secretsService = getGlobalSecretsService();
        
        if (options.set) {
          const [name, value] = options.set.split(':');
          if (!name || !value) {
            console.error('❌ Use format: --set NAME:VALUE');
            process.exit(1);
          }
          await secretsService.set(name, value);
          console.log(`✅ Secret set: ${name}`);
          
        } else if (options.get) {
          const value = await secretsService.get(options.get);
          if (value) {
            console.log(`🔑 ${options.get}: ${value}`);
          } else {
            console.log(`❌ Secret not found: ${options.get}`);
            process.exit(1);
          }
          
        } else if (options.delete) {
          await secretsService.delete(options.delete);
          console.log(`🗑️ Secret deleted: ${options.delete}`);
          
        } else if (options.list) {
          const secrets = await secretsService.list();
          console.log(`📋 Secrets (${secrets.length}):`);
          secrets.forEach(name => console.log(`  - ${name}`));
          
        } else if (options.export) {
          const exported = await secretsService.export();
          console.log('📤 Exported secrets:');
          console.log(JSON.stringify(exported, null, 2));
          
        } else if (options.import) {
          try {
            const file = Bun.file(options.import);
            if (!await file.exists()) {
              console.error(`❌ File not found: ${options.import}`);
              process.exit(1);
            }
            const secrets = await file.json();
            await secretsService.import(secrets);
            console.log(`📥 Imported ${Object.keys(secrets).length} secrets`);
          } catch (error) {
            console.error(`❌ Import failed: ${error}`);
            process.exit(1);
          }
          
        } else if (options.sync) {
          console.log(`🔄 Syncing secrets to Cloudflare Worker: ${options.sync}`);
          await secretsService.syncToCloudflare?.(options.sync);
          console.log('✅ Secrets synced successfully');
          
        } else if (options.health) {
          const health = await secretsService.healthCheck();
          console.log('🏥 Secrets Service Health:');
          console.log(`  Healthy: ${health.healthy ? '✅' : '❌'}`);
          console.log('  Checks:');
          Object.entries(health.checks).forEach(([check, passed]) => {
            console.log(`    ${check}: ${passed ? '✅' : '❌'}`);
          });
          
        } else if (options.info) {
          const info = secretsService.getPlatformInfo();
          console.log('ℹ️  Secrets Service Info:');
          console.log(JSON.stringify(info, null, 2));
          
        } else {
          console.log('🔑 Empire Pro Secrets Management');
          console.log('');
          console.log('Usage:');
          console.log('  empire secrets --set NAME:VALUE    Set a secret');
          console.log('  empire secrets --get NAME          Get a secret');
          console.log('  empire secrets --delete NAME       Delete a secret');
          console.log('  empire secrets --list              List all secrets');
          console.log('  empire secrets --export            Export all secrets');
          console.log('  empire secrets --import FILE       Import secrets from file');
          console.log('  empire secrets --sync WORKER       Sync to Cloudflare Worker');
          console.log('  empire secrets --health            Check service health');
          console.log('  empire secrets --info              Show platform info');
        }
      } catch (error) {
        logger.error('Secrets command failed', { error });
        console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // === STATUS SECRETS COMMAND ===
  program
    .command('status-secrets')
    .description('Manage status system secrets (webhook, auth, etc.)')
    .option('--set-webhook <url>', 'Set webhook URL secret')
    .option('--set-auth <token>', 'Set authentication token')
    .option('--set-subscription <secret>', 'Set subscription secret')
    .option('--get-webhook', 'Get webhook URL')
    .option('--get-auth', 'Get auth token')
    .option('--get-subscription', 'Get subscription secret')
    .option('--deploy', 'Deploy all status secrets to Cloudflare')
    .action(async (options) => {
      try {
        const secretsService = getGlobalSecretsService();
        
        if (options.setWebhook) {
          await secretsService.set('WEBHOOK_URL', options.setWebhook);
          console.log('✅ Webhook URL secret set');
        }
        
        if (options.setAuth) {
          await secretsService.set('AUTH_TOKEN', options.setAuth);
          console.log('✅ Auth token secret set');
        }
        
        if (options.setSubscription) {
          await secretsService.set('SUBSCRIPTION_SECRET', options.setSubscription);
          console.log('✅ Subscription secret set');
        }
        
        if (options.getWebhook) {
          const webhook = await secretsService.get('WEBHOOK_URL');
          console.log(webhook ? `🔗 Webhook URL: ${webhook}` : '❌ Webhook URL not found');
        }
        
        if (options.getAuth) {
          const auth = await secretsService.get('AUTH_TOKEN');
          console.log(auth ? `🔑 Auth Token: ${auth}` : '❌ Auth token not found');
        }
        
        if (options.getSubscription) {
          const sub = await secretsService.get('SUBSCRIPTION_SECRET');
          console.log(sub ? `🔐 Subscription Secret: ${sub}` : '❌ Subscription secret not found');
        }
        
        if (options.deploy) {
          console.log('🚀 Deploying status system secrets to Cloudflare...');
          await secretsService.syncToCloudflare?.('empire-pro-status');
          console.log('✅ Status secrets deployed successfully');
        }
        
        if (!Object.values(options).some(v => v !== undefined)) {
          console.log('🔐 Status System Secrets Management');
          console.log('');
          console.log('Usage:');
          console.log('  empire status-secrets --set-webhook <url>    Set webhook URL');
          console.log('  empire status-secrets --set-auth <token>      Set auth token');
          console.log('  empire status-secrets --set-subscription <secret>  Set subscription secret');
          console.log('  empire status-secrets --get-webhook           Get webhook URL');
          console.log('  empire status-secrets --get-auth               Get auth token');
          console.log('  empire status-secrets --get-subscription        Get subscription secret');
          console.log('  empire status-secrets --deploy                 Deploy all to Cloudflare');
        }
      } catch (error) {
        logger.error('Status secrets command failed', { error });
        console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // === AUDIT COMMAND ===
  program
    .command('audit')
    .description('View and manage audit logs')
    .option('--recent <count>', 'Show recent entries')
    .option('--filter <type>', 'Filter by type (command|secret|config|error|security)')
    .option('--export', 'Export audit log')
    .option('--clear', 'Clear audit log (WARNING)')
    .action(async (options) => {
      try {
        if (options.recent) {
          const entries = auditService.getRecent(parseInt(options.recent));
          console.log(`📋 Recent ${entries.length} audit entries:`);
          entries.forEach(e => {
            console.log(`  [${e.timestamp.toISOString()}] ${e.type}::${e.action} - ${e.status}`);
          });
        } else if (options.filter) {
          const filtered = auditService.query({ type: options.filter as any });
          console.log(`📋 Filtered audit entries (${options.filter}): ${filtered.length} entries`);
        } else if (options.export) {
          const exported = auditService.export();
          console.log(JSON.stringify(exported, null, 2));
        } else if (options.clear) {
          logger.warn('Clearing audit log...');
          auditService.clear();
          logger.info('✅ Audit log cleared');
        } else {
          const stats = auditService.getStats();
          console.log('📊 Audit Log Statistics:');
          console.log(JSON.stringify(stats, null, 2));
        }
      } catch (error) {
        logger.error('Audit command failed', { error });
        process.exit(1);
      }
    });

  // === INFO COMMAND ===
  program
    .command('info')
    .description('Display platform and system information')
    .action(() => {
      try {
        const platformInfo = configService.getPlatformRecommendations();
        const stats = auditService.getStats();
        
        console.log('🏗️  Empire Pro System Information\n');
        console.log('Platform:', JSON.stringify(platformInfo, null, 2));
        console.log('\nAudit Statistics:');
        console.log(JSON.stringify(stats, null, 2));
      } catch (error) {
        logger.error('Info command failed', { error });
        process.exit(1);
      }
    });

  // === CATALOG COMMAND ===
  const catalogCommand = createCatalogCommand();
  program.addCommand(catalogCommand);

  // === CLEANUP ON EXIT ===
  process.on('SIGINT', async () => {
    logger.info('🛑 Shutting down gracefully...');
    
    try {
      await configService.teardown();
      await auditService.destroy();
      logger.info('✅ Cleanup complete');
    } catch (error) {
      logger.error('Cleanup error', { error });
    }

    process.exit(0);
  });

  // Parse CLI arguments
  program.parse(process.argv);

  // Show help if no command provided
  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    if (import.meta.main) {
      await setupCLI();
    }
  } catch (error) {
    console.error('Failed to initialize CLI:', error);
    process.exit(1);
  }
}

// Run main
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export { initializeServices, registerCommands, setupCLI };