/**
 * FactoryWager Variant Testing System
 * Comprehensive A/B testing framework with feature flags and analytics
 */

import { CookieManager, VariantConfig, ExperimentConfig } from './cookie-manager';

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions?: () => boolean;
  variants?: Record<string, boolean>;
}

export interface TestConfig {
  id: string;
  name: string;
  description: string;
  variants: VariantConfig[];
  trafficAllocation: number;
  targeting?: {
    countries?: string[];
    devices?: string[];
    browsers?: string[];
    customAttributes?: Record<string, any>;
  };
  successMetrics: string[];
}

export interface VariantAnalytics {
  variantId: string;
  experimentId: string;
  userId: string;
  sessionId: string;
  timestamp: string;
  events: Array<{
    type: 'impression' | 'click' | 'conversion' | 'custom';
    target?: string;
    value?: number;
    metadata?: Record<string, any>;
  }>;
}

export class VariantTesting {
  private static instance: VariantTesting;
  private cookieManager: CookieManager;
  private featureFlags: Map<string, FeatureFlag> = new Map();
  private activeTests: Map<string, TestConfig> = new Map();
  private analytics: VariantAnalytics[] = [];
  private isInitialized = false;

  constructor() {
    this.cookieManager = CookieManager.getInstance();
    this.initializeFeatureFlags();
    this.initializeTests();
  }

  static getInstance(): VariantTesting {
    if (!VariantTesting.instance) {
      VariantTesting.instance = new VariantTesting();
    }
    return VariantTesting.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Assign variants for active experiments
    for (const [testId, test] of this.activeTests) {
      const variant = this.cookieManager.assignVariant(testId);
      if (variant) {
        console.log(`Assigned variant ${variant.id} for test ${test.name}`);
        this.trackEvent('variant_assigned', {
          testId,
          variantId: variant.id,
          variantName: variant.name
        });
      }
    }

    // Execute prefetching based on variant
    this.executeVariantSpecificPrefetching();

    this.isInitialized = true;
  }

  private initializeFeatureFlags() {
    // UI Features
    this.featureFlags.set('enhanced_ui', {
      id: 'enhanced_ui',
      name: 'Enhanced UI',
      description: 'Advanced UI with animations and micro-interactions',
      enabled: false,
      variants: {
        'control': false,
        'enhanced': true,
        'minimal': false
      }
    });

    this.featureFlags.set('advanced_analytics', {
      id: 'advanced_analytics',
      name: 'Advanced Analytics',
      description: 'Detailed analytics and performance metrics',
      enabled: true,
      conditions: () => this.cookieManager.hasAnalyticsConsent()
    });

    this.featureFlags.set('smart_prefetch', {
      id: 'smart_prefetch',
      name: 'Smart Prefetching',
      description: 'Intelligent resource prefetching based on user behavior',
      enabled: true,
      conditions: () => {
        if (typeof navigator === 'undefined') return false;
        const connection = (navigator as any).connection;
        return !connection || connection.effectiveType !== 'slow-2g';
      }
    });

    this.featureFlags.set('experimental_features', {
      id: 'experimental_features',
      name: 'Experimental Features',
      description: 'Cutting-edge features in development',
      enabled: false,
      variants: {
        'control': false,
        'enhanced': false,
        'minimal': true
      }
    });

    // Performance Features
    this.featureFlags.set('aggressive_caching', {
      id: 'aggressive_caching',
      name: 'Aggressive Caching',
      description: 'Enhanced caching strategies for better performance',
      enabled: false,
      variants: {
        'standard': false,
        'optimized': true
      }
    });

    this.featureFlags.set('resource_hints', {
      id: 'resource_hints',
      name: 'Resource Hints',
      description: 'Preload and prefetch critical resources',
      enabled: true
    });

    // Content Features
    this.featureFlags.set('beta_content', {
      id: 'beta_content',
      name: 'Beta Content',
      description: 'Show beta features and content',
      enabled: false,
      conditions: () => {
        const userRole = this.cookieManager.getCookie('fw_user_role');
        return userRole === 'beta_tester' || userRole === 'admin';
      }
    });
  }

