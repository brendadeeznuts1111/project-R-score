#!/usr/bin/env bun
/**
 * FactoryWager Reality Status Dashboard (Simplified)
 * Visual indicators for real vs. simulated infrastructure
 */

import RealityCheck from "./config/reality-config";

interface RealityStatusRow {
  component: string;
  icon: string;
  status: string;
  latency?: string;
  mode: "LIVE" | "SIMULATED" | "MIXED";
  warning?: string;
}

class SimpleRealityDashboard {
  private statusRow = (name: string, mode: "LIVE" | "SIMULATED" | "MIXED", latency?: number): RealityStatusRow => {
    const icons = { LIVE: "🌐", SIMULATED: "💾", MIXED: "🔄" };
    
    return {
      component: name,
      icon: icons[mode],
      status: mode,
      latency: latency ? `${latency}ms` : "N/A",
      mode,
      warning: mode === "SIMULATED" ? `${name} running in simulation mode` : 
                mode === "MIXED" ? `${name} has partial connectivity` : undefined
    };
  };

  private formatTable = (rows: RealityStatusRow[]): string => {
    const maxWidths = {
      component: Math.max(...rows.map(r => r.component.length), 10),
      icon: 4,
      status: 10,
      latency: 8
    };

    const header = `│ ${"Component".padEnd(maxWidths.component)} │ ${"Icon".padEnd(maxWidths.icon)} │ ${"Status".padEnd(maxWidths.status)} │ ${"Latency".padEnd(maxWidths.latency)} │`;
    const separator = `├─${"─".repeat(maxWidths.component + 2)}─┼─${"─".repeat(maxWidths.icon + 2)}─┼─${"─".repeat(maxWidths.status + 2)}─┼─${"─".repeat(maxWidths.latency + 2)}─┤`;
    const top = `┌─${"─".repeat(maxWidths.component + 2)}─┬─${"─".repeat(maxWidths.icon + 2)}─┬─${"─".repeat(maxWidths.status + 2)}─┬─${"─".repeat(maxWidths.latency + 2)}─┐`;
    const bottom = `└─${"─".repeat(maxWidths.component + 2)}─┴─${"─".repeat(maxWidths.icon + 2)}─┴─${"─".repeat(maxWidths.status + 2)}─┴─${"─".repeat(maxWidths.latency + 2)}─┘`;

    let output = `${top}\n${header}\n${separator}\n`;
    
    rows.forEach(row => {
      const statusPrefix = row.mode === "LIVE" ? "🟢" : row.mode === "MIXED" ? "🟡" : "🔵";
      const coloredComponent = `${statusPrefix} ${row.component.padEnd(maxWidths.component - 2)}`;
      const coloredStatus = row.status.padEnd(maxWidths.status);
      const coloredLatency = row.latency ? row.latency.padEnd(maxWidths.latency) : "N/A".padEnd(maxWidths.latency);
      
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
    let r2Mode: "LIVE" | "SIMULATED" | "MIXED" = "SIMULATED";
    if (status.r2.mode === "LIVE" && status.r2.connected) {
      r2Mode = "LIVE";
    } else if (status.r2.mode === "LIVE" && !status.r2.connected) {
      r2Mode = "MIXED";
    }
    rows.push(this.statusRow("R2 Storage", r2Mode));
    
    // MCP Status
    let mcpMode: "LIVE" | "SIMULATED" | "MIXED" = "SIMULATED";
    if (status.mcp.installed === status.mcp.total) {
      mcpMode = "LIVE";
    } else if (status.mcp.installed > 0) {
      mcpMode = "MIXED";
    }
    rows.push(this.statusRow("MCP Servers", mcpMode));
    
    // Secrets Status
    let secretsMode: "LIVE" | "SIMULATED" | "MIXED" = "SIMULATED";
    if (status.secrets.real >= 3) {
      secretsMode = "LIVE";
    } else if (status.secrets.real > 0) {
      secretsMode = "MIXED";
    }
    rows.push(this.statusRow("Secrets Store", secretsMode));
    
    // Bun.secrets API Status
    const bunSecretsMode = status.secrets.real > 0 ? "LIVE" : "SIMULATED";
    rows.push(this.statusRow("Bun.secrets API", bunSecretsMode));
    
    console.log(this.formatTable(rows));
    
    // Overall Status
    const overallIcons = { LIVE: "🌐", MIXED: "🔄", SIMULATED: "💾" };
    const overallDescriptions = {
      LIVE: "All systems connected to real services",
      MIXED: "Some real, some simulated components", 
      SIMULATED: "All systems running in local simulation"
    };
    
    console.log(`\n${overallIcons[status.overall]} Overall Mode: ${status.overall}`);
    console.log(`   ${overallDescriptions[status.overall]}`);
    
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
  const dashboard = new SimpleRealityDashboard();
  dashboard.generateStatusReport().catch(error => {
    console.error("❌ Reality dashboard failed:", error.message);
    process.exit(1);
  });
}

export { SimpleRealityDashboard };
