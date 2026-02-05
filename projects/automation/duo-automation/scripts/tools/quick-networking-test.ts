#!/usr/bin/env bun
// Quick test to generate networking metrics for CLI demo

import { BunNativeAPITracker, TrackedBunAPIs } from './packages/cli/bun-native-integrations';

console.log('🔗 Generating networking metrics for CLI demo...');

// Create tracker and tracked APIs
const tracker = new BunNativeAPITracker();
const trackedAPIs = new TrackedBunAPIs(tracker);

// Generate some networking activity
await tracker.trackCallAsync('fetch', async () => {
  console.log('📡 Simulating HTTP fetch...');
  await new Promise(resolve => setTimeout(resolve, 50));
  return { status: 200, ok: true };
}, 'native', {
  url: 'https://example.com',
  method: 'GET',
  protocol: 'http'
});

await tracker.trackCallAsync('fetch-unix', async () => {
  console.log('🔗 Simulating Unix socket fetch...');
  await new Promise(resolve => setTimeout(resolve, 30));
  return { status: 200, ok: true };
}, 'native', {
  url: 'http://localhost/info',
  unixSocket: '/var/run/docker.sock',
  method: 'GET',
  protocol: 'unix-domain-socket'
});

await tracker.trackCallAsync('fetch-unix', async () => {
  console.log('🔗 Simulating Unix socket POST...');
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

console.log('\n📊 Generated Metrics:');
console.log(`Total APIs: ${summary.totalAPIs}`);
console.log(`Total Calls: ${summary.totalCalls}`);
console.log(`Native Rate: ${summary.nativeRate.toFixed(1)}%`);

console.log('\n🌐 Networking Domain:');
const networkingMetrics = domainBreakdown.networking || [];
networkingMetrics.forEach((metric, index) => {
  const protocol = metric.metadata?.protocol || 'http';
  const socket = metric.metadata?.unixSocket || '';
  console.log(`  ${index + 1}. ${metric.apiName} (${protocol}) ${socket ? `- ${socket}` : ''}`);
  console.log(`     Calls: ${metric.callCount}, Duration: ${metric.averageDuration.toFixed(2)}ms`);
});

console.log('\n✅ Metrics generated! Now running CLI...');

// Now run the CLI command
console.log('\n🚀 Running CLI command:');
console.log('$ bun packages/cli/comprehensive-cli-system.ts --metrics --hex-colors --domains networking');

// Import and run the CLI
const { main } = await import('./packages/cli/comprehensive-cli-system.ts');
await main(['--metrics', '--hex-colors', '--domains', 'networking']);
