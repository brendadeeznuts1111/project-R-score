/**
 * Fantasy42 Cloudflare Integration
 * Advanced Cloudflare challenge handling, security optimization, and performance enhancement
 * Targets: Cloudflare challenge platform, security headers, performance optimization
 */

import { XPathElementHandler, handleFantasy42Element } from '../ui/xpath-element-handler';
import { Fantasy42AgentClient } from '../../src/api/fantasy42-agent-client';
import { Fantasy42UnifiedIntegration } from './fantasy42-unified-integration';

export interface CloudflareConfig {
  challengeDetection: boolean;
  challengeTimeout: number;
  challengeRetryAttempts: number;
  challengeRetryDelay: number;
  fallbackStrategy: 'retry' | 'bypass' | 'redirect';
  securityHeaders: {
    enabled: boolean;
    strictTransportSecurity: boolean;
    contentSecurityPolicy: boolean;
    xFrameOptions: boolean;
    xContentTypeOptions: boolean;
  };
  performance: {
    cdnOptimization: boolean;
    imageOptimization: boolean;
    cachingStrategy: 'aggressive' | 'moderate' | 'conservative';
    compressionEnabled: boolean;
  };
  monitoring: {
    challengeTracking: boolean;
    performanceMetrics: boolean;
    securityEvents: boolean;
    errorLogging: boolean;
  };
}

export interface ChallengeState {
  isActive: boolean;
  challengeId: string | null;
  startTime: string | null;
  endTime: string | null;
  attempts: number;
  lastError: string | null;
  userAgent: string;
  ipAddress?: string;
  geolocation?: {
    country: string;
    region: string;
    city: string;
  };
}

export interface CloudflareAnalytics {
  challengeMetrics: {
    totalChallenges: number;
    successfulChallenges: number;
    failedChallenges: number;
    averageCompletionTime: number;
    challengeTypes: Record<string, number>;
  };
  performanceMetrics: {
    cdnResponseTime: number;
    cacheHitRate: number;
    compressionRatio: number;
    bandwidthSavings: number;
  };
  securityMetrics: {
    blockedRequests: number;
    suspiciousActivity: number;
    ddosAttempts: number;
    botDetections: number;
  };
  errorMetrics: {
    challengeErrors: number;
    networkErrors: number;
    timeoutErrors: number;
    scriptErrors: number;
  };
}

export interface ChallengeEvent {
  type: 'challenge_started' | 'challenge_completed' | 'challenge_failed' | 'challenge_timeout';
  timestamp: string;
  challengeId: string;
  duration?: number;
  error?: string;
  userAgent: string;
  url: string;
  metadata?: Record<string, any>;
}

export class Fantasy42CloudflareIntegration {
  private xpathHandler: XPathElementHandler;
  private fantasyClient: Fantasy42AgentClient;
  private unifiedIntegration: Fantasy42UnifiedIntegration;

  private config: CloudflareConfig;
  private challengeState: ChallengeState;
  private analytics: CloudflareAnalytics;
  private challengeEvents: ChallengeEvent[] = [];
  private isInitialized: boolean = false;

