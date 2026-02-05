/**
 * Real-Time Regulatory Compliance Engine for T3-Lattice v4.0
 * Multi-jurisdictional compliance checking with real-time monitoring
 */

export interface ProposedTrade {
  id: string;
  eventId: string;
  sport: string;
  marketType: string;
  selection: string;
  odds: number;
  stake: number;
  currency: string;
  venue: string;
  timestamp: number;
  expectedValue: number;
  traderId: string;
}

export interface TraderIdentity {
  id: string;
  jurisdiction: string;
  kycLevel: "basic" | "enhanced" | "institutional";
  accreditationStatus:
    | "retail"
    | "accredited"
    | "professional"
    | "institutional";
  riskProfile: "conservative" | "moderate" | "aggressive";
  location: {
    country: string;
    state?: string;
    city: string;
    ip: string;
  };
  history: TradingHistory;
  limits: TradingLimits;
}

export interface TradingHistory {
  totalTrades: number;
  winRate: number;
  averageStake: number;
  totalVolume: number;
  lastTradeDate: number;
  suspiciousActivity: boolean;
  selfExcluded: boolean;
  coolingOffPeriod: {
    active: boolean;
    expires?: number;
  };
}

export interface TradingLimits {
  dailyStakeLimit: number;
  weeklyStakeLimit: number;
  monthlyStakeLimit: number;
  maxSingleStake: number;
  maxOddLimit: number;
  lossLimit: number;
}

export interface ComplianceCheck {
  type: string;
  approved: boolean;
  reason: string;
  riskScore: number;
  jurisdiction: string;
  timestamp: number;
  details: Record<string, any>;
}

export interface ComplianceResult {
  approved: boolean;
  certificate: ComplianceCertificate;
  riskScore: number;
  requiredDocumentation: string[];
  warnings: string[];
  jurisdiction: string;
  checks: ComplianceCheck[];
}

export interface ComplianceCertificate {
  certificateId: string;
  timestamp: number;
  checks: ComplianceCheck[];
  digitalSignature: string;
  merkleRoot: string;
  regulatorAccessToken: string;
  expiresAt: number;
}

export interface ComplianceRule {
  id: string;
  name: string;
  jurisdiction: string;
  description: string;
  enabled: boolean;
  conditions: ComplianceCondition[];
  actions: ComplianceAction[];
}

export interface ComplianceCondition {
  field: string;
  operator: "eq" | "gt" | "lt" | "gte" | "lte" | "in" | "not_in";
  value: any;
  weight: number;
}

export interface ComplianceAction {
  type: "approve" | "reject" | "flag" | "require_documentation" | "limit_stake";
  parameters: Record<string, any>;
}

export class RegulatoryComplianceEngine {
  private jurisdictions = new Map<string, ComplianceRule[]>();
  private activeCertificates = new Map<string, ComplianceCertificate>();
  private reportingEndpoints = new Map<string, string>();
  private complianceHistory: ComplianceResult[] = [];

  constructor() {
    this.initializeJurisdictions();
    this.initializeReportingEndpoints();
  }

  /**
   * Initialize jurisdiction-specific compliance rules
   */
  private initializeJurisdictions(): void {
    // USA - Federal and State regulations
    this.jurisdictions.set("US", [
      {
        id: "US-AML-001",
        name: "Anti-Money Laundering Check",
        jurisdiction: "US",
        description: "AML compliance for US traders",
        enabled: true,
        conditions: [
          { field: "stake", operator: "gt", value: 10000, weight: 0.8 },
          {
            field: "trader.kycLevel",
            operator: "in",
            value: ["enhanced", "institutional"],
            weight: 0.9,
          },
        ],
        actions: [
          {
            type: "require_documentation",
            parameters: {
              documents: ["source_of_funds", "identity_verification"],
            },
          },
        ],
      },
      {
        id: "US-RESPONSIBLE-001",
        name: "Responsible Gambling",
        jurisdiction: "US",
        description: "Responsible gambling requirements",
        enabled: true,
        conditions: [
          {
            field: "trader.history.selfExcluded",
            operator: "eq",
            value: true,
            weight: 1.0,
          },
          {
            field: "trader.history.coolingOffPeriod.active",
            operator: "eq",
            value: true,
            weight: 1.0,
          },
        ],
        actions: [
          {
            type: "reject",
            parameters: { reason: "Self-excluded or cooling off period" },
          },
        ],
      },
    ]);

    // UK - Gambling Commission regulations
    this.jurisdictions.set("UK", [
      {
        id: "UK-GC-001",
        name: "UK Gambling Commission Compliance",
        jurisdiction: "UK",
        description: "UKGC regulatory requirements",
        enabled: true,
        conditions: [
          { field: "stake", operator: "gt", value: 2000, weight: 0.7 },
          { field: "odds", operator: "lt", value: 1.01, weight: 0.5 },
        ],
        actions: [
          { type: "flag", parameters: { flag: "high_stake_low_odds" } },
        ],
      },
    ]);

    // EU - GDPR and general betting regulations
    this.jurisdictions.set("EU", [
      {
        id: "EU-GDPR-001",
        name: "GDPR Data Protection",
        jurisdiction: "EU",
        description: "EU GDPR compliance",
        enabled: true,
        conditions: [
          { field: "trader.consent", operator: "eq", value: true, weight: 1.0 },
        ],
        actions: [{ type: "approve", parameters: {} }],
      },
    ]);
  }

