
import { BunR2AppleManager } from '../../src/storage/r2-apple-manager.js';
import { alignedTable } from '../../utils/super-table.js';

async function main() {
  console.log('📊 **Gig PNG Bench: S3 Screenshots (s3.write inline)**');
  
  const manager = new BunR2AppleManager();
  await manager.initialize();
  
  const iterations = 10;
  const pngSize = 10 * 1024 * 1024; // 10MB
  const data = new Uint8Array(pngSize);
  // Fill with dummy data
  for (let i = 0; i < 1000; i++) data[i] = i % 256;

  const results = [];
  const startTotal = Bun.nanoseconds();
  
  for (let i = 0; i < iterations; i++) {
    const key = `bench/screenshots/bench-png-${i}.png`;
    console.log(`   Uploading PNG ${i + 1}/${iterations} (10MB)...`);
    const res = await manager.uploadScreenshot(data, key);
    results.push({
      id: i + 1,
      key: res.key,
      time: `${res.timeMs.toFixed(0)}ms`,
      speed: `${(pngSize / (res.timeMs / 1000) / 1024 / 1024).toFixed(1)}MB/s`,
      url: res.embedUrl.slice(0, 40) + '...'
    });
  }
  
  const totalMs = (Bun.nanoseconds() - startTotal) / 1e6;
  const totalMB = (pngSize * iterations) / 1024 / 1024;
  const avgThroughput = totalMB / (totalMs / 1000);
  const gbPerMin = (avgThroughput * 60) / 1024;

  console.log('\n✅ **Throughput Results (stringWidth Aligned)**');
  alignedTable(results, ['id', 'time', 'speed', 'url']);

  console.log(`\n🚀 **Stats:**`);
  console.log(`- Total Data: ${totalMB.toFixed(0)}MB`);
  console.log(`- Total Time: ${(totalMs / 1000).toFixed(2)}s`);
  console.log(`- Avg Speed: ${avgThroughput.toFixed(1)}MB/s`);
  console.log(`- Farm Rate: ${gbPerMin.toFixed(1)}GB/min 📈`);
}

main().catch(console.error);
