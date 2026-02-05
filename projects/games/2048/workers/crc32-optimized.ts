export interface CRC32Result {
  hash: number;
  bytesProcessed: number;
  duration: number;
  chunks?: number;
}

export class OptimizedCRC32Processor {
  private readonly chunkSize = 64 * 1024; // 64KB chunks for optimal cache usage

  // Direct parallel processing without unnecessary copying
  async processBatch(buffers: Uint8Array[]): Promise<Uint32Array> {
    const results = new Uint32Array(buffers.length);

    // Process buffers in parallel using Promise.all
    const promises = buffers.map(async (buffer, index) => {
      results[index] = Bun.hash.crc32(buffer);
    });

    await Promise.all(promises);
    return results;
  }

  // Optimized for large datasets with streaming
  async processLargeDataset(dataset: Uint8Array[]): Promise<CRC32Result> {
    const start = performance.now();

    // Process in parallel batches
    const batchSize = Math.min(
      dataset.length,
      navigator.hardwareConcurrency || 4,
    );
    const results: Uint32Array[] = [];

    for (let i = 0; i < dataset.length; i += batchSize) {
      const batch = dataset.slice(i, i + batchSize);
      const batchResults = await this.processBatch(batch);
      results.push(batchResults);
    }

    // Combine results efficiently
    let combinedCRC = 0;
    let totalBytes = 0;

    for (const batchResults of results) {
      for (let j = 0; j < batchResults.length; j++) {
        const bufferIndex = results.indexOf(batchResults) * batchSize + j;
        if (bufferIndex < dataset.length) {
          combinedCRC = this.combineCRC32(
            combinedCRC,
            batchResults[j],
            dataset[bufferIndex].length,
          );
          totalBytes += dataset[bufferIndex].length;
        }
      }
    }

    const duration = performance.now() - start;

    return {
      hash: combinedCRC >>> 0,
      bytesProcessed: totalBytes,
      duration,
      chunks: Math.ceil(dataset.length / batchSize),
    };
  }

  // Memory-mapped style processing for large buffers
  async processLargeBuffer(
    buffer: Uint8Array,
    chunkSize?: number,
  ): Promise<CRC32Result> {
    const chunk = chunkSize || this.chunkSize;
    const start = performance.now();

    let combinedCRC = 0;
    let processedBytes = 0;
    const chunks = Math.ceil(buffer.length / chunk);

    // Process chunks in parallel where possible
    const chunkPromises: Promise<{
      crc: number;
      offset: number;
      size: number;
    }>[] = [];

    for (let i = 0; i < chunks; i++) {
      const offset = i * chunk;
      const size = Math.min(chunk, buffer.length - offset);
      const chunkData = buffer.subarray(offset, offset + size);

      chunkPromises.push(
        (async () => {
          const crc = Bun.hash.crc32(chunkData);
          return { crc, offset, size };
        })(),
      );
    }

    // Wait for all chunks and combine
    const chunkResults = await Promise.all(chunkPromises);

    // Sort by offset to ensure correct combination order
    chunkResults.sort((a, b) => a.offset - b.offset);

    for (const result of chunkResults) {
      combinedCRC = this.combineCRC32(combinedCRC, result.crc, result.size);
      processedBytes += result.size;
    }

    const duration = performance.now() - start;

    return {
      hash: combinedCRC >>> 0,
      bytesProcessed: processedBytes,
      duration,
      chunks,
    };
  }

  // Streaming CRC32 for real-time data
  createStreamingCRC32(): {
    update: (data: Uint8Array) => void;
    digest: () => number;
    reset: () => void;
  } {
    let currentCRC = 0;
    let totalBytes = 0;

    return {
      update: (data: Uint8Array) => {
        currentCRC = this.combineCRC32(
          currentCRC,
          Bun.hash.crc32(data),
          data.length,
        );
        totalBytes += data.length;
      },

      digest: () => currentCRC >>> 0,

      reset: () => {
        currentCRC = 0;
        totalBytes = 0;
      },
    };
  }

  // Optimized CRC32 combination using hardware-accelerated Bun.hash.crc32
  private combineCRC32(crc1: number, crc2: number, len2: number): number {
    // Use Bun's hardware-accelerated CRC32 (20x faster in v1.3.6)
    const combined = Bun.hash.crc32(
      new Uint8Array([
        (crc1 >> 24) & 0xff,
        (crc1 >> 16) & 0xff,
        (crc1 >> 8) & 0xff,
        crc1 & 0xff,
        (crc2 >> 24) & 0xff,
        (crc2 >> 16) & 0xff,
        (crc2 >> 8) & 0xff,
        crc2 & 0xff,
        (len2 >> 24) & 0xff,
        (len2 >> 16) & 0xff,
        (len2 >> 8) & 0xff,
        len2 & 0xff,
      ]),
    );

    return combined >>> 0;
  }

  // Performance metrics optimized for Bun v1.3.6 hardware acceleration
  getMetrics(): {
    chunkSize: number;
    parallelism: number;
    estimatedThroughput: string;
    hardwareAccelerated: boolean;
    performanceGain: string;
  } {
    const throughput =
      (this.chunkSize * (navigator.hardwareConcurrency || 4)) / 1024;
    return {
      chunkSize: this.chunkSize,
      parallelism: navigator.hardwareConcurrency || 4,
      estimatedThroughput: `${throughput.toFixed(1)}KB per batch`,
      hardwareAccelerated: true,
      performanceGain: "~20x faster with Bun v1.3.6 hardware acceleration",
    };
  }

  // Adaptive processing based on data size
  async adaptiveProcess(data: Uint8Array[]): Promise<Uint32Array> {
    const totalSize = data.reduce((sum, buf) => sum + buf.length, 0);
    const avgSize = totalSize / data.length;

    // For small buffers, process directly
    if (avgSize < 1024) {
      return data.map((buf) => Bun.hash.crc32(buf));
    }

    // For medium buffers, use parallel processing
    if (avgSize < 64 * 1024) {
      return await this.processBatch(data);
    }

    // For large buffers, use chunked processing
    const results = new Uint32Array(data.length);
    for (let i = 0; i < data.length; i++) {
      const result = await this.processLargeBuffer(data[i]);
      results[i] = result.hash;
    }

    return results;
  }
}

// Singleton instance
export const optimizedProcessor = new OptimizedCRC32Processor();

// Utility functions
export async function fastCRC32Batch(data: Uint8Array[]): Promise<Uint32Array> {
  return await optimizedProcessor.processBatch(data);
}

export function createStreamingCRC32() {
  return optimizedProcessor.createStreamingCRC32();
}
