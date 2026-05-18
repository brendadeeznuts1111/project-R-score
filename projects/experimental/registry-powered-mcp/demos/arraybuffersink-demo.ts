#!/usr/bin/env bun

/**
 * ArrayBufferSink Performance Demonstration
 * Showcases Bun's efficient streaming buffer capabilities
 */

class StreamingResponseBuilder {
  private sink: InstanceType<typeof Bun.ArrayBufferSink> | null = null;
  private chunks: Uint8Array[] = [];
  private useArrayBufferSink = false;

  constructor(options: { highWaterMark?: number; stream?: boolean } = {}) {
    const { highWaterMark = 65536, stream = false } = options;

    // Try to use ArrayBufferSink for optimal performance
    try {
      if (typeof Bun !== 'undefined' && Bun.ArrayBufferSink) {
        this.sink = new Bun.ArrayBufferSink();
        this.sink.start({ highWaterMark, stream, asUint8Array: true });
        this.useArrayBufferSink = true;
        console.info('✅ Using ArrayBufferSink for optimal performance');
      }
    } catch (error) {
      console.info('⚠️ ArrayBufferSink not available, using fallback implementation');
      this.useArrayBufferSink = false;
    }
  }

  write(chunk: string | ArrayBuffer | Uint8Array): void {
    if (this.useArrayBufferSink && this.sink) {
      this.sink.write(chunk);
    } else {
      // Fallback: encode and store chunks
      let data: Uint8Array;
      if (typeof chunk === 'string') {
        data = new TextEncoder().encode(chunk);
      } else if (chunk instanceof ArrayBuffer) {
        data = new Uint8Array(chunk);
      } else if (chunk instanceof Uint8Array) {
        data = chunk;
      } else {
        throw new Error('Unsupported chunk type');
      }
      this.chunks.push(data);
    }
  }

  flush(): number | Uint8Array | ArrayBuffer | null {
    if (this.useArrayBufferSink && this.sink) {
      return this.sink.flush();
    }
    return null; // No-op for fallback
  }

