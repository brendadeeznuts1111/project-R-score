// utils/retry.ts - Retry logic with exponential backoff
/**
 * Retry utility for handling transient failures
 * Implements exponential backoff with jitter
 */

import { config } from './config';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
  shouldRetry?: (error: Error) => boolean;
}

export class RetryError extends Error {
  constructor(
    message: string,
    public attempts: number,
    public lastError: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = config.retry.maxAttempts,
    baseDelay = config.retry.baseDelay,
    maxDelay = config.retry.maxDelay,
    onRetry,
    shouldRetry = () => true
  } = options;

  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on the last attempt
      if (attempt === maxAttempts || !shouldRetry(lastError)) {
        throw new RetryError(
          `Operation failed after ${attempt} attempt(s)`,
          attempt,
          lastError
        );
      }
      
      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt - 1),
        maxDelay
      );
      
      // Add jitter (±25%)
      const jitter = delay * 0.25 * (Math.random() * 2 - 1);
      const finalDelay = Math.max(0, delay + jitter);
      
      console.log(`⚠️ Attempt ${attempt} failed, retrying in ${Math.round(finalDelay)}ms...`);
      console.log(`   Error: ${lastError.message}`);
      
      if (onRetry) {
        onRetry(attempt, lastError);
      }
      
      await new Promise(resolve => setTimeout(resolve, finalDelay));
    }
  }
  
  throw lastError!;
}

// Specific retry functions for different operations
export const retryDeploy = <T>(operation: () => Promise<T>) =>
  withRetry(operation, {
    maxAttempts: 3,
    baseDelay: 2000,
    onRetry: (attempt, error) => {
      console.log(`🔄 Deploy retry ${attempt}/3: ${error.message}`);
    }
  });

export const retryGrafana = <T>(operation: () => Promise<T>) =>
  withRetry(operation, {
    maxAttempts: 2,
    baseDelay: 1000,
    shouldRetry: (error) => {
      // Retry on network errors but not on auth errors
      return !error.message.includes('401') && !error.message.includes('403');
    },
    onRetry: (attempt, error) => {
      console.log(`🔄 Grafana retry ${attempt}/2: ${error.message}`);
    }
  });

export const retryNotification = <T>(operation: () => Promise<T>) =>
  withRetry(operation, {
    maxAttempts: 2,
    baseDelay: 500,
    shouldRetry: (error) => {
      // Retry on rate limits and server errors
      return error.message.includes('429') || error.message.includes('5xx');
    },
    onRetry: (attempt, error) => {
      console.log(`🔄 Notification retry ${attempt}/2: ${error.message}`);
    }
  });
