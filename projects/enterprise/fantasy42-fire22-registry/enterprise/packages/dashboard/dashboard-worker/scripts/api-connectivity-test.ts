#!/usr/bin/env bun
/**
 * 🔗 Fire22 API Connectivity Test
 *
 * Comprehensive testing of all system endpoints and data flows
 * Ensures full connectivity between portals and services
 */

import { $ } from 'bun';

interface EndpointTest {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  expectedStatus: number;
  timeout: number;
  description: string;
}

interface ConnectivityResult {
  endpoint: string;
  status: 'success' | 'failed' | 'timeout';
  responseTime: number;
  statusCode?: number;
  error?: string;
}

class APIConnectivityTester {
  private baseUrl = 'http://localhost:8787'; // Cloudflare Worker default
  private results: ConnectivityResult[] = [];

  private endpoints: EndpointTest[] = [
    // Agent Management Endpoints
    {
      name: 'Agent Management',
      url: '/api/agents',
      method: 'GET',
      expectedStatus: 200,
      timeout: 5000,
      description: 'Retrieve all agents with hierarchy and performance data',
    },
    {
      name: 'Agent Performance',
      url: '/api/agents/performance',
      method: 'GET',
      expectedStatus: 200,
      timeout: 3000,
      description: 'Get agent performance metrics and analytics',
    },

    // Betting System Endpoints
    {
      name: 'Bet Ticker',
      url: '/api/betting/ticker',
      method: 'GET',
      expectedStatus: 200,
      timeout: 2000,
      description: 'Real-time betting activity feed',
    },
    {
      name: 'Ticketwriter',
      url: '/api/lines/place-bets',
      method: 'GET',
      expectedStatus: 200,
      timeout: 3000,
      description: 'Bet placement interface with market lines',
    },
    {
      name: 'Sportsbook Lines',
      url: '/api/lines/sportsbook',
      method: 'GET',
      expectedStatus: 200,
      timeout: 3000,
      description: 'Live odds and line management',
    },

    // Customer Management
    {
      name: 'Customer List',
      url: '/api/customers',
      method: 'GET',
      expectedStatus: 200,
      timeout: 5000,
      description: 'Active customer accounts (4,320 expected)',
    },

    // System Health
    {
      name: 'System Health',
      url: '/api/health',
      method: 'GET',
      expectedStatus: 200,
      timeout: 1000,
      description: 'Overall system health and status',
    },
    {
      name: 'Database Health',
      url: '/api/health/database',
      method: 'GET',
      expectedStatus: 200,
      timeout: 2000,
      description: 'Database connectivity and performance',
    },
  ];

  async runConnectivityTest(): Promise<void> {
    console.log('🔗 FIRE22 API CONNECTIVITY TEST');
    console.log('!==!==!==!==!==!==!==');
    console.log(`Testing ${this.endpoints.length} endpoints...\n`);

    for (const endpoint of this.endpoints) {
      await this.testEndpoint(endpoint);
    }

    this.displayResults();
    this.generateReport();
  }

  private async testEndpoint(endpoint: EndpointTest): Promise<void> {
    const startTime = Date.now();
    const fullUrl = `${this.baseUrl}${endpoint.url}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout);

      const response = await fetch(fullUrl, {
        method: endpoint.method,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Fire22-API-Tester/1.0',
        },
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      const result: ConnectivityResult = {
        endpoint: endpoint.name,
        status: response.status === endpoint.expectedStatus ? 'success' : 'failed',
        responseTime,
        statusCode: response.status,
      };

      this.results.push(result);

      const statusIcon = response.status === endpoint.expectedStatus ? '✅' : '❌';
      console.log(`${statusIcon} ${endpoint.name}: ${response.status} (${responseTime}ms)`);

      if (response.status !== endpoint.expectedStatus) {
        console.log(`   Expected: ${endpoint.expectedStatus}, Got: ${response.status}`);
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const result: ConnectivityResult = {
        endpoint: endpoint.name,
        status: error.name === 'AbortError' ? 'timeout' : 'failed',
        responseTime,
        error: error.message,
      };

      this.results.push(result);

      const statusIcon = error.name === 'AbortError' ? '⏰' : '❌';
      console.log(
        `${statusIcon} ${endpoint.name}: ${error.name === 'AbortError' ? 'TIMEOUT' : 'ERROR'} (${responseTime}ms)`
      );
      console.log(`   Error: ${error.message}`);
    }
  }

  private displayResults(): void {
    console.log('\n📊 CONNECTIVITY TEST RESULTS');
    console.log('!==!==!==!==!====');

    const successful = this.results.filter(r => r.status === 'success').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const timeouts = this.results.filter(r => r.status === 'timeout').length;

    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏰ Timeouts: ${timeouts}`);
    console.log(`📈 Success Rate: ${((successful / this.results.length) * 100).toFixed(1)}%`);

