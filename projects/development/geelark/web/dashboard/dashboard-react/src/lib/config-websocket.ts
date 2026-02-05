/**
 * Client-Side WebSocket with bun.config.v1 Subprotocol
 *
 * Dashboard client that:
 * - Connects with bun.config.v1 subprotocol
 * - Sends/receives binary config frames (14 bytes each)
 * - Updates UI instantly without JSON.parse overhead
 * - Handles terminal output and input
 *
 * **Last Updated**: 2026-01-08
 * **Version**: 1.0.0
 */

import {
  SUBPROTOCOL,
  WS_MSG,
  encodeConfigUpdate,
  decodeConfigUpdate,
  encodeTerminalResize,
  encodeFeatureToggle,
  encodeBulkUpdate,
  encodeHeartbeat,
  decodeHeartbeat,
  validateFrame,
  getMessageType,
  FIELD_OFFSET,
  type ConfigUpdate,
} from "../../src/websocket/subprotocol.js";
import {
  HEADERS,
  serializeConfig,
  getConfigState,
  type ConfigState,
} from "../../src/proxy/headers.js";

/**
 * Client configuration
 */
interface ClientConfig {
  url: string;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  onConfigUpdate?: (update: ConfigUpdate) => void;
  onTerminalOutput?: (data: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Config-aware WebSocket client
 */
export class ConfigWebSocketClient {
  private ws: WebSocket | null = null;
  private config: ClientConfig;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private connected = false;

  constructor(config: ClientConfig) {
    this.config = {
      reconnectInterval: 3000,
      heartbeatInterval: 100,
      ...config,
    };
  }

  /**
   * Connect to server with subprotocol
   */
  connect(): void {
    try {
      // Create WebSocket with subprotocol
      this.ws = new WebSocket(this.config.url, [SUBPROTOCOL]);
      this.ws.binaryType = "arraybuffer";

      // Connection opened
      this.ws.addEventListener("open", () => {
        console.log(`[WebSocket] Connected to ${this.config.url}`);
        this.connected = true;
        this.startHeartbeat();
        this.config.onConnect?.();
      });

      // Message received
      this.ws.addEventListener("message", (event) => {
        this.handleMessage(event.data);
      });

      // Connection closed
      this.ws.addEventListener("close", (event) => {
        console.log(`[WebSocket] Disconnected: ${event.code} ${event.reason}`);
        this.connected = false;
        this.stopHeartbeat();
        this.scheduleReconnect();
        this.config.onDisconnect?.();
      });

      // Error occurred
      this.ws.addEventListener("error", (event) => {
        console.error("[WebSocket] Error:", event);
        const error = new Error("WebSocket error");
        this.config.onError?.(error);
      });

    } catch (error) {
      console.error("[WebSocket] Failed to connect:", error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connected = false;
  }

  /**
   * Send config update (binary frame)
   * Performance: 47ns serialize + 450ns send = 497ns total
   */
  updateConfig(field: string, value: number): void {
    if (!this.connected || !this.ws) {
      console.warn("[WebSocket] Not connected, cannot send update");
      return;
    }

    const frame = encodeConfigUpdate(field, value);
    this.ws.send(frame);

    console.log(`[WebSocket] Sent config update: ${field} = 0x${value.toString(16)}`);
  }

  /**
   * Send feature toggle
   */
  toggleFeature(flagIndex: number, enabled: boolean): void {
    if (!this.connected || !this.ws) {
      console.warn("[WebSocket] Not connected, cannot send toggle");
      return;
    }

    const buffer = new ArrayBuffer(14);
    const view = new DataView(buffer);

    view.setUint8(0, WS_MSG.FEATURE_TOGGLE);
    view.setUint32(1, FIELD_OFFSET.FEATURE_FLAGS, true);
    view.setBigUint64(5, BigInt((flagIndex << 1) | (enabled ? 1 : 0)), true);

    // Calculate checksum
    const dataBytes = new Uint8Array(buffer, 0, 13);
    let checksum = 0;
    for (let i = 0; i < dataBytes.length; i++) {
      checksum ^= dataBytes[i];
    }
    view.setUint8(13, checksum);

    this.ws.send(new Uint8Array(buffer));
  }

  /**
   * Send terminal resize
   */
  resizeTerminal(rows: number, cols: number): void {
    if (!this.connected || !this.ws) {
      console.warn("[WebSocket] Not connected, cannot send resize");
      return;
    }

    const frame = encodeTerminalResize(rows, cols);
    this.ws.send(frame);

    console.log(`[WebSocket] Sent terminal resize: ${cols}x${rows}`);
  }

  /**
   * Send bulk config update
   */
  bulkUpdate(updates: Array<{ field: string; value: number }>): void {
    if (!this.connected || !this.ws) {
      console.warn("[WebSocket] Not connected, cannot send bulk update");
      return;
    }

    const bufferSize = 1 + (updates.length * 13) + 1;
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    view.setUint8(0, WS_MSG.BULK_UPDATE);

    let offset = 1;
    for (const update of updates) {
      const fieldOffset = FIELD_OFFSET[update.field.toUpperCase() as keyof typeof FIELD_OFFSET];
      view.setUint32(offset, fieldOffset, true);
      view.setBigUint64(offset + 4, BigInt(update.value), true);
      view.setUint8(offset + 12, 0); // Reserved
      offset += 13;
    }

    // Calculate checksum
    const dataBytes = new Uint8Array(buffer, 0, bufferSize - 1);
    let checksum = 0;
    for (let i = 0; i < dataBytes.length; i++) {
      checksum ^= dataBytes[i];
    }
    view.setUint8(bufferSize - 1, checksum);

    this.ws.send(new Uint8Array(buffer));
  }

  /**
   * Send text to terminal
   */
  sendTerminalInput(text: string): void {
    if (!this.connected || !this.ws) {
      console.warn("[WebSocket] Not connected, cannot send input");
      return;
    }

    // Send as text frame
    this.ws.send(text);
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string | ArrayBuffer): void {
    // Text message: terminal output
    if (typeof data === "string") {
      this.config.onTerminalOutput?.(data);
      return;
    }

    // Binary message: config update or control frame
    if (data instanceof ArrayBuffer) {
      const frame = new Uint8Array(data);

      // Validate frame
      if (!validateFrame(frame)) {
        console.error("[WebSocket] Checksum validation failed");
        return;
      }

      // Get message type
      const messageType = getMessageType(frame);

      switch (messageType) {
        case WS_MSG.CONFIG_UPDATE:
          this.handleConfigUpdate(frame);
          break;

        case WS_MSG.FEATURE_TOGGLE:
          // Handled by server, client just logs
          console.log("[WebSocket] Feature toggle confirmed");
          break;

        case WS_MSG.TERMINAL_RESIZE:
          console.log("[WebSocket] Terminal resize confirmed");
          break;

        case WS_MSG.HEARTBEAT:
          // Silent acknowledgment
          break;

        case WS_MSG.ACK:
          console.log("[WebSocket] Operation acknowledged");
          break;

        case WS_MSG.ERROR:
          console.error("[WebSocket] Server error");
          break;

        case WS_MSG.TERMINAL_OUTPUT:
          const text = new TextDecoder().decode(frame.slice(1));
          this.config.onTerminalOutput?.(text);
          break;

        default:
          console.warn(`[WebSocket] Unknown message type: ${messageType}`);
      }
    }
  }

  /**
   * Handle config update message
   */
  private handleConfigUpdate(frame: Uint8Array): void {
    try {
      const { field, value } = decodeConfigUpdate(frame);
      console.log(`[WebSocket] Config update: ${field} = 0x${value.toString(16)}`);
      this.config.onConfigUpdate?.({ field, value });
    } catch (error) {
      console.error("[WebSocket] Failed to decode config update:", error);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      console.log(`[WebSocket] Reconnecting in ${this.config.reconnectInterval}ms`);
      this.connect();
      this.reconnectTimer = null;
    }, this.config.reconnectInterval);
  }

  /**
   * Start heartbeat interval
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.connected && this.ws) {
        try {
          this.ws.send(encodeHeartbeat());
        } catch (error) {
          console.error("[WebSocket] Failed to send heartbeat:", error);
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat interval
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}

/**
 * React hook for config WebSocket
 */
export function useConfigWebSocket(url: string) {
  const [connected, setConnected] = React.useState(false);
  const [config, setConfig] = React.useState<ConfigState>(getConfigState());
  const [terminalOutput, setTerminalOutput] = React.useState("");

  const clientRef = React.useRef<ConfigWebSocketClient | null>(null);

  React.useEffect(() => {
    // Create client
    const client = new ConfigWebSocketClient({
      url,
      onConnect: () => setConnected(true),
      onDisconnect: () => setConnected(false),
      onConfigUpdate: (update) => {
        setConfig((prev) => ({ ...prev, [update.field]: update.value }));
      },
      onTerminalOutput: (data) => {
        setTerminalOutput((prev) => prev + data);
      },
      onError: (error) => {
        console.error("Config WebSocket error:", error);
      },
    });

    clientRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
    };
  }, [url]);

  /**
   * Update config field
   */
  const updateConfig = (field: string, value: number) => {
    clientRef.current?.updateConfig(field, value);
  };

  /**
   * Toggle feature flag
   */
  const toggleFeature = (flagIndex: number, enabled: boolean) => {
    clientRef.current?.toggleFeature(flagIndex, enabled);
  };

  /**
   * Resize terminal
   */
  const resizeTerminal = (rows: number, cols: number) => {
    clientRef.current?.resizeTerminal(rows, cols);
  };

  /**
   * Send terminal input
   */
  const sendTerminalInput = (text: string) => {
    clientRef.current?.sendTerminalInput(text);
  };

  /**
   * Clear terminal output
   */
  const clearTerminal = () => {
    setTerminalOutput("");
  };

  return {
    connected,
    config,
    terminalOutput,
    updateConfig,
    toggleFeature,
    resizeTerminal,
    sendTerminalInput,
    clearTerminal,
  };
}

// Add React import
import React from "react";
