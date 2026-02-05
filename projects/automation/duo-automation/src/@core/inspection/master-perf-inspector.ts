/**
 * 🎨 Enhanced MASTER_PERF Inspector with Bun.color() and Bun.stripANSI()
 * Dual-mode system: Rich ANSI colors for terminal, clean plain-text for exports
 * Integrated with Supercharged URI Security Inspection System
 */

import { custom as inspectCustom } from "bun";
import { PerfMetric } from "../storage/r2-apple-manager";

// Import our supercharged URI inspection system classes directly
import { ProductionUriInspector } from "../../../cli/production-uri-inspector.js";
import { AdvancedUriInspector } from "../../../cli/advanced-uri-inspector.js";

/**
 * Simple timezone config for demo purposes
 */
function getActiveTimezoneConfig() {
  return {
    timezone: 'America/New_York',
    displayName: 'Eastern Time (ET)',
    offset: -5
  };
}

/**
 * Custom table implementation for Bun
 */
function createTable(data: any[], options: { 
  columns?: string[]; 
  indent?: number; 
  colors?: boolean 
} = {}): string {
  const { columns = Object.keys(data[0] || {}), indent = 0, colors = true } = options;
  
  if (data.length === 0) return 'No data to display';
  
  // Calculate column widths
  const widths: Record<string, number> = {};
  columns.forEach(col => {
    widths[col] = Math.max(
      col.length,
      ...data.map(row => String(row[col] || '').length)
    );
  });
  
  const indentStr = ' '.repeat(indent);
  const separator = indentStr + '┌' + 
    columns.map(col => '─'.repeat(widths[col] + 2)).join('┬') + '┐';
  const headerSeparator = indentStr + '├' + 
    columns.map(col => '─'.repeat(widths[col] + 2)).join('┼') + '┤';
  const footer = indentStr + '└' + 
    columns.map(col => '─'.repeat(widths[col] + 2)).join('┴') + '┘';
  
  // Build table
  let result = separator + '\n';
  
  // Header
  result += indentStr + '│';
  columns.forEach(col => {
    const header = col.padEnd(widths[col]);
    result += ` ${header} │`;
  });
  result += '\n' + headerSeparator + '\n';
  
  // Data rows
  data.forEach(row => {
    result += indentStr + '│';
    columns.forEach(col => {
      const cell = String(row[col] || '').padEnd(widths[col]);
      result += ` ${cell} │`;
    });
    result += '\n';
  });
  
  result += footer;
  return result;
}

/**
 * 🎨 Color palette using Bun.color() for consistent, precise 24-bit colors
 * Enhanced with URI Security Inspection categories
 */
const CATEGORY_COLORS = {
  Security: Bun.color("#3b82f6", "ansi"),    // Red
  R2: Bun.color("#3b82f6", "ansi"),         // Blue  
  Isolation: Bun.color("#3b82f6", "ansi"),  // Purple
  Zstd: Bun.color("#3b82f6", "ansi"),       // Orange
  Demo: Bun.color("#3b82f6", "ansi"),       // Gray
  Performance: Bun.color("#3b82f6", "ansi"), // Green
  Network: Bun.color("#3b82f6", "ansi"),     // Coral
  Database: Bun.color("#3b82f6", "ansi"),   // Cyan
  'URI-Inspection': Bun.color("#3b82f6", "ansi"),  // Magenta
  'Zero-Width': Bun.color("#8b5cf6", "ansi"),     // Bright Magenta
  'Encoding-Anomaly': Bun.color("#3b82f6", "ansi"), // Dark Orange
  'Security-Risk': Bun.color("#3b82f6", "ansi")     // Dark Red
} as const;

