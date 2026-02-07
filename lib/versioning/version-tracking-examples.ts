// lib/versioning/version-tracking-examples.ts — Usage examples for version tracking

import VersionTracker, { UtilsCategory } from './version-tracking';

// ============================================================================
// BASIC USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: Basic Version Registration
 */
async function basicVersionRegistration() {
  const tracker = new VersionTracker({
    storagePath: './versions',
    maxVersionsPerComponent: 5,
    enableAuditLog: true,
  });

  // Register a new version for a component
  const versionId = await tracker.registerVersion('/api/users/v1', '1.2.3', {
    author: 'john.doe@company.com',
    description: 'Added user profile endpoints',
    dependencies: {
      database: '2.1.0',
      'auth-service': '1.5.2',
    },
    environment: 'production',
    tags: ['feature', 'user-management', 'api'],
  });

  console.log(`Version registered with ID: ${versionId}`);

  // Get current version
  const currentVersion = tracker.getCurrentVersion('/api/users/v1');
  console.log('Current version:', currentVersion);

  // Get version history
  const history = tracker.getVersionHistory('/api/users/v1');
  console.log('Version history:', history);
}

/**
 * Example 2: Manual Rollback
 */
async function manualRollbackExample() {
  const tracker = new VersionTracker();

  // First, register multiple versions
  await tracker.registerVersion('/api/orders/v1', '2.0.0', {
    author: 'jane.smith@company.com',
    description: 'Major refactor with breaking changes',
    dependencies: { 'payment-service': '3.0.0' },
    environment: 'production',
    tags: ['major', 'breaking-change'],
  });

  await tracker.registerVersion('/api/orders/v1', '2.0.1', {
    author: 'jane.smith@company.com',
    description: 'Bug fixes for v2.0.0',
    dependencies: { 'payment-service': '3.0.1' },
    environment: 'production',
    tags: ['patch', 'bugfix'],
  });

  // Now rollback to previous version
  const rollbackResult = await tracker.rollbackToVersion(
    '/api/orders/v1',
    '2.0.0',
    'Critical bug discovered in v2.0.1 affecting payment processing',
    'ops-team@company.com',
    'manual'
  );

  console.log('Rollback result:', rollbackResult);
}

/**
 * Example 3: Endpoint Management
 */
async function endpointManagementExample() {
  const tracker = new VersionTracker({
    rollbackPolicy: {
      enabled: true,
      maxRollbackVersions: 3,
      autoRollbackOnError: true,
      healthCheckThreshold: 5.0,
      rollbackTimeout: 300,
      requireApproval: false,
    },
  });

  // Register component versions
  await tracker.registerVersion('/components/user-service', '1.5.0', {
    author: 'dev-team@company.com',
    description: 'User service with enhanced caching',
    dependencies: { redis: '6.2.0' },
    environment: 'production',
    tags: ['performance', 'caching'],
  });

  // Register endpoint that uses the component
  await tracker.registerEndpoint('/api/users/profile', '/components/user-service', {
    autoRollbackOnError: true,
    healthCheckThreshold: 3.0,
  });

  // Rollback the entire endpoint
  const endpointRollback = await tracker.rollbackEndpoint(
    '/api/users/profile',
    '1.4.0',
    'Performance degradation detected',
    'auto-scaler@company.com'
  );

  console.log('Endpoint rollback result:', endpointRollback);
}

// ============================================================================
// ADVANCED USAGE EXAMPLES
// ============================================================================

/**
 * Example 4: Health Monitoring & Auto-Rollback
 */
async function healthMonitoringExample() {
  const tracker = new VersionTracker({
    enableHealthChecks: true,
    rollbackPolicy: {
      enabled: true,
      autoRollbackOnError: true,
      healthCheckThreshold: 10.0, // 10% error rate threshold
      rollbackTimeout: 180,
    },
  });

  // Register a version
  await tracker.registerVersion('/api/payment/v2', '2.1.0', {
    author: 'payment-team@company.com',
    description: 'New payment gateway integration',
    dependencies: { 'stripe-sdk': '12.0.0' },
    environment: 'production',
    tags: ['payment', 'gateway'],
  });

  // Simulate health degradation
  console.log('Simulating health issues...');

  // Update health metrics (this would typically come from monitoring systems)
  await tracker.updateHealthMetrics('/api/payment/v2', {
    healthStatus: 'degraded',
    errorRate: 15.5, // Above threshold of 10%
    uptimePercentage: 84.5,
  });

  // The system should automatically trigger a rollback
  // You can check the rollback history
  const rollbackReport = tracker.generateRollbackReport('/api/payment/v2');
  console.log('Rollback report:', rollbackReport);
}

/**
 * Example 5: Audit & Compliance
 */
