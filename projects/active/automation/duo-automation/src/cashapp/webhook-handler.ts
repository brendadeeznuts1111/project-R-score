/**
 * CashApp Webhook Handler - Alert System
 * Enterprise-Grade Webhook Integration for Risk Alerts
 */

import type { 
  WebhookPayload, 
  WebhookEventType, 
  WebhookProfile, 
  WebhookRisk,
  CashAppProfile,
  RiskAssessmentV2,
  RecommendationV2
} from './types.js';

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  /** Webhook URL */
  url: string;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Retry configuration */
  retry?: {
    maxAttempts: number;
    backoffMs: number;
  };
  /** Timeout in ms */
  timeout?: number;
}

/**
 * Webhook delivery result
 */
export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  response?: string;
  attempts: number;
  latencyMs: number;
  error?: string;
}

/**
 * Webhook Statistics
 */
export interface WebhookStats {
  totalSent: number;
  successful: number;
  failed: number;
  averageLatency: number;
  lastSent?: number;
  lastSuccess?: number;
  lastFailure?: number;
}

/**
 * CashApp Webhook Handler
 * Manages webhook deliveries for high-risk alerts
 */
export class CashAppWebhookHandler {
  private stats: WebhookStats = {
    totalSent: 0,
    successful: 0,
    failed: 0,
    averageLatency: 0
  };

  constructor(
    private readonly config: WebhookConfig,
    private readonly source: string = 'cashapp-integration-v2'
  ) {}

  /**
   * Send high-risk profile alert
   */
  async sendHighRiskAlert(
    profile: CashAppProfile,
    riskAssessment: RiskAssessmentV2,
    options: {
      environment: 'production' | 'sandbox';
      requestId?: string;
    } = { environment: 'production' }
  ): Promise<WebhookDeliveryResult> {
    const payload = this.buildPayload(
      'HIGH_RISK_CASHAPP_PROFILE',
      profile,
      riskAssessment,
      options
    );
    return this.send(payload);
  }

  /**
   * Send profile blocked notification
   */
  async sendBlockedNotification(
    profile: CashAppProfile,
    reason: string,
    options: {
      environment: 'production' | 'sandbox';
      requestId?: string;
    } = { environment: 'production' }
  ): Promise<WebhookDeliveryResult> {
    const riskAssessment: RiskAssessmentV2 = {
      riskScore: 100,
      factors: [],
      riskLevel: 'HIGH',
      recommendation: 'BLOCK',
      metadata: {
        assessedAt: Date.now(),
        modelVersion: 'v2.0',
        reason
      }
    };

    const payload = this.buildPayload(
      'PROFILE_BLOCKED',
      profile,
      riskAssessment,
      { ...options, recommendation: 'BLOCK' }
    );
    return this.send(payload);
  }

  /**
   * Send batch complete notification
   */
  async sendBatchComplete(
    stats: {
      total: number;
      successful: number;
      failed: number;
      highRiskCount: number;
    },
    options: {
      environment: 'production' | 'sandbox';
      requestId?: string;
    } = { environment: 'production' }
  ): Promise<WebhookDeliveryResult> {
    const payload: WebhookPayload = {
      event: 'BATCH_COMPLETE',
      timestamp: new Date().toISOString(),
      profile: {
        phone: 'N/A',
        cashtag: null,
        verificationStatus: 'unknown'
      },
      risk: {
        score: 0,
        level: 'NONE',
        factors: []
      },
      recommendation: 'ALLOW',
      metadata: {
        source: this.source,
        environment: options.environment,
        requestId: options.requestId,
        batchStats: stats
      }
    };

    return this.send(payload);
  }

  /**
   * Send rate limit exceeded notification
   */
  async sendRateLimitExceeded(
    key: string,
    retryAfter: number,
    options: {
      environment: 'production' | 'sandbox';
      requestId?: string;
    } = { environment: 'production' }
  ): Promise<WebhookDeliveryResult> {
    const payload: WebhookPayload = {
      event: 'RATE_LIMIT_EXCEEDED',
      timestamp: new Date().toISOString(),
      profile: {
        phone: this.maskIdentifier(key),
        cashtag: null,
        verificationStatus: 'unknown'
      },
      risk: {
        score: 0,
        level: 'NONE',
        factors: []
      },
      recommendation: 'ALLOW',
      metadata: {
        source: this.source,
        environment: options.environment,
        requestId: options.requestId,
        retryAfter,
        rateLimitKey: this.maskIdentifier(key)
      }
    };

    return this.send(payload);
  }

  /**
   * Build webhook payload
   */
  private buildPayload(
    event: WebhookEventType,
    profile: CashAppProfile,
    riskAssessment: RiskAssessmentV2,
    options: {
      environment: 'production' | 'sandbox';
      requestId?: string;
      recommendation?: RecommendationV2;
    }
  ): WebhookPayload {
    const webhookProfile: WebhookProfile = {
      phone: this.maskPhone(profile.phone),
      cashtag: profile.cashtag,
      verificationStatus: profile.verificationStatus
    };

    const webhookRisk: WebhookRisk = {
      score: riskAssessment.riskScore,
      level: riskAssessment.riskLevel,
      factors: riskAssessment.factors
    };

    return {
      event,
      timestamp: new Date().toISOString(),
      profile: webhookProfile,
      risk: webhookRisk,
      recommendation: options.recommendation || riskAssessment.recommendation,
      metadata: {
        source: this.source,
        environment: options.environment,
        requestId: options.requestId || this.generateRequestId(),
        cashtag: profile.cashtag,
        displayName: profile.displayName,
        confidence: profile.confidence,
        metadata: profile.metadata
      }
    };
  }

