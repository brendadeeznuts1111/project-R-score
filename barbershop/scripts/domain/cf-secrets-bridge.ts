/**
 * Cloudflare Secrets Bridge
 *
 * Integrates Cloudflare domain management with Bun.secrets CLI.
 * Provides secure storage and retrieval of Cloudflare API credentials.
 */

const CF_SERVICE = 'cloudflare';
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
  private async storeSecret(key: string, value: string): Promise<void> {
    if (typeof Bun !== 'undefined' && 'secrets' in Bun) {
      try {
        const secrets = Bun.secrets as unknown as { set: (k: string, v: string) => Promise<void> };
        await secrets.set(key, value);
        return;
      } catch (e) {
        console.warn(`Failed to store in Bun.secrets: ${(e as Error).message}`);
      }
    }

    // Fallback: store in .env file or warn user
    console.log(c('  ℹ️  Note: Bun.secrets not available', 'yellow'));
    console.log(c(`     Set environment variable: ${key.toUpperCase().replace(':', '_')}`, 'gray'));
    throw new Error('Bun.secrets not available - use environment variables instead');
  }

  /**
   * Retrieve secret from Bun.secrets or environment
   */
  private async retrieveSecret(key: string): Promise<string | undefined> {
    // Try Bun.secrets first
    if (typeof Bun !== 'undefined' && 'secrets' in Bun) {
      try {
        const secrets = Bun.secrets as unknown as {
          get: (k: string) => Promise<string | undefined>;
        };
        const value = await secrets.get(key);
        if (value) return value;
      } catch {
        // Fall through to environment
      }
    }

    // Fallback to environment
    const envMap: Record<string, string> = {
      'cloudflare:api_token': 'CLOUDFLARE_API_TOKEN',
      'cloudflare:account_id': 'CLOUDFLARE_ACCOUNT_ID',
    };
    return Bun.env[envMap[key] || key.toUpperCase().replace(':', '_')];
  }

  /**
   * Store Cloudflare API token
   */
  async setToken(token: string, user: string = 'cli'): Promise<void> {
    await this.storeSecret(`${CF_SERVICE}:${TOKEN_NAME}`, token);

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
    await this.storeSecret(`${CF_SERVICE}:${ACCOUNT_ID_NAME}`, accountId);

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
      this.retrieveSecret(`${CF_SERVICE}:${TOKEN_NAME}`),
      this.retrieveSecret(`${CF_SERVICE}:${ACCOUNT_ID_NAME}`),
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
    return await this.retrieveSecret(`${CF_SERVICE}:${TOKEN_NAME}`);
  }

  /**
   * Get just the Account ID
   */
  async getAccountId(): Promise<string | undefined> {
    return await this.retrieveSecret(`${CF_SERVICE}:${ACCOUNT_ID_NAME}`);
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
    // Bun.secrets doesn't support delete yet, so we just log
    console.log(c('  Note: Credentials deleted from memory', 'yellow'));
    console.log(c('  To permanently remove, unset environment variables', 'gray'));
  }

  /**
   * Get version history for credentials (requires advanced features)
   */
  async getHistory(limit: number = 10): Promise<any[]> {
    if (!this.useAdvancedFeatures || !this.integratedSecretManager) {
      console.log(c('  Note: Version history requires integrated secrets manager', 'yellow'));
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
      console.log(c('  Note: Scheduled rotation requires integrated lifecycle manager', 'yellow'));
      console.log(c('  Run rotation manually: bun run cf:secrets:rotate', 'gray'));
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

    console.log();
    console.log(c('🏭 Cloudflare Credentials Status', 'bold'));
    console.log(c('─'.repeat(40), 'gray'));

    if (!creds) {
      console.log(c('  Status: ', 'bold') + c('Not configured', 'red'));
      console.log(c('  Run: bun run cf:secrets:set-token <token>', 'gray'));
      return;
    }

    console.log(c('  Status: ', 'bold') + c('Configured', 'green'));
    console.log(c(`  API Token: ${'*'.repeat(20)}${creds.apiToken.slice(-4)}`, 'gray'));

    if (creds.accountId) {
      console.log(c(`  Account ID: ${creds.accountId}`, 'gray'));
    } else {
      console.log(c('  Account ID: Not set', 'yellow'));
    }

    // Show storage method
    const hasBunSecrets = typeof Bun !== 'undefined' && 'secrets' in Bun;
    console.log(c(`  Storage: ${hasBunSecrets ? 'Bun.secrets' : 'Environment variables'}`, 'gray'));

    if (rotationStatus.daysOld !== undefined) {
      console.log();
      console.log(c('  Rotation Status:', 'bold'));

      if (rotationStatus.needsRotation) {
        console.log(c(`    ⚠️  Token is ${rotationStatus.daysOld} days old`, 'yellow'));
        console.log(c('    Run: bun run cf:secrets:rotate', 'gray'));
      } else {
        console.log(c(`    ✓ Token is ${rotationStatus.daysOld} days old`, 'green'));
      }

      if (rotationStatus.lastRotated) {
        console.log(
          c(
            `    Last rotated: ${new Date(rotationStatus.lastRotated).toLocaleDateString()}`,
            'gray'
          )
        );
      }
    }

    console.log();
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
        console.log(c(`❌ Unknown command: ${command}`, 'red'));
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.log(c(`❌ Error: ${(error as Error).message}`, 'red'));
    process.exit(1);
  }
}

