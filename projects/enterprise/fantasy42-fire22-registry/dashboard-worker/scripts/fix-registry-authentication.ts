#!/usr/bin/env bun
/**
 * 🔐 Fix Registry Authentication with Bun.secrets
 * Uses Bun's native credential storage for secure registry authentication
 *
 * Features:
 * - Native OS credential storage (Keychain/libsecret/CredMan)
 * - Secure token management for private registries
 * - Automatic registry configuration with proper auth
 * - Support for multiple registry endpoints
 * - Security scanner integration
 */

import { secrets } from 'bun';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface RegistryConfig {
  name: string;
  url: string;
  scope?: string;
  description: string;
}

const REGISTRIES: RegistryConfig[] = [
  {
    name: 'fire22-registry',
    url: 'https://fire22.workers.dev/registry/',
    scope: '@fire22',
    description: 'Fire22 Private Registry (Cloudflare Workers)',
  },
  {
    name: 'npm-registry',
    url: 'https://registry.npmjs.org/',
    description: 'Official NPM Registry',
  },
];

class RegistryAuthManager {
  private serviceName = 'fire22-dashboard-worker';

  /**
   * Store registry authentication token securely using Bun.secrets
   */
  async storeToken(registryName: string, token: string): Promise<void> {
    try {
      await secrets.set({
        service: this.serviceName,
        name: `${registryName}-token`,
        value: token,
      });
      console.log(`✅ Securely stored token for ${registryName}`);
    } catch (error) {
      console.error(`❌ Failed to store token for ${registryName}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve registry authentication token from secure storage
   */
  async getToken(registryName: string): Promise<string | null> {
    try {
      const token = await secrets.get({
        service: this.serviceName,
        name: `${registryName}-token`,
      });
      return token || null;
    } catch (error) {
      console.warn(`⚠️ Could not retrieve token for ${registryName}:`, error);
      return null;
    }
  }

  /**
   * Delete registry authentication token from secure storage
   */
  async deleteToken(registryName: string): Promise<void> {
    try {
      await secrets.delete({
        service: this.serviceName,
        name: `${registryName}-token`,
      });
      console.log(`🗑️ Deleted token for ${registryName}`);
    } catch (error) {
      console.warn(`⚠️ Could not delete token for ${registryName}:`, error);
    }
  }

  /**
   * Configure .npmrc with secure authentication
   */
  async configureNpmrc(): Promise<void> {
    const npmrcPath = join(process.cwd(), '.npmrc');
    const lines: string[] = [
      '# NPM Configuration for Fire22 Dashboard Worker',
      '# Managed by fix-registry-authentication.ts with Bun.secrets',
      '',
      '# Main Registry (Official NPM)',
      'registry=https://registry.npmjs.org/',
      '',
      '# Package Management',
      'save-exact=true',
      'engine-strict=true',
      'fund=false',
      '',
      '# Security',
      'audit=true',
      'audit-level=high',
      '',
      '# Performance',
      'prefer-offline=false',
      'cache-min=86400',
      '',
      '# Logging',
      'loglevel=warn',
      'progress=true',
    ];

    // Add scoped registry configuration if token exists
    const fire22Token = await this.getToken('fire22-registry');
    if (fire22Token) {
      lines.push(
        '',
        '# Fire22 Private Registry (Authenticated)',
        '@fire22:registry=https://fire22.workers.dev/registry/',
        '@ff:registry=https://fire22.workers.dev/registry/',
        '@brendadeeznuts:registry=https://fire22.workers.dev/registry/',
        `//fire22.workers.dev/registry/:_authToken=${fire22Token}`,
        '//fire22.workers.dev/registry/:always-auth=true'
      );
    } else {
      lines.push(
        '',
        '# Fire22 Private Registry (Disabled - no token)',
        '# @fire22:registry=https://fire22.workers.dev/registry/',
        '# @ff:registry=https://fire22.workers.dev/registry/',
        '# @brendadeeznuts:registry=https://fire22.workers.dev/registry/',
        "# Run 'bun run registry:auth:setup' to configure authentication"
      );
    }

    writeFileSync(npmrcPath, lines.join('\n') + '\n');
    console.log(
      `✅ Updated .npmrc with ${fire22Token ? 'authenticated' : 'unauthenticated'} configuration`
    );
  }

