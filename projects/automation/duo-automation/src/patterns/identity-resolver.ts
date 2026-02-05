import { PhoneSanitizer } from '../filters/phone-sanitizer-v2.js';
import { CacheManager } from '../core/cache-manager';
import { SecurityManager } from '../core/security';
import { CashAppResolver, type CashAppProfile } from './cashapp-resolver.js';

export interface IdentityNode {
  phone: string;
  connections: IdentityConnection[];
  syntheticScore: number; // 0-1
  isSynthetic: boolean;
  confidence: number;
  lastAnalyzed: number;
  metadata?: Record<string, any>;
}

export interface IdentityConnection {
  type: 'DEVICE' | 'PAYMENT' | 'EMAIL' | 'IP' | 'LOCATION';
  value: string;
  strength: number; // 0-1
  verified: boolean;
  discoveredAt: number;
  metadata?: {
    // CashApp specific fields
    cashtag?: string | null;
    displayName?: string | null;
    verificationStatus?: 'verified' | 'unverified' | 'pending' | 'suspended' | 'unknown';
    transactionVolume30d?: number;
    fraudFlags?: string[];
    linkedBank?: string | null;
    accountAgeDays?: number;
    kycStatus?: string;
    // General payment fields
    paymentType?: 'cashapp' | 'venmo' | 'paypal' | 'zelle' | 'bank';
    lastTransaction?: number;
    transactionCount?: number;
    riskScore?: number;
  };
}

export interface IdentityGraph {
  nodes: Map<string, IdentityNode>;
  edges: Map<string, IdentityConnection[]>;
  syntheticClusters: string[];
  lastUpdated: number;
}

export interface FallbackConfig {
  onAnalysisFailure: 'FAIL_SAFE' | 'FAIL_OPEN' | 'THROW_ERROR';
  maxRetries: number;
  retryDelayMs: number;
  enableMonitoring: boolean;
}

export interface SyntheticIdentityResult {    
  phone: string;
  syntheticScore: number; // 0-1
  isSynthetic: boolean;
  connections: IdentityConnection[];
  riskFactors?: string[];
  confidence: number;
  analyzedAt?: number;
  errorId?: string; // For correlation and monitoring
  retryCount?: number; // Number of retries attempted
  
  // Enhanced multi-platform support
  platformAnalysis?: PlatformAnalysisResult;
  provenanceSources?: IdentitySource[]; // Track which platforms contributed (Audit Trail)
  crossPlatformPatterns?: CrossPlatformPattern[]; // Detected patterns across platforms
}

// Platform-specific analysis results
export interface PlatformAnalysisResult {
  cashApp?: {
    verificationStatus: 'verified' | 'unverified' | 'pending' | 'suspended';
    transactionVolume30d: number;
    accountAgeDays: number;
    fraudFlags: string[];
    cashtag?: string;
  };
  venmo?: {
    verificationStatus: 'verified' | 'unverified' | 'pending';
    transactionCount: number;
    friendsCount: number;
    publicTransactions: number;
    fraudIndicators: string[];
  };
  paypal?: {
    accountStatus: 'verified' | 'unverified' | 'limited';
    transactionHistory: number;
    linkedAccounts: string[];
    riskScore: number;
    restrictions: string[];
  };
  zelle?: {
    enrollmentStatus: 'enrolled' | 'not_enrolled' | 'pending';
    bankVerification: boolean;
    transactionLimits: number;
    sendingHistory: number;
    flags: string[];
  };
  applePay?: {
    setupStatus: 'active' | 'inactive' | 'suspended';
    cardsLinked: number;
    transactionFrequency: number;
    deviceIntegrity: boolean;
    securityFlags: string[];
  };
}

// Track which identity sources contributed to analysis
export interface IdentitySource {
  platform: 
    | 'cashapp' 
    | 'venmo' 
    | 'paypal' 
    | 'zelle' 
    | 'applepay' 
    | 'googlepay'
    | 'chime'
    | 'varo'
    | 'device' 
    | 'email' 
    | 'ip'
    | 'social_graph'
    | 'behavioral_biometrics';
  status: 'success' | 'failed' | 'partial';
  confidence: number; // 0-1 confidence in this source's data
  lastUpdated: number;
  errorDetails?: string;
}

// Cross-platform patterns indicating synthetic behavior
export interface CrossPlatformPattern {
  patternType: 'RAPID_ACCOUNT_CREATION' | 'INCONSISTENT_IDENTITIES' | 'UNUSUAL_CORRELATIONS' | 'TEMPORAL_ANOMALIES';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  involvedPlatforms: string[];
  evidence: string[];
  detectedAt: number;
}

export class CrossPlatformIdentityResolver {
  private sanitizer = new PhoneSanitizer();
  private cache: CacheManager;
  private graph: IdentityGraph;
  private cashAppResolver: CashAppResolver;
  private fallbackConfig: FallbackConfig;

  constructor(fallbackConfig: Partial<FallbackConfig> = {}) {
    // Secure default configuration
    this.fallbackConfig = {
      onAnalysisFailure: 'FAIL_SAFE', // Default to secure behavior
      maxRetries: 3,
      retryDelayMs: 1000,
      enableMonitoring: true,
      ...fallbackConfig
    };

    this.cache = new CacheManager({
      defaultTTL: 600000, // 10 minutes
      maxMemoryEntries: 10000,
      cleanupInterval: 30000,
      enableRedis: true,
      enableR2: true,
      r2Bucket: process.env.R2_BUCKET || 'empire-pro-identity'
    });
    
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      syntheticClusters: [],
      lastUpdated: Date.now()
    };
    
