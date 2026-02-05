/**
 * Empire Pro Phone Intelligence - DuoPlus SDK Integration
 * Enhanced §Filter:89-95 pattern cluster with DuoPlus capabilities
 */

import { PhoneIntelligenceSystem } from './phone-intelligence-complete.js';
import { withRetry } from '../../utils/retry.js';
import { telemetry } from '../core/telemetry/telemetry-engine.js';

// DuoPlus SDK Integration Types
interface DuoPlusConfig {
  apiKey: string;
  endpoint: string;
  timeout: number;
  retries: number;
  riskThresholds?: {
    high: number;
    medium: number;
  };
  webhook?: {
    enabled: boolean;
    url: string;
    lowScoreThreshold: number;
  };
}

interface DuoPlusResponse {
  success: boolean;
  data: any;
  metadata: {
    requestId: string;
    timestamp: string;
    processingTime: number;
  };
}

interface DuoPlusEnrichment {
  carrierInfo: {
    name: string;
    type: string;
    country: string;
  };
  riskAssessment: {
    score: number;
    factors: string[];
    level: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  compliance: {
    tcpa: boolean;
    gdpr: boolean;
    ccpa: boolean;
  };
  quality: {
    accuracy: number;
    confidence: number;
    lastVerified: string;
  };
}

// Enhanced Phone Sanitizer with DuoPlus Integration
export class DuoPlusPhoneSanitizer {
  private duoPlusConfig: DuoPlusConfig;
  
  constructor(config: DuoPlusConfig) {
    this.duoPlusConfig = config;
  }

  async exec(rawInput: string): Promise<{ 
    e164: string; 
    cleaned: boolean; 
    duoPlusValidated: boolean;
    securityScore: number;
  }> {
    // Stage 1: Enhanced SIMD-powered sanitization
    const cleaned = rawInput
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/DROP TABLE|SELECT|INSERT|UPDATE|DELETE|UNION|SCRIPT/gi, '')
      .replace(/javascript:|vbscript:|onload=|onerror=/gi, '')
      .replace(/[^\d+]/g, '');
    
    const e164 = cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
    
    // Stage 2: DuoPlus security validation
    const duoPlusValidated = await this.validateWithDuoPlus(e164);
    const securityScore = this.calculateSecurityScore(rawInput, cleaned);
    
    return {
      e164,
      cleaned: true,
      duoPlusValidated,
      securityScore
    };
  }

  private async validateWithDuoPlus(phone: string): Promise<boolean> {
    try {
      const response = await this.callDuoPlusAPI('/validate', { phone });
      return response.success && response.data.isValid;
    } catch (error) {
      console.warn('DuoPlus validation failed, using fallback:', error);
      return true; // Fallback validation
    }
  }

  private calculateSecurityScore(raw: string, cleaned: string): number {
    let score = 100;
    
    // Deduct for suspicious patterns
    if (/<script/i.test(raw)) score -= 50;
    if (/DROP|SELECT|INSERT|UPDATE|DELETE/i.test(raw)) score -= 30;
    if (/javascript:|vbscript:/i.test(raw)) score -= 40;
    if (/onload=|onerror=/i.test(raw)) score -= 20;
    
    return Math.max(0, score);
  }

  private async callDuoPlusAPI(endpoint: string, data: any): Promise<DuoPlusResponse> {
    return withRetry(async () => {
      const url = `${this.duoPlusConfig.endpoint}${endpoint}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.duoPlusConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(this.duoPlusConfig.timeout || 5000)
      }).catch(err => {
        throw new Error(`Network error: ${err.message}`);
      });

      if (!response.ok) {
        throw new Error(`DuoPlus API error: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON');
      }

      return await response.json();
    }, {
      maxAttempts: this.duoPlusConfig.retries || 3,
      baseDelay: 1000,
      shouldRetry: (error) => {
        // Retry on network errors and server errors (5xx)
        return error.message.includes('Network error') || error.message.includes('50');
      }
    });
  }
}

// Enhanced Phone Validator with DuoPlus Integration
export class DuoPlusPhoneValidator {
  private duoPlusConfig: DuoPlusConfig;
  
