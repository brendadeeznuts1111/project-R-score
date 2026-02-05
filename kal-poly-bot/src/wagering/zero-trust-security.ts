import { AutomatedGovernanceEngine } from "../compliance/automated-governance-engine";
import { QuantumResistantSecureDataRepository } from "../security/quantum-resistant-secure-data-repository";
import { SecureCookieManager } from "../security/secure-cookie-manager";
import { ThreatIntelligenceService } from "../security/threat-intelligence-service";

/**
 * Zero-Trust Wagering Security Manager
 * Implements the 5-decision point security flow per memory #31
 */

export interface SecurityAuditTrail {
  step: string;
  result: "passed" | "failed" | "error";
  timestamp: number;
  details?: any;
  reason?: string;
}

export interface WagerSecurityValidation {
  allowed: boolean;
  reason?: string;
  auditTrail: SecurityAuditTrail[];
  sessionId?: string;
  threatScore?: number;
  rgCheck?: {
    allowed: boolean;
    remainingLimit?: number;
    interventionRequired?: boolean;
  };
  complianceCheck?: {
    allowed: boolean;
    region: string;
    restrictions?: string[];
  };
}

export interface QuantumSignedWager {
  id: string;
  signature: string;
  algorithm: string;
  keyId: string;
  timestamp: number;
  quantumResistant: boolean;
}

// =============================================================================
// THREAT INTELLIGENCE ENHANCED SERVICE
// =============================================================================

export class EnhancedThreatIntelligenceService extends ThreatIntelligenceService {
  private anomalyPatterns: Map<string, number[]> = new Map();

  async analyzeRequestEnhanced(req: any): Promise<{
    score: number;
    flags: string[];
    anomalyDetected: boolean;
    confidence: number;
  }> {
    // Base threat analysis
    const baseScore = await this.analyzeRequest(req);

    // Enhanced analysis
    const ipVelocity = await this.checkIPVelocity(req.ip);
    const deviceFingerprint = await this.analyzeDeviceFingerprint(req);
    const behavioralPatterns = await this.detectBehavioralAnomalies(req);

    const enhancedScore = Math.max(
      baseScore,
      ipVelocity.score,
      deviceFingerprint.score
    );
    const allFlags = [
      ...(baseScore > 0.3 ? ["base_threat"] : []),
      ...ipVelocity.flags,
      ...deviceFingerprint.flags,
      ...behavioralPatterns.flags,
    ];

    const anomalyDetected = enhancedScore > 0.7 || allFlags.length > 2;

    return {
      score: enhancedScore,
      flags: allFlags,
      anomalyDetected,
      confidence: this.calculateConfidence([...arguments]),
    };
  }

  private async checkIPVelocity(
    ip: string
  ): Promise<{ score: number; flags: string[] }> {
    // Simulate IP velocity check - in real implementation, check Redis/cache
    const recentRequests = Math.floor(Math.random() * 10); // Mock
    const score = Math.min(recentRequests / 5, 1.0);
    const flags = score > 0.5 ? ["high_velocity"] : [];

    return { score, flags };
  }

  private async analyzeDeviceFingerprint(
    req: any
  ): Promise<{ score: number; flags: string[] }> {
    // Device fingerprinting analysis
    const fingerprint =
      req.headers["user-agent"] + (req.headers["accept-language"] || "");
    const score = Math.random() * 0.3; // Mock low-risk score
    const flags: string[] = [];

    return { score, flags };
  }

  private async detectBehavioralAnomalies(
    req: any
  ): Promise<{ score: number; flags: string[] }> {
    // Behavioral pattern analysis
    const score = Math.random() * 0.2; // Mock
    const flags: string[] = [];

    return { score, flags };
  }

  private calculateConfidence(dataPoints: any[]): number {
    return Math.min(dataPoints.length / 10, 1.0);
  }
}

// =============================================================================
// AUTOMATED GOVERNANCE ENGINE ENHANCEMENT
// =============================================================================

export class EnhancedAutomatedGovernanceEngine extends AutomatedGovernanceEngine {
  private regionalComplianceRules: Map<string, any> = new Map();

