// @bun/proxy/patterns/retry-policy.ts - Retry policy implementation
import type { RetryPolicyConfiguration } from './index.js';

export class RetryPolicy {
  constructor(private configuration: RetryPolicyConfiguration) {
    this.validateConfiguration(configuration);
  }

  private validateConfiguration(config: RetryPolicyConfiguration): void {
    if (config.maximumAttemptCount <= 0) {
      throw new Error('Maximum attempt count must be greater than 0');
    }
  }

  async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.configuration.maximumAttemptCount; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === this.configuration.maximumAttemptCount) {
          break;
        }

        if (this.configuration.retryableErrorPredicate &&
            !this.configuration.retryableErrorPredicate(lastError)) {
          break;
        }

        if (this.configuration.onRetryCallback) {
          this.configuration.onRetryCallback(attempt, lastError);
        }

        const delay = this.calculateDelay(attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  private calculateDelay(attempt: number): number {
    const baseDelay = this.configuration.initialDelayMilliseconds *
                     Math.pow(this.configuration.backoffMultiplier, attempt - 1);

    const jitter = this.configuration.jitterFactor > 0 ?
                   Math.random() * baseDelay * this.configuration.jitterFactor : 0;

    return Math.min(baseDelay + jitter, this.configuration.maximumDelayMilliseconds);
  }
}
