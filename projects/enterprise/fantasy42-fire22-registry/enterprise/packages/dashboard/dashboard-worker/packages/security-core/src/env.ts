/**
 * @fire22/security-core/env - Secure Environment Management
 *
 * Multi-environment credential management with Fire22 integration
 */

import type { EnvironmentCredential, EnvironmentAuditResult, SecurityConfig } from './types';
import { Fire22SecureCredentialManager } from './secrets';

export class SecureEnvironmentManager {
  private credManager: Fire22SecureCredentialManager;

  private readonly environmentCredentials: EnvironmentCredential[] = [
    {
      name: 'DATABASE_URL',
      description: 'PostgreSQL connection string',
      required: true,
      sensitive: true,
      validation: /^postgresql:\/\/.+/,
      environments: ['development', 'staging', 'production'],
    },
    {
      name: 'FIRE22_API_TOKEN',
      description: 'Fire22 API authentication token',
      required: true,
      sensitive: true,
      validation: /^f22_[a-zA-Z0-9_]+/,
      environments: ['development', 'staging', 'production'],
    },
    {
      name: 'NODE_ENV',
      description: 'Runtime environment',
      required: true,
      sensitive: false,
      defaultValue: 'development',
      validation: /^(development|staging|production|test)$/,
      environments: ['development', 'staging', 'production'],
    },
  ];

  constructor(config?: SecurityConfig) {
    this.credManager = new Fire22SecureCredentialManager(config);
  }

  async setupEnvironment(env: string = 'development'): Promise<void> {
    for (const config of this.environmentCredentials) {
      if (config.sensitive) {
        await this.handleSensitiveVariable(config, env);
      }
    }
  }

  async loadEnvironment(env: string = 'development'): Promise<Record<string, string>> {
    const environment: Record<string, string> = {};

    for (const config of this.environmentCredentials) {
      if (config.sensitive) {
        const value = await this.credManager.getCredential(config.name.toLowerCase(), {
          environment: env,
        });
        if (value) {
          environment[config.name] = value;
        }
      } else {
        const value = process.env[config.name] || config.defaultValue;
        if (value) {
          environment[config.name] = value;
        }
      }
    }

    return environment;
  }

  async auditEnvironment(): Promise<EnvironmentAuditResult> {
    const issues: EnvironmentAuditResult['issues'] = [];

    // Check for .env files
    const envFiles = ['.env', '.env.production', '.env.staging'];
    for (const envFile of envFiles) {
      const file = Bun.file(envFile);
      if (await file.exists()) {
        issues.push({
          type: 'warning',
          credential: envFile,
          message: 'Environment file contains potential sensitive data',
          fix: 'Migrate to Bun.secrets using migrateFromEnv()',
        });
      }
    }

    return {
      environment: 'current',
      timestamp: new Date(),
      issues,
      summary: {
        total: issues.length,
        errors: issues.filter(i => i.type === 'error').length,
        warnings: issues.filter(i => i.type === 'warning').length,
        secure: this.environmentCredentials.length - issues.length,
      },
    };
  }

  private async handleSensitiveVariable(config: EnvironmentCredential, env: string): Promise<void> {
    const existing = await this.credManager.getCredential(config.name.toLowerCase(), {
      environment: env,
    });

    if (!existing && config.required) {
      // Generate demo value for testing
      const demoValue = this.generateDemoValue(config.name, env);
      await this.credManager.storeCredential(
        config.name.toLowerCase(),
        demoValue,
        config.description,
        env
      );
    }
  }

  private generateDemoValue(name: string, env: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);

    switch (name) {
      case 'DATABASE_URL':
        return `postgresql://fire22_${env}:secure_${random}@localhost:5432/fire22_${env}`;
      case 'FIRE22_API_TOKEN':
        return `f22_${env}_api_${timestamp}_${random}`;
      default:
        return `${name.toLowerCase()}_${env}_${random}`;
    }
  }
}
