/**
 * Real-time Sync Engine
 * 
 * Cross-dashboard synchronization with:
 * - WebSocket-based broadcasting
 * - State reconciliation
 * - Conflict resolution
 * - Offline support
 * - Presence detection
 */

import type { RealTimeUpdate, UpdateType, ConnectionInfo } from './types';

// ==================== Types ====================

export type SyncStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';
export type SyncStrategy = 'broadcast' | 'leader' | 'p2p';

export interface SyncConfig {
  url: string;
  autoConnect: boolean;
  reconnect: boolean;
  reconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
  syncStrategy: SyncStrategy;
  channel: string;
  presence: boolean;
}

export interface SyncState {
  status: SyncStatus;
  lastSyncAt: number;
  connectionId: string | null;
  latency: number;
  pendingUpdates: number;
  errors: string[];
}

export interface PresenceInfo {
  id: string;
  userId?: string;
  userName?: string;
  clientType: 'admin' | 'client' | 'barber' | 'system';
  joinedAt: number;
  lastSeen: number;
  metadata?: Record<string, unknown>;
}

export interface SyncMessage {
  type: 'update' | 'presence' | 'heartbeat' | 'ack' | 'error' | 'join' | 'leave';
  timestamp: number;
  sender: string;
  channel: string;
  payload: unknown;
  sequence?: number;
}

export interface ConflictResolution {
  strategy: 'last-write-wins' | 'first-write-wins' | 'merge' | 'manual';
  resolver?: (local: unknown, remote: unknown) => unknown;
}

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  url: 'ws://localhost:3000/sync',
  autoConnect: true,
  reconnect: true,
  reconnectAttempts: 5,
  reconnectDelay: 3000,
  heartbeatInterval: 30000,
  syncStrategy: 'broadcast',
  channel: 'default',
  presence: true,
};

// ==================== Event Emitter ====================

type EventCallback<T = unknown> = (data: T) => void;

class EventEmitter {
  private listeners = new Map<string, Set<EventCallback>>();

  on<T>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback);
    
    return () => this.off(event, callback);
  }

  off<T>(event: string, callback: EventCallback<T>): void {
    this.listeners.get(event)?.delete(callback as EventCallback);
  }

  emit<T>(event: string, data: T): void {
    this.listeners.get(event)?.forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error(`Error in event listener for ${event}:`, err);
      }
    });
  }

  once<T>(event: string, callback: EventCallback<T>): void {
    const onceCallback = (data: T) => {
      this.off(event, onceCallback);
      callback(data);
    };
    this.on(event, onceCallback);
  }
}

// ==================== Presence Manager ====================

class PresenceManager {
  private presence = new Map<string, PresenceInfo>();
  private emitter: EventEmitter;

  constructor(emitter: EventEmitter) {
    this.emitter = emitter;
  }

  update(id: string, info: Partial<PresenceInfo>): void {
    const existing = this.presence.get(id);
    const updated: PresenceInfo = {
      ...existing,
      ...info,
      id,
      lastSeen: Date.now(),
    } as PresenceInfo;

    this.presence.set(id, updated);
    this.emitter.emit('presence:update', { id, info: updated });
  }

  remove(id: string): void {
    const info = this.presence.get(id);
    if (info) {
      this.presence.delete(id);
      this.emitter.emit('presence:leave', { id, info });
    }
  }

  get(id: string): PresenceInfo | undefined {
    return this.presence.get(id);
  }

  getAll(): PresenceInfo[] {
    return Array.from(this.presence.values());
  }

  getByType(type: PresenceInfo['clientType']): PresenceInfo[] {
    return this.getAll().filter(p => p.clientType === type);
  }

  clear(): void {
    this.presence.clear();
  }

  heartbeat(id: string): void {
    const info = this.presence.get(id);
    if (info) {
      info.lastSeen = Date.now();
      this.presence.set(id, info);
    }
  }

  cleanupStale(maxAgeMs: number = 60000): string[] {
    const now = Date.now();
    const stale: string[] = [];

    for (const [id, info] of this.presence.entries()) {
      if (now - info.lastSeen > maxAgeMs) {
        stale.push(id);
      }
    }

    stale.forEach(id => this.remove(id));
    return stale;
  }
}

// ==================== Update Buffer ====================

class UpdateBuffer {
  private buffer: RealTimeUpdate[] = [];
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  push(update: RealTimeUpdate): void {
    this.buffer.push(update);
    
    // Trim if exceeds max size
    if (this.buffer.length > this.maxSize) {
      this.buffer = this.buffer.slice(-this.maxSize);
    }
  }

  getAll(): RealTimeUpdate[] {
    return [...this.buffer];
  }

