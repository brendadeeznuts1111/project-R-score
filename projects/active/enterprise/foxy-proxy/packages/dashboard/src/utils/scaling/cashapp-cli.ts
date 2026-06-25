#!/usr/bin/env bun
// CashApp Scaling Pipeline CLI
// Command-line interface for CashApp account management and scaling

import { CashAppProvisioner, CashAppAccountManager, CashAppRiskMonitor } from "./cashapp-pipeline";
import { CashAppNameGenerator } from "./cashapp-name-generator";
import { CashAppAddressGenerator, CashAppLocationMatcher } from "./cashapp-address-generator";

interface CLIOptions {
  count?: number;
  emailProvider?: "custom" | "usesms" | "gmail";
  areaCode?: string;
  output?: "json" | "table";
  verbose?: boolean;
}

class CashAppCLI {
  private provisioner: CashAppProvisioner;
  private accountManager: CashAppAccountManager;
  private riskMonitor: CashAppRiskMonitor;
  private nameGenerator: CashAppNameGenerator;
  private addressGenerator: CashAppAddressGenerator;
  private locationMatcher: CashAppLocationMatcher;

  constructor() {
    this.provisioner = new CashAppProvisioner();
    this.accountManager = new CashAppAccountManager();
    this.riskMonitor = new CashAppRiskMonitor();
    this.nameGenerator = new CashAppNameGenerator();
    this.addressGenerator = new CashAppAddressGenerator();
    this.locationMatcher = new CashAppLocationMatcher();
  }

  async runCommand(command: string, args: string[]): Promise<void> {
    const options = this.parseOptions(args);

    try {
      switch (command) {
        case "demo":
          await this.runDemo(options);
          break;
        case "provision":
          await this.provisionAccounts(options);
          break;
        case "monitor":
          await this.monitorAccounts(options);
          break;
        case "report":
          await this.generateReport(options);
          break;
        case "names":
          await this.generateNames(options);
          break;
        case "addresses":
          await this.generateAddresses(options);
          break;
        default:
          this.showHelp();
      }
    } catch (error) {
      console.error(`❌ Error executing ${command}:`, error);
      process.exit(1);
    }
  }

  private parseOptions(args: string[]): CLIOptions {
    const options: CLIOptions = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      switch (arg) {
        case "--count":
        case "-c":
          options.count = parseInt(args[++i]) || 5;
          break;
        case "--email-provider":
        case "-e":
          options.emailProvider = args[++i] as "custom" | "usesms" | "gmail";
          break;
        case "--area-code":
        case "-a":
          options.areaCode = args[++i];
          break;
        case "--output":
        case "-o":
          options.output = args[++i] as "json" | "table";
          break;
        case "--verbose":
        case "-v":
          options.verbose = true;
          break;
        case "--help":
        case "-h":
          this.showHelp();
          process.exit(0);
      }
    }

