// BunMatrixViewer — display and CLI composition layer

import type { BunDocEntry, MatrixCLIOptions } from "./types";
import { BunMatrixStore } from "./store";
import { DEFAULT_ENTRIES } from "./seed-data";
import {
  formatStability,
  formatSecurity,
  getCategoryIcon,
  getPlatformIcon,
  hasErrors,
  getErrors,
  isDefaultConfig,
  percentage,
  displayRecommendations,
} from "./formatters";

export class BunMatrixViewer {
  private store = new BunMatrixStore();

  constructor() {
    this.initializeDefaultEntries();
  }

  private initializeDefaultEntries(): void {
    DEFAULT_ENTRIES.forEach(entry => this.store.set(entry));
  }

  displayMatrix(options: {
    platform?: "darwin" | "linux" | "win32";
    stability?: "experimental" | "stable" | "deprecated";
    category?: string;
    searchTerm?: string;
    thuisFeatures?: boolean;
  } = {}): void {
    let entries = this.store.getAll();

    if (options.platform) {
      entries = entries.filter(e => e.platforms.includes(options.platform!));
    }
    if (options.stability) {
      entries = entries.filter(e => e.stability === options.stability);
    }
    if (options.category) {
      entries = entries.filter(e => e.category?.toLowerCase() === options.category!.toLowerCase());
    }
    if (options.searchTerm) {
      const term = options.searchTerm.toLowerCase();
      entries = entries.filter(e =>
        e.term.toLowerCase().includes(term) ||
        e.path.toLowerCase().includes(term) ||
        e.relatedTerms?.some(rt => rt.toLowerCase().includes(term))
      );
    }
    if (options.thuisFeatures) {
      entries = entries.filter(e => e.thuisConfig || e.homeFeatures);
    }

    const tableData = entries.map(entry => ({
      "API": entry.term,
      "Min Version": entry.bunMinVersion,
      "Stability": formatStability(entry.stability),
      "Platforms": entry.platforms.join(", "),
      "Perf": entry.perfProfile?.baseline || "N/A",
      "Security": formatSecurity(entry.security),
      "Category": entry.category?.toUpperCase() || "CORE",
      "Flags": entry.cliFlags?.join(", ") || "none",
      "Updated": entry.lastUpdated?.toLocaleDateString() || "N/A",
      "Home Dir": entry.thuisConfig?.homeDirectory || "N/A",
      "Service": entry.thuisConfig?.serviceMode || "N/A",
      "Local Server": entry.homeFeatures?.localServer ? "✅" : "❌",
      "Auto Start": entry.homeFeatures?.autoStart ? "✅" : "❌",
      "Tray Icon": entry.homeFeatures?.trayIcon ? "✅" : "❌",
      "Notifications": entry.homeFeatures?.notifications ? "✅" : "❌",
    }));

    console.info("\n📊 Bun Min Version Matrix");
    console.info("========================\n");
    console.info(Bun.inspect.table(tableData, [
      "API", "Min Version", "Stability", "Platforms",
      "Perf", "Security", "Category", "Flags", "Updated",
      "Home Dir", "Service", "Local Server", "Auto Start",
      "Tray Icon", "Notifications",
    ]));

    this.displaySummary(entries);
  }

