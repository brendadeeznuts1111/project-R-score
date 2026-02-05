export interface ComplianceViolation {
  framework: string;
  violation: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  remediation: string;
  timestamp: string;
}

export interface GovernancePolicy {
  id: string;
  name: string;
  framework: string;
  rules: GovernanceRule[];
  enabled: boolean;
  priority: number;
}

export interface GovernanceRule {
  id: string;
  description: string;
  condition: string;
  action: "BLOCK" | "WARN" | "LOG" | "REQUIRE_APPROVAL";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  violations: ComplianceViolation[];
  riskScore: number;
  approved: boolean;
}

export class AutomatedGovernanceEngine {
  private readonly policies: Map<string, GovernancePolicy>;
  private readonly auditLog: Map<string, AuditEntry>;
  private readonly violationHandlers: Map<
    string,
    (violation: ComplianceViolation) => Promise<void>
  >;
  private readonly complianceFrameworks: string[];

  constructor() {
    this.policies = new Map();
    this.auditLog = new Map();
    this.violationHandlers = new Map();
    this.complianceFrameworks = ["GDPR", "CCPA", "PIPL", "LGPD", "PDPA"];

    this.initializeDefaultPolicies();
    this.setupViolationHandlers();
  }

  private initializeDefaultPolicies(): void {
    // GDPR Policies
    const gdprPolicy: GovernancePolicy = {
      id: "gdpr-001",
      name: "GDPR Data Protection",
      framework: "GDPR",
      enabled: true,
      priority: 1,
      rules: [
        {
          id: "gdpr-data-exposure",
          description: "Prevent user data exposure in static directories",
          condition: "config.serve.static.dir.includes('user-data')",
          action: "BLOCK",
          severity: "HIGH",
        },
        {
          id: "gdpr-encryption",
          description: "Require encryption for sensitive data storage",
          condition: "!config.install.registry.startsWith('https')",
          action: "WARN",
          severity: "MEDIUM",
        },
      ],
    };

    // CCPA Policies
    const ccpaPolicy: GovernancePolicy = {
      id: "ccpa-001",
      name: "CCPA Consumer Privacy",
      framework: "CCPA",
      enabled: true,
      priority: 2,
      rules: [
        {
          id: "ccpa-tracking",
          description: "Block tracking registries without consent",
          condition: "config.install.registry.includes('tracking')",
          action: "REQUIRE_APPROVAL",
          severity: "MEDIUM",
        },
      ],
    };

    // Security Policies
    const securityPolicy: GovernancePolicy = {
      id: "sec-001",
      name: "Security Best Practices",
      framework: "SECURITY",
      enabled: true,
      priority: 0, // Highest priority
      rules: [
        {
          id: "sec-insecure-registry",
          description: "Block insecure HTTP registries",
          condition: "config.install.registry.startsWith('http://')",
          action: "BLOCK",
          severity: "HIGH",
        },
        {
          id: "sec-path-traversal",
          description: "Prevent path traversal in executor",
          condition: "config.run.executor.includes('..')",
          action: "BLOCK",
          severity: "CRITICAL",
        },
        {
          id: "sec-privileged-ports",
          description: "Warn about privileged port usage",
          condition: "config.serve.port < 1024",
          action: "WARN",
          severity: "MEDIUM",
        },
      ],
    };

    this.policies.set(gdprPolicy.id, gdprPolicy);
    this.policies.set(ccpaPolicy.id, ccpaPolicy);
    this.policies.set(securityPolicy.id, securityPolicy);
  }

  private setupViolationHandlers(): void {
    // GDPR violation handler
    this.violationHandlers.set("GDPR", async (violation) => {
      console.log(`GDPR Violation: ${violation.violation}`);
      // In a real implementation, this would:
      // - Send notifications to compliance officers
      // - Create tickets in compliance systems
      // - Trigger data protection workflows
    });

    // CCPA violation handler
    this.violationHandlers.set("CCPA", async (violation) => {
      console.log(`CCPA Violation: ${violation.violation}`);
      // In a real implementation, this would:
      // - Update privacy compliance records
      // - Notify privacy teams
      // - Adjust privacy settings
    });

    // Security violation handler
    this.violationHandlers.set("SECURITY", async (violation) => {
      console.log(`Security Violation: ${violation.violation}`);
      // In a real implementation, this would:
      // - Alert security teams
      // - Trigger incident response
      // - Update security monitoring
    });
  }

  async evaluateConfiguration(
    config: Record<string, unknown>,
    userId: string
  ): Promise<{
    compliant: boolean;
    violations: ComplianceViolation[];
    blocked: boolean;
    requiresApproval: boolean;
  }> {
    const violations: ComplianceViolation[] = [];
    let blocked = false;
    let requiresApproval = false;

    // Evaluate all enabled policies
    for (const policy of Array.from(this.policies.values()).filter(
      (p) => p.enabled
    )) {
      for (const rule of policy.rules) {
        if (await this.evaluateRule(rule, config)) {
          const violation: ComplianceViolation = {
            framework: policy.framework,
            violation: rule.description,
            severity: rule.severity,
            description: `Rule ${rule.id} triggered: ${rule.condition}`,
            remediation: this.getRemediation(rule.id),
            timestamp: new Date().toISOString(),
          };

          violations.push(violation);

          // Handle the violation based on action
          switch (rule.action) {
            case "BLOCK":
              blocked = true;
              break;
            case "REQUIRE_APPROVAL":
              requiresApproval = true;
              break;
            case "WARN":
              // Log warning but don't block
              break;
            case "LOG":
              // Just log the violation
              break;
          }

          // Trigger violation handler
          const handler = this.violationHandlers.get(policy.framework);
          if (handler) {
            await handler(violation);
          }
        }
      }
    }

    return {
      compliant: violations.length === 0,
      violations,
      blocked,
      requiresApproval,
    };
  }

