#!/usr/bin/env bun

/**
 * 🎯 Performance Command Module
 * Advanced performance monitoring and analysis commands
 */

import { PerformanceDashboard } from '../../scripts/utils/performance-dashboard.js';
import { EnhancedBunNativeAPITracker } from '../enhanced-bun-native-tracker.js';

export interface PerformanceCommandOptions {
  dashboard?: boolean;
  report?: boolean;
  analyze?: boolean;
  export?: string;
  interval?: number;
}

export class PerformanceCommand {
  private tracker: EnhancedBunNativeAPITracker;

  constructor() {
    this.tracker = new EnhancedBunNativeAPITracker();
  }

  /**
   * 🚀 Execute performance command
   */
  async execute(options: PerformanceCommandOptions = {}): Promise<void> {
    console.log('🎯 Empire Pro CLI - Performance Command');
    console.log('═'.repeat(50));

    if (options.dashboard) {
      await this.startDashboard();
    } else if (options.report) {
      await this.generateReport(options.export);
    } else if (options.analyze) {
      await this.analyzePerformance();
    } else {
      this.showHelp();
    }
  }

  /**
   * 📊 Start performance dashboard
   */
  private async startDashboard(): Promise<void> {
    console.log('🚀 Starting Performance Dashboard...');
    const dashboard = new PerformanceDashboard();
    await dashboard.startDashboard();
  }

  /**
   * 📋 Generate performance report
   */
  private async generateReport(exportFormat?: string): Promise<void> {
    console.log('📋 Generating Performance Report...');
    
    const report = await this.tracker.saveReport();
    console.log(`✅ Report saved to: ${report}`);

    if (exportFormat) {
      await this.exportReport(report, exportFormat);
    }
  }

  /**
   * 📈 Analyze performance patterns
   */
  private async analyzePerformance(): Promise<void> {
    console.log('📈 Analyzing Performance Patterns...');
    
    const summary = this.tracker.getSummaryStatistics();
    const domainBreakdown = this.tracker.getDomainBreakdown();
    
    console.log('─'.repeat(50));
    console.log('📊 Performance Analysis Results:');
    console.log('─'.repeat(50));
    
    // Performance insights
    console.log(`🔥 Native Implementation Rate: ${summary.nativeImplementationRate.toFixed(1)}%`);
    console.log(`⚡ Average Response Time: ${summary.averageResponseTime.toFixed(2)}ms`);
    console.log(`📈 Total API Calls: ${summary.totalCalls}`);
    console.log(`🎯 APIs Tracked: ${summary.totalAPIs}`);
    console.log(`❌ Error Rate: ${summary.errorRate.toFixed(2)}%`);
    
    console.log('\n🏆 Top Performing Domains:');
    const domainStats = this.analyzeDomainPerformance(domainBreakdown);
    domainStats.slice(0, 3).forEach((stat, index) => {
      console.log(`${index + 1}. ${stat.domain} - ${stat.avgTime.toFixed(2)}ms avg, ${stat.totalCalls} calls`);
    });

    console.log('\n⚠️  Performance Recommendations:');
    const recommendations = this.generateRecommendations(summary, domainStats);
    recommendations.forEach(rec => console.log(`• ${rec}`));
  }

  /**
   * 📊 Analyze domain performance
   */
  private analyzeDomainPerformance(domainBreakdown: any): Array<{domain: string, avgTime: number, totalCalls: number}> {
    const stats: Array<{domain: string, avgTime: number, totalCalls: number}> = [];
    
    Object.entries(domainBreakdown).forEach(([domain, metrics]: [string, any]) => {
      if (metrics.length > 0) {
        const totalCalls = metrics.reduce((sum: number, m: any) => sum + m.callCount, 0);
        const avgTime = metrics.reduce((sum: number, m: any) => sum + m.averageDuration, 0) / metrics.length;
        stats.push({ domain, avgTime, totalCalls });
      }
    });
    
    return stats.sort((a, b) => a.avgTime - b.avgTime);
  }