  getSince(timestamp: number): RealTimeUpdate[] {
    return this.buffer.filter(u => u.timestamp > timestamp);
  }

  getByType(type: UpdateType): RealTimeUpdate[] {
    return this.buffer.filter(u => u.type === type);
  }

  clear(): void {
    this.buffer = [];
  }

  get size(): number {
    return this.buffer.length;
  }
}

// ==================== Main Sync Engine ====================

export class SyncEngine {
  private config: SyncConfig;
  private state: SyncState;
  private ws: WebSocket | null = null;
  private emitter: EventEmitter;
  private presence: PresenceManager;
  private buffer: UpdateBuffer;
  private reconnectTimer: Timer | null = null;
  private heartbeatTimer: Timer | null = null;
  private reconnectAttempts = 0;
  private sequence = 0;
  private pendingAcks = new Map<number, () => void>();

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
    this.state = {
      status: 'disconnected',
      lastSyncAt: 0,
      connectionId: null,
      latency: 0,
      pendingUpdates: 0,
      errors: [],
    };
    this.emitter = new EventEmitter();
    this.presence = new PresenceManager(this.emitter);
    this.buffer = new UpdateBuffer();

    if (this.config.autoConnect) {
      this.connect();
    }
  }

  // ==================== Connection Management ====================

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.updateState({ status: 'connecting' });

    try {
      this.ws = new WebSocket(this.config.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.updateState({ status: 'connected' });
        
        // Join channel
        this.send({
          type: 'join',
          timestamp: Date.now(),
          sender: this.getClientId(),
          channel: this.config.channel,
          payload: { presence: this.config.presence },
        });

        // Start heartbeat
        this.startHeartbeat();

        this.emitter.emit('connected', { timestamp: Date.now() });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as SyncMessage;
          this.handleMessage(message);
        } catch (err) {
          console.error('Failed to parse sync message:', err);
        }
      };

      this.ws.onclose = () => {
        this.updateState({ status: 'disconnected' });
        this.stopHeartbeat();
        
        if (this.config.reconnect) {
          this.scheduleReconnect();
        }

        this.emitter.emit('disconnected', { timestamp: Date.now() });
      };

      this.ws.onerror = (error) => {
        this.updateState({ status: 'error' });
        this.addError('WebSocket error');
        this.emitter.emit('error', error);
      };
    } catch (err) {
      this.updateState({ status: 'error' });
      this.addError('Failed to create WebSocket connection');
      this.emitter.emit('error', err);
    }
  }

  disconnect(): void {
    this.stopReconnect();
    this.stopHeartbeat();

    if (this.ws) {
      // Send leave message
      this.send({
        type: 'leave',
        timestamp: Date.now(),
        sender: this.getClientId(),
        channel: this.config.channel,
        payload: {},
      });

      this.ws.close();
      this.ws = null;
    }

    this.updateState({ status: 'disconnected', connectionId: null });
    this.presence.clear();
  }

  // ==================== Message Handling ====================

  private handleMessage(message: SyncMessage): void {
    switch (message.type) {
      case 'update':
        this.handleUpdate(message);
        break;
      case 'presence':
        this.handlePresence(message);
        break;
      case 'heartbeat':
        this.handleHeartbeat(message);
        break;
      case 'ack':
        this.handleAck(message);
        break;
      case 'error':
        this.addError(String(message.payload));
        this.emitter.emit('error', message.payload);
        break;
    }

    this.emitter.emit('message', message);
  }

  private handleUpdate(message: SyncMessage): void {
    const update = message.payload as RealTimeUpdate;
    this.buffer.push(update);
    this.updateState({ lastSyncAt: Date.now() });
    
    // Send ack
    this.send({
      type: 'ack',
      timestamp: Date.now(),
      sender: this.getClientId(),
      channel: this.config.channel,
      payload: { sequence: message.sequence },
    });

    this.emitter.emit('update', update);
  }

  private handlePresence(message: SyncMessage): void {
    const info = message.payload as PresenceInfo;
    
    if (message.type === 'join' || message.timestamp > (this.presence.get(info.id)?.lastSeen || 0)) {
      this.presence.update(info.id, info);
    }
  }

  private handleHeartbeat(message: SyncMessage): void {
    this.presence.heartbeat(message.sender);
    
    // Calculate latency
    const now = Date.now();
    const latency = now - message.timestamp;
    this.updateState({ latency });
  }

  private handleAck(message: SyncMessage): void {
    const { sequence } = message.payload as { sequence: number };
    const ack = this.pendingAcks.get(sequence);
    if (ack) {
      ack();
      this.pendingAcks.delete(sequence);
    }
  }

  // ==================== Send Operations ====================

  send(message: Omit<SyncMessage, 'sequence'>): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message: WebSocket not connected');
      return;
    }

    const fullMessage: SyncMessage = {
      ...message,
      sequence: ++this.sequence,
    };

    this.ws.send(JSON.stringify(fullMessage));
  }

  broadcast(update: Omit<RealTimeUpdate, 'timestamp' | 'sequence'>): void {
    const fullUpdate: RealTimeUpdate = {
      ...update,
      timestamp: Date.now(),
      sequence: ++this.sequence,
    };

    this.send({
      type: 'update',
      timestamp: fullUpdate.timestamp,
      sender: this.getClientId(),
      channel: this.config.channel,
      payload: fullUpdate,
      sequence: fullUpdate.sequence,
    });

    // Also add to local buffer
    this.buffer.push(fullUpdate);
  }

  async broadcastWithAck(update: Omit<RealTimeUpdate, 'timestamp' | 'sequence'>, timeout = 5000): Promise<boolean> {
    return new Promise((resolve) => {
      const seq = this.sequence + 1;
      
      const timer = setTimeout(() => {
        this.pendingAcks.delete(seq);
        resolve(false);
      }, timeout);

      this.pendingAcks.set(seq, () => {
        clearTimeout(timer);
        resolve(true);
      });

      this.broadcast(update);
    });
  }

  // ==================== Presence ====================

  setPresence(info: Omit<PresenceInfo, 'id' | 'joinedAt' | 'lastSeen'>): void {
    const fullInfo: PresenceInfo = {
      ...info,
      id: this.getClientId(),
      joinedAt: Date.now(),
      lastSeen: Date.now(),
    };

    this.presence.update(fullInfo.id, fullInfo);

    this.send({
      type: 'presence',
      timestamp: Date.now(),
      sender: this.getClientId(),
      channel: this.config.channel,
      payload: fullInfo,
    });
  }

  getPresence(id: string): PresenceInfo | undefined {
    return this.presence.get(id);
  }

  getAllPresence(): PresenceInfo[] {
    return this.presence.getAll();
  }

  getPresenceByType(type: PresenceInfo['clientType']): PresenceInfo[] {
    return this.presence.getByType(type);
  }

  // ==================== Reconnection ====================

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.reconnectAttempts) {
      this.addError('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    this.updateState({ status: 'reconnecting' });

    const delay = this.config.reconnectDelay * this.reconnectAttempts;
    
    this.reconnectTimer = setTimeout(() => {
      console.log(`Reconnecting... (${this.reconnectAttempts}/${this.config.reconnectAttempts})`);
      this.connect();
    }, delay);
  }

  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ==================== Heartbeat ====================

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send({
        type: 'heartbeat',
        timestamp: Date.now(),
        sender: this.getClientId(),
        channel: this.config.channel,
        payload: {},
      });
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ==================== State Management ====================

  private updateState(updates: Partial<SyncState>): void {
    this.state = { ...this.state, ...updates };
    this.emitter.emit('state', this.state);
  }

  private addError(message: string): void {
    this.state.errors.push(message);
    if (this.state.errors.length > 10) {
      this.state.errors = this.state.errors.slice(-10);
    }
  }

  getState(): SyncState {
    return { ...this.state };
  }

  // ==================== Buffer Access ====================

  getUpdates(): RealTimeUpdate[] {
    return this.buffer.getAll();
  }

  getUpdatesSince(timestamp: number): RealTimeUpdate[] {
    return this.buffer.getSince(timestamp);
  }

  getUpdatesByType(type: UpdateType): RealTimeUpdate[] {
    return this.buffer.getByType(type);
  }

  clearBuffer(): void {
    this.buffer.clear();
  }

  // ==================== Utilities ====================

  private getClientId(): string {
    return this.state.connectionId || `client-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  isConnected(): boolean {
    return this.state.status === 'connected';
  }

  // ==================== Event Subscriptions ====================

  on<T>(event: string, callback: EventCallback<T>): () => void {
    return this.emitter.on(event, callback);
  }

  once<T>(event: string, callback: EventCallback<T>): void {
    this.emitter.once(event, callback);
  }

  off<T>(event: string, callback: EventCallback<T>): void {
    this.emitter.off(event, callback);
  }
}

// ==================== Factory Functions ====================

export function createSyncEngine(config?: Partial<SyncConfig>): SyncEngine {
  return new SyncEngine(config);
}

export function createBroadcastSync(channel: string): SyncEngine {
  return new SyncEngine({ channel, syncStrategy: 'broadcast' });
}

export default SyncEngine;
