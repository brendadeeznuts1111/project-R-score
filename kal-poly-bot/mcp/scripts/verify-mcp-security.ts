#!/usr/bin/env bun
/**
 * MCP Server Security Verification Script
 *
 * Verifies security configuration of built MCP server bundle
 * Ensures no sensitive information or debug code is included
 */

import { existsSync, readFileSync } from "fs";

interface SecurityCheck {
  name: string;
  pattern: RegExp;
  severity: "HIGH" | "MEDIUM" | "LOW";
  description: string;
}

interface SecurityReport {
  bundlePath: string;
  timestamp: string;
  checks: SecurityCheckResult[];
  overall: "PASS" | "FAIL" | "WARNING";
  score: number;
}

interface SecurityCheckResult {
  name: string;
  passed: boolean;
  severity: "HIGH" | "MEDIUM" | "LOW";
  matches: string[];
  description: string;
}

class MCPSecurityVerifier {
  private bundlePath: string;
  private securityChecks: SecurityCheck[];

  constructor(bundlePath: string = "dist/mcp-server-zero-cost.js") {
    this.bundlePath = bundlePath;
    this.securityChecks = this.initializeSecurityChecks();
  }

  private initializeSecurityChecks(): SecurityCheck[] {
    return [
      // High severity checks
      {
        name: "No Hardcoded Secrets",
        pattern: /(password|secret|key|token)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
        severity: "HIGH",
        description: "No hardcoded passwords, secrets, or API keys",
      },
      {
        name: "No Debug Logging",
        pattern: /(console\.log|console\.debug|console\.info)\s*\(/gi,
        severity: "HIGH",
        description: "No debug logging statements in production",
      },
      {
        name: "No Error Stack Traces",
        pattern: /(stack|error\.stack|console\.trace)\s*/gi,
        severity: "HIGH",
        description: "No error stack traces exposed to client",
      },
      {
        name: "No SQL Injection Patterns",
        pattern: /(SELECT|INSERT|UPDATE|DELETE)\s+.*\+/gi,
        severity: "HIGH",
        description: "No potential SQL injection patterns",
      },

      // Medium severity checks
      {
        name: "No Eval Usage",
        pattern:
          /(eval|Function\s*\(|setTimeout\s*\(|setInterval\s*\()\s*['"]/gi,
        severity: "MEDIUM",
        description: "No usage of eval() or dynamic code execution",
      },
      {
        name: "No Inline Scripts",
        pattern: /<script[^>]*>.*?<\/script>/gi,
        severity: "MEDIUM",
        description: "No inline JavaScript in HTML responses",
      },
      {
        name: "No Commented Code",
        pattern: /\/\*[\s\S]*?\*\/|\/\/.*$/gm,
        severity: "MEDIUM",
        description: "No commented code in production bundle",
      },

      // Low severity checks
      {
        name: "No Development URLs",
        pattern: /(localhost|127\.0\.0\.1|0\.0\.0\.0):\d+/gi,
        severity: "LOW",
        description: "No development URLs in production bundle",
      },
      {
        name: "No TODO Comments",
        pattern: /TODO|FIXME|HACK/gi,
        severity: "LOW",
        description: "No TODO or FIXME comments in production",
      },
      {
        name: "No Console Warnings",
        pattern: /console\.warn\s*\(/gi,
        severity: "LOW",
        description: "No console warnings in production",
      },
    ];
  }

  async verify(): Promise<SecurityReport> {
    console.log("🔒 MCP Server Security Verification");
    console.log("=".repeat(50));

    if (!existsSync(this.bundlePath)) {
      throw new Error(`Bundle not found: ${this.bundlePath}`);
    }

    const bundleContent = readFileSync(this.bundlePath, "utf8");
    const results: SecurityCheckResult[] = [];

    console.log(`📦 Analyzing bundle: ${this.bundlePath}`);
    console.log(`📊 Bundle size: ${Math.round(bundleContent.length / 1024)}KB`);

    for (const check of this.securityChecks) {
      const result = this.runSecurityCheck(bundleContent, check);
      results.push(result);

      const status = result.passed ? "✅" : "❌";
      const matches =
        result.matches.length > 0 ? ` (${result.matches.length})` : "";
      console.log(`   ${status} ${check.name}${matches}`);

      if (!result.passed && result.matches.length > 0) {
        console.log(
          `      Found: ${result.matches.slice(0, 3).join(", ")}${result.matches.length > 3 ? "..." : ""}`
        );
      }
    }

    const report = this.generateReport(results);
    this.displaySummary(report);

    return report;
  }

  private runSecurityCheck(
    content: string,
    check: SecurityCheck
  ): SecurityCheckResult {
    const matches = content.match(check.pattern) || [];
    const passed = matches.length === 0;

    return {
      name: check.name,
      passed,
      severity: check.severity,
      matches: matches.slice(0, 5), // Limit to first 5 matches
      description: check.description,
    };
  }

  private generateReport(results: SecurityCheckResult[]): SecurityReport {
    const failedChecks = results.filter((r) => !r.passed);
    const highSeverityFailures = failedChecks.filter(
      (r) => r.severity === "HIGH"
    );
    const mediumSeverityFailures = failedChecks.filter(
      (r) => r.severity === "MEDIUM"
    );

    let overall: "PASS" | "FAIL" | "WARNING";
    if (highSeverityFailures.length > 0) {
      overall = "FAIL";
    } else if (mediumSeverityFailures.length > 0) {
      overall = "WARNING";
    } else {
      overall = "PASS";
    }

    // Calculate security score (0-100)
    const score = Math.max(
      0,
      100 -
        highSeverityFailures.length * 20 -
        mediumSeverityFailures.length * 10
    );

    return {
      bundlePath: this.bundlePath,
      timestamp: new Date().toISOString(),
      checks: results,
      overall,
      score,
    };
  }

  private displaySummary(report: SecurityReport): void {
    console.log("\n📋 Security Verification Summary");
    console.log("-".repeat(40));

    const passed = report.checks.filter((r) => r.passed).length;
    const failed = report.checks.filter((r) => !r.passed).length;
    const high = report.checks.filter(
      (r) => !r.passed && r.severity === "HIGH"
    ).length;
    const medium = report.checks.filter(
      (r) => !r.passed && r.severity === "MEDIUM"
    ).length;
    const low = report.checks.filter(
      (r) => !r.passed && r.severity === "LOW"
    ).length;

    console.log(`   Overall Status: ${report.overall}`);
    console.log(`   Security Score: ${report.score}/100`);
    console.log(`   Checks Passed: ${passed}/${report.checks.length}`);

    if (failed > 0) {
      console.log(
        `   Failed Checks: ${failed} (HIGH: ${high}, MEDIUM: ${medium}, LOW: ${low})`
      );
    }

    console.log(`   Bundle: ${report.bundlePath}`);
    console.log(`   Verified: ${report.timestamp}`);

    // Recommendations
    if (report.overall !== "PASS") {
      console.log("\n💡 Recommendations:");
      if (high > 0) {
        console.log("   🔴 Fix HIGH severity issues before deployment");
      }
      if (medium > 0) {
        console.log("   🟡 Address MEDIUM severity issues for better security");
      }
      if (low > 0) {
        console.log(
          "   🟢 Consider fixing LOW severity issues for production quality"
        );
      }
    } else {
      console.log(
        "\n✅ Security verification passed - bundle is production ready!"
      );
    }
  }

  async verifyFeatureFlags(): Promise<void> {
    console.log("\n🚩 Verifying Feature Flag Configuration");
    console.log("-".repeat(45));

    const bundleContent = readFileSync(this.bundlePath, "utf8");

    const expectedFeatures = [
      "MCP_ENABLED",
      "MCP_ROUTING",
      "INFRASTRUCTURE_HEALTH_CHECKS",
      "MCP_AUDIT_LOGGING",
      "MCP_SECURE_COOKIES",
      "MCP_CSRF_PROTECTION",
    ];

    const disabledFeatures = [
      "DEBUG",
      "BETA_FEATURES",
      "PREMIUM",
      "QUANTUM_READY",
    ];

    console.log("✅ Enabled Features:");
    for (const feature of expectedFeatures) {
      const present = bundleContent.includes(feature);
      console.log(`   ${present ? "✅" : "❌"} ${feature}`);
    }

    console.log("\n🚫 Disabled Features:");
    for (const feature of disabledFeatures) {
      const present = bundleContent.includes(feature);
      console.log(
        `   ${present ? "❌" : "✅"} ${feature} (should be disabled)`
      );
    }
  }

  async saveReport(report: SecurityReport): Promise<void> {
    const reportPath = "dist/security-report.json";
    require("fs").writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Security report saved to: ${reportPath}`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const bundlePath =
    args.find((arg) => arg.startsWith("--bundle="))?.substring(9) ||
    "dist/mcp-server-zero-cost.js";

  const verifier = new MCPSecurityVerifier(bundlePath);

  try {
    const report = await verifier.verify();
    await verifier.verifyFeatureFlags();
    await verifier.saveReport(report);

    // Exit with appropriate code
    if (report.overall === "FAIL") {
      process.exit(1);
    } else if (report.overall === "WARNING") {
      process.exit(2);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error("❌ Security verification failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}

export { MCPSecurityVerifier };