  private initializeTests() {
    // Main UI Test
    this.activeTests.set('ui_variant_2024', {
      id: 'ui_variant_2024',
      name: 'UI Design Variants 2024',
      description: 'Testing different UI designs for optimal user experience',
      variants: [
        {
          id: 'control',
          name: 'Control - Standard UI',
          weight: 0.5,
          features: ['standard-layout', 'default-colors', 'basic-components'],
          cookies: []
        },
        {
          id: 'enhanced',
          name: 'Enhanced UI with Animations',
          weight: 0.3,
          features: ['enhanced-layout', 'gradient-colors', 'animated-components'],
          cookies: []
        },
        {
          id: 'minimal',
          name: 'Minimal UI',
          weight: 0.2,
          features: ['minimal-layout', 'monochrome-colors', 'simple-components'],
          cookies: []
        }
      ],
      trafficAllocation: 1.0,
      successMetrics: ['engagement_time', 'click_through_rate', 'conversion_rate']
    });

    // Performance Test
    this.activeTests.set('performance_optimization', {
      id: 'performance_optimization',
      name: 'Performance Optimization Test',
      description: 'Testing different performance optimization strategies',
      variants: [
        {
          id: 'standard',
          name: 'Standard Performance',
          weight: 0.5,
          features: ['standard-caching', 'normal-prefetch'],
          cookies: []
        },
        {
          id: 'optimized',
          name: 'Optimized Performance',
          weight: 0.5,
          features: ['aggressive-caching', 'smart-prefetch', 'resource-hints'],
          cookies: []
        }
      ],
      trafficAllocation: 0.5,
      successMetrics: ['page_load_time', 'time_to_interactive', 'bounce_rate']
    });

    // Feature Flag Test
    this.activeTests.set('feature_flags_test', {
      id: 'feature_flags_test',
      name: 'Feature Flag Effectiveness',
      description: 'Testing the impact of different feature combinations',
      variants: [
        {
          id: 'basic',
          name: 'Basic Features',
          weight: 0.4,
          features: ['essential-only'],
          cookies: []
        },
        {
          id: 'enhanced',
          name: 'Enhanced Features',
          weight: 0.4,
          features: ['essential-plus', 'ui-improvements'],
          cookies: []
        },
        {
          id: 'full',
          name: 'Full Feature Set',
          weight: 0.2,
          features: ['all-features', 'experimental'],
          cookies: []
        }
      ],
      trafficAllocation: 0.3,
      successMetrics: ['feature_adoption', 'user_satisfaction', 'retention_rate']
    });
  }

  isFeatureEnabled(featureId: string): boolean {
    const flag = this.featureFlags.get(featureId);
    if (!flag) return false;

    // Check conditions
    if (flag.conditions && !flag.conditions()) {
      return false;
    }

    // Check variant-specific overrides
    const currentVariant = this.cookieManager.getCurrentVariant();
    if (currentVariant && flag.variants) {
      return flag.variants[currentVariant.id] ?? flag.enabled;
    }

    return flag.enabled;
  }

  getCurrentVariant(testId?: string): VariantConfig | null {
    if (testId) {
      const test = this.activeTests.get(testId);
      if (!test) return null;
      
      const variant = this.cookieManager.assignVariant(testId);
      return variant;
    }

    return this.cookieManager.getCurrentVariant();
  }

  getVariantFeatures(testId?: string): string[] {
    const variant = this.getCurrentVariant(testId);
    return variant?.features || [];
  }

  hasFeature(featureId: string): boolean {
    const currentVariant = this.cookieManager.getCurrentVariant();
    if (!currentVariant) return this.isFeatureEnabled(featureId);

    return currentVariant.features.includes(featureId) || this.isFeatureEnabled(featureId);
  }

  // Analytics and tracking
  trackEvent(eventType: string, data?: Record<string, any>): void {
    const currentVariant = this.cookieManager.getCurrentVariant();
    const sessionId = this.cookieManager.getCookie('fw_session');

    const analyticsEvent: VariantAnalytics = {
      variantId: currentVariant?.id || 'control',
      experimentId: currentVariant ? 'ui_variant_2024' : 'none',
      userId: this.getUserId(),
      sessionId: sessionId || 'unknown',
      timestamp: new Date().toISOString(),
      events: [{
        type: eventType as any,
        value: data?.value,
        metadata: data
      }]
    };

    this.analytics.push(analyticsEvent);
    this.cookieManager.trackEvent(eventType, data);
  }

