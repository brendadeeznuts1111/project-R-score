// API Integration - Sportradar WebSocket Client
//
// Connects to wss://api.sportradar.com
// Receives real-time game events
//
// Flow:
// 1. Connect WebSocket with auth header
// 2. Subscribe to sport feeds (NBA, WNBA)
// 3. Parse incoming events → GameEvent
// 4. Emit to registered handlers

import type { GameEvent, EventHandler, ApiConfig } from "./types";

export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

export class SportradarClient {
  private ws: WebSocket | null = null;
  private config: ApiConfig["sportradar"];
  private handlers: Set<EventHandler<GameEvent>> = new Set();
  private state: ConnectionState = "disconnected";
  private subscriptions: Set<string> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(config: ApiConfig["sportradar"]) {
    this.config = config;
  }

  getState(): ConnectionState {
    return this.state;
  }

  async connect(): Promise<void> {
    if (this.state === "connected" || this.state === "connecting") {
      return;
    }

    // Skip connection if no API key configured
    if (!this.config.apiKey) {
      this.state = "disconnected";
      return;
    }

    this.state = "connecting";

    return new Promise((resolve, reject) => {
      try {
        const url = new URL(this.config.url);
        url.searchParams.set("api_key", this.config.apiKey);

        this.ws = new WebSocket(url.toString());

        this.ws.onopen = () => {
          this.state = "connected";
          this.reconnectAttempts = 0;
          // Re-subscribe to previous subscriptions
          for (const sport of this.subscriptions) {
            this.sendSubscription(sport);
          }
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data as string);
            const gameEvent = this.parseEvent(data);
            this.emit(gameEvent);
          } catch (err) {
            // Ignore parse errors
          }
        };

        this.ws.onerror = () => {
          this.state = "error";
          reject(new Error("WebSocket connection error"));
        };

        this.ws.onclose = () => {
          this.state = "disconnected";
          this.ws = null;
          this.handleReconnect();
        };
      } catch (err) {
        this.state = "error";
        reject(err);
      }
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      setTimeout(() => this.connect(), delay);
    }
  }

  subscribe(sport: string): void {
    this.subscriptions.add(sport);
    if (this.state === "connected") {
      this.sendSubscription(sport);
    }
  }

  private sendSubscription(sport: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "subscribe", sport }));
    }
  }

  onEvent(handler: EventHandler<GameEvent>): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private emit(event: GameEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch {
        // Ignore handler errors
      }
    }
  }

  parseEvent(data: unknown): GameEvent {
    const raw = data as Record<string, unknown>;
    return {
      id: String(raw.id || raw.game_id || crypto.randomUUID()),
      sport: String(raw.sport || "NBA"),
      teams: [String(raw.home_team || "Home"), String(raw.away_team || "Away")],
      timestamp: Number(raw.timestamp || Date.now()),
      status: (raw.status as GameEvent["status"]) || "scheduled",
      score: raw.score ? [Number((raw.score as number[])[0]), Number((raw.score as number[])[1])] : undefined,
    };
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.maxReconnectAttempts = 0; // Prevent reconnection
      this.ws.close();
      this.ws = null;
    }
    this.state = "disconnected";
    this.subscriptions.clear();
  }
}
