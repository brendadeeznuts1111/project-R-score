// cli.ts - CLI integration for matrix automation
import { MatrixAutomation } from "./matrix-automation.js";
import type { AutomationConfig, BulkProvisionConfig, PipelineConfig } from "./matrix-automation.js";

function parseArgs(args: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};
  
  for (const arg of args) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      parsed[key] = value || "true";
    }
  }
  
  return parsed;
}

function getEnvConfig(): AutomationConfig {
  const apiKey = process.env.DUOPLUS_API_KEY;
  const enterpriseId = process.env.MATRIX_ENTERPRISE_ID;
  
  if (!apiKey || !enterpriseId) {
    throw new Error("DUOPLUS_API_KEY and MATRIX_ENTERPRISE_ID environment variables are required");
  }
  
  const config: AutomationConfig = {
    duoplus: {
      apiKey,
      apiEndpoint: process.env.DUOPLUS_API_ENDPOINT || "https://api.duoplus.net/v1",
      defaultRegion: process.env.DUOPLUS_REGION || "us-west"
    },
    matrix: {
      enterpriseId,
      gitRemote: process.env.MATRIX_GIT_REMOTE
    }
  };
  
  // Add notification config if webhooks are provided
  if (process.env.SLACK_WEBHOOK_URL || process.env.TEAMS_WEBHOOK_URL) {
    config.notifications = {};
    
    if (process.env.SLACK_WEBHOOK_URL) {
      config.notifications.slack = {
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: process.env.SLACK_CHANNEL
      };
    }
    
    if (process.env.TEAMS_WEBHOOK_URL) {
      config.notifications.teams = {
        webhookUrl: process.env.TEAMS_WEBHOOK_URL
      };
    }
  }
  
  // Add cost tracking if enabled
  if (process.env.COST_TRACKING_ENABLED === "true") {
    config.costTracking = {
      enabled: true,
      budgetLimit: process.env.BUDGET_LIMIT ? parseFloat(process.env.BUDGET_LIMIT) : undefined,
      alertThreshold: process.env.ALERT_THRESHOLD ? parseFloat(process.env.ALERT_THRESHOLD) : undefined
    };
  }
  
  return config;
}

