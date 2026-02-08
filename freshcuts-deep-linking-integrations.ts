/**
 * FreshCuts Deep Linking - Enhanced Integration System
 * 
 * Integrates deep linking with:
 * - Wiki documentation system
 * - Session management
 * - R2 cloud storage
 * - Analytics and tracking
 */

import {
  FreshCutsDeepLinkHandler,
  FreshCutsDeepLinkParser,
  logger,
  withTiming,
  sanitizeInput
} from './freshcuts-deep-linking';
import type { FreshCutsDeepLink } from './freshcuts-deep-linking-types';

// ============================================================================
// WIKI INTEGRATION
// ============================================================================

export interface WikiIntegrationConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey?: string;
  cacheTimeout: number; // seconds
  documentationPaths: {
    payments: string;
    bookings: string;
    tips: string;
    navigation: string;
  };
}

export interface WikiPage {
  id: string;
  title: string;
  content: string;
  category: string;
  lastUpdated: string;
  url: string;
  metadata: Record<string, any>;
}

export class WikiIntegration {
  private config: WikiIntegrationConfig;
  private cache: Map<string, { page: WikiPage; timestamp: number }> = new Map();

  constructor(config: Partial<WikiIntegrationConfig> = {}) {
    this.config = {
      enabled: true,
      baseUrl: process.env.WIKI_BASE_URL || 'https://wiki.freshcuts.com',
      apiKey: process.env.WIKI_API_KEY,
      cacheTimeout: 300, // 5 minutes
      documentationPaths: {
        payments: '/docs/payments',
        bookings: '/docs/bookings',
        tips: '/docs/tips',
        navigation: '/docs/navigation'
      },
      ...config
    };
  }

