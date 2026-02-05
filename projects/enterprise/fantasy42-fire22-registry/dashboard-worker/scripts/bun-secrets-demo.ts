#!/usr/bin/env bun

/**
 * 🔐 Fire22 Bun.secrets Security Demo
 *
 * Demonstrates native credential management using Bun.secrets API
 * Integrates with existing Fire22 dashboard environment management
 */

import { secrets } from 'bun';

interface Fire22Credentials {
  service: string;
  name: string;
  value: string;
  description?: string;
}

class Fire22SecureCredentialManager {
  private readonly serviceName = 'fire22-dashboard';

  /**
   * Store Fire22 API credentials securely in OS keychain
   */
  async storeCredential(name: string, value: string, description?: string): Promise<boolean> {
    try {
      console.log(`🔐 Storing credential: ${name}`);
      console.log(`📝 Description: ${description || 'Fire22 credential'}`);

      await secrets.set({
        service: this.serviceName,
        name: name,
        value: value,
      });

      console.log(`✅ Successfully stored ${name} in OS keychain`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to store ${name}:`, error);
      return false;
    }
  }

  /**
   * Retrieve credentials from OS keychain
   */
  async getCredential(name: string): Promise<string | null> {
    try {
      console.log(`🔍 Retrieving credential: ${name}`);

      const value = await secrets.get({
        service: this.serviceName,
        name: name,
      });

      if (value) {
        console.log(`✅ Retrieved ${name} from keychain`);
        // Show masked version for demo
        const masked = value.substring(0, 8) + '...' + value.substring(value.length - 4);
        console.log(`📋 Value: ${masked}`);
        return value;
      } else {
        console.log(`⚠️  Credential ${name} not found in keychain`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Failed to retrieve ${name}:`, error);
      return null;
    }
  }