export async function automationCLI(args: string[]): Promise<void> {
  const config = getEnvConfig();
  const auto = new MatrixAutomation(config);
  const cmd = args[0];

  try {
    switch (cmd) {
      case "signup": {
        // matrix auto signup <email> <password> [company]
        if (args.length < 3) {
          console.error("Usage: matrix auto signup <email> <password> [company]");
          process.exit(1);
        }
        await auto.signupDuoPlus(args[1], args[2], args[3]);
        break;
      }

      case "provision": {
        // matrix auto provision --profile=prod --count=5 --region=eu-west --os=android --android-version=12B
        const opts = parseArgs(args.slice(1));
        await auto.provisionDevice({
          profile: opts.profile,
          count: parseInt(opts.count || "1"),
          region: opts.region,
          os: opts.os as "android" | "ios" | undefined,
          androidVersion: opts["android-version"] as "10" | "11" | "12B" | undefined
        });
        break;
      }

      case "configure": {
        // matrix auto configure <device-id> <profile>
        if (args.length < 3) {
          console.error("Usage: matrix auto configure <device-id> <profile>");
          process.exit(1);
        }
        await auto.configureDevice(args[1], args[2]);
        break;
      }

      case "2fa": {
        // matrix auto 2fa <device-id> <service> [timeout]
        if (args.length < 3) {
          console.error("Usage: matrix auto 2fa <device-id> <service> [timeout]");
          process.exit(1);
        }
        const timeout = args[3] ? parseInt(args[3]) : 60000;
        const code = await auto.getVerificationCode(args[1], args[2], timeout as unknown as number  );
        console.log(`Code: ${code}`);
        break;
      }

      case "bulk": {
        // matrix auto bulk --config=devices.json
        const opts = parseArgs(args.slice(1));
        const configPath = opts.config || "devices.json";
        const bulkConfig: BulkProvisionConfig[] = await Bun.file(configPath).json();
        await auto.bulkProvision(bulkConfig);
        break;
      }

      case "test": {
        // matrix auto test <device-id> <test-profile>
        if (args.length < 3) {
          console.error("Usage: matrix auto test <device-id> <test-profile>");
          process.exit(1);
        }
        const result = await auto.runTestSuite(args[1], args[2]);
        console.log(`\nTest Results:`);
        console.log(`  Passed: ${result.passed ? "✓" : "✗"}`);
        console.log(`  Failures: ${result.failures}`);
        if (result.screenshot) {
          console.log(`  Screenshot: ${result.screenshot}`);
        }
        break;
      }

      case "decommission": {
        // matrix auto decommission <device-id>
        if (args.length < 2) {
          console.error("Usage: matrix auto decommission <device-id>");
          process.exit(1);
        }
        await auto.decommissionDevice(args[1]);
        break;
      }

      case "pipeline": {
        // matrix auto pipeline --config=pipeline.json
        const opts = parseArgs(args.slice(1));
        const configPath = opts.config || "pipeline.json";
        const pipeline: PipelineConfig = await Bun.file(configPath).json();
        await auto.runPipeline(pipeline);
        break;
      }

      case "cost": {
        // matrix auto cost [period]
        const period = (args[1] as "day" | "week" | "month") || "month";
        const report = await auto.getCostReport(period);
        
        console.log(`\n💰 Cost Report (${period}):`);
        console.log(`  Total: $${report.total.toFixed(2)}`);
        console.log(`\n  By Region:`);
        for (const [region, cost] of Object.entries(report.byRegion)) {
          console.log(`    ${region}: $${cost.toFixed(2)}`);
        }
        console.log(`\n  Top 10 Devices:`);
        const topDevices = report.breakdown
          .sort((a, b) => b.cost - a.cost)
          .slice(0, 10);
        console.log(Bun.inspect.table(
          topDevices.map(d => ({
            device: d.deviceId,
            cost: `$${d.cost.toFixed(2)}`,
            region: d.region,
            date: d.timestamp.toISOString().split("T")[0]
          })),
          undefined,
          { colors: true }
        ));
        break;
      }

      default: {
        console.log(`
Matrix Automation CLI

Usage: matrix auto <command> [options]

Commands:
  signup <email> <password> [company]
    Create DuoPlus account and store API key

  provision [options]
    Provision device(s)
    Options:
      --profile=<name>     Profile name
      --count=<n>          Number of devices (default: 1)
      --region=<region>    Region (default: us-west)
      --os=<android|ios>   OS type (default: android)
      --android-version=<10|11|12B>  Android version (default: 12B)

  configure <device-id> <profile>
    Configure device with profile

  2fa <device-id> <service> [timeout]
    Get verification code from device

  bulk --config=<file>
    Bulk provision from config file

  test <device-id> <test-profile>
    Run test suite on device

  decommission <device-id>
    Remove device and clean up

  pipeline --config=<file>
    Run full automation pipeline

  cost [period]
    Show cost report (day|week|month)

Environment Variables:
  DUOPLUS_API_KEY          DuoPlus API key
  MATRIX_ENTERPRISE_ID     Matrix enterprise ID
  DUOPLUS_API_ENDPOINT     API endpoint (optional)
  DUOPLUS_REGION           Default region (optional)
  SLACK_WEBHOOK_URL        Slack webhook (optional)
  TEAMS_WEBHOOK_URL        Teams webhook (optional)
  COST_TRACKING_ENABLED    Enable cost tracking (true/false)
  BUDGET_LIMIT             Monthly budget limit (optional)
  ALERT_THRESHOLD          Alert threshold % (optional)
        `);
        process.exit(1);
      }
    }
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Main entry point
if (import.meta.main) {
  const args = process.argv.slice(2);
  automationCLI(args).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
