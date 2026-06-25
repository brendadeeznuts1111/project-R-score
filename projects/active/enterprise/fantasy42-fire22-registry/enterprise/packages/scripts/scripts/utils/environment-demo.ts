/**
 * Environment Variables Demo
 * Domain-Driven Design Implementation
 *
 * Demonstrates environment variable usage with Bun in the domain system
 */

import { EnvironmentConfiguration, envConfig } from './src/shared/environment-configuration';
import { TimezoneUtils, SupportedTimezone } from './src/shared/timezone-configuration';

async function demonstrateEnvironmentConfiguration() {
  console.info('🌍 Environment Configuration Demo\n');

  // 1. Show current environment information
  console.info('📋 Current Environment:');
  console.info(`   NODE_ENV: ${Bun.env.NODE_ENV || 'undefined'}`);
  console.info(`   BUN_ENV: ${Bun.env.BUN_ENV || 'undefined'}`);
  console.info(`   TZ: ${Bun.env.TZ || process.env.TZ || 'undefined'}`);
  console.info(`   BUN_TIMEZONE: ${Bun.env.BUN_TIMEZONE || 'undefined'}\n`);

  // 2. Show configuration loaded from environment
  console.info('⚙️  Configuration Summary:');
  const summary = envConfig.getConfigurationSummary();
  console.info(`   Environment: ${summary.environment}`);
  console.info(`   Timezone: ${summary.timezone}`);
  console.info(`   Database: ${summary.database.type} (pool: ${summary.database.poolSize})`);
  console.info(`   Enabled Features: ${summary.features.join(', ')}`);
  console.info(
    `   Business Rules: ${summary.businessRules.betLimits} USD, Risk: ${summary.businessRules.riskThreshold}%, Auto-settlement: ${summary.businessRules.autoSettlement}\n`
  );

  // 3. Demonstrate environment variable access patterns
  console.info('🔑 Environment Variable Access Patterns:');
  console.info(`   Bun.env.DATABASE_URL: ${Bun.env.DATABASE_URL || 'undefined'}`);
  console.info(`   process.env.DATABASE_URL: ${process.env.DATABASE_URL || 'undefined'}`);
  console.info(`   Config.database.url: ${envConfig.database.url}\n`);

  // 4. Show timezone integration with environment
  console.info('🕐 Timezone Integration:');
  const timezoneInfo = TimezoneUtils.getCurrentContextInfo();
  console.info(`   Context: ${timezoneInfo.context}`);
  console.info(`   Timezone: ${timezoneInfo.timezone}`);
  console.info(`   Business Hours: ${timezoneInfo.isBusinessHours}`);
  console.info(`   Current Time: ${timezoneInfo.currentTime.toISOString()}\n`);

  // 5. Demonstrate feature flag usage
  console.info('🚩 Feature Flags:');
  console.info(`   Advanced Analytics: ${envConfig.isFeatureEnabled('advancedAnalytics')}`);
  console.info(`   Real-time Reporting: ${envConfig.isFeatureEnabled('realTimeReporting')}`);
  console.info(`   Multi-currency: ${envConfig.isFeatureEnabled('multiCurrency')}`);
  console.info(`   Auto-settlement: ${envConfig.isFeatureEnabled('autoSettlement')}\n`);

  // 6. Show business rules from environment
  console.info('💼 Business Rules from Environment:');
  console.info(
    `   Bet Limits: ${envConfig.businessRules.minBetAmount} - ${envConfig.businessRules.maxBetAmount} USD`
  );
  console.info(`   Risk Threshold: ${envConfig.businessRules.riskScoreThreshold}%`);
  console.info(`   Manual Review Threshold: ${envConfig.businessRules.manualReviewThreshold} USD`);
  console.info(`   Credit Limit Multiplier: ${envConfig.businessRules.creditLimitMultiplier}x\n`);

  // 7. Demonstrate environment validation
  console.info('✅ Configuration Validation:');
  const validation = envConfig.validateConfiguration();
  console.info(`   Is Valid: ${validation.isValid}`);
  if (!validation.isValid) {
    console.info(`   Errors: ${validation.errors.join(', ')}`);
  } else {
    console.info('   All required configurations are properly set!');
  }
  console.info('');

  // 8. Show how to set environment variables programmatically
  console.info('🔧 Programmatic Environment Variable Setting:');
  console.info('   // You can set environment variables in code:');
  console.info('   process.env.CUSTOM_VAR = "custom_value";');
  console.info('   Bun.env.DYNAMIC_CONFIG = "runtime_value";');
  console.info('');

  // 9. Show different environment file precedence
  console.info('📁 Environment File Precedence (Bun loads in this order):');
  console.info('   1. .env');
  console.info('   2. .env.production (when NODE_ENV=production)');
  console.info('   3. .env.development (when NODE_ENV=development)');
  console.info('   4. .env.test (when NODE_ENV=test)');
  console.info('   5. .env.local (not loaded when NODE_ENV=test)');
  console.info('');

  console.info('🎉 Environment Configuration Demo Complete!');
  console.info('Your domain system now uses environment variables for:');
  console.info('  • Database connections');
  console.info('  • External service configurations');
  console.info('  • Security settings');
  console.info('  • Business rules');
  console.info('  • Feature flags');
  console.info('  • Timezone settings');
}

if (import.meta.main) {
  demonstrateEnvironmentConfiguration().catch(console.error);
}
