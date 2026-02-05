import { describe, it, expect, beforeEach } from 'bun:test';
import { optimizedFetch, CachedFetcher, streamingFetch } from '../utils/response-buffering';

// Mock Response interface for testing
interface MockResponse {
  ok: boolean;
  status: number;
  statusText?: string;
  headers: Headers;
  json(): Promise<any>;
  text(): Promise<string>;
  bytes(): Promise<Uint8Array>;
  body: ReadableStream | null;
}

// Mock fetch for testing
const mockFetch = (response: any, options: any = {}) => {
  global.fetch = async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    redirected: false,
    type: 'basic' as ResponseType,
    url: 'https://example.com',
    clone: () => ({}) as Response,
    ...response,
    headers: new Headers({
      'content-type': 'application/json',
      'content-length': JSON.stringify(response.data || response).length.toString(),
      ...response.headers
    })
  } as MockResponse);
  
  // Mock fetch.preconnect
  (global.fetch as any).preconnect = async (url: string) => {
    console.log(`Preconnecting to: ${url}`);
  };
};

describe('Response Buffering', () => {
  beforeEach(() => {
    mockFetch({ test: 'data' });
  });

  it('should perform optimized fetch with JSON response', async () => {
    const result = await optimizedFetch('https://example.com/api/test');
    
    expect(result.data).toEqual({ test: 'data' });
    expect(result.status).toBe(200);
    expect(result.cached).toBe(false);
    expect(result.size).toBeGreaterThan(0);
  });

  it('should handle timeout correctly', async () => {
    global.fetch = async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      throw new Error('Timeout');
    };

    try {
      await optimizedFetch('https://example.com/api/test', { timeout: 1000 });
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      expect(errorMsg).toContain('Timeout');
    }
  });

  it('should retry failed requests', async () => {
    let attempts = 0;
    global.fetch = async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Network error');
      }
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        redirected: false,
        type: 'basic' as ResponseType,
        url: 'https://example.com',
        clone: () => ({}) as Response,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true }),
        text: async () => '{"success": true}',
        bytes: async () => new TextEncoder().encode('{"success": true}'),
        body: null
      } as MockResponse;
    };

    const result = await optimizedFetch('https://example.com/api/test', {
      maxRetries: 3
    });

    expect(result.data).toEqual({ success: true });
    expect(attempts).toBe(3);
  });

  it('should cache responses correctly', async () => {
    const cache = new CachedFetcher(1000); // 1 second TTL
    
    const result1 = await cache.fetch('https://example.com/api/test');
    expect(result1.cached).toBe(false);
    
    const result2 = await cache.fetch('https://example.com/api/test');
    expect(result2.cached).toBe(true);
    
    // Wait for cache to expire
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    const result3 = await cache.fetch('https://example.com/api/test');
    expect(result3.cached).toBe(false);
  });

  it('should provide cache statistics', async () => {
    const cache = new CachedFetcher();
    
    await cache.fetch('https://example.com/api/test1');
    await cache.fetch('https://example.com/api/test2');
    
    const stats = cache.getCacheStats();
    expect(stats.size).toBe(2);
    expect(stats.entries).toHaveLength(2);
  });

  it('should clear cache correctly', async () => {
    const cache = new CachedFetcher();
    
    await cache.fetch('https://example.com/api/test');
    expect(cache.getCacheStats().size).toBe(1);
    
    cache.clearCache();
    expect(cache.getCacheStats().size).toBe(0);
  });

  it('should handle streaming responses', async () => {
    const chunks = ['{"test":', '"data"}'];
    let chunkIndex = 0;
    
    global.fetch = async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      redirected: false,
      type: 'basic' as ResponseType,
      url: 'https://example.com',
      clone: () => ({}) as Response,
      headers: new Headers({
        'content-type': 'application/json'
      }),
      body: {
        getReader: () => ({
          read: async () => {
            if (chunkIndex < chunks.length) {
              return {
                done: false,
                value: new TextEncoder().encode(chunks[chunkIndex++])
              };
            }
            return { done: true };
          },
          releaseLock: () => {}
        })
      }
    } as MockResponse);

    const receivedChunks: string[] = [];
    await streamingFetch('https://example.com/stream', (chunk) => {
      receivedChunks.push(new TextDecoder().decode(chunk));
    });

    expect(receivedChunks).toEqual(chunks);
  });

  it('should handle different content types', async () => {
    // Test JSON response
    global.fetch = async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      redirected: false,
      type: 'basic' as ResponseType,
      url: 'https://example.com',
      clone: () => ({}) as Response,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ type: 'json' }),
      text: async () => '{"type": "json"}',
      bytes: async () => new TextEncoder().encode('{"type": "json"}'),
      body: null
    } as MockResponse);

    const jsonResult = await optimizedFetch('https://example.com/json');
    expect(jsonResult.data).toEqual({ type: 'json' });

    // Test text response
    global.fetch = async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      redirected: false,
      type: 'basic' as ResponseType,
      url: 'https://example.com',
      clone: () => ({}) as Response,
      headers: new Headers({ 'content-type': 'text/plain' }),
      json: async () => { throw new Error('Not JSON'); },
      text: async () => 'plain text',
      bytes: async () => new TextEncoder().encode('plain text'),
      body: null
    } as MockResponse);

    const textResult = await optimizedFetch('https://example.com/text');
    expect(textResult.data).toBe('plain text');

    // Test binary response
    global.fetch = async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      redirected: false,
      type: 'basic' as ResponseType,
      url: 'https://example.com',
      clone: () => ({}) as Response,
      headers: new Headers({ 'content-type': 'application/octet-stream' }),
      json: async () => { throw new Error('Not JSON'); },
      text: async () => { throw new Error('Not text'); },
      bytes: async () => new Uint8Array([1, 2, 3, 4]),
      body: null
    } as MockResponse);

    const binaryResult = await optimizedFetch('https://example.com/binary');
    expect(binaryResult.data).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it('should handle HTTP errors correctly', async () => {
    global.fetch = async () => ({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      redirected: false,
      type: 'basic' as ResponseType,
      url: 'https://example.com',
      clone: () => ({}) as Response,
      headers: new Headers(),
      json: async () => { throw new Error('Not found'); },
      text: async () => 'Not found',
      bytes: async () => new Uint8Array(),
      body: null
    } as MockResponse);

    try {
      await optimizedFetch('https://example.com/notfound');
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      expect(errorMsg).toContain('HTTP 404');
    }
  });
});
