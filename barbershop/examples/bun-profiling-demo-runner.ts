#!/usr/bin/env bun
/**
 * Bun Profiling Demo Runner
 * 
 * This script demonstrates how to use Bun's profiling features with markdown output.
 * Run this script with different profiling flags to see the results.
 */

import { writeFileSync } from 'fs';

console.log('🚀 Bun Profiling Demo Runner');
console.log('============================\n');

// Function to create a sample markdown output
function createSampleMarkdownOutput() {
  const timestamp = new Date().toISOString();
  
  const cpuProfileMarkdown = `# CPU Profile Report
Generated: ${timestamp}

## Performance Summary
- Total Time: 1,234ms
- Samples Collected: 5,678
- Top Functions:
  1. \`fibonacci\` - 456ms (37%)
  2. \`arrayOperations\` - 234ms (19%)
  3. \`objectCreation\` - 123ms (10%)

## Call Stack Analysis
\`\`\`
main (100ms)
├── cpuIntensiveTask (1,134ms)
│   ├── fibonacci (456ms)
│   │   ├── fibonacci (234ms)
│   │   └── fibonacci (123ms)
│   ├── arrayOperations (234ms)
│   └── objectCreation (123ms)
└── cleanupTask (50ms)
\`\`\`

## Recommendations
- Consider memoization for fibonacci calculations
- Optimize array operations in loops
- Review object creation patterns
`;

  const heapProfileMarkdown = `# Heap Profile Report
Generated: ${timestamp}

## Memory Summary
- Total Heap Size: 45.6MB
- Used Heap Size: 23.4MB
- Peak Heap Size: 67.8MB
- GC Collections: 12

## Object Distribution
- Arrays: 1,234 objects (15.6MB)
- Objects: 5,678 objects (12.3MB)
- Strings: 2,345 objects (3.4MB)
- Functions: 456 objects (1.2MB)

## Memory Leaks Detected
- Potential leak in \`dataCache\` array (growing steadily)
- Unreleased event listeners in \`eventManager\`
- Large objects retained in closure

## Recommendations
- Implement proper cleanup for dataCache
- Remove event listeners when components unmount
- Review closure references for memory retention
`;

  return { cpuProfileMarkdown, heapProfileMarkdown };
}

// Create sample output files
const { cpuProfileMarkdown, heapProfileMarkdown } = createSampleMarkdownOutput();

// Write sample CPU profile markdown
writeFileSync('sample-cpu-profile.md', cpuProfileMarkdown);
console.log('✅ Created sample-cpu-profile.md');

// Write sample heap profile markdown
writeFileSync('sample-heap-profile.md', heapProfileMarkdown);
console.log('✅ Created sample-heap-profile.md');

// Show usage instructions
console.log('\n📋 Usage Instructions:');
console.log('======================');
console.log('\n🔥 CPU Profiling Commands:');
console.log('# Generate CPU profile in binary format:');
console.log('bun --cpu-prof --cpu-prof-name my-cpu-profile.cpuprofile this-script.ts');
console.log('\n# Generate CPU profile in markdown format:');
console.log('bun --cpu-prof-md --cpu-prof-name my-cpu-profile.md this-script.ts');
console.log('\n# Generate both formats:');
console.log('bun --cpu-prof --cpu-prof-md this-script.ts');

console.log('\n🧠 Heap Profiling Commands:');
console.log('# Generate heap snapshot in binary format:');
console.log('bun --heap-prof --heap-prof-name my-heap-snapshot.heapsnapshot this-script.ts');
console.log('\n# Generate heap snapshot in markdown format:');
console.log('bun --heap-prof-md --heap-prof-name my-heap-snapshot.md this-script.ts');
console.log('\n# Generate both formats:');
console.log('bun --heap-prof --heap-prof-md this-script.ts');

console.log('\n⚙️  Advanced Options:');
console.log('# Custom output directory:');
console.log('bun --cpu-prof-md --cpu-prof-dir ./profiles this-script.ts');
console.log('bun --heap-prof-md --heap-prof-dir ./profiles this-script.ts');

console.log('\n# Using environment variables:');
console.log('BUN_OPTIONS="--cpu-prof-md" bun this-script.ts');
console.log('BUN_OPTIONS="--heap-prof-md" bun this-script.ts');

// Run some actual work to profile
console.log('\n🏃 Running sample workload for profiling...');
console.log('==========================================');

// Simulate some work that would be profiled
function sampleWorkload() {
  const start = performance.now();
  
  // CPU-intensive work
  let result = 0;
  for (let i = 0; i < 1000000; i++) {
    result += Math.sqrt(i);
  }
  
  // Memory-intensive work
  const data: number[][] = [];
  for (let i = 0; i < 1000; i++) {
    data.push(new Array(100).fill(Math.random()));
  }
  
  // Clean up
  data.splice(0, 500);
  
  const end = performance.now();
  console.log(`Workload completed in ${(end - start).toFixed(2)}ms`);
  console.log(`Result: ${result.toFixed(2)}`);
  console.log(`Created ${data.length} arrays`);
}

sampleWorkload();

console.log('\n📊 What the Markdown Output Contains:');
console.log('====================================');
console.log('CPU Profile Markdown:');
console.log('  📈 Performance metrics and timing');
console.log('  🔍 Function call stacks');
console.log('  📊 Percentage breakdown by function');
console.log('  💡 Performance optimization recommendations');
console.log('  📅 Timestamp and metadata');

console.log('\nHeap Profile Markdown:');
console.log('  🧠 Memory usage statistics');
console.log('  📦 Object type distribution');
console.log('  🔍 Memory leak detection');
console.log('  💡 Memory optimization recommendations');
console.log('  📅 GC collection information');

console.log('\n✨ Benefits of Markdown Output:');
console.log('==============================');
console.log('  📖 Human-readable format');
console.log('  🔄 Version control friendly');
console.log('  🤖 LLM-compatible for analysis');
console.log('  📱 Viewable on any device');
console.log('  🔗 Easy to share and document');
console.log('  ⚡ No special tools required');

console.log('\n🎯 Demo completed! Check the generated .md files for examples.');
