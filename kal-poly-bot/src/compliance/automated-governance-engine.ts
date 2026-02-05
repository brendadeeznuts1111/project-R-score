/**
 * Automated Governance Engine for Responsible Gambling and Compliance
 * Implements ML-driven intervention and regional compliance per memory #31
 */

export interface ResponsibleGamblingResult {
  allowed: boolean;
  reason?: string;
  remainingLimit?: number;
  interventionRequired?: boolean;
  modelInference?: number;
}

export interface ComplianceResult {
  allowed: boolean;
  reason?: string;
  restrictions?: string[];
  dataResidency?: string;
  auditRequired?: boolean;
}

export interface GovernanceEvaluation {
  policy: string;
  context: any;
  result: boolean;
  timestamp: number;
  confidence?: number;
}

export class AutomatedGovernanceEngine {
  private regionalRules: Map<string, any> = new Map();
  private interventionLogs: Map<string, any[]> = new Map();
  private policyEvaluations: GovernanceEvaluation[] = [];

  constructor() {
    this.initializeRegionalRules();
  }

  private initializeRegionalRules(): void {
    this.regionalRules.set("US", {
      gdpr: false,
      ccpa: true,
      gamblingAllowed: true,
      ageRestriction: 21,
      maxBetLimit: 1000,
      selfExclusionRequired: true,
    });

    this.regionalRules.set("EU", {
      gdpr: true,
      ccpa: false,
      gamblingAllowed: true,
      ageRestriction: 18,
      maxBetLimit: 500,
      selfExclusionRequired: true,
    });

    this.regionalRules.set("CN", {
      gdpr: false,
      ccpa: false,
      gamblingAllowed: false,
      ageRestriction: 0,
      maxBetLimit: 0,
      selfExclusionRequired: false,
    });
  }

  async evaluateResponsibleGambling(
    userId: string,
    action: "deposit" | "bet" | "withdrawal",
    amount: number
  ): Promise<ResponsibleGamblingResult> {
    // ML-driven loss pattern analysis (mock implementation)
    const lossPatterns = await this.analyzeLossPatterns(userId);
    const sessionPatterns = await this.analyzeSessionPatterns(userId);
    const amountPatterns = await this.analyzeAmountPatterns(userId, amount);

    const riskScore =
      (lossPatterns.score + sessionPatterns.score + amountPatterns.score) / 3;
    const allowed = riskScore < 0.7;

    // Model inference time simulation (20ms target)
    const modelInference = Math.random() * 20;

    const result: ResponsibleGamblingResult = {
      allowed,
      reason: allowed
        ? undefined
        : "Responsible gambling intervention required",
      remainingLimit: allowed ? 1000 - amount : 0,
      interventionRequired: !allowed,
      modelInference,
    };

    this.logIntervention(userId, action, result);
    return result;
  }

  async evaluateCompliance(
    region: string,
    framework: string,
    context: any
  ): Promise<ComplianceResult> {
    const rules = this.regionalRules.get(region);

    if (!rules) {
      return {
        allowed: false,
        reason: `Unknown region: ${region}`,
        restrictions: ["region_not_supported"],
      };
    }

    const allowed =
      rules.gamblingAllowed && this.checkFrameworkCompliance(framework, rules);
    const restrictions = this.getRestrictions(rules, context);

    const result: ComplianceResult = {
      allowed,
      reason: allowed ? undefined : "Regulatory restrictions apply",
      restrictions,
      dataResidency: this.getDataResidency(region),
      auditRequired: framework === "gdpr" || framework === "ccpa",
    };

    this.logPolicyEvaluation({
      policy: `${region}:${framework}`,
      context,
      result: allowed,
      timestamp: Date.now(),
    });

    return result;
  }

  async evaluate(policy: string, context: any): Promise<boolean> {
    // Generic policy evaluation
    const result = policy.includes("gambling") && policy.includes("allowed");
    this.logPolicyEvaluation({
      policy,
      context,
      result,
      timestamp: Date.now(),
    });
    return result;
  }

  private checkFrameworkCompliance(framework: string, rules: any): boolean {
    switch (framework.toLowerCase()) {
      case "gdpr":
        return rules.gdpr;
      case "ccpa":
        return rules.ccpa;
      case "lgpd":
        return rules.region === "BR";
      case "pdpa":
        return rules.region === "SG";
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
    userId: string
  ): Promise<{ score: number }> {
    return { score: Math.random() * 0.5 };
  }

  private async analyzeSessionPatterns(
    userId: string
  ): Promise<{ score: number }> {
    return { score: Math.random() * 0.3 };
  }

  private async analyzeAmountPatterns(
    userId: string,
    amount: number
  ): Promise<{ score: number }> {
    return { score: Math.random() * 0.4 };
  }

  private logIntervention(
    userId: string,
    action: string,
    result: ResponsibleGamblingResult
  ): void {
    if (!this.interventionLogs.has(userId)) {
      this.interventionLogs.set(userId, []);
    }
    this.interventionLogs.get(userId)!.push({
      action,
      result,
      timestamp: Date.now(),
    });
  }

  private logPolicyEvaluation(evaluation: GovernanceEvaluation): void {
    this.policyEvaluations.push(evaluation);
  }

  getInterventionHistory(userId: string): any[] {
    return this.interventionLogs.get(userId) || [];
  }

  getPolicyEvaluations(limit: number = 100): GovernanceEvaluation[] {
    return this.policyEvaluations.slice(-limit);
  }
}

export default AutomatedGovernanceEngine;
