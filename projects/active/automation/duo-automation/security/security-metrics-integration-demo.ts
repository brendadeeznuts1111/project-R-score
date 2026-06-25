#!/usr/bin/env bun

/**
 * Security Metrics-Enhanced Dispute Dashboard Demo
 * Demonstrates comprehensive security monitoring and compliance tracking
 */

import { DisputeDashboard } from './src/dashboard/dispute-dashboard.ts';
import { enhanceSecurityMetric, SecurityMetric } from './tools/types/enhance-metric.ts';
import { ScopeDetector } from './packages/@core/utils/scope-detector.ts';

async function demonstrateSecurityMetricsIntegration() {
  console.info('🛡️ Security Metrics-Enhanced Dispute Dashboard Demo');
  console.info('='.repeat(70));
  
  const dashboard = new DisputeDashboard();
  
  try {
    // Get dashboard data with security metrics
    console.info('\n🔍 Loading dashboard with security metrics integration...');
    const dashboardData = await dashboard.getDashboardData();
    
    // Display security metrics overview
    if (dashboardData.securityMetrics) {
      const security = dashboardData.securityMetrics;
      
      console.info('\n🛡️ Security Metrics Overview:');
      console.info(`  Overall Security Score: ${security.overallScore}/100`);
      console.info(`  Risk Level: ${security.riskLevel}`);
      console.info(`  Compliance Status: ${security.complianceStatus.replace('_', ' ')}`);
      console.info(`  Last Verified: ${new Date(security.lastVerified).toLocaleString()}`);
      console.info(`  Total Metrics: ${security.metrics.length}`);
      
      // Display category breakdown
      console.info('\n📊 Security Category Breakdown:');
      Object.entries(security.categories).forEach(([category, metrics]) => {
        const avgScore = metrics.length > 0 ? 
          Math.round(metrics.reduce((sum, m) => sum + m.securityScore, 0) / metrics.length) : 0;
        console.info(`  ${category.charAt(0).toUpperCase() + category.slice(1)}: ${avgScore}/100 (${metrics.length} metrics)`);
      });
      
      // Display detailed metrics
      console.info('\n🔍 Detailed Security Metrics:');
      security.metrics.forEach((metric, index) => {
        console.info(`  ${index + 1}. [${metric.type.toUpperCase()}] ${metric.topic}`);
        console.info(`     Status: ${metric.value} | Score: ${metric.securityScore}/100`);
        console.info(`     Risk: ${metric.riskLevel} | Compliance: ${metric.complianceStatus}`);
        console.info(`     Domain: ${metric.domain} | Impact: ${metric.impact}`);
        
        if (metric.properties) {
          console.info(`     Properties: ${JSON.stringify(metric.properties, null, 6).slice(0, 100)}...`);
        }
        console.info('');
      });
      
      // Display security trends
      console.info('\n📈 Security Trends Analysis:');
      if (security.trends.improving.length > 0) {
        console.info('  📈 Improving:');
        security.trends.improving.forEach(item => console.info(`    • ${item}`));
      }
      
      if (security.trends.stable.length > 0) {
        console.info('  ➡️ Stable:');
        security.trends.stable.forEach(item => console.info(`    • ${item}`));
      }
      
      if (security.trends.degrading.length > 0) {
        console.info('  📉 Degrading:');
        security.trends.degrading.forEach(item => console.info(`    • ${item}`));
      }
      
      // Display security recommendations
      console.info('\n💡 Security Recommendations:');
      const recommendations = generateSecurityRecommendations(security);
      recommendations.forEach((rec, index) => {
        console.info(`  ${index + 1}. ${rec}`);
      });
      
      // Display compliance status
      console.info('\n📋 Compliance Status:');
      console.info(`  Overall: ${security.complianceStatus.replace('_', ' ')}`);
      
      const complianceMetrics = security.metrics.filter(m => m.type === 'compliance');
      complianceMetrics.forEach(metric => {
        console.info(`  ${metric.topic}: ${metric.complianceStatus}`);
      });
    }
    
    // Display scope information
    if (dashboardData.scopeInfo) {
      console.info('\n🎯 Scope-Integrated Security:');
      console.info(`  Scope: ${dashboardData.scopeInfo.detectedScope}`);
      console.info(`  Domain: ${dashboardData.scopeInfo.servingDomain}`);
      console.info(`  Environment: ${dashboardData.scopeInfo.environment}`);
      console.info(`  Platform Security: ${dashboardData.scopeInfo.securityFeatures.available.length} features`);
      
      // Show how scope affects security
      console.info('\n🔒 Scope-Based Security Configuration:');
      const scope = dashboardData.scopeInfo.detectedScope;
      if (scope === 'ENTERPRISE') {
        console.info('  🏢 Enterprise Security:');
        console.info('    • Multi-Factor Authentication: Required');
        console.info('    • Role-Based Access Control: Full');
        console.info('    • Audit Logging: Comprehensive');
        console.info('    • Compliance: GDPR & SOC2 Compliant');
        console.info('    • Encryption: AES-256 at rest and in transit');
      } else if (scope === 'DEVELOPMENT') {
        console.info('  🧪 Development Security:');
        console.info('    • Multi-Factor Authentication: Partial');
        console.info('    • Role-Based Access Control: Basic');
        console.info('    • Audit Logging: Limited');
        console.info('    • Compliance: Partial GDPR');
        console.info('    • Encryption: AES-256 at rest and in transit');
      } else {
        console.info('  💻 Local Security:');
        console.info('    • Multi-Factor Authentication: Optional');
        console.info('    • Role-Based Access Control: Minimal');
        console.info('    • Audit Logging: Basic');
        console.info('    • Compliance: Non-compliant');
        console.info('    • Encryption: Platform-specific');
      }
    }
    
    // Display AI insights if available
    if (dashboardData.aiInsights) {
      console.info('\n🧠 AI-Powered Security Insights:');
      console.info(`  Risk Assessment: ${dashboardData.aiInsights.riskLevel.toUpperCase()}`);
      console.info(`  Anomalies Detected: ${dashboardData.aiInsights.anomalyAlerts.length}`);
      
      if (dashboardData.aiInsights.anomalyAlerts.length > 0) {
        console.info('  🚨 Security Anomalies:');
        dashboardData.aiInsights.anomalyAlerts.forEach((alert, index) => {
          console.info(`    ${index + 1}. [${alert.severity}] ${alert.type}: ${alert.message}`);
        });
      }
    }
    
    // Display system statistics
    console.info('\n📊 System Security Statistics:');
    console.info(`  Total Disputes: ${dashboardData.systemStats.totalDisputes.toLocaleString()}`);
    console.info(`  Active Disputes: ${dashboardData.systemStats.activeDisputes.toLocaleString()}`);
    console.info(`  Resolved Today: ${dashboardData.systemStats.resolvedToday.toLocaleString()}`);
    console.info(`  Refund Rate: ${dashboardData.systemStats.refundRate}`);
    
    console.info('\n🎨 Web Dashboard Security Features:');
    console.info('  • Real-time security score monitoring');
    console.info('  • Risk level assessment with color coding');
    console.info('  • Compliance status tracking');
    console.info('  • Category-based security breakdown');
    console.info('  • Security trends analysis');
    console.info('  • Detailed metrics table');
    console.info('  • Scope-aware security configuration');
    
    console.info('\n🔗 Security Integration Benefits:');
    console.info('  ✅ Comprehensive security monitoring');
    console.info('  ✅ Real-time risk assessment');
    console.info('  ✅ Compliance tracking (GDPR, SOC2)');
    console.info('  ✅ Scope-based security configuration');
    console.info('  ✅ AI-powered anomaly detection');
    console.info('  ✅ Detailed security analytics');
    console.info('  ✅ Trend analysis and recommendations');
    
    console.info('\n🎉 Security Metrics Integration Demo Complete!');
    console.info('\n💡 Open web/dispute-dashboard.html to see the full security monitoring interface');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

// Generate security recommendations based on metrics
function generateSecurityRecommendations(security: any): string[] {
  const recommendations: string[] = [];
  
  // Check for low-scoring categories
  Object.entries(security.categories).forEach(([category, metrics]) => {
    const avgScore = metrics.length > 0 ? 
      Math.round(metrics.reduce((sum: number, m: any) => sum + m.securityScore, 0) / metrics.length) : 0;
    
    if (avgScore < 60) {
      switch (category) {
        case 'authentication':
          recommendations.push('Enable multi-factor authentication for all users');
          recommendations.push('Strengthen password policies and implement regular rotation');
          break;
        case 'authorization':
          recommendations.push('Implement comprehensive role-based access control');
          recommendations.push('Review and update API rate limiting policies');
          break;
        case 'encryption':
          recommendations.push('Enable encryption for data at rest');
          recommendations.push('Implement perfect forward secrecy for data in transit');
          break;
        case 'monitoring':
          recommendations.push('Enable comprehensive audit logging');
          recommendations.push('Implement real-time security monitoring and alerting');
          break;
        case 'compliance':
          recommendations.push('Achieve GDPR compliance for data protection');
          recommendations.push('Complete SOC2 Type 2 certification');
          break;
      }
    }
  });
  
  // Check for specific high-risk items
  const highRiskMetrics = security.metrics.filter((m: any) => m.riskLevel === 'HIGH' || m.riskLevel === 'CRITICAL');
  if (highRiskMetrics.length > 0) {
    recommendations.push(`Address ${highRiskMetrics.length} high-risk security items immediately`);
  }
  
  // Check compliance issues
  const nonCompliant = security.metrics.filter((m: any) => m.complianceStatus === 'NON_COMPLIANT');
  if (nonCompliant.length > 0) {
    recommendations.push(`Resolve ${nonCompliant.length} compliance issues to meet regulatory requirements`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Security posture is strong - continue monitoring and maintenance');
  }
  
  return recommendations;
}

// Test security metrics across different scopes
async function testSecurityAcrossScopes() {
  console.info('\n🔄 Testing Security Metrics Across Scopes');
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
      
      if (data.securityMetrics) {
        const security = data.securityMetrics;
        console.info(`  ✅ Security Score: ${security.overallScore}/100`);
        console.info(`  🛡️ Risk Level: ${security.riskLevel}`);
        console.info(`  📋 Compliance: ${security.complianceStatus.replace('_', ' ')}`);
        console.info(`  📊 Metrics: ${security.metrics.length} total`);
        
        // Show key security features
        const authScore = security.categories.authentication.length > 0 ?
          Math.round(security.categories.authentication.reduce((sum: number, m: any) => sum + m.securityScore, 0) / security.categories.authentication.length) : 0;
        const encryptScore = security.categories.encryption.length > 0 ?
          Math.round(security.categories.encryption.reduce((sum: number, m: any) => sum + m.securityScore, 0) / security.categories.encryption.length) : 0;
        
        console.info(`  🔐 Authentication: ${authScore}/100`);
        console.info(`  🔒 Encryption: ${encryptScore}/100`);
      }
    } catch (error) {
      console.info(`  ❌ Error: ${error.message}`);
    }
  }
}

// Run the demos
if (import.meta.main) {
  await demonstrateSecurityMetricsIntegration();
  await testSecurityAcrossScopes();
}

export { demonstrateSecurityMetricsIntegration, testSecurityAcrossScopes };
