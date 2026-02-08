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
 * - Response buffering optimized via Bun's native response methods:
 *   - response.text(): Fastest for text responses
 *   - response.json(): Optimized JSON parsing
 *   - response.bytes(): For binary data (Uint8Array)
 *   - response.arrayBuffer(): For raw binary data
 *   - response.blob(): For file-like data
 *   - response.formData(): For form data
 *   - Bun.write(): Write response directly to disk (useful for logging)
 * - Automatic connection reuse reduces latency for repeated webhook calls
 * 
 * Debugging:
 * - Enable verbose logging via options.verbose = true or WEBHOOK_VERBOSE=true env var
 * - Verbose mode prints request/response headers to console (Bun-specific feature)
 * - See: https://bun.com/docs/runtime/networking/fetch#debugging
 */

import { logger } from '../../user-profile/src/index.ts';

// Type for Bun.file() return value
type BunFile = ReturnType<typeof Bun.file>;

/**
 * Internal metrics tracking for webhook monitoring
 */
let lastPreconnectTimestamp: number | null = null;
let totalAttempts = 0;
let totalFailures = 0;

/**
 * Circuit breaker state
 */
let circuitBreakerOpen = false;
let circuitBreakerOpenTime: number | null = null;
const CIRCUIT_BREAKER_THRESHOLD = 25; // Failure rate percentage to open circuit
const CIRCUIT_BREAKER_COOLDOWN = 60000; // 60 seconds cooldown before retry

/**
 * Adaptive DNS warming state
 */
let lastDNSWarmTime: number | null = null;
const DNS_WARM_INTERVAL = 30000; // 30 seconds minimum between warm cycles
const DNS_HIT_RATIO_THRESHOLD = 70; // Hit ratio below which to trigger warming

/**
 * DNS cache statistics from Bun
 * Reference: https://bun.com/docs/runtime/networking/fetch#dns-prefetching
 */
export interface DNSCacheStats {
  cacheHitsCompleted: number;  // Resolved from cache
  cacheHitsInflight: number;   // Currently resolving
  cacheMisses: number;         // Required network lookup
  errors: number;              // Failed lookups
  size: number;                // Current cache entries
  totalCount: number;          // Total lookups
}

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
 * 
 * @example
 * ```typescript
 * // Basic usage with default timeout and retries
 * const result = await sendWebhookAlert(
 *   'https://hooks.example.com/alerts',
 *   { message: 'Alert triggered', severity: 'high' }
 * );
 * 
 * if (result.success) {
 *   console.log(`Webhook delivered in ${result.durationMs}ms`);
 * } else {
 *   console.error(`Failed: ${result.error}`);
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // With custom timeout and retry configuration
 * const result = await sendWebhookAlert(
 *   'https://hooks.example.com/alerts',
 *   { alerts: ['Performance degraded'], timestamp: Date.now() },
 *   {
 *     timeout: 10000,  // 10 second timeout
 *     retries: 5,      // Retry up to 5 times
 *     headers: {
 *       'X-Custom-Header': 'value',
 *       'Authorization': 'Bearer token'
 *     }
 *   }
 * );
 * ```
 * 
 * @example
 * ```typescript
 * // With proxy configuration
 * const result = await sendWebhookAlert(
 *   'https://hooks.example.com/alerts',
 *   payload,
 *   {
 *     proxy: {
 *       url: 'http://proxy.example.com:8080',
 *       headers: {
 *         'Proxy-Authorization': 'Basic ' + btoa('user:pass')
 *       }
 *     }
 *   }
 * );
 * ```
 * 
 * @example
 * ```typescript
 * // With TLS client certificate
 * const result = await sendWebhookAlert(
 *   'https://secure.example.com/webhook',
 *   payload,
 *   {
 *     tls: {
 *       key: Bun.file('/path/to/client-key.pem'),
 *       cert: Bun.file('/path/to/client-cert.pem'),
 *       ca: [Bun.file('/path/to/ca-cert.pem')]
 *     }
 *   }
 * );
 * ```
 * 
 * @example
 * ```typescript
 * // With verbose debugging (prints request/response headers)
 * const result = await sendWebhookAlert(
 *   'https://hooks.example.com/alerts',
 *   payload,
 *   { verbose: true }  // Enable debug logging
 * );
 * ```
 * 
 * @example
 * ```typescript
 * // Fire-and-forget pattern (non-blocking)
 * sendWebhookAlert(webhookUrl, payload)
 *   .catch(error => {
 *     // Errors are already logged, but handle here if needed
 *     console.error('Webhook delivery failed:', error);
 *   });
 * ```
 */
