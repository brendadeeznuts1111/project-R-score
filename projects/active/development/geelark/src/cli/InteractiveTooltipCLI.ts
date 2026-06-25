/**
 * Interactive CLI with Tooltip Support
 * Provides hover tooltips and detailed feature flag information
 */

import { feature } from "bun:bundle";
import { TerminalWidth } from "../utils/TerminalWidth";
import { TooltipUtils } from "../utils/TooltipSystem";

export class InteractiveTooltipCLI {
  private static isRunning = false;
  private static currentTooltip: string | null = null;

  // Start interactive tooltip mode
  static async startInteractiveMode(): Promise<void> {
    if (this.isRunning) {
      console.info("❌ Interactive mode already running");
      return;
    }

    this.isRunning = true;
    console.info("🖱️  Interactive Tooltip Mode");
    console.info("=" .repeat(40));
    console.info("Commands:");
    console.info("  • Type a feature name to see its tooltip");
    console.info("  • 'list' - Show all available features");
    console.info("  • 'search <keyword>' - Search features");
    console.info("  • 'status' - Show current build status");
    console.info("  • 'help' - Show this help");
    console.info("  • 'quit' or 'exit' - Leave interactive mode");
    console.info("");
    console.info("💡 Try typing: FEAT_PREMIUM, ENV_PRODUCTION, or 'search encryption'");

    await this.commandLoop();
  }

  // Main command loop
  private static async commandLoop(): Promise<void> {
    const readline = await import("node:readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "🔍 Feature> "
    });

    rl.prompt();

    for await (const line of rl) {
      const input = line.trim();

      if (!input) {
        rl.prompt();
        continue;
      }

      await this.handleCommand(input);

      if (input.toLowerCase() === "quit" || input.toLowerCase() === "exit") {
        break;
      }

      rl.prompt();
    }

