#!/usr/bin/env bun
/**
 * Fire22 Registry Authentication Plugin
 *
 * Automatically injects the secure token from Bun.secrets
 * when accessing the private registry
 */

import { secrets } from 'bun';
import { plugin } from 'bun';

const SERVICE_NAME = 'fire22-dashboard-worker';
const TOKEN_NAME = 'registry-token';
const REGISTRY_URL = 'https://fire22-security-registry.nolarose1968-806.workers.dev/';

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

// Create a Bun plugin for automatic authentication
plugin({
  name: 'fire22-registry-auth',
  async setup(build) {
    const token = await getSecureToken();

    if (!token) {
      console.warn('⚠️ Fire22 registry authentication not configured');
      return;
    }

    // Intercept fetch requests to the registry
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

      // Add authentication to registry requests
      if (url?.startsWith(REGISTRY_URL)) {
        init = init || {};
        init.headers = new Headers(init.headers);
        init.headers.set('Authorization', `Bearer ${token}`);

        console.log(`🔐 Authenticating request to Fire22 registry`);
      }

      return originalFetch(input, init);
    };

    console.log('✅ Fire22 registry authentication plugin loaded');
  },
});

// Export for use in other scripts
export { getSecureToken, SERVICE_NAME, TOKEN_NAME, REGISTRY_URL };

// Auto-setup when imported
if (import.meta.main) {
  console.log('🔐 Fire22 Registry Authentication Plugin');
  console.log('!==!==!==!==!==!==!====\n');

  const token = await getSecureToken();
  if (token) {
    console.log('✅ Token found in secure storage');
    console.log(`   Service: ${SERVICE_NAME}`);
    console.log(`   Registry: ${REGISTRY_URL}`);
    console.log(`   Token: ${token.substring(0, 10)}...${token.substring(token.length - 4)}`);

    // Test the token
    const response = await fetch(`${REGISTRY_URL}health`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      console.log('\n✅ Token validated successfully');
      const data = await response.json();
      console.log('Registry Status:', JSON.stringify(data, null, 2));
    } else {
      console.log('\n❌ Token validation failed:', response.status);
    }
  } else {
    console.log('⚠️ No token found. Run: bun run scripts/setup-registry-token.ts');
  }
}
