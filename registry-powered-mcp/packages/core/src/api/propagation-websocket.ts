/**
 * Propagation WebSocket Message Types
 * Real-time streaming for half-life updates and pattern detection
 *
 * Message Types:
 * - HALF_LIFE_UPDATE   - Metric changes for tier/bookmaker
 * - PATTERN_DETECTED   - New pattern found
 * - PATTERN_EXPIRED    - Pattern resolved/timed out
 * - HEATMAP_UPDATE     - Heatmap cell deltas
 * - SUBSCRIPTION_ACK   - Subscription confirmation
 * - ERROR              - Error notification
 *
 * @module api/propagation-websocket
 */

import {
  type PropagationMessage,
  type PropagationMessageType,
  type HalfLifeUpdatePayload,
  type PatternDetectedPayload,
  type PatternExpiredPayload,
  type HeatmapUpdatePayload,
  type DetectedPattern,
  type HalfLifeMetrics,
  type HeatmapCell,
  type MarketTier,
  type PatternId,
  type PatternCategory,
  type PatternSeverity,
} from '../sportsbook/propagation/types';

/**
 * Extended message types for WebSocket protocol
 */
export type ExtendedMessageType =
  | PropagationMessageType
  | 'SUBSCRIPTION_ACK'
  | 'SUBSCRIPTION_ERROR'
  | 'PING'
  | 'PONG'
  | 'ERROR';

/**
 * Subscription request message
 */
export interface SubscriptionRequest {
  readonly action: 'subscribe' | 'unsubscribe';
  readonly channels: readonly SubscriptionChannel[];
}

/**
 * Available subscription channels
 */
export type SubscriptionChannel =
  | 'half-life'        // All half-life updates
  | 'patterns'         // All pattern events
  | 'heatmap'          // Heatmap deltas
  | `tier:${number}`   // Specific tier updates
  | `bookmaker:${string}`  // Specific bookmaker updates
  | `pattern:${number}`;   // Specific pattern type

/**
 * Subscription acknowledgment payload
 */
export interface SubscriptionAckPayload {
  readonly subscribed: readonly SubscriptionChannel[];
  readonly unsubscribed: readonly SubscriptionChannel[];
  readonly activeSubscriptions: readonly SubscriptionChannel[];
}

/**
 * Error payload
 */
export interface ErrorPayload {
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
}

/**
 * WebSocket message with extended types
 */
export interface PropagationWebSocketMessage<T = unknown> {
  readonly type: ExtendedMessageType;
  readonly timestamp: number;
  readonly sequence: number;
  readonly payload: T;
}

/**
 * Message sequence tracker
 */
let messageSequence = 0;

/**
 * Create a half-life update message
 */
export function createHalfLifeUpdateMessage(
  tier: MarketTier,
  bookmaker: string,
  metrics: HalfLifeMetrics,
  previousMetrics: HalfLifeMetrics | null = null
): PropagationWebSocketMessage<HalfLifeUpdatePayload> {
  return {
    type: 'HALF_LIFE_UPDATE',
    timestamp: Date.now(),
    sequence: ++messageSequence,
    payload: {
      tier,
      bookmaker,
      metrics,
      previousMetrics,
    },
  };
}

/**
 * Create a pattern detected message
 */
export function createPatternDetectedMessage(
  pattern: DetectedPattern
): PropagationWebSocketMessage<PatternDetectedPayload> {
  return {
    type: 'PATTERN_DETECTED',
    timestamp: Date.now(),
    sequence: ++messageSequence,
    payload: { pattern },
  };
}

/**
 * Create a pattern expired message
 */
export function createPatternExpiredMessage(
  patternId: PatternId,
  affectedMarkets: readonly string[],
  reason: 'timeout' | 'resolved' | 'invalidated'
): PropagationWebSocketMessage<PatternExpiredPayload> {
  return {
    type: 'PATTERN_EXPIRED',
    timestamp: Date.now(),
    sequence: ++messageSequence,
    payload: {
      patternId,
      affectedMarkets,
      reason,
    },
  };
}

