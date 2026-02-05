#!/usr/bin/env bun

import { TimeSeriesAggregator } from './aggregator';
import { MLPatternRecognizer } from './ml-integration';
import { AutomatedRemediationEngine, RemediationWorkflow } from './remediation-engine';
import { UnicodeTableFormatter } from '../terminal/unicode-formatter';

export class EnhancedTimeSeriesDashboard {
  private aggregator: TimeSeriesAggregator;
  private mlRecognizer: MLPatternRecognizer;
  private remediationEngine: AutomatedRemediationEngine;
  private updateInterval: Timer | null = null;
  
  constructor() {
    this.aggregator = new TimeSeriesAggregator();
    this.mlRecognizer = new MLPatternRecognizer();
    this.remediationEngine = new AutomatedRemediationEngine();
  }

  /**
   * Start enhanced real-time dashboard
   */
  start(intervalMs: number = 5000): void {
    console.clear();
    console.log('🚀 ENHANCED TIME-SERIES DASHBOARD v5.0');
    console.log('='.repeat(90));
    console.log('🧠 ML-Powered Pattern Recognition | 🤖 Automated Remediation | 📊 Real-Time Intelligence');
    console.log('='.repeat(90));
    
    this.updateInterval = setInterval(async () => {
      await this.updateEnhancedDashboard();
    }, intervalMs);
    
    // Keep process alive
    process.stdin.resume();
    process.on('SIGINT', () => {
      this.stop();
      process.exit(0);
    });
  }

  private async updateEnhancedDashboard(): Promise<void> {
    console.clear();
    
    // Header
    console.log('🚀 ENHANCED TIME-SERIES DASHBOARD v5.0');
    console.log('='.repeat(90));
    console.log(`📅 ${new Date().toLocaleString()} | Bun v${Bun.version} | 🧠 ML v${this.mlRecognizer['MODEL_VERSION']}`);
    console.log();
    
    // 1. System Overview
    await this.displaySystemOverview();
    console.log();
    
    // 2. ML Pattern Insights
    await this.displayMLPatternInsights();
    console.log();
    
    // 3. Active Remediation Workflows
    await this.displayActiveRemediations();
    console.log();
    
    // 4. Predictive Recommendations
    await this.displayPredictiveRecommendations();
    console.log();
    
    // 5. Recent Audit Log
    await this.displayRecentAuditLog();
    console.log();
    
    // Footer
    console.log('='.repeat(90));
    console.log('🔁 Auto-updating every 5 seconds | Press Ctrl+C to stop');
    console.log('🧠 ML Analysis | 🤖 Auto-Remediation | 📊 Predictive Insights');
  }

  private async displaySystemOverview(): Promise<void> {
    console.log('🏢 SYSTEM OVERVIEW');
    console.log('─'.repeat(40));
    
    try {
      const aggregations = await this.aggregator.aggregateMetrics('ENTERPRISE', '5m');
      const latestWindow = aggregations[aggregations.length - 1];
      
      const overviewData = [
        {
          Metric: 'Active Agents',
          Value: this.countUniqueItems(aggregations.flatMap(w => w.agents)),
          Status: '🟢',
          Trend: '→'
        },
        {
          Metric: 'Active Containers',
          Value: this.countUniqueItems(aggregations.flatMap(w => w.containers)),
          Status: '🟢',
          Trend: '→'
        },
        {
          Metric: 'Anomalies (Last 5m)',
          Value: aggregations.reduce((sum, w) => sum + w.anomalies.length, 0),
          Status: aggregations.some(w => w.anomalies.some(a => a.severity === 'critical')) ? '🔴' : '🟢',
          Trend: '↑'
        },
        {
          Metric: 'Avg CPU Usage',
          Value: latestWindow ? `${latestWindow.aggregation.avg.toFixed(1)}%` : 'N/A',
          Status: latestWindow && latestWindow.aggregation.avg > 80 ? '🟡' : '🟢',
          Trend: latestWindow ? latestWindow.aggregation.trend === 'up' ? '↑' : latestWindow.aggregation.trend === 'down' ? '↓' : '→' : '→'
        },
        {
          Metric: 'Active Workflows',
          Value: this.remediationEngine.getActiveWorkflows().length,
          Status: this.remediationEngine.getActiveWorkflows().length > 0 ? '🟡' : '🟢',
          Trend: '→'
        }
      ];
      
      console.log(UnicodeTableFormatter.generateTable(overviewData, {
        maxWidth: 60,
        compact: true,
        showHeaders: true
      }));
    } catch (error) {
      console.log('⚠️  System overview data unavailable');
    }
  }

