#!/usr/bin/env bun
/**
 * FactoryWager Reality Status Dashboard
 * Visual indicators for real vs. simulated infrastructure
 */

import RealityCheck from "./config/reality-config";

interface RealityStatusRow {
  component: string;
  icon: string;
  status: string;
  latency?: string;
  color: string;
  warning?: string;
}

class RealityDashboard {
  private colors = {
    live: "\x1b[92m",      // Bright green (mint)
    simulated: "\x1b[95m", // Bright magenta (purple-ish)
    mixed: "\x1b[93m",     // Bright yellow (orange-ish)
    error: "\x1b[91m",     // Bright red
    reset: "\x1b[0m"
  };

  private realityStatus = (component: string, isReal: boolean, isMixed = false): {
    icon: string;
    color: string;
    label: string;
    warning?: string;
  } => {
    if (isMixed) {
      return {
        icon: "🔄",
        color: this.colors.mixed,
        label: "MIXED",
        warning: `${component} has partial real connectivity`
      };
    }

    return {
      icon: isReal ? "🌐" : "💾",
      color: isReal ? this.colors.live : this.colors.simulated,
      label: isReal ? "LIVE" : "LOCAL",
      warning: !isReal ? `${component} running in simulation mode` : undefined
    };
  };

  private statusRow = (name: string, real: boolean, latency?: number, isMixed = false): RealityStatusRow => {
    const status = this.realityStatus(name, real, isMixed);

    return {
      component: name,
      icon: status.icon,
      status: status.label,
      latency: latency ? `${latency}ms` : "N/A",
      color: status.color,
      warning: status.warning
    };
  };

  private formatTable = (rows: RealityStatusRow[]): string => {
    const maxWidths = {
      component: Math.max(...rows.map(r => r.component.length), 10),
      icon: 4,
      status: 8,
      latency: 8
    };

    const header = `│ ${"Component".padEnd(maxWidths.component)} │ ${"Icon".padEnd(maxWidths.icon)} │ ${"Status".padEnd(maxWidths.status)} │ ${"Latency".padEnd(maxWidths.latency)} │`;
    const separator = `├─${"─".repeat(maxWidths.component + 2)}─┼─${"─".repeat(maxWidths.icon + 2)}─┼─${"─".repeat(maxWidths.status + 2)}─┼─${"─".repeat(maxWidths.latency + 2)}─┤`;
    const top = `┌─${"─".repeat(maxWidths.component + 2)}─┬─${"─".repeat(maxWidths.icon + 2)}─┬─${"─".repeat(maxWidths.status + 2)}─┬─${"─".repeat(maxWidths.latency + 2)}─┐`;
    const bottom = `└─${"─".repeat(maxWidths.component + 2)}─┴─${"─".repeat(maxWidths.icon + 2)}─┴─${"─".repeat(maxWidths.status + 2)}─┴─${"─".repeat(maxWidths.latency + 2)}─┘`;

    let output = `${top}\n${header}\n${separator}\n`;

    rows.forEach(row => {
      const coloredComponent = row.color + row.component.padEnd(maxWidths.component) + this.colors.reset;
      const coloredStatus = row.color + row.status.padEnd(maxWidths.status) + this.colors.reset;
      const coloredLatency = row.latency ? row.color + row.latency.padEnd(maxWidths.latency) + this.colors.reset : "N/A".padEnd(maxWidths.latency);

      output += `│ ${coloredComponent} │ ${row.icon.padEnd(maxWidths.icon)} │ ${coloredStatus} │ ${coloredLatency} │\n`;
    });

    output += bottom;
    return output;
  };

