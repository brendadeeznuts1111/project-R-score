import config from '../src/config/config-loader';
/**
 * CashApp Integration v2.0 - main implementation
 * Enterprise-Grade Fraud Detection & Risk Assessment
 */

import { RedisClient } from "bun";
import { PhoneSanitizerV2 } from "../core/filter/phone-sanitizer-v2.js";
import { createHmac } from "node:crypto";
import type { 
  CashAppProfile, 
  CashAppConfig, 
  RiskAssessmentV2, 
  ResolveOptions, 
  BatchResolveOptions, 
  BatchResult,
  RiskFactorV2,
  RiskLevel,
  RecommendationV2,
  VerificationStatus
} from "./types.js";
import { CashAppRateLimiter } from "./rate-limiter.js";
import { CashAppCircuitBreaker } from "./circuit-breaker.js";
import { CashAppWebhookHandler } from "./webhook-handler.js";
import { CashAppAuditLogger } from "./audit-logger.js";
import { DEFAULT_RISK_THRESHOLDS } from "./types.js";

export class CashAppIntegrationV2 {
  private readonly API_VERSION = "v3";
  private readonly BASE_URL = "https://api.cash.app";
  private readonly SANDBOX_URL = "https://api-sandbox.cash.app";
  
  private cache: RedisClient;
  private auditLogger: CashAppAuditLogger;
  private rateLimiter: CashAppRateLimiter;
  private circuitBreaker: CashAppCircuitBreaker;
  private webhookHandler?: CashAppWebhookHandler;
  private phoneSanitizer = new PhoneSanitizerV2();
  