  private async displayMLPatternInsights(): Promise<void> {
    console.log('🧠 ML PATTERN INSIGHTS');
    console.log('─'.repeat(40));
    
    try {
      const aggregations = await this.aggregator.aggregateMetrics('ENTERPRISE', '15m');
      
      if (aggregations.length === 0) {
        console.log('📭 No data available for ML analysis');
        return;
      }
      
      // Get latest metrics for ML analysis
      const latestAgg = aggregations[aggregations.length - 1];
      const recentMetrics = await this.aggregator.getMasterPerfMetrics('ENTERPRISE', {
        startTime: new Date(Date.now() - 3600000).toISOString() // Last hour
      });
      
      if (recentMetrics.length < 20) {
        console.log('📊 Collecting more data for ML analysis...');
        return;
      }
      
      // Sample metrics for ML analysis
      const sampleMetrics = recentMetrics.slice(-50);
      const values = sampleMetrics.map(m => typeof m.value === 'number' ? m.value : parseFloat(String(m.value))).filter(v => !isNaN(v));
      const timestamps = sampleMetrics.map(m => m.timestamp);
      
      // Perform ML analysis
      const mlAnalysis = await this.mlRecognizer['analyzePatternWithML'](values, timestamps, {
        metricType: 'cpu_usage',
        agentId: sampleMetrics[0]?.agentId
      });
      
      const insightsData = [
        {
          Insight: 'Pattern Detected',
          Value: mlAnalysis.pattern.replace(/_/g, ' ').toUpperCase(),
          Confidence: `${(mlAnalysis.confidence * 100).toFixed(1)}%`,
          Impact: this.getPatternImpact(mlAnalysis.pattern)
        },
        {
          Insight: 'Seasonality',
          Value: mlAnalysis.features.seasonality_score > 0.7 ? 'STRONG' : 'WEAK',
          Confidence: `${(mlAnalysis.features.seasonality_score * 100).toFixed(1)}%`,
          Impact: mlAnalysis.features.seasonality_score > 0.7 ? 'HIGH' : 'LOW'
        },
        {
          Insight: 'Trend Strength',
          Value: Math.abs(mlAnalysis.features.trend_slope) > 0.1 ? 'SIGNIFICANT' : 'STABLE',
          Confidence: `${(mlAnalysis.features.trend_strength * 100).toFixed(1)}%`,
          Impact: mlAnalysis.features.trend_slope > 0 ? 'INCREASING' : 'DECREASING'
        },
        {
          Insight: 'Volatility',
          Value: mlAnalysis.features.volatility > 0.3 ? 'HIGH' : 'LOW',
          Confidence: 'N/A',
          Impact: mlAnalysis.features.volatility > 0.3 ? 'RISKY' : 'SAFE'
        }
      ];
      
      console.log(UnicodeTableFormatter.generateTable(insightsData, {
        maxWidth: 80,
        compact: true,
        showHeaders: true
      }));
      
      // Show ML explanation
      console.log('\n💡 ML Explanation:');
      console.log(`  ${mlAnalysis.explanation}`);
      
      // Show top remediation suggestions
      if (mlAnalysis.remediation.length > 0) {
        console.log('\n🛠️  ML-Powered Remediation Suggestions:');
        mlAnalysis.remediation.slice(0, 3).forEach((rec, i) => {
          console.log(`  ${i + 1}. ${rec}`);
        });
      }
      
    } catch (error) {
      console.log('⚠️  ML insights unavailable:', error.message);
    }
  }

