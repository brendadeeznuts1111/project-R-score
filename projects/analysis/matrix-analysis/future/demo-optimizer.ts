#!/usr/bin/env bun
// future/demo-optimizer.ts

import { PredictiveOptimizer, AdvancedPredictiveOptimizer, OptimizerUtils } from './predictive-optimizer';

// Sample code snippets for testing
const sampleCode = {
  legacyCallbacks: `
function fetchData(callback) {
  fetch('/api/data')
    .then(response => response.json())
    .then(data => callback(null, data))
    .catch(error => callback(error));
}
  `,
  
  modernAsync: `
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}
  `,
  
  bunOptimized: `
import { Bun } from 'bun';

async function processData() {
  const file = Bun.file('data.json');
  const data = await file.json();
  
  await Bun.write('output.json', data);
  
  const server = Bun.serve({
    port: 3000,
    fetch(req) {
      return new Response('Hello World');
    }
  });
}
  `,
  
  webGPUReady: `
// GPU-accelerated image processing
async function processImage(imageData: Uint8Array) {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  
  // SIMD operations for image processing
  const processed = await imageProcessor.simdTransform(imageData);
  
  return processed;
}
  `
};

// Demo function
async function runOptimizerDemo() {
  console.log('🔮 Predictive Optimizer Demo\n');
  
  const optimizer = new PredictiveOptimizer();
  const advancedOptimizer = new AdvancedPredictiveOptimizer();
  
  for (const [name, code] of Object.entries(sampleCode)) {
    console.log(`📊 Analyzing: ${name}`);
    console.log('='.repeat(50));
    
    // Basic analysis
    const basicReport = optimizer.analyze(code);
    console.log(`Future Compatibility Score: ${basicReport.futureScore}/100`);
    
    // Advanced analysis
    const advancedReport = advancedOptimizer.analyzeBunPatterns(code);
    console.log(`Bun Optimization Score: ${advancedReport.bunScore}/100`);
    
    // Show recommendations
    if (basicReport.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      basicReport.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }
    
    if (advancedReport.bunRecommendations.length > 0) {
      console.log('\n🚀 Bun-Specific Recommendations:');
      advancedReport.bunRecommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }
    
    // Optimize the code
    console.log('\n⚡ Optimized Code:');
    const optimized = advancedOptimizer.optimizeForBunFuture(code);
    console.log(optimized.trim());
    
    console.log('\n' + '='.repeat(80) + '\n');
  }
  
  // Test utility functions
  console.log('🛠️  Utility Functions Demo');
  console.log('='.repeat(50));
  
  const testCode = sampleCode.bunOptimized;
  const report = advancedOptimizer.analyzeBunPatterns(testCode);
  
  console.log(OptimizerUtils.createSummary(report));
  
  const suggestions = OptimizerUtils.generateSuggestions(report);
  if (suggestions.length > 0) {
    console.log('\n📝 Additional Suggestions:');
    suggestions.forEach(suggestion => {
      console.log(`  • ${suggestion}`);
    });
  }
}

// Performance benchmark
async function benchmarkOptimizer() {
  console.log('\n⏱️  Performance Benchmark');
  console.log('='.repeat(50));
  
  const optimizer = new PredictiveOptimizer();
  const testCode = sampleCode.bunOptimized;
  const iterations = 1000;
  
  console.log(`Running ${iterations} optimizations...`);
  
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    optimizer.analyze(testCode);
    optimizer.optimizeForFuture(testCode);
  }
  
  const end = performance.now();
  const duration = end - start;
  
  console.log(`✅ Completed in ${duration.toFixed(2)}ms`);
  console.log(`📈 Average: ${(duration / iterations).toFixed(4)}ms per operation`);
  console.log(`🚀 Throughput: ${(iterations / duration * 1000).toFixed(0)} operations/second`);
}

// Run the demo
if (import.meta.main) {
  await runOptimizerDemo();
  await benchmarkOptimizer();
}

export { runOptimizerDemo, benchmarkOptimizer };
