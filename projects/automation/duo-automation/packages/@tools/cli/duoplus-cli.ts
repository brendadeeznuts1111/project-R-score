#!/usr/bin/env bun
// cli/duoplus-cli.ts

import { DuoPlusSDK } from '../duoplus/sdk.js';
import { TikTokMatrixAutomation } from '../examples/tiktok-matrix-automation.js';
import { AgentConfig } from '../duoplus/config.js';
import { BunSecretManager } from '../duoplus/bun-native/secret-manager.js';

class DuoPlusCLI {
  private sdk: DuoPlusSDK;
  private secretManager: BunSecretManager;

  constructor(apiKey: string) {
    this.sdk = new DuoPlusSDK(apiKey);
    this.secretManager = new BunSecretManager({
      algorithm: 'argon2id',
      useSystemKeychain: true,
      serviceName: 'com.duoplus.cli'
    });
  }

  async deployMatrix(args: string[]): Promise<void> {
    const platform = this.getArgValue(args, '--platform=') || 'tiktok';
    const count = parseInt(this.getArgValue(args, '--count=') || '10');
    const warmingDays = parseInt(this.getArgValue(args, '--warmup-days=') || '7');
    const proxyPassword = this.getArgValue(args, '--proxy-password=') || 'default_pass';
    const teamId = this.getArgValue(args, '--team-id=');

    console.log(`🚀 Deploying ${count} ${platform} agents...`);
    console.log(`   Warming period: ${warmingDays} days`);
    console.log(`   Team ID: ${teamId || 'default'}`);

    try {
      // Test connection first
      const connection = await this.sdk.testConnection();
      if (!connection.success) {
        console.error('❌ Failed to connect to DuoPlus API');
        process.exit(1);
      }

      const automation = new TikTokMatrixAutomation(this.sdk);
      
      const config = {
        accountCount: count,
        contentStrategy: 'unique' as const,
        warmingDays,  
        proxyConfig: {
          provider: 'residential-proxy',
          username: 'cli_user',
          password: proxyPassword
        },
        teamId
      };

      const matrix = await automation.setupAccountMatrix(config);
      
      console.log('✅ Matrix deployment complete!');
      console.log(`   📱 ${matrix.phones.length} Cloud Phones`);
      console.log(`   📞 ${matrix.numbers.length} Cloud Numbers`);
      console.log(`   🔥 ${matrix.warmingTasks.length} Warming Tasks`);

    } catch (error) {
      console.error('❌ Deployment failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  async health(args: string[]): Promise<void> {
    const teamId = this.getArgValue(args, '--team-id=');
    const format = this.getArgValue(args, '--format=') || 'table';

    try {
      const stats = await this.sdk.team.getTeamStats();
      const usage = await this.sdk.getUsageStats('month');

      if (format === 'json') {
        console.log(JSON.stringify({ teamStats: stats, usage }, null, 2));
      } else {
        console.log('📊 DuoPlus Team Health Report');
        console.log('==============================');
        console.log(`👥 Members: ${stats.activeMembers}/${stats.totalMembers} active`);
        console.log(`📱 Phones: ${stats.assignedPhones}/${stats.totalPhones} assigned`);
        console.log(`🔥 Workflows: ${stats.activeWorkflows} running`);
        console.log(`💰 Monthly Cost: $${stats.monthlyCost}`);
        console.log('');
        console.log('📈 Usage Statistics (Last 30 Days):');
        console.log(`   Phones: ${usage.phones.active}/${usage.phones.total} active`);
        console.log(`   RPA Tasks: ${usage.rpa.tasksCompleted}/${usage.rpa.tasksCreated} completed`);
        console.log(`   Success Rate: ${Math.round(usage.rpa.successRate * 100)}%`);
      }
    } catch (error) {
      console.error('❌ Health check failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  async distribute(args: string[]): Promise<void> {
    const filePath = this.getArgValue(args, '--file=');
    const teamId = this.getArgValue(args, '--team-id=');
    const uniquePerDevice = args.includes('--unique-per-device');

    if (!filePath) {
      console.error('❌ --file parameter is required');
      process.exit(1);
    }

    try {
      console.log(`📤 Distributing file: ${filePath}`);
      
      // Read file
      const file = Bun.file(filePath);
      const buffer = await file.arrayBuffer();
      const filename = filePath.split('/').pop() || 'content.bin';

      // Upload to cloud drive
      const fileId = await this.sdk.batch.uploadToCloudDrive(
        Buffer.from(buffer),
        filename,
        {
          description: `Content distribution via CLI`,
          tags: ['cli', 'distribution'],
          category: 'user-content'
        }
      );

      // Get team phones
      const phones = await this.sdk.phones.listPhones({ teamId });
      const phoneIds = phones.map(p => p.id);

      console.log(`📱 Found ${phoneIds.length} phones in team`);

      // Distribute to phones
      const batchResult = await this.sdk.batch.batchPushFiles({
        fileId,
        phoneIds,
        distribution: uniquePerDevice ? 'unique' : 'uniform',
        destinationPath: '/sdcard/Download/'
      });

      console.log('✅ File distribution complete!');
      console.log(`   File ID: ${fileId}`);
      console.log(`   Phones: ${batchResult.succeeded}/${batchResult.total} successful`);
      
      if (batchResult.failed > 0) {
        console.log(`   Failed: ${batchResult.failed} phones`);
      }

    } catch (error) {
      console.error('❌ Distribution failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  async getCodes(args: string[]): Promise<void> {
    const service = this.getArgValue(args, '--service=') || 'tiktok';
    const teamId = this.getArgValue(args, '--team-id=');
    const outputFile = this.getArgValue(args, '--output=');

    try {
      console.log(`📱 Getting verification codes for ${service}...`);

      // Get team phones and numbers
      const phones = await this.sdk.phones.listPhones({ teamId });
      const phoneNumbers: string[] = [];

      for (const phone of phones) {
        // Get numbers bound to this phone
        const numbers = await this.sdk.phones.listPhones({ teamId });
        // This would need a proper API call to get bound numbers
        // For now, we'll use a placeholder
        phoneNumbers.push(`+1${Math.random().toString().substring(2, 11)}`);
      }

      const results = await this.sdk.getVerificationCodes(phoneNumbers, service);
      const validCodes = results.filter(r => r.code !== null);

      console.log(`✅ Found ${validCodes.length} verification codes`);

      if (outputFile) {
        await Bun.write(outputFile, JSON.stringify(results, null, 2));
        console.log(`📁 Results saved to: ${outputFile}`);
      } else {
        console.log('📋 Verification Codes:');
        validCodes.forEach(result => {
          console.log(`   ${result.phoneNumber}: ${result.code}`);
        });
      }

    } catch (error) {
      console.error('❌ Failed to get codes:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  async renew(args: string[]): Promise<void> {
    const daysUntilExpiry = parseInt(this.getArgValue(args, '--days-until-expiry=') || '7');
    const teamId = this.getArgValue(args, '--team-id=');
    const autoRenew = args.includes('--auto-renew');

    try {
      console.log(`🔄 Renewing phones expiring within ${daysUntilExpiry} days...`);

      const result = await this.sdk.bulkRenewExpiringPhones(daysUntilExpiry);

      console.log('✅ Renewal complete!');
      console.log(`   Renewed: ${result.renewed} phones`);
      console.log(`   Failed: ${result.failed} phones`);
      console.log(`   Total: ${result.total} phones`);

      if (result.failed > 0) {
        console.log('⚠️  Some phones failed to renew. Check the dashboard for details.');
      }

    } catch (error) {
      console.error('❌ Renewal failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  async status(args: string[]): Promise<void> {
    try {
      console.log('🔍 DuoPlus System Status');
      console.log('=========================');

      // Test API connection
      const connection = await this.sdk.testConnection();
      console.log(`API Connection: ${connection.success ? '✅ Connected' : '❌ Failed'}`);
      
      if (connection.success) {
        console.log(`Account: ${connection.accountInfo.email}`);
        console.log(`Plan: ${connection.accountInfo.plan}`);
        console.log(`Credits: ${connection.accountInfo.credits}`);
      }

      // System status
      const systemStatus = await this.sdk.getSystemStatus();
      console.log(`System Status: ${systemStatus.status}`);
      
      console.log('');
      console.log('Services:');
      Object.entries(systemStatus.services).forEach(([service, status]) => {
        const icon = status === 'operational' ? '✅' : '⚠️';
        console.log(`   ${icon} ${service}: ${status}`);
      });

      // Check system keychain status
      console.log('');
      console.log('🔐 Security Status:');
      const keychainInfo = await this.secretManager.getSystemKeychainInfo();
      console.log(`   System Keychain: ${keychainInfo.available ? '✅ Available' : '❌ Unavailable'}`);
      console.log(`   Service Name: ${keychainInfo.serviceName}`);
      console.log(`   Platform: ${keychainInfo.platform}`);

      if (systemStatus.announcements.length > 0) {
        console.log('');
        console.log('Announcements:');
        systemStatus.announcements.forEach(ann => {
          const icon = ann.severity === 'critical' ? '🚨' : ann.severity === 'warning' ? '⚠️' : 'ℹ️';
          console.log(`   ${icon} ${ann.title}: ${ann.message}`);
        });
      }

    } catch (error) {
      console.error('❌ Status check failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  /**
   * Store API key securely in system keychain
   */
  async storeApiKey(args: string[]): Promise<void> {
    const apiKey = this.getArgValue(args, '--api-key=');
    const teamId = this.getArgValue(args, '--team-id=');

    if (!apiKey) {
      console.error('❌ --api-key parameter is required');
      process.exit(1);
    }

    try {
      const stored = await this.secretManager.storeApiKeySecurely(apiKey, teamId);
      if (stored) {
        console.log('✅ API key stored securely in system keychain');
        if (teamId) {
          console.log(`   Team ID: ${teamId}`);
        }
      } else {
        console.error('❌ Failed to store API key');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Failed to store API key:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  /**
   * Retrieve API key from system keychain
   */
  async getApiKey(args: string[]): Promise<void> {
    const teamId = this.getArgValue(args, '--team-id=');
    const showKey = args.includes('--show');

    try {
      const apiKey = await this.secretManager.getApiKeySecurely(teamId);
      
      if (apiKey) {
        console.log('✅ API key retrieved from system keychain');
        if (teamId) {
          console.log(`   Team ID: ${teamId}`);
        }
        if (showKey) {
          console.log(`   API Key: ${apiKey}`);
        } else {
          console.log('   Use --show to display the actual key');
        }
      } else {
        console.log('❌ No API key found in system keychain');
        if (teamId) {
          console.log(`   Team ID: ${teamId}`);
        }
        console.log('   Use "store-api-key" command to store one');
      }
    } catch (error) {
      console.error('❌ Failed to retrieve API key:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  /**
   * Delete API key from system keychain
   */
  async deleteApiKey(args: string[]): Promise<void> {
    const teamId = this.getArgValue(args, '--team-id=');
    const confirm = args.includes('--confirm');

    if (!confirm) {
      console.error('❌ --confirm flag required to delete API key');
      console.log('   This action cannot be undone');
      process.exit(1);
    }

    try {
      const deleted = await this.secretManager.deleteApiKeySecurely(teamId);
      
      if (deleted) {
        console.log('✅ API key deleted from system keychain');
        if (teamId) {
          console.log(`   Team ID: ${teamId}`);
        }
      } else {
        console.log('❌ No API key found to delete');
        if (teamId) {
          console.log(`   Team ID: ${teamId}`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to delete API key:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  /**
   * Store proxy credentials securely
   */
  async storeProxy(args: string[]): Promise<void> {
    const username = this.getArgValue(args, '--username=');
    const password = this.getArgValue(args, '--password=');
    const provider = this.getArgValue(args, '--provider=');

    if (!username || !password || !provider) {
      console.error('❌ --username, --password, and --provider parameters are required');
      process.exit(1);
    }

    try {
      const stored = await this.secretManager.storeProxyCredentialsSecurely(username, password, provider);
      if (stored) {
        console.log('✅ Proxy credentials stored securely in system keychain');
        console.log(`   Provider: ${provider}`);
        console.log(`   Username: ${username}`);
      } else {
        console.error('❌ Failed to store proxy credentials');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Failed to store proxy credentials:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private getArgValue(args: string[], prefix: string): string | undefined {
    const arg = args.find(arg => arg.startsWith(prefix));
    return arg ? arg.substring(prefix.length) : undefined;
  }

  showHelp(): void {
    console.log(`
🤖 DuoPlus CLI - Cloud Phone Automation Tool

Usage: bun run duoplus-cli.ts <command> [options]

Commands:
  deploy-matrix    Deploy agent matrix for social platforms
  health          Show team and system health status
  distribute      Distribute files to all phones
  get-codes       Get verification codes for accounts
  renew           Renew expiring phone subscriptions
  status          Show DuoPlus system status
  auto            Matrix automation suite (signup, provision, configure, etc.)
  
  🔐 Secure Credential Management:
  store-api-key   Store API key securely in system keychain
  get-api-key     Retrieve API key from system keychain
  delete-api-key  Delete API key from system keychain
  store-proxy     Store proxy credentials securely

Options:
  --platform=<tiktok|reddit|instagram>   Platform for matrix deployment
  --count=<number>                        Number of agents to deploy
  --warmup-days=<number>                  Account warming period
  --proxy-password=<password>             Proxy authentication
  --team-id=<id>                         Team ID for operations
  --file=<path>                          File path for distribution
  --unique-per-device                     Distribute unique content per device
  --service=<service>                     Service for verification codes
  --output=<path>                         Output file for results
  --days-until-expiry=<number>            Renew phones expiring within X days
  --auto-renew                            Enable auto-renewal
  --format=<table|json>                   Output format for health command

  🔐 Secure Credential Options:
  --api-key=<key>                        API key to store (for store-api-key)
  --username=<user>                      Proxy username (for store-proxy)
  --password=<pass>                      Proxy password (for store-proxy)
  --provider=<name>                      Proxy provider name (for store-proxy)
  --show                                  Show actual API key (for get-api-key)
  --confirm                               Confirm deletion (for delete-api-key)

Examples:
  # Store API key securely
  bun run duoplus-cli.ts store-api-key --api-key=duoplus_live_12345 --team-id=TEAM_001
  
  # Retrieve API key (without showing it)
  bun run duoplus-cli.ts get-api-key --team-id=TEAM_001
  
  # Show API key
  bun run duoplus-cli.ts get-api-key --team-id=TEAM_001 --show
  
  # Delete API key
  bun run duoplus-cli.ts delete-api-key --team-id=TEAM_001 --confirm
  
  # Store proxy credentials
  bun run duoplus-cli.ts store-proxy \\
    --username=proxy_user --password=proxy_pass --provider=residential-proxy

  # Deploy 100 TikTok agents
  bun run duoplus-cli.ts deploy-matrix \\
    --platform=tiktok --count=100 --warmup-days=7 \\
    --proxy-password=$PROXY_PASS --team-id=TEAM_001

  # Check system status (includes security info)
  bun run duoplus-cli.ts status

  # Check team health
  bun run duoplus-cli.ts health --team-id=TEAM_001 --format=json

  # Distribute content to all agents
  bun run duoplus-cli.ts distribute \\
    --file=/content/viral_video.mp4 --team-id=TEAM_001 --unique-per-device

  # Get verification codes
  bun run duoplus-cli.ts get-codes \\
    --service=tiktok --team-id=TEAM_001 --output=./codes.json

  # Renew expiring phones
  bun run duoplus-cli.ts renew \\
    --days-until-expiry=7 --team-id=TEAM_001 --auto-renew

  # System status
  bun run duoplus-cli.ts status
`);
  }
}

// Main CLI handler
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    const cli = new DuoPlusCLI('dummy-key');
    cli.showHelp();
    return;
  }

  // Handle automation commands (duoplus auto ...)
  if (command === 'auto') {
    const { automationCLI } = await import('../../../infrastructure/automation/cli.js');
    await automationCLI(args.slice(1));
    return;
  }

  const apiKey = process.env.DUOPLUS_API_KEY;
  if (!apiKey) {
    console.error('❌ DUOPLUS_API_KEY environment variable is required');
    process.exit(1);
  }

  const cli = new DuoPlusCLI(apiKey);

  try {
    switch (command) {
      case 'deploy-matrix':
        await cli.deployMatrix(args.slice(1));
        break;
      case 'health':
        await cli.health(args.slice(1));
        break;
      case 'distribute':
        await cli.distribute(args.slice(1));
        break;
      case 'get-codes':
        await cli.getCodes(args.slice(1));
        break;
      case 'renew':
        await cli.renew(args.slice(1));
        break;
      case 'status':
        await cli.status(args.slice(1));
        break;
      case 'store-api-key':
        await cli.storeApiKey(args.slice(1));
        break;
      case 'get-api-key':
        await cli.getApiKey(args.slice(1));
        break;
      case 'delete-api-key':
        await cli.deleteApiKey(args.slice(1));
        break;
      case 'store-proxy':
        await cli.storeProxy(args.slice(1));
        break;
      default:
        console.error(`❌ Unknown command: ${command}`);
        cli.showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Command failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}