  private eventListeners: Map<string, EventListener> = new Map();
  private observers: Map<string, MutationObserver> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    fantasyClient: Fantasy42AgentClient,
    unifiedIntegration: Fantasy42UnifiedIntegration,
    config?: Partial<CloudflareConfig>
  ) {
    this.xpathHandler = XPathElementHandler.getInstance();
    this.fantasyClient = fantasyClient;
    this.unifiedIntegration = unifiedIntegration;

    this.config = this.createDefaultConfig();
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.challengeState = this.initializeChallengeState();
    this.analytics = this.initializeAnalytics();
  }

  /**
   * Initialize Cloudflare integration
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('☁️ Initializing Fantasy42 Cloudflare Integration...');

      // Check for existing Cloudflare challenge
      await this.detectExistingChallenge();

      // Setup challenge detection
      if (this.config.challengeDetection) {
        await this.setupChallengeDetection();
      }

      // Initialize security headers
      if (this.config.securityHeaders.enabled) {
        await this.initializeSecurityHeaders();
      }

      // Setup performance optimization
      if (this.config.performance.cdnOptimization) {
        await this.initializePerformanceOptimization();
      }

      // Initialize monitoring
      if (this.config.monitoring.challengeTracking) {
        await this.initializeMonitoring();
      }

      // Setup error handling
      await this.setupErrorHandling();

      this.isInitialized = true;
      console.log('✅ Fantasy42 Cloudflare Integration initialized');

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Cloudflare integration:', error);
      return false;
    }
  }

  /**
   * Create default Cloudflare configuration
   */
  private createDefaultConfig(): CloudflareConfig {
    return {
      challengeDetection: true,
      challengeTimeout: 30000, // 30 seconds
      challengeRetryAttempts: 3,
      challengeRetryDelay: 5000, // 5 seconds
      fallbackStrategy: 'retry',
      securityHeaders: {
        enabled: true,
        strictTransportSecurity: true,
        contentSecurityPolicy: true,
        xFrameOptions: true,
        xContentTypeOptions: true,
      },
      performance: {
        cdnOptimization: true,
        imageOptimization: true,
        cachingStrategy: 'moderate',
        compressionEnabled: true,
      },
      monitoring: {
        challengeTracking: true,
        performanceMetrics: true,
        securityEvents: true,
        errorLogging: true,
      },
    };
  }

  /**
   * Initialize challenge state
   */
  private initializeChallengeState(): ChallengeState {
    return {
      isActive: false,
      challengeId: null,
      startTime: null,
      endTime: null,
      attempts: 0,
      lastError: null,
      userAgent: navigator.userAgent,
    };
  }

  /**
   * Initialize analytics
   */
  private initializeAnalytics(): CloudflareAnalytics {
    return {
      challengeMetrics: {
        totalChallenges: 0,
        successfulChallenges: 0,
        failedChallenges: 0,
        averageCompletionTime: 0,
        challengeTypes: {},
      },
      performanceMetrics: {
        cdnResponseTime: 0,
        cacheHitRate: 0,
        compressionRatio: 0,
        bandwidthSavings: 0,
      },
      securityMetrics: {
        blockedRequests: 0,
        suspiciousActivity: 0,
        ddosAttempts: 0,
        botDetections: 0,
      },
      errorMetrics: {
        challengeErrors: 0,
        networkErrors: 0,
        timeoutErrors: 0,
        scriptErrors: 0,
      },
    };
  }

  /**
   * Detect existing Cloudflare challenge
   */
  private async detectExistingChallenge(): Promise<void> {
    // Check for Cloudflare challenge indicators
    const challengeIndicators = [
      // Check for challenge script
      document.querySelector('script[src*="jsd/main.js"]'),
      // Check for challenge parameters
      window.__CF$cv$params,
      // Check for challenge iframe
      document.querySelector('iframe[src*="challenge-platform"]'),
      // Check for about:blank with challenge
      document.querySelector('script[src*="challenge-platform"]'),
    ];

    const hasChallenge = challengeIndicators.some(indicator => !!indicator);

    if (hasChallenge) {
      console.log('🚨 Cloudflare challenge detected');
      await this.handleExistingChallenge();
    } else {
      console.log('✅ No active Cloudflare challenge detected');
    }
  }

  /**
   * Handle existing Cloudflare challenge
   */
  private async handleExistingChallenge(): Promise<void> {
    const challengeId = this.generateChallengeId();

    this.challengeState = {
      ...this.challengeState,
      isActive: true,
      challengeId,
      startTime: new Date().toISOString(),
      attempts: 1,
    };

    // Log challenge start
    this.logChallengeEvent({
      type: 'challenge_started',
      timestamp: new Date().toISOString(),
      challengeId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      metadata: {
        referrer: document.referrer,
        challengeParams: window.__CF$cv$params,
      },
    });

    // Setup challenge monitoring
    await this.setupChallengeMonitoring(challengeId);

    // Setup timeout handling
    this.setupChallengeTimeout(challengeId);

    console.log(`🎯 Handling Cloudflare challenge: ${challengeId}`);
  }

  /**
   * Setup challenge detection
   */
  private async setupChallengeDetection(): Promise<void> {
    // Monitor for new challenge scripts
    const scriptObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (
                element.tagName === 'SCRIPT' &&
                element.getAttribute('src')?.includes('challenge-platform')
              ) {
                console.log('🚨 New Cloudflare challenge script detected');
                this.handleNewChallenge(element as HTMLScriptElement);
              }
            }
          });
        }
      });
    });

    scriptObserver.observe(document.head, {
      childList: true,
      subtree: true,
    });

    this.observers.set('script-observer', scriptObserver);

    // Monitor for challenge iframes
    const iframeObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (
                element.tagName === 'IFRAME' &&
                element.getAttribute('src')?.includes('challenge-platform')
              ) {
                console.log('🚨 New Cloudflare challenge iframe detected');
                this.handleNewChallenge(element as HTMLIFrameElement);
              }
            }
          });
        }
      });
    });

    iframeObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    this.observers.set('iframe-observer', iframeObserver);

    // Monitor for challenge parameters
    const paramsObserver = new MutationObserver(() => {
      if (window.__CF$cv$params && !this.challengeState.isActive) {
        console.log('🚨 Cloudflare challenge parameters detected');
        this.handleChallengeParameters(window.__CF$cv$params);
      }
    });

    // Observe window object changes (limited support)
    this.observers.set('params-observer', paramsObserver);

    console.log('👁️ Cloudflare challenge detection setup');
  }

  /**
   * Handle new challenge script
   */
  private async handleNewChallenge(element: HTMLScriptElement | HTMLIFrameElement): Promise<void> {
    if (this.challengeState.isActive) {
      console.log('⚠️ Challenge already active, ignoring new challenge');
      return;
    }

    const challengeId = this.generateChallengeId();

    this.challengeState = {
      ...this.challengeState,
      isActive: true,
      challengeId,
      startTime: new Date().toISOString(),
      attempts: 1,
    };

    // Log challenge start
    this.logChallengeEvent({
      type: 'challenge_started',
      timestamp: new Date().toISOString(),
      challengeId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      metadata: {
        elementType: element.tagName.toLowerCase(),
        src: element.getAttribute('src'),
        challengeParams: window.__CF$cv$params,
      },
    });

    // Setup monitoring and timeout
    await this.setupChallengeMonitoring(challengeId);
    this.setupChallengeTimeout(challengeId);

    console.log(`🎯 New challenge initiated: ${challengeId}`);
  }

  /**
   * Handle challenge parameters
   */
  private async handleChallengeParameters(params: any): Promise<void> {
    if (this.challengeState.isActive) {
      console.log('⚠️ Challenge already active, updating parameters');
      return;
    }

    const challengeId = this.generateChallengeId();

    this.challengeState = {
      ...this.challengeState,
      isActive: true,
      challengeId,
      startTime: new Date().toISOString(),
      attempts: 1,
    };

    // Log challenge start with parameters
    this.logChallengeEvent({
      type: 'challenge_started',
      timestamp: new Date().toISOString(),
      challengeId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      metadata: {
        challengeParams: params,
        rayId: params.r,
        timestamp: params.t,
      },
    });

    // Setup monitoring and timeout
    await this.setupChallengeMonitoring(challengeId);
    this.setupChallengeTimeout(challengeId);

    console.log(`🎯 Challenge parameters handled: ${challengeId}`);
  }

  /**
   * Setup challenge monitoring
   */
  private async setupChallengeMonitoring(challengeId: string): Promise<void> {
    // Monitor for challenge completion
    const completionChecker = setInterval(() => {
      if (!this.challengeState.isActive || this.challengeState.challengeId !== challengeId) {
        clearInterval(completionChecker);
        return;
      }

      // Check if challenge is completed
      const challengeCompleted = this.checkChallengeCompletion();

      if (challengeCompleted) {
        this.handleChallengeCompletion(challengeId);
        clearInterval(completionChecker);
      }
    }, 1000);

    this.timers.set(`completion-checker-${challengeId}`, completionChecker);

    // Monitor for challenge errors
    const errorChecker = setInterval(() => {
      if (!this.challengeState.isActive || this.challengeState.challengeId !== challengeId) {
        clearInterval(errorChecker);
        return;
      }

      // Check for challenge errors
      const challengeError = this.checkChallengeError();

      if (challengeError) {
        this.handleChallengeError(challengeId, challengeError);
        clearInterval(errorChecker);
      }
    }, 2000);

    this.timers.set(`error-checker-${challengeId}`, errorChecker);

    console.log(`📊 Challenge monitoring setup: ${challengeId}`);
  }

  /**
   * Setup challenge timeout
   */
  private setupChallengeTimeout(challengeId: string): void {
    const timeoutTimer = setTimeout(() => {
      if (this.challengeState.isActive && this.challengeState.challengeId === challengeId) {
        this.handleChallengeTimeout(challengeId);
      }
    }, this.config.challengeTimeout);

    this.timers.set(`timeout-${challengeId}`, timeoutTimer);

    console.log(`⏰ Challenge timeout setup: ${challengeId} (${this.config.challengeTimeout}ms)`);
  }

  /**
   * Check challenge completion
   */
  private checkChallengeCompletion(): boolean {
    // Check for completion indicators
    const completionIndicators = [
      // Check if challenge script is removed
      !document.querySelector('script[src*="jsd/main.js"]'),
      // Check if challenge iframe is removed
      !document.querySelector('iframe[src*="challenge-platform"]'),
      // Check if page has loaded normally
      document.readyState === 'complete' && !window.__CF$cv$params,
      // Check for successful redirect
      window.location.href !== 'about:blank',
    ];

    return completionIndicators.some(indicator => indicator);
  }

  /**
   * Check challenge error
   */
  private checkChallengeError(): string | null {
    // Check for error indicators
    const errorIndicators = [
      // Check for error messages in DOM
      document.querySelector('[data-cf-error]'),
      // Check for challenge script errors
      document.querySelector('script[src*="jsd/main.js"][data-error]'),
      // Check for network errors
      document.querySelector('.cf-error-details'),
    ];

    const errorElement = errorIndicators.find(indicator => !!indicator);
    if (errorElement) {
      return (errorElement as HTMLElement).textContent || 'Unknown challenge error';
    }

    return null;
  }

  /**
   * Handle challenge completion
   */
  private async handleChallengeCompletion(challengeId: string): Promise<void> {
    const endTime = new Date().toISOString();
    const startTime = this.challengeState.startTime;
    const duration = startTime ? new Date(endTime).getTime() - new Date(startTime).getTime() : 0;

    // Update challenge state
    this.challengeState = {
      ...this.challengeState,
      isActive: false,
      endTime,
      lastError: null,
    };

    // Update analytics
    this.analytics.challengeMetrics.totalChallenges++;
    this.analytics.challengeMetrics.successfulChallenges++;
    this.analytics.challengeMetrics.averageCompletionTime =
      (this.analytics.challengeMetrics.averageCompletionTime *
        (this.analytics.challengeMetrics.successfulChallenges - 1) +
        duration) /
      this.analytics.challengeMetrics.successfulChallenges;

    // Log completion event
    this.logChallengeEvent({
      type: 'challenge_completed',
      timestamp: endTime,
      challengeId,
      duration,
      userAgent: navigator.userAgent,
      url: window.location.href,
      metadata: {
        attempts: this.challengeState.attempts,
        strategy: this.config.fallbackStrategy,
      },
    });

    // Clear timers
    this.clearChallengeTimers(challengeId);

    // Trigger completion callback
    this.triggerChallengeCallback('completed', { challengeId, duration });

    console.log(`✅ Challenge completed: ${challengeId} (${duration}ms)`);
  }

  /**
   * Handle challenge error
   */
  private async handleChallengeError(challengeId: string, error: string): Promise<void> {
    // Update challenge state
    this.challengeState.lastError = error;

    // Update analytics
    this.analytics.challengeMetrics.totalChallenges++;
    this.analytics.challengeMetrics.failedChallenges++;
    this.analytics.errorMetrics.challengeErrors++;

    // Log error event
    this.logChallengeEvent({
      type: 'challenge_failed',
      timestamp: new Date().toISOString(),
      challengeId,
      error,
      userAgent: navigator.userAgent,
      url: window.location.href,
      metadata: {
        attempts: this.challengeState.attempts,
        strategy: this.config.fallbackStrategy,
      },
    });

    // Handle retry logic
    if (this.challengeState.attempts < this.config.challengeRetryAttempts) {
      console.log(
        `🔄 Retrying challenge: ${challengeId} (attempt ${this.challengeState.attempts + 1})`
      );
      await this.retryChallenge(challengeId);
    } else {
      console.log(`❌ Challenge failed permanently: ${challengeId}`);
      await this.handleChallengeFailure(challengeId, error);
    }
  }

  /**
   * Handle challenge timeout
   */
  private async handleChallengeTimeout(challengeId: string): Promise<void> {
    // Update analytics
    this.analytics.challengeMetrics.totalChallenges++;
    this.analytics.challengeMetrics.failedChallenges++;
    this.analytics.errorMetrics.timeoutErrors++;

    const error = `Challenge timeout after ${this.config.challengeTimeout}ms`;

    // Log timeout event
    this.logChallengeEvent({
      type: 'challenge_timeout',
      timestamp: new Date().toISOString(),
      challengeId,
      error,
      userAgent: navigator.userAgent,
      url: window.location.href,
      metadata: {
        timeout: this.config.challengeTimeout,
        attempts: this.challengeState.attempts,
      },
    });

    // Handle as timeout error
    await this.handleChallengeError(challengeId, error);
  }

  /**
   * Retry challenge
   */
  private async retryChallenge(challengeId: string): Promise<void> {
    this.challengeState.attempts++;

    // Clear existing timers
    this.clearChallengeTimers(challengeId);

    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, this.config.challengeRetryDelay));

    // Reload challenge script
    await this.reloadChallengeScript();

    // Setup new monitoring
    await this.setupChallengeMonitoring(challengeId);
    this.setupChallengeTimeout(challengeId);

    console.log(
      `🔄 Challenge retry initiated: ${challengeId} (attempt ${this.challengeState.attempts})`
    );
  }

  /**
   * Handle challenge failure
   */
  private async handleChallengeFailure(challengeId: string, error: string): Promise<void> {
    // Update challenge state
    this.challengeState = {
      ...this.challengeState,
      isActive: false,
      endTime: new Date().toISOString(),
    };

    // Clear timers
    this.clearChallengeTimers(challengeId);

    // Execute fallback strategy
    await this.executeFallbackStrategy(error);

    // Trigger failure callback
    this.triggerChallengeCallback('failed', { challengeId, error });

    console.log(`❌ Challenge failed: ${challengeId} - ${error}`);
  }

  /**
   * Execute fallback strategy
   */
  private async executeFallbackStrategy(error: string): Promise<void> {
    switch (this.config.fallbackStrategy) {
      case 'retry':
        console.log('🔄 Executing retry fallback strategy');
        // Additional retry logic can be implemented here
        break;

      case 'bypass':
        console.log('🚧 Executing bypass fallback strategy');
        // Attempt to bypass challenge
        await this.attemptChallengeBypass();
        break;

      case 'redirect':
        console.log('🔀 Executing redirect fallback strategy');
        // Redirect to alternative endpoint
        await this.redirectToAlternativeEndpoint();
        break;

      default:
        console.log('⚠️ No fallback strategy specified');
    }
  }

  /**
   * Reload challenge script
   */
  private async reloadChallengeScript(): Promise<void> {
    // Remove existing challenge script
    const existingScript = document.querySelector('script[src*="jsd/main.js"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Reload challenge script
    const script = document.createElement('script');
    script.src = '/cdn-cgi/challenge-platform/scripts/jsd/main.js';
    script.async = true;

    // Reinitialize challenge parameters
    if (window.__CF$cv$params) {
      window.__CF$cv$params = { ...window.__CF$cv$params };
    }

    document.head.appendChild(script);

    console.log('🔄 Challenge script reloaded');
  }

  /**
   * Attempt challenge bypass
   */
  private async attemptChallengeBypass(): Promise<void> {
    // Attempt to bypass challenge by directly accessing content
    try {
      const response = await fetch(window.location.href, {
        method: 'GET',
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
        credentials: 'same-origin',
      });

      if (response.ok) {
        const html = await response.text();
        // Replace current page content
        document.documentElement.innerHTML = html;
        console.log('🚧 Challenge bypass successful');
      } else {
        console.log('🚧 Challenge bypass failed');
      }
    } catch (error) {
      console.error('🚧 Challenge bypass error:', error);
    }
  }

  /**
   * Redirect to alternative endpoint
   */
  private async redirectToAlternativeEndpoint(): Promise<void> {
    // Redirect to alternative endpoint without challenge
    const alternativeUrl = this.getAlternativeEndpoint();
    if (alternativeUrl) {
      window.location.href = alternativeUrl;
      console.log('🔀 Redirected to alternative endpoint');
    } else {
      console.log('⚠️ No alternative endpoint available');
    }
  }

  /**
   * Get alternative endpoint
   */
  private getAlternativeEndpoint(): string | null {
    // Logic to determine alternative endpoint
    // This could be based on configuration or dynamic discovery
    return null; // Placeholder
  }

  /**
   * Clear challenge timers
   */
  private clearChallengeTimers(challengeId: string): void {
    const timersToClear = [
      `completion-checker-${challengeId}`,
      `error-checker-${challengeId}`,
      `timeout-${challengeId}`,
    ];

    timersToClear.forEach(timerKey => {
      const timer = this.timers.get(timerKey);
      if (timer) {
        clearInterval(timer);
        clearTimeout(timer);
        this.timers.delete(timerKey);
      }
    });
  }

  /**
   * Log challenge event
   */
  private logChallengeEvent(event: ChallengeEvent): void {
    this.challengeEvents.push(event);

    // Keep only last 100 events
    if (this.challengeEvents.length > 100) {
      this.challengeEvents = this.challengeEvents.slice(-100);
    }

    // Send to analytics if enabled
    if (this.config.monitoring.challengeTracking) {
      this.sendToAnalytics(event);
    }

    console.log(`📝 Challenge event logged: ${event.type} - ${event.challengeId}`);
  }

  /**
   * Send event to analytics
   */
  private sendToAnalytics(event: ChallengeEvent): void {
    // Send to analytics service
    // This could integrate with Google Analytics, Mixpanel, etc.
    console.log('📊 Event sent to analytics:', event);
  }

  /**
   * Trigger challenge callback
   */
  private triggerChallengeCallback(type: 'completed' | 'failed', data: any): void {
    const event = new CustomEvent(`cloudflare:challenge:${type}`, {
      detail: data,
      bubbles: true,
    });

    document.dispatchEvent(event);
  }

  /**
   * Initialize security headers
   */
  private async initializeSecurityHeaders(): Promise<void> {
    // Add security headers via meta tags
    const securityHeaders = [];

    if (this.config.securityHeaders.strictTransportSecurity) {
      securityHeaders.push({
        'http-equiv': 'Strict-Transport-Security',
        content: 'max-age=31536000; includeSubDomains',
      });
    }

    if (this.config.securityHeaders.contentSecurityPolicy) {
      securityHeaders.push({
        'http-equiv': 'Content-Security-Policy',
        content:
          "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn-cgi.challenge-platform.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.fantasy42.com;",
      });
    }

    if (this.config.securityHeaders.xFrameOptions) {
      securityHeaders.push({
        'http-equiv': 'X-Frame-Options',
        content: 'SAMEORIGIN',
      });
    }

    if (this.config.securityHeaders.xContentTypeOptions) {
      securityHeaders.push({
        'http-equiv': 'X-Content-Type-Options',
        content: 'nosniff',
      });
    }

    // Add headers to document
    securityHeaders.forEach(header => {
      const meta = document.createElement('meta');
      meta.httpEquiv = header['http-equiv'];
      meta.content = header.content;
      document.head.appendChild(meta);
    });

    console.log('🔒 Security headers initialized');
  }

  /**
   * Initialize performance optimization
   */
  private async initializePerformanceOptimization(): Promise<void> {
    if (this.config.performance.imageOptimization) {
      await this.setupImageOptimization();
    }

    if (this.config.performance.compressionEnabled) {
      await this.setupCompression();
    }

    await this.setupCachingStrategy();

    console.log('⚡ Performance optimization initialized');
  }

  /**
   * Initialize monitoring
   */
  private async initializeMonitoring(): Promise<void> {
    // Setup performance observer
    if ('PerformanceObserver' in window) {
      const perfObserver = new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          if (entry.name.includes('cdn-cgi') || entry.name.includes('cloudflare')) {
            this.analytics.performanceMetrics.cdnResponseTime = entry.duration;
          }
        });
      });

      perfObserver.observe({ entryTypes: ['resource'] });
      this.observers.set('performance-observer', perfObserver);
    }

    console.log('📊 Monitoring initialized');
  }

  /**
   * Setup error handling
   */
  private async setupErrorHandling(): Promise<void> {
    // Global error handler for challenge-related errors
    const errorHandler = (error: ErrorEvent) => {
      if (error.filename?.includes('jsd/main.js') || error.message?.includes('Cloudflare')) {
        this.analytics.errorMetrics.scriptErrors++;

        this.logChallengeEvent({
          type: 'challenge_failed',
          timestamp: new Date().toISOString(),
          challengeId: this.challengeState.challengeId || 'unknown',
          error: error.message,
          userAgent: navigator.userAgent,
          url: window.location.href,
          metadata: {
            filename: error.filename,
            lineno: error.lineno,
            colno: error.colno,
          },
        });
      }
    };

    window.addEventListener('error', errorHandler);
    this.eventListeners.set('global-error-handler', errorHandler);

    // Unhandled promise rejection handler
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      if (
        event.reason?.message?.includes('Cloudflare') ||
        event.reason?.stack?.includes('jsd/main.js')
      ) {
        this.analytics.errorMetrics.scriptErrors++;

        this.logChallengeEvent({
          type: 'challenge_failed',
          timestamp: new Date().toISOString(),
          challengeId: this.challengeState.challengeId || 'unknown',
          error: event.reason?.message || 'Unhandled promise rejection',
          userAgent: navigator.userAgent,
          url: window.location.href,
          metadata: {
            reason: event.reason,
          },
        });
      }
    };

    window.addEventListener('unhandledrejection', rejectionHandler);
    this.eventListeners.set('rejection-handler', rejectionHandler);

    console.log('🚨 Error handling setup');
  }

  /**
   * Setup image optimization
   */
  private async setupImageOptimization(): Promise<void> {
    // Setup Cloudflare image optimization
    const images = document.querySelectorAll('img[data-src]');

    images.forEach(img => {
      const originalSrc = img.getAttribute('data-src');
      if (originalSrc) {
        // Use Cloudflare images for optimization
        const optimizedSrc = `https://images.fantasy42.com/cdn-cgi/image/format=auto,width=800,quality=80/${originalSrc}`;
        img.src = optimizedSrc;
      }
    });

    console.log('🖼️ Image optimization setup');
  }

  /**
   * Setup compression
   */
  private async setupCompression(): Promise<void> {
    // Accept compressed responses
    const originalFetch = window.fetch;
    window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
      const headers = new Headers(init?.headers);
      headers.set('Accept-Encoding', 'gzip, deflate, br');

      return originalFetch(input, {
        ...init,
        headers,
      });
    };

    console.log('🗜️ Compression setup');
  }

  /**
   * Setup caching strategy
   */
  private async setupCachingStrategy(): Promise<void> {
    // Setup appropriate cache headers based on strategy
    const cacheHeaders = {
      aggressive: 'public, max-age=3600, s-maxage=7200',
      moderate: 'public, max-age=1800, s-maxage=3600',
      conservative: 'public, max-age=300, s-maxage=600',
    };

    // Add cache control meta tag
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Cache-Control';
    meta.content = cacheHeaders[this.config.performance.cachingStrategy];
    document.head.appendChild(meta);

    console.log('💾 Caching strategy setup');
  }

  /**
   * Generate challenge ID
   */
  private generateChallengeId(): string {
    return 'cf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get challenge status
   */
  getChallengeStatus(): ChallengeState {
    return { ...this.challengeState };
  }

  /**
   * Get analytics data
   */
  getAnalytics(): CloudflareAnalytics {
    return { ...this.analytics };
  }

  /**
   * Get challenge events
   */
  getChallengeEvents(): ChallengeEvent[] {
    return [...this.challengeEvents];
  }

  /**
   * Force challenge retry
   */
  async forceChallengeRetry(): Promise<void> {
    if (this.challengeState.challengeId) {
      console.log('🔄 Forcing challenge retry');
      await this.retryChallenge(this.challengeState.challengeId);
    }
  }

  /**
   * Bypass challenge (emergency)
   */
  async bypassChallenge(): Promise<void> {
    console.log('🚧 Attempting emergency challenge bypass');
    await this.attemptChallengeBypass();
  }

  /**
   * Clear challenge state
   */
  clearChallengeState(): void {
    this.challengeState = this.initializeChallengeState();
    this.challengeEvents = [];
    console.log('🧹 Challenge state cleared');
  }

  /**
   * Export analytics data
   */
  exportAnalytics(): string {
    return JSON.stringify(this.analytics, null, 2);
  }

  /**
   * Update configuration
   */
  updateConfiguration(newConfig: Partial<CloudflareConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Configuration updated');
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Clear timers
    this.timers.forEach(timer => {
      clearInterval(timer);
      clearTimeout(timer);
    });
    this.timers.clear();

    // Disconnect observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();

    // Remove event listeners
    this.eventListeners.forEach((listener, key) => {
      // Note: We can't easily remove listeners without references to original elements
    });
    this.eventListeners.clear();

    // Clear challenge state
    this.clearChallengeState();

    this.isInitialized = false;
    console.log('🧹 Cloudflare integration cleaned up');
  }
}

// Convenience functions
export const createFantasy42CloudflareIntegration = (
  fantasyClient: Fantasy42AgentClient,
  unifiedIntegration: Fantasy42UnifiedIntegration,
  config?: Partial<CloudflareConfig>
): Fantasy42CloudflareIntegration => {
  return new Fantasy42CloudflareIntegration(fantasyClient, unifiedIntegration, config);
};

export const initializeFantasy42CloudflareIntegration = async (
  fantasyClient: Fantasy42AgentClient,
  unifiedIntegration: Fantasy42UnifiedIntegration,
  config?: Partial<CloudflareConfig>
): Promise<boolean> => {
  const cfIntegration = new Fantasy42CloudflareIntegration(
    fantasyClient,
    unifiedIntegration,
    config
  );
  return await cfIntegration.initialize();
};

// Export types
export type { CloudflareConfig, ChallengeState, CloudflareAnalytics, ChallengeEvent };