  private displaySummary(entries: BunDocEntry[]): void {
    const stats = {
      total: entries.length,
      stable: entries.filter(e => e.stability === "stable").length,
      experimental: entries.filter(e => e.stability === "experimental").length,
      deprecated: entries.filter(e => e.stability === "deprecated").length,
      highSecurity: entries.filter(e => e.security.classification === "high").length,
      thuisEnabled: entries.filter(e => e.thuisConfig || e.homeFeatures).length,
      localServers: entries.filter(e => e.homeFeatures?.localServer).length,
      autoStart: entries.filter(e => e.homeFeatures?.autoStart).length,
      withErrors: entries.filter(e => hasErrors(e)).length,
      defaultConfigs: entries.filter(e => isDefaultConfig(e)).length,
      customConfigs: entries.filter(e => !isDefaultConfig(e)).length,
    };

    const categories = this.getCategoryStats(entries);
    const platforms = this.getPlatformStats(entries);
    const security = this.getSecurityStats(entries);

    console.info("\n📈 Summary Report:");
    console.info("================");

    console.info("\n📊 Basic Statistics:");
    console.info(`  • Total APIs: ${stats.total}`);
    console.info(`  • ✅ Stable: ${stats.stable} (${percentage(stats.stable, stats.total)}%)`);
    console.info(`  • 🧪 Experimental: ${stats.experimental} (${percentage(stats.experimental, stats.total)}%)`);
    console.info(`  • ⚠️ Deprecated: ${stats.deprecated} (${percentage(stats.deprecated, stats.total)}%)`);

    console.info("\n🏠 Thuis/Home Features:");
    console.info(`  • APIs with Thuis support: ${stats.thuisEnabled} (${percentage(stats.thuisEnabled, stats.total)}%)`);
    console.info(`  • Local servers: ${stats.localServers}`);
    console.info(`  • Auto-start services: ${stats.autoStart}`);

    console.info("\n⚙️ Configuration:");
    console.info(`  • Default configs: ${stats.defaultConfigs}`);
    console.info(`  • Custom configs: ${stats.customConfigs}`);
    console.info(`  • APIs with errors: ${stats.withErrors}`);

    console.info("\n📂 Categories:");
    for (const [category, count] of Object.entries(categories)) {
      const icon = getCategoryIcon(category);
      console.info(`  • ${icon} ${category}: ${count}`);
    }

    console.info("\n💻 Platform Support:");
    for (const [platform, count] of Object.entries(platforms)) {
      const icon = getPlatformIcon(platform);
      console.info(`  • ${icon} ${platform}: ${count} APIs`);
    }

    console.info("\n🔒 Security Classification:");
    console.info(`  • 🔴 High: ${security.high} (requires special handling)`);
    console.info(`  • 🟡 Medium: ${security.medium} (standard security)`);
    console.info(`  • 🟢 Low: ${security.low} (minimal security)`);

    if (stats.withErrors > 0) {
      console.info("\n⚠️ Errors Detected:");
      const errorEntries = entries.filter(e => hasErrors(e));
      for (const entry of errorEntries) {
        const errs = getErrors(entry);
        console.info(`  • ${entry.term}: ${errs.join(", ")}`);
      }
    }

    displayRecommendations(stats, entries);
  }

