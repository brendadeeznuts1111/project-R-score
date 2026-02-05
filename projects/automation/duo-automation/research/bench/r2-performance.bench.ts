/**
 * benchmarks/r2-performance.bench.ts
 * Performance validation for Cloudflare R2 storage operations
 * Required for Agent Orchestrator deployment validation
 */

import { bench, run } from 'mitata';
import { BunR2Manager } from '../utils/bun-r2-manager';
import { ScopedSecretsManager } from '../utils/scoped-secrets-manager';

// 1. Initialize Mock Runtime Configuration
const secretsManager = new ScopedSecretsManager({ service: 'r2-benchmark' });

const r2 = new BunR2Manager({
  accountId: 'benchmark-account',
  accessKeyId: 'benchmark-id',
  secretAccessKey: 'benchmark-secret',
  bucket: 'factory-wager-packages'
});

const smallPayload = new Uint8Array(1024); // 1KB
const largePayload = new Uint8Array(1024 * 1024); // 1MB

bench('R2: Small Object Upload (1KB)', async () => {
  await r2.upload({
    key: 'bench/small.bin',
    data: smallPayload,
    contentType: 'application/octet-stream'
  });
});

bench('R2: Large Object Upload (1MB)', async () => {
  await r2.upload({
    key: 'bench/large.bin',
    data: largePayload,
    contentType: 'application/octet-stream'
  });
});

bench('R2: Object Download', async () => {
  await r2.download({
    key: 'bench/small.bin'
  });
});

bench('R2: Bucket Statistics', async () => {
  await r2.getStats();
});

console.log('🚀 Starting R2 Storage Performance Benchmark...');
await run();