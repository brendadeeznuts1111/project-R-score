/**
 * FactoryWager Cookie Management System
 * Handles A/B testing variants, user preferences, and session management
 */

export interface CookieConfig {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: Date;
  maxAge?: number;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

export interface VariantConfig {
  id: string;
  name: string;
  weight: number;
  features: string[];
  cookies: CookieConfig[];
}

export interface ExperimentConfig {
  id: string;
  name: string;
  variants: VariantConfig[];
  trafficAllocation: number;
  startDate: Date;
  endDate?: Date;
}

export class CookieManager {
  private static instance: CookieManager;
  private config: Map<string, CookieConfig> = new Map();
  private experiments: Map<string, ExperimentConfig> = new Map();
  private currentVariant: VariantConfig | null = null;

  constructor() {
    this.initializeDefaultConfig();
    this.initializeExperiments();
  }

  static getInstance(): CookieManager {
    if (!CookieManager.instance) {
      CookieManager.instance = new CookieManager();
    }
    return CookieManager.instance;
  }

  private initializeDefaultConfig() {
    // Session management
    this.config.set('session_id', {
      name: 'fw_session',
      value: this.generateSessionId(),
      domain: '.factory-wager.com',
      path: '/',
      maxAge: 3600, // 1 hour
      secure: true,
      httpOnly: true,
      sameSite: 'strict'
    });

    // User preferences
    this.config.set('theme', {
      name: 'fw_theme',
      value: 'auto',
      domain: '.factory-wager.com',
      path: '/',
      maxAge: 31536000, // 1 year
      secure: true,
      sameSite: 'lax'
    });

    // Analytics consent
    this.config.set('analytics', {
      name: 'fw_analytics',
      value: 'granted',
      domain: '.factory-wager.com',
      path: '/',
      maxAge: 2592000, // 30 days
      secure: true,
      sameSite: 'lax'
    });

    // Performance tracking
    this.config.set('performance', {
      name: 'fw_performance',
      value: 'enabled',
      domain: '.factory-wager.com',
      path: '/',
      maxAge: 86400, // 1 day
      secure: true,
      httpOnly: true,
      sameSite: 'strict'
    });
  }

  private initializeExperiments() {
    // UI Variant Experiment
    this.experiments.set('ui_variant_2024', {
      id: 'ui_variant_2024',
      name: 'UI Design Variants',
      trafficAllocation: 1.0, // 100% traffic
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      variants: [
        {
          id: 'variant_a',
          name: 'Control - Standard UI',
          weight: 0.5,
          features: ['standard-layout', 'default-colors', 'basic-components'],
          cookies: [
            {
              name: 'fw_ui_variant',
              value: 'control',
              domain: '.factory-wager.com',
              path: '/',
              maxAge: 86400,
              secure: true,
              sameSite: 'lax'
            }
          ]
        },
        {
          id: 'variant_b',
          name: 'Enhanced UI with Animations',
          weight: 0.3,
          features: ['enhanced-layout', 'gradient-colors', 'animated-components', 'micro-interactions'],
          cookies: [
            {
              name: 'fw_ui_variant',
              value: 'enhanced',
              domain: '.factory-wager.com',
              path: '/',
              maxAge: 86400,
              secure: true,
              sameSite: 'lax'
            }
          ]
        },
        {
          id: 'variant_c',
          name: 'Minimal UI',
          weight: 0.2,
          features: ['minimal-layout', 'monochrome-colors', 'simple-components', 'fast-loading'],
          cookies: [
            {
              name: 'fw_ui_variant',
              value: 'minimal',
              domain: '.factory-wager.com',
              path: '/',
              maxAge: 86400,
              secure: true,
              sameSite: 'lax'
            }
          ]
        }
      ]
    });

    // Performance Optimization Experiment
    this.experiments.set('performance_optimization', {
      id: 'performance_optimization',
      name: 'Performance Optimization Features',
      trafficAllocation: 0.5, // 50% traffic
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-06-30'),
      variants: [
        {
          id: 'perf_standard',
          name: 'Standard Performance',
          weight: 0.5,
          features: ['standard-caching', 'normal-prefetch', 'basic-compression'],
          cookies: [
            {
              name: 'fw_perf_variant',
              value: 'standard',
              domain: '.factory-wager.com',
              path: '/',
              maxAge: 3600,
              secure: true,
              httpOnly: true,
              sameSite: 'strict'
            }
          ]
        },
        {
          id: 'perf_optimized',
          name: 'Optimized Performance',
          weight: 0.5,
          features: ['aggressive-caching', 'smart-prefetch', 'advanced-compression', 'resource-hints'],
          cookies: [
            {
              name: 'fw_perf_variant',
              value: 'optimized',
              domain: '.factory-wager.com',
              path: '/',
              maxAge: 3600,
              secure: true,
              httpOnly: true,
              sameSite: 'strict'
            }
          ]
        }
      ]
    });
  }

