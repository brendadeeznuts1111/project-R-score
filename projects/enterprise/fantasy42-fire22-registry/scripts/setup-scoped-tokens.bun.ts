#!/usr/bin/env bun

/**
 * 🔥 Fantasy42-Fire22 Scoped Registry Token Setup
 * Implements Principle of Least Privilege for CI/CD Security
 */

import { $ } from 'bun';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';

interface ScopedToken {
  name: string;
  scope: string;
  permissions: string[];
  description: string;
  environment: string;
}

interface RegistryConfig {
  name: string;
  url: string;
  authType: 'token' | 'basic' | 'none';
  tokenVar: string;
}

class ScopedTokenSetup {
  private tokens: ScopedToken[] = [];
  private registries: RegistryConfig[] = [];

  constructor() {
    this.initializeTokens();
    this.initializeRegistries();
  }

  private initializeTokens() {
    this.tokens = [
      {
        name: 'FIRE22_REGISTRY_TOKEN',
        scope: '@fire22',
        permissions: ['read'],
        description: 'Read-only token for @fire22 scoped packages',
        environment: 'development,staging,production',
      },
      {
        name: 'FIRE22_PUBLISH_TOKEN',
        scope: '@fire22',
        permissions: ['read', 'write'],
        description: 'Publish token for @fire22 scoped packages',
        environment: 'production',
      },
      {
        name: 'FIRE22_ENTERPRISE_TOKEN',
        scope: '@enterprise',
        permissions: ['read', 'write'],
        description: 'Enterprise registry token with full access',
        environment: 'enterprise',
      },
      {
        name: 'FIRE22_PRIVATE_TOKEN',
        scope: '@private',
        permissions: ['read'],
        description: 'Private registry read-only token',
        environment: 'development,staging',
      },
      {
        name: 'SPORTSBET_REGISTRY_TOKEN',
        scope: '@sportsbet',
        permissions: ['read'],
        description: 'Partner registry token for SportsBet packages',
        environment: 'development,staging,production',
      },
    ];
  }

  private initializeRegistries() {
    this.registries = [
      {
        name: 'npmjs.org',
        url: 'https://registry.npmjs.org',
        authType: 'token',
        tokenVar: 'FIRE22_REGISTRY_TOKEN',
      },
      {
        name: 'Fire22 Enterprise',
        url: 'https://registry.fire22.com',
        authType: 'token',
        tokenVar: 'FIRE22_ENTERPRISE_TOKEN',
      },
      {
        name: 'Fire22 Private',
        url: 'https://private.fire22.com',
        authType: 'token',
        tokenVar: 'FIRE22_PRIVATE_TOKEN',
      },
      {
        name: 'SportsBet',
        url: 'https://registry.sportsbet.com',
        authType: 'token',
        tokenVar: 'SPORTSBET_REGISTRY_TOKEN',
      },
    ];
  }

  public async setupTokens(): Promise<void> {
    console.log('🔐 Fantasy42-Fire22 Scoped Registry Token Setup');
    console.log('==============================================');
    console.log('');

    console.log('🎯 Principle of Least Privilege Implementation');
    console.log('This setup creates minimal-permission tokens for each use case.');
    console.log('');

    await this.displayTokenMatrix();
    await this.createNpmrcTemplate();
    await this.createEnvironmentTemplate();
    await this.createGitHubSecretsTemplate();
    await this.validateSetup();

    console.log('✅ Scoped token setup completed!');
    console.log('');
    console.log('📚 Next Steps:');
    console.log('1. Create tokens in npm registry dashboard');
    console.log('2. Add tokens to CI/CD environment variables');
    console.log('3. Update .npmrc with actual token values');
    console.log('4. Test with: bun run test:scoped-registry');
  }

  private async displayTokenMatrix(): Promise<void> {
    console.log('🔑 Token Matrix - Principle of Least Privilege');
    console.log('===========================================');

    console.log('| Token Name | Scope | Permissions | Environment |');
    console.log('|------------|-------|-------------|-------------|');

    for (const token of this.tokens) {
      const perms = token.permissions.join('+');
      console.log(`| ${token.name} | ${token.scope} | ${perms} | ${token.environment} |`);
    }

    console.log('');
  }

  private async createNpmrcTemplate(): Promise<void> {
    console.log('📝 Creating .npmrc template...');

    let npmrc = '# 🔥 Fantasy42-Fire22 Scoped Registry Configuration\n';
    npmrc += '# Principle of Least Privilege - Scoped Tokens Only\n\n';

    for (const token of this.tokens) {
      const registry = this.registries.find(r => r.tokenVar === token.name);
      if (registry) {
        npmrc += `# ${token.scope} Registry (${token.permissions.join('+')} permissions)\n`;
        npmrc += `${token.scope}:registry=${registry.url}/\n`;
        npmrc += `//${registry.url.replace('https://', '')}/:_authToken=\${${token.name}}\n\n`;
      }
    }

    npmrc += '# User Agent Tracking\n';
    npmrc += '# bunx automatically sets: CrystalClearArchitecture/2.0.0\n\n';

    npmrc += '# Security Notes\n';
    npmrc += '# - Never commit actual tokens to version control\n';
    npmrc += '# - Use environment variables for token values\n';
    npmrc += '# - Rotate tokens regularly for security\n';

    writeFileSync('.npmrc.template', npmrc);
    console.log('✅ Created .npmrc.template');
  }

