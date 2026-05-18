#!/usr/bin/env bun

/**
 * ScopeDetector-Enhanced Dispute Dashboard Demo
 * Demonstrates comprehensive ScopeDetector integration with dispute management
 */

import { DisputeDashboard } from './src/dashboard/dispute-dashboard.ts';
import { ScopeDetector, PlatformScopeAdapter } from './packages/@core/utils/scope-detector.ts';

async function demonstrateScopeDetectorIntegration() {
  console.info('🎯 ScopeDetector-Enhanced Dispute Dashboard Demo');
  console.info('='.repeat(70));
  
  const dashboard = new DisputeDashboard();
  
  try {
    // Get dashboard data with enhanced scope information
    console.info('\n🔍 Loading dashboard with ScopeDetector integration...');
    const dashboardData = await dashboard.getDashboardData();
    
    // Display ScopeDetector configuration
    if (dashboardData.scopeInfo && dashboardData.scopeInfo.scopeConfig) {
      const scopeConfig = dashboardData.scopeInfo.scopeConfig;
      
      console.info('\n🌐 ScopeDetector Configuration:');
      console.info(`  Detected Scope: ${scopeConfig.scope}`);
      console.info(`  Platform Scope: ${scopeConfig.platformScope}`);
      console.info(`  Serving Domain: ${scopeConfig.domain}`);
      console.info(`  Path Prefix: ${scopeConfig.pathPrefix}`);
      console.info(`  Storage Type: ${scopeConfig.storageType}`);
      console.info(`  Encryption Type: ${scopeConfig.encryptionType}`);
      
      // Display platform-specific storage configuration
      console.info('\n🔐 Platform-Specific Storage:');
      const platformStorage = dashboardData.scopeInfo.platformStorage;
      console.info(`  Storage Type: ${platformStorage.type}`);
      console.info(`  Encryption: ${platformStorage.encryption}`);
      console.info(`  Isolation: ${platformStorage.isolation}`);
      console.info(`  Persist Flag: ${platformStorage.persist}`);
      
      // Display security features
      console.info('\n🛡️ Security Features:');
      const security = dashboardData.scopeInfo.securityFeatures;
      console.info(`  Available Features: ${security.available.length}`);
      security.available.forEach(feature => console.info(`    • ${feature}`));
      console.info(`  Recommended: ${security.recommended.length}`);
      security.recommended.forEach(feature => console.info(`    • ${feature}`));
      console.info(`  Limitations: ${security.limitations.length}`);
      if (security.limitations.length > 0) {
        security.limitations.forEach(limitation => console.info(`    • ${limitation}`));
      } else {
        console.info('    ✅ No limitations');
      }
      
      // Display validation results
      console.info('\n✅ Scope Validation:');
      const validation = dashboardData.scopeInfo.validation;
      console.info(`  Valid: ${validation.valid ? '✅ Yes' : '❌ No'}`);
      if (validation.errors.length > 0) {
        console.info('  Errors:');
        validation.errors.forEach(error => console.info(`    ❌ ${error}`));
      }
      if (validation.warnings.length > 0) {
        console.info('  Warnings:');
        validation.warnings.forEach(warning => console.info(`    ⚠️ ${warning}`));
      }
      
      // Display domain mappings
      console.info('\n🌍 Domain Mappings:');
      dashboardData.scopeInfo.domainMappings.forEach((mapping, index) => {
        const isCurrent = mapping.domain === scopeConfig.domain;
        console.info(`  ${index + 1}. ${mapping.domain} -> ${mapping.scope} ${isCurrent ? '(CURRENT)' : ''}`);
        console.info(`     ${mapping.description}`);
      });
    }
    
    // Display enhanced scope information
    if (dashboardData.scopeInfo) {
      console.info('\n🎯 Enhanced Scope Information:');
      console.info(`  Environment: ${dashboardData.scopeInfo.environment.toUpperCase()}`);
      console.info(`  Platform: ${dashboardData.scopeInfo.platform}`);
      console.info(`  Connection Pool: ${dashboardData.scopeInfo.connectionPool.maxConnections} max connections`);
      console.info(`  AI Capabilities: ${dashboardData.scopeInfo.aiCapabilities.enabled ? 'Enabled' : 'Disabled'}`);
      console.info(`  ML Models: ${dashboardData.scopeInfo.aiCapabilities.models.length} available`);
      console.info(`  Real-time Analytics: ${dashboardData.scopeInfo.aiCapabilities.realTimeAnalytics ? 'Enabled' : 'Disabled'}`);
      
      console.info('\n🔧 ScopeDetector Methods:');
      console.info(`  getScopeConfig(): ${dashboard.getScopeConfig()?.scope || 'None'}`);
      console.info(`  supportsEnterpriseFeatures(): ${dashboard.supportsEnterpriseFeatures() ? 'Yes' : 'No'}`);
      console.info(`  validateScope(): ${dashboard.validateScope().valid ? 'Valid' : 'Invalid'}`);
      
      // Test scoped utility methods
      console.info('\n🛠️ Scoped Utility Methods:');
      console.info(`  getScopedServiceName('dispute-service'): ${dashboard.getScopedServiceName('dispute-service')}`);
      console.info(`  getScopedR2Path('disputes/data'): ${dashboard.getScopedR2Path('disputes/data')}`);
      console.info(`  getLocalMirrorPath('cache'): ${dashboard.getLocalMirrorPath('cache')}`);
      
      // Export scope as environment variables
      const envVars = dashboard.exportScopeAsEnv();
      console.info('\n🌍 Environment Variables:');
      Object.entries(envVars).forEach(([key, value]) => {
        console.info(`  ${key}=${value}`);
      });
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
    
    console.info('\n🎨 Web Dashboard Enhancements:');
    console.info('  • Advanced Scope Configuration section');
    console.info('  • Platform-specific storage information');
    console.info('  • Security features display');
    console.info('  • Validation results with badges');
    console.info('  • Domain mappings with current indicator');
    console.info('  • Real-time scope validation');
    console.info('  • Environment variable export');
    
    console.info('\n🔗 Integration Benefits:');
    console.info('  ✅ Comprehensive scope detection');
    console.info('  ✅ Platform-aware security features');
    console.info('  ✅ Validation and error reporting');
    console.info('  ✅ Multi-tenant domain mapping');
    console.info('  ✅ Scoped utility methods');
    console.info('  ✅ Environment variable management');
    
    console.info('\n🎉 ScopeDetector Integration Demo Complete!');
    console.info('\n💡 Open web/dispute-dashboard.html to see the full ScopeDetector-powered interface');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

// Test different platform capabilities
async function testPlatformCapabilities() {
  console.info('\n🔄 Testing Platform Capabilities');
  console.info('='.repeat(50));
  
  const platforms = ['win32', 'darwin', 'linux'];
  const scopes = ['ENTERPRISE', 'DEVELOPMENT', 'LOCAL-SANDBOX'];
  
  for (const platform of platforms) {
    console.info(`\n🖥️  Platform: ${platform}`);
    
    for (const scope of scopes) {
      const storage = PlatformScopeAdapter.getScopedStorage(platform, scope);
      const validation = PlatformScopeAdapter.validatePlatformCapability(platform, scope);
      const security = PlatformScopeAdapter.getSecurityFeatures(platform);
      
      console.info(`  📦 ${scope} Scope:`);
      console.info(`    Storage: ${storage.type} (${storage.encryption})`);
      console.info(`    Supported: ${validation.supported ? '✅' : '❌'}`);
      console.info(`    Security Features: ${security.available.length} available`);
      
      if (validation.recommendations.length > 0) {
        console.info(`    Recommendations: ${validation.recommendations.join(', ')}`);
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
