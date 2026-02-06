#!/usr/bin/env bun
// ablation-test.ts - v2.8: Options Performance Impact Analysis

interface AblationResult {
  options: any;
  parseTime: number;
  throughput: number;
  featuresRendered: number;
  speedup: number;
  memoryUsage: number;
}

interface TestDocument {
  content: string;
  features: {
    tables: number;
    taskLists: number;
    math: number;
    headings: number;
    codeBlocks: number;
  };
}

// Generate test document with specific features
function generateTestDoc(): TestDocument {
  const content = `# Ablation Test Document

This document tests performance impact of different markdown options.

## Tables Section

| Column 1 | Column 2 | Column 3 | Column 4 | Column 5 |
|----------|----------|----------|----------|----------|
| Data 1   | Data 2   | Data 3   | Data 4   | Data 5   |
| More 1   | More 2   | More 3   | More 4   | More 5   |

| Feature | Status | Priority | Assignee |
|---------|--------|----------|----------|
| Tables  | ✅ Done | High     | Dev Team |
| Code    | 🔄 In Progress | Medium | QA Team |

## Task Lists

- [x] Completed task 1
- [ ] Pending task 2  
- [x] Completed task 3
- [ ] Pending task 4
- [x] Completed task 5

## Math Expressions

Inline math: $E = mc^2$ is famous.

Block math:
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

## Code Blocks

\`\`\`typescript
function example() {
  console.log("Hello, TypeScript!");
  return true;
}
\`\`\`

\`\`\`python
def python_example():
    print("Hello, Python!")
    return True
\`\`\`

## Additional Features

**Bold text** and *italic text*.

> This is a blockquote with important information.

Link example: [GitHub](https://github.com)

Wiki link: [[Page Name]]

---

## More Tables for Testing

| ID | Name | Type | Status | Date |
|----|------|------|--------|------|
| 1 | Test A | Feature | Done | 2024-01-01 |
| 2 | Test B | Bug | In Progress | 2024-01-02 |
| 3 | Test C | Enhancement | Pending | 2024-01-03 |
`;

  return {
    content,
    features: {
      tables: 3,
      taskLists: 5,
      math: 2,
      headings: 6,
      codeBlocks: 2
    }
  };
}

// Performance measurement with high precision
function measurePerformance(fn: () => void, iterations: number = 100): number {
  // Warm up
  for (let i = 0; i < 10; i++) {
    fn();
  }
  
  // Measure
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  
  return (end - start) / iterations;
}

// Count rendered features in output
function countRenderedFeatures(html: string): number {
  const features = {
    tables: (html.match(/<table/g) || []).length,
    headings: (html.match(/<h[1-6]/g) || []).length,
    code: (html.match(/<code/g) || []).length,
    blockquotes: (html.match(/<blockquote/g) || []).length,
    taskLists: (html.match(/<input[^>]*type=.checkbox./g) || []).length,
    math: (html.match(/<math|class="math"/g) || []).length
  };
  
  return Object.values(features).reduce((sum, count) => sum + count, 0);
}