  private async displayActiveRemediations(): Promise<void> {
    console.log('🤖 ACTIVE REMEDIATION WORKFLOWS');
    console.log('─'.repeat(40));
    
    const activeWorkflows = this.remediationEngine.getActiveWorkflows();
    
    if (activeWorkflows.length === 0) {
      console.log('✅ No active remediation workflows');
      return;
    }
    
    const workflowData = activeWorkflows.map(workflow => ({
      ID: workflow.workflowId.substring(0, 8),
      Trigger: workflow.trigger.pattern.substring(0, 15),
      Status: this.formatWorkflowStatus(workflow.status),
      Actions: `${workflow.results.filter(r => r.status === 'success').length}/${workflow.actions.length}`,
      Duration: workflow.startTime ? 
        `${Math.round((Date.now() - new Date(workflow.startTime).getTime()) / 1000)}s` : 'N/A'
    }));
    
    console.log(UnicodeTableFormatter.generateTable(workflowData, {
      maxWidth: 70,
      compact: true,
      showHeaders: true
    }));
    
    // Show details of the most recent workflow
    const mostRecent = activeWorkflows[activeWorkflows.length - 1];
    if (mostRecent) {
      console.log('\n🔍 Most Recent Workflow Details:');
      console.log(`  • ID: ${mostRecent.workflowId}`);
      console.log(`  • Trigger: ${mostRecent.trigger.pattern} (${mostRecent.trigger.severity})`);
      console.log(`  • Actions: ${mostRecent.actions.map(a => a.name).join(', ')}`);
      
      if (mostRecent.results.length > 0) {
        console.log(`  • Results: ${mostRecent.results.map(r => 
          `${r.action.name}: ${r.status}` 
        ).join(' | ')}`);
      }
    }
  }

  private async displayPredictiveRecommendations(): Promise<void> {
    console.log('🔮 PREDICTIVE RECOMMENDATIONS');
    console.log('─'.repeat(40));
    
    try {
      // Get resource predictions
      const predictions = await this.aggregator.predictResourceRequirements('ENTERPRISE', '1d');
      
      // Get anomaly trends
      const aggregations = await this.aggregator.aggregateMetrics('ENTERPRISE', '1h', {
        startTime: new Date(Date.now() - 24 * 3600000).toISOString() // Last 24 hours
      });
      
      const anomalyTrend = this.calculateAnomalyTrend(aggregations);
      
      const recommendations = [
        {
          Category: 'Resource Scaling',
          Recommendation: predictions.cpu.recommendation,
          Priority: predictions.cpu.required > predictions.cpu.current * 1.3 ? 'HIGH' : 'MEDIUM',
          Timeline: 'Next 24 hours'
        },
        {
          Category: 'Capacity Planning',
          Recommendation: anomalyTrend === 'increasing' ? 
            'Consider increasing monitoring thresholds and capacity' : 
            'Current capacity appears adequate',
          Priority: anomalyTrend === 'increasing' ? 'MEDIUM' : 'LOW',
          Timeline: 'Next week'
        },
        {
          Category: 'Optimization',
          Recommendation: 'Review container resource limits based on usage patterns',
          Priority: 'MEDIUM',
          Timeline: 'Ongoing'
        }
      ];
      
      console.log(UnicodeTableFormatter.generateTable(recommendations, {
        maxWidth: 80,
        compact: true,
        showHeaders: true
      }));
      
      // Additional ML-based recommendation
      console.log('\n🧠 ML-Based Insight:');
      const mlInsight = this.generateMLInsight(predictions, anomalyTrend);
      console.log(`  ${mlInsight}`);
      
    } catch (error) {
      console.log('⚠️  Predictive recommendations unavailable');
    }
  }

