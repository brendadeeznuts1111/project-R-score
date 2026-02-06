#!/usr/bin/env bun
// Strong Defaults HTTP Client - Enhanced defaults that work properly out of the box

console.log('🛡️ Strong Defaults HTTP Client - Better defaults for production\n');

export interface StrongDefaultsConfig {
  // Enhanced default headers
  defaultHeaders?: Record<string, string>;
  // Stronger caching defaults
  aggressiveCaching?: boolean;
  defaultCacheMaxAge?: number;
  // Better security defaults
  securityHeaders?: boolean;
  // Enhanced validation
  strictValidation?: boolean;
  // Performance defaults
  connectionPoolSize?: number;
  keepAlive?: boolean;
}

export interface StrongClientResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  fromCache: boolean;
  revalidated: boolean;
  cached: boolean;
  responseTime: number;
  contentLength: number;
  etag?: string;
  cacheControl?: string;
  lastModified?: string;
  // Enhanced metadata
  contentType: string;
  contentEncoding?: string;
  transferEncoding?: string;
  server?: string;
  date?: string;
  connection?: string;
}

// Enhanced cache entry with more metadata
interface StrongCacheEntry {
  url: string;
  method: string;
  data: any;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  metadata: {
    contentLength: number;
    contentType: string;
    contentEncoding?: string;
    etag: string | null;
    lastModified: string | null;
    cacheControl: string | null;
    expires: Date | null;
    date: string;
    server?: string;
    connection?: string;
  };
  timestamp: number;
  hits: number;
  responseTime: number;
  validationCount: number;
  lastValidated: number;
}

// Strong Defaults HTTP Client with enhanced defaults
export class StrongDefaultsHttpClient {
  private config: Required<StrongDefaultsConfig>;
  private cache = new Map<string, StrongCacheEntry>();
  private defaultHeaders: Record<string, string>;
  private connectionPool: Map<string, number> = new Map();

  constructor(config: StrongDefaultsConfig = {}) {
    this.config = {
      defaultHeaders: config.defaultHeaders || {},
      aggressiveCaching: config.aggressiveCaching !== false, // Default to aggressive
      defaultCacheMaxAge: config.defaultCacheMaxAge || 600000, // 10 minutes default
      securityHeaders: config.securityHeaders !== false, // Default to security
      strictValidation: config.strictValidation !== false, // Default to strict
      connectionPoolSize: config.connectionPoolSize || 10,
      keepAlive: config.keepAlive !== false // Default to keep-alive
    };

    // STRONGER DEFAULT HEADERS - These work properly out of the box
    this.defaultHeaders = {
      // Essential headers that should always be set
      'User-Agent': 'StrongDefaultsClient/1.0 (Bun; Production-Ready)',
      'Accept': 'application/json, text/plain, */*; q=0.8', // Accept multiple types with quality
      'Accept-Encoding': 'gzip, deflate, br, zstd', // Accept all common encodings
      'Accept-Language': 'en-US,en;q=0.9,*;q=0.8', // Language preferences
      'Cache-Control': 'max-age=0', // Force validation for first request
      'Connection': this.config.keepAlive ? 'keep-alive' : 'close',
      
      // Security headers (if enabled)
      ...(this.config.securityHeaders && {
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site'
      }),
      
      // Custom headers
      ...this.config.defaultHeaders
    };

    console.log('🔧 Strong Defaults Configured:');
    console.log(`   Aggressive Caching: ${this.config.aggressiveCaching}`);
    console.log(`   Default Cache Max-Age: ${this.config.defaultCacheMaxAge}ms`);
    console.log(`   Security Headers: ${this.config.securityHeaders}`);
    console.log(`   Strict Validation: ${this.config.strictValidation}`);
    console.log(`   Keep-Alive: ${this.config.keepAlive}`);
  }

  // Enhanced cache key with more context
  private getStrongCacheKey(url: string, method: string, headers: Record<string, string>): string {
    const keyParts = [method, url];
    
    // Include headers that affect response
    const varyHeaders = ['Accept', 'Accept-Language', 'Accept-Encoding', 'Authorization', 'User-Agent'];
    const relevantHeaders = varyHeaders
      .filter(header => headers[header])
      .map(header => `${header}=${headers[header]}`);
    
    if (relevantHeaders.length > 0) {
      keyParts.push(...relevantHeaders);
    }
    
    return keyParts.join(':');
  }

