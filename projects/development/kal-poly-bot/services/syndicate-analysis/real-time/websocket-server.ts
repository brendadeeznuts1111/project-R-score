#!/usr/bin/env bun
/**
 * WebSocket Server for Real-Time Syndicate Pattern Detection
 * 
 * Provides real-time streaming of pattern detection events via WebSocket
 * for live monitoring and alerting.
 */

import { ServerWebSocket } from 'bun';
import type { SyndicateBet, SyndicatePattern, EmergingPattern } from '../types';

// =============================================================================
// WEBSOCKET TYPES
// =============================================================================

export type WebSocketMessageData = 
  | PatternDetectedMessage['data']
  | BetRecordedMessage['data']
  | EmergingPatternMessage['data']
  | AlertMessage['data']
  | { message: string };

export interface WebSocketMessage {
  type: 'pattern_detected' | 'bet_recorded' | 'emerging_pattern' | 'alert' | 'error';
  data: WebSocketMessageData;
  timestamp: number;
}

export interface PatternDetectedMessage extends WebSocketMessage {
  type: 'pattern_detected';
  data: {
    syndicateId: string;
    pattern: SyndicatePattern;
    metadata: {
      grading: string;
      priority: string;
      category: string;
    };
  };
}

export interface BetRecordedMessage extends WebSocketMessage {
  type: 'bet_recorded';
  data: {
    bet: SyndicateBet;
    patternsTriggered: string[];
  };
}

export interface EmergingPatternMessage extends WebSocketMessage {
  type: 'emerging_pattern';
  data: {
    pattern: EmergingPattern;
    affectedSyndicates: string[];
  };
}

export interface AlertMessage extends WebSocketMessage {
  type: 'alert';
  data: {
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    syndicateId?: string;
    patternType?: string;
  };
}

// =============================================================================
// WEBSOCKET SERVER
// =============================================================================

interface WebSocketData {
  connectedAt: number;
  subscriptions: Set<string>;
}

export class SyndicateWebSocketServer {
  private server: ReturnType<typeof Bun.serve>;
  private clients: Set<ServerWebSocket<WebSocketData>> = new Set();
  private subscriptions: Map<string, Set<ServerWebSocket<WebSocketData>>> = new Map();

  constructor(port: number = 3001) {
    this.server = Bun.serve({
      port,
      fetch: (req, server) => {
        const success = server.upgrade(req, {
          data: {
            connectedAt: Date.now(),
            subscriptions: new Set<string>()
          }
        });

        if (success) {
          return undefined;
        }

        return new Response('WebSocket upgrade failed', { status: 500 });
      },
      websocket: {
        message: this.handleMessage.bind(this),
        open: this.handleOpen.bind(this),
        close: this.handleClose.bind(this),
        error: this.handleError.bind(this)
      }
    });

    console.log(`🔌 WebSocket server started on port ${port}`);
  }

  private handleOpen(ws: ServerWebSocket<WebSocketData>) {
    this.clients.add(ws);
    console.log(`✅ Client connected. Total clients: ${this.clients.size}`);
  }

  private handleClose(ws: ServerWebSocket<WebSocketData>) {
    this.clients.delete(ws);
    
    // Remove from all subscriptions
    for (const [patternType, subscribers] of this.subscriptions.entries()) {
      subscribers.delete(ws);
    }

    console.log(`❌ Client disconnected. Total clients: ${this.clients.size}`);
  }

  private handleError(ws: ServerWebSocket<WebSocketData>, error: Error) {
    console.error(`❌ WebSocket error:`, error);
    this.clients.delete(ws);
  }

