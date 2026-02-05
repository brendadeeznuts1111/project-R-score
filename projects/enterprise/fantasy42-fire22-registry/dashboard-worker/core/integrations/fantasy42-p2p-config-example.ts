/**
 * Fantasy42 P2P Automation Configuration Examples
 * Complete configuration examples for different deployment scenarios
 */

import { P2PAutomationConfig } from './fantasy402-p2p-automation';

// =========================================
// BASIC CONFIGURATION (Getting Started)
// =========================================

export const basicP2PConfig: P2PAutomationConfig = {
  // Core Configuration
  passwordFieldXPath: "//input[@type='password']",
  agentSelectXPath: "//select[@id='agent-select']",
  thirdPartyIdXPath: "//input[@id='third-party-id']",
  autoTransferEnabled: true,
  minTransferAmount: 10.0,
  maxTransferAmount: 1000.0,
  supportedPaymentMethods: ['bank_transfer', 'paypal', 'venmo'],
  riskThreshold: 75,

  // Basic Features Enabled
  analyticsEnabled: true,
  emailNotificationsEnabled: true,
  performanceTrackingEnabled: true,
  monitoringEnabled: true,

  // Everything else disabled for simplicity
  automationMode: 'balanced',
  batchProcessingEnabled: false,
  maxConcurrentTransfers: 3,
  transferTimeoutSeconds: 300,
  retryAttempts: 2,
  retryDelaySeconds: 30,
  fraudDetectionEnabled: false,
  velocityChecksEnabled: false,
  maxTransfersPerHour: 20,
  maxTransfersPerDay: 100,
  suspiciousPatterns: [],
  riskScoringEnabled: false,
  riskThresholdHigh: 80,
  riskThresholdMedium: 50,
  smsNotificationsEnabled: false,
  webhookNotificationsEnabled: false,
  notificationRecipients: ['admin@example.com'],
  alertOnHighRisk: true,
  alertOnFailedTransfers: true,
  alertOnSystemErrors: true,
  webhookUrl: '',
  webhookSecret: '',
  geoRestrictionsEnabled: false,
  allowedCountries: [],
  blockedCountries: [],
  kycRequired: false,
  complianceChecksEnabled: false,
  regulatoryReportingEnabled: false,
  feeCalculationEnabled: false,
  feeStructure: {
    percentage: 0,
    fixedAmount: 0,
    minFee: 0,
    maxFee: 0,
  },
  agentCommissionEnabled: false,
  agentCommissionRate: 0,
  metricsCollectionEnabled: false,
  reportingIntervalHours: 24,
  exportFormats: ['json'],
  dashboardIntegrationEnabled: false,
  autoRecoveryEnabled: true,
  manualApprovalRequired: false,
  approvalWorkflowEnabled: false,
  escalationEnabled: false,
  escalationThreshold: 3,
  backupSystemsEnabled: false,
  cachingEnabled: true,
  connectionPoolingEnabled: false,
  loadBalancingEnabled: false,
  circuitBreakerEnabled: false,
  circuitBreakerThreshold: 5,
  rateLimitingEnabled: false,
  encryptionEnabled: false,
  auditLoggingEnabled: false,
  sessionManagementEnabled: false,
  ipWhitelistEnabled: false,
  allowedIPs: [],
  twoFactorAuthRequired: false,
  multiAgentSupportEnabled: false,
  agentLoadBalancingEnabled: false,
  agentHealthChecksEnabled: false,
  agentFailoverEnabled: false,
  agentPriorityList: [],
  scheduledTransfersEnabled: false,
  businessHoursOnly: false,
  maintenanceWindows: [],
  autoScalingEnabled: false,
  predictiveScalingEnabled: false,
  externalApiIntegrations: {
    enabled: false,
    endpoints: [],
    authentication: {
      type: 'api_key',
      credentials: {},
    },
  },
  webhookIntegrations: {
    enabled: false,
    endpoints: [],
    retryPolicy: {
      maxRetries: 3,
      backoffMultiplier: 2,
    },
  },
  metricsEndpoint: '/metrics',
  healthCheckEndpoint: '/health',
  loggingLevel: 'info',
  logRetentionDays: 30,
  distributedTracingEnabled: false,
  dataRetentionEnabled: true,
  retentionPeriodDays: 90,
  dataArchivingEnabled: false,
  backupFrequency: 'daily',
  encryptionAtRest: false,
  customValidationRules: {
    enabled: false,
    rules: [],
  },
  duplicateDetectionEnabled: false,
  transactionDeduplicationWindow: 60,
  rateLimitEnabled: false,
  rateLimitRequestsPerMinute: 60,
  rateLimitRequestsPerHour: 1000,
  burstLimitEnabled: false,
  burstLimitRequests: 10,
  throttlingEnabled: false,
  uiFeedbackEnabled: true,
  realTimeUpdatesEnabled: true,
  progressIndicatorsEnabled: true,
  confirmationMessagesEnabled: true,
  errorMessagesEnabled: true,
  accessibilityFeaturesEnabled: false,
  auditTrailEnabled: false,
  regulatoryComplianceEnabled: false,
  dataPrivacyEnabled: false,
  consentManagementEnabled: false,
  gdprComplianceEnabled: false,
  ccpaComplianceEnabled: false,
  maintenanceModeEnabled: false,
  systemHealthChecksEnabled: true,
  automaticUpdatesEnabled: false,
  rollbackEnabled: true,
  disasterRecoveryEnabled: false,
  internationalizationEnabled: false,
  supportedLanguages: ['en'],
  defaultLanguage: 'en',
  currencySupport: ['USD'],
  timezoneSupport: ['UTC'],
  biIntegrationEnabled: false,
  dataWarehouseEnabled: false,
  realTimeReportingEnabled: false,
  predictiveAnalyticsEnabled: false,
  machineLearningEnabled: false,
  apiRateLimitingEnabled: false,
  apiVersioningEnabled: false,
  apiDocumentationEnabled: false,
  apiTestingEnabled: false,
  apiMonitoringEnabled: false,
  paymentGatewayIntegration: {
    enabled: false,
    providers: [],
    failoverEnabled: false,
    loadBalancingEnabled: false,
  },
  cryptoCurrencySupport: {
    enabled: false,
    supportedCurrencies: [],
    walletIntegrationEnabled: false,
  },
};