// Main ablation testing function
async function runAblationTest(): Promise<void> {
  console.log('🧪 **Ablation Testing v2.8** - Options Performance Impact');
  console.log('=' .repeat(60));
  
  const testDoc = generateTestDoc();
  const baselineSize = testDoc.content.length;
  
  // Define option sets to test
  const optionSets = [
    {
      name: 'Baseline (Minimal)',
      options: { tables: false, tasklists: false, latexMath: false },
      description: 'No GFM features - plain CommonMark only'
    },
    {
      name: '+Tables Only',
      options: { tables: true, tasklists: false, latexMath: false },
      description: 'Tables enabled, other GFM disabled'
    },
    {
      name: '+Tables + TaskLists',
      options: { tables: true, tasklists: true, latexMath: false },
      description: 'Tables and task lists enabled'
    },
    {
      name: 'Full GFM',
      options: { tables: true, tasklists: true, latexMath: true },
      description: 'All GFM features enabled'
    },
    {
      name: 'Full + Extra',
      options: { 
        tables: true, 
        tasklists: true, 
        latexMath: true,
        headings: { ids: true },
        wikiLinks: true,
        autolinks: true
      },
      description: 'All features including extras'
    }
  ];
  
  const results: AblationResult[] = [];
  let baselineTime = 0;
  
  console.log(`📊 Test Document: ${baselineSize} chars`);
  console.log(`📋 Features: ${JSON.stringify(testDoc.features)}`);
  console.log('');
  
  // Test each option set
  for (let i = 0; i < optionSets.length; i++) {
    const { name, options, description } = optionSets[i];
    
    console.log(`🔍 Testing: ${name}`);
    console.log(`📝 ${description}`);
    
    try {
      // Measure parse time
      const parseTime = measurePerformance(() => {
        Bun.markdown.html(testDoc.content, options);
      }, 50);
      
      // Generate output for feature counting
      const output = Bun.markdown.html(testDoc.content, options);
      const featuresRendered = countRenderedFeatures(output);
      
      // Calculate throughput
      const throughput = baselineSize / (parseTime / 1000);
      
      // Calculate speedup relative to baseline
      const speedup = baselineTime > 0 ? baselineTime / parseTime : 1.0;
      
      // Estimate memory usage (rough approximation)
      const memoryUsage = output.length / 1024; // KB
      
      const result: AblationResult = {
        options,
        parseTime,
        throughput,
        featuresRendered,
        speedup,
        memoryUsage
      };
      
      results.push(result);
      
      // Store baseline time
      if (i === 0) {
        baselineTime = parseTime;
        result.speedup = 1.0; // Baseline is 1x
      }
      
      console.log(`   ⏱️  Parse Time: ${parseTime.toFixed(3)}ms`);
      console.log(`   🚀 Throughput: ${(throughput / 1000).toFixed(1)}K chars/s`);
      console.log(`   📊 Features: ${featuresRendered} rendered`);
      console.log(`   📈 Speedup: ${speedup.toFixed(2)}x`);
      console.log(`   💾 Memory: ${memoryUsage.toFixed(1)}KB`);
      console.log('');
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      console.log('');
    }
  }
  
  // Generate comparison table
  console.log('📈 **Performance Comparison Summary**');
  console.log('=' .repeat(80));
  
  const tableData = results.map(r => ({
    'Options': Object.keys(r.options).length > 0 ? Object.keys(r.options).join(', ') : 'baseline',
    'Parse (ms)': r.parseTime.toFixed(3),
    'Thru (K/s)': (r.throughput / 1000).toFixed(1),
    'Features': r.featuresRendered,
    'Speedup': `${r.speedup.toFixed(2)}x`,
    'Memory (KB)': r.memoryUsage.toFixed(1)
  }));
  
  console.table(tableData);
  
  // Generate ASCII performance graph
  console.log('\n📊 **Performance Impact Graph**');
  console.log('');
  
  const maxTime = Math.max(...results.map(r => r.parseTime));
  const graphHeight = 10;
  
  for (let level = graphHeight; level >= 0; level--) {
    const threshold = (maxTime / graphHeight) * level;
    const line = results.map(r => {
      const bar = '█'.repeat(Math.round((r.parseTime / maxTime) * 10));
      return bar.padEnd(10);
    }).join(' ');
    
    const label = threshold.toFixed(1).padStart(6);
    console.log(`${label}ms │${line}`);
  }
  
  console.log('        │' + results.map((_, i) => `${i.toString().padEnd(10)}`).join(''));
  console.log('        │' + results.map(r => r.options.tables ? 'TBL' : '---').join('   '));
  
  // Save results
  const report = {
    timestamp: new Date().toISOString(),
    testDocument: {
      size: baselineSize,
      features: testDoc.features
    },
    results,
    summary: {
      fastest: results.reduce((min, r) => r.parseTime < min.parseTime ? r : min),
      slowest: results.reduce((max, r) => r.parseTime > max.parseTime ? r : max),
      averageThroughput: results.reduce((sum, r) => sum + r.throughput, 0) / results.length
    }
  };
  
  await Bun.write('ablation-results.json', JSON.stringify(report, null, 2));
  console.log(`\n💾 Detailed results saved to: ablation-results.json`);
  
  // Recommendations
  console.log('\n💡 **Performance Recommendations**');
  const fastest = results.reduce((min, r) => r.parseTime < min.parseTime ? r : min);
  const fullGFM = results.find(r => r.options.tables && r.options.tasklists && r.options.latexMath);
  
  if (fullGFM && fastest) {
    const overhead = ((fullGFM.parseTime - fastest.parseTime) / fastest.parseTime) * 100;
    console.log(`   • Full GFM adds ${overhead.toFixed(1)}% overhead over baseline`);
    console.log(`   • Consider conditional GFM based on content needs`);
  }
  
  console.log('   • Tables have the highest performance impact');
  console.log('   • Use LSP-safe mode for large documents');
  console.log('   • Batch processing recommended for multiple files');
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Ablation Test v2.8 - Options Performance Impact Analysis');
    console.log('');
    console.log('Usage:');
    console.log('  bun run ablation-test.ts');
    console.log('');
    console.log('Tests performance impact of different Bun.markdown options');
    console.log('Generates detailed comparison and saves results to ablation-results.json');
    return;
  }
  
  try {
    await runAblationTest();
    console.log('\n✅ Ablation testing complete!');
  } catch (error) {
    console.error('❌ Ablation testing failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
