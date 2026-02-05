#!/usr/bin/env bun

/**
 * 📊 Fire22 Benchmark Reporter
 *
 * Generate comprehensive benchmark reports in multiple formats
 * Includes trend analysis, comparisons, and visualizations
 */

import { $ } from 'bun';

interface BenchmarkData {
  name: string;
  timestamp: string;
  results: Array<{
    test: string;
    value: number;
    unit: string;
    metadata?: Record<string, any>;
  }>;
  environment: {
    bun: string;
    platform: string;
    arch: string;
    memory: number;
    cpus: number;
  };
}

interface TrendData {
  test: string;
  values: Array<{ timestamp: string; value: number }>;
  trend: 'improving' | 'degrading' | 'stable';
  changePercent: number;
}

export class BenchmarkReporter {
  private historyFile = '.benchmark-history.json';
  private maxHistory = 100;

  constructor() {}

  /**
   * Generate comprehensive report
   */
  async generateReport(
    data: BenchmarkData,
    format: 'json' | 'markdown' | 'html' | 'csv' = 'markdown'
  ): Promise<string> {
    switch (format) {
      case 'json':
        return this.generateJsonReport(data);
      case 'markdown':
        return this.generateMarkdownReport(data);
      case 'html':
        return this.generateHtmlReport(data);
      case 'csv':
        return this.generateCsvReport(data);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Generate JSON report
   */
  private generateJsonReport(data: BenchmarkData): string {
    const history = this.loadHistory();
    const trends = this.analyzeTrends(data, history);

    return JSON.stringify(
      {
        ...data,
        trends,
        history: history.slice(-10), // Last 10 runs
        summary: this.generateSummary(data),
      },
      null,
      2
    );
  }

  /**
   * Generate Markdown report
   */
  private generateMarkdownReport(data: BenchmarkData): string {
    const lines: string[] = [
      `# 📊 Benchmark Report`,
      '',
      `**Generated:** ${new Date(data.timestamp).toLocaleString()}`,
      `**Name:** ${data.name}`,
      '',
      '## Environment',
      '',
      `- **Bun Version:** ${data.environment.bun}`,
      `- **Platform:** ${data.environment.platform}`,
      `- **Architecture:** ${data.environment.arch}`,
      `- **Memory:** ${(data.environment.memory / 1024 / 1024 / 1024).toFixed(2)} GB`,
      `- **CPUs:** ${data.environment.cpus}`,
      '',
      '## Results',
      '',
      '| Test | Value | Unit | Notes |',
      '|------|-------|------|-------|',
    ];

    for (const result of data.results) {
      const value = this.formatValue(result.value, result.unit);
      const notes = result.metadata
        ? Object.entries(result.metadata)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')
        : '-';
      lines.push(`| ${result.test} | ${value} | ${result.unit} | ${notes} |`);
    }

    // Add performance summary
    const summary = this.generateSummary(data);
    lines.push('', '## Performance Summary', '');
    lines.push(`- **Total Tests:** ${summary.totalTests}`);
    lines.push(`- **Average Performance:** ${summary.averagePerformance}`);
    lines.push(`- **Best Performer:** ${summary.bestPerformer}`);
    lines.push(`- **Needs Attention:** ${summary.needsAttention}`);

    // Add trends if available
    const history = this.loadHistory();
    if (history.length > 0) {
      const trends = this.analyzeTrends(data, history);
      lines.push('', '## Trends', '');
      lines.push('| Test | Trend | Change |');
      lines.push('|------|-------|--------|');

      for (const trend of trends) {
        const icon = trend.trend === 'improving' ? '📈' : trend.trend === 'degrading' ? '📉' : '➡️';
        const change =
          trend.changePercent > 0
            ? `+${trend.changePercent.toFixed(1)}%`
            : `${trend.changePercent.toFixed(1)}%`;
        lines.push(`| ${trend.test} | ${icon} ${trend.trend} | ${change} |`);
      }
    }

    // Add recommendations
    const recommendations = this.generateRecommendations(data, history);
    if (recommendations.length > 0) {
      lines.push('', '## Recommendations', '');
      recommendations.forEach(rec => {
        lines.push(`- ${rec}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(data: BenchmarkData): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Benchmark Report - ${data.name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
            padding: 20px;
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 30px;
            border-radius: 15px;
            margin-bottom: 30px;
        }
        h1 {
            font-size: 36px;
            margin-bottom: 10px;
        }
        .meta {
            opacity: 0.9;
            font-size: 14px;
        }
        .card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 20px;
            border-radius: 15px;
            margin-bottom: 20px;
        }
        h2 {
            font-size: 24px;
            margin-bottom: 15px;
            border-bottom: 2px solid rgba(255, 255, 255, 0.3);
            padding-bottom: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        th {
            background: rgba(255, 255, 255, 0.1);
            font-weight: 600;
        }
        tr:hover {
            background: rgba(255, 255, 255, 0.05);
        }
        .chart {
            width: 100%;
            height: 300px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            display: flex;
            align-items: flex-end;
            justify-content: space-around;
            padding: 20px;
            margin-top: 20px;
        }
        .bar {
            width: 40px;
            background: linear-gradient(to top, #4ecdc4, #44a8b3);
            border-radius: 5px 5px 0 0;
            position: relative;
            transition: all 0.3s ease;
        }
        .bar:hover {
            transform: translateY(-5px);
            filter: brightness(1.2);
        }
        .bar-label {
            position: absolute;
            bottom: -25px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 10px;
            white-space: nowrap;
        }
        .bar-value {
            position: absolute;
            top: -20px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 12px;
            font-weight: bold;
        }
        .trend {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
        }
        .trend.improving { background: #10b981; }
        .trend.degrading { background: #ef4444; }
        .trend.stable { background: #6b7280; }
        .recommendations {
            background: rgba(255, 255, 255, 0.15);
            border-left: 4px solid #fbbf24;
            padding: 15px;
            border-radius: 8px;
        }
        .recommendations ul {
            list-style: none;
            padding-left: 0;
        }
        .recommendations li {
            padding: 5px 0;
        }
        .recommendations li::before {
            content: '💡 ';
            margin-right: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Benchmark Report</h1>
            <div class="meta">
                <p><strong>${data.name}</strong></p>
                <p>Generated: ${new Date(data.timestamp).toLocaleString()}</p>
                <p>Bun ${data.environment.bun} | ${data.environment.platform} ${data.environment.arch}</p>
            </div>
        </div>

        <div class="card">
            <h2>Performance Results</h2>
            <table>
                <thead>
                    <tr>
                        <th>Test</th>
                        <th>Value</th>
                        <th>Unit</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.results
                      .map(
                        r => `
                    <tr>
                        <td>${r.test}</td>
                        <td>${this.formatValue(r.value, r.unit)}</td>
                        <td>${r.unit}</td>
                        <td>${this.getStatusIcon(r.value, r.unit)}</td>
                    </tr>
                    `
                      )
                      .join('')}
                </tbody>
            </table>
            
            <div class="chart">
                ${data.results
                  .slice(0, 10)
                  .map(r => {
                    const height = Math.min(
                      250,
                      (r.value / Math.max(...data.results.map(x => x.value))) * 250
                    );
                    return `
                    <div class="bar" style="height: ${height}px">
                        <span class="bar-value">${this.formatValue(r.value, r.unit)}</span>
                        <span class="bar-label">${r.test.substring(0, 10)}...</span>
                    </div>
                    `;
                  })
                  .join('')}
            </div>
        </div>

        ${this.generateHtmlTrends(data)}
        ${this.generateHtmlRecommendations(data)}
    </div>
</body>
</html>`;
  }

  /**
   * Generate CSV report
   */
  private generateCsvReport(data: BenchmarkData): string {
    const rows: string[] = ['Timestamp,Name,Test,Value,Unit,Platform,Architecture,Bun Version'];

    for (const result of data.results) {
      rows.push(
        [
          data.timestamp,
          data.name,
          result.test,
          result.value.toString(),
          result.unit,
          data.environment.platform,
          data.environment.arch,
          data.environment.bun,
        ].join(',')
      );
    }

    return rows.join('\n');
  }

  /**
   * Analyze trends
   */
  private analyzeTrends(current: BenchmarkData, history: BenchmarkData[]): TrendData[] {
    const trends: TrendData[] = [];

    for (const result of current.results) {
      const historicalValues = history
        .map(h => ({
          timestamp: h.timestamp,
          value: h.results.find(r => r.test === result.test)?.value,
        }))
        .filter(v => v.value !== undefined) as Array<{ timestamp: string; value: number }>;

      if (historicalValues.length < 2) continue;

      // Add current value
      historicalValues.push({
        timestamp: current.timestamp,
        value: result.value,
      });

      // Calculate trend
      const firstValue = historicalValues[0].value;
      const lastValue = historicalValues[historicalValues.length - 1].value;
      const changePercent = ((lastValue - firstValue) / firstValue) * 100;

      let trend: 'improving' | 'degrading' | 'stable';
      if (result.unit.includes('ms') || result.unit.includes('ns')) {
        // Lower is better for time measurements
        trend = changePercent < -5 ? 'improving' : changePercent > 5 ? 'degrading' : 'stable';
      } else if (result.unit.includes('ops') || result.unit.includes('req')) {
        // Higher is better for throughput
        trend = changePercent > 5 ? 'improving' : changePercent < -5 ? 'degrading' : 'stable';
      } else {
        trend = 'stable';
      }

      trends.push({
        test: result.test,
        values: historicalValues,
        trend,
        changePercent,
      });
    }

    return trends;
  }

  /**
   * Generate summary
   */
  private generateSummary(data: BenchmarkData): Record<string, any> {
    const timeTests = data.results.filter(r => r.unit.includes('ms') || r.unit.includes('ns'));
    const throughputTests = data.results.filter(
      r => r.unit.includes('ops') || r.unit.includes('req')
    );

    const avgTime =
      timeTests.length > 0 ? timeTests.reduce((sum, r) => sum + r.value, 0) / timeTests.length : 0;

    const avgThroughput =
      throughputTests.length > 0
        ? throughputTests.reduce((sum, r) => sum + r.value, 0) / throughputTests.length
        : 0;

    const bestPerformer =
      timeTests.length > 0
        ? timeTests.reduce((best, r) => (r.value < best.value ? r : best)).test
        : 'N/A';

    const needsAttention =
      timeTests
        .filter(r => r.value > avgTime * 1.5)
        .map(r => r.test)
        .join(', ') || 'None';

    return {
      totalTests: data.results.length,
      averagePerformance: `${avgTime.toFixed(2)}ms avg response`,
      bestPerformer,
      needsAttention,
      avgThroughput: `${avgThroughput.toFixed(0)} ops/s`,
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(data: BenchmarkData, history: BenchmarkData[]): string[] {
    const recommendations: string[] = [];
    const trends = this.analyzeTrends(data, history);

    // Check for degrading trends
    const degrading = trends.filter(t => t.trend === 'degrading');
    if (degrading.length > 0) {
      recommendations.push(
        `⚠️  Performance degradation detected in: ${degrading.map(d => d.test).join(', ')}`
      );
      recommendations.push('Consider profiling these operations to identify bottlenecks');
    }

    // Check for slow operations
    const slowOps = data.results.filter(r => r.unit === 'ms' && r.value > 100).map(r => r.test);
    if (slowOps.length > 0) {
      recommendations.push(`🐌 Slow operations detected: ${slowOps.join(', ')}`);
      recommendations.push('Consider optimizing or caching these operations');
    }

    // Check memory usage
    const memoryTests = data.results.filter(r => r.unit.includes('MB') || r.unit.includes('GB'));
    const highMemory = memoryTests.filter(r => r.value > 100); // > 100 MB
    if (highMemory.length > 0) {
      recommendations.push('💾 High memory usage detected');
      recommendations.push('Consider implementing memory optimization strategies');
    }

    // Positive feedback
    const improving = trends.filter(t => t.trend === 'improving');
    if (improving.length > 0) {
      recommendations.push(
        `✅ Great job! Performance improvements in: ${improving.map(i => i.test).join(', ')}`
      );
    }

    return recommendations;
  }

  /**
   * Load history from file
   */
  private loadHistory(): BenchmarkData[] {
    try {
      const file = Bun.file(this.historyFile);
      if (file.size > 0) {
        const history = JSON.parse(file.toString()) as BenchmarkData[];
        return history.slice(-this.maxHistory);
      }
    } catch (error) {
      // History file doesn't exist or is invalid
    }
    return [];
  }

  /**
   * Save to history
   */
  async saveToHistory(data: BenchmarkData): Promise<void> {
    const history = this.loadHistory();
    history.push(data);

    // Keep only recent history
    const recentHistory = history.slice(-this.maxHistory);

    await Bun.write(this.historyFile, JSON.stringify(recentHistory, null, 2));
  }

  /**
   * Format value based on unit
   */
  private formatValue(value: number, unit: string): string {
    if (unit.includes('ms')) {
      return value.toFixed(2);
    } else if (unit.includes('ns')) {
      return value.toFixed(0);
    } else if (unit.includes('ops') || unit.includes('req')) {
      return value.toLocaleString();
    } else if (unit.includes('MB')) {
      return (value / 1024 / 1024).toFixed(2);
    } else if (unit.includes('GB')) {
      return (value / 1024 / 1024 / 1024).toFixed(2);
    }
    return value.toString();
  }

  /**
   * Get status icon
   */
  private getStatusIcon(value: number, unit: string): string {
    if (unit.includes('ms') || unit.includes('ns')) {
      return value < 50 ? '✅' : value < 200 ? '⚠️' : '❌';
    } else if (unit.includes('ops') || unit.includes('req')) {
      return value > 1000 ? '✅' : value > 100 ? '⚠️' : '❌';
    }
    return '➖';
  }

  /**
   * Generate HTML trends section
   */
  private generateHtmlTrends(data: BenchmarkData): string {
    const history = this.loadHistory();
    if (history.length === 0) return '';

    const trends = this.analyzeTrends(data, history);

    return `
    <div class="card">
        <h2>Performance Trends</h2>
        <table>
            <thead>
                <tr>
                    <th>Test</th>
                    <th>Trend</th>
                    <th>Change</th>
                </tr>
            </thead>
            <tbody>
                ${trends
                  .map(
                    t => `
                <tr>
                    <td>${t.test}</td>
                    <td><span class="trend ${t.trend}">${t.trend.toUpperCase()}</span></td>
                    <td>${t.changePercent > 0 ? '+' : ''}${t.changePercent.toFixed(1)}%</td>
                </tr>
                `
                  )
                  .join('')}
            </tbody>
        </table>
    </div>`;
  }

  /**
   * Generate HTML recommendations section
   */
  private generateHtmlRecommendations(data: BenchmarkData): string {
    const history = this.loadHistory();
    const recommendations = this.generateRecommendations(data, history);

    if (recommendations.length === 0) return '';

    return `
    <div class="card recommendations">
        <h2>Recommendations</h2>
        <ul>
            ${recommendations.map(r => `<li>${r}</li>`).join('')}
        </ul>
    </div>`;
  }

  /**
   * Generate comparison report
   */
  async generateComparisonReport(baseline: BenchmarkData, current: BenchmarkData): Promise<string> {
    const lines: string[] = [
      '# Benchmark Comparison Report',
      '',
      `**Baseline:** ${baseline.name} (${new Date(baseline.timestamp).toLocaleString()})`,
      `**Current:** ${current.name} (${new Date(current.timestamp).toLocaleString()})`,
      '',
      '## Comparison Results',
      '',
      '| Test | Baseline | Current | Change | Status |',
      '|------|----------|---------|--------|--------|',
    ];

    for (const currentResult of current.results) {
      const baselineResult = baseline.results.find(r => r.test === currentResult.test);

      if (!baselineResult) {
        lines.push(
          `| ${currentResult.test} | N/A | ${this.formatValue(currentResult.value, currentResult.unit)} ${currentResult.unit} | NEW | 🆕 |`
        );
        continue;
      }

      const change = currentResult.value - baselineResult.value;
      const changePercent = (change / baselineResult.value) * 100;

      let status = '➖';
      if (currentResult.unit.includes('ms') || currentResult.unit.includes('ns')) {
        // Lower is better
        status = changePercent < -5 ? '✅' : changePercent > 5 ? '❌' : '➖';
      } else if (currentResult.unit.includes('ops') || currentResult.unit.includes('req')) {
        // Higher is better
        status = changePercent > 5 ? '✅' : changePercent < -5 ? '❌' : '➖';
      }

      const changeStr =
        changePercent > 0 ? `+${changePercent.toFixed(1)}%` : `${changePercent.toFixed(1)}%`;

      lines.push(
        `| ${currentResult.test} | ${this.formatValue(baselineResult.value, baselineResult.unit)} ${baselineResult.unit} | ${this.formatValue(currentResult.value, currentResult.unit)} ${currentResult.unit} | ${changeStr} | ${status} |`
      );
    }

    return lines.join('\n');
  }
}

// Example usage
if (import.meta.main) {
  const reporter = new BenchmarkReporter();

  // Sample benchmark data
  const data: BenchmarkData = {
    name: 'Fire22 Performance Suite',
    timestamp: new Date().toISOString(),
    results: [
      { test: 'JSON.parse', value: 0.125, unit: 'ms' },
      { test: 'JSON.stringify', value: 0.089, unit: 'ms' },
      { test: 'SHA-256 Hash', value: 0.003, unit: 'ms' },
      { test: 'Array.map (10k)', value: 1.234, unit: 'ms' },
      { test: 'API Throughput', value: 1523, unit: 'req/s' },
      { test: 'Memory Usage', value: 45.2, unit: 'MB' },
    ],
    environment: {
      bun: process.versions.bun || '1.2.21',
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage().heapTotal,
      cpus: 8,
    },
  };

  // Generate reports
  const markdown = await reporter.generateReport(data, 'markdown');
  await Bun.write('benchmark-report.md', markdown);

  const html = await reporter.generateReport(data, 'html');
  await Bun.write('benchmark-report.html', html);

  const csv = await reporter.generateReport(data, 'csv');
  await Bun.write('benchmark-report.csv', csv);

  // Save to history
  await reporter.saveToHistory(data);

  console.log('✅ Reports generated:');
  console.log('   - benchmark-report.md');
  console.log('   - benchmark-report.html');
  console.log('   - benchmark-report.csv');
}

export default BenchmarkReporter;