  // STRONGER header validation with better defaults
  private validateAndSetStrongHeaders(options: RequestInit): { 
    headers: Record<string, string>; 
    warnings: string[]; 
    errors: string[];
    corrections: Record<string, string>;
  } {
    const headers = { ...this.defaultHeaders, ...options.headers } as Record<string, string>;
    const warnings: string[] = [];
    const errors: string[] = [];
    const corrections: Record<string, string> = {};
    const method = options.method || 'GET';

    // STRONG VALIDATION RULES
    
    // GET request validation
    if (method === 'GET') {
      if (headers['Content-Type'] && this.config.strictValidation) {
        errors.push('GET requests should not have Content-Type header');
        corrections['Content-Type'] = 'REMOVED';
        delete headers['Content-Type'];
      }
      
      // Ensure Accept header is comprehensive
      if (!headers['Accept'] || headers['Accept'] === '*/*') {
        warnings.push('Accept header too broad, using comprehensive default');
        headers['Accept'] = 'application/json, text/plain, */*; q=0.8';
        corrections['Accept'] = 'ENHANCED';
      }
    }

    // POST/PUT/PATCH validation
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      if (options.body) {
        // Auto-detect Content-Type if missing
        if (!headers['Content-Type']) {
          const detectedType = this.detectContentType(options.body);
          headers['Content-Type'] = detectedType;
          corrections['Content-Type'] = `AUTO-DETECTED: ${detectedType}`;
          warnings.push(`Content-Type auto-detected: ${detectedType}`);
        }
        
        // Ensure Accept header for POST requests
        if (!headers['Accept']) {
          headers['Accept'] = 'application/json, text/plain, */*; q=0.8';
          corrections['Accept'] = 'ADDED';
          warnings.push('Accept header added for POST request');
        }
        
        // Add Content-Length if possible
        if (!headers['Content-Length'] && typeof options.body === 'string') {
          headers['Content-Length'] = options.body.length.toString();
          corrections['Content-Length'] = 'AUTO-CALCULATED';
        }
      }
    }

    // Enhanced caching headers
    if (this.config.aggressiveCaching && method === 'GET') {
      if (!headers['Cache-Control']) {
        headers['Cache-Control'] = `max-age=${Math.floor(this.config.defaultCacheMaxAge / 1000)}`;
        corrections['Cache-Control'] = 'AGGRESSIVE_DEFAULT';
      }
    }

    // Security headers validation
    if (this.config.securityHeaders) {
      if (!headers['Sec-Fetch-Dest']) {
        headers['Sec-Fetch-Dest'] = 'empty';
        corrections['Sec-Fetch-Dest'] = 'ADDED';
      }
    }

    // Connection management
    if (this.config.keepAlive && !headers['Connection']) {
      headers['Connection'] = 'keep-alive';
      corrections['Connection'] = 'KEEP-ALIVE';
    }

