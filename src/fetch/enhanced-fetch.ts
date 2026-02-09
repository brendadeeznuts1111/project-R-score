// src/fetch/enhanced-fetch.ts
// 🔒 BUN FETCH API FIXES APPLIED:
// - HTTP proxy with redirects: no crash on socket close
// - mTLS: per-request certificates now respected (not reusing first cert)
// - Request.prototype.text(): fixed "undefined is not a function" error
// - Request constructor: cache and mode options now respected
// - NO_PROXY: port numbers now respected (e.g., localhost:8080)
import { createHash } from 'crypto';

// FactoryWager GOV Headers Schema
interface GOVHeaders {
  'X-FactoryWager-Scope': 'SEC' | 'OPS' | 'AI';
  'X-FactoryWager-Version': string;
  'X-FactoryWager-Trace': string;
  'X-Content-Hash'?: string;
  'Authorization'?: string;
  'Content-Type'?: string;
  'User-Agent'?: string;
}

// Enhanced Fetch Options
interface EnhancedFetchOptions extends RequestInit {
  headers?: HeadersInit | Record<string, string>;
  integrity?: boolean;
  cache?: 'force-cache' | 'no-cache' | 'default';
  timeout?: number;
  retries?: number;
  benchmark?: boolean;
}

// Performance Metrics
interface FetchMetrics {
  url: string;
  method: string;
  startTime: number;
  endTime: number;
  duration: number;
  headersSize: number;
  bodySize: number;
  integrityCheck?: number;
  cacheHit?: boolean;
  retries: number;
}

// Global metrics collector
class FetchMetricsCollector {
  private metrics: FetchMetrics[] = [];
  private hotPaths = new Map<string, { count: number; avgTime: number; }>();

  record(metric: FetchMetrics) {
    this.metrics.push(metric);
    
    // Update hot paths
    const key = `${metric.method}:${new URL(metric.url).pathname}`;
    const current = this.hotPaths.get(key) || { count: 0, avgTime: 0 };
    current.count++;
    current.avgTime = (current.avgTime + metric.duration) / 2;
    this.hotPaths.set(key, current);
    
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  getStats() {
    const totalRequests = this.metrics.length;
    const avgDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests;
    const cacheHitRate = this.metrics.filter(m => m.cacheHit).length / totalRequests;
    
    return {
      totalRequests,
      avgDuration,
      cacheHitRate,
      hotPaths: Object.fromEntries(this.hotPaths),
      throughput: totalRequests / (Date.now() / 1000), // requests per second
    };
  }
}

const metricsCollector = new FetchMetricsCollector();

// GOV Headers Factory
export function createGOVHeaders(
  scope: 'SEC' | 'OPS' | 'AI', 
  extras: Record<string, string> = {}
): Headers {
  const base: GOVHeaders = {
    'X-FactoryWager-Scope': scope,
    'X-FactoryWager-Version': 'v4.0',
    'X-FactoryWager-Trace': crypto.randomUUID(),
    ...extras
  };
  
  return new Headers(base);
}

// Compute SHA-256 hash for integrity
export async function computeRequestHash(data: string | Uint8Array): Promise<string> {
  const input = typeof data === 'string' ? data : new TextDecoder().decode(data);
  return createHash('sha256').update(input).digest('hex');
}

// Verify response integrity
export async function verifyResponseIntegrity(
  response: Response, 
  body: Uint8Array
): Promise<boolean> {
  const serverHash = response.headers.get('X-Content-Hash');
  if (!serverHash) return true; // No hash provided, assume valid
  
  const computedHash = await computeRequestHash(body);
  return serverHash === computedHash;
}

// Enhanced fetch with GOV headers and integrity
export async function enhancedFetch(
  url: string, 
  options: EnhancedFetchOptions = {}
): Promise<Response> {
  const startTime = performance.now();
  const method = options.method || 'GET';
  let retries = 0;
  const maxRetries = options.retries || 3;
  
  // Prepare headers
  let headers: Headers;
  if (options.headers instanceof Headers) {
    headers = options.headers;
  } else if (options.headers) {
    headers = new Headers(options.headers);
  } else {
    headers = new Headers();
  }
  
  // Add default FactoryWager headers if not present
  if (!headers.has('X-FactoryWager-Scope')) {
    headers.set('X-FactoryWager-Scope', 'OPS');
    headers.set('X-FactoryWager-Version', 'v4.0');
    headers.set('X-FactoryWager-Trace', crypto.randomUUID());
  }
  
  // Add content hash for POST/PUT requests
  if (options.body && !headers.has('X-Content-Hash')) {
    const bodyStr = typeof options.body === 'string' 
      ? options.body 
      : JSON.stringify(options.body);
    const hash = await computeRequestHash(bodyStr);
    headers.set('X-Content-Hash', hash);
  }
  
  // Retry logic
  while (retries <= maxRetries) {
    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: options.timeout ? AbortSignal.timeout(options.timeout) : undefined,
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Record metrics
      const metrics: FetchMetrics = {
        url,
        method,
        startTime,
        endTime,
        duration,
        headersSize: JSON.stringify(Object.fromEntries(headers.entries())).length,
        bodySize: parseInt(headers.get('Content-Length') || '0'),
        retries,
        cacheHit: response.headers.get('X-Cache') === 'HIT',
      };
      
      // Integrity check if requested
      if (options.integrity && response.ok) {
        const integrityStart = performance.now();
        const body = await response.clone().bytes();
        const isValid = await verifyResponseIntegrity(response, body);
        metrics.integrityCheck = performance.now() - integrityStart;
        
        if (!isValid) {
          throw new Error('Response integrity violation detected');
        }
      }
      
      metricsCollector.record(metrics);
      
      // Log benchmark if requested
      if (options.benchmark) {
        console.log(`🚀 Fetch Benchmark: ${method} ${url} - ${duration.toFixed(2)}ms`);
      }
      
      return response;
      
    } catch (error) {
      retries++;
      if (retries > maxRetries) {
        throw error;
      }
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 100));
    }
  }
  
  throw new Error('Max retries exceeded');
}

