/**
 * [KYC][UTILITY][INTERFACE][META:{export}]
 * Retry Logic with Exponential Backoff
 * Handles transient failures with intelligent retry strategies
 */

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitter: boolean; // Add random jitter to prevent thundering herd
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Add jitter to delay to prevent thundering herd
 */
function addJitter(delay: number, jitterPercent: number = 0.1): number {
  const jitter = delay * jitterPercent * Math.random();
  return delay + jitter;
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  // Network errors
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }
  
  // HTTP 5xx errors
  if (error?.status >= 500 && error?.status < 600) {
    return true;
  }
  
  // HTTP 429 (Too Many Requests)
  if (error?.status === 429) {
    return true;
  }
  
  // Timeout errors
  if (error?.name === "TimeoutError" || error?.message?.includes("timeout")) {
    return true;
  }
  
  // ECONNRESET, ECONNREFUSED, etc.
  if (error?.code === "ECONNRESET" || error?.code === "ECONNREFUSED") {
    return true;
  }
  
  return false;
}

/**
 * [KYC][UTILITY][FUNCTION][META:{async}][META:{export}]
 * Retry a function with exponential backoff
 * #REF:API-KYC-RETRY
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: any;
  
  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on last attempt
      if (attempt === finalConfig.maxRetries) {
        break;
      }
      
      // Don't retry non-retryable errors
      if (!isRetryableError(error)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        finalConfig.initialDelayMs * Math.pow(finalConfig.backoffMultiplier, attempt),
        finalConfig.maxDelayMs
      );
      
      const finalDelay = finalConfig.jitter ? addJitter(delay) : delay;
      
      await sleep(finalDelay);
    }
  }
  
  throw lastError;
}

/**
 * [KYC][UTILITY][FUNCTION][META:{async}][META:{export}]
 * Retry with circuit breaker integration
 * #REF:API-KYC-RETRY-CB
 */
export async function retryWithCircuitBreaker<T>(
  fn: () => Promise<T>,
  circuitBreaker: import("./circuitBreaker").CircuitBreaker,
  retryConfig: Partial<RetryConfig> = {}
): Promise<T> {
  return circuitBreaker.execute(() => retryWithBackoff(fn, retryConfig));
}