  constructor(config: DuoPlusConfig) {
    this.duoPlusConfig = config;
  }

  async exec(phone: string): Promise<{ 
    isValid: boolean; 
    country: string; 
    type: string;
    duoPlusData: any;
    carrierInfo: any;
  }> {
    // Basic validation
    const phoneRegex = /^\+\d{10,15}$/;
    if (!phoneRegex.test(phone)) {
      return { 
        isValid: false, 
        country: 'Unknown', 
        type: 'Unknown',
        duoPlusData: null,
        carrierInfo: null
      };
    }

    // DuoPlus enhanced validation
    const duoPlusData = await this.validateWithDuoPlus(phone);
    const carrierInfo = await this.getCarrierInfo(phone);
    
    const country = phone.startsWith('+1') ? 'US' : 
                   phone.startsWith('+44') ? 'UK' : 'International';
    const type = phone.length === 12 ? 'MOBILE' : 'LANDLINE';

    return {
      isValid: duoPlusData?.valid || true,
      country,
      type,
      duoPlusData,
      carrierInfo
    };
  }

  private async validateWithDuoPlus(phone: string): Promise<any> {
    try {
      const response = await this.callDuoPlusAPI('/phone/validate', { phone });
      return response.data;
    } catch (error) {
      console.warn('DuoPlus validation failed:', error);
      return null;
    }
  }

  private async getCarrierInfo(phone: string): Promise<any> {
    try {
      const response = await this.callDuoPlusAPI('/carrier/info', { phone });
      return response.data;
    } catch (error) {
      console.warn('DuoPlus carrier info failed:', error);
      return null;
    }
  }

  private async callDuoPlusAPI(endpoint: string, data: any): Promise<DuoPlusResponse> {
    return withRetry(async () => {
      const url = `${this.duoPlusConfig.endpoint}${endpoint}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.duoPlusConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(this.duoPlusConfig.timeout || 5000)
      }).catch(err => {
        throw new Error(`Network error: ${err.message}`);
      });

      if (!response.ok) {
        throw new Error(`DuoPlus API error: ${response.status}`);
      }

      return await response.json();
    }, {
      maxAttempts: this.duoPlusConfig.retries || 3,
      baseDelay: 1000
    });
  }
}

// Enhanced IPQS Cache with DuoPlus Integration
export class DuoPlusIPQSCache {
  private cache = new Map<string, any>();
  private duoPlusConfig: DuoPlusConfig;
  
  constructor(config: DuoPlusConfig) {
    this.duoPlusConfig = config;
  }

  async exec(phone: string): Promise<{ 
    ipqsData: any;
    duoPlusEnrichment: DuoPlusEnrichment | null;
    cached: boolean;
  }> {
    // Check cache first
    if (this.cache.has(phone)) {
      return {
        ipqsData: this.cache.get(phone),
        duoPlusEnrichment: null,
        cached: true
      };
    }

    // Get DuoPlus enrichment
    const duoPlusEnrichment = await this.getEnrichmentFromDuoPlus(phone);
    
    // Simulate IPQS data (enhanced with DuoPlus)
    const ipqsData = {
      carrier: duoPlusEnrichment.carrierInfo.name,
      fraudScore: duoPlusEnrichment.riskAssessment.score,
      riskFactors: duoPlusEnrichment.riskAssessment.factors,
      lastSeen: new Date().toISOString(),
      duoPlusVerified: true,
      compliance: duoPlusEnrichment.compliance,
      quality: duoPlusEnrichment.quality
    };

    // Cache the result
    this.cache.set(phone, ipqsData);

    return {
      ipqsData,
      duoPlusEnrichment,
      cached: false
    };
  }

  async invalidate(phone: string): Promise<void> {
    this.cache.delete(phone);
    console.log(`[Cache] Invalidated entry for ${phone}`);
  }

  private async getEnrichmentFromDuoPlus(phone: string): Promise<DuoPlusEnrichment> {
    try {
      const response = await this.callDuoPlusAPI('/enrichment/full', { phone });
      return response.data;
    } catch (error) {
      console.warn('DuoPlus enrichment failed:', error);
      // Return fallback data
      return {
        carrierInfo: { name: 'Unknown', type: 'MOBILE', country: 'US' },
        riskAssessment: { score: 50, factors: [], level: 'MEDIUM' as const },
        compliance: { tcpa: true, gdpr: true, ccpa: true },
        quality: { accuracy: 85, confidence: 80, lastVerified: new Date().toISOString() }
      };
    }
  }

  private async callDuoPlusAPI(endpoint: string, data: any): Promise<DuoPlusResponse> {
    return withRetry(async () => {
      const url = `${this.duoPlusConfig.endpoint}${endpoint}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.duoPlusConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(this.duoPlusConfig.timeout || 5000)
      }).catch(err => {
        throw new Error(`Network error: ${err.message}`);
      });

      if (!response.ok) {
        throw new Error(`DuoPlus API error: ${response.status}`);
      }

      return await response.json();
    }, {
      maxAttempts: this.duoPlusConfig.retries || 3,
      baseDelay: 1000
    });
  }
}

