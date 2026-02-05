#!/usr/bin/env bun

/**
 * ScopeDetector-Enhanced Dispute Dashboard Demo
 * Demonstrates comprehensive ScopeDetector integration with dispute management
 */

import { DisputeDashboard } from './src/dashboard/dispute-dashboard.ts';
import { ScopeDetector, PlatformScopeAdapter } from './packages/@core/utils/scope-detector.ts';

async function demonstrateScopeDetectorIntegration() {
  console.log('🎯 ScopeDetector-Enhanced Dispute Dashboard Demo');
  console.log('='.repeat(70));
  
  const dashboard = new DisputeDashboard();
  
  try {
    // Get dashboard data with enhanced scope information
    console.log('\n🔍 Loading dashboard with ScopeDetector integration...');
    const dashboardData = await dashboard.getDashboardData();
    
    // Display ScopeDetector configuration
    if (dashboardData.scopeInfo && dashboardData.scopeInfo.scopeConfig) {
      const scopeConfig = dashboardData.scopeInfo.scopeConfig;
      
      console.log('\n🌐 ScopeDetector Configuration:');
      console.log(`  Detected Scope: ${scopeConfig.scope}`);
      console.log(`  Platform Scope: ${scopeConfig.platformScope}`);
      console.log(`  Serving Domain: ${scopeConfig.domain}`);
      console.log(`  Path Prefix: ${scopeConfig.pathPrefix}`);
      console.log(`  Storage Type: ${scopeConfig.storageType}`);
      console.log(`  Encryption Type: ${scopeConfig.encryptionType}`);
      
      // Display platform-specific storage configuration
      console.log('\n🔐 Platform-Specific Storage:');
      const platformStorage = dashboardData.scopeInfo.platformStorage;
      console.log(`  Storage Type: ${platformStorage.type}`);
      console.log(`  Encryption: ${platformStorage.encryption}`);
      console.log(`  Isolation: ${platformStorage.isolation}`);
      console.log(`  Persist Flag: ${platformStorage.persist}`);
      
      // Display security features
      console.log('\n🛡️ Security Features:');
      const security = dashboardData.scopeInfo.securityFeatures;
      console.log(`  Available Features: ${security.available.length}`);
      security.available.forEach(feature => console.log(`    • ${feature}`));
      console.log(`  Recommended: ${security.recommended.length}`);
      security.recommended.forEach(feature => console.log(`    • ${feature}`));
      console.log(`  Limitations: ${security.limitations.length}`);
      if (security.limitations.length > 0) {
        security.limitations.forEach(limitation => console.log(`    • ${limitation}`));
      } else {
        console.log('    ✅ No limitations');
      }
      
      // Display validation results
      console.log('\n✅ Scope Validation:');
      const validation = dashboardData.scopeInfo.validation;
      console.log(`  Valid: ${validation.valid ? '✅ Yes' : '❌ No'}`);
      if (validation.errors.length > 0) {
        console.log('  Errors:');
        validation.errors.forEach(error => console.log(`    ❌ ${error}`));
      }
      if (validation.warnings.length > 0) {
        console.log('  Warnings:');
        validation.warnings.forEach(warning => console.log(`    ⚠️ ${warning}`));
      }
      
      // Display domain mappings
      console.log('\n🌍 Domain Mappings:');
      dashboardData.scopeInfo.domainMappings.forEach((mapping, index) => {
        const isCurrent = mapping.domain === scopeConfig.domain;
        console.log(`  ${index + 1}. ${mapping.domain} -> ${mapping.scope} ${isCurrent ? '(CURRENT)' : ''}`);
        console.log(`     ${mapping.description}`);
      });
    }
    
    // Display enhanced scope information
    if (dashboardData.scopeInfo) {
      console.log('\n🎯 Enhanced Scope Information:');
      console.log(`  Environment: ${dashboardData.scopeInfo.environment.toUpperCase()}`);
      console.log(`  Platform: ${dashboardData.scopeInfo.platform}`);
      console.log(`  Connection Pool: ${dashboardData.scopeInfo.connectionPool.maxConnections} max connections`);
      console.log(`  AI Capabilities: ${dashboardData.scopeInfo.aiCapabilities.enabled ? 'Enabled' : 'Disabled'}`);
      console.log(`  ML Models: ${dashboardData.scopeInfo.aiCapabilities.models.length} available`);
      console.log(`  Real-time Analytics: ${dashboardData.scopeInfo.aiCapabilities.realTimeAnalytics ? 'Enabled' : 'Disabled'}`);
      
      console.log('\n🔧 ScopeDetector Methods:');
      console.log(`  getScopeConfig(): ${dashboard.getScopeConfig()?.scope || 'None'}`);
      console.log(`  supportsEnterpriseFeatures(): ${dashboard.supportsEnterpriseFeatures() ? 'Yes' : 'No'}`);
      console.log(`  validateScope(): ${dashboard.validateScope().valid ? 'Valid' : 'Invalid'}`);
      
      // Test scoped utility methods
      console.log('\n🛠️ Scoped Utility Methods:');
      console.log(`  getScopedServiceName('dispute-service'): ${dashboard.getScopedServiceName('dispute-service')}`);
      console.log(`  getScopedR2Path('disputes/data'): ${dashboard.getScopedR2Path('disputes/data')}`);
      console.log(`  getLocalMirrorPath('cache'): ${dashboard.getLocalMirrorPath('cache')}`);
      
      // Export scope as environment variables
      const envVars = dashboard.exportScopeAsEnv();
      console.log('\n🌍 Environment Variables:');
      Object.entries(envVars).forEach(([key, value]) => {
        console.log(`  ${key}=${value}`);
      });
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
    
    console.log('\n🎨 Web Dashboard Enhancements:');
    console.log('  • Advanced Scope Configuration section');
    console.log('  • Platform-specific storage information');
    console.log('  • Security features display');
    console.log('  • Validation results with badges');
    console.log('  • Domain mappings with current indicator');
    console.log('  • Real-time scope validation');
    console.log('  • Environment variable export');
    
    console.log('\n🔗 Integration Benefits:');
    console.log('  ✅ Comprehensive scope detection');
    console.log('  ✅ Platform-aware security features');
    console.log('  ✅ Validation and error reporting');
    console.log('  ✅ Multi-tenant domain mapping');
    console.log('  ✅ Scoped utility methods');
    console.log('  ✅ Environment variable management');
    
    console.log('\n🎉 ScopeDetector Integration Demo Complete!');
    console.log('\n💡 Open web/dispute-dashboard.html to see the full ScopeDetector-powered interface');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

// Test different platform capabilities
async function testPlatformCapabilities() {
  console.log('\n🔄 Testing Platform Capabilities');
  console.log('='.repeat(50));
  
  const platforms = ['win32', 'darwin', 'linux'];
  const scopes = ['ENTERPRISE', 'DEVELOPMENT', 'LOCAL-SANDBOX'];
  
  for (const platform of platforms) {
    console.log(`\n🖥️  Platform: ${platform}`);
    
    for (const scope of scopes) {
      const storage = PlatformScopeAdapter.getScopedStorage(platform, scope);
      const validation = PlatformScopeAdapter.validatePlatformCapability(platform, scope);
      const security = PlatformScopeAdapter.getSecurityFeatures(platform);
      
      console.log(`  📦 ${scope} Scope:`);
      console.log(`    Storage: ${storage.type} (${storage.encryption})`);
      console.log(`    Supported: ${validation.supported ? '✅' : '❌'}`);
      console.log(`    Security Features: ${security.available.length} available`);
      
      if (validation.recommendations.length > 0) {
        console.log(`    Recommendations: ${validation.recommendations.join(', ')}`);
      }
    }
  }
}

// Run the demos
if (import.meta.main) {
  await demonstrateScopeDetectorIntegration();
  await testPlatformCapabilities();
}

export { demonstrateScopeDetectorIntegration, testPlatformCapabilities };
