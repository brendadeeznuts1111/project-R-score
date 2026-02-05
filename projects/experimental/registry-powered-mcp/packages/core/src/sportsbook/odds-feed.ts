/**
 * High-Frequency Odds Feed
 * Binary protocol parsing and WebSocket streaming for real-time odds updates
 *
 * Performance Targets:
 * - 15,000 updates/sec binary parsing
 * - <100ms WebSocket reconnection
 * - Zero-copy buffer handling
 *
 * SYSCALL: HIGH_FREQUENCY_FEED_INGRESSOR
 */

import { SecureDataView } from '../core/binary-protocol';
import {
  type EnhancedOddsEntry,
  type WireHeader,
  type SportsbookMetrics,
  MessageType,
  MarketStatus,
  OddsFormat,
  SPORTSBOOK_MAGIC,
  SPORTSBOOK_PROTOCOL_VERSION,
  SPORTSBOOK_PERFORMANCE_TARGETS,
  isValidMarketStatus,
  isValidOddsFormat,
  isValidMessageType,
} from './types';
import { RiskManagementEngine } from './risk-management';

/**
 * Feed configuration
 */
export interface OddsFeedConfig {
  /** WebSocket endpoint URL */
  readonly endpoint: string;
  /** Reconnection delay (ms) */
  readonly reconnectDelayMs: number;
  /** Maximum reconnection attempts */
  readonly maxReconnectAttempts: number;
  /** Enable automatic reconnection */
  readonly autoReconnect: boolean;
  /** Heartbeat interval (ms) */
  readonly heartbeatIntervalMs: number;
  /** Enable risk management processing */
  readonly enableRiskManagement: boolean;
  /** Batch size for bulk processing */
  readonly batchSize: number;
  /** Enable performance metrics */
  readonly enableMetrics: boolean;
}

/**
 * Default feed configuration
 */
export const DEFAULT_FEED_CONFIG: OddsFeedConfig = {
  endpoint: 'wss://odds.example.com/feed',
  reconnectDelayMs: 100,
  maxReconnectAttempts: 10,
  autoReconnect: true,
  heartbeatIntervalMs: 30_000,
  enableRiskManagement: true,
  batchSize: 1000,
  enableMetrics: true,
} as const;

/**
 * Odds update callback
 */
export type OddsUpdateCallback = (entry: EnhancedOddsEntry) => void;

/**
 * Connection state
 */
export enum ConnectionState {
  DISCONNECTED = 0,
  CONNECTING = 1,
  CONNECTED = 2,
  RECONNECTING = 3,
  FAILED = 4,
}

/**
 * High-Frequency Odds Feed
 * Handles binary protocol parsing and WebSocket streaming
 */
export class HighFrequencyOddsFeed {
  private readonly config: OddsFeedConfig;
  private readonly riskEngine: RiskManagementEngine | null;
  private readonly callbacks: Set<OddsUpdateCallback> = new Set();
  private readonly subscriptions: Set<string> = new Set();

  private ws: WebSocket | null = null;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private heartbeatTimer: Timer | null = null;
  private lastHeartbeat = 0;

  // Performance metrics
  private messageCount = 0;
  private byteCount = 0;
  private errorCount = 0;
  private lastSecondMessages = 0;
  private metricsWindow: number[] = [];
  private metricsTimer: Timer | null = null;

  constructor(config: Partial<OddsFeedConfig> = {}) {
    this.config = { ...DEFAULT_FEED_CONFIG, ...config };
    this.riskEngine = this.config.enableRiskManagement
      ? new RiskManagementEngine()
      : null;
  }

