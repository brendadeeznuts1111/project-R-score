/**
 * Environment Variables Demo
 * Domain-Driven Design Implementation
 *
 * Demonstrates environment variable usage with Bun in the domain system
 */

import { EnvironmentConfiguration, envConfig } from './src/shared/environment-configuration';
import { TimezoneUtils, SupportedTimezone } from './src/shared/timezone-configuration';

async function demonstrateEnvironmentConfiguration() {
  console.log('🌍 Environment Configuration Demo\n');

  // 1. Show current environment information
  console.log('📋 Current Environment:');
  console.log(`   NODE_ENV: ${Bun.env.NODE_ENV || 'undefined'}`);
  console.log(`   BUN_ENV: ${Bun.env.BUN_ENV || 'undefined'}`);
  console.log(`   TZ: ${Bun.env.TZ || process.env.TZ || 'undefined'}`);
  console.log(`   BUN_TIMEZONE: ${Bun.env.BUN_TIMEZONE || 'undefined'}\n`);

  // 2. Show configuration loaded from environment
  console.log('⚙️  Configuration Summary:');
  const summary = envConfig.getConfigurationSummary();
  console.log(`   Environment: ${summary.environment}`);
  console.log(`   Timezone: ${summary.timezone}`);
  console.log(`   Database: ${summary.database.type} (pool: ${summary.database.poolSize})`);
  console.log(`   Enabled Features: ${summary.features.join(', ')}`);
  console.log(
    `   Business Rules: ${summary.businessRules.betLimits} USD, Risk: ${summary.businessRules.riskThreshold}%, Auto-settlement: ${summary.businessRules.autoSettlement}\n`
  );

  // 3. Demonstrate environment variable access patterns
  console.log('🔑 Environment Variable Access Patterns:');
  console.log(`   Bun.env.DATABASE_URL: ${Bun.env.DATABASE_URL || 'undefined'}`);
  console.log(`   process.env.DATABASE_URL: ${process.env.DATABASE_URL || 'undefined'}`);
  console.log(`   Config.database.url: ${envConfig.database.url}\n`);

  // 4. Show timezone integration with environment
  console.log('🕐 Timezone Integration:');
  const timezoneInfo = TimezoneUtils.getCurrentContextInfo();
  console.log(`   Context: ${timezoneInfo.context}`);
  console.log(`   Timezone: ${timezoneInfo.timezone}`);
  console.log(`   Business Hours: ${timezoneInfo.isBusinessHours}`);
  console.log(`   Current Time: ${timezoneInfo.currentTime.toISOString()}\n`);

  // 5. Demonstrate feature flag usage
  console.log('🚩 Feature Flags:');
  console.log(`   Advanced Analytics: ${envConfig.isFeatureEnabled('advancedAnalytics')}`);
  console.log(`   Real-time Reporting: ${envConfig.isFeatureEnabled('realTimeReporting')}`);
  console.log(`   Multi-currency: ${envConfig.isFeatureEnabled('multiCurrency')}`);
  console.log(`   Auto-settlement: ${envConfig.isFeatureEnabled('autoSettlement')}\n`);

  // 6. Show business rules from environment
  console.log('💼 Business Rules from Environment:');
  console.log(
    `   Bet Limits: ${envConfig.businessRules.minBetAmount} - ${envConfig.businessRules.maxBetAmount} USD`
  );
  console.log(`   Risk Threshold: ${envConfig.businessRules.riskScoreThreshold}%`);
  console.log(`   Manual Review Threshold: ${envConfig.businessRules.manualReviewThreshold} USD`);
  console.log(`   Credit Limit Multiplier: ${envConfig.businessRules.creditLimitMultiplier}x\n`);

  // 7. Demonstrate environment validation
  console.log('✅ Configuration Validation:');
  const validation = envConfig.validateConfiguration();
  console.log(`   Is Valid: ${validation.isValid}`);
  if (!validation.isValid) {
    console.log(`   Errors: ${validation.errors.join(', ')}`);
  } else {
    console.log('   All required configurations are properly set!');
  }
  console.log('');

  // 8. Show how to set environment variables programmatically
  console.log('🔧 Programmatic Environment Variable Setting:');
  console.log('   // You can set environment variables in code:');
  console.log('   process.env.CUSTOM_VAR = "custom_value";');
  console.log('   Bun.env.DYNAMIC_CONFIG = "runtime_value";');
  console.log('');

  // 9. Show different environment file precedence
  console.log('📁 Environment File Precedence (Bun loads in this order):');
  console.log('   1. .env');
  console.log('   2. .env.production (when NODE_ENV=production)');
  console.log('   3. .env.development (when NODE_ENV=development)');
  console.log('   4. .env.test (when NODE_ENV=test)');
  console.log('   5. .env.local (not loaded when NODE_ENV=test)');
  console.log('');

  console.log('🎉 Environment Configuration Demo Complete!');
  console.log('Your domain system now uses environment variables for:');
  console.log('  • Database connections');
  console.log('  • External service configurations');
  console.log('  • Security settings');
  console.log('  • Business rules');
  console.log('  • Feature flags');
  console.log('  • Timezone settings');
}

if (import.meta.main) {
  demonstrateEnvironmentConfiguration().catch(console.error);
}
