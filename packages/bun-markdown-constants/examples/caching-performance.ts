#!/usr/bin/env bun
/**
 * Caching and Performance Example
 * 
 * Demonstrates how to use caching for improved performance
 */

import { 
  MarkdownPresets, 
  MarkdownCache,
  benchmark,
  measureMemory,
  measureTime
} from '../src/index';

console.log('=== Caching and Performance Example ===\n');

// Create cache instances
const memoryCache = MarkdownCache.createMemoryCache(100);
const lruCache = MarkdownCache.createLRUCache(100, 60000); // 1 minute TTL

// Create renderer
const renderHtml = MarkdownPresets.html('GFM', 'MODERATE');

// Sample markdown documents
const documents = [
  { id: 'doc1', content: '# Document 1\n\n**Important** information here.' },
  { id: 'doc2', content: '# Document 2\n\n*Another* document with content.' },
  { id: 'doc3', content: '# Document 3\n\n| Col1 | Col2 |\n|------|------|\n| A    | B    |' },
];

console.log('1. Basic Caching');
console.log('-'.repeat(50));

// Render with caching
function renderWithCache(docId: string, content: string): string {
  // Check cache first
  const cached = memoryCache.get(docId);
  if (cached) {
    console.log(`  Cache hit for ${docId}`);
    return cached;
  }
  
  console.log(`  Cache miss for ${docId} - rendering...`);
  const result = renderHtml(content);
  memoryCache.set(docId, result);
  return result;
}

// First pass - cache misses
console.log('First pass (cache misses expected):');
documents.forEach(doc => renderWithCache(doc.id, doc.content));

// Second pass - cache hits
console.log('\nSecond pass (cache hits expected):');
documents.forEach(doc => renderWithCache(doc.id, doc.content));

console.log(`\nCache size: ${memoryCache.size()} items`);

console.log('\n\n2. Performance Benchmark');
console.log('-'.repeat(50));

// Run built-in benchmark
console.log('Running built-in benchmark (1000 iterations)...\n');
benchmark(1000);

console.log('\n\n3. Custom Benchmark with Timing');
console.log('-'.repeat(50));

const testDoc = '# Title\n\n'.repeat(100) + '**Bold** text. '.repeat(50);

// Without cache
const uncached = measureTime(() => {
  for (let i = 0; i < 1000; i++) {
    renderHtml(testDoc);
  }
});

console.log(`Without cache: ${uncached.time.toFixed(2)}ms`);

// With cache (after warming up)
const cacheKey = 'perf-test';
memoryCache.set(cacheKey, renderHtml(testDoc));

const cached = measureTime(() => {
  for (let i = 0; i < 1000; i++) {
    memoryCache.get(cacheKey) || renderHtml(testDoc);
  }
});

console.log(`With cache: ${cached.time.toFixed(2)}ms`);
console.log(`Speedup: ${(uncached.time / cached.time).toFixed(2)}x`);

console.log('\n\n4. Memory Measurement');
console.log('-'.repeat(50));

const largeDoc = '# Title\n\n'.repeat(1000) + 'Content. '.repeat(1000);
const memResult = measureMemory(largeDoc);

console.log(`Memory used: ${memResult.memoryUsed.toFixed(2)} MB`);
console.log(`Heap before: ${memResult.before.toFixed(2)} MB`);
console.log(`Heap after: ${memResult.after.toFixed(2)} MB`);

console.log('\n\n5. LRU Cache with TTL');
console.log('-'.repeat(50));

const ttlCache = MarkdownCache.createLRUCache(10, 100); // 100ms TTL for demo

ttlCache.set('key1', 'value1');
console.log('Set key1');

// Wait a bit
await new Promise(resolve => setTimeout(resolve, 50));
console.log(`After 50ms - key1 exists: ${ttlCache.has('key1')}`);

// Wait for expiration
await new Promise(resolve => setTimeout(resolve, 100));
console.log(`After 150ms - key1 exists: ${ttlCache.has('key1')} (expired)`);

console.log('\n=== Example Complete ===');
