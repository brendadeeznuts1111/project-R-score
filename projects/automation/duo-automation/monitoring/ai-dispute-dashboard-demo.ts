#!/usr/bin/env bun

/**
 * AI-Enhanced Dispute Dashboard Demo
 * Demonstrates the integration of AI analytics with dispute management
 */

import { DisputeDashboard } from './src/dashboard/dispute-dashboard.ts';

async function demonstrateAIDisputeDashboard() {
  console.log('🤖 AI-Enhanced Dispute Dashboard Demo');
  console.log('='.repeat(50));
  
  const dashboard = new DisputeDashboard();
  
  try {
    // Get dashboard data with AI insights
    console.log('\n📊 Loading dashboard data with AI insights...');
    const dashboardData = await dashboard.getDashboardData();
    
    // Display basic statistics
    console.log('\n📈 System Statistics:');
    console.log(`  Total Disputes: ${dashboardData.systemStats.totalDisputes.toLocaleString()}`);
    console.log(`  Active Disputes: ${dashboardData.systemStats.activeDisputes.toLocaleString()}`);
    console.log(`  Resolved Today: ${dashboardData.systemStats.resolvedToday.toLocaleString()}`);
    console.log(`  Avg Resolution: ${dashboardData.systemStats.avgResolutionTime}`);
    console.log(`  Refund Rate: ${dashboardData.systemStats.refundRate}`);
    
    // Display AI insights if available
    if (dashboardData.aiInsights) {
      console.log('\n🧠 AI-Powered Insights:');
      console.log(`  Risk Level: ${dashboardData.aiInsights.riskLevel.toUpperCase()}`);
      console.log(`  Predicted Volume: ${dashboardData.aiInsights.predictedVolume.toLocaleString()}`);
      console.log(`  AI Confidence: ${Math.round(dashboardData.aiInsights.performanceMetrics.confidence * 100)}%`);
      console.log(`  Model Accuracy: ${Math.round(dashboardData.aiInsights.performanceMetrics.accuracy * 100)}%`);
      
      console.log('\n🚨 Detected Anomalies:');
      if (dashboardData.aiInsights.anomalyAlerts.length > 0) {
        dashboardData.aiInsights.anomalyAlerts.forEach((alert, index) => {
          console.log(`  ${index + 1}. [${alert.severity.toUpperCase()}] ${alert.type}: ${alert.message}`);
        });
      } else {
        console.log('  ✅ No anomalies detected');
      }
      
      console.log('\n💡 Recommended Actions:');
      dashboardData.aiInsights.recommendedActions.forEach((action, index) => {
        console.log(`  ${index + 1}. ${action}`);
      });
      
      // Risk assessment details
      console.log('\n📊 Risk Assessment Breakdown:');
      const stats = dashboardData.systemStats;
      const refundRate = parseFloat(stats.refundRate) / 100;
      const avgTime = parseFloat(stats.avgResolutionTime);
      
      console.log(`  Refund Rate Risk: ${refundRate > 0.15 ? 'HIGH' : refundRate > 0.1 ? 'MEDIUM' : 'LOW'}`);
      console.log(`  Resolution Time Risk: ${avgTime > 72 ? 'HIGH' : avgTime > 48 ? 'MEDIUM' : 'LOW'}`);
      console.log(`  Active Dispute Ratio: ${((stats.activeDisputes / stats.totalDisputes) * 100).toFixed(1)}%`);
      
    } else {
      console.log('\n❌ AI insights not available');
    }
    
    // Display dispute matrix summary
    console.log('\n📋 Dispute Matrix Summary:');
    dashboardData.matrix.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.status} - ${row.timeline}`);
    });
    
    // Display quick actions
    console.log('\n⚡ Available Quick Actions:');
    dashboardData.quickActions.slice(0, 5).forEach((action, index) => {
      console.log(`  ${index + 1}. ${action.title} (${action.category})`);
    });
    
    console.log('\n🎯 Integration Features:');
    console.log('  ✅ AI-powered risk assessment');
    console.log('  ✅ Predictive dispute volume forecasting');
    console.log('  ✅ Real-time anomaly detection');
    console.log('  ✅ Intelligent recommendations');
    console.log('  ✅ Performance metrics tracking');
    console.log('  ✅ Enhanced matrix system integration');
    
    console.log('\n🌐 Web Dashboard Integration:');
    console.log('  • Real-time AI insights display');
    console.log('  • Interactive risk level indicators');
    console.log('  • Animated anomaly alerts');
    console.log('  • Actionable recommendations');
    console.log('  • Performance confidence scores');
    
    console.log('\n🎉 AI-Enhanced Dispute Dashboard Demo Complete!');
    console.log('\n💡 Open web/dashboard.html to see the full AI-powered interface');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

// Run the demo
if (import.meta.main) {
  demonstrateAIDisputeDashboard().catch(console.error);
}

export { demonstrateAIDisputeDashboard };
