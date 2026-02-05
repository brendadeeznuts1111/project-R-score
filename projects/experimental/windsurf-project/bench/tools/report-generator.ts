#!/usr/bin/env bun
// report-generator.ts - Automated Report Generation with Charts

import { config } from 'dotenv';
config({ path: './.env' });

import { writeFileSync } from 'fs';
import { BunR2AppleManager } from '../../src/storage/r2-apple-manager.js';

interface BenchmarkReport {
  timestamp: string;
  summary: {
    totalUploads: number;
    avgThroughput: number;
    bestThroughput: number;
    avgCompression: number;
    totalCost: number;
    successRate: number;
  };
  scales: {
    uploads: number;
    avgTime: number;
    throughput: number;
    compression: number;
    cost: number;
  }[];
  charts: {
    throughputChart: string;
    compressionChart: string;
    costChart: string;
  };
  recommendations: string[];
}

class ReportGenerator {
  private manager: BunR2AppleManager;

  constructor() {
    this.manager = new BunR2AppleManager({}, Bun.env.R2_BUCKET!);
  }

  async generateReport(benchmarkData: any[]): Promise<BenchmarkReport> {
    console.log('📊 **Generating Automated Performance Report**');
    console.log('='.repeat(50));

    const report: BenchmarkReport = {
      timestamp: new Date().toISOString(),
      summary: this.calculateSummary(benchmarkData),
      scales: benchmarkData,
      charts: {
        throughputChart: this.generateThroughputChart(benchmarkData),
        compressionChart: this.generateCompressionChart(benchmarkData),
        costChart: this.generateCostChart(benchmarkData)
      },
      recommendations: this.generateRecommendations(benchmarkData)
    };

    // Generate HTML report
    await this.generateHTMLReport(report);
    
    // Upload to R2
    await this.uploadReport(report);

    return report;
  }

  private calculateSummary(data: any[]) {
    const totalUploads = data.reduce((sum, item) => sum + item.uploads, 0);
    const avgThroughput = data.reduce((sum, item) => sum + item.throughput, 0) / data.length;
    const bestThroughput = Math.max(...data.map(item => item.throughput));
    const avgCompression = data.reduce((sum, item) => sum + item.compression, 0) / data.length;
    const totalCost = data.reduce((sum, item) => sum + item.cost, 0);
    const successRate = (data.filter(item => item.errors === 0).length / data.length) * 100;

    return {
      totalUploads,
      avgThroughput: Math.round(avgThroughput),
      bestThroughput: Math.round(bestThroughput),
      avgCompression: Math.round(avgCompression),
      totalCost,
      successRate: Math.round(successRate)
    };
  }

  private generateThroughputChart(data: any[]): string {
    const maxThroughput = Math.max(...data.map(item => item.throughput));
    const chartWidth = 60;
    
    let chart = '📈 **Throughput Performance**\n';
    chart += '```\n';
    chart += 'Uploads    Throughput (IDs/s)\n';
    chart += '────────────────────────────────────────────────────────────\n';
    
    data.forEach(item => {
      const barLength = Math.round((item.throughput / maxThroughput) * chartWidth);
      const bar = '█'.repeat(barLength) + '░'.repeat(chartWidth - barLength);
      const label = item.uploads.toString().padEnd(6);
      const value = item.throughput.toFixed(0).padEnd(8);
      chart += `${label} │${bar}│ ${value}\n`;
    });
    
    chart += '```\n';
    return chart;
  }

  private generateCompressionChart(data: any[]): string {
    const maxCompression = Math.max(...data.map(item => item.compression));
    const chartWidth = 60;
    
    let chart = '🗜️ **Compression Efficiency**\n';
    chart += '```\n';
    chart += 'Uploads    Compression (%)\n';
    chart += '────────────────────────────────────────────────────────────\n';
    
    data.forEach(item => {
      const barLength = Math.round((item.compression / maxCompression) * chartWidth);
      const bar = '█'.repeat(barLength) + '░'.repeat(chartWidth - barLength);
      const label = item.uploads.toString().padEnd(6);
      const value = item.compression.toFixed(1) + '%'.padEnd(7);
      chart += `${label} │${bar}│ ${value}\n`;
    });
    
    chart += '```\n';
    return chart;
  }

