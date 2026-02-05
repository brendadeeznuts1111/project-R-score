#!/usr/bin/env bun

/**
 * 🎨 Fire22 Benchmark Formatter
 *
 * Beautiful benchmark output using Bun's native formatting utilities
 * - Bun.stringWidth() for accurate column alignment
 * - Bun.inspect() for object serialization
 * - Bun.inspect.table() for tabular data
 */

import { $ } from 'bun';

interface TableColumn {
  key: string;
  header: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
  format?: (value: any) => string;
}

interface BenchmarkTableData {
  test: string;
  value: number;
  unit: string;
  status: '✅' | '⚠️' | '❌' | '➖';
  percentile?: {
    p50: number;
    p95: number;
    p99: number;
  };
}

export class BenchmarkFormatter {
  private readonly colors = {
    reset: '\u001b[0m',
    bold: '\u001b[1m',
    dim: '\u001b[2m',
    red: '\u001b[31m',
    green: '\u001b[32m',
    yellow: '\u001b[33m',
    blue: '\u001b[34m',
    magenta: '\u001b[35m',
    cyan: '\u001b[36m',
    white: '\u001b[37m',
    bgRed: '\u001b[41m',
    bgGreen: '\u001b[42m',
    bgYellow: '\u001b[43m',
    bgBlue: '\u001b[44m',
  };

  /**
   * Format a benchmark result table with proper alignment
   */
  formatTable(data: BenchmarkTableData[], title?: string): string {
    if (title) {
      console.log(this.formatTitle(title));
    }

    // Use Bun.inspect.table for cleaner output
    const tableData = data.map(row => ({
      Test: this.colorize(row.test, 'cyan'),
      Value: this.formatValue(row.value, row.unit),
      Unit: row.unit,
      Status: row.status,
      P50: row.percentile ? this.formatValue(row.percentile.p50, row.unit) : '-',
      P95: row.percentile ? this.formatValue(row.percentile.p95, row.unit) : '-',
      P99: row.percentile ? this.formatValue(row.percentile.p99, row.unit) : '-',
    }));

    // Use Bun's native table formatting
    console.log(Bun.inspect.table(tableData));

    return ''; // Console output handled by Bun.inspect.table
  }

  /**
   * Create a custom formatted table with precise alignment
   */
  createAlignedTable(columns: TableColumn[], data: any[]): string {
    const lines: string[] = [];

    // Calculate column widths using Bun.stringWidth
    const widths = columns.map(col => {
      const headerWidth = Bun.stringWidth(col.header);
      const maxDataWidth = Math.max(
        ...data.map(row => {
          const value = col.format ? col.format(row[col.key]) : String(row[col.key]);
          return Bun.stringWidth(this.stripAnsi(value));
        })
      );
      return Math.max(col.width || 0, headerWidth, maxDataWidth) + 2;
    });

    // Create header
    const header = columns
      .map((col, i) =>
        this.alignText(this.colorize(col.header, 'bold'), widths[i], col.align || 'left')
      )
      .join('│');

    // Create separator
    const separator = widths.map(w => '─'.repeat(w)).join('┼');

    lines.push('┌' + widths.map(w => '─'.repeat(w)).join('┬') + '┐');
    lines.push('│' + header + '│');
    lines.push('├' + separator + '┤');

    // Add data rows
    for (const row of data) {
      const rowStr = columns
        .map((col, i) => {
          const value = col.format ? col.format(row[col.key]) : String(row[col.key]);
          return this.alignText(value, widths[i], col.align || 'left');
        })
        .join('│');
      lines.push('│' + rowStr + '│');
    }

    lines.push('└' + widths.map(w => '─'.repeat(w)).join('┴') + '┘');

    return lines.join('\n');
  }

  /**
   * Format a progress bar with precise width
   */
  formatProgressBar(progress: number, width: number = 30, showPercentage: boolean = true): string {
    const percentage = Math.min(100, Math.max(0, progress));
    const filled = Math.floor((percentage / 100) * width);
    const empty = width - filled;

    const bar = [
      this.colorize('█'.repeat(filled), 'green'),
      this.colorize('░'.repeat(empty), 'dim'),
    ].join('');

    if (showPercentage) {
      const percentStr = `${percentage.toFixed(1)}%`;
      const totalWidth = Bun.stringWidth(bar) + Bun.stringWidth(percentStr) + 2;
      return `[${bar}] ${this.colorize(percentStr, percentage >= 75 ? 'green' : percentage >= 50 ? 'yellow' : 'red')}`;
    }

    return `[${bar}]`;
  }

