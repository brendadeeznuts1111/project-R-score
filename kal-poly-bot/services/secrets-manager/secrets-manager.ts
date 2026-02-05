#!/usr/bin/env bun

import { secrets } from "bun";
import { parseArgs } from "util";

export interface SecretMetadata {
  service: string;
  name: string;
  environment: 'development' | 'staging' | 'production';
  team: string;
  scope: string;
  description?: string;
  lastAccessed?: number;
  createdAt: number;
  teamMember: string;
}

export interface AuditLogEntry {
  timestamp: number;
  team: string;
  secretName: string;
  action: 'get' | 'set' | 'delete' | 'rotate' | 'access';
  teamMember: string;
  environment: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Automated Governance Engine for Secrets Management
 */
export class AutomatedGovernanceEngine {
  private auditLogs: AuditLogEntry[] = [];

  /**
   * Evaluate access policy for secret operations
   */
  async evaluatePolicy(
    operation: string,
    context: {
      team: string;
      secretName: string;
      environment: string;
      requireMFA?: boolean;
    }
  ): Promise<boolean> {
    const { team, secretName, environment, requireMFA } = context;

    // Security team requires MFA for all operations
    if (team === 'security' && requireMFA !== true) {
      console.warn(`🚨 MFA required for security team operations`);
      return false;
    }

    // Production secrets require additional validation
    if (environment === 'production' && operation !== 'get') {
      console.warn(`🚨 Production modifications require approval`);
      return false; // Would integrate with approval workflow
    }

    // Quantum keys are restricted to security team only
    if (secretName.includes('quantum') && team !== 'security') {
      console.warn(`🚨 Quantum keys restricted to security team`);
      return false;
    }

    return true;
  }

  /**
   * Log audit event
   */
  async logAuditEvent(
    event: string,
    context: {
      service?: string;
      name?: string;
      team: string;
      environment: string;
      teamMember?: string;
      success?: boolean;
    },
    coordinator?: ComponentCoordinator
  ): Promise<void> {
    const auditEntry: AuditLogEntry = {
      timestamp: Date.now(),
      team: context.team,
      secretName: context.name || '',
      action: event.replace('secrets.', '') as any,
      teamMember: context.teamMember || 'system',
      environment: context.environment,
      success: context.success !== false,
    };

    this.auditLogs.push(auditEntry);

    // In production, this would write to secure audit log
    console.log(`📊 [AUDIT] ${auditEntry.action} ${context.team}/${context.name} by ${auditEntry.teamMember}`);

    // Inform coordinator if available
    if (coordinator) {
      coordinator.updateComponentStatus('secrets-manager', {
        healthMetrics: {
          responseTime: 0,
          errorRate: auditEntry.success ? 0 : 1,
          resourceUsage: { cpu: 0, memory: 0 }
        }
      });
    }

    // Keep only last 1000 entries in memory (production would use persistent storage)
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(-1000);
    }
  }

  /**
   * Get audit logs for a team
   */
  async getAuditLogs(eventType?: string, team?: string): Promise<AuditLogEntry[]> {
    let logs = this.auditLogs;

    if (eventType) {
      logs = logs.filter(log => log.action === eventType);
    }

    if (team) {
      logs = logs.filter(log => log.team === team);
    }

    return logs.slice(-50); // Last 50 entries
  }
}

import { ComponentCoordinator } from '../../operation_surgical_precision/PrecisionOperationBootstrapCoordinator';

/**
 * Enterprise Secrets Manager with OS-level encryption and governance
 */
export class BunSecretsManager {
  private governance: AutomatedGovernanceEngine;
  private baseService = 'com.brendadeeznuts1111.surgical-precision';
  private cache = new Map<string, { value: string; expires: number }>();
  private coordinator?: ComponentCoordinator;

  constructor(
    governance: AutomatedGovernanceEngine,
    coordinator?: ComponentCoordinator
  ) {
    this.governance = governance;
    this.coordinator = coordinator;
  }