  async generateStatusReport(): Promise<void> {
    console.log("🔍 FactoryWager Reality Status Dashboard");
    console.log("=" .repeat(50));

    const status = await RealityCheck.overall.getRealityStatus();

    // Component Status Table
    const rows: RealityStatusRow[] = [];

    // R2 Status
    const r2Real = status.r2.mode === "LIVE" && status.r2.connected;
    rows.push(this.statusRow("R2 Storage", r2Real, undefined, status.r2.mode === "SIMULATED" ? false : status.r2.mode === "LIVE" ? false : true));

    // MCP Status (mixed if some installed but not all)
    const mcpFullyReal = status.mcp.installed === status.mcp.total;
    const mcpPartial = status.mcp.installed > 0 && status.mcp.installed < status.mcp.total;
    rows.push(this.statusRow("MCP Servers", mcpFullyReal, undefined, mcpPartial));

    // Secrets Status
    const secretsReal = status.secrets.real >= 3;
    const secretsPartial = status.secrets.real > 0 && status.secrets.real < 3;
    rows.push(this.statusRow("Secrets Store", secretsReal, undefined, secretsPartial));

    // Bun.secrets API Status
    const bunSecretsWorking = status.secrets.real > 0;
    rows.push(this.statusRow("Bun.secrets API", bunSecretsWorking));

    console.log(this.formatTable(rows));

    // Overall Status
    const overallConfig = {
      "LIVE": { icon: "🌐", color: this.colors.live, description: "All systems connected to real services" },
      "MIXED": { icon: "🔄", color: this.colors.mixed, description: "Some real, some simulated components" },
      "SIMULATED": { icon: "💾", color: this.colors.simulated, description: "All systems running in local simulation" }
    };

    const overall = overallConfig[status.overall];
    console.log(`\n${overall.icon} Overall Mode: ${overall.color}${status.overall}${this.colors.reset}`);
    console.log(`   ${overall.description}`);

    // Warnings
    const warnings = rows.filter(r => r.warning).map(r => r.warning);
    if (warnings.length > 0) {
      console.log("\n⚠️ Warnings:");
      warnings.forEach(warning => console.log(`   • ${warning}`));
    }

    // Detailed Component Breakdown
    console.log("\n📊 Detailed Component Status:");

    // R2 Details
    console.log(`\n🌐 R2 Storage (${status.r2.mode}):`);
    if (status.r2.connected) {
      console.log(`   ✅ API connection successful`);
    } else {
      console.log(`   ❌ ${status.r2.error || "No connection"}`);
    }

    // MCP Details
    console.log(`\n🔄 MCP Servers (${status.mcp.installed}/${status.mcp.total}):`);
    status.mcp.servers.forEach(server => {
      const statusIcon = server.installed ? "✅" : "❌";
      const latencyInfo = server.latency ? ` (${server.latency}ms)` : "";
      console.log(`   ${statusIcon} ${server.server}${latencyInfo}`);
    });

    // Secrets Details
    console.log(`\n🔐 Secrets Audit:`);
    console.log(`   Real secrets: ${status.secrets.real}/${status.secrets.total}`);
    console.log(`   Missing: ${status.secrets.missing}`);

    // Security Assessment
    console.log("\n🔒 Security Assessment:");
    if (status.overall === "MIXED") {
      console.log("   ⚠️ MIXED REALITY - Potential security risk");
      console.log("   💡 Configure all components with real credentials");
    } else if (status.overall === "SIMULATED") {
      console.log("   ✅ SECURE - All operations local");
      console.log("   💡 Ready for production credential setup");
    } else {
      console.log("   🔐 PRODUCTION - All systems live");
      console.log("   💡 Monitor for credential rotation");
    }

    // Recommendations
    console.log("\n💡 Recommendations:");
    if (status.overall === "SIMULATED") {
      console.log("   1. Set up real R2 credentials for cloud storage");
      console.log("   2. Install missing MCP servers: " + status.mcp.servers.filter(s => !s.installed).map(s => s.server).join(", "));
      console.log("   3. Configure real secrets for production use");
    } else if (status.overall === "MIXED") {
      console.log("   1. Complete missing MCP server installation");
      console.log("   2. Verify all cloud credentials are properly configured");
      console.log("   3. Test end-to-end connectivity");
    } else {
      console.log("   1. Set up automated credential rotation");
      console.log("   2. Configure monitoring and alerting");
      console.log("   3. Document disaster recovery procedures");
    }
  }
}

// CLI execution
if (import.meta.main) {
  const dashboard = new RealityDashboard();
  dashboard.generateStatusReport().catch(error => {
    console.error("❌ Reality dashboard failed:", error.message);
    process.exit(1);
  });
}

export { RealityDashboard };
