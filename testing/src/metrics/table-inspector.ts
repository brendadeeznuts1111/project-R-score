import { feature } from "bun:bundle";
import { stringWidth } from "bun";

export class TableInspector {
  private static metrics = new Map<string, TableMetrics>();
  
  static createTable(data: any[], options: TableOptions = {}) {
    // @ts-ignore
    const table = Bun.table ? Bun.table(data, options) : {
      toString: () => JSON.stringify(data, null, 2),
      [Symbol.for("bun.table.inspect.custom")]: null
    };
    
    // Add custom inspection method
    const customInspectSymbol = Symbol.for("bun.table.inspect.custom");
    const nodeInspectSymbol = Symbol.for("nodejs.util.inspect.custom");
    
    const inspector = () => {
      return this.inspectTable(table, data, options);
    };

    // @ts-ignore
    table[customInspectSymbol] = inspector;
    // @ts-ignore
    table[nodeInspectSymbol] = inspector;
    
    // Track metrics
    const id = `table_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    this.metrics.set(id, {
      timestamp: new Date(),
      rowCount: data.length,
      columnCount: data[0] ? Object.keys(data[0]).length : 0,
      memoryEstimate: this.estimateMemoryUsage(data),
      renderDuration: 0,
      options: this.sanitizeOptions(options),
    });
    
    return new Proxy(table, {
      get(target, prop) {
        if (prop === 'metrics') {
          return TableInspector.getMetrics(id);
        }
        return target[prop];
      }
    });
  }

  private static getMetrics(id: string) {
    return this.metrics.get(id);
  }

  private static sanitizeOptions(options: TableOptions): any {
    return { ...options };
  }
  
  private static inspectTable(table: any, data: any[], options: TableOptions) {
    const metrics = this.collectMetrics(data, options);
    
    if (feature("TERMINAL_UI")) {
      return this.renderTerminalUI(metrics);
    }
    
    return this.renderJSONMetrics(metrics);
  }
  
  private static collectMetrics(data: any[], options: TableOptions): TableMetrics {
    const start = performance.now();
    
    // Basic metrics
    const rowCount = data.length;
    const columnCount = rowCount > 0 ? Object.keys(data[0]).length : 0;
    
    // Column analysis
    const columnMetrics = this.analyzeColumns(data);
    
    // Performance metrics
    const memoryEstimate = this.estimateMemoryUsage(data);
    const stringMetrics = this.analyzeStringWidths(data);
    
    const duration = performance.now() - start;
    
    const metrics: TableMetrics = {
      timestamp: new Date(),
      rowCount,
      columnCount,
      columnMetrics,
      memoryEstimate,
      stringMetrics,
      renderDuration: duration,
      options: this.sanitizeOptions(options),
    };

    if (feature("PREMIUM")) {
      metrics.recommendations = this.generateRecommendations(metrics);
    }

    return metrics;
  }
  
  private static renderTerminalUI(metrics: TableMetrics): string {
    const lines: string[] = [];
    
    // Header with emoji and proper width
    const header = "📊 TABLE METRICS";
    const headerWidth = stringWidth(header);
    const border = "─".repeat(Math.max(44, headerWidth + 6));
    
    lines.push(`┌${border}┐`);
    lines.push(`│ ${header}${" ".repeat(border.length - headerWidth - 2)}│`);
    lines.push(`├${border}┤`);
    
    // Size metrics
    lines.push(`│ Rows: ${metrics.rowCount.toString().padEnd(8)} Columns: ${metrics.columnCount.toString().padEnd(8)}${" ".repeat(border.length - 30)}│`);
    lines.push(`│ Memory: ${this.formatBytes(metrics.memoryEstimate).padEnd(10)} Render: ${metrics.renderDuration.toFixed(2)}ms ${" ".repeat(border.length - 28)}│`);
    
    // Column breakdown (if DEBUG feature enabled)
    if (feature("DEBUG") && metrics.columnMetrics) {
      lines.push(`├${border}┤`);
      lines.push(`│ ${"COLUMN ANALYSIS".padEnd(border.length - 2)}│`);
      for (const [col, colMetrics] of Object.entries(metrics.columnMetrics)) {
        const typeInfo = `${colMetrics.type}${colMetrics.nullCount > 0 ? ` (${colMetrics.nullCount} nulls)` : ''}`;
        const truncatedType = this.truncateText(typeInfo, 25);
        lines.push(`│ ${col.padEnd(15)} ${truncatedType.padEnd(border.length - 19)}│`);
      }
    }
    
    // String width analysis (PREMIUM feature)
    if (feature("PREMIUM") && metrics.stringMetrics) {
      lines.push(`├${border}┤`);
      lines.push(`│ ${"STRING WIDTH ANALYSIS".padEnd(border.length - 2)}│`);
      for (const [col, width] of Object.entries(metrics.stringMetrics.maxWidths)) {
        const bar = this.createWidthBar(width, metrics.stringMetrics.maxPossibleWidth);
        lines.push(`│ ${col.padEnd(15)} ${bar.padEnd(border.length - 19)}│`);
      }
    }
    
    lines.push(`└${border}┘`);
    
    return lines.join("\n");
  }
  
  private static renderJSONMetrics(metrics: TableMetrics): string {
    // Custom JSON serialization with feature flags
    const json: any = {
      summary: {
        rows: metrics.rowCount,
        columns: metrics.columnCount,
        memory: this.formatBytes(metrics.memoryEstimate),
        renderTime: `${metrics.renderDuration.toFixed(2)}ms`,
      }
    };
    
    if (feature("DEBUG")) {
      json.columns = metrics.columnMetrics;
      json.options = metrics.options;
    }
    
    if (feature("PREMIUM")) {
      json.performance = {
        stringWidths: metrics.stringMetrics,
        recommendations: metrics.recommendations,
      };
    }
    
    return JSON.stringify(json, null, 2);
  }
  
  private static analyzeColumns(data: any[]): Record<string, ColumnMetrics> {
    if (data.length === 0) return {};
    
    const columns = Object.keys(data[0]);
    const metrics: Record<string, ColumnMetrics> = {};
    
    for (const col of columns) {
      const values = data.map(row => row[col]);
      const types = new Set(values.map(v => typeof v));
      
      metrics[col] = {
        type: types.size === 1 ? Array.from(types)[0] : 'mixed',
        uniqueCount: new Set(values.filter(v => v != null)).size,
        nullCount: values.filter(v => v == null).length,
        sampleValues: values.slice(0, 3).filter(v => v != null),
        estimatedWidth: Math.max(...values.map(v => 
          typeof v === 'string' ? stringWidth(String(v)) : String(v).length
        )),
      };
    }
    
    return metrics;
  }
  
  private static analyzeStringWidths(data: any[]): StringWidthMetrics {
    const maxWidths: Record<string, number> = {};
    const totalWidths: Record<string, number> = {};
    let maxPossibleWidth = 0;
    
    if (data.length > 0) {
      const columns = Object.keys(data[0]);
      
      for (const col of columns) {
        const widths = data.map(row => {
          const val = row[col];
          if (typeof val === 'string') {
            return stringWidth(val);
          }
          return String(val).length;
        });
        
        maxWidths[col] = Math.max(...widths);
        totalWidths[col] = widths.reduce((a, b) => a + b, 0);
        maxPossibleWidth = Math.max(maxPossibleWidth, maxWidths[col]);
      }
    }
    
    return {
      maxWidths,
      totalWidths,
      maxPossibleWidth,
      hasWideChars: Object.values(maxWidths).some(w => w > 50),
    };
  }
  
  private static createWidthBar(width: number, max: number): string {
    const barLength = 20;
    const filled = Math.round((width / (max || 1)) * barLength);
    return `[${'█'.repeat(filled)}${'░'.repeat(barLength - filled)}] ${width} chars`;
  }
  
  private static truncateText(text: string, maxLength: number): string {
    if (stringWidth(text) <= maxLength) return text;
    
    let result = '';
    let currentWidth = 0;
    
    for (const char of text) {
      const charWidth = stringWidth(char);
      if (currentWidth + charWidth > maxLength - 3) {
        result += '...';
        break;
      }
      result += char;
      currentWidth += charWidth;
    }
    
    return result;
  }
  
  private static formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
  
  private static estimateMemoryUsage(data: any[]): number {
    let total = 0;
    
    for (const row of data) {
      for (const value of Object.values(row)) {
        if (typeof value === 'string') {
          total += value.length * 2;
        } else if (typeof value === 'number') {
          total += 8;
        } else if (typeof value === 'boolean') {
          total += 1;
        } else if (value === null || value === undefined) {
          total += 0;
        } else {
          total += JSON.stringify(value).length * 2;
        }
      }
    }
    
    total += data.length * 50;
    
    return total;
  }
  
  private static generateRecommendations(metrics: TableMetrics): string[] {
    const recommendations: string[] = [];
    
    if (metrics.rowCount > 10000) {
      recommendations.push("Consider pagination or virtual scrolling for large datasets");
    }
    
    if (metrics.stringMetrics?.hasWideChars) {
      recommendations.push("Wide characters detected - ensure proper terminal width handling");
    }
    
    if (metrics.columnCount > 10) {
      recommendations.push("High column count may affect readability - consider column grouping");
    }
    
    return recommendations;
  }
}

// Type definitions
export interface TableMetrics {
  timestamp: Date;
  rowCount: number;
  columnCount: number;
  columnMetrics?: Record<string, ColumnMetrics>;
  memoryEstimate: number;
  stringMetrics?: StringWidthMetrics;
  renderDuration: number;
  options: any;
  recommendations?: string[];
}

export interface ColumnMetrics {
  type: string;
  uniqueCount: number;
  nullCount: number;
  sampleValues: any[];
  estimatedWidth: number;
}

export interface StringWidthMetrics {
  maxWidths: Record<string, number>;
  totalWidths: Record<string, number>;
  maxPossibleWidth: number;
  hasWideChars: boolean;
}

export interface TableOptions {
  [key: string]: any;
}
