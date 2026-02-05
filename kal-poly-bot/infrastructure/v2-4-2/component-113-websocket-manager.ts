#!/usr/bin/env bun
/**
 * Component #113: WebSocket-Manager
 * Primary API: new WebSocket() (client)
 * Secondary API: Bun.serve() (server)
 * Performance SLA: 60fps stability
 * Parity Lock: 9c0d...1e2f
 * Status: ACTIVE
 */

import { feature } from "bun:bundle";

interface WebSocketConfig {
  url: string;
  onMessage?: (data: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: any) => void;
}

export class WebSocketManager {
  private static instance: WebSocketManager;
  private connections: Map<string, WebSocket> = new Map();

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!this.instance) {
      this.instance = new WebSocketManager();
    }
    return this.instance;
  }

  connect(config: WebSocketConfig): WebSocket {
    if (!feature("WEBSOCKET_MANAGER")) {
      return new WebSocket(config.url);
    }

    const ws = new WebSocket(config.url);

    if (config.onOpen) ws.onopen = config.onOpen;
    if (config.onMessage) ws.onmessage = (e) => config.onMessage!(e.data);
    if (config.onClose) ws.onclose = config.onClose;
    if (config.onError) ws.onerror = config.onError;

    this.connections.set(config.url, ws);
    return ws;
  }

  broadcast(message: any): void {
    for (const ws of this.connections.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  closeAll(): void {
    for (const ws of this.connections.values()) {
      ws.close();
    }
    this.connections.clear();
  }
}

export const webSocketManager = feature("WEBSOCKET_MANAGER")
  ? WebSocketManager.getInstance()
  : {
      connect: (config: WebSocketConfig) => new WebSocket(config.url),
      broadcast: () => {},
      closeAll: () => {},
    };

export default webSocketManager;