  /**
   * Connect to odds feed
   */
  async connect(): Promise<void> {
    if (this.state === ConnectionState.CONNECTED) {
      return;
    }

    this.state = ConnectionState.CONNECTING;

    try {
      this.ws = new WebSocket(this.config.endpoint);
      this.setupWebSocketHandlers();

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10_000);

        this.ws!.addEventListener('open', () => {
          clearTimeout(timeout);
          resolve();
        }, { once: true });

        this.ws!.addEventListener('error', (event) => {
          clearTimeout(timeout);
          reject(new Error('Connection failed'));
        }, { once: true });
      });

      this.state = ConnectionState.CONNECTED;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.startMetricsCollection();

      // Resubscribe to markets
      for (const marketId of this.subscriptions) {
        this.sendSubscribe(marketId);
      }
    } catch (error) {
      this.state = ConnectionState.DISCONNECTED;
      throw error;
    }
  }

  /**
   * Disconnect from odds feed
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.stopMetricsCollection();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.state = ConnectionState.DISCONNECTED;
  }

  /**
   * Subscribe to market updates
   */
  subscribe(marketId: string): void {
    this.subscriptions.add(marketId);

    if (this.state === ConnectionState.CONNECTED) {
      this.sendSubscribe(marketId);
    }
  }

  /**
   * Unsubscribe from market updates
   */
  unsubscribe(marketId: string): void {
    this.subscriptions.delete(marketId);

    if (this.state === ConnectionState.CONNECTED) {
      this.sendUnsubscribe(marketId);
    }
  }

  /**
   * Register odds update callback
   */
  onUpdate(callback: OddsUpdateCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Get connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Get risk management engine
   */
  getRiskEngine(): RiskManagementEngine | null {
    return this.riskEngine;
  }

  /**
   * Get performance metrics
   */
  getMetrics(): SportsbookMetrics {
    const avgRate = this.metricsWindow.length > 0
      ? this.metricsWindow.reduce((a, b) => a + b, 0) / this.metricsWindow.length
      : 0;

    const riskMetrics = this.riskEngine?.getMetrics();

    return {
      updatesPerSecond: avgRate,
      ordersPerSecond: 0, // Order matching in separate component
      matchLatencyP99: 0,
      arbitrageDetectionMs: riskMetrics?.lastProcessingMs ?? 0,
      heapUsage: 0, // Would need bun:jsc integration
      activeMarkets: this.subscriptions.size,
      openOrders: 0,
      matchedToday: 0,
    };
  }

  /**
   * Parse binary odds update message
   * Performance target: 15,000+ updates/sec
   */
  parseBinaryUpdate(data: ArrayBuffer): EnhancedOddsEntry | null {
    const view = new SecureDataView(data);

    try {
      // Parse header (16 bytes)
      const header = this.parseHeader(view);

      if (!header || header.magic !== SPORTSBOOK_MAGIC) {
        this.errorCount++;
        return null;
      }

      if (header.type !== MessageType.ODDS_UPDATE) {
        return null; // Not an odds update
      }

      // Parse odds entry payload
      return this.parseOddsPayload(view, header);
    } catch (error) {
      this.errorCount++;
      return null;
    }
  }

  /**
   * Parse bulk binary updates
   * Optimized for batch processing
   */
  parseBulkUpdates(data: ArrayBuffer): EnhancedOddsEntry[] {
    const entries: EnhancedOddsEntry[] = [];
    const view = new SecureDataView(data);

    while (view.getPosition() < data.byteLength) {
      const header = this.parseHeader(view);
      if (!header) break;

      if (header.type === MessageType.ODDS_UPDATE) {
        const entry = this.parseOddsPayload(view, header);
        if (entry) {
          entries.push(entry);
        }
      } else {
        // Skip non-odds messages
        view.skip(header.length);
      }
    }

    return entries;
  }

  /**
   * Convert entries to ReadableStream
   * For streaming processing pipelines
   */
  toReadableStream(entries: EnhancedOddsEntry[]): ReadableStream<EnhancedOddsEntry> {
    let index = 0;

    return new ReadableStream({
      pull(controller) {
        if (index < entries.length) {
          controller.enqueue(entries[index++]);
        } else {
          controller.close();
        }
      },
    });
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.binaryType = 'arraybuffer';

    this.ws.addEventListener('message', (event) => {
      this.handleMessage(event.data);
    });

    this.ws.addEventListener('close', (event) => {
      this.handleClose(event);
    });

    this.ws.addEventListener('error', (event) => {
      this.handleError(event);
    });
  }

  private handleMessage(data: ArrayBuffer | string): void {
    if (typeof data === 'string') {
      // JSON message (control plane)
      this.handleControlMessage(data);
      return;
    }

    // Binary message (data plane)
    this.messageCount++;
    this.byteCount += data.byteLength;
    this.lastSecondMessages++;

    const entries = this.parseBulkUpdates(data);

    for (const entry of entries) {
      // Risk management processing
      if (this.riskEngine) {
        this.riskEngine.processOddsUpdate(entry);
      }

      // Notify callbacks
      for (const callback of this.callbacks) {
        try {
          callback(entry);
        } catch (error) {
          console.error('Callback error:', error);
        }
      }
    }
  }

  private handleControlMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      if (message.type === 'heartbeat') {
        this.lastHeartbeat = Date.now();
      }
    } catch {
      // Ignore invalid JSON
    }
  }

  private handleClose(event: CloseEvent): void {
    this.state = ConnectionState.DISCONNECTED;
    this.stopHeartbeat();

    if (this.config.autoReconnect && event.code !== 1000) {
      this.attemptReconnect();
    }
  }

  private handleError(_event: Event): void {
    this.errorCount++;
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.state = ConnectionState.FAILED;
      return;
    }

    this.state = ConnectionState.RECONNECTING;
    this.reconnectAttempts++;

    // Exponential backoff with jitter
    const delay = Math.min(
      this.config.reconnectDelayMs * Math.pow(2, this.reconnectAttempts - 1),
      30_000
    ) + Math.random() * 100;

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await this.connect();
    } catch {
      this.attemptReconnect();
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const heartbeat = this.createHeartbeatMessage();
        this.ws.send(heartbeat);
      }
    }, this.config.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private startMetricsCollection(): void {
    if (!this.config.enableMetrics) return;

    this.metricsTimer = setInterval(() => {
      this.metricsWindow.push(this.lastSecondMessages);
      if (this.metricsWindow.length > 60) {
        this.metricsWindow.shift();
      }
      this.lastSecondMessages = 0;
    }, 1000);
  }

  private stopMetricsCollection(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
  }

  private sendSubscribe(marketId: string): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;

    const message = this.createSubscribeMessage(marketId);
    this.ws.send(message);
  }

  private sendUnsubscribe(marketId: string): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;

    const message = this.createUnsubscribeMessage(marketId);
    this.ws.send(message);
  }

  private parseHeader(view: SecureDataView): WireHeader | null {
    if (view.remaining() < 16) return null;

    const magic = view.readUint32();
    const version = view.readUint8();
    const type = view.readUint8();
    const length = view.readUint16();
    const sequence = view.readUint32();
    const timestamp = view.readUint32();

    if (!isValidMessageType(type)) {
      return null;
    }

    return {
      magic,
      version,
      type,
      length,
      sequence,
      timestamp,
    };
  }

  private parseOddsPayload(view: SecureDataView, header: WireHeader): EnhancedOddsEntry | null {
    // Parse fixed-size odds entry (64 bytes)
    // Layout:
    // - marketId: 16 bytes (UUID as bytes)
    // - selectionId: 16 bytes (UUID as bytes)
    // - odds: 8 bytes (float64)
    // - previousOdds: 8 bytes (float64)
    // - volume: 4 bytes (uint32)
    // - availableVolume: 4 bytes (uint32)
    // - status: 1 byte (uint8)
    // - format: 1 byte (uint8)
    // - overround: 2 bytes (uint16, scaled by 1000)
    // - bookmaker: 4 bytes (uint32 hash)

    if (view.remaining() < 64) return null;

    // Read UUIDs as byte arrays and convert to strings
    const marketIdBytes = view.readBytes(16);
    const selectionIdBytes = view.readBytes(16);

    const marketId = this.bytesToUUID(marketIdBytes);
    const selectionId = this.bytesToUUID(selectionIdBytes);

    const odds = view.readFloat64();
    const previousOdds = view.readFloat64();
    const volume = view.readUint32();
    const availableVolume = view.readUint32();
    const statusByte = view.readUint8();
    const formatByte = view.readUint8();
    const overroundScaled = view.readUint16();
    const bookmakerHash = view.readUint32();

    // Validate enums
    if (!isValidMarketStatus(statusByte) || !isValidOddsFormat(formatByte)) {
      return null;
    }

    return {
      marketId,
      selectionId,
      odds,
      previousOdds,
      volume,
      availableVolume,
      timestamp: header.timestamp,
      sequence: header.sequence,
      status: statusByte as MarketStatus,
      format: formatByte as OddsFormat,
      bookmaker: `BM-${bookmakerHash.toString(16).padStart(8, '0')}`,
      overround: overroundScaled / 1000,
    };
  }

  private bytesToUUID(bytes: Uint8Array): string {
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  private createHeartbeatMessage(): ArrayBuffer {
    const buffer = new ArrayBuffer(16);
    const view = new DataView(buffer);

    view.setUint32(0, SPORTSBOOK_MAGIC, true);
    view.setUint8(4, SPORTSBOOK_PROTOCOL_VERSION);
    view.setUint8(5, MessageType.HEARTBEAT);
    view.setUint16(6, 0, true); // No payload
    view.setUint32(8, 0, true); // Sequence
    view.setUint32(12, Math.floor(Date.now() / 1000), true);

    return buffer;
  }

  private createSubscribeMessage(marketId: string): ArrayBuffer {
    const marketIdBytes = this.uuidToBytes(marketId);
    const buffer = new ArrayBuffer(16 + 16); // Header + market ID
    const view = new DataView(buffer);

    view.setUint32(0, SPORTSBOOK_MAGIC, true);
    view.setUint8(4, SPORTSBOOK_PROTOCOL_VERSION);
    view.setUint8(5, MessageType.SUBSCRIBE);
    view.setUint16(6, 16, true); // Payload length
    view.setUint32(8, 0, true);
    view.setUint32(12, Math.floor(Date.now() / 1000), true);

    new Uint8Array(buffer, 16).set(marketIdBytes);

    return buffer;
  }

  private createUnsubscribeMessage(marketId: string): ArrayBuffer {
    const marketIdBytes = this.uuidToBytes(marketId);
    const buffer = new ArrayBuffer(16 + 16);
    const view = new DataView(buffer);

    view.setUint32(0, SPORTSBOOK_MAGIC, true);
    view.setUint8(4, SPORTSBOOK_PROTOCOL_VERSION);
    view.setUint8(5, MessageType.UNSUBSCRIBE);
    view.setUint16(6, 16, true);
    view.setUint32(8, 0, true);
    view.setUint32(12, Math.floor(Date.now() / 1000), true);

    new Uint8Array(buffer, 16).set(marketIdBytes);

    return buffer;
  }

  private uuidToBytes(uuid: string): Uint8Array {
    const hex = uuid.replace(/-/g, '');
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }
}

