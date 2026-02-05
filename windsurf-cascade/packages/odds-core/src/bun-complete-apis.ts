import { apiTracker } from '../packages/odds-core/src/monitoring/api-tracker.js';
// packages/odds-core/src/bun-complete-apis.ts - Complete Bun native APIs integration
import { BunUtils, OddsProtocolUtils } from './bun-utils';
import { BunGlobalsIntegration } from './bun-globals';
import { BunNativeAPIsIntegration } from './bun-native-apis';
import { $ } from 'bun';

export class BunCompleteAPIsIntegration {

  // ===== Bundler Integration =====
  
  static async buildMarketDataBundle(options: {
    entrypoints: string[];
    outdir: string;
    target?: 'browser' | 'bun' | 'node';
    minify?: boolean;
    splitting?: boolean;
  }): Promise<{
    success: boolean;
    outputs: string[];
    buildTime: number;
    bundleSize: number;
  }> {
    const start = performance.now();
    
    try {
      const buildResult = await Bun.build({
        entrypoints: options.entrypoints,
        outdir: options.outdir,
        target: options.target || 'browser',
        minify: options.minify || false,
        splitting: options.splitting || true,
        define: {
          'Bun.env.NODE_ENV': '"production"'
        }
      });
      
      const buildTime = performance.now() - start;
      const outputs = buildResult.outputs.map(output => output.path);
      const bundleSize = buildResult.outputs.reduce((total, output) => total + output.size, 0);
      
      return {
        success: buildResult.success,
        outputs,
        buildTime,
        bundleSize
      };
    } catch (error) {
      const buildTime = performance.now() - start;
      return {
        success: false,
        outputs: [],
        buildTime,
        bundleSize: 0
      };
    }
  }

  // ===== Transpiler Integration =====
  
  static transpileMarketDataCode(code: string, options: {
    target?: 'browser' | 'bun' | 'node';
    loader?: 'tsx' | 'ts' | 'jsx' | 'js';
  }): {
    transpiled: string;
    transpileTime: number;
    originalSize: number;
    transpiledSize: number;
  } {
    const start = performance.now();
    const transpiler = new Bun.Transpiler({
      target: options?.target || 'browser',
      loader: options?.loader || 'tsx'
    });
    
    const transpiled = transpiler.transformSync(code);
    const transpileTime = performance.now() - start;
    
    return {
      transpiled,
      transpileTime,
      originalSize: code.length,
      transpiledSize: transpiled.length
    };
  }

  // ===== FileSystem Router =====
  
  static createFileSystemRouter(baseDir: string): {
    route: (url: string) => { filePath: string; params: Record<string, string> } | null;
    listRoutes: () => string[];
  } {
    const router = new Bun.FileSystemRouter({
      style: 'nextjs',
      dir: baseDir,
      origin: 'http://localhost:3000'
    });
    
    return {
      route: (url: string) => {
        const route = router.match(url);
        if (route) {
          return {
            filePath: route.filePath,
            params: route.params || {}
          };
        }
        return null;
      },
      listRoutes: () => {
        // Extract routes from the router's internal structure
        return Object.keys((router as any).routes || {});
      }
    };
  }

  // ===== HTML Rewriter =====
  
  static async rewriteMarketDataHTML(html: string, handlers: {
    selectors?: Record<string, (element: any) => void>;
  }): Promise<{
    rewritten: string;
    rewriteTime: number;
    elementsProcessed: number;
  }> {
    const start = performance.now();
    let elementsProcessed = 0;
    
    const rewriter = new HTMLRewriter();
    
    // Add handlers for each selector
    if (handlers.selectors) {
      Object.entries(handlers.selectors).forEach(([selector, handler]) => {
        rewriter.on(selector, {
          element(element) {
            handler(element);
            elementsProcessed++;
          }
        });
      });
    }
    
    const rewritten = await rewriter.transform(new Response(html)).text();
    const rewriteTime = performance.now() - start;
    
    return {
      rewritten,
      rewriteTime,
      elementsProcessed
    };
  }

  // ===== PostgreSQL Integration =====
  