  /**
   * 💡 Generate performance recommendations
   */
  private generateRecommendations(summary: any, domainStats: any[]): string[] {
    const recommendations: string[] = [];
    
    if (summary.nativeImplementationRate < 80) {
      recommendations.push('Consider using more native Bun APIs for better performance');
    }
    
    if (summary.averageResponseTime > 50) {
      recommendations.push('Some operations are slow - consider optimization or caching');
    }
    
    if (summary.errorRate > 5) {
      recommendations.push('High error rate detected - review error handling');
    }
    
    const slowDomains = domainStats.filter(d => d.avgTime > 100);
    if (slowDomains.length > 0) {
      recommendations.push(`Slow domains detected: ${slowDomains.map(d => d.domain).join(', ')}`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Performance looks good! No major issues detected.');
    }
    
    return recommendations;
  }

  /**
   * 📤 Export report in different formats
   */
  private async exportReport(reportPath: string, format: string): Promise<void> {
    console.log(`📤 Exporting report as ${format}...`);
    
    const reportFile = Bun.file(reportPath);
    const report = JSON.parse(await reportFile.text());
    
    switch (format.toLowerCase()) {
      case 'csv':
        await this.exportAsCSV(report);
        break;
      case 'json':
        console.log('✅ Report already in JSON format');
        break;
      case 'summary':
        await this.exportAsSummary(report);
        break;
      default:
        console.log(`❌ Unsupported export format: ${format}`);
    }
  }

  /**
   * 📊 Export as CSV
   */
  private async exportAsCSV(report: any): Promise<void> {
    const csvLines = ['Domain,API,Calls,Avg Time (ms),Implementation,Error Count'];
    
    Object.entries(report.domainBreakdown).forEach(([domain, metrics]: [string, any]) => {
      (metrics as any[]).forEach(metric => {
        csvLines.push(`${domain},${metric.apiName},${metric.callCount},${metric.averageDuration},${metric.implementation},${metric.errorCount}`);
      });
    });
    
    const csvPath = reportPath.replace('.json', '.csv');
    await Bun.write(csvPath, csvLines.join('\n'));
    console.log(`✅ CSV exported to: ${csvPath}`);
  }

  /**
   * 📋 Export as summary
   */
  private async exportAsSummary(report: any): Promise<void> {
    const summary = `
Performance Report Summary
Generated: ${report.timestamp}

📊 Overall Statistics:
- Total APIs: ${report.summary.totalAPIs}
- Total Calls: ${report.summary.totalCalls}
- Native Implementation Rate: ${report.summary.nativeImplementationRate.toFixed(1)}%
- Average Response Time: ${report.summary.averageResponseTime.toFixed(2)}ms
- Error Rate: ${report.summary.errorRate.toFixed(2)}%

🏆 Performance Metrics:
- Fastest API: ${report.performanceMetrics.fastestAPI}
- Slowest API: ${report.performanceMetrics.slowestAPI}
- Most Used API: ${report.performanceMetrics.mostUsedAPI}
- Least Used API: ${report.performanceMetrics.leastUsedAPI}

📈 Domain Breakdown:
${Object.entries(report.domainBreakdown).map(([domain, metrics]: [string, any]) => 
  `- ${domain}: ${(metrics as any[]).length} APIs`
).join('\n')}
    `.trim();
    
    const summaryPath = reportPath.replace('.json', '.txt');
    await Bun.write(summaryPath, summary);
    console.log(`✅ Summary exported to: ${summaryPath}`);
  }

  /**
   * ❓ Show help information
   */
  private showHelp(): void {
    console.log('📋 Performance Command Usage:');
    console.log('');
    console.log('Options:');
    console.log('  --dashboard     Start real-time performance dashboard');
    console.log('  --report        Generate performance report');
    console.log('  --analyze       Analyze performance patterns');
    console.log('  --export <fmt>  Export report (json|csv|summary)');
    console.log('  --interval <ms> Set update interval for dashboard');
    console.log('');
    console.log('Examples:');
    console.log('  performance --dashboard');
    console.log('  performance --report --export csv');
    console.log('  performance --analyze');
  }
}

// Export command instance
export const performanceCommand = new PerformanceCommand();
