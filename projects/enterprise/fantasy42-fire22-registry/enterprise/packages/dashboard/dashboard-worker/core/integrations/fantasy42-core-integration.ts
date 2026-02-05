/**
 * Fantasy42 Core Platform Integration
 * Enhanced mobile/desktop view management, session handling, and platform optimization
 * Targets: Core JavaScript infrastructure, view management, session storage, and initialization
 */

import { XPathElementHandler, handleFantasy42Element } from '../ui/xpath-element-handler';
import { Fantasy42AgentClient } from '../../src/api/fantasy42-agent-client';
import { Fantasy42UnifiedIntegration } from './fantasy42-unified-integration';

export interface PlatformConfig {
  version: string;
  domain: string;
  environment: 'development' | 'staging' | 'production';
  features: {
    mobileOptimization: boolean;
    desktopView: boolean;
    sessionManagement: boolean;
    menuToggle: boolean;
    requireJsIntegration: boolean;
    cloudflareIntegration: boolean;
    performanceMonitoring: boolean;
    errorTracking: boolean;
  };
  mobile: {
    enabled: boolean;
    viewport: string;
    userScalable: boolean;
    minimalUi: boolean;
    detectionMethod: 'userAgent' | 'screenSize' | 'touchCapability';
    fallbackStrategy: 'mobile' | 'desktop' | 'adaptive';
  };
  desktop: {
    enabled: boolean;
    betTickerMode: boolean;
    enhancedNavigation: boolean;
    keyboardShortcuts: boolean;
    multiMonitorSupport: boolean;
  };
  session: {
    storagePrefix: string;
    expirationTime: number;
    autoCleanup: boolean;
    crossTabSync: boolean;
    persistenceLevel: 'session' | 'local' | 'indexeddb';
  };
  performance: {
    lazyLoading: boolean;
    resourceHints: boolean;
    cachingStrategy: 'aggressive' | 'moderate' | 'conservative';
    bundleOptimization: boolean;
    preloadCritical: boolean;
  };
}

export interface ViewState {
  currentView: 'mobile' | 'desktop' | 'bet-ticker';
  previousView: 'mobile' | 'desktop' | 'bet-ticker';
  isMobileDevice: boolean;
  isDesktopDevice: boolean;
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  touchCapability: boolean;
  lastChanged: string;
  changeReason: string;
}

export interface SessionData {
  viewPreferences: ViewState;
  userSettings: Record<string, any>;
  cachedData: Record<string, any>;
  performanceMetrics: Record<string, number>;
  errorLogs: Array<{
    timestamp: string;
    error: string;
    context: string;
    userAgent: string;
  }>;
  featureUsage: Record<string, number>;
  lastActivity: string;
  sessionId: string;
}

export interface UrlParameters {
  betTicker?: string;
  view?: string;
  debug?: string;
  theme?: string;
  lang?: string;
  feature?: string;
  [key: string]: string | undefined;
}

export class Fantasy42CoreIntegration {
  private xpathHandler: XPathElementHandler;
  private fantasyClient: Fantasy42AgentClient;
  private unifiedIntegration: Fantasy42UnifiedIntegration;

  private config: PlatformConfig;
  private currentViewState: ViewState;
  private sessionData: SessionData;
  private urlParams: UrlParameters;
  private isInitialized: boolean = false;

