// @bun/proxy/websocket/index.ts - WebSocket module
export class MessageBuffer {
  private messages: any[] = [];
  private maxSize: number;

  constructor(configuration: any) {
    this.maxSize = configuration?.maximumSize || 1000;
  }

  add(message: any): void {
    if (this.messages.length >= this.maxSize) {
      this.messages.shift();
    }
    this.messages.push(message);
  }

  getMessages(): any[] {
    return [...this.messages];
  }

  clear(): void {
    this.messages = [];
  }

  getSize(): number {
    return this.messages.length;
  }
}

export class PubSubService {
  private subscribers: Map<string, Set<(message: any) => void>> = new Map();

  subscribe(topic: string, callback: (message: any) => void): void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    this.subscribers.get(topic)!.add(callback);
  }

  unsubscribe(topic: string, callback: (message: any) => void): void {
    const subscribers = this.subscribers.get(topic);
    if (subscribers) {
      subscribers.delete(callback);
    }
  }

  publish(topic: string, message: any): void {
    const subscribers = this.subscribers.get(topic);
    if (subscribers) {
      subscribers.forEach(callback => callback(message));
    }
  }
}

export interface MessageBufferConfiguration {
  maximumSize: number;
  enablePersistence: boolean;
  storagePath?: string;
  compressionEnabled: boolean;
}

export interface PubSubConfiguration {
  enablePersistence: boolean;
  storageBackend: 'memory' | 'redis' | 'database';
  connectionConfiguration?: any;
  maximumSubscribers: number;
}