  private async evaluateRule(
    rule: GovernanceRule,
    config: Record<string, unknown>
  ): Promise<boolean> {
    try {
      // Simple rule evaluation - in a real implementation, this would be more sophisticated
      // For now, we'll use basic string matching and property checking

      if (rule.condition.includes("config.serve.static.dir")) {
        const serveConfig = config.serve as Record<string, unknown>;
        const staticConfig = serveConfig?.static as Record<string, unknown>;
        const dir = staticConfig?.dir as string;
        return (
          rule.condition.includes("user-data") && dir?.includes("user-data")
        );
      }

      if (rule.condition.includes("config.install.registry")) {
        const installConfig = config.install as Record<string, unknown>;
        const registry = installConfig?.registry as string;

        if (rule.condition.includes("https")) {
          return !registry?.startsWith("https");
        }
        if (rule.condition.includes("http://")) {
          return registry?.startsWith("http://");
        }
        if (rule.condition.includes("tracking")) {
          return registry?.includes("tracking");
        }
      }

      if (rule.condition.includes("config.run.executor")) {
        const runConfig = config.run as Record<string, unknown>;
        const executor = runConfig?.executor as string;
        return executor?.includes("..");
      }

      if (rule.condition.includes("config.serve.port")) {
        const serveConfig = config.serve as Record<string, unknown>;
        const port = serveConfig?.port as number;
        return port < 1024;
      }

      return false;
    } catch (error) {
      console.error(`Error evaluating rule ${rule.id}:`, error);
      return false;
    }
  }

  private getRemediation(ruleId: string): string {
    const remediationMap: Record<string, string> = {
      "gdpr-data-exposure":
        "Move user data out of static directories and implement proper access controls",
      "gdpr-encryption":
        "Use HTTPS endpoints and implement encryption for data transmission",
      "ccpa-tracking":
        "Implement user consent mechanisms for tracking or use non-tracking registries",
      "sec-insecure-registry": "Switch to HTTPS-based registry endpoints",
      "sec-path-traversal":
        "Remove path traversal sequences from executor configuration",
      "sec-privileged-ports":
        "Use non-privileged ports (>1024) for development servers",
    };

    return remediationMap[ruleId] || "Contact security team for guidance";
  }

  async handleViolation(auditEntry: any): Promise<void> {
    // Log the violation
    const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const auditRecord: AuditEntry = {
      id: auditId,
      timestamp: new Date().toISOString(),
      userId: auditEntry.userId || "unknown",
      action: "config_change",
      resource: "bun_config",
      violations: auditEntry.complianceStatus.violations || [],
      riskScore: auditEntry.riskScore?.score || 0,
      approved: false,
    };

    this.auditLog.set(auditId, auditRecord);

    // Trigger appropriate handlers
    for (const violation of auditRecord.violations) {
      const handler = this.violationHandlers.get(violation.framework);
      if (handler) {
        await handler(violation);
      }
    }
  }

  async requestApproval(
    violations: ComplianceViolation[],
    userId: string
  ): Promise<string> {
    const approvalId = `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // In a real implementation, this would:
    // - Send approval requests to compliance officers
    // - Create tickets in approval systems
    // - Send notifications

    console.log(`Approval request ${approvalId} created for user ${userId}`);
    console.log(
      `Violations requiring approval:`,
      violations.map((v) => v.violation)
    );

    return approvalId;
  }

  getComplianceReport(): {
    frameworks: Record<string, { score: number; violations: number }>;
    totalViolations: number;
    blockedOperations: number;
    pendingApprovals: number;
  } {
    const frameworks: Record<string, { score: number; violations: number }> =
      {};

    // Initialize framework scores
    for (const framework of this.complianceFrameworks) {
      frameworks[framework] = { score: 100, violations: 0 };
    }
    frameworks["SECURITY"] = { score: 100, violations: 0 };

    // Calculate violations per framework
    for (const audit of Array.from(this.auditLog.values())) {
      for (const violation of audit.violations) {
        if (frameworks[violation.framework]) {
          frameworks[violation.framework].violations++;
          frameworks[violation.framework].score = Math.max(
            0,
            frameworks[violation.framework].score -
              10 * this.getSeverityWeight(violation.severity)
          );
        }
      }
    }

    const totalViolations = Array.from(this.auditLog.values()).reduce(
      (sum, audit) => sum + audit.violations.length,
      0
    );

    return {
      frameworks,
      totalViolations,
      blockedOperations: Array.from(this.auditLog.values()).filter((a) =>
        a.violations.some((v) => v.severity === "CRITICAL")
      ).length,
      pendingApprovals: 0, // Would be tracked in a real implementation
    };
  }

  private getSeverityWeight(severity: string): number {
    switch (severity) {
      case "CRITICAL":
        return 4;
      case "HIGH":
        return 3;
      case "MEDIUM":
        return 2;
      case "LOW":
        return 1;
      default:
        return 1;
    }
  }

  addPolicy(policy: GovernancePolicy): void {
    this.policies.set(policy.id, policy);
  }

  removePolicy(policyId: string): void {
    this.policies.delete(policyId);
  }

  enablePolicy(policyId: string): void {
    const policy = this.policies.get(policyId);
    if (policy) {
      policy.enabled = true;
    }
  }

  disablePolicy(policyId: string): void {
    const policy = this.policies.get(policyId);
    if (policy) {
      policy.enabled = false;
    }
  }

  getAuditTrail(limit: number = 100): AuditEntry[] {
    return Array.from(this.auditLog.values())
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, limit);
  }

  clearAuditLog(): void {
    this.auditLog.clear();
  }
}