  private getCategoryStats(entries: BunDocEntry[]): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const entry of entries) {
      const category = entry.category?.toUpperCase() || "CORE";
      stats[category] = (stats[category] || 0) + 1;
    }
    return stats;
  }

  private getPlatformStats(entries: BunDocEntry[]): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const entry of entries) {
      for (const platform of entry.platforms) {
        stats[platform] = (stats[platform] || 0) + 1;
      }
    }
    return stats;
  }

  private getSecurityStats(entries: BunDocEntry[]): { high: number; medium: number; low: number } {
    return {
      high: entries.filter(e => e.security.classification === "high").length,
      medium: entries.filter(e => e.security.classification === "medium").length,
      low: entries.filter(e => e.security.classification === "low").length,
    };
  }

  checkCompatibility(bunVersion: string = process.env.BUN_VERSION || "1.3.7"): void {
    console.info(`\n🔍 Compatibility Check for Bun ${bunVersion}`);
    console.info("=====================================\n");

    const allEntries = this.store.getAll();
    const compatible = allEntries.filter(e =>
      this.store.isCompatible(e.term, bunVersion)
    );
    const incompatible = allEntries.filter(e =>
      !this.store.isCompatible(e.term, bunVersion)
    );

    if (incompatible.length > 0) {
      console.info("⚠️ Incompatible APIs:\n");
      const tableData = incompatible.map(entry => ({
        "API": entry.term,
        "Required": entry.bunMinVersion,
        "Current": bunVersion,
        "Status": "❌ Upgrade Required",
      }));
      console.info(Bun.inspect.table(tableData));
    }

    console.info(`\n✅ Compatible: ${compatible.length}/${allEntries.length} APIs`);
  }

  getBreakingChanges(targetVersion: string): void {
    console.info(`\n💥 Breaking Changes for v${targetVersion}`);
    console.info("===================================\n");

    const breaking = this.store.getBreakingChanges(targetVersion);

    if (breaking.length === 0) {
      console.info("✅ No breaking changes detected");
      return;
    }

    const tableData = breaking.map(entry => ({
      "API": entry.term,
      "Stability": entry.stability,
      "Breaking Since": entry.breakingChanges?.map(b =>
        `${b.major}.${b.minor}.${b.patch}`
      ).join(", ") || "N/A",
      "Action": entry.removedIn ? "REMOVED" :
                entry.deprecatedIn ? "DEPRECATED" : "Review",
    }));

    console.info(Bun.inspect.table(tableData));
  }

  async syncWithRSS(): Promise<void> {
    console.info("🔄 Syncing matrix with RSS feeds...");

    const feeds = [
      "https://bun.sh/blog/rss.xml",
      "https://bun.sh/blog/rss.xml#tag=sqlite",
      "https://bun.sh/blog/rss.xml#tag=ffi",
    ];

    for (const feed of feeds) {
      await this.store.updateFromRSS(feed);
    }

    console.info("✅ RSS sync complete");
  }

  displayMetrics(): void {
    console.info("\n📊 Comprehensive Metrics Report");
    console.info("==============================\n");

    const metrics = this.store.calculateMetrics();

    console.info("🔢 Totals & Aggregates:");
    console.info("---------------------");
    console.info(`Total APIs: ${metrics.totals.apis}`);
    console.info(`Platforms Supported: ${metrics.totals.platforms}`);
    console.info(`Categories: ${metrics.totals.categories}`);
    console.info(`Security Flags: ${metrics.totals.securityFlags}`);
    console.info(`Zero Trust APIs: ${metrics.totals.zeroTrustApis}`);
    console.info(`CLI Flags: ${metrics.totals.cliFlags}`);
    console.info(`Related Terms: ${metrics.totals.relatedTerms}`);
    console.info(`Average Version: ${metrics.totals.avgVersion}`);
    console.info(`Total Ops/sec: ${metrics.totals.totalOpsPerSec.toLocaleString()}`);
    console.info(`Home Automation APIs: ${metrics.totals.homeAutomationApis}`);

    console.info("\n⚡ Performance Metrics:");
    console.info("-----------------------");
    console.info(`Average Ops/sec: ${Math.round(metrics.performance.avgOpsPerSec).toLocaleString()}`);
    console.info(`Maximum Ops/sec: ${metrics.performance.maxOpsPerSec.toLocaleString()}`);
    console.info(`Minimum Ops/sec: ${metrics.performance.minOpsPerSec === Infinity ? "N/A" : metrics.performance.minOpsPerSec.toLocaleString()}`);

    console.info("\nTop Performers:");
    for (const performer of metrics.performance.topPerformers) {
      console.info(`  • ${performer.api}: ${performer.ops?.toLocaleString()} ops/sec`);
    }

    console.info("\nBaseline Improvements:");
    console.info(`  APIs with improvements: ${metrics.performance.baselineImprovements.count}`);
    console.info(`  Average improvement: ${metrics.performance.baselineImprovements.avgImprovement.toFixed(1)}x`);

    console.info("\n🔒 Security Overview:");
    console.info("---------------------");
    console.info(`High Security APIs: ${metrics.security.classificationDistribution.high}`);
    console.info(`Medium Security APIs: ${metrics.security.classificationDistribution.medium}`);
    console.info(`Low Security APIs: ${metrics.security.classificationDistribution.low}`);
    console.info(`Root Required: ${metrics.security.rootRequired}`);
    console.info(`Zero Trust Adoption: ${metrics.security.zeroTrustAdoption}`);

    if (metrics.security.highRiskApis.length > 0) {
      console.info("\n⚠️ High-Risk APIs:");
      for (const api of metrics.security.highRiskApis) {
        console.info(`  • ${api}`);
      }
    }

    console.info("\n📈 Evolution Metrics:");
    console.info("---------------------");
    console.info(`Adoption Rate: ${(metrics.evolution.adoptionRate * 100).toFixed(1)}%`);
    console.info(`Maturity Index: ${metrics.evolution.maturityIndex.toFixed(2)}`);
    console.info(`Deprecation Rate: ${(metrics.evolution.deprecationRate * 100).toFixed(1)}%`);
    console.info(`Experimental/Stable Ratio: ${metrics.evolution.experimentalToStableRatio.toFixed(2)}`);

    console.info("\n🏠 Home Automation Metrics:");
    console.info("---------------------------");
    console.info(`Total Thuis APIs: ${metrics.homeAutomation.totalApis}`);
    console.info("Service Modes:");
    for (const [mode, count] of Object.entries(metrics.homeAutomation.serviceModes)) {
      console.info(`  • ${mode}: ${count}`);
    }
    console.info("Feature Adoption:");
    for (const [feature, count] of Object.entries(metrics.homeAutomation.featureAdoption)) {
      console.info(`  • ${feature}: ${count}`);
    }
  }

  displayPatterns(): void {
    console.info("\n🔍 Pattern Analysis Report");
    console.info("==========================\n");

    const metrics = this.store.calculateMetrics();

    console.info("📦 Version Distribution:");
    console.info("------------------------");
    for (const [version, count] of Object.entries(metrics.patterns.versionDistribution)) {
      const countNum = count as number;
      const pct = ((countNum / metrics.totals.apis) * 100).toFixed(1);
      console.info(`  ${version}: ${countNum} APIs (${pct}%)`);
    }

    console.info("\n💻 Platform Popularity:");
    console.info("------------------------");
    const sortedPlatforms = Object.entries(metrics.patterns.platformPopularity)
      .sort(([, a], [, b]) => (b as number) - (a as number));
    for (const [platform, count] of sortedPlatforms) {
      const countNum = count as number;
      const pct = ((countNum / metrics.totals.apis) * 100).toFixed(1);
      console.info(`  ${platform}: ${countNum} APIs (${pct}%)`);
    }

    console.info("\n📂 Category Distribution:");
    console.info("-------------------------");
    const sortedCategories = Object.entries(metrics.patterns.categoryDistribution)
      .sort(([, a], [, b]) => (b as number) - (a as number));
    for (const [category, count] of sortedCategories) {
      const countNum = count as number;
      const pct = ((countNum / metrics.totals.apis) * 100).toFixed(1);
      console.info(`  ${category}: ${countNum} APIs (${pct}%)`);
    }

    console.info("\n📝 Naming Patterns:");
    console.info("-------------------");
    console.info(`  With Bun prefix: ${metrics.patterns.namingPatterns.withBunPrefix}`);
    console.info(`  With dot notation: ${metrics.patterns.namingPatterns.withDotNotation}`);
    console.info(`  CamelCase: ${metrics.patterns.namingPatterns.camelCase}`);
    console.info(`  With module suffix: ${metrics.patterns.namingPatterns.withModuleSuffix}`);
    console.info(`  Average name length: ${metrics.patterns.namingPatterns.avgLength.toFixed(1)} characters`);
    console.info(`  Most common prefix: ${metrics.patterns.namingPatterns.mostCommonPrefix}`);

    console.info("\n🔗 Dependency Patterns:");
    console.info("----------------------");
    console.info(`  Total related terms: ${metrics.patterns.dependencyPatterns.totalRelatedTerms}`);
    console.info(`  Unique related terms: ${metrics.patterns.dependencyPatterns.uniqueRelatedTerms}`);
    console.info(`  Average related terms per API: ${metrics.patterns.dependencyPatterns.avgRelatedTerms.toFixed(1)}`);

    console.info("\n  Most Referenced APIs:");
    for (const ref of metrics.patterns.dependencyPatterns.mostReferenced) {
      console.info(`    • ${ref.term}: referenced ${ref.count} times`);
    }

    console.info("\n📊 Stability Progression:");
    console.info("-------------------------");
    console.info(`  Experimental: ${metrics.patterns.stabilityProgression.experimental}`);
    console.info(`  Stable: ${metrics.patterns.stabilityProgression.stable}`);
    console.info(`  Deprecated: ${metrics.patterns.stabilityProgression.deprecated}`);
    console.info(`  Maturity ratio: ${metrics.patterns.stabilityProgression.maturityRatio.toFixed(2)}`);

    console.info("\n🔗 Key Correlations:");
    console.info("--------------------");

    console.info("\n  Security vs Performance:");
    for (const [level, data] of Object.entries(metrics.correlations.securityVsPerformance)) {
      console.info(`    ${level}: ${Math.round(data.avg).toLocaleString()} avg ops/sec`);
    }

    console.info("\n  Platform vs Thuis Features:");
    for (const [platform, data] of Object.entries(metrics.correlations.platformVsFeatures)) {
      console.info(`    ${platform}: ${data.thuisPct}% with Thuis features`);
    }

    console.info("\n  Version vs Feature Richness:");
    for (const [version, data] of Object.entries(metrics.correlations.versionVsFeatures)) {
      console.info(`    v${version}: ${data.avgFeatures?.toFixed(1)} avg features`);
    }
  }

  displayTotals(): void {
    console.info("\n📊 Detailed Totals Report");
    console.info("========================\n");

    const metrics = this.store.calculateMetrics();

    console.info("📂 APIs by Category:");
    console.info("---------------------");
    const categoryTotals: Record<string, { stable: number; experimental: number; deprecated: number }> = {};

    for (const entry of this.store.getAll()) {
      const cat = entry.category?.toUpperCase() || "CORE";
      if (!categoryTotals[cat]) {
        categoryTotals[cat] = { stable: 0, experimental: 0, deprecated: 0 };
      }
      categoryTotals[cat][entry.stability]++;
    }

    for (const [category, totals] of Object.entries(categoryTotals)) {
      const total = totals.stable + totals.experimental + totals.deprecated;
      console.info(`  ${category}:`);
      console.info(`    Total: ${total}`);
      console.info(`    ✅ Stable: ${totals.stable}`);
      console.info(`    🧪 Experimental: ${totals.experimental}`);
      console.info(`    ⚠️ Deprecated: ${totals.deprecated}`);
    }

    console.info("\n💻 Platform Coverage:");
    console.info("---------------------");
    for (const platform of ["darwin", "linux", "win32"] as const) {
      const count = this.store.getAll().filter(e => e.platforms.includes(platform)).length;
      const pct = ((count / metrics.totals.apis) * 100).toFixed(1);
      console.info(`  ${platform}: ${count} APIs (${pct}%)`);
    }

    console.info("\n🔒 Security Breakdown:");
    console.info("---------------------");
    console.info(`  High Security: ${metrics.security.classificationDistribution.high} APIs`);
    console.info(`  Medium Security: ${metrics.security.classificationDistribution.medium} APIs`);
    console.info(`  Low Security: ${metrics.security.classificationDistribution.low} APIs`);
    console.info(`  Requiring Root: ${metrics.security.rootRequired} APIs`);
    console.info(`  Zero Trust Enabled: ${metrics.security.zeroTrustAdoption} APIs`);

    console.info("\n⚡ Performance Totals:");
    console.info("----------------------");
    const withPerf = this.store.getAll().filter(e => e.perfProfile?.opsSec);
    console.info(`  APIs with performance data: ${withPerf.length}`);
    console.info(`  Total throughput: ${metrics.totals.totalOpsPerSec.toLocaleString()} ops/sec`);
    console.info(`  Average throughput: ${Math.round(metrics.performance.avgOpsPerSec).toLocaleString()} ops/sec`);

    console.info("\n📦 Version Distribution:");
    console.info("------------------------");
    const versionGroups: Record<string, string[]> = {};
    for (const entry of this.store.getAll()) {
      const version = entry.bunMinVersion.split(".").slice(0, 2).join(".");
      if (!versionGroups[version]) versionGroups[version] = [];
      versionGroups[version].push(entry.term);
    }

    for (const [version, apis] of Object.entries(versionGroups).sort()) {
      console.info(`  ${version}: ${apis.length} APIs`);
      if (apis.length <= 5) {
        console.info(`    ${apis.join(", ")}`);
      } else {
        console.info(`    ${apis.slice(0, 3).join(", ")}, ... (+${apis.length - 3} more)`);
      }
    }

    console.info("\n🌟 Feature Adoption:");
    console.info("-------------------");
    const allEntries = this.store.getAll();
    const withFlags = allEntries.filter(e => e.cliFlags && e.cliFlags.length > 0);
    const withRelated = allEntries.filter(e => e.relatedTerms && e.relatedTerms.length > 0);
    const withPerfProfile = allEntries.filter(e => e.perfProfile);
    const withBreaking = allEntries.filter(e => e.breakingChanges && e.breakingChanges.length > 0);

    console.info(`  APIs with CLI flags: ${withFlags.length}`);
    console.info(`  APIs with related terms: ${withRelated.length}`);
    console.info(`  APIs with performance profiles: ${withPerfProfile.length}`);
    console.info(`  APIs with breaking changes: ${withBreaking.length}`);

    console.info("\n🏠 Thuis Feature Totals:");
    console.info("-----------------------");
    const thuisApis = allEntries.filter(e => e.thuisConfig || e.homeFeatures);
    console.info(`  Total Thuis APIs: ${thuisApis.length}`);
    console.info(`  With local server: ${thuisApis.filter(e => e.homeFeatures?.localServer).length}`);
    console.info(`  With auto-start: ${thuisApis.filter(e => e.homeFeatures?.autoStart).length}`);
    console.info(`  With tray icon: ${thuisApis.filter(e => e.homeFeatures?.trayIcon).length}`);
    console.info(`  With notifications: ${thuisApis.filter(e => e.homeFeatures?.notifications).length}`);
  }
}

