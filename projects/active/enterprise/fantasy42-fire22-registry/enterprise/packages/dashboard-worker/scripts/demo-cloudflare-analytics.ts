#!/usr/bin/env bun
/**
 * 🟠 Cloudflare Enhanced Analytics Demo - Comprehensive Cloudflare integration showcase
 */

import {
  LogLevel,
  LogContext,
  createCloudflareAnalyticsSystem,
} from '../packages/enhanced-logging/src/index';

/**
 * Main Cloudflare analytics demo runner
 */
async function runCloudflareAnalyticsDemo(): Promise<void> {
  console.info('\n🟠🟠🟠 CLOUDFLARE ENHANCED ANALYTICS DEMO 🟠🟠🟠\n');

  // Initialize Cloudflare analytics system
  const cloudflareSystem = createCloudflareAnalyticsSystem({
    accountId: 'demo-account-12345',
    enableRealTimeStats: true,
    enableLogpush: true,
    datacenters: ['LAX', 'LHR', 'FRA', 'NRT', 'SIN'],
    alertThresholds: {
      errorRate: 0.01,
      responseTime: 100,
      cpuTime: 50,
      kvLatency: 100,
      r2Latency: 200,
      d1QueryTime: 50,
    },
  });

  console.info('✅ Cloudflare Analytics Stack Initialized\n');

  // Demo 1: Cloudflare Workers Analytics
  await demonstrateWorkersAnalytics(cloudflareSystem.cloudflareAnalytics);

  // Demo 2: KV Store Monitoring
  await demonstrateKVAnalytics(cloudflareSystem.cloudflareAnalytics);

  // Demo 3: R2 Storage Analytics
  await demonstrateR2Analytics(cloudflareSystem.cloudflareAnalytics);

  // Demo 4: D1 Database Monitoring
  await demonstrateD1Analytics(cloudflareSystem.cloudflareAnalytics);

  // Demo 5: Geographic Performance Analysis
  await demonstrateGeographicAnalytics(cloudflareSystem.cloudflareAnalytics);

  // Demo 6: Cloudflare Cost Optimization
  await demonstrateCostOptimization(cloudflareSystem.cloudflareAnalytics);

  // Demo 7: Comprehensive Cloudflare Dashboard
  await demonstrateCloudflareDatashboard(cloudflareSystem.cloudflareAnalytics);

  console.info('\n🎉 Cloudflare Enhanced Analytics Demo Complete!\n');
}

/**
 * Demo 1: Cloudflare Workers Analytics
 */
async function demonstrateWorkersAnalytics(cfAnalytics: any): Promise<void> {
  console.info('🚀 === DEMO 1: CLOUDFLARE WORKERS ANALYTICS ===\n');

  // Simulate various Worker invocations
  const workerInvocations = [
    {
      workerId: 'dashboard-worker',
      requestId: 'cf-req-12345-abcd',
      colo: 'LAX',
      country: 'US',
      performance: { cpuTime: 15000, wallTime: 45, memoryUsage: 128 },
    },
    {
      workerId: 'api-gateway-worker',
      requestId: 'cf-req-67890-efgh',
      colo: 'LHR',
      country: 'GB',
      performance: { cpuTime: 32000, wallTime: 89, memoryUsage: 256 },
    },
    {
      workerId: 'auth-worker',
      requestId: 'cf-req-11111-ijkl',
      colo: 'FRA',
      country: 'DE',
      performance: { cpuTime: 8000, wallTime: 23, memoryUsage: 64 },
    },
    {
      workerId: 'analytics-worker',
      requestId: 'cf-req-22222-mnop',
      colo: 'NRT',
      country: 'JP',
      performance: { cpuTime: 78000, wallTime: 234, memoryUsage: 512 }, // High CPU usage
    },
  ];

  console.info('📈 Recording Worker Invocations:');
  workerInvocations.forEach((invocation, index) => {
    cfAnalytics.logWorkerInvocation(
      invocation.workerId,
      invocation.requestId,
      invocation.colo,
      invocation.country,
      invocation.performance,
      { component: 'cloudflare-workers' }
    );

    const cpuMs = (invocation.performance.cpuTime / 1000).toFixed(1);
    console.info(`   ${index + 1}. ${invocation.workerId} @ ${invocation.colo}`);
    console.info(
      `      CPU: ${cpuMs}ms | Wall: ${invocation.performance.wallTime}ms | Memory: ${invocation.performance.memoryUsage}MB`
    );
    console.info(
      `      Country: ${invocation.country} | Request: ${invocation.requestId.substring(0, 20)}...`
    );
  });

  console.info('\n');
}

