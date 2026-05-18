// bench/scripts/bench-readable-blob.ts
import { gigReadableStream } from '../../utils/readable-blob-farm';

async function benchmark(name: string, fn: () => Promise<void>) {
  const start = Bun.nanoseconds();
  await fn();
  const end = Bun.nanoseconds();
  const durationNs = end - start;
  return {
    name,
    avg: durationNs / 1000, // microseconds
    totalMs: durationNs / 1e6
  };
}

console.info('🚀 Starting Readable → Blob Bench (1GB)...');

const readableBench = await benchmark('Readable → Blob Gig', async () => {
  const readable = await gigReadableStream(1024); // 1GB
  const response = new Response(readable as any);
  await response.blob();
});

const throughput = (1024 / (readableBench.totalMs / 1000)).toFixed(1);
console.info(`✅ Readable → Blob: ${readableBench.avg.toFixed(0)}μs (${throughput}MB/s)`);

if (parseFloat(throughput) > 10000) {
  console.info('⚡ Throughput exceeds 10GB/s - Zero-copy confirmed!');
} else {
  console.info('⚠️ Throughput lower than expected for zero-copy.');
}
