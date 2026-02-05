#!/usr/bin/env bun

/**
 * 🏥 Automated Health Monitoring Script
 * Daily performance checks and alerting for dashboard worker
 */

interface HealthCheck {
  name: string;
  endpoint: string;
  expectedStatus: number;
  expectedField?: string;
  timeout?: number;
}

interface HealthResult {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  responseTime: number;
  statusCode: number;
  details: string;
  timestamp: string;
}

class HealthMonitor {
  private baseUrl = 'https://dashboard-worker.brendawill2233.workers.dev';
  private results: HealthResult[] = [];
  private startTime = Date.now();

  // Critical health checks
  private healthChecks: HealthCheck[] = [
    {
      name: 'Worker Accessibility',
      endpoint: '/api/test-deployment',
      expectedStatus: 200,
      expectedField: 'message',
      timeout: 5000,
    },
    {
      name: 'Live Metrics',
      endpoint: '/api/live-metrics',
      expectedStatus: 200,
      expectedField: 'success',
      timeout: 3000,
    },
    {
      name: 'Database Connection',
      endpoint: '/api/customers',
      expectedStatus: 200,
      expectedField: 'success',
      timeout: 5000,
    },
    {
      name: 'Fire22 Integration',
      endpoint: '/api/test/fire22',
      expectedStatus: 200,
      expectedField: 'success',
      timeout: 10000,
    },
    {
      name: 'Authentication System',
      endpoint: '/api/auth/login',
      expectedStatus: 401, // Should reject invalid credentials
      timeout: 3000,
    },
    // 🆕 NEW: Dashboard Permissions Matrix Health Checks
    {
      name: 'Agent Configs API',
      endpoint: '/api/admin/agent-configs-dashboard',
      expectedStatus: 200,
      expectedField: 'success',
      timeout: 5000,
    },
    {
      name: 'Dashboard Accessibility',
      endpoint: '/dashboard',
      expectedStatus: 200,
      timeout: 5000,
    },
    {
      name: 'Permissions Matrix Data',
      endpoint: '/api/admin/agent-configs-dashboard',
      expectedStatus: 200,
      expectedField: 'data.agents',
      timeout: 5000,
    },
    // 🆕 NEW: Advanced Permissions Health Checks
    {
      name: 'Permissions System Health',
      endpoint: '/api/health/permissions',
      expectedStatus: 200,
      expectedField: 'health_score',
      timeout: 8000,
    },
    {
      name: 'Permissions Matrix Health',
      endpoint: '/api/health/permissions-matrix',
      expectedStatus: 200,
      expectedField: 'matrix_health_score',
      timeout: 8000,
    },
    {
      name: 'Overall System Health',
      endpoint: '/api/health/system',
      expectedStatus: 200,
      expectedField: 'system_health_score',
      timeout: 10000,
    },
  ];

  async runHealthChecks(): Promise<void> {
    console.log('🏥 Starting Automated Health Checks...\n');
    console.log(`⏰ ${new Date().toISOString()}\n`);

    for (const check of this.healthChecks) {
      const result = await this.performHealthCheck(check);
      this.results.push(result);

      // Display result immediately
      const statusIcon =
        result.status === 'healthy' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      console.log(`${statusIcon} ${result.name}: ${result.details} (${result.responseTime}ms)`);
    }

    this.generateHealthReport();
  }

  private async performHealthCheck(check: HealthCheck): Promise<HealthResult> {
    const startTime = Date.now();
    const result: HealthResult = {
      name: check.name,
      status: 'healthy',
      responseTime: 0,
      statusCode: 0,
      details: '',
      timestamp: new Date().toISOString(),
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), check.timeout || 5000);

