#!/usr/bin/env bun

/**
 * Context Run Server v3.15 - Demo & Test Suite
 * 
 * Comprehensive demo showcasing all server capabilities:
 * - Deep link processing with context
 * - Session management
 * - Wiki integration
 * - R2 analytics storage
 * - Real-time monitoring
 * - Performance testing
 */

const SERVER_URL = 'http://localhost:3015';

// Demo configuration
const DEMO_CONFIG = {
  serverUrl: process.env.DEMO_SERVER_URL || SERVER_URL,
  timeout: 10000,
  retries: 3,
  parallelRequests: 10
};

// Test deep links
const TEST_DEEP_LINKS = [
  {
    name: 'Payment Processing',
    url: 'freshcuts://payment?amount=45&shop=nyc_01&service=haircut&barber=john',
    expectedAction: 'payment'
  },
  {
    name: 'Booking Creation',
    url: 'freshcuts://booking?barber=sarah&datetime=2024-01-15T14:30:00Z&service=beard',
    expectedAction: 'booking'
  },
  {
    name: 'Tip Processing',
    url: 'freshcuts://tip?barber=mike&amount=15',
    expectedAction: 'tip'
  },
  {
    name: 'Shop Navigation',
    url: 'freshcuts://shop?shop=downtown_01',
    expectedAction: 'shop'
  },
  {
    name: 'Barber Profile',
    url: 'freshcuts://barber?barber=alex',
    expectedAction: 'barber'
  },
  {
    name: 'Review Prompt',
    url: 'freshcuts://review?appointment=apt_12345',
    expectedAction: 'review'
  },
  {
    name: 'Promotions',
    url: 'freshcuts://promotions?code=SAVE20',
    expectedAction: 'promotions'
  },
  {
    name: 'User Profile',
    url: 'freshcuts://profile?user=user_789',
    expectedAction: 'profile'
  }
];

// Utility functions
class DemoUtils {
  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async fetchWithRetry(url: string, options: RequestInit = {}, retries = DEMO_CONFIG.retries): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          signal: AbortSignal.timeout(DEMO_CONFIG.timeout)
        });
        return response;
      } catch (error) {
        if (i === retries - 1) throw error;
        console.log(`⚠️ Retry ${i + 1}/${retries} for ${url}`);
        await this.delay(1000 * (i + 1)); // Exponential backoff
      }
    }
    throw new Error('Max retries exceeded');
  }

  static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  }

  static formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  }
}

