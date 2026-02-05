/**
 * 🔁 Idempotency Layer - FactoryWager Venmo Family System
 * Prevents duplicate processing and ensures exactly-once semantics
 */

import { Redis } from '@upstash/redis';
import * as crypto from 'crypto';
import * as Sentry from '@sentry/nextjs';

/**
 * 🔁 Idempotency Configuration
 */
export interface IdempotencyConfig {
  ttl: number; // Time to live in seconds (default: 7 days)
  lockTimeout: number; // Lock timeout in seconds (default: 5 minutes)
  maxRetries: number; // Maximum retry attempts (default: 3)
  retryDelay: number; // Delay between retries in ms (default: 1000)
}

/**
 * 🔁 Idempotency Status
 */
export enum IdempotencyStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

/**
 * 🔁 Idempotency Result
 */
export interface IdempotencyResult<T = any> {
  status: IdempotencyStatus;
  data?: T;
  error?: string;
  isDuplicate: boolean;
  key: string;
}

/**
 * 🔁 Idempotency Manager
 */
export class IdempotencyManager {
  private redis: Redis;
  private config: IdempotencyConfig;

  constructor(config: Partial<IdempotencyConfig> = {}) {
    this.redis = Redis.fromEnv();
    this.config = {
      ttl: 604800, // 7 days in seconds
      lockTimeout: 300, // 5 minutes
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };
  }

  /**
   * 🔑 Generate idempotency key
   */
  generateKey(provider: string, transactionId: string, context?: string): string {
    const contextPart = context ? `:${context}` : '';
    return `idempotency:${provider}:${transactionId}${contextPart}`;
  }

  /**
   * 🔍 Check if operation is a duplicate
   */
  async checkDuplicate(key: string): Promise<IdempotencyResult> {
    try {
      const existing = await this.redis.get(key);
      
      if (!existing) {
        return {
          status: IdempotencyStatus.PENDING,
          isDuplicate: false,
          key
        };
      }

      const parsed = JSON.parse(existing);
      
      return {
        status: parsed.status,
        data: parsed.data,
        error: parsed.error,
        isDuplicate: true,
        key
      };
    } catch (error) {
      console.error('Error checking idempotency:', error);
      Sentry.captureException(error, {
        tags: { idempotency_type: 'check_duplicate' },
        extra: { key }
      });
      
      // Fail open - allow processing if check fails
      return {
        status: IdempotencyStatus.PENDING,
        isDuplicate: false,
        key
      };
    }
  }

  /**
   * 🔒 Acquire processing lock
   */
  async acquireLock(key: string): Promise<boolean> {
    try {
      const lockKey = `${key}:lock`;
      const lockValue = crypto.randomUUID();
      
      const result = await this.redis.set(lockKey, lockValue, {
        nx: true, // Only set if doesn't exist
        ex: this.config.lockTimeout
      });

      return result === 'OK';
    } catch (error) {
      console.error('Error acquiring lock:', error);
      Sentry.captureException(error, {
        tags: { idempotency_type: 'acquire_lock' },
        extra: { key }
      });
      return false;
    }
  }

  /**
   * 🔓 Release processing lock
   */
  async releaseLock(key: string): Promise<void> {
    try {
      const lockKey = `${key}:lock`;
      await this.redis.del(lockKey);
    } catch (error) {
      console.error('Error releasing lock:', error);
      Sentry.captureException(error, {
        tags: { idempotency_type: 'release_lock' },
        extra: { key }
      });
    }
  }

  /**
   * 📝 Mark as processing
   */
  async markProcessing(key: string): Promise<void> {
    try {
      const data = {
        status: IdempotencyStatus.PROCESSING,
        timestamp: Date.now(),
        attempts: 1
      };
      
      await this.redis.setex(key, this.config.ttl, JSON.stringify(data));
    } catch (error) {
      console.error('Error marking as processing:', error);
      Sentry.captureException(error, {
        tags: { idempotency_type: 'mark_processing' },
        extra: { key }
      });
    }
  }