      const response = await fetch(`${this.baseUrl}${check.endpoint}`, {
        method: check.endpoint === '/api/auth/login' ? 'POST' : 'GET',
        headers: check.endpoint === '/api/auth/login' ? { 'Content-Type': 'application/json' } : {},
        body:
          check.endpoint === '/api/auth/login'
            ? JSON.stringify({ username: 'admin', password: 'wrong' })
            : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      result.responseTime = Date.now() - startTime;
      result.statusCode = response.status;

      if (response.status === check.expectedStatus) {
        if (check.expectedField) {
          const data = await response.json();

          // Enhanced validation for nested fields (e.g., 'data.agents')
          if (check.expectedField.includes('.')) {
            const fieldParts = check.expectedField.split('.');
            let fieldValue = data;
            let fieldExists = true;

            for (const part of fieldParts) {
              if (fieldValue && typeof fieldValue === 'object' && fieldValue[part] !== undefined) {
                fieldValue = fieldValue[part];
              } else {
                fieldExists = false;
                break;
              }
            }

            if (fieldExists) {
              // Special validation for permissions matrix data
              if (check.name === 'Permissions Matrix Data' && Array.isArray(fieldValue)) {
                const validationResult = this.validatePermissionsMatrixData(fieldValue);
                if (validationResult.isValid) {
                  result.status = 'healthy';
                  result.details = `Status ${response.status}, Valid permissions data (${fieldValue.length} agents), Response time ${result.responseTime}ms`;
                } else {
                  result.status = 'warning';
                  result.details = `Status ${response.status} but data validation failed: ${validationResult.error}`;
                }
              } else {
                result.status = 'healthy';
                result.details = `Status ${response.status}, Response time ${result.responseTime}ms`;
              }
            } else {
              result.status = 'warning';
              result.details = `Status ${response.status} but missing expected nested field '${check.expectedField}'`;
            }
          } else {
            // Simple field validation
            if (data[check.expectedField] !== undefined) {
              result.status = 'healthy';
              result.details = `Status ${response.status}, Response time ${result.responseTime}ms`;
            } else {
              result.status = 'warning';
              result.details = `Status ${response.status} but missing expected field '${check.expectedField}'`;
            }
          }
        } else {
          result.status = 'healthy';
          result.details = `Status ${response.status}, Response time ${result.responseTime}ms`;
        }
      } else {
        result.status = 'critical';
        result.details = `Expected status ${check.expectedStatus}, got ${response.status}`;
      }

      // Performance warnings
      if (result.responseTime > 5000) {
        result.status = result.status === 'healthy' ? 'warning' : result.status;
        result.details += ' (SLOW RESPONSE)';
      }
    } catch (error) {
      result.responseTime = Date.now() - startTime;
      result.status = 'critical';

      if (error.name === 'AbortError') {
        result.details = `Timeout after ${check.timeout}ms`;
      } else {
        result.details = `Error: ${error.message}`;
      }
    }

    return result;
  }