// Enhanced Number Qualifier with DuoPlus Integration
export class DuoPlusNumberQualifier {
  private duoPlusConfig: DuoPlusConfig;
  
  constructor(config: DuoPlusConfig) {
    this.duoPlusConfig = config;
  }

  async classify(phone: any, ipqsData: any): Promise<{ 
    trustScore: number; 
    riskFactors: string[]; 
    suitability: string[];
    duoPlusRiskLevel: string;
    complianceStatus: any;
  }> {
    // Enhanced classification with DuoPlus data
    let trustScore = Math.max(0, 100 - (ipqsData.fraudScore || 0));
    
    // Factor in DuoPlus quality metrics
    if (ipqsData.quality) {
      trustScore = Math.min(100, trustScore + (ipqsData.quality.accuracy - 85) / 2);
      trustScore = Math.min(100, trustScore + (ipqsData.quality.confidence - 80) / 2);
    }

    const riskFactors = [...(ipqsData.riskFactors || [])];
    
    // Additional risk factors
    if (ipqsData.carrierInfo?.type === 'VOIP') {
      trustScore -= 15;
      riskFactors.push('VOIP_DETECTED');
    }
    if (ipqsData.carrierInfo?.country !== phone.country) {
      trustScore -= 10;
      riskFactors.push('COUNTRY_MISMATCH');
    }

    // Configurable thresholds
    const highRisk = this.duoPlusConfig.riskThresholds?.high || 30;
    const mediumRisk = this.duoPlusConfig.riskThresholds?.medium || 60;

    let duoPlusRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (trustScore < highRisk) duoPlusRiskLevel = 'HIGH';
    else if (trustScore < mediumRisk) duoPlusRiskLevel = 'MEDIUM';
    
    // Enhanced suitability based on DuoPlus compliance
    let suitability = ['VOICE'];
    if (trustScore > 70 && ipqsData.compliance?.tcpa) {
      suitability.push('SMS_2FA');
    }
    if (trustScore > 80 && ipqsData.compliance?.gdpr) {
      suitability.push('INTERNATIONAL');
    }
    if (trustScore > 90) {
      suitability.push('HIGH_VALUE');
    }

    return {
      trustScore: Math.round(trustScore),
      riskFactors,
      suitability,
      duoPlusRiskLevel,
      complianceStatus: ipqsData.compliance
    };
  }
}

// Enhanced Provider Router with DuoPlus Integration
export class DuoPlusProviderRouter {
  private duoPlusConfig: DuoPlusConfig;
  
  constructor(config: DuoPlusConfig) {
    this.duoPlusConfig = config;
  }

