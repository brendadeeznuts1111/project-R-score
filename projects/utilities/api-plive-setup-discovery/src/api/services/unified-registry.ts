// src/api/services/unified-registry.ts - Unified Registry Service
// Phase 3: Single entry point combining all optimizations
// Performance target: <0.5ms total time, 1B+ file scalability

import { hybridCache } from './cache-service';
import { file, YAML } from 'bun';
// Worker is a global in Bun, no need to import

interface AIGenerationRequest {
  title: string;
  scope: string;
  type: string;
  context?: Record<string, any>;
}

interface GeneratedContent {
  header: string;
  grepable: string;
  config: string;
  metadata: {
    hash: string;
    timestamp: string;
  };
}

/**
 * Unified Registry combining all Phase 3 optimizations:
 * - Hybrid caching (Map + Redis)
 * - Bun.write() for storage
 * - Bun.hash() for hashing
 * - Bun.Worker for batch processing
 */
export class UnifiedRegistry {
  private cache: typeof hybridCache;
  private config: any;
  private headerSchema: any;
  private initialized = false;

  constructor() {
    this.cache = hybridCache;
  }

  async initialize() {
    if (this.initialized) return;
    
    // Load config once
    this.config = YAML.parse(await file('bun.yaml').text());
    this.headerSchema = this.config.header?.schema || {};
    this.initialized = true;
  }

