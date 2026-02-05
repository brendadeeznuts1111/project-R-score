import uWS, { type TemplatedApp } from 'uWebSockets.js';
import type { WebSocketMessage } from 'odds-core';

export class OddsWebSocketServer {
  private server: TemplatedApp;
  private port: number;
  private connections: Map<string, uWS.WebSocket<unknown>> = new Map();

  constructor(port: number = 8080) {
    this.port = port;
    this.server = uWS.App();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.server.ws('/*', {
      compression: uWS.SHARED_COMPRESSOR,
      maxPayloadLength: 16 * 1024 * 1024, // 16MB
      idleTimeout: 60,
      open: (ws: uWS.WebSocket<unknown>) => {
        const id = this.generateConnectionId();
        this.connections.set(id, ws);
        console.log(`Connection opened: ${id}`);
        
        this.send(ws, {
          type: 'connection',
          data: { id, message: 'Connected to odds protocol' },
          timestamp: Date.now(),
          sequence: 0
        });
      },
      message: (ws: uWS.WebSocket<unknown>, message: ArrayBuffer, isBinary: boolean) => {
        try {
          const data = Buffer.from(message).toString();
          const parsed = JSON.parse(data) as WebSocketMessage;
          this.handleMessage(ws, parsed);
        } catch (error) {
          console.error('Invalid message format:', error);
        }
      },
      close: (ws: uWS.WebSocket<unknown>, code: number, message: ArrayBuffer) => {
        const id = this.findConnectionId(ws);
        if (id) {
          this.connections.delete(id);
          console.log(`Connection closed: ${id}`);
        }
      }
    });
  }

  private handleMessage(ws: uWS.WebSocket<unknown>, message: WebSocketMessage): void {
    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(ws, message);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(ws, message);
        break;
      case 'ping':
        this.handlePing(ws, message);
        break;
      default:
        console.log(`Unknown message type: ${message.type}`);
    }
  }

  private handleSubscribe(ws: uWS.WebSocket<unknown>, message: WebSocketMessage): void {
    this.send(ws, {
      type: 'subscribed',
      data: { symbols: message.data },
      timestamp: Date.now(),
      sequence: message.sequence + 1
    });
  }

  private handleUnsubscribe(ws: uWS.WebSocket<unknown>, message: WebSocketMessage): void {
    this.send(ws, {
      type: 'unsubscribed',
      data: { symbols: message.data },
      timestamp: Date.now(),
      sequence: message.sequence + 1
    });
  }

  private handlePing(ws: uWS.WebSocket<unknown>, message: WebSocketMessage): void {
    this.send(ws, {
      type: 'pong',
      data: { timestamp: message.timestamp },
      timestamp: Date.now(),
      sequence: message.sequence + 1
    });
  }

  private send(ws: uWS.WebSocket<unknown>, message: WebSocketMessage): void {
    const data = JSON.stringify(message);
    ws.send(data, false, false);
  }

  public broadcast(message: WebSocketMessage): void {
    const data = JSON.stringify(message);
    this.connections.forEach((ws) => {
      ws.send(data, false, false);
    });
  }

  private generateConnectionId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private findConnectionId(ws: uWS.WebSocket<unknown>): string | null {
    for (const [id, connection] of this.connections.entries()) {
      if (connection === ws) return id;
    }
    return null;
  }

  public start(): void {
    this.server.listen(this.port, (token: boolean) => {
      if (token) {
        console.log(`Odds WebSocket server started on port ${this.port}`);
      } else {
        console.error(`Failed to start server on port ${this.port}`);
      }
    });
  }

  public stop(): void {
    this.connections.forEach((ws) => {
      ws.close();
    });
    this.connections.clear();
  }
}