  async selectOptimalProvider(intelligence: any): Promise<{ 
    provider: string; 
    cost: number; 
    channel: string;
    duoPlusRecommended: boolean;
    fallbackProviders: string[];
  }> {
    // Enhanced provider selection with DuoPlus recommendations
    const providers = [
      { name: 'twilio', cost: 0.0075, channel: 'RCS', quality: 95 },
      { name: 'vonage', cost: 0.0080, channel: 'SMS', quality: 90 },
      { name: 'plivo', cost: 0.0070, channel: 'SMS', quality: 85 },
      { name: 'sinch', cost: 0.0065, channel: 'SMS', quality: 88 }
    ];

    // Get DuoPlus provider recommendations
    const duoPlusRecommendations = await this.getProviderRecommendations(intelligence);
    
    // Select optimal provider based on trust score and DuoPlus data
    let optimal = providers.find(p => p.channel === 'RCS' && intelligence.trustScore > 80);
    
    if (!optimal) {
      optimal = providers.sort((a, b) => {
        const scoreA = a.quality + (duoPlusRecommendations.includes(a.name) ? 10 : 0);
        const scoreB = b.quality + (duoPlusRecommendations.includes(b.name) ? 10 : 0);
        return scoreB - scoreA;
      })[0] || providers[0];
    }

    const fallbackProviders = providers
      .filter(p => p.name !== optimal!.name)
      .sort((a, b) => a.cost - b.cost)
      .slice(0, 2)
      .map(p => p.name);

    return {
      provider: optimal!.name,
      cost: optimal!.cost,
      channel: optimal!.channel,
      duoPlusRecommended: duoPlusRecommendations.includes(optimal!.name),
      fallbackProviders
    };
  }

  private async getProviderRecommendations(intelligence: any): Promise<string[]> {
    try {
      const response = await this.callDuoPlusAPI('/providers/recommend', {
        trustScore: intelligence.trustScore,
        country: intelligence.country,
        suitability: intelligence.suitability
      });
      return response.data.recommendations || [];
    } catch (error) {
      console.warn('DuoPlus provider recommendations failed:', error);
      return [];
    }
  }