/**
 * Create a heatmap update message
 */
export function createHeatmapUpdateMessage(
  changedCells: readonly HeatmapCell[]
): PropagationWebSocketMessage<HeatmapUpdatePayload> {
  return {
    type: 'HEATMAP_UPDATE',
    timestamp: Date.now(),
    sequence: ++messageSequence,
    payload: {
      changedCells,
      timestamp: Date.now(),
    },
  };
}

/**
 * Create subscription acknowledgment message
 */
export function createSubscriptionAckMessage(
  subscribed: readonly SubscriptionChannel[],
  unsubscribed: readonly SubscriptionChannel[],
  activeSubscriptions: readonly SubscriptionChannel[]
): PropagationWebSocketMessage<SubscriptionAckPayload> {
  return {
    type: 'SUBSCRIPTION_ACK',
    timestamp: Date.now(),
    sequence: ++messageSequence,
    payload: {
      subscribed,
      unsubscribed,
      activeSubscriptions,
    },
  };
}

/**
 * Create error message
 */
export function createErrorMessage(
  code: string,
  message: string,
  details?: unknown
): PropagationWebSocketMessage<ErrorPayload> {
  return {
    type: 'ERROR',
    timestamp: Date.now(),
    sequence: ++messageSequence,
    payload: { code, message, details },
  };
}

/**
 * Create ping message
 */
export function createPingMessage(): PropagationWebSocketMessage<{ clientTime: number }> {
  return {
    type: 'PING',
    timestamp: Date.now(),
    sequence: ++messageSequence,
    payload: { clientTime: Date.now() },
  };
}

/**
 * Create pong message
 */
export function createPongMessage(
  clientTime: number
): PropagationWebSocketMessage<{ clientTime: number; serverTime: number; latencyMs: number }> {
  const serverTime = Date.now();
  return {
    type: 'PONG',
    timestamp: serverTime,
    sequence: ++messageSequence,
    payload: {
      clientTime,
      serverTime,
      latencyMs: serverTime - clientTime,
    },
  };
}

/**
 * Serialize message for WebSocket transmission
 */
export function serializeMessage<T>(message: PropagationWebSocketMessage<T>): string {
  return JSON.stringify(message);
}

/**
 * Deserialize message from WebSocket
 */