    const avgResponseTime =
      this.results.reduce((sum, r) => sum + r.responseTime, 0) / this.results.length;
    console.log(`⚡ Average Response Time: ${avgResponseTime.toFixed(0)}ms`);

    // Show failed endpoints
    const failedEndpoints = this.results.filter(r => r.status !== 'success');
    if (failedEndpoints.length > 0) {
      console.log('\n❌ FAILED ENDPOINTS:');
      failedEndpoints.forEach(endpoint => {
        console.log(`   ${endpoint.endpoint}: ${endpoint.status.toUpperCase()}`);
        if (endpoint.error) console.log(`     Error: ${endpoint.error}`);
      });
    }
  }

  private generateReport(): void {
    const timestamp = new Date().toISOString();
    const reportPath = `reports/connectivity-test-${timestamp.slice(0, 10)}.json`;

    const report = {
      timestamp,
      summary: {
        totalEndpoints: this.results.length,
        successful: this.results.filter(r => r.status === 'success').length,
        failed: this.results.filter(r => r.status === 'failed').length,
        timeouts: this.results.filter(r => r.status === 'timeout').length,
        averageResponseTime:
          this.results.reduce((sum, r) => sum + r.responseTime, 0) / this.results.length,
      },
      results: this.results,
      recommendations: this.generateRecommendations(),
    };

    // Ensure reports directory exists
    const fs = require('fs');
    if (!fs.existsSync('reports')) {
      fs.mkdirSync('reports');
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved: ${reportPath}`);

    // Display recommendations
    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.recommendations.forEach(rec => console.log(`   ${rec}`));
    }
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const failedCount = this.results.filter(r => r.status !== 'success').length;
    const avgResponseTime =
      this.results.reduce((sum, r) => sum + r.responseTime, 0) / this.results.length;

    if (failedCount > 0) {
      recommendations.push(`Fix ${failedCount} failed endpoints`);
    }

    if (avgResponseTime > 1000) {
      recommendations.push('Optimize API response times (currently > 1s average)');
    }

    if (this.results.some(r => r.status === 'timeout')) {
      recommendations.push('Reduce timeout issues with caching or optimization');
    }

    // Check for critical endpoints
    const criticalEndpoints = ['Agent Management', 'Bet Ticker', 'Customer List'];
    const criticalFailed = this.results.filter(
      r => criticalEndpoints.includes(r.endpoint) && r.status !== 'success'
    );

    if (criticalFailed.length > 0) {
      recommendations.push(`URGENT: Fix ${criticalFailed.length} critical endpoint(s)`);
    }

    return recommendations;
  }

  async testDataConsistency(): Promise<void> {
    console.log('\n🔍 DATA CONSISTENCY CHECK');
    console.log('!==!==!==!==!==');

    try {
      // Test agent count consistency
      const agentResponse = await fetch(`${this.baseUrl}/api/agents`);
      if (agentResponse.ok) {
        const agentData = await agentResponse.json();
        console.log(`✅ Agent count: ${agentData.length || 'N/A'}`);
      }

      // Test customer count consistency
      const customerResponse = await fetch(`${this.baseUrl}/api/customers`);
      if (customerResponse.ok) {
        const customerData = await customerResponse.json();
        const activeCount = customerData.filter((c: any) => c.active).length;
        console.log(`✅ Active customers: ${activeCount}`);

        if (activeCount !== 4320) {
          console.log(`⚠️  Expected 4,320 active customers, got ${activeCount}`);
        }
      }
    } catch (error) {
      console.log(`❌ Data consistency check failed: ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  const tester = new APIConnectivityTester();

  console.log('🚀 Starting Fire22 API Connectivity Test...\n');

  await tester.runConnectivityTest();
  await tester.testDataConsistency();

  console.log('\n🎯 Connectivity test completed!');
  console.log('Check reports/ directory for detailed results.');
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}

export { APIConnectivityTester };