  /**
   * Generate and store in one optimized operation
   * Combines cache check, generation, storage, and caching
   */
  async generateAndStore(request: AIGenerationRequest): Promise<GeneratedContent> {
    await this.initialize();
    const startTime = performance.now();

    // Check cache first
    const cacheKey = `${request.scope}-${request.type}-${request.title}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached; // Cache hit - return immediately
    }

    // Generate (optimized)
    const result = await this.generateOptimized(request);

    // Store and cache in parallel (non-blocking for cache hits)
    const storePromise = this.storeOptimized(result.config, result.metadata);
    const cachePromise = this.cache.set(cacheKey, result);

    // Wait for both to complete
    await Promise.all([storePromise, cachePromise]);

    const duration = performance.now() - startTime;
    if (duration > 0.5) {
      console.warn(`⚠️  Unified operation took ${duration}ms (target: <0.5ms)`);
    }

    return result;
  }

  /**
   * Optimized generation using Bun.hash()
   */
  private async generateOptimized(request: AIGenerationRequest): Promise<GeneratedContent> {
    // Validate scope
    const validScopes = this.headerSchema.scope?.enum || ['GOV', 'SEC', 'OPS', 'TECH', 'FIN', 'LEG', 'AUD', 'COMP', 'DASHBOARD'];
    if (!validScopes.includes(request.scope)) {
      throw new Error(`Invalid scope: ${request.scope}`);
    }

    // Validate type
    const validTypes = this.headerSchema.type?.enum || ['RULES', 'SUMMARY', 'PROCEDURE', 'TEMPLATE', 'POLICY', 'STANDARD', 'GUIDANCE', 'REQUIREMENT', 'CONFIG'];
    if (!validTypes.includes(request.type)) {
      throw new Error(`Invalid type: ${request.type}`);
    }

    // Generate header
    const variant = this.generateVariant(request);
    const id = this.generateID(request.scope, request.type);
    const version = this.headerSchema.version?.default || 'v2.9';
    const status = this.headerSchema.status?.default || 'REQUIRED';

    const header = `[${request.scope}][${request.type}][${variant}][${id}][${version}][${status}]`;
    const grepable = `[${request.scope.toLowerCase()}-${request.type.toLowerCase()}-${variant.toLowerCase()}-${id.toLowerCase()}-${version}-${status.toLowerCase()}]`;

    // Generate YAML config
    const config = this.generateYAMLConfig(request, header);

    // Generate hash using Bun.hash() for speed
    const configBuffer = new TextEncoder().encode(config);
    const hashValue = Bun.hash(configBuffer);
    const hash = typeof hashValue === 'bigint' ? hashValue.toString(16) : hashValue.toString(16);

    return {
      header,
      grepable,
      config,
      metadata: {
        hash: hash.substring(0, 8),
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Optimized storage using Bun.write()
   */
  private async storeOptimized(content: string, metadata: any): Promise<string> {
    const contentBuffer = new TextEncoder().encode(content);
    
    // Generate hash if not provided
    let hash: string;
    if (metadata.hash) {
      hash = metadata.hash;
    } else {
      const hashValue = Bun.hash(contentBuffer);
      hash = (typeof hashValue === 'bigint' ? hashValue.toString(16) : hashValue.toString(16)).substring(0, 8);
    }
    
    const path = `rules/ai-${hash}.yaml`;
    
    // Use Bun.write() for async I/O
    await Bun.write(path, contentBuffer);
    
    return path;
  }

  /**
   * Batch processing using Bun.Worker
   */
  async generateBatch(requests: AIGenerationRequest[]): Promise<GeneratedContent[]> {
    await this.initialize();
    const startTime = performance.now();
    
    // Use workers for parallel processing
    const workerCount = Math.min(requests.length, 4);
    const chunkSize = Math.ceil(requests.length / workerCount);
    
    // Create workers
    const workers: Worker[] = [];
    for (let i = 0; i < workerCount; i++) {
      workers.push(new Worker('./src/api/workers/ai-generation-worker.ts'));
    }
    
    // Split requests into chunks
    const chunks: AIGenerationRequest[][] = [];
    for (let i = 0; i < requests.length; i += chunkSize) {
      chunks.push(requests.slice(i, i + chunkSize));
    }
    
    // Process chunks in parallel
    const promises = chunks.map((chunk, chunkIndex) => {
      return new Promise<GeneratedContent[]>((resolve, reject) => {
        const worker = workers[chunkIndex % workerCount];
        
        worker.onmessage = (event: MessageEvent) => {
          const { batchId, results, success, error } = event.data;
          if (success) {
            resolve(results);
          } else {
            reject(new Error(error || 'Worker failed'));
          }
        };
        
        worker.onerror = (error) => {
          reject(error);
        };
        
        worker.postMessage({
          type: 'generate',
          requests: chunk,
          batchId: chunkIndex
        });
      });
    });
    
    try {
      const results = await Promise.all(promises);
      const flattened = results.flat();
      
      // Clean up workers
      workers.forEach(worker => worker.terminate());
      
      const duration = performance.now() - startTime;
      const throughput = Math.round((requests.length / duration) * 1000);
      
      if (throughput < 2000) {
        console.warn(`⚠️  Throughput ${throughput} ops/sec (target: 2000+ ops/sec)`);
      }
      
      return flattened;
    } catch (error) {
      workers.forEach(worker => worker.terminate());
      throw error;
    }
  }

  private generateVariant(request: AIGenerationRequest): string {
    if (request.context?.env === 'prod') return 'PROD';
    if (request.context?.env === 'dev') return 'DEV';
    return 'BASE';
  }

  private generateID(scope: string, type: string): string {
    const random = Math.floor(Math.random() * 999) + 1;
    return `${scope}-${type}-${random.toString().padStart(3, '0')}`;
  }

  private generateYAMLConfig(request: AIGenerationRequest, header: string): string {
    const config: any = {
      header: header,
      title: request.title,
      scope: request.scope,
      type: request.type,
      version: this.headerSchema.version?.default || 'v2.9',
      status: this.headerSchema.status?.default || 'REQUIRED',
      createdAt: new Date().toISOString()
    };

    if (request.context) {
      config.context = request.context;
    }

    config.metadata = {
      generated: true,
      source: 'unified-registry',
      timestamp: new Date().toISOString()
    };

    return YAML.stringify(config);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }
}

// Export singleton instance
export const unifiedRegistry = new UnifiedRegistry();

