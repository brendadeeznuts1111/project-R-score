#!/usr/bin/env bun
/**
 * Bun Markdown Output Benchmarking Demo
 * 
 * This script demonstrates Bun's markdown output capabilities for CPU and heap profiling.
 * Based on https://bun.com/docs/project/benchmarking#markdown-output
 */

console.log('🔍 Bun Markdown Output Benchmarking Demo');
console.log('==========================================\n');

// Example 1: CPU Profiling with Markdown Output
console.log('📊 CPU Profiling with Markdown Output:');
console.log('Command: bun --cpu-prof-md script.js');
console.log('Generates: CPU profile in Markdown format\n');

// Simulate some CPU-intensive work for profiling
function cpuIntensiveTask() {
  const start = performance.now();
  let result = 0;
  
  // Fibonacci calculation for CPU load
  function fibonacci(n: number): number {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
  }
  
  // Calculate multiple Fibonacci numbers
  for (let i = 30; i <= 35; i++) {
    result += fibonacci(i);
    console.log(`  Calculated fibonacci(${i}) = ${fibonacci(i)}`);
  }
  
  const end = performance.now();
  console.log(`  CPU task completed in ${(end - start).toFixed(2)}ms`);
  return result;
}

// Example 2: Heap Profiling with Markdown Output
console.log('🧠 Heap Profiling with Markdown Output:');
console.log('Command: bun --heap-prof-md script.js');
console.log('Generates: Heap snapshot in Markdown format\n');

// Simulate memory-intensive work for heap profiling
function memoryIntensiveTask() {
  const arrays: number[][] = [];
  const objects: any[] = [];
  
  console.log('  Creating memory pressure...');
  
  // Create arrays to consume memory
  for (let i = 0; i < 100; i++) {
    arrays.push(new Array(1000).fill(Math.random()));
  }
  
  // Create objects to consume memory
  for (let i = 0; i < 1000; i++) {
    objects.push({
      id: i,
      data: new Array(100).fill(Math.random()),
      timestamp: Date.now(),
      metadata: {
        type: 'benchmark',
        version: '1.0.0',
        tags: ['memory', 'test', 'profiling']
      }
    });
  }
  
  console.log(`  Created ${arrays.length} arrays and ${objects.length} objects`);
  console.log(`  Estimated memory usage: ${(JSON.stringify(arrays).length + JSON.stringify(objects).length / 1024 / 1024).toFixed(2)}MB`);
  
  // Clean up some memory
  arrays.splice(0, 50);
  objects.splice(0, 500);
  console.log('  Cleaned up ~50% of allocated memory');
  
  return { arrays, objects };
}

// Example 3: Combined Profiling Options
console.log('⚙️  Combined Profiling Options:');
console.log('Command: bun --cpu-prof --cpu-prof-md script.js');
console.log('Command: bun --heap-prof --heap-prof-md script.js');
console.log('Options:');
console.log('  --cpu-prof-name <filename>  - Custom profile name');
console.log('  --cpu-prof-dir <dir>       - Custom output directory');
console.log('  --heap-prof-name <filename> - Custom heap snapshot name');
console.log('  --heap-prof-dir <dir>      - Custom heap output directory\n');

// Example 4: Environment Variable Usage
console.log('🌍 Environment Variable Usage:');
console.log('BUN_OPTIONS="--cpu-prof-md" bun script.js');
console.log('BUN_OPTIONS="--heap-prof-md" bun script.js\n');

// Run the benchmarking tasks
console.log('🚀 Running Benchmarking Tasks:');
console.log('==============================\n');

console.log('1️⃣ Running CPU-intensive task...');
const cpuResult = cpuIntensiveTask();
console.log(`CPU Result: ${cpuResult}\n`);

console.log('2️⃣ Running memory-intensive task...');
const memoryResult = memoryIntensiveTask();
console.log(`Memory Result: ${memoryResult.arrays.length} arrays, ${memoryResult.objects.length} objects\n`);

// Example 5: Custom profiling configuration
console.log('📋 Custom Profiling Configuration:');
console.log('----------------------------------');

// This would be the actual command to run:
console.log('# For CPU profiling with custom settings:');
console.log('bun --cpu-prof --cpu-prof-name my-cpu-profile.cpuprofile --cpu-prof-dir ./profiles script.js');
console.log('bun --cpu-prof-md --cpu-prof-name my-cpu-profile.md --cpu-prof-dir ./profiles script.js\n');

console.log('# For heap profiling with custom settings:');
console.log('bun --heap-prof --heap-prof-name my-heap-snapshot.heapsnapshot --heap-prof-dir ./profiles script.js');
console.log('bun --heap-prof-md --heap-prof-name my-heap-snapshot.md --heap-prof-dir ./profiles script.js\n');

// Example 6: Output file formats
console.log('📄 Output File Formats:');
console.log('-----------------------');
console.log('CPU Profiling:');
console.log('  --cpu-prof     : Generates .cpuprofile file (binary format)');
console.log('  --cpu-prof-md  : Generates .md file (markdown format)\n');
console.log('Heap Profiling:');
console.log('  --heap-prof     : Generates .heapsnapshot file (binary format)');
console.log('  --heap-prof-md  : Generates .md file (markdown format)\n');

// Example 7: Integration with existing tools
console.log('🔗 Integration with Existing Tools:');
console.log('-----------------------------------');
console.log('Markdown output can be:');
console.log('  ✅ Viewed directly in any markdown viewer');
console.log('  ✅ Committed to version control');
console.log('  ✅ Shared in documentation');
console.log('  ✅ Processed by LLMs for analysis');
console.log('  ✅ Converted to other formats (HTML, PDF)');
console.log('  ✅ Integrated into CI/CD pipelines\n');

// Example 8: Best practices
console.log('💡 Best Practices:');
console.log('------------------');
console.log('1. Use --cpu-prof-md for sharing CPU profiles in documentation');
console.log('2. Use --heap-prof-md for memory analysis in pull requests');
console.log('3. Combine with --cpu-prof-name for descriptive filenames');
console.log('4. Use --cpu-prof-dir to organize profiles by date or feature');
console.log('5. Set BUN_OPTIONS for consistent profiling across environments\n');

console.log('✅ Benchmarking demo completed!');
console.log('\n📖 For more information, visit: https://bun.com/docs/project/benchmarking#markdown-output');