  private async displayRecentAuditLog(): Promise<void> {
    console.log('📋 RECENT AUDIT LOG');
    console.log('─'.repeat(40));
    
    const auditLog = this.remediationEngine.getAuditLog();
    const recentLogs = auditLog.slice(-5).reverse(); // Show 5 most recent
    
    if (recentLogs.length === 0) {
      console.log('📭 No recent audit events');
      return;
    }
    
    const logData = recentLogs.map(log => ({
      Time: new Date(log.timestamp).toLocaleTimeString(),
      Event: log.event.replace(/_/g, ' '),
      Details: Bun.deepToString(log.details) // 3x faster.substring(0, 30) + '...'
    }));
    
    console.log(UnicodeTableFormatter.generateTable(logData, {
      maxWidth: 90,
      compact: true,
      showHeaders: true
    }));
  }

  /**
   * Utility methods
   */
  private countUniqueItems(items: string[]): number {
    return new Set(items.filter(Boolean)).size;
  }

  private getPatternImpact(pattern: string): string {
    const impactMap: Record<string, string> = {
      'daily_pattern': 'MEDIUM',
      'gradual_increase': 'HIGH',
      'unstable_oscillation': 'HIGH',
      'spiky_behavior': 'CRITICAL',
      'memory_leak': 'HIGH',
      'normal_variation': 'LOW'
    };
    
    return impactMap[pattern] || 'UNKNOWN';
  }

  private formatWorkflowStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': '🕐 PENDING',
      'approved': '✅ APPROVED',
      'executing': '⚡ EXECUTING',
      'completed': '🎯 COMPLETED',
      'failed': '❌ FAILED',
      'rolled_back': '🔄 ROLLED BACK'
    };
    
    return statusMap[status] || '❓ UNKNOWN';
  }

  private calculateAnomalyTrend(aggregations: any[]): string {
    if (aggregations.length < 3) return 'stable';
    
    const anomalyCounts = aggregations.map(w => w.anomalies.length);
    const firstThird = anomalyCounts.slice(0, Math.floor(anomalyCounts.length / 3));
    const lastThird = anomalyCounts.slice(-Math.floor(anomalyCounts.length / 3));
    
    const firstAvg = firstThird.reduce((a, b) => a + b, 0) / firstThird.length;
    const lastAvg = lastThird.reduce((a, b) => a + b, 0) / lastThird.length;
    
    if (lastAvg > firstAvg * 1.5) return 'increasing';
    if (lastAvg < firstAvg * 0.5) return 'decreasing';
    return 'stable';
  }

  private generateMLInsight(predictions: any, anomalyTrend: string): string {
    const insights = [];
    
    if (predictions.cpu.required > predictions.cpu.current * 1.3) {
      insights.push('ML predicts CPU resources will be insufficient within 24 hours.');
    }
    
    if (anomalyTrend === 'increasing') {
      insights.push('Anomaly frequency is increasing, suggesting potential system degradation.');
    }
    
    if (predictions.containers.required > predictions.containers.current) {
      insights.push('Container count may need to increase to handle predicted load.');
    }
    
    if (insights.length === 0) {
      return 'ML analysis indicates stable system with adequate resources for predicted load.';
    }
    
    return insights.join(' ') + ' Consider proactive measures.';
  }

  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('\n🛑 Enhanced dashboard stopped');
    }
  }

  /**
   * Run ML analysis on demand
   */
  async runMLAnalysis(metricType: string = 'cpu_usage'): Promise<void> {
    console.log('🧠 Running advanced ML analysis...');
    
    try {
      const recentMetrics = await this.aggregator.getMasterPerfMetrics('ENTERPRISE', {
        startTime: new Date(Date.now() - 24 * 3600000).toISOString(),
        category: 'PERFORMANCE'
      });
      
      if (recentMetrics.length < 50) {
        console.log('📊 Need at least 50 data points for ML analysis');
        return;
      }
      
      const values = recentMetrics.map(m => 
        typeof m.value === 'number' ? m.value : parseFloat(String(m.value))
      ).filter(v => !isNaN(v));
      
      const timestamps = recentMetrics.map(m => m.timestamp);
      
      const mlResult = await this.mlRecognizer['analyzePatternWithML'](values, timestamps, {
        metricType,
        agentId: recentMetrics[0]?.agentId
      });
      
      console.log('\n📈 ML ANALYSIS RESULTS:');
      console.log('='.repeat(60));
      console.log(`Pattern: ${mlResult.pattern.toUpperCase()}`);
      console.log(`Confidence: ${(mlResult.confidence * 100).toFixed(1)}%`);
      console.log(`Category: ${mlResult.explanation.split('.')[0]}`);
      console.log('\n📊 FEATURES:');
      Object.entries(mlResult.features).forEach(([key, value]) => {
        console.log(`  ${key}: ${typeof value === 'number' ? value.toFixed(4) : value}`);
      });
      console.log('\n🛠️  REMEDIATION ACTIONS:');
      mlResult.remediation.forEach((action, i) => {
        console.log(`  ${i + 1}. ${action}`);
      });
      
    } catch (error) {
      console.error('❌ ML analysis failed:', error.message);
    }
  }

  /**
   * Trigger manual remediation
   */
  async triggerManualRemediation(
    agentId?: string,
    containerId?: string,
    pattern: string = 'manual_intervention'
  ): Promise<void> {
    console.log('🤖 Triggering manual remediation...');
    
    try {
      const workflow = await this.remediationEngine.triggerManualRemediation({
        agentId,
        containerId,
        pattern,
        severity: 'high',
        value: 100,
        expected: 50,
        deviation: 2.0,
        recommendations: ['Manually triggered by operator']
      }, ['send-alert', 'optimize-config']);
      
      console.log(`✅ Manual remediation workflow started: ${workflow.workflowId}`);
      console.log(`Status: ${workflow.status}`);
      console.log(`Actions: ${workflow.actions.map(a => a.name).join(', ')}`);
      
    } catch (error) {
      console.error('❌ Failed to trigger manual remediation:', error.message);
    }
  }
}