async function auditExample() {
  const tracker = new VersionTracker({
    enableAuditLog: true,
    storagePath: './secure-versions',
  });

  // Perform various operations
  await tracker.registerVersion('/api/secure/data', '3.2.1', {
    author: 'security-team@company.com',
    description: 'Security patches applied',
    dependencies: { 'encryption-lib': '5.1.0' },
    environment: 'production',
    tags: ['security', 'patch'],
  });

  await tracker.rollbackToVersion(
    '/api/secure/data',
    '3.2.0',
    'Security vulnerability detected in v3.2.1',
    'security-lead@company.com',
    'emergency'
  );

  // Get audit log for compliance
  const auditLog = tracker.getAuditLog({
    componentUri: '/api/secure/data',
    action: 'rollback',
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
  });

  console.log('Audit log for security component:', auditLog);

  // Generate compliance report
  const complianceReport = {
    totalChanges: auditLog.length,
    emergencyRollbacks: auditLog.filter(entry => entry.details.includes('emergency')).length,
    lastChange: auditLog[0]?.timestamp,
    components: auditLog.map(entry => entry.componentUri),
  };

  console.log('Compliance report:', complianceReport);
}

/**
 * Example 6: Multi-Component Deployment
 */
async function multiComponentDeploymentExample() {
  const tracker = new VersionTracker({
    maxVersionsPerComponent: 8,
    rollbackPolicy: {
      enabled: true,
      requireApproval: true,
      approvedBy: ['dev-lead@company.com', 'ops-lead@company.com'],
    },
  });

  // Define a microservices deployment
  const deployment = [
    {
      component: '/components/auth-service',
      version: '2.4.0',
      metadata: {
        author: 'auth-team@company.com',
        description: 'OAuth 2.1 support added',
        dependencies: { 'jwt-lib': '9.0.0' },
        environment: 'production' as const,
        tags: ['auth', 'oauth', 'security'],
      },
    },
    {
      component: '/components/user-service',
      version: '3.1.0',
      metadata: {
        author: 'user-team@company.com',
        description: 'Enhanced user profile management',
        dependencies: { database: '14.2.0' },
        environment: 'production' as const,
        tags: ['users', 'profile', 'database'],
      },
    },
    {
      component: '/components/notification-service',
      version: '1.8.0',
      metadata: {
        author: 'notification-team@company.com',
        description: 'Real-time notifications with WebSockets',
        dependencies: { 'websocket-lib': '2.1.0' },
        environment: 'production' as const,
        tags: ['notifications', 'websocket', 'realtime'],
      },
    },
  ];

  // Deploy all components
  const deploymentResults = [];
  for (const { component, version, metadata } of deployment) {
    try {
      const versionId = await tracker.registerVersion(component, version, metadata);
      deploymentResults.push({ component, version, success: true, versionId });
    } catch (error) {
      deploymentResults.push({
        component,
        version,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  console.log('Deployment results:', deploymentResults);

  // If any deployment failed, rollback all components
  const failedDeployments = deploymentResults.filter(r => !r.success);
  if (failedDeployments.length > 0) {
    console.log('Deployment failures detected, initiating rollback...');

    for (const { component } of deployment) {
      const history = tracker.getVersionHistory(component);
      if (history.length > 1) {
        const previousVersion = history[1].version;
        await tracker.rollbackToVersion(
          component,
          previousVersion,
          'Deployment failure - rolling back all components',
          'deployment-system@company.com',
          'automatic'
        );
      }
    }
  }
}

// ============================================================================
// MONITORING & ALERTING EXAMPLES
// ============================================================================

/**
 * Example 7: Real-time Monitoring Dashboard
 */
class MonitoringDashboard {
  private tracker: VersionTracker;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(tracker: VersionTracker) {
    this.tracker = tracker;
  }

  startMonitoring(intervalMs: number = 30000) {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, intervalMs);
  }

  stopMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private async performHealthChecks() {
    const healthStatus = this.tracker.getHealthStatus();

    for (const [component, status] of Object.entries(healthStatus)) {
      // Simulate health check (in real implementation, this would ping the service)
      const mockHealthCheck = Math.random() > 0.1; // 90% chance of healthy
      const mockErrorRate = mockHealthCheck ? Math.random() * 2 : Math.random() * 15 + 5;
      const mockUptime = mockHealthCheck ? 95 + Math.random() * 5 : 70 + Math.random() * 20;

      await this.tracker.updateHealthMetrics(component, {
        healthStatus: mockHealthCheck ? 'healthy' : 'degraded',
        errorRate: mockErrorRate,
        uptimePercentage: mockUptime,
      });

      // Alert if health is poor
      if (!mockHealthCheck || mockErrorRate > 10) {
        this.sendAlert(component, status, mockErrorRate);
      }
    }
  }

  private sendAlert(component: string, status: any, errorRate: number) {
    console.log(`🚨 ALERT: Component ${component} is unhealthy!`);
    console.log(`   Error rate: ${errorRate.toFixed(2)}%`);
    console.log(`   Health status: ${status.healthStatus}`);
    console.log(`   Uptime: ${status.uptimePercentage.toFixed(2)}%`);

    // In real implementation, this would send to Slack, PagerDuty, etc.
  }

  getDashboardData() {
    const healthStatus = this.tracker.getHealthStatus();
    const rollbackReport = this.tracker.generateRollbackReport();

    return {
      timestamp: new Date().toISOString(),
      components: Object.entries(healthStatus).map(([uri, status]) => ({
        uri,
        ...status,
        status: status.errorRate > 5 ? 'critical' : status.errorRate > 2 ? 'warning' : 'healthy',
      })),
      rollbackStats: rollbackReport,
      totalComponents: Object.keys(healthStatus).length,
      healthyComponents: Object.values(healthStatus).filter(s => s.healthStatus === 'healthy')
        .length,
    };
  }
}

/**
 * Example 8: Using the Monitoring Dashboard
 */
async function monitoringDashboardExample() {
  const tracker = new VersionTracker({
    enableHealthChecks: true,
    rollbackPolicy: {
      enabled: true,
      autoRollbackOnError: true,
      healthCheckThreshold: 8.0,
    },
  });

  // Set up some test components
  await tracker.registerVersion('/api/dashboard/v1', '1.0.0', {
    author: 'frontend-team@company.com',
    description: 'Dashboard API with real-time updates',
    dependencies: { 'websocket-lib': '2.0.0' },
    environment: 'production',
    tags: ['dashboard', 'api', 'realtime'],
  });

  await tracker.registerVersion('/api/analytics/v1', '2.3.0', {
    author: 'data-team@company.com',
    description: 'Enhanced analytics with machine learning',
    dependencies: { 'ml-lib': '1.5.0' },
    environment: 'production',
    tags: ['analytics', 'ml', 'data'],
  });

  // Start monitoring
  const dashboard = new MonitoringDashboard(tracker);
  dashboard.startMonitoring(5000); // Check every 5 seconds

  // Let it run for a bit
  setTimeout(() => {
    const dashboardData = dashboard.getDashboardData();
    console.log('Dashboard Data:', JSON.stringify(dashboardData, null, 2));

    dashboard.stopMonitoring();
  }, 20000); // Run for 20 seconds
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate comprehensive system report
 */
async function generateSystemReport(tracker: VersionTracker) {
  const healthStatus = tracker.getHealthStatus();
  const rollbackReport = tracker.generateRollbackReport();
  const auditLog = tracker.getAuditLog({
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
  });

  return {
    timestamp: new Date().toISOString(),
    summary: {
      totalComponents: Object.keys(healthStatus).length,
      healthyComponents: Object.values(healthStatus).filter(s => s.healthStatus === 'healthy')
        .length,
      degradedComponents: Object.values(healthStatus).filter(s => s.healthStatus === 'degraded')
        .length,
      failedComponents: Object.values(healthStatus).filter(s => s.healthStatus === 'failed').length,
    },
    healthStatus,
    rollbackMetrics: {
      totalRollbacks: rollbackReport.totalRollbacks,
      successRate: rollbackReport.successRate,
      averageRollbackTime: rollbackReport.averageRollbackTime,
      recentRollbacks: rollbackReport.recentRollbacks.slice(0, 5),
    },
    recentActivity: auditLog.slice(0, 10),
    recommendations: generateRecommendations(healthStatus, rollbackReport),
  };
}

function generateRecommendations(healthStatus: any, rollbackReport: any): string[] {
  const recommendations: string[] = [];

  // Health-based recommendations
  const failedComponents = Object.entries(healthStatus).filter(
    ([, status]: [string, any]) => status.healthStatus === 'failed'
  );

  if (failedComponents.length > 0) {
    recommendations.push(
      `${failedComponents.length} component(s) have failed. Consider immediate rollback or investigation.`
    );
  }

  // Rollback-based recommendations
  if (rollbackReport.successRate < 90) {
    recommendations.push(
      'Rollback success rate is below 90%. Review rollback procedures and testing.'
    );
  }

  if (rollbackReport.averageRollbackTime > 30000) {
    recommendations.push('Average rollback time exceeds 30 seconds. Optimize rollback procedures.');
  }

  // Error rate recommendations
  const highErrorComponents = Object.entries(healthStatus).filter(
    ([, status]: [string, any]) => status.errorRate > 5
  );

  if (highErrorComponents.length > 0) {
    recommendations.push(
      `${highErrorComponents.length} component(s) have high error rates (>5%). Consider investigation.`
    );
  }

  return recommendations;
}

// ============================================================================
// EXPORT EXAMPLES
// ============================================================================

export {
  basicVersionRegistration,
  manualRollbackExample,
  endpointManagementExample,
  healthMonitoringExample,
  auditExample,
  multiComponentDeploymentExample,
  monitoringDashboardExample,
  generateSystemReport,
  MonitoringDashboard,
};

// Run examples if this file is executed directly
if (import.meta.main) {
  console.log('🚀 Running Version Tracking Examples...\n');

  // Run basic example
  basicVersionRegistration()
    .then(() => {
      console.log('\n✅ Basic example completed');
    })
    .catch(console.error);
}