  /**
   * Get relevant wiki documentation for a deep link
   */
  async getDocumentationForDeepLink(deepLink: FreshCutsDeepLink): Promise<WikiPage | null> {
    if (!this.config.enabled) return null;

    return await withTiming(async () => {
      const cacheKey = `${deepLink.action}-${JSON.stringify(deepLink.params)}`;
      
      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout * 1000) {
        logger.debug('Wiki documentation cache hit', { action: deepLink.action }, 'WikiIntegration');
        return cached.page;
      }

      // Fetch documentation based on action
      let wikiPath: string;
      switch (deepLink.action) {
        case 'payment':
          wikiPath = this.config.documentationPaths.payments;
          break;
        case 'booking':
          wikiPath = this.config.documentationPaths.bookings;
          break;
        case 'tip':
          wikiPath = this.config.documentationPaths.tips;
          break;
        case 'shop':
        case 'barber':
        case 'review':
        case 'promotions':
        case 'profile':
          wikiPath = this.config.documentationPaths.navigation;
          break;
        default:
          return null;
      }

      try {
        const page = await this.fetchWikiPage(wikiPath, deepLink);
        
        // Cache the result
        this.cache.set(cacheKey, {
          page,
          timestamp: Date.now()
        });

        return page;
      } catch (error) {
        logger.error('Failed to fetch wiki documentation', error, 'WikiIntegration');
        return null;
      }
    }, 'wiki documentation fetch', 'WikiIntegration');
  }

  /**
   * Fetch wiki page with context-specific content
   */
  private async fetchWikiPage(path: string, deepLink: FreshCutsDeepLink): Promise<WikiPage> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'FreshCuts-DeepLink-Integration/1.0'
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Wiki API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      id: data.id || `${deepLink.action}-docs`,
      title: data.title || `${deepLink.action.charAt(0).toUpperCase() + deepLink.action.slice(1)} Documentation`,
      content: this.enhanceContentWithContext(data.content || '', deepLink),
      category: data.category || 'documentation',
      lastUpdated: data.lastUpdated || new Date().toISOString(),
      url: data.url || url,
      metadata: {
        deepLinkAction: deepLink.action,
        deepLinkParams: deepLink.params,
        ...data.metadata
      }
    };
  }

  /**
   * Enhance wiki content with deep link context
   */
  private enhanceContentWithContext(content: string, deepLink: FreshCutsDeepLink): string {
    let enhanced = content;

    // Add parameter-specific information
    if (deepLink.params.amount) {
      enhanced += `\n\n**Current Amount**: $${deepLink.params.amount}`;
    }
    if (deepLink.params.shop) {
      enhanced += `\n\n**Shop**: ${deepLink.params.shop}`;
    }
    if (deepLink.params.barber) {
      enhanced += `\n\n**Barber**: ${deepLink.params.barber}`;
    }

    // Add action-specific help
    switch (deepLink.action) {
      case 'payment':
        enhanced += '\n\n**Payment Help**: This deep link will initiate a payment process.';
        break;
      case 'booking':
        enhanced += '\n\n**Booking Help**: This deep link will open the booking interface.';
        break;
      case 'tip':
        enhanced += '\n\n**Tip Help**: This deep link will allow you to leave a tip.';
        break;
    }

    return enhanced;
  }

  /**
   * Clear wiki cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.debug('Wiki cache cleared', {}, 'WikiIntegration');
  }
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

export interface SessionConfig {
  enabled: boolean;
  storage: 'memory' | 'redis' | 'localStorage';
  timeout: number; // seconds
  cookieName: string;
  encryptionKey?: string;
}

export interface DeepLinkSession {
  id: string;
  userId?: string;
  deepLinks: FreshCutsDeepLink[];
  metadata: {
    createdAt: string;
    lastActivity: string;
    userAgent?: string;
    ipAddress?: string;
    deviceInfo?: Record<string, any>;
  };
  context: {
    currentShop?: string;
    currentBarber?: string;
    pendingPayment?: string;
    navigationHistory: string[];
  };
}

export class SessionManager {
  private config: SessionConfig;
  private sessions: Map<string, DeepLinkSession> = new Map();

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = {
      enabled: true,
      storage: process.env.SESSION_STORAGE as any || 'memory',
      timeout: parseInt(process.env.SESSION_TIMEOUT || '1800'), // 30 minutes
      cookieName: process.env.SESSION_COOKIE_NAME || 'freshcuts_session',
      encryptionKey: process.env.SESSION_ENCRYPTION_KEY,
      ...config
    };

    // Start cleanup interval
    if (this.config.enabled) {
      setInterval(() => this.cleanupExpiredSessions(), 60000); // Every minute
    }
  }

  /**
   * Get or create a session for deep link processing
   */
  async getSession(sessionId?: string): Promise<DeepLinkSession> {
    if (!this.config.enabled) {
      return this.createAnonymousSession();
    }

    const id = sessionId || this.generateSessionId();
    let session = this.sessions.get(id);

    if (!session || this.isSessionExpired(session)) {
      session = await this.createSession(id);
      this.sessions.set(id, session);
    }

    // Update last activity
    session.metadata.lastActivity = new Date().toISOString();
    
    return session;
  }

  /**
   * Track deep link in session
   */
  async trackDeepLink(sessionId: string, deepLink: FreshCutsDeepLink): Promise<void> {
    if (!this.config.enabled) return;

    const session = await this.getSession(sessionId);
    session.deepLinks.push(deepLink);

    // Update context based on deep link
    if (deepLink.params.shop) {
      session.context.currentShop = deepLink.params.shop;
    }
    if (deepLink.params.barber) {
      session.context.currentBarber = deepLink.params.barber;
    }
    if (deepLink.action === 'payment') {
      session.context.pendingPayment = deepLink.originalUrl;
    }

    // Add to navigation history
    session.context.navigationHistory.push(deepLink.originalUrl);
    
    logger.debug('Deep link tracked in session', {
      sessionId,
      action: deepLink.action,
      totalLinks: session.deepLinks.length
    }, 'SessionManager');
  }

  /**
   * Create a new session
   */
  private async createSession(id: string): Promise<DeepLinkSession> {
    const session: DeepLinkSession = {
      id,
      deepLinks: [],
      metadata: {
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        ipAddress: await this.getClientIP(),
        deviceInfo: await this.getDeviceInfo()
      },
      context: {
        navigationHistory: []
      }
    };

    logger.debug('New session created', { sessionId: id }, 'SessionManager');
    return session;
  }

  /**
   * Create anonymous session for when session management is disabled
   */
  private createAnonymousSession(): DeepLinkSession {
    return {
      id: 'anonymous',
      deepLinks: [],
      metadata: {
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      },
      context: {
        navigationHistory: []
      }
    };
  }

  /**
   * Generate secure session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `${timestamp}_${random}`;
  }

  /**
   * Check if session is expired
   */
  private isSessionExpired(session: DeepLinkSession): boolean {
    const lastActivity = new Date(session.metadata.lastActivity).getTime();
    const timeout = this.config.timeout * 1000;
    return Date.now() - lastActivity > timeout;
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    let cleaned = 0;
    for (const [id, session] of Array.from(this.sessions.entries())) {
      if (this.isSessionExpired(session)) {
        this.sessions.delete(id);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.debug('Expired sessions cleaned up', { cleaned }, 'SessionManager');
    }
  }

  /**
   * Get client IP address
   */
  private async getClientIP(): Promise<string | undefined> {
    // In a real implementation, this would get the client IP from the request
    return typeof window !== 'undefined' ? 'client' : 'server';
  }

  /**
   * Get device information
   */
  private async getDeviceInfo(): Promise<Record<string, any>> {
    if (typeof window !== 'undefined') {
      return {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${screen.width}x${screen.height}`
      };
    }
    return {};
  }

  /**
   * Get session statistics
   */
  getStats(): { total: number; active: number; expired: number } {
    const total = this.sessions.size;
    let active = 0;
    let expired = 0;

    for (const session of Array.from(this.sessions.values())) {
      if (this.isSessionExpired(session)) {
        expired++;
      } else {
        active++;
      }
    }

    return { total, active, expired };
  }
}

// ============================================================================
// R2 STORAGE INTEGRATION
// ============================================================================

export interface R2IntegrationConfig {
  enabled: boolean;
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  prefix: string;
  region?: string;
  encryption?: boolean;
}

export interface DeepLinkAnalytics {
  id: string;
  deepLink: FreshCutsDeepLink;
  sessionId: string;
  timestamp: string;
  processingTime: number;
  result: any;
  error?: string;
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
    deviceInfo?: Record<string, any>;
  };
}

export class R2Integration {
  private config: R2IntegrationConfig;
  private baseUrl: string;

  constructor(config: Partial<R2IntegrationConfig> = {}) {
    this.config = {
      enabled: process.env.R2_ENABLED === 'true',
      accountId: process.env.R2_ACCOUNT_ID || '',
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      bucketName: process.env.R2_DEEP_LINK_BUCKET || 'freshcuts-deep-links',
      prefix: process.env.R2_PREFIX || 'analytics/',
      region: process.env.R2_REGION || 'auto',
      encryption: process.env.R2_ENCRYPTION === 'true',
      ...config
    };

    this.baseUrl = `https://${this.config.accountId}.r2.cloudflarestorage.com`;
  }

  /**
   * Store deep link analytics in R2
   */
  async storeAnalytics(analytics: DeepLinkAnalytics): Promise<void> {
    if (!this.config.enabled) return;

    return await withTiming(async () => {
      const key = `${this.config.prefix}deep-links/${analytics.timestamp.substring(0, 10)}/${analytics.id}.json`;
      
      try {
        await this.uploadToR2(key, JSON.stringify(analytics, null, 2), 'application/json');
        logger.debug('Analytics stored in R2', { key, analyticsId: analytics.id }, 'R2Integration');
      } catch (error) {
        logger.error('Failed to store analytics in R2', error, 'R2Integration');
      }
    }, 'R2 analytics storage', 'R2Integration');
  }

  /**
   * Retrieve analytics for a date range
   */
  async getAnalytics(startDate: string, endDate: string): Promise<DeepLinkAnalytics[]> {
    if (!this.config.enabled) return [];

    return await withTiming(async () => {
      const analytics: DeepLinkAnalytics[] = [];
      
      // Generate date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().substring(0, 10);
        const prefix = `${this.config.prefix}deep-links/${dateStr}/`;
        
        try {
          const objects = await this.listR2Objects(prefix);
          
          for (const object of objects) {
            const content = await this.downloadFromR2(object.key);
            const analyticsData = JSON.parse(content);
            analytics.push(analyticsData);
          }
        } catch (error) {
          logger.warn('Failed to retrieve analytics for date', { date: dateStr, error }, 'R2Integration');
        }
      }
      
      return analytics.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, 'R2 analytics retrieval', 'R2Integration');
  }

  /**
   * Get analytics summary
   */
  async getAnalyticsSummary(days: number = 7): Promise<Record<string, any>> {
    if (!this.config.enabled) return {};

    const endDate = new Date().toISOString().substring(0, 10);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
    
    const analytics = await this.getAnalytics(startDate, endDate);
    
    const summary = {
      totalDeepLinks: analytics.length,
      actionCounts: {} as Record<string, number>,
      errorRate: 0,
      averageProcessingTime: 0,
      topShops: {} as Record<string, number>,
      topBarbers: {} as Record<string, number>,
      dailyStats: {} as Record<string, number>
    };

    let totalProcessingTime = 0;
    let errorCount = 0;

    for (const item of analytics) {
      // Action counts
      summary.actionCounts[item.deepLink.action] = (summary.actionCounts[item.deepLink.action] || 0) + 1;
      
      // Error rate
      if (item.error) errorCount++;
      
      // Processing time
      totalProcessingTime += item.processingTime;
      
      // Top shops
      if (item.deepLink.params.shop) {
        summary.topShops[item.deepLink.params.shop] = (summary.topShops[item.deepLink.params.shop] || 0) + 1;
      }
      
      // Top barbers
      if (item.deepLink.params.barber) {
        summary.topBarbers[item.deepLink.params.barber] = (summary.topBarbers[item.deepLink.params.barber] || 0) + 1;
      }
      
      // Daily stats
      const day = item.timestamp.substring(0, 10);
      summary.dailyStats[day] = (summary.dailyStats[day] || 0) + 1;
    }

    summary.errorRate = analytics.length > 0 ? (errorCount / analytics.length) * 100 : 0;
    summary.averageProcessingTime = analytics.length > 0 ? totalProcessingTime / analytics.length : 0;

    return summary;
  }

  /**
   * Upload data to R2
   */
  private async uploadToR2(key: string, data: string, contentType: string): Promise<void> {
    const url = `${this.baseUrl}/${this.config.bucketName}/${key}`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': contentType,
        'X-Amz-Content-Sha256': this.hashData(data)
      },
      body: data
    });

    if (!response.ok) {
      throw new Error(`R2 upload failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Download data from R2
   */
  private async downloadFromR2(key: string): Promise<string> {
    const url = `${this.baseUrl}/${this.config.bucketName}/${key}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': this.getAuthHeader()
      }
    });

    if (!response.ok) {
      throw new Error(`R2 download failed: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  }

  /**
   * List objects in R2
   */
  private async listR2Objects(prefix: string): Promise<Array<{ key: string; size: number }>> {
    const url = `${this.baseUrl}/${this.config.bucketName}?list-type=2&prefix=${encodeURIComponent(prefix)}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': this.getAuthHeader()
      }
    });

    if (!response.ok) {
      throw new Error(`R2 list failed: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();
    // Parse XML response (simplified - in production, use proper XML parser)
    const objects: Array<{ key: string; size: number }> = [];
    const matches = xml.match(/<Key>([^<]+)<\/Key>\s*<Size>(\d+)<\/Size>/g) || [];
    
    for (const match of matches) {
      const keyMatch = match.match(/<Key>([^<]+)<\/Key>/);
      const sizeMatch = match.match(/<Size>(\d+)<\/Size>/);
      if (keyMatch && sizeMatch) {
        objects.push({
          key: keyMatch[1],
          size: parseInt(sizeMatch[1])
        });
      }
    }

    return objects;
  }

  /**
   * Generate authorization header for R2
   */
  private getAuthHeader(): string {
    // Simplified auth - in production, implement proper AWS Signature V4
    const credentials = Buffer.from(`${this.config.accessKeyId}:${this.config.secretAccessKey}`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Hash data for integrity check
   */
  private hashData(data: string): string {
    // Simplified hashing - in production, use proper SHA-256
    return Buffer.from(data).toString('hex').substring(0, 64);
  }
}

// ============================================================================
// ENHANCED DEEP LINK HANDLER WITH INTEGRATIONS
// ============================================================================

export interface EnhancedDeepLinkConfig {
  wiki?: Partial<WikiIntegrationConfig>;
  session?: Partial<SessionConfig>;
  r2?: Partial<R2IntegrationConfig>;
  analytics?: {
    enabled: boolean;
    trackProcessingTime: boolean;
    trackErrors: boolean;
    trackMetadata: boolean;
  };
  rateLimit?: any; // For parent class compatibility
}

export class EnhancedFreshCutsDeepLinkHandler extends FreshCutsDeepLinkHandler {
  private wiki: WikiIntegration;
  private sessionManager: SessionManager;
  private r2: R2Integration;
  private config: EnhancedDeepLinkConfig;

  constructor(
    venmoGateway: any,
    options: EnhancedDeepLinkConfig = {}
  ) {
    // Pass only compatible options to parent
    const parentOptions: any = {
      rateLimit: options.rateLimit
    };
    
    super(venmoGateway, parentOptions);
    
    this.config = {
      analytics: {
        enabled: true,
        trackProcessingTime: true,
        trackErrors: true,
        trackMetadata: true,
        ...options.analytics
      }
    };

    // Initialize integrations
    this.wiki = new WikiIntegration(options.wiki);
    this.sessionManager = new SessionManager(options.session);
    this.r2 = new R2Integration(options.r2);

    logger.info('Enhanced deep link handler initialized', {
      wiki: this.wiki['config'].enabled,
      session: this.sessionManager['config'].enabled,
      r2: this.r2['config'].enabled
    }, 'EnhancedHandler');
  }

  /**
   * Enhanced deep link handling with integrations
   */
  async handleDeepLink(url: string, sessionId?: string): Promise<any> {
    const startTime = Date.now();
    let session: DeepLinkSession | null = null;
    let wikiDocumentation: WikiPage | null = null;
    let analytics: DeepLinkAnalytics | null = null;

    try {
      // Get or create session
      session = await this.sessionManager.getSession(sessionId);
      
      // Parse deep link
      const deepLink = FreshCutsDeepLinkParser.parse(url);
      
      // Track deep link in session
      await this.sessionManager.trackDeepLink(session.id, deepLink);
      
      // Get relevant wiki documentation
      wikiDocumentation = await this.wiki.getDocumentationForDeepLink(deepLink);
      
      // Process deep link with original handler
      const result = await super.handleDeepLink(url);
      
      // Create analytics record
      if (this.config.analytics.enabled) {
        analytics = {
          id: this.generateAnalyticsId(),
          deepLink,
          sessionId: session.id,
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          result,
          metadata: {
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
            referrer: typeof document !== 'undefined' ? document.referrer : undefined
          }
        };

        // Store analytics in R2
        await this.r2.storeAnalytics(analytics);
      }

      // Enhance result with integrations
      const enhancedResult = {
        ...result,
        session: {
          id: session.id,
          context: session.context
        },
        documentation: wikiDocumentation ? {
          title: wikiDocumentation.title,
          content: wikiDocumentation.content,
          url: wikiDocumentation.url
        } : null,
        analytics: analytics ? {
          id: analytics.id,
          processingTime: analytics.processingTime
        } : null
      };

      logger.info('Enhanced deep link processed successfully', {
        action: deepLink.action,
        sessionId: session.id,
        processingTime: Date.now() - startTime,
        hasDocumentation: !!wikiDocumentation
      }, 'EnhancedHandler');

      return enhancedResult;

    } catch (error) {
      // Error handling with analytics
      if (this.config.analytics.enabled && session) {
        const errorAnalytics: DeepLinkAnalytics = {
          id: this.generateAnalyticsId(),
          deepLink: FreshCutsDeepLinkParser.parse(url),
          sessionId: session.id,
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          result: null,
          error: error instanceof Error ? error.message : String(error),
          metadata: {
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
          }
        };

        await this.r2.storeAnalytics(errorAnalytics);
      }

      logger.error('Enhanced deep link handling failed', error, 'EnhancedHandler');
      throw error;
    }
  }

  /**
   * Get analytics dashboard data
   */
  async getAnalyticsDashboard(days: number = 7): Promise<Record<string, any>> {
    const summary = await this.r2.getAnalyticsSummary(days);
    const sessionStats = this.sessionManager.getStats();
    
    return {
      ...summary,
      sessions: sessionStats,
      integrations: {
        wiki: {
          enabled: this.wiki['config'].enabled,
          cacheSize: (this.wiki as any).cache?.size || 0
        },
        session: {
          enabled: this.sessionManager['config'].enabled,
          timeout: this.sessionManager['config'].timeout
        },
        r2: {
          enabled: this.r2['config'].enabled,
          bucket: this.r2['config'].bucketName
        }
      }
    };
  }

  /**
   * Generate unique analytics ID
   */
  private generateAnalyticsId(): string {
    return `analytics_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}
