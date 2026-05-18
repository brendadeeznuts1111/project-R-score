#!/usr/bin/env bun

/**
 * 🔐 Enhanced Security Setup for Fire22 Dashboard
 *
 * Interactive setup for enhanced security configuration
 * Integrates Bun.secrets with existing Fire22 security infrastructure
 * Provides comprehensive security setup wizard
 */

import { enhancedConfigManager } from './enhanced-secure-config';
import { EnhancedSecurityScanner } from './enhanced-security-scanner';
import { prompt } from './utils/prompt';

interface SecuritySetupOptions {
  telegramBot: boolean;
  dashboardAuth: boolean;
  apiSecurity: boolean;
  databaseSecurity: boolean;
  externalServices: boolean;
  monitoring: boolean;
}

async function setupEnhancedSecurity(): Promise<void> {
  console.info(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                Fire22 Enhanced Security Configuration Setup                  ║
║                                                                              ║
║  🔐 This wizard will help you set up enhanced security for your Fire22     ║
║     dashboard using Bun.secrets and advanced security scanning              ║
║                                                                              ║
║  🛡️  Features:                                                              ║
║     • Secure credential storage with Bun.secrets                           ║
║     • Enhanced security scanning and validation                            ║
║     • Telegram bot security integration                                     ║
║     • Dashboard authentication security                                      ║
║     • API security and monitoring                                           ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  try {
    // Step 1: Security setup options
    const options = await getSecuritySetupOptions();

    // Step 2: Collect credentials based on options
    const credentials = await collectCredentials(options);

    // Step 3: Store credentials securely
    await enhancedConfigManager.setupEnhancedConfig(credentials);

    // Step 4: Run initial security scan
    await runInitialSecurityScan();

    // Step 5: Generate security report
    await generateSecurityReport();

    console.info('\n🎉 Enhanced Security Setup Complete!');
    console.info('\n💡 Next Steps:');
    console.info('   1. Test your dashboard with new security configuration');
    console.info('   2. Run regular security scans: bun run enhanced:scan');
    console.info('   3. Deploy with security: bun run deploy:secure');
    console.info('   4. Monitor security status: bun run enhanced:audit');
  } catch (error) {
    console.error('❌ Enhanced security setup failed:', error);
    process.exit(1);
  }
}

async function getSecuritySetupOptions(): Promise<SecuritySetupOptions> {
  console.info('\n🔧 Step 1: Security Setup Options\n');

  const options: SecuritySetupOptions = {
    telegramBot: false,
    dashboardAuth: false,
    apiSecurity: false,
    databaseSecurity: false,
    externalServices: false,
    monitoring: false,
  };

  console.info('Select which security features to configure:\n');

  // Telegram Bot Security
  const telegramChoice = await prompt('🔐 Configure Telegram Bot Security? (y/n): ');
  options.telegramBot = telegramChoice.toLowerCase() === 'y';
  if (options.telegramBot) {
    console.info('   ✅ Telegram bot security will be configured');
  }

  // Dashboard Authentication
  const authChoice = await prompt('🔑 Configure Dashboard Authentication Security? (y/n): ');
  options.dashboardAuth = authChoice.toLowerCase() === 'y';
  if (options.dashboardAuth) {
    console.info('   ✅ Dashboard authentication security will be configured');
  }

  // API Security
  const apiChoice = await prompt('🛡️  Configure API Security? (y/n): ');
  options.apiSecurity = apiChoice.toLowerCase() === 'y';
  if (options.apiSecurity) {
    console.info('   ✅ API security will be configured');
  }

  // Database Security
  const dbChoice = await prompt('🗄️  Configure Database Security? (y/n): ');
  options.databaseSecurity = dbChoice.toLowerCase() === 'y';
  if (options.databaseSecurity) {
    console.info('   ✅ Database security will be configured');
  }

  // External Services
  const extChoice = await prompt('🔗 Configure External Services Security? (y/n): ');
  options.externalServices = extChoice.toLowerCase() === 'y';
  if (options.externalServices) {
    console.info('   ✅ External services security will be configured');
  }

  // Monitoring
  const monitorChoice = await prompt('📊 Configure Security Monitoring? (y/n): ');
  options.monitoring = monitorChoice.toLowerCase() === 'y';
  if (options.monitoring) {
    console.info('   ✅ Security monitoring will be configured');
  }

  return options;
}

async function collectCredentials(options: SecuritySetupOptions): Promise<Record<string, string>> {
  console.info('\n🔐 Step 2: Collecting Security Credentials\n');

  const credentials: Record<string, string> = {};

  // Telegram Bot Security
  if (options.telegramBot) {
    console.info('\n🤖 Telegram Bot Security Configuration');
    console.info('='.repeat(40));

    const botToken = await prompt('Enter your main Telegram Bot Token: ', true);
    if (botToken) credentials.BOT_TOKEN = botToken;

    const cashierBotToken = await prompt('Enter your Cashier Bot Token: ', true);
    if (cashierBotToken) credentials.CASHIER_BOT_TOKEN = cashierBotToken;

    const adminBotToken = await prompt('Enter Admin Bot Token (optional): ', true);
    if (adminBotToken) credentials.ADMIN_BOT_TOKEN = adminBotToken;
  }

  // Dashboard Authentication
  if (options.dashboardAuth) {
    console.info('\n🔑 Dashboard Authentication Security');
    console.info('='.repeat(40));

    const adminUsername = await prompt('Enter admin username: ');
    if (adminUsername) credentials.ADMIN_USERNAME = adminUsername;

    const adminPassword = await prompt('Enter admin password (min 8 chars): ', true);
    if (adminPassword) credentials.ADMIN_PASSWORD = adminPassword;

    const jwtSecret = await prompt('Enter JWT secret (min 32 chars): ', true);
    if (jwtSecret) credentials.JWT_SECRET = jwtSecret;
  }

  // API Security
  if (options.apiSecurity) {
    console.info('\n🛡️  API Security Configuration');
    console.info('='.repeat(40));

    const apiToken = await prompt('Enter Fire22 API Token: ', true);
    if (apiToken) credentials.FIRE22_API_TOKEN = apiToken;

    const webhookSecret = await prompt('Enter webhook secret: ', true);
    if (webhookSecret) credentials.WEBHOOK_SECRET = webhookSecret;
  }

  // Database Security
  if (options.databaseSecurity) {
    console.info('\n🗄️  Database Security Configuration');
    console.info('='.repeat(40));

    const dbUrl = await prompt('Enter database connection URL: ', true);
    if (dbUrl) credentials.DATABASE_URL = dbUrl;

    const dbPassword = await prompt('Enter database password: ', true);
    if (dbPassword) credentials.DATABASE_PASSWORD = dbPassword;
  }

  // External Services
  if (options.externalServices) {
    console.info('\n🔗 External Services Security');
    console.info('='.repeat(40));

    const stripeKey = await prompt('Enter Stripe secret key (optional): ', true);
    if (stripeKey) credentials.STRIPE_SECRET_KEY = stripeKey;

    const sendgridKey = await prompt('Enter SendGrid API key (optional): ', true);
    if (sendgridKey) credentials.SENDGRID_API_KEY = sendgridKey;

    const cloudflareToken = await prompt('Enter Cloudflare API token (optional): ', true);
    if (cloudflareToken) credentials.CLOUDFLARE_API_TOKEN = cloudflareToken;
  }

  // Security Monitoring
  if (options.monitoring) {
    console.info('\n📊 Security Monitoring Configuration');
    console.info('='.repeat(40));

    const securityWebhook = await prompt('Enter security webhook URL (optional): ');
    if (securityWebhook) credentials.SECURITY_WEBHOOK_URL = securityWebhook;

    const auditEndpoint = await prompt('Enter audit log endpoint (optional): ');
    if (auditEndpoint) credentials.AUDIT_LOG_ENDPOINT = auditEndpoint;
  }

  return credentials;
}

async function runInitialSecurityScan(): Promise<void> {
  console.info('\n🔍 Step 3: Initial Security Scan\n');

  try {
    const scanner = new EnhancedSecurityScanner();
    console.info('Running enhanced security scanner...');

    const result = await scanner.performEnhancedScan();

    if (result.passed) {
      console.info('✅ Initial security scan passed!');
      console.info(`🛡️  Security Score: ${result.securityScore}/100`);
    } else {
      console.info('⚠️  Initial security scan found issues:');
      result.issues.forEach(issue => {
        const icon = issue.severity === 'critical' ? '🚨' : '⚠️';
        console.info(`   ${icon} ${issue.package}: ${issue.description}`);
      });

      console.info('\n💡 Consider addressing these issues before proceeding to production.');
    }
  } catch (error) {
    console.error('❌ Initial security scan failed:', error);
    console.info('⚠️  Continuing setup - you can run security scans later');
  }
}

async function generateSecurityReport(): Promise<void> {
  console.info('\n📋 Step 4: Security Configuration Report\n');

  try {
    // Get current configuration
    const config = await enhancedConfigManager.getEnhancedConfig();

    console.info('🔐 Current Security Configuration:');
    console.info('='.repeat(40));

    const configGroups = {
      'Telegram Bot': ['BOT_TOKEN', 'CASHIER_BOT_TOKEN', 'ADMIN_BOT_TOKEN'],
      'Dashboard Auth': ['ADMIN_USERNAME', 'ADMIN_PASSWORD', 'JWT_SECRET'],
      'API Security': ['FIRE22_API_TOKEN', 'WEBHOOK_SECRET'],
      Database: ['DATABASE_URL', 'DATABASE_PASSWORD'],
      'External Services': ['STRIPE_SECRET_KEY', 'SENDGRID_API_KEY', 'CLOUDFLARE_API_TOKEN'],
      Monitoring: ['SECURITY_WEBHOOK_URL', 'AUDIT_LOG_ENDPOINT'],
    };

    for (const [group, keys] of Object.entries(configGroups)) {
      console.info(`\n${group}:`);
      for (const key of keys) {
        const value = config[key];
        if (value) {
          const masked = `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
          console.info(`   ✅ ${key}: ${masked}`);
        } else {
          console.info(`   ⚪ ${key}: Not configured`);
        }
      }
    }

    // Security audit summary
    console.info('\n🛡️  Security Audit Summary:');
    console.info('='.repeat(30));

    const totalCredentials = Object.keys(config).length;
    const configuredCredentials = Object.values(config).filter(v => v).length;
    const securityPercentage = Math.round((configuredCredentials / totalCredentials) * 100);

    console.info(
      `📊 Credentials Configured: ${configuredCredentials}/${totalCredentials} (${securityPercentage}%)`
    );

    if (securityPercentage >= 80) {
      console.info('🎉 Excellent security configuration!');
    } else if (securityPercentage >= 60) {
      console.info('✅ Good security configuration');
    } else {
      console.info('⚠️  Basic security configuration - consider adding more credentials');
    }
  } catch (error) {
    console.error('❌ Failed to generate security report:', error);
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0] || 'setup';

  switch (command) {
    case 'setup':
      setupEnhancedSecurity().catch(console.error);
      break;

    case 'audit':
      enhancedConfigManager.auditEnhancedSecurity().catch(console.error);
      break;

    case 'migrate':
      enhancedConfigManager.migrateToEnhancedStorage().catch(console.error);
      break;

    case 'report':
      generateSecurityReport().catch(console.error);
      break;

    case 'help':
    default:
      console.info(`
🔐 Fire22 Enhanced Security Setup

Usage: bun run setup-enhanced-security.ts [command]

Commands:
  setup     - Interactive enhanced security configuration setup (default)
  audit     - Security audit of current configuration
  migrate   - Migrate existing credentials to enhanced storage
  report    - Generate security configuration report
  help      - Show this help message

Examples:
  bun run setup-enhanced-security.ts setup
  bun run setup-enhanced-security.ts audit
  bun run setup-enhanced-security.ts migrate

Features:
  • Interactive security configuration wizard
  • Bun.secrets integration for secure credential storage
  • Enhanced security scanning and validation
  • Comprehensive security reporting
  • Migration from existing security systems
`);
      break;
  }
}

export { setupEnhancedSecurity };