  /**
   * Format a tree structure for hierarchical data
   */
  formatTree(data: any, indent: number = 0, isLast: boolean = true): string {
    const lines: string[] = [];
    const prefix = indent === 0 ? '' : isLast ? '└── ' : '├── ';
    const connector = indent === 0 ? '' : isLast ? '    ' : '│   ';

    if (typeof data === 'object' && data !== null) {
      const entries = Object.entries(data);
      entries.forEach(([key, value], index) => {
        const isLastEntry = index === entries.length - 1;
        const keyStr = this.colorize(key, 'cyan');

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          lines.push(' '.repeat(indent) + prefix + keyStr);
          lines.push(this.formatTree(value, indent + 4, isLastEntry));
        } else {
          const valueStr = Bun.inspect(value, { colors: true, depth: 1 });
          lines.push(' '.repeat(indent) + prefix + keyStr + ': ' + valueStr);
        }
      });
    } else {
      lines.push(' '.repeat(indent) + prefix + Bun.inspect(data, { colors: true }));
    }

    return lines.filter(line => line.length > 0).join('\n');
  }

  /**
   * Format benchmark comparison with visual diff
   */
  formatComparison(baseline: number, current: number, unit: string): string {
    const diff = current - baseline;
    const percentChange = (diff / baseline) * 100;

    const baselineStr = this.formatValue(baseline, unit);
    const currentStr = this.formatValue(current, unit);
    const diffStr = diff > 0 ? `+${this.formatValue(diff, unit)}` : this.formatValue(diff, unit);

    const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
    const color = this.isImprovement(diff, unit) ? 'green' : diff === 0 ? 'yellow' : 'red';

    const changeStr = this.colorize(`${arrow} ${Math.abs(percentChange).toFixed(1)}%`, color);

    return `${baselineStr} → ${currentStr} (${diffStr}, ${changeStr})`;
  }

  /**
   * Format a sparkline chart
   */
  formatSparkline(values: number[], width: number = 20): string {
    const chars = '▁▂▃▄▅▆▇█';
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    // Resample to fit width
    const samples = [];
    const step = values.length / width;
    for (let i = 0; i < width; i++) {
      const index = Math.floor(i * step);
      samples.push(values[index]);
    }

    return samples
      .map(v => {
        const normalized = (v - min) / range;
        const index = Math.floor(normalized * (chars.length - 1));
        return chars[index];
      })
      .join('');
  }

  /**
   * Format memory size with appropriate units
   */
  formatMemory(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = Math.abs(bytes);
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    const formatted = size < 10 ? size.toFixed(2) : size.toFixed(1);
    const color = unitIndex >= 3 ? 'red' : unitIndex >= 2 ? 'yellow' : 'green';

    return this.colorize(`${formatted} ${units[unitIndex]}`, color);
  }

  /**
   * Format duration with appropriate units
   */
  formatDuration(ns: number): string {
    if (ns < 1000) {
      return this.colorize(`${ns.toFixed(2)}ns`, 'green');
    }
    if (ns < 1_000_000) {
      return this.colorize(`${(ns / 1000).toFixed(2)}μs`, 'green');
    }
    if (ns < 1_000_000_000) {
      const ms = ns / 1_000_000;
      const color = ms < 10 ? 'green' : ms < 100 ? 'yellow' : 'red';
      return this.colorize(`${ms.toFixed(2)}ms`, color);
    }
    return this.colorize(`${(ns / 1_000_000_000).toFixed(2)}s`, 'red');
  }

  /**
   * Create a box around content
   */
  createBox(
    content: string,
    title?: string,
    style: 'single' | 'double' | 'rounded' = 'single'
  ): string {
    const borders = {
      single: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
      double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
      rounded: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
    };

    const border = borders[style];
    const lines = content.split('\n');
    const maxWidth = Math.max(...lines.map(line => Bun.stringWidth(this.stripAnsi(line))));

    const result: string[] = [];

    // Top border
    if (title) {
      const titleStr = ` ${title} `;
      const titleWidth = Bun.stringWidth(titleStr);
      const leftPad = Math.floor((maxWidth - titleWidth + 2) / 2);
      const rightPad = maxWidth - titleWidth - leftPad + 2;
      result.push(
        border.tl +
          border.h.repeat(leftPad) +
          this.colorize(titleStr, 'bold') +
          border.h.repeat(rightPad) +
          border.tr
      );
    } else {
      result.push(border.tl + border.h.repeat(maxWidth + 2) + border.tr);
    }

    // Content
    for (const line of lines) {
      const lineWidth = Bun.stringWidth(this.stripAnsi(line));
      const padding = maxWidth - lineWidth;
      result.push(border.v + ' ' + line + ' '.repeat(padding) + ' ' + border.v);
    }

    // Bottom border
    result.push(border.bl + border.h.repeat(maxWidth + 2) + border.br);

    return result.join('\n');
  }

  /**
   * Format benchmark summary with custom inspect
   */
  formatSummary(data: any): string {
    // Create custom inspect for benchmark objects
    const customData = {
      ...data,
      [Bun.inspect.custom]() {
        return `BenchmarkSummary {
  tests: ${this.totalTests},
  duration: ${this.duration}ms,
  status: ${this.passed ? '✅ PASSED' : '❌ FAILED'}
}`;
      },
    };

    return Bun.inspect(customData, {
      colors: true,
      depth: 3,
      sorted: true,
    });
  }

  // Helper methods

  private formatTitle(title: string): string {
    const width = Bun.stringWidth(title) + 4;
    const border = '═'.repeat(width);

    return [
      this.colorize('╔' + border + '╗', 'cyan'),
      this.colorize('║ ', 'cyan') + this.colorize(title, 'bold') + this.colorize('  ║', 'cyan'),
      this.colorize('╚' + border + '╝', 'cyan'),
    ].join('\n');
  }

  private alignText(text: string, width: number, align: 'left' | 'right' | 'center'): string {
    const textWidth = Bun.stringWidth(this.stripAnsi(text));
    const padding = width - textWidth;

    if (align === 'right') {
      return ' '.repeat(padding) + text;
    } else if (align === 'center') {
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
    } else {
      return text + ' '.repeat(padding);
    }
  }

  private stripAnsi(str: string): string {
    return str.replace(/\u001b\[[0-9;]*m/g, '');
  }

  private colorize(text: string, color: keyof typeof this.colors | 'bold' | 'dim'): string {
    return this.colors[color] + text + this.colors.reset;
  }

  private formatValue(value: number, unit: string): string {
    if (unit.includes('ms') || unit.includes('ns') || unit.includes('μs')) {
      return this.formatDuration(
        unit.includes('ns') ? value : unit.includes('μs') ? value * 1000 : value * 1_000_000
      );
    }
    if (unit.includes('MB') || unit.includes('GB') || unit.includes('KB')) {
      return this.formatMemory(
        unit.includes('KB')
          ? value * 1024
          : unit.includes('MB')
            ? value * 1024 * 1024
            : value * 1024 * 1024 * 1024
      );
    }
    if (unit.includes('ops') || unit.includes('req')) {
      const color = value > 1000 ? 'green' : value > 100 ? 'yellow' : 'red';
      return this.colorize(value.toLocaleString(), color);
    }
    return value.toFixed(2);
  }

  private isImprovement(diff: number, unit: string): boolean {
    // Lower is better for time measurements
    if (unit.includes('ms') || unit.includes('ns') || unit.includes('μs')) {
      return diff < 0;
    }
    // Higher is better for throughput
    if (unit.includes('ops') || unit.includes('req')) {
      return diff > 0;
    }
    // Lower is better for memory
    if (unit.includes('MB') || unit.includes('GB') || unit.includes('KB')) {
      return diff < 0;
    }
    return false;
  }

  /**
   * Display live benchmark progress
   */
  displayProgress(current: number, total: number, message: string): void {
    const progress = (current / total) * 100;
    const bar = this.formatProgressBar(progress, 40);

    // Clear line and write progress
    process.stdout.write('\r' + ' '.repeat(100) + '\r');
    process.stdout.write(`${bar} ${current}/${total} - ${message}`);

    if (current === total) {
      process.stdout.write('\n');
    }
  }

  /**
   * Display benchmark results with charts
   */
  displayResults(results: any[]): void {
    // Group results by category
    const grouped = results.reduce(
      (acc, r) => {
        const category = r.category || 'General';
        if (!acc[category]) acc[category] = [];
        acc[category].push(r);
        return acc;
      },
      {} as Record<string, any[]>
    );

    // Display each category
    for (const [category, items] of Object.entries(grouped)) {
      console.log('\n' + this.createBox(this.formatTree(items), `📊 ${category}`, 'rounded'));

      // Create sparkline for values
      const values = items.map(i => i.value);
      if (values.length > 1) {
        console.log('\n  Trend: ' + this.formatSparkline(values, 30));
      }
    }

    // Display summary table using Bun.inspect.table
    console.log('\n' + this.formatTitle('Summary'));
    console.log(
      Bun.inspect.table(
        results.map(r => ({
          Test: r.test,
          Value: this.formatValue(r.value, r.unit),
          Status: r.passed ? '✅' : '❌',
          Notes: r.notes || '-',
        }))
      )
    );
  }
}