  constructor() {
    super();
    this.initializeRegionalRules();
  }

  private initializeRegionalRules(): void {
    // Initialize with sample regional compliance rules
    this.regionalComplianceRules.set("US", {
      gdpr: false,
      ccpa: true,
      gamblingAllowed: true,
      ageRestriction: 21,
      maxBetLimit: 1000,
      selfExclusionRequired: true,
    });

    this.regionalComplianceRules.set("EU", {
      gdpr: true,
      ccpa: false,
      gamblingAllowed: true,
      ageRestriction: 18,
      maxBetLimit: 500,
      selfExclusionRequired: true,
    });

    this.regionalComplianceRules.set("CN", {
      gdpr: false,
      ccpa: false,
      gamblingAllowed: false,
      ageRestriction: 0,
      maxBetLimit: 0,
      selfExclusionRequired: false,
    });
  }

  async evaluateResponsibleGamblingEnhanced(
    userId: string,
    action: "deposit" | "bet" | "withdrawal",
    amount: number
  ): Promise<{
    allowed: boolean;
    reason?: string;
    remainingLimit?: number;
    interventionRequired?: boolean;
    modelInference?: number;
  }> {
    // ML-driven loss pattern analysis
    const lossPatterns = await this.analyzeLossPatterns(userId);
    const sessionPatterns = await this.analyzeSessionPatterns(userId);
    const amountPatterns = await this.analyzeAmountPatterns(userId, amount);

    // Combine risk scores (0-1 scale)
    const riskScore =
      (lossPatterns.score + sessionPatterns.score + amountPatterns.score) / 3;

    const allowed = riskScore < 0.7;
    const reason = allowed
      ? undefined
      : "Responsible gambling intervention required";

    // Model inference time simulation (20ms target)
    const modelInference = Math.random() * 20; // Mock inference time

    return {
      allowed,
      reason,
      remainingLimit: allowed ? 1000 - amount : 0,
      interventionRequired: !allowed,
      modelInference,
    };
  }

  async evaluateComplianceEnhanced(
    region: string,
    framework: string,
    context: any
  ): Promise<{
    allowed: boolean;
    reason?: string;
    restrictions?: string[];
    dataResidency?: string;
    auditRequired?: boolean;
  }> {
    const rules = this.regionalComplianceRules.get(region);

    if (!rules) {
      return {
        allowed: false,
        reason: `Unknown region: ${region}`,
        restrictions: ["region_not_supported"],
      };
    }

    const allowed =
      rules.gamblingAllowed &&
      this.checkFrameworkCompliance(framework, rules, region);
    const restrictions = this.getRestrictions(rules, context);

    return {
      allowed,
      reason: allowed ? undefined : "Regulatory restrictions apply",
      restrictions,
      dataResidency: this.getDataResidency(region),
      auditRequired: framework === "gdpr" || framework === "ccpa",
    };
  }

  private checkFrameworkCompliance(
    framework: string,
    rules: any,
    region: string
  ): boolean {
    switch (framework.toLowerCase()) {
      case "gdpr":
        return rules.gdpr;
      case "ccpa":
        return rules.ccpa;
      case "pipi":
        return region === "CN";
      case "lgpd":
        return region === "BR";
      case "pdpa":
        return region === "SG";
      default:
        return true;
    }
  }

  private getRestrictions(rules: any, context: any): string[] {
    const restrictions: string[] = [];

    if (context.sport === "some_restricted_sport") {
      restrictions.push("sport_restricted");
    }

    if (rules.maxBetLimit && context.amount > rules.maxBetLimit) {
      restrictions.push("bet_limit_exceeded");
    }

    return restrictions;
  }

  private getDataResidency(region: string): string {
    const residencyMap: Record<string, string> = {
      US: "us-east-1",
      EU: "eu-west-1",
      CN: "cn-north-1",
    };

    return residencyMap[region] || "us-east-1";
  }

