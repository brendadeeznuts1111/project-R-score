#!/usr/bin/env bun

/**
 * 🔥 Fantasy42-Fire22 Developer Onboarding Setup Script
 *
 * This script automates the initial setup for new developers,
 * ensuring all prerequisites are met and the development environment
 * is properly configured.
 */

import { $ } from 'bun';
import { existsSync } from 'fs';
import { join } from 'path';

interface OnboardingCheck {
  name: string;
  description: string;
  check: () => Promise<boolean>;
  fix?: () => Promise<void>;
  required: boolean;
}

class OnboardingSetup {
  private checks: OnboardingCheck[] = [];
  private passedChecks: string[] = [];
  private failedChecks: string[] = [];

  constructor() {
    this.initializeChecks();
  }

  private initializeChecks() {
    this.checks = [
      {
        name: 'bun-version',
        description: 'Check Bun version (>= 1.0.0)',
        check: this.checkBunVersion.bind(this),
        required: true,
      },
      {
        name: 'node-version',
        description: 'Check Node.js version (>= 18.0.0)',
        check: this.checkNodeVersion.bind(this),
        required: true,
      },
      {
        name: 'git-version',
        description: 'Check Git version (>= 2.30.0)',
        check: this.checkGitVersion.bind(this),
        required: true,
      },
      {
        name: 'dependencies',
        description: 'Check if dependencies are installed',
        check: this.checkDependencies.bind(this),
        fix: this.installDependencies.bind(this),
        required: true,
      },
      {
        name: 'environment',
        description: 'Check environment configuration',
        check: this.checkEnvironment.bind(this),
        fix: this.setupEnvironment.bind(this),
        required: true,
      },
      {
        name: 'database',
        description: 'Check database setup',
        check: this.checkDatabase.bind(this),
        fix: this.setupDatabase.bind(this),
        required: false,
      },
      {
        name: 'github-access',
        description: 'Check GitHub repository access',
        check: this.checkGitHubAccess.bind(this),
        required: false,
      },
      {
        name: 'development-tools',
        description: 'Check development tools setup',
        check: this.checkDevelopmentTools.bind(this),
        fix: this.setupDevelopmentTools.bind(this),
        required: false,
      },
    ];
  }

  private async checkBunVersion(): Promise<boolean> {
    try {
      const result = await $`bun --version`.quiet();
      const version = result.stdout.toString().trim();
      const versionNumber = parseFloat(version);
      return versionNumber >= 1.0;
    } catch {
      return false;
    }
  }

  private async checkNodeVersion(): Promise<boolean> {
    try {
      const result = await $`node --version`.quiet();
      const version = result.stdout.toString().trim().replace('v', '');
      const majorVersion = parseInt(version.split('.')[0]);
      return majorVersion >= 18;
    } catch {
      return false;
    }
  }

  private async checkGitVersion(): Promise<boolean> {
    try {
      const result = await $`git --version`.quiet();
      const version = result.stdout.toString().trim().split(' ')[2];
      const majorVersion = parseInt(version.split('.')[0]);
      const minorVersion = parseInt(version.split('.')[1]);
      return majorVersion > 2 || (majorVersion === 2 && minorVersion >= 30);
    } catch {
      return false;
    }
  }

  private async checkDependencies(): Promise<boolean> {
    return existsSync('node_modules') && existsSync('bun.lock');
  }

  private async installDependencies(): Promise<void> {
    console.log('📦 Installing dependencies...');
    await $`bun install`;
  }

  private async checkEnvironment(): Promise<boolean> {
    const envFiles = ['.env.local', '.env'];
    return envFiles.some(file => existsSync(file));
  }

  private async setupEnvironment(): Promise<void> {
    console.log('🔧 Setting up environment configuration...');

    if (existsSync('config/env.example')) {
      await $`cp config/env.example .env.local`;
      console.log('✅ Created .env.local from template');
      console.log('⚠️  Please edit .env.local with your configuration values');
    }
  }

  private async checkDatabase(): Promise<boolean> {
    // Check if SQLite database exists or can be created
    return existsSync('domain-data.sqlite') || existsSync('dev.db');
  }

