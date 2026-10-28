#!/usr/bin/env bun
/**
 * Fire22 Registry Authentication Client
 *
 * Loads the registry token from Bun.secrets and scopes it to the guarded
 * registry health operation. This module never replaces global fetch.
 */

import { secrets } from 'bun';
import {
  fetchFire22RegistryHealth,
  FIRE22_REGISTRY_ORIGIN,
  type RegistryOutboundOptions,
} from './registry-outbound.ts';

const SERVICE_NAME = 'fire22-dashboard-worker';
const TOKEN_NAME = 'registry-token';
const REGISTRY_URL = `${FIRE22_REGISTRY_ORIGIN}/`;

// Get token from secure storage
async function getSecureToken(): Promise<string | null> {
  try {
    return await secrets.get({
      service: SERVICE_NAME,
      name: TOKEN_NAME,
    });
  } catch (error) {
    console.warn('⚠️ No Fire22 registry token found in secure storage');
    console.warn('Run: bun run scripts/setup-registry-token.ts');
    return null;
  }
}

async function fetchWithSecureRegistryToken(options: RegistryOutboundOptions = {}) {
  const token = await getSecureToken();
  if (!token) throw new Error('Fire22 registry authentication is not configured');
  return fetchFire22RegistryHealth(token, {}, options);
}

// Export for use in other scripts
export {
  fetchWithSecureRegistryToken,
  getSecureToken,
  SERVICE_NAME,
  TOKEN_NAME,
  REGISTRY_URL,
};

// Auto-setup when imported
if (import.meta.main) {
  console.info('🔐 Fire22 Registry Authentication Plugin');
  console.info('!==!==!==!==!==!==!====\n');

  const token = await getSecureToken();
  if (token) {
    console.info('✅ Token found in secure storage');
    console.info(`   Service: ${SERVICE_NAME}`);
    console.info(`   Registry: ${REGISTRY_URL}`);
    console.info('   Token: configured in OS credential storage');

    // Test the token
    const response = await fetchFire22RegistryHealth(token);

    if (response.ok) {
      console.info('\n✅ Token validated successfully');
      const data = await response.json();
      console.info('Registry Status:', JSON.stringify(data, null, 2));
    } else {
      console.info('\n❌ Token validation failed:', response.status);
    }
  } else {
    console.info('⚠️ No token found. Run: bun run scripts/setup-registry-token.ts');
  }
}