  private async analyzeLossPatterns(
    _userId: string
  ): Promise<{ score: number }> {
    // Mock loss pattern analysis
    return { score: Math.random() * 0.5 };
  }

  private async analyzeSessionPatterns(
    _userId: string
  ): Promise<{ score: number }> {
    // Mock session pattern analysis
    return { score: Math.random() * 0.3 };
  }

  private async analyzeAmountPatterns(
    _userId: string,
    _amount: number
  ): Promise<{ score: number }> {
    // Mock amount pattern analysis
    return { score: Math.random() * 0.4 };
  }
}

// =============================================================================
// SECURE COOKIE MANAGER ENHANCEMENT
// =============================================================================

export class EnhancedSecureCookieManager extends SecureCookieManager {
  private sessionCache: Map<string, any> = new Map();

  async verifySessionEnhanced(cookieHeader: string): Promise<{
    valid: boolean;
    session?: any;
    reason?: string;
    quantumVerified?: boolean;
  }> {
    const baseResult = await this.verifySession(cookieHeader);

    if (!baseResult) {
      return { valid: false, reason: "invalid_session" };
    }

    // Enhanced quantum verification
    const quantumVerified = await this.verifyQuantumSignature(baseResult);

    // Cache valid sessions for performance
    if (quantumVerified) {
      this.sessionCache.set(baseResult.id, baseResult);
    }

    return {
      valid: quantumVerified,
      session: baseResult,
      quantumVerified,
    };
  }

  private async verifyQuantumSignature(session: any): Promise<boolean> {
    // Mock quantum signature verification
    return Math.random() > 0.05; // 95% success rate
  }

  async createSecureSession(
    userId: string,
    options: any = {}
  ): Promise<string> {
    const session = {
      id: this.generateSessionId(),
      userId,
      created: Date.now(),
      expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      quantumSigned: true,
      ...options,
    };

    // Store with quantum resistance
    await this.storeSession(session);

    return session.id;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async storeSession(session: any): Promise<void> {
    // Mock storage - in real implementation, use secure repository
    this.sessionCache.set(session.id, session);
  }
}

// =============================================================================
// MAIN ZERO-TRUST WAGERING SECURITY MANAGER
// =============================================================================

export class ZeroTrustWageringSecurityManager {
  private secureRepo: QuantumResistantSecureDataRepository;
  private threatIntel: EnhancedThreatIntelligenceService;
  private governanceEngine: EnhancedAutomatedGovernanceEngine;
  private cookieManager: EnhancedSecureCookieManager;

  private performanceMetrics: {
    validationTime: number[];
    threatDetectionTime: number[];
    complianceCheckTime: number[];
  } = {
    validationTime: [],
    threatDetectionTime: [],
    complianceCheckTime: [],
  };

  constructor() {
    this.secureRepo = new QuantumResistantSecureDataRepository();
    this.threatIntel = new EnhancedThreatIntelligenceService();
    this.governanceEngine = new EnhancedAutomatedGovernanceEngine();
    this.cookieManager = new EnhancedSecureCookieManager();
  }

