#!/usr/bin/env bun
/**
 * Bun Markdown Output Benchmarking Demo
 * 
 * This script demonstrates Bun's markdown output capabilities for CPU and heap profiling.
 * Based on https://bun.com/docs/project/benchmarking#markdown-output
 */

console.info('🔍 Bun Markdown Output Benchmarking Demo');
console.info('==========================================\n');

// Example 1: CPU Profiling with Markdown Output
console.info('📊 CPU Profiling with Markdown Output:');
console.info('Command: bun --cpu-prof-md script.js');
console.info('Generates: CPU profile in Markdown format\n');

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
    console.info(`  Calculated fibonacci(${i}) = ${fibonacci(i)}`);
  }
  
  const end = performance.now();
  console.info(`  CPU task completed in ${(end - start).toFixed(2)}ms`);
  return result;
}

// Example 2: Heap Profiling with Markdown Output
console.info('🧠 Heap Profiling with Markdown Output:');
console.info('Command: bun --heap-prof-md script.js');
console.info('Generates: Heap snapshot in Markdown format\n');

// Simulate memory-intensive work for heap profiling
function memoryIntensiveTask() {
  const arrays: number[][] = [];
  const objects: any[] = [];
  
  console.info('  Creating memory pressure...');
  
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
  
  console.info(`  Created ${arrays.length} arrays and ${objects.length} objects`);
  console.info(`  Estimated memory usage: ${(JSON.stringify(arrays).length + JSON.stringify(objects).length / 1024 / 1024).toFixed(2)}MB`);
  
  // Clean up some memory
  arrays.splice(0, 50);
  objects.splice(0, 500);
  console.info('  Cleaned up ~50% of allocated memory');
  
  return { arrays, objects };
}

// Example 3: Combined Profiling Options
console.info('⚙️  Combined Profiling Options:');
console.info('Command: bun --cpu-prof --cpu-prof-md script.js');
console.info('Command: bun --heap-prof --heap-prof-md script.js');
console.info('Options:');
console.info('  --cpu-prof-name <filename>  - Custom profile name');
console.info('  --cpu-prof-dir <dir>       - Custom output directory');
console.info('  --heap-prof-name <filename> - Custom heap snapshot name');
console.info('  --heap-prof-dir <dir>      - Custom heap output directory\n');

// Example 4: Environment Variable Usage
console.info('🌍 Environment Variable Usage:');
console.info('BUN_OPTIONS="--cpu-prof-md" bun script.js');
console.info('BUN_OPTIONS="--heap-prof-md" bun script.js\n');

// Run the benchmarking tasks
console.info('🚀 Running Benchmarking Tasks:');
console.info('==============================\n');

console.info('1️⃣ Running CPU-intensive task...');
const cpuResult = cpuIntensiveTask();
console.info(`CPU Result: ${cpuResult}\n`);

console.info('2️⃣ Running memory-intensive task...');
const memoryResult = memoryIntensiveTask();
console.info(`Memory Result: ${memoryResult.arrays.length} arrays, ${memoryResult.objects.length} objects\n`);

// Example 5: Custom profiling configuration
console.info('📋 Custom Profiling Configuration:');
console.info('----------------------------------');

// This would be the actual command to run:
console.info('# For CPU profiling with custom settings:');
console.info('bun --cpu-prof --cpu-prof-name my-cpu-profile.cpuprofile --cpu-prof-dir ./profiles script.js');
console.info('bun --cpu-prof-md --cpu-prof-name my-cpu-profile.md --cpu-prof-dir ./profiles script.js\n');

console.info('# For heap profiling with custom settings:');
console.info('bun --heap-prof --heap-prof-name my-heap-snapshot.heapsnapshot --heap-prof-dir ./profiles script.js');
console.info('bun --heap-prof-md --heap-prof-name my-heap-snapshot.md --heap-prof-dir ./profiles script.js\n');

// Example 6: Output file formats
console.info('📄 Output File Formats:');
console.info('-----------------------');
console.info('CPU Profiling:');
console.info('  --cpu-prof     : Generates .cpuprofile file (binary format)');
console.info('  --cpu-prof-md  : Generates .md file (markdown format)\n');
console.info('Heap Profiling:');
console.info('  --heap-prof     : Generates .heapsnapshot file (binary format)');
console.info('  --heap-prof-md  : Generates .md file (markdown format)\n');

// Example 7: Integration with existing tools
console.info('🔗 Integration with Existing Tools:');
console.info('-----------------------------------');
console.info('Markdown output can be:');
console.info('  ✅ Viewed directly in any markdown viewer');
console.info('  ✅ Committed to version control');
console.info('  ✅ Shared in documentation');
console.info('  ✅ Processed by LLMs for analysis');
console.info('  ✅ Converted to other formats (HTML, PDF)');
console.info('  ✅ Integrated into CI/CD pipelines\n');

// Example 8: Best practices
console.info('💡 Best Practices:');
console.info('------------------');
console.info('1. Use --cpu-prof-md for sharing CPU profiles in documentation');
console.info('2. Use --heap-prof-md for memory analysis in pull requests');
console.info('3. Combine with --cpu-prof-name for descriptive filenames');
console.info('4. Use --cpu-prof-dir to organize profiles by date or feature');
console.info('5. Set BUN_OPTIONS for consistent profiling across environments\n');

console.info('✅ Benchmarking demo completed!');
console.info('\n📖 For more information, visit: https://bun.com/docs/project/benchmarking#markdown-output');
