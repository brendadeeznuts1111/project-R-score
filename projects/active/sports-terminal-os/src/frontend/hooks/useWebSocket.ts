/**
 * useWebSocket — Unified WebSocket Manager
 *
 * Single WebSocket connection shared across all components:
 *   - Subscription management (subscribe/unsubscribe per topic)
 *   - Auto-reconnect with exponential backoff
 *   - Message routing to registered handlers
 *   - Connection status indicator
 *   - Heartbeat/ping-pong
 *
 * Usage:
 *   const { send, subscribe, unsubscribe, status, connected } = useWebSocket();
 *   subscribe('wagerTick', (msg) => console.log(msg));
 */

import { useEffect, useRef, useCallback, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WSStatus = "connecting" | "open" | "closing" | "closed" | "error";

export interface WSMessage {
  type: string;
  data?: unknown;
  timestamp?: number;
  [key: string]: unknown;
}

export type WSMessageHandler = (message: WSMessage) => void;

export interface UseWebSocketReturn {
  /** Current connection status */
  status: WSStatus;
  /** Whether the connection is open */
  connected: boolean;
  /** Subscribe to a message type */
  subscribe: (messageType: string, handler: WSMessageHandler) => () => void;
  /** Unsubscribe a handler from a message type */
  unsubscribe: (messageType: string, handler: WSMessageHandler) => void;
  /** Send a message to the server */
  send: (message: WSMessage) => boolean;
  /** Subscribe to a channel (convenience wrapper) */
  subscribeChannel: (channel: string) => boolean;
  /** Unsubscribe from a channel */
  unsubscribeChannel: (channel: string) => boolean;
  /** Number of active subscriptions */
  subscriptionCount: number;
  /** Last error message */
  lastError: string | null;
  /** Force reconnect */
  reconnect: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WS_URL = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`;
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const RECONNECT_MULTIPLIER = 2;
const HEARTBEAT_INTERVAL = 30000;
const HEARTBEAT_TIMEOUT = 10000;

// ---------------------------------------------------------------------------
// Singleton module-level state
// ---------------------------------------------------------------------------

let globalWs: WebSocket | null = null;
const handlers = new Map<string, Set<WSMessageHandler>>();
let reconnectDelay = INITIAL_RECONNECT_DELAY;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let isShuttingDown = false;

/** All registered status change listeners */
const statusListeners = new Set<(status: WSStatus) => void>();

/** All registered error listeners */
const errorListeners = new Set<(error: string) => void>();

let currentStatus: WSStatus = "closed";

function setStatus(status: WSStatus) {
  currentStatus = status;
  statusListeners.forEach((cb) => cb(status));
}

function notifyError(error: string) {
  errorListeners.forEach((cb) => cb(error));
}

function dispatchMessage(msg: WSMessage) {
  const { type } = msg;
  if (!type) return;
  const typeHandlers = handlers.get(type);
  if (typeHandlers) {
    typeHandlers.forEach((h) => {
      try {
        h(msg);
      } catch (err) {
        // Don't let one handler crash others
        console.error(`WS handler error for ${type}:`, err);
      }
    });
  }
}

function clearHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (heartbeatTimeoutTimer) {
    clearTimeout(heartbeatTimeoutTimer);
    heartbeatTimeoutTimer = null;
  }
}

function startHeartbeat(ws: WebSocket) {
  clearHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
      heartbeatTimeoutTimer = setTimeout(() => {
        // No pong received, connection may be stale
        console.warn("[WS] Heartbeat timeout, closing connection");
        ws.close();
      }, HEARTBEAT_TIMEOUT);
    }
  }, HEARTBEAT_INTERVAL);
}

function connect(): WebSocket {
  if (globalWs?.readyState === WebSocket.OPEN) return globalWs;
  if (globalWs?.readyState === WebSocket.CONNECTING) return globalWs;

  isShuttingDown = false;
  setStatus("connecting");

  try {
    const ws = new WebSocket(WS_URL);
    globalWs = ws;

    ws.onopen = () => {
      console.log("[WS] Connected");
      setStatus("open");
      reconnectDelay = INITIAL_RECONNECT_DELAY;
      reconnectAttempts = 0;
      startHeartbeat(ws);

      // Re-subscribe to all previously registered channels
      const channels = Array.from(handlers.keys());
      for (const channel of channels) {
        ws.send(JSON.stringify({ type: "subscribe", data: channel }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WSMessage;

        // Handle pong
        if (msg.type === "pong" || msg.type === "subscribed" || msg.type === "unsubscribed") {
          if (heartbeatTimeoutTimer) {
            clearTimeout(heartbeatTimeoutTimer);
            heartbeatTimeoutTimer = null;
          }
        }

        dispatchMessage(msg);
      } catch {
        // Ignore non-JSON messages
      }
    };

    ws.onclose = () => {
      setStatus("closed");
      clearHeartbeat();
      globalWs = null;

      if (!isShuttingDown) {
        scheduleReconnect();
      }
    };

    ws.onerror = (err) => {
      setStatus("error");
      const errorMsg = `WebSocket error (attempt ${reconnectAttempts + 1})`;
      notifyError(errorMsg);
      console.error("[WS] Error:", err);
    };

    return ws;
  } catch (err) {
    setStatus("error");
    const msg = err instanceof Error ? err.message : "Failed to create WebSocket";
    notifyError(msg);
    scheduleReconnect();
    throw err;
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;

  reconnectAttempts++;
  const delay = Math.min(reconnectDelay * Math.pow(RECONNECT_MULTIPLIER, reconnectAttempts - 1), MAX_RECONNECT_DELAY);

  console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (!isShuttingDown) {
      connect();
    }
  }, delay);
}

function disconnect() {
  isShuttingDown = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  clearHeartbeat();
  if (globalWs) {
    globalWs.close();
    globalWs = null;
  }
}

// Auto-connect on first usage
let autoConnectInit = false;

// ---------------------------------------------------------------------------
// React Hook
// ---------------------------------------------------------------------------

export function useWebSocket(): UseWebSocketReturn {
  const [status, setLocalStatus] = useState<WSStatus>(currentStatus);
  const [lastError, setLastError] = useState<string | null>(null);
  const localHandlers = useRef(new Map<string, WSMessageHandler>());

  // Sync with global status
  useEffect(() => {
    const onStatus = (s: WSStatus) => setLocalStatus(s);
    const onError = (e: string) => setLastError(e);
    statusListeners.add(onStatus);
    errorListeners.add(onError);

    // Auto-connect
    if (!autoConnectInit) {
      autoConnectInit = true;
      if (!globalWs || globalWs.readyState === WebSocket.CLOSED) {
        connect();
      }
    }

    return () => {
      statusListeners.delete(onStatus);
      errorListeners.delete(onError);
      // Clean up local handlers
      localHandlers.current.forEach((handler, type) => {
        const set = handlers.get(type);
        if (set) {
          set.delete(handler);
          if (set.size === 0) handlers.delete(type);
        }
      });
      localHandlers.current.clear();
    };
  }, []);

  const subscribe = useCallback((messageType: string, handler: WSMessageHandler): (() => void) => {
    let set = handlers.get(messageType);
    if (!set) {
      set = new Set();
      handlers.set(messageType, set);
      // Send subscribe to server
      if (globalWs?.readyState === WebSocket.OPEN) {
        globalWs.send(JSON.stringify({ type: "subscribe", data: messageType }));
      }
    }
    set.add(handler);
    localHandlers.current.set(messageType, handler);

    // Return unsubscribe function
    return () => {
      unsubscribe(messageType, handler);
    };
  }, []);

  const unsubscribe = useCallback((messageType: string, handler: WSMessageHandler) => {
    const set = handlers.get(messageType);
    if (set) {
      set.delete(handler);
      if (set.size === 0) {
        handlers.delete(messageType);
        if (globalWs?.readyState === WebSocket.OPEN) {
          globalWs.send(JSON.stringify({ type: "unsubscribe", data: messageType }));
        }
      }
    }
    localHandlers.current.delete(messageType);
  }, []);

  const send = useCallback((message: WSMessage): boolean => {
    if (globalWs?.readyState === WebSocket.OPEN) {
      globalWs.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const subscribeChannel = useCallback((channel: string): boolean => {
    return send({ type: "subscribe", data: channel });
  }, [send]);

  const unsubscribeChannel = useCallback((channel: string): boolean => {
    return send({ type: "unsubscribe", data: channel });
  }, [send]);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttempts = 0;
    reconnectDelay = INITIAL_RECONNECT_DELAY;
    setTimeout(() => connect(), 100);
  }, []);

  const subscriptionCount = Array.from(handlers.values()).reduce((sum, set) => sum + set.size, 0);

  return {
    status,
    connected: status === "open",
    subscribe,
    unsubscribe,
    send,
    subscribeChannel,
    unsubscribeChannel,
    subscriptionCount,
    lastError,
    reconnect,
  };
}

/** Disconnect all WebSocket connections (for cleanup/shutdown) */
export function shutdownWebSocket(): void {
  disconnect();
}

export default useWebSocket;
