#!/usr/bin/env bun
/**
 * Streaming Pipeline
 * High-throughput data streaming with backpressure handling
 */

import { nanoseconds, gzipSync } from 'bun';

export interface StreamMetrics {
  bytesRead: number;
  bytesWritten: number;
  chunksProcessed: number;
  backpressureEvents: number;
  compressionRatio: number;
}

export interface PipelineConfig {
  highWaterMark?: number;
  chunkSize?: number;
  compressionLevel?: number;
}

export class StreamingPipeline {
  private metrics: StreamMetrics = {
    bytesRead: 0,
    bytesWritten: 0,
    chunksProcessed: 0,
    backpressureEvents: 0,
    compressionRatio: 0,
  };
  
  createCompressionStream(algorithm: 'gzip' | 'zstd' = 'gzip', level = 6): TransformStream<Uint8Array, Uint8Array> {
    let totalIn = 0;
    let totalOut = 0;
    const self = this;
    
    return new TransformStream({
      transform(chunk, controller) {
        totalIn += chunk.length;
        
        let compressed: Uint8Array;
        const startNs = nanoseconds();
        
        // Use zstd if available, otherwise gzip
        if (algorithm === 'zstd' && typeof Bun.zstd === 'function') {
          compressed = Bun.zstd.compress(chunk, level);
        } else {
          compressed = gzipSync(chunk, { level });
        }
        
        totalOut += compressed.length;
        
        const elapsedNs = nanoseconds() - startNs;
        if (elapsedNs > 1e6) {
          console.log(`[STREAM] Compression took ${(elapsedNs / 1e6).toFixed(2)}ms`);
        }
        
        controller.enqueue(compressed);
        
        self.metrics.chunksProcessed++;
        self.metrics.compressionRatio = totalOut / totalIn;
      },
      flush() {
        console.log(`[STREAM] Compression ratio: ${(self.metrics.compressionRatio * 100).toFixed(1)}%`);
      },
    });
  }
  
  async *streamJSONLines<T>(source: ReadableStream<Uint8Array>): AsyncGenerator<T, void, unknown> {
    const reader = source.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        this.metrics.bytesRead += value.length;
        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
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
        if (writer.desiredSize !== null && writer.desiredSize < highWaterMark) {
          if (!waiting) {
            waiting = true;
            this.metrics.backpressureEvents++;
          }
          await new Promise(r => setTimeout(r, 10));
          continue;
        }
        
        waiting = false;
        
        const item = await producer();
        if (item === null) break;
        
        await writer.write(item);
        count++;
        
        if (count % 1000 === 0) {
          await new Promise(r => setImmediate(r));
        }
      }
    } finally {
      writer.releaseLock();
    }
    
    return count;
  }
  
  multiplex<T>(sources: ReadableStream<T>[]): ReadableStream<T> {
    const readers = sources.map(s => s.getReader());
    let activeCount = readers.length;
    
    return new ReadableStream({
      async pull(controller) {
        if (activeCount === 0) {
          controller.close();
          return;
        }
        
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

export async function* streamFileWithProgress(
  filePath: string,
  chunkSize = 64 * 1024
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
      yield { data: value, progress: read / total, total };
    }
  } finally {
    reader.releaseLock();
  }
}

// Backward compatibility
export const EliteStreamingPipeline = StreamingPipeline;

export default StreamingPipeline;