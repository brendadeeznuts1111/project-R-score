import { secrets } from 'bun';

export interface SecureConfig {
  BOT_TOKEN: string;
  CASHIER_BOT_TOKEN: string;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
}

export class ConfigManager {
  private serviceName = 'fire22-dashboard';

  async setConfig(config: Partial<SecureConfig>) {
    for (const [key, value] of Object.entries(config)) {
      if (value) {
        await secrets.set({
          service: this.serviceName,
          name: key,
          value: value.toString(),
        });
        console.log(`✓ Securely stored ${key}`);
      }
    }
  }

  async getConfig(): Promise<Partial<SecureConfig>> {
    const keys: (keyof SecureConfig)[] = [
      'BOT_TOKEN',
      'CASHIER_BOT_TOKEN',
      'ADMIN_USERNAME',
      'ADMIN_PASSWORD',
    ];

    const config: Partial<SecureConfig> = {};

    for (const key of keys) {
      const secret = await secrets.get({
        service: this.serviceName,
        name: key,
      });

      if (secret) {
        config[key] = secret.value;
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
    ];

    for (const key of keys) {
      await secrets.delete({
        service: this.serviceName,
        name: key,
      });
    }

    console.log('✓ All credentials cleared from secure storage');
  }
}

// Initialize secure configuration
export const configManager = new ConfigManager();