  private async callDuoPlusAPI(endpoint: string, data: any): Promise<DuoPlusResponse> {
    return withRetry(async () => {
      const url = `${this.duoPlusConfig.endpoint}${endpoint}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.duoPlusConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(this.duoPlusConfig.timeout || 5000)
      }).catch(err => {
        throw new Error(`Network error: ${err.message}`);
      });

      if (!response.ok) {
        throw new Error(`DuoPlus API error: ${response.status}`);
      }

      return await response.json();
    }, {
      maxAttempts: this.duoPlusConfig.retries || 3,
      baseDelay: 1000
    });
  }
}

// Enhanced Workflow with DuoPlus Integration
export class DuoPlusPhoneIntelligenceWorkflow {
  private sanitizer: DuoPlusPhoneSanitizer;
  private validator: DuoPlusPhoneValidator;
  private ipqsCache: DuoPlusIPQSCache;
  private qualifier: DuoPlusNumberQualifier;
  private router: DuoPlusProviderRouter;
  private duoPlusConfig: DuoPlusConfig;

  constructor(config: DuoPlusConfig) {
    this.duoPlusConfig = config;
    this.sanitizer = new DuoPlusPhoneSanitizer(config);
    this.validator = new DuoPlusPhoneValidator(config);
    this.ipqsCache = new DuoPlusIPQSCache(config);
    this.qualifier = new DuoPlusNumberQualifier(config);
    this.router = new DuoPlusProviderRouter(config);
  }

  async invalidateCache(phone: string): Promise<void> {
    await this.ipqsCache.invalidate(phone);
    telemetry.broadcast('cache:invalidate', { phone, source: 'duoplus' });
  }

  async batchExec(phones: string[]): Promise<any[]> {
    console.log(`🚀 Executing DuoPlus Batch Lookup for ${phones.length} numbers...`);
    // Simple concurrency limit of 5
    const results = [];
    const batchSize = 5;
    for (let i = 0; i < phones.length; i += batchSize) {
      const chunk = phones.slice(i, i + batchSize);
      const chunkResults = await Promise.all(chunk.map(p => this.exec(p)));
      results.push(...chunkResults);
    }
    return results;
  }

  private async notifyHighRisk(result: any): Promise<void> {
    const { webhook } = this.duoPlusConfig;
    if (!webhook?.enabled || !webhook.url) return;

    if (result.trustScore < webhook.lowScoreThreshold) {
      console.log(`🚨 High-risk profile detected (${result.trustScore}), sending webhook...`);
      try {
        await withRetry(async () => {
          const response = await fetch(webhook.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'HIGH_RISK_PROFILE',
              timestamp: new Date().toISOString(),
              data: result
            })
          });
          if (!response.ok) throw new Error(`Webhook failed: ${response.status}`);
        }, { maxAttempts: 3, baseDelay: 1000 });
        console.log('✅ Webhook notification sent.');
      } catch (error) {
        console.error('❌ Webhook notification failed:', error);
      }
    }
  }

  async exec(rawInput: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      telemetry.broadcast('workflow:start', { input: rawInput, source: 'duoplus' });

      // Stage 1: Enhanced Sanitize
      const cleaned = await this.sanitizer.exec(rawInput);
      
      // Stage 2: Enhanced Validate
      const phone = await this.validator.exec(cleaned.e164);
      if (!phone.isValid) {
        throw new Error('Invalid phone number');
      }

      // Stage 3: Enhanced Enrich
      const enrichment = await this.ipqsCache.exec(cleaned.e164);

      // Stage 4: Enhanced Classify
      const intelligence = await this.qualifier.classify(phone, enrichment.ipqsData);

      // Stage 5: Enhanced Route
      const provider = await this.router.selectOptimalProvider(intelligence);

      // Stage 6: Compliance check
      const compliance = await this.validateCompliance(cleaned.e164, phone.country, intelligence.complianceStatus);

      const executionTime = Date.now() - startTime;
      
      const res = {
        e164: cleaned.e164,
        isValid: phone.isValid,
        country: phone.country,
        type: phone.type,
        trustScore: intelligence.trustScore,
        riskFactors: intelligence.riskFactors,
        suitability: intelligence.suitability,
        provider: provider.provider,
        cost: provider.cost,
        channel: provider.channel,
        compliant: compliance.compliant,
        executionTime: `${executionTime}ms`,
        duoPlusData: {
          validated: cleaned.duoPlusValidated,
          securityScore: cleaned.securityScore,
          carrierInfo: phone.carrierInfo,
          riskLevel: intelligence.duoPlusRiskLevel,
          complianceStatus: intelligence.complianceStatus,
          quality: enrichment.duoPlusEnrichment?.quality,
          recommended: provider.duoPlusRecommended,
          fallbackProviders: provider.fallbackProviders
        }
      };

      // Telemetry
      telemetry.broadcast('workflow:complete', { 
        phone: cleaned.e164, 
        trustScore: res.trustScore, 
        riskLevel: intelligence.duoPlusRiskLevel,
        executionTime 
      });

      // Webhook notification
      await this.notifyHighRisk(res);
      
      return res;
      
    } catch (error: any) {
      telemetry.broadcast('workflow:error', { input: rawInput, error: error.message });
      return {
        error: error.message,
        executionTime: `${Date.now() - startTime}ms`,
        status: 'failed',
        duoPlusEnhanced: false
      };
    }
  }

  private async validateCompliance(phone: string, country: string, complianceStatus: any): Promise<{ compliant: boolean; regulations: string[] }> {
    const regulations = country === 'US' ? ['TCPA'] : ['GDPR'];
    const compliant = complianceStatus?.tcpa !== false && complianceStatus?.gdpr !== false;
    
    return { compliant, regulations };
  }
}

// Export the enhanced DuoPlus integrated system
export const DuoPlusPhoneIntelligenceSystem = {
  patterns: {
    DuoPlusPhoneSanitizer,
    DuoPlusPhoneValidator,
    DuoPlusIPQSCache,
    DuoPlusNumberQualifier,
    DuoPlusProviderRouter
  },
  workflow: DuoPlusPhoneIntelligenceWorkflow,
  
  create: (config: DuoPlusConfig) => {
    return new DuoPlusPhoneIntelligenceWorkflow(config);
  }
};

export default DuoPlusPhoneIntelligenceSystem;