  private generateSessionId(): string {
    return 'sess_' + Math.random().toString(36).substr(2, 16) + Date.now().toString(36);
  }

  assignVariant(experimentId: string): VariantConfig | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;

    // Check if user is already in a variant
    const existingVariant = this.getCookie('fw_ui_variant');
    if (existingVariant) {
      const variant = experiment.variants.find(v => v.cookies.some(c => c.value === existingVariant));
      if (variant) {
        this.currentVariant = variant;
        return variant;
      }
    }

    // Assign new variant based on weights
    const random = Math.random();
    let cumulativeWeight = 0;

    for (const variant of experiment.variants) {
      cumulativeWeight += variant.weight;
      if (random <= cumulativeWeight) {
        this.currentVariant = variant;
        
        // Set variant cookies
        variant.cookies.forEach(cookie => {
          this.setCookie(cookie);
        });

        return variant;
      }
    }

    return null;
  }

  getCurrentVariant(): VariantConfig | null {
    return this.currentVariant;
  }

  getVariantFeatures(): string[] {
    return this.currentVariant?.features || [];
  }

  setCookie(config: CookieConfig): void {
    if (typeof document === 'undefined') return;

    let cookieString = `${config.name}=${encodeURIComponent(config.value)}`;
    
    if (config.domain) {
      cookieString += `; domain=${config.domain}`;
    }
    
    if (config.path) {
      cookieString += `; path=${config.path}`;
    }
    
    if (config.expires) {
      cookieString += `; expires=${config.expires.toUTCString()}`;
    }
    
    if (config.maxAge) {
      cookieString += `; max-age=${config.maxAge}`;
    }
    
    if (config.secure) {
      cookieString += `; secure`;
    }
    
    if (config.httpOnly) {
      cookieString += `; httponly`;
    }
    
    if (config.sameSite) {
      cookieString += `; samesite=${config.sameSite}`;
    }

    document.cookie = cookieString;
    this.config.set(config.name, config);
  }

  getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;

    const nameEQ = name + '=';
    const cookies = document.cookie.split(';');
    
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.indexOf(nameEQ) === 0) {
        return decodeURIComponent(cookie.substring(nameEQ.length));
      }
    }
    
    return null;
  }

  deleteCookie(name: string): void {
    if (typeof document === 'undefined') return;

    const config = this.config.get(name);
    if (!config) return;

    this.setCookie({
      ...config,
      value: '',
      maxAge: -1
    });

    this.config.delete(name);
  }

  getAllCookies(): Record<string, string> {
    if (typeof document === 'undefined') return {};

    const cookies: Record<string, string> = {};
    const cookieArray = document.cookie.split(';');

    for (let cookie of cookieArray) {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    }

    return cookies;
  }

  // Analytics and tracking
  trackEvent(event: string, data?: Record<string, any>): void {
    const sessionId = this.getCookie('fw_session');
    const variant = this.getCurrentVariant();

    const eventData = {
      event,
      timestamp: new Date().toISOString(),
      sessionId,
      variant: variant?.id,
      features: variant?.features,
      ...data
    };

    // Send to analytics endpoint
    this.sendToAnalytics(eventData);
  }

  private sendToAnalytics(data: any): void {
    if (typeof fetch === 'undefined') return;

    fetch('https://monitor.factory-wager.com/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': this.getCookie('fw_session') || '',
        'X-Variant': this.getCurrentVariant()?.id || ''
      },
      body: JSON.stringify(data),
      keepalive: true
    }).catch(() => {
      // Silently fail for analytics
    });
  }

  // Consent management
  grantAnalyticsConsent(): void {
    this.setCookie({
      name: 'fw_analytics',
      value: 'granted',
      domain: '.factory-wager.com',
      path: '/',
      maxAge: 2592000,
      secure: true,
      sameSite: 'lax'
    });
  }

  revokeAnalyticsConsent(): void {
    this.setCookie({
      name: 'fw_analytics',
      value: 'denied',
      domain: '.factory-wager.com',
      path: '/',
      maxAge: 2592000,
      secure: true,
      sameSite: 'lax'
    });
  }

  hasAnalyticsConsent(): boolean {
    return this.getCookie('fw_analytics') === 'granted';
  }
}

export default CookieManager;
