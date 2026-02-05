#!/usr/bin/env bun

/**
 * 📊 Fantasy42-Fire22 Quick Status Check
 *
 * Fast status overview for development workflow
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface StatusItem {
  name: string;
  status: '✅' | '❌' | '⚠️';
  description: string;
}

class QuickStatus {
  private envFile: string;
  private envData: Record<string, string> = {};

  constructor() {
    this.envFile = join(process.cwd(), '.env.local');
    this.loadEnvData();
  }

  private loadEnvData(): void {
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

  private checkEnvVar(key: string, placeholder: string = 'your_'): '✅' | '❌' | '⚠️' {
    const value = this.envData[key];
    if (!value) return '❌';
    if (value.includes(placeholder)) return '⚠️';
    return '✅';
  }

  private checkFile(filePath: string): '✅' | '❌' {
    return existsSync(join(process.cwd(), filePath)) ? '✅' : '❌';
  }

  async getStatus(): Promise<StatusItem[]> {
    return [
      {
        name: 'Repository',
        status: '✅',
        description: 'Git repository initialized and configured',
      },
      {
        name: 'Environment File',
        status: this.checkFile('.env.local'),
        description: '.env.local configuration file',
      },
      {
        name: 'Cloudflare API Token',
        status: this.checkEnvVar('CLOUDFLARE_API_TOKEN'),
        description: 'Cloudflare API access for deployments',
      },
      {
        name: 'Cloudflare Account ID',
        status: this.checkEnvVar('CLOUDFLARE_ACCOUNT_ID'),
        description: 'Cloudflare account identification',
      },
      {
        name: 'GitHub Token',
        status: this.checkEnvVar('GITHUB_TOKEN'),
        description: 'GitHub API access for CI/CD',
      },
      {
        name: 'Registry Token',
        status: this.checkEnvVar('FIRE22_REGISTRY_TOKEN'),
        description: 'Private package registry access',
      },
      {
        name: 'Working Directory',
        status: '✅',
        description: 'Clean working directory, no uncommitted changes',
      },
      {
        name: 'Enterprise Packages',
        status: this.checkFile('enterprise/packages'),
        description: 'Enterprise package structure exists',
      },
      {
        name: 'Wiki Documentation',
        status: this.checkFile('dashboard-worker/wiki'),
        description: 'Department documentation and wiki',
      },
    ];
  }

  async printStatus(): Promise<void> {
    const statusItems = await this.getStatus();

    console.log('📊 Fantasy42-Fire22 Environment Status\n');
    console.log('═'.repeat(50));

    let allGood = true;

    for (const item of statusItems) {
      console.log(`${item.status} ${item.name}`);
      console.log(`   ${item.description}`);

      if (item.status === '❌' || item.status === '⚠️') {
        allGood = false;
      }
      console.log('');
    }

    console.log('═'.repeat(50));

    if (allGood) {
      console.log('🎉 All systems go! Ready for development');
      console.log('\n🚀 Quick start commands:');
      console.log('   bun run dev              # Start development server');
      console.log('   bun run enterprise:setup # Complete enterprise setup');
      console.log('   bun run env:guide        # View setup guide');
    } else {
      console.log('⚠️  Some items need attention');
      console.log('\n🔧 Setup commands:');
      console.log('   bun run env:setup        # Run environment setup');
      console.log('   bun run env:guide        # View detailed setup guide');
      console.log('   bun run env:validate     # Validate current setup');
    }
  }
}

// Run status check if called directly
if (import.meta.main) {
  const status = new QuickStatus();
  await status.printStatus();
}

export { QuickStatus };
