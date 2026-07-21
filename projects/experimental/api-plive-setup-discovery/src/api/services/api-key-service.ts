// Bun-native: use Bun.password instead of bcryptjs, crypto.randomUUID() instead of uuid
import { config } from '../config/api-config';

interface ApiKey {
  id: string;
  name: string;
  keyHash: string;
  permissions: string[];
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

// In-memory storage for demo purposes - replace with database in production
const apiKeys: Map<string, ApiKey> = new Map();

export class ApiKeyService {
  static async validateApiKey(apiKey: string): Promise<{ isValid: boolean; apiKey?: ApiKey }> {
    try {
      // Extract key ID and secret (format: keyId.secret)
      const [keyId, secret] = apiKey.split('.');

      if (!keyId || !secret) {
        return { isValid: false };
      }

      const storedKey = apiKeys.get(keyId);
      if (!storedKey || !storedKey.isActive) {
        return { isValid: false };
      }

      // Check expiration
      if (storedKey.expiresAt && storedKey.expiresAt < new Date()) {
        return { isValid: false };
      }

      // Verify secret using Bun.password
      const isValidSecret = await Bun.password.verify(secret, storedKey.keyHash);
      if (!isValidSecret) {
        return { isValid: false };
      }

      return { isValid: true, apiKey: storedKey };
    } catch (error) {
      console.error('API key validation error:', error);
      return { isValid: false };
    }
  }

  static async createApiKey(name: string, permissions: string[], expiresAt?: Date): Promise<string> {
    const keyId = crypto.randomUUID();
    const secret = crypto.randomUUID().replace(/-/g, '');
    const keyHash = await Bun.password.hash(secret);

    const apiKey: ApiKey = {
      id: keyId,
      name,
      keyHash,
      permissions,
      createdAt: new Date(),
      expiresAt,
      isActive: true
    };

    apiKeys.set(keyId, apiKey);

    // Return the full API key (only shown once for security)
    return `${keyId}.${secret}`;
  }

  static async revokeApiKey(keyId: string): Promise<boolean> {
    const apiKey = apiKeys.get(keyId);
    if (apiKey) {
      apiKey.isActive = false;
      return true;
    }
    return false;
  }

  static getApiKey(keyId: string): ApiKey | undefined {
    return apiKeys.get(keyId);
  }

  static listApiKeys(): ApiKey[] {
    return Array.from(apiKeys.values()).map(key => ({
      ...key,
      keyHash: '[HIDDEN]' // Don't expose hashes
    }));
  }
}