// Example usage and demo
if (import.meta.main) {
  const formatter = new BenchmarkFormatter();

  console.log('\n🎨 Benchmark Formatter Demo\n');

  // Demo 1: Formatted table
  const benchData: BenchmarkTableData[] = [
    {
      test: 'JSON.parse',
      value: 0.125,
      unit: 'ms',
      status: '✅',
      percentile: { p50: 0.1, p95: 0.2, p99: 0.3 },
    },
    {
      test: 'JSON.stringify',
      value: 0.089,
      unit: 'ms',
      status: '✅',
      percentile: { p50: 0.08, p95: 0.15, p99: 0.25 },
    },
    {
      test: 'SHA-256 Hash',
      value: 0.003,
      unit: 'ms',
      status: '✅',
      percentile: { p50: 0.002, p95: 0.005, p99: 0.008 },
    },
    {
      test: 'Array.map (10k)',
      value: 125,
      unit: 'ms',
      status: '⚠️',
      percentile: { p50: 120, p95: 150, p99: 180 },
    },
    { test: 'API Throughput', value: 1523, unit: 'req/s', status: '✅' },
    { test: 'Memory Usage', value: 45.2, unit: 'MB', status: '✅' },
  ];

  formatter.formatTable(benchData, 'Performance Benchmarks');

  // Demo 2: Progress bars
  console.log('\n📊 Progress Examples:\n');
  console.log('Low:    ' + formatter.formatProgressBar(25));
  console.log('Medium: ' + formatter.formatProgressBar(50));
  console.log('High:   ' + formatter.formatProgressBar(75));
  console.log('Done:   ' + formatter.formatProgressBar(100));

  // Demo 3: Comparisons
  console.log('\n⚔️  Comparison Examples:\n');
  console.log('Response Time: ' + formatter.formatComparison(100, 85, 'ms'));
  console.log('Throughput:    ' + formatter.formatComparison(1000, 1200, 'req/s'));
  console.log('Memory:        ' + formatter.formatComparison(50, 45, 'MB'));

  // Demo 4: Sparklines
  console.log('\n📈 Sparkline Examples:\n');
  const trend1 = [10, 12, 8, 15, 20, 18, 25, 22, 30, 28];
  const trend2 = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55];
  console.log('Improving: ' + formatter.formatSparkline(trend1));
  console.log('Degrading: ' + formatter.formatSparkline(trend2));

  // Demo 5: Tree structure
  console.log('\n🌳 Tree Structure:\n');
  const treeData = {
    'Core Benchmarks': {
      'JSON Operations': {
        parse: '0.125ms',
        stringify: '0.089ms',
      },
      Crypto: {
        'SHA-256': '0.003ms',
        UUID: '0.001ms',
      },
    },
    'API Performance': {
      Throughput: '1523 req/s',
      Latency: '15ms',
    },
  };
  console.log(formatter.formatTree(treeData));

  // Demo 6: Boxed content
  console.log(
    '\n' +
      formatter.createBox(
        'Benchmarking Complete!\n' + 'All tests passed ✅\n' + 'No regressions detected',
        'Results',
        'double'
      )
  );

  // Demo 7: Custom aligned table
  const columns: TableColumn[] = [
    { key: 'name', header: 'Benchmark', align: 'left' },
    { key: 'time', header: 'Time', align: 'right', format: v => formatter.formatDuration(v) },
    { key: 'memory', header: 'Memory', align: 'right', format: v => formatter.formatMemory(v) },
    { key: 'status', header: 'Status', align: 'center' },
  ];

  const tableData = [
    { name: 'Startup', time: 5_000_000, memory: 10_485_760, status: '✅' },
    { name: 'Process', time: 125_000_000, memory: 52_428_800, status: '⚠️' },
    { name: 'Cleanup', time: 2_000_000, memory: 5_242_880, status: '✅' },
  ];

  console.log('\n' + formatter.createAlignedTable(columns, tableData));
}

export default BenchmarkFormatter;
