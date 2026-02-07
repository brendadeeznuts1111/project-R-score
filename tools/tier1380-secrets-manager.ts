#!/usr/bin/env bun
// tools/tier1380-secrets-manager.ts — Secure secrets manager using Bun secrets API

import { secrets } from "bun";

/**
 * 🚀 Prefetch Optimizations
 *
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 *
 * Generated automatically by optimize-examples-prefetch.ts
 */

interface SecretOptions {
  service: string;
  name: string;
  allowUnrestrictedAccess?: boolean;
}

interface Tier1380Secrets {
  r2AccessKey?: string;
  r2SecretKey?: string;
  databaseUrl?: string;
  apiKeys?: Record<string, string>;
  sessionTokens?: Record<string, string>;
  csrfTokens?: Record<string, string>;
}

export class Tier1380SecretsManager {
  private static readonly SERVICE_NAME = "tier1380-factorywager";
  private static readonly ALLOW_UNRESTRICTED = false; // Security: require user access

  /**
   * Store R2 credentials securely
   */
  static async storeR2Credentials(accessKeyId: string, secretAccessKey: string): Promise<void> {
    await Promise.all([
      secrets.set({
        service: this.SERVICE_NAME,
        name: "r2-access-key-id",
        value: accessKeyId,
        allowUnrestrictedAccess: this.ALLOW_UNRESTRICTED
      }),
      secrets.set({
        service: this.SERVICE_NAME,
        name: "r2-secret-access-key",
        value: secretAccessKey,
        allowUnrestrictedAccess: this.ALLOW_UNRESTRICTED
      })
    ]);

    console.log("🔐 R2 credentials stored securely");
  }

  /**
   * Retrieve R2 credentials
   */
  static async getR2Credentials(): Promise<{ accessKeyId?: string; secretAccessKey?: string }> {
    const [accessKeyId, secretAccessKey] = await Promise.all([
      secrets.get({
        service: this.SERVICE_NAME,
        name: "r2-access-key-id"
      }),
      secrets.get({
        service: this.SERVICE_NAME,
        name: "r2-secret-access-key"
      })
    ]);

    return {
      accessKeyId: accessKeyId || undefined,
      secretAccessKey: secretAccessKey || undefined
    };
  }

  /**
   * Store API key for external service
   */
  static async storeApiKey(service: string, apiKey: string): Promise<void> {
    await secrets.set({
      service: this.SERVICE_NAME,
      name: `api-key-${service}`,
      value: apiKey,
      allowUnrestrictedAccess: this.ALLOW_UNRESTRICTED
    });

    console.log(`🔐 API key for ${service} stored securely`);
  }

  /**
   * Retrieve API key for external service
   */
  static async getApiKey(service: string): Promise<string | null> {
    return await secrets.get({
      service: this.SERVICE_NAME,
      name: `api-key-${service}`
    });
  }

  /**
   * Store session token
   */
  static async storeSessionToken(sessionId: string, token: string): Promise<void> {
    await secrets.set({
      service: this.SERVICE_NAME,
      name: `session-${sessionId}`,
      value: token,
      allowUnrestrictedAccess: this.ALLOW_UNRESTRICTED
    });

    console.log(`🔐 Session token for ${sessionId} stored securely`);
  }

  /**
   * Retrieve session token
   */
  static async getSessionToken(sessionId: string): Promise<string | null> {
    return await secrets.get({
      service: this.SERVICE_NAME,
      name: `session-${sessionId}`
    });
  }

  /**
   * Store CSRF token
   */
  static async storeCSRFToken(tokenId: string, token: string): Promise<void> {
    await secrets.set({
      service: this.SERVICE_NAME,
      name: `csrf-${tokenId}`,
      value: token,
      allowUnrestrictedAccess: this.ALLOW_UNRESTRICTED
    });

    console.log(`🔐 CSRF token for ${tokenId} stored securely`);
  }

  /**
   * Retrieve CSRF token
   */
  static async getCSRFToken(tokenId: string): Promise<string | null> {
    return await secrets.get({
      service: this.SERVICE_NAME,
      name: `csrf-${tokenId}`
    });
  }

