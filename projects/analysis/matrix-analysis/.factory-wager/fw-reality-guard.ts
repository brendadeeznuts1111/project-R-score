#!/usr/bin/env bun
/**
 * FactoryWager Reality Guard v4.0
 * Production-ready reality configuration with mixed-reality detection and automatic enforcement
 */

import { spawn } from "child_process";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { VisualDashboard, SystemMode } from "./shared/visual-dashboard";

interface RealityReport {
  mode: SystemMode;
  components: Record<string, { real: boolean; source: string; warning?: string }>;
  risks: string[];
  recommendations: string[];
  timestamp: string;
}

interface ComponentStatus {
  real: boolean;
  source: string;
  warning?: string;
  details?: any;
}

export class RealityGuard {
  private reportsDir = "./.factory-wager/reports";

  constructor() {
    // Ensure reports directory exists
    if (!existsSync(this.reportsDir)) {
      mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  async audit(): Promise<RealityReport> {
    const components: RealityReport["components"] = {};
    const risks: string[] = [];

    // R2 Audit
    const r2Status = await this.auditR2();
    components.r2 = r2Status;
    if (!r2Status.real) risks.push("R2 storage simulated — no cloud redundancy");

    // MCP Audit
    const mcpStatus = await this.auditMCP();
    components.mcp = mcpStatus;
    if (!mcpStatus.real) risks.push("MCP servers partially installed");

    // Secrets Audit
    const secretsStatus = await this.auditSecrets();
    components.secrets = secretsStatus;
    if (!secretsStatus.real) risks.push("Secrets management not fully configured");

    const mode = this.determineMode(components);

    const report: RealityReport = {
      mode,
      components,
      risks,
      recommendations: this.generateRecommendations(mode, risks),
      timestamp: new Date().toISOString()
    };

    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = join(this.reportsDir, `fw-reality-guard-${timestamp}.json`);
    writeFileSync(reportFile, JSON.stringify(report, null, 2));

    return report;
  }

  private async auditR2(): Promise<ComponentStatus> {
    const checks = {
      accountId: this.checkR2AccountId(),
      accessKey: this.checkR2AccessKey(),
      secretKey: this.checkR2SecretKey(),
      endpoint: this.checkR2Endpoint()
    };

    const realCount = Object.values(checks).filter(Boolean).length;
    const totalCount = Object.keys(checks).length;

    // Mixed-reality detection
    if (realCount > 0 && realCount < totalCount) {
      return {
        real: false,
        source: "Mixed Configuration",
        warning: "🚨 MIXED-REALITY DETECTED — Partial real credentials create security risk",
        details: checks
      };
    }

    const isReal = realCount === totalCount;

    return {
      real: isReal,
      source: isReal ? "Environment Variables" : "Demo Configuration",
      warning: isReal ? undefined : "Using local filesystem simulation",
      details: checks
    };
  }

  private checkR2AccountId(): boolean {
    const id = process.env.R2_ACCOUNT_ID;
    return !!id && id !== "demo" && id.length === 32 && /^[a-f0-9]+$/.test(id);
  }

  private checkR2AccessKey(): boolean {
    const key = process.env.R2_ACCESS_KEY_ID;
    return !!key && key !== "demo" && key.length === 32 && !key.includes("demo");
  }

  private checkR2SecretKey(): boolean {
    const secret = process.env.R2_SECRET_ACCESS_KEY;
    return !!secret && secret !== "demo" && secret.length > 20 && !secret.includes("demo");
  }

  private checkR2Endpoint(): boolean {
    const endpoint = process.env.R2_ENDPOINT;
    return !!endpoint && endpoint !== "demo" && endpoint.includes("r2.cloudflarestorage.com");
  }

  private async auditMCP(): Promise<ComponentStatus> {
    const required = ["filesystem", "github", "git", "fetch", "context7"];
    const installed = await Promise.all(
      required.map(async (server) => {
        try {
          // Try to spawn the MCP server with --version flag
          const proc = spawn("bunx", ["-y", `@modelcontextprotocol/server-${server}`, "--version"], {
            stdio: "ignore",
            timeout: 3000
          });

          const result = await new Promise<boolean>((resolve) => {
            proc.on("exit", (code) => resolve(code === 0));
            proc.on("error", () => resolve(false));

            // Timeout fallback
            setTimeout(() => {
              proc.kill();
              resolve(false);
            }, 2000);
          });

          return result;
        } catch {
          return false;
        }
      })
    );

    const allInstalled = installed.every(Boolean);
    const installedCount = installed.filter(Boolean).length;

    return {
      real: allInstalled,
      source: allInstalled ? "npm registry" : "partial/missing",
      warning: allInstalled ? undefined : `Missing: ${required.filter((_, i) => !installed[i]).join(", ")}`,
      details: {
        installed: required.filter((_, i) => installed[i]),
        missing: required.filter((_, i) => !installed[i]),
        count: `${installedCount}/${required.length}`
      }
    };
  }

  private async auditSecrets(): Promise<ComponentStatus> {
    try {
      // Test Bun.secrets API
      const testKey = "com.factory-wager.reality.test";
      const testValue = "reality-test-" + Date.now();

      // Try to set and retrieve a test secret
      await Bun.password?.set?.(testKey, testValue);
      const retrieved = await Bun.password?.get?.(testKey);
      await Bun.password?.remove?.(testKey);

      const osKeychainWorking = retrieved === testValue;

      // Check for environment secrets as fallback
      const envSecrets = [
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
        "R2_ACCOUNT_ID"
      ].filter(key => !!process.env[key] && !process.env[key]?.includes("demo"));

      const hasRealSecrets = envSecrets.length > 0 || osKeychainWorking;

      return {
        real: hasRealSecrets,
        source: osKeychainWorking ? "OS Keychain" : envSecrets.length > 0 ? "Environment Variables" : "None",
        warning: hasRealSecrets ? undefined : "No secure secret storage configured",
        details: {
          osKeychainWorking,
          envSecretsCount: envSecrets.length,
          testPassed: osKeychainWorking
        }
      };
    } catch (error) {
      return {
        real: false,
        source: "Error",
        warning: `Secret system error: ${(error as Error).message}`,
        details: { error: (error as Error).message }
      };
    }
  }

  private determineMode(components: RealityReport["components"]): SystemMode {
    const reals = Object.values(components).filter(c => c.real).length;
    const total = Object.keys(components).length;

    if (reals === 0) return "SIMULATED";
    if (reals === total) return "LIVE";
    if (reals > 0 && reals < total) return "MIXED";
    return "UNKNOWN";
  }

  private generateRecommendations(mode: SystemMode, risks: string[]): string[] {
    if (mode === "MIXED") {
      return [
        "🚨 URGENT: Mixed reality detected — complete credential setup or switch to --mode=simulate",
        "Run: bun run setup:r2 to configure complete R2 credentials",
        "Run: bun run secrets:enterprise:set to configure secure secret storage",
        "Never deploy to production with mixed reality configuration"
      ];
    }

    if (mode === "SIMULATED") {
      return [
        "✅ System operational in secure local-only mode",
        "To connect cloud: bun run setup:r2 for R2 configuration",
        "To configure secrets: bun run secrets:enterprise:set",
        "Use --mode=simulate explicitly for development work"
      ];
    }

    if (mode === "LIVE") {
      return [
        "🌐 System fully operational with cloud connectivity",
        "Monitor with: bun run nexus:status for infrastructure health",
        "Deploy safely with: bun run deploy:reality production",
        "Regular security audits recommended"
      ];
    }

    return ["System state unclear - run comprehensive audit"];
  }

  enforce(expectedMode: SystemMode): void {
    const actualMode = this.detectMode();

    if (actualMode === "MIXED") {
      throw new Error(`🚨 REALITY VIOLATION: System in MIXED mode. All credentials must be real or all demo. Mixed configurations create security risks.`);
    }

    if (expectedMode === "LIVE" && actualMode !== "LIVE") {
      throw new Error(`🚨 REALITY VIOLATION: Expected LIVE mode but system is ${actualMode}. Configure real credentials before using live operations.`);
    }

    if (expectedMode === "SIMULATED" && actualMode === "LIVE") {
      console.log(`⚠️  WARNING: System is LIVE but SIMULATED mode requested. Consider using --mode=live for cloud operations.`);
    }

    console.log(`✅ Reality enforcement passed: ${actualMode}`);
  }

  private detectMode(): SystemMode {
    // Quick mode detection for enforcement
    const r2Checks = [
      this.checkR2AccountId(),
      this.checkR2AccessKey(),
      this.checkR2SecretKey(),
      this.checkR2Endpoint()
    ];

    const r2Real = r2Checks.every(Boolean);
    const r2Simulated = r2Checks.every(check => !check);

    if (r2Real) return "LIVE";
    if (r2Simulated) return "SIMULATED";
    return "MIXED";
  }

  displayReport(report: RealityReport): void {
    console.log(this.generateHeader(report));

    console.log("\n📊 Component Status:");
    console.table(report.components);

    if (report.risks.length > 0) {
      console.log("\n⚠️  Risks:");
      report.risks.forEach(risk => console.log(`   • ${risk}`));
    }

    if (report.recommendations.length > 0) {
      console.log("\n💡 Recommendations:");
      report.recommendations.forEach(rec => console.log(`   ${rec}`));
    }
  }

  private getModeBadge(mode: SystemMode) {
    const badges = {
      LIVE: { color: "#1ae66f", icon: "🌐", text: "LIVE PRODUCTION" },
      SIMULATED: { color: "#a855f7", icon: "💾", text: "LOCAL SIMULATION" },
      MIXED: { color: "#f44725", icon: "⚠️", text: "MIXED REALITY — RISK" },
      UNKNOWN: { color: "#6b7280", icon: "❓", text: "UNDETERMINED" }
    };
    return badges[mode] || badges.UNKNOWN;
  }

  private generateHeader(report: RealityReport): string {
    return VisualDashboard.generateRealityHeader(report.mode, "REALITY AUDIT v4.0");
  }
}

// CLI execution
if (import.meta.main) {
  const guard = new RealityGuard();

  try {
    const report = await guard.audit();
    guard.displayReport(report);

    // Exit with error code if mixed reality detected
    if (report.mode === "MIXED") {
      console.log("\n🚨 EXITING DUE TO MIXED REALITY CONFIGURATION");
      process.exit(1);
    }

  } catch (error) {
    console.error("❌ Reality audit failed:", (error as Error).message);
    process.exit(1);
  }
}