  /**
   * Zero-Trust Wager Placement Flow - 5 Decision Points
   */
  async validateWagerPlacement(
    req: any,
    betData: any
  ): Promise<WagerSecurityValidation> {
    const startTime = performance.now();
    const auditTrail: SecurityAuditTrail[] = [];

    try {
      // =======================================================================
      // DECISION POINT 1: AUTHENTICATION
      // =======================================================================
      const authStart = performance.now();
      const sessionResult = await this.cookieManager.verifySessionEnhanced(
        req.headers?.cookie || ""
      );

      auditTrail.push({
        step: "authentication",
        result: sessionResult.valid ? "passed" : "failed",
        timestamp: Date.now(),
        details: {
          sessionId: sessionResult.session?.id,
          quantumVerified: sessionResult.quantumVerified,
        },
        reason: sessionResult.reason,
      });

      if (!sessionResult.valid) {
        return {
          allowed: false,
          reason: "Authentication failed",
          auditTrail,
        };
      }

      // =======================================================================
      // DECISION POINT 2: THREAT INTELLIGENCE
      // =======================================================================
      const threatStart = performance.now();
      const threatAnalysis = await this.threatIntel.analyzeRequestEnhanced({
        ...req,
        userId: sessionResult.session.userId,
        ip: req.headers?.["x-forwarded-for"] || req.ip,
      });

      auditTrail.push({
        step: "threat_intelligence",
        result: threatAnalysis.anomalyDetected ? "failed" : "passed",
        timestamp: Date.now(),
        details: {
          score: threatAnalysis.score,
          flags: threatAnalysis.flags,
          confidence: threatAnalysis.confidence,
        },
        reason: threatAnalysis.anomalyDetected
          ? "Suspicious activity detected"
          : undefined,
      });

      this.performanceMetrics.threatDetectionTime.push(
        performance.now() - threatStart
      );

      if (threatAnalysis.anomalyDetected) {
        return {
          allowed: false,
          reason: "Suspicious activity detected",
          auditTrail,
          threatScore: threatAnalysis.score,
        };
      }

      // =======================================================================
      // DECISION POINT 3: RESPONSIBLE GAMBLING (RG) CHECK
      // =======================================================================
      const rgStart = performance.now();
      const rgCheck =
        await this.governanceEngine.evaluateResponsibleGamblingEnhanced(
          sessionResult.session.userId,
          "bet",
          betData.stake || 0
        );

      auditTrail.push({
        step: "responsible_gambling",
        result: rgCheck.allowed ? "passed" : "failed",
        timestamp: Date.now(),
        details: {
          remainingLimit: rgCheck.remainingLimit,
          interventionRequired: rgCheck.interventionRequired,
          modelInference: rgCheck.modelInference,
        },
        reason: rgCheck.reason,
      });

      this.performanceMetrics.complianceCheckTime.push(
        performance.now() - rgStart
      );

      if (!rgCheck.allowed) {
        await this.secureRepo.createInterventionLog(
          sessionResult.session.userId,
          "wager_blocked"
        );
        return {
          allowed: false,
          reason: rgCheck.reason || "Responsible gambling limit reached",
          auditTrail,
          rgCheck,
        };
      }

      // =======================================================================
      // DECISION POINT 4: COMPLIANCE CHECK
      // =======================================================================
      const region = this.extractRegion(req);
      const complianceCheck =
        await this.governanceEngine.evaluateComplianceEnhanced(
          region,
          "wagering",
          {
            sport: betData.sport,
            marketType: betData.marketType,
            amount: betData.stake,
          }
        );

      auditTrail.push({
        step: "compliance",
        result: complianceCheck.allowed ? "passed" : "failed",
        timestamp: Date.now(),
        details: {
          region,
          restrictions: complianceCheck.restrictions,
          dataResidency: complianceCheck.dataResidency,
          auditRequired: complianceCheck.auditRequired,
        },
        reason: complianceCheck.reason,
      });

      if (!complianceCheck.allowed) {
        return {
          allowed: false,
          reason: complianceCheck.reason || "Not available in region",
          auditTrail,
          complianceCheck: {
            allowed: false,
            region,
            restrictions: complianceCheck.restrictions,
          },
        };
      }

      // =======================================================================
      // SUCCESS - ALL CHECKS PASSED
      // =======================================================================
      this.performanceMetrics.validationTime.push(
        performance.now() - startTime
      );

      return {
        allowed: true,
        auditTrail,
        sessionId: sessionResult.session.id,
        threatScore: threatAnalysis.score,
        rgCheck,
        complianceCheck: {
          allowed: true,
          region,
          restrictions: complianceCheck.restrictions,
        },
      };
    } catch (error) {
      auditTrail.push({
        step: "error",
        result: "error",
        timestamp: Date.now(),
        reason: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        allowed: false,
        reason: "Internal security error",
        auditTrail,
      };
    }
  }

  /**
   * Execute with quantum audit - Decision Point 5
   */
  async createQuantumSignedWager(
    betData: any,
    validationResult: WagerSecurityValidation
  ): Promise<QuantumSignedWager> {
    if (!validationResult.allowed) {
      throw new Error("Cannot create wager: validation failed");
    }

    const wagerId = `wager_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const signature = await this.secureRepo.signData(
      JSON.stringify({
        ...betData,
        wagerId,
        timestamp: Date.now(),
        sessionId: validationResult.sessionId,
      }),
      "ML-DSA-65"
    );

    const quantumWager: QuantumSignedWager = {
      id: wagerId,
      signature,
      algorithm: "ML-DSA-65",
      keyId: "quantum-signing-key-001",
      timestamp: Date.now(),
      quantumResistant: true,
    };

    // Store with quantum resistance and audit trail
    await this.secureRepo.store(
      `wager:${wagerId}`,
      {
        ...betData,
        ...quantumWager,
        auditTrail: validationResult.auditTrail,
      },
      {
        encrypt: true,
        sign: true,
        quantumResistant: true,
        retention: "10y",
      }
    );

    return quantumWager;
  }

  /**
   * Extract region from request (GDPR/CCPA/PIPL/LGPD/PDPA compliance)
   */
  private extractRegion(req: any): string {
    // Check Cloudflare header first
    const cfCountry = req.headers?.["cf-ipcountry"];
    if (cfCountry) return cfCountry;

    // Check forwarded headers
    const forwardedFor = req.headers?.["x-forwarded-for"];
    if (forwardedFor) {
      // Extract country from IP geolocation (mock)
      return this.mockIPGeolocation(forwardedFor.split(",")[0].trim());
    }

    // Check user agent for hints
    const userAgent = req.headers?.["user-agent"] || "";
    if (userAgent.includes("China")) return "CN";

    return "US"; // Default
  }

  private mockIPGeolocation(ip: string): string {
    // Mock geolocation - in real implementation, use GeoIP database
    if (ip.startsWith("192.168.") || ip.startsWith("10.")) return "US";
    if (ip.includes("eu")) return "EU";
    if (ip.includes("cn")) return "CN";
    return "US";
  }

  /**
   * Get performance metrics for monitoring P95 <100ms latency target
   */
  getPerformanceMetrics(): {
    validationTime: { p95: number; avg: number; count: number };
    threatDetectionTime: { p95: number; avg: number; count: number };
    complianceCheckTime: { p95: number; avg: number; count: number };
  } {
    const calculateStats = (times: number[]) => {
      if (times.length === 0) return { p95: 0, avg: 0, count: 0 };

      const sorted = times.sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      const avg = times.reduce((a, b) => a + b, 0) / times.length;

      return {
        p95: sorted[p95Index],
        avg,
        count: times.length,
      };
    };

    return {
      validationTime: calculateStats(this.performanceMetrics.validationTime),
      threatDetectionTime: calculateStats(
        this.performanceMetrics.threatDetectionTime
      ),
      complianceCheckTime: calculateStats(
        this.performanceMetrics.complianceCheckTime
      ),
    };
  }

  /**
   * Security health check - verify 99.95% threat detection SLA
   */
  async securityHealthCheck(): Promise<{
    status: "healthy" | "degraded" | "critical";
    threatDetectionRate: number;
    averageLatency: number;
    quantumKeyStatus: boolean;
  }> {
    // Mock health check - in real implementation, check actual metrics
    const metrics = this.getPerformanceMetrics();
    const threatDetectionRate = 0.9995; // Target 99.95%
    const averageLatency = metrics.validationTime.avg;
    const quantumKeyStatus = true; // Mock

    let status: "healthy" | "degraded" | "critical" = "healthy";

    if (
      averageLatency > 100 ||
      threatDetectionRate < 0.999 ||
      !quantumKeyStatus
    ) {
      status = "degraded";
    }

    if (averageLatency > 200 || threatDetectionRate < 0.99) {
      status = "critical";
    }

    return {
      status,
      threatDetectionRate,
      averageLatency,
      quantumKeyStatus,
    };
  }
}

export default ZeroTrustWageringSecurityManager;
