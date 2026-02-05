/**
 * useRealtimeData - WebSocket hook with auto-reconnect and subscriptions
 *
 * Features:
 * - Auto-reconnect with exponential backoff
 * - Granular topic subscriptions
 * - Delta updates support
 * - Connection state management
 * - Heartbeat/ping-pong
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================================
// Types
// ============================================================================

export type RealtimeTopic =
  | "dashboard"
  | "projects"
  | "metrics"
  | "alerts"
  | "activity"
  | "system";

export interface RealtimeMessage<T = unknown> {
  topic: RealtimeTopic;
  type: "full" | "delta" | "heartbeat";
  data: T;
  timestamp: number;
  seq: number;
}

export interface ConnectionState {
  connected: boolean;
  reconnecting: boolean;
  reconnectAttempt: number;
  lastConnected: number | null;
  latency: number;
}

export interface UseRealtimeOptions {
  /** Topics to subscribe to */
  topics?: RealtimeTopic[];
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Max reconnect attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Base reconnect delay in ms (default: 1000) */
  reconnectDelay?: number;
  /** Enable heartbeat (default: true) */
  heartbeat?: boolean;
  /** Heartbeat interval in ms (default: 30000) */
  heartbeatInterval?: number;
  /** Custom WebSocket URL */
  url?: string;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useRealtimeData<T = unknown>(options: UseRealtimeOptions = {}) {
  const {
    topics = ["dashboard"],
    autoReconnect = true,
    maxReconnectAttempts = 10,
    reconnectDelay = 1000,
    heartbeat = true,
    heartbeatInterval = 30000,
    url,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    connected: false,
    reconnecting: false,
    reconnectAttempt: 0,
    lastConnected: null,
    latency: 0,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPingRef = useRef<number>(0);
  const seqRef = useRef<number>(0);

  // Build WebSocket URL
  const getWsUrl = useCallback(() => {
    if (url) return url;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const topicQuery = topics.length > 0 ? `?topics=${topics.join(",")}` : "";
    return `${protocol}//${window.location.host}/realtime${topicQuery}`;
  }, [url, topics]);

  // Calculate reconnect delay with exponential backoff
  const getReconnectDelay = useCallback(
    (attempt: number) => {
      const delay = reconnectDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 1000;
      return Math.min(delay + jitter, 30000); // Max 30s
    },
    [reconnectDelay]
  );

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = getWsUrl();
    console.log(`[Realtime] Connecting to ${wsUrl}`);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[Realtime] Connected");
      setConnectionState((prev) => ({
        ...prev,
        connected: true,
        reconnecting: false,
        reconnectAttempt: 0,
        lastConnected: Date.now(),
      }));

      // Send subscription message
      ws.send(
        JSON.stringify({
          type: "subscribe",
          topics,
        })
      );

      // Start heartbeat
      if (heartbeat) {
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            lastPingRef.current = Date.now();
            ws.send(JSON.stringify({ type: "ping", timestamp: lastPingRef.current }));
          }
        }, heartbeatInterval);
      }
    };

    ws.onmessage = (event) => {
      try {
        const message: RealtimeMessage<T> = JSON.parse(event.data);

        // Handle pong for latency calculation
        if (message.type === "heartbeat" || (message as any).type === "pong") {
          const latency = Date.now() - lastPingRef.current;
          setConnectionState((prev) => ({ ...prev, latency }));
          return;
        }

        // Sequence check for ordering
        if (message.seq && message.seq <= seqRef.current) {
          console.warn("[Realtime] Out of order message, skipping");
          return;
        }
        seqRef.current = message.seq || seqRef.current;

        // Apply delta or full update
        if (message.type === "delta" && data !== null) {
          setData((prev) => {
            if (prev === null) return message.data;
            // Deep merge delta into existing data
            return deepMerge(prev as object, message.data as object) as T;
          });
        } else {
          setData(message.data);
        }
      } catch (err) {
        console.error("[Realtime] Parse error:", err);
      }
    };

    ws.onclose = (event) => {
      console.log(`[Realtime] Disconnected (code: ${event.code})`);
      setConnectionState((prev) => ({ ...prev, connected: false }));

      // Clear heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      // Auto-reconnect
      if (autoReconnect && connectionState.reconnectAttempt < maxReconnectAttempts) {
        const delay = getReconnectDelay(connectionState.reconnectAttempt);
        console.log(`[Realtime] Reconnecting in ${delay}ms (attempt ${connectionState.reconnectAttempt + 1})`);

        setConnectionState((prev) => ({
          ...prev,
          reconnecting: true,
          reconnectAttempt: prev.reconnectAttempt + 1,
        }));

        reconnectTimeoutRef.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = (err) => {
      console.error("[Realtime] Error:", err);
    };
  }, [
    getWsUrl,
    topics,
    heartbeat,
    heartbeatInterval,
    autoReconnect,
    maxReconnectAttempts,
    getReconnectDelay,
    connectionState.reconnectAttempt,
    data,
  ]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionState((prev) => ({
      ...prev,
      connected: false,
      reconnecting: false,
    }));
  }, []);

  // Send message
  const send = useCallback((message: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  // Subscribe to additional topics
  const subscribe = useCallback(
    (newTopics: RealtimeTopic[]) => {
      send({ type: "subscribe", topics: newTopics });
    },
    [send]
  );

  // Unsubscribe from topics
  const unsubscribe = useCallback(
    (topicsToRemove: RealtimeTopic[]) => {
      send({ type: "unsubscribe", topics: topicsToRemove });
    },
    [send]
  );

  // Request full refresh
  const refresh = useCallback(() => {
    send({ type: "refresh" });
  }, [send]);

  // Connect on mount
  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return {
    data,
    connectionState,
    connect,
    disconnect,
    send,
    subscribe,
    unsubscribe,
    refresh,
  };
}

// ============================================================================
// Utility: Deep Merge for Delta Updates
// ============================================================================

function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue !== null &&
        typeof sourceValue === "object" &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === "object" &&
        !Array.isArray(targetValue)
      ) {
        (result as any)[key] = deepMerge(targetValue as object, sourceValue as object);
      } else {
        (result as any)[key] = sourceValue;
      }
    }
  }

  return result;
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Subscribe to dashboard data
 */
export function useDashboardRealtime() {
  return useRealtimeData<{
    projects: any[];
    stats: any;
    system?: any;
  }>({
    topics: ["dashboard"],
  });
}

/**
 * Subscribe to metrics only
 */
export function useMetricsRealtime() {
  return useRealtimeData<{
    cpu: number;
    memory: number;
    latency: number;
    requests: number;
  }>({
    topics: ["metrics"],
    heartbeatInterval: 10000, // More frequent for metrics
  });
}

/**
 * Subscribe to alerts
 */
export function useAlertsRealtime() {
  return useRealtimeData<{
    alerts: Array<{
      id: string;
      type: string;
      message: string;
      timestamp: number;
    }>;
  }>({
    topics: ["alerts"],
  });
}

/**
 * Subscribe to activity feed
 */
export function useActivityRealtime() {
  return useRealtimeData<{
    activities: Array<{
      id: string;
      type: string;
      project?: string;
      message: string;
      timestamp: number;
    }>;
  }>({
    topics: ["activity"],
  });
}

export default useRealtimeData;