// CLI integration
export async function runMatrixCLI(args: string[]): Promise<void> {
  const viewer = new BunMatrixViewer();

  const command = args[0] || "show";

  switch (command) {
    case "show":
    case "list": {
      const options: MatrixCLIOptions = {};

      for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith("--platform=")) {
          options.platform = arg.split("=")[1] as MatrixCLIOptions["platform"];
        } else if (arg.startsWith("--stability=")) {
          options.stability = arg.split("=")[1] as MatrixCLIOptions["stability"];
        } else if (arg.startsWith("--category=")) {
          options.category = arg.split("=")[1];
        } else if (arg.startsWith("--search=")) {
          options.searchTerm = arg.split("=")[1];
        } else if (arg === "--thuis") {
          options.thuisFeatures = true;
        }
      }

      viewer.displayMatrix(options);
      break;
    }

    case "check":
      viewer.checkCompatibility(args[1]);
      break;

    case "breaking":
      viewer.getBreakingChanges(args[1] || "1.4.0");
      break;

    case "sync":
      await viewer.syncWithRSS();
      break;

    case "metrics":
      viewer.displayMetrics();
      break;

    case "patterns":
      viewer.displayPatterns();
      break;

    case "totals":
      viewer.displayTotals();
      break;

    default:
      console.info(`
📊 Bun Matrix CLI - Tier-1380 Infrastructure

Usage:
  bun-matrix show [options]     Display matrix
  bun-matrix check [version]    Check compatibility
  bun-matrix breaking [version] Show breaking changes
  bun-matrix sync               Update from RSS feeds
  bun-matrix metrics             Show comprehensive metrics
  bun-matrix patterns            Show pattern analysis
  bun-matrix totals              Show totals and aggregates

Options:
  --platform=darwin|linux|win32   Filter by platform
  --stability=stable|experimental|deprecated  Filter by stability
  --category=core|crypto|io|...   Filter by category
  --search=<term>                 Search APIs
  --thuis                        Show only home/thuis features

Examples:
  bun-matrix show --platform=linux --stability=stable
  bun-matrix check 1.3.7
  bun-matrix breaking 1.4.0
  bun-matrix show --search=sqlite
  bun-matrix show --thuis
  bun-matrix metrics
  bun-matrix patterns
      `);
  }
}

// Export singletons for MCP integration
export const matrixViewer = new BunMatrixViewer();
export const matrixStore = matrixViewer["store"];
