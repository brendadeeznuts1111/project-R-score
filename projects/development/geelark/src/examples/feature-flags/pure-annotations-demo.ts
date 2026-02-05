/**
 * Demo: Using @PURE annotations for dead code elimination
 *
 * This file demonstrates how to use @PURE annotations to optimize bundle size
 * by allowing Bun to safely remove unused code during the build process.
 */

import { FeatureRegistry } from '../../src/FeatureRegistry';
import { FeatureFlag, HealthScore } from '../../src/types';
import {
    formatBytes,
    formatPercentage,
    getFeatureBadge,
    getHealthBadge,
    isFeatureEnabled,
    renderFeature
} from '../../src/utils/PureUtils';

// Example 1: Feature flag checks with @PURE
function initializeFeatures() {
  const registry = new FeatureRegistry();

  // These calls can be eliminated if results are unused
  const premiumEnabled = /*@__PURE__*/ registry.isEnabled(FeatureFlag.FEAT_PREMIUM);
  const encryptionEnabled = /*@__PURE__*/ registry.isEnabled(FeatureFlag.FEAT_ENCRYPTION);
  const mockApiEnabled = /*@__PURE__*/ registry.isEnabled(FeatureFlag.FEAT_MOCK_API);

  // Pure utility functions - can be eliminated if unused
  const premiumBadge = /*@__PURE__*/ getFeatureBadge(FeatureFlag.FEAT_PREMIUM, premiumEnabled);
  const encryptionBadge = /*@__PURE__*/ getFeatureBadge(FeatureFlag.FEAT_ENCRYPTION, encryptionEnabled);

  console.log(`Premium: ${premiumBadge}, Encryption: ${encryptionBadge}`);
}

// Example 2: Conditional rendering with pure functions
function renderDashboard() {
  const registry = new FeatureRegistry();

  // Pure conditional rendering - entire branches can be eliminated
  const premiumSection = /*@__PURE__*/ renderFeature(
    FeatureFlag.FEAT_PREMIUM,
    '<div class="premium-features">Advanced Analytics</div>',
    '<div class="basic-features">Basic Dashboard</div>'
  );

  const monitoringSection = /*@__PURE__*/ renderFeature(
    FeatureFlag.FEAT_ADVANCED_MONITORING,
    '<div class="advanced-monitoring">Real-time Metrics</div>',
    '<div class="basic-monitoring">Status Overview</div>'
  );

  return {
    premium: premiumSection,
    monitoring: monitoringSection
  };
}

// Example 3: Performance metrics with pure formatters
function generatePerformanceReport() {
  // Mock performance data
  const metrics = {
    memoryUsage: 512 * 1024 * 1024, // 512MB
    bundleSize: 280 * 1024, // 280KB
    enabledFeatures: 12,
    totalFeatures: 15
  };

  // Pure formatting functions - can be inlined or eliminated
  const formattedMemory = /*@__PURE__*/ formatBytes(metrics.memoryUsage);
  const formattedBundle = /*@__PURE__*/ formatBytes(metrics.bundleSize);
  const featurePercentage = /*@__PURE__*/ formatPercentage(
    metrics.enabledFeatures,
    metrics.totalFeatures
  );

  return {
    memory: formattedMemory,
    bundle: formattedBundle,
    features: featurePercentage
  };
}

// Example 4: Health status calculation
function calculateSystemHealth() {
  const registry = new FeatureRegistry();

  // Pure health calculation - can be optimized away if unused
  const enabledCount = /*@__PURE__*/ registry.getEnabledCount();
  const totalCount = /*@__PURE__*/ registry.getTotalCount();
  const percentage = (enabledCount / totalCount) * 100;

  let status: HealthScore;
  if (percentage >= 90) status = HealthScore.HEALTHY;
  else if (percentage >= 70) status = HealthScore.DEGRADED;
  else if (percentage >= 50) status = HealthScore.IMPAIRED;
  else status = HealthScore.CRITICAL;

  // Pure badge generation
  const badge = /*@__PURE__*/ getHealthBadge(status);

  return { status, badge, percentage };
}

// Example 5: Build-time optimization demo
export function demonstrateOptimizations() {
  console.log('🧪 Testing @PURE annotations optimization...');

  // These calls demonstrate pure function usage
  initializeFeatures();
  const dashboard = renderDashboard();
  const report = generatePerformanceReport();
  const health = calculateSystemHealth();

  console.log('✅ Pure annotations demo completed');
  console.log('📊 Dashboard:', dashboard);
  console.log('📈 Performance:', report);
  console.log('🏥 Health:', health);
}

// Example 6: Advanced pure utilities
export const PureOptimizations = {
  // Memoized pure function
  memoize: <T extends (...args: any[]) => any>(fn: T): T => {
    const cache = new Map();
    return ((...args: any[]) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) return cache.get(key);
      const result = fn(...args);
      cache.set(key, result);
      return result;
    }) as T;
  },

  // Pure conditional execution
  conditional: <T>(
    condition: boolean,
    truthyFn: () => T,
    falsyFn?: () => T
  ): T | undefined => {
    return condition ? truthyFn() : falsyFn?.();
  },

  // Pure array operations
  filterMap: <T, R>(
    array: T[],
    filterFn: (item: T) => boolean,
    mapFn: (item: T) => R
  ): R[] => {
    return array.filter(filterFn).map(mapFn);
  }
};

// Example usage of advanced utilities
export function advancedDemo() {
  const features = [
    FeatureFlag.FEAT_PREMIUM,
    FeatureFlag.FEAT_ENCRYPTION,
    FeatureFlag.FEAT_AUTO_HEAL
  ];

  // Pure operations that can be optimized
  const enabledFeatures = /*@__PURE__*/ PureOptimizations.filterMap(
    features,
    (flag) => isFeatureEnabled(flag),
    (flag) => getFeatureBadge(flag, true)
  );

  console.log('🚀 Advanced optimizations:', enabledFeatures);
}

// Export for testing
export {
    calculateSystemHealth, generatePerformanceReport, initializeFeatures,
    renderDashboard
};

// Run demo if this file is executed directly
if (import.meta.main) {
  demonstrateOptimizations();
  advancedDemo();
}
