/**
 * Cloudflare Secrets Bridge (Runtime Module)
 *
 * Lightweight version for runtime use by the Cloudflare client.
 * The full version with CLI commands is in scripts/domain/cf-secrets-bridge.ts
 */

import { getSecret as getManagedSecret } from './bun-secrets-adapter';
const CF_SERVICE = 'cloudflare';
const TOKEN_NAME = 'api_token';
const ACCOUNT_ID_NAME = 'account_id';

export interface CloudflareCredentials {
  apiToken: string;
  accountId?: string;
}

/**
 * Get secret from Bun.secrets or environment
 */
async function getSecret(service: string, name: string): Promise<string | undefined> {
  const value = await getManagedSecret({
    service,
    name,
    legacyServices: service === 'com.barbershop.vectorize' ? ['cloudflare'] : [],
  });
  return value ?? undefined;
}

/**
 * Cloudflare Secrets Bridge
 *
 * Runtime credential management - no CLI dependencies
 */
export class CloudflareSecretsBridge {
  /**
   * Get Cloudflare credentials from Bun.secrets or environment
   */
  async getCredentials(): Promise<CloudflareCredentials | null> {
    const [apiToken, accountId] = await Promise.all([
      getSecret(CF_SERVICE, TOKEN_NAME),
      getSecret(CF_SERVICE, ACCOUNT_ID_NAME),
    ]);

    if (!apiToken) {
      return null;
    }

    return { apiToken, accountId };
  }

  /**
   * Check if credentials are configured
   */
  async hasCredentials(): Promise<boolean> {
    const token = await getSecret(CF_SERVICE, TOKEN_NAME);
    return !!token;
  }
}

// Singleton instance
export const cfSecretsBridge = new CloudflareSecretsBridge();
export default cfSecretsBridge;
