#!/usr/bin/env bun
// Quick test to generate networking metrics for CLI demo

import { BunNativeAPITracker, TrackedBunAPIs } from './packages/cli/bun-native-integrations';

console.info('🔗 Generating networking metrics for CLI demo...');

// Create tracker and tracked APIs
const tracker = new BunNativeAPITracker();
const trackedAPIs = new TrackedBunAPIs(tracker);

// Generate some networking activity
await tracker.trackCallAsync('fetch', async () => {
  console.info('📡 Simulating HTTP fetch...');
  await new Promise(resolve => setTimeout(resolve, 50));
  return { status: 200, ok: true };
}, 'native', {
  url: 'https://example.com',
  method: 'GET',
  protocol: 'http'
});

await tracker.trackCallAsync('fetch-unix', async () => {
  console.info('🔗 Simulating Unix socket fetch...');
  await new Promise(resolve => setTimeout(resolve, 30));
  return { status: 200, ok: true };
}, 'native', {
  url: 'http://localhost/info',
  unixSocket: '/var/run/docker.sock',
  method: 'GET',
  protocol: 'unix-domain-socket'
});

await tracker.trackCallAsync('fetch-unix', async () => {
  console.info('🔗 Simulating Unix socket POST...');
  await new Promise(resolve => setTimeout(resolve, 40));
  return { status: 201, ok: true };
}, 'native', {
  url: 'http://localhost/api',
  unixSocket: '/tmp/app.sock',
  method: 'POST',
  protocol: 'unix-domain-socket'
});

const metrics = tracker.getAllMetrics();
const summary = tracker.getSummary();
const domainBreakdown = tracker.getMetricsByDomain();

console.info('\n📊 Generated Metrics:');
console.info(`Total APIs: ${summary.totalAPIs}`);
console.info(`Total Calls: ${summary.totalCalls}`);
console.info(`Native Rate: ${summary.nativeRate.toFixed(1)}%`);

console.info('\n🌐 Networking Domain:');
const networkingMetrics = domainBreakdown.networking || [];
networkingMetrics.forEach((metric, index) => {
  const protocol = metric.metadata?.protocol || 'http';
  const socket = metric.metadata?.unixSocket || '';
  console.info(`  ${index + 1}. ${metric.apiName} (${protocol}) ${socket ? `- ${socket}` : ''}`);
  console.info(`     Calls: ${metric.callCount}, Duration: ${metric.averageDuration.toFixed(2)}ms`);
});

console.info('\n✅ Metrics generated! Now running CLI...');

// Now run the CLI command
console.info('\n🚀 Running CLI command:');
console.info('$ bun packages/cli/comprehensive-cli-system.ts --metrics --hex-colors --domains networking');

// Import and run the CLI
const { main } = await import('./packages/cli/comprehensive-cli-system.ts');
await main(['--metrics', '--hex-colors', '--domains', 'networking']);
