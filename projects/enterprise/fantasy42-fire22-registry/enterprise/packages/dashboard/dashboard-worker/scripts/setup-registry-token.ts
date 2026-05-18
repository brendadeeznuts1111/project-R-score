#!/usr/bin/env bun
/**
 * Setup Fire22 Registry Token using Bun.secrets
 *
 * Securely stores the registry token in the OS credential manager:
 * - macOS: Keychain Services
 * - Linux: libsecret (GNOME Keyring/KWallet)
 * - Windows: Credential Manager
 */

import { secrets } from 'bun';
import { readFileSync, existsSync } from 'fs';

const SERVICE_NAME = 'fire22-dashboard-worker';
const TOKEN_NAME = 'registry-token';

async function setupRegistryToken() {
  console.info('🔐 Fire22 Registry Token Setup');
  console.info('!==!==!==!==!==!==\n');

  // Check if token is already stored
  try {
    const existingToken = await secrets.get({
      service: SERVICE_NAME,
      name: TOKEN_NAME,
    });

    if (existingToken) {
      console.info('✅ Registry token already configured in secure storage');

      const response = await fetch(
        'https://fire22-security-registry.nolarose1968-806.workers.dev/health',
        {
          headers: {
            Authorization: `Bearer ${existingToken}`,
          },
        }
      );

      if (response.ok) {
        console.info('✅ Token validated successfully with registry');
        return;
      } else {
        console.info('⚠️ Existing token appears invalid, needs update');
      }
    }
  } catch (error) {
    // Token doesn't exist yet
  }

  // Check for token in environment
  if (process.env.FIRE22_REGISTRY_TOKEN) {
    console.info('📝 Found FIRE22_REGISTRY_TOKEN in environment');

    await secrets.set({
      service: SERVICE_NAME,
      name: TOKEN_NAME,
      value: process.env.FIRE22_REGISTRY_TOKEN,
    });

    console.info('✅ Token stored securely in OS credential manager');
    return;
  }

  // Check for token in .env files
  const envFiles = ['.env', '.env.local', '.env.production'];
  for (const file of envFiles) {
    if (existsSync(file)) {
      const content = readFileSync(file, 'utf-8');
      const match = content.match(/FIRE22_REGISTRY_TOKEN=(.+)/);

      if (match && match[1]) {
        console.info(`📝 Found token in ${file}`);

        await secrets.set({
          service: SERVICE_NAME,
          name: TOKEN_NAME,
          value: match[1].trim(),
        });

        console.info('✅ Token stored securely in OS credential manager');
        console.info('💡 You can now remove it from the .env file for better security');
        return;
      }
    }
  }

  // Prompt for token
  console.info('\n⚠️ No registry token found!');
  console.info('\nTo set up the Fire22 private registry token:');
  console.info('\n1. Get your token from the Fire22 admin panel');
  console.info('2. Run one of these commands:\n');
  console.info('   # Set via environment variable:');
  console.info('   FIRE22_REGISTRY_TOKEN=your-token-here bun run scripts/setup-registry-token.ts\n');
  console.info('   # Or add to .env file:');
  console.info("   echo 'FIRE22_REGISTRY_TOKEN=your-token-here' >> .env");
  console.info('   bun run scripts/setup-registry-token.ts\n');

  process.exit(1);
}

async function getStoredToken(): Promise<string | null> {
  try {
    return await secrets.get({
      service: SERVICE_NAME,
      name: TOKEN_NAME,
    });
  } catch (error) {
    return null;
  }
}

async function deleteStoredToken() {
  try {
    await secrets.delete({
      service: SERVICE_NAME,
      name: TOKEN_NAME,
    });
    console.info('✅ Token deleted from secure storage');
  } catch (error) {
    console.info('⚠️ No token found to delete');
  }
}

// CLI handling
const command = process.argv[2];

switch (command) {
  case 'get':
    const token = await getStoredToken();
    if (token) {
      console.info('✅ Token retrieved from secure storage');
      console.info(`Token: ${token.substring(0, 10)}...${token.substring(token.length - 4)}`);
    } else {
      console.info('⚠️ No token found in secure storage');
    }
    break;

  case 'delete':
    await deleteStoredToken();
    break;

  case 'test':
    const testToken = await getStoredToken();
    if (testToken) {
      const response = await fetch(
        'https://fire22-security-registry.nolarose1968-806.workers.dev/health',
        {
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
        }
      );

      if (response.ok) {
        console.info('✅ Token validated successfully with registry');
        const data = await response.json();
        console.info('Registry Status:', data);
      } else {
        console.info('❌ Token validation failed:', response.status);
      }
    } else {
      console.info('⚠️ No token found to test');
    }
    break;

  default:
    await setupRegistryToken();
}

export { getStoredToken, SERVICE_NAME, TOKEN_NAME };