  private handleMessage(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.action) {
        case 'subscribe':
          this.handleSubscribe(ws, data.patternTypes || []);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(ws, data.patternTypes || []);
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
        default:
          ws.send(JSON.stringify({
            type: 'error',
            message: `Unknown action: ${data.action}`
          }));
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: `Invalid message format: ${error instanceof Error ? error.message : String(error)}`
      }));
    }
  }

  private handleSubscribe(ws: ServerWebSocket<WebSocketData>, patternTypes: string[]) {
    const wsData = ws.data;
    
    patternTypes.forEach(patternType => {
      if (!this.subscriptions.has(patternType)) {
        this.subscriptions.set(patternType, new Set());
      }
      this.subscriptions.get(patternType)!.add(ws);
      wsData.subscriptions.add(patternType);
    });

    ws.send(JSON.stringify({
      type: 'subscribed',
      patternTypes,
      timestamp: Date.now()
    }));
  }

  private handleUnsubscribe(ws: ServerWebSocket<WebSocketData>, patternTypes: string[]) {
    const wsData = ws.data;
    
    patternTypes.forEach(patternType => {
      const subscribers = this.subscriptions.get(patternType);
      if (subscribers) {
        subscribers.delete(ws);
      }
      wsData.subscriptions.delete(patternType);
    });

    ws.send(JSON.stringify({
      type: 'unsubscribed',
      patternTypes,
      timestamp: Date.now()
    }));
  }

  // =============================================================================
  // BROADCAST METHODS
  // =============================================================================

  broadcastPatternDetected(pattern: SyndicatePattern, metadata: { grading: string; priority: string; category: string }) {
    const message: PatternDetectedMessage = {
      type: 'pattern_detected',
      data: {
        syndicateId: pattern.syndicateId,
        pattern,
        metadata
      },
      timestamp: Date.now()
    };

    this.broadcastToSubscribers(pattern.patternType, message);
  }

  broadcastBetRecorded(bet: SyndicateBet, patternsTriggered: string[]) {
    const message: BetRecordedMessage = {
      type: 'bet_recorded',
      data: {
        bet,
        patternsTriggered
      },
      timestamp: Date.now()
    };

    // Broadcast to all clients subscribed to any triggered pattern
    patternsTriggered.forEach(patternType => {
      this.broadcastToSubscribers(patternType, message);
    });
  }

  broadcastEmergingPattern(pattern: EmergingPattern) {
    const message: EmergingPatternMessage = {
      type: 'emerging_pattern',
      data: {
        pattern,
        affectedSyndicates: Array.from(pattern.syndicates)
      },
      timestamp: Date.now()
    };

    // Broadcast to all subscribers of this pattern type
    this.broadcastToSubscribers(pattern.patternType, message);
  }

  broadcastAlert(severity: 'critical' | 'high' | 'medium' | 'low', message: string, syndicateId?: string, patternType?: string) {
    const alert: AlertMessage = {
      type: 'alert',
      data: {
        severity,
        message,
        syndicateId,
        patternType
      },
      timestamp: Date.now()
    };

    // Broadcast critical/high alerts to all clients
    if (severity === 'critical' || severity === 'high') {
      this.broadcastToAll(alert);
      return;
    }
    if (patternType) {
      this.broadcastToSubscribers(patternType, alert);
    }
  }

  private broadcastToSubscribers(patternType: string, message: WebSocketMessage) {
    const subscribers = this.subscriptions.get(patternType);
    if (!subscribers || subscribers.size === 0) return;

    const messageStr = JSON.stringify(message);
    subscribers.forEach(ws => {
      try {
        ws.send(messageStr);
      } catch (error) {
        console.error(`Error sending to client:`, error);
        subscribers.delete(ws);
      }
    });
  }

  private broadcastToAll(message: WebSocketMessage) {
    const messageStr = JSON.stringify(message);
    this.clients.forEach(ws => {
      try {
        ws.send(messageStr);
      } catch (error) {
        console.error(`Error broadcasting to client:`, error);
        this.clients.delete(ws);
      }
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getSubscriptionCount(): number {
    return Array.from(this.subscriptions.values()).reduce((sum, set) => sum + set.size, 0);
  }

  close() {
    this.clients.forEach(ws => ws.close());
    this.server.stop();
  }
}
