#!/usr/bin/env bun

/**
 * Fire22 Private Registry Setup Script
 * Configures authentication and connection to private registries
 */

import { existsSync } from 'fs';
import { readFileSync, writeFileSync } from 'fs';

// Registry configuration
const REGISTRIES = {
  fire22: {
    url: 'https://registry.fire22.com/',
    scope: '@fire22',
    authType: 'token',
  },
  enterprise: {
    url: 'https://npm.enterprise.com',
    scope: '@enterprise',
    authType: 'token',
  },
  private: {
    url: 'https://npm.private.com',
    scope: '@private',
    authType: 'basic',
  },
} as const;

async function setupRegistry() {
  console.log('🔧 Fire22 Private Registry Setup');
  console.log('================================\n');

  // Check if .env exists
  if (!existsSync('.env')) {
    console.log('❌ .env file not found. Creating template...');
    createEnvTemplate();
    return;
  }

  // Load current .env
  const envContent = readFileSync('.env', 'utf-8');
  const envLines = envContent.split('\n');

  console.log('🔍 Checking registry configuration...\n');

  // Check each registry
  for (const [key, config] of Object.entries(REGISTRIES)) {
    console.log(`📦 Checking ${config.scope} registry...`);

    const hasToken = checkEnvVar(envLines, getTokenVarName(key));
    const hasUrl = checkEnvVar(envLines, getUrlVarName(key));

    if (hasToken && hasUrl) {
      console.log(`  ✅ ${config.scope} registry configured`);

      // Test connection
      const testResult = await testRegistryConnection(config);
      if (testResult.success) {
        console.log(`  ✅ Connection successful`);
      } else {
        console.log(`  ❌ Connection failed: ${testResult.error}`);
      }
    } else {
      console.log(`  ⚠️  ${config.scope} registry not configured`);
      console.log(
        `     Missing: ${!hasToken ? getTokenVarName(key) + ' ' : ''}${!hasUrl ? getUrlVarName(key) : ''}`
      );
    }

    console.log('');
  }

  console.log('🔧 Registry setup complete!');
  console.log('\nTo configure your registries:');
  console.log('1. Edit your .env file with actual credentials');
  console.log('2. Run this script again to test connections');
  console.log("3. Run 'bun install' to install dependencies");
}

function checkEnvVar(envLines: string[], varName: string): boolean {
  return envLines.some(line => line.startsWith(`${varName}=`) && !line.includes('demo_'));
}

function getTokenVarName(registry: string): string {
  const mapping: Record<string, string> = {
    fire22: 'FIRE22_REGISTRY_TOKEN',
    enterprise: 'FIRE22_ENTERPRISE_TOKEN',
    private: 'FIRE22_PRIVATE_USER', // For basic auth, we check username
  };
  return mapping[registry] || `${registry.toUpperCase()}_TOKEN`;
}

function getUrlVarName(registry: string): string {
  return `FIRE22_${registry.toUpperCase()}_REGISTRY_URL`;
}

async function testRegistryConnection(
  config: typeof REGISTRIES.fire22
): Promise<{ success: boolean; error?: string }> {
  try {
    // Simple connectivity test - try to fetch package info
    const testUrl = `${config.url.replace(/\/$/, '')}/@fire22/core`;
    const response = await fetch(testUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Fire22-Registry-Test/1.0',
      },
    });

    if (response.ok || response.status === 401 || response.status === 403) {
      // 401/403 means registry exists but needs auth (expected for private)
      return { success: true };
    }

    return { success: false, error: `HTTP ${response.status}` };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function createEnvTemplate() {
  const template = `# Fire22 Environment Configuration
# Copy this to .env and fill in your actual values

# API Configuration
FIRE22_API_URL=https://fire22.ag/cloud/api
FIRE22_TOKEN=your_actual_token_here
FIRE22_WEBHOOK_SECRET=your_webhook_secret
FIRE22_AGENT_ID=your_agent_id
FIRE22_DEMO_MODE=false

# Integration Settings
ENABLE_TELEGRAM_INTEGRATION=true
ENABLE_REAL_TIME_UPDATES=true
ENABLE_NOTIFICATIONS=true

# Private Registry Authentication
FIRE22_REGISTRY_TOKEN=your_registry_token_here
FIRE22_ENTERPRISE_TOKEN=your_enterprise_token_here
FIRE22_PRIVATE_USER=your_private_username
FIRE22_PRIVATE_PASS=your_private_password
NPM_TOKEN=your_npm_token_here

# Registry URLs
FIRE22_REGISTRY_URL=https://registry.fire22.com/
FIRE22_ENTERPRISE_REGISTRY_URL=https://npm.enterprise.com
FIRE22_PRIVATE_REGISTRY_URL=https://npm.private.com
`;

  writeFileSync('.env', template);
  console.log('✅ Created .env template file');
  console.log('📝 Please edit .env with your actual credentials and run this script again');
}

// Run the setup
if (import.meta.main) {
  setupRegistry().catch(console.error);
}
