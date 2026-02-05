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
  return {
    r2: {
      bucket: process.env.R2_BUCKET || 'empire-pro-dashboards',
      endpoint: process.env.R2_ENDPOINT || 'https://r2.cloudflarestorage.com',
      region: process.env.R2_REGION || 'auto'
    },
    
    grafana: {
      url: process.env.GRAFANA_URL || 'http://localhost:3000',
      apiKey: process.env.GRAFANA_API_KEY || '',
      dashboardFolder: process.env.GRAFANA_FOLDER || 'Empire Pro'
    },
    
    notifications: {
      slack: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
        channel: process.env.SLACK_CHANNEL || '#dashboard-alerts'
      },
      email: {
        smtp: {
          host: process.env.SMTP_HOST || '',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true'
        },
        from: process.env.EMAIL_FROM || 'dashboard@empire-pro.com'
      }
    },
    
    paths: {
      dashboards: process.env.DASHBOARD_PATH || './demos',
      assets: process.env.ASSETS_PATH || './assets',
      grafana: process.env.GRAFANA_PATH || './demos/grafana',
      temp: process.env.TEMP_PATH || './temp'
    },
    
    retry: {
      maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3'),
      baseDelay: parseInt(process.env.RETRY_BASE_DELAY || '1000'),
      maxDelay: parseInt(process.env.RETRY_MAX_DELAY || '10000')
    },
    
    thresholds: {
      deployTimeout: parseInt(process.env.DEPLOY_TIMEOUT || '30000'),
      grafanaTimeout: parseInt(process.env.GRAFANA_TIMEOUT || '10000'),
      notificationTimeout: parseInt(process.env.NOTIFICATION_TIMEOUT || '5000')
    }
  };
}

export const config = loadConfig();

// Validation helper
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check R2 configuration
  if (!config.getEndpoint('storage').r2.bucket) errors.push('R2 bucket is required');
  if (!config.getEndpoint('storage').r2.endpoint) errors.push('R2 endpoint is required');
  
  // Check Grafana configuration (only required if not localhost)
  if (config.getEndpoint('analytics').grafana.url && config.getEndpoint('analytics').grafana.url !== config.getEndpoint('dashboard').local) {
    if (!process.env.GRAFANA_API_KEY) {
      errors.push('Grafana API key is required for production');
    }
  }
  
  // Check notification configuration
  if (!process.env.SLACK_WEBHOOK_URL && !process.env.SMTP_HOST) {
    errors.push('At least one notification channel must be configured');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
