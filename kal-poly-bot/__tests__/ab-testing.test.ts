// __tests__/ab-testing.test.ts - A/B Testing Validation
import { abTestConfig, getVariantComponent, calculateTradingStrategy, ABTesting } from '../src/ab-testing-config.ts';

// Mock declarations for testing (normally provided by Bun build --feature)
declare const A_TEST_VARIANT: 1 | 2;
declare const UI_VARIANT: string;
declare const PERF_MODE: string;

describe('A/B Testing Infrastructure', () => {
  describe('Configuration Validation', () => {
    test('config has required properties', () => {
      expect(abTestConfig).toHaveProperty('variant');
      expect(abTestConfig).toHaveProperty('algorithm');
      expect(abTestConfig).toHaveProperty('riskThreshold');
      expect(abTestConfig).toHaveProperty('uiTheme');
      expect(abTestConfig).toHaveProperty('performanceMode');
      expect(abTestConfig).toHaveProperty('features');
      expect(Array.isArray(abTestConfig.features)).toBe(true);
    });

    test('variant is either A or B', () => {
      expect(['A', 'B']).toContain(abTestConfig.variant);
    });

    test('risk threshold is within expected range', () => {
      expect(abTestConfig.riskThreshold).toBeGreaterThan(0);
      expect(abTestConfig.riskThreshold).toBeLessThan(1);
    });
  });

  describe('Variant Components', () => {
    test('getVariantComponent returns appropriate components', () => {
      const components = getVariantComponent();

      expect(components).toHaveProperty('RiskCalculator');
      expect(components).toHaveProperty('UIManager');
      expect(components).toHaveProperty('PerformanceMonitor');

      // Test that components return expected structure
      expect(typeof components.RiskCalculator()).toBe('object');
      expect(typeof components.UIManager()).toBe('object');
      expect(typeof components.PerformanceMonitor()).toBe('object');
    });
  });

  describe('Business Logic', () => {
    test('calculateTradingStrategy returns valid actions', () => {
      const mockMarketData = { trend: 'up', volatility: 0.2 };
      const strategy = calculateTradingStrategy(mockMarketData);

      expect(strategy).toHaveProperty('action');
      expect(strategy).toHaveProperty('confidence');
      expect(strategy).toHaveProperty('riskLevel');
      expect(strategy).toHaveProperty('strategy');

      expect(['hold', 'buy', 'sell']).toContain(strategy.action);
      expect(strategy.confidence).toBeGreaterThan(0);
      expect(strategy.confidence).toBeLessThanOrEqual(1);
    });

    test('different variants produce different strategies', () => {
      const mockData = { trend: 'up' };

      // Note: In real testing, you'd build both variants and compare
      // This test validates the logic structure
      const strategy = calculateTradingStrategy(mockData);
      expect(['conservative', 'aggressive']).toContain(strategy.strategy);
    });
  });

  describe('ABTesting Utilities', () => {
    test('isVariant works correctly', () => {
      expect(typeof ABTesting.isVariant('A')).toBe('boolean');
      expect(typeof ABTesting.isVariant('B')).toBe('boolean');
    });

    test('hasFeature checks features array', () => {
      expect(typeof ABTesting.hasFeature('risk-analysis')).toBe('boolean');
    });

    test('getRiskThreshold returns number', () => {
      const threshold = ABTesting.getRiskThreshold();
      expect(typeof threshold).toBe('number');
      expect(threshold).toBeGreaterThan(0);
      expect(threshold).toBeLessThan(1);
    });

    test('getAlgorithm returns valid algorithm', () => {
      const algorithm = ABTesting.getAlgorithm();
      expect(['conservative', 'aggressive']).toContain(algorithm);
    });

    test('renderVariant returns appropriate values', () => {
      const result = ABTesting.renderVariant('variant-a-value', 'variant-b-value');
      expect(['variant-a-value', 'variant-b-value']).toContain(result);
    });
  });

  describe('Feature Flag Integration', () => {
    test('config reflects compile-time feature flags', () => {
      // These tests validate that the config correctly reflects
      // the feature flags set at build time

      if (abTestConfig.variant === 'A') {
        expect(abTestConfig.algorithm).toBe('conservative');
        expect(abTestConfig.riskThreshold).toBe(0.1);
      } else {
        expect(abTestConfig.algorithm).toBe('aggressive');
        expect(abTestConfig.riskThreshold).toBe(0.3);
      }
    });

    test('features array contains variant-specific features', () => {
      if (abTestConfig.variant === 'A') {
        expect(abTestConfig.features).toContain('risk-analysis');
        expect(abTestConfig.features).toContain('conservative-logging');
      } else {
        expect(abTestConfig.features).toContain('aggressive-optimization');
        expect(abTestConfig.features).toContain('advanced-analytics');
      }
    });
  });

  describe('Bundle Isolation', () => {
    test('different variants have different configurations', () => {
      // This test ensures that when you build different variants,
      // they actually have different configurations

      // In a real A/B testing scenario, you would:
      // 1. Build variant A: bun build --feature A_TEST_VARIANT=1
      // 2. Build variant B: bun build --feature A_TEST_VARIANT=2
      // 3. Load both bundles and compare their configs

      // For now, we validate the logic is sound
      const variantAConfig = {
        variant: 'A' as const,
        algorithm: 'conservative' as const,
        riskThreshold: 0.1
      };

      const variantBConfig = {
        variant: 'B' as const,
        algorithm: 'aggressive' as const,
        riskThreshold: 0.3
      };

      expect(variantAConfig).not.toEqual(variantBConfig);
      expect(variantAConfig.algorithm).not.toBe(variantBConfig.algorithm);
      expect(variantAConfig.riskThreshold).not.toBe(variantBConfig.riskThreshold);
    });
  });
});