// Specialized fetch functions

// Authenticated fetch with token
export async function authorizedFetch(
  path: string, 
  options: { scope?: 'SEC' | 'OPS' | 'AI'; token?: string } & Omit<EnhancedFetchOptions, 'headers'>
): Promise<Response> {
  const { scope = 'SEC', token, ...fetchOptions } = options;
  
  const headers = createGOVHeaders(scope, {
    ...(token && { 'Authorization': `Bearer ${token}` }),
    'Content-Type': 'application/json',
  });
  
  return enhancedFetch(path, { ...fetchOptions, headers });
}

// Integrity-verified fetch
export async function fetchWithIntegrity(
  url: string, 
  options: EnhancedFetchOptions = {}
): Promise<Response> {
  return enhancedFetch(url, { ...options, integrity: true });
}

// Streaming fetch for large data
export async function fetchStream(
  url: string,
  options: EnhancedFetchOptions = {}
): Promise<ReadableStream<Uint8Array>> {
  const response = await enhancedFetch(url, options);
  return response.body!;
}

// Batch fetch for multiple requests
export async function batchFetch(
  requests: Array<{ url: string; options?: EnhancedFetchOptions }>
): Promise<Response[]> {
  const promises = requests.map(({ url, options }) => enhancedFetch(url, options));
  return Promise.all(promises);
}

// Get fetch metrics
export function getFetchMetrics() {
  return metricsCollector.getStats();
}

// Zero-copy body parsing utilities
export class BodyParser {
  static async parseFast<T = any>(response: Response): Promise<T> {
    // Use .bytes() for zero-copy, then decode manually
    const bytes = await response.bytes();
    const text = new TextDecoder().decode(bytes);
    return JSON.parse(text);
  }
  
  static async parseWithIntegrity<T = any>(response: Response): Promise<T> {
    const bytes = await response.bytes();
    const isValid = await verifyResponseIntegrity(response, bytes);
    if (!isValid) {
      throw new Error('Body integrity check failed');
    }
    const text = new TextDecoder().decode(bytes);
    return JSON.parse(text);
  }
  
  static async streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];
    let totalLength = 0;
    
    const reader = stream.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      chunks.push(value);
      totalLength += value.length;
    }
    
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result;
  }
}

// CLI Benchmark utilities
export class FetchBenchmark {
  static async runBenchmark(
    url: string,
    options: { count?: number; concurrency?: number; bodyType?: 'json' | 'text' | 'bytes' } = {}
  ) {
    const { count = 1000, concurrency = 10, bodyType = 'json' } = options;
    const startTime = performance.now();
    
    console.log(`🚀 Starting Fetch Benchmark: ${count} requests to ${url}`);
    console.log(`Concurrency: ${concurrency}, Body Type: ${bodyType}`);
    
    const batches = Math.ceil(count / concurrency);
    const results: number[] = [];
    
    for (let i = 0; i < batches; i++) {
      const batch = Array.from({ length: Math.min(concurrency, count - i * concurrency) }, () =>
        enhancedFetch(url, { benchmark: false }).then(async (res) => {
          const start = performance.now();
          
          switch (bodyType) {
            case 'json':
              await res.json();
              break;
            case 'text':
              await res.text();
              break;
            case 'bytes':
              await res.bytes();
              break;
          }
          
          return performance.now() - start;
        })
      );
      
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
      
      console.log(`Batch ${i + 1}/${batches} completed (${batchResults.length} requests)`);
    }
    
    const totalTime = performance.now() - startTime;
    const avgTime = results.reduce((sum, time) => sum + time, 0) / results.length;
    const minTime = Math.min(...results);
    const maxTime = Math.max(...results);
    const throughput = count / (totalTime / 1000);
    
    console.log('\n📊 Benchmark Results:');
    console.log(`Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(`Requests: ${count}`);
    console.log(`Throughput: ${throughput.toFixed(2)} req/sec`);
    console.log(`Average Response Time: ${avgTime.toFixed(2)}ms`);
    console.log(`Min Response Time: ${minTime.toFixed(2)}ms`);
    console.log(`Max Response Time: ${maxTime.toFixed(2)}ms`);
    
    const metrics = getFetchMetrics();
    console.log(`\n🔥 Global Metrics:`);
    console.log(`Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`Hot Paths: ${Object.keys(metrics.hotPaths).length}`);
    
    return {
      totalTime,
      count,
      throughput,
      avgTime,
      minTime,
      maxTime,
      metrics
    };
  }
}

// Export all enhancements
export default {
  enhancedFetch,
  authorizedFetch,
  fetchWithIntegrity,
  fetchStream,
  batchFetch,
  createGOVHeaders,
  computeRequestHash,
  verifyResponseIntegrity,
  BodyParser,
  FetchBenchmark,
  getFetchMetrics,
};