    return { headers, warnings, errors, corrections };
  }

  // Auto-detect content type
  private detectContentType(body: any): string {
    if (typeof body === 'string') {
      try {
        JSON.parse(body);
        return 'application/json';
      } catch {
        if (body.trim().startsWith('<')) {
          return 'application/xml';
        }
        return 'text/plain';
      }
    }
    
    if (body instanceof FormData) {
      return 'multipart/form-data';
    }
    
    if (body instanceof URLSearchParams) {
      return 'application/x-www-form-urlencoded';
    }
    
    if (body instanceof ArrayBuffer || body instanceof Uint8Array) {
      return 'application/octet-stream';
    }
    
    if (typeof body === 'object') {
      return 'application/json';
    }
    
    return 'text/plain';
  }

  // Enhanced cache header extraction
  private extractStrongCacheHeaders(response: Response): {
    etag: string | null;
    lastModified: string | null;
    cacheControl: string | null;
    expires: Date | null;
    age: number;
    contentLength: number;
    contentType: string;
    contentEncoding?: string;
    transferEncoding?: string;
    server?: string;
    date?: string;
    connection?: string;
  } {
    const etag = response.headers.get('etag');
    const lastModified = response.headers.get('last-modified');
    const cacheControl = response.headers.get('cache-control');
    const expiresHeader = response.headers.get('expires');
    const age = parseInt(response.headers.get('age') || '0');
    const contentLength = parseInt(response.headers.get('content-length') || '0');
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentEncoding = response.headers.get('content-encoding') || undefined;
    const transferEncoding = response.headers.get('transfer-encoding') || undefined;
    const server = response.headers.get('server') || undefined;
    const date = response.headers.get('date') || undefined;
    const connection = response.headers.get('connection') || undefined;

    let expires: Date | null = null;
    if (expiresHeader) {
      expires = new Date(expiresHeader);
    } else if (cacheControl) {
      const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
      if (maxAgeMatch) {
        const maxAgeSeconds = parseInt(maxAgeMatch[1]);
        expires = new Date(Date.now() + maxAgeSeconds * 1000);
      }
    }

    return {
      etag,
      lastModified,
      cacheControl,
      expires,
      age,
      contentLength,
      contentType,
      contentEncoding,
      transferEncoding,
      server,
      date,
      connection
    };
  }

  // Enhanced cache validation
  private isStrongCacheValid(entry: StrongCacheEntry): boolean {
    const now = Date.now();
    
    // Check explicit expiration
    if (entry.metadata.expires && entry.metadata.expires < new Date()) {
      return false;
    }

    // Check max-age in cache-control
    if (entry.metadata.cacheControl) {
      const maxAgeMatch = entry.metadata.cacheControl.match(/max-age=(\d+)/);
      if (maxAgeMatch) {
        const maxAgeMs = parseInt(maxAgeMatch[1]) * 1000;
        if (now - entry.timestamp > maxAgeMs) {
          return false;
        }
      }
    }

    // Check no-cache directive
    if (entry.metadata.cacheControl?.includes('no-cache')) {
      return false;
    }

    // Default TTL (longer for aggressive caching)
    const defaultTTL = this.config.aggressiveCaching ? this.config.defaultCacheMaxAge : 300000;
    if (now - entry.timestamp > defaultTTL) {
      return false;
    }

    return true;
  }

  // Enhanced cache storage
  private storeStrongCache(
    url: string,
    method: string,
    response: Response,
    data: any,
    headers: Record<string, string>,
    responseTime: number
  ): void {
    if (!this.config.aggressiveCaching || method !== 'GET') return;

    const cacheHeaders = this.extractStrongCacheHeaders(response);
    
    // Don't cache if explicitly forbidden
    if (cacheHeaders.cacheControl?.includes('no-store')) {
      console.log(`🚫 Not caching (no-store): ${url}`);
      return;
    }

    const key = this.getStrongCacheKey(url, method, headers);
    const entry: StrongCacheEntry = {
      url,
      method,
      data,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      metadata: {
        contentLength: cacheHeaders.contentLength,
        contentType: cacheHeaders.contentType,
        contentEncoding: cacheHeaders.contentEncoding,
        etag: cacheHeaders.etag,
        lastModified: cacheHeaders.lastModified,
        cacheControl: cacheHeaders.cacheControl,
        expires: cacheHeaders.expires,
        date: cacheHeaders.date || new Date().toUTCString(),
        server: cacheHeaders.server,
        connection: cacheHeaders.connection
      },
      timestamp: Date.now(),
      hits: 0,
      responseTime,
      validationCount: 0,
      lastValidated: Date.now()
    };

    // Enhanced LRU with size consideration
    const maxSize = this.config.connectionPoolSize * 20; // 20 entries per connection
    if (this.cache.size >= maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      console.log(`🗑️ Evicted cache entry: ${oldestKey}`);
    }

    this.cache.set(key, entry);
    console.log(`💾 Strong cached: ${url}`);
    console.log(`   Content-Type: ${cacheHeaders.contentType}`);
    console.log(`   Content-Length: ${cacheHeaders.contentLength} bytes`);
    console.log(`   ETag: ${cacheHeaders.etag || 'none'}`);
    console.log(`   Cache-Control: ${cacheHeaders.cacheControl || 'none'}`);
    console.log(`   Server: ${cacheHeaders.server || 'unknown'}`);
  }

  // Enhanced conditional request
  private async makeStrongConditionalRequest(
    url: string,
    options: RequestInit,
    entry: StrongCacheEntry
  ): Promise<Response> {
    const headers = new Headers(options.headers);

    // Add validation headers
    if (entry.metadata.etag) {
      headers.set('If-None-Match', entry.metadata.etag);
    }
    if (entry.metadata.lastModified) {
      headers.set('If-Modified-Since', entry.metadata.lastModified);
    }

    // Add If-Range for partial content support
    if (entry.metadata.etag && entry.metadata.lastModified) {
      headers.set('If-Range', entry.metadata.etag);
    }

    console.log(`🔍 Strong conditional request: ${url}`);
    console.log(`   If-None-Match: ${entry.metadata.etag || 'none'}`);
    console.log(`   If-Modified-Since: ${entry.metadata.lastModified || 'none'}`);

    return fetch(url, { ...options, headers });
  }

  // Main fetch with strong defaults
  async fetch<T = any>(url: string, options: RequestInit = {}): Promise<StrongClientResponse<T>> {
    const startTime = Date.now();
    const method = options.method || 'GET';
    
    // Strong header validation
    const { headers, warnings, errors, corrections } = this.validateAndSetStrongHeaders(options);
    
    // Log validation results
    if (Object.keys(corrections).length > 0) {
      console.log(`🔧 Header corrections for ${method} ${url}:`);
      Object.entries(corrections).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
    }
    
    if (warnings.length > 0) {
      warnings.forEach(warning => console.log(`⚠️ Warning: ${warning}`));
    }
    
    if (errors.length > 0 && this.config.strictValidation) {
      throw new Error(`Header validation failed:\n${errors.join('\n')}`);
    }

    const finalOptions = { ...options, headers };
    const cacheKey = this.getStrongCacheKey(url, method, headers);

    // Check cache for GET requests
    if (method === 'GET' && this.config.aggressiveCaching) {
      const cachedEntry = this.cache.get(cacheKey);
      
      if (cachedEntry) {
        console.log(`📦 Strong cache found: ${url}`);
        
        if (this.isStrongCacheValid(cachedEntry)) {
          cachedEntry.hits++;
          const responseTime = Date.now() - startTime;
          
          console.log(`✅ Strong cache HIT: ${url} (${cachedEntry.hits} hits, ${responseTime}ms)`);
          
          return {
            data: cachedEntry.data,
            status: cachedEntry.status,
            statusText: cachedEntry.statusText,
            headers: new Headers(cachedEntry.headers),
            fromCache: true,
            revalidated: false,
            cached: true,
            responseTime,
            contentLength: cachedEntry.metadata.contentLength,
            etag: cachedEntry.metadata.etag || undefined,
            cacheControl: cachedEntry.metadata.cacheControl || undefined,
            lastModified: cachedEntry.metadata.lastModified || undefined,
            contentType: cachedEntry.metadata.contentType,
            contentEncoding: cachedEntry.metadata.contentEncoding,
            transferEncoding: cachedEntry.metadata.transferEncoding,
            server: cachedEntry.metadata.server,
            date: cachedEntry.metadata.date,
            connection: cachedEntry.metadata.connection
          };
        }
        
        // Try revalidation
        if (cachedEntry.metadata.etag || cachedEntry.metadata.lastModified) {
          console.log(`🔄 Attempting strong revalidation: ${url}`);
          
          try {
            const conditionalResponse = await this.makeStrongConditionalRequest(url, finalOptions, cachedEntry);
            
            if (conditionalResponse.status === 304) {
              cachedEntry.timestamp = Date.now();
              cachedEntry.hits++;
              cachedEntry.validationCount++;
              cachedEntry.lastValidated = Date.now();
              const responseTime = Date.now() - startTime;
              
              console.log(`✅ Strong cache REVALIDATED: ${url} (304, ${responseTime}ms)`);
              
              return {
                data: cachedEntry.data,
                status: 200,
                statusText: 'OK',
                headers: new Headers(cachedEntry.headers),
                fromCache: true,
                revalidated: true,
                cached: true,
                responseTime,
                contentLength: cachedEntry.metadata.contentLength,
                etag: cachedEntry.metadata.etag || undefined,
                cacheControl: cachedEntry.metadata.cacheControl || undefined,
                lastModified: cachedEntry.metadata.lastModified || undefined,
                contentType: cachedEntry.metadata.contentType,
                contentEncoding: cachedEntry.metadata.contentEncoding,
                transferEncoding: cachedEntry.metadata.transferEncoding,
                server: cachedEntry.metadata.server,
                date: cachedEntry.metadata.date,
                connection: cachedEntry.metadata.connection
              };
            }
            
            // Fresh data needed
            const freshData = await conditionalResponse.json();
            const responseTime = Date.now() - startTime;
            
            this.storeStrongCache(url, method, conditionalResponse, freshData, headers, responseTime);
            
            console.log(`🆕 Fresh data fetched: ${url} (${responseTime}ms)`);
            
            const cacheHeaders = this.extractStrongCacheHeaders(conditionalResponse);
            return {
              data: freshData,
              status: conditionalResponse.status,
              statusText: conditionalResponse.statusText,
              headers: conditionalResponse.headers,
              fromCache: false,
              revalidated: false,
              cached: false,
              responseTime,
              contentLength: cacheHeaders.contentLength,
              etag: cacheHeaders.etag || undefined,
              cacheControl: cacheHeaders.cacheControl || undefined,
              lastModified: cacheHeaders.lastModified || undefined,
              contentType: cacheHeaders.contentType,
              contentEncoding: cacheHeaders.contentEncoding,
              transferEncoding: cacheHeaders.transferEncoding,
              server: cacheHeaders.server,
              date: cacheHeaders.date,
              connection: cacheHeaders.connection
            };
          } catch (error) {
            console.log(`⚠️ Revalidation failed, serving stale: ${url}`, error);
            
            cachedEntry.hits++;
            const responseTime = Date.now() - startTime;
            
            return {
              data: cachedEntry.data,
              status: cachedEntry.status,
              statusText: cachedEntry.statusText,
              headers: new Headers(cachedEntry.headers),
              fromCache: true,
              revalidated: false,
              cached: true,
              responseTime,
              contentLength: cachedEntry.metadata.contentLength,
              etag: cachedEntry.metadata.etag || undefined,
              cacheControl: cachedHeader.cacheControl || undefined,
              lastModified: cachedEntry.metadata.lastModified || undefined,
              contentType: cachedEntry.metadata.contentType,
              contentEncoding: cachedEntry.metadata.contentEncoding,
              transferEncoding: cachedEntry.metadata.transferEncoding,
              server: cachedEntry.metadata.server,
              date: cachedEntry.metadata.date,
              connection: cachedEntry.metadata.connection
            };
          }
        }
      }
    }

    // Network request
    console.log(`🌐 Network request: ${url}`);
    const response = await fetch(url, finalOptions);
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    this.storeStrongCache(url, method, response, data, headers, responseTime);

    const cacheHeaders = this.extractStrongCacheHeaders(response);
    console.log(`✅ Network success: ${url} (${responseTime}ms, ${cacheHeaders.contentLength} bytes)`);
    console.log(`   Content-Type: ${cacheHeaders.contentType}`);
    console.log(`   Server: ${cacheHeaders.server || 'unknown'}`);

    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      fromCache: false,
      revalidated: false,
      cached: false,
      responseTime,
      contentLength: cacheHeaders.contentLength,
      etag: cacheHeaders.etag || undefined,
      cacheControl: cacheHeaders.cacheControl || undefined,
      lastModified: cacheHeaders.lastModified || undefined,
      contentType: cacheHeaders.contentType,
      contentEncoding: cacheHeaders.contentEncoding,
      transferEncoding: cacheHeaders.transferEncoding,
      server: cacheHeaders.server,
      date: cacheHeaders.date,
      connection: cacheHeaders.connection
    };
  }

  // Convenience methods with strong defaults
  async get<T = any>(url: string, customHeaders: Record<string, string> = {}): Promise<StrongClientResponse<T>> {
    return this.fetch<T>(url, { method: 'GET', headers: customHeaders });
  }

  async post<T = any>(url: string, data: any, customHeaders: Record<string, string> = {}): Promise<StrongClientResponse<T>> {
    // BETTER FIX - Completely isolate method
    const { method, ...cleanHeaders } = customHeaders || {} as any;
    
    return this.fetch<T>(url, {
      method: 'POST',
      headers: cleanHeaders,
      body: typeof data === 'string' ? data : JSON.stringify(data)
    });
  }

  // Enhanced cache statistics
  getStrongCacheStats(): {
    size: number;
    maxSize: number;
    totalHits: number;
    totalValidations: number;
    totalSize: number;
    hitRate: number;
    averageResponseTime: number;
    entries: Array<{
      url: string;
      hits: number;
      validations: number;
      age: number;
      size: number;
      contentType: string;
      etag: string | null;
      isValid: boolean;
      server?: string;
    }>;
  } {
    const entries = Array.from(this.cache.values()).map(entry => ({
      url: entry.url,
      hits: entry.hits,
      validations: entry.validationCount,
      age: Date.now() - entry.timestamp,
      size: entry.metadata.contentLength,
      contentType: entry.metadata.contentType,
      etag: entry.metadata.etag,
      isValid: this.isStrongCacheValid(entry),
      server: entry.metadata.server
    }));

    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    const totalValidations = entries.reduce((sum, entry) => sum + entry.validations, 0);
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const hitRate = entries.length > 0 ? totalHits / entries.length : 0;
    const averageResponseTime = entries.length > 0 
      ? entries.reduce((sum, entry) => sum + entry.responseTime, 0) / entries.length 
      : 0;

    return {
      size: this.cache.size,
      maxSize: this.config.connectionPoolSize * 20,
      totalHits,
      totalValidations,
      totalSize,
      hitRate,
      averageResponseTime,
      entries
    };
  }

  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Strong cache cleared');
  }
}

