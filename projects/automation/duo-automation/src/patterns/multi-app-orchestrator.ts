import { PhoneSanitizer } from '../filters/phone-sanitizer-v2.js';
import { CacheManager } from '../core/cache-manager';
import { CashAppResolver, CashAppProfile, RiskAssessment } from './cashapp-resolver';
import { FactoryWagerOrchestrator, FactoryWagerDevice } from './factory-wager-orchestrator';
import { OurAppEnricher, OurAppProfile } from './our-app-enricher';

export interface UnifiedProfile {
  phone: string;
  trustScore: number; // 0-1000
  sources: {
    phone: any; // Phone intelligence result
    cashApp: CashAppProfile | null;
    duoPlus: FactoryWagerDevice | null;
    ourApp: OurAppProfile | null;
  };
  crossValidation: CrossValidationResult;
  verified: boolean;
  lastUpdated: number;
  metadata?: Record<string, any>;
}

export interface CrossValidationResult {
  consistency: number; // 0-1
  conflicts: string[];
  validatedAt: number;
  details: {
    nameMatch?: boolean;
    deviceMatch?: boolean;
    transactionConsistency?: boolean;
    accountAgeAlignment?: boolean;
  };
}

export interface PlatformScores {
  phone: number; // Phone intelligence trust score
  cashApp: number; // Risk score (inverted)
  duoPlus: number; // Device trust score
  ourApp: number; // Internal risk score (inverted)
}

export class MultiAppOrchestrator {
  private sanitizer = new PhoneSanitizer();
  private cache: CacheManager;
  private cashApp: CashAppResolver;
  private duoPlus: FactoryWagerOrchestrator;
  private ourApp: OurAppEnricher;

  constructor(
    cashAppApiKey: string,
    factory-wagerOptions: {
      factory-wagerPath: string;
      r2Bucket: string;
      screenshotDir: string;
    },
    ourAppApiKey: string
  ) {
    this.cache = new CacheManager({
      defaultTTL: 300000, // 5 minutes
      maxMemoryEntries: 5000,
      cleanupInterval: 60000,
      enableRedis: true,
      enableR2: true,
      r2Bucket: 'empire-pro-unified'
    });

    this.cashApp = new CashAppResolver(cashAppApiKey);
    this.duoPlus = new FactoryWagerOrchestrator({
      ...factory-wagerOptions,
      maxConcurrentScreenshots: 5,
      screenshotTimeout: 10000,
      enableR2: true
    });
    this.ourApp = new OurAppEnricher(ourAppApiKey);
  }

  async getUnifiedProfile(phone: string): Promise<UnifiedProfile> {
    const sanitized = this.sanitizer.sanitize(phone);
    if (!sanitized.isValid) {
      throw new Error(`Invalid phone number: ${phone}`);
    }

    const cacheKey = `unified:${sanitized.e164}`;

    // Check cache first
    const cached = await this.cache.get<UnifiedProfile>(cacheKey);
    if (cached) {
      console.log(`Cache hit for unified profile: ${sanitized.e164}`);
      return cached;
    }

    console.log(`Building unified profile for: ${sanitized.e164}`);

    try {
      // Execute all integrations in parallel with timeout
      const [
        phoneIntel,
        cashAppProfile,
        duoPlusDevice,
        ourAppProfile
      ] = await Promise.all([
        this.getPhoneIntelligence(sanitized.e164).catch(() => null),
        this.cashApp.resolve(sanitized.e164).catch(() => null),
        this.duoPlus.getDeviceInfo(sanitized.e164).catch(() => null),
        this.ourApp.getUserProfile(sanitized.e164).catch(() => null)
      ]);

      // Cross-reference and validate
      const crossValidation = this.crossValidate({
        phone: phoneIntel,
        cashApp: cashAppProfile,
        duoPlus: duoPlusDevice,
        ourApp: ourAppProfile
      });

      // Calculate unified trust score
      const trustScore = this.calculateUnifiedTrustScore({
        phone: phoneIntel?.trustScore || 500,
        cashApp: cashAppProfile ? await this.getCashAppRiskScore(cashAppProfile) : 500,
        duoPlus: duoPlusDevice ? this.getFactoryWagerTrustScore(duoPlusDevice) : 500,
        ourApp: ourAppProfile?.internalRiskScore || 500
      });

      // Build unified profile
      const unifiedProfile: UnifiedProfile = {
        phone: sanitized.e164,
        trustScore,
        sources: {
          phone: phoneIntel,
          cashApp: cashAppProfile,
          duoPlus: duoPlusDevice,
          ourApp: ourAppProfile
        },
        crossValidation,
        verified: this.isVerified(crossValidation, trustScore),
        lastUpdated: Date.now(),
        metadata: {
          country: sanitized.country,
          countryCode: sanitized.countryCode,
          confidence: this.calculateConfidence(crossValidation)
        }
      };

      // Cache the result
      await this.cache.set(cacheKey, unifiedProfile, 300000);

      // Store in R2 for persistence
      this.storeInR2(unifiedProfile).catch(console.error);

      return unifiedProfile;
    } catch (error) {
      console.error(`Failed to build unified profile for ${sanitized.e164}:`, error);
      
      // Return partial profile if possible
      return {
        phone: sanitized.e164,
        trustScore: 0,
        sources: {
          phone: null,
          cashApp: null,
          duoPlus: null,
          ourApp: null
        },
        crossValidation: {
          consistency: 0,
          conflicts: ['Failed to build unified profile'],
          validatedAt: Date.now(),
          details: {}
        },
        verified: false,
        lastUpdated: Date.now()
      };
    }
  }