    return options;
  }

  private async runDemo(options: CLIOptions): Promise<void> {
    console.info("🚀 CashApp Scaling Pipeline Demo");
    console.info("=".repeat(50));

    if (options.verbose) {
      console.info("📋 Configuration:");
      console.info(`  Verbose: ${options.verbose}`);
      console.info(`  Output: ${options.output || "table"}`);
      console.info("");
    }

    await this.provisioner.demonstratePipeline();
  }

  private async provisionAccounts(options: CLIOptions): Promise<void> {
    const count = options.count || 5;
    const emailProvider = options.emailProvider || "custom";
    const areaCode = options.areaCode || "213";

    console.info(`🏭 Provisioning ${count} CashApp accounts`);
    console.info(`   Email Provider: ${emailProvider}`);
    console.info(`   Area Code: ${areaCode}`);
    console.info("=".repeat(50));

    if (options.verbose) {
      console.info("🔧 Starting account provisioning...");
      console.info("");
    }

    const startTime = Date.now();
    const results = await this.provisioner.batchProvisionAccounts(count, emailProvider);
    const duration = Date.now() - startTime;

    const successCount = results.filter((r) => r.status === "success").length;
    const failureCount = results.filter((r) => r.status === "failed").length;

    console.info("\n📊 Provisioning Results:");
    console.info(`   Total: ${count}`);
    console.info(`   ✅ Success: ${successCount}`);
    console.info(`   ❌ Failed: ${failureCount}`);
    console.info(`   ⏱️ Duration: ${duration}ms`);

    if (options.output === "json") {
      console.info("\n📄 JSON Output:");
      console.info(JSON.stringify(results, null, 2));
    } else if (options.verbose) {
      console.info("\n📋 Detailed Results:");
      results.forEach((result, index) => {
        const status = result.status === "success" ? "✅" : "❌";
        console.info(`   ${index + 1}. ${status} ${result.deviceId || "N/A"}`);
        if (result.status === "failed") {
          console.info(`      Error: ${result.error}`);
        } else {
          console.info(`      Email: ${result.email}`);
          console.info(`      Phone: ${result.phoneNumber}`);
          console.info(`      Cashtag: ${result.cashtag}`);
        }
      });
    }

    // Save results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `cashapp-provision-${timestamp}.json`;
    await Bun.write(filename, JSON.stringify(results, null, 2));
    console.info(`\n💾 Results saved to: ${filename}`);
  }

  private async monitorAccounts(options: CLIOptions): Promise<void> {
    console.info("🔍 Monitoring Account Health");
    console.info("=".repeat(50));

    if (options.verbose) {
      console.info("🔧 Starting health monitoring...");
      console.info("");
    }

    // Mock device IDs for demonstration
    const deviceIds = ["device-1", "device-2", "device-3", "device-4", "device-5"].slice(
      0,
      options.count || 5
    );

    const startTime = Date.now();
    const results = await this.riskMonitor.batchAccountHealthCheck(deviceIds);
    const summary = this.riskMonitor.getRiskSummary(results);
    const duration = Date.now() - startTime;

    console.info("\n📊 Health Monitoring Results:");
    console.info(`   Total Accounts: ${summary.totalAccounts}`);
    console.info(`   ✅ Healthy: ${summary.healthyAccounts}`);
    console.info(`   ⚠️ At Risk: ${summary.atRiskAccounts}`);
    console.info(`   ❌ Critical: ${summary.criticalAccounts}`);
    console.info(`   📈 Average Risk: ${summary.averageRiskScore}/100`);
    console.info(`   ⏱️ Duration: ${duration}ms`);

    if (Object.keys(summary.commonFlags).length > 0) {
      console.info("\n🚨 Common Risk Flags:");
      Object.entries(summary.commonFlags).forEach(([flag, count]) => {
        console.info(`   ${flag}: ${count} accounts`);
      });
    }

    if (options.output === "json") {
      console.info("\n📄 JSON Output:");
      console.info(JSON.stringify({ summary, details: results }, null, 2));
    } else if (options.verbose) {
      console.info("\n📋 Detailed Results:");
      results.forEach((result, index) => {
        const status =
          result.recommendedAction === "continue"
            ? "✅"
            : result.recommendedAction === "pause"
              ? "⚠️"
              : "❌";
        console.info(`   ${index + 1}. ${status} ${result.deviceId}`);
        console.info(`      Risk Score: ${result.riskScore}/100`);
        console.info(`      Flags: ${result.flags.join(", ") || "None"}`);
        console.info(`      Action: ${result.recommendedAction.toUpperCase()}`);
      });
    }

    // Save results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `cashapp-monitor-${timestamp}.json`;
    await Bun.write(filename, JSON.stringify({ summary, details: results }, null, 2));
    console.info(`\n💾 Results saved to: ${filename}`);
  }

  private async generateReport(options: CLIOptions): Promise<void> {
    console.info("📊 Generating Risk Report");
    console.info("=".repeat(50));

    // Mock device IDs
    const deviceIds = [
      "device-1",
      "device-2",
      "device-3",
      "device-4",
      "device-5",
      "device-6",
      "device-7",
      "device-8",
      "device-9",
      "device-10"
    ].slice(0, options.count || 10);

    if (options.verbose) {
      console.info(`🔧 Analyzing ${deviceIds.length} accounts...`);
      console.info("");
    }

    const report = await this.accountManager.getHealthReport(deviceIds);

    console.info("\n📊 Risk Assessment Report:");
    console.info(`   Generated: ${new Date().toISOString()}`);
    console.info(`   Total Accounts: ${report.summary.totalAccounts}`);
    console.info(
      `   Healthy: ${report.summary.healthyAccounts} (${Math.round((report.summary.healthyAccounts / report.summary.totalAccounts) * 100)}%)`
    );
    console.info(
      `   At Risk: ${report.summary.atRiskAccounts} (${Math.round((report.summary.atRiskAccounts / report.summary.totalAccounts) * 100)}%)`
    );
    console.info(
      `   Critical: ${report.summary.criticalAccounts} (${Math.round((report.summary.criticalAccounts / report.summary.totalAccounts) * 100)}%)`
    );
    console.info(`   Average Risk Score: ${report.summary.averageRiskScore}/100`);

    if (Object.keys(report.summary.commonFlags).length > 0) {
      console.info("\n🚨 Risk Flag Analysis:");
      const sortedFlags = Object.entries(report.summary.commonFlags).sort(([, a], [, b]) => b - a);

      sortedFlags.forEach(([flag, count], index) => {
        const percentage = Math.round((count / report.summary.totalAccounts) * 100);
        console.info(`   ${index + 1}. ${flag}: ${count} accounts (${percentage}%)`);
      });
    }

    // Risk distribution
    const riskDistribution = {
      low: report.details.filter((d) => d.riskScore <= 25).length,
      medium: report.details.filter((d) => d.riskScore > 25 && d.riskScore <= 50).length,
      high: report.details.filter((d) => d.riskScore > 50 && d.riskScore <= 75).length,
      critical: report.details.filter((d) => d.riskScore > 75).length
    };

    console.info("\n📈 Risk Distribution:");
    console.info(`   Low (0-25): ${riskDistribution.low} accounts`);
    console.info(`   Medium (26-50): ${riskDistribution.medium} accounts`);
    console.info(`   High (51-75): ${riskDistribution.high} accounts`);
    console.info(`   Critical (76-100): ${riskDistribution.critical} accounts`);

    // Save detailed report
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `cashapp-report-${timestamp}.json`;
    await Bun.write(filename, JSON.stringify(report, null, 2));
    console.info(`\n💾 Detailed report saved to: ${filename}`);

    // Generate CSV summary
    const csvData = this.generateCSVReport(report);
    const csvFilename = `cashapp-report-${timestamp}.csv`;
    await Bun.write(csvFilename, csvData);
    console.info(`📊 CSV summary saved to: ${csvFilename}`);
  }

  private async generateNames(options: CLIOptions): Promise<void> {
    const count = options.count || 10;

    console.info(`👤 Generating ${count} CashApp Names`);
    console.info("=".repeat(50));

    if (options.verbose) {
      console.info("🔧 Generating realistic US names...");
      console.info("");
    }

    const startTime = Date.now();
    const profiles = await this.nameGenerator.generateBatch(count);
    const duration = Date.now() - startTime;

    console.info(`\n⚡ Generated ${count} names in ${duration}ms`);

    if (options.output === "json") {
      console.info("\n📄 JSON Output:");
      console.info(JSON.stringify(profiles, null, 2));
    } else {
      console.info("\n📋 Generated Names:");
      profiles.forEach((profile, index) => {
        console.info(`   ${index + 1}. ${profile.firstName} ${profile.lastName}`);
        console.info(`      Cashtag: ${profile.cashtag}`);
        console.info(`      Email: ${profile.email}`);
        console.info(
          `      Age: ${profile.demographic.age} (Born: ${profile.demographic.birthYear})`
        );
      });
    }

    // Save to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `cashapp-names-${timestamp}.json`;
    await Bun.write(filename, JSON.stringify(profiles, null, 2));
    console.info(`\n💾 Names saved to: ${filename}`);
  }

  private async generateAddresses(options: CLIOptions): Promise<void> {
    const count = options.count || 10;
    const areaCode = options.areaCode || "213";

    console.info(`🏠 Generating ${count} CashApp Addresses`);
    console.info(`   Area Code: ${areaCode}`);
    console.info("=".repeat(50));

    if (options.verbose) {
      console.info("🔧 Generating location-aware addresses...");
      console.info("");
    }

    const location = this.locationMatcher.getLocation(areaCode);
    console.info(`📍 Location: ${location.city}, ${location.state}`);

    const startTime = Date.now();
    const addresses = [];

    for (let i = 0; i < count; i++) {
      const profile = await this.addressGenerator.generateFullProfile(location);
      addresses.push(profile);
    }

    const duration = Date.now() - startTime;

    console.info(`\n⚡ Generated ${count} addresses in ${duration}ms`);

    if (options.output === "json") {
      console.info("\n📄 JSON Output:");
      console.info(JSON.stringify(addresses, null, 2));
    } else {
      console.info("\n📋 Generated Addresses:");
      addresses.forEach((profile, index) => {
        console.info(`   ${index + 1}. ${profile.name.firstName} ${profile.name.lastName}`);
        console.info(`      Address: ${profile.address.fullAddress}`);
        console.info(`      Age: ${profile.demo.age} (Born: ${profile.demo.birthYear})`);
      });
    }

    // Save to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `cashapp-addresses-${timestamp}.json`;
    await Bun.write(filename, JSON.stringify(addresses, null, 2));
    console.info(`\n💾 Addresses saved to: ${filename}`);
  }

  private generateCSVReport(report: {
    details: Array<{
      deviceId: string;
      riskScore: number;
      recommendedAction: string;
      flags: string[];
      lastChecked: Date | string;
    }>;
  }): string {
    const headers = ["Device ID", "Risk Score", "Recommended Action", "Flags", "Last Checked"];

    const rows = report.details.map((detail) => [
      detail.deviceId,
      detail.riskScore,
      detail.recommendedAction,
      detail.flags.join(";"),
      detail.lastChecked instanceof Date ? detail.lastChecked.toISOString() : detail.lastChecked
    ]);

    return [headers, ...rows].map((row) => row.join(",")).join("\n");
  }

  private showHelp(): void {
    console.info(`
🚀 CashApp Scaling Pipeline CLI

USAGE:
  bun run cashapp-cli.ts <command> [options]

COMMANDS:
  demo              Run complete pipeline demonstration
  provision         Provision CashApp accounts
  monitor           Monitor account health
  report            Generate risk assessment report
  names             Generate CashApp names
  addresses         Generate CashApp addresses

OPTIONS:
  --count, -c       Number of items to generate (default: 5)
  --email-provider, -e  Email provider: custom|usesms|gmail (default: custom)
  --area-code, -a   Area code for geographic consistency (default: 213)
  --output, -o      Output format: json|table (default: table)
  --verbose, -v     Enable verbose logging
  --help, -h        Show this help message

EXAMPLES:
  # Run demonstration
  bun run cashapp-cli.ts demo --verbose

  # Provision 10 accounts
  bun run cashapp-cli.ts provision --count 10 --email-provider custom

  # Monitor account health
  bun run cashapp-cli.ts monitor --count 20 --output json

  # Generate risk report
  bun run cashapp-cli.ts report --count 50 --verbose

  # Generate names for specific area
  bun run cashapp-cli.ts names --count 15 --area-code 415

  # Generate addresses with JSON output
  bun run cashapp-cli.ts addresses --count 10 --output json

CONFIGURATION:
  Set environment variables for production use:
  - DUOPLUS_API_KEY: Your DuoPlus API key
  - CASHAPP_EMAIL_DOMAIN: Custom email domain
  - CASHAPP_BATCH_SIZE: Default batch size

For more information, see the documentation:
  https://github.com/yourusername/foxy-proxy/docs/cashapp-pipeline-guide.md
`);
  }
}

// Main execution
async function main() {
  const argv = process.argv.slice(2);
  const rawCommand = argv[0];
  const args = argv.slice(1);

  if (!rawCommand) {
    console.error("❌ No command specified. Use --help for usage information.");
    process.exit(1);
  }

  const flagToCommand: Record<string, string> = {
    "--demo": "demo",
    "--provision": "provision",
    "--monitor": "monitor",
    "--report": "report",
    "--names": "names",
    "--addresses": "addresses",
    "--help": "help",
    "-h": "help"
  };

  const command = flagToCommand[rawCommand] ?? rawCommand;

  const cli = new CashAppCLI();
  await cli.runCommand(command, args);
}

// Run if called directly
if (import.meta.main) {
  main().catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
}

export { CashAppCLI };
