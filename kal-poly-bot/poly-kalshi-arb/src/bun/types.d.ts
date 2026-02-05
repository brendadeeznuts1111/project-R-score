/**
 * Type definitions for Cloudflare Worker and edge deployment compatibility
 */

export interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number }
  ): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<{ keys: string[] }>;
}

export interface Queue {
  send(message: any): Promise<void>;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
}

export interface ScheduledEvent {
  scheduledTime: number;
  cron: string;
}

export interface Message {
  body: any;
  ack(): void;
}

export interface Env {
  KV: KVNamespace;
  QUEUE: Queue;
  REDIS_URL?: string;
}