/**
 * Demo 2: KV Store Analytics
 */
async function demonstrateKVAnalytics(cfAnalytics: any): Promise<void> {
  console.info('🗄️ === DEMO 2: CLOUDFLARE KV STORE ANALYTICS ===\n');

  // Simulate KV operations across different regions
  const kvOperations = [
    { op: 'GET', key: 'user_session_12345', hit: true, latency: 18, size: 1024, colo: 'LAX' },
    { op: 'GET', key: 'config_settings', hit: true, latency: 12, size: 2048, colo: 'LAX' },
    { op: 'GET', key: 'user_profile_abcd', hit: false, latency: 89, size: 0, colo: 'LHR' },
    { op: 'PUT', key: 'cache_data_xyz', hit: true, latency: 34, size: 4096, colo: 'FRA' },
    { op: 'GET', key: 'auth_token_9999', hit: true, latency: 15, size: 512, colo: 'NRT' },
    { op: 'GET', key: 'missing_key_000', hit: false, latency: 156, size: 0, colo: 'SIN' },
    { op: 'DELETE', key: 'expired_session', hit: true, latency: 23, size: 0, colo: 'LAX' },
    { op: 'GET', key: 'hot_config_key', hit: true, latency: 8, size: 256, colo: 'LAX' },
  ];

  console.info('🔄 Recording KV Operations:');
  kvOperations.forEach((op, index) => {
    cfAnalytics.logKVOperation(op.op as any, op.key, op.hit, op.latency, op.size, op.colo, {
      component: 'cloudflare-kv',
    });

    const status = op.hit ? '✅ HIT' : '❌ MISS';
    console.info(`   ${index + 1}. ${op.op} ${op.key.substring(0, 20)}... @ ${op.colo}`);
    console.info(`      ${status} | Latency: ${op.latency}ms | Size: ${op.size}B`);
  });

  console.info('\n💡 KV Performance Insights:');
  const hitRate = kvOperations.filter(op => op.hit).length / kvOperations.length;
  const avgLatency = kvOperations.reduce((sum, op) => sum + op.latency, 0) / kvOperations.length;
  const totalData = kvOperations.reduce((sum, op) => sum + op.size, 0);

  console.info(`   Hit Rate: ${(hitRate * 100).toFixed(1)}%`);
  console.info(`   Average Latency: ${avgLatency.toFixed(1)}ms`);
  console.info(`   Data Transferred: ${(totalData / 1024).toFixed(1)}KB`);
  console.info(`   Operations per Colo: LAX(3), LHR(1), FRA(1), NRT(1), SIN(1)`);

  console.info('\n');
}

/**
 * Demo 3: R2 Storage Analytics
 */
async function demonstrateR2Analytics(cfAnalytics: any): Promise<void> {
  console.info('💾 === DEMO 3: CLOUDFLARE R2 STORAGE ANALYTICS ===\n');

  // Simulate R2 operations
  const r2Operations = [
    {
      op: 'GET',
      key: 'images/profile_123.jpg',
      success: true,
      latency: 156,
      size: 524288,
      colo: 'LAX',
    },
    {
      op: 'PUT',
      key: 'documents/report_2024.pdf',
      success: true,
      latency: 289,
      size: 2097152,
      colo: 'LHR',
    },
    {
      op: 'GET',
      key: 'videos/tutorial_01.mp4',
      success: true,
      latency: 445,
      size: 52428800,
      colo: 'FRA',
    },
    { op: 'DELETE', key: 'temp/old_backup.zip', success: true, latency: 67, size: 0, colo: 'LAX' },
    { op: 'GET', key: 'missing/file.txt', success: false, latency: 234, size: 0, colo: 'NRT' },
    { op: 'HEAD', key: 'metadata/info.json', success: true, latency: 34, size: 1024, colo: 'SIN' },
  ];

  console.info('📦 Recording R2 Operations:');
  r2Operations.forEach((op, index) => {
    cfAnalytics.logR2Operation(op.op as any, op.key, op.success, op.latency, op.size, op.colo, {
      component: 'cloudflare-r2',
    });

    const status = op.success ? '✅ SUCCESS' : '❌ FAILED';
    const sizeDisplay = op.size > 0 ? `${(op.size / 1024 / 1024).toFixed(1)}MB` : '0B';
    console.info(`   ${index + 1}. ${op.op} ${op.key.split('/').pop()} @ ${op.colo}`);
    console.info(`      ${status} | Latency: ${op.latency}ms | Size: ${sizeDisplay}`);
  });

  console.info('\n🔍 R2 Performance Analysis:');
  const successRate = r2Operations.filter(op => op.success).length / r2Operations.length;
  const avgLatency = r2Operations.reduce((sum, op) => sum + op.latency, 0) / r2Operations.length;
  const totalData = r2Operations.reduce((sum, op) => sum + op.size, 0);

  console.info(`   Success Rate: ${(successRate * 100).toFixed(1)}%`);
  console.info(`   Average Latency: ${avgLatency.toFixed(1)}ms`);
  console.info(`   Total Data Transfer: ${(totalData / 1024 / 1024).toFixed(1)}MB`);
  console.info(`   Operations: GET(3), PUT(1), DELETE(1), HEAD(1)`);

  console.info('\n');
}

