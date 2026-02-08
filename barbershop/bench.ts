#!/usr/bin/env bun

/**
 * Simple benchmark for testing Progressive Disclosure CLI
 */

export {}; // Make this file a module

console.log('🚀 Starting benchmark...');

// Create a complex nested object that will trigger depth escalation
const complexData = {
  benchmark: {
    name: 'Progressive Disclosure Test',
    version: '1.0.0',
    metadata: {
      timestamp: new Date().toISOString(),
      environment: 'test',
      config: {
        depth: 1,
        timeout: 5000,
        options: {
          verbose: true,
          debug: false,
          advanced: {
            profiling: true,
            memory: {
              limit: '1GB',
              usage: '512MB',
              details: {
                heap: '256MB',
                stack: '128MB',
                code: '128MB'
              }
            }
          }
        }
      }
    },
    results: {
      iterations: 1000,
      duration: 1250,
      operations: [
        { name: 'parse', time: 100 },
        { name: 'process', time: 200 },
        { name: 'serialize', time: 150 }
      ],
      nested: {
        level1: {
          level2: {
            level3: {
              level4: {
                data: 'Deep nested data that should trigger escalation'
              }
            }
          }
        }
      }
    }
  }
};

// Create a circular reference
(complexData.benchmark as any).self = complexData.benchmark;

console.log('📊 Benchmark data created');
console.log('📈 Data structure analysis:');
console.log(`   - Max depth: ${calculateDepth(complexData)}`);
console.log(`   - Has circular references: ${hasCircular(complexData)}`);

// Handle circular reference in size estimation
let sizeEstimate = 0;
try {
  sizeEstimate = JSON.stringify(complexData).length;
} catch (error) {
  sizeEstimate = -1; // Indicates circular reference
}
console.log(`   - Size estimate: ${sizeEstimate >= 0 ? `${sizeEstimate} chars` : 'Circular reference (cannot serialize)'}`);

// Simulate some processing
const start = performance.now();
await new Promise(resolve => setTimeout(resolve, 100));
const end = performance.now();

console.log(`⚡ Processing completed in ${(end - start).toFixed(2)}ms`);
console.log('✅ Benchmark completed successfully');

// Helper functions
function calculateDepth(obj: any, currentDepth = 0): number {
  if (typeof obj !== 'object' || obj === null) return currentDepth;
  
  let maxDepth = currentDepth;
  for (const key in obj) {
    if (currentDepth > 10) return currentDepth; // Prevent infinite recursion
    const depth = calculateDepth(obj[key], currentDepth + 1);
    maxDepth = Math.max(maxDepth, depth);
  }
  return maxDepth;
}

function hasCircular(obj: any, seen = new WeakSet()): boolean {
  if (typeof obj !== 'object' || obj === null) return false;
  
  if (seen.has(obj)) return true;
  seen.add(obj);
  
  for (const key in obj) {
    if (hasCircular(obj[key], seen)) return true;
  }
  
  return false;
}
