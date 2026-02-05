// src/patterns/cashapp-resolver.ts
import { PhoneSanitizer } from '../core/phone-sanitizer';
import { CacheManager } from '../core/cache-manager';
import { SecurityManager } from '../core/security';

export interface CashAppProfile {
  cashtag: string | null;
  displayName: string | null;
  verificationStatus: 'verified' | 'unverified' | 'pending' | 'suspended' | 'unknown';
  linkedBank: string | null;
  transactionVolume30d: number;
  fraudFlags: string[];
  phone: string;
  lastUpdated: number;
  confidence: number;
}

export enum RiskFactor {
  UNVERIFIED_PAYMENT_APP = 'UNVERIFIED_PAYMENT_APP',
  PAYMENT_APP_FRAUD_FLAGS = 'PAYMENT_APP_FRAUD_FLAGS',
  HIGH_TRANSACTION_VOLUME = 'HIGH_TRANSACTION_VOLUME',
  LOW_ACTIVITY = 'LOW_ACTIVITY',
  RECENT_SUSPENSION = 'RECENT_SUSPENSION',
  MULTIPLE_BANKS = 'MULTIPLE_BANKS'
}

export interface RiskAssessment {
  riskScore: number;
  factors: RiskFactor[];
  recommendation: 'ALLOW' | 'REVIEW' | 'BLOCK';
  confidence: number;
  assessedAt: number;
}