  /**
   * ✅ Mark as completed
   */
  async markCompleted<T>(key: string, result: T): Promise<void> {
    try {
      const data = {
        status: IdempotencyStatus.COMPLETED,
        data: result,
        timestamp: Date.now(),
        completedAt: new Date().toISOString()
      };
      
      await this.redis.setex(key, this.config.ttl, JSON.stringify(data));
      await this.releaseLock(key);
    } catch (error) {
      console.error('Error marking as completed:', error);
      Sentry.captureException(error, {
        tags: { idempotency_type: 'mark_completed' },
        extra: { key }
      });
    }
  }

  /**
   * ❌ Mark as failed
   */
  async markFailed(key: string, error: string): Promise<void> {
    try {
      const data = {
        status: IdempotencyStatus.FAILED,
        error,
        timestamp: Date.now(),
        failedAt: new Date().toISOString()
      };
      
      await this.redis.setex(key, this.config.ttl, JSON.stringify(data));
      await this.releaseLock(key);
    } catch (error) {
      console.error('Error marking as failed:', error);
      Sentry.captureException(error, {
        tags: { idempotency_type: 'mark_failed' },
        extra: { key }
      });
    }
  }

  /**
   * 🔄 Execute with idempotency
   */
  async executeWithIdempotency<T>(
    provider: string,
    transactionId: string,
    operation: () => Promise<T>,
    context?: string
  ): Promise<IdempotencyResult<T>> {
    const key = this.generateKey(provider, transactionId, context);
    
    try {
      // Check for existing operation
      const existing = await this.checkDuplicate(key);
      if (existing.isDuplicate) {
        return existing;
      }

      // Acquire lock
      const lockAcquired = await this.acquireLock(key);
      if (!lockAcquired) {
        // Another process is handling this
        const retryResult = await this.retryWithBackoff(key);
        if (retryResult) {
          return retryResult;
        }
        
        return {
          status: IdempotencyStatus.FAILED,
          error: 'Could not acquire processing lock',
          isDuplicate: false,
          key
        };
      }

      // Mark as processing
      await this.markProcessing(key);

      try {
        // Execute the operation
        const result = await operation();
        
        // Mark as completed
        await this.markCompleted(key, result);
        
        return {
          status: IdempotencyStatus.COMPLETED,
          data: result,
          isDuplicate: false,
          key
        };
      } catch (error) {
        // Mark as failed
        const errorMessage = error instanceof Error ? error.message : String(error);
        await this.markFailed(key, errorMessage);
        
        Sentry.captureException(error, {
          tags: { idempotency_type: 'operation_failed' },
          extra: { key, provider, transactionId }
        });
        
        return {
          status: IdempotencyStatus.FAILED,
          error: errorMessage,
          isDuplicate: false,
          key
        };
      }
    } catch (error) {
      console.error('Idempotency execution error:', error);
      Sentry.captureException(error, {
        tags: { idempotency_type: 'execution_error' },
        extra: { key, provider, transactionId }
      });
      
      return {
        status: IdempotencyStatus.FAILED,
        error: 'Idempotency system error',
        isDuplicate: false,
        key
      };
    }
  }

  /**
   * 🔄 Retry with exponential backoff
   */
  private async retryWithBackoff<T>(key: string): Promise<IdempotencyResult<T> | null> {
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      await this.delay(this.config.retryDelay * Math.pow(2, attempt - 1));
      
      const existing = await this.checkDuplicate(key);
      if (existing.status !== IdempotencyStatus.PROCESSING) {
        return existing;
      }
    }
    
    return null;
  }

  /**
   * ⏱️ Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 🧹 Cleanup expired entries
   */
  async cleanupExpired(): Promise<number> {
    try {
      const pattern = 'idempotency:*';
      const keys = await this.redis.keys(pattern);
      let cleaned = 0;
      
      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -1) { // No expiry set
          await this.redis.expire(key, this.config.ttl);
          cleaned++;
        }
      }
      
      return cleaned;
    } catch (error) {
      console.error('Error cleaning up expired entries:', error);
      Sentry.captureException(error, {
        tags: { idempotency_type: 'cleanup' }
      });
      return 0;
    }
  }

  /**
   * 📊 Get idempotency metrics
   */
  async getMetrics(provider?: string): Promise<any> {
    try {
      const pattern = provider ? `idempotency:${provider}:*` : 'idempotency:*';
      const keys = await this.redis.keys(pattern);
      
      const metrics = {
        total: keys.length,
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0
      };
      
      for (const key of keys.slice(0, 1000)) { // Limit to 1000 keys to avoid timeout
        const data = await this.redis.get(key);
        if (data) {
          const parsed = JSON.parse(data);
          metrics[parsed.status]++;
        }
      }
      
      return metrics;
    } catch (error) {
      console.error('Error getting idempotency metrics:', error);
      Sentry.captureException(error, {
        tags: { idempotency_type: 'metrics' }
      });
      return null;
    }
  }
}