  trackConversion(testId: string, value?: number): void {
    const variant = this.getCurrentVariant(testId);
    if (!variant) return;

    this.trackEvent('conversion', {
      testId,
      variantId: variant.id,
      value,
      timestamp: new Date().toISOString()
    });
  }

  trackImpression(element: string, testId?: string): void {
    const variant = this.getCurrentVariant(testId);
    if (!variant) return;

    this.trackEvent('impression', {
      element,
      testId,
      variantId: variant.id,
      timestamp: new Date().toISOString()
    });
  }

  trackClick(element: string, testId?: string): void {
    const variant = this.getCurrentVariant(testId);
    if (!variant) return;

    this.trackEvent('click', {
      element,
      testId,
      variantId: variant.id,
      timestamp: new Date().toISOString()
    });
  }

  // Component helpers
  withVariantTracking(element: HTMLElement, testId?: string): void {
    const variant = this.getCurrentVariant(testId);
    if (!variant) return;

    // Track impression
    this.trackImpression(element.tagName.toLowerCase(), testId);

    // Track clicks
    element.addEventListener('click', () => {
      this.trackClick(element.tagName.toLowerCase(), testId);
    });

    // Add variant data attributes
    element.setAttribute('data-variant', variant.id);
    element.setAttribute('data-test', testId || 'default');
  }

  // Dynamic content based on variants
  getVariantContent(contentKey: string, testId?: string): any {
    const variant = this.getCurrentVariant(testId);
    if (!variant) return null;

    const contentMap: Record<string, Record<string, any>> = {
      'ui_variant_2024': {
        'control': {
          theme: 'default',
          layout: 'standard',
          animations: false,
          colors: ['#3b82f6', '#22c55e', '#f59e0b']
        },
        'enhanced': {
          theme: 'gradient',
          layout: 'modern',
          animations: true,
          colors: ['#8b5cf6', '#ec4899', '#f97316']
        },
        'minimal': {
          theme: 'monochrome',
          layout: 'clean',
          animations: false,
          colors: ['#1f2937', '#6b7280', '#9ca3af']
        }
      },
      'performance_optimization': {
        'standard': {
          prefetchLevel: 'conservative',
          cacheStrategy: 'basic',
          resourceHints: false
        },
        'optimized': {
          prefetchLevel: 'aggressive',
          cacheStrategy: 'advanced',
          resourceHints: true
        }
      }
    };

    return contentMap[testId || 'ui_variant_2024']?.[variant.id] || null;
  }

  private executeVariantSpecificPrefetching(): void {
    const variant = this.cookieManager.getCurrentVariant();
    if (!variant) return;

    const { PrefetchManager } = require('./prefetch-manager');
    const prefetchManager = PrefetchManager.getInstance();

    // Execute prefetching based on variant features
    if (variant.features.includes('smart-prefetch')) {
      prefetchManager.adaptivePrefetch();
    }

    if (variant.features.includes('resource-hints')) {
      prefetchManager.executeStrategy('critical_preload');
    }
  }

  private getUserId(): string {
    let userId = this.cookieManager.getCookie('fw_user_id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 16);
      this.cookieManager.setCookie({
        name: 'fw_user_id',
        value: userId,
        domain: '.factory-wager.com',
        path: '/',
        maxAge: 31536000, // 1 year
        secure: true,
        sameSite: 'strict'
      });
    }
    return userId;
  }

  // Admin functions
  getTestResults(testId: string): VariantAnalytics[] {
    return this.analytics.filter(a => a.experimentId === testId);
  }

  getAllAnalytics(): VariantAnalytics[] {
    return this.analytics;
  }

  clearAnalytics(): void {
    this.analytics = [];
  }

  // Feature flag management
  enableFeature(featureId: string): void {
    const flag = this.featureFlags.get(featureId);
    if (flag) {
      flag.enabled = true;
      this.trackEvent('feature_enabled', { featureId });
    }
  }

  disableFeature(featureId: string): void {
    const flag = this.featureFlags.get(featureId);
    if (flag) {
      flag.enabled = false;
      this.trackEvent('feature_disabled', { featureId });
    }
  }

  getFeatureFlags(): FeatureFlag[] {
    return Array.from(this.featureFlags.values());
  }

  getActiveTests(): TestConfig[] {
    return Array.from(this.activeTests.values());
  }
}

export default VariantTesting;
