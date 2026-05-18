#!/usr/bin/env bun
// scripts/benchmark-v13.ts - Bun v1.3 Performance Testing

import { $ } from 'bun';
import { hash, stripANSI } from "bun";

console.info('🏎️  Bun v1.3 Performance Benchmark Suite');

const benchmarks = {
  'postMessage - Small String': async () => {
    const worker = new Worker(new URL('./benchmark-worker.ts', import.meta.url).href);
    
    const start = performance.now();
    worker.postMessage({ type: 'small-string', data: 'hello world' });
    
    await new Promise(resolve => worker.onmessage = resolve);
    return performance.now() - start;
  },
  
  'postMessage - Large JSON': async () => {
    const worker = new Worker(new URL('./benchmark-worker.ts', import.meta.url).href);
    const largeData = { ticks: Array(1000).fill({ line: 215.5, juice: -110 }) };
    
    const start = performance.now();
    worker.postMessage({ type: 'large-json', data: largeData });
    
    await new Promise(resolve => worker.onmessage = resolve);
    return performance.now() - start;
  },
  
  'Rapidhash Performance': () => {
    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      hash.rapidhash(`tick-${i}-${Date.now()}`);
    }
    return performance.now() - start;
  },
  
  'stripANSI Performance': () => {
    const ansiText = '\x1b[31mRed text\x1b[0m with \x1b[32mgreen\x1b[0m and \x1b[34mblue\x1b[0m';
    
    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      stripANSI(ansiText);
    }
    return performance.now() - start;
  },
  
  'SQL Preconnection': async () => {
    const start = performance.now();
    try {
      // Make pg import optional
      const pg = await import('pg');
      const { Client } = pg;
      const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/test' });
      
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
    } catch (error) {
      console.warn('⚠️ PostgreSQL not available, skipping SQL benchmark');
      return 0; // Return 0ms if not available
    }
    
    return performance.now() - start;
  }
};

async function runBenchmarks() {
  console.info('\n📊 Running Bun v1.3 Benchmarks...\n');
  
  for (const [name, benchmark] of Object.entries(benchmarks)) {
    try {
      const duration = await benchmark();
      console.info(`✅ ${name}: ${duration.toFixed(2)}ms`);
    } catch (error) {
      console.info(`❌ ${name}: Failed - ${(error as Error).message}`);
    }
  }
  
  // Memory usage comparison
  console.info('\n💾 Memory Usage:');
  const memory = process.memoryUsage();
  console.info(`   Heap Used: ${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.info(`   Heap Total: ${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.info(`   External: ${(memory.external / 1024 / 1024).toFixed(2)} MB`);
  
  console.info('\n🎉 Bun v1.3 Benchmark Complete!');
  console.info('Expected improvements:');
  console.info('  • postMessage: 500x faster for strings');
  console.info('  • stripANSI: 6-57x faster');
  console.info('  • Memory: 10-30% reduction');
  console.info('  • Builds: 60% faster on macOS');
}

await runBenchmarks();