  /**
   * Initialize regulator reporting endpoints
   */
  private initializeReportingEndpoints(): void {
    this.reportingEndpoints.set("US", "https://api.finra.org/reporting");
    this.reportingEndpoints.set(
      "UK",
      "https://api.gamblingcommission.gov.uk/reporting"
    );
    this.reportingEndpoints.set(
      "EU",
      "https://api.europa.eu/financial-reporting"
    );
  }

  /**
   * Validate trade compliance across all applicable jurisdictions
   */
  async validateTradeCompliance(
    trade: ProposedTrade,
    traderIdentity: TraderIdentity
  ): Promise<ComplianceResult> {
    console.log(
      `🔍 Validating compliance for trade ${trade.id} in ${traderIdentity.jurisdiction}`
    );

    try {
      // 1. Multi-jurisdictional compliance check
      const checks = await Promise.all([
        this.checkMarketManipulation(trade, traderIdentity),
        this.checkInsiderTrading(trade, traderIdentity),
        this.checkAntiMoneyLaundering(trade, traderIdentity),
        this.checkResponsibleGambling(trade, traderIdentity),
        this.checkCrossBorderRestrictions(trade, traderIdentity),
        this.checkLicensingRequirements(trade, traderIdentity),
        this.checkDataPrivacy(trade, traderIdentity),
      ]);

      // 2. Generate compliance certificate
      const certificate = await this.generateComplianceCertificate(checks);

      // 3. Calculate composite risk score
      const riskScore = this.calculateComplianceRisk(checks);

      // 4. Generate required documentation
      const requiredDocumentation = this.generateRequiredDocs(checks);

      // 5. Generate warnings
      const warnings = this.generateWarnings(checks);

      // 6. Real-time reporting to regulators (if required)
      if (this.requiresRealTimeReporting(trade, checks)) {
        await this.reportToRegulator(certificate, trade, traderIdentity);
      }

      const result: ComplianceResult = {
        approved: checks.every((check) => check.approved),
        certificate,
        riskScore,
        requiredDocumentation,
        warnings,
        jurisdiction: traderIdentity.jurisdiction,
        checks,
      };

      // Store in compliance history
      this.complianceHistory.push(result);

      console.log(
        `✅ Compliance validation completed. Approved: ${
          result.approved
        }, Risk Score: ${riskScore.toFixed(3)}`
      );
      return result;
    } catch (error) {
      console.error("❌ Compliance validation failed:", error);
      throw error;
    }
  }

  /**
   * Check for market manipulation
   */
  private async checkMarketManipulation(
    trade: ProposedTrade,
    trader: TraderIdentity
  ): Promise<ComplianceCheck> {
    const manipulationIndicators = [
      trade.stake > trader.limits.maxSingleStake * 2,
      trade.odds > 1000, // Extremely high odds
      trader.history.suspiciousActivity,
      trade.expectedValue > 0.5, // Unusually high expected value
    ];

    const riskScore =
      manipulationIndicators.filter(Boolean).length /
      manipulationIndicators.length;
    const approved = riskScore < 0.5;

    return {
      type: "market_manipulation",
      approved,
      reason: approved
        ? "No manipulation indicators detected"
        : "Potential market manipulation detected",
      riskScore,
      jurisdiction: trader.jurisdiction,
      timestamp: Date.now(),
      details: { indicators: manipulationIndicators },
    };
  }

