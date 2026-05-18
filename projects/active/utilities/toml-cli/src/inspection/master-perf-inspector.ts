/**
 * MASTER_PERF Inspector with Bun Native APIs
 * Enhanced performance metric formatting using Bun.color() and Bun.stripANSI()
 */

import { custom as inspectCustom, inspect } from "bun";
import { PerfMetric } from "../../types/perf.types";

/**
 * Color palette using Bun.color() for consistent, precise 24-bit colors
 */
const CATEGORY_COLORS = {
  Security: Bun.color("#ff4444", "ansi"), // Red
  R2: Bun.color("#4488ff", "ansi"), // Blue
  Isolation: Bun.color("#aa44ff", "ansi"), // Purple
  Zstd: Bun.color("#ffaa44", "ansi"), // Orange
  Demo: Bun.color("#888888", "ansi"), // Gray
  Api: Bun.color("#44ff88", "ansi"), // Green
  Database: Bun.color("#ff8844", "ansi"), // Orange-Red
  Cache: Bun.color("#8844ff", "ansi"), // Purple-Blue
  Network: Bun.color("#44ffff", "ansi"), // Cyan
  Default: Bun.color("#cccccc", "ansi"), // Light Gray
} as const;

const STATUS_COLORS = {
  success: Bun.color("#44ff44", "ansi"), // Green
  warning: Bun.color("#ffff44", "ansi"), // Yellow
  error: Bun.color("#ff4444", "ansi"), // Red
  info: Bun.color("#4444ff", "ansi"), // Blue
} as const;

/**
 * Enhanced MASTER_PERF metric with Bun.color() formatting
 * Provides rich terminal output and clean plain-text export capabilities
 */
export class FormattedPerfMetric {
  private metric: PerfMetric;

  constructor(metric: PerfMetric) {
    this.metric = metric;
  }

  /**
   * Category with precise ANSI color and emoji
   */
  get category(): string {
    const emojis: Record<string, string> = {
      Security: "🔒",
      R2: "☁️",
      Isolation: "🛡️",
      Zstd: "📦",
      Demo: "🧪",
      Api: "🔌",
      Database: "🗄️",
      Cache: "⚡",
      Network: "🌐",
    };

    const emoji = emojis[this.metric.category] || "📊";
    const color =
      CATEGORY_COLORS[this.metric.category as keyof typeof CATEGORY_COLORS] ||
      CATEGORY_COLORS.Default;
    return `${emoji} ${color}${this.metric.category}\x1b[0m`;
  }

  /**
   * Value with latency-based status coloring
   */
  get value(): string {
    let status: keyof typeof STATUS_COLORS = "info";

    if (this.metric.value.includes("ms")) {
      const ms = parseFloat(this.metric.value);
      if (ms > 100) status = "error";
      else if (ms > 50) status = "warning";
      else status = "success";
    } else if (this.metric.value.includes("error") || this.metric.value.includes("fail")) {
      status = "error";
    } else if (this.metric.value.includes("warn")) {
      status = "warning";
    } else if (this.metric.value.includes("success") || this.metric.value.includes("ok")) {
      status = "success";
    }

    const color = STATUS_COLORS[status];
    return `${color}${this.metric.value}\x1b[0m`;
  }

  /**
   * Type with neutral coloring
   */
  get type(): string {
    return this.metric.type;
  }

  /**
   * Topic with neutral coloring
   */
  get topic(): string {
    return this.metric.topic;
  }

  /**
   * Scope-aware ID with flag emoji
   */
  get id(): string {
    const scope = this.metric.properties?.scope || "global";
    let flag = "🌐";

    if (scope === "ENTERPRISE") flag = "🇺🇸";
    else if (scope === "DEVELOPMENT") flag = "🇬🇧";
    else if (scope === "LOCAL-SANDBOX") flag = "🏠";
    else if (scope === "INTERNAL") flag = "🏢";
    else if (scope === "GITHUB") flag = "🐙";
    else if (scope === "GITLAB") flag = "🦊";

    return `${flag} ${this.metric.id}`;
  }

  /**
   * Truncated locations (Unicode-safe)
   */
  get locations(): string {
    const loc = this.metric.locations;
    const maxWidth = 25;
    if (Bun.stringWidth(loc) <= maxWidth) return loc;

    let truncated = "";
    let currentWidth = 0;
    // Iterate over grapheme clusters for Unicode-safe truncation
    for (const char of [...loc]) {
      const w = Bun.stringWidth(char);
      if (currentWidth + w > maxWidth - 3) break; // -3 for "..."
      truncated += char;
      currentWidth += w;
    }
    return truncated + "...";
  }

  /**
   * Impact with status emoji
   */
  get impact(): string {
    let statusEmoji = "🟢";
    if (this.metric.value.includes("ms")) {
      const ms = parseFloat(this.metric.value);
      if (ms > 100) statusEmoji = "🔴";
      else if (ms > 50) statusEmoji = "🟡";
    } else if (this.metric.value.includes("error") || this.metric.value.includes("fail")) {
      statusEmoji = "🔴";
    } else if (this.metric.value.includes("warn")) {
      statusEmoji = "🟡";
    }
    return `${statusEmoji} ${this.metric.impact}`;
  }

  /**
   * Properties summary (ANSI-stripped for clean display)
   */
  get properties(): string {
    if (!this.metric.properties) return "—";

    const keys = Object.keys(this.metric.properties);
    if (keys.length === 0) return "—";

    // Create a clean, ANSI-free summary
    const summary = keys
      .map((k) => `${k}: ${this.metric.properties![k]}`)
      .join(", ");
    return Bun.stripANSI(summary); // Ensure no ANSI leaks into properties
  }

