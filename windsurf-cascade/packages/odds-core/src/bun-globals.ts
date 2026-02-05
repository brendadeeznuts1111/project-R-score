// packages/odds-core/src/bun-globals.ts - Advanced Bun globals integration for odds protocol
import { BunUtils, OddsProtocolUtils } from './bun-utils';

export class BunGlobalsIntegration {
  
  // Enhanced fetch with Bun optimizations and Web API compatibility
  static async enhancedFetch(url: string | URL, options?: RequestInit): Promise<{
    response: Response;
    duration: number;
    size: number;
    compressed: boolean;
  }> {
    const start = performance.now();
    const response = await fetch(url, {
      ...options,
      // Add Bun-specific optimizations
      headers: {
        'Accept-Encoding': 'gzip, deflate, zstd',
        'User-Agent': `OddsProtocol/${BunUtils.getBunInfo().version}`,
        ...options?.headers
      }
    });
    
    const duration = performance.now() - start;
    const contentLength = response.headers.get('content-length');
    const size = contentLength ? parseInt(contentLength) : 0;
    const compressed = response.headers.get('content-encoding') !== null;
    
    return {
      response,
      duration,
      size,
      compressed
    };
  }

  // Stream processing with Web Streams API
  static async processMarketDataStream(
    inputStream: ReadableStream,
    processor: (chunk: any) => Promise<void>
  ): Promise<{
    processedCount: number;
    duration: number;
    errorCount: number;
  }> {
    const start = performance.now();
    let processedCount = 0;
    let errorCount = 0;
    
    const reader = inputStream.getReader();
    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        try {
          await processor(chunk);
          processedCount++;
          controller.enqueue(chunk);
        } catch (error) {
          errorCount++;
          console.error('Stream processing error:', error);
        }
      }
    });
    
    const writer = transformStream.writable.getWriter();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await writer.write(value);
      }
    } finally {
      reader.releaseLock();
      writer.close();
    }
    
    return {
      processedCount,
      duration: performance.now() - start,
      errorCount
    };
  }

  // FormData utilities for API requests
  static createMarketDataFormData(data: Record<string, any>): FormData {
    const formData = new FormData();
    
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'string') {
        formData.append(key, value);
      } else if (typeof value === 'object' && value !== null) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    });
    
    return formData;
  }

  // URL and URLSearchParams utilities
  static buildMarketDataURL(
    baseUrl: string,
    params: Record<string, string | number | boolean>
  ): string {
    const url = new URL(baseUrl);
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
    
    url.search = searchParams.toString();
    return url.toString();
  }

  // Enhanced console with structured logging
  static createStructuredLogger(context: string) {
    return {
      info: (message: string, data?: any) => {
        console.log(JSON.stringify({
          level: 'info',
          context,
          message,
          data,
          timestamp: new Date().toISOString(),
          bunVersion: BunUtils.getBunInfo().version,
          nanoseconds: BunUtils.getNanoseconds()
        }));
      },
      
      error: (message: string, error?: any) => {
        console.error(JSON.stringify({
          level: 'error',
          context,
          message,
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : error,
          timestamp: new Date().toISOString(),
          bunVersion: BunUtils.getBunInfo().version,
          nanoseconds: BunUtils.getNanoseconds()
        }));
      },
      
      warn: (message: string, data?: any) => {
        console.warn(JSON.stringify({
          level: 'warn',
          context,
          message,
          data,
          timestamp: new Date().toISOString(),
          bunVersion: BunUtils.getBunInfo().version,
          nanoseconds: BunUtils.getNanoseconds()
        }));
      }
    };
  }

  // TextEncoder/TextDecoder for market data processing
  static async processTextData(data: string): Promise<{
    encoded: Uint8Array;
    decoded: string;
    encoding: string;
    size: number;
  }> {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const encoded = encoder.encode(data);
    const decoded = decoder.decode(encoded);
    
    return {
      encoded,
      decoded,
      encoding: 'utf-8',
      size: encoded.byteLength
    };
  }

  // Blob utilities for data storage
  static createMarketDataBlob(data: any, mimeType: string = 'application/json'): Blob {
    const jsonString = JSON.stringify(data);
    return new Blob([jsonString], { type: mimeType });
  }

  static async readMarketDataBlob(blob: Blob): Promise<any> {
    const text = await blob.text();
    return JSON.parse(text);
  }

  // Web Crypto integration for data signing
  static async signMarketData(data: any, secretKey: CryptoKey): Promise<{
    signature: ArrayBuffer;
    dataHash: ArrayBuffer;
    algorithm: string;
  }> {
    const jsonString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonString);
    
    // Hash the data
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    
    // Sign the hash
    const signature = await crypto.subtle.sign(
      'HMAC',
      secretKey,
      hashBuffer
    );
    
    return {
      signature,
      dataHash: hashBuffer,
      algorithm: 'HMAC-SHA256'
    };
  }

  // AbortController for timeout management
  static createTimeoutController(timeoutMs: number): {
    controller: AbortController;
    signal: AbortSignal;
    timeoutId: number;
  } {
    const controller = new AbortController();
    const signal = controller.signal;
    
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);
    
    return { controller, signal, timeoutId };
  }

  // Event target for market data events
  static createMarketEventEmitter(): {
    eventTarget: EventTarget;
    emitTick: (tick: any) => void;
    emitArbitrage: (opportunity: any) => void;
    onTick: (callback: (event: MessageEvent) => void) => void;
    onArbitrage: (callback: (event: MessageEvent) => void) => void;
  } {
    const eventTarget = new EventTarget();
    
    const emitTick = (tick: any) => {
      const event = new MessageEvent('tick', { data: tick });
      eventTarget.dispatchEvent(event);
    };
    
    const emitArbitrage = (opportunity: any) => {
      const event = new MessageEvent('arbitrage', { data: opportunity });
      eventTarget.dispatchEvent(event);
    };
    
    const onTick = (callback: (event: MessageEvent) => void) => {
      eventTarget.addEventListener('tick', callback as EventListener);
    };
    
    const onArbitrage = (callback: (event: MessageEvent) => void) => {
      eventTarget.addEventListener('arbitrage', callback as EventListener);
    };
    
    return {
      eventTarget,
      emitTick,
      emitArbitrage,
      onTick,
      onArbitrage
    };
  }

  // Performance monitoring with Performance API
  static createPerformanceMark(name: string): void {
    performance.mark(name);
  }

  static measurePerformance(markName: string, startMark: string, endMark?: string): number {
    if (endMark) {
      performance.measure(markName, startMark, endMark);
    } else {
      performance.measure(markName, startMark);
    }
    
    const entries = performance.getEntriesByName(markName, 'measure');
    return entries.length > 0 ? entries[entries.length - 1].duration : 0;
  }

  // Process utilities for system monitoring
  static getSystemInfo() {
    return {
      pid: process.pid,
      ppid: process.ppid,
      title: process.title,
      version: process.version,
      versions: process.versions,
      arch: process.arch,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      bunInfo: BunUtils.getBunInfo(),
      hrtime: process.hrtime.bigint()
    };
  }

  // QueueMicrotask for optimized async operations
  static scheduleMicrotask(task: () => void): void {
    queueMicrotask(task);
  }

  // setTimeout/setInterval utilities with enhanced features
  static createDebouncedFunction<T extends (...args: any[]) => void>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    return (...args: Parameters<T>) => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        func(...args);
        timeoutId = null;
      }, delay);
    };
  }

  static createThrottledFunction<T extends (...args: any[]) => void>(
    func: T,
    interval: number
  ): (...args: Parameters<T>) => void {
    let lastExecution = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    return (...args: Parameters<T>) => {
      const now = Date.now();
      
      if (now - lastExecution >= interval) {
        func(...args);
        lastExecution = now;
      } else if (timeoutId === null) {
        timeoutId = setTimeout(() => {
          func(...args);
          lastExecution = Date.now();
          timeoutId = null;
        }, interval - (now - lastExecution));
      }
    };
  }

  // Request/Response utilities for HTTP handling
  static createJSONResponse<T>(data: T, status: number = 200, headers?: Record<string, string>): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
  }

  static async parseJSONRequest<T>(request: Request): Promise<T> {
    return await request.json() as T;
  }

  // WebAssembly integration for performance-critical calculations
  static async loadWasmModule(wasmUrl: string): Promise<{
    module: WebAssembly.Module;
    instance: WebAssembly.Instance;
    exports: any;
  }> {
    const response = await fetch(wasmUrl);
    const bytes = await response.arrayBuffer();
    const module = await WebAssembly.compile(bytes);
    const instance = await WebAssembly.instantiate(module);
    
    return {
      module,
      instance,
      exports: instance.exports
    };
  }
}