  /**
   * Check for insider trading patterns
   */
  private async checkInsiderTrading(
    trade: ProposedTrade,
    trader: TraderIdentity
  ): Promise<ComplianceCheck> {
    const insiderIndicators = [
      trade.timestamp - trader.history.lastTradeDate < 60000, // Less than 1 minute since last trade
      trade.stake > trader.history.averageStake * 5,
      trader.history.totalTrades < 10 && trade.stake > 1000, // New trader with large stake
    ];

    const riskScore =
      insiderIndicators.filter(Boolean).length / insiderIndicators.length;
    const approved = riskScore < 0.6;

    return {
      type: "insider_trading",
      approved,
      reason: approved
        ? "No insider trading patterns detected"
        : "Potential insider trading detected",
      riskScore,
      jurisdiction: trader.jurisdiction,
      timestamp: Date.now(),
      details: { indicators: insiderIndicators },
    };
  }

  /**
   * Check Anti-Money Laundering compliance
   */
  private async checkAntiMoneyLaundering(
    trade: ProposedTrade,
    trader: TraderIdentity
  ): Promise<ComplianceCheck> {
    const amlIndicators = [
      trade.stake > 10000 && trader.kycLevel === "basic",
      trader.history.totalVolume > 50000 && trader.kycLevel !== "institutional",
      trade.currency !== "USD" && trade.stake > 5000,
    ];

    const riskScore =
      amlIndicators.filter(Boolean).length / amlIndicators.length;
    const approved =
      riskScore < 0.4 ||
      (riskScore >= 0.4 && trader.kycLevel === "institutional");

    return {
      type: "anti_money_laundering",
      approved,
      reason: approved
        ? "AML requirements satisfied"
        : "AML compliance requires enhanced verification",
      riskScore,
      jurisdiction: trader.jurisdiction,
      timestamp: Date.now(),
      details: { indicators: amlIndicators, kycLevel: trader.kycLevel },
    };
  }

  /**
   * Check responsible gambling requirements
   */
  private async checkResponsibleGambling(
    trade: ProposedTrade,
    trader: TraderIdentity
  ): Promise<ComplianceCheck> {
    const gamblingIndicators = [
      trader.history.selfExcluded,
      trader.history.coolingOffPeriod.active,
      trade.stake > trader.limits.lossLimit * 0.5,
      trader.history.totalVolume > trader.limits.monthlyStakeLimit * 0.9,
    ];

    const riskScore =
      gamblingIndicators.filter(Boolean).length / gamblingIndicators.length;
    const approved =
      !trader.history.selfExcluded &&
      !trader.history.coolingOffPeriod.active &&
      riskScore < 0.5;

    return {
      type: "responsible_gambling",
      approved,
      reason: approved
        ? "Responsible gambling requirements met"
        : "Responsible gambling restrictions apply",
      riskScore,
      jurisdiction: trader.jurisdiction,
      timestamp: Date.now(),
      details: {
        selfExcluded: trader.history.selfExcluded,
        coolingOff: trader.history.coolingOffPeriod.active,
        indicators: gamblingIndicators,
      },
    };
  }

  /**
   * Check cross-border restrictions
   */
  private async checkCrossBorderRestrictions(
    trade: ProposedTrade,
    trader: TraderIdentity
  ): Promise<ComplianceCheck> {
    const restrictedJurisdictions = ["IR", "KP", "SY", "CU"];
    const restrictedStates = ["WA", "TX", "FL"]; // Example restricted US states

    const crossBorderIndicators = [
      restrictedJurisdictions.includes(trader.location.country),
      trader.location.country === "US" &&
        restrictedStates.includes(trader.location.state || ""),
      trade.venue.includes("International") && trader.jurisdiction === "US",
    ];

    const riskScore =
      crossBorderIndicators.filter(Boolean).length /
      crossBorderIndicators.length;
    const approved = riskScore === 0;

    return {
      type: "cross_border_restrictions",
      approved,
      reason: approved
        ? "No cross-border restrictions"
        : "Cross-border trading restrictions apply",
      riskScore,
      jurisdiction: trader.jurisdiction,
      timestamp: Date.now(),
      details: {
        country: trader.location.country,
        state: trader.location.state,
        indicators: crossBorderIndicators,
      },
    };
  }

  /**
   * Check licensing requirements
   */
  private async checkLicensingRequirements(
    trade: ProposedTrade,
    trader: TraderIdentity
  ): Promise<ComplianceCheck> {
    const licensingIndicators = [
      trade.sport === "Horse Racing" && trader.jurisdiction === "UK",
      trade.stake > 50000 && trader.accreditationStatus !== "institutional",
      trade.venue === "Betfair" && trader.jurisdiction === "US",
    ];

    const riskScore =
      licensingIndicators.filter(Boolean).length / licensingIndicators.length;
    const approved =
      riskScore < 0.3 ||
      (riskScore >= 0.3 && trader.accreditationStatus === "institutional");

    return {
      type: "licensing_requirements",
      approved,
      reason: approved
        ? "Licensing requirements satisfied"
        : "Additional licensing required",
      riskScore,
      jurisdiction: trader.jurisdiction,
      timestamp: Date.now(),
      details: {
        sport: trade.sport,
        venue: trade.venue,
        accreditation: trader.accreditationStatus,
        indicators: licensingIndicators,
      },
    };
  }

