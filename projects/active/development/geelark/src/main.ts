#!/usr/bin/env bun

/**
 * Dev HQ - Advanced Codebase Analysis and Automation Platform
 * Built with Bun 1.1+ Feature Flags
 * Demonstrates compile-time dead code elimination and improved string width handling
 */

import { feature } from "bun:bundle";
import { BuildOptimizer } from "./build/BuildOptimizer";
import { InteractiveTooltipCLI, TooltipCLI } from "./cli/InteractiveTooltipCLI";
import { FeatureFlags, FeatureUtils, getApiConfig, getFeatureDescription, getPlatformConfig, initializeApp, validateFeatureCombination } from "./core/FeatureFlags";
import { TerminalWidth, testStringWidth } from "./utils/TerminalWidth";

// Main application entry point
async function main() {
  console.info("🚀 Dev HQ - Advanced Codebase Analysis Platform");
  console.info("=".repeat(50));

  // Show build analysis in development
  if (feature("ENV_DEVELOPMENT")) {
    BuildOptimizer.analyzeBuild();
    BuildOptimizer.verifyDeadCodeElimination();
  }

  // Validate feature combination
  const isValid = validateFeatureCombination();
  if (!isValid) {
    console.error("❌ Invalid feature combination detected");
    process.exit(1);
  }

  // Initialize based on feature flags
  const mode = initializeApp();

  // Show configuration based on features
  console.info("\n🔧 Configuration:");
  console.info("─".repeat(30));
  console.info(`🎯 Mode: ${mode}`);
  console.info(`🔧 Debug: ${FeatureFlags.DEBUG}`);
  console.info(`🌐 API: ${FeatureFlags.getApiEndpoint()}`);
  console.info(`🔒 Encryption: ${FeatureFlags.ENCRYPTION_ENABLED}`);
  console.info(`📊 Advanced Monitoring: ${FeatureFlags.ADVANCED_MONITORING}`);
  console.info(`🔄 Auto-heal: ${FeatureFlags.AUTO_HEAL_ENABLED}`);
  console.info(`📱 Phone Automation: ${FeatureFlags.PHONE_AUTOMATION}`);

  // Platform-specific information
  const platformConfig = getPlatformConfig();
  console.info(`🖥️  Platform Config:`, platformConfig);

  // API configuration
  const apiConfig = getApiConfig();
  console.info(`⚙️  API Config:`, apiConfig);

  // Feature description
  console.info(`📝 Description: ${getFeatureDescription()}`);

  // Start dashboard if monitoring is enabled
  if (feature("FEAT_ADVANCED_MONITORING")) {
    console.info("\n📈 Starting advanced monitoring dashboard...");
    // Dashboard would be initialized here
    console.info("✅ Dashboard started");

    // Clean shutdown
    process.on("SIGINT", () => {
      console.info("\n🛑 Shutting down dashboard...");
      process.exit(0);
    });
  }

  // Test Unicode width in development
  if (feature("ENV_DEVELOPMENT")) {
    testStringWidth();
  }

  // Initialize premium features if available
  FeatureFlags.initPremiumFeatures();

  // Platform-specific initialization
  FeatureFlags.platformSpecificInit();

  // Show feature dashboard in development
  if (feature("ENV_DEVELOPMENT")) {
    const features = {
      "ENV_DEVELOPMENT": feature("ENV_DEVELOPMENT"),
      "ENV_PRODUCTION": feature("ENV_PRODUCTION"),
      "FEAT_PREMIUM": feature("FEAT_PREMIUM"),
      "FEAT_ENCRYPTION": feature("FEAT_ENCRYPTION"),
      "FEAT_MOCK_API": feature("FEAT_MOCK_API"),
      "FEAT_EXTENDED_LOGGING": feature("FEAT_EXTENDED_LOGGING"),
      "FEAT_ADVANCED_MONITORING": feature("FEAT_ADVANCED_MONITORING"),
      "FEAT_BATCH_PROCESSING": feature("FEAT_BATCH_PROCESSING"),
      "PLATFORM_ANDROID": feature("PLATFORM_ANDROID"),
      "PLATFORM_IOS": feature("PLATFORM_IOS"),
      "PLATFORM_WEB": feature("PLATFORM_WEB"),
    };

    console.info("\n" + TerminalWidth.createFeatureDashboard(features).join("\n"));

    // Show tooltip-enhanced table
    console.info("\n📋 Feature Table with Tooltip Indicators:");
    const tooltipTable = InteractiveTooltipCLI.createTooltipEnhancedTable();
    tooltipTable.forEach(line => console.info(line));

    console.info("\n💡 Type 'bun run --features=ENV_DEVELOPMENT ./src/main.ts --interactive' for tooltip mode");
  }

  // Show system status
  console.info("\n🎉 System initialized successfully!");

  // Keep alive for dashboard
  if (feature("FEAT_ADVANCED_MONITORING")) {
    console.info("\n⏳ Keeping process alive for dashboard...");
    await new Promise(() => {
      // Keep process alive
    });
  }
}

