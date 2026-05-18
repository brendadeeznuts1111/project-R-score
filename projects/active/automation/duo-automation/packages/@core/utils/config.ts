// utils/config.ts - Centralized configuration management
/**
 * Configuration management for Empire Pro Dashboard System
 * Replaces hardcoded paths and settings with configurable options
 */

export interface DashboardConfig {
  // R2 Storage
  r2: {
    bucket: string;
    endpoint: string;
    region: string;
  };
  
  // Grafana
  grafana: {
    url: string;
    apiKey: string;
    dashboardFolder: string;
  };
  
  // Notifications
  notifications: {
    slack: {
      webhookUrl: string;
      channel: string;
    };
    email: {
      smtp: {
        host: string;
        port: number;
        secure: boolean;
      };
      from: string;
    };
  };
  
  // Paths
  paths: {
    dashboards: string;
    assets: string;
    grafana: string;
    temp: string;
  };
  
  // Retry & Timeout settings
  retry: {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
  };
  
  // Performance thresholds
  thresholds: {
    deployTimeout: number;
    grafanaTimeout: number;
    notificationTimeout: number;
  };
}

function loadConfig(): DashboardConfig {
  const env = process.env;
  const parseNum = (val: string | undefined, def: number) => val ? parseInt(val, 10) : def;
  const parseBool = (val: string | undefined, def: boolean) => val ? val === 'true' : def;

  return {
    r2: {
      bucket: env.R2_BUCKET || 'empire-pro-dashboards',
      endpoint: env.R2_ENDPOINT || 'https://r2.cloudflarestorage.com',
      region: env.R2_REGION || 'auto'
    },
    
    grafana: {
      url: env.GRAFANA_URL || 'http://localhost:3000',
      apiKey: env.GRAFANA_API_KEY || '',
      dashboardFolder: env.GRAFANA_FOLDER || 'Empire Pro'
    },
    
    notifications: {
      slack: {
        webhookUrl: env.SLACK_WEBHOOK_URL || '',
        channel: env.SLACK_CHANNEL || '#dashboard-alerts'
      },
      email: {
        smtp: {
          host: env.SMTP_HOST || '',
          port: parseNum(env.SMTP_PORT, 587),
          secure: parseBool(env.SMTP_SECURE, false)
        },
        from: env.EMAIL_FROM || 'dashboard@empire-pro.com'
      }
    },
    
    paths: {
      dashboards: env.DASHBOARD_PATH || './demos',
      assets: env.ASSETS_PATH || './assets',
      grafana: env.GRAFANA_PATH || './demos/grafana',
      temp: env.TEMP_PATH || './temp'
    },
    
    retry: {
      maxAttempts: parseNum(env.RETRY_MAX_ATTEMPTS, 3),
      baseDelay: parseNum(env.RETRY_BASE_DELAY, 1000),
      maxDelay: parseNum(env.RETRY_MAX_DELAY, 10000)
    },
    
    thresholds: {
      deployTimeout: parseNum(env.DEPLOY_TIMEOUT, 30000),
      grafanaTimeout: parseNum(env.GRAFANA_TIMEOUT, 10000),
      notificationTimeout: parseNum(env.NOTIFICATION_TIMEOUT, 5000)
    }
  };
}

export const config = loadConfig();

// Validation helper
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const env = process.env;
  
  // Check R2 configuration
  if (!env.R2_BUCKET) errors.push('R2 bucket is required');
  if (!env.R2_ENDPOINT) errors.push('R2 endpoint is required');
  
  // Check Grafana configuration (only required if not localhost)
  const grafanaUrl = env.GRAFANA_URL || 'http://localhost:3000';
  if (grafanaUrl !== 'http://localhost:3000') {
    if (!env.GRAFANA_API_KEY) {
      errors.push('Grafana API key is required for production');
    }
  }
  
  // Check notification configuration
  if (!env.SLACK_WEBHOOK_URL && !env.SMTP_HOST) {
    errors.push('At least one notification channel must be configured');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}