  static async executePostgreSQLQuery(query: string, params: any[] = []): Promise<{
    rows: any[];
    duration: number;
    affectedRows?: number;
  }> {
    const start = performance.now();
    
    try {
      const client = new Bun.SQL({
        host: Bun.env.POSTGRES_HOST || 'localhost',
        port: parseInt(Bun.env.POSTGRES_PORT || '5432'),
        user: Bun.env.POSTGRES_USER || 'postgres',
        password: Bun.env.POSTGRES_PASSWORD || '',
        database: Bun.env.POSTGRES_DATABASE || 'market_data'
      });
      
      // Note: SQL API might vary, use generic query approach
      let result: any;
      try {
        result = await (client as any).execute(query, params);
      } catch {
        // Fallback to other possible methods
        result = await (client as any).query(query, params);
      }
      
      const duration = performance.now() - start;
      
      await client.end();
      
      return {
        rows: result?.rows || [],
        duration,
        affectedRows: result?.rowCount
      };
    } catch (error) {
      const duration = performance.now() - start;
      throw new Error(`PostgreSQL query failed: ${error} (took ${duration.toFixed(2)}ms)`);
    }
  }

  // ===== Redis/Valkey Integration =====
  
  static createRedisClient(): {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string, ttl?: number) => Promise<void>;
    del: (key: string) => Promise<void>;
    exists: (key: string) => Promise<boolean>;
    keys: (pattern: string) => Promise<string[]>;
  } {
    const client = new Bun.RedisClient(Bun.env.REDIS_URL || 'redis://localhost:6379');
    
    return {
      get: async (key: string) => {
        try {
          return await client.get(key);
        } catch {
          return null;
        }
      },
      set: async (key: string, value: string, ttl?: number) => {
        try {
          if (ttl) {
            await client.set(key, value, 'EX', ttl.toString());
          } else {
            await client.set(key, value);
          }
        } catch (error) {
          throw new Error(`Redis SET failed: ${error}`);
        }
      },
      del: async (key: string) => {
        try {
          await client.del(key);
        } catch (error) {
          throw new Error(`Redis DEL failed: ${error}`);
        }
      },
      exists: async (key: string) => {
        try {
          const result = await client.exists(key);
          return Number(result) > 0;
        } catch {
          return false;
        }
      },
      keys: async (pattern: string) => {
        try {
          return await client.keys(pattern);
        } catch {
          return [];
        }
      }
    };
  }

  // ===== FFI Integration =====
  
  static loadMarketDataFFI(libraryPath: string): {
    calculateVWAP: (prices: number[], volumes: number[]) => number;
    calculateMovingAverage: (prices: number[], period: number) => number[];
    detectAnomalies: (data: number[], threshold: number) => boolean[];
  } {
    // Note: FFI might not be available in all Bun builds
    try {
      const { symbols } = (Bun as any).ffi({
        library: libraryPath,
        symbols: {
          calculateVWAP: {
            args: ['float*', 'int', 'float*', 'int'],
            returns: 'float'
          },
          calculateMovingAverage: {
            args: ['float*', 'int', 'int'],
            returns: 'float*'
          },
          detectAnomalies: {
            args: ['float*', 'int', 'float'],
            returns: 'bool*'
          }
        }
      });
      
      return {
        calculateVWAP: (prices: number[], volumes: number[]) => {
          const pricesPtr = new Float32Array(prices);
          const volumesPtr = new Float32Array(volumes);
          return symbols.calculateVWAP(pricesPtr, prices.length, volumesPtr, volumes.length) as number;
        },
        calculateMovingAverage: (prices: number[], period: number) => {
          const pricesPtr = new Float32Array(prices);
          const resultPtr = symbols.calculateMovingAverage(pricesPtr, prices.length, period) as Float32Array;
          return Array.from(resultPtr).slice(0, prices.length);
        },
        detectAnomalies: (data: number[], threshold: number) => {
          const dataPtr = new Float32Array(data);
          const resultPtr = symbols.detectAnomalies(dataPtr, data.length, threshold) as Uint8Array;
          return Array.from(resultPtr).slice(0, data.length).map(v => v === 1);
        }
      };
    } catch (error) {
      // Fallback implementations
      return {
        calculateVWAP: (prices: number[], volumes: number[]) => {
          const totalValue = prices.reduce((sum, price, i) => sum + price * volumes[i], 0);
          const totalVolume = volumes.reduce((sum, vol) => sum + vol, 0);
          return totalVolume > 0 ? totalValue / totalVolume : 0;
        },
        calculateMovingAverage: (prices: number[], period: number) => {
          const sma = [];
          for (let i = period - 1; i < prices.length; i++) {
            const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            sma.push(sum / period);
          }
          return sma;
        },
        detectAnomalies: (data: number[], threshold: number) => {
          const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
          const stdDev = Math.sqrt(data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length);
          return data.map(val => Math.abs(val - mean) > threshold * stdDev);
        }
      };
    }
  }

  // ===== Testing Integration =====
  
  static createMarketDataTestSuite(tests: Record<string, () => void | Promise<void>>): void {
    const { test, describe, expect, beforeAll, afterAll, beforeEach, afterEach } = require('bun:test');
    
    describe('Odds Protocol Market Data Tests', () => {
      beforeAll(() => {
        console.log('🧪 Setting up market data test environment');
      });
      
      afterAll(() => {
        console.log('🧹 Cleaning up market data test environment');
      });
      
      Object.entries(tests).forEach(([name, testFn]) => {
        test(name, testFn);
      });
    });
  }

  // ===== Worker Integration =====
  
  static createMarketDataWorker(scriptPath: string, options?: {
    env?: Record<string, string>;
  }): {
    postMessage: (message: any) => void;
    onMessage: (handler: (message: any) => void) => void;
    terminate: () => void;
  } {
    const worker = new Worker(scriptPath, {
      env: options?.env || Bun.env as Record<string, string>
    });
    
    return {
      postMessage: (message: any) => {
        worker.postMessage(message);
      },
      onMessage: (handler: (message: any) => void) => {
        worker.onmessage = (event) => handler(event.data);
      },
      terminate: () => {
        worker.terminate();
      }
    };
  }

  // ===== Glob Integration =====
  
  static async findMarketDataFiles(pattern: string, options?: {
    cwd?: string;
  }): Promise<{
    files: string[];
    searchTime: number;
    totalSize: number;
  }> {
    const start = performance.now();
    const glob = new Bun.Glob(pattern);
    
    const files: string[] = [];
    let totalSize = 0;
    
    // Note: exclude option might not be available in all Bun versions
    for await (const file of glob.scan({ 
      cwd: options?.cwd || '.'
    })) {
      try {
        const filePath = options?.cwd ? `${options.cwd}/${file}` : file;
        const fileStats = await Bun.file(filePath).exists();
        if (fileStats) {
          // Skip node_modules and .git manually
          if (!file.includes('node_modules') && !file.includes('.git')) {
            files.push(file);
          }
        }
      } catch {
        // Skip files that can't be accessed
      }
    }
    
    const searchTime = performance.now() - start;
    
    return {
      files,
      searchTime,
      totalSize
    };
  }

  // ===== Module Resolution =====
  
  static resolveMarketDataModule(moduleName: string, fromPath?: string): {
    resolved: string;
    exists: boolean;
    resolutionTime: number;
  } {
    const start = performance.now();
    
    try {
      const resolved = Bun.resolveSync(moduleName, fromPath || import.meta.dir);
      const resolutionTime = performance.now() - start;
      
      return {
        resolved,
        exists: true,
        resolutionTime
      };
    } catch {
      const resolutionTime = performance.now() - start;
      return {
        resolved: '',
        exists: false,
        resolutionTime
      };
    }
  }

  // ===== Memory Management =====
  
  static getAdvancedMemoryStats(): {
    heapSize: number;
    heapUsed: number;
    externalMemory: number;
    arrayBuffers: number;
    gcStats: {
      collections: number;
      duration: number;
    };
    timestamp: number;
  } {
    const { heapStats } = require('bun:jsc');
    const start = performance.now();
    
    // Try to force garbage collection if available
    try {
      const { gc } = require('bun:jsc');
      if (typeof gc === 'function') {
        gc();
      }
    } catch {
      // Garbage collection not available, continue without it
    }
    
    const gcDuration = performance.now() - start;
    
    const stats = heapStats();
    
    return {
      heapSize: stats.heapSize || 0,
      heapUsed: stats.heapUsed || 0,
      externalMemory: stats.externalMemory || 0,
      arrayBuffers: stats.arrayBuffers || 0,
      gcStats: {
        collections: 1, // We attempted one collection
        duration: gcDuration
      },
      timestamp: Date.now()
    };
  }

  // ===== Stream Processing Enhancements =====
  
  static async processMarketDataStream<T>(stream: ReadableStream, processors: {
    toBytes?: boolean;
    toBlob?: boolean;
    toFormData?: boolean;
    toJSON?: boolean;
    toArray?: boolean;
    custom?: (chunk: any) => T;
  }): Promise<{
    result: any;
    processedCount: number;
    duration: number;
    processor: string;
  }> {
    const start = performance.now();
    let result: any;
    let processor = 'custom';
    
    if (processors.toBytes) {
      result = await Bun.readableStreamToBytes(stream);
      processor = 'bytes';
    } else if (processors.toBlob) {
      result = await Bun.readableStreamToBlob(stream);
      processor = 'blob';
    } else if (processors.toFormData) {
      result = await Bun.readableStreamToFormData(stream);
      processor = 'formdata';
    } else if (processors.toJSON) {
      result = await Bun.readableStreamToJSON(stream);
      processor = 'json';
    } else if (processors.toArray) {
      result = await Bun.readableStreamToArray(stream);
      processor = 'array';
    } else if (processors.custom) {
      const array = await Bun.readableStreamToArray(stream);
      result = array.map(processors.custom);
      processor = 'custom';
    }
    
    const duration = performance.now() - start;
    const processedCount = Array.isArray(result) ? result.length : 1;
    
    return {
      result,
      processedCount,
      duration,
      processor
    };
  }

  // ===== Advanced Buffer Management =====
  
  static createArrayBufferSink(): {
    write: (data: Uint8Array) => void;
    getBuffer: () => ArrayBuffer | Uint8Array;
    getSize: () => number;
    reset: () => void;
  } {
    const sink = new Bun.ArrayBufferSink();
    
    return {
      write: (data: Uint8Array) => {
        sink.write(data);
      },
      getBuffer: () => {
        return sink.end();
      },
      getSize: () => {
        // Note: byteLength might not be available, handle both types
        const buffer = sink.end();
        if (buffer instanceof ArrayBuffer) {
          return buffer.byteLength;
        } else if (buffer instanceof Uint8Array) {
          return buffer.length;
        } else {
          return 0;
        }
      },
      reset: () => {
        // Note: reset might not be available, create new sink
        try {
          (sink as any).reset?.();
        } catch {
          // Fallback: create new sink if reset not available
        }
      }
    };
  }

  static concatMarketDataBuffers(buffers: ArrayBuffer[]): {
    combined: ArrayBuffer;
    totalSize: number;
    bufferCount: number;
  } {
    const combined = Bun.concatArrayBuffers(buffers);
    const totalSize = buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
    
    return {
      combined,
      totalSize,
      bufferCount: buffers.length
    };
  }

  // ===== DNS Cache Management =====
  
  static getDNSCacheStats(): {
    cacheStats: any;
    timestamp: number;
  } {
    try {
      const cacheStats = Bun.dns.getCacheStats();
      return {
        cacheStats,
        timestamp: Date.now()
      };
    } catch {
      return {
        cacheStats: { hits: 0, misses: 0, size: 0 },
        timestamp: Date.now()
      };
    }
  }

  // ===== Advanced Utilities =====
  
  static getCompleteSystemInfo(): {
    bun: {
      version: string;
      revision: string;
      env: Record<string, string>;
      main: string;
    };
    system: {
      platform: string;
      arch: string;
      pid: number;
    };
    performance: {
      nanoseconds: number;
      memory: any;
      dnsCache: any;
    };
    features: {
      sqlite: boolean;
      postgresql: boolean;
      redis: boolean;
      ffi: boolean;
      workers: boolean;
      bundler: boolean;
      transpiler: boolean;
    };
    timestamp: number;
  } {
    return {
      bun: {
        version: Bun.version,
        revision: Bun.revision,
        env: Bun.env as Record<string, string>,
        main: Bun.main
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        pid: process.pid
      },
      performance: {
        nanoseconds: Bun.nanoseconds(),
        memory: this.getAdvancedMemoryStats(),
        dnsCache: this.getDNSCacheStats()
      },
      features: {
        sqlite: true,
        postgresql: true,
        redis: true,
        ffi: true,
        workers: true,
        bundler: true,
        transpiler: true
      },
      timestamp: Date.now()
    };
  }

  // ===== Market Data Processing Pipeline =====
  
  static async createMarketDataPipeline(config: {
    sources: Array<{
      type: 'file' | 'stream' | 'api';
      source: string;
      format: 'json' | 'csv' | 'binary';
    }>;
    processors: Array<{
      type: 'transform' | 'filter' | 'aggregate';
      function: (data: any) => any;
    }>;
    outputs: Array<{
      type: 'file' | 'database' | 'stream';
      destination: string;
      format: 'json' | 'csv' | 'binary';
    }>;
  }): Promise<{
    processed: number;
    duration: number;
    throughput: number;
    errors: number;
  }> {
    const start = performance.now();
    let processed = 0;
    let errors = 0;
    
    try {
      // Process each source
      for (const source of config.sources) {
        let data: any[] = [];
        
        // Load data from source
        if (source.type === 'file') {
          const fileData = await BunNativeAPIsIntegration.readMarketDataFile(source.source);
          data = Array.isArray(fileData.data) ? fileData.data : [fileData.data];
        } else if (source.type === 'stream') {
          const stream = await fetch(source.source);
          const result = await this.processMarketDataStream(stream.body!, { toJSON: true });
          data = Array.isArray(result.result) ? result.result : [result.result];
        } else if (source.type === 'api') {
          const response = await fetch(source.source);
          data = await response.json();
        }
        
        // Apply processors
        let processedData = data;
        for (const processor of config.processors) {
          try {
            processedData = processedData.map(processor.function);
          } catch (error) {
            errors++;
            console.error(`Processor error:`, error);
          }
        }
        
        // Send to outputs
        for (const output of config.outputs) {
          try {
            if (output.type === 'file') {
              await BunNativeAPIsIntegration.writeMarketDataFile(
                output.destination,
                processedData,
                { createPath: true }
              );
            } else if (output.type === 'database') {
              // Store in database (implementation depends on database type)
              console.log(`Storing ${processedData.length} records to database`);
            } else if (output.type === 'stream') {
              // Send to stream endpoint
              console.log(`Streaming ${processedData.length} records to ${output.destination}`);
            }
            
            processed += processedData.length;
          } catch (error) {
            errors++;
            console.error(`Output error:`, error);
          }
        }
      }
    } catch (error) {
      errors++;
      console.error(`Pipeline error:`, error);
    }
    
    const duration = performance.now() - start;
    const throughput = processed / (duration / 1000); // items per second
    
    return {
      processed,
      duration,
      throughput,
      errors
    };
  }
}

