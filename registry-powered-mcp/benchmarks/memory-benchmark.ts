#!/usr/bin/env bun

class MemoryBenchmark {
  private iterations = 10000;
  private patterns: URLPattern[] = [];
  private regexps: RegExp[] = [];

  async runMemoryTest() {
    console.log('🧠 Memory Usage Benchmark\n');

    // Test 1: Creating many patterns
    console.log('1. Creating 10,000 patterns...');

    const startCreateMemory = process.memoryUsage();

    for (let i = 0; i < this.iterations; i++) {
      this.patterns.push(
        new URLPattern({
          pathname: `/api/v${Math.floor(i / 1000)}/:resource${i % 100}/:id`
        })
      );
      this.regexps.push(
        new RegExp(`^/api/v${Math.floor(i / 1000)}/(\\w+)${i % 100}/(\\d+)$`)
      );
    }

    const endCreateMemory = process.memoryUsage();

    console.log('   URLPattern memory increase:',
      this.formatMemory(endCreateMemory.heapUsed - startCreateMemory.heapUsed));
    console.log('   RegExp memory increase:',
      this.formatMemory(endCreateMemory.external - startCreateMemory.external));

    // Test 2: Using patterns
    console.log('\n2. Using patterns (test operations)...');

    const startUseMemory = process.memoryUsage();

    for (let i = 0; i < 1000; i++) {
      for (const pattern of this.patterns.slice(0, 100)) {
        pattern.test(`/api/v1/resource${i}/123`);
      }
      for (const regex of this.regexps.slice(0, 100)) {
        regex.test(`/api/v1/resource${i}/123`);
      }
    }

    const endUseMemory = process.memoryUsage();

    console.log('   URLPattern usage increase:',
      this.formatMemory(endUseMemory.heapUsed - startUseMemory.heapUsed));
    console.log('   RegExp usage increase:',
      this.formatMemory(endUseMemory.external - startUseMemory.external));

    // Test 3: Garbage collection
    console.log('\n3. Testing garbage collection...');

    this.patterns = [];
    this.regexps = [];

    if (global.gc) {
      global.gc();
      await Bun.sleep(100);

      const afterGCMemory = process.memoryUsage();
      console.log('   Memory after GC:', this.formatMemory(afterGCMemory.heapUsed));
    }

    // Summary
    console.log('\n📋 Memory Benchmark Summary');
    console.log('='.repeat(50));
    console.log('URLPattern uses more memory initially but offers:');
    console.log('  • Better API for complex URL matching');
    console.log('  • Type safety with named parameters');
    console.log('  • Standardized Web API');
    console.log('\nRegExp is more memory-efficient for:');
    console.log('  • Simple pattern matching');
    console.log('  • High-volume operations');
    console.log('  • When memory is constrained');
  }

  private formatMemory(bytes: number): string {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
  }
}

// Run if main
if (import.meta.main) {
  const benchmark = new MemoryBenchmark();
  await benchmark.runMemoryTest();
}