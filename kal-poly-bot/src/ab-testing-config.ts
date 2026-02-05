// src/ab-testing-config.ts - A/B Testing Configuration with Feature Flags
// This file demonstrates how to use Bun's compile-time feature flags for A/B testing

export interface ABTestConfig {
  variant: 'A' | 'B';
  algorithm: 'conservative' | 'aggressive';
  riskThreshold: number;
  uiTheme: 'minimal' | 'feature-rich';
  performanceMode: 'balanced' | 'performance' | 'compatibility';
  features: string[];
}

// Compile-time feature flag resolution
// Bun replaces these at build time based on --feature flags
declare const A_TEST_VARIANT: 1 | 2;
declare const UI_VARIANT: 'minimal' | 'feature-rich';
declare const PERF_MODE: 'balanced' | 'performance' | 'compatibility';

// Feature flag based configuration
// Provide defaults for when feature flags are not set (development/testing)
const testVariant = (typeof A_TEST_VARIANT !== 'undefined' ? A_TEST_VARIANT : 1);
const uiVariant = (typeof UI_VARIANT !== 'undefined' ? UI_VARIANT : 'minimal');
const perfMode = (typeof PERF_MODE !== 'undefined' ? PERF_MODE : 'balanced');

export const abTestConfig: ABTestConfig = {
  variant: testVariant === 1 ? 'A' : 'B',

  // Different algorithms based on variant
  algorithm: testVariant === 1 ? 'conservative' : 'aggressive',

  // Different risk thresholds
  riskThreshold: testVariant === 1 ? 0.1 : 0.3,

  // UI variant (can be combined with A/B testing)
  uiTheme: uiVariant,

  // Performance mode
  performanceMode: perfMode,

  // Feature flags enable/disable features at compile time
  features: [
    ...(testVariant === 1 ? ['risk-analysis', 'conservative-logging'] : ['aggressive-optimization', 'advanced-analytics']),
    ...(uiVariant === 'feature-rich' ? ['advanced-ui', 'interactive-charts'] : ['minimal-ui']),
    ...(perfMode === 'performance' ? ['turbo-mode', 'memory-optimization'] : [])
  ]
};

// Variant-specific components (conditionally compiled)
export const getVariantComponent = () => {
  if (testVariant === 1) {
    // Variant A: Conservative approach
    return {
      RiskCalculator: () => ({ risk: Math.random() * 0.1 }),
      UIManager: () => ({ theme: 'safe', features: ['basic'] }),
      PerformanceMonitor: () => ({ mode: 'conservative' })
    };
  } else {
    // Variant B: Aggressive approach
    return {
      RiskCalculator: () => ({ risk: Math.random() * 0.5 }),
      UIManager: () => ({ theme: 'advanced', features: ['premium', 'analytics'] }),
      PerformanceMonitor: () => ({ mode: 'aggressive' })
    };
  }
};

// Feature-flag driven business logic
export const calculateTradingStrategy = (marketData: any) => {
  if (testVariant === 1) {
    // Conservative strategy: Lower risk, steady returns
    return {
      action: 'hold',
      confidence: 0.7,
      riskLevel: 'low',
      strategy: 'conservative'
    };
  } else {
    // Aggressive strategy: Higher risk, potential higher returns
    return {
      action: marketData.trend === 'up' ? 'buy' : 'sell',
      confidence: 0.9,
      riskLevel: 'high',
      strategy: 'aggressive'
    };
  }
};

// Performance optimization based on flags
export const getPerformanceSettings = () => {
  const baseSettings = {
    caching: true,
    compression: true,
    lazyLoading: true
  };

  if (PERF_MODE === 'performance') {
    return {
      ...baseSettings,
      preloading: true,
      webWorkers: true,
      memoryPool: true
    };
  }

  return baseSettings;
};

// Analytics based on variant
export const trackUserBehavior = (event: string, data: any) => {
  const analytics = {
    variant: abTestConfig.variant,
    features: abTestConfig.features,
    timestamp: Date.now(),
    event,
    data
  };

  if (testVariant === 1) {
    // Variant A: Basic analytics
    console.log('[Analytics A]', analytics);
  } else {
    // Variant B: Advanced analytics with performance metrics
    console.log('[Analytics B]', {
      ...analytics,
      performance: performance.now(),
      memory: process.memoryUsage?.()
    });
  }

  // In production, this would send to your analytics service
  // sendToAnalytics(analytics);
};

// A/B testing utilities
export const ABTesting = {
  getConfig: () => abTestConfig,

  isVariant: (variant: 'A' | 'B') => abTestConfig.variant === variant,

  hasFeature: (feature: string) => abTestConfig.features.includes(feature),

  getRiskThreshold: () => abTestConfig.riskThreshold,

  getAlgorithm: () => abTestConfig.algorithm,

  // Helper for conditional rendering
  renderVariant: <T,>(variantA: T, variantB: T): T => {
    return testVariant === 1 ? variantA : variantB;
  }
};