  private eventListeners: Map<string, EventListener> = new Map();
  private observers: Map<string, MutationObserver> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    fantasyClient: Fantasy42AgentClient,
    unifiedIntegration: Fantasy42UnifiedIntegration,
    config?: Partial<PlatformConfig>
  ) {
    this.xpathHandler = XPathElementHandler.getInstance();
    this.fantasyClient = fantasyClient;
    this.unifiedIntegration = unifiedIntegration;

    this.config = this.createDefaultConfig();
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.currentViewState = this.initializeViewState();
    this.sessionData = this.initializeSessionData();
    this.urlParams = this.parseUrlParameters();
  }

  /**
   * Initialize Fantasy42 core integration
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🚀 Initializing Fantasy42 Core Integration...');

      // Initialize version and domain detection
      await this.initializeVersionAndDomain();

      // Setup mobile/desktop view management
      await this.initializeViewManagement();

      // Initialize session management
      await this.initializeSessionManagement();

      // Setup performance monitoring
      if (this.config.features.performanceMonitoring) {
        await this.initializePerformanceMonitoring();
      }

      // Setup error tracking
      if (this.config.features.errorTracking) {
        await this.initializeErrorTracking();
      }

      // Setup RequireJS integration
      if (this.config.features.requireJsIntegration) {
        await this.initializeRequireJsIntegration();
      }

      // Setup Cloudflare integration
      if (this.config.features.cloudflareIntegration) {
        await this.initializeCloudflareIntegration();
      }

      // Setup menu toggle enhancements
      if (this.config.features.menuToggle) {
        await this.initializeMenuToggle();
      }

      // Initialize resource optimization
      await this.initializeResourceOptimization();

      this.isInitialized = true;
      console.log('✅ Fantasy42 Core Integration initialized');

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize core integration:', error);
      return false;
    }
  }

  /**
   * Create default platform configuration
   */
  private createDefaultConfig(): PlatformConfig {
    return {
      version: '43.0.27',
      domain: 'fantasy402.com',
      environment: 'production',
      features: {
        mobileOptimization: true,
        desktopView: true,
        sessionManagement: true,
        menuToggle: true,
        requireJsIntegration: true,
        cloudflareIntegration: true,
        performanceMonitoring: true,
        errorTracking: true,
      },
      mobile: {
        enabled: true,
        viewport: 'width=device-width, initial-scale=1.0, user-scalable=0, minimal-ui',
        userScalable: false,
        minimalUi: true,
        detectionMethod: 'userAgent',
        fallbackStrategy: 'adaptive',
      },
      desktop: {
        enabled: true,
        betTickerMode: false,
        enhancedNavigation: true,
        keyboardShortcuts: true,
        multiMonitorSupport: true,
      },
      session: {
        storagePrefix: 'fantasy42_',
        expirationTime: 24 * 60 * 60 * 1000, // 24 hours
        autoCleanup: true,
        crossTabSync: true,
        persistenceLevel: 'local',
      },
      performance: {
        lazyLoading: true,
        resourceHints: true,
        cachingStrategy: 'moderate',
        bundleOptimization: true,
        preloadCritical: true,
      },
    };
  }

  /**
   * Initialize view state
   */
  private initializeViewState(): ViewState {
    const isMobileDevice = this.detectMobileDevice();
    const isDesktopDevice = !isMobileDevice;

    return {
      currentView: isMobileDevice ? 'mobile' : 'desktop',
      previousView: isMobileDevice ? 'mobile' : 'desktop',
      isMobileDevice,
      isDesktopDevice,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      touchCapability: 'ontouchstart' in window,
      lastChanged: new Date().toISOString(),
      changeReason: 'initialization',
    };
  }

  /**
   * Initialize session data
   */
  private initializeSessionData(): SessionData {
    const sessionId = this.generateSessionId();

    return {
      viewPreferences: this.currentViewState,
      userSettings: {},
      cachedData: {},
      performanceMetrics: {},
      errorLogs: [],
      featureUsage: {},
      lastActivity: new Date().toISOString(),
      sessionId,
    };
  }

  /**
   * Parse URL parameters
   */
  private parseUrlParameters(): UrlParameters {
    const params: UrlParameters = {};
    const urlSearchParams = new URLSearchParams(window.location.search);

    // Parse standard parameters
    params.betTicker = urlSearchParams.get('bet-ticker') || undefined;
    params.view = urlSearchParams.get('view') || undefined;
    params.debug = urlSearchParams.get('debug') || undefined;
    params.theme = urlSearchParams.get('theme') || undefined;
    params.lang = urlSearchParams.get('lang') || undefined;
    params.feature = urlSearchParams.get('feature') || undefined;

    // Parse any additional parameters
    for (const [key, value] of urlSearchParams.entries()) {
      if (!(key in params)) {
        params[key] = value;
      }
    }

    return params;
  }

  /**
   * Initialize version and domain detection
   */
  private async initializeVersionAndDomain(): Promise<void> {
    // Detect version from data-field
    const versionElement = document.querySelector('[data-field="version"]') as HTMLElement;
    if (versionElement) {
      this.config.version = versionElement.textContent || this.config.version;
      console.log(`📋 Detected version: ${this.config.version}`);
    }

    // Detect domain from data-field
    const domainElement = document.querySelector('[data-field="domain-me"]') as HTMLElement;
    if (domainElement) {
      this.config.domain = domainElement.textContent || this.config.domain;
      console.log(`🌐 Detected domain: ${this.config.domain}`);
    }

    // Set environment based on domain
    if (this.config.domain.includes('dev') || this.config.domain.includes('staging')) {
      this.config.environment = 'development';
    } else if (this.config.domain.includes('staging')) {
      this.config.environment = 'staging';
    } else {
      this.config.environment = 'production';
    }

    console.log(`🏭 Environment: ${this.config.environment}`);
  }

  /**
   * Initialize view management
   */
  private async initializeViewManagement(): Promise<void> {
    // Check for bet-ticker parameter
    if (this.urlParams.betTicker === 'active') {
      this.currentViewState.currentView = 'bet-ticker';
      this.currentViewState.changeReason = 'bet-ticker parameter';
      await this.applyBetTickerView();
    } else {
      // Check session storage for view preference
      const savedView = this.getSessionStorage('MOBILE-DISPLAY');

      if (savedView === 'DESKTOP-VIEW') {
        this.currentViewState.currentView = 'desktop';
        this.currentViewState.changeReason = 'session preference';
        await this.applyDesktopView();
      } else if (savedView === 'MOBILE-VIEW') {
        this.currentViewState.currentView = 'mobile';
        this.currentViewState.changeReason = 'session preference';
        await this.applyMobileView();
      } else {
        // Auto-detect based on device
        if (this.currentViewState.isMobileDevice) {
          await this.applyMobileView();
        } else {
          await this.applyDesktopView();
        }
      }
    }

    // Setup view change listeners
    await this.setupViewChangeListeners();

    // Setup responsive design
    await this.setupResponsiveDesign();

    console.log(`📱 Current view: ${this.currentViewState.currentView}`);
  }

  /**
   * Initialize session management
   */
  private async initializeSessionManagement(): Promise<void> {
    // Load existing session data
    await this.loadSessionData();

    // Setup session cleanup
    if (this.config.session.autoCleanup) {
      await this.setupSessionCleanup();
    }

    // Setup cross-tab synchronization
    if (this.config.session.crossTabSync) {
      await this.setupCrossTabSync();
    }

    // Setup activity tracking
    await this.setupActivityTracking();

    console.log('💾 Session management initialized');
  }

  /**
   * Detect mobile device
   */
  private detectMobileDevice(): boolean {
    if (this.config.mobile.detectionMethod === 'userAgent') {
      return /Android|webOS|iPhone|iPad|BlackBerry|Windows Phone|Opera Mini|IEMobile|Mobile/i.test(
        navigator.userAgent
      );
    } else if (this.config.mobile.detectionMethod === 'screenSize') {
      return window.innerWidth < 768;
    } else if (this.config.mobile.detectionMethod === 'touchCapability') {
      return 'ontouchstart' in window;
    }

    // Fallback to user agent
    return /Android|webOS|iPhone|iPad|BlackBerry|Windows Phone|Opera Mini|IEMobile|Mobile/i.test(
      navigator.userAgent
    );
  }

  /**
   * Apply mobile view
   */
  private async applyMobileView(): Promise<void> {
    // Add mobile viewport meta tag
    this.addViewportMetaTag();

    // Remove desktop view elements
    this.removeElements('[data-action="desktop-view"]');

    // Add mobile-specific classes
    document.documentElement.classList.remove('desktop-view');
    document.body.classList.add('mobile-view');

    // Setup mobile-specific features
    await this.setupMobileFeatures();

    console.log('📱 Mobile view applied');
  }

  /**
   * Apply desktop view
   */
  private async applyDesktopView(): Promise<void> {
    // Remove mobile view elements
    this.removeElements('[data-action="mobile-view"]');

    // Add desktop-specific classes
    document.documentElement.classList.add('desktop-view');
    document.body.classList.remove('mobile-view');

    // Setup desktop-specific features
    await this.setupDesktopFeatures();

    console.log('🖥️ Desktop view applied');
  }

  /**
   * Apply bet ticker view
   */
  private async applyBetTickerView(): Promise<void> {
    // Remove desktop view elements
    this.removeElements('[data-action="desktop-view"]');

    // Add desktop view class for bet ticker
    document.documentElement.classList.add('desktop-view');
    document.body.classList.add('bet-ticker-view');

    // Setup bet ticker specific features
    await this.setupBetTickerFeatures();

    console.log('🎯 Bet ticker view applied');
  }

  /**
   * Add viewport meta tag
   */
  private addViewportMetaTag(): void {
    const existingMeta = document.querySelector('meta[name="viewport"][data-view="port"]');
    if (existingMeta) {
      return; // Already exists
    }

    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = this.config.mobile.viewport;
    meta.setAttribute('data-view', 'port');

    document.head.appendChild(meta);
  }

  /**
   * Remove elements by selector
   */
  private removeElements(selector: string): void {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => element.remove());
  }

  /**
   * Setup view change listeners
   */
  private async setupViewChangeListeners(): Promise<void> {
    // Desktop view button
    const desktopButtons = document.querySelectorAll('[data-action="desktop-view"]');
    desktopButtons.forEach(button => {
      const listener = () => this.handleViewChange('desktop', 'user action');
      button.addEventListener('click', listener);
      this.eventListeners.set(`desktop-${button}`, listener);
    });

    // Mobile view button
    const mobileButtons = document.querySelectorAll('[data-action="mobile-view"]');
    mobileButtons.forEach(button => {
      const listener = () => this.handleViewChange('mobile', 'user action');
      button.addEventListener('click', listener);
      this.eventListeners.set(`mobile-${button}`, listener);
    });

    // Window resize listener
    const resizeListener = () => this.handleWindowResize();
    window.addEventListener('resize', resizeListener);
    this.eventListeners.set('window-resize', resizeListener);

    console.log('👂 View change listeners setup');
  }

  /**
   * Setup responsive design
   */
  private async setupResponsiveDesign(): Promise<void> {
    // Add responsive CSS
    const responsiveCSS = `
	  @media (max-width: 767px) {
	    .mobile-view-only { display: block !important; }
	    .desktop-view-only { display: none !important; }
	  }
	  @media (min-width: 768px) {
	    .mobile-view-only { display: none !important; }
	    .desktop-view-only { display: block !important; }
	  }
	  .bet-ticker-view .desktop-view-only { display: block !important; }
	  .bet-ticker-view .mobile-view-only { display: none !important; }
	`;

    this.addStyleSheet(responsiveCSS);

    // Setup CSS custom properties for responsive values
    const responsiveVars = `
	  :root {
	    --screen-width: ${window.innerWidth}px;
	    --screen-height: ${window.innerHeight}px;
	    --is-mobile: ${this.currentViewState.isMobileDevice ? 1 : 0};
	    --is-desktop: ${this.currentViewState.isDesktopDevice ? 1 : 0};
	  }
	`;

    this.addStyleSheet(responsiveVars);

    console.log('📐 Responsive design setup');
  }

  /**
   * Handle view change
   */
  private async handleViewChange(
    view: 'mobile' | 'desktop' | 'bet-ticker',
    reason: string
  ): Promise<void> {
    const previousView = this.currentViewState.currentView;

    if (previousView === view) {
      return; // No change needed
    }

    // Update view state
    this.currentViewState.previousView = previousView;
    this.currentViewState.currentView = view;
    this.currentViewState.lastChanged = new Date().toISOString();
    this.currentViewState.changeReason = reason;

    // Save to session storage
    if (view === 'desktop') {
      this.setSessionStorage('MOBILE-DISPLAY', 'DESKTOP-VIEW');
      await this.applyDesktopView();
    } else if (view === 'mobile') {
      this.setSessionStorage('MOBILE-DISPLAY', 'MOBILE-VIEW');
      await this.applyMobileView();
    }

    // Update session data
    this.sessionData.viewPreferences = this.currentViewState;
    await this.saveSessionData();

    // Trigger view change event
    this.triggerEvent('viewChanged', {
      previousView,
      currentView: view,
      reason,
    });

    console.log(`🔄 View changed: ${previousView} → ${view} (${reason})`);
  }

  /**
   * Handle window resize
   */
  private handleWindowResize(): void {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;

    // Update view state
    this.currentViewState.screenWidth = newWidth;
    this.currentViewState.screenHeight = newHeight;

    // Check if view should change based on screen size
    const isNowMobile = newWidth < 768;
    const wasMobile = this.currentViewState.isMobileDevice;

    if (isNowMobile !== wasMobile) {
      this.currentViewState.isMobileDevice = isNowMobile;
      this.currentViewState.isDesktopDevice = !isNowMobile;

      // Auto-switch view if no manual preference is set
      const savedView = this.getSessionStorage('MOBILE-DISPLAY');
      if (!savedView) {
        if (isNowMobile) {
          this.handleViewChange('mobile', 'responsive auto-switch');
        } else {
          this.handleViewChange('desktop', 'responsive auto-switch');
        }
      }
    }

    // Update CSS custom properties
    const responsiveVars = `
	  :root {
	    --screen-width: ${newWidth}px;
	    --screen-height: ${newHeight}px;
	  }
	`;

    this.updateStyleSheet('responsive-vars', responsiveVars);
  }

  /**
   * Setup mobile features
   */
  private async setupMobileFeatures(): Promise<void> {
    // Add mobile-specific CSS
    const mobileCSS = `
	  .mobile-view {
	    font-size: 16px;
	    -webkit-text-size-adjust: 100%;
	    -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
	  }
	  .mobile-view .nav-menu-main {
	    position: fixed;
	    top: 0;
	    left: -280px;
	    width: 280px;
	    height: 100vh;
	    background: #fff;
	    z-index: 1000;
	    transition: left 0.3s ease;
	  }
	  .mobile-view .menu-open .nav-menu-main {
	    left: 0;
	  }
	  .mobile-view .menu-overlay {
	    display: none;
	    position: fixed;
	    top: 0;
	    left: 0;
	    width: 100%;
	    height: 100%;
	    background: rgba(0, 0, 0, 0.5);
	    z-index: 999;
	  }
	  .mobile-view .menu-open .menu-overlay {
	    display: block;
	  }
	`;

    this.addStyleSheet(mobileCSS, 'mobile-styles');

    console.log('📱 Mobile features setup');
  }

  /**
   * Setup desktop features
   */
  private async setupDesktopFeatures(): Promise<void> {
    // Add desktop-specific CSS
    const desktopCSS = `
	  .desktop-view .nav-menu-main {
	    position: fixed;
	    top: 0;
	    left: 0;
	    width: 250px;
	    height: 100vh;
	    background: #f8f9fa;
	    border-right: 1px solid #dee2e6;
	  }
	  .desktop-view .main-content {
	    margin-left: 250px;
	    transition: margin-left 0.3s ease;
	  }
	  .desktop-view.menu-collapsed .nav-menu-main {
	    width: 60px;
	  }
	  .desktop-view.menu-collapsed .main-content {
	    margin-left: 60px;
	  }
	`;

    this.addStyleSheet(desktopCSS, 'desktop-styles');

    console.log('🖥️ Desktop features setup');
  }

  /**
   * Setup bet ticker features
   */
  private async setupBetTickerFeatures(): Promise<void> {
    // Add bet ticker specific CSS
    const betTickerCSS = `
	  .bet-ticker-view {
	    background: #000;
	    color: #fff;
	  }
	  .bet-ticker-view .ticker-item {
	    background: rgba(255, 255, 255, 0.1);
	    border: 1px solid rgba(255, 255, 255, 0.2);
	    margin: 10px;
	    padding: 15px;
	    border-radius: 8px;
	  }
	  .bet-ticker-view .bet-info {
	    display: flex;
	    justify-content: space-between;
	    align-items: center;
	  }
	  .bet-ticker-view .odds {
	    font-weight: bold;
	    color: #28a745;
	  }
	`;

    this.addStyleSheet(betTickerCSS, 'bet-ticker-styles');

    console.log('🎯 Bet ticker features setup');
  }

  /**
   * Initialize menu toggle
   */
  private async initializeMenuToggle(): Promise<void> {
    const menuToggle = document.querySelector('.nav-menu-main.menu-toggle') as HTMLElement;

    if (menuToggle) {
      const toggleListener = () => {
        document.body.classList.toggle('menu-expanded');
        document.body.classList.toggle('menu-collapsed');
        document.body.classList.toggle('menu-open');
        document.body.classList.toggle('menu-hide');

        // Update session data
        this.sessionData.featureUsage.menu_toggle =
          (this.sessionData.featureUsage.menu_toggle || 0) + 1;
        this.saveSessionData();
      };

      menuToggle.addEventListener('click', toggleListener);
      this.eventListeners.set('menu-toggle', toggleListener);

      console.log('🔄 Menu toggle initialized');
    }
  }

  /**
   * Initialize RequireJS integration
   */
  private async initializeRequireJsIntegration(): Promise<void> {
    // Check if RequireJS is available
    if (typeof requirejs !== 'undefined') {
      // Configure RequireJS with cache busting
      requirejs.config({
        baseUrl: '/app',
        urlArgs: 'bust=' + Date.now(),
        waitSeconds: 0,
        paths: {
          'setting/config-manager': 'setting/config-manager',
        },
      });

      console.log('📦 RequireJS integration initialized');
    } else {
      console.warn('⚠️ RequireJS not found, integration skipped');
    }
  }

  /**
   * Initialize Cloudflare integration
   */
  private async initializeCloudflareIntegration(): Promise<void> {
    // Setup Cloudflare challenge handling
    const cloudflareScript = document.querySelector('script[src*="jsd/main.js"]');

    if (cloudflareScript) {
      console.log('☁️ Cloudflare integration detected');
    } else {
      console.log('☁️ Cloudflare integration ready');
    }
  }

  /**
   * Initialize performance monitoring
   */
  private async initializePerformanceMonitoring(): Promise<void> {
    // Setup performance observer
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          this.sessionData.performanceMetrics[entry.name] = entry.duration;
        }
        this.saveSessionData();
      });

      observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
      this.observers.set('performance', observer);
    }

    console.log('📊 Performance monitoring initialized');
  }

  /**
   * Initialize error tracking
   */
  private async initializeErrorTracking(): Promise<void> {
    const errorHandler = (error: ErrorEvent) => {
      const errorLog = {
        timestamp: new Date().toISOString(),
        error: error.message,
        context: error.filename + ':' + error.lineno + ':' + error.colno,
        userAgent: navigator.userAgent,
      };

      this.sessionData.errorLogs.push(errorLog);

      // Keep only last 50 errors
      if (this.sessionData.errorLogs.length > 50) {
        this.sessionData.errorLogs = this.sessionData.errorLogs.slice(-50);
      }

      this.saveSessionData();
    };

    window.addEventListener('error', errorHandler);
    this.eventListeners.set('error-handler', errorHandler);

    console.log('🚨 Error tracking initialized');
  }

  /**
   * Initialize resource optimization
   */
  private async initializeResourceOptimization(): Promise<void> {
    if (this.config.performance.lazyLoading) {
      await this.setupLazyLoading();
    }

    if (this.config.performance.resourceHints) {
      await this.setupResourceHints();
    }

    if (this.config.performance.bundleOptimization) {
      await this.setupBundleOptimization();
    }

    console.log('⚡ Resource optimization initialized');
  }

  /**
   * Load session data
   */
  private async loadSessionData(): Promise<void> {
    try {
      const storageKey = this.config.session.storagePrefix + 'session_data';
      const storedData = this.getStorage(storageKey);

      if (storedData) {
        const parsedData = JSON.parse(storedData);
        this.sessionData = { ...this.sessionData, ...parsedData };

        // Check if session is expired
        const lastActivity = new Date(this.sessionData.lastActivity);
        const now = new Date();
        const timeDiff = now.getTime() - lastActivity.getTime();

        if (timeDiff > this.config.session.expirationTime) {
          // Session expired, create new one
          this.sessionData = this.initializeSessionData();
        }
      }

      console.log('💾 Session data loaded');
    } catch (error) {
      console.warn('⚠️ Failed to load session data:', error);
    }
  }

  /**
   * Save session data
   */
  private async saveSessionData(): Promise<void> {
    try {
      this.sessionData.lastActivity = new Date().toISOString();

      const storageKey = this.config.session.storagePrefix + 'session_data';
      const dataToStore = JSON.stringify(this.sessionData);

      this.setStorage(storageKey, dataToStore);

      console.log('💾 Session data saved');
    } catch (error) {
      console.warn('⚠️ Failed to save session data:', error);
    }
  }

  /**
   * Setup session cleanup
   */
  private async setupSessionCleanup(): Promise<void> {
    // Cleanup expired sessions
    const cleanupTimer = setInterval(
      () => {
        this.cleanupExpiredSessions();
      },
      60 * 60 * 1000
    ); // Check every hour

    this.timers.set('session-cleanup', cleanupTimer);

    console.log('🧹 Session cleanup setup');
  }

  /**
   * Setup cross-tab synchronization
   */
  private async setupCrossTabSync(): Promise<void> {
    const syncChannel = new BroadcastChannel('fantasy42-session-sync');

    syncChannel.onmessage = event => {
      if (event.data.type === 'session-update') {
        this.sessionData = { ...this.sessionData, ...event.data.data };
      }
    };

    // Send current session data to other tabs
    syncChannel.postMessage({
      type: 'session-update',
      data: this.sessionData,
    });

    console.log('🔄 Cross-tab sync setup');
  }

  /**
   * Setup activity tracking
   */
  private async setupActivityTracking(): Promise<void> {
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    const activityHandler = () => {
      this.sessionData.lastActivity = new Date().toISOString();
      this.saveSessionData();
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, activityHandler, { passive: true });
      this.eventListeners.set(`activity-${event}`, activityHandler);
    });

    console.log('📈 Activity tracking setup');
  }

  /**
   * Setup lazy loading
   */
  private async setupLazyLoading(): Promise<void> {
    // Setup Intersection Observer for lazy loading
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.classList.remove('lazy');
              imageObserver.unobserve(img);
            }
          }
        });
      });

      // Observe all lazy images
      const lazyImages = document.querySelectorAll('img[data-src]');
      lazyImages.forEach(img => imageObserver.observe(img));

      this.observers.set('lazy-loading', imageObserver);
    }

    console.log('🦥 Lazy loading setup');
  }

  /**
   * Setup resource hints
   */
  private async setupResourceHints(): Promise<void> {
    // Add preload hints for critical resources
    if (this.config.performance.preloadCritical) {
      const criticalResources = ['/css/main.css', '/js/main.js', '/images/logo.png'];

      criticalResources.forEach(resource => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = resource;
        link.as = this.getResourceType(resource);
        document.head.appendChild(link);
      });
    }

    console.log('🔗 Resource hints setup');
  }

  /**
   * Setup bundle optimization
   */
  private async setupBundleOptimization(): Promise<void> {
    // Implement bundle optimization strategies
    console.log('📦 Bundle optimization setup');
  }

  /**
   * Get resource type for preload
   */
  private getResourceType(resource: string): string {
    if (resource.endsWith('.css')) return 'style';
    if (resource.endsWith('.js')) return 'script';
    if (resource.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    return 'fetch';
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get storage value
   */
  private getStorage(key: string): string | null {
    if (this.config.session.persistenceLevel === 'session') {
      return sessionStorage.getItem(key);
    } else {
      return localStorage.getItem(key);
    }
  }

  /**
   * Set storage value
   */
  private setStorage(key: string, value: string): void {
    if (this.config.session.persistenceLevel === 'session') {
      sessionStorage.setItem(key, value);
    } else {
      localStorage.setItem(key, value);
    }
  }

  /**
   * Get session storage (for compatibility with existing code)
   */
  private getSessionStorage(key: string): string | null {
    return sessionStorage.getItem(key);
  }

  /**
   * Set session storage (for compatibility with existing code)
   */
  private setSessionStorage(key: string, value: string): void {
    sessionStorage.setItem(key, value);
  }

  /**
   * Add style sheet
   */
  private addStyleSheet(css: string, id?: string): void {
    const style = document.createElement('style');
    style.textContent = css;

    if (id) {
      style.id = id;
    }

    document.head.appendChild(style);
  }

  /**
   * Update style sheet
   */
  private updateStyleSheet(id: string, css: string): void {
    const existingStyle = document.getElementById(id) as HTMLStyleElement;

    if (existingStyle) {
      existingStyle.textContent = css;
    } else {
      this.addStyleSheet(css, id);
    }
  }

  /**
   * Trigger custom event
   */
  private triggerEvent(eventName: string, data: any): void {
    const event = new CustomEvent(eventName, {
      detail: data,
      bubbles: true,
    });

    document.dispatchEvent(event);
  }

  /**
   * Cleanup expired sessions
   */
  private cleanupExpiredSessions(): void {
    const keys = Object.keys(localStorage);
    const now = Date.now();

    keys.forEach(key => {
      if (key.startsWith(this.config.session.storagePrefix)) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.lastActivity) {
            const lastActivity = new Date(data.lastActivity).getTime();
            if (now - lastActivity > this.config.session.expirationTime) {
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          // Invalid data, remove it
          localStorage.removeItem(key);
        }
      }
    });
  }

  /**
   * Get platform status
   */
  getStatus(): {
    isInitialized: boolean;
    version: string;
    domain: string;
    environment: string;
    currentView: string;
    isMobileDevice: boolean;
    sessionId: string;
    performanceMetrics: Record<string, number>;
    errorCount: number;
    featureUsage: Record<string, number>;
  } {
    return {
      isInitialized: this.isInitialized,
      version: this.config.version,
      domain: this.config.domain,
      environment: this.config.environment,
      currentView: this.currentViewState.currentView,
      isMobileDevice: this.currentViewState.isMobileDevice,
      sessionId: this.sessionData.sessionId,
      performanceMetrics: this.sessionData.performanceMetrics,
      errorCount: this.sessionData.errorLogs.length,
      featureUsage: this.sessionData.featureUsage,
    };
  }

  /**
   * Get current view state
   */
  getViewState(): ViewState {
    return { ...this.currentViewState };
  }

  /**
   * Get session data
   */
  getSessionData(): SessionData {
    return { ...this.sessionData };
  }

  /**
   * Get URL parameters
   */
  getUrlParameters(): UrlParameters {
    return { ...this.urlParams };
  }

  /**
   * Update configuration
   */
  async updateConfiguration(newConfig: Partial<PlatformConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Configuration updated');
  }

  /**
   * Force view change
   */
  async forceViewChange(
    view: 'mobile' | 'desktop' | 'bet-ticker',
    reason: string = 'manual'
  ): Promise<void> {
    await this.handleViewChange(view, reason);
  }

  /**
   * Clear session data
   */
  async clearSessionData(): Promise<void> {
    this.sessionData = this.initializeSessionData();
    await this.saveSessionData();

    // Clear storage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.config.session.storagePrefix)) {
        localStorage.removeItem(key);
      }
    });

    console.log('🗑️ Session data cleared');
  }

  /**
   * Export session data
   */
  exportSessionData(): string {
    return JSON.stringify(this.sessionData, null, 2);
  }

  /**
   * Import session data
   */
  async importSessionData(jsonData: string): Promise<void> {
    try {
      const importedData = JSON.parse(jsonData);
      this.sessionData = { ...this.sessionData, ...importedData };
      await this.saveSessionData();
      console.log('📥 Session data imported');
    } catch (error) {
      console.error('❌ Failed to import session data:', error);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Clear timers
    this.timers.forEach(timer => clearInterval(timer));
    this.timers.clear();

    // Disconnect observers
    this.observers.forEach(observer => {
      if (observer instanceof MutationObserver) {
        observer.disconnect();
      } else if (observer instanceof PerformanceObserver) {
        observer.disconnect();
      }
    });
    this.observers.clear();

    // Remove event listeners
    this.eventListeners.forEach((listener, key) => {
      // Note: We can't easily remove listeners without references to original elements
      // This is a limitation of the current implementation
    });
    this.eventListeners.clear();

    this.isInitialized = false;
    console.log('🧹 Core integration cleaned up');
  }
}

// Convenience functions
export const createFantasy42CoreIntegration = (
  fantasyClient: Fantasy42AgentClient,
  unifiedIntegration: Fantasy42UnifiedIntegration,
  config?: Partial<PlatformConfig>
): Fantasy42CoreIntegration => {
  return new Fantasy42CoreIntegration(fantasyClient, unifiedIntegration, config);
};

export const initializeFantasy42CoreIntegration = async (
  fantasyClient: Fantasy42AgentClient,
  unifiedIntegration: Fantasy42UnifiedIntegration,
  config?: Partial<PlatformConfig>
): Promise<boolean> => {
  const coreIntegration = new Fantasy42CoreIntegration(fantasyClient, unifiedIntegration, config);
  return await coreIntegration.initialize();
};

// Enhanced dataUrl function (compatible with existing code)
export const dataUrl = (key: string): string | false => {
  const value = new RegExp('[\\?&]' + key + '=([^&#]*)').exec(window.location.href);
  return value ? value[1] : false;
};

// Export types
export type { PlatformConfig, ViewState, SessionData, UrlParameters };
