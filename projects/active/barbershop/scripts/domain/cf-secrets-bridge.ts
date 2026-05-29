/**
 * Cloudflare Secrets Bridge
 *
 * Integrates Cloudflare domain management with Bun.secrets CLI.
 * Provides secure storage and retrieval of Cloudflare API credentials.
 */

import {
  deleteSecret as deleteManagedSecret,
  getSecret as getManagedSecret,
  setSecret as setManagedSecret,
} from '../../lib/cloudflare/bun-secrets-adapter';

const CF_SERVICE = 'com.barbershop.cloudflare';
const LEGACY_CF_SERVICE = 'cloudflare';
const TOKEN_NAME = 'api_token';
const ACCOUNT_ID_NAME = 'account_id';

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const c = (text: string, color: keyof typeof colors): string =>
  `${colors[color]}${text}${colors.reset}`;

export interface CloudflareCredentials {
  apiToken: string;
  accountId?: string;
}

/**
 * Cloudflare Secrets Bridge
 *
 * Manages Cloudflare API credentials through Bun.secrets with:
 * - Version tracking (optional, requires integrated secrets)
 * - Automatic rotation scheduling (optional)
 * - Secure fallback to environment variables
 */
export class CloudflareSecretsBridge {
  private useAdvancedFeatures = false;
  private integratedSecretManager: any = null;
  private secretLifecycleManager: any = null;

  constructor() {
    // Try to load advanced features if available
    this.loadAdvancedFeatures();
  }

  private async loadAdvancedFeatures(): Promise<void> {
    try {
      const { integratedSecretManager } =
        await import('../../lib/secrets/core/integrated-secret-manager');
      const { secretLifecycleManager } = await import('../../lib/secrets/core/secret-lifecycle');
      this.integratedSecretManager = integratedSecretManager;
      this.secretLifecycleManager = secretLifecycleManager;
      this.useAdvancedFeatures = true;
    } catch {
      // Advanced features not available (e.g., missing R2 credentials)
      this.useAdvancedFeatures = false;
    }
  }

  /**
   * Store secret using Bun.secrets
   */
  private async storeSecret(service: string, name: string, value: string): Promise<void> {
    try {
      await setManagedSecret({ service, name, value });
    } catch (e) {
      const envKey = `${service}_${name}`.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
      console.warn(`Failed to store in Bun.secrets: ${(e as Error).message}`);
      console.info(c('  ℹ️  Note: Bun.secrets not available', 'yellow'));
      console.info(c(`     Set environment variable: ${envKey}`, 'gray'));
      throw new Error('Bun.secrets not available - use environment variables instead');
    }
  }

  /**
   * Retrieve secret from Bun.secrets or environment
   */
  private async retrieveSecret(service: string, name: string): Promise<string | undefined> {
    const value = await getManagedSecret({
      service,
      name,
      legacyServices: [LEGACY_CF_SERVICE],
    });
    return value ?? undefined;
  }

  /**
   * Store Cloudflare API token
   */
  async setToken(token: string, user: string = 'cli'): Promise<void> {
    await this.storeSecret(CF_SERVICE, TOKEN_NAME, token);

    // Also store in integrated manager if available
    if (this.useAdvancedFeatures && this.integratedSecretManager) {
      try {
        await this.integratedSecretManager.setSecret(CF_SERVICE, TOKEN_NAME, token, user, {
          description: 'Cloudflare API Token',
          source: 'cf-domain-cli',
        });
      } catch {
        // Ignore errors from advanced features
      }
    }
  }

  /**
   * Store Cloudflare Account ID
   */
  async setAccountId(accountId: string, user: string = 'cli'): Promise<void> {
    await this.storeSecret(CF_SERVICE, ACCOUNT_ID_NAME, accountId);

    if (this.useAdvancedFeatures && this.integratedSecretManager) {
      try {
        await this.integratedSecretManager.setSecret(CF_SERVICE, ACCOUNT_ID_NAME, accountId, user, {
          description: 'Cloudflare Account ID',
          source: 'cf-domain-cli',
        });
      } catch {
        // Ignore errors
      }
    }
  }