  /**
   * Delete credentials from keychain
   */
  async deleteCredential(name: string): Promise<boolean> {
    try {
      console.log(`🗑️  Deleting credential: ${name}`);

      await secrets.delete({
        service: this.serviceName,
        name: name,
      });

      console.log(`✅ Successfully deleted ${name} from keychain`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete ${name}:`, error);
      return false;
    }
  }

  /**
   * Demo: Setup Fire22 dashboard credentials
   */
  async demoFireCredentialSetup(): Promise<void> {
    console.log('\n🚀 Fire22 Dashboard Credential Setup Demo\n');

    const credentials: Fire22Credentials[] = [
      {
        service: this.serviceName,
        name: 'database_url',
        value: 'postgresql://fire22_user:secure_pass_12345@localhost:5432/fire22_dashboard',
        description: 'PostgreSQL connection string for Fire22 dashboard',
      },
      {
        service: this.serviceName,
        name: 'fire22_api_token',
        value: 'f22_live_api_aB3dE5fG7hI9jK1lM2nO4pQ6rS8tU0vW',
        description: 'Fire22 API authentication token',
      },
      {
        service: this.serviceName,
        name: 'telegram_bot_token',
        value: '6789012345:AAHdqTcvbXYQjQ9K2L3M4N5O6P7Q8R9S0T',
        description: 'Telegram bot token for Fire22 notifications',
      },
      {
        service: this.serviceName,
        name: 'cloudflare_api_token',
        value: 'cf_token_1A2b3C4d5E6f7G8h9I0j1K2l3M4n5O6p7Q8r',
        description: 'Cloudflare Workers API token for deployment',
      },
    ];

    // Store all credentials
    console.log('📥 Storing Fire22 credentials in OS keychain...\n');
    for (const cred of credentials) {
      await this.storeCredential(cred.name, cred.value, cred.description);
      console.log(''); // spacing
    }

    // Simulate retrieval during app startup
    console.log('🔄 Simulating app startup - retrieving credentials...\n');
    const dbUrl = await this.getCredential('database_url');
    const apiToken = await this.getCredential('fire22_api_token');

    // Demo environment variable replacement
    if (dbUrl && apiToken) {
      console.log('\n✅ Fire22 Dashboard Ready!');
      console.log('🔗 Database connection: SECURE (retrieved from keychain)');
      console.log('🔑 API authentication: SECURE (retrieved from keychain)');
      console.log('🚫 No plaintext credentials in .env files!');
    }
  }

  /**
   * Demo: Migration from .env to Bun.secrets
   */
  async demoEnvMigration(): Promise<void> {
    console.log('\n📋 .env Migration Demo\n');

    // Simulate reading from .env file
    const envCredentials = new Map([
      ['DATABASE_URL', 'postgresql://...'],
      ['FIRE22_API_TOKEN', 'f22_live_api_...'],
      ['TELEGRAM_BOT_TOKEN', '6789012345:AAH...'],
      ['CLOUDFLARE_API_TOKEN', 'cf_token_1A2b3C4d...'],
    ]);

    console.log('📁 Found .env file with sensitive credentials:');
    for (const [key, value] of envCredentials) {
      console.log(`   ${key}=${value.substring(0, 15)}...`);
    }

    console.log('\n🔄 Migrating to Bun.secrets...');

    // Migrate each credential
    for (const [envKey, envValue] of envCredentials) {
      const secretName = envKey.toLowerCase();
      await this.storeCredential(secretName, envValue, `Migrated from ${envKey}`);
    }

    console.log('\n✅ Migration complete!');
    console.log('💡 Next steps:');
    console.log('   1. Update your app to use Bun.secrets');
    console.log('   2. Remove credentials from .env file');
    console.log('   3. Add .env to .gitignore if not already');
  }

  /**
   * Demo: Cross-platform keychain info
   */
  displayKeychainInfo(): void {
    console.log('\n🌐 Cross-Platform Keychain Integration\n');

    const platform = process.platform;
    console.log(`🖥️  Platform: ${platform}`);

    switch (platform) {
      case 'darwin':
        console.log('🔐 Using: macOS Keychain Services');
        console.log('📍 Location: Keychain Access app');
        console.log('🔍 Search: "fire22-dashboard" in Keychain Access');
        break;
      case 'linux':
        console.log('🔐 Using: libsecret (GNOME Keyring/KWallet)');
        console.log('📍 Location: GNOME Keyring or KDE KWallet');
        console.log('🔍 Access: seahorse (GNOME) or kwalletmanager (KDE)');
        break;
      case 'win32':
        console.log('🔐 Using: Windows Credential Manager');
        console.log('📍 Location: Control Panel > Credential Manager');
        console.log('🔍 Search: Windows Credentials > Generic Credentials');
        break;
      default:
        console.log('🔐 Using: OS-specific credential storage');
    }

    console.log('\n🛡️  Security Benefits:');
    console.log('   • Encrypted at rest by operating system');
    console.log('   • No plaintext secrets in code or config files');
    console.log('   • Integrated with OS security policies');
    console.log('   • Protected by user authentication');
  }

  /**
   * Demo: Performance comparison
   */
  async performanceDemo(): Promise<void> {
    console.log('\n⚡ Performance Comparison Demo\n');

    // Setup credential for testing
    await this.storeCredential(
      'perf_test',
      'test_value_for_performance_comparison',
      'Performance test credential'
    );

    const iterations = 100;

    // Test Bun.secrets performance
    console.log(`🔍 Testing Bun.secrets retrieval (${iterations} iterations)...`);
    const start = Bun.nanoseconds();

    for (let i = 0; i < iterations; i++) {
      await this.getCredential('perf_test');
    }

    const end = Bun.nanoseconds();
    const duration = (end - start) / 1_000_000; // Convert to milliseconds
    const avgPerRetrieval = duration / iterations;

    console.log(`⏱️  Total time: ${duration.toFixed(2)}ms`);
    console.log(`📊 Average per retrieval: ${avgPerRetrieval.toFixed(3)}ms`);
    console.log(`🚀 Performance: Excellent for production use`);

    // Cleanup
    await this.deleteCredential('perf_test');
  }
}

// Demo execution
async function runDemo(): Promise<void> {
  console.log('🔥 Fire22 Dashboard - Bun.secrets Security Demo');
  console.log('='.repeat(50));

  const credManager = new Fire22SecureCredentialManager();

  // Check if Bun.secrets is available
  try {
    await secrets.get({ service: 'test', name: 'test' });
    console.log('✅ Bun.secrets API is available and functional\n');
  } catch (error) {
    console.log("❌ Bun.secrets not available. Ensure you're using Bun >= 1.2.20\n");
    return;
  }

  // Run all demos
  await credManager.demoFireCredentialSetup();
  await credManager.demoEnvMigration();
  credManager.displayKeychainInfo();
  await credManager.performanceDemo();

  console.log('\n🎉 Demo Complete!');
  console.log('\n💡 Integration with Fire22 Dashboard:');
  console.log('   • Replace DATABASE_URL in .env with Bun.secrets');
  console.log('   • Secure Fire22 API tokens in OS keychain');
  console.log('   • Integrate with existing env-manager.ts');
  console.log('   • Add to workspace-orchestrator.ts for multi-env management');
}

// Run if called directly
if (import.meta.main) {
  await runDemo();
}

export { Fire22SecureCredentialManager };