export async function sendWebhookAlert(
  webhookUrl: string,
  payload: any,
  options: WebhookOptions = {}
): Promise<WebhookResult> {
  // 🚨 Circuit Breaker: Check if circuit is open
  // Note: getWebhookMetrics() is defined later in this file, but since it's in the same module
  // and uses module-level variables, we can call it here
  const metrics = getWebhookMetricsInternal();
  const now = Date.now();
  
  // Check if we should open the circuit breaker
  if (!circuitBreakerOpen && metrics.failureRate !== null && metrics.failureRate > CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreakerOpen = true;
    circuitBreakerOpenTime = now;
    logger.warn(`🚨 Circuit Breaker OPEN: Webhook failure rate ${metrics.failureRate.toFixed(1)}% exceeds threshold ${CIRCUIT_BREAKER_THRESHOLD}%`);
  }
  
  // Check if circuit breaker should be closed (cooldown period passed)
  if (circuitBreakerOpen && circuitBreakerOpenTime !== null) {
    const cooldownElapsed = now - circuitBreakerOpenTime;
      if (cooldownElapsed > CIRCUIT_BREAKER_COOLDOWN) {
        // Re-check failure rate before closing
        const currentMetrics = getWebhookMetricsInternal();
        if (currentMetrics.failureRate === null || currentMetrics.failureRate < CIRCUIT_BREAKER_THRESHOLD / 2) {
        circuitBreakerOpen = false;
        circuitBreakerOpenTime = null;
        logger.info(`✅ Circuit Breaker CLOSED: Failure rate recovered to ${currentMetrics.failureRate?.toFixed(1) || 0}%`);
      } else {
        // Reset cooldown timer
        circuitBreakerOpenTime = now;
      }
    }
  }
  
  // If circuit breaker is open, use fast-path mode (single attempt, short timeout)
  if (circuitBreakerOpen) {
    logger.warn(`🚨 Circuit Breaker: Using fast-path mode (single attempt, 1s timeout) to prevent retry storms`);
    const fastPathResult = await sendWebhookAlertFastPath(webhookUrl, payload, options);
    
    // Track attempt and failure
    totalAttempts++;
    if (!fastPathResult.success) {
      totalFailures++;
    }
    
    return fastPathResult;
  }
  
  const timeout = options.timeout ?? 5000;
  const maxRetries = options.retries ?? 3;
  const customHeaders = options.headers ?? {};
  
  // Enable verbose debugging if requested via options or environment variable
  // This uses Bun's fetch.verbose option to print request/response headers
  // See: https://bun.com/docs/runtime/networking/fetch#debugging
  const verbose = options.verbose ?? (process.env.WEBHOOK_VERBOSE === 'true');
  
  const startTime = Bun.nanoseconds();
  let lastError: Error | null = null;
  let lastStatusCode: number | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Track each attempt (including retries)
    totalAttempts++;
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
      // When enabled, prints request/response headers to console for debugging
      // Enable via: options.verbose = true or WEBHOOK_VERBOSE=true environment variable
      if (verbose) {
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
        // 
        // Bun provides several optimized methods for reading response bodies:
        // - response.text(): Promise<string> - Fastest for text responses
        // - response.json(): Promise<any> - Optimized JSON parsing
        // - response.bytes(): Promise<Uint8Array> - For binary data
        // - response.arrayBuffer(): Promise<ArrayBuffer> - For raw binary
        // - response.blob(): Promise<Blob> - For file-like data
        // - response.formData(): Promise<FormData> - For form data
        // 
        // Reference: https://bun.com/docs/runtime/networking/fetch#response-bodies
        let errorText = 'Unknown error';
        try {
          // Use response.text() for error messages (fastest for text)
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
          // Track failure for client errors (we don't retry these)
          totalFailures++;
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
      
      // Note: We don't increment failures here since this is a success
      // The failure tracking happens in the catch block below
      
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
  
  // Track failure (only count once per webhook call, not per retry attempt)
  totalFailures++;
  
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
 * Fast-path webhook delivery (used when circuit breaker is open)
 * Single attempt with short timeout to prevent retry storms
 */
async function sendWebhookAlertFastPath(
  webhookUrl: string,
  payload: any,
  options: WebhookOptions = {}
): Promise<WebhookResult> {
  const startTime = Bun.nanoseconds();
  const timeout = 1000; // 1 second timeout for fast-path
  
  try {
    const signal = AbortSignal.timeout(timeout);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': `FactoryWager-Dashboard/1.0 (Bun/${Bun.version})`,
      ...(options.headers ?? {}),
    };
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal,
    });
    
    const durationMs = (Bun.nanoseconds() - startTime) / 1_000_000;
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      logger.warn(`🚨 Fast-path webhook failed: ${response.status} ${response.statusText}`);
      return {
        success: false,
        statusCode: response.status,
        error: `Fast-path failed: ${response.status} ${response.statusText} - ${errorText.substring(0, 100)}`,
        attempts: 1,
        durationMs,
      };
    }
    
    return {
      success: true,
      statusCode: response.status,
      attempts: 1,
      durationMs,
    };
  } catch (error) {
    const durationMs = (Bun.nanoseconds() - startTime) / 1_000_000;
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn(`🚨 Fast-path webhook error: ${errorMessage}`);
    return {
      success: false,
      error: `Fast-path error: ${errorMessage}`,
      attempts: 1,
      durationMs,
    };
  }
}

