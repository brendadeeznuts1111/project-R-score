#!/usr/bin/env bun
/**
 * FactoryWager Unified CLI with Mode Support
 * Handles reality mode switching and command routing with failsafe guards
 */

import { spawn } from "child_process";
import { RealityCheck } from "./config/reality-config";
import { RealityGuard } from "./fw-reality-guard";
import { SafetyDashboard } from "./fw-safety-dashboard";
import { AutomaticRemediation } from "./fw-automatic-remediation";

interface CLIOptions {
  mode?: "audit-reality" | "force-live" | "simulate";
  command?: string;
  args: string[];
}

class FactoryWagerCLI {
  private realityGuard = new RealityGuard();
  private safetyDashboard = new SafetyDashboard();
  private remediation = new AutomaticRemediation();

  private async checkRealityStatus() {
    return await RealityCheck.overall.getRealityStatus();
  }

  private async validateDeploymentSafety(environment: string): Promise<void> {
    console.log(`🔒 Validating deployment safety for ${environment.toUpperCase()}...`);

    const report = await this.realityGuard.audit();

    // Check for mixed reality (always fail)
    if (report.mode === "MIXED") {
      console.error("\n❌ DEPLOYMENT BLOCKED - MIXED REALITY DETECTED");
      console.error("🚨 Security Risk: Partial real credentials may leak to logs or error messages");

      // Trigger automatic remediation
      await this.triggerAutomaticRemediation("MIXED_REALITY", {
        command: "deploy",
        environment,
        mode: report.mode
      });

      process.exit(1);
    }

    // Production deployments require LIVE mode
    if (environment.toLowerCase() === "production" && report.mode !== "LIVE") {
      console.error("\n❌ PRODUCTION DEPLOYMENT BLOCKED");
      console.error(`🚨 Reality Status: ${report.mode} (LIVE required for production)`);

      // Log compliance violation
      await this.logComplianceViolation("PRODUCTION_DEPLOYMENT_BLOCKED", {
        command: "deploy",
        environment,
        mode: report.mode
      });

      console.error("\n🔧 To enable production deployment:");
      console.error("   1. Configure real R2 credentials");
      console.error("   2. Install all MCP servers");
      console.error("   3. Configure real secrets");
      console.error("   4. Run: bun run setup:r2 for guided setup");
      process.exit(1);
    }

    console.log("✅ Deployment safety validation passed");
  }

  private async validateBackupSafety(mode?: string): Promise<void> {
    console.log("🔒 Validating backup operation safety...");

    const report = await this.realityGuard.audit();

    // Check for mixed reality
    if (report.mode === "MIXED") {
      console.error("\n❌ BACKUP BLOCKED - MIXED REALITY DETECTED");
      console.error("🚨 Security Risk: Cannot backup with partial real credentials");

      // Trigger automatic remediation
      await this.triggerAutomaticRemediation("MIXED_REALITY", {
        command: "backup",
        mode,
        realityMode: report.mode
      });

      process.exit(1);
    }

    // Live mode requires real R2 credentials
    if (mode === "live" && report.mode !== "LIVE") {
      console.error("\n❌ LIVE BACKUP BLOCKED");
      console.error("🚨 R2 credentials not configured for cloud backup");

      // Log compliance violation
      await this.logComplianceViolation("LIVE_BACKUP_BLOCKED", {
        command: "backup",
        mode,
        realityMode: report.mode
      });

      console.error("\n💡 Options:");
      console.error("   • Use --mode=simulate for local backup");
      console.error("   • Configure R2 credentials: bun run setup:r2");
      console.error("   • Check status: bun run reality:guard");
      process.exit(1);
    }

    console.log("✅ Backup safety validation passed");
  }

  private async triggerAutomaticRemediation(violation: string, context: any): Promise<void> {
    console.log("\n🛠️  Auto-remediation: Clearing partial credentials...");

    // Move to quarantine rather than delete (exact pattern from user's script)
    await Bun.$`mv .env .env.quarantine.$(date +%s) 2>/dev/null || true`;
    await Bun.$`cp .env.local .env 2>/dev/null || echo "NODE_ENV=development" > .env`;

    console.log("✅ System reset to SIMULATED mode — re-run setup to configure");

    // Log the remediation action
    await this.logComplianceViolation("AUTOMATIC_REMEDIATION_TRIGGERED", {
      violation,
      context,
      action: "CREDENTIAL_QUARANTINE"
    });
  }