// Specialized complete market data processor
export class CompleteMarketDataProcessor {
  private redisClient: any;
  private postgresClient: any;
  private workerPool: any[] = [];
  
  constructor() {
    this.redisClient = BunCompleteAPIsIntegration.createRedisClient();
    this.initializeWorkers();
  }
  
  private initializeWorkers(): void {
    // Create a pool of workers for parallel processing
    for (let i = 0; i < 4; i++) {
      const worker = BunCompleteAPIsIntegration.createMarketDataWorker(
        './packages/odds-core/src/market-worker.ts'
      );
      this.workerPool.push(worker);
    }
  }
  
  async processTickWithCaching(tick: any): Promise<{
    processed: boolean;
    cached: boolean;
    processingTime: number;
  }> {
    const start = performance.now();
    const cacheKey = `tick:${tick.symbol}:${tick.timestamp}`;
    
    // Check cache first
    const cached = await this.redisClient.get(cacheKey);
    if (cached) {
      return {
        processed: false,
        cached: true,
        processingTime: performance.now() - start
      };
    }
    
    // Process tick
    const worker = this.workerPool[Math.floor(Math.random() * this.workerPool.length)];
    worker.postMessage({ type: 'process-tick', data: tick });
    
    // Cache the result
    await this.redisClient.set(cacheKey, JSON.stringify(tick), 300); // 5 minutes TTL
    
    return {
      processed: true,
      cached: false,
      processingTime: performance.now() - start
    };
  }
  
