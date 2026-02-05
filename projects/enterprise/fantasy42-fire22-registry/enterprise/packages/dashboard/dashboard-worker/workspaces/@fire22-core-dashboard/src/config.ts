/**
 * Configuration Management
 * Centralized configuration for the dashboard worker
 */

import {
  getEnvVar,
  getEnvVarOptional,
  getEnvVarNumber,
  getEnvVarBoolean,
  validateRequiredEnvVars,
} from './env';

// Configuration interface
export interface AppConfig {
  // Database
  database: {
    name: string;
    id: string;
  };

  // Bot Configuration
  bot: {
    token: string;
    cashierToken: string;
  };

  // Fire22 Integration
  fire22: {
    apiUrl: string;
    token: string;
    webhookSecret: string;
  };

  // Authentication
  auth: {
    jwtSecret: string;
    adminPassword: string;
  };

  // Payment Gateway (Stripe)
  stripe: {
    secretKey: string;
    webhookSecret: string;
  };

  // Communication Services
  communication: {
    sendgridApiKey: string;
    twilioAccountSid: string;
    twilioAuthToken: string;
  };

  // System Configuration
  system: {
    cronSecret: string;
    nodeEnv: string;
    verboseFetch: boolean;
    maxHttpRequests: number;
  };
}

// Create configuration from environment variables
export function createConfig(): AppConfig {
  // Validate required environment variables
  const requiredVars = [
    'JWT_SECRET',
    'ADMIN_PASSWORD',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'SENDGRID_API_KEY',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'CRON_SECRET',
  ];

  validateRequiredEnvVars(requiredVars);

  return {
    database: {
      name: getEnvVarOptional('DATABASE_NAME') || 'fire22-dashboard',
      id: getEnvVarOptional('DATABASE_ID') || '35756984-dfe1-4914-b92e-511bdc8a194f',
    },

    bot: {
      token: getEnvVarOptional('BOT_TOKEN') || '',
      cashierToken: getEnvVarOptional('CASHIER_BOT_TOKEN') || '',
    },

    fire22: {
      apiUrl: getEnvVarOptional('FIRE22_API_URL') || 'https://api.fire22.com',
      token: getEnvVarOptional('FIRE22_TOKEN') || '',
      webhookSecret: getEnvVarOptional('FIRE22_WEBHOOK_SECRET') || '',
    },

    auth: {
      jwtSecret: getEnvVar('JWT_SECRET'),
      adminPassword: getEnvVar('ADMIN_PASSWORD'),
    },

    stripe: {
      secretKey: getEnvVar('STRIPE_SECRET_KEY'),
      webhookSecret: getEnvVar('STRIPE_WEBHOOK_SECRET'),
    },

    communication: {
      sendgridApiKey: getEnvVar('SENDGRID_API_KEY'),
      twilioAccountSid: getEnvVar('TWILIO_ACCOUNT_SID'),
      twilioAuthToken: getEnvVar('TWILIO_AUTH_TOKEN'),
    },

    system: {
      cronSecret: getEnvVar('CRON_SECRET'),
      nodeEnv: getEnvVarOptional('NODE_ENV') || 'development',
      verboseFetch: getEnvVarBoolean('BUN_CONFIG_VERBOSE_FETCH', false),
      maxHttpRequests: getEnvVarNumber('BUN_CONFIG_MAX_HTTP_REQUESTS', 256),
    },
  };
}

// Global configuration instance
let globalConfig: AppConfig | null = null;

// Get or create global configuration
export function getConfig(): AppConfig {
  if (!globalConfig) {
    globalConfig = createConfig();
  }
  return globalConfig;
}

// Reset global configuration (useful for testing)
export function resetConfig(): void {
  globalConfig = null;
}

// Configuration validation
export function validateConfig(config: AppConfig): string[] {
  const errors: string[] = [];

  // Validate database configuration
  if (!config.database.name) {
    errors.push('Database name is required');
  }

  // Validate bot configuration
  if (!config.bot.token) {
    errors.push('Bot token is required');
  }

  // Validate Fire22 configuration
  if (!config.fire22.token) {
    errors.push('Fire22 token is required');
  }

  // Validate Stripe configuration
  if (!config.stripe.secretKey.startsWith('sk_')) {
    errors.push('Invalid Stripe secret key format');
  }

  // Validate JWT secret
  if (config.auth.jwtSecret.length < 32) {
    errors.push('JWT secret must be at least 32 characters long');
  }

  return errors;
}

// Environment-specific configuration
export function getEnvironmentConfig(): Partial<AppConfig> {
  const config = getConfig();

  if (config.system.nodeEnv === 'development') {
    return {
      system: {
        ...config.system,
        verboseFetch: true, // Enable verbose fetch in development
      },
    };
  }

  if (config.system.nodeEnv === 'test') {
    return {
      system: {
        ...config.system,
        verboseFetch: false, // Disable verbose fetch in tests
      },
    };
  }

  return {};
}

// Export default configuration
export default getConfig;
