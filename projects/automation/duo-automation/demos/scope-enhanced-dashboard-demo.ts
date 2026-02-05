#!/usr/bin/env bun

/**
 * Scope-Enhanced Dispute Dashboard Demo
 * Demonstrates comprehensive scope management with AI integration
 */

import { DisputeDashboard } from './src/dashboard/dispute-dashboard.ts';

async function demonstrateScopeManagement() {
  console.log('🎯 Scope-Enhanced Dispute Dashboard Demo');
  console.log('='.repeat(60));
  
  const dashboard = new DisputeDashboard();
  
  try {
    // Get dashboard data with scope information
    console.log('\n🔍 Detecting scope and loading dashboard data...');
    const dashboardData = await dashboard.getDashboardData();
    
    // Display scope information
    if (dashboardData.scopeInfo) {
      console.log('\n🌐 Scope Configuration:');
      console.log(`  Detected Scope: ${dashboardData.scopeInfo.detectedScope}`);
      console.log(`  Serving Domain: ${dashboardData.scopeInfo.servingDomain}`);
      console.log(`  Platform: ${dashboardData.scopeInfo.platform}`);
      console.log(`  Environment: ${dashboardData.scopeInfo.environment.toUpperCase()}`);
      
      console.log('\n🔗 Connection Pool:');
      console.log(`  Max Connections: ${dashboardData.scopeInfo.connectionPool.maxConnections}`);
      console.log(`  Keep Alive: ${dashboardData.scopeInfo.connectionPool.keepAlive ? 'Enabled' : 'Disabled'}`);
      console.log(`  Timeout: ${dashboardData.scopeInfo.connectionPool.timeout}ms`);
      
      console.log('\n🤖 AI Capabilities:');
      console.log(`  AI Analytics: ${dashboardData.scopeInfo.aiCapabilities.enabled ? '✅ Enabled' : '❌ Disabled'}`);
      console.log(`  ML Models: ${dashboardData.scopeInfo.aiCapabilities.models.length} available`);
      console.log(`  Real-time Analytics: ${dashboardData.scopeInfo.aiCapabilities.realTimeAnalytics ? '✅ Enabled' : '❌ Disabled'}`);
      
      if (dashboardData.scopeInfo.aiCapabilities.models.length > 0) {
        console.log('\n🧠 Available ML Models:');
        dashboardData.scopeInfo.aiCapabilities.models.forEach((model, index) => {
          console.log(`  ${index + 1}. ${model.name} (${model.type}) - ${(model.accuracy * 100).toFixed(1)}% accuracy`);
        });
      }
      
      console.log('\n✨ Available Features:');
      dashboardData.scopeInfo.features.forEach((feature, index) => {
        console.log(`  ${index + 1}. ${feature}`);
      });
      
      if (dashboardData.scopeInfo.limitations.length > 0) {
        console.log('\n⚠️ Scope Limitations:');
        dashboardData.scopeInfo.limitations.forEach((limitation, index) => {
          console.log(`  ${index + 1}. ${limitation}`);
        });
      } else {
        console.log('\n✅ No limitations - Full capabilities available');
      }
    }
    
    // Display AI insights if available
    if (dashboardData.aiInsights) {
      console.log('\n🧠 AI-Powered Insights:');
      console.log(`  Risk Level: ${dashboardData.aiInsights.riskLevel.toUpperCase()}`);
      console.log(`  Predicted Volume: ${dashboardData.aiInsights.predictedVolume.toLocaleString()}`);
      console.log(`  Confidence: ${Math.round(dashboardData.aiInsights.performanceMetrics.confidence * 100)}%`);
      
      if (dashboardData.aiInsights.anomalyAlerts.length > 0) {
        console.log('\n🚨 Detected Anomalies:');
        dashboardData.aiInsights.anomalyAlerts.forEach((alert, index) => {
          console.log(`  ${index + 1}. [${alert.severity.toUpperCase()}] ${alert.type}: ${alert.message}`);
        });
      }
      
      console.log('\n💡 Recommended Actions:');
      dashboardData.aiInsights.recommendedActions.forEach((action, index) => {
        console.log(`  ${index + 1}. ${action}`);
      });
    }
    
    // Display system statistics
    console.log('\n📊 System Statistics:');
    console.log(`  Total Disputes: ${dashboardData.systemStats.totalDisputes.toLocaleString()}`);
    console.log(`  Active Disputes: ${dashboardData.systemStats.activeDisputes.toLocaleString()}`);
    console.log(`  Resolved Today: ${dashboardData.systemStats.resolvedToday.toLocaleString()}`);
    console.log(`  Avg Resolution: ${dashboardData.systemStats.avgResolutionTime}`);
    console.log(`  Refund Rate: ${dashboardData.systemStats.refundRate}`);
    
    // Test scope methods
    console.log('\n🔧 Scope Management Methods:');
    const currentScope = dashboard.getCurrentScope();
    console.log(`  Current Scope: ${currentScope?.detectedScope || 'None'}`);
    console.log(`  Has AI Capabilities: ${dashboard.hasAICapabilities() ? '✅ Yes' : '❌ No'}`);
    console.log(`  Has Debug Mode: ${dashboard.hasFeature('DEBUG_MODE') ? '✅ Yes' : '❌ No'}`);
    console.log(`  Has Analytics: ${dashboard.hasFeature('ANALYTICS') ? '✅ Yes' : '❌ No'}`);
    
    // Environment-specific capabilities
    console.log('\n🎯 Environment Capabilities:');
    switch (dashboardData.scopeInfo?.environment) {
      case 'production':
        console.log('  🚀 Production: Full enterprise features, maximum AI capabilities');
        console.log('  📊 High-performance connection pooling (10+ connections)');
        console.log('  🤖 Advanced ML models with 95%+ accuracy');
        console.log('  📈 Real-time analytics and monitoring');
        break;
      case 'staging':
        console.log('  🧪 Staging: Development features, reduced AI accuracy');
        console.log('  🔧 Moderate connection pooling (5-8 connections)');
        console.log('  🤖 Basic ML models with 85-90% accuracy');
        console.log('  📊 Limited analytics for testing');
        break;
      case 'development':
        console.log('  💻 Development: Local debugging, minimal AI features');
        console.log('  🔌 Basic connection pooling (3-5 connections)');
        console.log('  🤖 Simulated AI predictions for testing');
        console.log('  📝 Debug logging and verbose output');
        break;
    }
    
    console.log('\n🎨 Web Dashboard Features:');
    console.log('  • Real-time scope detection and display');
    console.log('  • Color-coded environment badges');
    console.log('  • Interactive AI insights section');
    console.log('  • Connection pool status monitoring');
    console.log('  • Feature and limitation indicators');
    console.log('  • Responsive design for all devices');
    
    console.log('\n🔗 Integration Points:');
    console.log('  ✅ Enhanced Matrix System integration');
    console.log('  ✅ AI Analytics Engine connectivity');
    console.log('  ✅ Scope-aware feature toggling');
    console.log('  ✅ Environment-specific optimizations');
    console.log('  ✅ Real-time performance monitoring');
    
    console.log('\n🎉 Scope-Enhanced Dashboard Demo Complete!');
    console.log('\n💡 Open web/dispute-dashboard.html to see the full scope-aware interface');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

// Test different scope environments
async function testDifferentScopes() {
  console.log('\n🔄 Testing Different Scope Environments');
  console.log('='.repeat(50));
  
  const scopes = [
    { host: 'localhost', description: 'Local Development' },
    { host: 'dev.apple.factory-wager.com', description: 'Development/Staging' },
    { host: 'apple.factory-wager.com', description: 'Enterprise Production' }
  ];
  
  for (const scope of scopes) {
    console.log(`\n📍 Testing ${scope.description} (${scope.host}):`);
    
    // Set environment variable for scope detection
    process.env.HOST = scope.host;
    
    try {
      const dashboard = new DisputeDashboard();
      const data = await dashboard.getDashboardData();
      
      if (data.scopeInfo) {
        console.log(`  ✅ Scope: ${data.scopeInfo.detectedScope}`);
        console.log(`  🌐 Environment: ${data.scopeInfo.environment}`);
        console.log(`  🔗 Connections: ${data.scopeInfo.connectionPool.maxConnections} max`);
        console.log(`  🤖 AI: ${data.scopeInfo.aiCapabilities.enabled ? 'Enabled' : 'Disabled'}`);
        console.log(`  📊 Features: ${data.scopeInfo.features.length} available`);
        console.log(`  ⚠️ Limitations: ${data.scopeInfo.limitations.length} constraints`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
}

// Run the demos
if (import.meta.main) {
  await demonstrateScopeManagement();
  await testDifferentScopes();
}

export { demonstrateScopeManagement, testDifferentScopes };
