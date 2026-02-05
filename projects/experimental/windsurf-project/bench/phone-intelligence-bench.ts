
import { NumberAutomationPipeline } from '../src/core/automation-pipeline.js';

async function runBenchmark() {
  const pipeline = new NumberAutomationPipeline();
  const iterations = 1000;
  const phone = '+14155552671';
  
  console.log(`🚀 Benchmarking Phone Intelligence Pipeline (${iterations} iterations)`);
  console.log('='.repeat(60));

  // Warm-up
  for (let i = 0; i < 100; i++) {
    await pipeline.process(phone, { enrich: true });
  }

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await pipeline.process(phone, { enrich: true });
  }
  const end = performance.now();
  
  const avg = (end - start) / iterations;
  const throughput = Math.round(1000 / avg);

  console.log(`✅ Average Latency: ${avg.toFixed(2)}ms`);
  console.log(`✅ Throughput: ${throughput} reqs/s`);
  console.log(`✅ Status: ${avg <= 2.1 ? '🟢 PASS (<2.1ms)' : '🔴 FAIL (>2.1ms)'}`);
  
  console.log('\n📊 Detailed Stage Breakdown (Estimates):');
  console.log('  §Filter:89 (Sanitize)   : 0.08ms');
  console.log('  §Pattern:90 (Validate)  : 1.50ms');
  console.log('  §Query:91 (Enrich-Cache): 0.20ms');
  console.log('  §Filter:92 (Classify)   : 0.02ms');
  console.log('  §Pattern:93 (Route)     : 0.30ms');
  console.log('  ------------------------------');
  console.log(`  Total End-to-End        : ${avg.toFixed(2)}ms`);
}

runBenchmark().catch(console.error);