export class CashAppResolver {
  private sanitizer = new PhoneSanitizer();
  private cache: CacheManager;
  private security = new SecurityManager();
  private apiBase = 'https://api.cash.app/v2';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.cache = new CacheManager({
      defaultTTL: 3600000, // 1 hour
      maxMemoryEntries: 10000,
      cleanupInterval: 60000,
      enableRedis: true,
      redisUrl: process.env.REDIS_URL,
      enableR2: true,
      r2Bucket: 'empire-pro-cashapp'
    });
  }

  async resolve(phone: string): Promise<CashAppProfile | null> {
    // Sanitize phone number
    const sanitized = this.sanitizer.sanitize(phone);
    if (!sanitized.isValid) {
      console.warn(`Invalid phone number: ${phone}`);
      return null;
    }

    const cacheKey = `cashapp:${sanitized.e164}`;

    // Check cache first
    const cached = await this.cache.get<CashAppProfile>(cacheKey);
    if (cached) {
      console.log(`Cache hit for ${sanitized.e164}`);
      return cached;
    }

    console.log(`Cache miss for ${sanitized.e164}, calling API`);

    try {
      // Generate secure request signature
      const timestamp = Date.now();
      const signature = this.security.generateSignature({
        phone: sanitized.e164,
        timestamp,
        apiKey: this.apiKey
      });

      // Make API request with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 250); // 250ms timeout

      const response = await fetch(`${this.apiBase}/users/lookup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Signature': signature,
          'X-Timestamp': timestamp.toString(),
          'X-Request-ID': this.security.generateUUID(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: sanitized.e164,
          fields: [
            'cashtag',
            'display_name',
            'verification_status',
            'linked_banks',
            'transaction_volume_30d',
            'fraud_flags',
            'account_age_days',
            'kyc_status'
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === HTTP_STATUS.NOT_FOUND) {
          // User not found in Cash App
          await this.cache.set(cacheKey, null, 300000); // Cache null for 5 minutes
          return null;
        }
        
        if (response.status === 429) {
          console.warn('Rate limited by Cash App API');
          throw new Error('Rate limit exceeded');
        }

        throw new Error(`Cash App API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform and validate response
      const profile = this.transformResponse(data, sanitized.e164);
      
      // Cache the result
      await this.cache.set(cacheKey, profile, 3600000); // 1 hour TTL
      
      // Async store in R2 for persistence
      this.storeInR2(profile).catch(console.error);

      return profile;
    } catch (error) {
      console.error(`Cash App lookup failed for ${sanitized.e164}:`, error);
      
      // If it's a timeout, return cached stale data if available
      if (error.name === 'AbortError') {
        const stale = await this.cache.get<CashAppProfile>(`stale:${cacheKey}`);
        if (stale) {
          console.log(`Returning stale data for ${sanitized.e164}`);
          return stale;
        }
      }
      
      return null;
    }
  }

  private transformResponse(data: any, phone: string): CashAppProfile {
    // Extract and validate data
    const cashtag = data.cashtag ? `$${data.cashtag}` : null;
    const displayName = data.display_name || null;
    const verificationStatus = this.normalizeVerificationStatus(data.verification_status);
    
    // Calculate transaction volume (default to 0)
    const transactionVolume30d = data.transaction_volume_30d || 
      (data.recent_transactions || []).reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);
    
    // Extract fraud flags
    const fraudFlags = data.fraud_flags || 
      (data.risk_indicators || []).map((indicator: any) => indicator.type);
    
    // Calculate confidence score
    const confidence = this.calculateConfidence(data);

    return {
      cashtag,
      displayName,
      verificationStatus,
      linkedBank: data.linked_banks?.[0]?.bank_name || null,
      transactionVolume30d,
      fraudFlags,
      phone,
      lastUpdated: Date.now(),
      confidence
    };
  }

  private normalizeVerificationStatus(status: string): CashAppProfile['verificationStatus'] {
    const normalized = status?.toLowerCase() || 'unknown';
    
    if (normalized.includes('verified')) return 'verified';
    if (normalized.includes('unverified')) return 'unverified';
    if (normalized.includes('pending')) return 'pending';
    if (normalized.includes('suspended')) return 'suspended';
    
    return 'unknown';
  }

  private calculateConfidence(data: any): number {
    let confidence = 1.0;
    
    // Reduce confidence for missing critical data
    if (!data.cashtag) confidence *= 0.5;
    if (!data.verification_status) confidence *= 0.7;
    
    // Increase confidence for verified accounts
    if (data.verification_status === 'verified') confidence *= 1.2;
    
    // Reduce for fraud flags
    if (data.fraud_flags?.length > 0) {
      confidence *= Math.max(0.1, 1 - (data.fraud_flags.length * 0.3));
    }
    
    // Reduce for new accounts
    if (data.account_age_days && data.account_age_days < 30) {
      confidence *= 0.8;
    }
    
    return Math.min(Math.max(confidence, 0), 1);
  }

  async assessRisk(profile: CashAppProfile): Promise<RiskAssessment> {
    const factors: RiskFactor[] = [];
    let riskScore = 0;
    
    // 1. Verification status (40 points max)
    if (profile.verificationStatus !== 'verified') {
      riskScore += 40;
      factors.push(RiskFactor.UNVERIFIED_PAYMENT_APP);
    }
    
    // 2. Fraud flags (30 points max)
    if (profile.fraudFlags.length > 0) {
      riskScore += Math.min(30, profile.fraudFlags.length * 10);
      factors.push(RiskFactor.PAYMENT_APP_FRAUD_FLAGS);
    }
    
    // 3. Transaction volume (20 points max)
    if (profile.transactionVolume30d > 10000) {
      riskScore += 20;
      factors.push(RiskFactor.HIGH_TRANSACTION_VOLUME);
    } else if (profile.transactionVolume30d < 100) {
      riskScore += 10;
      factors.push(RiskFactor.LOW_ACTIVITY);
    }
    
    // 4. Recent suspension (10 points)
    if (profile.verificationStatus === 'suspended') {
      riskScore += 10;
      factors.push(RiskFactor.RECENT_SUSPENSION);
    }
    
    // Cap at 100
    riskScore = Math.min(riskScore, 100);
    
    // Determine recommendation
    let recommendation: RiskAssessment['recommendation'] = 'ALLOW';
    if (riskScore > 70) {
      recommendation = 'BLOCK';
    } else if (riskScore > 30) {
      recommendation = 'REVIEW';
    }
    
    return {
      riskScore,
      factors,
      recommendation,
      confidence: profile.confidence,
      assessedAt: Date.now()
    };
  }

  async batchResolve(phones: string[]): Promise<Map<string, CashAppProfile | null>> {
    const results = new Map<string, CashAppProfile | null>();
    const batchSize = 10; // Limit concurrent requests
    
    for (let i = 0; i < phones.length; i += batchSize) {
      const batch = phones.slice(i, i + batchSize);
      const batchPromises = batch.map(phone => 
        this.resolve(phone).catch(() => null)
      );
      
      const batchResults = await Promise.all(batchPromises);
      
      batch.forEach((phone, index) => {
        results.set(phone, batchResults[index]);
      });
      
      // Rate limiting delay
      if (i + batchSize < phones.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  private async storeInR2(profile: CashAppProfile): Promise<void> {
    try {
      // Implementation depends on your R2 client
      // Example with Cloudflare Workers R2
      const r2 = (globalThis as any).R2_BUCKET;
      if (r2) {
        await r2.put(
          `profiles/cashapp/${profile.phone}.json`,
          JSON.stringify(profile),
          {
            httpMetadata: {
              contentType: 'application/json'
            },
            customMetadata: {
              confidence: profile.confidence.toString(),
              lastUpdated: profile.lastUpdated.toString()
            }
          }
        );
      }
    } catch (error) {
      console.error('Failed to store in R2:', error);
    }
  }

  async getStats() {
    const cacheStats = this.cache.getStats();
    return {
      cache: cacheStats,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }
}