  /**
   * Get secret with enhanced security and caching
   */
  async getSecret(
    team: string,
    secretName: string,
    options: {
      env?: 'development' | 'staging' | 'production';
      requireMFA?: boolean;
      skipCache?: boolean;
    } = {}
  ): Promise<string | null> {
    const env = options.env || this.getCurrentEnvironment();
    const service = this.buildServiceName(team, env, options.requireMFA);
    const cacheKey = `${service}:${secretName}`;

    // Check governance policy
    const isAllowed = await this.governance.evaluatePolicy('secrets.access', {
      team,
      secretName,
      environment: env,
      requireMFA: options.requireMFA,
    });

    if (!isAllowed) {
      await this.governance.logAuditEvent('secrets.access', {
        service,
        name: secretName,
        team,
        environment: env,
        success: false,
      }, this.coordinator);
      throw new Error(`Access denied to secret: ${secretName} for team ${team}`);
    }

    // Check memory cache (5 minutes)
    if (!options.skipCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        await this.governance.logAuditEvent('secrets.access', {
          service,
          name: secretName,
          team,
          environment: env,
          success: true,
        }, this.coordinator);
        return cached.value;
      }
    }

    // Try Bun.secrets (local OS credential store)
    try {
      const value = await secrets.get({ service, name: secretName });

      if (value) {
        // Update cache
        this.cache.set(cacheKey, {
          value,
          expires: Date.now() + 5 * 60 * 1000, // 5 minutes
        });

        // Audit log
        await this.governance.logAuditEvent('secrets.accessed', {
          service,
          name: secretName,
          team,
          environment: env,
          success: true,
        }, this.coordinator);

        return value;
      }
    } catch (error: unknown) {
      console.warn(`Bun.secrets failed for ${service}:${secretName}:`, (error as Error).message);
    }

    // Fallback to environment variables (for CI/CD)
    const envValue = this.tryEnvironmentFallback(team, secretName, env);

    if (envValue) {
      console.log(`[Secrets] Using env fallback: ${secretName}`);

      // Optionally store in Bun.secrets for future use (development only)
      if (env === 'development') {
        await this.setSecret(team, secretName, envValue, { env, skipAudit: true });
      }

      return envValue;
    }

    // Final fallback to Vault (for production)
    if (env === 'production') {
      return await this.getFromVault(team, secretName);
    }

