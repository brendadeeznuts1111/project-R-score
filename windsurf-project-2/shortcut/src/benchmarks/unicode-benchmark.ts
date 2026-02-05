#!/usr/bin/env bun

import { GraphemeClusterer, GraphemeUtils } from '../core/unicode/grapheme';
import { UnicodeValidator } from '../core/unicode/validation';

async function runBenchmarks() {
  console.log('Running Unicode Performance Benchmarks...\n');
  
  const clusterer = new GraphemeClusterer();
  const validator = new UnicodeValidator();
  
  // Test data
  const testCases = [
    {
      name: 'Simple ASCII',
      text: 'The quick brown fox jumps over the lazy dog',
      iterations: 10000
    },
    {
      name: 'Emoji Heavy',
      text: '🎉 🚀 🌟 📊 🎨 🔧 ⚡ 🛠️ 💡 🔍 📈 🎯',
      iterations: 5000
    },
    {
      name: 'Complex Unicode',
      text: 'Hello 世界 🌍 👨‍👩‍👧‍👦 café résumé naïve piñata',
      iterations: 2000
    },
    {
      name: 'Zalgo Text',
      text: 'Z̴͙̰̔̇̀̊̇͒̀͝Ä̸̻̲̲͙̰̺̞͇̦̬̝́̋̃̈́̓̄̏͆̌̔͘͝L̸̨̡͕̼̬̞̗̦̓̿̂͌̔̉͝Ǵ̵̢̨̛͚̭̞̙̺̗̰͖̱͈̓̈́̊̈́̋̚Ô̷̬̲̝̼͇̟̘͚̰̪̲͙̝̽̏͒͒̿̆̏͋ͅ',
      iterations: 1000
    }
  ];
  
  // Benchmark functions
  const benchmarks = [
    {
      name: 'Grapheme Clustering',
      fn: (text: string) => clusterer.getClusters(text)
    },
    {
      name: 'Cluster Length',
      fn: (text: string) => clusterer.getClusterLength(text)
    },
    {
      name: 'Visual Width',
      fn: (text: string) => clusterer.getVisualWidth(text)
    },
    {
      name: 'Emoji Detection',
      fn: (text: string) => clusterer.isEmoji(text)
    },
    {
      name: 'Unicode Validation',
      fn: (text: string) => validator.validateShortcutText(text, 'description')
    },
    {
      name: 'Text Normalization',
      fn: (text: string) => validator.normalizeForStorage(text, 'description')
    }
  ];
  
  const results: Record<string, any> = {};
  
  for (const testCase of testCases) {
    console.log(`\n=== ${testCase.name} ===`);
    console.log(`Text: ${testCase.text.substring(0, 30)}...`);
    console.log(`Length: ${testCase.text.length} chars`);
    console.log(`Clusters: ${clusterer.getClusterLength(testCase.text)} graphemes`);
    console.log(`Iterations: ${testCase.iterations}`);
    
    results[testCase.name] = {};
    
    for (const benchmark of benchmarks) {
      // Warm up
      for (let i = 0; i < 100; i++) {
        benchmark.fn(testCase.text);
      }
      
      // Run benchmark
      const start = performance.now();
      for (let i = 0; i < testCase.iterations; i++) {
        benchmark.fn(testCase.text);
      }
      const end = performance.now();
      const duration = end - start;
      const opsPerSecond = (testCase.iterations / duration) * 1000;
      
      results[testCase.name][benchmark.name] = {
        duration: `${duration.toFixed(2)}ms`,
        opsPerSecond: `${opsPerSecond.toFixed(0)} ops/sec`,
        perOperation: `${(duration / testCase.iterations).toFixed(4)}ms` 
      };
      
      console.log(`  ${benchmark.name}: ${opsPerSecond.toFixed(0)} ops/sec`);
    }
  }
  
  // Memory usage
  console.log('\n=== Memory Usage ===');
  const memory = process.memoryUsage();
  console.log(`RSS: ${(memory.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Heap Total: ${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Heap Used: ${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  
  // Unicode capability report
  console.log('\n=== Unicode Capabilities ===');
  const unicodeInfo = GraphemeUtils.getUnicodeInfo();
  console.log(`Unicode Version: ${unicodeInfo.version}`);
  console.log(`Intl.Segmenter: ${unicodeInfo.hasSegmenter ? 'Available ✓' : 'Not Available ✗'}`);
  console.log(`Normalization: ${unicodeInfo.hasNormalization ? 'Available ✓' : 'Not Available ✗'}`);
  
  return results;
}

// Run benchmarks
if (import.meta.main) {
  runBenchmarks().then(results => {
    console.log('\n=== Benchmark Complete ===');
    
    // Save results to file
    const fs = require('fs');
    fs.writeFileSync(
      './benchmark-results.json',
      JSON.stringify(results, null, 2)
    );
    
    console.log('Results saved to benchmark-results.json');
  });
}