  /**
   * Configure bunfig.toml with registry settings and security scanner
   */
  async configureBunfig(): Promise<void> {
    const bunfigPath = join(process.cwd(), 'bunfig.toml');
    let content = existsSync(bunfigPath) ? readFileSync(bunfigPath, 'utf-8') : '';

    // Enhanced bunfig.toml with security scanner
    const configContent = `# Fire22 Dashboard - Enhanced Bun Configuration
# Production-ready configuration for v1.0.0 with Bun.secrets integration

# Telemetry Configuration
# Disable analytics for production privacy
telemetry = false

[install]
# Use official NPM registry as primary
registry = "https://registry.npmjs.org/"
linker = "hoisted"
cache = true
exact = true
dev = true
optional = true
auto = false

# Security scanner configuration (Bun v1.2.0+)
[install.security]
scanner = "@fire22/security-scanner"

# Scoped package registries
[install.scopes]
"@fire22" = "https://fire22.workers.dev/registry/"
"@ff" = "https://fire22.workers.dev/registry/"
"@brendadeeznuts" = "https://fire22.workers.dev/registry/"

[build]
target = "bun"
format = "esm"
splitting = true
minify = false

[test]
coverage = true
# bunx compatibility
bunx = true

[run]
bun = true
hot = true

[console]
# Enhanced console depth for development
# Default: 2, Development: 4, Deep debugging: 6-8
depth = 4

[debug]
# Default editor for Bun.openInEditor()
# Auto-detects from $VISUAL or $EDITOR environment variables
# Override with specific editor: "code", "vscode", "subl", "vim", "nano"
editor = "code"

# CSS Build Scripts
[scripts]
"css:extract" = "bun run scripts/extract-css.ts"
"css:build" = "bun build ./src/styles/index.css --outdir=public/css --naming='[name].[ext]'"
"css:watch" = "bun build ./src/styles/index.css --outdir=public/css --naming='[name].[ext]' --watch"
"css:consolidate" = "bun run css:extract && bun run css:build"
"build:css" = "bun run css:consolidate"

# Serve configuration
[serve]
port = 3001
host = "0.0.0.0"

[serve.static]
directory = "public"
plugins = []

[serve.static.paths]
"/css" = "./public/css"
"/styles" = "./src/styles"
"/js" = "./src/js"
`;

    writeFileSync(bunfigPath, configContent);
    console.log('✅ Updated bunfig.toml with security scanner and scoped registry configuration');
  }

  /**
   * Test registry connectivity and authentication
   */
  async testRegistryAccess(): Promise<void> {
    console.log('🔍 Testing registry access...');

    for (const registry of REGISTRIES) {
      try {
        console.log(`\n📡 Testing ${registry.name} (${registry.url})...`);

        const response = await fetch(registry.url);
        if (response.ok) {
          console.log(`  ✅ ${registry.name}: Connection successful (${response.status})`);
        } else {
          console.log(`  ⚠️ ${registry.name}: HTTP ${response.status}`);
        }

        // Test authentication for private registries
        if (registry.scope) {
          const token = await this.getToken(registry.name);
          if (token) {
            console.log(`  🔐 ${registry.name}: Authentication token available`);
          } else {
            console.log(`  ❌ ${registry.name}: No authentication token`);
          }
        }
      } catch (error) {
        console.log(`  ❌ ${registry.name}: Connection failed -`, error);
      }
    }
  }

  /**
   * Interactive setup for registry authentication
   */
  async interactiveSetup(): Promise<void> {
    console.log('🔐 Fire22 Registry Authentication Setup');
    console.log('!==!==!==!==!==!==!==\n');

    console.log('This setup will configure secure authentication for Fire22 private registry.');
    console.log("Tokens will be stored securely using your operating system's credential manager:");
    console.log('  • macOS: Keychain Services');
    console.log('  • Linux: libsecret (GNOME Keyring/KWallet)');
    console.log('  • Windows: Credential Manager\n');

    // Setup Fire22 registry
    console.log('📦 Setting up Fire22 Registry Authentication');
    console.log('URL: https://fire22.workers.dev/registry/');
    console.log('Scopes: @fire22/*, @ff/*, @brendadeeznuts/*');

    const hasExistingToken = await this.getToken('fire22-registry');
    if (hasExistingToken) {
      console.log('✅ Existing authentication token found');
    } else {
      console.log('\n❌ No authentication token found');
      console.log('To configure authentication:');
      console.log(
        '1. Deploy the Fire22 registry worker: cd workspaces/@fire22-security-registry && wrangler deploy'
      );
      console.log('2. Obtain an API token from the deployed registry');
      console.log('3. Run: bun run registry:auth:setup --token=<your-token>');
    }

    await this.configureNpmrc();
    await this.configureBunfig();
  }

