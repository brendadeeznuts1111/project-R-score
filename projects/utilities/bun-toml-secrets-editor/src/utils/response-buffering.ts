import { dns, fetch, write } from "bun";

/**
 * Response Buffering Utilities for bun-toml-secrets-editor
 * Implements optimal buffering strategies for different response types
 */

export interface BufferingOptions {
  timeout?: number;
  maxRetries?: number;
  bufferSize?: number;
  streamToFile?: boolean;
}

export interface FetchResult<T = any> {
  data: T;
  status: number;
  headers: Headers;
  size: number;
  cached: boolean;
}

/**
 * Optimized fetch with automatic buffering strategy selection
 */
export async function optimizedFetch<T = any>(
  url: string,
  options: BufferingOptions & RequestInit = {}
): Promise<FetchResult<T>> {
  const {
    timeout = 30000,
    maxRetries = 3,
    bufferSize = 1024 * 1024, // 1MB
    streamToFile = false,
    ...fetchOptions
  } = options;

  // DNS prefetch for performance
  try {
    const urlObj = new URL(url);
    dns.prefetch(urlObj.hostname);
  } catch (error) {
    console.warn(`DNS prefetch failed for ${url}:`, error);
  }

  // Retry logic with exponential backoff
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
        verbose: process.env.DEBUG === 'true'
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check content length to determine buffering strategy
      const contentLength = response.headers.get('content-length');
      const size = contentLength ? parseInt(contentLength) : 0;
      const contentType = response.headers.get('content-type') || '';

      let data: T;

      if (streamToFile && size > bufferSize) {
        // Stream large responses directly to file
        const filename = `temp-${Date.now()}.tmp`;
        await write(filename, response);
        data = filename as T;
      } else if (contentType.includes('application/json')) {
        // JSON responses
        data = await response.json();
      } else if (contentType.includes('text/') || contentType.includes('application/xml')) {
        // Text responses
        data = await response.text() as T;
      } else if (contentType.includes('application/octet-stream') || 
                 contentType.includes('application/zip') ||
                 contentType.includes('image/') ||
                 contentType.includes('video/')) {
        // Binary responses - use arrayBuffer as bytes() is not standard
        const arrayBuffer = await response.arrayBuffer();
        data = new Uint8Array(arrayBuffer) as T;
      } else {
        // Default to text for unknown types
        data = await response.text() as T;
      }

      return {
        data,
        status: response.status,
        headers: response.headers,
        size,
        cached: false
      };

    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max retries exceeded');
}

/**
 * Streaming fetch for large responses
 */
export async function streamingFetch(
  url: string,
  onChunk: (chunk: Uint8Array) => void,
  options: RequestInit = {}
): Promise<void> {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }
      
      onChunk(value);
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Parallel fetch with connection pooling optimization
 */
export async function parallelFetch<T = any>(
  urls: string[],
  options: BufferingOptions & RequestInit = {},
  concurrency: number = 10
): Promise<FetchResult<T>[]> {
  const results: FetchResult<T>[] = [];
  
  // Set connection limit for stability
  process.env.BUN_CONFIG_MAX_HTTP_REQUESTS = concurrency.toString();
  
  // Process URLs in batches
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchPromises = batch.map(url => optimizedFetch<T>(url, options));
    
    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    } catch (error) {
      console.error(`Batch ${i}-${i + concurrency} failed:`, error);
      throw error;
    }
  }
  
  return results;
}

/**
 * Cached fetch with DNS optimization
 */
export class CachedFetcher {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  constructor(private defaultTTL: number = 300000) {} // 5 minutes default
  
  async fetch<T = any>(
    url: string,
    options: BufferingOptions & RequestInit & { ttl?: number } = {}
  ): Promise<FetchResult<T>> {
    const { ttl = this.defaultTTL, ...fetchOptions } = options;
    const now = Date.now();
    const cached = this.cache.get(url);
    
    if (cached && (now - cached.timestamp) < cached.ttl) {
      return {
        data: cached.data,
        status: 200,
        headers: new Headers(),
        size: JSON.stringify(cached.data).length,
        cached: true
      };
    }
    
    const result = await optimizedFetch<T>(url, fetchOptions);
    
    this.cache.set(url, {
      data: result.data,
      timestamp: now,
      ttl
    });
    
    return { ...result, cached: false };
  }
  
  clearCache(): void {
    this.cache.clear();
  }
  
  getCacheStats(): { size: number; entries: Array<{ url: string; age: number }> } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([url, entry]) => ({
      url,
      age: now - entry.timestamp
    }));
    
    return {
      size: this.cache.size,
      entries
    };
  }
}

/**
 * File download with progress tracking
 */
export async function downloadWithProgress(
  url: string,
  filename: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<void> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength) : 0;
  let loaded = 0;
  
  if (!response.body) {
    throw new Error('Response body is null');
  }
  
  const file = (globalThis.Bun || Bun).file(filename);
  const writer = file.writer();
  
  try {
    const reader = response.body.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }
      
      writer.write(value);
      loaded += value.length;
      
      if (onProgress) {
        onProgress(loaded, total);
      }
    }
    
    reader.releaseLock();
  } finally {
    writer.end();
  }
}

// DNS Cache monitoring
export function getDNSCacheStats() {
  try {
    return dns.getCacheStats();
  } catch (error) {
    console.warn('DNS cache stats not available:', error);
    return null;
  }
}

// Preconnect optimization for frequently used hosts
export function preconnectHosts(hosts: string[]): void {
  hosts.forEach(host => {
    try {
      fetch.preconnect(host);
    } catch (error) {
      console.warn(`Preconnect failed for ${host}:`, error);
    }
  });
}