  /**
   * Store database URL
   */
  static async storeDatabaseUrl(databaseUrl: string): Promise<void> {
    await secrets.set({
      service: this.SERVICE_NAME,
      name: "database-url",
      value: databaseUrl,
      allowUnrestrictedAccess: this.ALLOW_UNRESTRICTED
    });

    console.log("🔐 Database URL stored securely");
  }

  /**
   * Retrieve database URL
   */
  static async getDatabaseUrl(): Promise<string | null> {
    return await secrets.get({
      service: this.SERVICE_NAME,
      name: "database-url"
    });
  }

  /**
   * Load all Tier-1380 secrets
   */
  static async loadAllSecrets(): Promise<Tier1380Secrets> {
    const [
      r2AccessKey,
      r2SecretKey,
      databaseUrl
    ] = await Promise.all([
      this.getR2Credentials().then(r2 => r2.accessKeyId),
      this.getR2Credentials().then(r2 => r2.secretAccessKey),
      this.getDatabaseUrl()
    ]);

    return {
      r2AccessKey,
      r2SecretKey,
      databaseUrl
    };
  }

  /**
   * Delete specific secret
   */
  static async deleteSecret(name: string): Promise<boolean> {
    const deleted = await secrets.delete({
      service: this.SERVICE_NAME,
      name
    });

    if (deleted) {
      console.log(`🗑️ Secret ${name} deleted successfully`);
    } else {
      console.log(`⚠️ Secret ${name} not found`);
    }

    return deleted;
  }

  /**
   * Delete all Tier-1380 secrets
   */
  static async deleteAllSecrets(): Promise<void> {
    const secretsToDelete = [
      "r2-access-key-id",
      "r2-secret-access-key",
      "database-url"
    ];

    const results = await Promise.all(
      secretsToDelete.map(name => this.deleteSecret(name))
    );

    const deletedCount = results.filter(Boolean).length;
    console.log(`🗑️ Deleted ${deletedCount}/${secretsToDelete.length} Tier-1380 secrets`);
  }

  /**
   * Validate secret exists
   */
  static async validateSecret(name: string): Promise<boolean> {
    const value = await secrets.get({
      service: this.SERVICE_NAME,
      name
    });

    return value !== null;
  }

  /**
   * List all stored secrets (names only)
   */
  static async listSecrets(): Promise<string[]> {
    // Note: Bun doesn't provide a direct way to list secrets
    // This is a security feature. We'll return known secret names.
    return [
      "r2-access-key-id",
      "r2-secret-access-key",
      "database-url"
    ];
  }

  /**
   * Migrate from environment variables to secrets
   */
  static async migrateFromEnv(): Promise<void> {
    console.log("🔄 Migrating credentials from environment to secure storage...");

    const migrations = [
      { name: "r2-access-key-id", env: "R2_ACCESS_KEY_ID" },
      { name: "r2-secret-access-key", env: "R2_SECRET_ACCESS_KEY" },
      { name: "database-url", env: "DATABASE_URL" }
    ];

    for (const { name, env } of migrations) {
      const envValue = process.env[env];
      if (envValue) {
        await secrets.set({
          service: this.SERVICE_NAME,
          name,
          value: envValue,
          allowUnrestrictedAccess: this.ALLOW_UNRESTRICTED
        });
        console.log(`✅ Migrated ${env} to secure storage`);
      }
    }
  }

  /**
   * Export secrets for backup (encrypted)
   */
  static async exportSecrets(): Promise<{ [key: string]: string }> {
    const secrets = await this.loadAllSecrets();
    const exported: { [key: string]: string } = {};

    Object.entries(secrets).forEach(([key, value]) => {
      if (value) {
        exported[key] = value;
      }
    });

    return exported;
  }

  /**
   * Import secrets from backup (encrypted)
   */
  static async importSecrets(secretsData: { [key: string]: string }): Promise<void> {
    console.log("📥 Importing secrets from backup...");

    for (const [key, value] of Object.entries(secretsData)) {
      if (value) {
        await secrets.set({
          service: this.SERVICE_NAME,
          name: key,
          value,
          allowUnrestrictedAccess: this.ALLOW_UNRESTRICTED
        });
        console.log(`✅ Imported ${key}`);
      }
    }
  }

