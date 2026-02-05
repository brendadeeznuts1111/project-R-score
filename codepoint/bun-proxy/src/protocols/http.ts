// @bun/proxy/protocols/http.ts - HTTP proxy implementation (Code Point: 0x100-0x10F)

import { ProxyServer, ProxyServerConfig } from '../core/server';

// HTTP-specific configuration
export interface HTTPProxyConfig extends ProxyServerConfig {
  target?: string;
  changeOrigin?: boolean;
  pathRewrite?: Record<string, string>;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  followRedirects?: boolean;
  maxRedirects?: number;
  streaming?: {
    enabled?: boolean;
    threshold?: number; // Minimum size to enable streaming (bytes)
    chunkSize?: number; // Chunk size for streaming
    supportedTypes?: string[]; // MIME types that support streaming
  };
  compression?: {
    enabled?: boolean;
    types?: string[]; // MIME types to compress
    level?: number; // Compression level
  };
}

// HTTP proxy server implementation
export class HTTPProxy extends ProxyServer {
  private server?: any; // Bun server instance

  constructor(config: HTTPProxyConfig = {}) {
    super({
      protocol: 'http',
      port: 8080,
      ...config
    });
  }

  protected async initializeServer(): Promise<void> {
    const config = this.config as HTTPProxyConfig;

    // Create Bun HTTP server
    this.server = Bun.serve({
      hostname: config.host || 'localhost',
      port: config.port || 8080,
      async fetch(request: Request): Promise<Response> {
        try {
          // Handle the request through the proxy logic
          const response = await this.handleHTTPRequest(request);
          return response;
        } catch (error) {
          console.error('HTTP Proxy error:', error);
          return new Response('Proxy Error', { status: 500 });
        }
      }.bind(this),

      error(error: Error) {
        console.error('HTTP Server error:', error);
        return new Response('Server Error', { status: 500 });
      }
    });

    console.log(`📡 HTTP Proxy listening on http://${config.host}:${config.port}`);
  }

  protected async cleanup(): Promise<void> {
    if (this.server) {
      this.server.stop();
      this.server = undefined;
    }
  }

  protected async createConnection(id: string, options: any = {}): Promise<any> {
    // HTTP connections are handled by Bun's fetch API
    // Return a connection object for tracking
    return {
      id,
      type: 'http',
      created: new Date(),
      options,
      close: () => Promise.resolve()
    };
  }

