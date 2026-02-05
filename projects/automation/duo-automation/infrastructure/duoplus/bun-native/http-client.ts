// duoplus/bun-native/http-client.ts
import { fetch } from 'bun';

export interface DuoPlusRequestInit extends RequestInit {
  retryConfig?: {
    attempts: number;
    backoff: 'exponential' | 'constant';
  };
  keepAlive?: boolean;
  idleTimeout?: number;
}

export class BunNativeHttpClient {
  private keepAliveAgent: any;
  private defaultRetryConfig = {
    attempts: 3,
    backoff: 'exponential' as const
  };

  constructor(options: {
    keepAlive?: boolean;
    idleTimeout?: number;
  } = {}) {
    this.keepAliveAgent = {
      keepAlive: options.keepAlive ?? true,
      idleTimeout: options.idleTimeout ?? 30000
    };
  }

  async request(url: string, init: DuoPlusRequestInit = {}): Promise<Response> {
    const {
      retryConfig = this.defaultRetryConfig,
      keepAlive = true,
      idleTimeout = 30000,
      ...fetchInit
    } = init;

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= retryConfig.attempts; attempt++) {
      try {
        const response = await fetch(url, {
          ...fetchInit,
          // Bun-specific optimizations
          headers: {
            'Connection': keepAlive ? 'keep-alive' : 'close',
            'Keep-Alive': `timeout=${idleTimeout / 1000}`,
            ...fetchInit.headers
          }
        });

        if (response.ok) {
          return response;
        }

        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          return response;
        }

        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry on network errors that shouldn't be retried
        if (lastError.message.includes('ENOTFOUND') || 
            lastError.message.includes('ECONNREFUSED')) {
          break;
        }
      }

      // If this isn't the last attempt, wait before retrying
      if (attempt < retryConfig.attempts) {
        const delay = this.calculateDelay(attempt, retryConfig.backoff);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  async get(url: string, init?: DuoPlusRequestInit): Promise<Response> {
    return this.request(url, { ...init, method: 'GET' });
  }

  async post(url: string, body?: BodyInit, init?: DuoPlusRequestInit): Promise<Response> {
    return this.request(url, { 
      ...init, 
      method: 'POST',
      body: typeof body === 'object' ? JSON.stringify(body) : body,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers
      }
    });
  }

  async put(url: string, body?: BodyInit, init?: DuoPlusRequestInit): Promise<Response> {
    return this.request(url, { 
      ...init, 
      method: 'PUT',
      body: typeof body === 'object' ? JSON.stringify(body) : body,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers
      }
    });
  }

  async delete(url: string, init?: DuoPlusRequestInit): Promise<Response> {
    return this.request(url, { ...init, method: 'DELETE' });
  }

  private calculateDelay(attempt: number, backoff: 'exponential' | 'constant'): number {
    if (backoff === 'constant') {
      return 1000; // 1 second constant delay
    }
    
    // Exponential backoff: 1s, 2s, 4s, 8s...
    return Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
  }

  /**
   * Batch multiple requests for optimal performance
   */
  async batch(requests: Array<{ url: string; init?: DuoPlusRequestInit }>): Promise<Response[]> {
    const promises = requests.map(({ url, init }) => this.request(url, init));
    return Promise.all(promises);
  }

  /**
   * Stream response for large payloads
   */
  async stream(url: string, init?: DuoPlusRequestInit): Promise<ReadableStream> {
    const response = await this.request(url, init);
    if (!response.body) {
      throw new Error('Response has no body to stream');
    }
    return response.body;
  }
}
