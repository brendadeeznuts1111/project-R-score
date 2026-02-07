/**
 * Cloudflare Secrets Bridge (Runtime Module)
 * 
 * Lightweight version for runtime use by the Cloudflare client.
 * The full version with CLI commands is in scripts/domain/cf-secrets-bridge.ts
 */

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
  const key = `${service}:${name}`;
  
  // Try Bun.secrets first (Bun v1.3.7+)
  if (typeof Bun !== 'undefined' && 'secrets' in Bun) {
    try {
      const secrets = Bun.secrets as unknown as { get: (k: string) => Promise<string | undefined> };
      const value = await secrets.get(key);
      if (value) return value;
    } catch {
      // Fall through to environment
    }
  }
  
  // Fallback to environment variables
  const envVarMap: Record<string, string> = {
    'cloudflare:api_token': 'CLOUDFLARE_API_TOKEN',
    'cloudflare:account_id': 'CLOUDFLARE_ACCOUNT_ID',
  };
  
  return Bun.env[envVarMap[key] || key.toUpperCase().replace(':', '_')];
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
      getSecret(CF_SERVICE, ACCOUNT_ID_NAME)
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