const STATUS_COLORS = {
  success: Bun.color("#3b82f6", "ansi"),    // Green
  warning: Bun.color("#3b82f6", "ansi"),    // Yellow  
  error: Bun.color("#3b82f6", "ansi"),      // Red
  info: Bun.color("#3b82f6", "ansi"),       // Light blue
  'security-pass': Bun.color("#22c55e", "ansi"),    // Bright Green
  'security-warn': Bun.color("#3b82f6", "ansi"),    // Orange
  'security-critical': Bun.color("#ef4444", "ansi"), // Bright Red
  'zero-width-detected': Bun.color("#8b5cf6", "ansi"), // Bright Magenta
  'encoding-anomaly': Bun.color("#3b82f6", "ansi")    // Dark Orange
} as const;

const SCOPE_COLORS = {
  ENTERPRISE: Bun.color("#3b82f6", "ansi"),    // Red
  DEVELOPMENT: Bun.color("#3b82f6", "ansi"),    // Blue
  'LOCAL-SANDBOX': Bun.color("#3b82f6", "ansi") // Green
} as const;

/**
 * 🎯 Enhanced MASTER_PERF metric with Bun.color() formatting
 */
export class FormattedPerfMetric {
  private metric: PerfMetric;
  
  constructor(metric: PerfMetric) {
    this.metric = metric;
  }

  // Category with precise ANSI color and emoji
  // Enhanced with URI Security Inspection categories
  get category(): string {
    const emojis: Record<string, string> = {
      Security: '🔒',
      R2: '☁️',
      Isolation: '🛡️',
      Zstd: '📦',
      Demo: '🧪',
      Performance: '⚡',
      Network: '🌐',
      Database: '🗄️',
      'URI-Inspection': '🔍',
      'Zero-Width': 'Ⓩ',
      'Encoding-Anomaly': '🚨',
      'Security-Risk': '⚠️'
    };
    
    const emoji = emojis[this.metric.category] || '📊';
    const color = CATEGORY_COLORS[this.metric.category as keyof typeof CATEGORY_COLORS] || '';
    return `${emoji} ${color}${this.metric.category}\x1b[0m`;
  }

  // Value with latency-based status coloring
  // Enhanced with URI Security Inspection status detection
  get value(): string {
    let status: keyof typeof STATUS_COLORS = 'success';
    
    // Check for URI security inspection specific values
    if (this.metric.value.includes('SECURITY-PASS')) {
      status = 'security-pass';
    } else if (this.metric.value.includes('SECURITY-WARN')) {
      status = 'security-warn';
    } else if (this.metric.value.includes('SECURITY-CRITICAL')) {
      status = 'security-critical';
    } else if (this.metric.value.includes('ZERO-WIDTH-DETECTED')) {
      status = 'zero-width-detected';
    } else if (this.metric.value.includes('ENCODING-ANOMALY')) {
      status = 'encoding-anomaly';
    } else if (this.metric.value.includes('ms')) {
      const ms = parseFloat(this.metric.value);
      if (ms > 100) status = 'error';
      else if (ms > 50) status = 'warning';
    } else if (this.metric.value.includes('MB/s')) {
      const throughput = parseFloat(this.metric.value);
      if (throughput < 10) status = 'error';
      else if (throughput < 50) status = 'warning';
    }
    
    const color = STATUS_COLORS[status];
    return `${color}${this.metric.value}\x1b[0m`;
  }

  // Scope-aware ID with flag emoji and color
  get id(): string {
    const scope = this.metric.properties?.scope || 'global';
    let flag = '🌐';
    
    if (scope === 'ENTERPRISE') flag = '🇺🇸';
    else if (scope === 'DEVELOPMENT') flag = '🇬🇧';
    else if (scope === 'LOCAL-SANDBOX') flag = '🏠';
    
    const scopeColor = SCOPE_COLORS[scope as keyof typeof SCOPE_COLORS] || '';
    return `${flag} ${scopeColor}${this.metric.id}\x1b[0m`;
  }

  // Type with formatting
  get type(): string {
    const typeIcons: Record<string, string> = {
      latency: '⏱️',
      throughput: '📈',
      memory: '💾',
      cpu: '🔥',
      network: '🌐',
      storage: '💿',
      error: '❌',
      success: '✅'
    };
    
    const icon = typeIcons[this.metric.type] || '📊';
    return `${icon} ${this.metric.type}`;
  }