/**
 * 🔁 Payment Idempotency Handler
 */
export class PaymentIdempotencyHandler {
  private idempotency: IdempotencyManager;

  constructor() {
    this.idempotency = new IdempotencyManager({
      ttl: 604800, // 7 days
      lockTimeout: 300, // 5 minutes
      maxRetries: 3,
      retryDelay: 1000
    });
  }

  /**
   * 💳 Process payment with idempotency
   */
  async processPayment(
    provider: string,
    transactionId: string,
    paymentData: any
  ): Promise<IdempotencyResult> {
    return await this.idempotency.executeWithIdempotency(
      provider,
      transactionId,
      async () => {
        // Actual payment processing logic
        console.log(`Processing payment ${transactionId} for ${provider}`);
        
        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
          success: true,
          transactionId,
          provider,
          amount: paymentData.amount,
          processedAt: new Date().toISOString()
        };
      },
      'payment'
    );
  }

  /**
   * 📧 Process email webhook with idempotency
   */
  async processEmailWebhook(
    provider: string,
    messageId: string,
    emailData: any
  ): Promise<IdempotencyResult> {
    return await this.idempotency.executeWithIdempotency(
      provider,
      messageId,
      async () => {
        // Email processing logic
        console.log(`Processing email ${messageId} from ${provider}`);
        
        // Parse email and extract payment information
        const parsedPayment = this.parseEmailPayment(emailData);
        
        return {
          success: true,
          messageId,
          provider,
          payment: parsedPayment,
          processedAt: new Date().toISOString()
        };
      },
      'email'
    );
  }

  /**
   * 📱 Process SMS command with idempotency
   */
  async processSMSCommand(
    provider: string,
    messageId: string,
    smsData: any
  ): Promise<IdempotencyResult> {
    return await this.idempotency.executeWithIdempotency(
      provider,
      messageId,
      async () => {
        // SMS processing logic
        console.log(`Processing SMS ${messageId} from ${provider}`);
        
        // Parse SMS command and execute
        const result = this.parseSMSCommand(smsData);
        
        return {
          success: true,
          messageId,
          provider,
          command: smsData.command,
          response: result,
          processedAt: new Date().toISOString()
        };
      },
      'sms'
    );
  }

  /**
   * 📧 Parse email payment data
   */
  private parseEmailPayment(emailData: any): any {
    // Email parsing logic
    return {
      amount: emailData.amount || '0.00',
      recipient: emailData.recipient || 'Unknown',
      description: emailData.description || 'No description',
      transactionId: emailData.transactionId || 'unknown'
    };
  }

  /**
   * 📱 Parse SMS command
   */
  private parseSMSCommand(smsData: any): any {
    // SMS command parsing logic
    const command = smsData.command.toUpperCase();
    
    if (command.includes('PAY')) {
      return 'Payment processed successfully';
    } else if (command.includes('BALANCE')) {
      return 'Balance: $1,247.50';
    } else if (command.includes('HISTORY')) {
      return 'Recent transactions loaded';
    } else {
      return 'Command processed';
    }
  }
}

/**
 * 🚀 Usage Examples
 */
export const idempotencyManager = new IdempotencyManager();
export const paymentIdempotency = new PaymentIdempotencyHandler();

// Example usage:
/*
// Process a payment with idempotency
const result = await paymentIdempotency.processPayment(
  'venmo',
  'txn_123456789',
  { amount: 25.50, recipient: 'John Doe' }
);

if (result.isDuplicate) {
  console.log('Payment already processed:', result.data);
} else if (result.status === 'completed') {
  console.log('Payment processed:', result.data);
} else {
  console.error('Payment failed:', result.error);
}
*/
