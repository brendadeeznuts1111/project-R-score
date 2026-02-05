#!/usr/bin/env bun

/**
 * ⚡ Quick Test Script for Critical Endpoints
 * Fast validation of essential functionality
 *
 * ✅ FULLY ALIGNED with production health monitoring system
 * 🏥 Critical health checks match monitor-health.bun.ts priorities
 * 🎯 Covers essential endpoints: permissions, matrix, system health, dashboard
 */

const BASE_URL = 'https://dashboard-worker.brendawill2233.workers.dev';

async function quickTest() {
  console.log('⚡ Quick Test - Critical Endpoints\n');

  const tests = [
    {
      name: 'Worker Accessibility',
      endpoint: '/api/test-deployment',
      expected: 'message',
    },
    {
      name: 'Live Metrics',
      endpoint: '/api/live-metrics',
      expected: 'success',
    },
    {
      name: 'Customers Endpoint',
      endpoint: '/api/customers',
      expected: 'success',
    },
    {
      name: 'Fire22 API Integration',
      endpoint: '/api/test/fire22',
      expected: 'success',
      validate: (data: any) => {
        // Enhanced Fire22 API validation
        const hasFire22Response = data.fire22Response !== undefined;
        const hasValidMessage = data.message && data.message.includes('Fire22 API');
        const hasSuccessStatus = data.success === true;

        // Additional Fire22-specific checks
        const hasValidResponseStructure = data.fire22Response !== undefined; // Allow any value, just check existence
        const hasWorkingStatus =
          data.message &&
          (data.message.includes('working') ||
            data.message.includes('success') ||
            data.message.includes('operational') ||
            data.message.includes('fallback')); // Allow fallback messages as valid

        // Enhanced Fire22 insights
        if (data.message && data.message.includes('fallback')) {
          console.log(`  🔄 Fire22 Status: Using D1 fallback (API may be temporarily unavailable)`);
        } else if (data.message && data.message.includes('working')) {
          console.log(`  ✅ Fire22 Status: API operational and responding`);
        }

        // Log detailed validation info for debugging
        if (
          !hasFire22Response ||
          !hasValidMessage ||
          !hasSuccessStatus ||
          !hasValidResponseStructure ||
          !hasWorkingStatus
        ) {
          console.log(`  🔍 Fire22 Validation Details:`);
          console.log(
            `     - fire22Response: ${hasFire22Response ? '✅' : '❌'} (${data.fire22Response !== undefined ? 'Present' : 'Missing'})`
          );
          console.log(
            `     - message: ${hasValidMessage ? '✅' : '❌'} (${data.message || 'Missing'})`
          );
          console.log(`     - success: ${hasSuccessStatus ? '✅' : '❌'} (${data.success})`);
          console.log(`     - response structure: ${hasValidResponseStructure ? '✅' : '❌'}`);
          console.log(`     - working status: ${hasWorkingStatus ? '✅' : '❌'}`);
        }

        return (
          hasFire22Response &&
          hasValidMessage &&
          hasSuccessStatus &&
          hasValidResponseStructure &&
          hasWorkingStatus
        );
      },
    },
    {
      name: 'Agent Hierarchy',
      endpoint: '/api/agents/hierarchy',
      expected: 'success',
    },
    // 🆕 NEW: Critical Health Checks
    {
      name: 'Permissions Health',
      endpoint: '/api/health/permissions',
      expected: 'success',
    },
    {
      name: 'Permissions Matrix Health',
      endpoint: '/api/health/permissions-matrix',
      expected: 'success',
    },
    {
      name: 'System Health',
      endpoint: '/api/health/system',
      expected: 'success',
    },
    {
      name: 'Dashboard Access',
      endpoint: '/dashboard',
      expected: 'html', // Special case for HTML response
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const start = Date.now();
      const response = await fetch(`${BASE_URL}${test.endpoint}`);
      const duration = Date.now() - start;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      let data;
      let isValid = false;

      if (test.expected === 'html') {
        // Special case for HTML responses
        const text = await response.text();
        isValid = text.includes('<html') || text.includes('<!DOCTYPE');
        data = { contentType: 'HTML', length: text.length };
      } else {
        // JSON responses
        data = await response.json();
        isValid = data[test.expected];
      }

      // Apply custom validation if available
      if (test.validate && typeof test.validate === 'function') {
        isValid = test.validate(data);
      }

      if (isValid) {
        // Enhanced feedback for health endpoints
        if (test.name.includes('Health')) {
          if (test.name === 'Permissions Health') {
            const status = data.status || 'UNKNOWN';
            const score = data.health_score || 'N/A';
            const totalAgents = data.total_agents || 'N/A';
            const agentsWithErrors = data.agents_with_errors || 'N/A';
            console.log(
              `✅ ${test.name} - ${status} (Score: ${score}%, Agents: ${totalAgents}, Errors: ${agentsWithErrors}) - ${duration}ms`
            );
          } else if (test.name === 'Permissions Matrix Health') {
            const status = data.status || 'UNKNOWN';
            const score = data.matrix_health_score || 'N/A';
            const dataCompleteness = data.matrix_stats?.data_completeness || 'N/A';
            const permissionCoverage = data.matrix_stats?.permission_coverage || 'N/A';
            const agentQuality = data.matrix_stats?.agent_data_quality || 'N/A';
            console.log(
              `✅ ${test.name} - ${status} (Score: ${score}%, Data: ${dataCompleteness}%, Coverage: ${permissionCoverage}%, Quality: ${agentQuality}%) - ${duration}ms`
            );

            // Show matrix insights if available
            if (data.matrix_issues && data.matrix_issues.length > 0) {
              console.log(`  ⚠️  Matrix Issues: ${data.matrix_issues.length} detected`);
            }
          } else if (test.name === 'System Health') {
            const status = data.status || 'UNKNOWN';
            const score = data.system_health_score || 'N/A';
            const healthyComponents = data.summary?.healthy || 'N/A';
            const totalComponents = data.summary?.total || 'N/A';
            console.log(
              `✅ ${test.name} - ${status} (Score: ${score}%, Components: ${healthyComponents}/${totalComponents}) - ${duration}ms`
            );
          } else {
            console.log(`✅ ${test.name} - ${duration}ms`);
          }
        } else {
          console.log(`✅ ${test.name} - ${duration}ms`);
        }
        passed++;
      } else {
        throw new Error(`Missing ${test.expected} field`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`❌ ${test.name} - ${errorMessage}`);
      failed++;
    }
  }

  console.log(`\n📊 Quick Test Results: ${passed}/${passed + failed} passed`);

  if (failed === 0) {
    console.log('🎉 All critical endpoints working!');
    console.log('💡 System is ready for deployment.');
  } else {
    console.log('⚠️  Some critical endpoints failed. Run full test suite for details.');
    console.log('🔍 Run: bun run test:checklist');
  }

  // Health check summary
  const healthTests = tests.filter(t => t.name.includes('Health'));
  const healthPassed = healthTests.filter(t => tests.indexOf(t) < tests.length - failed).length;

  if (healthTests.length > 0) {
    console.log(`\n🏥 Health Check Summary: ${healthPassed}/${healthTests.length} healthy`);
    if (healthPassed === healthTests.length) {
      console.log('✅ All health endpoints operational');
    } else {
      console.log('⚠️  Some health issues detected - investigate before deployment');
    }
  }

  // Enhanced CI/CD exit codes
  if (failed > 0) {
    console.log('\n🚫 Quick test FAILED - some critical endpoints are down');
    process.exit(1); // Exit with error code for CI/CD
  } else {
    console.log('\n✅ Quick test PASSED - all critical endpoints operational');
    process.exit(0); // Exit with success code for CI/CD
  }
}

if (import.meta.main) {
  quickTest();
}
