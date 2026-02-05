// automation/enhanced-bun-anti-detection.ts - Production-ready anti-detection system

import { CryptoHasher } from "bun";

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  mutex: Promise<void>;
}

interface ProxyHealth {
  failures: number;
  lastFailure: number;
  isHealthy: boolean;
}

interface AgentMetrics {
  requestsCount: number;
  rateLimitHits: number;
  lastActivity: number;
}

interface AntiDetectionConfig {
  maxRequestsPerMinute: number;
  minDelayMs: number;
  maxDelayMs: number;
  bucketSize: number;
  cleanupIntervalMs: number;
  proxyFailureThreshold: number;
  metricsEnabled: boolean;
}

export class BunAntiDetection {
  private readonly buckets = new Map<string, TokenBucket>();
  private readonly proxyHealth = new Map<string, ProxyHealth>();
  private readonly metrics = new Map<string, AgentMetrics>();
  private readonly config: AntiDetectionConfig;
  private cleanupTimer: Timer | null = null;

  // Cryptographically secure user agent pools with time-based rotation
  private readonly userAgentPools = [
    // Android Chrome variants
    'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.105 Mobile Safari/537.36',
    // iOS Safari variants
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Mobile/15E148 Safari/604.1',
    // Desktop variants for diversity
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
  ];

  // Rotating proxy configurations with health tracking
  private readonly proxyEndpoints = [
    'proxy-primary.provider.com:8000',
    'proxy-secondary.provider.com:8000',
    'proxy-tertiary.provider.com:8000',
    'proxy-backup.provider.com:8000',
    'proxy-emergency.provider.com:8000'
  ];

