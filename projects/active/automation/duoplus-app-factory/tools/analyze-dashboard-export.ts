#!/usr/bin/env bun
/**
 * Nebula-Flow™ Dashboard Export Analyzer
 * Analyzes and visualizes exported dashboard data
 * Enhanced with export capabilities and advanced analytics
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { VERSION_INFO, getVersionString } from '../src/utils/version.js';

interface DashboardExport {
  timestamp: string;
  version: string;
  system: {
    uptime: number;
    deviceCount: number;
    systemHealth: {
      cpu: number;
      memory: number;
      disk: number;
      network: number;
    };
  };
  logs: Array<{
    timestamp: string;
    type: string;
    message: string;
  }>;
  config: Record<string, any>;
  currentTab: string;
  atlasData?: {
    ageGroups: Array<{
      range: string;
      count: number;
      active: number;
      volume: number;
      snaps: number;
    }>;
    total: {
      count: number;
      active: number;
      volume: number;
      snaps: number;
      coldExports: number;
      lastExport: number;
    };
  };
  metricsData?: {
    starlightIDs: number;
    orbitAssignLegs: number;
    cometCollect: string;
    cometCollectEta: number;
    stardropYieldPct: number;
    stardropProfit: number;
    blackHoleRatePct: number;
    blackHoleDisputes: number;
    eventHorizon: string;
  };
  metadata: {
    exportType: string;
    exportedBy: string;
    exportDate: string;
  };
}

interface AnalysisResult {
  timestamp: string;
  systemHealth: {
    score: number;
    status: string;
    details: any;
  };
  fleetHealth?: {
    score: number;
    status: string;
    details: any;
  };
  performanceScore?: {
    score: number;
    status: string;
    details: any;
  };
  recommendations: string[];
  summary: {
    exportDate: string;
    version: string;
    logCount: number;
    deviceCount: number;
    analyzerVersion?: string;
  };
  trends?: {
    profitProjection: number;
    efficiencyTrend: string;
    riskTrend: string;
  };
}

class DashboardAnalyzer {
  private data: DashboardExport;
  private analysisResult: AnalysisResult;

  constructor(data: DashboardExport) {
    this.data = data;
    this.analysisResult = {
      timestamp: new Date().toISOString(),
      systemHealth: { score: 0, status: '', details: {} },
      recommendations: [],
      summary: {
        exportDate: data.metadata.exportDate,
        version: data.version || VERSION_INFO.dashboardVersion,
        logCount: data.logs.length,
        deviceCount: data.system.deviceCount,
        analyzerVersion: VERSION_INFO.version
      }
    };
  }

  analyze() {
    console.info(`🧬 ${getVersionString()} - Dashboard Export Analysis`);
    console.info('========================================\n');

    this.analyzeSystemStatus();
    this.analyzeLogs();
    this.analyzeConfiguration();
    this.analyzeAtlasData();
    this.analyzeMetrics();
    this.analyzeTrends();
    this.generateRecommendations();
  }

  getAnalysisResult(): AnalysisResult {
    return this.analysisResult;
  }

  private analyzeSystemStatus() {
    console.info('📊 SYSTEM STATUS');
    console.info('---------------');

    const uptimeHours = Math.floor(this.data.system.uptime / 3600);
    const uptimeMinutes = Math.floor((this.data.system.uptime % 3600) / 60);
    const uptimeSeconds = this.data.system.uptime % 60;

    console.info(`⏱️  Uptime: ${uptimeHours}:${uptimeMinutes.toString().padStart(2, '0')}:${uptimeSeconds.toString().padStart(2, '0')}`);
    console.info(`📱 Devices: ${this.data.system.deviceCount}`);
    console.info(`🖥️  System Health:`);
    console.info(`   • CPU: ${this.data.system.systemHealth.cpu}%`);
    console.info(`   • Memory: ${this.data.system.systemHealth.memory}%`);
    console.info(`   • Disk: ${this.data.system.systemHealth.disk}%`);
    console.info(`   • Network: ${this.data.system.systemHealth.network}%`);

    // Health assessment
    const healthScore = this.calculateHealthScore();
    const healthStatus = healthScore > 80 ? '🟢 Excellent' : healthScore > 60 ? '🟡 Good' : '🔴 Needs Attention';
    console.info(`🏥 Overall Health: ${healthStatus} (${healthScore}/100)\n`);

    // Store in analysis result
    this.analysisResult.systemHealth = {
      score: healthScore,
      status: healthStatus,
      details: {
        uptime: `${uptimeHours}:${uptimeMinutes.toString().padStart(2, '0')}:${uptimeSeconds.toString().padStart(2, '0')}`,
        deviceCount: this.data.system.deviceCount,
        cpu: this.data.system.systemHealth.cpu,
        memory: this.data.system.systemHealth.memory,
        disk: this.data.system.systemHealth.disk,
        network: this.data.system.systemHealth.network
      }
    };
  }

  private calculateHealthScore(): number {
    const health = this.data.system.systemHealth;
    const metrics = [health.cpu, health.memory, health.disk, health.network];

    // Lower resource usage = higher score
    const avgUsage = metrics.reduce((a, b) => a + b, 0) / metrics.length;
    return Math.max(0, Math.min(100, 100 - avgUsage));
  }

  private analyzeLogs() {
    console.info('📋 LOG ANALYSIS');
    console.info('--------------');

    const logStats = this.data.logs.reduce((acc, log) => {
      acc[log.type] = (acc[log.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.info('Log Entries by Type:');
    Object.entries(logStats).forEach(([type, count]) => {
      const icon = this.getLogTypeIcon(type);
      console.info(`  ${icon} ${type}: ${count}`);
    });

    // Error analysis
    const errors = this.data.logs.filter(log => log.type === 'error');
    if (errors.length > 0) {
      console.info(`\n⚠️  Recent Errors (${errors.length}):`);
      errors.slice(0, 3).forEach(error => {
        const time = new Date(error.timestamp).toLocaleTimeString();
        console.info(`  • ${time}: ${error.message}`);
      });
    }

    console.info('');
  }

  private getLogTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'system': '🔧',
      'device': '📱',
      'lightning': '⚡',
      'atlas': '🗂️',
      'metrics': '📊',
      'error': '❌',
      'warning': '⚠️',
      'success': '✅'
    };
    return icons[type] || '📝';
  }

  private analyzeConfiguration() {
    console.info('⚙️  CONFIGURATION ANALYSIS');
    console.info('------------------------');

    const config = this.data.config;

    console.info(`🎨 Theme: ${config.theme}`);
    console.info(`🔄 Refresh Intervals:`);
    console.info(`   • Lightning: ${config.lightningRefresh}s`);
    console.info(`   • Device: ${config.deviceRefresh}s`);
    console.info(`   • Atlas: ${config.atlasRefresh}s`);

    console.info(`🔒 Security Settings:`);
    console.info(`   • Session Timeout: ${config.sessionTimeout} minutes`);
    console.info(`   • Auto-lock: ${config.autoLock ? 'Enabled' : 'Disabled'}`);
    console.info(`   • Data Encryption: ${config.dataEncryption ? 'Enabled' : 'Disabled'}`);

    console.info(`⚡ Performance Settings:`);
    console.info(`   • Max Log Entries: ${config.maxLogEntries}`);
    console.info(`   • WebSocket Reconnect: ${config.websocketReconnect ? 'Enabled' : 'Disabled'}`);
    console.info(`   • Data Compression: ${config.dataCompression ? 'Enabled' : 'Disabled'}`);

    console.info('');
  }

  private analyzeAtlasData() {
    if (!this.data.atlasData) {
      console.info('🗂️  ATLAS DATA: Not available\n');
      return;
    }

    console.info('🗂️  ATLAS INVENTORY ANALYSIS');
    console.info('---------------------------');

    const atlas = this.data.atlasData;

    console.info('Device Distribution by Age:');
    atlas.ageGroups.forEach(group => {
      const activePercent = group.count > 0 ? Math.round((group.active / group.count) * 100) : 0;
      const volumeK = (group.volume / 1000).toFixed(1);
      console.info(`  📅 ${group.range}:`);
      console.info(`    • Count: ${group.count} (${activePercent}% active)`);
      console.info(`    • Volume: $${volumeK}k`);
      console.info(`    • Snapshots: ${group.snaps}`);
    });

    console.info(`\n📈 Fleet Summary:`);
    console.info(`  • Total Devices: ${atlas.total.count.toLocaleString()}`);
    console.info(`  • Active Devices: ${atlas.total.active.toLocaleString()}`);
    console.info(`  • Total Volume: $${(atlas.total.volume / 1000).toFixed(1)}k`);
    console.info(`  • Total Snapshots: ${atlas.total.snaps.toLocaleString()}`);
    console.info(`  • Cold Exports: ${atlas.total.coldExports.toLocaleString()}`);

    const lastExport = atlas.total.lastExport ?
      new Date(atlas.total.lastExport).toLocaleString() : 'Never';
    console.info(`  • Last Cold Export: ${lastExport}`);

    // Fleet health assessment
    const fleetHealth = this.calculateFleetHealth(atlas);
    console.info(`\n🏥 Fleet Health: ${fleetHealth.status} (${fleetHealth.score}/100)`);

    // Store in analysis result
    this.analysisResult.fleetHealth = {
      score: fleetHealth.score,
      status: fleetHealth.status,
      details: {
        totalDevices: atlas.total.count,
        activeDevices: atlas.total.active,
        totalVolume: atlas.total.volume,
        totalSnapshots: atlas.total.snaps,
        coldExports: atlas.total.coldExports,
        ageGroups: atlas.ageGroups
      }
    };

    console.info('');
  }

  private calculateFleetHealth(atlas: any) {
    const totalDevices = atlas.total.count;
    const activeDevices = atlas.total.active;
    const totalSnapshots = atlas.total.snaps;
    const coldExports = atlas.total.coldExports;

    let score = 0;

    // Activity score (80% of total)
    const activityRatio = totalDevices > 0 ? activeDevices / totalDevices : 0;
    score += activityRatio * 80;

    // Backup score (20% of total)
    const backupRatio = totalDevices > 0 ? coldExports / totalDevices : 0;
    score += Math.min(backupRatio * 20, 20);

    const status = score > 90 ? '🟢 Excellent' :
                   score > 75 ? '🟡 Good' :
                   score > 50 ? '🟠 Fair' : '🔴 Poor';

    return { score: Math.round(score), status };
  }

  private analyzeMetrics() {
    if (!this.data.metricsData) {
      console.info('📊 METRICS DATA: Not available\n');
      return;
    }

    console.info('📊 OPERATIONAL METRICS ANALYSIS');
    console.info('-------------------------------');

    const metrics = this.data.metricsData;

    console.info('🚀 Core Performance:');
    console.info(`  • Starlight-IDs: ${metrics.starlightIDs}`);
    console.info(`  • Orbit-Assign Legs: ${metrics.orbitAssignLegs}`);
    console.info(`  • Comet-Collect: ${metrics.cometCollect}`);
    console.info(`  • ETA: ${metrics.cometCollectEta} minutes`);

    console.info('\n💰 Yield Performance:');
    console.info(`  • Stardrop Yield: ${metrics.stardropYieldPct}%`);
    console.info(`  • Profit: $${metrics.stardropProfit.toLocaleString()}`);

    console.info('\n⚠️  Risk Management:');
    console.info(`  • Black-Hole Rate: ${metrics.blackHoleRatePct}%`);
    console.info(`  • Disputes: ${metrics.blackHoleDisputes}`);

    console.info('\n⏱️  Performance Timing:');
    console.info(`  • Event Horizon: ${metrics.eventHorizon}`);

    // Performance assessment
    const perfScore = this.calculatePerformanceScore(metrics);
    console.info(`\n🏆 Performance Score: ${perfScore.status} (${perfScore.score}/100)`);

    // Store in analysis result
    this.analysisResult.performanceScore = {
      score: perfScore.score,
      status: perfScore.status,
      details: {
        starlightIDs: metrics.starlightIDs,
        orbitAssignLegs: metrics.orbitAssignLegs,
        cometCollect: metrics.cometCollect,
        stardropYieldPct: metrics.stardropYieldPct,
        stardropProfit: metrics.stardropProfit,
        blackHoleRatePct: metrics.blackHoleRatePct,
        blackHoleDisputes: metrics.blackHoleDisputes,
        eventHorizon: metrics.eventHorizon
      }
    };

    console.info('');
  }

  private analyzeTrends() {
    if (!this.data.metricsData) return;

    console.info('📈 TREND ANALYSIS');
    console.info('----------------');

    const metrics = this.data.metricsData;
    const profit = metrics.stardropProfit;
    const yieldPct = metrics.stardropYieldPct;
    const blackHoleRate = metrics.blackHoleRatePct;

    // Profit projection (30-day)
    const dailyProfit = profit / 30; // Assuming current profit is monthly
    const monthlyProjection = dailyProfit * 30;
    const yearlyProjection = dailyProfit * 365;

    console.info(`💰 Profit Projections:`);
    console.info(`  • Daily: $${dailyProfit.toLocaleString()}`);
    console.info(`  • Monthly: $${monthlyProjection.toLocaleString()}`);
    console.info(`  • Yearly: $${yearlyProjection.toLocaleString()}`);

    // Efficiency trend
    const efficiencyTrend = yieldPct >= 1.5 ? '📈 Improving' :
                           yieldPct >= 1.0 ? '➡️ Stable' : '📉 Declining';
    console.info(`\n⚡ Efficiency Trend: ${efficiencyTrend}`);

    // Risk trend
    const riskTrend = blackHoleRate <= 1.0 ? '✅ Low Risk' :
                     blackHoleRate <= 2.0 ? '⚠️ Moderate Risk' : '🔴 High Risk';
    console.info(`⚠️  Risk Assessment: ${riskTrend}`);

    // Store trends
    this.analysisResult.trends = {
      profitProjection: yearlyProjection,
      efficiencyTrend: efficiencyTrend,
      riskTrend: riskTrend
    };

    console.info('');
  }

  private calculatePerformanceScore(metrics: any) {
    let score = 0;

    // Yield score (40% of total)
    if (metrics.stardropYieldPct >= 1.5) score += 40;
    else if (metrics.stardropYieldPct >= 1.0) score += 30;
    else if (metrics.stardropYieldPct >= 0.5) score += 20;
    else score += 10;

    // Risk score (30% of total)
    if (metrics.blackHoleRatePct <= 1.0) score += 30;
    else if (metrics.blackHoleRatePct <= 2.0) score += 20;
    else if (metrics.blackHoleRatePct <= 5.0) score += 10;

    // Efficiency score (30% of total)
    if (metrics.cometCollectEta <= 15) score += 30;
    else if (metrics.cometCollectEta <= 30) score += 20;
    else if (metrics.cometCollectEta <= 60) score += 10;

    const status = score > 90 ? '🟢 Excellent' :
                   score > 75 ? '🟡 Good' :
                   score > 60 ? '🟠 Fair' : '🔴 Needs Improvement';

    return { score, status };
  }

  private generateRecommendations() {
    console.info('💡 RECOMMENDATIONS & INSIGHTS');
    console.info('=============================');

    const recommendations: string[] = [];

    // System health recommendations
    if (this.data.system.systemHealth.cpu > 80) {
      recommendations.push('⚠️  High CPU usage detected - consider scaling resources');
    }
    if (this.data.system.systemHealth.memory > 85) {
      recommendations.push('⚠️  High memory usage - monitor for potential leaks');
    }

    // Log analysis recommendations
    const errorCount = this.data.logs.filter(log => log.type === 'error').length;
    if (errorCount > 5) {
      recommendations.push('🔧 Multiple errors detected - review system logs for issues');
    }

    // Atlas recommendations
    if (this.data.atlasData) {
      const atlas = this.data.atlasData;
      const backupRatio = atlas.total.count > 0 ? atlas.total.coldExports / atlas.total.count : 0;
      if (backupRatio < 0.8) {
        recommendations.push('💾 Low backup coverage - ensure regular cold exports');
      }

      const activeRatio = atlas.total.count > 0 ? atlas.total.active / atlas.total.count : 0;
      if (activeRatio < 0.9) {
        recommendations.push('📱 Device activity low - check for inactive devices');
      }
    }

    // Metrics recommendations
    if (this.data.metricsData) {
      const metrics = this.data.metricsData;
      if (metrics.stardropYieldPct < 1.0) {
        recommendations.push('📈 Yield performance below target - optimize operations');
      }
      if (metrics.blackHoleRatePct > 2.0) {
        recommendations.push('⚠️  High dispute rate - review risk management');
      }
      if (metrics.cometCollectEta > 30) {
        recommendations.push('⏱️  Collection timing slow - optimize processes');
      }
    }

    if (recommendations.length === 0) {
      console.info('✅ All systems operating within normal parameters');
      console.info('🎉 Great job maintaining your Nebula-Flow™ ecosystem!');
      recommendations.push('✅ All systems operating within normal parameters');
    } else {
      recommendations.forEach(rec => console.info(rec));
    }

    // Store recommendations
    this.analysisResult.recommendations = recommendations;

    console.info('\n📅 Export Summary:');
    console.info(`  • Exported: ${this.data.metadata.exportDate}`);
    console.info(`  • Version: ${this.data.version}`);
    console.info(`  • Current Tab: ${this.data.currentTab}`);
    console.info(`  • Log Entries: ${this.data.logs.length}`);
  }

  async exportToJSON(outputPath?: string): Promise<string> {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = outputPath || `nebula-analysis-${timestamp}.json`;
    
    const exportData = {
      ...this.analysisResult,
      sourceData: {
        exportDate: this.data.metadata.exportDate,
        version: this.data.version || VERSION_INFO.dashboardVersion,
        timestamp: this.data.timestamp
      },
      analyzer: {
        version: VERSION_INFO.version,
        apiVersion: VERSION_INFO.apiVersion,
        buildDate: VERSION_INFO.buildDate
      }
    };

    await writeFile(filename, JSON.stringify(exportData, null, 2), 'utf-8');
    console.info(`\n✅ Analysis exported to: ${filename}`);
    return filename;
  }

  async exportToHTML(outputPath?: string): Promise<string> {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = outputPath || `nebula-analysis-${timestamp}.html`;

    const html = this.generateHTMLReport();
    await writeFile(filename, html, 'utf-8');
    console.info(`✅ HTML report exported to: ${filename}`);
    return filename;
  }

  private generateHTMLReport(): string {
    const result = this.analysisResult;
    const healthColor = result.systemHealth.score > 80 ? '#00FFAB' : 
                       result.systemHealth.score > 60 ? '#FFD23F' : '#FF6B35';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nebula-Flow™ Analysis Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0a0a0a, #1a1a1a);
            color: #ffffff;
            padding: 20px;
            line-height: 1.6;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header {
            text-align: center;
            padding: 30px;
            background: linear-gradient(45deg, #FF6B35, #00FFAB);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 30px;
        }
        .score-card {
            background: #1e1e1e;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            border: 2px solid ${healthColor};
        }
        .score-value {
            font-size: 3rem;
            font-weight: bold;
            color: ${healthColor};
            text-align: center;
        }
        .recommendations {
            background: #1e1e1e;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }
        .recommendation-item {
            padding: 10px;
            margin: 5px 0;
            background: rgba(255, 107, 53, 0.1);
            border-left: 3px solid #FF6B35;
            border-radius: 5px;
        }
        .details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .detail-item {
            background: #2a2a2a;
            padding: 15px;
            border-radius: 8px;
        }
        .detail-label {
            color: #888;
            font-size: 0.9rem;
            margin-bottom: 5px;
        }
        .detail-value {
            font-size: 1.2rem;
            font-weight: bold;
            color: #00FFAB;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧬 ${VERSION_INFO.codename} Analysis Report</h1>
            <p>Generated: ${new Date(result.timestamp).toLocaleString()}</p>
            <p style="font-size: 0.9rem; opacity: 0.8;">Analyzer v${VERSION_INFO.version} | API v${VERSION_INFO.apiVersion}</p>
        </div>

        <div class="score-card">
            <div class="score-value">${result.systemHealth.score}/100</div>
            <div style="text-align: center; margin-top: 10px; font-size: 1.2rem;">
                ${result.systemHealth.status}
            </div>
        </div>

        <div class="details-grid">
            <div class="detail-item">
                <div class="detail-label">System Health</div>
                <div class="detail-value">${result.systemHealth.score}/100</div>
            </div>
            ${result.fleetHealth ? `
            <div class="detail-item">
                <div class="detail-label">Fleet Health</div>
                <div class="detail-value">${result.fleetHealth.score}/100</div>
            </div>
            ` : ''}
            ${result.performanceScore ? `
            <div class="detail-item">
                <div class="detail-label">Performance Score</div>
                <div class="detail-value">${result.performanceScore.score}/100</div>
            </div>
            ` : ''}
            ${result.trends ? `
            <div class="detail-item">
                <div class="detail-label">Yearly Profit Projection</div>
                <div class="detail-value">$${result.trends.profitProjection.toLocaleString()}</div>
            </div>
            ` : ''}
        </div>

        <div class="recommendations">
            <h2>💡 Recommendations</h2>
            ${result.recommendations.map(rec => `
                <div class="recommendation-item">${rec}</div>
            `).join('')}
        </div>

        <div class="details-grid">
            <div class="detail-item">
                <div class="detail-label">Export Date</div>
                <div class="detail-value">${result.summary.exportDate}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Version</div>
                <div class="detail-value">${result.summary.version}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Device Count</div>
                <div class="detail-value">${result.summary.deviceCount}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Log Entries</div>
                <div class="detail-value">${result.summary.logCount}</div>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  static async analyzeFile(filename: string, options?: { exportJSON?: boolean; exportHTML?: boolean; outputDir?: string }) {
    try {
      // Try multiple possible locations
      let filePath = filename;
      const possiblePaths = [
        filename,
        join('exports', 'data', filename),
        join('..', 'exports', 'data', filename),
        join('.', filename)
      ];

      let found = false;
      for (const path of possiblePaths) {
        try {
          const file = Bun.file(path);
          if (await file.exists()) {
            filePath = path;
            found = true;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!found) {
        throw new Error(`File not found: ${filename}. Tried: ${possiblePaths.join(', ')}`);
      }

      const fileContent = await readFile(filePath, 'utf-8');
      const data: DashboardExport = JSON.parse(fileContent);

      const analyzer = new DashboardAnalyzer(data);
      analyzer.analyze();

      // Export results if requested
      if (options?.exportJSON) {
        const outputPath = options.outputDir ? 
          join(options.outputDir, `nebula-analysis-${new Date().toISOString().split('T')[0]}.json`) : 
          undefined;
        await analyzer.exportToJSON(outputPath);
      }

      if (options?.exportHTML) {
        const outputPath = options.outputDir ? 
          join(options.outputDir, `nebula-analysis-${new Date().toISOString().split('T')[0]}.html`) : 
          undefined;
        await analyzer.exportToHTML(outputPath);
      }

      return analyzer.getAnalysisResult();

    } catch (error) {
      console.error('❌ Error analyzing dashboard export:', error);
      process.exit(1);
    }
  }

  // Web-compatible version (for use in browser)
  static analyzeData(data: DashboardExport): AnalysisResult {
    const analyzer = new DashboardAnalyzer(data);
    analyzer.analyze();
    return analyzer.getAnalysisResult();
  }
}

// Main execution
const args = process.argv.slice(2);
const filename = args[0] || 'exports/data/nebula-dashboard-2026-01-21.json';
const exportJSON = args.includes('--export-json') || args.includes('-j');
const exportHTML = args.includes('--export-html') || args.includes('-h');
const outputDir = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 
                  args.find(arg => arg.startsWith('-o='))?.split('=')[1];

if (!filename || filename.startsWith('--') || filename.startsWith('-')) {
  console.info('Usage: bun run analyze-dashboard-export.ts <filename> [options]');
  console.info('\nOptions:');
  console.info('  --export-json, -j    Export analysis to JSON file');
  console.info('  --export-html, -h   Export analysis to HTML report');
  console.info('  --output=<dir>, -o=<dir>  Output directory for exports');
  console.info('\nExample:');
  console.info('  bun run analyze-dashboard-export.ts nebula-dashboard-2026-01-21.json --export-json --export-html');
  process.exit(1);
}

DashboardAnalyzer.analyzeFile(filename, { exportJSON, exportHTML, outputDir }).catch(console.error);