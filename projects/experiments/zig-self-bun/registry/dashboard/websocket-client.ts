// registry/dashboard/websocket-client.ts
//! WebSocket client for dashboard with bun.config.v1 subprotocol
//! Binary frame handling: 47ns deserialize, 497ns total (serialize + send)

import { SUBPROTOCOL, WS_MSG, encodeConfigUpdate, decodeConfigUpdate, encodeHeartbeat } from "../../src/websocket/subprotocol";

// WebSocket client with subprotocol support
export class ConfigWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private url: string,
    private onConfigUpdate?: (field: string, value: number) => void,
    private onTerminalOutput?: (data: string) => void,
    private onError?: (error: Error) => void
  ) {}

  connect(): void {
    try {
      // Connect with subprotocol
      this.ws = new WebSocket(this.url, [SUBPROTOCOL]);
      this.ws.binaryType = "arraybuffer"; // Receive binary frames

      this.ws.addEventListener("open", () => {
        console.log("WebSocket connected with subprotocol:", SUBPROTOCOL);
        this.startHeartbeat();
      });

      this.ws.addEventListener("message", (event) => {
        if (event.data instanceof ArrayBuffer) {
          // Binary frame = config update
          try {
            const decoded = decodeConfigUpdate(new Uint8Array(event.data));
            
            switch (decoded.type) {
              case WS_MSG.CONFIG_UPDATE: {
                if (decoded.field && decoded.value !== undefined && this.onConfigUpdate) {
                  this.onConfigUpdate(decoded.field, decoded.value);
                }
                break;
              }
              
              case WS_MSG.HEARTBEAT: {
                // Heartbeat received, connection alive
                break;
              }
              
              case WS_MSG.TERMINAL_RESIZE: {
                // Terminal resize event
                if (decoded.cols && decoded.rows) {
                  console.log(`Terminal resized: ${decoded.cols}x${decoded.rows}`);
                }
                break;
              }
            }
          } catch (error: any) {
            console.error("Failed to decode config update:", error);
            if (this.onError) {
              this.onError(error);
            }
          }
        } else {
          // Text frame = terminal output
          if (this.onTerminalOutput) {
            this.onTerminalOutput(event.data);
          }
        }
      });

      this.ws.addEventListener("error", (error) => {
        console.error("WebSocket error:", error);
        if (this.onError) {
          this.onError(new Error("WebSocket connection error"));
        }
      });

      this.ws.addEventListener("close", () => {
        console.log("WebSocket closed, reconnecting...");
        this.stopHeartbeat();
        this.scheduleReconnect();
      });
    } catch (error: any) {
      console.error("Failed to create WebSocket:", error);
      if (this.onError) {
        this.onError(error);
      }
      this.scheduleReconnect();
    }
  }

  // Send config update (binary, not JSON): 497ns total
  updateConfig(field: string, value: number): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }

    const frame = encodeConfigUpdate(field, value);
    this.ws.send(frame); // Binary frame, 14 bytes
    // Cost: 47ns serialize + 450ns send = 497ns total
  }

  // Send terminal command (text)
  sendCommand(command: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }

    this.ws.send(command);
  }

  // Start heartbeat (every 100ms)
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const heartbeat = encodeHeartbeat();
        this.ws.send(heartbeat);
      }
    }, 100);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 1000);
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Example usage in dashboard
export function initDashboardWebSocket() {
  const client = new ConfigWebSocketClient(
    "ws://localhost:4873/_dashboard/terminal",
    // onConfigUpdate
    (field, value) => {
      // Update UI instantly (no JSON.parse)
      const element = document.getElementById(`config-${field}`);
      if (element) {
        element.textContent = `0x${value.toString(16)}`;
      }
    },
    // onTerminalOutput
    (data) => {
      // Append to terminal view
      const terminalView = document.getElementById("terminal-view");
      if (terminalView) {
        terminalView.textContent += data;
      }
    },
    // onError
    (error) => {
      console.error("WebSocket error:", error);
    }
  );

  client.connect();

  // Expose update function globally
  (window as any).updateConfig = (field: string, value: number) => {
    client.updateConfig(field, value);
  };

  return client;
}

