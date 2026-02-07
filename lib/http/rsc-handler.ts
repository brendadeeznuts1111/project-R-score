// lib/http/rsc-handler.ts — RSC handler with HTTP/2 multiplexing and HTTP/1.1 fallback

import { BunHTTP2Multiplexer } from './http2-multiplexer';

interface RSCRequest {
  pathname: string;
  searchParams?: Record<string, string>;
  headers?: Record<string, string>;
  priority?: 'u' | 'i' | 'l';
}

interface RSCResponse {
  status: number;
  headers: Record<string, string>;
  body: ReadableStream | null;
  method: 'HTTP/2' | 'HTTP/1.1';
  latency?: number;
}

/**
 * Smart RSC handler with automatic fallback
 */
export class SmartRSCHandler {
  private http2Available = false;
  private lastTest = 0;
  private testInterval = 60000; // Test HTTP/2 availability every minute

  constructor() {
    this.testHttp2Availability();
  }

  /**
   * Test if HTTP/2 is available to the target
   */
  private async testHttp2Availability(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastTest < this.testInterval) {
      return this.http2Available;
    }

    this.lastTest = now;

    try {
      const mux = new BunHTTP2Multiplexer();
      await mux.connect('bun.sh', 443);

      // Test with a simple request
      const response = await mux.request('GET', '/docs', {
        ':authority': 'bun.sh',
      });

      mux.disconnect();
      this.http2Available = true;
      console.log('✅ HTTP/2 available for RSC requests');
      return true;
    } catch (error) {
      this.http2Available = false;
      console.log('⚠️ HTTP/2 not available, using HTTP/1.1 fallback');
      return false;
    }
  }

  /**
   * Fetch single RSC component with smart routing
   */
  async fetchRSC(request: RSCRequest): Promise<RSCResponse> {
    const startTime = performance.now();

    // Test HTTP/2 availability if needed
    await this.testHttp2Availability();

    if (this.http2Available) {
      try {
        return await this.fetchWithHttp2(request, startTime);
      } catch (error) {
        console.warn('HTTP/2 failed, falling back to HTTP/1.1:', error);
        this.http2Available = false; // Don't try HTTP/2 again for a while
        return await this.fetchWithHttp1(request, startTime);
      }
    } else {
      return await this.fetchWithHttp1(request, startTime);
    }
  }

  /**
   * Fetch using HTTP/2 multiplexing
   */
  private async fetchWithHttp2(request: RSCRequest, startTime: number): Promise<RSCResponse> {
    const mux = new BunHTTP2Multiplexer();
    await mux.connect('bun.sh', 443);

    try {
      const { pathname, searchParams, headers = {}, priority = 'i' } = request;

      // Build query string
      const queryString = new URLSearchParams(searchParams || {}).toString();
      const fullPath = `${pathname}${queryString ? '?' + queryString : ''}`;

      // RSC-specific headers
      const rscHeaders = {
        ':authority': 'bun.sh',
        accept: '*/*',
        'content-type': 'text/x-component',
        rsc: '1',
        'next-router-priority': priority,
        ...headers,
      };

      const response = await mux.request('GET', fullPath, rscHeaders);
      const endTime = performance.now();

      return {
        status: response.status,
        headers: response.headers,
        body: response.body,
        method: 'HTTP/2',
        latency: endTime - startTime,
      };
    } finally {
      mux.disconnect();
    }
  }

  /**
   * Fetch using HTTP/1.1 (standard fetch)
   */
  private async fetchWithHttp1(request: RSCRequest, startTime: number): Promise<RSCResponse> {
    const { pathname, searchParams, headers = {} } = request;

    // Build URL
    const url = new URL(pathname, 'https://bun.sh');
    if (searchParams) {
      Object.entries(searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    // RSC-specific headers
    const rscHeaders = {
      accept: '*/*',
      'content-type': 'text/x-component',
      rsc: '1',
      ...headers,
    };

    const response = await fetch(url.toString(), { headers: rscHeaders });
    const endTime = performance.now();

    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: response.body,
      method: 'HTTP/1.1',
      latency: endTime - startTime,
    };
  }

  /**
   * Batch fetch RSC components (uses HTTP/2 if available)
   */
  async fetchBatch(requests: RSCRequest[]): Promise<RSCResponse[]> {
    if (requests.length === 0) return [];

    await this.testHttp2Availability();

    if (this.http2Available && requests.length > 1) {
      try {
        return await this.fetchBatchHttp2(requests);
      } catch (error) {
        console.warn('HTTP/2 batch failed, falling back to HTTP/1.1:', error);
        this.http2Available = false;
      }
    }

    // HTTP/1.1 fallback: fetch in parallel
    const promises = requests.map(request => this.fetchWithHttp1(request, performance.now()));
    return await Promise.all(promises);
  }

  /**
   * Batch fetch using HTTP/2 multiplexing
   */
  private async fetchBatchHttp2(requests: RSCRequest[]): Promise<RSCResponse[]> {
    const mux = new BunHTTP2Multiplexer();
    await mux.connect('bun.sh', 443);

    try {
      const startTime = performance.now();

      const streamPromises = requests.map(async (request, index) => {
        try {
          const { pathname, searchParams, headers = {}, priority = 'i' } = request;

          const queryString = new URLSearchParams(searchParams || {}).toString();
          const fullPath = `${pathname}${queryString ? '?' + queryString : ''}`;

          const rscHeaders = {
            ':authority': 'bun.sh',
            accept: '*/*',
            'content-type': 'text/x-component',
            rsc: '1',
            'next-router-priority': priority,
            ...headers,
          };

          const response = await mux.request('GET', fullPath, rscHeaders);
          const endTime = performance.now();

          return {
            status: response.status,
            headers: response.headers,
            body: response.body,
            method: 'HTTP/2' as const,
            latency: endTime - startTime,
            batchIndex: index,
          };
        } catch (error) {
          return {
            status: 0,
            headers: {},
            body: null,
            method: 'HTTP/2' as const,
            latency: 0,
            error: error instanceof Error ? error.message : String(error),
            batchIndex: index,
          } as RSCResponse & { error: string; batchIndex: number };
        }
      });

      const results = await Promise.all(streamPromises);

      console.log(
        `📊 HTTP/2 Batch: ${results.filter(r => !('error' in r)).length}/${requests.length} successful`
      );
      console.log(`🔗 HTTP/2 Stats:`, mux.getStats());

      return results;
    } finally {
      mux.disconnect();
    }
  }

  /**
   * Get current handler status
   */
  getStatus() {
    return {
      http2Available: this.http2Available,
      lastTest: new Date(this.lastTest).toISOString(),
      nextTest: new Date(this.lastTest + this.testInterval).toISOString(),
    };
  }
}

/**
 * Convenience function for smart RSC fetching
 */
export async function fetchRSC(request: RSCRequest): Promise<RSCResponse> {
  const handler = new SmartRSCHandler();
  return await handler.fetchRSC(request);
}

/**
 * Convenience function for batch RSC fetching
 */
export async function fetchRSCBatch(requests: RSCRequest[]): Promise<RSCResponse[]> {
  const handler = new SmartRSCHandler();
  return await handler.fetchBatch(requests);
}

/**
 * 💡 Performance Tip: For better performance, consider:
 * 1. Using preconnect for frequently accessed domains
 * 2. Adding resource hints to your HTML head
 * 3. Implementing request caching
 * 4. Using the native fetch API with keep-alive
 */