// =========================================
// STANDARD CONFIGURATION (Production Ready)
// =========================================

export const standardP2PConfig: P2PAutomationConfig = {
  // Core Configuration
  passwordFieldXPath: "//input[@type='password']",
  agentSelectXPath: "//select[@id='agent-select']",
  thirdPartyIdXPath: "//input[@id='third-party-id']",
  autoTransferEnabled: true,
  minTransferAmount: 5.0,
  maxTransferAmount: 5000.0,
  supportedPaymentMethods: ['bank_transfer', 'paypal', 'venmo', 'cash_app', 'zelle'],
  riskThreshold: 70,

  // Advanced Automation
  automationMode: 'balanced',
  batchProcessingEnabled: true,
  maxConcurrentTransfers: 5,
  transferTimeoutSeconds: 300,
  retryAttempts: 3,
  retryDelaySeconds: 30,

  // Risk Management
  fraudDetectionEnabled: true,
  velocityChecksEnabled: true,
  maxTransfersPerHour: 15,
  maxTransfersPerDay: 75,
  suspiciousPatterns: ['test@', 'fake.com', 'spam'],
  riskScoringEnabled: true,
  riskThresholdHigh: 80,
  riskThresholdMedium: 60,

  // Notifications
  emailNotificationsEnabled: true,
  smsNotificationsEnabled: false,
  webhookNotificationsEnabled: true,
  notificationRecipients: ['operations@company.com', 'compliance@company.com'],
  alertOnHighRisk: true,
  alertOnFailedTransfers: true,
  alertOnSystemErrors: true,
  webhookUrl: 'https://api.company.com/webhooks/p2p-alerts',
  webhookSecret: process.env.WEBHOOK_SECRET || '',

  // Geographic & Compliance
  geoRestrictionsEnabled: true,
  allowedCountries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR'],
  blockedCountries: ['KP', 'IR', 'CU', 'SY'],
  kycRequired: false,
  complianceChecksEnabled: true,
  regulatoryReportingEnabled: false,

  // Fee Management
  feeCalculationEnabled: true,
  feeStructure: {
    percentage: 2.0,
    fixedAmount: 0.5,
    minFee: 0.25,
    maxFee: 15.0,
  },
  agentCommissionEnabled: true,
  agentCommissionRate: 0.5,

  // Analytics & Reporting
  analyticsEnabled: true,
  metricsCollectionEnabled: true,
  performanceTrackingEnabled: true,
  reportingIntervalHours: 24,
  exportFormats: ['json', 'csv', 'pdf'],
  dashboardIntegrationEnabled: true,

  // Recovery & Error Handling
  autoRecoveryEnabled: true,
  manualApprovalRequired: false,
  approvalWorkflowEnabled: true,
  escalationEnabled: true,
  escalationThreshold: 3,
  backupSystemsEnabled: true,

  // Performance
  cachingEnabled: true,
  connectionPoolingEnabled: true,
  loadBalancingEnabled: false,
  circuitBreakerEnabled: true,
  circuitBreakerThreshold: 5,
  rateLimitingEnabled: true,

  // Security
  encryptionEnabled: true,
  auditLoggingEnabled: true,
  sessionManagementEnabled: true,
  ipWhitelistEnabled: false,
  allowedIPs: [],
  twoFactorAuthRequired: false,

  // Multi-Agent
  multiAgentSupportEnabled: false,
  agentLoadBalancingEnabled: false,
  agentHealthChecksEnabled: false,
  agentFailoverEnabled: false,
  agentPriorityList: [],

  // Scheduling
  scheduledTransfersEnabled: false,
  businessHoursOnly: false,
  maintenanceWindows: ['02:00-04:00'],
  autoScalingEnabled: false,
  predictiveScalingEnabled: false,

  // External Integrations
  externalApiIntegrations: {
    enabled: false,
    endpoints: [],
    authentication: {
      type: 'api_key',
      credentials: {},
    },
  },
  webhookIntegrations: {
    enabled: true,
    endpoints: ['https://api.company.com/webhooks/p2p-events'],
    retryPolicy: {
      maxRetries: 3,
      backoffMultiplier: 2,
    },
  },

  // Monitoring
  monitoringEnabled: true,
  metricsEndpoint: '/metrics',
  healthCheckEndpoint: '/health',
  loggingLevel: 'info',
  logRetentionDays: 30,
  distributedTracingEnabled: false,

  // Data Management
  dataRetentionEnabled: true,
  retentionPeriodDays: 365,
  dataArchivingEnabled: false,
  backupFrequency: 'daily',
  encryptionAtRest: true,

  // Advanced Validation
  customValidationRules: {
    enabled: true,
    rules: [
      {
        name: 'High Value Review',
        condition: 'amount > 2500',
        action: 'review',
      },
      {
        name: 'Round Amount Check',
        condition: 'amount % 100 === 0 && amount > 500',
        action: 'review',
      },
    ],
  },
  duplicateDetectionEnabled: true,
  transactionDeduplicationWindow: 60,

  // Rate Limiting
  rateLimitEnabled: true,
  rateLimitRequestsPerMinute: 30,
  rateLimitRequestsPerHour: 500,
  burstLimitEnabled: true,
  burstLimitRequests: 5,
  throttlingEnabled: true,

  // User Experience
  uiFeedbackEnabled: true,
  realTimeUpdatesEnabled: true,
  progressIndicatorsEnabled: true,
  confirmationMessagesEnabled: true,
  errorMessagesEnabled: true,
  accessibilityFeaturesEnabled: true,

  // Compliance & Audit
  auditTrailEnabled: true,
  regulatoryComplianceEnabled: false,
  dataPrivacyEnabled: true,
  consentManagementEnabled: false,
  gdprComplianceEnabled: false,
  ccpaComplianceEnabled: false,

  // Operations
  maintenanceModeEnabled: false,
  systemHealthChecksEnabled: true,
  automaticUpdatesEnabled: false,
  rollbackEnabled: true,
  disasterRecoveryEnabled: false,

  // Internationalization
  internationalizationEnabled: false,
  supportedLanguages: ['en'],
  defaultLanguage: 'en',
  currencySupport: ['USD'],
  timezoneSupport: ['UTC', 'EST', 'PST', 'GMT'],

  // Business Intelligence
  biIntegrationEnabled: false,
  dataWarehouseEnabled: false,
  realTimeReportingEnabled: true,
  predictiveAnalyticsEnabled: false,
  machineLearningEnabled: false,

  // API Management
  apiRateLimitingEnabled: true,
  apiVersioningEnabled: false,
  apiDocumentationEnabled: false,
  apiTestingEnabled: false,
  apiMonitoringEnabled: true,

  // Payment Processing
  paymentGatewayIntegration: {
    enabled: false,
    providers: [],
    failoverEnabled: false,
    loadBalancingEnabled: false,
  },
  cryptoCurrencySupport: {
    enabled: false,
    supportedCurrencies: [],
    walletIntegrationEnabled: false,
  },
};

