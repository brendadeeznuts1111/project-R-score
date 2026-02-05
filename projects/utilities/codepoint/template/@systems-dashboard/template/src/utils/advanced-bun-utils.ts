// Advanced Bun utilities - string width and feature flags
import { Bun } from "bun";

/**
 * String width utilities using Bun.stringWidth()
 * Handles Unicode, emojis, ANSI codes, and zero-width characters
 */
export class StringWidthUtils {
  /**
   * Calculate display width of a string
   * Handles complex Unicode sequences, emojis, and ANSI escape codes
   */
  static calculateWidth(text: string): number {
    return Bun.stringWidth(text);
  }

  /**
   * Test various string width scenarios
   */
  static runTests(): void {
    console.log("🔤 String Width Tests:");
    console.log("🇺🇸 Flag emoji width:", Bun.stringWidth("🇺🇸"), "=== 2");
    console.log("👋🏽 Skin tone emoji width:", Bun.stringWidth("👋🏽"), "=== 2");
    console.log("👨‍👩‍👧 Family emoji width:", Bun.stringWidth("👨‍👩‍👧"), "=== 2");
    console.log("Zero-width space:", Bun.stringWidth("\u2060"), "=== 0");
    console.log(
      "ANSI red text:",
      Bun.stringWidth("\x1b[31mRed\x1b[0m"),
      "=== 3"
    );
    console.log(
      "Hyperlink ANSI:",
      Bun.stringWidth("\x1b]8;;https://bun.sh\x07Bun\x1b]8;;\x07"),
      "=== 3"
    );
  }

  /**
   * Truncate text to fit within specified width
   */
  static truncate(text: string, maxWidth: number): string {
    if (Bun.stringWidth(text) <= maxWidth) return text;

    let result = "";
    let currentWidth = 0;

    for (const char of text) {
      const charWidth = Bun.stringWidth(char);
      if (currentWidth + charWidth > maxWidth) break;
      result += char;
      currentWidth += charWidth;
    }

    return result + (result.length < text.length ? "..." : "");
  }

  /**
   * Pad text to specified width
   */
  static pad(text: string, width: number, padChar = " "): string {
    const textWidth = Bun.stringWidth(text);
    const padWidth = width - textWidth;

    if (padWidth <= 0) return text;

    const padLength = Math.ceil(padWidth / Bun.stringWidth(padChar));
    return text + padChar.repeat(padLength);
  }

  /**
   * Create a table with proper column widths
   */
  static createTable(headers: string[], rows: string[][]): string {
    // Calculate column widths
    const columnWidths = headers.map((header, i) => {
      const maxRowWidth = Math.max(
        ...rows.map((row) => Bun.stringWidth(row[i] || ""))
      );
      return Math.max(Bun.stringWidth(header), maxRowWidth);
    });

    // Create header row
    const headerRow = headers
      .map((header, i) => this.pad(header, columnWidths[i]))
      .join(" | ");

    // Create separator
    const separator = columnWidths
      .map((width) => "-".repeat(width))
      .join("-+-");

    // Create data rows
    const dataRows = rows.map((row) =>
      row.map((cell, i) => this.pad(cell || "", columnWidths[i])).join(" | ")
    );

    return [headerRow, separator, ...dataRows].join("\n");
  }

  /**
   * Format text with ANSI colors and calculate proper width
   */
  static colorize(
    text: string,
    color: "red" | "green" | "yellow" | "blue" | "magenta" | "cyan" | "white"
  ): string {
    const colors = {
      red: "\x1b[31m",
      green: "\x1b[32m",
      yellow: "\x1b[33m",
      blue: "\x1b[34m",
      magenta: "\x1b[35m",
      cyan: "\x1b[36m",
      white: "\x1b[37m",
    };

    const reset = "\x1b[0m";
    return `${colors[color]}${text}${reset}`;
  }

  /**
   * Create hyperlink with ANSI escape codes
   */
  static hyperlink(text: string, url: string): string {
    return `\x1b]8;;${url}\x07${text}\x1b]8;;\x07`;
  }

  /**
   * Strip ANSI codes from text for pure width calculation
   */
  static stripAnsi(text: string): string {
    // Remove ANSI escape sequences
    return text
      .replace(/\x1b\[[0-9;]*m/g, "")
      .replace(/\x1b\][0-9;]*;.+\x07/g, "");
  }

  /**
   * Calculate visible width (without ANSI codes)
   */
  static getVisibleWidth(text: string): number {
    return Bun.stringWidth(this.stripAnsi(text));
  }
}

/**
 * Feature flag utilities using Bun.build() features
 */
export class FeatureFlagUtils {
  /**
   * Build with feature flags
   */
  static async buildWithFeatures(
    entryPoints: string[],
    outdir: string,
    features: string[],
    options: {
      minify?: boolean;
      target?: string;
      format?: string;
    } = {}
  ): Promise<void> {
    const buildResult = await Bun.build({
      entrypoints,
      outdir,
      minify: options.minify ?? false,
      target: (options.target as any) || "bun",
      format: (options.format as any) || "esm",
      features,
    });

    if (buildResult.logs.length > 0) {
      console.log("Build logs:");
      buildResult.logs.forEach((log) => console.log(log));
    }

    console.log(`✅ Built with features: ${features.join(", ")}`);
    console.log(`📁 Output directory: ${outdir}`);
  }

  /**
   * Create feature-enabled code template
   */
  static createFeatureCode(features: string[]): string {
    const featureChecks = features
      .map(
        (feature) =>
          `if (feature("${feature}")) {\n    console.log("${feature} feature enabled");\n  } else {\n    console.log("${feature} feature disabled");\n  }`
      )
      .join("\n\n");

    return `import { feature } from "bun:bundle";

${featureChecks}

console.log("Feature flags test completed");
`;
  }