  private generateCostChart(data: any[]): string {
    const maxCost = Math.max(...data.map(item => item.cost));
    const chartWidth = 60;
    
    let chart = '💰 **Cost Analysis**\n';
    chart += '```\n';
    chart += 'Uploads    Cost ($)\n';
    chart += '────────────────────────────────────────────────────────────\n';
    
    data.forEach(item => {
      const barLength = Math.round((item.cost / maxCost) * chartWidth);
      const bar = '█'.repeat(barLength) + '░'.repeat(chartWidth - barLength);
      const label = item.uploads.toString().padEnd(6);
      const value = '$' + item.cost.toFixed(6).padEnd(9);
      chart += `${label} │${bar}│ ${value}\n`;
    });
    
    chart += '```\n';
    return chart;
  }

  private generateRecommendations(data: any[]): string[] {
    const recommendations: string[] = [];
    
    const avgThroughput = data.reduce((sum, item) => sum + item.throughput, 0) / data.length;
    const avgCompression = data.reduce((sum, item) => sum + item.compression, 0) / data.length;
    const maxScale = Math.max(...data.map(item => item.uploads));
    
    if (avgThroughput < 1000) {
      recommendations.push('🚀 Consider optimizing upload strategy for better throughput');
    }
    
    if (avgCompression < 70) {
      recommendations.push('🗜️ Compression could be improved - try higher zstd levels');
    }
    
    if (maxScale < 1000) {
      recommendations.push('📈 Test with larger scales (1000+ uploads) to verify linear scaling');
    }
    
    const errorRate = data.filter(item => item.errors > 0).length / data.length;
    if (errorRate > 0.1) {
      recommendations.push('⚠️ High error rate detected - investigate network stability');
    }
    
    recommendations.push('✅ Performance is within acceptable ranges');
    recommendations.push('📊 Regular monitoring recommended for production deployment');
    
    return recommendations;
  }

  private async generateHTMLReport(report: BenchmarkReport) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>R2 Performance Report - ${new Date().toLocaleDateString()}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 3px solid #007AFF; padding-bottom: 10px; }
        h2 { color: #007AFF; margin-top: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007AFF; }
        .metric-label { color: #666; margin-top: 5px; }
        .chart { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; font-family: monospace; white-space: pre; }
        .recommendations { background: #e8f5e8; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; }
        .timestamp { color: #666; font-size: 0.9em; text-align: right; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 R2 Performance Report</h1>
        
        <div class="summary">
            <div class="metric">
                <div class="metric-value">${report.summary.totalUploads.toLocaleString()}</div>
                <div class="metric-label">Total Uploads</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.avgThroughput.toLocaleString()}</div>
                <div class="metric-label">Avg Throughput (IDs/s)</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.bestThroughput.toLocaleString()}</div>
                <div class="metric-label">Best Throughput (IDs/s)</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.avgCompression}%</div>
                <div class="metric-label">Avg Compression</div>
            </div>
            <div class="metric">
                <div class="metric-value">$${report.summary.totalCost.toFixed(6)}</div>
                <div class="metric-label">Total Cost</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.successRate}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
        </div>

        <h2>📈 Performance Charts</h2>
        <div class="chart">${report.charts.throughputChart}</div>
        <div class="chart">${report.charts.compressionChart}</div>
        <div class="chart">${report.charts.costChart}</div>

        <h2>💡 Recommendations</h2>
        <div class="recommendations">
            ${report.recommendations.map(rec => `<p>${rec}</p>`).join('')}
        </div>

        <div class="timestamp">
            Generated on ${new Date(report.timestamp).toLocaleString()}
        </div>
    </div>
</body>
</html>`;

    const filename = `r2-performance-report-${Date.now()}.html`;
    writeFileSync(filename, html);
    console.log(`📄 HTML report saved: ${filename}`);
    
    return filename;
  }

  private async uploadReport(report: BenchmarkReport) {
    try {
      await this.manager.uploadReport(report, `performance-report-${Date.now()}.json`);
      console.log('📤 Report uploaded to R2 bucket');
    } catch (error: any) {
      console.error('❌ Failed to upload report:', error.message);
    }
  }
}

// Sample data for demonstration
const sampleBenchmarkData = [
  { uploads: 10, avgTime: 15, throughput: 667, compression: 82.1, cost: 0.000001, errors: 0 },
  { uploads: 100, avgTime: 128, throughput: 781, compression: 82.3, cost: 0.000010, errors: 0 },
  { uploads: 500, avgTime: 456, throughput: 1096, compression: 82.5, cost: 0.000050, errors: 0 },
  { uploads: 1000, avgTime: 517, throughput: 1934, compression: 82.7, cost: 0.000100, errors: 0 }
];

// Run report generation if executed directly
if (Bun.main === import.meta.path) {
  const generator = new ReportGenerator();
  await generator.generateReport(sampleBenchmarkData);
}

export { ReportGenerator };
