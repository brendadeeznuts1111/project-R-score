/**
 * Webhook alert delivery module
 * 
 * Handles sending alert webhooks with timeout, retry logic, and proper error handling
 * using Bun's native fetch API with best practices.
 * 
 * Performance Optimizations:
 * - Leverages Bun's automatic connection pooling and HTTP keep-alive
 *   (connections are automatically reused to the same host)
 * - Uses DNS prefetching and preconnect for faster initial connections
 * - Response buffering optimized via Bun's native response methods
 * - Automatic connection reuse reduces latency for repeated webhook calls
 */

import { logger } from '../../user-profile/src/index.ts';

// Type for Bun.file() return value
type BunFile = ReturnType<typeof Bun.file>;

/**
 * Options for webhook delivery
 */
export interface WebhookOptions {
  /** Timeout in milliseconds (default: 5000) */
  timeout?: number;
  /** Maximum number of retry attempts (default: 3) */
  retries?: number;
  /** Custom headers to include in the request */
  headers?: Record<string, string>;
  /** Proxy URL for the request (Bun supports HTTP/HTTPS proxies) */
  proxy?: string | {
    url: string;
    headers?: Record<string, string>;
  };
  /** Enable verbose debug logging (Bun-specific extension) */
  verbose?: boolean;
  /** Disable automatic response decompression (default: true) */
  decompress?: boolean;
  /** Disable connection reuse for this request (default: false, uses keep-alive) */
  keepalive?: boolean;
  /** TLS options for client certificates or custom validation */
  tls?: {
    key?: string | BunFile;
    cert?: string | BunFile;
    ca?: (string | BunFile)[];
    rejectUnauthorized?: boolean;
    checkServerIdentity?: (hostname: string, peerCertificate: any) => Error | undefined;
  };
}

/**
 * Result of a webhook delivery attempt
 */
export interface WebhookResult {
  /** Whether the webhook was successfully delivered */
  success: boolean;
  /** HTTP status code (if available) */
  statusCode?: number;
  /** Error message (if failed) */
  error?: string;
  /** Number of attempts made */
  attempts: number;
  /** Total time taken in milliseconds */
  durationMs: number;
}

/**
 * Send a webhook alert with timeout, retry logic, and proper error handling
 * 
 * Uses Bun's native fetch API with advanced features:
 * - AbortSignal.timeout() for automatic timeout handling
 * - Exponential backoff for retries
 * - Response validation (checks response.ok)
 * - Detailed error messages with status codes
 * - Leverages Bun's automatic HTTP keep-alive connection pooling
 * - Supports proxy configuration (HTTP/HTTPS proxies)
 * - Supports TLS client certificates and custom validation
 * - Supports verbose debugging mode
 * - Automatic response decompression (gzip, deflate, brotli, zstd)
 * 
 * Bun-specific features supported:
 * - Proxy: HTTP/HTTPS proxy with custom headers
 * - TLS: Client certificates, custom validation, rejectUnauthorized
 * - Verbose: Debug logging for request/response headers
 * - Decompress: Control automatic response decompression
 * - Keepalive: Control connection reuse (default: true)
 * 
 * @param webhookUrl - The webhook URL to send the alert to
 * @param payload - The payload to send (will be JSON stringified)
 * @param options - Optional configuration including timeout, retries, headers, proxy, TLS, etc.
 * @returns Promise that resolves with delivery result
 */