/**
 * Demo 4: D1 Database Analytics
 */
async function demonstrateD1Analytics(cfAnalytics: any): Promise<void> {
  console.info('🗃️ === DEMO 4: CLOUDFLARE D1 DATABASE ANALYTICS ===\n');

  // Simulate D1 queries
  const d1Queries = [
    {
      query: 'SELECT * FROM users WHERE id = ?',
      type: 'READ' as const,
      success: true,
      duration: 12,
      rowsAffected: 1,
    },
    {
      query: 'INSERT INTO user_sessions (user_id, session_token, created_at) VALUES (?, ?, ?)',
      type: 'write' as const,
      success: true,
      duration: 23,
      rowsAffected: 1,
    },
    {
      query: 'SELECT COUNT(*) FROM transactions WHERE created_at > ?',
      type: 'read' as const,
      success: true,
      duration: 156,
      rowsAffected: 1,
    },
    {
      query: 'UPDATE user_balances SET balance = balance + ? WHERE user_id = ?',
      type: 'write' as const,
      success: true,
      duration: 34,
      rowsAffected: 1,
    },
    {
      query:
        'SELECT t.*, u.username FROM transactions t JOIN users u ON t.user_id = u.id WHERE t.status = ?',
      type: 'read' as const,
      success: true,
      duration: 89,
      rowsAffected: 47,
    },
    {
      query: 'DELETE FROM expired_sessions WHERE created_at < ?',
      type: 'write' as const,
      success: true,
      duration: 67,
      rowsAffected: 234,
    },
  ];

  console.info('📊 Recording D1 Database Queries:');
  d1Queries.forEach((query, index) => {
    cfAnalytics.logD1Query(
      query.query,
      query.type,
      query.success,
      query.duration,
      query.rowsAffected,
      { component: 'cloudflare-d1' }
    );

    const queryType = query.type === 'read' ? '📖 READ' : '✏️ WRITE';
    const queryPreview = query.query.substring(0, 40) + '...';
    console.info(`   ${index + 1}. ${queryType} | Duration: ${query.duration}ms`);
    console.info(`      Query: ${queryPreview}`);
    console.info(`      Rows: ${query.rowsAffected} | Status: ${query.success ? '✅' : '❌'}`);
  });

  console.info('\n📈 D1 Performance Metrics:');
  const readQueries = d1Queries.filter(q => q.type === 'read');
  const writeQueries = d1Queries.filter(q => q.type === 'write');
  const avgQueryTime = d1Queries.reduce((sum, q) => sum + q.duration, 0) / d1Queries.length;
  const totalRows = d1Queries.reduce((sum, q) => sum + q.rowsAffected, 0);

  console.info(
    `   Total Queries: ${d1Queries.length} (Reads: ${readQueries.length}, Writes: ${writeQueries.length})`
  );
  console.info(`   Average Query Time: ${avgQueryTime.toFixed(1)}ms`);
  console.info(`   Total Rows Processed: ${totalRows}`);
  console.info(`   Success Rate: 100%`);

  console.info('\n');
}

/**
 * Demo 5: Geographic Performance Analysis
 */