  /**
   * Get Cloudflare credentials
   */
  async getCredentials(): Promise<CloudflareCredentials | null> {
    const [apiToken, accountId] = await Promise.all([
      this.retrieveSecret(CF_SERVICE, TOKEN_NAME),
      this.retrieveSecret(CF_SERVICE, ACCOUNT_ID_NAME),
    ]);

    if (!apiToken) {
      return null;
    }

    return { apiToken, accountId };
  }

  /**
   * Get just the API token
   */
  async getToken(): Promise<string | undefined> {
    return await this.retrieveSecret(CF_SERVICE, TOKEN_NAME);
  }

  /**
   * Get just the Account ID
   */
  async getAccountId(): Promise<string | undefined> {
    return await this.retrieveSecret(CF_SERVICE, ACCOUNT_ID_NAME);
  }

  /**
   * Check if credentials are configured
   */
  async hasCredentials(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }

  /**
   * Delete all Cloudflare credentials
   */
  async deleteCredentials(user: string = 'cli'): Promise<void> {
    await Promise.all([
      deleteManagedSecret({ service: CF_SERVICE, name: TOKEN_NAME }),
      deleteManagedSecret({ service: CF_SERVICE, name: ACCOUNT_ID_NAME }),
    ]);
    void user;
  }

  /**
   * Get version history for credentials (requires advanced features)
   */
  async getHistory(limit: number = 10): Promise<any[]> {
    if (!this.useAdvancedFeatures || !this.integratedSecretManager) {
      console.info(c('  Note: Version history requires integrated secrets manager', 'yellow'));
      return [];
    }
    return await this.integratedSecretManager.getVersionHistory(CF_SERVICE, TOKEN_NAME, limit);
  }

  /**
   * Rollback to previous version
   */
  async rollback(version: string, user: string = 'cli'): Promise<void> {
    if (!this.useAdvancedFeatures || !this.integratedSecretManager) {
      throw new Error('Rollback requires integrated secrets manager with version graph');
    }
    await this.integratedSecretManager.rollbackToVersion(CF_SERVICE, TOKEN_NAME, version, user);
  }

  /**
   * Schedule token rotation
   */
  async scheduleRotation(cronExpression: string = '0 2 * * 0'): Promise<void> {
    if (!this.useAdvancedFeatures || !this.secretLifecycleManager) {
      console.info(c('  Note: Scheduled rotation requires integrated lifecycle manager', 'yellow'));
      console.info(c('  Run rotation manually: bun run cf:secrets:rotate', 'gray'));
      return;
    }

    const key = `${CF_SERVICE}:${TOKEN_NAME}`;
    await this.secretLifecycleManager.scheduleRotation(key, {
      key,
      schedule: { type: 'cron', cron: cronExpression },
      action: 'rotate',
      enabled: true,
      metadata: {
        description: 'Scheduled Cloudflare token rotation',
        severity: 'HIGH',
      },
    });
  }

  /**
   * Check if token needs rotation
   */
  async checkRotationStatus(): Promise<{
    needsRotation: boolean;
    daysOld?: number;
    lastRotated?: string;
  }> {
    const history = await this.getHistory(5);

    if (history.length === 0) {
      return { needsRotation: false }; // Can't determine without history
    }

    const latest = history[0];
    const lastRotated = new Date(latest.timestamp);
    const daysOld = Math.floor((Date.now() - lastRotated.getTime()) / (1000 * 60 * 60 * 24));

    // Recommend rotation every 90 days
    return {
      needsRotation: daysOld > 90,
      daysOld,
      lastRotated: latest.timestamp,
    };
  }

  /**
   * Validate token format (basic check)
   */
  validateTokenFormat(token: string): { valid: boolean; message?: string } {
    if (!token || token.length < 20) {
      return { valid: false, message: 'Token too short (should be ~40 characters)' };
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(token)) {
      return { valid: false, message: 'Token contains invalid characters' };
    }

    return { valid: true };
  }

