#!/usr/bin/env bun

/**
 * Universal Configuration Manager - Bun Secrets Only
 * ALL configuration stored in Bun Secrets - no files, no env vars
 */

import { secrets } from "bun";

interface UniversalConfig {
  // R2 Configuration
  R2_ENDPOINT: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET: string;
  R2_REGION: string;
  
  // API Keys
  OPENAI_API_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_PUBLISHABLE_KEY: string;
  
  // Database
  DATABASE_URL: string;
  REDIS_URL: string;
  
  // External Services
  GOOGLE_MAPS_API_KEY: string;
  TWILIO_API_KEY: string;
  TWILIO_AUTH_TOKEN: string;
  
  // Application Settings
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;
  
  // Development/Production
  NODE_ENV: string;
  LOG_LEVEL: string;
}

class SecretsOnlyConfigManager {
  private service = "empire-pro-config-empire";
  
  /**
   * Get ALL configuration from Bun Secrets
   * No fallback to environment variables or files
   */
  async getAllConfig(): Promise<Partial<UniversalConfig>> {
    const config: Partial<UniversalConfig> = {};
    
    const requiredKeys: (keyof UniversalConfig)[] = [
      'R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_REGION',
      'OPENAI_API_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY',
      'DATABASE_URL', 'REDIS_URL',
      'GOOGLE_MAPS_API_KEY', 'TWILIO_API_KEY', 'TWILIO_AUTH_TOKEN',
      'JWT_SECRET', 'ENCRYPTION_KEY',
      'NODE_ENV', 'LOG_LEVEL'
    ];
    
    console.log('🔐 Loading ALL configuration from Bun Secrets...');
    console.log(`Service: ${this.service}`);
    console.log('='.repeat(60));
    
    let missingCount = 0;
    let foundCount = 0;
    
    for (const key of requiredKeys) {
      const value = await secrets.get({ service: this.service, name: key });
      
      if (value) {
        config[key] = value;
        if (key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN')) {
          console.log(`✅ ${key}: ${value.substring(0, 8)}...${value.substring(value.length - 4)}`);
        } else {
          console.log(`✅ ${key}: ${value}`);
        }
        foundCount++;
      } else {
        console.log(`❌ ${key}: NOT FOUND IN SECRETS`);
        missingCount++;
      }
    }
    
    console.log('='.repeat(60));
    console.log(`📊 Summary: ${foundCount}/${requiredKeys.length} secrets found`);
    
    if (missingCount > 0) {
      console.log(`\n⚠️ ${missingCount} required secrets missing`);
      console.log('🔒 ALL configuration must be stored in Bun Secrets');
      console.log('💡 Run: bun run secrets-setup-all to configure everything');
    }
    
    return config;
  }
  
  /**
   * Get specific configuration value
   */
  async getConfig(key: keyof UniversalConfig): Promise<string | null> {
    const value = await secrets.get({ service: this.service, name: key });
    
    if (!value) {
      console.log(`❌ Configuration '${key}' not found in Bun Secrets`);
      console.log('🔒 ALL configuration must be stored in Bun Secrets');
      return null;
    }
    
    return value;
  }
  
  /**
   * Set configuration value
   */
  async setConfig(key: keyof UniversalConfig, value: string): Promise<void> {
    await secrets.set({
      service: this.service,
      name: key,
      value: value
    });
    console.log(`✅ Stored ${key} in Bun Secrets`);
  }
  
  /**
   * Check if all required configuration is available
   */
  async validateConfig(): Promise<boolean> {
    const config = await this.getAllConfig();
    const requiredKeys: (keyof UniversalConfig)[] = [
      'R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET',
      'DATABASE_URL', 'JWT_SECRET'
    ];
    
    const missing = requiredKeys.filter(key => !config[key]);
    
    if (missing.length > 0) {
      console.log(`❌ Missing required configuration: ${missing.join(', ')}`);
      console.log('🔒 ALL configuration must be stored in Bun Secrets');
      return false;
    }
    
    console.log('✅ All required configuration available in Bun Secrets');
    return true;
  }
  
  /**
   * Export configuration as environment variables (for CI/CD)
   */
  async exportAsEnv(): Promise<void> {
    const config = await this.getAllConfig();
    
    console.log('# 🌐 Configuration Export from Bun Secrets');
    console.log('# 🔒 All values loaded securely from OS credential manager');
    console.log('');
    
    Object.entries(config).forEach(([key, value]) => {
      console.log(`export ${key}="${value}"`);
    });
  }
  
  /**
   * Setup all configuration interactively
   */
  async setupAllConfig(): Promise<void> {
    console.log('🔐 Setting up ALL configuration in Bun Secrets');
    console.log('🚫 NO environment variables or config files used');
    console.log('🔒 Everything stored in OS credential manager');
    console.log('');
    
    const configDefaults: Record<keyof UniversalConfig, string> = {
      R2_ENDPOINT: 'https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com',
      R2_ACCESS_KEY_ID: '69765dd738766bca38be63e7d0192cf8',
      R2_SECRET_ACCESS_KEY: '1d9326ffb0c59ebecb612f401a87f71942574984375fb283fc4359630d7d929a',
      R2_BUCKET: 'factory-wager-packages',
      R2_REGION: 'auto',
      
      OPENAI_API_KEY: 'sk-your-openai-key',
      STRIPE_SECRET_KEY: 'sk_live_your-stripe-key',
      STRIPE_PUBLISHABLE_KEY: 'pk_live_your-stripe-key',
      
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      REDIS_URL: 'redis://localhost:6379',
      
      GOOGLE_MAPS_API_KEY: 'your-google-maps-key',
      TWILIO_API_KEY: 'your-twilio-key',
      TWILIO_AUTH_TOKEN: 'your-twilio-token',
      
      JWT_SECRET: 'your-jwt-secret-min-32-chars',
      ENCRYPTION_KEY: 'your-encryption-key-32-chars',
      
      NODE_ENV: 'development',
      LOG_LEVEL: 'info'
    };
    
    for (const [key, defaultValue] of Object.entries(configDefaults)) {
      process.stdout.write(`${key} [${defaultValue}]: `);
      
      const input = await new Promise<string>((resolve) => {
        process.stdin.once('data', (data) => resolve(data.toString().trim()));
      });
      
      const value = input || defaultValue;
      await this.setConfig(key as keyof UniversalConfig, value);
    }
    
    console.log('');
    console.log('✅ ALL configuration stored in Bun Secrets');
    console.log('🔒 Credentials encrypted by your operating system');
    console.log('🚫 No files created, no environment variables used');
  }
  
  /**
   * Delete all configuration
   */
  async deleteAllConfig(): Promise<void> {
    console.log('🗑️ Deleting ALL configuration from Bun Secrets...');
    
    const keys: (keyof UniversalConfig)[] = [
      'R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_REGION',
      'OPENAI_API_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY',
      'DATABASE_URL', 'REDIS_URL',
      'GOOGLE_MAPS_API_KEY', 'TWILIO_API_KEY', 'TWILIO_AUTH_TOKEN',
      'JWT_SECRET', 'ENCRYPTION_KEY',
      'NODE_ENV', 'LOG_LEVEL'
    ];
    
    for (const key of keys) {
      const deleted = await secrets.delete({ service: this.service, name: key });
      if (deleted) {
        console.log(`🗑️ Deleted ${key}`);
      }
    }
    
    console.log('✅ All configuration deleted from Bun Secrets');
  }
}

export { SecretsOnlyConfigManager };
export type { UniversalConfig };