export function deserializeMessage(data: string): PropagationWebSocketMessage | null {
  try {
    const parsed = JSON.parse(data);
    if (typeof parsed === 'object' && parsed !== null && 'type' in parsed) {
      return parsed as PropagationWebSocketMessage;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse subscription request from client
 */
export function parseSubscriptionRequest(data: string): SubscriptionRequest | null {
  try {
    const parsed = JSON.parse(data);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'action' in parsed &&
      'channels' in parsed &&
      Array.isArray(parsed.channels)
    ) {
      return parsed as SubscriptionRequest;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validate subscription channel format
 */
export function isValidChannel(channel: string): channel is SubscriptionChannel {
  if (['half-life', 'patterns', 'heatmap'].includes(channel)) {
    return true;
  }
  if (channel.startsWith('tier:')) {
    const tier = parseInt(channel.slice(5), 10);
    return tier >= 1 && tier <= 6;
  }
  if (channel.startsWith('bookmaker:')) {
    return channel.length > 10;
  }
  if (channel.startsWith('pattern:')) {
    const id = parseInt(channel.slice(8), 10);
    return id >= 70 && id <= 89;
  }
  return false;
}

/**
 * Check if a message should be sent to a channel
 */
export function shouldSendToChannel(
  message: PropagationWebSocketMessage,
  channel: SubscriptionChannel
): boolean {
  switch (channel) {
    case 'half-life':
      return message.type === 'HALF_LIFE_UPDATE';

    case 'patterns':
      return message.type === 'PATTERN_DETECTED' || message.type === 'PATTERN_EXPIRED';

    case 'heatmap':
      return message.type === 'HEATMAP_UPDATE';

    default:
      // Tier-specific channel
      if (channel.startsWith('tier:')) {
        const tier = parseInt(channel.slice(5), 10);
        if (message.type === 'HALF_LIFE_UPDATE') {
          const payload = message.payload as HalfLifeUpdatePayload;
          return payload.tier === tier;
        }
        return false;
      }

      // Bookmaker-specific channel
      if (channel.startsWith('bookmaker:')) {
        const bookmaker = channel.slice(10);
        if (message.type === 'HALF_LIFE_UPDATE') {
          const payload = message.payload as HalfLifeUpdatePayload;
          return payload.bookmaker === bookmaker;
        }
        return false;
      }

      // Pattern-specific channel
      if (channel.startsWith('pattern:')) {
        const patternId = parseInt(channel.slice(8), 10);
        if (message.type === 'PATTERN_DETECTED') {
          const payload = message.payload as PatternDetectedPayload;
          return payload.pattern.patternId === patternId;
        }
        if (message.type === 'PATTERN_EXPIRED') {
          const payload = message.payload as PatternExpiredPayload;
          return payload.patternId === patternId;
        }
        return false;
      }

      return false;
  }
}

/**
 * WebSocket subscription manager
 */
export class PropagationSubscriptionManager {
  private subscriptions = new Map<WebSocket, Set<SubscriptionChannel>>();

  /**
   * Add client
   */
  addClient(ws: WebSocket): void {
    this.subscriptions.set(ws, new Set());
  }

  /**
   * Remove client
   */
  removeClient(ws: WebSocket): void {
    this.subscriptions.delete(ws);
  }

  /**
   * Subscribe client to channels
   */
  subscribe(ws: WebSocket, channels: readonly SubscriptionChannel[]): SubscriptionChannel[] {
    const subs = this.subscriptions.get(ws);
    if (!subs) return [];

    const added: SubscriptionChannel[] = [];
    for (let i = 0; i < channels.length; i++) {
      const channel = channels[i];
      if (isValidChannel(channel) && !subs.has(channel)) {
        subs.add(channel);
        added.push(channel);
      }
    }
    return added;
  }

  /**
   * Unsubscribe client from channels
   */
  unsubscribe(ws: WebSocket, channels: readonly SubscriptionChannel[]): SubscriptionChannel[] {
    const subs = this.subscriptions.get(ws);
    if (!subs) return [];

    const removed: SubscriptionChannel[] = [];
    for (const channel of channels) {
      if (subs.has(channel)) {
        subs.delete(channel);
        removed.push(channel);
      }
    }
    return removed;
  }

  /**
   * Get active subscriptions for client
   */
  getSubscriptions(ws: WebSocket): SubscriptionChannel[] {
    const subs = this.subscriptions.get(ws);
    return subs ? Array.from(subs) : [];
  }

  /**
   * Broadcast message to subscribed clients
   */
  broadcast(message: PropagationWebSocketMessage): number {
    const serialized = serializeMessage(message);
    let count = 0;

    const entries = Array.from(this.subscriptions.entries());
    for (let i = 0; i < entries.length; i++) {
      const [ws, channels] = entries[i];
      const channelArray = Array.from(channels);
      for (let j = 0; j < channelArray.length; j++) {
        const channel = channelArray[j];
        if (shouldSendToChannel(message, channel)) {
          try {
            ws.send(serialized);
            count++;
          } catch {
            // Client disconnected
          }
          break; // Only send once per client
        }
      }
    }

    return count;
  }

  /**
   * Get total connected clients
   */
  get clientCount(): number {
    return this.subscriptions.size;
  }
}

/**
 * Error codes
 */
export const ERROR_CODES = {
  INVALID_MESSAGE: 'INVALID_MESSAGE',
  INVALID_CHANNEL: 'INVALID_CHANNEL',
  SUBSCRIPTION_FAILED: 'SUBSCRIPTION_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
