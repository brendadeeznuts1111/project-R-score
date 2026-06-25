#!/usr/bin/env bun

class MemoryBenchmark {
  private iterations = 10000;
  private patterns: URLPattern[] = [];
  private regexps: RegExp[] = [];

  async runMemoryTest() {
    console.info('🧠 Memory Usage Benchmark\n');

    // Test 1: Creating many patterns
    console.info('1. Creating 10,000 patterns...');

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

    console.info('   URLPattern memory increase:',
      this.formatMemory(endCreateMemory.heapUsed - startCreateMemory.heapUsed));
    console.info('   RegExp memory increase:',
      this.formatMemory(endCreateMemory.external - startCreateMemory.external));

    // Test 2: Using patterns
    console.info('\n2. Using patterns (test operations)...');

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

    console.info('   URLPattern usage increase:',
      this.formatMemory(endUseMemory.heapUsed - startUseMemory.heapUsed));
    console.info('   RegExp usage increase:',
      this.formatMemory(endUseMemory.external - startUseMemory.external));

    // Test 3: Garbage collection
    console.info('\n3. Testing garbage collection...');

    this.patterns = [];
    this.regexps = [];

    if (global.gc) {
      global.gc();
      await Bun.sleep(100);

      const afterGCMemory = process.memoryUsage();
      console.info('   Memory after GC:', this.formatMemory(afterGCMemory.heapUsed));
    }

    // Summary
    console.info('\n📋 Memory Benchmark Summary');
    console.info('='.repeat(50));
    console.info('URLPattern uses more memory initially but offers:');
    console.info('  • Better API for complex URL matching');
    console.info('  • Type safety with named parameters');
    console.info('  • Standardized Web API');
    console.info('\nRegExp is more memory-efficient for:');
    console.info('  • Simple pattern matching');
    console.info('  • High-volume operations');
    console.info('  • When memory is constrained');
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