// =========================================
// ENTERPRISE CONFIGURATION (Full Featured)
// =========================================

export const enterpriseP2PConfig: P2PAutomationConfig = {
  // Core Configuration
  passwordFieldXPath: "//input[@type='password']",
  agentSelectXPath: "//select[@id='agent-select']",
  thirdPartyIdXPath: "//input[@id='third-party-id']",
  autoTransferEnabled: true,
  minTransferAmount: 1.0,
  maxTransferAmount: 25000.0,
  supportedPaymentMethods: [
    'bank_transfer',
    'paypal',
    'venmo',
    'cash_app',
    'zelle',
    'wire_transfer',
    'ach',
    'check',
  ],
  riskThreshold: 65,

  // Advanced Automation
  automationMode: 'balanced',
  batchProcessingEnabled: true,
  maxConcurrentTransfers: 10,
  transferTimeoutSeconds: 600,
  retryAttempts: 5,
  retryDelaySeconds: 60,

  // Risk Management
  fraudDetectionEnabled: true,
  velocityChecksEnabled: true,
  maxTransfersPerHour: 50,
  maxTransfersPerDay: 200,
  suspiciousPatterns: [
    'test@',
    'fake.com',
    'spam',
    'scam',
    'fraud',
    '419',
    'nigeria',
    'lottery',
    'inheritance',
  ],
  riskScoringEnabled: true,
  riskThresholdHigh: 85,
  riskThresholdMedium: 70,

  // Notifications
  emailNotificationsEnabled: true,
  smsNotificationsEnabled: true,
  webhookNotificationsEnabled: true,
  notificationRecipients: [
    'operations@company.com',
    'compliance@company.com',
    'security@company.com',
    'management@company.com',
  ],
  alertOnHighRisk: true,
  alertOnFailedTransfers: true,
  alertOnSystemErrors: true,
  webhookUrl: 'https://api.company.com/webhooks/p2p-alerts',
  webhookSecret: process.env.WEBHOOK_SECRET || '',

  // Geographic & Compliance
  geoRestrictionsEnabled: true,
  allowedCountries: [
    'US',
    'CA',
    'GB',
    'AU',
    'DE',
    'FR',
    'NL',
    'BE',
    'CH',
    'AT',
    'SE',
    'NO',
    'DK',
    'FI',
    'IE',
    'PT',
    'ES',
    'IT',
    'JP',
    'SG',
    'HK',
    'AU',
  ],
  blockedCountries: [
    'KP',
    'IR',
    'CU',
    'SY',
    'SD',
    'YE',
    'SO',
    'AF',
    'IQ',
    'LB',
    'VE',
    'BY',
    'RU', // Depending on sanctions
  ],
  kycRequired: true,
  complianceChecksEnabled: true,
  regulatoryReportingEnabled: true,

  // Fee Management
  feeCalculationEnabled: true,
  feeStructure: {
    percentage: 1.5,
    fixedAmount: 0.25,
    minFee: 0.1,
    maxFee: 50.0,
  },
  agentCommissionEnabled: true,
  agentCommissionRate: 0.75,

  // Analytics & Reporting
  analyticsEnabled: true,
  metricsCollectionEnabled: true,
  performanceTrackingEnabled: true,
  reportingIntervalHours: 6,
  exportFormats: ['json', 'csv', 'pdf', 'xlsx'],
  dashboardIntegrationEnabled: true,

  // Recovery & Error Handling
  autoRecoveryEnabled: true,
  manualApprovalRequired: false,
  approvalWorkflowEnabled: true,
  escalationEnabled: true,
  escalationThreshold: 5,
  backupSystemsEnabled: true,

  // Performance
  cachingEnabled: true,
  connectionPoolingEnabled: true,
  loadBalancingEnabled: true,
  circuitBreakerEnabled: true,
  circuitBreakerThreshold: 10,
  rateLimitingEnabled: true,

  // Security
  encryptionEnabled: true,
  auditLoggingEnabled: true,
  sessionManagementEnabled: true,
  ipWhitelistEnabled: true,
  allowedIPs: ['192.168.0.0/16', '10.0.0.0/8', '172.16.0.0/12'],
  twoFactorAuthRequired: true,

  // Multi-Agent
  multiAgentSupportEnabled: true,
  agentLoadBalancingEnabled: true,
  agentHealthChecksEnabled: true,
  agentFailoverEnabled: true,
  agentPriorityList: ['AGENT001', 'AGENT002', 'AGENT003'],

  // Scheduling
  scheduledTransfersEnabled: true,
  businessHoursOnly: true,
  maintenanceWindows: ['01:00-03:00', '13:00-15:00'],
  autoScalingEnabled: true,
  predictiveScalingEnabled: true,

  // External Integrations
  externalApiIntegrations: {
    enabled: true,
    endpoints: ['https://api.banking.com/transfers', 'https://api.fraud-detection.com/analyze'],
    authentication: {
      type: 'oauth',
      credentials: {
        client_id: process.env.BANKING_CLIENT_ID || '',
        client_secret: process.env.BANKING_CLIENT_SECRET || '',
        token_url: 'https://api.banking.com/oauth/token',
      },
    },
  },
  webhookIntegrations: {
    enabled: true,
    endpoints: [
      'https://api.company.com/webhooks/p2p-events',
      'https://api.monitoring.com/webhooks/alerts',
    ],
    retryPolicy: {
      maxRetries: 5,
      backoffMultiplier: 2,
    },
  },

  // Monitoring
  monitoringEnabled: true,
  metricsEndpoint: '/metrics',
  healthCheckEndpoint: '/health',
  loggingLevel: 'debug',
  logRetentionDays: 90,
  distributedTracingEnabled: true,

  // Data Management
  dataRetentionEnabled: true,
  retentionPeriodDays: 2555, // 7 years for compliance
  dataArchivingEnabled: true,
  backupFrequency: 'hourly',
  encryptionAtRest: true,

  // Advanced Validation
  customValidationRules: {
    enabled: true,
    rules: [
      {
        name: 'High Value Enhanced Review',
        condition: 'amount > 10000',
        action: 'review',
      },
      {
        name: 'Velocity Check',
        condition: 'recentTransfers > 10',
        action: 'review',
      },
      {
        name: 'Geographic Risk',
        condition: 'country in blockedCountries',
        action: 'deny',
      },
      {
        name: 'Suspicious Pattern',
        condition: 'address contains suspiciousPatterns',
        action: 'deny',
      },
      {
        name: 'Weekend High Value',
        condition: 'amount > 5000 && isWeekend',
        action: 'review',
      },
    ],
  },
  duplicateDetectionEnabled: true,
  transactionDeduplicationWindow: 120,

  // Rate Limiting
  rateLimitEnabled: true,
  rateLimitRequestsPerMinute: 100,
  rateLimitRequestsPerHour: 2000,
  burstLimitEnabled: true,
  burstLimitRequests: 20,
  throttlingEnabled: true,

  // User Experience
  uiFeedbackEnabled: true,
  realTimeUpdatesEnabled: true,
  progressIndicatorsEnabled: true,
  confirmationMessagesEnabled: true,
  errorMessagesEnabled: true,
  accessibilityFeaturesEnabled: true,

  // Compliance & Audit
  auditTrailEnabled: true,
  regulatoryComplianceEnabled: true,
  dataPrivacyEnabled: true,
  consentManagementEnabled: true,
  gdprComplianceEnabled: true,
  ccpaComplianceEnabled: true,

  // Operations
  maintenanceModeEnabled: false,
  systemHealthChecksEnabled: true,
  automaticUpdatesEnabled: true,
  rollbackEnabled: true,
  disasterRecoveryEnabled: true,

  // Internationalization
  internationalizationEnabled: true,
  supportedLanguages: ['en', 'es', 'fr', 'de', 'zh', 'ja', 'pt', 'ru'],
  defaultLanguage: 'en',
  currencySupport: ['USD', 'EUR', 'GBP', 'CAD', 'JPY', 'AUD', 'CHF', 'CNY'],
  timezoneSupport: [
    'UTC',
    'EST',
    'PST',
    'GMT',
    'CET',
    'JST',
    'CST',
    'AEST',
    'IST',
    'BRT',
    'ART',
    'WET',
  ],

  // Business Intelligence
  biIntegrationEnabled: true,
  dataWarehouseEnabled: true,
  realTimeReportingEnabled: true,
  predictiveAnalyticsEnabled: true,
  machineLearningEnabled: true,

  // API Management
  apiRateLimitingEnabled: true,
  apiVersioningEnabled: true,
  apiDocumentationEnabled: true,
  apiTestingEnabled: true,
  apiMonitoringEnabled: true,

  // Payment Processing
  paymentGatewayIntegration: {
    enabled: true,
    providers: ['stripe', 'paypal', 'square', 'adyen'],
    failoverEnabled: true,
    loadBalancingEnabled: true,
  },
  cryptoCurrencySupport: {
    enabled: true,
    supportedCurrencies: ['BTC', 'ETH', 'USDC', 'USDT'],
    walletIntegrationEnabled: true,
  },
};

