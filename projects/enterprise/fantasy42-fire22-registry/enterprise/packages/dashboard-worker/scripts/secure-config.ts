import { secrets } from 'bun';

export interface SecureConfig {
  BOT_TOKEN: string;
  CASHIER_BOT_TOKEN: string;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
  JWT_SECRET: string;
  DATABASE_URL: string;
  FIRE22_API_KEY: string;
}

export class ConfigManager {
  private serviceName = 'fire22-dashboard';

  async setConfig(config: Partial<SecureConfig>) {
    const results: Record<string, boolean> = {};

    for (const [key, value] of Object.entries(config)) {
      if (value) {
        try {
          await secrets.set({
            service: this.serviceName,
            name: key,
            value: value.toString(),
          });
          console.log(`✓ Securely stored ${key}`);
          results[key] = true;
        } catch (error) {
          console.error(`✗ Failed to store ${key}:`, error);
          results[key] = false;
        }
      }
    }

    return results;
  }

  async getConfig(): Promise<Partial<SecureConfig>> {
    const keys: (keyof SecureConfig)[] = [
      'BOT_TOKEN',
      'CASHIER_BOT_TOKEN',
      'ADMIN_USERNAME',
      'ADMIN_PASSWORD',
      'JWT_SECRET',
      'DATABASE_URL',
      'FIRE22_API_KEY',
    ];

    const config: Partial<SecureConfig> = {};

    for (const key of keys) {
      try {
        const secret = await secrets.get({
          service: this.serviceName,
          name: key,
        });

        if (secret) {
          config[key] = secret;
        }
      } catch (error) {
        // Fall back to environment variables if secrets not available
        const envValue = process.env[key];
        if (envValue) {
          config[key] = envValue;
        }
      }
    }

    return config;
  }

  async clearConfig() {
    const keys: (keyof SecureConfig)[] = [
      'BOT_TOKEN',
      'CASHIER_BOT_TOKEN',
      'ADMIN_USERNAME',
      'ADMIN_PASSWORD',
      'JWT_SECRET',
      'DATABASE_URL',
      'FIRE22_API_KEY',
    ];

    for (const key of keys) {
      try {
        await secrets.delete({
          service: this.serviceName,
          name: key,
        });
      } catch (error) {
        console.warn(`Could not delete ${key}:`, error);
      }
    }

    console.log('✓ All credentials cleared from secure storage');
  }

  async validateConfig(): Promise<{
    valid: boolean;
    missing: string[];
    warnings: string[];
  }> {
    const config = await this.getConfig();
    const missing: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    const required = ['BOT_TOKEN', 'JWT_SECRET', 'DATABASE_URL'];
    for (const key of required) {
      if (!config[key as keyof SecureConfig]) {
        missing.push(key);
      }
    }

    // Security checks
    if (config.JWT_SECRET && config.JWT_SECRET.length < 32) {
      warnings.push('JWT_SECRET should be at least 32 characters long');
    }

    if (config.ADMIN_PASSWORD && config.ADMIN_PASSWORD.length < 8) {
      warnings.push('ADMIN_PASSWORD should be at least 8 characters long');
    }

    return {
      valid: missing.length === 0,
      missing,
      warnings,
    };
  }
}

// Initialize secure configuration
export const configManager = new ConfigManager();

// CLI handling for --clear flag
if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.includes('--clear')) {
    configManager
      .clearConfig()
      .then(() => {
        console.log('✅ Credentials cleared successfully');
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Failed to clear credentials:', error.message);
        process.exit(1);
      });
  }
}