  private async createEnvironmentTemplate(): Promise<void> {
    console.log('🌍 Creating environment template...');

    let env = '# 🔥 Fantasy42-Fire22 Scoped Registry Environment Variables\n';
    env += '# Principle of Least Privilege - Minimal Permission Tokens\n\n';

    for (const token of this.tokens) {
      env += `# ${token.description}\n`;
      env += `# ${token.scope} - ${token.permissions.join('+')} permissions\n`;
      env += `# Environment: ${token.environment}\n`;
      env += `${token.name}="your_${token.name.toLowerCase()}_here"\n\n`;
    }

    env += '# Additional Registry Configuration\n';
    env += '# FIRE22_REGISTRY_URL=https://registry.npmjs.org\n';
    env += '# FIRE22_ENTERPRISE_REGISTRY_URL=https://registry.fire22.com\n';
    env += '# FIRE22_PRIVATE_REGISTRY_URL=https://private.fire22.com\n';

    writeFileSync('.env.registry.template', env);
    console.log('✅ Created .env.registry.template');
  }

  private async createGitHubSecretsTemplate(): Promise<void> {
    console.log('🔐 Creating GitHub secrets template...');

    let secrets = '# 🔥 Fantasy42-Fire22 GitHub Repository Secrets\n';
    secrets += '# Required for CI/CD with Scoped Registry Tokens\n\n';

    secrets += '## Scoped Registry Tokens (Principle of Least Privilege)\n\n';

    for (const token of this.tokens) {
      secrets += `### ${token.name}\n`;
      secrets += `- **Name**: ${token.name}\n`;
      secrets += `- **Scope**: ${token.scope}\n`;
      secrets += `- **Permissions**: ${token.permissions.join(', ')}\n`;
      secrets += `- **Description**: ${token.description}\n`;
      secrets += `- **Environment**: ${token.environment}\n`;
      secrets += `- **Value**: [Create token in registry dashboard]\n\n`;
    }

    secrets += '## Additional Secrets for CI/CD\n\n';
    secrets += '### CLOUDFLARE_API_TOKEN\n';
    secrets += '- **Description**: Cloudflare API token for deployments\n';
    secrets += '- **Permissions**: Zone.Read, Zone.Write, DNS.Read, DNS.Edit\n\n';

    secrets += '### GITHUB_TOKEN\n';
    secrets += '- **Description**: GitHub token for package publishing\n';
    secrets += '- **Permissions**: repo, packages:write\n\n';

    secrets += '## Token Creation Instructions\n\n';
    secrets += '### npm Registry Tokens:\n';
    secrets += '1. Go to https://www.npmjs.com/settings/tokens\n';
    secrets += "2. Click 'Generate New Token'\n";
    secrets += '3. Choose token type based on permissions needed\n';
    secrets += '4. Copy token value to GitHub secret\n\n';

    secrets += '### GitHub Repository Secrets:\n';
    secrets += '1. Go to Repository Settings → Secrets and variables → Actions\n';
    secrets += "2. Click 'New repository secret'\n";
    secrets += '3. Add each token with its corresponding value\n\n';

    secrets += '### Cloudflare API Tokens:\n';
    secrets += '1. Go to https://dash.cloudflare.com/profile/api-tokens\n';
    secrets += '2. Create token with appropriate permissions\n';
    secrets += '3. Copy token to GitHub secret\n\n';

    writeFileSync('GITHUB_SECRETS_SETUP.md', secrets);
    console.log('✅ Created GITHUB_SECRETS_SETUP.md');
  }

  private async validateSetup(): Promise<void> {
    console.log('🔍 Validating scoped token setup...');

    const checks = [
      {
        name: '.npmrc.template',
        check: () => existsSync('.npmrc.template'),
        message: 'Scoped registry configuration template',
      },
      {
        name: '.env.registry.template',
        check: () => existsSync('.env.registry.template'),
        message: 'Environment variables template',
      },
      {
        name: 'GITHUB_SECRETS_SETUP.md',
        check: () => existsSync('GITHUB_SECRETS_SETUP.md'),
        message: 'GitHub secrets setup guide',
      },
      {
        name: 'security-ci-cd.yml',
        check: () => existsSync('.github/workflows/security-ci-cd.yml'),
        message: 'Security-first CI/CD workflow',
      },
    ];

    console.log('📋 Validation Results:');
    for (const check of checks) {
      const passed = check.check();
      const status = passed ? '✅' : '❌';
      console.log(`${status} ${check.name}: ${check.message}`);
    }

    console.log('');
  }

  public async testScopedRegistry(): Promise<void> {
    console.log('🧪 Testing scoped registry configuration...');

    try {
      // Test basic connectivity
      console.log('📡 Testing registry connectivity...');
      const result = await $`bun pm ping`.quiet();
      console.log('✅ Registry connectivity: OK');

      // Test user agent
      console.log('🤖 Testing user agent...');
      const uaResult = await $`bun --version`.quiet();
      console.log(`✅ User Agent: ${uaResult.stdout.toString().trim()}`);

      // Test package resolution
      console.log('📦 Testing package resolution...');
      await $`bun pm view @fire22/security-scanner version`.quiet();
      console.log('✅ Package resolution: OK');
    } catch (error) {
      console.log(`❌ Test failed: ${error}`);
      console.log('💡 Make sure tokens are properly configured in environment');
    }
  }
}

// Main execution
const setup = new ScopedTokenSetup();

if (process.argv[2] === 'test') {
  await setup.testScopedRegistry();
} else {
  await setup.setupTokens();
}