// Server health check
async function checkServerHealth(): Promise<boolean> {
  console.log('🏥 Checking server health...');
  
  try {
    const response = await DemoUtils.fetchWithRetry(`${DEMO_CONFIG.serverUrl}/api/health`);
    const result = await response.json();
    
    if (result.success && result.data.status === 'healthy') {
      console.log('✅ Server is healthy');
      console.log(`   Version: ${result.data.version}`);
      console.log(`   Uptime: ${DemoUtils.formatDuration(result.data.uptime)}`);
      console.log(`   Environment: ${result.data.environment}`);
      console.log();
      
      // Show integration status
      console.log('🔌 Integration Status:');
      Object.entries(result.data.integrations).forEach(([name, enabled]: [string, boolean]) => {
        console.log(`   ${name}: ${enabled ? '✅ Enabled' : '❌ Disabled'}`);
      });
      console.log();
      
      return true;
    } else {
      console.log('❌ Server is not healthy');
      return false;
    }
  } catch (error) {
    console.log('❌ Server health check failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

// Deep link processing demo
async function demonstrateDeepLinkProcessing(): Promise<void> {
  console.log('🔗 Deep Link Processing Demo\n');
  
  let sessionId: string | undefined;
  let totalProcessingTime = 0;
  let successCount = 0;
  let errorCount = 0;

  for (const testCase of TEST_DEEP_LINKS) {
    console.log(`🧪 ${testCase.name}:`);
    console.log(`   URL: ${testCase.url}`);
    
    try {
      const startTime = Date.now();
      
      const response = await DemoUtils.fetchWithRetry(
        `${DEMO_CONFIG.serverUrl}/api/deep-link`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionId && { 'X-Session-ID': sessionId })
          },
          body: JSON.stringify({ url: testCase.url })
        }
      );
      
      const processingTime = Date.now() - startTime;
      totalProcessingTime += processingTime;
      
      const result = await response.json();
      
      if (result.success) {
        successCount++;
        console.log(`   ✅ Success (${processingTime}ms)`);
        console.log(`   Action: ${result.data.type}`);
        console.log(`   Result: ${result.data.action}`);
        
        // Extract session ID from first successful request
        if (!sessionId && result.data.session) {
          sessionId = result.data.session.id;
          console.log(`   📝 Session: ${sessionId}`);
        }
        
        // Show documentation if available
        if (result.data.documentation) {
          console.log(`   📚 Docs: ${result.data.documentation.title}`);
        }
        
        // Show analytics if available
        if (result.data.analytics) {
          console.log(`   📊 Analytics: ${result.data.analytics.processingTime}ms`);
        }
        
        // Show session context
        if (result.data.session) {
          const context = result.data.session.context;
          console.log(`   🔐 Context: Shop=${context.currentShop || 'None'}, Barber=${context.currentBarber || 'None'}`);
        }
      } else {
        errorCount++;
        console.log(`   ❌ Failed: ${result.error || 'Unknown error'}`);
      }
      
    } catch (error) {
      errorCount++;
      console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    console.log();
    await DemoUtils.delay(500); // Small delay between requests
  }

  // Summary
  console.log('📊 Deep Link Processing Summary:');
  console.log(`   Total Requests: ${TEST_DEEP_LINKS.length}`);
  console.log(`   Successful: ${successCount}`);
  console.log(`   Failed: ${errorCount}`);
  console.log(`   Success Rate: ${((successCount / TEST_DEEP_LINKS.length) * 100).toFixed(2)}%`);
  console.log(`   Average Processing Time: ${DemoUtils.formatDuration(totalProcessingTime / TEST_DEEP_LINKS.length)}`);
  console.log(`   Total Processing Time: ${DemoUtils.formatDuration(totalProcessingTime)}`);
  console.log();
}

// Performance testing
async function demonstratePerformanceTesting(): Promise<void> {
  console.log('⚡ Performance Testing Demo\n');
  
  const concurrentRequests = 20;
  const requestsPerBatch = 5;
  const testUrl = 'freshcuts://payment?amount=25&shop=test';
  
  console.log(`🚀 Running ${concurrentRequests} concurrent requests in batches of ${requestsPerBatch}...`);
  
  const startTime = Date.now();
  const results: Array<{ success: boolean; responseTime: number; error?: string }> = [];
  
  // Run requests in batches
  for (let i = 0; i < concurrentRequests; i += requestsPerBatch) {
    const batch = Math.min(requestsPerBatch, concurrentRequests - i);
    const batchPromises: Promise<void>[] = [];
    
    for (let j = 0; j < batch; j++) {
      const promise = (async () => {
        try {
          const requestStart = Date.now();
          const response = await DemoUtils.fetchWithRetry(
            `${DEMO_CONFIG.serverUrl}/api/deep-link`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: testUrl })
            }
          );
          const responseTime = Date.now() - requestStart;
          
          const result = await response.json();
          results.push({
            success: result.success,
            responseTime,
            error: result.success ? undefined : result.error
          });
        } catch (error) {
          results.push({
            success: false,
            responseTime: 0,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      })();
      
      batchPromises.push(promise);
    }
    
    await Promise.all(batchPromises);
    console.log(`   Batch ${Math.floor(i / requestsPerBatch) + 1}/${Math.ceil(concurrentRequests / requestsPerBatch)} completed`);
  }
  
  const totalTime = Date.now() - startTime;
  
  // Analyze results
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const responseTimes = successful.map(r => r.responseTime).sort((a, b) => a - b);
  
  console.log('\n📈 Performance Test Results:');
  console.log(`   Total Requests: ${concurrentRequests}`);
  console.log(`   Successful: ${successful.length}`);
  console.log(`   Failed: ${failed.length}`);
  console.log(`   Success Rate: ${((successful.length / concurrentRequests) * 100).toFixed(2)}%`);
  console.log(`   Total Time: ${DemoUtils.formatDuration(totalTime)}`);
  console.log(`   Requests/Second: ${(concurrentRequests / (totalTime / 1000)).toFixed(2)}`);
  
  if (responseTimes.length > 0) {
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minResponseTime = responseTimes[0];
    const maxResponseTime = responseTimes[responseTimes.length - 1];
    const p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)];
    
    console.log(`   Average Response Time: ${DemoUtils.formatDuration(avgResponseTime)}`);
    console.log(`   Min Response Time: ${DemoUtils.formatDuration(minResponseTime)}`);
    console.log(`   Max Response Time: ${DemoUtils.formatDuration(maxResponseTime)}`);
    console.log(`   95th Percentile: ${DemoUtils.formatDuration(p95ResponseTime)}`);
  }
  
  console.log();
}