/**
 * Create a mock feed for testing
 */
export function createMockOddsFeed(
  updateInterval: number = 100,
  marketsCount: number = 10
): {
  feed: HighFrequencyOddsFeed;
  generateUpdate: () => EnhancedOddsEntry;
  start: () => void;
  stop: () => void;
} {
  const feed = new HighFrequencyOddsFeed({
    endpoint: 'ws://localhost:9999',
    enableRiskManagement: true,
  });

  const markets = Array.from({ length: marketsCount }, () => crypto.randomUUID());
  let timer: Timer | null = null;
  let sequence = 0;

  const generateUpdate = (): EnhancedOddsEntry => {
    const marketId = markets[Math.floor(Math.random() * markets.length)];
    const odds = 1.5 + Math.random() * 3;

    return {
      marketId,
      selectionId: crypto.randomUUID(),
      odds,
      previousOdds: odds - (Math.random() - 0.5) * 0.1,
      volume: Math.floor(Math.random() * 100000),
      availableVolume: Math.floor(Math.random() * 10000),
      timestamp: Math.floor(Date.now() / 1000),
      sequence: sequence++,
      status: MarketStatus.OPEN,
      format: OddsFormat.DECIMAL,
      bookmaker: 'MOCK-BK',
      overround: 1.02 + Math.random() * 0.08,
    };
  };

  const start = () => {
    timer = setInterval(() => {
      const update = generateUpdate();
      feed.getRiskEngine()?.processOddsUpdate(update);
    }, updateInterval);
  };

  const stop = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  return { feed, generateUpdate, start, stop };
}