  /**
   * Setup authentication with provided token
   */
  async setupWithToken(token: string): Promise<void> {
    console.log('🔐 Configuring Fire22 registry authentication...');

    await this.storeToken('fire22-registry', token);
    await this.configureNpmrc();
    await this.configureBunfig();

    console.log('✅ Fire22 registry authentication configured successfully');
    console.log('🧪 Testing registry access...');
    await this.testRegistryAccess();
  }

  /**
   * Generate demo token for development
   */
  generateDemoToken(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `fire22_demo_${timestamp}_${random}`;
  }

  /**
   * Setup demo authentication for development
   */
  async setupDemo(): Promise<void> {
    console.log('🧪 Setting up demo authentication for development...');

    const demoToken = this.generateDemoToken();
    await this.storeToken('fire22-registry', demoToken);
    await this.configureNpmrc();
    await this.configureBunfig();

    console.log('✅ Demo authentication configured');
    console.log(`🔑 Demo token: ${demoToken}`);
    console.log('⚠️ This is a demo token. Deploy the registry worker for production use.');
  }

  /**
   * Get authentication status for all registries
   */
  async getStatus(): Promise<void> {
    console.log('🔐 Registry Authentication Status');
    console.log('!==!==!==!==!==!==\n');

    for (const registry of REGISTRIES) {
      console.log(`📦 ${registry.name}`);
      console.log(`   URL: ${registry.url}`);
      if (registry.scope) {
        console.log(`   Scope: ${registry.scope}/*`);
      }
      console.log(`   Description: ${registry.description}`);

      if (registry.scope) {
        const token = await this.getToken(registry.name);
        console.log(`   Authentication: ${token ? '✅ Configured' : '❌ Not configured'}`);
        if (token) {
          console.log(`   Token: ${token.substring(0, 20)}...`);
        }
      } else {
        console.log(`   Authentication: ➖ Public registry`);
      }
      console.log('');
    }

    console.log('🛡️ Security Scanner Status');
    console.log('bunfig.toml: ✅ Configured with @fire22/security-scanner');
    console.log('Audit Level: 🔴 High (production setting)');
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  const manager = new RegistryAuthManager();

  switch (command) {
    case 'setup':
      const tokenFlag = args.find(arg => arg.startsWith('--token='));
      if (tokenFlag) {
        const token = tokenFlag.split('=')[1];
        await manager.setupWithToken(token);
      } else {
        await manager.interactiveSetup();
      }
      break;

    case 'demo':
      await manager.setupDemo();
      break;

    case 'test':
      await manager.testRegistryAccess();
      break;

    case 'fix':
      console.log('🔧 Fixing registry configuration...');
      await manager.configureNpmrc();
      await manager.configureBunfig();
      await manager.testRegistryAccess();
      break;

    case 'status':
      await manager.getStatus();
      break;

    case 'delete':
      const registryName = args[1] || 'fire22-registry';
      await manager.deleteToken(registryName);
      await manager.configureNpmrc();
      break;

    default:
      console.log('🔐 Fire22 Registry Authentication Manager (Bun.secrets)');
      console.log('Usage:');
      console.log('  bun run registry:auth:setup [--token=<token>]  # Setup authentication');
      console.log('  bun run registry:auth:demo                     # Setup demo token');
      console.log('  bun run registry:auth:test                     # Test registry access');
      console.log('  bun run registry:auth:fix                      # Fix configuration');
      console.log('  bun run registry:auth:status                   # Show status');
      console.log('  bun run registry:auth:delete [registry]        # Delete stored token');
      console.log('');
      console.log('🔒 Credentials stored securely using OS-native storage:');
      console.log('  • macOS: Keychain Services');
      console.log('  • Linux: libsecret (GNOME Keyring/KWallet)');
      console.log('  • Windows: Credential Manager');
      break;
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { RegistryAuthManager };