  /**
   * Check data privacy compliance
   */
  private async checkDataPrivacy(
    trade: ProposedTrade,
    trader: TraderIdentity
  ): Promise<ComplianceCheck> {
    const privacyIndicators = [
      trader.jurisdiction === "EU" && !trader.consent, // Mock consent field
      trader.location.country === "CN" && trade.stake > 1000,
    ];

    const riskScore =
      privacyIndicators.filter(Boolean).length / privacyIndicators.length;
    const approved = riskScore === 0;

    return {
      type: "data_privacy",
      approved,
      reason: approved
        ? "Data privacy requirements met"
        : "Data privacy compliance issues",
      riskScore,
      jurisdiction: trader.jurisdiction,
      timestamp: Date.now(),
      details: { indicators: privacyIndicators },
    };
  }

  /**
   * Generate compliance certificate
   */
  private async generateComplianceCertificate(
    checks: ComplianceCheck[]
  ): Promise<ComplianceCertificate> {
    const certificateId = crypto.randomUUID();
    const timestamp = Date.now();

    // Create digital signature
    const signatureData = JSON.stringify({ certificateId, timestamp, checks });
    const digitalSignature = await this.signCertificate(signatureData);

    // Build Merkle tree for checks
    const merkleRoot = this.buildMerkleTree(
      checks.map((c) => JSON.stringify(c))
    );

    // Generate regulator access token
    const regulatorAccessToken = this.generateRegulatorAccessToken();

    const certificate: ComplianceCertificate = {
      certificateId,
      timestamp,
      checks,
      digitalSignature,
      merkleRoot,
      regulatorAccessToken,
      expiresAt: timestamp + 86400000, // 24 hours expiry
    };

    // Store active certificate
    this.activeCertificates.set(certificateId, certificate);

    return certificate;
  }

  /**
   * Calculate composite compliance risk score
   */
  private calculateComplianceRisk(checks: ComplianceCheck[]): number {
    if (checks.length === 0) return 0;

    const totalRisk = checks.reduce((sum, check) => sum + check.riskScore, 0);
    const averageRisk = totalRisk / checks.length;

    // Weight failed checks more heavily
    const failedChecks = checks.filter((check) => !check.approved).length;
    const failurePenalty = (failedChecks / checks.length) * 0.3;

    return Math.min(1.0, averageRisk + failurePenalty);
  }

  /**
   * Generate required documentation list
   */
  private generateRequiredDocs(checks: ComplianceCheck[]): string[] {
    const docs = new Set<string>();

    for (const check of checks) {
      if (!check.approved) {
        switch (check.type) {
          case "anti_money_laundering":
            docs.add("source_of_funds_documentation");
            docs.add("enhanced_identity_verification");
            break;
          case "market_manipulation":
            docs.add("trading_strategy_explanation");
            docs.add("wealth_verification");
            break;
          case "licensing_requirements":
            docs.add("professional_certification");
            docs.add("regulatory_licenses");
            break;
        }
      }
    }

    return Array.from(docs);
  }

  /**
   * Generate compliance warnings
   */
  private generateWarnings(checks: ComplianceCheck[]): string[] {
    const warnings: string[] = [];

    for (const check of checks) {
      if (check.riskScore > 0.3 && check.approved) {
        warnings.push(`High risk score in ${check.type}: ${check.reason}`);
      }
    }

    return warnings;
  }

  /**
   * Check if real-time reporting is required
   */
  private requiresRealTimeReporting(
    trade: ProposedTrade,
    checks: ComplianceCheck[]
  ): boolean {
    return (
      trade.stake > 25000 || // Large trades
      checks.some((check) => check.riskScore > 0.7) || // High risk
      checks.some((check) => !check.approved)
    ); // Failed compliance
  }