    return null;
  }

  /**
   * Set secret with governance and metadata
   */
  async setSecret(
    team: string,
    secretName: string,
    value: string,
    options: {
      env?: 'development' | 'staging' | 'production';
      description?: string;
      skipAudit?: boolean;
    } = {}
  ): Promise<void> {
    const env = options.env || this.getCurrentEnvironment();
    const service = this.buildServiceName(team, env);

    // Validate secret value
    if (!value || value.length > 4096) {
      throw new Error('Invalid secret: must be 1-4096 characters');
    }

    // Set in Bun.secrets (OS credential store)
    try {
      await secrets.set({
        service,
        name: secretName
      }, value);
    } catch (error: unknown) {
      throw new Error(`Failed to store secret: ${(error as Error).message}`);
    }

    // Clear cache
    const cacheKey = `${service}:${secretName}`;
    this.cache.delete(cacheKey);

    // Store metadata (in production, this would be in Redis/database)
    const metadata: SecretMetadata = {
      service,
      name: secretName,
      environment: env,
      team,
      scope: this.getScopeForSecret(secretName),
      description: options.description,
      createdAt: Date.now(),
      teamMember: this.getCurrentTeamMember(),
    };

    // Audit log
    if (!options.skipAudit) {
      await this.governance.logAuditEvent('secrets.created', {
        service,
        name: secretName,
        team,
        environment: env,
        success: true,
      }, this.coordinator);
    }

    console.log(`🔒 Secret stored: ${team}/${secretName} (${env})`);
  }

  /**
   * Delete secret
   */
  async deleteSecret(
    team: string,
    secretName: string,
    options: { env?: string } = {}
  ): Promise<boolean> {
    const env = options.env || this.getCurrentEnvironment();
    const service = this.buildServiceName(team, env);

    try {
      const deleted = await secrets.delete({ service, name: secretName });
      const cacheKey = `${service}:${secretName}`;
      this.cache.delete(cacheKey);

      if (deleted) {
        await this.governance.logAuditEvent('secrets.deleted', {
          service,
          name: secretName,
          team,
          environment: env,
          success: true,
        }, this.coordinator);
        console.log(`🗑️ Secret deleted: ${team}/${secretName}`);
      }

      return deleted;
    } catch (error: unknown) {
      console.error(`Failed to delete secret: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * List secrets (limited by Bun.secrets API constraints)
   */
  async listSecrets(team: string, env?: string): Promise<string[]> {
    console.warn("Bun.secrets doesn't support listing - this is a known limitation");
    console.warn("Consider maintaining a separate index for full secret enumeration");
    return []; // Would need external index
  }

  /**
   * Rotate secret with version tracking
   */
  async rotateSecret(
    team: string,
    secretName: string,
    newValue: string,
    options: { retainOldForDays?: number } = {}
  ): Promise<{ oldVersion: string; newVersion: string }> {
    const env = this.getCurrentEnvironment();
    const service = this.buildServiceName(team, env);

    // Get current value
    const oldValue = await this.getSecret(team, secretName);
    if (!oldValue) {
      throw new Error('Secret not found for rotation');
    }

    // Store old version with timestamp (simulate version control)
    const rotationTimestamp = Date.now();
    console.log(`🔄 Rotating secret: ${secretName} (${rotationTimestamp})`);

    // Set new value
    await this.setSecret(team, secretName, newValue, { skipAudit: true });

    // Audit rotation
    await this.governance.logAuditEvent('secrets.rotated', {
      service,
      name: secretName,
      team,
      environment: env,
      success: true,
    }, this.coordinator);

    return {
      oldVersion: `${rotationTimestamp}`,
      newVersion: 'current',
    };
  }

  /**
   * Check if secret exists
   */
  async hasSecret(team: string, secretName: string, env?: 'development' | 'staging' | 'production'): Promise<boolean> {
    const value = await this.getSecret(team, secretName, { env });
    return value !== null;
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(eventType?: string, team?: string): Promise<AuditLogEntry[]> {
    return await this.governance.getAuditLogs(eventType, team);
  }

  // Private helper methods

  private buildServiceName(
    team: string,
    env: string,
    requireMFA = false
  ): string {
    const base = `${this.baseService}.${env}.${team}`;
    return requireMFA ? `${base}.2fa-required` : base;
  }

  private convertToEnvKey(
    team: string,
    secretName: string,
    env: string
  ): string {
    return `SECRETS_${env.toUpperCase()}_${team.toUpperCase()}_${secretName.toUpperCase()}`;
  }

  private tryEnvironmentFallback(
    team: string,
    secretName: string,
    env: string
  ): string | null {
    const envKey = this.convertToEnvKey(team, secretName, env);
    return Bun.env[envKey] || null;
  }

  private getCurrentEnvironment(): 'development' | 'staging' | 'production' {
    const env = Bun.env.NODE_ENV;
    if (env === 'development' || env === 'staging' || env === 'production') {
      return env;
    }
    return 'development';
  }

  private getCurrentTeamMember(): string {
    // In production, this would get from authentication context
    return Bun.env.SERO_TEAM_MEMBER || 'unknown';
  }

  private getScopeForSecret(secretName: string): string {
    if (secretName.includes('token') || secretName.includes('api_key')) return 'authentication';
    if (secretName.includes('key') && !secretName.includes('public')) return 'encryption';
    if (secretName.includes('password') || secretName.includes('secret')) return 'credentials';
    if (secretName.includes('api') || secretName.includes('webhook')) return 'integration';
    if (secretName.includes('quantum') || secretName.includes('crypto')) return 'cryptographic';
    return 'general';
  }

  private async getFromVault(team: string, secretName: string): Promise<string | null> {
    const maxRetries = 3;
    const baseDelay = 1000; // ms

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const vaultAddr = Bun.env.VAULT_ADDR;
        const vaultToken = Bun.env.VAULT_TOKEN;

        if (!vaultAddr || !vaultToken) {
          throw new Error('Vault configuration missing');
        }

        // Use Bun-native fetch with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(
          `${vaultAddr}/v1/secret/data/surgical-precision/${team}/${secretName}`,
          {
            headers: {
              'X-Vault-Token': vaultToken,
              'Content-Type': 'application/json'
            },
            signal: controller.signal
          }
        );

        clearTimeout(timeoutId);

        if (response.status === 404) {
          // Secret doesn't exist in Vault
          return null;
        }

        if (!response.ok) {
          throw new Error(`Vault HTTP ${response.status}: ${await response.text()}`);
        }

        const data = await response.json() as any;

        // Validate response structure
        if (!data?.data?.data?.value) {
          throw new Error('Invalid Vault response structure');
        }

        // Cache in Redis with shorter TTL for production secrets
        // Note: Redis integration would need to be added to the class
        // await this.redis.setex(
        //   `secrets:vault:${team}:${secretName}`,
        //   300, // 5 minutes for production secrets
        //   data.data.data.value
        // );

        return data.data.data.value;

      } catch (error: unknown) {
        if (attempt === maxRetries) {
          console.error(`[Vault] Failed after ${maxRetries} attempts:`, (error as Error).message);

          // Check Redis for stale cache as last resort
          // Note: Redis integration would need to be added
          // const staleCache = await this.redis.get(`secrets:vault:${team}:${secretName}`);
          // if (staleCache) {
          //   console.warn(`[Vault] Using stale cache for ${team}/${secretName}`);
          //   return staleCache;
          // }

          return null;
        }

        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(`[Vault] Attempt ${attempt} failed, retrying in ${delay}ms:`, (error as Error).message);
        await Bun.sleep(delay);
      }
    }

    return null;
  }
}

/**
 * CLI Interface for the Secrets Manager
 */
async function main() {
  const args = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      command: {
        type: "string",
        short: "c",
      },
      team: {
        type: "string",
        short: "t",
      },
      name: {
        type: "string",
        short: "n",
      },
      value: {
        type: "string",
        short: "v",
      },
      help: {
        type: "boolean",
        short: "h",
      },
    },
  });

  if (args.values.help || !args.values.command) {
    console.log(`
🔐 SERO Secrets Manager CLI

Usage: secrets-manager.ts --command <command> [options]

Commands:
  get     Get a secret value
  set     Set a secret value
  delete  Delete a secret
  has     Check if secret exists

Options:
  --team, -t    Team name (e.g., 'engineering')
  --name, -n    Secret name (e.g., 'github_token')
  --value, -v   Secret value (for set command)
  --help, -h    Show this help

Examples:
  bun run cli/secrets-manager.ts --command set --team engineering --name github_token --value ghp_xxxxx
  bun run cli/secrets-manager.ts --command get --team engineering --name github_token
  bun run cli/secrets-manager.ts --command delete --team engineering --name github_token
    `);
    process.exit(0);
  }

  const { command, team, name, value } = args.values;

  if (!team || !name) {
    console.error("❌ Team and name are required");
    process.exit(1);
  }

  const manager = new BunSecretsManager(new AutomatedGovernanceEngine());

  try {
    switch (command.toLowerCase()) {
      case "get": {
        const secret = await manager.getSecret(team, name);
        if (secret) {
          console.log(secret);
        } else {
          console.error(`❌ Secret ${team}/${name} not found`);
          process.exit(1);
        }
        break;
      }

      case "set": {
        if (!value) {
          console.error("❌ Value is required for set command");
          process.exit(1);
        }
        await manager.setSecret(team, name, value);
        break;
      }

      case "delete": {
        await manager.deleteSecret(team, name);
        break;
      }

      case "has": {
        const exists = await manager.hasSecret(team, name);
        console.log(exists ? "✅ Secret exists" : "❌ Secret not found");
        break;
      }

      default:
        console.error(`❌ Unknown command: ${command}`);
        console.error("Use --help for available commands");
        process.exit(1);
    }
  } catch (error: unknown) {
    console.error("❌ Operation failed:", (error as Error).message);
    process.exit(1);
  }
}

/**
 * Contained Secrets Manager - Error Isolation for Security
 * Prevents external error leakage while maintaining internal audit trails
 */
export class ContainedSecretsManager extends BunSecretsManager {
  private errorQuarantine = new Map<string, { error: string; team: string; secretName: string; timestamp: number; stack?: string }>();

  override async getSecret(
    team: string,
    secretName: string,
    options: { env?: 'development' | 'staging' | 'production'; requireMFA?: boolean; skipCache?: boolean } = {}
  ): Promise<string | null> {
    try {
      return await super.getSecret(team, secretName, options);
    } catch (error) {
      // Contained error handling - no external leakage
      const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const errorData = {
        error: error instanceof Error ? error.message : 'Unknown error',
        team,
        secretName,
        timestamp: Date.now(),
        stack: error instanceof Error ? error.stack : undefined
      };

      this.errorQuarantine.set(errorId, errorData);

      // Internal logging only (production would use secure logging system)
      console.warn(`[Contained] Error quarantined: ${errorId} - ${errorData.error}`);

      // Return null instead of throwing - no external error leakage
      return null;
    }
  }
}

// Export singleton instances
export const secretsManager = new BunSecretsManager(new AutomatedGovernanceEngine());
export const containedSecretsManager = new ContainedSecretsManager(new AutomatedGovernanceEngine());

// Export legacy class for backward compatibility
export const SecretsManager = BunSecretsManager;

// Run CLI if this file is executed directly
if (import.meta.main) {
  main();
}