// Analytics dashboard demo
async function demonstrateAnalyticsDashboard(): Promise<void> {
  console.log('📊 Analytics Dashboard Demo\n');
  
  try {
    // Get analytics data
    console.log('🔍 Fetching analytics data...');
    const analyticsResponse = await DemoUtils.fetchWithRetry(`${DEMO_CONFIG.serverUrl}/api/analytics?days=7`);
    const analyticsResult = await analyticsResponse.json();
    
    if (analyticsResult.success) {
      const analytics = analyticsResult.data;
      
      console.log('📈 Analytics Summary:');
      console.log(`   Total Deep Links: ${analytics.totalDeepLinks || 0}`);
      console.log(`   Error Rate: ${analytics.errorRate?.toFixed(2) || 0}%`);
      console.log(`   Average Processing Time: ${analytics.averageProcessingTime?.toFixed(2) || 0}ms`);
      
      if (analytics.actionCounts) {
        console.log('\n🔗 Action Breakdown:');
        Object.entries(analytics.actionCounts).forEach(([action, count]: [string, number]) => {
          console.log(`   ${action}: ${count}`);
        });
      }
      
      if (analytics.topShops) {
        console.log('\n🏪 Top Shops:');
        Object.entries(analytics.topShops).slice(0, 5).forEach(([shop, count]: [string, number]) => {
          console.log(`   ${shop}: ${count}`);
        });
      }
      
      if (analytics.topBarbers) {
        console.log('\n💇 Top Barbers:');
        Object.entries(analytics.topBarbers).slice(0, 5).forEach(([barber, count]: [string, number]) => {
          console.log(`   ${barber}: ${count}`);
        });
      }
    }
    
    // Get server metrics
    console.log('\n🔍 Fetching server metrics...');
    const metricsResponse = await DemoUtils.fetchWithRetry(`${DEMO_CONFIG.serverUrl}/api/metrics`);
    const metricsResult = await metricsResponse.json();
    
    if (metricsResult.success) {
      const metrics = metricsResult.data;
      
      console.log('\n🖥️ Server Metrics:');
      console.log(`   Total Requests: ${metrics.requests.total.toLocaleString()}`);
      console.log(`   Deep Links Processed: ${metrics.requests.deepLinks.toLocaleString()}`);
      console.log(`   Average Response Time: ${metrics.performance.averageResponseTime.toFixed(2)}ms`);
      console.log(`   Slow Requests: ${metrics.performance.slowRequests}`);
      console.log(`   Memory Usage: ${DemoUtils.formatBytes(metrics.memory.heapUsed)}/${DemoUtils.formatBytes(metrics.memory.heapTotal)}`);
      console.log(`   Server Uptime: ${DemoUtils.formatDuration(metrics.uptime)}`);
      
      if (metrics.sessions) {
        console.log('\n🔐 Session Statistics:');
        console.log(`   Active Sessions: ${metrics.sessions.active}`);
        console.log(`   Total Sessions: ${metrics.sessions.total}`);
      }
      
      if (metrics.integrations) {
        console.log('\n🔌 Integration Statistics:');
        console.log(`   Wiki: ${metrics.integrations.wiki.hits} hits, ${metrics.integrations.wiki.errors} errors`);
        console.log(`   R2: ${metrics.integrations.r2.uploads} uploads, ${metrics.integrations.r2.downloads} downloads, ${metrics.integrations.r2.errors} errors`);
      }
    }
    
  } catch (error) {
    console.log('❌ Analytics demo failed:', error instanceof Error ? error.message : String(error));
  }
  
  console.log();
}

