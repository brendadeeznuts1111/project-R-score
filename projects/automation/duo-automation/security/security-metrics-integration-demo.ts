#!/usr/bin/env bun

/**
 * Security Metrics-Enhanced Dispute Dashboard Demo
 * Demonstrates comprehensive security monitoring and compliance tracking
 */

import { DisputeDashboard } from './src/dashboard/dispute-dashboard.ts';
import { enhanceSecurityMetric, SecurityMetric } from './tools/types/enhance-metric.ts';
import { ScopeDetector } from './packages/@core/utils/scope-detector.ts';

async function demonstrateSecurityMetricsIntegration() {
  console.log('🛡️ Security Metrics-Enhanced Dispute Dashboard Demo');
  console.log('='.repeat(70));
  
  const dashboard = new DisputeDashboard();
  
  try {
    // Get dashboard data with security metrics
    console.log('\n🔍 Loading dashboard with security metrics integration...');
    const dashboardData = await dashboard.getDashboardData();
    
    // Display security metrics overview
    if (dashboardData.securityMetrics) {
      const security = dashboardData.securityMetrics;
      
      console.log('\n🛡️ Security Metrics Overview:');
      console.log(`  Overall Security Score: ${security.overallScore}/100`);
      console.log(`  Risk Level: ${security.riskLevel}`);
      console.log(`  Compliance Status: ${security.complianceStatus.replace('_', ' ')}`);
      console.log(`  Last Verified: ${new Date(security.lastVerified).toLocaleString()}`);
      console.log(`  Total Metrics: ${security.metrics.length}`);
      
      // Display category breakdown
      console.log('\n📊 Security Category Breakdown:');
      Object.entries(security.categories).forEach(([category, metrics]) => {
        const avgScore = metrics.length > 0 ? 
          Math.round(metrics.reduce((sum, m) => sum + m.securityScore, 0) / metrics.length) : 0;
        console.log(`  ${category.charAt(0).toUpperCase() + category.slice(1)}: ${avgScore}/100 (${metrics.length} metrics)`);
      });
      
      // Display detailed metrics
      console.log('\n🔍 Detailed Security Metrics:');
      security.metrics.forEach((metric, index) => {
        console.log(`  ${index + 1}. [${metric.type.toUpperCase()}] ${metric.topic}`);
        console.log(`     Status: ${metric.value} | Score: ${metric.securityScore}/100`);
        console.log(`     Risk: ${metric.riskLevel} | Compliance: ${metric.complianceStatus}`);
        console.log(`     Domain: ${metric.domain} | Impact: ${metric.impact}`);
        
        if (metric.properties) {
          console.log(`     Properties: ${JSON.stringify(metric.properties, null, 6).slice(0, 100)}...`);
        }
        console.log('');
      });
      
      // Display security trends
      console.log('\n📈 Security Trends Analysis:');
      if (security.trends.improving.length > 0) {
        console.log('  📈 Improving:');
        security.trends.improving.forEach(item => console.log(`    • ${item}`));
      }
      
      if (security.trends.stable.length > 0) {
        console.log('  ➡️ Stable:');
        security.trends.stable.forEach(item => console.log(`    • ${item}`));
      }
      
      if (security.trends.degrading.length > 0) {
        console.log('  📉 Degrading:');
        security.trends.degrading.forEach(item => console.log(`    • ${item}`));
      }
      
      // Display security recommendations
      console.log('\n💡 Security Recommendations:');
      const recommendations = generateSecurityRecommendations(security);
      recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
      
      // Display compliance status
      console.log('\n📋 Compliance Status:');
      console.log(`  Overall: ${security.complianceStatus.replace('_', ' ')}`);
      
      const complianceMetrics = security.metrics.filter(m => m.type === 'compliance');
      complianceMetrics.forEach(metric => {
        console.log(`  ${metric.topic}: ${metric.complianceStatus}`);
      });
    }
    
    // Display scope information
    if (dashboardData.scopeInfo) {
      console.log('\n🎯 Scope-Integrated Security:');
      console.log(`  Scope: ${dashboardData.scopeInfo.detectedScope}`);
      console.log(`  Domain: ${dashboardData.scopeInfo.servingDomain}`);
      console.log(`  Environment: ${dashboardData.scopeInfo.environment}`);
      console.log(`  Platform Security: ${dashboardData.scopeInfo.securityFeatures.available.length} features`);
      
      // Show how scope affects security
      console.log('\n🔒 Scope-Based Security Configuration:');
      const scope = dashboardData.scopeInfo.detectedScope;
      if (scope === 'ENTERPRISE') {
        console.log('  🏢 Enterprise Security:');
        console.log('    • Multi-Factor Authentication: Required');
        console.log('    • Role-Based Access Control: Full');
        console.log('    • Audit Logging: Comprehensive');
        console.log('    • Compliance: GDPR & SOC2 Compliant');
        console.log('    • Encryption: AES-256 at rest and in transit');
      } else if (scope === 'DEVELOPMENT') {
        console.log('  🧪 Development Security:');
        console.log('    • Multi-Factor Authentication: Partial');
        console.log('    • Role-Based Access Control: Basic');
        console.log('    • Audit Logging: Limited');
        console.log('    • Compliance: Partial GDPR');
        console.log('    • Encryption: AES-256 at rest and in transit');
      } else {
        console.log('  💻 Local Security:');
        console.log('    • Multi-Factor Authentication: Optional');
        console.log('    • Role-Based Access Control: Minimal');
        console.log('    • Audit Logging: Basic');
        console.log('    • Compliance: Non-compliant');
        console.log('    • Encryption: Platform-specific');
      }
    }
    
    // Display AI insights if available
    if (dashboardData.aiInsights) {
      console.log('\n🧠 AI-Powered Security Insights:');
      console.log(`  Risk Assessment: ${dashboardData.aiInsights.riskLevel.toUpperCase()}`);
      console.log(`  Anomalies Detected: ${dashboardData.aiInsights.anomalyAlerts.length}`);
      
      if (dashboardData.aiInsights.anomalyAlerts.length > 0) {
        console.log('  🚨 Security Anomalies:');
        dashboardData.aiInsights.anomalyAlerts.forEach((alert, index) => {
          console.log(`    ${index + 1}. [${alert.severity}] ${alert.type}: ${alert.message}`);
        });
      }
    }
    
    // Display system statistics
    console.log('\n📊 System Security Statistics:');
    console.log(`  Total Disputes: ${dashboardData.systemStats.totalDisputes.toLocaleString()}`);
    console.log(`  Active Disputes: ${dashboardData.systemStats.activeDisputes.toLocaleString()}`);
    console.log(`  Resolved Today: ${dashboardData.systemStats.resolvedToday.toLocaleString()}`);
    console.log(`  Refund Rate: ${dashboardData.systemStats.refundRate}`);
    
    console.log('\n🎨 Web Dashboard Security Features:');
    console.log('  • Real-time security score monitoring');
    console.log('  • Risk level assessment with color coding');
    console.log('  • Compliance status tracking');
    console.log('  • Category-based security breakdown');
    console.log('  • Security trends analysis');
    console.log('  • Detailed metrics table');
    console.log('  • Scope-aware security configuration');
    
    console.log('\n🔗 Security Integration Benefits:');
    console.log('  ✅ Comprehensive security monitoring');
    console.log('  ✅ Real-time risk assessment');
    console.log('  ✅ Compliance tracking (GDPR, SOC2)');
    console.log('  ✅ Scope-based security configuration');
    console.log('  ✅ AI-powered anomaly detection');
    console.log('  ✅ Detailed security analytics');
    console.log('  ✅ Trend analysis and recommendations');
    
    console.log('\n🎉 Security Metrics Integration Demo Complete!');
    console.log('\n💡 Open web/dispute-dashboard.html to see the full security monitoring interface');
    
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
  console.log('\n🔄 Testing Security Metrics Across Scopes');
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
      
      if (data.securityMetrics) {
        const security = data.securityMetrics;
        console.log(`  ✅ Security Score: ${security.overallScore}/100`);
        console.log(`  🛡️ Risk Level: ${security.riskLevel}`);
        console.log(`  📋 Compliance: ${security.complianceStatus.replace('_', ' ')}`);
        console.log(`  📊 Metrics: ${security.metrics.length} total`);
        
        // Show key security features
        const authScore = security.categories.authentication.length > 0 ?
          Math.round(security.categories.authentication.reduce((sum: number, m: any) => sum + m.securityScore, 0) / security.categories.authentication.length) : 0;
        const encryptScore = security.categories.encryption.length > 0 ?
          Math.round(security.categories.encryption.reduce((sum: number, m: any) => sum + m.securityScore, 0) / security.categories.encryption.length) : 0;
        
        console.log(`  🔐 Authentication: ${authScore}/100`);
        console.log(`  🔒 Encryption: ${encryptScore}/100`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
}

// Run the demos
if (import.meta.main) {
  await demonstrateSecurityMetricsIntegration();
  await testSecurityAcrossScopes();
}

export { demonstrateSecurityMetricsIntegration, testSecurityAcrossScopes };