async function demonstrateGeographicAnalytics(cfAnalytics: any): Promise<void> {
  console.info('🌍 === DEMO 5: GEOGRAPHIC PERFORMANCE ANALYTICS ===\n');

  // Get comprehensive analytics
  const analytics = cfAnalytics.getCloudflareAnalytics();

  console.info('🗺️ Geographic Distribution:');
  console.info('   Top Countries by Requests:');
  analytics.geographic.topCountries.forEach((country, index) => {
    const flag = getCountryFlag(country.country);
    console.info(
      `   ${index + 1}. ${flag} ${country.country}: ${country.requests.toLocaleString()} requests (${country.percentage.toFixed(1)}%)`
    );
  });

  console.info('\n   🏢 Top Data Centers (Colos):');
  analytics.geographic.topColos.forEach((colo, index) => {
    const location = getColoLocation(colo.colo);
    console.info(
      `   ${index + 1}. ${colo.colo} (${location}): ${colo.requests.toLocaleString()} requests | ${colo.latency}ms avg`
    );
  });

  console.info('\n⚡ Regional Performance Analysis:');
  console.info(`   Fastest Region: NRT (Japan) - 8ms avg response`);
  console.info(`   Slowest Region: SIN (Singapore) - 156ms avg response`);
  console.info(`   Most Traffic: LAX (Los Angeles) - 42% of total requests`);
  console.info(`   Optimization Opportunity: SIN latency reduction potential`);

  console.info('\n');
}

/**
 * Demo 6: Cloudflare Cost Optimization
 */
async function demonstrateCostOptimization(cfAnalytics: any): Promise<void> {
  console.info('💰 === DEMO 6: CLOUDFLARE COST OPTIMIZATION ===\n');

  const analytics = cfAnalytics.getCloudflareAnalytics();
  const optimizations = cfAnalytics.getCloudflareOptimizations();

  console.info('💵 Current Cost Analysis:');
  console.info(`   Total Monthly Cost: $${analytics.overview.totalCosts.total.toFixed(2)}`);
  console.info(`   Workers: $${analytics.overview.totalCosts.workers.toFixed(2)}`);
  console.info(`   KV Store: $${analytics.overview.totalCosts.kv.toFixed(2)}`);
  console.info(`   R2 Storage: $${analytics.overview.totalCosts.r2.toFixed(2)}`);
  console.info(`   D1 Database: $${analytics.overview.totalCosts.d1.toFixed(2)}`);

  console.info('\n🚀 Top Cost Optimization Opportunities:');
  optimizations.slice(0, 3).forEach((opt, index) => {
    const priority = getPriorityEmoji(opt.priority);
    console.info(`   ${index + 1}. ${priority} ${opt.service}: ${opt.issue}`);
    console.info(`      Recommendation: ${opt.recommendation}`);
    console.info(`      Expected Impact: ${opt.expectedImpact}`);
    console.info(`      Estimated Savings: ${opt.estimatedCostSavings}`);
    console.info(`      Implementation Steps: ${opt.implementation.length} steps`);
  });

  console.info('\n📊 Optimization ROI Analysis:');
  const totalSavings = optimizations.reduce((sum, opt) => {
    const savings = parseFloat(opt.estimatedCostSavings.replace(/[$,]/g, ''));
    return sum + savings;
  }, 0);

  console.info(`   Total Monthly Savings Potential: $${totalSavings.toFixed(2)}`);
  console.info(`   Annual Savings: $${(totalSavings * 12).toFixed(2)}`);
  console.info(
    `   Cost Reduction: ${((totalSavings / analytics.overview.totalCosts.total) * 100).toFixed(1)}%`
  );

  console.info('\n');
}

/**
 * Demo 7: Comprehensive Cloudflare Dashboard
 */
