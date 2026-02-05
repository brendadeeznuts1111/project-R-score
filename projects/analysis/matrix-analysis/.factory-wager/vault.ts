#!/usr/bin/env bun
/**
 * FactoryWager Vault
 * Secure credential management with Bun.secrets
 */

interface VaultCredential {
  name: string;
  service: string;
  key: string;
  healthy: boolean;
  lastChecked?: Date;
}

interface HealthCheckResult {
  healthy: boolean;
  credentials: VaultCredential[];
  timestamp: Date;
}

export class FactoryWagerVault {
  private credentials: Map<string, VaultCredential> = new Map();

  constructor() {
    // Initialize default credentials
    this.credentials.set("registry.token", {
      name: "registry.token",
      service: "com.factory-wager.registry",
      key: "token",
      healthy: false
    });
    this.credentials.set("r2.secret_key", {
      name: "r2.secret_key",
      service: "com.factory-wager.r2",
      key: "secret_key",
      healthy: false
    });
    this.credentials.set("domain.ssl_cert", {
      name: "domain.ssl_cert",
      service: "com.factory-wager.ssl",
      key: "certificate",
      healthy: false
    });
  }

  /**
   * Check health of all vault credentials
   */
  async healthCheck(options: { demo?: boolean } = {}): Promise<HealthCheckResult> {
    const results: VaultCredential[] = [];
    let allHealthy = true;

    // Demo mode for presentation
    if (options.demo) {
      for (const [name, cred] of this.credentials) {
        cred.healthy = true;
        cred.lastChecked = new Date();
        console.log(`✅ ${name}`);
        results.push({ ...cred });
      }
      console.log(`🔐 All vault credentials healthy`);
      return {
        healthy: true,
        credentials: results,
        timestamp: new Date()
      };
    }

    for (const [name, cred] of this.credentials) {
      try {
        const value = await Bun.secrets.get({
          service: cred.service,
          name: cred.key
        });

        cred.healthy = value !== null && value.length > 0;
        cred.lastChecked = new Date();

        const status = cred.healthy ? "✅" : "❌";
        console.log(`${status} ${name}`);
      } catch (error) {
        cred.healthy = false;
        cred.lastChecked = new Date();
        allHealthy = false;
        console.log(`❌ ${name}`);
      }

      results.push({ ...cred });
      if (!cred.healthy) allHealthy = false;
    }

    const emoji = allHealthy ? "🔐" : "⚠️";
    const message = allHealthy ? "All vault credentials healthy" : "Some credentials missing";
    console.log(`${emoji} ${message}`);

    return {
      healthy: allHealthy,
      credentials: results,
      timestamp: new Date()
    };
  }

  /**
   * Get a credential from the vault
   */
  async getCredential(name: string): Promise<string | null> {
    const cred = this.credentials.get(name);
    if (!cred) return null;

    try {
      return await Bun.secrets.get({
        service: cred.service,
        name: cred.key
      });
    } catch {
      return null;
    }
  }

  /**
   * Store a credential in the vault
   */
  async setCredential(name: string, value: string): Promise<void> {
    const cred = this.credentials.get(name);
    if (!cred) {
      throw new Error(`Unknown credential: ${name}`);
    }

    await Bun.secrets.set({
      service: cred.service,
      name: cred.key,
      value
    });

    cred.healthy = true;
    cred.lastChecked = new Date();
  }

  /**
   * List all vault credentials
   */
  listCredentials(): VaultCredential[] {
    return Array.from(this.credentials.values());
  }
}

// CLI
if (import.meta.main) {
  const vault = new FactoryWagerVault();
  const command = Bun.argv[2];

  switch (command) {
    case "health":
    case "check":
      await vault.healthCheck();
      break;
    case "list":
      console.log("Vault credentials:");
      for (const cred of vault.listCredentials()) {
        console.log(`  • ${cred.name} (${cred.service})`);
      }
      break;
    default:
      console.log("FactoryWager Vault");
      console.log("Usage: vault.ts <health|list>");
      break;
  }
}
