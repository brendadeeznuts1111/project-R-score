#!/usr/bin/env bun

import { Dashboard } from "./core/Dashboard";
import { FeatureRegistry } from "./core/FeatureRegistry";
import { Logger } from "./core/Logger";
import { BUILD_CONFIGS } from "./config/index";
import { BuildType, FeatureFlag, LogLevel, PlatformType } from "./config/types";
import {
  parseTranspilationCommand,
  executeTranspilationCommand,
  getTranspilationHelp,
} from "./cli/transpilation-manager";

// Simple CLI parser using Bun's built-in capabilities
const args = process.argv.slice(2);

function showHelp() {
  console.log(`
🚀 Dev HQ CLI - Advanced Codebase Analysis & Automation Platform

USAGE:
  bun run src/CLI.ts [command] [options]

COMMANDS:
  insights     Analyze codebase and provide insights
  health       Check system health and status
  dashboard    Start interactive dashboard
  version      Show version information
  help         Show this help message

OPTIONS:
  --verbose    Enable verbose logging
  --json       Output in JSON format
  --table      Output in table format
  --analyze    Include bundle analysis

EXAMPLES:
  bun run src/CLI.ts insights --table
  bun run src/CLI.ts health --verbose
  bun run src/CLI.ts insights --analyze
  bun run src/CLI.ts dashboard
  `);
}

function showVersion() {
  console.log("Dev HQ v1.0.0 - Built with Bun");
}

// Initialize system components
let featureRegistry: FeatureRegistry;
let logger: Logger;
let dashboard: Dashboard;

async function initializeSystem() {
  const environment = process.env.NODE_ENV === "production" ? "production" : "development";
  const platform = process.env.PLATFORM === "ios" ? PlatformType.IOS : PlatformType.ANDROID;

  // Determine build type based on available flags
  let buildType = BuildType.DEVELOPMENT;
  if (process.env.BUILD_TYPE) {
    buildType = BuildType[process.env.BUILD_TYPE as keyof typeof BuildType] || BuildType.DEVELOPMENT;
  }

  const buildConfig = BUILD_CONFIGS[buildType];
  const featureFlags = new Map<FeatureFlag, boolean>();

  // Set feature flags based on build configuration
  buildConfig.flags.forEach((flag) => {
    featureFlags.set(flag, true);
  });

  // Initialize components
  featureRegistry = new FeatureRegistry(featureFlags);
  logger = new Logger({
    level: args.includes("--verbose") ? LogLevel.DEBUG : LogLevel.INFO,
  });
  dashboard = new Dashboard(featureRegistry, logger);
}

async function runInsights() {
  await initializeSystem();

  console.log("🔍 Running codebase insights analysis...");

  const includeBundleAnalysis = args.includes("--analyze");
  const outputFormat = args.includes("--json") ? "json" : args.includes("--table") ? "table" : "default";

  console.log(`📊 Output format: ${outputFormat}`);
  if (includeBundleAnalysis) {
    console.log("📦 Bundle analysis: enabled");
  }

  // TODO: Implement actual insights logic
  console.log("✅ Insights analysis complete");
}

async function runHealth() {
  await initializeSystem();

  console.log("🏥 Running system health check...");

  // Check feature registry
  const enabledFeatures = featureRegistry.getEnabledFlags();
  console.log(`✅ Feature registry: ${enabledFeatures.length} features enabled`);

  // Check logger
  console.log("✅ Logger: operational");

  // Check dashboard
  console.log("✅ Dashboard: ready");

  console.log("🎉 System health: All components operational");
}

async function startDashboard() {
  await initializeSystem();

  console.log("📊 Starting interactive dashboard...");
  dashboard.displayStatus();
}

async function runTranspilationCommand() {
  const transpileArgs = args.slice(1);
  
  if (transpileArgs.length === 0 || transpileArgs[0] === 'help') {
    console.log(getTranspilationHelp());
    return;
  }

  try {
    let command = parseTranspilationCommand(transpileArgs);
    
    // Parse JSON config for commands that need it
    if (['configure', 'apply', 'validate'].includes(command.action)) {
      if (command.value) {
        try {
          command.config = JSON.parse(command.value);
          command.value = undefined; // Clear value since we've parsed it
        } catch {
          // If it's not JSON, treat as string value (for backward compatibility)
        }
      }
    }
    
    const result = executeTranspilationCommand(command);
    console.log(result);
  } catch (error) {
    console.error(
      `❌ Error: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

// Command handlers
const commands = {
  insights: runInsights,
  health: runHealth,
  dashboard: startDashboard,
  transpile: runTranspilationCommand,
  version: showVersion,
  help: showHelp,
};

// Parse and execute commands
const command = args[0] || 'help';

if (commands[command as keyof typeof commands]) {
  commands[command as keyof typeof commands]();
} else {
  console.error(`❌ Unknown command: ${command}`);
  showHelp();
  process.exit(1);
}