  end(): ArrayBuffer | Uint8Array {
    if (this.useArrayBufferSink && this.sink) {
      return this.sink.end();
    } else {
      // Fallback: concatenate all chunks
      const totalSize = this.chunks.reduce((size, chunk) => size + chunk.length, 0);
      const result = new Uint8Array(totalSize);
      let offset = 0;

      for (const chunk of this.chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      this.chunks = []; // Clear for potential reuse
      return result;
    }
  }

  getSize(): number {
    if (this.useArrayBufferSink) {
      // ArrayBufferSink doesn't expose size directly
      return -1; // Unknown
    } else {
      return this.chunks.reduce((size, chunk) => size + chunk.length, 0);
    }
  }

  isUsingArrayBufferSink(): boolean {
    return this.useArrayBufferSink;
  }
}

// Performance benchmark
async function benchmarkArrayBufferSink() {
  console.info('\n🚀 ArrayBufferSink Performance Benchmark\n');

  const iterations = 1000;
  const chunkSize = 1024; // 1KB chunks
  const testData = 'x'.repeat(chunkSize);

  console.info(`Testing with ${iterations} iterations of ${chunkSize} bytes each`);
  console.info(`Total data: ${(iterations * chunkSize / 1024 / 1024).toFixed(2)} MB\n`);

  // Benchmark ArrayBufferSink
  const sinkBuilder = new StreamingResponseBuilder({ highWaterMark: 65536 });
  const sinkStart = performance.now();

  for (let i = 0; i < iterations; i++) {
    sinkBuilder.write(testData);
  }

  const sinkBuffer = sinkBuilder.end();
  const sinkEnd = performance.now();
  const sinkTime = sinkEnd - sinkStart;

  console.info('📊 ArrayBufferSink Results:');
  console.info(`   Time: ${sinkTime.toFixed(2)}ms`);
  console.info(`   Throughput: ${((iterations * chunkSize / 1024 / 1024) / (sinkTime / 1000)).toFixed(2)} MB/s`);
  console.info(`   Buffer size: ${(sinkBuffer instanceof Uint8Array ? sinkBuffer.length : sinkBuffer.byteLength) / 1024 / 1024} MB`);
  console.info(`   Using ArrayBufferSink: ${sinkBuilder.isUsingArrayBufferSink()}\n`);

  // Benchmark traditional approach
  const traditionalStart = performance.now();
  const chunks: Uint8Array[] = [];

  for (let i = 0; i < iterations; i++) {
    chunks.push(new TextEncoder().encode(testData));
  }

  const totalSize = chunks.reduce((size, chunk) => size + chunk.length, 0);
  const traditionalBuffer = new Uint8Array(totalSize);
  let offset = 0;

  for (const chunk of chunks) {
    traditionalBuffer.set(chunk, offset);
    offset += chunk.length;
  }

  const traditionalEnd = performance.now();
  const traditionalTime = traditionalEnd - traditionalStart;

  console.info('📊 Traditional Array Concatenation Results:');
  console.info(`   Time: ${traditionalTime.toFixed(2)}ms`);
  console.info(`   Throughput: ${((iterations * chunkSize / 1024 / 1024) / (traditionalTime / 1000)).toFixed(2)} MB/s`);
  console.info(`   Buffer size: ${traditionalBuffer.length / 1024 / 1024} MB\n`);

  // Calculate improvement
  const improvement = ((traditionalTime - sinkTime) / traditionalTime * 100);
  console.info('🏆 Performance Comparison:');
  console.info(`   ArrayBufferSink is ${improvement > 0 ? improvement.toFixed(1) + '%' : 'comparable'} faster`);
  console.info(`   Memory efficiency: ${(traditionalBuffer.length / (sinkBuffer instanceof Uint8Array ? sinkBuffer.length : sinkBuffer.byteLength)).toFixed(2)}x\n`);
}

// Demonstrate streaming JSON building
function demonstrateStreamingJSON() {
  console.info('🔄 Streaming JSON Building Demo\n');

  const builder = new StreamingResponseBuilder({ highWaterMark: 8192 });

  // Build a large JSON response incrementally
  builder.write('{"telemetry":{');
  builder.write('"timestamp":"' + new Date().toISOString() + '",');
  builder.write('"metrics":{');

  // Add some sample data
  const metrics = ['latency', 'requests', 'heap', 'cpu'];
  for (let i = 0; i < metrics.length; i++) {
    builder.write('"' + metrics[i] + '":[');

    for (let j = 0; j < 10; j++) {
      if (j > 0) builder.write(',');
      builder.write(Math.random().toFixed(3));
    }

    builder.write(']');
    if (i < metrics.length - 1) builder.write(',');
  }

  builder.write('},"status":"healthy"');
  builder.write('},"totalSize":' + (metrics.length * 10 * 6)); // Estimate
  builder.write('}');

  const result = builder.end();
  const jsonString = new TextDecoder().decode(result);

  console.info('✅ Generated JSON Response:');
  console.info(`   Size: ${result instanceof Uint8Array ? result.length : result.byteLength} bytes`);
  console.info(`   Valid JSON: ${(() => { try { JSON.parse(jsonString); return true; } catch { return false; } })()}`);
  console.info(`   Using ArrayBufferSink: ${builder.isUsingArrayBufferSink()}\n`);

  // Show first 200 chars
  console.info('📄 Sample output:');
  console.info(jsonString.substring(0, 200) + '...\n');
}

// Run demonstrations
async function main() {
  console.info('🌟 Bun ArrayBufferSink Demonstration');
  console.info('=====================================\n');

  console.info('ArrayBufferSink is Bun\'s high-performance streaming buffer for:');
  console.info('• Incremental data writing (strings, ArrayBuffers, Uint8Arrays)');
  console.info('• Efficient memory allocation with highWaterMark preallocation');
  console.info('• Streaming mode for continuous data processing');
  console.info('• Final conversion to ArrayBuffer or Uint8Array');
  console.info('• Zero-copy operations where possible\n');

  await benchmarkArrayBufferSink();
  demonstrateStreamingJSON();

  console.info('✨ ArrayBufferSink demonstration complete!');
}

if (import.meta.main) {
  main().catch(console.error);
}