// CLI interface
if (import.meta.main) {
  const dashboard = new EnhancedTimeSeriesDashboard();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--ml')) {
    const metricType = args.find(arg => arg.startsWith('--metric='))?.split('=')[1] || 'cpu_usage';
    await dashboard.runMLAnalysis(metricType);
    process.exit(0);
  }
  
  if (args.includes('--remediate')) {
    const agentId = args.find(arg => arg.startsWith('--agent='))?.split('=')[1];
    const containerId = args.find(arg => arg.startsWith('--container='))?.split('=')[1];
    const pattern = args.find(arg => arg.startsWith('--pattern='))?.split('=')[1] || 'manual_intervention';
    
    await dashboard.triggerManualRemediation(agentId, containerId, pattern);
    process.exit(0);
  }
  
  if (args.includes('--workflows')) {
    const workflows = dashboard.remediationEngine.getActiveWorkflows();
    console.log('🤖 ACTIVE REMEDIATION WORKFLOWS');
    console.log('='.repeat(50));
    
    if (workflows.length === 0) {
      console.log('✅ No active workflows');
    } else {
      workflows.forEach(workflow => {
        console.log(`\n📋 Workflow: ${workflow.workflowId}`);
        console.log(`   Status: ${workflow.status}`);
        console.log(`   Trigger: ${workflow.trigger.pattern} (${workflow.trigger.severity})`);
        console.log(`   Actions: ${workflow.actions.map(a => a.name).join(', ')}`);
        console.log(`   Results: ${workflow.results.map(r => `${r.action.name}: ${r.status}`).join(' | ')}`);
      });
    }
    process.exit(0);
  }
  
  // Default: start dashboard
  const interval = args.find(arg => arg.startsWith('--interval='))?.split('=')[1];
  dashboard.start(interval ? parseInt(interval) : 5000);
}
