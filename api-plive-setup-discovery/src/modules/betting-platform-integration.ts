// Enhanced BettingPlatformWorkflowIntegration with plive.sportswidgets.pro API integration
// Features: Custom error types, caching, circuit breaker, webhooks, enhanced observability
import { WorkflowInstance } from '../api/types/api-types';
// Bun-native: use crypto.randomUUID() and fetch() instead of uuid/axios
import { EventEmitter } from 'events';

// ===== CUSTOM ERROR TYPES =====
export class BettingPlatformError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isRetryable: boolean;
  public readonly context?: Record<string, any>;

  constructor(message: string, code: string, statusCode: number = 500, isRetryable: boolean = false, context?: Record<string, any>) {
    super(message);
    this.name = 'BettingPlatformError';
    this.code = code;
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
    this.context = context;
  }
}

export class AuthenticationError extends BettingPlatformError {
  constructor(message: string = 'Authentication failed', context?: Record<string, any>) {
    super(message, 'AUTHENTICATION_ERROR', 401, false, context);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends BettingPlatformError {
  public readonly retryAfter: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter: number = 60, context?: Record<string, any>) {
    super(message, 'RATE_LIMIT_ERROR', 429, true, { ...context, retryAfter });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class CircuitBreakerError extends BettingPlatformError {
  constructor(message: string = 'Circuit breaker is open', context?: Record<string, any>) {
    super(message, 'CIRCUIT_BREAKER_OPEN', 503, true, context);
    this.name = 'CircuitBreakerError';
  }
}

export interface BettingPlatformConfig {
  baseUrl: string;
  sessionToken?: string; // x-gs-session header
  authToken?: string; // Fallback for API key auth
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  rateLimitRequests?: number;
  rateLimitWindowMs?: number;

  // Enhanced configuration options
  enableCaching?: boolean;
  cacheTtl?: number; // Cache TTL in milliseconds
  enableCircuitBreaker?: boolean;
  circuitBreakerThreshold?: number; // Failures before opening circuit
  circuitBreakerTimeout?: number; // Time before attempting reset
  enableWebhooks?: boolean;
  webhookUrl?: string;
  enableMetrics?: boolean;
  metricsPrefix?: string;
  enableTracing?: boolean;
  requestIdHeader?: string;
  userAgent?: string;
  connectionPoolSize?: number;
  keepAlive?: boolean;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

export interface WebhookEvent {
  id: string;
  type: string;
  timestamp: number;
  data: any;
  metadata?: Record<string, any>;
}

export interface BettingMetrics {
  liveEvents: number;
  totalBets: number;
  oddsUpdates: Array<{
    timestamp: number;
    eventId: string;
    sport: string;
    change: number;
  }>;
  sportsVolume: Array<{
    sport: string;
    volume: number;
    percentage: number;
  }>;
}

export class BettingPlatformWorkflowIntegration extends EventEmitter {
  private client: AxiosInstance;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;
  private requestCount = 0;
  private rateLimitReset = 0;

  // Enhanced features
  private cache = new Map<string, CacheEntry<any>>();
  private circuitBreaker: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    state: 'closed'
  };
  private metrics: Record<string, number> = {};
  private activeRequests = new Set<string>();

  constructor(private config: BettingPlatformConfig) {
    super(); // Initialize EventEmitter

    // Use the correct plive API base URL
    const baseURL = this.config.baseUrl || 'https://plive.sportswidgets.pro/manager-tools/';

    this.client = axios.create({
      baseURL,
      timeout: this.config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': this.config.userAgent || 'BettingWorkflowSystem/2.0',
        // Use x-gs-session header for authentication (plive's session-based auth)
        ...(this.config.sessionToken && { 'x-gs-session': this.config.sessionToken }),
        // Fallback to Authorization header if session token not provided
        ...(this.config.authToken && { 'Authorization': `Bearer ${this.config.authToken}` })
      },
      // Enhanced connection settings
      maxRedirects: 5,
      decompress: true,
      ...(this.config.keepAlive && {
        httpAgent: new (require('http').Agent)({
          keepAlive: true,
          maxSockets: this.config.connectionPoolSize || 10
        })
      })
    });

    // Initialize enhanced features
    this.initializeFeatures();

    // Preconnect to the betting platform for better performance
    this.setupPreconnect();

    // Configure retry logic and error handling
    this.setupInterceptors();

    // Start rate limiting
    this.startRateLimitManager();

    // Start cache cleanup if caching is enabled
    if (this.config.enableCaching) {
      this.startCacheCleanup();
    }

    // Start circuit breaker monitoring if enabled
    if (this.config.enableCircuitBreaker) {
      this.startCircuitBreakerMonitoring();
    }
  }

  private setupPreconnect(): void {
    try {
      // Use Bun's fetch.preconnect for faster subsequent API calls
      const bunFetch = fetch as any; // Cast to any to access Bun-specific methods
      if (typeof fetch !== 'undefined' && bunFetch.preconnect) {
        bunFetch.preconnect(this.config.baseUrl);
        console.log(`🔗 Preconnected to betting platform: ${this.config.baseUrl}`);
      } else {
        console.log("ℹ️ fetch.preconnect not available, using standard connection pooling");
      }
    } catch (error) {
      // Preconnect may fail in some Bun versions, but this doesn't break functionality
      console.log("ℹ️ Preconnection skipped (may not be supported in this Bun version):", error instanceof Error ? error.message : String(error));
      console.log("ℹ️ API calls will still work normally with connection pooling");
    }
  }

  private setupInterceptors(): void {
    // Request interceptor for enhanced functionality
    this.client.interceptors.request.use(
      async (config) => {
        const startTime = Date.now();
        const requestId = this.generateRequestId();

        // Check circuit breaker
        await this.checkCircuitBreaker();

        // Enforce rate limiting
        await this.enforceRateLimit();

        // Add request ID for tracing
        if (this.config.enableTracing) {
          (config.headers as any)[this.config.requestIdHeader || 'x-request-id'] = requestId;
        }

        // Store request metadata
        (config as any)._startTime = startTime;
        (config as any)._requestId = requestId;

        // Track active request
        this.activeRequests.add(requestId);

        this.incrementMetric('requests.outgoing');
        return config;
      },
      (error) => {
        this.incrementMetric('requests.failed');
        return Promise.reject(error);
      }
    );

    // Response interceptor for enhanced error handling and success tracking
    this.client.interceptors.response.use(
      (response) => {
        const config = response.config as any;
        const requestId = config._requestId;
        const duration = Date.now() - config._startTime;

        // Remove from active requests
        if (requestId) {
          this.activeRequests.delete(requestId);
        }

        // Record circuit breaker success
        this.recordCircuitBreakerSuccess();

        // Record metrics
        this.incrementMetric('requests.successful');
        this.incrementMetric('response.time', duration);

        // Send webhook for successful operations
        if (this.config.enableWebhooks && response.config.method?.toUpperCase() === 'POST') {
          this.sendWebhook({
            type: 'api.success',
            data: {
              method: response.config.method,
              url: response.config.url,
              status: response.status,
              duration
            },
            metadata: { requestId }
          });
        }

        return response;
      },
      async (error: AxiosError) => {
        const config = error.config as any;
        const requestId = config?._requestId;
        const duration = config?._startTime ? Date.now() - config._startTime : 0;

        // Remove from active requests
        if (requestId) {
          this.activeRequests.delete(requestId);
        }

        // Send webhook for failed operations
        if (this.config.enableWebhooks) {
          this.sendWebhook({
            type: 'api.error',
            data: {
              method: error.config?.method,
              url: error.config?.url,
              status: error.response?.status,
              duration,
              error: error.message
            },
            metadata: { requestId }
          });
        }

        if (!config || !this.shouldRetry(error)) {
          return Promise.reject(this.handleApiError(error));
        }

        // Implement exponential backoff retry
        const retryCount = config._retryCount || 0;
        const maxRetries = this.config.retryAttempts || 3;

        if (retryCount >= maxRetries) {
          return Promise.reject(this.handleApiError(error));
        }

        config._retryCount = retryCount + 1;
        const delay = (this.config.retryDelay || 1000) * Math.pow(2, retryCount);

        console.warn(`🔄 Retrying request (${retryCount + 1}/${maxRetries}) after ${delay}ms:`, config.url);
        this.incrementMetric('requests.retries');
        await new Promise(resolve => setTimeout(resolve, delay));

        return this.client(config);
      }
    );
  }

  private shouldRetry(error: AxiosError): boolean {
    if (!error.response) {
      // Network errors - retry
      return true;
    }

    const status = error.response.status;
    // Retry on 5xx errors and specific 4xx errors
    return status >= 500 || status === 429 || status === 408 || status === 503;
  }

  private handleApiError(error: AxiosError): BettingPlatformError {
    // Record circuit breaker failure
    this.recordCircuitBreakerFailure();
    this.incrementMetric('api.errors');

    if (!error.response) {
      return new BettingPlatformError(
        `Network error: ${error.message}`,
        'NETWORK_ERROR',
        0,
        true,
        { originalError: error.message }
      );
    }

    const { status, data, headers } = error.response;
    const errorMessage = (data as any)?.message || (data as any)?.d || error.message || 'Unknown error';

    switch (status) {
      case 401:
        return new AuthenticationError(errorMessage, {
          status,
          data,
          headers
        });
      case 403:
        return new BettingPlatformError(
          'Authorization failed: Insufficient permissions',
          'AUTHORIZATION_ERROR',
          status,
          false,
          { status, data, headers }
        );
      case 429:
        const retryAfter = parseInt(headers['retry-after'] || '60');
        return new RateLimitError(
          'Rate limit exceeded: Too many requests',
          retryAfter,
          { status, data, headers, retryAfter }
        );
      case 500:
        return new BettingPlatformError(
          'Server error: Internal betting platform error',
          'SERVER_ERROR',
          status,
          true,
          { status, data, headers }
        );
      case 503:
        return new BettingPlatformError(
          'Service unavailable: Betting platform is down',
          'SERVICE_UNAVAILABLE',
          status,
          true,
          { status, data, headers }
        );
      default:
        return new BettingPlatformError(
          `API error (${status}): ${errorMessage}`,
          'API_ERROR',
          status,
          status >= 500,
          { status, data, headers }
        );
    }
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const rateLimitRequests = this.config.rateLimitRequests || 100;
    const rateLimitWindow = this.config.rateLimitWindowMs || 60000; // 1 minute

    // Reset counter if window has passed
    if (now - this.rateLimitReset >= rateLimitWindow) {
      this.requestCount = 0;
      this.rateLimitReset = now;
    }

    // Check if we're within rate limits
    if (this.requestCount >= rateLimitRequests) {
      const waitTime = rateLimitWindow - (now - this.rateLimitReset);
      console.warn(`⏳ Rate limit reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.rateLimitReset = Date.now();
    }

    // Enforce minimum delay between requests
    const minDelay = 100; // 100ms between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < minDelay) {
      await new Promise(resolve => setTimeout(resolve, minDelay - timeSinceLastRequest));
    }

    this.requestCount++;
    this.lastRequestTime = Date.now();
  }

  private startRateLimitManager(): void {
    // Reset rate limit counters periodically
    setInterval(() => {
      const now = Date.now();
      if (now - this.rateLimitReset >= (this.config.rateLimitWindowMs || 60000)) {
        this.requestCount = 0;
        this.rateLimitReset = now;
      }
    }, 10000); // Check every 10 seconds
  }

  // ===== ENHANCED FEATURES =====

  private initializeFeatures(): void {
    // Set default values for enhanced features
    this.config.enableCaching = this.config.enableCaching ?? true;
    this.config.cacheTtl = this.config.cacheTtl ?? 300000; // 5 minutes
    this.config.enableCircuitBreaker = this.config.enableCircuitBreaker ?? true;
    this.config.circuitBreakerThreshold = this.config.circuitBreakerThreshold ?? 5;
    this.config.circuitBreakerTimeout = this.config.circuitBreakerTimeout ?? 60000; // 1 minute
    this.config.enableMetrics = this.config.enableMetrics ?? true;
    this.config.metricsPrefix = this.config.metricsPrefix ?? 'betting_platform';
    this.config.enableTracing = this.config.enableTracing ?? false;
    this.config.requestIdHeader = this.config.requestIdHeader ?? 'x-request-id';
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      Array.from(this.cache.entries()).forEach(([key, entry]) => {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
          this.incrementMetric('cache.evictions');
        }
      });
    }, 60000); // Clean up every minute
  }

  private startCircuitBreakerMonitoring(): void {
    setInterval(() => {
      const now = Date.now();
      const timeout = this.config.circuitBreakerTimeout || 60000;

      if (this.circuitBreaker.state === 'open' &&
          now - this.circuitBreaker.lastFailureTime > timeout) {
        this.circuitBreaker.state = 'half-open';
        console.log('🔄 Circuit breaker transitioning to half-open state');
        this.emit('circuit-breaker:half-open');
      }
    }, 10000); // Check every 10 seconds
  }

  private async checkCircuitBreaker(): Promise<void> {
    if (!this.config.enableCircuitBreaker) return;

    if (this.circuitBreaker.state === 'open') {
      throw new CircuitBreakerError('Circuit breaker is open', {
        failures: this.circuitBreaker.failures,
        lastFailureTime: this.circuitBreaker.lastFailureTime
      });
    }
  }

  private recordCircuitBreakerFailure(): void {
    if (!this.config.enableCircuitBreaker) return;

    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failures >= (this.config.circuitBreakerThreshold || 5)) {
      this.circuitBreaker.state = 'open';
      console.warn('⚡ Circuit breaker opened due to repeated failures');
      this.emit('circuit-breaker:opened', {
        failures: this.circuitBreaker.failures,
        threshold: this.config.circuitBreakerThreshold
      });
    }
  }

  private recordCircuitBreakerSuccess(): void {
    if (!this.config.enableCircuitBreaker) return;

    if (this.circuitBreaker.state === 'half-open') {
      this.circuitBreaker.state = 'closed';
      this.circuitBreaker.failures = 0;
      console.log('✅ Circuit breaker closed - service recovered');
      this.emit('circuit-breaker:closed');
    }
  }

  private getCacheKey(method: string, url: string, params?: any): string {
    const paramStr = params ? JSON.stringify(params) : '';
    return `${method}:${url}:${paramStr}`;
  }

  private getCacheEntry<T>(key: string): T | null {
    if (!this.config.enableCaching) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.incrementMetric('cache.expirations');
      return null;
    }

    this.incrementMetric('cache.hits');
    return entry.data;
  }

  private setCacheEntry<T>(key: string, data: T, ttl?: number): void {
    if (!this.config.enableCaching) return;

    const cacheTtl = ttl || this.config.cacheTtl || 300000;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: cacheTtl
    });
    this.incrementMetric('cache.sets');
  }

  private incrementMetric(name: string, value: number = 1): void {
    if (!this.config.enableMetrics) return;

    const key = `${this.config.metricsPrefix}.${name}`;
    this.metrics[key] = (this.metrics[key] || 0) + value;
  }

  private async sendWebhook(event: Omit<WebhookEvent, 'id' | 'timestamp'>): Promise<void> {
    if (!this.config.enableWebhooks || !this.config.webhookUrl) return;

    try {
      const webhookEvent: WebhookEvent = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        ...event
      };

      await axios.post(this.config.webhookUrl, webhookEvent, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'BettingPlatformWebhook/1.0'
        }
      });

      this.incrementMetric('webhooks.sent');
    } catch (error) {
      console.warn('⚠️ Failed to send webhook:', error instanceof Error ? error.message : String(error));
      this.incrementMetric('webhooks.failed');
    }
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async handleContentSubmission(data: any): Promise<WorkflowInstance> {
    try {
      console.log('📤 Submitting content to plive platform:', data.contentId || data.title);

      // Submit content for approval using plive endpoint
      const submissionResponse = await this.client.post('submitContent/', {
        contentId: data.contentId,
        contentType: data.contentType,
        title: data.title,
        jurisdiction: data.jurisdiction,
        financialImpact: data.financialImpact,
        metadata: data.metadata,
        submittedBy: data.submittedBy
      });

      const responseData = submissionResponse.data;

      // Parse plive response format
      if (responseData && responseData.e === 0) {
        const result = responseData.r;

        // Create local workflow instance with platform reference
        const workflowInstance: WorkflowInstance = {
          id: crypto.randomUUID(),
          workflowId: 'content_publishing',
          status: 'pending',
          currentStep: 'content_review',
          createdBy: data.submittedBy || 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
          data: {
            ...data,
            platformReference: result?.referenceId || result?.id,
            platformStatus: result?.status || 'submitted'
          },
          approvals: new Map()
        };

        console.log('✅ Content submitted to plive successfully, reference:', result?.referenceId || result?.id);
        return workflowInstance;

      } else {
        throw new Error(`Plive content submission failed: ${responseData?.d || 'Unknown error'}`);
      }

    } catch (error) {
      console.error('❌ Content submission to plive failed:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async handleLineChangeRequest(data: any): Promise<WorkflowInstance> {
    try {
      console.log('📤 Submitting line change to betting platform:', data.lineId);

      // First, get current line data to validate the change
      const currentLineResponse = await this.client.get(`/api/v1/lines/${data.lineId}`);

      if (!currentLineResponse.data) {
        throw new Error(`Line ${data.lineId} not found in betting platform`);
      }

      // Calculate financial impact
      const impactAnalysis = await this.calculateFinancialImpact({
        oldOdds: currentLineResponse.data.odds,
        newOdds: data.newOdds,
        marketType: data.marketType
      });

      // Submit line change request
      const submissionResponse = await this.client.post('/api/v1/lines/change-request', {
        lineId: data.lineId,
        eventName: data.eventName,
        currentOdds: currentLineResponse.data.odds,
        requestedOdds: data.newOdds,
        marketType: data.marketType,
        reason: data.reason,
        financialImpact: impactAnalysis.totalImpact,
        riskLevel: impactAnalysis.riskLevel,
        requestedBy: data.requestedBy
      });

      // Create local workflow instance
      const workflowInstance: WorkflowInstance = {
        id: crypto.randomUUID(),
        workflowId: 'line_change_approval',
        status: 'pending',
        currentStep: 'trading_review',
        createdBy: data.requestedBy || 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        data: {
          ...data,
          platformReference: submissionResponse.data.requestId,
          currentOdds: currentLineResponse.data.odds,
          financialImpact: impactAnalysis.totalImpact,
          riskLevel: impactAnalysis.riskLevel
        },
        approvals: new Map()
      };

      console.log('✅ Line change request submitted successfully, reference:', submissionResponse.data.requestId);
      return workflowInstance;

    } catch (error) {
      console.error('❌ Line change request failed:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async handleOddsUpdateRequest(data: any): Promise<WorkflowInstance> {
    try {
      console.log('📤 Submitting odds update to betting platform:', data.eventId);

      // Validate event exists
      const eventResponse = await this.client.get(`/api/v1/events/${data.eventId}`);

      if (!eventResponse.data) {
        throw new Error(`Event ${data.eventId} not found in betting platform`);
      }

      // Calculate financial impact
      const impactAnalysis = await this.calculateFinancialImpact({
        oldOdds: data.oldOdds,
        newOdds: data.newOdds,
        marketType: data.marketType
      });

      // Submit odds update request
      const submissionResponse = await this.client.post('/api/v1/odds/update-request', {
        eventId: data.eventId,
        eventName: data.eventName,
        marketType: data.marketType,
        oldOdds: data.oldOdds,
        newOdds: data.newOdds,
        reason: data.reason,
        financialImpact: impactAnalysis.totalImpact,
        riskLevel: impactAnalysis.riskLevel,
        requestedBy: data.requestedBy,
        timestamp: data.timestamp || new Date().toISOString()
      });

      // Create local workflow instance
      const workflowInstance: WorkflowInstance = {
        id: crypto.randomUUID(),
        workflowId: 'odds_update_approval',
        status: 'pending',
        currentStep: 'odds_review',
        createdBy: data.requestedBy || 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        data: {
          ...data,
          platformReference: submissionResponse.data.requestId,
          financialImpact: impactAnalysis.totalImpact,
          riskLevel: impactAnalysis.riskLevel
        },
        approvals: new Map()
      };

      console.log('✅ Odds update request submitted successfully, reference:', submissionResponse.data.requestId);
      return workflowInstance;

    } catch (error) {
      console.error('❌ Odds update request failed:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async handlePromotionSubmission(data: any): Promise<WorkflowInstance> {
    try {
      console.log('📤 Submitting promotion to betting platform:', data.title);

      // Validate promotion data
      const validationResponse = await this.client.post('/api/v1/promotions/validate', {
        title: data.title,
        promotionType: data.promotionType,
        targetAudience: data.targetAudience,
        budget: data.budget,
        duration: data.duration,
        jurisdiction: data.jurisdiction
      });

      if (!validationResponse.data.valid) {
        throw new Error(`Promotion validation failed: ${validationResponse.data.errors?.join(', ')}`);
      }

      // Submit promotion for approval
      const submissionResponse = await this.client.post('/api/v1/promotions/submit', {
        title: data.title,
        promotionType: data.promotionType,
        description: data.description,
        targetAudience: data.targetAudience,
        budget: data.budget,
        duration: data.duration,
        jurisdiction: data.jurisdiction,
        financialImpact: data.financialImpact,
        submittedBy: data.submittedBy
      });

      // Create local workflow instance
      const workflowInstance: WorkflowInstance = {
        id: crypto.randomUUID(),
        workflowId: 'promotion_approval',
        status: 'pending',
        currentStep: 'marketing_review',
        createdBy: data.submittedBy || 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        data: {
          ...data,
          platformReference: submissionResponse.data.promotionId,
          platformStatus: submissionResponse.data.status
        },
        approvals: new Map()
      };

      console.log('✅ Promotion submitted successfully, reference:', submissionResponse.data.promotionId);
      return workflowInstance;

    } catch (error) {
      console.error('❌ Promotion submission failed:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async calculateFinancialImpact(data: any): Promise<{
    totalImpact: number;
    percentageChange: number;
    totalExposure: number;
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    try {
      // Get current exposure data from betting platform
      const exposureResponse = await this.client.get('/api/v1/analytics/exposure', {
        params: {
          marketType: data.marketType,
          eventId: data.eventId || data.lineId
        }
      });

      const currentExposure = exposureResponse.data.totalExposure || 0;
      const currentOdds = parseFloat(data.oldOdds);
      const newOdds = parseFloat(data.newOdds);

      // Calculate percentage change
      const percentageChange = Math.abs((newOdds - currentOdds) / currentOdds) * 100;

      // Calculate financial impact based on exposure
      const totalImpact = currentExposure * (percentageChange / 100);
      const totalExposure = currentExposure;

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (percentageChange > 20 || totalImpact > 50000) riskLevel = 'high';
      else if (percentageChange > 10 || totalImpact > 25000) riskLevel = 'medium';

      console.log(`💰 Financial impact calculated: ${totalImpact.toFixed(2)}, risk: ${riskLevel}`);

      return {
        totalImpact,
        percentageChange,
        totalExposure,
        riskLevel
      };

    } catch (error) {
      console.warn('⚠️ Could not calculate financial impact from platform, using fallback:', error instanceof Error ? error.message : String(error));

      // Fallback calculation if platform is unavailable
      const totalImpact = Math.abs(data.newOdds - data.oldOdds) * 10000;
      const percentageChange = Math.abs((data.newOdds - data.oldOdds) / data.oldOdds) * 100;
      const totalExposure = totalImpact * 2;

      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (percentageChange > 20) riskLevel = 'high';
      else if (percentageChange > 10) riskLevel = 'medium';

      return {
        totalImpact,
        percentageChange,
        totalExposure,
        riskLevel
      };
    }
  }

  async updateContentStatus(contentId: string, status: any): Promise<void> {
    try {
      console.log('📤 Updating content status in betting platform:', { contentId, status });

      await this.client.put(`/api/v1/content/${contentId}/status`, {
        status: status.status,
        workflowId: status.workflowId,
        currentStep: status.currentStep,
        updatedAt: new Date().toISOString()
      });

      console.log('✅ Content status updated successfully');
    } catch (error) {
      console.error('❌ Content status update failed:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async notifyTradingTeam(lineId: string, workflowId: string, impactAnalysis: any): Promise<void> {
    try {
      console.log('📤 Notifying trading team:', { lineId, workflowId });

      await this.client.post('/api/v1/notifications/trading-team', {
        lineId,
        workflowId,
        impactAnalysis,
        notificationType: 'line_change_request',
        priority: impactAnalysis.riskLevel === 'high' ? 'urgent' : 'normal',
        timestamp: new Date().toISOString()
      });

      console.log('✅ Trading team notified successfully');
    } catch (error) {
      console.error('❌ Trading team notification failed:', error instanceof Error ? error.message : String(error));
      // Don't throw here - notification failures shouldn't break workflows
    }
  }

  // ===== BETTING METRICS METHODS =====

  async getBettingMetrics(): Promise<BettingMetrics> {
    const cacheKey = this.getCacheKey('GET', 'bettingMetrics');
    const cached = this.getCacheEntry<BettingMetrics>(cacheKey);

    if (cached) {
      console.log('📊 Returning cached betting metrics');
      return cached;
    }

    try {
      console.log('📊 Fetching betting metrics from plive platform');

      // Fetch multiple metrics in parallel using correct plive endpoints
      const [
        liveEventsResponse,
        totalBetsResponse,
        oddsUpdatesResponse,
        sportsVolumeResponse
      ] = await Promise.allSettled([
        this.client.get('liveEvents/'),
        this.client.get('totalBets/'),
        this.client.get('oddsUpdates/', { params: { hours: 24 } }),
        this.client.get('sportsVolume/')
      ]);

      // Parse plive API responses (format: {e, r, d})
      const parsePliveResponse = (response: PromiseSettledResult<any>) => {
        if (response.status === 'fulfilled') {
          const data = response.value.data;
          // plive format: {e: error_code, r: result, d: message}
          if (data && data.e === 0) {
            return data.r; // Success case
          } else {
            console.warn('Plive API error:', data?.d || 'Unknown error');
            return null;
          }
        } else {
          console.warn('Request failed:', response.reason?.message);
          return null;
        }
      };

      const liveEventsData = parsePliveResponse(liveEventsResponse);
      const totalBetsData = parsePliveResponse(totalBetsResponse);
      const oddsUpdatesData = parsePliveResponse(oddsUpdatesResponse);
      const sportsVolumeData = parsePliveResponse(sportsVolumeResponse);

      // Extract metrics from plive response format
      const liveEvents = Array.isArray(liveEventsData) ? liveEventsData.length : (liveEventsData?.count || 0);
      const totalBets = totalBetsData?.total || totalBetsData?.count || 0;

      // Process odds updates
      const oddsUpdates = Array.isArray(oddsUpdatesData) ? oddsUpdatesData.map((update: any) => ({
        timestamp: new Date(update.timestamp || update.createdAt).getTime(),
        eventId: update.eventId || update.id,
        sport: update.sport || update.category,
        change: update.changePercentage || update.change || 0
      })) : [];

      // Process sports volume data
      const sportsData = Array.isArray(sportsVolumeData) ? sportsVolumeData : [];
      const totalVolume = sportsData.reduce((sum: number, sport: any) => sum + (sport.volume || sport.amount || 0), 0);
      const sportsVolume = sportsData.map((sport: any) => ({
        sport: sport.name || sport.sport,
        volume: sport.volume || sport.amount || 0,
        percentage: totalVolume > 0 ? ((sport.volume || sport.amount || 0) / totalVolume) * 100 : 0
      }));

      const metrics: BettingMetrics = {
        liveEvents,
        totalBets,
        oddsUpdates,
        sportsVolume
      };

      // Cache the successful result
      this.setCacheEntry(cacheKey, metrics, 180000); // Cache for 3 minutes

      console.log(`✅ Retrieved betting metrics: ${liveEvents} live events, ${totalBets} total bets`);
      return metrics;

    } catch (error) {
      console.error('❌ Failed to fetch betting metrics from plive:', error instanceof Error ? error.message : String(error));

      // Return fallback data if platform is unavailable
      const fallbackMetrics: BettingMetrics = {
        liveEvents: 0,
        totalBets: 0,
        oddsUpdates: [],
        sportsVolume: []
      };

      // Send webhook about the failure
      if (this.config.enableWebhooks) {
        this.sendWebhook({
          type: 'metrics.fetch.failed',
          data: {
            error: error instanceof Error ? error.message : String(error),
            fallback: true
          }
        });
      }

      return fallbackMetrics;
    }
  }

  async getLiveEventsCount(): Promise<number> {
    try {
      const response = await this.client.get('liveEvents/');
      const data = response.data;

      // Parse plive response format
      if (data && data.e === 0) {
        const result = data.r;
        return Array.isArray(result) ? result.length : (result?.count || 0);
      } else {
        console.warn('Plive API error in liveEvents:', data?.d);
        return 0;
      }
    } catch (error) {
      console.error('❌ Failed to fetch live events count:', error instanceof Error ? error.message : String(error));
      return 0;
    }
  }

  async getTotalBetsCount(): Promise<number> {
    try {
      const response = await this.client.get('totalBets/');
      const data = response.data;

      // Parse plive response format
      if (data && data.e === 0) {
        const result = data.r;
        return result?.total || result?.count || 0;
      } else {
        console.warn('Plive API error in totalBets:', data?.d);
        return 0;
      }
    } catch (error) {
      console.error('❌ Failed to fetch total bets count:', error instanceof Error ? error.message : String(error));
      return 0;
    }
  }

  async getOddsUpdates(hours: number = 24): Promise<Array<{timestamp: number, eventId: string, sport: string, change: number}>> {
    try {
      const response = await this.client.get('oddsUpdates/', { params: { hours } });
      const data = response.data;

      // Parse plive response format
      if (data && data.e === 0) {
        const updates = data.r || [];
        return updates.map((update: any) => ({
          timestamp: new Date(update.timestamp || update.createdAt).getTime(),
          eventId: update.eventId || update.id,
          sport: update.sport || update.category,
          change: update.changePercentage || update.change || 0
        }));
      } else {
        console.warn('Plive API error in oddsUpdates:', data?.d);
        return [];
      }
    } catch (error) {
      console.error('❌ Failed to fetch odds updates:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  async getSportsVolume(): Promise<Array<{sport: string, volume: number, percentage: number}>> {
    try {
      const response = await this.client.get('sportsVolume/');
      const data = response.data;

      // Parse plive response format
      if (data && data.e === 0) {
        const sportsData = data.r || [];

        // Calculate total volume for percentages
        const totalVolume = sportsData.reduce((sum: number, sport: any) => sum + (sport.volume || sport.amount || 0), 0);

        return sportsData.map((sport: any) => ({
          sport: sport.name || sport.sport,
          volume: sport.volume || sport.amount || 0,
          percentage: totalVolume > 0 ? ((sport.volume || sport.amount || 0) / totalVolume) * 100 : 0
        }));
      } else {
        console.warn('Plive API error in sportsVolume:', data?.d);
        return [];
      }
    } catch (error) {
      console.error('❌ Failed to fetch sports volume:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  // ===== HEALTH CHECK METHODS =====

  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime: number;
    timestamp: number;
    config: {
      baseUrl: string;
      hasAuthToken: boolean;
      timeout: number;
    };
    endpoints?: {
      liveEvents: boolean;
      totalBets: boolean;
      sportsVolume: boolean;
    };
    error?: string;
  }> {
    const startTime = Date.now();
    const config = {
      baseUrl: this.config.baseUrl,
      hasAuthToken: !!this.config.authToken,
      timeout: this.config.timeout || 30000
    };

    try {
      console.log('🏥 Running betting platform health check');

      // Test multiple endpoints in parallel
      const healthTests = await Promise.allSettled([
        this.client.get('/api/v1/analytics/live-events').then(() => true).catch(() => false),
        this.client.get('/api/v1/analytics/total-bets').then(() => true).catch(() => false),
        this.client.get('/api/v1/analytics/sports-volume').then(() => true).catch(() => false)
      ]);

      const responseTime = Date.now() - startTime;
      const endpoints = {
        liveEvents: healthTests[0].status === 'fulfilled' && healthTests[0].value,
        totalBets: healthTests[1].status === 'fulfilled' && healthTests[1].value,
        sportsVolume: healthTests[2].status === 'fulfilled' && healthTests[2].value
      };

      const allHealthy = Object.values(endpoints).every(Boolean);

      return {
        status: allHealthy ? 'healthy' : 'unhealthy',
        responseTime,
        timestamp: Date.now(),
        config,
        endpoints: allHealthy ? endpoints : undefined,
        error: !allHealthy ? 'Some endpoints are not responding' : undefined
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'unhealthy',
        responseTime,
        timestamp: Date.now(),
        config,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async isPlatformReachable(): Promise<boolean> {
    try {
      await this.client.get('/api/v1/analytics/live-events');
      return true;
    } catch (error) {
      return false;
    }
  }

  // ===== ENHANCED PUBLIC METHODS =====

  /**
   * Get current metrics and performance statistics
   */
  getMetrics(): Record<string, number> {
    return { ...this.metrics };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number; totalRequests: number } {
    const totalRequests = (this.metrics[`${this.config.metricsPrefix}.cache.hits`] || 0) +
                         (this.metrics[`${this.config.metricsPrefix}.cache.misses`] || 0);
    const hitRate = totalRequests > 0 ?
      (this.metrics[`${this.config.metricsPrefix}.cache.hits`] || 0) / totalRequests : 0;

    return {
      size: this.cache.size,
      hitRate,
      totalRequests
    };
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): CircuitBreakerState {
    return { ...this.circuitBreaker };
  }

  /**
   * Get active request count
   */
  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }

  /**
   * Clear cache manually
   */
  clearCache(): void {
    this.cache.clear();
    this.incrementMetric('cache.cleared');
    console.log('🧹 Cache cleared manually');
  }

  /**
   * Reset circuit breaker (for testing/recovery)
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker = {
      failures: 0,
      lastFailureTime: 0,
      state: 'closed'
    };
    console.log('🔄 Circuit breaker reset');
    this.emit('circuit-breaker:reset');
  }

  /**
   * Get health status with enhanced information
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    timestamp: number;
    config: Partial<BettingPlatformConfig>;
    circuitBreaker: CircuitBreakerState;
    cache: { size: number; hitRate: number };
    activeRequests: number;
    metrics: Record<string, number>;
    platformReachable: boolean;
    errors?: string[];
  }> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      console.log('🏥 Running enhanced health check');

      // Test platform reachability
      const platformReachable = await this.isPlatformReachable().catch(() => false);

      // Get cache stats
      const cacheStats = this.getCacheStats();

      // Get circuit breaker status
      const circuitBreaker = this.getCircuitBreakerStatus();

      // Get active requests
      const activeRequests = this.getActiveRequestCount();

      // Get metrics
      const metrics = this.getMetrics();

      const responseTime = Date.now() - startTime;

      // Determine overall health
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (!platformReachable) {
        status = 'unhealthy';
        errors.push('Platform is not reachable');
      } else if (circuitBreaker.state !== 'closed') {
        status = 'degraded';
        errors.push(`Circuit breaker is ${circuitBreaker.state}`);
      } else if (activeRequests > 50) {
        status = 'degraded';
        errors.push(`High active request count: ${activeRequests}`);
      }

      return {
        status,
        responseTime,
        timestamp: Date.now(),
        config: {
          baseUrl: this.config.baseUrl,
          enableCaching: this.config.enableCaching,
          enableCircuitBreaker: this.config.enableCircuitBreaker,
          enableMetrics: this.config.enableMetrics,
          enableWebhooks: this.config.enableWebhooks
        },
        circuitBreaker,
        cache: cacheStats,
        activeRequests,
        metrics,
        platformReachable,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'unhealthy',
        responseTime,
        timestamp: Date.now(),
        config: {},
        circuitBreaker: this.getCircuitBreakerStatus(),
        cache: this.getCacheStats(),
        activeRequests: this.getActiveRequestCount(),
        metrics: this.getMetrics(),
        platformReachable: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Force refresh cached data
   */
  async refreshCache(): Promise<void> {
    this.clearCache();
    // Pre-warm cache with fresh data
    try {
      await Promise.allSettled([
        this.getBettingMetrics(),
        this.getLiveEventsCount(),
        this.getTotalBetsCount(),
        this.getSportsVolume()
      ]);
      console.log('🔄 Cache refreshed with fresh data');
    } catch (error) {
      console.warn('⚠️ Cache refresh partially failed:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Set webhook configuration dynamically
   */
  setWebhookConfig(url: string): void {
    this.config.webhookUrl = url;
    this.config.enableWebhooks = !!url;
    console.log(`🔗 Webhook URL ${url ? 'set' : 'cleared'}`);
  }
}