  /**
   * Report to regulator
   */
  private async reportToRegulator(
    certificate: ComplianceCertificate,
    trade: ProposedTrade,
    trader: TraderIdentity
  ): Promise<void> {
    const endpoint = this.reportingEndpoints.get(trader.jurisdiction);

    if (!endpoint) {
      console.warn(
        `No reporting endpoint for jurisdiction: ${trader.jurisdiction}`
      );
      return;
    }

    const report = {
      certificateId: certificate.certificateId,
      tradeId: trade.id,
      traderId: trader.id,
      jurisdiction: trader.jurisdiction,
      timestamp: Date.now(),
      riskScore: this.calculateComplianceRisk(certificate.checks),
      accessToken: certificate.regulatorAccessToken,
    };

    try {
      // Simulate API call to regulator
      console.log(`📤 Reporting to ${trader.jurisdiction} regulator:`, report);

      // In production, this would be an actual HTTP request
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(
        `❌ Failed to report to ${trader.jurisdiction} regulator:`,
        error
      );
    }
  }

  /**
   * Sign certificate digitally
   */
  private async signCertificate(data: string): Promise<string> {
    // Simulate digital signature
    const encoder = new TextEncoder();
    const dataArray = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataArray);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Build Merkle tree
   */
  private buildMerkleTree(leaves: string[]): string {
    if (leaves.length === 0) return "";

    let currentLevel = leaves.slice();

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || left;
        const combined = left + right;
        nextLevel.push(this.hashString(combined));
      }

      currentLevel = nextLevel;
    }

    return currentLevel[0];
  }

  /**
   * Hash string
   */
  private async hashString(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Generate regulator access token
   */
  private generateRegulatorAccessToken(): string {
    return crypto.randomUUID();
  }

  /**
   * Get compliance statistics
   */
  getComplianceStatistics(): {
    totalChecks: number;
    approvalRate: number;
    averageRiskScore: number;
    jurisdictionBreakdown: Map<string, number>;
    commonFailures: Map<string, number>;
  } {
    const totalChecks = this.complianceHistory.length;
    const approvedChecks = this.complianceHistory.filter(
      (r) => r.approved
    ).length;
    const approvalRate = totalChecks > 0 ? approvedChecks / totalChecks : 0;

    const avgRiskScore =
      totalChecks > 0
        ? this.complianceHistory.reduce((sum, r) => sum + r.riskScore, 0) /
          totalChecks
        : 0;

    const jurisdictionBreakdown = new Map<string, number>();
    const commonFailures = new Map<string, number>();

    for (const result of this.complianceHistory) {
      // Count by jurisdiction
      jurisdictionBreakdown.set(
        result.jurisdiction,
        (jurisdictionBreakdown.get(result.jurisdiction) || 0) + 1
      );

      // Count failed check types
      for (const check of result.checks) {
        if (!check.approved) {
          commonFailures.set(
            check.type,
            (commonFailures.get(check.type) || 0) + 1
          );
        }
      }
    }

    return {
      totalChecks,
      approvalRate,
      averageRiskScore: avgRiskScore,
      jurisdictionBreakdown,
      commonFailures,
    };
  }

  /**
   * Verify compliance certificate
   */
  async verifyCertificate(certificateId: string): Promise<boolean> {
    const certificate = this.activeCertificates.get(certificateId);

    if (!certificate) {
      return false;
    }

    // Check expiry
    if (Date.now() > certificate.expiresAt) {
      this.activeCertificates.delete(certificateId);
      return false;
    }

    // Verify Merkle root
    const currentRoot = this.buildMerkleTree(
      certificate.checks.map((c) => JSON.stringify(c))
    );
    if (currentRoot !== certificate.merkleRoot) {
      return false;
    }

    return true;
  }

  /**
   * Revoke compliance certificate
   */
  revokeCertificate(certificateId: string, reason: string): void {
    const certificate = this.activeCertificates.get(certificateId);

    if (certificate) {
      console.log(`🔒 Revoking certificate ${certificateId}: ${reason}`);
      this.activeCertificates.delete(certificateId);

      // Report revocation to regulators
      this.reportCertificateRevocation(certificate, reason);
    }
  }

  /**
   * Report certificate revocation
   */
  private async reportCertificateRevocation(
    certificate: ComplianceCertificate,
    reason: string
  ): Promise<void> {
    // Simulate reporting to all relevant regulators
    console.log(
      `📤 Reporting certificate revocation: ${certificate.certificateId}, Reason: ${reason}`
    );
  }

  /**
   * Update compliance rules
   */
  updateComplianceRules(jurisdiction: string, rules: ComplianceRule[]): void {
    this.jurisdictions.set(jurisdiction, rules);
    console.log(
      `📝 Updated compliance rules for jurisdiction: ${jurisdiction}`
    );
  }

  /**
   * Get active certificates
   */
  getActiveCertificates(): ComplianceCertificate[] {
    const now = Date.now();
    return Array.from(this.activeCertificates.values()).filter(
      (cert) => cert.expiresAt > now
    );
  }
}