// Specialized market data processor using Bun globals
export class MarketDataProcessor {
  private logger = BunGlobalsIntegration.createStructuredLogger('MarketDataProcessor');
  private eventEmitter = BunGlobalsIntegration.createMarketEventEmitter();
  
  async processBatch(ticks: any[]): Promise<{
    processed: number;
    errors: number;
    duration: number;
  }> {
    BunGlobalsIntegration.createPerformanceMark('batch-start');
    
    const start = performance.now();
    let processed = 0;
    let errors = 0;
    
    try {
      // Process in microtasks for better performance
      for (const tick of ticks) {
        BunGlobalsIntegration.scheduleMicrotask(() => {
          try {
            this.eventEmitter.emitTick(tick);
            processed++;
          } catch (error) {
            errors++;
            this.logger.error('Tick processing failed', error);
          }
        });
      }
      
      // Wait for microtasks to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
    } catch (error) {
      this.logger.error('Batch processing failed', error);
      errors++;
    }
    
    const duration = performance.now() - start;
    BunGlobalsIntegration.createPerformanceMark('batch-end');
    
    const batchDuration = BunGlobalsIntegration.measurePerformance(
      'batch-processing',
      'batch-start',
      'batch-end'
    );
    
    this.logger.info('Batch processed', {
      totalTicks: ticks.length,
      processed,
      errors,
      duration,
      batchDuration
    });
    
    return { processed, errors, duration };
  }
  
  onTick(callback: (tick: any) => void): void {
    this.eventEmitter.onTick((event: MessageEvent) => callback(event.data));
  }
  
  onArbitrage(callback: (opportunity: any) => void): void {
    this.eventEmitter.onArbitrage((event: MessageEvent) => callback(event.data));
  }
}

export default BunGlobalsIntegration;
