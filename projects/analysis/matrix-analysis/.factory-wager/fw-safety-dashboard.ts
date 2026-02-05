#!/usr/bin/env bun
/**
 * FactoryWager Safety Dashboard v1.0
 * Visual safety status with Tier-1380 compliance reporting
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { RealityGuard } from './fw-reality-guard';
import { VisualDashboard } from './shared/visual-dashboard';

interface SafetyStatus {
  component: string;
  status: string;
  indicator: string;
  latency: string;
  mode: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface SafetyReport {
  timestamp: string;
  overall: 'SAFE' | 'WARNING' | 'CRITICAL';
  components: SafetyStatus[];
  risks: string[];
  recommendations: string[];
  compliance: {
    tier1380: boolean;
    auditTrail: boolean;
    quarantineActive: boolean;
  };
}

export class SafetyDashboard {
  private reportsDir = "./.factory-wager/audit";
  private quarantineDir = "./.factory-wager/quarantine";

  constructor() {
    // Ensure directories exist
    if (!existsSync(this.reportsDir)) mkdirSync(this.reportsDir, { recursive: true });
    if (!existsSync(this.quarantineDir)) mkdirSync(this.quarantineDir, { recursive: true });
  }

  async generateSafetyReport(): Promise<SafetyReport> {
    console.log("🛡️ Generating FactoryWager Safety Report...");

    const guard = new RealityGuard();
    const realityReport = await guard.audit();

    // Build safety status rows
    const components: SafetyStatus[] = [
      {
        component: "Safety System",
        status: "Active",
        indicator: "✓",
        latency: "0ms",
        mode: "LIVE",
        risk: "LOW"
      },
      {
        component: "Reality Mode",
        status: realityReport.mode,
        indicator: this.getStatusIndicator(realityReport.mode),
        latency: "0ms",
        mode: realityReport.mode,
        risk: realityReport.mode === "MIXED" ? "CRITICAL" :
               realityReport.mode === "SIMULATED" ? "LOW" : "LOW"
      },
      {
        component: "R2 Storage",
        status: realityReport.components.r2.real ? "Connected" : "Simulated",
        indicator: realityReport.components.r2.real ? "✓" : "○",
        latency: "0ms",
        mode: realityReport.components.r2.real ? "LIVE" : "SIMULATED",
        risk: realityReport.components.r2.real ? "LOW" : "MEDIUM"
      },
      {
        component: "MCP Servers",
        status: realityReport.components.mcp.real ? "Installed" : "Partial",
        indicator: realityReport.components.mcp.real ? "✓" : "⚠",
        latency: "0ms",
        mode: realityReport.components.mcp.real ? "LIVE" : "DEGRADED",
        risk: realityReport.components.mcp.real ? "LOW" : "MEDIUM"
      },
      {
        component: "Secrets Store",
        status: realityReport.components.secrets.real ? "OS Keychain" : "Environment",
        indicator: realityReport.components.secrets.real ? "✓" : "○",
        latency: "0ms",
        mode: realityReport.components.secrets.real ? "SECURE" : "BASIC",
        risk: realityReport.components.secrets.real ? "LOW" : "MEDIUM"
      }
    ];

    // Determine overall safety status
    const criticalRisks = components.filter(c => c.risk === 'CRITICAL').length;
    const highRisks = components.filter(c => c.risk === 'HIGH').length;
    const mediumRisks = components.filter(c => c.risk === 'MEDIUM').length;

    const overall = criticalRisks > 0 ? 'CRITICAL' :
                   highRisks > 0 ? 'WARNING' :
                   mediumRisks > 2 ? 'WARNING' : 'SAFE';

    const report: SafetyReport = {
      timestamp: new Date().toISOString(),
      overall,
      components,
      risks: realityReport.risks,
      recommendations: realityReport.recommendations,
      compliance: {
        tier1380: overall !== 'CRITICAL',
        auditTrail: true,
        quarantineActive: realityReport.mode === 'MIXED'
      }
    };

    // Save compliance report
    await this.saveComplianceReport(report);

    return report;
  }

  displaySafetyReport(report: SafetyReport): void {
    const colors = {
      LIVE: "#1ae66f",
      SIMULATED: "#a855f7",
      MIXED: "#f44725",
      DEGRADED: "#f4c025",
      SECURE: "#47d1d1",
      BASIC: "#6b7280",
      SAFE: "#1ae66f",
      WARNING: "#f4c025",
      CRITICAL: "#f44725"
    };

    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║  🛡️ FACTORYWAGER SAFETY DASHBOARD                      ║");
    console.log("╚════════════════════════════════════════════════════════╝");

    // Overall status
    const overallColor = colors[report.overall as keyof typeof colors];
    console.log(`\n🎯 Overall Safety: ${overallColor}${report.overall}\x1b[0m`);
    console.log(`📅 Generated: ${report.timestamp.substring(0, 19)}`);

    // Component table
    console.log("\n┌──────────────────────┬─────────────────┬─────┬────────┬─────────────┐");
    console.log("│ Component            │ Status           │ Ind │ Latency│ Mode        │");
    console.log("├──────────────────────┼─────────────────┼─────┼────────┼─────────────┤");

    report.components.forEach(comp => {
      const modeColor = colors[comp.mode as keyof typeof colors] || colors.BASIC;
      const indicatorColor = comp.indicator === '✓' ? '\x1b[92m' :
                            comp.indicator === '⚠' ? '\x1b[93m' :
                            comp.indicator === '○' ? '\x1b[90m' : '\x1b[91m';

      console.log(`│ ${comp.component.padEnd(20)} │ ${comp.status.padEnd(15)} │ ${indicatorColor}${comp.indicator}\x1b[0m │ ${comp.latency.padEnd(6)} │ ${modeColor}${comp.mode.padEnd(11)}\x1b[0m │`);
    });

    console.log("└──────────────────────┴─────────────────┴─────┴────────┴─────────────┘");

    // Compliance status
    console.log("\n📋 Tier-1380 Compliance:");
    console.log(`   Governance: ${report.compliance.tier1380 ? '\x1b[92m✓ Compliant\x1b[0m' : '\x1b[91m✗ Non-compliant\x1b[0m'}`);
    console.log(`   Audit Trail: ${report.compliance.auditTrail ? '\x1b[92m✓ Active\x1b[0m' : '\x1b[91m✗ Missing\x1b[0m'}`);
    console.log(`   Quarantine: ${report.compliance.quarantineActive ? '\x1b[93m⚠ Active\x1b[0m' : '\x1b[92m✓ Clear\x1b[0m'}`);

    // Risks and recommendations
    if (report.risks.length > 0) {
      console.log("\n⚠️  Active Risks:");
      report.risks.forEach(risk => console.log(`   • ${risk}`));
    }

    if (report.recommendations.length > 0) {
      console.log("\n💡 Recommendations:");
      report.recommendations.forEach(rec => console.log(`   ${rec}`));
    }
  }

  private getStatusIndicator(mode: string): string {
    const indicators = {
      LIVE: "✓",
      SIMULATED: "○",
      MIXED: "⚠",
      UNKNOWN: "?"
    };
    return indicators[mode as keyof typeof indicators] || "?";
  }

  private async saveComplianceReport(report: SafetyReport): Promise<void> {
    const complianceEntry = {
      timestamp: report.timestamp,
      overall: report.overall,
      compliance: report.compliance,
      risks: report.risks,
      hash: await this.generateComplianceHash(report)
    };

    const auditFile = join(this.reportsDir, "safety-compliance.jsonl");
    const entry = JSON.stringify(complianceEntry) + "\n";

    // Append to audit log
    await Bun.write(auditFile, entry, { append: true });
  }

  private async generateComplianceHash(report: SafetyReport): Promise<string> {
    const data = JSON.stringify({
      timestamp: report.timestamp,
      overall: report.overall,
      components: report.components.map(c => ({
        component: c.component,
        status: c.status,
        mode: c.mode
      }))
    });

    return Bun.hash.crc32(data).toString(16);
  }

  async quarantineCredentials(): Promise<void> {
    console.log("🔒 Quarantining credentials...");

    const timestamp = Date.now();
    const quarantinePath = join(this.quarantineDir, timestamp.toString());

    // Create quarantine directory
    await Bun.$`mkdir -p ${quarantinePath}`;

    // Backup environment files
    await Bun.$`cp .env ${quarantinePath}/env.backup 2>/dev/null || true`;
    await Bun.$`cp .env.local ${quarantinePath}/env.local.backup 2>/dev/null || true`;

    // Reset to safe defaults
    await Bun.write(".env", "NODE_ENV=development\nFW_MODE=SIMULATED\n");
    await Bun.write(".env.local", "# Safe mode - configure credentials to enable cloud features\n");

    console.log(`✅ Credentials quarantined to: ${quarantinePath}`);
    console.log("💡 System reset to safe simulation mode");

    // Log quarantine action
    await this.logQuarantineAction(quarantinePath);
  }

  private async logQuarantineAction(quarantinePath: string): Promise<void> {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      event: "CREDENTIAL_QUARANTINE",
      quarantinePath,
      user: process.env.USER,
      pid: process.pid,
      hash: Bun.hash.crc32(quarantinePath + Date.now()).toString(16)
    };

    const auditFile = join(this.reportsDir, "quarantine-actions.jsonl");
    const entry = JSON.stringify(auditEntry) + "\n";

    await Bun.write(auditFile, entry, { append: true });
  }

  async listQuarantined(): Promise<void> {
    console.log("🔒 Quarantined Credentials:");

    try {
      const quarantines = await Bun.$`ls -la ${this.quarantineDir}`.text();

      if (quarantines.trim().split('\n').length <= 1) {
        console.log("   No quarantined credentials found");
        return;
      }

      console.log(quarantines);

    } catch (error) {
      console.log("   No quarantine directory found");
    }
  }
}

// CLI execution
if (import.meta.main) {
  const dashboard = new SafetyDashboard();
  const command = process.argv[2] || "status";

  switch (command) {
    case "status":
      const report = await dashboard.generateSafetyReport();
      dashboard.displaySafetyReport(report);
      break;

    case "quarantine":
      await dashboard.quarantineCredentials();
      break;

    case "list":
      await dashboard.listQuarantined();
      break;

    default:
      console.log("Usage:");
      console.log("  bun run fw-safety-dashboard.ts status    # Show safety dashboard");
      console.log("  bun run fw-safety-dashboard.ts quarantine # Quarantine credentials");
      console.log("  bun run fw-safety-dashboard.ts list      # List quarantined items");
  }
}