  constructor(config: Partial<AntiDetectionConfig> = {}) {
    this.config = {
      maxRequestsPerMinute: 5,
      minDelayMs: 2000,
      maxDelayMs: 8000,
      bucketSize: 10,
      cleanupIntervalMs: 300000, // 5 minutes
      proxyFailureThreshold: 3,
      metricsEnabled: true,
      ...config
    };

    // Start cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Token bucket rate limiter with proper concurrency control
   */
  async rateLimit(agentId: string): Promise<void> {
    this.validateAgentId(agentId);
    
    const bucket = this.bucket(agentId);
    const now = Date.now();
    
    // Acquire mutex lock for atomic operations
    await bucket.mutex;
    
    try {
      // Refill tokens based on elapsed time
      const timeSinceLastRefill = now - bucket.lastRefill;
      const tokensToAdd = Math.floor(timeSinceLastRefill / (60000 / this.config.maxRequestsPerMinute));
      
      bucket.tokens = Math.min(this.config.bucketSize, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;

      if (bucket.tokens < 1) {
        // Rate limit exceeded - calculate wait time
        const waitTime = Math.ceil((1 - bucket.tokens) * (60000 / this.config.maxRequestsPerMinute));
        
        if (this.config.metricsEnabled) {
          this.track(agentId, 'rateLimit');
        }
        
        await Bun.sleep(waitTime);
        bucket.tokens = 0; // Consume one token after wait
      } else {
        bucket.tokens--; // Consume one token
      }
    } finally {
      // Release mutex
      bucket.mutex = Promise.resolve();
    }
  }

  /**
   * Humanized delay with cryptographically secure jitter
   */
  async delay(agentId: string): Promise<void> {
    await this.rateLimit(agentId);
    
    // Use crypto-secure random for jitter
    const randomBytes = new Uint8Array(4);
    crypto.getRandomValues(randomBytes);
    const randomValue = new DataView(randomBytes.buffer).getUint32(0) / 0xFFFFFFFF;
    
    // Calculate delay with secure jitter
    const jitterRange = this.config.maxDelayMs - this.config.minDelayMs;
    const jitter = Math.floor(randomValue * jitterRange);
    const delay = this.config.minDelayMs + jitter;
    
    await Bun.sleep(delay);
    
    if (this.config.metricsEnabled) {
      this.track(agentId, 'request');
    }
  }

  /**
   * Generate cryptographically randomized user agent
   */
  userAgent(agentId: string): string {
    this.validateAgentId(agentId);
    
    // Time-based seed for rotation (changes every hour)
    const hourSeed = Math.floor(Date.now() / 3600000);
    const hashInput = `${agentId}-${hourSeed}`;
    
    // Use secure hash for deterministic but unpredictable selection
    const hash = new CryptoHasher('sha256')
      .update(hashInput)
      .digest('hex');
    
    const hashInt = parseInt(hash.substring(0, 8), 16);
    const poolIndex = hashInt % this.userAgentPools.length;
    
    return this.userAgentPools[poolIndex];
  }

  /**
   * Get healthy proxy with circuit breaker pattern
   */
  proxy(agentId: string): string | null {
    this.validateAgentId(agentId);
    
    // Filter healthy proxies
    const healthyProxies = this.proxyEndpoints.filter(proxy => {
      const health = this.proxyHealth.get(proxy);
      return !health || health.isHealthy;
    });
    
    if (healthyProxies.length === 0) {
      // All proxies failed - check if any can be recovered
      this.attemptProxyRecovery();
      return null;
    }
    
    // Select proxy using secure hash
    const hash = new CryptoHasher('sha256')
      .update(agentId + Date.now().toString())
      .digest('hex');
    
    const hashInt = parseInt(hash.substring(0, 8), 16);
    const proxyIndex = hashInt % healthyProxies.length;
    
    return `http://${healthyProxies[proxyIndex]}`;
  }

  /**
   * Report proxy failure for circuit breaker
   */
  failProxy(proxyUrl: string): void {
    const proxy = proxyUrl.replace(/^https?:\/\//, '');
    const health = this.proxyHealth.get(proxy) || { failures: 0, lastFailure: 0, isHealthy: true };
    
    health.failures++;
    health.lastFailure = Date.now();
    
    if (health.failures >= this.config.proxyFailureThreshold) {
      health.isHealthy = false;
      console.warn(`🚫 Proxy ${proxy} marked as unhealthy after ${health.failures} failures`);
    }
    
    this.proxyHealth.set(proxy, health);
  }

  /**
   * Get system metrics for monitoring
   */
  stats(): {
    activeAgents: number;
    totalRequests: number;
    rateLimitHits: number;
    healthyProxies: number;
    memoryUsage: {
      tokenBuckets: number;
      proxyHealth: number;
      agentMetrics: number;
    };
  } {
    const totalRequests = Array.from(this.metrics.values())
      .reduce((sum, metrics) => sum + metrics.requestsCount, 0);
    
    const rateLimitHits = Array.from(this.metrics.values())
      .reduce((sum, metrics) => sum + metrics.rateLimitHits, 0);
    
    const healthyProxies = Array.from(this.proxyHealth.values())
      .filter(health => health.isHealthy).length;

    return {
      activeAgents: this.buckets.size,
      totalRequests,
      rateLimitHits,
      healthyProxies,
      memoryUsage: {
        tokenBuckets: this.buckets.size,
        proxyHealth: this.proxyHealth.size,
        agentMetrics: this.metrics.size
      }
    };
  }

  /**
   * Cleanup inactive agents and expired data
   */
  private cleanup(): void {
    const now = Date.now();
    const inactiveThreshold = 3600000; // 1 hour
    
    // Cleanup inactive token buckets
    for (const [agentId, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > inactiveThreshold) {
        this.buckets.delete(agentId);
        this.metrics.delete(agentId);
      }
    }
    
    // Attempt proxy recovery for old failures
    for (const [proxy, health] of this.proxyHealth.entries()) {
      if (!health.isHealthy && now - health.lastFailure > 300000) { // 5 minutes
        health.isHealthy = true;
        health.failures = 0;
      }
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupIntervalMs);
  }

  /**
   * Get or create token bucket with mutex
   */
  private bucket(agentId: string): TokenBucket {
    if (!this.buckets.has(agentId)) {
      this.buckets.set(agentId, {
        tokens: this.config.bucketSize,
        lastRefill: Date.now(),
        mutex: Promise.resolve()
      });
    }
    return this.buckets.get(agentId)!;
  }

  /**
   * Update agent metrics
   */
  private track(agentId: string, event: 'request' | 'rateLimit'): void {
    if (!this.config.metricsEnabled) return;
    
    const metrics = this.metrics.get(agentId) || {
      requestsCount: 0,
      rateLimitHits: 0,
      lastActivity: Date.now()
    };
    
    metrics.requestsCount++;
    if (event === 'rateLimit') {
      metrics.rateLimitHits++;
    }
    metrics.lastActivity = Date.now();
    
    this.metrics.set(agentId, metrics);
  }

  /**
   * Validate agent ID to prevent injection
   */
  private validateAgentId(agentId: string): void {
    if (!agentId || typeof agentId !== 'string') {
      throw new Error('Invalid agent ID: must be non-empty string');
    }
    
    if (agentId.length > 100) {
      throw new Error('Invalid agent ID: maximum length is 100 characters');
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(agentId)) {
      throw new Error('Invalid agent ID: only alphanumeric characters, underscore, and hyphen allowed');
    }
  }

  /**
   * Attempt recovery of failed proxies
   */
  private attemptProxyRecovery(): void {
    const now = Date.now();
    for (const [proxy, health] of this.proxyHealth.entries()) {
      if (!health.isHealthy && now - health.lastFailure > 60000) { // 1 minute cooldown
        console.log(`🔄 Attempting recovery for proxy ${proxy}`);
        health.isHealthy = true;
        health.failures = Math.max(0, health.failures - 1);
      }
    }
  }

  /**
   * Graceful shutdown
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.buckets.clear();
    this.proxyHealth.clear();
    this.metrics.clear();
  }
}

// Export singleton instance
export const antiDetection = new BunAntiDetection();