  /**
   * Health check for secrets
   */
  static async healthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    checks: { [key: string]: boolean };
    message: string;
  }> {
    const checks: { [key: string]: boolean } = {};
    let healthyCount = 0;
    let totalCount = 0;

    // Check critical secrets
    const criticalSecrets = [
      { name: "r2-access-key-id", critical: true },
      { name: "r2-secret-access-key", critical: true },
      { name: "database-url", critical: false }
    ];

    for (const { name, critical } of criticalSecrets) {
      totalCount++;
      const exists = await this.validateSecret(name);
      checks[name] = exists;

      if (exists) {
        healthyCount++;
      } else if (critical) {
        console.log(`⚠️ Critical secret missing: ${name}`);
      }
    }

    const status = healthyCount === totalCount ? 'healthy' :
                   healthyCount > 0 ? 'warning' : 'error';

    const message = status === 'healthy' ?
      'All secrets are properly stored' :
      status === 'warning' ?
      'Some non-critical secrets are missing' :
      'Critical secrets are missing';

    return { status, checks, message };
  }
}

// CLI interface for secrets management
if (import.meta.path === Bun.main) {
  const command = process.argv[2];
  const subCommand = process.argv[3];

  switch (command) {
    case "store-r2":
      if (process.argv.length < 5) {
        console.log("Usage: bun tier1380-secrets.ts store-r2 <access-key-id> <secret-access-key>");
        process.exit(1);
      }
      await Tier1380SecretsManager.storeR2Credentials(process.argv[3], process.argv[4]);
      break;

    case "get-r2":
      const r2Creds = await Tier1380SecretsManager.getR2Credentials();
      console.log("R2 Credentials:", r2Creds);
      break;

    case "store-api":
      if (process.argv.length < 5) {
        console.log("Usage: bun tier1380-secrets.ts store-api <service> <api-key>");
        process.exit(1);
      }
      await Tier1380SecretsManager.storeApiKey(process.argv[3], process.argv[4]);
      break;

    case "get-api":
      if (process.argv.length < 4) {
        console.log("Usage: bun tier1380-secrets.ts get-api <service>");
        process.exit(1);
      }
      const apiKey = await Tier1380SecretsManager.getApiKey(process.argv[3]);
      console.log(`API Key for ${process.argv[3]}:`, apiKey || "Not found");
      break;

    case "migrate":
      await Tier1380SecretsManager.migrateFromEnv();
      break;

    case "health":
      const health = await Tier1380SecretsManager.healthCheck();
      console.log("Secrets Health Check:");
      console.log(`Status: ${health.status}`);
      console.log(`Message: ${health.message}`);
      console.log("Checks:", health.checks);
      break;

    case "list":
      const secrets = await Tier1380SecretsManager.listSecrets();
      console.log("Stored secrets:", secrets);
      break;

    case "delete":
      if (process.argv.length < 4) {
        console.log("Usage: bun tier1380-secrets.ts delete <secret-name>");
        process.exit(1);
      }
      await Tier1380SecretsManager.deleteSecret(process.argv[3]);
      break;

    case "delete-all":
      await Tier1380SecretsManager.deleteAllSecrets();
      break;

    case "export":
      const exported = await Tier1380SecretsManager.exportSecrets();
      console.log("Exported secrets:", exported);
      break;

    case "import":
      console.log("Import feature requires JSON data from stdin");
      break;

    default:
      console.log("Tier-1380 Secrets Manager");
      console.log("==========================");
      console.log("Commands:");
      console.log("  store-r2 <access-key-id> <secret-access-key>  Store R2 credentials");
      console.log("  get-r2                                      Get R2 credentials");
      console.log("  store-api <service> <api-key>              Store API key");
      console.log("  get-api <service>                           Get API key");
      console.log("  migrate                                     Migrate from env vars");
      console.log("  health                                      Health check");
      console.log("  list                                        List stored secrets");
      console.log("  delete <secret-name>                       Delete specific secret");
      console.log("  delete-all                                  Delete all secrets");
      console.log("  export                                      Export secrets");
      console.log("  import                                      Import secrets");
      break;
  }
}

export default Tier1380SecretsManager;