/**
 * Preconnect to webhook URL for faster delivery (DNS prefetch + TCP connection + TLS handshake)
 * 
 * This can be called at startup if webhook URLs are known in advance.
 * Uses Bun's performance optimization APIs:
 * - dns.prefetch() for DNS lookup caching (cached for up to 30 seconds)
 * - fetch.preconnect() for full connection establishment (DNS + TCP + TLS)
 * 
 * According to Bun docs: Preconnecting only helps if you know you'll need to connect
 * to a host soon, but you're not ready to make the request yet. Calling fetch
 * immediately after preconnect won't make it faster.
 * 
 * Reference: https://bun.com/docs/runtime/networking/fetch#preconnect-to-a-host
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
      // Bun automatically caches and deduplicates DNS queries in-memory
      if (typeof Bun !== 'undefined' && Bun.dns && Bun.dns.prefetch) {
        Bun.dns.prefetch(url.hostname);
        logger.debug(`🔍 DNS prefetched for webhook: ${url.hostname}`);
      }
      
      // Step 2: Preconnect (DNS + TCP + TLS handshake)
      // This establishes the full connection early, ready for immediate use
      // Uses Bun's fetch.preconnect() API
      // The connection will be automatically reused via Bun's connection pooling
      if (typeof fetch !== 'undefined' && fetch.preconnect) {
        fetch.preconnect(webhookUrl);
        // Track preconnect timestamp for monitoring
        lastPreconnectTimestamp = Date.now();
        logger.info(`🔗 Preconnected to webhook: ${url.hostname} (DNS + TCP + TLS ready, will reuse via connection pooling)`);
      }
    }
  } catch (error) {
    // Invalid URL, skip preconnect
    logger.debug(`Skipping preconnect for invalid webhook URL: ${webhookUrl}`);
  }
}

/**
 * Get DNS cache statistics for monitoring and debugging
 * 
 * Bun caches DNS queries in-memory for up to 30 seconds by default.
 * This function provides insights into cache performance:
 * - Hit ratio: percentage of requests served from cache
 * - Cache size: number of cached entries
 * - Error rate: failed DNS lookups
 * 
 * Reference: https://bun.com/docs/runtime/networking/fetch#dns-prefetching
 * 
 * @returns DNS cache statistics, or null if unavailable
 * 
 * @example
 * ```typescript
 * const stats = getDNSCacheStats();
 * if (stats) {
 *   const hitRatio = ((stats.cacheHitsCompleted + stats.cacheHitsInflight) / stats.totalCount) * 100;
 *   console.log(`DNS cache hit ratio: ${hitRatio.toFixed(1)}%`);
 * }
 * ```
 */
export function getDNSCacheStats(): DNSCacheStats | null {
  try {
    if (typeof Bun !== 'undefined' && Bun.dns && Bun.dns.getCacheStats) {
      const stats = Bun.dns.getCacheStats();
      return {
        cacheHitsCompleted: stats.cacheHitsCompleted ?? 0,
        cacheHitsInflight: stats.cacheHitsInflight ?? 0,
        cacheMisses: stats.cacheMisses ?? 0,
        errors: stats.errors ?? 0,
        size: stats.size ?? 0,
        totalCount: stats.totalCount ?? 0,
      };
    }
  } catch (error) {
    logger.debug(`Failed to get DNS cache stats: ${error instanceof Error ? error.message : String(error)}`);
  }
  return null;
}

/**
 * Calculate DNS cache hit ratio from stats
 * 
 * @param stats - DNS cache statistics
 * @returns Hit ratio as a percentage (0-100), or null if stats are invalid
 */
export function calculateDNSCacheHitRatio(stats: DNSCacheStats | null): number | null {
  if (!stats || stats.totalCount === 0) {
    return null;
  }
  
  const totalHits = stats.cacheHitsCompleted + stats.cacheHitsInflight;
  return (totalHits / stats.totalCount) * 100;
}

/**
 * Webhook metrics for monitoring and health checks
 */
export interface WebhookMetrics {
  /** Timestamp of last preconnect (null if never preconnected) */
  lastPreconnect: number | null;
  /** Total number of webhook delivery attempts (includes retries) */
  attemptCount: number;
  /** Failure rate as a percentage (0-100), or null if no attempts yet */
  failureRate: number | null;
  /** Total number of failed webhook deliveries (counts each failed call once, not per retry) */
  totalFailures: number;
  /** Circuit breaker state */
  circuitBreakerOpen: boolean;
  /** Timestamp when circuit breaker was opened (null if closed) */
  circuitBreakerOpenTime: number | null;
}