  /**
   * Send webhook payload
   */
  async send(payload: WebhookPayload): Promise<WebhookDeliveryResult> {
    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = this.config.retry?.maxAttempts || 3;
    const baseDelay = this.config.retry?.backoffMs || 1000;

    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeout || 5000);

        const response = await fetch(this.config.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Source': this.source,
            'X-Webhook-Event': payload.event,
            'X-Webhook-Timestamp': payload.timestamp,
            ...this.config.headers
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeout);
        const latency = Date.now() - startTime;

        if (response.ok) {
          this.recordSuccess(latency);
          return {
            success: true,
            statusCode: response.status,
            response: await response.text(),
            attempts,
            latencyMs: latency
          };
        }

        const errorText = await response.text();
        this.recordFailure();
        
        return {
          success: false,
          statusCode: response.status,
          response: errorText,
          attempts,
          latencyMs: latency,
          error: `HTTP ${response.status}: ${errorText}`
        };

      } catch (error) {
        const latency = Date.now() - startTime;
        
        // Check if we should retry
        if (attempts < maxAttempts) {
          const delay = baseDelay * Math.pow(2, attempts - 1);
          await this.sleep(delay);
        } else {
          this.recordFailure();
          
          return {
            success: false,
            attempts,
            latencyMs: latency,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    }

    // Should not reach here
    this.recordFailure();
    return {
      success: false,
      attempts: maxAttempts,
      latencyMs: Date.now() - startTime,
      error: 'Max retries exceeded'
    };
  }

  /**
   * Verify webhook endpoint
   */
  async verify(): Promise<boolean> {
    try {
      const testPayload: WebhookPayload = {
        event: 'BATCH_COMPLETE',
        timestamp: new Date().toISOString(),
        profile: {
          phone: 'test',
          cashtag: null,
          verificationStatus: 'unknown'
        },
        risk: {
          score: 0,
          level: 'NONE',
          factors: []
        },
        recommendation: 'ALLOW',
        metadata: {
          source: this.source,
          environment: 'production',
          verification: true
        }
      };

      const result = await this.send(testPayload);
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Get webhook statistics
   */
  getStats(): WebhookStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalSent: 0,
      successful: 0,
      failed: 0,
      averageLatency: 0
    };
  }

  /**
   * Record successful delivery
   */
  private recordSuccess(latency: number): void {
    this.stats.totalSent++;
    this.stats.successful++;
    this.stats.lastSent = Date.now();
    this.stats.lastSuccess = Date.now();
    
    // Update moving average
    const totalSuccess = this.stats.successful;
    this.stats.averageLatency = 
      ((this.stats.averageLatency * (totalSuccess - 1)) + latency) / totalSuccess;
  }

  /**
   * Record failed delivery
   */
  private recordFailure(): void {
    this.stats.totalSent++;
    this.stats.failed++;
    this.stats.lastSent = Date.now();
    this.stats.lastFailure = Date.now();
  }

  /**
   * Mask phone number for privacy
   */
  private maskPhone(phone: string): string {
    if (phone.length < 4) return '****';
    return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
  }

  /**
   * Mask identifier for privacy
   */
  private maskIdentifier(identifier: string): string {
    if (identifier.length <= 4) return '****';
    const visible = identifier.slice(-4);
    return '*'.repeat(identifier.length - 4) + visible;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `wh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create webhook handler from URL
 */
export function createWebhookHandler(
  url: string,
  options: {
    headers?: Record<string, string>;
    retry?: { maxAttempts: number; backoffMs: number };
    timeout?: number;
    source?: string;
  } = {}
): CashAppWebhookHandler {
  return new CashAppWebhookHandler({
    url,
    headers: options.headers,
    retry: options.retry,
    timeout: options.timeout
  }, options.source);
}

/**
 * Multi-webhook handler for broadcasting to multiple endpoints
 */
export class MultiWebhookHandler {
  private handlers: CashAppWebhookHandler[] = [];

  addHandler(handler: CashAppWebhookHandler): void {
    this.handlers.push(handler);
  }

  async sendToAll(payload: WebhookPayload): Promise<WebhookDeliveryResult[]> {
    return Promise.all(
      this.handlers.map(handler => handler.send(payload))
    );
  }

  async sendHighRiskAlert(
    profile: CashAppProfile,
    riskAssessment: RiskAssessmentV2,
    options: { environment: 'production' | 'sandbox' }
  ): Promise<WebhookDeliveryResult[]> {
    return Promise.all(
      this.handlers.map(handler => 
        handler.sendHighRiskAlert(profile, riskAssessment, options)
      )
    );
  }

  getStats(): WebhookStats[] {
    return this.handlers.map(h => h.getStats());
  }
}