// =========================================
// HIGH-SECURITY CONFIGURATION
// =========================================

export const highSecurityP2PConfig: P2PAutomationConfig = {
  ...enterpriseP2PConfig,

  // Override with maximum security settings
  automationMode: 'conservative',
  riskThreshold: 50,
  riskThresholdHigh: 70,
  riskThresholdMedium: 60,

  // Enhanced security
  twoFactorAuthRequired: true,
  ipWhitelistEnabled: true,
  allowedIPs: ['192.168.0.0/24'], // Restrict to internal network

  // Maximum compliance
  kycRequired: true,
  regulatoryReportingEnabled: true,
  gdprComplianceEnabled: true,
  ccpaComplianceEnabled: true,

  // Enhanced monitoring
  auditLoggingEnabled: true,
  distributedTracingEnabled: true,
  loggingLevel: 'debug',

  // Stricter limits
  maxTransfersPerHour: 25,
  maxTransfersPerDay: 100,
  rateLimitRequestsPerMinute: 20,
  rateLimitRequestsPerHour: 500,

  // Manual approval for high-risk
  manualApprovalRequired: true,
  approvalWorkflowEnabled: true,
};

// =========================================
// DEVELOPMENT CONFIGURATION
// =========================================

export const developmentP2PConfig: P2PAutomationConfig = {
  ...basicP2PConfig,

  // Development-friendly settings
  automationMode: 'aggressive',
  riskThreshold: 90,
  loggingLevel: 'debug',
  emailNotificationsEnabled: false,
  webhookNotificationsEnabled: false,

  // Relaxed limits for testing
  maxTransfersPerHour: 100,
  maxTransfersPerDay: 1000,
  rateLimitRequestsPerMinute: 1000,
  rateLimitRequestsPerHour: 10000,

  // Development features
  analyticsEnabled: true,
  monitoringEnabled: true,
  performanceTrackingEnabled: true,
};

