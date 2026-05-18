#!/usr/bin/env bun
// examples/ab-testing-demo.ts - Complete A/B Testing Workflow Demo

import { ABTesting, abTestConfig, calculateTradingStrategy } from '../src/ab-testing-config.ts';

async function demonstrateABTesting() {
  console.info('🎯 A/B Testing Demo - Surgical Precision Platform\n');

  // 1. Configuration Overview
  console.info('📋 Current Configuration:');
  console.info(`   Variant: ${abTestConfig.variant}`);
  console.info(`   Algorithm: ${abTestConfig.algorithm}`);
  console.info(`   Risk Threshold: ${abTestConfig.riskThreshold}`);
  console.info(`   UI Theme: ${abTestConfig.uiTheme}`);
  console.info(`   Features: ${abTestConfig.features.join(', ')}`);
  console.info('');

  // 2. Feature Flag Usage
  console.info('🔧 Feature Flag Examples:');

  if (ABTesting.isVariant('A')) {
    console.info('   📊 Running conservative trading strategy');
    console.info('   🛡️  Low-risk approach with safety margins');
  } else {
    console.info('   📈 Running aggressive trading strategy');
    console.info('   ⚡ High-risk approach for maximum returns');
  }
  console.info('');

  // 3. Business Logic Demo
  console.info('💼 Business Logic Demo:');
  const marketData = {
    trend: 'up',
    volatility: 0.15,
    volume: 1000000
  };

  const strategy = calculateTradingStrategy(marketData);
  console.info(`   Market Trend: ${marketData.trend.toUpperCase()}`);
  console.info(`   Recommended Action: ${strategy.action.toUpperCase()}`);
  console.info(`   Confidence: ${(strategy.confidence * 100).toFixed(1)}%`);
  console.info(`   Risk Level: ${strategy.riskLevel}`);
  console.info(`   Strategy Type: ${strategy.strategy}`);
  console.info('');

  // 4. Utility Functions
  console.info('🛠️  Utility Functions:');
  console.info(`   Has risk analysis: ${ABTesting.hasFeature('risk-analysis')}`);
  console.info(`   Has advanced analytics: ${ABTesting.hasFeature('advanced-analytics')}`);
  console.info(`   Risk threshold: ${ABTesting.getRiskThreshold()}`);
  console.info(`   Algorithm: ${ABTesting.getAlgorithm()}`);
  console.info('');

  // 5. Variant-Specific Rendering
  console.info('🎨 Variant-Specific Rendering:');
  const uiElement = ABTesting.renderVariant(
    '🛡️ Conservative UI (Variant A)',
    '⚡ Aggressive UI (Variant B)'
  );
  console.info(`   UI Component: ${uiElement}`);
  console.info('');

  // 6. Analytics Tracking
  console.info('📊 Analytics Tracking:');
  console.info('   Tracking user behavior...');
  console.info('   Event: strategy_applied');
  console.info('   Data: { action: "' + strategy.action + '", confidence: ' + strategy.confidence + ' }');
  console.info('');

  // 7. Performance Settings
  console.info('⚡ Performance Settings:');
  const perfSettings = {
    caching: true,
    compression: true,
    lazyLoading: true,
    ...(abTestConfig.performanceMode === 'performance' ? {
      preloading: true,
      webWorkers: true,
      memoryPool: true
    } : {})
  };
  console.info(`   Mode: ${abTestConfig.performanceMode}`);
  console.info(`   Features: ${Object.keys(perfSettings).join(', ')}`);
  console.info('');

  // 8. Deployment Recommendations
  console.info('🚀 Deployment Recommendations:');
  if (abTestConfig.variant === 'A') {
    console.info('   📈 Deploy to: Risk-averse user segments');
    console.info('   🎯 Target: Conservative investors');
    console.info('   📊 Expected outcome: Steady, predictable returns');
  } else {
    console.info('   📈 Deploy to: Risk-tolerant user segments');
    console.info('   🎯 Target: Active traders');
    console.info('   📊 Expected outcome: Higher potential returns');
  }
  console.info('');

  // 9. Build Information
  console.info('🔨 Build Information:');
  console.info('   This bundle was compiled with:');
  console.info(`   • A_TEST_VARIANT=${abTestConfig.variant === 'A' ? '1' : '2'}`);
  console.info(`   • UI_VARIANT=${abTestConfig.uiTheme}`);
  console.info(`   • PERF_MODE=${abTestConfig.performanceMode}`);
  console.info('');

  console.info('🎉 A/B Testing Demo Complete!');
  console.info('');
  console.info('💡 To build different variants:');
  console.info('   bun run build:ab-variant-a    # Conservative variant');
  console.info('   bun run build:ab-variant-b    # Aggressive variant');
  console.info('   bun run build:ab-test         # Build both variants');
  console.info('   bun run compare:bundles       # Compare bundle sizes');
  console.info('   bun run test:ab-validation    # Validate A/B setup');
}

// Run if called directly
if (import.meta.main) {
  demonstrateABTesting().catch(console.error);
}