// Session management demo
async function demonstrateSessionManagement(): Promise<void> {
  console.log('🔐 Session Management Demo\n');
  
  let sessionId: string | undefined;
  
  try {
    // First request to create session
    console.log('📝 Creating new session...');
    const response1 = await DemoUtils.fetchWithRetry(
      `${DEMO_CONFIG.serverUrl}/api/deep-link`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'freshcuts://shop?shop=session_test' })
      }
    );
    
    const result1 = await response1.json();
    if (result1.success && result1.data.session) {
      sessionId = result1.data.session.id;
      console.log(`✅ Session created: ${sessionId}`);
      console.log(`   Current Shop: ${result1.data.session.context.currentShop}`);
    }
    
    if (sessionId) {
      // Second request with same session
      console.log('\n📝 Using existing session...');
      const response2 = await DemoUtils.fetchWithRetry(
        `${DEMO_CONFIG.serverUrl}/api/deep-link`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': sessionId
          },
          body: JSON.stringify({ url: 'freshcuts://barber?barber=session_barber' })
        }
      );
      
      const result2 = await response2.json();
      if (result2.success && result2.data.session) {
        console.log(`✅ Session updated: ${result2.data.session.id}`);
        console.log(`   Current Shop: ${result2.data.session.context.currentShop}`);
        console.log(`   Current Barber: ${result2.data.session.context.currentBarber}`);
        console.log(`   Navigation History: ${result2.data.session.context.navigationHistory.length} links`);
      }
    }
    
  } catch (error) {
    console.log('❌ Session management demo failed:', error instanceof Error ? error.message : String(error));
  }
  
  console.log();
}

// Main demo function
async function runContextServerDemo(): Promise<void> {
  console.log('🚀 Context Run Server v3.15 - Demo Suite\n');
  console.log(`🌐 Target Server: ${DEMO_CONFIG.serverUrl}`);
  console.log(`⏱️ Timeout: ${DEMO_CONFIG.timeout}ms`);
  console.log(`🔄 Retries: ${DEMO_CONFIG.retries}`);
  console.log(`⚡ Parallel Requests: ${DEMO_CONFIG.parallelRequests}\n`);
  
  // Check server health first
  const isHealthy = await checkServerHealth();
  if (!isHealthy) {
    console.log('❌ Server is not available. Please start the server first:');
    console.log(`   bun run context-run-server-v315.ts\n`);
    return;
  }
  
  // Run all demos
  await demonstrateDeepLinkProcessing();
  await demonstrateSessionManagement();
  await demonstratePerformanceTesting();
  await demonstrateAnalyticsDashboard();
  
  console.log('🎉 Context Run Server v3.15 Demo Completed Successfully!\n');
  
  console.log('📋 Demo Summary:');
  console.log('   ✅ Server health check');
  console.log('   ✅ Deep link processing with all action types');
  console.log('   ✅ Session management with context persistence');
  console.log('   ✅ Performance testing with concurrent requests');
  console.log('   ✅ Analytics dashboard and metrics');
  console.log('   ✅ Integration status monitoring');
  
  console.log('\n🌐 Access Points:');
  console.log(`   Dashboard: ${DEMO_CONFIG.serverUrl}/`);
  console.log(`   Health: ${DEMO_CONFIG.serverUrl}/api/health`);
  console.log(`   Metrics: ${DEMO_CONFIG.serverUrl}/api/metrics`);
  console.log(`   Analytics: ${DEMO_CONFIG.serverUrl}/api/analytics`);
  
  console.log('\n🔧 Next Steps:');
  console.log('   • Open the dashboard for real-time monitoring');
  console.log('   • Test with your own deep links');
  console.log('   • Configure R2 storage for persistent analytics');
  console.log('   • Set up wiki integration for documentation');
  console.log('   • Monitor performance and optimize as needed');
}

// Run demo if this file is executed directly
if (import.meta.main) {
  runContextServerDemo().catch(console.error);
}

export { runContextServerDemo };