  private async getPhoneIntelligence(phone: string): Promise<any> {
    // Placeholder for phone intelligence system
    // In production, this would call your phone intelligence API
    return {
      trustScore: Math.floor(Math.random() * 1000),
      riskLevel: 'LOW',
      carrier: 'Unknown',
      lineType: 'MOBILE',
      reputation: 'NEUTRAL',
      lastUpdated: Date.now()
    };
  }

  private async getCashAppRiskScore(profile: CashAppProfile): Promise<number> {
    const riskAssessment = await this.cashApp.assessRisk(profile);
    // Convert risk score (0-100) to trust score (0-1000, inverted)
    return 1000 - (riskAssessment.riskScore * 10);
  }

  private getFactoryWagerTrustScore(device: FactoryWagerDevice): number {
    let score = 500; // Base score
    
    // Adjust based on device security
    if (device.security.isJailbroken) score -= 300;
    if (device.security.hasSecuritySoftware) score += 100;
    if (device.security.biometricEnabled) score += 50;
    if (device.isVerified) score += 200;
    
    return Math.max(0, Math.min(1000, score));
  }

  private crossValidate(data: {
    phone: any;
    cashApp: CashAppProfile | null;
    duoPlus: FactoryWagerDevice | null;
    ourApp: OurAppProfile | null;
  }): CrossValidationResult {
    const conflicts: string[] = [];
    let consistency = 1.0;
    const details: CrossValidationResult['details'] = {};

    // Check name consistency
    const names = [
      data.phone?.carrier,
      data.cashApp?.displayName,
      data.ourApp?.name
    ].filter(Boolean);

    if (names.length > 0) {
      const uniqueNames = new Set(names.map(name => name?.toLowerCase()));
      if (uniqueNames.size > 2) {
        conflicts.push('Name inconsistency across platforms');
        consistency -= 0.3;
      }
      details.nameMatch = uniqueNames.size <= 2;
    }

    // Check account age consistency
    const accountAges: number[] = [];
    if (data.cashApp) {
      // Estimate Cash App account age from profile data
      accountAges.push(365); // Placeholder
    }
    if (data.ourApp) {
      const ageInDays = (Date.now() - data.ourApp.signupDate) / (1000 * 60 * 60 * 24);
      accountAges.push(ageInDays);
    }

    if (accountAges.length >= 2) {
      const maxAge = Math.max(...accountAges);
      const minAge = Math.min(...accountAges);
      const ageRatio = minAge / maxAge;

      if (ageRatio < 0.5) {
        conflicts.push('Significant account age discrepancy');
        consistency -= 0.2;
      }
      details.accountAgeAlignment = ageRatio >= 0.5;
    }

    // Check device consistency
    if (data.duoPlus && data.ourApp) {
      // Compare device info with our app's known devices
      details.deviceMatch = true; // Placeholder
    }

    // Ensure consistency is between 0 and 1
    consistency = Math.max(0, Math.min(1, consistency));

    return {
      consistency,
      conflicts,
      validatedAt: Date.now(),
      details
    };
  }

