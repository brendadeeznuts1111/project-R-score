#!/usr/bin/env bun
// memory-usage-demo.ts - v2.8: Complete Memory Usage Analysis

import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

interface MemorySnapshot {
  timestamp: number;
  rss: number;      // Resident Set Size
  heapUsed: number; // Used heap memory
  heapTotal: number; // Total heap size
  external: number; // External memory
  arrayBuffers: number; // Array buffer memory
}

interface MemoryTestResult {
  testName: string;
  description: string;
  snapshots: MemorySnapshot[];
  peakMemory: number;
  memoryGrowth: number;
  executionTime: number;
  leaks: number;
  recommendations: string[];
}

class MemoryUsageDemo {
  private results: MemoryTestResult[] = [];
  private baselineMemory: MemorySnapshot | null = null;

  // 🧠 Get current memory snapshot
  private getMemorySnapshot(): MemorySnapshot {
    const mem = process.memoryUsage();
    return {
      timestamp: performance.now(),
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers
    };
  }

  // 📊 Format memory size for display
  private formatMemory(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  // 🚀 Run memory-intensive test scenarios
  async demonstrateMemoryUsage(): Promise<void> {
    console.log('🧠 Bun Test Memory Usage Analysis');
    console.log('=================================');
    console.log('📊 Analyzing memory patterns across different test scenarios...\n');

    // Establish baseline
    this.baselineMemory = this.getMemorySnapshot();
    console.log(`📈 Baseline Memory: ${this.formatMemory(this.baselineMemory.heapUsed)}`);

    // Create test files for different memory scenarios
    await this.createMemoryTestFiles();

    // Test different memory usage patterns
    const memoryTests = [
      {
        name: 'basic-tests',
        description: 'Basic test operations',
        file: 'memory-basic.test.ts'
      },
      {
        name: 'memory-allocation',
        description: 'Large memory allocation',
        file: 'memory-allocation.test.ts'
      },
      {
        name: 'memory-leaks',
        description: 'Potential memory leaks',
        file: 'memory-leaks.test.ts'
      },
      {
        name: 'concurrent-tests',
        description: 'Concurrent test execution',
        file: 'memory-concurrent.test.ts'
      },
      {
        name: 'cleanup-tests',
        description: 'Memory cleanup patterns',
        file: 'memory-cleanup.test.ts'
      }
    ];

    for (const test of memoryTests) {
      await this.runMemoryTest(test.name, test.description, test.file);
    }

    // Generate comprehensive analysis
    this.generateMemoryAnalysis();
  }

  // 📁 Create memory test files
  private async createMemoryTestFiles(): Promise<void> {
    console.log('📁 Creating memory test files...');

    // Basic tests
    writeFileSync('memory-basic.test.ts', `
import { test, describe, expect } from 'bun:test';

describe('Basic Memory Tests', () => {
  test('simple assertion', () => {
    expect(1 + 1).toBe(2);
  });

  test('array operations', () => {
    const arr = Array.from({ length: 1000 }, (_, i) => i);
    expect(arr.length).toBe(1000);
  });

  test('object creation', () => {
    const obj = { data: new Array(100).fill('test') };
    expect(obj.data.length).toBe(100);
  });
});
`);

    // Memory allocation tests
    writeFileSync('memory-allocation.test.ts', `
import { test, describe, expect } from 'bun:test';

describe('Memory Allocation Tests', () => {
  test('large array allocation', () => {
    const largeArray = new Array(100000).fill(0).map((_, i) => ({
      id: i,
      data: 'x'.repeat(100)
    }));
    expect(largeArray.length).toBe(100000);
  });

  test('buffer allocation', () => {
    const buffer = new ArrayBuffer(1024 * 1024); // 1MB
    const view = new Uint8Array(buffer);
    expect(view.length).toBe(1024 * 1024);
  });

  test('string operations', () => {
    const largeString = 'x'.repeat(1000000);
    expect(largeString.length).toBe(1000000);
  });
});
`);

    // Memory leak tests
    writeFileSync('memory-leaks.test.ts', `
import { test, describe, expect } from 'bun:test';

describe('Memory Leak Tests', () => {
  const leakyData: any[] = [];

  test('potential leak - global array', () => {
    for (let i = 0; i < 10000; i++) {
      leakyData.push({
        id: i,
        data: new Array(100).fill(i),
        timestamp: Date.now()
      });
    }
    expect(leakyData.length).toBe(10000);
  });

  test('potential leak - closures', () => {
    const closures = [];
    for (let i = 0; i < 1000; i++) {
      closures.push(() => {
        return new Array(1000).fill(i);
      });
    }
    expect(closures.length).toBe(1000);
  });

  test('potential leak - event listeners', () => {
    const events = new Map();
    for (let i = 0; i < 1000; i++) {
      events.set(\`event-\${i}\`, () => {
        console.log('Event', i);
      });
    }
    expect(events.size).toBe(1000);
  });
});
`);

    // Concurrent tests
    writeFileSync('memory-concurrent.test.ts', `
import { test, describe, expect } from 'bun:test';

describe('Concurrent Memory Tests', () => {
  test('concurrent promises', async () => {
    const promises = Array.from({ length: 100 }, async (_, i) => {
      const data = new Array(1000).fill(i);
      await new Promise(resolve => setTimeout(resolve, 1));
      return data.length;
    });
    
    const results = await Promise.all(promises);
    expect(results.every(r => r === 1000)).toBe(true);
  });

  test('parallel array operations', async () => {
    const operations = Array.from({ length: 50 }, async (_, i) => {
      const arr = new Array(10000).fill(i);
      return arr.reduce((sum, val) => sum + val, 0);
    });
    
    const results = await Promise.all(operations);
    expect(results.length).toBe(50);
  });
});
`);

    // Cleanup tests
    writeFileSync('memory-cleanup.test.ts', `
import { test, describe, expect } from 'bun:test';

describe('Memory Cleanup Tests', () => {
  test('proper cleanup - scoped variables', () => {
    {
      const largeData = new Array(100000).fill('cleanup test');
      expect(largeData.length).toBe(100000);
    } // largeData should be eligible for GC here
  });

  test('proper cleanup - null assignment', () => {
    let largeData = new Array(100000).fill('null test');
    expect(largeData.length).toBe(100000);
    largeData = null; // Explicit cleanup
    expect(largeData).toBeNull();
  });

  test('proper cleanup - map clearing', () => {
    const largeMap = new Map();
    for (let i = 0; i < 10000; i++) {
      largeMap.set(i, new Array(100).fill(i));
    }
    expect(largeMap.size).toBe(10000);
    largeMap.clear(); // Clear the map
    expect(largeMap.size).toBe(0);
  });
});
`);

    console.log('✅ Memory test files created\n');
  }

  // 🧪 Run individual memory test with monitoring
  private async runMemoryTest(testName: string, description: string, testFile: string): Promise<void> {
    console.log(`🧪 Testing ${testName}: ${description}`);

    const snapshots: MemorySnapshot[] = [];
    const startTime = performance.now();

    return new Promise((resolve) => {
      const testProcess = spawn('bun', ['test', testFile], {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
      });

      // Start memory monitoring
      const memoryInterval = setInterval(() => {
        snapshots.push(this.getMemorySnapshot());
      }, 100);

      let output = '';

      testProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });

      testProcess.stderr?.on('data', (data) => {
        output += data.toString();
      });

      testProcess.on('close', (code, signal) => {
        clearInterval(memoryInterval);
        
        // Final snapshot
        snapshots.push(this.getMemorySnapshot());
        
        const executionTime = performance.now() - startTime;
        const analysis = this.analyzeMemorySnapshots(snapshots, testName, output);
        
        this.results.push({
          testName,
          description,
          snapshots,
          peakMemory: analysis.peakMemory,
          memoryGrowth: analysis.memoryGrowth,
          executionTime,
          leaks: analysis.leaks,
          recommendations: analysis.recommendations
        });

        console.log(`   Peak Memory: ${this.formatMemory(analysis.peakMemory)}`);
        console.log(`   Memory Growth: ${this.formatMemory(analysis.memoryGrowth)}`);
        console.log(`   Execution Time: ${executionTime.toFixed(2)}ms`);
        console.log(`   Potential Leaks: ${analysis.leaks}`);
        console.log('');

        resolve();
      });

      // Safety timeout
      setTimeout(() => {
        if (!testProcess.killed) {
          testProcess.kill('SIGTERM');
        }
      }, 30000);
    });
  }

  // 📊 Analyze memory snapshots
  private analyzeMemorySnapshots(snapshots: MemorySnapshot[], testName: string, output: string): any {
    if (snapshots.length === 0) {
      return {
        peakMemory: 0,
        memoryGrowth: 0,
        leaks: 0,
        recommendations: ['No memory data available']
      };
    }

    const heapUsages = snapshots.map(s => s.heapUsed);
    const peakMemory = Math.max(...heapUsages);
    const initialMemory = heapUsages[0];
    const finalMemory = heapUsages[heapUsages.length - 1];
    const memoryGrowth = finalMemory - initialMemory;

    // Detect potential leaks based on patterns
    let leaks = 0;
    const recommendations: string[] = [];

    // Check for continuous memory growth
    let consecutiveGrowth = 0;
    for (let i = 1; i < heapUsages.length; i++) {
      if (heapUsages[i] > heapUsages[i - 1]) {
        consecutiveGrowth++;
      } else {
        consecutiveGrowth = 0;
      }
      
      if (consecutiveGrowth > 5) {
        leaks++;
        consecutiveGrowth = 0;
      }
    }

    // Generate recommendations based on patterns
    if (memoryGrowth > 10 * 1024 * 1024) { // 10MB
      recommendations.push('High memory growth detected - consider cleanup');
    }

    if (peakMemory > 100 * 1024 * 1024) { // 100MB
      recommendations.push('High peak memory usage - optimize data structures');
    }

    if (leaks > 0) {
      recommendations.push(`${leaks} potential memory leak(s) detected`);
    }

    if (testName.includes('leak')) {
      recommendations.push('Review global variables and closures for proper cleanup');
    }

    if (testName.includes('concurrent')) {
      recommendations.push('Monitor memory usage during concurrent operations');
    }

    if (recommendations.length === 0) {
      recommendations.push('Memory usage appears normal');
    }

    return {
      peakMemory,
      memoryGrowth,
      leaks,
      recommendations
    };
  }

  // 📈 Generate comprehensive memory analysis
  private generateMemoryAnalysis(): void {
    console.log('📈 Memory Usage Analysis Report');
    console.log('==============================');

    // Summary table
    console.log('\n📊 Memory Usage Summary:');
    console.table(this.results.map(r => ({
      Test: r.testName,
      'Peak Memory': this.formatMemory(r.peakMemory),
      'Memory Growth': this.formatMemory(r.memoryGrowth),
      'Time (ms)': r.executionTime.toFixed(2),
      'Leaks': r.leaks
    })));

    // Detailed analysis
    console.log('\n🔍 Detailed Memory Analysis:');
    
    this.results.forEach(result => {
      console.log(`\n${result.testName}:`);
      console.log(`  Description: ${result.description}`);
      console.log(`  Peak Memory: ${this.formatMemory(result.peakMemory)}`);
      console.log(`  Memory Growth: ${this.formatMemory(result.memoryGrowth)}`);
      console.log(`  Execution Time: ${result.executionTime.toFixed(2)}ms`);
      console.log(`  Potential Leaks: ${result.leaks}`);
      
      if (result.recommendations.length > 0) {
        console.log(`  Recommendations:`);
        result.recommendations.forEach(rec => {
          console.log(`    • ${rec}`);
        });
      }
    });

    // Overall statistics
    console.log('\n📊 Overall Statistics:');
    const totalPeakMemory = this.results.reduce((sum, r) => sum + r.peakMemory, 0);
    const avgPeakMemory = totalPeakMemory / this.results.length;
    const maxPeakMemory = Math.max(...this.results.map(r => r.peakMemory));
    const totalLeaks = this.results.reduce((sum, r) => sum + r.leaks, 0);

    console.log(`  Average Peak Memory: ${this.formatMemory(avgPeakMemory)}`);
    console.log(`  Maximum Peak Memory: ${this.formatMemory(maxPeakMemory)}`);
    console.log(`  Total Potential Leaks: ${totalLeaks}`);
    
    if (this.baselineMemory) {
      const totalGrowth = this.results.reduce((sum, r) => sum + r.memoryGrowth, 0);
      console.log(`  Total Memory Growth: ${this.formatMemory(totalGrowth)}`);
      console.log(`  Baseline Memory: ${this.formatMemory(this.baselineMemory.heapUsed)}`);
    }

    // Memory optimization recommendations
    console.log('\n💡 Memory Optimization Recommendations:');
    
    const highMemoryTests = this.results.filter(r => r.peakMemory > 50 * 1024 * 1024);
    if (highMemoryTests.length > 0) {
      console.log('  🔍 High Memory Usage Tests:');
      highMemoryTests.forEach(test => {
        console.log(`    • ${test.testName}: ${this.formatMemory(test.peakMemory)}`);
      });
    }

    const leakyTests = this.results.filter(r => r.leaks > 0);
    if (leakyTests.length > 0) {
      console.log('  🚨 Tests with Potential Leaks:');
      leakyTests.forEach(test => {
        console.log(`    • ${test.testName}: ${test.leaks} leaks`);
      });
    }

    console.log('\n  📋 General Best Practices:');
    console.log('    • Clean up large objects after use');
    console.log('    • Avoid global variables for temporary data');
    console.log('    • Use scoped variables to enable GC');
    console.log('    • Clear Maps and Sets when no longer needed');
    console.log('    • Monitor memory usage in CI/CD pipelines');

    // Save detailed report
    this.saveMemoryReport();
  }

  // 📄 Save detailed memory report
  private saveMemoryReport(): void {
    let report = '# 🧠 Bun Test Memory Usage Analysis Report\n\n';
    report += `**Generated**: ${new Date().toISOString()}\n`;
    report += `**Bun Version**: ${Bun.version}\n`;
    report += `**Platform**: ${process.platform}\n\n`;

    report += '## 📊 Memory Usage Summary\n\n';
    report += '| Test | Peak Memory | Memory Growth | Time (ms) | Leaks |\n';
    report += '|------|-------------|---------------|-----------|-------|\n';

    this.results.forEach(result => {
      const peakMem = this.formatMemory(result.peakMemory);
      const growthMem = this.formatMemory(result.memoryGrowth);
      report += `| ${result.testName} | ${peakMem} | ${growthMem} | ${result.executionTime.toFixed(2)} | ${result.leaks} |\n`;
    });

    report += '\n## 🔍 Detailed Analysis\n\n';

    this.results.forEach(result => {
      report += `### ${result.testName}\n\n`;
      report += `**Description**: ${result.description}\n\n`;
      report += `**Peak Memory**: ${this.formatMemory(result.peakMemory)}\n\n`;
      report += `**Memory Growth**: ${this.formatMemory(result.memoryGrowth)}\n\n`;
      report += `**Execution Time**: ${result.executionTime.toFixed(2)}ms\n\n`;
      report += `**Potential Leaks**: ${result.leaks}\n\n`;
      
      if (result.recommendations.length > 0) {
        report += '**Recommendations**:\n\n';
        result.recommendations.forEach(rec => {
          report += `- ${rec}\n`;
        });
        report += '\n';
      }

      // Memory timeline chart
      if (result.snapshots.length > 0) {
        report += '**Memory Timeline**:\n\n';
        report += '```\n';
        report += 'Time (ms)    Heap Used (MB)\n';
        result.snapshots.forEach((snapshot, index) => {
          const time = (snapshot.timestamp - result.snapshots[0].timestamp).toFixed(0);
          const heapMB = (snapshot.heapUsed / 1024 / 1024).toFixed(2);
          report += `${time.padStart(8)}    ${heapMB.padStart(10)}\n`;
        });
        report += '```\n\n';
      }
    });

    report += '## 📈 Overall Statistics\n\n';
    const totalPeakMemory = this.results.reduce((sum, r) => sum + r.peakMemory, 0);
    const avgPeakMemory = totalPeakMemory / this.results.length;
    const maxPeakMemory = Math.max(...this.results.map(r => r.peakMemory));
    const totalLeaks = this.results.reduce((sum, r) => sum + r.leaks, 0);

    report += `- **Average Peak Memory**: ${this.formatMemory(avgPeakMemory)}\n`;
    report += `- **Maximum Peak Memory**: ${this.formatMemory(maxPeakMemory)}\n`;
    report += `- **Total Potential Leaks**: ${totalLeaks}\n`;
    
    if (this.baselineMemory) {
      const totalGrowth = this.results.reduce((sum, r) => sum + r.memoryGrowth, 0);
      report += `- **Total Memory Growth**: ${this.formatMemory(totalGrowth)}\n`;
      report += `- **Baseline Memory**: ${this.formatMemory(this.baselineMemory.heapUsed)}\n`;
    }

    report += '\n## 💡 Memory Optimization Best Practices\n\n';
    report += '### 🧹 Cleanup Patterns\n\n';
    report += '```typescript\n';
    report += '// Scoped variables for automatic cleanup\n';
    report += 'function processData() {\n';
    report += '  const largeData = new Array(100000).fill(\'data\');\n';
    report += '  // Process data\n';
    report += '} // largeData automatically cleaned up\n\n';
    report += '// Explicit cleanup\n';
    report += 'let largeObject = { /* ... */ };\n';
    report += '// Use largeObject\n';
    report += 'largeObject = null; // Explicit cleanup\n\n';
    report += '// Map/Set cleanup\n';
    report += 'const largeMap = new Map();\n';
    report.write('// Use largeMap\n');
    report += 'largeMap.clear(); // Clear all entries\n';
    report += '```\n\n';

    report += '### 🚀 Performance Optimization\n\n';
    report += '- Use `--smol` flag for memory-constrained environments\n';
    report += '- Monitor memory usage with `process.memoryUsage()`\n';
    report += '- Implement proper cleanup in `afterEach` hooks\n';
    report += '- Avoid global variables for temporary data\n';
    report += '- Use object pooling for frequently allocated objects\n\n';

    report += '### 📊 Monitoring in CI/CD\n\n';
    report += '```bash\n';
    report += '# Memory-aware test execution\n';
    report += 'bun test --smol --timeout 10000\n\n';
    report += '# Monitor memory usage\n';
    report += 'node --max-old-space-size=4096 $(which bun) test\n';
    report += '```\n\n';

    report += '---\n\n';
    report += '*Generated by Memory Usage Analysis Demo v2.8*';

    Bun.write('memory-usage-analysis-report.md', report);
    console.log('\n📄 Detailed memory report saved to: memory-usage-analysis-report.md');
  }

  // 🧹 Cleanup test files
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test files...');
    
    const files = [
      'memory-basic.test.ts',
      'memory-allocation.test.ts', 
      'memory-leaks.test.ts',
      'memory-concurrent.test.ts',
      'memory-cleanup.test.ts'
    ];
    
    for (const file of files) {
      try {
        await Bun.file(file).delete();
      } catch (error) {
        // Ignore file not found errors
      }
    }
    
    console.log('✅ Cleanup complete');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Memory Usage Analysis Demo v2.8');
    console.log('');
    console.log('Analyzes memory usage patterns in Bun test execution:');
    console.log('• Memory monitoring during test execution');
    console.log('• Peak memory usage detection');
    console.log('• Memory leak identification');
    console.log('• Cleanup pattern analysis');
    console.log('• Performance optimization recommendations');
    console.log('');
    console.log('Usage:');
    console.log('  bun run memory-usage-demo.ts');
    return;
  }

  const demo = new MemoryUsageDemo();
  
  try {
    await demo.demonstrateMemoryUsage();
    await demo.cleanup();
    console.log('\n✅ Memory usage analysis complete!');
  } catch (error: any) {
    console.error('❌ Analysis failed:', error.message);
    await demo.cleanup();
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