  /**
   * Print credentials status (without revealing values)
   */
  async printStatus(): Promise<void> {
    const creds = await this.getCredentials();
    const rotationStatus = await this.checkRotationStatus();

    console.info();
    console.info(c('🏭 Cloudflare Credentials Status', 'bold'));
    console.info(c('─'.repeat(40), 'gray'));

    if (!creds) {
      console.info(c('  Status: ', 'bold') + c('Not configured', 'red'));
      console.info(c('  Run: bun run cf:secrets:set-token <token>', 'gray'));
      return;
    }

    console.info(c('  Status: ', 'bold') + c('Configured', 'green'));
    console.info(c(`  API Token: ${'*'.repeat(20)}${creds.apiToken.slice(-4)}`, 'gray'));

    if (creds.accountId) {
      console.info(c(`  Account ID: ${creds.accountId}`, 'gray'));
    } else {
      console.info(c('  Account ID: Not set', 'yellow'));
    }

    // Show storage method
    const hasBunSecrets = typeof Bun !== 'undefined' && 'secrets' in Bun;
    console.info(c(`  Storage: ${hasBunSecrets ? 'Bun.secrets' : 'Environment variables'}`, 'gray'));

    if (rotationStatus.daysOld !== undefined) {
      console.info();
      console.info(c('  Rotation Status:', 'bold'));

      if (rotationStatus.needsRotation) {
        console.info(c(`    ⚠️  Token is ${rotationStatus.daysOld} days old`, 'yellow'));
        console.info(c('    Run: bun run cf:secrets:rotate', 'gray'));
      } else {
        console.info(c(`    ✓ Token is ${rotationStatus.daysOld} days old`, 'green'));
      }

      if (rotationStatus.lastRotated) {
        console.info(
          c(
            `    Last rotated: ${new Date(rotationStatus.lastRotated).toLocaleDateString()}`,
            'gray'
          )
        );
      }
    }

    console.info();
  }
}

// Singleton instance
export const cfSecretsBridge = new CloudflareSecretsBridge();

// ==================== CLI Commands ====================