  // Topic with truncation and emoji
  // Enhanced with URI Security Inspection topics
  get topic(): string {
    const topicIcons: Record<string, string> = {
      'bun-native': '🦊',
      'cloudflare': '☁️',
      'r2-storage': '📦',
      'security': '🔒',
      'performance': '⚡',
      'isolation': '🛡️',
      'zstd': '🗜️',
      'demo': '🧪',
      'uri-inspection': '🔍',
      'zero-width-analysis': 'Ⓩ',
      'encoding-analysis': '🚨',
      'security-risk-analysis': '⚠️',
      'unicode-security': '🌐',
      'anomaly-detection': '🔬'
    };
    
    const icon = topicIcons[this.metric.topic] || '📋';
    const maxWidth = 20;
    let topic = this.metric.topic;
    
    if (Bun.stringWidth(topic) > maxWidth) {
      let truncated = '';
      let currentWidth = 0;
      for (const char of topic) {
        const w = Bun.stringWidth(char);
        if (currentWidth + w > maxWidth - 3) break;
        truncated += char;
        currentWidth += w;
      }
      topic = truncated + '...';
    }
    
    return `${icon} ${topic}`;
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

  // Impact with status emoji and coloring
  get impact(): string {
    let statusEmoji = '🟢';
    let statusColor: keyof typeof STATUS_COLORS = 'success';
    
    if (this.metric.value.includes('ms')) {
      const ms = parseFloat(this.metric.value);
      if (ms > 100) {
        statusEmoji = '🔴';
        statusColor = 'error';
      } else if (ms > 50) {
        statusEmoji = '🟡';
        statusColor = 'warning';
      }
    } else if (this.metric.impact.toLowerCase().includes('high')) {
      statusEmoji = '🔴';
      statusColor = 'error';
    } else if (this.metric.impact.toLowerCase().includes('medium')) {
      statusEmoji = '🟡';
      statusColor = 'warning';
    }
    
    const color = STATUS_COLORS[statusColor];
    return `${statusEmoji} ${color}${this.metric.impact}\x1b[0m`;
  }

  // Properties summary (ANSI-stripped for clean display)
  get properties(): string {
    if (!this.metric.properties) return '—';
    
    const keys = Object.keys(this.metric.properties);
    if (keys.length === 0) return '—';
    
    // Create a clean, ANSI-free summary for properties column
    const summary = keys.map(k => `${k}: ${this.metric.properties![k]}`).join(', ');
    return Bun.stripANSI(summary); // Ensure no ANSI leaks into properties
  }

  // Get color as number for database storage
  getCategoryColorNumber(): number {
    const hexColor = this.metric.category in CATEGORY_COLORS ? 
      Object.keys(CATEGORY_COLORS).find(key => key === this.metric.category) : '#3b82f6';
    return Bun.color(hexColor || '#3b82f6', "number");
  }

  // Get status as string for storage
  getValueStatus(): string {
    if (this.metric.value.includes('ms')) {
      const ms = parseFloat(this.metric.value);
      if (ms > 100) return 'error';
      else if (ms > 50) return 'warning';
      else return 'success';
    }
    return 'info';
  }

  [inspectCustom](depth: number, options: any): string {
    return `PerfMetric(${this.metric.category}:${this.metric.type})`;
  }

  // Get raw metric for JSON export
  toRaw(): PerfMetric {
    return this.metric;
  }

  // Get enhanced metric with color data for storage
  toEnhanced(): PerfMetric & { 
    categoryColorNumber: number;
    valueStatus: string;
    formattedCategory: string;
    formattedValue: string;
  } {
    return {
      ...this.metric,
      categoryColorNumber: this.getCategoryColorNumber(),
      valueStatus: this.getValueStatus(),
      formattedCategory: Bun.stripANSI(this.category),
      formattedValue: Bun.stripANSI(this.value)
    };
  }
}

/**
 * 🧪 Dual-Mode Output Functions
 */

/**
 * 1. Colored Terminal Output (for dashboards, CLI)
 */
export function generateMasterPerfTable(
  metrics: PerfMetric[],
  options: { 
    maxRows?: number; 
    showProperties?: boolean;
    sortBy?: 'category' | 'value' | 'impact' | 'timestamp';
  } = {}
): string {
  const { maxRows = 100, showProperties = false, sortBy = 'category' } = options;
  
  // Sort metrics
  let sortedMetrics = [...metrics];
  if (sortBy === 'category') {
    sortedMetrics.sort((a, b) => a.category.localeCompare(b.category));
  } else if (sortBy === 'value') {
    sortedMetrics.sort((a, b) => {
      const aMs = parseFloat(a.value) || 0;
      const bMs = parseFloat(b.value) || 0;
      return bMs - aMs; // Descending (worst first)
    });
  }

  const processed = sortedMetrics.slice(0, maxRows).map(m => new FormattedPerfMetric(m));
  
  const columns = showProperties ? 
    ['category', 'type', 'topic', 'id', 'value', 'locations', 'impact', 'properties'] :
    ['category', 'type', 'topic', 'id', 'value', 'locations', 'impact'];
  
  const table = createTable(processed, {
    columns,
    indent: 2,
    colors: true
  });

  const timezone = getActiveTimezoneConfig();
  const timestamp = new Date().toLocaleString('en-US', {
    timeZone: timezone.timezone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return `\n` +
         `🎨 MASTER_PERF Matrix • ${metrics.length} metrics\n` +
         `📅 ${timestamp} • ${timezone.displayName}\n` +
         `📏 Terminal: ${process.stdout.columns || 120} chars • Max rows: ${maxRows}\n` +
         `${'─'.repeat(Math.min(process.stdout.columns || 120, 80))}\n` +
         table +
         `\n${'─'.repeat(Math.min(process.stdout.columns || 120, 80))}\n`;
}

/**
 * 2. Plain-Text Export (for logs, CSV, S3)
 */
export function generateMasterPerfPlainText(
  metrics: PerfMetric[],
  options: { maxRows?: number; includeHeaders?: boolean } = {}
): string {
  const { maxRows = 100, includeHeaders = true } = options;
  
  const coloredTable = generateMasterPerfTable(metrics, { maxRows });
  const plainTable = Bun.stripANSI(coloredTable);
  
  if (!includeHeaders) {
    // Remove header lines, keep only the table data
    const lines = plainTable.split('\n');
    const startIdx = lines.findIndex(line => line.includes('category')) + 2;
    const endIdx = lines.findIndex(line => line.includes('─'));
    return lines.slice(startIdx, endIdx).join('\n');
  }
  
  return plainTable;
}

/**
 * 3. JSON Export with Normalized Colors
 */
export function generateMasterPerfJson(
  metrics: PerfMetric[],
  options: { includeColors?: boolean; includeFormatted?: boolean } = {}
): string {
  const { includeColors = true, includeFormatted = true } = options;
  
  const processed = metrics.map(m => new FormattedPerfMetric(m));
  
  if (includeColors && includeFormatted) {
    return JSON.stringify(processed.map(m => m.toEnhanced()), null, 2);
  } else if (includeColors) {
    return JSON.stringify(processed.map(m => ({
      ...m.toRaw(),
      categoryColorNumber: m.getCategoryColorNumber(),
      valueStatus: m.getValueStatus()
    })), null, 2);
  } else {
    return JSON.stringify(metrics, null, 2);
  }
}

/**
 * 4. CSV Export (for spreadsheet analysis)
 */
export function generateMasterPerfCsv(
  metrics: PerfMetric[],
  options: { maxRows?: number; includeHeaders?: boolean } = {}
): string {
  const { maxRows = 100, includeHeaders = true } = options;
  
  const processed = metrics.slice(0, maxRows).map(m => new FormattedPerfMetric(m));
  
  const headers = [
    'timestamp',
    'category', 
    'type',
    'topic',
    'id',
    'value',
    'locations',
    'impact',
    'scope',
    'valueStatus',
    'categoryColorNumber'
  ];
  
  const rows = processed.map(m => [
    m.metric.timestamp,
    Bun.stripANSI(m.category),
    m.type,
    m.topic,
    m.metric.id,
    Bun.stripANSI(m.value),
    m.locations,
    Bun.stripANSI(m.impact),
    m.metric.properties?.scope || 'global',
    m.getValueStatus(),
    m.getCategoryColorNumber()
  ]);
  
  let csv = '';
  if (includeHeaders) {
    csv += headers.join(',') + '\n';
  }
  
  rows.forEach(row => {
    csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
  });
  
  return csv;
}

/**
 * 5. WebSocket Payload (minimal, real-time)
 */
export function generateMasterPerfWebSocket(
  metrics: PerfMetric[],
  options: { maxRows?: number; minimal?: boolean } = {}
): string {
  const { maxRows = 50, minimal = true } = options;
  
  if (minimal) {
    // Send only essential data for real-time updates
    const payload = metrics.slice(0, maxRows).map(m => {
      const formatted = new FormattedPerfMetric(m);
      return {
        id: m.id,
        cat: m.category,
        typ: m.type,
        val: m.value,
        imp: m.impact,
        col: formatted.getCategoryColorNumber(),
        stat: formatted.getValueStatus(),
        scope: m.properties?.scope || 'global'
      };
    });
    
    return JSON.stringify({ 
      type: 'masterPerf',
      timestamp: Date.now(),
      count: payload.length,
      data: payload 
    });
  } else {
    // Full data for detailed views
    return JSON.stringify({
      type: 'masterPerfFull',
      timestamp: Date.now(),
      data: metrics.slice(0, maxRows).map(m => new FormattedPerfMetric(m).toEnhanced())
    });
  }
}

/**
 * 6. HTML Table Export (for dashboard embedding)
 */
export function generateMasterPerfHtml(
  metrics: PerfMetric[],
  options: { maxRows?: number; includeStyles?: boolean } = {}
): string {
  const { maxRows = 100, includeStyles = true } = options;
  
  const processed = metrics.slice(0, maxRows).map(m => new FormattedPerfMetric(m));
  
  const css = includeStyles ? `
    <style>
      .master-perf-table {
        border-collapse: collapse;
        font-family: 'Monaco', 'Courier New', monospace;
        font-size: 12px;
        width: 100%;
      }
      .master-perf-table th,
      .master-perf-table td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }
      .master-perf-table th {
        background-color: #3b82f6;
        font-weight: bold;
      }
      .category-security { color: #3b82f6; }
      .category-r2 { color: #3b82f6; }
      .category-isolation { color: #3b82f6; }
      .category-zstd { color: #3b82f6; }
      .category-demo { color: #3b82f6; }
      .status-success { color: #3b82f6; }
      .status-warning { color: #3b82f6; }
      .status-error { color: #3b82f6; }
    </style>
  ` : '';
  
  const html = `
    ${css}
    <table class="master-perf-table">
      <thead>
        <tr>
          <th>Category</th>
          <th>Type</th>
          <th>Topic</th>
          <th>ID</th>
          <th>Value</th>
          <th>Locations</th>
          <th>Impact</th>
        </tr>
      </thead>
      <tbody>
        ${processed.map(m => `
          <tr>
            <td class="category-${m.metric.category.toLowerCase()}">${Bun.stripANSI(m.category)}</td>
            <td>${m.type}</td>
            <td>${m.topic}</td>
            <td>${Bun.stripANSI(m.id)}</td>
            <td class="status-${m.getValueStatus()}">${Bun.stripANSI(m.value)}</td>
            <td>${m.locations}</td>
            <td class="status-${m.getValueStatus()}">${Bun.stripANSI(m.impact)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  return html;
}

/**
 * 🚀 Performance comparison utilities
 */
export function comparePerformanceMetrics(
  metrics1: PerfMetric[],
  metrics2: PerfMetric[]
): string {
  const formatted1 = metrics1.map(m => new FormattedPerfMetric(m));
  const formatted2 = metrics2.map(m => new FormattedPerfMetric(m));
  
  const improvements: string[] = [];
  const degradations: string[] = [];
  
  // Compare common metrics by ID
  const common1 = formatted1.filter(m1 => 
    formatted2.some(m2 => m2.metric.id === m1.metric.id)
  );
  
  common1.forEach(m1 => {
    const m2 = formatted2.find(m => m.metric.id === m1.metric.id);
    if (!m2) return;
    
    const val1 = parseFloat(m1.metric.value) || 0;
    const val2 = parseFloat(m2.metric.value) || 0;
    
    if (val1 > 0 && val2 > 0) {
      const change = ((val2 - val1) / val1) * 100;
      if (Math.abs(change) > 5) { // Only show significant changes
        const arrow = change > 0 ? '📈' : '📉';
        const color = change > 0 ? STATUS_COLORS.error : STATUS_COLORS.success;
        const message = `${arrow} ${m1.metric.id}: ${val1} → ${val2} (${change > 0 ? '+' : ''}${change.toFixed(1)}%)`;
        
        if (change > 0) {
          degradations.push(`${color}${message}\x1b[0m`);
        } else {
          improvements.push(`${color}${message}\x1b[0m`);
        }
      }
    }
  });
  
  let result = `\n📊 Performance Comparison\n`;
  
  if (improvements.length > 0) {
    result += `\n✅ Improvements:\n${improvements.join('\n')}\n`;
  }
  
  if (degradations.length > 0) {
    result += `\n❌ Degradations:\n${degradations.join('\n')}\n`;
  }
  
  if (improvements.length === 0 && degradations.length === 0) {
    result += `\n📈 No significant performance changes detected\n`;
  }
  
  return result;
}

/**
 * 🛡️ URI Security Inspection Integration
 * Convert URI inspection results to MASTER_PERF metrics
 */

// Define InspectionResult interface locally to avoid circular imports
interface InspectionResult {
  timestamp: string;
  uri: string;
  status: string;
  category: string;
  message: string;
  decodedUri?: string;
  zeroWidthAnalysis: any;
  encodingAnomalies: string[];
  securityRisk: string;
  displayWidth: number;
  processingTime: number;
}

export function convertUriInspectionToPerfMetrics(
  inspectionResults: InspectionResult[],
  scope: string = 'DEVELOPMENT'
): PerfMetric[] {
  return inspectionResults.map((result, index) => {
    const timestamp = new Date().toISOString();
    const baseMetric: PerfMetric = {
      id: `uri-inspection-${index}-${Date.now()}`,
      category: 'URI-Inspection',
      type: 'security-scan',
      topic: 'uri-inspection',
      value: result.status,
      locations: `uri-inspector:${index}`,
      impact: result.securityRisk,
      timestamp,
      properties: {
        scope,
        originalUri: result.uri,
        processingTime: result.processingTime,
        zeroWidthCount: result.zeroWidthAnalysis?.count || 0,
        encodingAnomalies: result.encodingAnomalies?.length || 0,
        displayWidth: result.displayWidth
      }
    };

    // Create additional metrics for specific security issues
    const additionalMetrics: PerfMetric[] = [];

    // Zero-width character detection metric
    if (result.zeroWidthAnalysis?.has) {
      additionalMetrics.push({
        id: `zero-width-${index}-${Date.now()}`,
        category: 'Zero-Width',
        type: 'anomaly-detection',
        topic: 'zero-width-analysis',
        value: `ZERO-WIDTH-DETECTED (${result.zeroWidthAnalysis.count})`,
        locations: `zero-width-detector:${index}`,
        impact: 'HIGH',
        timestamp,
        properties: {
          scope,
          originalUri: result.uri,
          positions: result.zeroWidthAnalysis.positions,
          types: result.zeroWidthAnalysis.types
        }
      });
    }

    // Encoding anomaly detection metric
    if (result.encodingAnomalies?.length > 0) {
      additionalMetrics.push({
        id: `encoding-anomaly-${index}-${Date.now()}`,
        category: 'Encoding-Anomaly',
        type: 'anomaly-detection',
        topic: 'encoding-analysis',
        value: `ENCODING-ANOMALY (${result.encodingAnomalies.length})`,
        locations: `encoding-detector:${index}`,
        impact: 'MEDIUM',
        timestamp,
        properties: {
          scope,
          originalUri: result.uri,
          anomalies: result.encodingAnomalies
        }
      });
    }

    // Security risk metric
    if (result.securityRisk === 'HIGH' || result.securityRisk === 'CRITICAL') {
      additionalMetrics.push({
        id: `security-risk-${index}-${Date.now()}`,
        category: 'Security-Risk',
        type: 'risk-assessment',
        topic: 'security-risk-analysis',
        value: `SECURITY-${result.securityRisk}`,
        locations: `security-analyzer:${index}`,
        impact: result.securityRisk,
        timestamp,
        properties: {
          scope,
          originalUri: result.uri,
          riskLevel: result.securityRisk,
          message: result.message
        }
      });
    }

    return [baseMetric, ...additionalMetrics];
  }).flat();
}

/**
 * 🚀 Integrated URI Security Inspection with MASTER_PERF
 */
export async function runIntegratedUriSecurityInspection(
  uris: string[],
  scope: string = 'DEVELOPMENT'
): Promise<{
  inspectionResults: InspectionResult[];
  perfMetrics: PerfMetric[];
  summary: string;
}> {
  const startTime = Date.now();
  
  // Initialize production URI inspector directly
  const uriInspector = new ProductionUriInspector();
  
  console.log(`🔍 Running URI Security Inspection on ${uris.length} URIs...`);
  
  // Inspect each URI
  const inspectionResults: InspectionResult[] = [];
  for (const uri of uris) {
    try {
      // Use the production URI inspector directly
      const result = uriInspector.inspectUri(uri);
      inspectionResults.push({
        timestamp: new Date().toISOString(),
        uri: result.uri,
        status: result.status,
        category: result.category,
        message: result.message,
        decodedUri: result.decodedUri,
        zeroWidthAnalysis: result.zeroWidthAnalysis,
        encodingAnomalies: result.encodingAnomalies,
        securityRisk: result.securityRisk,
        displayWidth: result.displayWidth,
        processingTime: result.processingTime
      });
    } catch (error) {
      console.error(`❌ Failed to inspect ${uri}:`, error);
    }
  }
  
  // Convert to MASTER_PERF metrics
  const perfMetrics = convertUriInspectionToPerfMetrics(inspectionResults, scope);
  
  // Generate summary
  const totalTime = Date.now() - startTime;
  const securityIssues = inspectionResults.filter(r => r.securityRisk === 'HIGH' || r.securityRisk === 'CRITICAL').length;
  const zeroWidthIssues = inspectionResults.filter(r => r.zeroWidthAnalysis?.has).length;
  const encodingAnomalies = inspectionResults.filter(r => r.encodingAnomalies?.length > 0).length;
  
  const summary = `
🛡️ URI Security Inspection Summary
═════════════════════════════════════════════════
📊 Total URIs Inspected: ${uris.length}
🔍 Security Issues: ${securityIssues}
Ⓩ Zero-Width Characters: ${zeroWidthIssues}
🚨 Encoding Anomalies: ${encodingAnomalies}
⏱️ Total Processing Time: ${totalTime}ms
📈 Average Processing Time: ${(totalTime / uris.length).toFixed(2)}ms
🎯 Success Rate: ${((inspectionResults.length / uris.length) * 100).toFixed(1)}%
`;
  
  return {
    inspectionResults,
    perfMetrics,
    summary
  };
}

/**
 * 📊 Generate integrated URI Security Dashboard
 */
export function generateUriSecurityDashboard(
  perfMetrics: PerfMetric[],
  options: { maxRows?: number; includeCharts?: boolean } = {}
): string {
  const { maxRows = 50, includeCharts = true } = options;
  
  // Filter URI security metrics
  const uriSecurityMetrics = perfMetrics.filter(m => 
    m.category === 'URI-Inspection' || 
    m.category === 'Zero-Width' || 
    m.category === 'Encoding-Anomaly' || 
    m.category === 'Security-Risk'
  );
  
  // Generate main table
  const mainTable = generateMasterPerfTable(uriSecurityMetrics, { 
    maxRows, 
    showProperties: true,
    sortBy: 'impact'
  });
  
  let dashboard = mainTable;
  
  if (includeCharts) {
    // Add security risk distribution chart
    const riskDistribution = uriSecurityMetrics.reduce((acc, m) => {
      acc[m.impact] = (acc[m.impact] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const riskChart = `
📊 Security Risk Distribution:
${Object.entries(riskDistribution).map(([risk, count]) => {
  const bar = '█'.repeat(Math.min(count * 2, 20));
  const color = risk === 'CRITICAL' ? STATUS_COLORS.error : 
                risk === 'HIGH' ? STATUS_COLORS.error :
                risk === 'MEDIUM' ? STATUS_COLORS.warning :
                STATUS_COLORS.success;
  return `   ${color}${risk.padEnd(10)}\x1b[0m ${color}${bar}\x1b[0m ${count}`;
}).join('\n')}
`;
    
    dashboard += riskChart;
  }
  
  return dashboard;
}

/**
 * 🎯 Enhanced test function with URI Security Inspection
 */
export async function testMasterPerfInspector(): Promise<void> {
  const testMetrics: PerfMetric[] = [
    {
      id: 'test-latency-1',
      category: 'Performance',
      type: 'latency',
      topic: 'bun-native',
      value: '25ms',
      locations: 'src/inspection/master-perf-inspector.ts:45',
      impact: 'medium',
      timestamp: new Date().toISOString(),
      properties: { scope: 'DEVELOPMENT' }
    },
    {
      id: 'test-throughput-1',
      category: 'R2',
      type: 'throughput',
      topic: 'cloudflare',
      value: '150MB/s',
      locations: 'src/storage/r2-apple-manager.ts:120',
      impact: 'high',
      timestamp: new Date().toISOString(),
      properties: { scope: 'ENTERPRISE' }
    }
  ];
  
  console.log('\n🧪 Testing Enhanced MASTER_PERF Inspector with URI Security Integration\n');
  
  console.log('\n📊 Colored Terminal Output:');
  console.log(generateMasterPerfTable(testMetrics));
  
  console.log('\n📄 Plain Text Output:');
  console.log(generateMasterPerfPlainText(testMetrics));
  
  console.log('\n📋 JSON Output:');
  console.log(generateMasterPerfJson(testMetrics, { includeColors: true }));
  
  console.log('\n📈 CSV Output:');
  console.log(generateMasterPerfCsv(testMetrics));
  
  console.log('\n🌐 WebSocket Output:');
  console.log(generateMasterPerfWebSocket(testMetrics, { minimal: true }));
  
  // Test URI Security Inspection Integration
  console.log('\n🛡️ Testing URI Security Inspection Integration:');
  
  const testUris = [
    'https://example.com/api/users',
    'https://malicious-site.com/phish?redirect=evil.com',
    'https://test.com/path\u200bwith\u200czero-width\u200dchars',
    'https://example.com/normal-path'
  ];
  
  try {
    const { inspectionResults, perfMetrics, summary } = await runIntegratedUriSecurityInspection(testUris);
    
    console.log(summary);
    
    console.log('\n🔍 URI Security Inspection Results:');
    console.log(generateUriSecurityDashboard(perfMetrics, { maxRows: 20, includeCharts: true }));
    
    console.log('\n📊 Converted MASTER_PERF Metrics:');
    console.log(generateMasterPerfTable(perfMetrics, { maxRows: 10, showProperties: true }));
    
  } catch (error) {
    console.error('❌ URI Security Inspection test failed:', error);
  }
}

// Export color constants for external use
export { CATEGORY_COLORS, STATUS_COLORS, SCOPE_COLORS };