async function demonstrateCloudflareDatashboard(cfAnalytics: any): Promise<void> {
  console.info('📊 === DEMO 7: COMPREHENSIVE CLOUDFLARE DASHBOARD ===\n');

  const analytics = cfAnalytics.getCloudflareAnalytics();

  console.info('🎛️ Real-time Dashboard Overview:');
  console.info(`   📈 Total Requests: ${analytics.overview.totalRequests.toLocaleString()}`);
  console.info(`   ✅ Success Rate: ${(analytics.overview.successRate * 100).toFixed(2)}%`);
  console.info(`   ⚡ Avg Response Time: ${analytics.overview.averageResponseTime.toFixed(1)}ms`);
  console.info(`   🔄 Total CPU Time: ${analytics.overview.totalCpuTime.toFixed(1)}s`);

  console.info('\n🚨 Active Alerts:');
  if (analytics.alerts.length > 0) {
    analytics.alerts.forEach((alert, index) => {
      const severity = alert.severity === 'CRITICAL' ? '🚨' : '⚠️';
      console.info(`   ${index + 1}. ${severity} ${alert.service}: ${alert.message}`);
      console.info(`      Current: ${alert.current} | Threshold: ${alert.threshold}`);
    });
  } else {
    console.info('   ✅ No active alerts - all systems operating normally');
  }

  console.info('\n📋 Performance Summary by Service:');

  // Workers performance
  console.info(`   🚀 Workers:`);
  console.info(`      Requests: ${analytics.performance.workers.totalRequests.toLocaleString()}`);
  console.info(
    `      Success Rate: ${(analytics.performance.workers.successRate * 100).toFixed(1)}%`
  );
  console.info(
    `      Avg Response: ${analytics.performance.workers.averageResponseTime.toFixed(1)}ms`
  );
  console.info(
    `      Avg CPU Time: ${(analytics.performance.workers.averageCpuTime / 1000).toFixed(1)}ms`
  );

  // KV performance
  console.info(`   🗄️ KV Store:`);
  console.info(`      Operations: ${analytics.performance.kv.operations.toLocaleString()}`);
  console.info(
    `      Hit Rate: ${((analytics.performance.kv.hits / analytics.performance.kv.operations) * 100).toFixed(1)}%`
  );
  console.info(`      P95 Latency: ${analytics.performance.kv.latency.p95.toFixed(1)}ms`);

  // R2 performance
  console.info(`   💾 R2 Storage:`);
  console.info(`      Operations: ${analytics.performance.r2.operations.toLocaleString()}`);
  console.info(
    `      Data Transfer: ${(analytics.performance.r2.dataTransfer / 1024 / 1024).toFixed(1)}MB`
  );
  console.info(`      P95 Latency: ${analytics.performance.r2.latency.p95.toFixed(1)}ms`);

  // D1 performance
  console.info(`   🗃️ D1 Database:`);
  console.info(`      Queries: ${analytics.performance.d1.queries.toLocaleString()}`);
  console.info(
    `      Reads/Writes: ${analytics.performance.d1.reads}/${analytics.performance.d1.writes}`
  );
  console.info(`      Avg Query Time: ${analytics.performance.d1.averageQueryTime.toFixed(1)}ms`);

  console.info('\n🎯 Key Performance Insights:');
  console.info('   ════════════════════════════════════════════');
  console.info('   🟠 Cloudflare Enhanced Analytics Status');
  console.info('   ════════════════════════════════════════════');
  console.info('   ✅ Workers: Operational with real-time monitoring');
  console.info('   ✅ KV Store: Active with hit rate optimization');
  console.info('   ✅ R2 Storage: Monitored with latency tracking');
  console.info('   ✅ D1 Database: Query performance analysis enabled');
  console.info('   ✅ Geographic Analytics: Multi-region insights');
  console.info('   ✅ Cost Optimization: ROI-based recommendations');
  console.info('   ════════════════════════════════════════════');
  console.info('   📊 Cloudflare-Specific Enhancements:');
  console.info('   • Real-time Workers performance tracking');
  console.info('   • Multi-region KV/R2/D1 latency analysis');
  console.info('   • Geographic performance distribution');
  console.info('   • Cost optimization with savings calculations');
  console.info('   • Colo-specific performance insights');
  console.info('   • Predictive alerting for Cloudflare services');
  console.info('   ════════════════════════════════════════════\n');

  console.info('\n');
}

// Helper functions
function getCountryFlag(countryCode: string): string {
  const flags: Record<string, string> = {
    US: '🇺🇸',
    GB: '🇬🇧',
    DE: '🇩🇪',
    JP: '🇯🇵',
    FR: '🇫🇷',
    CA: '🇨🇦',
    AU: '🇦🇺',
    SG: '🇸🇬',
  };
  return flags[countryCode] || '🌍';
}

function getColoLocation(colo: string): string {
  const locations: Record<string, string> = {
    LAX: 'Los Angeles',
    LHR: 'London',
    FRA: 'Frankfurt',
    NRT: 'Tokyo',
    SIN: 'Singapore',
    CDG: 'Paris',
  };
  return locations[colo] || 'Unknown';
}

function getPriorityEmoji(priority: string): string {
  const emojis: Record<string, string> = {
    CRITICAL: '🚨',
    HIGH: '🔥',
    MEDIUM: '⚡',
    LOW: '💡',
  };
  return emojis[priority] || '📝';
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    await runCloudflareAnalyticsDemo();
  } catch (error) {
    console.error('❌ Cloudflare Analytics demo failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}

export { main as runCloudflareAnalyticsDemo };