  /**
   * Custom inspector for debugging
   */
  [inspectCustom](depth: number, options: any): string {
    return `PerfMetric(${this.metric.category})`;
  }

  /**
   * Get raw metric data
   */
  getRawMetric(): PerfMetric {
    return this.metric;
  }
}

/**
 * Generate colored terminal table output for MASTER_PERF metrics
 * Uses Bun's native table inspector with rich ANSI colors
 */
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

function stringWidth(str: string): number {
  return [...stripAnsi(str)].length;
}

export function generateMasterPerfTable(
  metrics: PerfMetric[],
  options: { maxRows?: number } = {}
): string {
  const processed = metrics
    .slice(0, options.maxRows || 100)
    .map((m) => new FormattedPerfMetric(m));

  if (processed.length === 0) {
    return "\n📊 MASTER_PERF Matrix • 0 metrics\n";
  }

  const columns = ["category", "type", "topic", "id", "value", "locations", "impact"];
  const header = columns.map((col) => col.toUpperCase());

  // Calculate maximum column widths
  const columnWidths: Record<string, number> = {};
  columns.forEach((col) => {
    columnWidths[col] = stringWidth(col.toUpperCase()); // Start with header width
  });

  processed.forEach((metric) => {
    columns.forEach((col) => {
      const value = (metric as any)[col];
      if (value) {
        columnWidths[col] = Math.max(columnWidths[col], stringWidth(value));
      }
    });
  });

  let tableString = `\n📊 MASTER_PERF Matrix • ${metrics.length} metrics\n`;

  // Add header row
  tableString += header
    .map((col) => col.padEnd(columnWidths[col.toLowerCase()] + 2))
    .join("");
  tableString += "\n";
  tableString += columns
    .map((col) => "-".repeat(columnWidths[col] + 2))
    .join("");
  tableString += "\n";

  // Add data rows
  processed.forEach((metric) => {
    tableString += columns
      .map((col) => {
        const value = (metric as any)[col] || "";
        const padding = columnWidths[col] + 2 - stringWidth(value);
        return value + " ".repeat(padding);
      })
      .join("");
    tableString += "\n";
  });

  tableString += `\n📏 Terminal: ${process.stdout.columns || 120} chars | TZ: ${Intl.DateTimeFormat().resolvedOptions().timeZone}\n`;
  return tableString;
}

/**
 * Generate plain-text table output by stripping ANSI codes
 * Perfect for logs, exports, and plain-text contexts
 */
export function generateMasterPerfPlainText(
  metrics: PerfMetric[],
  options: { maxRows?: number } = {}
): string {
  const table = generateMasterPerfTable(metrics, options);
  return Bun.stripANSI(table); // Remove all ANSI codes - 57x faster than npm strip-ansi
}

/**
 * Generate JSON export with normalized colors for database storage
 * Converts ANSI colors to numeric values for efficient storage
 */
export function generateMasterPerfJson(
  metrics: PerfMetric[]
): string {
  return JSON.stringify(
    metrics.map((m) => {
      const categoryColorHex = {
        Security: "#ff4444",
        R2: "#4488ff",
        Isolation: "#aa44ff",
        Zstd: "#ffaa44",
        Demo: "#888888",
        Api: "#44ff88",
        Database: "#ff8844",
        Cache: "#8844ff",
        Network: "#44ffff",
        Default: "#cccccc",
      }[m.category as keyof typeof CATEGORY_COLORS] || "#cccccc";

      // Determine value status
      let valueStatus: "error" | "warning" | "success" | "info" = "info";
      if (m.value.includes("ms")) {
        const ms = parseFloat(m.value);
        if (ms > 100) valueStatus = "error";
        else if (ms > 50) valueStatus = "warning";
        else valueStatus = "success";
      } else if (m.value.includes("error") || m.value.includes("fail")) {
        valueStatus = "error";
      } else if (m.value.includes("warn")) {
        valueStatus = "warning";
      } else if (m.value.includes("success") || m.value.includes("ok")) {
        valueStatus = "success";
      }

      return {
        ...m,
        // Store colors as numbers for database efficiency
        categoryColor: Bun.color(categoryColorHex, "number"),
        valueStatus,
        timestamp: m.timestamp || Date.now(),
      };
    }),
    null,
    2
  );
}

/**
 * Generate minimal WebSocket payload (pre-colored for efficiency)
 */
export function generateMasterPerfWebSocketPayload(
  metrics: PerfMetric[],
  options: { maxRows?: number } = {}
): string {
  const processed = metrics
    .slice(0, options.maxRows || 50)
    .map((m) => new FormattedPerfMetric(m));

  // Send pre-formatted data to avoid client-side processing
  return JSON.stringify({
    masterPerf: processed.map((p) => ({
      cat: p.getRawMetric().category,
      type: p.getRawMetric().type,
      topic: p.getRawMetric().topic,
      val: p.value, // Pre-colored
      scope: p.getRawMetric().properties?.scope,
      ts: p.getRawMetric().timestamp || Date.now(),
    })),
    total: metrics.length,
    timestamp: Date.now(),
  });
}

/**
 * Export metrics to S3 with proper content disposition
 */
export async function exportMetricsToS3(
  metrics: PerfMetric[],
  scope: string,
  s3Client: any
): Promise<void> {
  const json = generateMasterPerfJson(metrics);
  const date = new Date().toISOString().split("T")[0];

  // Use descriptive filename with date
  const filename = `perf-metrics-${scope}-${date}.json`;
  const path = `perf-metrics/${scope}/archive/${date}/latest.json`;

  await s3Client.write(path, json, {
    contentDisposition: `attachment; filename="${filename}"`,
    contentType: "application/json",
    metadata: {
      scope: scope,
      exportDate: new Date().toISOString(),
      version: "1.0",
      metricCount: String(metrics.length),
    },
  });
}