// =========================================
// UTILITY FUNCTIONS
// =========================================

/**
 * Get configuration by environment
 */
export function getP2PConfigForEnvironment(environment: string): P2PAutomationConfig {
  switch (environment.toLowerCase()) {
    case 'development':
    case 'dev':
      return developmentP2PConfig;
    case 'staging':
    case 'stage':
      return standardP2PConfig;
    case 'production':
    case 'prod':
      return enterpriseP2PConfig;
    case 'high-security':
    case 'secure':
      return highSecurityP2PConfig;
    case 'basic':
    default:
      return basicP2PConfig;
  }
}

/**
 * Validate configuration
 */
export function validateP2PConfig(config: P2PAutomationConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Core validations
  if (!config.passwordFieldXPath) {
    errors.push('passwordFieldXPath is required');
  }
  if (!config.agentSelectXPath) {
    errors.push('agentSelectXPath is required');
  }
  if (!config.thirdPartyIdXPath) {
    errors.push('thirdPartyIdXPath is required');
  }

  // Amount validations
  if (config.minTransferAmount < 0) {
    errors.push('minTransferAmount must be >= 0');
  }
  if (config.maxTransferAmount <= config.minTransferAmount) {
    errors.push('maxTransferAmount must be > minTransferAmount');
  }

  // Risk threshold validations
  if (config.riskThreshold < 0 || config.riskThreshold > 100) {
    errors.push('riskThreshold must be between 0 and 100');
  }

  // Notification validations
  if (config.emailNotificationsEnabled && config.notificationRecipients.length === 0) {
    errors.push('notificationRecipients required when email notifications enabled');
  }

  // Geographic validations
  if (config.geoRestrictionsEnabled) {
    if (config.allowedCountries.length === 0) {
      errors.push('allowedCountries required when geo restrictions enabled');
    }
  }

  // Webhook validations
  if (config.webhookNotificationsEnabled && !config.webhookUrl) {
    errors.push('webhookUrl required when webhook notifications enabled');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Merge configurations (for overrides)
 */
export function mergeP2PConfigs(
  base: P2PAutomationConfig,
  override: Partial<P2PAutomationConfig>
): P2PAutomationConfig {
  return { ...base, ...override };
}

/**
 * Export configuration to JSON
 */
export function exportP2PConfig(config: P2PAutomationConfig): string {
  return JSON.stringify(config, null, 2);
}

/**
 * Import configuration from JSON
 */
export function importP2PConfig(jsonString: string): P2PAutomationConfig {
  try {
    const config = JSON.parse(jsonString);
    const validation = validateP2PConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }
    return config;
  } catch (error) {
    throw new Error(`Failed to import configuration: ${error}`);
  }
}
