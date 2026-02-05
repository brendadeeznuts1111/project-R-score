/**
 * monitoring/secrets-health-check.ts
 * Infrastructure health monitoring for enterprise secrets and platform compatibility
 */

import { ScopedSecretsManager } from '../utils/scoped-secrets-manager';

async function runSecretsHealthCheck() {
  console.log('🔍 Starting Enterprise Secrets Health Check...');
  
  const secretsManager = new ScopedSecretsManager();
  const report = await secretsManager.getHealthReport();
  
  console.log('\n📊 Health Metrics:');
  console.log(`- Accessible: ${report.accessible ? '✅' : '❌'}`);
  console.log(`- Scoped Correctly: ${report.scopedCorrectly ? '✅' : '❌'}`);
  console.log(`- Platform Supported: ${report.platformSupported ? '✅' : '❌'}`);
  console.log(`- Storage Type: ${report.storageType}`);
  console.log(`- Encryption: ${report.encryptionStrength}`);

  if (report.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    report.recommendations.forEach(rec => console.log(`  - ${rec}`));
  }

  // 100% Bun-Native: Performance Metric
  const start = performance.now();
  await secretsManager.getSecret('HEALTH_CHECK_PING');
  const duration = performance.now() - start;
  console.log(`\n⚡ Secret retrieval latency: ${duration.toFixed(2)}ms`);

  const debugInfo = secretsManager.exportDebugInfo();
  
  // Output JSON for dashboard integration
  const output = {
    timestamp: new Date().toISOString(),
    status: report.accessible && report.scopedCorrectly ? 'healthy' : 'degraded',
    metrics: report,
    latencyMs: duration,
    platform: process.platform,
    scope: debugInfo.scope.scope
  };

  await (Bun as any).write('reports/secrets-health.json', JSON.stringify(output, null, 2));
  console.log('\n📄 Report exported to reports/secrets-health.json');

  if (!report.accessible) {
    process.exit(1);
  }
}

runSecretsHealthCheck().catch(err => {
  console.error('Fatal health check error:', err);
  process.exit(1);
});