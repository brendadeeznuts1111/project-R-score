/**
 * monitoring/secrets-health-check.ts
 * Infrastructure health monitoring for enterprise secrets and platform compatibility
 */

import { ScopedSecretsManager } from '../utils/scoped-secrets-manager';

async function runSecretsHealthCheck() {
  console.info('🔍 Starting Enterprise Secrets Health Check...');
  
  const secretsManager = new ScopedSecretsManager();
  const report = await secretsManager.getHealthReport();
  
  console.info('\n📊 Health Metrics:');
  console.info(`- Accessible: ${report.accessible ? '✅' : '❌'}`);
  console.info(`- Scoped Correctly: ${report.scopedCorrectly ? '✅' : '❌'}`);
  console.info(`- Platform Supported: ${report.platformSupported ? '✅' : '❌'}`);
  console.info(`- Storage Type: ${report.storageType}`);
  console.info(`- Encryption: ${report.encryptionStrength}`);

  if (report.recommendations.length > 0) {
    console.info('\n💡 Recommendations:');
    report.recommendations.forEach(rec => console.info(`  - ${rec}`));
  }

  // 100% Bun-Native: Performance Metric
  const start = performance.now();
  await secretsManager.getSecret('HEALTH_CHECK_PING');
  const duration = performance.now() - start;
  console.info(`\n⚡ Secret retrieval latency: ${duration.toFixed(2)}ms`);

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
  console.info('\n📄 Report exported to reports/secrets-health.json');

  if (!report.accessible) {
    process.exit(1);
  }
}

runSecretsHealthCheck().catch(err => {
  console.error('Fatal health check error:', err);
  process.exit(1);
});