  // Handle HTTP requests with streaming support
  private async handleHTTPRequest(request: Request): Promise<Response> {
    const config = this.config as HTTPProxyConfig;
    const url = new URL(request.url);

    try {
      // Apply path rewriting if configured
      let targetUrl = this.buildTargetUrl(request, config);

      // Create new request to target
      const proxyRequest = new Request(targetUrl, {
        method: request.method,
        headers: this.buildHeaders(request, config),
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        signal: AbortSignal.timeout(config.timeout || 30000)
      });

      // Make the request
      const response = await fetch(proxyRequest);

      // Check if we should stream the response
      const shouldStream = this.shouldStreamResponse(response, config);

      if (shouldStream) {
        // Handle streaming response
        return this.createStreamingResponse(response, config);
      } else {
        // Handle regular response
        const proxyResponse = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: this.buildResponseHeaders(response, config)
        });

        return proxyResponse;
      }

    } catch (error) {
      console.error('HTTP Proxy request failed:', error);

      // Handle retries if configured
      if (config.retries && config.retries > 0) {
        return this.retryRequest(request, config.retries);
      }

      return new Response('Proxy Error', {
        status: 502,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }

  // Determine if response should be streamed
  private shouldStreamResponse(response: Response, config: HTTPProxyConfig): boolean {
    const streaming = config.streaming;

    if (!streaming?.enabled) {
      return false;
    }

    // Check content type
    const contentType = response.headers.get('content-type') || '';
    const supportedTypes = streaming.supportedTypes || [
      'video/', 'audio/', 'application/octet-stream',
      'application/zip', 'application/x-gzip'
    ];

    const isSupportedType = supportedTypes.some(type => contentType.includes(type));

    // Check content length
    const contentLength = response.headers.get('content-length');
    const threshold = streaming.threshold || 1024 * 1024; // 1MB default

    if (contentLength) {
      const size = parseInt(contentLength);
      if (size >= threshold) {
        return true;
      }
    }

    // Check for chunked transfer encoding
    const transferEncoding = response.headers.get('transfer-encoding');
    if (transferEncoding === 'chunked') {
      return true;
    }

    // Check for range requests
    const acceptRanges = response.headers.get('accept-ranges');
    if (acceptRanges === 'bytes') {
      return true;
    }

    return isSupportedType;
  }

  // Create streaming response
  private createStreamingResponse(response: Response, config: HTTPProxyConfig): Response {
    const streaming = config.streaming;

    // Create a ReadableStream for the response body
    const stream = new ReadableStream({
      start: async (controller) => {
        try {
          if (!response.body) {
            controller.close();
            return;
          }

          const reader = response.body.getReader();
          const chunkSize = streaming?.chunkSize || 64 * 1024; // 64KB chunks

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              controller.close();
              break;
            }

            // Process chunk (could add compression, transformation, etc.)
            const processedChunk = await this.processStreamChunk(value, config);

            // Enqueue the chunk
            controller.enqueue(processedChunk);

            // Update statistics
            this.updateConnectionStats(processedChunk.length);
          }
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
      cancel: () => {
        console.log('Stream cancelled');
      }
    });

    // Build response headers for streaming
    const headers = this.buildResponseHeaders(response, config);

    // Add streaming-specific headers
    headers.set('X-Streaming-Enabled', 'true');
    headers.set('X-Streaming-Chunk-Size', (streaming?.chunkSize || 65536).toString());

    return new Response(stream, {
      status: response.status,
      statusText: response.statusText,
      headers: headers
    });
  }

  // Process stream chunks (for compression, transformation, etc.)
  private async processStreamChunk(chunk: Uint8Array, config: HTTPProxyConfig): Promise<Uint8Array> {
    // Apply compression if enabled
    if (config.compression?.enabled) {
      const contentType = 'application/octet-stream'; // Would be passed from response
      const compressibleTypes = config.compression.types || [
        'text/', 'application/json', 'application/javascript',
        'application/xml', 'application/css'
      ];

      const shouldCompress = compressibleTypes.some(type => contentType.includes(type));

      if (shouldCompress) {
        // In a real implementation, you'd use Bun's compression
        // For now, just return the chunk as-is
        return chunk;
      }
    }

    return chunk;
  }

  // Build target URL
  private buildTargetUrl(request: Request, config: HTTPProxyConfig): string {
    const url = new URL(request.url);

    if (config.target) {
      const targetUrl = new URL(config.target);

      // Preserve path and query
      targetUrl.pathname = url.pathname;
      targetUrl.search = url.search;

      return targetUrl.toString();
    }

    // If no target specified, assume localhost with different port
    const targetPort = config.port === 8080 ? 3000 : config.port! + 1;
    return `http://localhost:${targetPort}${url.pathname}${url.search}`;
  }

  // Build request headers
  private buildHeaders(request: Request, config: HTTPProxyConfig): Headers {
    const headers = new Headers(request.headers);

    // Remove hop-by-hop headers
    const hopByHopHeaders = [
      'connection', 'keep-alive', 'proxy-authenticate',
      'proxy-authorization', 'te', 'trailers', 'transfer-encoding', 'upgrade'
    ];

    hopByHopHeaders.forEach(header => headers.delete(header));

    // Add custom headers
    if (config.headers) {
      Object.entries(config.headers).forEach(([key, value]) => {
        headers.set(key, value);
      });
    }

    // Set host header if changing origin
    if (config.changeOrigin !== false) {
      try {
        const targetUrl = new URL(this.buildTargetUrl(request, config));
        headers.set('host', targetUrl.host);
      } catch (error) {
        // Ignore host header modification if URL parsing fails
      }
    }

    return headers;
  }

  // Build response headers
  private buildResponseHeaders(response: Response, config: HTTPProxyConfig): Headers {
    const headers = new Headers(response.headers);

    // Add proxy headers
    headers.set('X-Proxied-By', 'Bun-Proxy');
    headers.set('X-Proxy-Timestamp', new Date().toISOString());

    return headers;
  }

  // Retry failed requests
  private async retryRequest(request: Request, retriesLeft: number): Promise<Response> {
    if (retriesLeft <= 0) {
      return new Response('Proxy Error: Max retries exceeded', {
        status: 502,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, 3 - retriesLeft), 10000);
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      return await this.handleHTTPRequest(request);
    } catch (error) {
      return this.retryRequest(request, retriesLeft - 1);
    }
  }

  // Override processRequest for HTTP-specific logic
  protected async processRequest(request: any): Promise<any> {
    // HTTP-specific preprocessing
    return request;
  }
}

// Factory function to create HTTP proxy
export function createHTTPProxy(config?: HTTPProxyConfig): HTTPProxy {
  return new HTTPProxy(config);
}

// Export default
export default HTTPProxy;