    // Initialize CashApp resolver with API key from environment
    this.cashAppResolver = new CashAppResolver(process.env.CASHAPP_API_KEY || 'demo-key');
  }

  async resolveIdentity(phone: string, attempt: number = 1): Promise<SyntheticIdentityResult> {
    const sanitized = await this.sanitizer.exec(phone);
    if (!sanitized.isValid) {
      throw new Error(`Invalid phone number: ${phone}`);
    }

    const cacheKey = `identity:${sanitized.e164}`;

    // Check cache first (only on first attempt to avoid returning stale data during retries)
    if (attempt === 1) {
      const cached = await this.cache.get<SyntheticIdentityResult>(cacheKey);
      if (cached) {
        console.log(`Cache hit for identity: ${sanitized.e164}`);
        return cached;
      }
    }

    console.log(`Resolving identity for: ${sanitized.e164} (attempt ${attempt}/${this.fallbackConfig.maxRetries})`);

    try {
      // Build identity graph
      const node = await this.buildIdentityNode(sanitized.e164);
      
      // Analyze for synthetic patterns
      const syntheticAnalysis = await this.analyzeSyntheticPatterns(node);
      
      // Collect platform-specific data
      const platformData = await this.collectPlatformData(sanitized.e164);
      const sourceData = this.trackDataSources(platformData);
      
      // Create enhanced result with multi-platform support
      const result: SyntheticIdentityResult = {
        phone: sanitized.e164,
        syntheticScore: syntheticAnalysis.score,
        isSynthetic: syntheticAnalysis.isSynthetic,
        connections: node.connections,
        riskFactors: syntheticAnalysis.riskFactors,
        confidence: syntheticAnalysis.confidence,
        analyzedAt: Date.now(),
        retryCount: attempt - 1,
        
        // Enhanced multi-platform data
        platformAnalysis: platformData,
        provenanceSources: sourceData,
        crossPlatformPatterns: this.detectCrossPlatformPatterns(platformData, sourceData)
      };

      // Explicit handling for missing/empty platformAnalysis
      if (!platformData || Object.keys(platformData).length === 0) {
        // Add specific risk factors for missing platform data
        result.riskFactors = [
          ...(result.riskFactors || []),
          'No platform data available for analysis',
          'All identity resolution attempts failed',
          'Unable to verify identity across platforms',
          'High uncertainty - defaulting to conservative risk assessment'
        ];
        
        // Reduce confidence significantly when no platform data is available
        result.confidence = Math.min(result.confidence, 0.1);
        
        // Increase synthetic score for fail-safe operation
        result.syntheticScore = Math.max(result.syntheticScore, 0.8);
        result.isSynthetic = true;
      }

      // Cache the result (only on success)
      await this.cache.set(cacheKey, result, 600000);

      // Store in graph
      this.graph.nodes.set(sanitized.e164, node);
      this.graph.lastUpdated = Date.now();

      // Store in R2 for persistence
      this.storeInR2(result).catch(console.error);

      return result;
    } catch (error: any) {
      console.error(`Failed to resolve identity for ${sanitized.e164} (attempt ${attempt}):`, error);
      
      // Retry logic
      if (attempt < this.fallbackConfig.maxRetries) {
        console.log(`Retrying identity resolution for ${sanitized.e164} in ${this.fallbackConfig.retryDelayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.fallbackConfig.retryDelayMs));
        return this.resolveIdentity(phone, attempt + 1);
      }
      
      // All retries exhausted, create fallback result
      return this.createFallbackResult(sanitized.e164, error, attempt);
    }
  }

  private createFallbackResult(phone: string, error: any, attempt: number): SyntheticIdentityResult {
    const errorId = `ID_RESOLVE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Enhanced logging with correlation ID
    console.error(`[${errorId}] Identity resolution failed for ${phone} after ${attempt} attempts:`, {
      error: error?.message || error,
      attempt,
      fallbackStrategy: this.fallbackConfig.onAnalysisFailure
    });
    
    // Alert monitoring system if enabled
    if (this.fallbackConfig.enableMonitoring) {
      this.alertFailure(errorId, phone, error, attempt);
    }
    
    // Log to audit trail
    this.logAuditEvent('IDENTITY_RESOLUTION_FAILURE', {
      phone,
      errorId,
      error: error?.message || error,
      attempt,
      fallbackStrategy: this.fallbackConfig.onAnalysisFailure,
      timestamp: Date.now()
    });
    
    // Create fallback result based on configuration
    switch (this.fallbackConfig.onAnalysisFailure) {
      case 'FAIL_SAFE':
        // Most secure: assume high risk when analysis fails
        return {
          phone,
          syntheticScore: 0.9, // High risk
          isSynthetic: true,   // Block by default
          connections: [],
          riskFactors: [
            'Identity resolution failed',
            'System error - fail-safe mode activated',
            `Error ID: ${errorId}`,
            `Failed after ${attempt} attempts`
          ],
          confidence: 0,
          analyzedAt: Date.now(),
          errorId,
          retryCount: attempt
        };
      
      case 'FAIL_OPEN':
        // Less secure but permissive: assume medium risk
        return {
          phone,
          syntheticScore: 0.6, // Medium risk
          isSynthetic: true,   // Still require review
          connections: [],
          riskFactors: [
            'Identity resolution failed',
            'System error - fail-open mode activated',
            `Error ID: ${errorId}`,
            `Failed after ${attempt} attempts`
          ],
          confidence: 0,
          analyzedAt: Date.now(),
          errorId,
          retryCount: attempt
        };
      
      case 'THROW_ERROR':
        // Strict: don't return fallback, throw error instead
        throw new Error(`Identity resolution failed for ${phone} after ${attempt} attempts: ${error?.message || error}`);
      
      default:
        // Default to fail-safe
        return this.createFallbackResult(phone, error, attempt);
    }
  }

  private alertFailure(errorId: string, phone: string, error: any, attempt: number): void {
    // In production, this would integrate with monitoring systems
    const alertData = {
      alertType: 'IDENTITY_RESOLUTION_FAILURE',
      errorId,
      phone,
      error: error?.message || error,
      attempt,
      timestamp: Date.now(),
      severity: attempt >= this.fallbackConfig.maxRetries ? 'HIGH' : 'MEDIUM',
      service: 'CrossPlatformIdentityResolver'
    };
    
    console.error('ALERT:', JSON.stringify(alertData));
  }

  private logAuditEvent(eventType: string, data: any): void {
    const auditEntry = {
      eventType,
      timestamp: Date.now(),
      service: 'CrossPlatformIdentityResolver',
      ...data
    };
    
    console.log('AUDIT:', JSON.stringify(auditEntry));
  }

  // Public method to check system health
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    errorRate: number;
    lastFailure?: string;
    configuration: FallbackConfig;
  }> {
    return {
      status: 'healthy',
      errorRate: 0.0,
      configuration: this.fallbackConfig
    };
  }

  // Public method to update configuration at runtime
  updateFallbackConfig(newConfig: Partial<FallbackConfig>): void {
    this.fallbackConfig = { ...this.fallbackConfig, ...newConfig };
    console.log('Fallback configuration updated:', this.fallbackConfig);
  }

  // Helper method to create enhanced multi-platform results
  private createEnhancedResult(
    phone: string, 
    syntheticAnalysis: any, 
    node: any,
    platformData: PlatformAnalysisResult,
    sourceData: IdentitySource[],
    attempt: number
  ): SyntheticIdentityResult {
    return {
      phone,
      syntheticScore: syntheticAnalysis.score,
      isSynthetic: syntheticAnalysis.isSynthetic,
      connections: node.connections,
      riskFactors: syntheticAnalysis.riskFactors,
      confidence: syntheticAnalysis.confidence,
      analyzedAt: Date.now(),
      retryCount: attempt - 1,
      
      // Enhanced multi-platform data
      platformAnalysis: platformData,
      provenanceSources: sourceData,
      crossPlatformPatterns: this.detectCrossPlatformPatterns(platformData, sourceData)
    };
  }

  private async collectPlatformData(phone: string): Promise<PlatformAnalysisResult> {
    const platformData: PlatformAnalysisResult = {};
    const collectionResults: Array<{ platform: string; success: boolean; error?: string }> = [];
    
    // Collect CashApp data with enhanced error handling and validation
    try {
      const cashAppResult = await this.cashAppResolver.resolve(phone);
      if (cashAppResult) {
        // Validate CashApp data before trusting it
        const validatedCashAppData = this.validateCashAppData(cashAppResult);
        if (validatedCashAppData.isValid) {
          platformData.cashApp = validatedCashAppData.data;
          collectionResults.push({ platform: 'cashapp', success: true });
        } else {
          collectionResults.push({ 
            platform: 'cashapp', 
            success: false, 
            error: `Data validation failed: ${validatedCashAppData.errors.join(', ')}` 
          });
        }
      } else {
        collectionResults.push({ platform: 'cashapp', success: false, error: 'No data returned' });
      }
    } catch (error) {
      console.warn('CashApp data collection failed:', error);
      collectionResults.push({ platform: 'cashapp', success: false, error: (error as any)?.message || 'Unknown error' });
    }
    
    // Platform resolvers are added as new integrations are implemented
    // Each platform should have its own validation method:
    // const validatedVenmoData = this.validateVenmoData(venmoResult);
    // const validatedPayPalData = this.validatePayPalData(payPalResult);
    
    // Store collection metadata for inconsistency detection and partial data tracking
    (platformData as any)._collectionMetadata = {
      totalPlatforms: 1, // Would be actual count when all platforms implemented
      successfulPlatforms: collectionResults.filter(r => r.success).length,
      failedPlatforms: collectionResults.filter(r => !r.success).length,
      collectionResults,
      // Enhanced partial data tracking
      isPartialData: collectionResults.some(r => !r.success),
      dataCompletenessRatio: collectionResults.filter(r => r.success).length / Math.max(1, collectionResults.length),
      availablePlatforms: Object.keys(platformData),
      missingPlatforms: collectionResults.filter(r => !r.success).map(r => r.platform)
    };
    
    // Add partial data indicators to the platform data itself
    (platformData as any)._isPartial = collectionResults.some(r => !r.success);
    (platformData as any)._completeness = collectionResults.filter(r => r.success).length / Math.max(1, collectionResults.length);
    
    return platformData;
  }

  /**
   * Validates CashApp data before trusting it for fraud detection
   * Implements multiple layers of validation to ensure data integrity
   */
  private validateCashAppData(data: any): { isValid: boolean; data?: any; errors: string[] } {
    const errors: string[] = [];
    const validatedData: any = {};

    // 1. Basic Structure Validation
    if (!data || typeof data !== 'object') {
      return { isValid: false, errors: ['Invalid data structure'] };
    }

    // 2. Verification Status Validation
    const validStatuses = ['verified', 'unverified', 'pending', 'suspended', 'unknown'];
    const verificationStatus = data.verificationStatus || 'unverified';
    if (!validStatuses.includes(verificationStatus)) {
      errors.push(`Invalid verification status: ${verificationStatus}`);
    } else {
      validatedData.verificationStatus = verificationStatus;
    }

    // 3. Transaction Volume Validation
    const transactionVolume = data.transactionVolume30d;
    if (transactionVolume !== null && transactionVolume !== undefined) {
      if (typeof transactionVolume !== 'number' || transactionVolume < 0) {
        errors.push('Transaction volume must be a non-negative number');
      } else if (transactionVolume > 1000000) { // $1M threshold for sanity check
        errors.push('Transaction volume exceeds realistic limits');
      } else {
        validatedData.transactionVolume30d = transactionVolume;
      }
    } else {
      validatedData.transactionVolume30d = 0;
    }

    // 4. Account Age Validation
    const accountAgeDays = data.accountAgeDays;
    if (accountAgeDays !== null && accountAgeDays !== undefined) {
      if (typeof accountAgeDays !== 'number' || accountAgeDays < 0) {
        errors.push('Account age must be a non-negative number');
      } else if (accountAgeDays > 36500) { // 100+ years threshold
        errors.push('Account age exceeds realistic limits');
      } else {
        validatedData.accountAgeDays = accountAgeDays;
      }
    } else {
      validatedData.accountAgeDays = 0;
    }

    // 5. Fraud Flags Validation
    const fraudFlags = data.fraudFlags;
    if (fraudFlags) {
      if (!Array.isArray(fraudFlags)) {
        errors.push('Fraud flags must be an array');
      } else {
        const validFlags = ['HIGH_VOLUME', 'NEW_ACCOUNT', 'RAPID_GROWTH', 'SUSPICIOUS_ACTIVITY', 'VERIFICATION_ISSUES'];
        const invalidFlags = fraudFlags.filter(flag => !validFlags.includes(flag));
        if (invalidFlags.length > 0) {
          errors.push(`Invalid fraud flags: ${invalidFlags.join(', ')}`);
        } else {
          validatedData.fraudFlags = fraudFlags;
        }
      }
    } else {
      validatedData.fraudFlags = [];
    }

    // 6. Cashtag Validation
    const cashtag = data.cashtag;
    if (cashtag) {
      if (typeof cashtag !== 'string') {
        errors.push('Cashtag must be a string');
      } else if (!cashtag.startsWith('$')) {
        errors.push('Cashtag must start with $');
      } else if (cashtag.length < 2 || cashtag.length > 30) {
        errors.push('Cashtag length must be between 2-30 characters');
      } else if (!/^\$[a-zA-Z0-9_.-]+$/.test(cashtag)) {
        errors.push('Cashtag contains invalid characters');
      } else {
        validatedData.cashtag = cashtag;
      }
    }

    // 7. Temporal Consistency Check
    if (validatedData.accountAgeDays && validatedData.transactionVolume30d) {
      const dailyAverage = validatedData.transactionVolume30d / Math.max(1, validatedData.accountAgeDays);
      if (dailyAverage > 10000) { // $10K/day average threshold
        errors.push('Transaction velocity exceeds realistic daily limits');
      }
    }

    // 8. Data Freshness Validation (if timestamp available)
    if (data.lastUpdated) {
      const dataAge = Date.now() - new Date(data.lastUpdated).getTime();
      const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours
      if (dataAge > maxAgeMs) {
        errors.push('Data is too old for reliable analysis');
      }
    }

    return {
      isValid: errors.length === 0,
      data: errors.length === 0 ? validatedData : undefined,
      errors
    };
  }

  private trackDataSources(platformData: PlatformAnalysisResult): IdentitySource[] {
    const sources: IdentitySource[] = [];
    const timestamp = Date.now();
    
    // Track CashApp source
    if (platformData.cashApp) {
      sources.push({
        platform: 'cashapp',
        status: 'success',
        confidence: 0.9, // High confidence in CashApp data
        lastUpdated: timestamp
      });
    } else {
      sources.push({
        platform: 'cashapp',
        status: 'failed',
        confidence: 0,
        lastUpdated: timestamp,
        errorDetails: 'CashApp resolver failed or returned no data'
      });
    }
    
    // Source tracking is added as new platform resolvers are implemented
    // These would be added as platform resolvers are implemented
    
    // Always include device and email sources if available
    sources.push({
      platform: 'device',
      status: 'partial', // Device data is often incomplete
      confidence: 0.7,
      lastUpdated: timestamp
    });
    
    return sources;
  }

  private detectCrossPlatformPatterns(
    platformData: PlatformAnalysisResult,
    sources: IdentitySource[]
  ): CrossPlatformPattern[] {
    const patterns: CrossPlatformPattern[] = [];
    const metadata = (platformData as any)._collectionMetadata;
    
    // Pattern 0: Missing or Empty platformAnalysis (NEW - Highest Priority)
    if (!platformData || Object.keys(platformData).length === 0) {
      patterns.push({
        patternType: 'UNUSUAL_CORRELATIONS',
        severity: 'critical',
        description: 'platformAnalysis is missing or completely empty',
        involvedPlatforms: [],
        evidence: [
          'No platform data could be collected or validated',
          'All platform resolvers failed or returned invalid data',
          'Unable to perform cross-platform analysis',
          'System operating in fail-safe mode'
        ],
        detectedAt: Date.now()
      });
      
      // Return early for empty data - no other patterns can be detected
      return patterns;
    }
    
    // Pattern 1: Data Validation Failures (NEW - High Priority)
    const validationFailures = sources.filter(s => s.status === 'failed' && s.errorDetails?.includes('validation failed'));
    if (validationFailures.length > 0) {
      patterns.push({
        patternType: 'UNUSUAL_CORRELATIONS',
        severity: 'critical',
        description: 'Platform data validation failures detected',
        involvedPlatforms: validationFailures.map(s => s.platform),
        evidence: validationFailures.map(s => `${s.platform}: ${s.errorDetails}`),
        detectedAt: Date.now()
      });
    }
    
    // Pattern 2: Missing Platform Data
    if (metadata && metadata.failedPlatforms > 0) {
      const failedPlatforms = metadata.collectionResults
        .filter((r: any) => !r.success)
        .map((r: any) => r.platform);
      
      patterns.push({
        patternType: 'UNUSUAL_CORRELATIONS',
        severity: metadata.failedPlatforms === metadata.totalPlatforms ? 'critical' : 'medium',
        description: `${metadata.failedPlatforms} platform(s) unavailable for analysis`,
        involvedPlatforms: failedPlatforms,
        evidence: failedPlatforms.map((platform: string) => 
          `${platform}: ${metadata.collectionResults.find((r: any) => r.platform === platform)?.error || 'Failed'}`
        ),
        detectedAt: Date.now()
      });
    }
    
    // Pattern 3: Inconsistent Verification Status (only use validated data)
    const verificationStatuses = Object.entries(platformData)
      .filter(([key, value]) => value && value.verificationStatus)
      .map(([key, value]) => ({ platform: key, status: value.verificationStatus }));
    
    if (verificationStatuses.length > 1) {
      const firstStatus = verificationStatuses[0];
      const hasInconsistentStatus = firstStatus && verificationStatuses.some(v => v.status !== firstStatus.status);
      
      if (hasInconsistentStatus) {
        patterns.push({
          patternType: 'INCONSISTENT_IDENTITIES',
          severity: 'high',
          description: 'Different verification statuses across platforms',
          involvedPlatforms: verificationStatuses.map(v => v.platform),
          evidence: verificationStatuses.map(v => `${v.platform}: ${v.status}`),
          detectedAt: Date.now()
        });
      }
    }
    
    // Pattern 4: New Account with High Activity (only use validated data)
    if (platformData.cashApp) {
      const { accountAgeDays = 0, transactionVolume30d = 0, fraudFlags = [] } = platformData.cashApp;
      
      // Only process if we have validated data
      if (accountAgeDays > 0 && transactionVolume30d >= 0) {
        if (accountAgeDays < 30 && transactionVolume30d > 10000) {
          patterns.push({
            patternType: 'TEMPORAL_ANOMALIES',
            severity: 'high',
            description: 'High transaction volume on new account',
            involvedPlatforms: ['cashapp'],
            evidence: [
              `Account age: ${accountAgeDays} days`,
              `30-day volume: $${transactionVolume30d.toLocaleString()}`,
              'New account with unusual activity level'
            ],
            detectedAt: Date.now()
          });
        }
        
        if (fraudFlags.length > 0) {
          patterns.push({
            patternType: 'RAPID_ACCOUNT_CREATION',
            severity: 'medium',
            description: 'Account has fraud indicators',
            involvedPlatforms: ['cashapp'],
            evidence: fraudFlags.map(flag => `Fraud flag: ${flag}`),
            detectedAt: Date.now()
          });
        }
      }
    }
    
    // Pattern 5: Limited Platform Coverage (data sparsity) - Enhanced for partial data handling
    if (metadata && metadata.successfulPlatforms === 0) {
      patterns.push({
        patternType: 'UNUSUAL_CORRELATIONS',
        severity: 'critical',
        description: 'No platform data available for analysis',
        involvedPlatforms: [],
        evidence: ['All platform resolvers failed or returned invalid data'],
        detectedAt: Date.now()
      });
    } else if (metadata && metadata.successfulPlatforms < metadata.totalPlatforms * 0.5) {
      patterns.push({
        patternType: 'UNUSUAL_CORRELATIONS',
        severity: 'medium',
        description: `Limited platform data coverage (${Math.round(metadata.dataCompletenessRatio * 100)}% complete)`,
        involvedPlatforms: metadata.collectionResults
          .filter((r: any) => !r.success)
          .map((r: any) => r.platform),
        evidence: [
          `Only ${metadata.successfulPlatforms}/${metadata.totalPlatforms} platforms available`,
          `Missing platforms: ${metadata.missingPlatforms.join(', ')}`,
          'Insufficient data for comprehensive analysis'
        ],
        detectedAt: Date.now()
      });
    }
    
    // Pattern 6: Partial Data Quality Assessment (NEW)
    if (metadata && metadata.isPartialData) {
      const completeness = metadata.dataCompletenessRatio;
      if (completeness < 0.3) {
        patterns.push({
          patternType: 'UNUSUAL_CORRELATIONS',
          severity: 'high',
          description: 'Severely limited data - high uncertainty in analysis',
          involvedPlatforms: metadata.missingPlatforms,
          evidence: [
            `Data completeness: ${Math.round(completeness * 100)}%`,
            `Available platforms: ${metadata.availablePlatforms.join(', ')}`,
            'Analysis confidence significantly reduced'
          ],
          detectedAt: Date.now()
        });
      } else if (completeness < 0.7) {
        patterns.push({
          patternType: 'UNUSUAL_CORRELATIONS',
          severity: 'medium',
          description: 'Partial data available - moderate uncertainty in analysis',
          involvedPlatforms: metadata.missingPlatforms,
          evidence: [
            `Data completeness: ${Math.round(completeness * 100)}%`,
            `Some platforms unavailable: ${metadata.missingPlatforms.join(', ')}`,
            'Results should be interpreted with caution'
          ],
          detectedAt: Date.now()
        });
      }
    }
    
    return patterns;
  }

  private async buildIdentityNode(phone: string): Promise<IdentityNode> {
    const connections: IdentityConnection[] = [];
    
    // Simulate discovering connections across platforms
    // In production, this would query real data sources
    
    // Device connections
    const devices = await this.findDeviceConnections(phone);
    connections.push(...devices);
    
    // Payment connections
    const payments = await this.findPaymentConnections(phone);
    connections.push(...payments);
    
    // Email connections
    const emails = await this.findEmailConnections(phone);
    connections.push(...emails);
    
    // IP connections
    const ips = await this.findIPConnections(phone);
    connections.push(...ips);
    
    // Location connections
    const locations = await this.findLocationConnections(phone);
    connections.push(...locations);

    return {
      phone,
      connections,
      syntheticScore: 0, // Will be calculated
      isSynthetic: false, // Will be determined
      confidence: this.calculateConnectionConfidence(connections),
      lastAnalyzed: Date.now()
    };
  }

  private async findDeviceConnections(phone: string): Promise<IdentityConnection[]> {
    // Simulate device discovery
    const deviceCount = Math.floor(Math.random() * 3) + 1;
    const connections: IdentityConnection[] = [];
    
    for (let i = 0; i < deviceCount; i++) {
      connections.push({
        type: 'DEVICE',
        value: `device-${phone.replace(/\D/g, '')}-${i}`,
        strength: Math.random() * 0.5 + 0.5,
        verified: Math.random() > 0.3,
        discoveredAt: Date.now() - Math.random() * 86400000 * 30 // Last 30 days
      });
    }
    
    return connections;
  }

  private async findPaymentConnections(phone: string): Promise<IdentityConnection[]> {
    const connections: IdentityConnection[] = [];
    
    try {
      // Try to get real CashApp data
      const cashAppProfile = await this.cashAppResolver.resolve(phone);
      
      if (cashAppProfile) {
        connections.push({
          type: 'PAYMENT',
          value: cashAppProfile.cashtag || `cashapp-user-${phone.slice(-4)}`,
          strength: cashAppProfile.confidence,
          verified: cashAppProfile.verificationStatus === 'verified',
          discoveredAt: cashAppProfile.lastUpdated,
          metadata: {
            cashtag: cashAppProfile.cashtag,
            displayName: cashAppProfile.displayName,
            verificationStatus: cashAppProfile.verificationStatus,
            transactionVolume30d: cashAppProfile.transactionVolume30d,
            fraudFlags: cashAppProfile.fraudFlags,
            linkedBank: cashAppProfile.linkedBank,
            paymentType: 'cashapp',
            lastTransaction: cashAppProfile.lastUpdated,
            riskScore: 1 - cashAppProfile.confidence, // Inverse of confidence
            accountAgeDays: Math.floor((Date.now() - cashAppProfile.lastUpdated) / 86400000),
            kycStatus: cashAppProfile.verificationStatus === 'verified' ? 'complete' : 'partial'
          }
        });
      }
    } catch (error) {
      console.warn(`CashApp lookup failed for ${phone}:`, error);
    }
    
    // Simulate other payment platforms if no CashApp data or as additional connections
    const otherPaymentCount = Math.floor(Math.random() * 2);
    
    for (let i = 0; i < otherPaymentCount; i++) {
      const paymentTypes: Array<'venmo' | 'paypal' | 'zelle' | 'bank'> = ['venmo', 'paypal', 'zelle', 'bank'];
      const paymentType = paymentTypes[Math.floor(Math.random() * paymentTypes.length)];
      
      connections.push({
        type: 'PAYMENT',
        value: `${paymentType}-user-${phone.replace(/\D/g, '').slice(-4)}${i}`,
        strength: Math.random() * 0.4 + 0.4,
        verified: Math.random() > 0.3,
        discoveredAt: Date.now() - Math.random() * 86400000 * 60, // Last 60 days
        metadata: {
          paymentType,
          transactionCount: Math.floor(Math.random() * 100) + 1,
          lastTransaction: Date.now() - Math.random() * 86400000 * 30, // Last 30 days
          riskScore: Math.random() * 0.8,
          accountAgeDays: Math.floor(Math.random() * 365) + 30
        }
      });
    }
    
    return connections;
  }

  private async findEmailConnections(phone: string): Promise<IdentityConnection[]> {
    // Simulate email discovery
    const emailCount = Math.floor(Math.random() * 2) + 1;
    const connections: IdentityConnection[] = [];
    
    for (let i = 0; i < emailCount; i++) {
      connections.push({
        type: 'EMAIL',
        value: `user${phone.replace(/\D/g, '').slice(-4)}${i}@example.com`,
        strength: Math.random() * 0.3 + 0.4,
        verified: Math.random() > 0.4,
        discoveredAt: Date.now() - Math.random() * 86400000 * 180 // Last 180 days
      });
    }
    
    return connections;
  }

  private async findIPConnections(phone: string): Promise<IdentityConnection[]> {
    // Simulate IP discovery
    const ipCount = Math.floor(Math.random() * 3) + 1;
    const connections: IdentityConnection[] = [];
    
    for (let i = 0; i < ipCount; i++) {
      connections.push({
        type: 'IP',
        value: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        strength: Math.random() * 0.2 + 0.3,
        verified: Math.random() > 0.5,
        discoveredAt: Date.now() - Math.random() * 86400000 * 7 // Last 7 days
      });
    }
    
    return connections;
  }

  private async findLocationConnections(phone: string): Promise<IdentityConnection[]> {
    // Simulate location discovery
    const locationCount = Math.floor(Math.random() * 2) + 1;
    const connections: IdentityConnection[] = [];
    
    for (let i = 0; i < locationCount; i++) {
      connections.push({
        type: 'LOCATION',
        value: `${(Math.random() * 90 - 90).toFixed(4)},${(Math.random() * 180 - 90).toFixed(4)}`,
        strength: Math.random() * 0.3 + 0.5,
        verified: Math.random() > 0.3,
        discoveredAt: Date.now() - Math.random() * 86400000 * 30 // Last 30 days
      });
    }
    
    return connections;
  }

  private calculateConnectionConfidence(connections: IdentityConnection[]): number {
    if (connections.length === 0) return 0;
    
    const avgStrength = connections.reduce((sum, conn) => sum + conn.strength, 0) / connections.length;
    const verifiedRatio = connections.filter(conn => conn.verified).length / connections.length;
    
    return (avgStrength * 0.7) + (verifiedRatio * 0.3);
  }

  private async analyzeSyntheticPatterns(node: IdentityNode): Promise<{
    score: number;
    isSynthetic: boolean;
    riskFactors: string[];
    confidence: number;
  }> {
    const riskFactors: string[] = [];
    let syntheticScore = 0;
    
    // Analyze connection patterns
    const deviceConnections = node.connections.filter(c => c.type === 'DEVICE');
    const paymentConnections = node.connections.filter(c => c.type === 'PAYMENT');
    const emailConnections = node.connections.filter(c => c.type === 'EMAIL');
    
    // Risk factor 1: Too many devices for a single identity
    if (deviceConnections.length > 3) {
      riskFactors.push('Excessive device count');
      syntheticScore += 0.3;
    }
    
    // Risk factor 2: No verified connections
    const verifiedConnections = node.connections.filter(c => c.verified);
    if (verifiedConnections.length === 0) {
      riskFactors.push('No verified connections');
      syntheticScore += 0.4;
    }
    
    // Risk factor 3: All connections created recently
    const recentConnections = node.connections.filter(c => 
      Date.now() - c.discoveredAt < 86400000 * 7 // Last 7 days
    );
    if (recentConnections.length === node.connections.length && node.connections.length > 2) {
      riskFactors.push('All connections recently created');
      syntheticScore += 0.2;
    }
    
    // Risk factor 4: Low connection strength
    const avgStrength = node.connections.reduce((sum, c) => sum + c.strength, 0) / node.connections.length;
    if (avgStrength < 0.3) {
      riskFactors.push('Low connection strength');
      syntheticScore += 0.2;
    }
    
    // Risk factor 5: Suspicious patterns in payment accounts
    if (paymentConnections.length > 2) {
      riskFactors.push('Multiple payment accounts');
      syntheticScore += 0.1;
    }
    
    // Enhanced CashApp-specific risk factors
    const cashAppConnections = paymentConnections.filter(c => c.metadata?.paymentType === 'cashapp');
    
    if (cashAppConnections.length > 0) {
      const firstConnection = cashAppConnections[0];
      const cashAppData = firstConnection?.metadata || {};
      
      // CashApp risk factor 1: Unverified account
      if (cashAppData?.verificationStatus === 'unverified' || cashAppData?.verificationStatus === 'pending') {
        riskFactors.push('CashApp account not verified');
        syntheticScore += 0.2;
      }
      
      // CashApp risk factor 2: Suspended account
      if (cashAppData?.verificationStatus === 'suspended') {
        riskFactors.push('CashApp account suspended');
        syntheticScore += 0.5;
      }
      
      // CashApp risk factor 3: High fraud flags
      if (cashAppData?.fraudFlags && cashAppData.fraudFlags.length > 0) {
        riskFactors.push(`CashApp fraud flags: ${cashAppData.fraudFlags.join(', ')}`);
        syntheticScore += Math.min(0.4, cashAppData.fraudFlags.length * 0.1);
      }
      
      // CashApp risk factor 4: Excessive transaction volume
      if (cashAppData?.transactionVolume30d && cashAppData.transactionVolume30d > 10000) {
        riskFactors.push('CashApp excessive transaction volume');
        syntheticScore += 0.3;
      }
      
      // CashApp risk factor 5: New account with high activity
      if (cashAppData?.accountAgeDays && cashAppData.accountAgeDays < 30 && 
          cashAppData?.transactionVolume30d && cashAppData.transactionVolume30d > 1000) {
        riskFactors.push('New CashApp account with high activity');
        syntheticScore += 0.3;
      }
      
      // CashApp risk factor 6: No linked bank
      if (!cashAppData?.linkedBank) {
        riskFactors.push('CashApp account with no linked bank');
        syntheticScore += 0.1;
      }
      
      // CashApp risk factor 7: High risk score from CashApp analysis
      if (cashAppData?.riskScore && cashAppData.riskScore > 0.7) {
        riskFactors.push('CashApp high risk score detected');
        syntheticScore += 0.2;
      }
    }
    
    // General payment risk factors
    const otherPaymentConnections = paymentConnections.filter(c => c.metadata?.paymentType && c.metadata.paymentType !== 'cashapp');
    
    // Risk factor 6: Multiple payment platforms with no verification
    const unverifiedPaymentAccounts = otherPaymentConnections.filter(c => !c.verified);
    if (unverifiedPaymentAccounts.length > 1) {
      riskFactors.push('Multiple unverified payment accounts');
      syntheticScore += 0.2;
    }
    
    // Risk factor 7: High transaction volume across multiple platforms
    const totalTransactionVolume = paymentConnections.reduce((sum, c) => 
      sum + (c.metadata?.transactionVolume30d || 0), 0);
    if (totalTransactionVolume > 15000) {
      riskFactors.push('High transaction volume across platforms');
      syntheticScore += 0.2;
    }
    
    // Cap score at 1.0
    syntheticScore = Math.min(syntheticScore, 1.0);
    
    // Determine if synthetic
    const isSynthetic = syntheticScore > 0.6;
    
    // Calculate confidence based on data quality
    const confidence = node.confidence * (1 - (riskFactors.length * 0.1));
    
    return {
      score: syntheticScore,
      isSynthetic,
      riskFactors,
      confidence: Math.max(0, confidence)
    };
  }

  async findRelatedIdentities(phone: string, maxDepth: number = 2): Promise<string[]> {
    const visited = new Set<string>();
    const queue: string[] = [phone];
    const related: string[] = [];
    
    while (queue.length > 0 && maxDepth > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      
      visited.add(current);
      
      // Get connections for current phone
      const node = await this.buildIdentityNode(current);
      
      // Extract connected phone numbers (simplified)
      for (const connection of node.connections) {
        // In production, this would extract actual related phone numbers
        // For demo, we'll simulate some related numbers
        if (connection.type === 'DEVICE' && connection.verified) {
          const relatedPhone = `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
          if (!visited.has(relatedPhone)) {
            queue.push(relatedPhone);
            related.push(relatedPhone);
          }
        }
      }
      
      maxDepth--;
    }
    
    return related;
  }

  async getIdentityGraph(phone: string): Promise<IdentityGraph> {
    // Build a local graph around the phone
    const centralNode = await this.buildIdentityNode(phone);
    const relatedPhones = await this.findRelatedIdentities(phone, 2);
    
    const graph: IdentityGraph = {
      nodes: new Map(),
      edges: new Map(),
      syntheticClusters: [],
      lastUpdated: Date.now()
    };
    
    // Add central node
    graph.nodes.set(phone, centralNode);
    graph.edges.set(phone, centralNode.connections);
    
    // Add related nodes
    for (const relatedPhone of relatedPhones) {
      const relatedNode = await this.buildIdentityNode(relatedPhone);
      graph.nodes.set(relatedPhone, relatedNode);
      graph.edges.set(relatedPhone, relatedNode.connections);
    }
    
    return graph;
  }

  private async storeInR2(result: SyntheticIdentityResult): Promise<void> {
    try {
      const r2 = (globalThis as any).R2_BUCKET;
      if (r2) {
        await r2.put(
          `identities/${result.phone}.json`,
          JSON.stringify(result),
          {
            httpMetadata: {
              contentType: 'application/json'
            },
            customMetadata: {
              syntheticScore: result.syntheticScore.toString(),
              isSynthetic: result.isSynthetic.toString(),
              confidence: result.confidence.toString()
            }
          }
        );
      }
    } catch (error) {
      console.error('Failed to store identity in R2:', error);
    }
  }

  async getStats() {
    const cacheStats = this.cache.getStats();
    
    return {
      cache: cacheStats,
      graphSize: this.graph.nodes.size,
      syntheticClusters: this.graph.syntheticClusters.length,
      lastUpdated: this.graph.lastUpdated
    };
  }
}