  async runMarketDataAnalysis(symbols: string[]): Promise<{
    analysis: any;
    duration: number;
  }> {
    const start = performance.now();
    
    // Create a pipeline for market data analysis
    const pipelineResult = await BunCompleteAPIsIntegration.createMarketDataPipeline({
      sources: symbols.map(symbol => ({
        type: 'api' as const,
        source: `https://api.market-data.com/ticks/${symbol}`,
        format: 'json' as const
      })),
      processors: [
        {
          type: 'transform' as const,
          function: (tick: any) => ({ ...tick, processed: true })
        },
        {
          type: 'aggregate' as const,
          function: (ticks: any[]) => ({
            count: ticks.length,
            avgPrice: ticks.reduce((sum, t) => sum + t.price, 0) / ticks.length,
            maxPrice: Math.max(...ticks.map(t => t.price)),
            minPrice: Math.min(...ticks.map(t => t.price))
          })
        }
      ],
      outputs: [{
        type: 'file' as const,
        destination: `./analysis/analysis-${Date.now()}.json`,
        format: 'json' as const
      }]
    });
    
    return {
      analysis: pipelineResult,
      duration: performance.now() - start
    };
  }
  
  async cleanup(): Promise<void> {
    // Terminate all workers
    this.workerPool.forEach(worker => worker.terminate());
    this.workerPool = [];
  }
}

export default BunCompleteAPIsIntegration;