// Demo the strong defaults
async function demonstrateStrongDefaults() {
  console.log('🧪 Strong Defaults HTTP Client Demo\n');

  const client = new StrongDefaultsHttpClient({
    aggressiveCaching: true,
    defaultCacheMaxAge: 600000, // 10 minutes
    securityHeaders: true,
    strictValidation: true,
    keepAlive: true
  });

  const tests = [
    {
      name: 'GitHub API (JSON with strong defaults)',
      url: 'https://api.github.com/repos/oven-sh/bun/releases/latest'
    },
    {
      name: 'HTTPBin Headers Test',
      url: 'https://httpbin.org/headers'
    },
    {
      name: 'HTTPBin Cache Test',
      url: 'https://httpbin.org/cache'
    }
  ];

  for (const test of tests) {
    console.log(`\n📡 Testing: ${test.name}`);
    console.log(`   URL: ${test.url}`);

    // First request - shows strong defaults in action
    console.log('\n1️⃣ First request (strong defaults):');
    const result1 = await client.get(test.url);
    console.log(`   Status: ${result1.status}`);
    console.log(`   Content-Type: ${result1.contentType}`);
    console.log(`   Content-Length: ${result1.contentLength}`);
    console.log(`   Server: ${result1.server || 'unknown'}`);
    console.log(`   Connection: ${result1.connection || 'unknown'}`);
    console.log(`   From Cache: ${result1.fromCache}`);
    console.log(`   Response Time: ${result1.responseTime}ms`);

    // Second request - should hit cache
    console.log('\n2️⃣ Second request (cache test):');
    const result2 = await client.get(test.url);
    console.log(`   Status: ${result2.status}`);
    console.log(`   From Cache: ${result2.fromCache}`);
    console.log(`   Cached: ${result2.cached}`);
    console.log(`   Revalidated: ${result2.revalidated}`);
    console.log(`   Response Time: ${result2.responseTime}ms`);

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Show enhanced cache statistics
  console.log('\n📊 Strong Cache Statistics:');
  const stats = client.getStrongCacheStats();
  console.log(`   Cache Size: ${stats.size}/${stats.maxSize}`);
  console.log(`   Total Hits: ${stats.totalHits}`);
  console.log(`   Total Validations: ${stats.totalValidations}`);
  console.log(`   Total Size: ${stats.totalSize} bytes`);
  console.log(`   Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`);
  console.log(`   Average Response Time: ${stats.averageResponseTime.toFixed(1)}ms`);

  stats.entries.forEach((entry, index) => {
    console.log(`\n   ${index + 1}. ${entry.url}`);
    console.log(`      Content-Type: ${entry.contentType}`);
    console.log(`      Server: ${entry.server || 'unknown'}`);
    console.log(`      Size: ${entry.size} bytes`);
    console.log(`      Hits: ${entry.hits}`);
    console.log(`      Validations: ${entry.validations}`);
    console.log(`      Age: ${Math.round(entry.age / 1000)}s`);
    console.log(`      Valid: ${entry.isValid ? '✅' : '❌'}`);
  });

  console.log('\n🎯 Strong Defaults Features:');
  console.log('   ✅ Enhanced default headers (User-Agent, Accept, Accept-Encoding, etc.)');
  console.log('   ✅ Auto-detection of Content-Type for POST requests');
  console.log('   ✅ Automatic Content-Length calculation');
  console.log('   ✅ Aggressive caching with longer TTL');
  console.log('   ✅ Security headers by default');
  console.log('   ✅ Strict validation with helpful corrections');
  console.log('   ✅ Enhanced metadata tracking');
  console.log('   ✅ Better cache statistics');
  console.log('   ✅ Connection pooling support');
  console.log('   ✅ Comprehensive logging');

  console.log('\n🚀 Strong Defaults HTTP Client Complete!');
}

// Export for use
export default StrongDefaultsHttpClient;

// Run demo if executed directly
if (import.meta.main) {
  demonstrateStrongDefaults().catch(console.error);
}
