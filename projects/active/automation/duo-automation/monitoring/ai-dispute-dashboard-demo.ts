#!/usr/bin/env bun

/**
 * AI-Enhanced Dispute Dashboard Demo
 * Demonstrates the integration of AI analytics with dispute management
 */

import { DisputeDashboard } from './src/dashboard/dispute-dashboard.ts';

async function demonstrateAIDisputeDashboard() {
  console.info('🤖 AI-Enhanced Dispute Dashboard Demo');
  console.info('='.repeat(50));
  
  const dashboard = new DisputeDashboard();
  
  try {
    // Get dashboard data with AI insights
    console.info('\n📊 Loading dashboard data with AI insights...');
    const dashboardData = await dashboard.getDashboardData();
    
    // Display basic statistics
    console.info('\n📈 System Statistics:');
    console.info(`  Total Disputes: ${dashboardData.systemStats.totalDisputes.toLocaleString()}`);
    console.info(`  Active Disputes: ${dashboardData.systemStats.activeDisputes.toLocaleString()}`);
    console.info(`  Resolved Today: ${dashboardData.systemStats.resolvedToday.toLocaleString()}`);
    console.info(`  Avg Resolution: ${dashboardData.systemStats.avgResolutionTime}`);
    console.info(`  Refund Rate: ${dashboardData.systemStats.refundRate}`);
    
    // Display AI insights if available
    if (dashboardData.aiInsights) {
      console.info('\n🧠 AI-Powered Insights:');
      console.info(`  Risk Level: ${dashboardData.aiInsights.riskLevel.toUpperCase()}`);
      console.info(`  Predicted Volume: ${dashboardData.aiInsights.predictedVolume.toLocaleString()}`);
      console.info(`  AI Confidence: ${Math.round(dashboardData.aiInsights.performanceMetrics.confidence * 100)}%`);
      console.info(`  Model Accuracy: ${Math.round(dashboardData.aiInsights.performanceMetrics.accuracy * 100)}%`);
      
      console.info('\n🚨 Detected Anomalies:');
      if (dashboardData.aiInsights.anomalyAlerts.length > 0) {
        dashboardData.aiInsights.anomalyAlerts.forEach((alert, index) => {
          console.info(`  ${index + 1}. [${alert.severity.toUpperCase()}] ${alert.type}: ${alert.message}`);
        });
      } else {
        console.info('  ✅ No anomalies detected');
      }
      
      console.info('\n💡 Recommended Actions:');
      dashboardData.aiInsights.recommendedActions.forEach((action, index) => {
        console.info(`  ${index + 1}. ${action}`);
      });
      
      // Risk assessment details
      console.info('\n📊 Risk Assessment Breakdown:');
      const stats = dashboardData.systemStats;
      const refundRate = parseFloat(stats.refundRate) / 100;
      const avgTime = parseFloat(stats.avgResolutionTime);
      
      console.info(`  Refund Rate Risk: ${refundRate > 0.15 ? 'HIGH' : refundRate > 0.1 ? 'MEDIUM' : 'LOW'}`);
      console.info(`  Resolution Time Risk: ${avgTime > 72 ? 'HIGH' : avgTime > 48 ? 'MEDIUM' : 'LOW'}`);
      console.info(`  Active Dispute Ratio: ${((stats.activeDisputes / stats.totalDisputes) * 100).toFixed(1)}%`);
      
    } else {
      console.info('\n❌ AI insights not available');
    }
    
    // Display dispute matrix summary
    console.info('\n📋 Dispute Matrix Summary:');
    dashboardData.matrix.forEach((row, index) => {
      console.info(`  ${index + 1}. ${row.status} - ${row.timeline}`);
    });
    
    // Display quick actions
    console.info('\n⚡ Available Quick Actions:');
    dashboardData.quickActions.slice(0, 5).forEach((action, index) => {
      console.info(`  ${index + 1}. ${action.title} (${action.category})`);
    });
    
    console.info('\n🎯 Integration Features:');
    console.info('  ✅ AI-powered risk assessment');
    console.info('  ✅ Predictive dispute volume forecasting');
    console.info('  ✅ Real-time anomaly detection');
    console.info('  ✅ Intelligent recommendations');
    console.info('  ✅ Performance metrics tracking');
    console.info('  ✅ Enhanced matrix system integration');
    
    console.info('\n🌐 Web Dashboard Integration:');
    console.info('  • Real-time AI insights display');
    console.info('  • Interactive risk level indicators');
    console.info('  • Animated anomaly alerts');
    console.info('  • Actionable recommendations');
    console.info('  • Performance confidence scores');
    
    console.info('\n🎉 AI-Enhanced Dispute Dashboard Demo Complete!');
    console.info('\n💡 Open web/dashboard.html to see the full AI-powered interface');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

// Run the demo
if (import.meta.main) {
  demonstrateAIDisputeDashboard().catch(console.error);
}

export { demonstrateAIDisputeDashboard };