export async function sendWebhookAlert(
  webhookUrl: string,
  payload: any,
  options: WebhookOptions = {}
): Promise<WebhookResult> {
  const timeout = options.timeout ?? 5000;
  const maxRetries = options.retries ?? 3;
  const customHeaders = options.headers ?? {};
  
  const startTime = Bun.nanoseconds();
  let lastError: Error | null = null;
  let lastStatusCode: number | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Create timeout signal using Bun's AbortSignal.timeout
      const signal = AbortSignal.timeout(timeout);
      
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': `FactoryWager-Dashboard/1.0 (Bun/${Bun.version})`,
        ...customHeaders,
      };
      
      // Send webhook request
      // Note: Bun automatically uses connection pooling and HTTP keep-alive
      // Connections to the same host are reused, significantly reducing latency
      // Connection pooling is enabled by default (no configuration needed)
      
      // Build fetch options with Bun-specific extensions
      const fetchOptions: RequestInit & {
        proxy?: string | { url: string; headers?: Record<string, string> };
        verbose?: boolean;
        decompress?: boolean;
        keepalive?: boolean;
        tls?: any;
      } = {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal,
      };
      
      // Add proxy configuration if provided
      if (options.proxy) {
        fetchOptions.proxy = options.proxy;
      }
      
      // Add verbose debugging (Bun-specific extension)
      if (options.verbose) {
        fetchOptions.verbose = true;
      }
      
      // Add decompress option (default: true, supports gzip, deflate, brotli, zstd)
      if (options.decompress !== undefined) {
        fetchOptions.decompress = options.decompress;
      }
      
      // Add keepalive option (default: true for connection reuse)
      if (options.keepalive !== undefined) {
        fetchOptions.keepalive = options.keepalive;
      }
      
      // Add TLS options if provided (for client certificates or custom validation)
      if (options.tls) {
        fetchOptions.tls = options.tls;
      }
      
      const response = await fetch(webhookUrl, fetchOptions);
      
      // Validate response status
      if (!response.ok) {
        // Try to read error response body
        // Using response.text() leverages Bun's optimized response buffering
        // Bun automatically optimizes reading response bodies for performance
        let errorText = 'Unknown error';
        try {
          errorText = await response.text();
        } catch {
          // Ignore errors reading response body
        }
        
        const error = new Error(
          `Webhook failed: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`
        );
        lastError = error;
        lastStatusCode = response.status;
        
        // Don't retry on client errors (4xx), only on server errors (5xx) and network errors
        if (response.status >= 400 && response.status < 500) {
          logger.warn(`Webhook alert failed (client error, not retrying): ${error.message}`);
          break;
        }
        
        // Retry on server errors
        if (attempt < maxRetries) {
          logger.warn(`Webhook alert failed (attempt ${attempt}/${maxRetries}): ${error.message}, retrying...`);
          const backoffDelay = 1000 * Math.pow(2, attempt - 1); // Exponential backoff: 1s, 2s, 4s
          await Bun.sleep(backoffDelay);
          continue;
        }
        
        throw error;
      }
      
      // Success!
      const durationMs = (Bun.nanoseconds() - startTime) / 1_000_000;
      logger.info(`✅ Webhook alert delivered successfully (attempt ${attempt}/${maxRetries}, ${durationMs.toFixed(2)}ms)`);
      
      return {
        success: true,
        statusCode: response.status,
        attempts: attempt,
        durationMs,
      };
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Handle Bun-specific fetch error cases:
      // - AbortError: Timeout or manual cancellation
      // - TLS certificate validation failures
      // - Proxy/unix option conflicts
      // - S3 authentication/permission errors
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          logger.warn(`Webhook alert timed out after ${timeout}ms (attempt ${attempt}/${maxRetries})`);
        } else if (error.message.includes('TLS') || error.message.includes('certificate')) {
          logger.warn(`Webhook alert TLS error (attempt ${attempt}/${maxRetries}): ${lastError.message}`);
        } else if (error.message.includes('proxy') && error.message.includes('unix')) {
          logger.error(`Webhook alert configuration error: Cannot use both proxy and unix options together`);
          break; // Don't retry configuration errors
        } else {
          logger.warn(`Webhook alert error (attempt ${attempt}/${maxRetries}): ${lastError.message}`);
        }
      } else {
        logger.warn(`Webhook alert error (attempt ${attempt}/${maxRetries}): ${lastError.message}`);
      }
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff before retry
      const backoffDelay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
      await Bun.sleep(backoffDelay);
    }
  }
  
  // All retries exhausted
  const durationMs = (Bun.nanoseconds() - startTime) / 1_000_000;
  const errorMessage = lastError?.message || 'Unknown error';
  
  logger.error(`❌ Webhook alert failed after ${maxRetries} attempts (${durationMs.toFixed(2)}ms): ${errorMessage}`);
  
  return {
    success: false,
    statusCode: lastStatusCode,
    error: errorMessage,
    attempts: maxRetries,
    durationMs,
  };
}

/**
 * Preconnect to webhook URL for faster delivery (DNS prefetch + TCP connection + TLS handshake)
 * 
 * This can be called at startup if webhook URLs are known in advance.
 * Uses Bun's performance optimization APIs:
 * - dns.prefetch() for DNS lookup caching
 * - fetch.preconnect() for full connection establishment (DNS + TCP + TLS)
 * 
 * According to Bun docs: Preconnecting only helps if you know you'll need to connect
 * to a host soon, but you're not ready to make the request yet. Calling fetch
 * immediately after preconnect won't make it faster.
 * 
 * @param webhookUrl - The webhook URL to preconnect to
 */
export function preconnectWebhook(webhookUrl: string): void {
  try {
    const url = new URL(webhookUrl);
    // Only preconnect for HTTP/HTTPS URLs
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      // Step 1: DNS prefetch (cached for up to 30 seconds by Bun)
      // This avoids the DNS lookup delay when the webhook is actually called
      if (typeof Bun !== 'undefined' && Bun.dns) {
        Bun.dns.prefetch(url.hostname);
        logger.debug(`🔍 DNS prefetched for webhook: ${url.hostname}`);
      }
      
      // Step 2: Preconnect (DNS + TCP + TLS handshake)
      // This establishes the full connection early, ready for immediate use
      // Uses Bun's fetch.preconnect() API
      // The connection will be automatically reused via Bun's connection pooling
      fetch.preconnect(webhookUrl);
      logger.info(`🔗 Preconnected to webhook: ${url.hostname} (DNS + TCP + TLS ready, will reuse via connection pooling)`);
    }
  } catch (error) {
    // Invalid URL, skip preconnect
    logger.debug(`Skipping preconnect for invalid webhook URL: ${webhookUrl}`);
  }
}