    rl.close();
    this.isRunning = false;
    console.info("\n👋 Goodbye!");
  }

  // Handle user commands
  private static async handleCommand(input: string): Promise<void> {
    const lowerInput = input.toLowerCase();

    if (lowerInput === "help") {
      this.showHelp();
    } else if (lowerInput === "list") {
      this.showFeatureList();
    } else if (lowerInput === "status") {
      this.showBuildStatus();
    } else if (lowerInput.startsWith("search ")) {
      const keyword = input.substring(7).trim();
      this.searchFeatures(keyword);
    } else if (lowerInput === "quit" || lowerInput === "exit") {
      return;
    } else {
      // Try to show tooltip for the feature
      this.showFeatureTooltip(input);
    }
  }

  // Show help information
  private static showHelp(): void {
    console.info("\n📖 Interactive Tooltip Help");
    console.info("─".repeat(30));
    console.info("Available Commands:");
    console.info("");
    console.info("🔍 FEATURE_NAME     - Show detailed tooltip for a feature");
    console.info("📋 list             - List all available features");
    console.info("🔎 search <keyword> - Search features by keyword");
    console.info("📊 status           - Show current build status");
    console.info("❓ help             - Show this help message");
    console.info("🚪 quit/exit        - Exit interactive mode");
    console.info("");
    console.info("💡 Examples:");
    console.info("  FEAT_PREMIUM");
    console.info("  ENV_PRODUCTION");
    console.info("  search encryption");
    console.info("  search monitoring");
  }

  // Show feature list with summaries
  private static showFeatureList(): void {
    console.info("\n📋 Available Feature Flags");
    console.info("─".repeat(40));

    const summaries = TooltipUtils.list();

    // Group by category
    const categories = {
      "🌍 Environment": summaries.filter(s => s.includes("ENV_")),
      "🏆 Tiers": summaries.filter(s => s.includes("FEAT_") && !s.includes("ENV_") && !s.includes("PLATFORM_") && !s.includes("PHONE_") && !s.includes("ANALYTICS_")),
      "🤖 Platforms": summaries.filter(s => s.includes("PLATFORM_")),
      "📱 Phone": summaries.filter(s => s.includes("PHONE_")),
      "📊 Analytics": summaries.filter(s => s.includes("ANALYTICS_")),
    };

    for (const [category, features] of Object.entries(categories)) {
      if (features.length > 0) {
        console.info(`\n${category}:`);
        features.forEach(feature => {
          console.info(`  ${feature}`);
        });
      }
    }

    console.info(`\n📈 Total: ${summaries.length} feature flags available`);
  }

  // Show build status
  private static showBuildStatus(): void {
    console.info("\n📊 Current Build Status");
    console.info("─".repeat(30));

    if (feature("ENV_DEVELOPMENT")) {
      console.info("🧪 Environment: Development");
      console.info("🔧 Debug: Enabled");
      console.info("🎭 Mock API: Enabled");
    } else if (feature("ENV_PRODUCTION")) {
      console.info("🚀 Environment: Production");
      console.info("🔒 Security: Enabled");
      console.info("📊 Monitoring: Active");
    } else {
      console.info("❓ Environment: Unknown");
    }

    console.info(`💎 Premium: ${feature("FEAT_PREMIUM") ? "Enabled" : "Disabled"}`);
    console.info(`🔐 Encryption: ${feature("FEAT_ENCRYPTION") ? "Enabled" : "Disabled"}`);
    console.info(`📈 Advanced Monitoring: ${feature("FEAT_ADVANCED_MONITORING") ? "Enabled" : "Disabled"}`);
    console.info(`🔄 Batch Processing: ${feature("FEAT_BATCH_PROCESSING") ? "Enabled" : "Disabled"}`);
  }

  // Search features
  private static searchFeatures(keyword: string): void {
    console.info(`\n🔎 Search Results for "${keyword}"`);
    console.info("─".repeat(40));

    const results = TooltipUtils.search(keyword);

    if (results.length === 0) {
      console.info(`❌ No features found matching "${keyword}"`);
      console.info("💡 Try searching for: encryption, monitoring, premium, android, analytics");
    } else {
      console.info(`✅ Found ${results.length} matching feature(s):`);
      results.forEach((result, index) => {
        console.info(`  ${index + 1}. ${result}`);
      });
    }
  }

  // Show feature tooltip
  private static showFeatureTooltip(featureName: string): void {
    const tooltip = TooltipUtils.get(featureName);

    if (!tooltip) {
      console.info(`\n❌ Feature "${featureName}" not found`);
      console.info("💡 Type 'list' to see all available features");
      console.info("💡 Try: FEAT_PREMIUM, ENV_PRODUCTION, PLATFORM_ANDROID");
      return;
    }

    console.info("\n" + "=".repeat(60));
    const formattedTooltip = TooltipUtils.format(featureName, 60);
    formattedTooltip.forEach(line => console.info(line));
    console.info("=".repeat(60));

    // Show related features
    this.showRelatedFeatures(featureName, tooltip);
  }

  // Show related features
  private static showRelatedFeatures(featureName: string, tooltip: any): void {
    console.info("\n🔗 Related Features:");

    if (tooltip.dependencies && tooltip.dependencies.length > 0) {
      console.info(`  Dependencies: ${tooltip.dependencies.join(", ")}`);
    }

    if (tooltip.conflicts && tooltip.conflicts.length > 0) {
      console.info(`  Conflicts: ${tooltip.conflicts.join(", ")}`);
    }

    // Suggest related features
    const suggestions = this.getRelatedFeatureSuggestions(featureName);
    if (suggestions.length > 0) {
      console.info(`  You might also like: ${suggestions.join(", ")}`);
    }

    console.info("\n💡 Type any feature name above to see its tooltip");
  }

  // Get related feature suggestions
  private static getRelatedFeatureSuggestions(featureName: string): string[] {
    const suggestions: string[] = [];

    // Environment-based suggestions
    if (featureName.includes("ENV_")) {
      if (featureName === "ENV_DEVELOPMENT") {
        suggestions.push("FEAT_MOCK_API", "FEAT_EXTENDED_LOGGING");
      } else if (featureName === "ENV_PRODUCTION") {
        suggestions.push("FEAT_ENCRYPTION", "FEAT_ADVANCED_MONITORING");
      }
    }

    // Tier-based suggestions
    if (featureName === "FEAT_PREMIUM") {
      suggestions.push("FEAT_ADVANCED_MONITORING", "FEAT_BATCH_PROCESSING", "FEAT_VALIDATION_STRICT");
    }

    // Platform-based suggestions
    if (featureName.includes("PLATFORM_")) {
      suggestions.push("FEAT_ENCRYPTION", "ENV_PRODUCTION");
    }

    // Phone feature suggestions
    if (featureName.includes("PHONE_")) {
      suggestions.push("FEAT_PREMIUM", "FEAT_BATCH_PROCESSING");
    }

    // Analytics suggestions
    if (featureName.includes("ANALYTICS_")) {
      if (featureName === "ANALYTICS_ENABLED") {
        suggestions.push("ANALYTICS_DETAILED");
      }
      suggestions.push("FEAT_PREMIUM");
    }

    return suggestions;
  }

  // Create enhanced feature table with tooltip indicators
  static createTooltipEnhancedTable(): string[] {
    const headers = ["Feature", "Status", "Impact", "Tooltip"];
    const rows = [
      ["FEAT_PREMIUM", feature("FEAT_PREMIUM") ? "✅ Enabled" : "❌ Disabled", "+25KB", "📋 Premium features"],
      ["FEAT_ENCRYPTION", feature("FEAT_ENCRYPTION") ? "✅ Enabled" : "❌ Disabled", "+8KB", "📋 End-to-end encryption"],
      ["FEAT_MOCK_API", feature("FEAT_MOCK_API") ? "✅ Enabled" : "❌ Disabled", "-20KB", "📋 Mock API endpoints"],
      ["FEAT_ADVANCED_MONITORING", feature("FEAT_ADVANCED_MONITORING") ? "✅ Enabled" : "❌ Disabled", "+20KB", "📋 Advanced monitoring"],
      ["ENV_DEVELOPMENT", feature("ENV_DEVELOPMENT") ? "✅ Enabled" : "❌ Disabled", "+15KB", "📋 Development environment"],
      ["ENV_PRODUCTION", feature("ENV_PRODUCTION") ? "✅ Enabled" : "❌ Disabled", "-10KB", "📋 Production environment"],
    ];

    return TerminalWidth.createTable(headers, rows);
  }

  // Show tooltip usage examples
  static showTooltipExamples(): void {
    console.info("\n💡 Tooltip Usage Examples");
    console.info("─".repeat(30));

    const examples = [
      {
        command: "bun run --features=ENV_DEVELOPMENT ./src/main.ts --interactive",
        description: "Start interactive tooltip mode in development"
      },
      {
        command: "bun run --features=ENV_PRODUCTION,FEAT_PREMIUM ./src/main.ts --tooltips",
        description: "Show premium feature tooltips in production"
      },
      {
        command: "bun run --features=ENV_DEVELOPMENT ./src/main.ts --tooltip FEAT_ENCRYPTION",
        description: "Show specific feature tooltip"
      },
      {
        command: "bun run --features=ENV_DEVELOPMENT ./src/main.ts --search monitoring",
        description: "Search for monitoring-related features"
      }
    ];

    examples.forEach((example, index) => {
      console.info(`\n${index + 1}. ${example.description}`);
      console.info(`   ${example.command}`);
    });
  }
}

// Export CLI utilities
export const TooltipCLI = {
  // Start interactive mode
  start: () => InteractiveTooltipCLI.startInteractiveMode(),

  // Show specific tooltip
  show: (feature: string) => {
    const tooltip = TooltipUtils.format(feature);
    console.info(tooltip.join("\n"));
  },

  // Search features
  search: (keyword: string) => {
    const results = TooltipUtils.search(keyword);
    console.info(`Found ${results.length} results:`);
    results.forEach(result => console.info(`  ${result}`));
  },

  // List all features
  list: () => {
    const features = TooltipUtils.list();
    console.info(`Available features (${features.length}):`);
    features.forEach(feature => console.info(`  ${feature}`));
  },

  // Show examples
  examples: () => InteractiveTooltipCLI.showTooltipExamples(),
};