  private calculateUnifiedTrustScore(scores: PlatformScores): number {
    // Weighted average based on confidence in each source
    const weights = {
      phone: 0.4,    // Phone intelligence is most reliable
      cashApp: 0.3,  // Cash App provides strong financial signals
      duoPlus: 0.2,  // Device info provides technical signals
      ourApp: 0.1    // Internal data provides context
    };

    const weightedScore = 
      scores.phone * weights.phone +
      scores.cashApp * weights.cashApp +
      scores.duoPlus * weights.duoPlus +
      scores.ourApp * weights.ourApp;

    return Math.round(weightedScore);
  }

  private isVerified(crossValidation: CrossValidationResult, trustScore: number): boolean {
    // Consider verified if high consistency and good trust score
    return crossValidation.consistency > 0.8 && trustScore > 700;
  }

  private calculateConfidence(crossValidation: CrossValidationResult): number {
    // Confidence based on cross-validation consistency and conflict count
    let confidence = crossValidation.consistency;
    
    // Reduce confidence for each conflict
    confidence *= Math.max(0.1, 1 - (crossValidation.conflicts.length * 0.2));
    
    return confidence;
  }

  async batchGetUnifiedProfiles(phones: string[]): Promise<Map<string, UnifiedProfile>> {
    const results = new Map<string, UnifiedProfile>();
    const batchSize = 5; // Limit concurrent unified profile builds
    
    for (let i = 0; i < phones.length; i += batchSize) {
      const batch = phones.slice(i, i + batchSize);
      const batchPromises = batch.map(phone => 
        this.getUnifiedProfile(phone).catch(error => {
          console.error(`Failed to get unified profile for ${phone}:`, error);
          return null;
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      
      batch.forEach((phone, index) => {
        const result = batchResults[index];
        if (result) {
          results.set(phone, result);
        }
      });
      
      // Rate limiting delay
      if (i + batchSize < phones.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    return results;
  }

  async assessRisk(phone: string): Promise<{
    riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMAL';
    factors: string[];
    recommendations: string[];
    confidence: number;
  }> {
    const profile = await this.getUnifiedProfile(phone);
    
    const factors: string[] = [];
    const recommendations: string[] = [];
    
    // Analyze risk factors
    if (profile.trustScore < 300) {
      factors.push('Low unified trust score');
      recommendations.push('Require additional verification');
    }
    
    if (profile.crossValidation.consistency < 0.5) {
      factors.push('Low cross-validation consistency');
      recommendations.push('Review identity documents');
    }
    
    if (profile.sources.cashApp?.fraudFlags?.length > 0) {
      factors.push('Cash App fraud flags detected');
      recommendations.push('Block high-value transactions');
    }
    
    if (profile.sources.duoPlus?.security.isJailbroken) {
      factors.push('Device is jailbroken');
      recommendations.push('Require device security check');
    }
    
    // Determine risk level
    let riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMAL' = 'MINIMAL';
    
    if (profile.trustScore < 200 || factors.length >= 3) {
      riskLevel = 'CRITICAL';
    } else if (profile.trustScore < 400 || factors.length >= 2) {
      riskLevel = 'HIGH';
    } else if (profile.trustScore < 600 || factors.length >= 1) {
      riskLevel = 'MEDIUM';
    } else if (profile.trustScore < 800) {
      riskLevel = 'LOW';
    }
    
    return {
      riskLevel,
      factors,
      recommendations,
      confidence: profile.crossValidation.consistency
    };
  }

  private async storeInR2(profile: UnifiedProfile): Promise<void> {
    try {
      const r2 = (globalThis as any).R2_BUCKET;
      if (r2) {
        await r2.put(
          `unified/${profile.phone}.json`,
          JSON.stringify(profile),
          {
            httpMetadata: {
              contentType: 'application/json'
            },
            customMetadata: {
              trustScore: profile.trustScore.toString(),
              verified: profile.verified.toString(),
              confidence: profile.crossValidation.consistency.toString()
            }
          }
        );
      }
    } catch (error) {
      console.error('Failed to store unified profile in R2:', error);
    }
  }

  async getStats() {
    const cacheStats = this.cache.getStats();
    
    return {
      cache: cacheStats,
      cashApp: await this.cashApp.getStats(),
      profilesBuilt: cacheStats.memorySize,
      hitRate: cacheStats.hitRate
    };
  }
}