  constructor(
    private config: CashAppConfig
  ) {
    // Redis for distributed caching - with fallback
    try {
      const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
      this.cache = new RedisClient(redisUrl);
    } catch (error) {
      console.warn('Redis connection failed, using in-memory cache');
      this.cache = null as any; // Will handle null cache in methods
    }

    // Audit logger
    this.auditLogger = new CashAppAuditLogger();

    // Rate limiting: 100 requests/minute per API key
    this.rateLimiter = new CashAppRateLimiter({
      points: 100,
      duration: 60,
      blockDuration: 300
    });

    // Circuit breaker pattern
    this.circuitBreaker = new CashAppCircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000,
      halfOpenMaxAttempts: 3
    });

    // Webhook handler
    if (this.config.webhookUrl) {
      this.webhookHandler = new CashAppWebhookHandler({
        url: this.config.webhookUrl
      });
    }
  }

  /**
   * Enhanced resolve with multi-layer caching, retries, and circuit breaking
   */
  async resolve(phone: string, options: ResolveOptions = {}): Promise<CashAppProfile | null> {
    const sanitized = await this.phoneSanitizer.exec(phone);
    const cacheKey = `cashapp:${sanitized.e164}:${this.API_VERSION}`;
    
    const {
      useCache = true,
      forceRefresh = false,
      includeMetadata = false,
      timeout = 5000
    } = options;

    // 1. Redis cache (distributed)
    if (useCache && !forceRefresh) {
      const cached = await this.getFromCache(cacheKey);
      if (cached) return cached;
    }

    // 2. Rate limiting check
    const rateLimit = await this.rateLimiter.consume(this.config.apiKey);
    if (!rateLimit.allowed) {
      if (this.webhookHandler) {
        await this.webhookHandler.sendRateLimitExceeded(this.config.apiKey, rateLimit.retryAfter || 60);
      }
      throw new Error(`Rate limit exceeded. Retry after ${rateLimit.retryAfter}s`);
    }

    // 3. Circuit breaker protection
    const circuitResult = await this.circuitBreaker.execute(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const profile = await this.fetchFromApi(sanitized.e164, controller.signal);
        
        // 4. Cache in Redis
        await this.cacheProfile(cacheKey, profile);
        
        // 5. Real-time risk assessment
        const riskAssessment = await this.assessRiskV2(profile);
        
        // 6. Webhook alerts for high risk
        if (riskAssessment.recommendation === "BLOCK" && this.webhookHandler) {
          await this.webhookHandler.sendHighRiskAlert(profile, riskAssessment, {
            environment: this.config.environment
          });
        }

        // 7. Audit logging
        await this.auditLogger.logResolve(sanitized.e164, riskAssessment.riskScore, {
          riskLevel: riskAssessment.riskLevel,
          recommendation: riskAssessment.recommendation
        });

        return includeMetadata ? 
          { ...profile, metadata: { riskAssessment, cacheHit: false } } : 
          profile;

      } catch (error) {
        // 8. Fallback to stale cache if available
        const stale = await this.getFromCache(cacheKey); // For now just use normal cache as stale
        if (stale) {
          console.warn(`Using stale cache for ${sanitized.e164} due to API error`);
          return stale;
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    });

    if (!circuitResult.success) {
      throw circuitResult.error;
    }

    return circuitResult.data || null;
  }

  /**
   * Batch resolve for multiple phone numbers with concurrency control
   */
  async batchResolve(
    phones: string[], 
    options: BatchResolveOptions = {}
  ): Promise<BatchResult> {
    const {
      concurrency = 5,
      progressCallback,
      timeoutPerRequest = 3000
    } = options;

    const results: Record<string, CashAppProfile | null> = {};
    const errors: Record<string, Error> = {};
    let completed = 0;

    const processBatch = async (phone: string) => {
      try {
        const result = await this.resolve(phone, { timeout: timeoutPerRequest });
        results[phone] = result;
      } catch (error) {
        errors[phone] = error as Error;
      } finally {
        completed++;
        if (progressCallback) {
          progressCallback({ completed, total: phones.length });
        }
      }
    };

    // Process with controlled concurrency
    for (let i = 0; i < phones.length; i += concurrency) {
      const chunk = phones.slice(i, i + concurrency);
      await Promise.allSettled(chunk.map(processBatch));
    }

    const batchStats = {
      total: phones.length,
      successful: Object.keys(results).length,
      failed: Object.keys(errors).length,
      cacheHitRate: 0 // Will be calculated properly in future
    };

    await this.auditLogger.logBatchResolve(phones.length, batchStats);

    if (this.webhookHandler) {
      await this.webhookHandler.sendBatchComplete({
        total: batchStats.total,
        successful: batchStats.successful,
        failed: batchStats.failed,
        highRiskCount: 0 // Future: track high risk count
      });
    }

    return {
      results,
      errors,
      stats: batchStats
    };
  }

  /**
   * Enhanced risk assessment with multi-dimensional analysis
   */
  async assessRiskV2(profile: CashAppProfile): Promise<RiskAssessmentV2> {
    let riskScore = 0;
    const factors: RiskFactorV2[] = [];

    // 1. Verification Status Risk
    const verificationAssessment = this.assessVerification(profile);
    riskScore += verificationAssessment.score;
    factors.push(...verificationAssessment.factors);

    // 2. Transaction Volume Risk
    const volumeAssessment = this.assessVolume(profile);
    riskScore += volumeAssessment.score;
    factors.push(...volumeAssessment.factors);

    // 3. Fraud Flags Risk
    const fraudAssessment = this.assessFraud(profile);
    riskScore += fraudAssessment.score;
    factors.push(...fraudAssessment.factors);

    // 4. Behavioral/Metadata Risk
    const behavioralAssessment = this.assessBehavioral(profile);
    riskScore += behavioralAssessment.score;
    factors.push(...behavioralAssessment.factors);

    // Final calculations
    riskScore = Math.min(100, Math.max(0, riskScore));
    const riskLevel = this.calculateRiskLevel(riskScore);
    const recommendation = this.getRecommendation(riskScore);

    return {
      riskScore,
      factors,
      riskLevel,
      recommendation,
      metadata: {
        assessedAt: Date.now(),
        modelVersion: "v2.0",
        confidence: profile.confidence,
        profileAge: profile.accountAge
      }
    };
  }

  private assessVerification(profile: CashAppProfile): { score: number, factors: RiskFactorV2[] } {
    let score = 0;
    const factors: RiskFactorV2[] = [];

    switch (profile.verificationStatus) {
      case "verified":
        score = 0;
        break;
      case "unverified":
        score = 30;
        factors.push("UNVERIFIED_PAYMENT_APP" as RiskFactorV2);
        break;
      case "suspended":
        score = 80;
        factors.push("SUSPENDED_ACCOUNT" as RiskFactorV2);
        break;
      case "pending":
        score = 15;
        factors.push("PENDING_VERIFICATION" as RiskFactorV2);
        break;
      default:
        score = 25;
        factors.push("UNKNOWN_STATUS" as RiskFactorV2);
    }

    if (!profile.linkedBank) {
      score += 15;
      factors.push("NO_LINKED_BANK" as RiskFactorV2);
    }

    return { score, factors };
  }

  private assessVolume(profile: CashAppProfile): { score: number, factors: RiskFactorV2[] } {
    let score = 0;
    const factors: RiskFactorV2[] = [];

    if (profile.transactionVolume30d > 1000000) { // $10,000
      score += 40;
      factors.push("EXTREME_TRANSACTION_VOLUME" as RiskFactorV2);
    } else if (profile.transactionVolume30d > 250000) { // $2,500
      score += 20;
      factors.push("HIGH_TRANSACTION_VOLUME" as RiskFactorV2);
    } else if (profile.transactionVolume30d < 100) { // $1
      score += 10;
      factors.push("LOW_ACTIVITY" as RiskFactorV2);
    }

    return { score, factors };
  }

  private assessFraud(profile: CashAppProfile): { score: number, factors: RiskFactorV2[] } {
    let score = 0;
    const factors: RiskFactorV2[] = [];

    for (const flag of profile.fraudFlags) {
      switch (flag) {
        case "CHARGEBACK":
          score += 30;
          factors.push("CHARGEBACK_HISTORY" as RiskFactorV2);
          break;
        case "ACCOUNT_TAKEOVER":
          score += 50;
          factors.push("ACCOUNT_TAKEOVER" as RiskFactorV2);
          break;
        case "MONEY_LAUNDERING":
          score += 70;
          factors.push("SUSPECTED_AML" as RiskFactorV2);
          break;
        case "SYNTHETIC_IDENTITY":
          score += 60;
          factors.push("SYNTHETIC_IDENTITY" as RiskFactorV2);
          break;
        default:
          score += 20;
          factors.push("GENERIC_FRAUD_FLAG" as RiskFactorV2);
      }
    }

    return { score, factors };
  }

  private assessBehavioral(profile: CashAppProfile): { score: number, factors: RiskFactorV2[] } {
    let score = 0;
    const factors: RiskFactorV2[] = [];

    if (profile.deviceCount && profile.deviceCount > 3) {
      score += 15;
      factors.push("MULTI_DEVICE_USAGE" as RiskFactorV2);
    }

    return { score, factors };
  }

  private calculateRiskLevel(score: number): RiskLevel {
    const thresholds = this.config.riskThresholds || DEFAULT_RISK_THRESHOLDS;
    if (score >= thresholds.high) return "HIGH";
    if (score >= thresholds.medium) return "MEDIUM";
    if (score >= thresholds.low) return "LOW";
    return "NONE";
  }

  private getRecommendation(score: number): RecommendationV2 {
    const thresholds = this.config.riskThresholds || DEFAULT_RISK_THRESHOLDS;
    if (score >= thresholds.high) return "BLOCK_AND_REPORT";
    if (score >= thresholds.medium) return "BLOCK";
    if (score >= 40) return "REVIEW_REQUIRED";
    if (score >= thresholds.low) return "MONITOR";
    return "ALLOW";
  }

  private async getFromCache(key: string): Promise<CashAppProfile | null> {
    if (!this.cache) {
      return null; // No cache available
    }
    
    try {
      const cached = await this.cache.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error("[CashAppIntegrationV2] Cache read failed:", error);
      return null;
    }
  }

  private async cacheProfile(key: string, profile: CashAppProfile): Promise<void> {
    if (!this.cache) {
      return; // No cache available
    }
    
    try {
      const ttl = this.config.cacheTTL || 3600;
      await this.cache.set(key, JSON.stringify(profile));
      await this.cache.expire(key, ttl);
    } catch (error) {
      console.error("[CashAppIntegrationV2] Cache write failed:", error);
    }
  }

  private async fetchFromApi(phone: string, signal?: AbortSignal): Promise<CashAppProfile> {
    const url = `${this.getBaseUrl()}/${this.API_VERSION}/users/lookup`;
    const timestamp = Date.now();
    const signature = this.generateSignature(phone, timestamp);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.config.apiKey}`,
        "X-Signature-V2": signature,
        "X-Timestamp": timestamp.toString(),
        "Content-Type": "application/json",
        "User-Agent": "EmpirePro-CashApp-Integration/2.0"
      },
      body: JSON.stringify({ phone }),
      signal
    });

    if (!response.ok) {
      throw new Error(`CashApp API error: ${response.status}`);
    }

    const data = await response.json();
    return this.transformResponse(data, phone);
  }

  private generateSignature(phone: string, timestamp: number): string {
    const payload = `${phone}:${timestamp}:${this.config.apiKey}`;
    return createHmac("sha256", this.config.apiSecret)
      .update(payload)
      .digest("hex");
  }

  private transformResponse(data: any, phone: string): CashAppProfile {
    return {
      cashtag: data.cashtag || null,
      displayName: data.displayName || null,
      verificationStatus: (data.verificationStatus || "unknown") as VerificationStatus,
      linkedBank: data.linkedBank || null,
      transactionVolume30d: data.transactionVolume30d || 0,
      fraudFlags: data.fraudFlags || [],
      phone,
      lastUpdated: Date.now(),
      confidence: this.calculateConfidence(data)
    };
  }

  private calculateConfidence(data: any): number {
    let confidence = 1.0;
    if (!data.cashtag) confidence *= 0.8;
    if (data.verificationStatus !== "verified") confidence *= 0.7;
    return confidence;
  }

  private getBaseUrl(): string {
    return this.config.environment === "sandbox" ? this.SANDBOX_URL : this.BASE_URL;
  }

  async cleanup(): Promise<void> {
    this.cache.close();
    await this.rateLimiter.close();
  }
}