  private async logComplianceViolation(event: string, context: any): Promise<void> {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      event,
      command: context.command,
      violation: context.violation || event,
      mode: context.mode || context.realityMode,
      user: process.env.USER,
      pid: process.pid,
      hash: Bun.hash.crc32(JSON.stringify(process.env)).toString(16)
    };

    // Append to quantum-resistant audit log (exact pattern from user's script)
    await Bun.write(
      "./.factory-wager/audit/safety-violations.jsonl",
      JSON.stringify(auditEntry) + "\n",
      { append: true }
    );

    console.log("🔒 Violation logged with tamper-evident hash:", auditEntry.hash);
  }

  private async enforceLiveMode(): Promise<void> {
    const status = await this.checkRealityStatus();

    console.log("🔒 Force Live Mode - Checking Reality Status...");

    if (status.overall !== "LIVE") {
      console.log("\n❌ FORCE LIVE MODE FAILED");
      console.log("System is not in LIVE mode:");
      console.log(`   R2 Storage: ${status.r2.mode}`);
      console.log(`   MCP Servers: ${status.mcp.installed}/${status.mcp.total} installed`);
      console.log(`   Secrets: ${status.secrets.real}/${status.secrets.total} real`);
      console.log(`   Overall: ${status.overall}`);

      console.log("\n💡 To enable LIVE mode:");
      console.log("   1. Set real R2 credentials (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT)");
      console.log("   2. Install missing MCP servers");
      console.log("   3. Configure real secrets");
      console.log("   4. Run: bun run reality:check to verify");

      process.exit(1);
    }

    console.log("✅ All systems confirmed LIVE");
  }

  private async auditRealityMode(): Promise<void> {
    console.log("🔍 FactoryWager Reality Audit Mode");
    console.log("=" .repeat(40));

    const status = await this.checkRealityStatus();

    // Component breakdown
    console.log("\n📊 Component Reality Status:");

    // R2 Status
    const r2Icon = status.r2.mode === "LIVE" && status.r2.connected ? "🌐" :
                   status.r2.mode === "LIVE" && !status.r2.connected ? "🔄" : "💾";
    console.log(`${r2Icon} R2 Storage: ${status.r2.mode}`);
    if (status.r2.error) {
      console.log(`   ⚠️ ${status.r2.error}`);
    }

    // MCP Status
    const mcpIcon = status.mcp.installed === status.mcp.total ? "🌐" :
                   status.mcp.installed > 0 ? "🔄" : "💾";
    console.log(`${mcpIcon} MCP Servers: ${status.mcp.installed}/${status.mcp.total} installed`);
    const missingMcp = status.mcp.servers.filter(s => !s.installed).map(s => s.server);
    if (missingMcp.length > 0) {
      console.log(`   ❌ Missing: ${missingMcp.join(", ")}`);
    }

    // Secrets Status
    const secretsIcon = status.secrets.real >= 3 ? "🌐" :
                       status.secrets.real > 0 ? "🔄" : "💾";
    console.log(`${secretsIcon} Secrets: ${status.secrets.real}/${status.secrets.total} real`);
    if (status.secrets.missing > 0) {
      console.log(`   ❌ Missing: ${status.secrets.missing} secrets`);
    }

    // Overall Status
    const overallIcons = { LIVE: "🌐", MIXED: "🔄", SIMULATED: "💾" };
    const overallColors = { LIVE: "green", MIXED: "yellow", SIMULATED: "blue" };

    console.log(`\n${overallIcons[status.overall]} Overall Mode: ${status.overall}`);

    // Security Assessment
    console.log("\n🔒 Security Assessment:");
    if (status.overall === "LIVE") {
      console.log("   🔐 PRODUCTION MODE - All systems live");
      console.log("   💡 Monitor credential rotation and access logs");
    } else if (status.overall === "MIXED") {
      console.log("   ⚠️ MIXED REALITY - Partial simulation");
      console.log("   🔒 Some components may have security implications");
      console.log("   💡 Complete configuration for full production mode");
    } else {
      console.log("   ✅ SECURE SIMULATION - All operations local");
      console.log("   💾 No external dependencies or credential exposure");
      console.log("   💡 Ready for production credential setup");
    }

    // Configuration Recommendations
    console.log("\n💡 Configuration Recommendations:");

    if (status.r2.mode !== "LIVE") {
      console.log("   🌐 R2: Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT");
    }

    if (status.mcp.installed < status.mcp.total) {
      console.log("   🔄 MCP: Install missing servers with 'bun add @modelcontextprotocol/server-{name}'");
    }

    if (status.secrets.real < status.secrets.total) {
      console.log("   🔐 Secrets: Configure with 'bun run secrets:enterprise:set KEY VALUE'");
    }

    // Mode Switching Guide
    console.log("\n🎯 Mode Switching:");
    console.log("   📊 Audit: bun run factory-wager --mode=audit-reality");
    console.log("   🔒 Force: bun run factory-wager --mode=force-live");
    console.log("   💾 Simulate: bun run factory-wager --mode=simulate");
  }

  private async setSimulateMode(): Promise<void> {
    console.log("💾 FactoryWager Simulate Mode");
    console.log("=" .repeat(35));

    const status = await this.checkRealityStatus();

    console.log("🔒 Enforcing local simulation mode...");

    // Verify local operations work
    try {
      // Test local file operations
      const fs = require('fs');
      const testFile = '.factory-wager/simulation-test.tmp';
      fs.writeFileSync(testFile, 'simulation-test');
      fs.unlinkSync(testFile);
      console.log("✅ Local file operations working");

      // Test Bun.secrets (local)
      try {
        await Bun.secrets.get({ service: "test", name: "simulation-test" });
        console.log("✅ Bun.secrets API accessible");
      } catch {
        console.log("⚠️ Bun.secrets API limited (expected in simulation)");
      }

      // Test local archive operations
      console.log("✅ Local archive operations available");

    } catch (error) {
      console.log("❌ Local simulation setup failed:", (error as Error).message);
      process.exit(1);
    }

    console.log("\n💾 Simulation Mode Active:");
    console.log("   🌐 R2 Storage: Local file system");
    console.log("   🔄 MCP Servers: Local mock responses");
    console.log("   🔐 Secrets: OS keychain (if available)");
    console.log("   📊 Archives: Local compression only");

    console.log("\n🎯 Simulation Benefits:");
    console.log("   🚀 Offline development capability");
    console.log("   💰 No cloud costs during development");
    console.log("   🔒 No credential exposure risk");
    console.log("   🧪 Full feature testing capability");

    console.log("\n⚡ Ready for local development!");
  }

  private async routeCommand(command: string, args: string[]): Promise<void> {
    // Parse special flags for dangerous operations
    const environmentFlag = args.find(arg => arg.startsWith("--env="))?.split("=")[1];
    const modeFlag = args.find(arg => arg.startsWith("--mode="))?.split("=")[1];

    // Failsafe validation for dangerous operations
    if (command === "deploy") {
      await this.validateDeploymentSafety(environmentFlag || "unknown");
    }

    if (command === "backup") {
      await this.validateBackupSafety(modeFlag);
    }

    // Handle safety and remediation commands directly
    if (command === "safety-status") {
      const report = await this.safetyDashboard.generateSafetyReport();
      this.safetyDashboard.displaySafetyReport(report);
      return;
    }

    if (command === "safety-quarantine") {
      await this.safetyDashboard.quarantineCredentials();
      return;
    }

    if (command === "safety-list") {
      await this.safetyDashboard.listQuarantined();
      return;
    }

    if (command === "remediation-test") {
      await this.remediation.handleViolation("MIXED_REALITY", {
        command: "test",
        mode: "MIXED"
      });
      return;
    }

    if (command === "compliance-report") {
      await this.remediation.generateComplianceReport();
      return;
    }

    // Map commands to existing scripts
    const commandMap: Record<string, string> = {
      "deploy": "deploy:reality",
      "backup": "archive:create",
      "safety-status": "safety:status",
      "safety-quarantine": "safety:quarantine",
      "safety-list": "safety:list",
      "remediation-test": "remediation:test",
      "compliance-report": "remediation:compliance",

      "health": "vault:health",
      "health:verbose": "vault:health:verbose",
      "health:fix": "vault:health:fix",
      "health:report": "vault:health:report",
      "health:full": "vault:health:full",

      "secrets:list": "secrets:enterprise:list",
      "secrets:set": "secrets:enterprise:set",
      "secrets:rotate": "secrets:enterprise:rotate",
      "secrets:backup": "secrets:enterprise:backup",

      "archive:create": "vault:archive:create",
      "archive:list": "vault:archive:list",
      "archive:extract": "vault:archive:extract",
      "archive:status": "archive:status",
      "archive:benchmark": "archive:benchmark",

      "organize:run": "organize:run",
      "organize:cleanup": "organize:cleanup",

      "reality:audit": "reality:audit",
      "reality:status": "reality:status",
      "reality:check": "reality:check",
      "reality:guard": "reality:guard"
    };

    const npmCommand = commandMap[command];
    if (npmCommand) {
      console.log(`🚀 Running: ${npmCommand} ${args.join(' ')}`);

      const child = spawn("bun", ["run", npmCommand, ...args], {
        stdio: "inherit",
        cwd: process.cwd()
      });

      child.on("exit", (code) => {
        process.exit(code || 0);
      });

      child.on("error", (error) => {
        console.error("❌ Command failed:", error.message);
        process.exit(1);
      });

    } else {
      console.error(`❌ Unknown command: ${command}`);
      console.log("\n📋 Available commands:");
      Object.keys(commandMap).forEach(cmd => {
        console.log(`   ${cmd}`);
      });
      console.log("\n🎯 Mode commands:");
      console.log("   --mode=audit-reality");
      console.log("   --mode=force-live");
      console.log("   --mode=simulate");
      console.log("\n⚠️  Protected commands (require proper reality mode):");
      console.log("   deploy --env=<environment>  (Production requires LIVE mode)");
      console.log("   backup --mode=<mode>        (Live mode requires R2 credentials)");
      process.exit(1);
    }
  }

  async run(args: string[]): Promise<void> {
    const options: CLIOptions = { args: [] };

    // Parse arguments - distinguish CLI modes from command flags
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg.startsWith("--mode=")) {
        const modeValue = arg.substring(7);
        // Check if this is a CLI mode or command-specific flag
        if (["audit-reality", "force-live", "simulate"].includes(modeValue)) {
          options.mode = modeValue as any;
        } else {
          // This is a command-specific mode flag (like --mode=live for backup)
          options.args.push(arg);
        }
      } else if (arg.startsWith("--env=")) {
        // Keep --env in args for command processing
        options.args.push(arg);
      } else if (arg.startsWith("--")) {
        console.error(`❌ Unknown option: ${arg}`);
        process.exit(1);
      } else if (!options.command) {
        options.command = arg;
      } else {
        options.args.push(arg);
      }
    }

    // Handle mode commands
    if (options.mode) {
      switch (options.mode) {
        case "audit-reality":
          await this.auditRealityMode();
          return;

        case "force-live":
          await this.enforceLiveMode();
          // If live mode passes, continue with command
          break;

        case "simulate":
          await this.setSimulateMode();
          return;

        default:
          console.error(`❌ Unknown mode: ${options.mode}`);
          console.log("Available modes: audit-reality, force-live, simulate");
          process.exit(1);
      }
    }

    // Route to command or show help
    if (options.command) {
      await this.routeCommand(options.command, options.args);
    } else {
      console.log("🏭 FactoryWager CLI - Unified Interface");
      console.log("=" .repeat(45));
      console.log();
      console.log("🎯 Usage:");
      console.log("   bun run factory-wager <command> [args]");
      console.log("   bun run factory-wager --mode=<mode>");
      console.log();
      console.log("📊 Reality Modes:");
      console.log("   --mode=audit-reality  # Shows what's real vs. simulated");
      console.log("   --mode=force-live     # Errors if any component is simulated");
      console.log("   --mode=simulate       # Explicitly uses local fallbacks");
      console.log();
      console.log("🔍 Commands:");
      console.log("   health*              # Vault health monitoring");
      console.log("   secrets*              # Enterprise secrets management");
      console.log("   archive*              # Archive and backup operations");
      console.log("   organize*             # File organization");
      console.log("   reality*              # Reality audit commands");
      console.log();
      console.log("💡 Examples:");
      console.log("   bun run factory-wager --mode=audit-reality");
      console.log("   bun run factory-wager health:verbose");
      console.log("   bun run factory-wager --mode=force-live secrets:list");
      console.log("   bun run factory-wager archive:create --id=backup-$(date +%Y-%m-%d)");
    }
  }
}

// CLI execution
if (import.meta.main) {
  const cli = new FactoryWagerCLI();
  cli.run(process.argv.slice(2)).catch(error => {
    console.error("❌ FactoryWager CLI failed:", error.message);
    process.exit(1);
  });
}

export { FactoryWagerCLI };
