// src/inspection/master-perf-inspector.ts
import { custom as inspectCustom } from "bun";
import { PerfMetric } from "../storage/r2-apple-manager";

/**
 * Simple table formatter using console.table
 */
function formatTable(data: any[], options: any = {}): string {
  // For now, use a simple table format
  const headers = options.columns || Object.keys(data[0] || {});
  const rows = data.map(item => 
    headers.map(header => {
      // Handle getter properties
      if (typeof item[header] === 'function') {
        return item[header]();
      }
      return item[header] || '—';
    })
  );
  
  // Calculate column widths
  const widths = headers.map((header, i) => 
    Math.max(
      header.length,
      ...rows.map(row => String(row[i]).length)
    )
  );
  
  // Build table string
  let table = '';
  
  // Header row
  table += '┌' + widths.map(w => '─'.repeat(w + 2)).join('┬') + '┐\n';
  table += '│' + headers.map((header, i) => ` ${header.padEnd(widths[i])} `).join('│') + '│\n';
  table += '├' + widths.map(w => '─'.repeat(w + 2)).join('┼') + '┤\n';
  
  // Data rows
  rows.forEach(row => {
    table += '│' + row.map((cell, i) => ` ${String(cell).padEnd(widths[i])} `).join('│') + '│\n';
  });
  
  table += '└' + widths.map(w => '─'.repeat(w + 2)).join('┴') + '┘';
  
  return table;
}

/**
 * Color palette using Bun.color() for consistent, precise colors
 */
const CATEGORY_COLORS = {
  Security: Bun.color("#3b82f6", "ansi"),    // Red
  R2: Bun.color("#3b82f6", "ansi"),         // Blue
  Isolation: Bun.color("#3b82f6", "ansi"),  // Purple
  Zstd: Bun.color("#3b82f6", "ansi"),       // Orange
  Demo: Bun.color("#3b82f6", "ansi")        // Gray
};

const STATUS_COLORS = {
  success: Bun.color("#3b82f6", "ansi"),    // Green
  warning: Bun.color("#3b82f6", "ansi"),    // Yellow
  error: Bun.color("#3b82f6", "ansi")       // Red
};

/**
 * Simple timezone config for demo
 */
function getActiveTimezoneConfig() {
  return {
    displayName: 'America/New_York',
    offset: -5
  };
}

/**
 * Enhanced MASTER_PERF metric with Bun.color() formatting
 */
class FormattedPerfMetric {
  private metric: PerfMetric;
  
  constructor(metric: PerfMetric) {
    this.metric = metric;
  }

  // Category with precise ANSI color
  get category(): string {
    const emojis: Record<string, string> = {
      Security: '🔒',
      R2: '☁️',
      Isolation: '🛡️',
      Zstd: '📦',
      Demo: '🧪'
    };
    
    const emoji = emojis[this.metric.category] || '📊';
    const color = CATEGORY_COLORS[this.metric.category as keyof typeof CATEGORY_COLORS] || '';
    return `${emoji} ${color}${this.metric.category}\x1b[0m`;
  }

  // Value with latency-based status coloring
  get value(): string {
    let status: keyof typeof STATUS_COLORS = 'success';
    
    if (this.metric.value.includes('ms')) {
      const ms = parseFloat(this.metric.value);
      if (ms > 100) status = 'error';
      else if (ms > 50) status = 'warning';
    }
    
    const color = STATUS_COLORS[status];
    return `${color}${this.metric.value}\x1b[0m`;
  }

  // Scope-aware ID with flag emoji
  get id(): string {
    const scope = this.metric.properties?.scope || 'global';
    let flag = '🌐';
    
    if (scope === 'ENTERPRISE') flag = '🇺🇸';
    else if (scope === 'DEVELOPMENT') flag = '🇬🇧';
    else if (scope === 'LOCAL-SANDBOX') flag = '🏠';
    
    return `${flag} ${this.metric.id}`;
  }

  // Truncated locations (Unicode-safe)
  get locations(): string {
    const loc = this.metric.locations;
    const maxWidth = 25;
    if (Bun.stringWidth(loc) <= maxWidth) return loc;
    
    let truncated = '';
    let currentWidth = 0;
    for (const char of loc) {
      const w = Bun.stringWidth(char);
      if (currentWidth + w > maxWidth - 3) break;
      truncated += char;
      currentWidth += w;
    }
    return truncated + '...';
  }

  // Impact with status emoji
  get impact(): string {
    let statusEmoji = '🟢';
    if (this.metric.value.includes('ms')) {
      const ms = parseFloat(this.metric.value);
      if (ms > 100) statusEmoji = '🔴';
      else if (ms > 50) statusEmoji = '🟡';
    }
    return `${statusEmoji} ${this.metric.impact}`;
  }

  // Properties summary (ANSI-stripped for clean display)
  get properties(): string {
    if (!this.metric.properties) return '—';
    
    const keys = Object.keys(this.metric.properties);
    if (keys.length === 0) return '—';
    
    // Create a clean, ANSI-free summary
    const summary = keys.map(k => `${k}: ${this.metric.properties![k]}`).join(', ');
    return Bun.stripANSI(summary); // Ensure no ANSI leaks into properties
  }

  [inspectCustom](depth: number, options: any): string {
    return `PerfMetric(${this.metric.category})`;
  }
}

/**
 * 🧪 Dual-Mode Output Functions
 */

