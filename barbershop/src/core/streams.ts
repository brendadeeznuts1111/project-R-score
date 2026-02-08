#!/usr/bin/env bun
/**
 * BarberShop ELITE Streaming Pipeline
 * ===================================
 * High-throughput data streaming with backpressure handling
 * 
 * Elite Features:
 * - Bun.readableStream for zero-copy streaming
 * - Transform streams with compression
 * - Backpressure-aware producers
 * - Multi-plexed WebSocket streams
 */

import { nanoseconds, gzipSync, zstdCompress } from 'bun';

export interface StreamMetrics {
  bytesRead: number;
  bytesWritten: number;
  chunksProcessed: number;
  backpressureEvents: number;
  compressionRatio: number;
}

export class EliteStreamingPipeline {
  private metrics: StreamMetrics = {
    bytesRead: 0,
    bytesWritten: 0,
    chunksProcessed: 0,
    backpressureEvents: 0,
    compressionRatio: 0,
  };
  
  // Create a high-performance transform stream
  createCompressionStream(
    algorithm: 'gzip' | 'zstd' = 'gzip',
    level = 6
): TransformStream<Uint8Array, Uint8Array> {
    let totalIn = 0;
    let totalOut = 0;
    const self = this;
    
    return new TransformStream({
      transform(chunk, controller) {
        totalIn += chunk.length;
        
        let compressed: Uint8Array;
        const startNs = nanoseconds();
        
        if (algorithm === 'zstd' && typeof zstdCompress === 'function') {
          compressed = zstdCompress(chunk, level);
        } else {
          compressed = gzipSync(chunk, { level });
        }
        
        totalOut += compressed.length;
        
        const elapsedNs = nanoseconds() - startNs;
        if (elapsedNs > 1e6) { // > 1ms
          console.log(`[STREAM] Compression took ${(elapsedNs / 1e6).toFixed(2)}ms`);
        }
        
        controller.enqueue(compressed);
        
        self.metrics.chunksProcessed++;
        self.metrics.compressionRatio = totalOut / totalIn;
      },
      flush(controller) {
        console.log(`[STREAM] Compression ratio: ${(self.metrics.compressionRatio * 100).toFixed(1)}%`);
      },
    });
  }
  
  // JSON Lines streaming (newline-delimited JSON)
  async *streamJSONLines<T>(
    source: ReadableStream<Uint8Array>
  ): AsyncGenerator<T, void, unknown> {
    const reader = source.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        this.metrics.bytesRead += value.length;
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              yield JSON.parse(line) as T;
            } catch (e) {
              console.warn('[STREAM] Invalid JSON:', line.slice(0, 100));
            }
          }
        }
      }
      
      // Process remaining buffer
      if (buffer.trim()) {
        try {
          yield JSON.parse(buffer) as T;
        } catch (e) {
          console.warn('[STREAM] Invalid JSON in buffer:', buffer.slice(0, 100));
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  
  // Backpressure-aware producer
  async produceWithBackpressure<T>(
    producer: () => Promise<T | null>,
    writable: WritableStream<T>,
    options: { highWaterMark?: number; signal?: AbortSignal } = {}
  ): Promise<number> {
    const { highWaterMark = 16 } = options;
    const writer = writable.getWriter();
    let count = 0;
    let waiting = false;
    
    try {
      while (!options.signal?.aborted) {
        // Check backpressure
        if (writer.desiredSize !== null && writer.desiredSize < highWaterMark) {
          if (!waiting) {
            waiting = true;
            this.metrics.backpressureEvents++;
            console.log('[STREAM] Backpressure detected, slowing down...');
          }
          await new Promise(r => setTimeout(r, 10));
          continue;
        }
        
        waiting = false;
        
        const item = await producer();
        if (item === null) break;
        
        await writer.write(item);
        count++;
        
        // Yield to event loop periodically
        if (count % 1000 === 0) {
          await new Promise(r => setImmediate(r));
        }
      }
    } finally {
      writer.releaseLock();
    }
    
    return count;
  }
  
  // Multi-plexed stream (combine multiple sources)
  multiplex<T>(sources: ReadableStream<T>[]): ReadableStream<T> {
    const readers = sources.map(s => s.getReader());
    let activeCount = readers.length;
    
    return new ReadableStream({
      async pull(controller) {
        if (activeCount === 0) {
          controller.close();
          return;
        }
        
        // Round-robin between sources
        for (const reader of readers) {
          try {
            const { done, value } = await reader.read();
            
            if (done) {
              activeCount--;
              continue;
            }
            
            controller.enqueue(value);
            return;
          } catch (e) {
            activeCount--;
          }
        }
        
        if (activeCount === 0) {
          controller.close();
        }
      },
      cancel() {
        readers.forEach(r => r.releaseLock());
      },
    });
  }
  
  // Tee a stream (split into two)
  tee<T>(source: ReadableStream<T>): [ReadableStream<T>, ReadableStream<T>] {
    const reader = source.getReader();
    const chunks: T[] = [];
    let done = false;
    
    const createBranch = (): ReadableStream<T> => {
      let index = 0;
      
      return new ReadableStream({
        async pull(controller) {
          // Wait for data if not done
          while (index >= chunks.length && !done) {
            const result = await reader.read();
            if (result.done) {
              done = true;
              break;
            }
            chunks.push(result.value);
          }
          
          if (index < chunks.length) {
            controller.enqueue(chunks[index++]);
          } else {
            controller.close();
          }
        },
        cancel() {
          reader.releaseLock();
        },
      });
    };
    
    return [createBranch(), createBranch()];
  }
  
  // Pipeline metrics
  getMetrics(): StreamMetrics {
    return { ...this.metrics };
  }
  
  resetMetrics(): void {
    this.metrics = {
      bytesRead: 0,
      bytesWritten: 0,
      chunksProcessed: 0,
      backpressureEvents: 0,
      compressionRatio: 0,
    };
  }
}

// Bun-native file streaming with progress
export async function* streamFileWithProgress(
  filePath: string,
  chunkSize = 64 * 1024 // 64KB chunks
): AsyncGenerator<{ data: Uint8Array; progress: number; total: number }, void, unknown> {
  const file = Bun.file(filePath);
  const total = file.size;
  let read = 0;
  
  const stream = file.stream();
  const reader = stream.getReader();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      read += value.length;
      
      yield {
        data: value,
        progress: read / total,
        total,
      };
    }
  } finally {
    reader.releaseLock();
  }
}

