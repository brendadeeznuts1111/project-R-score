#!/usr/bin/env bun

/**
 * Scope-Enhanced Dispute Dashboard Demo
 * Demonstrates comprehensive scope management with AI integration
 */

import { DisputeDashboard } from './src/dashboard/dispute-dashboard.ts';

async function demonstrateScopeManagement() {
  console.info('🎯 Scope-Enhanced Dispute Dashboard Demo');
  console.info('='.repeat(60));
  
  const dashboard = new DisputeDashboard();
  
  try {
    // Get dashboard data with scope information
    console.info('\n🔍 Detecting scope and loading dashboard data...');
    const dashboardData = await dashboard.getDashboardData();
    
    // Display scope information
    if (dashboardData.scopeInfo) {
      console.info('\n🌐 Scope Configuration:');
      console.info(`  Detected Scope: ${dashboardData.scopeInfo.detectedScope}`);
      console.info(`  Serving Domain: ${dashboardData.scopeInfo.servingDomain}`);
      console.info(`  Platform: ${dashboardData.scopeInfo.platform}`);
      console.info(`  Environment: ${dashboardData.scopeInfo.environment.toUpperCase()}`);
      
      console.info('\n🔗 Connection Pool:');
      console.info(`  Max Connections: ${dashboardData.scopeInfo.connectionPool.maxConnections}`);
      console.info(`  Keep Alive: ${dashboardData.scopeInfo.connectionPool.keepAlive ? 'Enabled' : 'Disabled'}`);
      console.info(`  Timeout: ${dashboardData.scopeInfo.connectionPool.timeout}ms`);
      
      console.info('\n🤖 AI Capabilities:');
      console.info(`  AI Analytics: ${dashboardData.scopeInfo.aiCapabilities.enabled ? '✅ Enabled' : '❌ Disabled'}`);
      console.info(`  ML Models: ${dashboardData.scopeInfo.aiCapabilities.models.length} available`);
      console.info(`  Real-time Analytics: ${dashboardData.scopeInfo.aiCapabilities.realTimeAnalytics ? '✅ Enabled' : '❌ Disabled'}`);
      
      if (dashboardData.scopeInfo.aiCapabilities.models.length > 0) {
        console.info('\n🧠 Available ML Models:');
        dashboardData.scopeInfo.aiCapabilities.models.forEach((model, index) => {
          console.info(`  ${index + 1}. ${model.name} (${model.type}) - ${(model.accuracy * 100).toFixed(1)}% accuracy`);
        });
      }
      
      console.info('\n✨ Available Features:');
      dashboardData.scopeInfo.features.forEach((feature, index) => {
        console.info(`  ${index + 1}. ${feature}`);
      });
      
      if (dashboardData.scopeInfo.limitations.length > 0) {
        console.info('\n⚠️ Scope Limitations:');
        dashboardData.scopeInfo.limitations.forEach((limitation, index) => {
          console.info(`  ${index + 1}. ${limitation}`);
        });
      } else {
        console.info('\n✅ No limitations - Full capabilities available');
      }
    }
    
    // Display AI insights if available
    if (dashboardData.aiInsights) {
      console.info('\n🧠 AI-Powered Insights:');
      console.info(`  Risk Level: ${dashboardData.aiInsights.riskLevel.toUpperCase()}`);
      console.info(`  Predicted Volume: ${dashboardData.aiInsights.predictedVolume.toLocaleString()}`);
      console.info(`  Confidence: ${Math.round(dashboardData.aiInsights.performanceMetrics.confidence * 100)}%`);
      
      if (dashboardData.aiInsights.anomalyAlerts.length > 0) {
        console.info('\n🚨 Detected Anomalies:');
        dashboardData.aiInsights.anomalyAlerts.forEach((alert, index) => {
          console.info(`  ${index + 1}. [${alert.severity.toUpperCase()}] ${alert.type}: ${alert.message}`);
        });
      }
      
      console.info('\n💡 Recommended Actions:');
      dashboardData.aiInsights.recommendedActions.forEach((action, index) => {
        console.info(`  ${index + 1}. ${action}`);
      });
    }
    
    // Display system statistics
    console.info('\n📊 System Statistics:');
    console.info(`  Total Disputes: ${dashboardData.systemStats.totalDisputes.toLocaleString()}`);
    console.info(`  Active Disputes: ${dashboardData.systemStats.activeDisputes.toLocaleString()}`);
    console.info(`  Resolved Today: ${dashboardData.systemStats.resolvedToday.toLocaleString()}`);
    console.info(`  Avg Resolution: ${dashboardData.systemStats.avgResolutionTime}`);
    console.info(`  Refund Rate: ${dashboardData.systemStats.refundRate}`);
    
    // Test scope methods
    console.info('\n🔧 Scope Management Methods:');
    const currentScope = dashboard.getCurrentScope();
    console.info(`  Current Scope: ${currentScope?.detectedScope || 'None'}`);
    console.info(`  Has AI Capabilities: ${dashboard.hasAICapabilities() ? '✅ Yes' : '❌ No'}`);
    console.info(`  Has Debug Mode: ${dashboard.hasFeature('DEBUG_MODE') ? '✅ Yes' : '❌ No'}`);
    console.info(`  Has Analytics: ${dashboard.hasFeature('ANALYTICS') ? '✅ Yes' : '❌ No'}`);
    
    // Environment-specific capabilities
    console.info('\n🎯 Environment Capabilities:');
    switch (dashboardData.scopeInfo?.environment) {
      case 'production':
        console.info('  🚀 Production: Full enterprise features, maximum AI capabilities');
        console.info('  📊 High-performance connection pooling (10+ connections)');
        console.info('  🤖 Advanced ML models with 95%+ accuracy');
        console.info('  📈 Real-time analytics and monitoring');
        break;
      case 'staging':
        console.info('  🧪 Staging: Development features, reduced AI accuracy');
        console.info('  🔧 Moderate connection pooling (5-8 connections)');
        console.info('  🤖 Basic ML models with 85-90% accuracy');
        console.info('  📊 Limited analytics for testing');
        break;
      case 'development':
        console.info('  💻 Development: Local debugging, minimal AI features');
        console.info('  🔌 Basic connection pooling (3-5 connections)');
        console.info('  🤖 Simulated AI predictions for testing');
        console.info('  📝 Debug logging and verbose output');
        break;
    }
    
    console.info('\n🎨 Web Dashboard Features:');
    console.info('  • Real-time scope detection and display');
    console.info('  • Color-coded environment badges');
    console.info('  • Interactive AI insights section');
    console.info('  • Connection pool status monitoring');
    console.info('  • Feature and limitation indicators');
    console.info('  • Responsive design for all devices');
    
    console.info('\n🔗 Integration Points:');
    console.info('  ✅ Enhanced Matrix System integration');
    console.info('  ✅ AI Analytics Engine connectivity');
    console.info('  ✅ Scope-aware feature toggling');
    console.info('  ✅ Environment-specific optimizations');
    console.info('  ✅ Real-time performance monitoring');
    
    console.info('\n🎉 Scope-Enhanced Dashboard Demo Complete!');
    console.info('\n💡 Open web/dispute-dashboard.html to see the full scope-aware interface');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

// Test different scope environments
async function testDifferentScopes() {
  console.info('\n🔄 Testing Different Scope Environments');
  console.info('='.repeat(50));
  
  const scopes = [
    { host: 'localhost', description: 'Local Development' },
    { host: 'dev.apple.factory-wager.com', description: 'Development/Staging' },
    { host: 'apple.factory-wager.com', description: 'Enterprise Production' }
  ];
  
  for (const scope of scopes) {
    console.info(`\n📍 Testing ${scope.description} (${scope.host}):`);
    
    // Set environment variable for scope detection
    process.env.HOST = scope.host;
    
    try {
      const dashboard = new DisputeDashboard();
      const data = await dashboard.getDashboardData();
      
      if (data.scopeInfo) {
        console.info(`  ✅ Scope: ${data.scopeInfo.detectedScope}`);
        console.info(`  🌐 Environment: ${data.scopeInfo.environment}`);
        console.info(`  🔗 Connections: ${data.scopeInfo.connectionPool.maxConnections} max`);
        console.info(`  🤖 AI: ${data.scopeInfo.aiCapabilities.enabled ? 'Enabled' : 'Disabled'}`);
        console.info(`  📊 Features: ${data.scopeInfo.features.length} available`);
        console.info(`  ⚠️ Limitations: ${data.scopeInfo.limitations.length} constraints`);
      }
    } catch (error) {
      console.info(`  ❌ Error: ${error.message}`);
    }
  }
}

// Run the demos
if (import.meta.main) {
  await demonstrateScopeManagement();
  await testDifferentScopes();
}

export { demonstrateScopeManagement, testDifferentScopes };
