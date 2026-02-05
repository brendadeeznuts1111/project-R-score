#!/usr/bin/env bun

class ConcurrentBenchmark {
  private concurrencyLevels = [1, 2, 4, 8, 16, 32];
  private results: any[] = [];

  async runConcurrentTests() {
    console.log('🧪 Running Concurrent URLPattern Benchmarks\n');

    for (const concurrency of this.concurrencyLevels) {
      console.log(`🔁 Testing with ${concurrency} concurrent operations...`);

      const startTime = performance.now();
      const promises: Promise<void>[] = [];

      for (let i = 0; i < concurrency; i++) {
        promises.push(this.runWorkerBenchmark(i));
      }

      await Promise.all(promises);
      const duration = performance.now() - startTime;

      this.results.push({
        concurrency,
        duration: `${duration.toFixed(2)}ms`,
        throughput: `${(concurrency / (duration / 1000)).toFixed(2)} ops/sec`,
      });
    }

    this.printResults();
  }

  private async runWorkerBenchmark(id: number): Promise<void> {
    // Create a pattern for this worker
    const pattern = new URLPattern({ pathname: `/api/:version/users/:id${id}` });
    const testUrl = `https://example.com/api/v1/users/123${id}`;

    for (let i = 0; i < 10000; i++) {
      pattern.test(testUrl);
      if (i % 100 === 0) {
        pattern.exec(testUrl);
      }
    }

    // Simulate some work
    await Bun.sleep(Math.random() * 10);
  }

  private printResults() {
    console.log('\n📊 Concurrent Benchmark Results');
    console.log('='.repeat(60));
    console.log('Concurrency | Duration     | Throughput');
    console.log('-'.repeat(60));

    for (const result of this.results) {
      console.log(
        result.concurrency.toString().padEnd(11),
        '|',
        result.duration.padEnd(12),
        '|',
        result.throughput
      );
    }

    // Calculate scaling efficiency
    const singleThread = this.results[0];
    const bestThread = this.results[this.results.length - 1];
    const efficiency = (parseFloat(singleThread.throughput) / this.concurrencyLevels[this.concurrencyLevels.length - 1])
      / parseFloat(bestThread.throughput) * 100;

    console.log('\n📈 Scaling Efficiency:', efficiency.toFixed(1), '%');
  }
}

// Run if main
if (import.meta.main) {
  const benchmark = new ConcurrentBenchmark();
  await benchmark.runConcurrentTests();
}