// Demo
if (import.meta.main) {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  🔥 ELITE STREAMING PIPELINE                                     ║
╠══════════════════════════════════════════════════════════════════╣
║  Zero-copy streaming • Backpressure handling • Multi-plexing     ║
╚══════════════════════════════════════════════════════════════════╝
`);
  
  const pipeline = new EliteStreamingPipeline();
  
  // Demo 1: JSON Lines streaming
  console.log('--- JSON Lines Streaming Demo ---');
  
  const jsonData = [
    { id: 1, event: 'ticket_created', timestamp: Date.now() },
    { id: 2, event: 'barber_login', timestamp: Date.now() },
    { id: 3, event: 'checkout_complete', timestamp: Date.now() },
  ];
  
  const encoder = new TextEncoder();
  const jsonStream = new ReadableStream({
    start(controller) {
      for (const obj of jsonData) {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      }
      controller.close();
    },
  });
  
  (async () => {
    for await (const event of pipeline.streamJSONLines<typeof jsonData[0]>(jsonStream)) {
      console.log('  →', event);
    }
    
    // Demo 2: Compression stream
    console.log('\n--- Compression Streaming Demo ---');
    
    const data = new Uint8Array(10000);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 256;
    }
    
    const sourceStream = new ReadableStream({
      start(controller) {
        controller.enqueue(data);
        controller.close();
      },
    });
    
    const compressionStream = pipeline.createCompressionStream('gzip', 6);
    
    const compressedStream = sourceStream.pipeThrough(compressionStream);
    const reader = compressedStream.getReader();
    
    let compressedSize = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      compressedSize += value.length;
    }
    
    console.log(`  Original: ${data.length} bytes`);
    console.log(`  Compressed: ${compressedSize} bytes`);
    console.log(`  Ratio: ${((compressedSize / data.length) * 100).toFixed(1)}%`);
    
    // Demo 3: Backpressure producer
    console.log('\n--- Backpressure Producer Demo ---');
    
    let produced = 0;
    const producer = async () => {
      if (produced >= 100) return null;
      produced++;
      await Bun.sleep(1); // Simulate work
      return { id: produced, data: Math.random() };
    };
    
    const writable = new WritableStream({
      write(chunk) {
        if (chunk.id % 20 === 0) {
          console.log(`  Processed ${chunk.id} items`);
        }
      },
    });
    
    const count = await pipeline.produceWithBackpressure(producer, writable, {
      highWaterMark: 10,
    });
    
    console.log(`  Total produced: ${count}`);
    console.log(`  Backpressure events: ${pipeline.getMetrics().backpressureEvents}`);
    
    console.log('\n✅ Elite Streaming Pipeline ready!');
  })();
}

export default EliteStreamingPipeline;