/**
 * Get webhook delivery metrics for monitoring
 * 
 * Useful for health checks, monitoring dashboards, or diagnostic scripts.
 * Tracks:
 * - Last preconnect timestamp (to verify DNS prefetching is active)
 * - Total attempt count (includes retries)
 * - Failure rate percentage
 * 
 * @returns Webhook metrics object
 * 
 * @example
 * ```typescript
 * // In a health check or monitoring endpoint
 * const metrics = getWebhookMetrics();
 * 
 * if (metrics.lastPreconnect === null) {
 *   console.warn('⚠️ Webhook preconnect never called - DNS prefetching may not be active');
 * }
 * 
 * if (metrics.failureRate !== null && metrics.failureRate > 10) {
 *   console.error(`⚠️ High webhook failure rate: ${metrics.failureRate.toFixed(1)}%`);
 * }
 * 
 * console.log(`Webhook metrics: ${metrics.attemptCount} attempts, ${metrics.failureRate?.toFixed(1) || 0}% failure rate`);
 * ```
 * 
 * @example
 * ```typescript
 * // In a dashboard or monitoring script
 * const metrics = getWebhookMetrics();
 * const dnsStats = getDNSCacheStats();
 * 
 * console.log('Webhook Health:');
 * console.log(`  Last preconnect: ${metrics.lastPreconnect ? new Date(metrics.lastPreconnect).toISOString() : 'Never'}`);
 * console.log(`  Total attempts: ${metrics.attemptCount}`);
 * console.log(`  Failure rate: ${metrics.failureRate?.toFixed(2) || 0}%`);
 * 
 * if (dnsStats) {
 *   const hitRatio = calculateDNSCacheHitRatio(dnsStats);
 *   console.log(`  DNS cache hit ratio: ${hitRatio?.toFixed(1) || 0}%`);
 * }
 * ```
 */
/**
 * Internal function to get webhook metrics (defined before sendWebhookAlert uses it)
 */
function getWebhookMetricsInternal(): WebhookMetrics {
  return {
    lastPreconnect: lastPreconnectTimestamp,
    attemptCount: totalAttempts,
    failureRate: totalAttempts > 0 ? (totalFailures / totalAttempts) * 100 : null,
    totalFailures,
    circuitBreakerOpen,
    circuitBreakerOpenTime,
  };
}

/**
 * Get webhook delivery metrics for monitoring (public export)
 */
export function getWebhookMetrics(): WebhookMetrics {
  return getWebhookMetricsInternal();
}

/**
 * Adaptive DNS Cache Warming
 * 
 * Automatically increases prefetch frequency when DNS hit ratio drops below threshold.
 * This "warms" the DNS cache ahead of TTL expiration to maintain optimal performance.
 * 
 * Call this periodically (e.g., every 30 seconds) or integrate into your monitoring loop.
 * 
 * @param webhookUrl - The webhook URL to warm (optional, uses last preconnected URL if not provided)
 * 
 * @example
 * ```typescript
 * // In a periodic monitoring loop
 * setInterval(() => {
 *   tuneDNSStrategy(webhookUrl);
 * }, 30000); // Every 30 seconds
 * ```
 */
export function tuneDNSStrategy(webhookUrl?: string): void {
  const stats = getDNSCacheStats();
  const hitRatio = calculateDNSCacheHitRatio(stats);
  const now = Date.now();
  
  // Check if we need to warm the cache
  if (hitRatio !== null && hitRatio < DNS_HIT_RATIO_THRESHOLD) {
    // Rate limit: don't warm more than once per interval
    if (lastDNSWarmTime === null || (now - lastDNSWarmTime) > DNS_WARM_INTERVAL) {
      logger.info(`🌡️ DNS Hit Ratio low (${hitRatio.toFixed(1)}%), triggering adaptive cache warming...`);
      
      // If webhook URL is provided, use it; otherwise log that we need it
      if (webhookUrl) {
        preconnectWebhook(webhookUrl);
        lastDNSWarmTime = now;
        logger.debug(`✅ DNS cache warmed for ${webhookUrl}`);
      } else {
        logger.debug(`⚠️ DNS warming requested but no webhook URL provided`);
      }
    } else {
      logger.debug(`⏱️ DNS warming skipped (rate limited, last warm: ${((now - lastDNSWarmTime) / 1000).toFixed(0)}s ago)`);
    }
  } else if (hitRatio !== null) {
    logger.debug(`✅ DNS Hit Ratio healthy (${hitRatio.toFixed(1)}%), no warming needed`);
  }
}
