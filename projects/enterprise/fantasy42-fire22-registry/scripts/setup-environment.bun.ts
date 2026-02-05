#!/usr/bin/env bun

/**
 * 🔥 Fantasy42-Fire22 Environment Setup Script
 *
 * This script helps set up the complete enterprise environment
 * with proper secrets management and configuration.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ENV_FILE = '.env.local';
const ENV_TEMPLATE = 'config/env.example';

interface SetupStep {
  name: string;
  description: string;
  required: boolean;
  automated: boolean;
  action: () => Promise<boolean>;
}

class EnvironmentSetup {
  private envFile: string;
  private envData: Record<string, string> = {};

  constructor() {
    this.envFile = join(process.cwd(), ENV_FILE);
    this.loadEnvFile();
  }

  private loadEnvFile(): void {
    if (existsSync(this.envFile)) {
      const content = readFileSync(this.envFile, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            this.envData[key] = valueParts.join('=');
          }
        }
      }
    }
  }

  private saveEnvFile(): void {
    let content = `# Fantasy42-Fire22 Enterprise Environment Configuration\n# Auto-generated: ${new Date().toISOString()}\n\n`;

    for (const [key, value] of Object.entries(this.envData)) {
      content += `${key}=${value}\n`;
    }

    writeFileSync(this.envFile, content);
    console.log(`✅ Updated ${ENV_FILE}`);
  }

  private async checkCloudflareSetup(): Promise<boolean> {
    const token = this.envData['CLOUDFLARE_API_TOKEN'];
    const accountId = this.envData['CLOUDFLARE_ACCOUNT_ID'];

    if (!token || token.includes('your_') || !accountId || accountId.includes('your_')) {
      console.log('❌ CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID need to be configured');
      console.log('   Get from: https://dash.cloudflare.com/profile/api-tokens');
      console.log('   Required permissions: Workers:Edit, D1:Edit, KV:Edit, R2:Edit, Queues:Edit');
      return false;
    }

    // TODO: Add API validation
    console.log('✅ Cloudflare credentials configured');
    return true;
  }

  private async checkGitHubSetup(): Promise<boolean> {
    const token = this.envData['GITHUB_TOKEN'];

    if (!token || token.includes('your_')) {
      console.log('❌ GITHUB_TOKEN needs to be configured');
      console.log('   Get from: https://github.com/settings/tokens');
      console.log('   Required scopes: repo, workflow, packages');
      return false;
    }

    console.log('✅ GitHub token configured');
    return true;
  }

  private async checkRegistrySetup(): Promise<boolean> {
    const registryToken = this.envData['FIRE22_REGISTRY_TOKEN'];

    if (!registryToken || registryToken.includes('your_')) {
      console.log('❌ FIRE22_REGISTRY_TOKEN needs to be configured');
      console.log('   Contact enterprise admin for registry access');
      return false;
    }

    console.log('✅ Registry token configured');
    return true;
  }

  private async setupDirectories(): Promise<boolean> {
    const dirs = ['.cache', '.tmp', 'logs', 'backups'];

    for (const dir of dirs) {
      const dirPath = join(process.cwd(), dir);
      if (!existsSync(dirPath)) {
        await Bun.write(join(dirPath, '.gitkeep'), '');
        console.log(`✅ Created directory: ${dir}`);
      }
    }

    return true;
  }

  private async setupDatabase(): Promise<boolean> {
    const dbPath = join(process.cwd(), 'domain-data.sqlite');

    if (!existsSync(dbPath)) {
      // Create empty SQLite database
      console.log('✅ Database setup ready (will be created on first run)');
    } else {
      console.log('✅ Database exists');
    }

    return true;
  }

  async runSetup(): Promise<void> {
    console.log('🔥 Fantasy42-Fire22 Enterprise Environment Setup\n');

    const steps: SetupStep[] = [
      {
        name: 'Directories',
        description: 'Create required directories (.cache, .tmp, logs, backups)',
        required: true,
        automated: true,
        action: () => this.setupDirectories(),
      },
      {
        name: 'Database',
        description: 'Setup local SQLite database',
        required: true,
        automated: true,
        action: () => this.setupDatabase(),
      },
      {
        name: 'Cloudflare',
        description: 'Configure Cloudflare API token and account ID',
        required: true,
        automated: false,
        action: () => this.checkCloudflareSetup(),
      },
      {
        name: 'GitHub',
        description: 'Configure GitHub token for CI/CD',
        required: true,
        automated: false,
        action: () => this.checkGitHubSetup(),
      },
      {
        name: 'Registry',
        description: 'Configure private registry access',
        required: true,
        automated: false,
        action: () => this.checkRegistrySetup(),
      },
    ];

    let allPassed = true;

    for (const step of steps) {
      console.log(`\n🔧 ${step.name}`);
      console.log(`   ${step.description}`);

      const passed = await step.action();

      if (step.required && !passed) {
        allPassed = false;
      }
    }

    console.log('\n' + '='.repeat(50));

    if (allPassed) {
      console.log('🎉 Environment setup complete!');
      console.log('🚀 Ready to run enterprise commands');
      console.log('\nNext steps:');
      console.log('1. bun run enterprise:setup');
      console.log('2. bun run wrangler:auth');
      console.log('3. bun run enterprise:verify');
    } else {
      console.log('⚠️  Some setup steps need manual configuration');
      console.log('📖 Check the output above for specific requirements');
      console.log('🔄 Run this script again after configuring missing items');
    }

    this.saveEnvFile();
  }
}

// Run setup if called directly
if (import.meta.main) {
  const setup = new EnvironmentSetup();
  await setup.runSetup();
}

export { EnvironmentSetup };