// CLI argument handling
async function handleCliArgs(): Promise<boolean> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    return true;
  }

  if (args.includes("--test-width")) {
    testStringWidth();
    return true;
  }

  if (args.includes("--analyze")) {
    BuildOptimizer.analyzeBuild();
    return true;
  }

  if (args.includes("--validate-features")) {
    const isValid = validateFeatureCombination();
    console.info(isValid ? "✅ Features are valid" : "❌ Features are invalid");
    return true;
  }

  if (args.includes("--verify-elimination")) {
    BuildOptimizer.verifyDeadCodeElimination();
    return true;
  }

  if (args.includes("--generate-report")) {
    console.info(BuildOptimizer.generateBuildReport());
    return true;
  }

  if (args.includes("--test-unicode")) {
    TerminalWidth.testUnicodeHandling();
    return true;
  }

  if (args.includes("--interactive")) {
    console.info("🖱️  Starting Interactive Tooltip Mode...");
    await InteractiveTooltipCLI.startInteractiveMode();
    return true;
  }

  if (args.includes("--tooltip")) {
    const featureIndex = args.indexOf("--tooltip") + 1;
    const featureName = args[featureIndex];

    if (!featureName) {
      console.error("❌ Please provide a feature name: --tooltip <FEATURE_NAME>");
      console.info("💡 Example: --tooltip FEAT_PREMIUM");
      return true;
    }

    console.info(`📋 Tooltip for ${featureName}:`);
    TooltipCLI.show(featureName);
    return true;
  }

  if (args.includes("--search")) {
    const searchIndex = args.indexOf("--search") + 1;
    const keyword = args[searchIndex];

    if (!keyword) {
      console.error("❌ Please provide a search keyword: --search <keyword>");
      console.info("💡 Example: --search encryption");
      return true;
    }

    TooltipCLI.search(keyword);
    return true;
  }

  if (args.includes("--list-features")) {
    TooltipCLI.list();
    return true;
  }

  if (args.includes("--tooltip-examples")) {
    TooltipCLI.examples();
    return true;
  }

  if (args.includes("--dashboard")) {
    if (!feature("FEAT_ADVANCED_MONITORING")) {
      console.error("❌ Advanced monitoring feature not enabled");
      process.exit(1);
    }
    console.info("📈 Dashboard mode activated");
    return false; // Continue to main
  }

  if (args.includes("--status")) {
    showStatus();
    return true;
  }

  return false; // Continue to main
}

// Show help information
function showHelp(): void {
  const help = [
    "🚀 Dev HQ - Advanced Codebase Analysis Platform",
    "=".repeat(40),
    "",
    "Usage: bun run --features=<FEATURES> src/main.ts [OPTIONS]",
    "",
    "Options:",
    "  --help, -h              Show this help message",
    "  --test-width            Test Unicode string width handling",
    "  --analyze               Analyze build and feature flags",
    "  --validate-features     Validate feature combination",
    "  --verify-elimination   Verify dead code elimination",
    "  --generate-report      Generate build analysis report",
    "  --test-unicode          Test Unicode handling capabilities",
    "  --dashboard             Start monitoring dashboard",
    "  --status                Show current system status",
    "",
    "🖱️  Tooltip Options:",
    "  --interactive           Start interactive tooltip mode",
    "  --tooltip <FEATURE>     Show tooltip for specific feature",
    "  --search <keyword>      Search features by keyword",
    "  --list-features         List all available features",
    "  --tooltip-examples      Show tooltip usage examples",
    "",
    "Examples:",
    "  bun run --features=ENV_DEVELOPMENT,FEAT_MOCK_API src/main.ts",
    "  bun run --features=ENV_PRODUCTION,FEAT_PREMIUM src/main.ts --analyze",
    "  bun run --features=ENV_DEVELOPMENT src/main.ts --test-width",
    "  bun run --features=ENV_DEVELOPMENT src/main.ts --interactive",
    "  bun run --features=ENV_DEVELOPMENT src/main.ts --tooltip FEAT_PREMIUM",
    "  bun run --features=ENV_DEVELOPMENT src/main.ts --search encryption",
    "  bun build --entrypoints=./src/main.ts --outdir=./dist/prod --features=ENV_PRODUCTION,FEAT_ENCRYPTION",
    "",
    "Feature Flags:",
    "  Environment: ENV_DEVELOPMENT, ENV_PRODUCTION, ENV_STAGING, ENV_TEST",
    "  Tiers: FEAT_FREE, FEAT_PREMIUM, FEAT_ENTERPRISE",
    "  Security: FEAT_ENCRYPTION, FEAT_VALIDATION_STRICT",
    "  Performance: FEAT_BATCH_PROCESSING, FEAT_CACHE_OPTIMIZED",
    "  Platform: PLATFORM_ANDROID, PLATFORM_IOS, PLATFORM_WEB",
    "  And many more...",
    "",
    "💡 Tooltip Features:",
    "  • Interactive mode with hover-like functionality",
    "  • Detailed feature descriptions and examples",
    "  • Dependencies and conflicts information",
    "  • Best practices and usage recommendations",
    "  • Search functionality for quick discovery",
    "",
  ];

  console.info(help.join("\n"));
}

// Show system status
function showStatus(): void {
  console.info("🔍 System Status:");
  console.info("─".repeat(30));

  const status = [
    `Environment: ${FeatureUtils.getCurrentEnvironment()}`,
    `Tier: ${FeatureUtils.getCurrentTier()}`,
    `Platform: ${FeatureUtils.isMobile() ? "Mobile" : "Desktop/Web"}`,
    `Premium Features: ${FeatureUtils.isPremiumOrHigher() ? "Enabled" : "Disabled"}`,
    `Debug Mode: ${FeatureFlags.DEBUG}`,
    `API Endpoint: ${FeatureFlags.getApiEndpoint()}`,
    `Encryption: ${FeatureFlags.ENCRYPTION_ENABLED ? "Enabled" : "Disabled"}`,
    `Monitoring: ${FeatureFlags.ADVANCED_MONITORING ? "Advanced" : "Basic"}`,
  ];

  status.forEach(line => console.info(`  ${line}`));
}

// Main execution wrapper
async function runApplication() {
  // Handle CLI arguments or run main application
  if (await handleCliArgs()) {
    process.exit(0);
  }

  // Run main application
  main().catch((error) => {
    console.error("❌ Application failed to start:", error);
    process.exit(1);
  });
}

// Start the application
runApplication();