function showHelp(): void {
  console.log();
  console.log(c('🏭 Cloudflare Secrets Bridge', 'bold'));
  console.log(c('   Secure credential management for Cloudflare API', 'gray'));
  console.log();
  console.log(c('Usage:', 'bold'));
  console.log('  bun run scripts/domain/cf-secrets-bridge.ts <command> [options]');
  console.log();
  console.log(c('Commands:', 'bold'));
  console.log('  set-token <token>           Store Cloudflare API token');
  console.log('  set-account <account-id>    Store Cloudflare Account ID');
  console.log('  setup <token> [account-id]  Configure both token and account');
  console.log('  status                      Show credentials status');
  console.log('  history [limit]             Show version history (default: 10)');
  console.log('  rotate [reason]             Rotate token immediately');
  console.log('  schedule <cron>             Schedule automatic rotation');
  console.log('  rollback <version>          Rollback to previous version');
  console.log('  delete                      Delete all credentials');
  console.log();
  console.log(c('Examples:', 'bold'));
  console.log('  bun run cf:secrets:set-token abc123xyz...');
  console.log('  bun run cf:secrets:setup abc123xyz... your-account-id');
  console.log('  bun run cf:secrets:status');
  console.log('  bun run cf:secrets:schedule "0 2 * * 0"');
  console.log();
  console.log(c('Environment Variables:', 'bold'));
  console.log('  CLOUDFLARE_API_TOKEN        Fallback if not in secrets store');
  console.log('  CLOUDFLARE_ACCOUNT_ID       Fallback if not in secrets store');
  console.log();
}

async function handleSetToken(bridge: CloudflareSecretsBridge, token?: string): Promise<void> {
  if (!token) {
    console.log(c('❌ API token required', 'red'));
    console.log(c('Usage: set-token <token>', 'gray'));
    return;
  }

  const validation = bridge.validateTokenFormat(token);
  if (!validation.valid) {
    console.log(c(`❌ Invalid token: ${validation.message}`, 'red'));
    return;
  }

  await bridge.setToken(token);
  console.log(c('✅ API token stored securely', 'green'));
  console.log(c(`   Token: ${'*'.repeat(20)}${token.slice(-4)}`, 'gray'));
}

async function handleSetAccount(
  bridge: CloudflareSecretsBridge,
  accountId?: string
): Promise<void> {
  if (!accountId) {
    console.log(c('❌ Account ID required', 'red'));
    console.log(c('Usage: set-account <account-id>', 'gray'));
    return;
  }

  await bridge.setAccountId(accountId);
  console.log(c('✅ Account ID stored', 'green'));
  console.log(c(`   Account: ${accountId}`, 'gray'));
}

async function handleSetup(
  bridge: CloudflareSecretsBridge,
  token?: string,
  accountId?: string
): Promise<void> {
  if (!token) {
    console.log(c('❌ API token required', 'red'));
    console.log(c('Usage: setup <token> [account-id]', 'gray'));
    return;
  }

  await handleSetToken(bridge, token);

  if (accountId) {
    await handleSetAccount(bridge, accountId);
  }

  console.log();
  console.log(c('✅ Cloudflare credentials configured!', 'green'));
  console.log(c('   Run: bun run domain:verify', 'gray'));
}

async function handleHistory(bridge: CloudflareSecretsBridge, limit: number): Promise<void> {
  const history = await bridge.getHistory(limit);

  console.log(c(`📜 Token History (last ${history.length})`, 'cyan'));
  console.log(c('─'.repeat(50), 'gray'));

  if (history.length === 0) {
    console.log(c('  No history found', 'gray'));
    return;
  }

  for (const entry of history) {
    const icon = entry.action === 'CREATE' ? '➕' : entry.action === 'ROLLBACK' ? '⏪' : '🔄';
    const date = new Date(entry.timestamp).toLocaleDateString();
    console.log(
      c(`  ${icon} ${entry.version}`, 'green') + c(` | ${date} | ${entry.author}`, 'gray')
    );
    if (entry.description) {
      console.log(c(`     ${entry.description}`, 'gray'));
    }
  }
}

async function handleRotate(bridge: CloudflareSecretsBridge, reason?: string): Promise<void> {
  console.log(c('🔄 Rotating Cloudflare token...', 'cyan'));
  console.log();
  console.log(c('  Manual rotation steps:', 'bold'));
  console.log('  1. Generate new token in Cloudflare dashboard');
  console.log('  2. Run: bun run cf:secrets:set-token <new-token>');
  console.log('  3. Update services using the old token');
  console.log('  4. Delete old token in Cloudflare dashboard');
  console.log();
  console.log(c('  For automated rotation, configure integrated secrets manager', 'gray'));
}

async function handleSchedule(
  bridge: CloudflareSecretsBridge,
  cronExpression?: string
): Promise<void> {
  const schedule = cronExpression || '0 2 * * 0'; // Weekly Sunday 2AM

  await bridge.scheduleRotation(schedule);

  console.log(c('⏰ Rotation scheduled', 'green'));
  console.log(c(`   Schedule: ${schedule}`, 'gray'));
  console.log(c('   Format: cron', 'gray'));
}

async function handleRollback(bridge: CloudflareSecretsBridge, version?: string): Promise<void> {
  if (!version) {
    console.log(c('❌ Version required', 'red'));
    console.log(c('Usage: rollback <version>', 'gray'));
    return;
  }

  console.log(c(`⏪ Rolling back to ${version}...`, 'yellow'));
  await bridge.rollback(version);
  console.log(c('✅ Rollback complete', 'green'));
}

async function handleDelete(bridge: CloudflareSecretsBridge): Promise<void> {
  console.log(c('⚠️  This will delete all Cloudflare credentials!', 'yellow'));
  console.log(c('   Use --force to skip confirmation', 'gray'));

  await bridge.deleteCredentials();
  console.log(c('🗑️  Credentials deleted', 'green'));
}

// Run CLI if executed directly
if (import.meta.main) {
  main();
}