  private async setupDatabase(): Promise<void> {
    console.log('🗄️ Setting up database...');

    if (!existsSync('domain-data.sqlite') && !existsSync('dev.db')) {
      // Run database setup if available
      try {
        await $`bun run db:setup`.quiet();
      } catch {
        console.log('ℹ️  Database setup script not found - manual setup may be required');
      }
    }
  }

  private async checkGitHubAccess(): Promise<boolean> {
    try {
      const result = await $`git remote -v`.quiet();
      const output = result.stdout.toString();
      return output.includes('github.com') && output.includes('fantasy42-fire22-registry');
    } catch {
      return false;
    }
  }

  private async checkDevelopmentTools(): Promise<boolean> {
    // Check for common development tools
    const tools = ['code', 'docker', 'curl'];
    let allToolsAvailable = true;

    for (const tool of tools) {
      try {
        await $`which ${tool}`.quiet();
      } catch {
        allToolsAvailable = false;
        break;
      }
    }

    return allToolsAvailable;
  }

  private async setupDevelopmentTools(): Promise<void> {
    console.log('🛠️ Setting up development tools...');

    // Run development setup script if available
    try {
      await $`bun run dev:setup`.quiet();
      console.log('✅ Development tools setup completed');
    } catch {
      console.log('ℹ️  Development setup script not found');
    }
  }

  private async runCheck(check: OnboardingCheck): Promise<void> {
    console.log(`🔍 Checking: ${check.description}`);

    try {
      const passed = await check.check();

      if (passed) {
        console.log(`✅ ${check.name}: PASSED`);
        this.passedChecks.push(check.name);
      } else {
        console.log(`❌ ${check.name}: FAILED`);

        if (check.fix && check.required) {
          console.log(`🔧 Attempting to fix: ${check.name}`);
          await check.fix();
        }

        if (check.required) {
          this.failedChecks.push(check.name);
        }
      }
    } catch (error) {
      console.log(`❌ ${check.name}: ERROR - ${error}`);
      if (check.required) {
        this.failedChecks.push(check.name);
      }
    }
  }

  public async runOnboarding(): Promise<void> {
    console.log('🚀 Fantasy42-Fire22 Developer Onboarding Setup');
    console.log('==============================================');
    console.log('');

    for (const check of this.checks) {
      await this.runCheck(check);
      console.log('');
    }

    this.printSummary();
  }

  private printSummary(): void {
    console.log('📊 Onboarding Setup Summary');
    console.log('===========================');

    console.log(`✅ Passed checks: ${this.passedChecks.length}`);
    this.passedChecks.forEach(check => console.log(`   • ${check}`));

    if (this.failedChecks.length > 0) {
      console.log(`❌ Failed checks: ${this.failedChecks.length}`);
      this.failedChecks.forEach(check => console.log(`   • ${check}`));
    }

    console.log('');
    console.log('🎯 Next Steps:');

    if (this.failedChecks.length === 0) {
      console.log("🎉 All checks passed! You're ready to start developing.");
      console.log('   Run: bun run dashboard:dev');
    } else {
      console.log('⚠️  Some issues need attention:');
      if (this.failedChecks.includes('bun-version')) {
        console.log('   • Install Bun: https://bun.sh');
      }
      if (this.failedChecks.includes('node-version')) {
        console.log('   • Install Node.js >= 18: https://nodejs.org');
      }
      if (this.failedChecks.includes('git-version')) {
        console.log('   • Update Git: https://git-scm.com');
      }
      if (this.failedChecks.includes('environment')) {
        console.log('   • Configure .env.local file');
      }
      if (this.failedChecks.includes('github-access')) {
        console.log('   • Check GitHub repository access');
      }
    }

    console.log('');
    console.log('📚 Resources:');
    console.log('   • Onboarding Guide: ONBOARDING.md');
    console.log('   • Contributing Guide: CONTRIBUTING.md');
    console.log('   • Documentation: docs/');
    console.log('');
    console.log('🆘 Need help? Contact:');
    console.log('   • Slack: #engineering or #help');
    console.log('   • Email: engineering@fire22.com');
  }
}

// Run onboarding setup
const setup = new OnboardingSetup();
await setup.runOnboarding();