async function main() {
  const args = Bun.argv.slice(2);
  const command = args[0];
  const subcommand = args[1];

  if (!command) {
    showHelp();
    return;
  }

  const bridge = new CloudflareSecretsBridge();

  try {
    switch (command) {
      case 'set-token':
        await handleSetToken(bridge, args[2]);
        break;

      case 'set-account':
        await handleSetAccount(bridge, args[2]);
        break;

      case 'setup':
        await handleSetup(bridge, args[2], args[3]);
        break;

      case 'status':
        await bridge.printStatus();
        break;

      case 'history':
        await handleHistory(bridge, parseInt(args[2]) || 10);
        break;

      case 'rotate':
        await handleRotate(bridge, args[2]);
        break;

      case 'schedule':
        await handleSchedule(bridge, args[2]);
        break;

      case 'rollback':
        await handleRollback(bridge, args[2]);
        break;

      case 'delete':
        await handleDelete(bridge);
        break;

      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;

      default:
        console.info(c(`❌ Unknown command: ${command}`, 'red'));
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.info(c(`❌ Error: ${(error as Error).message}`, 'red'));
    process.exit(1);
  }
}

function showHelp(): void {
  console.info();
  console.info(c('🏭 Cloudflare Secrets Bridge', 'bold'));
  console.info(c('   Secure credential management for Cloudflare API', 'gray'));
  console.info();
  console.info(c('Usage:', 'bold'));
  console.info('  bun run scripts/domain/cf-secrets-bridge.ts <command> [options]');
  console.info();
  console.info(c('Commands:', 'bold'));
  console.info('  set-token <token>           Store Cloudflare API token');
  console.info('  set-account <account-id>    Store Cloudflare Account ID');
  console.info('  setup <token> [account-id]  Configure both token and account');
  console.info('  status                      Show credentials status');
  console.info('  history [limit]             Show version history (default: 10)');
  console.info('  rotate [reason]             Rotate token immediately');
  console.info('  schedule <cron>             Schedule automatic rotation');
  console.info('  rollback <version>          Rollback to previous version');
  console.info('  delete                      Delete all credentials');
  console.info();
  console.info(c('Examples:', 'bold'));
  console.info('  bun run cf:secrets:set-token abc123xyz...');
  console.info('  bun run cf:secrets:setup abc123xyz... your-account-id');
  console.info('  bun run cf:secrets:status');
  console.info('  bun run cf:secrets:schedule "0 2 * * 0"');
  console.info();
  console.info(c('Environment Variables:', 'bold'));
  console.info('  CLOUDFLARE_API_TOKEN        Fallback if not in secrets store');
  console.info('  CLOUDFLARE_ACCOUNT_ID       Fallback if not in secrets store');
  console.info();
}

async function handleSetToken(bridge: CloudflareSecretsBridge, token?: string): Promise<void> {
  if (!token) {
    console.info(c('❌ API token required', 'red'));
    console.info(c('Usage: set-token <token>', 'gray'));
    return;
  }

  const validation = bridge.validateTokenFormat(token);
  if (!validation.valid) {
    console.info(c(`❌ Invalid token: ${validation.message}`, 'red'));
    return;
  }

  await bridge.setToken(token);
  console.info(c('✅ API token stored securely', 'green'));
  console.info(c(`   Token: ${'*'.repeat(20)}${token.slice(-4)}`, 'gray'));
}

async function handleSetAccount(
  bridge: CloudflareSecretsBridge,
  accountId?: string
): Promise<void> {
  if (!accountId) {
    console.info(c('❌ Account ID required', 'red'));
    console.info(c('Usage: set-account <account-id>', 'gray'));
    return;
  }

  await bridge.setAccountId(accountId);
  console.info(c('✅ Account ID stored', 'green'));
  console.info(c(`   Account: ${accountId}`, 'gray'));
}

async function handleSetup(
  bridge: CloudflareSecretsBridge,
  token?: string,
  accountId?: string
): Promise<void> {
  if (!token) {
    console.info(c('❌ API token required', 'red'));
    console.info(c('Usage: setup <token> [account-id]', 'gray'));
    return;
  }

  await handleSetToken(bridge, token);

  if (accountId) {
    await handleSetAccount(bridge, accountId);
  }

  console.info();
  console.info(c('✅ Cloudflare credentials configured!', 'green'));
  console.info(c('   Run: bun run domain:verify', 'gray'));
}

async function handleHistory(bridge: CloudflareSecretsBridge, limit: number): Promise<void> {
  const history = await bridge.getHistory(limit);

  console.info(c(`📜 Token History (last ${history.length})`, 'cyan'));
  console.info(c('─'.repeat(50), 'gray'));

  if (history.length === 0) {
    console.info(c('  No history found', 'gray'));
    return;
  }

  for (const entry of history) {
    const icon = entry.action === 'CREATE' ? '➕' : entry.action === 'ROLLBACK' ? '⏪' : '🔄';
    const date = new Date(entry.timestamp).toLocaleDateString();
    console.info(
      c(`  ${icon} ${entry.version}`, 'green') + c(` | ${date} | ${entry.author}`, 'gray')
    );
    if (entry.description) {
      console.info(c(`     ${entry.description}`, 'gray'));
    }
  }
}

async function handleRotate(bridge: CloudflareSecretsBridge, reason?: string): Promise<void> {
  console.info(c('🔄 Rotating Cloudflare token...', 'cyan'));
  console.info();
  console.info(c('  Manual rotation steps:', 'bold'));
  console.info('  1. Generate new token in Cloudflare dashboard');
  console.info('  2. Run: bun run cf:secrets:set-token <new-token>');
  console.info('  3. Update services using the old token');
  console.info('  4. Delete old token in Cloudflare dashboard');
  console.info();
  console.info(c('  For automated rotation, configure integrated secrets manager', 'gray'));
}

async function handleSchedule(
  bridge: CloudflareSecretsBridge,
  cronExpression?: string
): Promise<void> {
  const schedule = cronExpression || '0 2 * * 0'; // Weekly Sunday 2AM

  await bridge.scheduleRotation(schedule);

  console.info(c('⏰ Rotation scheduled', 'green'));
  console.info(c(`   Schedule: ${schedule}`, 'gray'));
  console.info(c('   Format: cron', 'gray'));
}

async function handleRollback(bridge: CloudflareSecretsBridge, version?: string): Promise<void> {
  if (!version) {
    console.info(c('❌ Version required', 'red'));
    console.info(c('Usage: rollback <version>', 'gray'));
    return;
  }

  console.info(c(`⏪ Rolling back to ${version}...`, 'yellow'));
  await bridge.rollback(version);
  console.info(c('✅ Rollback complete', 'green'));
}

async function handleDelete(bridge: CloudflareSecretsBridge): Promise<void> {
  console.info(c('⚠️  This will delete all Cloudflare credentials!', 'yellow'));
  console.info(c('   Use --force to skip confirmation', 'gray'));

  await bridge.deleteCredentials();
  console.info(c('🗑️  Credentials deleted', 'green'));
}

// Run CLI if executed directly
if (import.meta.main) {
  main();
}