  /**
   * Test feature flags by building and running
   */
  static async testFeatures(features: string[]): Promise<void> {
    console.log(`🧪 Testing feature flags: ${features.join(", ")}`);

    // Create test file
    const testCode = this.createFeatureCode(features);
    await Bun.write("feature-test.ts", testCode);

    // Build with features
    await this.buildWithFeatures(["feature-test.ts"], "./out", features, {
      minify: true,
    });

    // Run the built file
    console.log("📋 Running feature test:");
    const process = Bun.spawn(["bun", "./out/feature-test.js"]);
    await process.exited;

    // Cleanup
    await Bun.write("feature-test.ts", "");
    await Bun.write("./out/feature-test.js", "");
  }

  /**
   * Available feature flags for reference
   */
  static getAvailableFeatures(): string[] {
    return [
      "DEBUG", // Debug information
      "BUN_INSPECT", // Bun inspect features
      "PERFORMANCE", // Performance monitoring
      "SECURITY", // Security features
      "EXPERIMENTAL", // Experimental features
      "LEGACY", // Legacy compatibility
      "MINIMAL", // Minimal build
      "FULL", // Full feature set
      "DEVELOPMENT", // Development features
      "PRODUCTION", // Production optimizations
    ];
  }

  /**
   * Create feature-specific build configurations
   */
  static getBuildConfigs(): Record<string, string[]> {
    return {
      development: ["DEBUG", "DEVELOPMENT", "BUN_INSPECT"],
      production: ["PRODUCTION", "PERFORMANCE", "SECURITY"],
      minimal: ["MINIMAL"],
      full: ["DEBUG", "PERFORMANCE", "SECURITY", "EXPERIMENTAL", "FULL"],
      experimental: ["EXPERIMENTAL", "DEBUG", "DEVELOPMENT"],
    };
  }
}

/**
 * Combined utilities for advanced Bun features
 */
export class AdvancedBunUtils {
  /**
   * Run all advanced feature tests
   */
  static async runAllTests(): Promise<void> {
    console.log("🚀 Running Advanced Bun Features Tests\n");

    // String width tests
    StringWidthUtils.runTests();
    console.log();

    // Feature flag tests
    await FeatureFlagUtils.testFeatures(["DEBUG", "PERFORMANCE"]);
    console.log();

    // Demonstrate table creation
    console.log("📊 Table Creation Demo:");
    const headers = ["Name", "Status", "Progress"];
    const rows = [
      ["🇺🇸 Project Alpha", "✅ Active", "75%"],
      ["👋🏽 Feature Beta", "🔄 In Progress", "45%"],
      ["👨‍👩‍👧 Team Gamma", "⏸️ Paused", "90%"],
    ];

    console.log(StringWidthUtils.createTable(headers, rows));
    console.log();

    // Demonstrate colorized output
    console.log("🎨 Colorized Output Demo:");
    console.log(StringWidthUtils.colorize("Success", "green"));
    console.log(StringWidthUtils.colorize("Warning", "yellow"));
    console.log(StringWidthUtils.colorize("Error", "red"));
    console.log(
      StringWidthUtils.hyperlink("Bun Documentation", "https://bun.sh/docs")
    );
    console.log();

    // Show available features
    console.log("🏷️ Available Feature Flags:");
    FeatureFlagUtils.getAvailableFeatures().forEach((feature) => {
      console.log(`  • ${feature}`);
    });
  }

  /**
   * Create CLI utilities for the template
   */
  static createCLIUtils(): string {
    return `#!/usr/bin/env bun
// Advanced Bun CLI utilities
import { StringWidthUtils, FeatureFlagUtils } from "./advanced-bun-utils.ts";

const command = process.argv[2];

switch (command) {
  case "string-width":
    const text = process.argv[3] || "Hello 🌍";
    console.log(\`Text: "\${text}"\`);
    console.log(\`Width: \${StringWidthUtils.calculateWidth(text)}\`);
    console.log(\`Visible width: \${StringWidthUtils.getVisibleWidth(text)}\`);
    break;

  case "truncate":
    const truncateText = process.argv[3] || "This is a long text that needs truncation";
    const maxWidth = parseInt(process.argv[4]) || 10;
    console.log(\`Original: "\${truncateText}"\`);
    console.log(\`Truncated: "\${StringWidthUtils.truncate(truncateText, maxWidth)}"\`);
    break;

  case "table":
    const headers = ["Name", "Status", "Progress"];
    const rows = [
      ["🇺🇸 Project", "✅ Active", "75%"],
      ["👋🏽 Feature", "🔄 Progress", "45%"]
    ];
    console.log(StringWidthUtils.createTable(headers, rows));
    break;

  case "features":
    const features = process.argv.slice(3);
    if (features.length === 0) {
      console.log("Available features:");
      FeatureFlagUtils.getAvailableFeatures().forEach(f => console.log(\`  • \${f}\`));
    } else {
      await FeatureFlagUtils.testFeatures(features);
    }
    break;

  case "test-all":
    await AdvancedBunUtils.runAllTests();
    break;

  default:
    console.log("Advanced Bun CLI Utilities");
    console.log("Commands:");
    console.log("  string-width <text>     - Calculate string width");
    console.log("  truncate <text> <width> - Truncate text to width");
    console.log("  table                   - Show table demo");
    console.log("  features [features...]  - Test feature flags");
    console.log("  test-all                - Run all tests");
    break;
}
`;
  }
}

// Export for use in template
export { AdvancedBunUtils, FeatureFlagUtils, StringWidthUtils };
