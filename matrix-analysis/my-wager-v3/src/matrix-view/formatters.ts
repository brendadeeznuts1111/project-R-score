// Display formatting helpers for Bun Matrix

import type { BunDocEntry, SecurityScope, DisplayStats } from "./types";
import { LOW_PERF_THRESHOLD } from "../tension-field/constants";

export function formatStability(stability: string): string {
  switch (stability) {
    case "stable": return "✅ Stable";
    case "experimental": return "🧪 Experimental";
    case "deprecated": return "⚠️ Deprecated";
    default: return stability;
  }
}

export function formatSecurity(security: SecurityScope): string {
  const icon = security.classification === "high" ? "🔴" :
               security.classification === "medium" ? "🟡" : "🟢";
  let label = `${icon} ${security.classification}`;
  if (security.requiresRoot) label += " (root)";
  if (security.zeroTrust) label += " (ZT)";
  return label;
}

export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    "CORE": "⚙️",
    "CLI": "💻",
    "NETWORK": "🌐",
    "CRYPTO": "🔐",
    "IO": "📁",
    "FFI": "🔗",
    "WEB": "🌍",
  };
  return icons[category] || "📦";
}

export function getPlatformIcon(platform: string): string {
  const icons: Record<string, string> = {
    "darwin": "🍎",
    "linux": "🐧",
    "win32": "🪟",
  };
  return icons[platform] || "💻";
}

export function hasErrors(entry: BunDocEntry): boolean {
  return getErrors(entry).length > 0;
}

export function getErrors(entry: BunDocEntry): string[] {
  const errors: string[] = [];

  if (!entry.term) errors.push("missing term");
  if (!entry.path) errors.push("missing path");
  if (!entry.bunMinVersion) errors.push("missing min version");
  if (entry.bunMinVersion && !/^\d+\.\d+\.\d+$/.test(entry.bunMinVersion)) {
    errors.push("invalid version format");
  }
  if (!entry.platforms || entry.platforms.length === 0) {
    errors.push("no platforms specified");
  }
  if (entry.thuisConfig && entry.homeFeatures) {
    if (entry.thuisConfig.serviceMode === "daemon" && !entry.homeFeatures.autoStart) {
      errors.push("daemon should have auto-start");
    }
  }
  if (entry.stability === "deprecated" && !entry.removedIn) {
    errors.push("deprecated without removal version");
  }

  return errors;
}

export function isDefaultConfig(entry: BunDocEntry): boolean {
  const hasDefaultPerf = !entry.perfProfile ||
    (entry.perfProfile.baseline === "N/A" && !entry.perfProfile.opsSec);
  const hasDefaultSecurity = entry.security.classification === "medium" &&
    !entry.security.requiresRoot && !entry.security.zeroTrust;
  const hasDefaultFlags = !entry.cliFlags || entry.cliFlags.length === 0;
  const hasDefaultThuis = !entry.thuisConfig && !entry.homeFeatures;

  return hasDefaultPerf && hasDefaultSecurity && hasDefaultFlags && hasDefaultThuis;
}

export function percentage(value: number, total: number): string {
  return total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
}

export function displayRecommendations(stats: DisplayStats, entries: BunDocEntry[]): void {
  console.log("\n💡 Recommendations:");

  if (stats.experimental > stats.stable) {
    console.log("  • Consider stabilizing experimental APIs");
  }

  if (stats.withErrors > 0) {
    console.log("  • Fix detected configuration errors");
  }

  if (stats.highSecurity > 0) {
    console.log("  • Review high-security APIs for compliance");
  }

  if (stats.deprecated > 0) {
    console.log("  • Plan migration from deprecated APIs");
  }

  const lowUsageEntries = entries.filter(e =>
    e.perfProfile?.opsSec && e.perfProfile.opsSec < LOW_PERF_THRESHOLD
  );
  if (lowUsageEntries.length > 0) {
    console.log("  • Consider optimizing low-performance APIs");
  }

  if (stats.thuisEnabled > 0 && stats.localServers < stats.thuisEnabled) {
    console.log("  • Enable local servers for all Thuis APIs");
  }

  const missingDocs = entries.filter(e => !e.lastUpdated);
  if (missingDocs.length > 0) {
    console.log("  • Update documentation for outdated APIs");
  }
}
