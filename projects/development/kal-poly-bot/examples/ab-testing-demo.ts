#!/usr/bin/env bun
// examples/ab-testing-demo.ts - Complete A/B Testing Workflow Demo

import { ABTesting, abTestConfig, calculateTradingStrategy } from '../src/ab-testing-config.ts';

async function demonstrateABTesting() {
  console.log('🎯 A/B Testing Demo - Surgical Precision Platform\n');

  // 1. Configuration Overview
  console.log('📋 Current Configuration:');
  console.log(`   Variant: ${abTestConfig.variant}`);
  console.log(`   Algorithm: ${abTestConfig.algorithm}`);
  console.log(`   Risk Threshold: ${abTestConfig.riskThreshold}`);
  console.log(`   UI Theme: ${abTestConfig.uiTheme}`);
  console.log(`   Features: ${abTestConfig.features.join(', ')}`);
  console.log('');

  // 2. Feature Flag Usage
  console.log('🔧 Feature Flag Examples:');

  if (ABTesting.isVariant('A')) {
    console.log('   📊 Running conservative trading strategy');
    console.log('   🛡️  Low-risk approach with safety margins');
  } else {
    console.log('   📈 Running aggressive trading strategy');
    console.log('   ⚡ High-risk approach for maximum returns');
  }
  console.log('');

  // 3. Business Logic Demo
  console.log('💼 Business Logic Demo:');
  const marketData = {
    trend: 'up',
    volatility: 0.15,
    volume: 1000000
  };

  const strategy = calculateTradingStrategy(marketData);
  console.log(`   Market Trend: ${marketData.trend.toUpperCase()}`);
  console.log(`   Recommended Action: ${strategy.action.toUpperCase()}`);
  console.log(`   Confidence: ${(strategy.confidence * 100).toFixed(1)}%`);
  console.log(`   Risk Level: ${strategy.riskLevel}`);
  console.log(`   Strategy Type: ${strategy.strategy}`);
  console.log('');

  // 4. Utility Functions
  console.log('🛠️  Utility Functions:');
  console.log(`   Has risk analysis: ${ABTesting.hasFeature('risk-analysis')}`);
  console.log(`   Has advanced analytics: ${ABTesting.hasFeature('advanced-analytics')}`);
  console.log(`   Risk threshold: ${ABTesting.getRiskThreshold()}`);
  console.log(`   Algorithm: ${ABTesting.getAlgorithm()}`);
  console.log('');

  // 5. Variant-Specific Rendering
  console.log('🎨 Variant-Specific Rendering:');
  const uiElement = ABTesting.renderVariant(
    '🛡️ Conservative UI (Variant A)',
    '⚡ Aggressive UI (Variant B)'
  );
  console.log(`   UI Component: ${uiElement}`);
  console.log('');

  // 6. Analytics Tracking
  console.log('📊 Analytics Tracking:');
  console.log('   Tracking user behavior...');
  console.log('   Event: strategy_applied');
  console.log('   Data: { action: "' + strategy.action + '", confidence: ' + strategy.confidence + ' }');
  console.log('');

  // 7. Performance Settings
  console.log('⚡ Performance Settings:');
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
  console.log(`   Mode: ${abTestConfig.performanceMode}`);
  console.log(`   Features: ${Object.keys(perfSettings).join(', ')}`);
  console.log('');

  // 8. Deployment Recommendations
  console.log('🚀 Deployment Recommendations:');
  if (abTestConfig.variant === 'A') {
    console.log('   📈 Deploy to: Risk-averse user segments');
    console.log('   🎯 Target: Conservative investors');
    console.log('   📊 Expected outcome: Steady, predictable returns');
  } else {
    console.log('   📈 Deploy to: Risk-tolerant user segments');
    console.log('   🎯 Target: Active traders');
    console.log('   📊 Expected outcome: Higher potential returns');
  }
  console.log('');

  // 9. Build Information
  console.log('🔨 Build Information:');
  console.log('   This bundle was compiled with:');
  console.log(`   • A_TEST_VARIANT=${abTestConfig.variant === 'A' ? '1' : '2'}`);
  console.log(`   • UI_VARIANT=${abTestConfig.uiTheme}`);
  console.log(`   • PERF_MODE=${abTestConfig.performanceMode}`);
  console.log('');

  console.log('🎉 A/B Testing Demo Complete!');
  console.log('');
  console.log('💡 To build different variants:');
  console.log('   bun run build:ab-variant-a    # Conservative variant');
  console.log('   bun run build:ab-variant-b    # Aggressive variant');
  console.log('   bun run build:ab-test         # Build both variants');
  console.log('   bun run compare:bundles       # Compare bundle sizes');
  console.log('   bun run test:ab-validation    # Validate A/B setup');
}

// Run if called directly
if (import.meta.main) {
  demonstrateABTesting().catch(console.error);
}