  private generateHealthReport(): void {
    const totalTime = Date.now() - this.startTime;
    const healthy = this.results.filter(r => r.status === 'healthy').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    const critical = this.results.filter(r => r.status === 'critical').length;
    const total = this.results.length;

    console.log('\n' + '='.repeat(60));
    console.log('📊 HEALTH CHECK REPORT');
    console.log('='.repeat(60));
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    console.log(`⏱️  Total Time: ${totalTime}ms`);
    console.log(`🏥 Total Checks: ${total}`);
    console.log(`✅ Healthy: ${healthy}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`❌ Critical: ${critical}`);
    console.log(`📈 Health Score: ${Math.round((healthy / total) * 100)}%`);

    // Show warnings and critical issues
    if (warnings > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.results
        .filter(r => r.status === 'warning')
        .forEach(result => {
          console.log(`   - ${result.name}: ${result.details}`);
        });
    }

    if (critical > 0) {
      console.log('\n❌ CRITICAL ISSUES:');
      this.results
        .filter(r => r.status === 'critical')
        .forEach(result => {
          console.log(`   - ${result.name}: ${result.details}`);
        });
    }

    // Overall status
    if (critical === 0 && warnings === 0) {
      console.log('\n🎉 All systems healthy! Dashboard worker is performing optimally.');
    } else if (critical === 0) {
      console.log('\n⚠️  System has warnings but no critical issues. Monitor closely.');
    } else {
      console.log('\n🚨 CRITICAL ISSUES DETECTED! Immediate attention required.');
    }

    // Performance insights
    const avgResponseTime = this.results.reduce((sum, r) => sum + r.responseTime, 0) / total;
    console.log(`\n📊 Performance Insights:`);
    console.log(`   Average Response Time: ${Math.round(avgResponseTime)}ms`);
    console.log(`   Fastest Response: ${Math.min(...this.results.map(r => r.responseTime))}ms`);
    console.log(`   Slowest Response: ${Math.max(...this.results.map(r => r.responseTime))}ms`);

    // 🆕 NEW: Dashboard-specific insights
    const dashboardChecks = this.results.filter(
      r =>
        r.name.includes('Dashboard') ||
        r.name.includes('Permissions') ||
        r.name.includes('Agent Configs')
    );

    if (dashboardChecks.length > 0) {
      console.log(`\n🎯 Dashboard Health Insights:`);
      const dashboardHealthy = dashboardChecks.filter(r => r.status === 'healthy').length;
      const dashboardTotal = dashboardChecks.length;
      console.log(
        `   Dashboard Health Score: ${Math.round((dashboardHealthy / dashboardTotal) * 100)}%`
      );

      if (dashboardHealthy === dashboardTotal) {
        console.log(`   ✅ Permissions Matrix: All systems operational`);
        console.log(`   ✅ Agent Configs API: Functioning correctly`);
        console.log(`   ✅ Dashboard Access: Available and responsive`);
      } else {
        console.log(
          `   ⚠️  Dashboard Issues: ${dashboardTotal - dashboardHealthy} problems detected`
        );
        dashboardChecks
          .filter(r => r.status !== 'healthy')
          .forEach(check => {
            console.log(`      - ${check.name}: ${check.details}`);
          });
      }
    }

    // Recommendations
    if (avgResponseTime > 3000) {
      console.log(
        '\n💡 Recommendation: Consider optimizing response times. Current average is above 3 seconds.'
      );
    }

    if (critical > 0) {
      console.log('\n🚨 IMMEDIATE ACTIONS REQUIRED:');
      console.log('   1. Investigate critical failures');
      console.log('   2. Check worker logs: wrangler tail --format=pretty');
      console.log('   3. Verify database connectivity');
      console.log('   4. Check Fire22 API status');
    }

    // 🆕 NEW: Dashboard-specific recommendations
    const dashboardIssues = this.results.filter(
      r =>
        (r.name.includes('Dashboard') ||
          r.name.includes('Permissions') ||
          r.name.includes('Agent Configs')) &&
        r.status !== 'healthy'
    );

    if (dashboardIssues.length > 0) {
      console.log('\n🎯 DASHBOARD ISSUE RECOMMENDATIONS:');
      console.log('   1. Check agent_configs table in D1 database');
      console.log('   2. Verify permissions matrix data structure');
      console.log(
        '   3. Test dashboard manually: https://dashboard-worker.brendawill2233.workers.dev/dashboard'
      );
      console.log('   4. Check browser console for JavaScript errors');
      console.log('   5. Verify API response format matches frontend expectations');

      if (dashboardIssues.some(r => r.name.includes('Permissions Matrix'))) {
        console.log('   6. 🔍 PERMISSIONS MATRIX SPECIFIC:');
        console.log('      - Verify agent_configs table has correct structure');
        console.log('      - Check that permissions are properly nested');
        console.log('      - Ensure commissionRates and status objects exist');
      }
    }
  }

  // Export results for external monitoring
  exportResults(): HealthResult[] {
    return this.results;
  }

  // 🆕 NEW: Validate permissions matrix data structure
  private validatePermissionsMatrixData(agents: any[]): { isValid: boolean; error?: string } {
    if (!Array.isArray(agents) || agents.length === 0) {
      return { isValid: false, error: 'No agents data found' };
    }

    // Check first agent for required structure
    const firstAgent = agents[0];

    // Required fields for permissions matrix
    const requiredFields = ['agent_id', 'permissions', 'commissionRates', 'status'];
    for (const field of requiredFields) {
      if (!(field in firstAgent)) {
        return { isValid: false, error: `Missing required field: ${field}` };
      }
    }

    // Validate permissions object structure
    if (!firstAgent.permissions || typeof firstAgent.permissions !== 'object') {
      return { isValid: false, error: 'Invalid permissions object structure' };
    }

    // Check for at least one permission key
    const permissionKeys = Object.keys(firstAgent.permissions);
    if (permissionKeys.length === 0) {
      return { isValid: false, error: 'No permission keys found' };
    }

    // Validate commission rates structure
    if (!firstAgent.commissionRates || typeof firstAgent.commissionRates !== 'object') {
      return { isValid: false, error: 'Invalid commissionRates object structure' };
    }

    // Validate status object structure
    if (!firstAgent.status || typeof firstAgent.status !== 'object') {
      return { isValid: false, error: 'Invalid status object structure' };
    }

    // Check that all agents have consistent structure
    for (let i = 1; i < Math.min(agents.length, 3); i++) {
      // Check first 3 agents
      const agent = agents[i];
      if (!agent.agent_id || !agent.permissions || !agent.commissionRates || !agent.status) {
        return { isValid: false, error: `Agent ${i} missing required fields` };
      }
    }

    return { isValid: true };
  }
}

// Main execution
async function main() {
  const monitor = new HealthMonitor();

  try {
    await monitor.runHealthChecks();

    // Exit with appropriate code for CI/CD systems
    const hasCritical = monitor.exportResults().some(r => r.status === 'critical');
    const hasWarnings = monitor.exportResults().some(r => r.status === 'warning');

    if (hasCritical) {
      process.exit(2); // Critical issues
    } else if (hasWarnings) {
      process.exit(1); // Warnings only
    } else {
      process.exit(0); // All healthy
    }
  } catch (error) {
    console.error('❌ Health monitoring failed:', error);
    process.exit(3); // Monitoring failure
  }
}

if (import.meta.main) {
  main();
}
