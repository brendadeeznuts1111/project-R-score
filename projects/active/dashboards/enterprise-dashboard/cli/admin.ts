#!/usr/bin/env bun
/**
 * Admin CLI for KYC Failsafe Operations
 * Usage: bun run cli/admin.ts --kyc-failsafe <userId>
 *        bun run cli/admin.ts --review-queue
 */

import { KYCFailsafeEngine } from "../src/server/kyc/failsafeEngine";
import { ReviewQueueProcessor } from "../src/server/kyc/reviewQueueProcessor";
import { KYCDashboard } from "../src/server/kyc/kycDashboard";

// Simple chalk-like color functions
const chalk = {
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
};

async function main() {
  const args = process.argv.slice(2);

  // KYC Failsafe Mode
  if (args.includes("--kyc-failsafe")) {
    const userIdIndex = args.indexOf("--kyc-failsafe");
    const userId = args[userIdIndex + 1];

    if (!userId) {
      console.error(chalk.red("❌ Please provide user ID: --kyc-failsafe <userId>"));
      process.exit(1);
    }

    console.info(chalk.cyan(`
╔══════════════════════════════════════════════════════╗
║   🛡️  DuoPlus KYC Failsafe Mode (Android 13)       ║
║   Automated Device Verification & Recovery         ║
╚══════════════════════════════════════════════════════╝
`));

    console.info(`[${new Date().toISOString()}] 🚀 Starting KYC failsafe for user: ${userId}\n`);

    try {
      const kycFailsafeEngine = new KYCFailsafeEngine();
      const result = await kycFailsafeEngine.executeFailsafe(userId, "cli_triggered");

      console.info(chalk.bold("\n📊 Failsafe Result:"));
      console.info(`  Status: ${chalk[result.status === "approved" ? "green" : result.status === "review" ? "yellow" : "red"](result.status.toUpperCase())}`);
      console.info(`  Trace ID: ${result.traceId}`);
      console.info(`  Audit Log Entries: ${result.auditLog.length}`);

      // Display audit log
      console.info(chalk.bold("\n📋 Audit Log:"));
      result.auditLog.forEach((log) => {
        console.info(`  ${chalk.gray(log)}`);
      });

      // Save compressed audit log
      const logPath = `./logs/kyc-failsafe-${result.traceId}.json`;
      await Bun.write(logPath, JSON.stringify({
        userId,
        result,
        timestamp: new Date().toISOString(),
      }, null, 2));

      console.info(chalk.gray(`\n📁 Audit log saved: ${logPath}`));
      process.exit(result.status === "rejected" ? 1 : 0);
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  }

  // Review Queue Processor
  if (args.includes("--review-queue")) {
    console.info(chalk.cyan(`
╔══════════════════════════════════════════════════════╗
║   📋 KYC Review Queue Processor                     ║
║   Processing manual review queue                    ║
╚══════════════════════════════════════════════════════╝
`));

    try {
      const processor = new ReviewQueueProcessor();
      const report = await processor.processQueue();

      console.info(chalk.bold("\n📊 Processing Report:"));
      console.info(`  Timestamp: ${report.timestamp.toISOString()}`);
      console.info(`  Processed: ${chalk.cyan(report.processed)}`);
      console.info(`  Approved: ${chalk.green(report.approved)}`);
      console.info(`  Rejected: ${chalk.red(report.rejected)}`);
      console.info(`  Errors: ${report.errors.length > 0 ? chalk.red(report.errors.length) : chalk.green("0")}`);

      if (report.errors.length > 0) {
        console.info(chalk.bold("\n⚠️  Errors:"));
        report.errors.forEach((err) => {
          console.info(`  ${chalk.red(`User ${err.userId}: ${err.error}`)}`);
        });
      }

      process.exit(0);
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  }

  // KYC Metrics
  if (args.includes("--kyc-metrics")) {
    try {
      const dashboard = new KYCDashboard();
      const metrics = dashboard.getMetrics();

      console.info(chalk.cyan(`
╔══════════════════════════════════════════════════════╗
║   📊 KYC Metrics                                    ║
╚══════════════════════════════════════════════════════╝
`));

      console.info(chalk.bold("\n📈 Statistics:"));
      console.info(`  Pending: ${chalk.yellow(metrics.pending)}`);
      console.info(`  Approved: ${chalk.green(metrics.approved)}`);
      console.info(`  Rejected: ${chalk.red(metrics.rejected)}`);
      console.info(`  High Priority: ${chalk.red(metrics.highPriority)}`);
      console.info(`  Avg Risk Score: ${chalk.cyan(metrics.avgRiskScore.toFixed(1))}`);

      process.exit(0);
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  }

  // Help
  if (args.includes("--help") || args.length === 0) {
    console.info(`
${chalk.bold("KYC Admin CLI")}

${chalk.bold("Usage:")}
  bun run cli/admin.ts --kyc-failsafe <userId>
  bun run cli/admin.ts --review-queue
  bun run cli/admin.ts --kyc-metrics
  bun run cli/admin.ts --help

${chalk.bold("Commands:")}
  --kyc-failsafe <userId>    Execute KYC failsafe for a user
  --review-queue              Process manual review queue
  --kyc-metrics               Show KYC metrics
  --help                      Show this help message
`);
    process.exit(0);
  }

  console.error(chalk.red("❌ Unknown command. Use --help for usage information."));
  process.exit(1);
}

main().catch((error) => {
  console.error(chalk.red(`Fatal error: ${error instanceof Error ? error.message : String(error)}`));
  process.exit(1);
});