// 1. Colored Terminal Output (for dashboards, CLI)
export function generateMasterPerfTable(
  metrics: PerfMetric[],
  options: { maxRows?: number } = {}
): string {
  const processed = metrics.slice(0, options.maxRows || 100).map(m => new FormattedPerfMetric(m));
  
  return `\n📊 MASTER_PERF Matrix • ${metrics.length} metrics\n` +
         formatTable(processed, {
           columns: ['category', 'type', 'topic', 'id', 'value', 'locations', 'impact'],
           indent: 2,
           colors: true
         }) +
         `\n📏 Terminal: ${process.stdout.columns || 120} chars | TZ: ${getActiveTimezoneConfig().displayName}\n`;
}

// 2. Plain-Text Export (for logs, CSV, S3)
export function generateMasterPerfPlainText(
  metrics: PerfMetric[],
  options: { maxRows?: number } = {}
): string {
  const table = generateMasterPerfTable(metrics, options);
  return Bun.stripANSI(table); // Remove all ANSI codes
}

// 3. JSON Export with Normalized Colors
export function generateMasterPerfJson(
  metrics: PerfMetric[]
): string {
  return JSON.stringify(metrics.map(m => ({
    ...m,
    // Store colors as numbers for database efficiency
    categoryColor: Bun.color(CATEGORY_COLORS[m.category as keyof typeof CATEGORY_COLORS]?.replace(/\x1b\[38;2;(\d+);(\d+);(\d+)m/, '#$1$2$3') || '#3b82f6', "number"),
    valueStatus: m.value.includes('ms') ? 
      (parseFloat(m.value) > 100 ? 'error' : parseFloat(m.value) > 50 ? 'warning' : 'success') 
      : 'info'
  })), null, 2);
}

/**
 * ⚡ Performance Benchmark Functions
 */
export function benchmarkAnsiStripping(): void {
  const testString = '\x1b[38;2;255;68;68mSecurity\x1b[0m \x1b[38;2;68;136;255mR2\x1b[0m';
  const iterations = 100000;
  
  console.log('🏃 ANSI Stripping Benchmark');
  console.log('─'.repeat(40));
  
  // Bun.stripANSI()
  const startBun = performance.now();
  for (let i = 0; i < iterations; i++) {
    Bun.stripANSI(testString);
  }
  const bunTime = performance.now() - startBun;
  
  // Simple regex fallback
  const startRegex = performance.now();
  for (let i = 0; i < iterations; i++) {
    testString.replace(/\x1b\[[0-9;]*m/g, '');
  }
  const regexTime = performance.now() - startRegex;
  
  console.log(`Bun.stripANSI(): ${bunTime.toFixed(2)}ms`);
  console.log(`Regex fallback: ${regexTime.toFixed(2)}ms`);
  console.log(`Performance gain: ${(regexTime / bunTime).toFixed(1)}x faster`);
}

/**
 * 📋 Usage Examples & Integration Functions
 */

// Terminal Dashboard (Colored)
export function displayTerminalDashboard(metrics: PerfMetric[]): void {
  console.log(generateMasterPerfTable(metrics));
}

// Log File (Plain Text)
export function writeLogfile(metrics: PerfMetric[], filename: string): void {
  const plainLog = generateMasterPerfPlainText(metrics);
  await Bun.write(filename, plainLog);
}

// S3 Export (Structured JSON)
export async function exportToJson(metrics: PerfMetric[], s3Path: string): Promise<void> {
  const jsonData = generateMasterPerfJson(metrics);
  
  // Example S3 write (implementation depends on your S3 client)
  // await s3.write(s3Path, jsonData, {
  //   contentDisposition: `attachment; filename="master-perf-${new Date().toISOString().split('T')[0]}.json"`,
  //   contentType: 'application/json'
  // });
  
  console.log(`📤 Exported ${metrics.length} metrics to ${s3Path}`);
}

// WebSocket Payload (Minimal)
export function createWebSocketPayload(metrics: PerfMetric[]): string {
  const payload = metrics.map(m => ({
    cat: m.category,
    val: m.value,
    scope: m.properties?.scope,
    impact: m.impact
  }));
  
  return JSON.stringify({ masterPerf: payload, timestamp: new Date().toISOString() });
}

/**
 * 🎨 Color Utility Functions
 */
export function getColorHex(category: string): string {
  const color = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS];
  if (!color) return '#3b82f6';
  
  // Extract hex from ANSI color code
  const match = color.match(/\x1b\[38;2;(\d+);(\d+);(\d+)m/);
  if (!match) return '#3b82f6';
  
  const [, r, g, b] = match;
  return `#${r}${g}${b}`;
}

export function getColorNumber(category: string): number {
  const hex = getColorHex(category);
  return Bun.color(hex, "number");
}

export function validateColorPalette(): void {
  console.log('🎨 Color Palette Validation');
  console.log('─'.repeat(40));
  
  Object.entries(CATEGORY_COLORS).forEach(([category, color]) => {
    const hex = getColorHex(category);
    const number = getColorNumber(category);
    console.log(`${category.padEnd(12)} ANSI: ${color.padEnd(20)} Hex: ${hex.padEnd(8)} Number: ${number}`);
  });
}

/**
 * 🚀 Main Export Interface
 */
export const MasterPerfInspector = {
  generateTable: generateMasterPerfTable,
  generatePlainText: generateMasterPerfPlainText,
  generateJson: generateMasterPerfJson,
  displayTerminal: displayTerminalDashboard,
  writeLogfile,
  exportToJson,
  createWebSocketPayload,
  benchmark: benchmarkAnsiStripping,
  validateColors: validateColorPalette,
  getColorHex,
  getColorNumber,
  FormattedPerfMetric
};

export default MasterPerfInspector;
