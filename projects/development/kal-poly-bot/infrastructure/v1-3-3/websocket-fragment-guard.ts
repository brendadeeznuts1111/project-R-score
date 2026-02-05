import "./types.d.ts";
// infrastructure/v1-3-3/websocket-fragment-guard.ts
// Component #73: WebSocket Fragment Guard for RFC 6455 Compliance


// Helper function to check both build-time features and runtime environment variables
function isFeatureEnabled(featureName: string): boolean {
  // Check runtime environment variable first
  const envVar = `FEATURE_${featureName}`;
  if (process.env[envVar] === "1") {
    return true;
  }

  // Check build-time feature (must use if statements directly)
  if (featureName === "SOURCEMAP_INTEGRITY" && process.env.FEATURE_SOURCEMAP_INTEGRITY === "1") {
    return true;
  }
  if (featureName === "NAPI_THREADSAFE" && process.env.FEATURE_NAPI_THREADSAFE === "1") {
    return true;
  }
  if (featureName === "WS_FRAGMENT_GUARD" && process.env.FEATURE_WS_FRAGMENT_GUARD === "1") {
    return true;
  }
  if (
    featureName === "WORKER_THREAD_SAFETY" &&
    process.env.FEATURE_WORKER_THREAD_SAFETY === "1"
  ) {
    return true;
  }
  if (featureName === "YAML_DOC_END_FIX" && process.env.FEATURE_YAML_DOC_END_FIX === "1") {
    return true;
  }
  if (
    featureName === "INFRASTRUCTURE_HEALTH_CHECKS" &&
    process.env.FEATURE_INFRASTRUCTURE_HEALTH_CHECKS === "1"
  ) {
    return true;
  }

  return false;
}

// Export interfaces for type safety
export interface WebSocketFrame {
  opcode: number;
  payload: Uint8Array;
  final: boolean;
}

export interface WebSocketGuardedConnection {
  ws: any;
  closeFrameBuffer: Uint8Array;
  expectCloseFrame: boolean;
  originalSend: (data: string | Uint8Array) => void;
  originalClose: (code?: number, reason?: string) => void;
}

export interface FragmentMetrics {
  bufferedCloseFrames: number;
  fragmentedMessages: number;
  bufferOverflows: number;
  panicPreventions: number;
}

// Buffers fragmented close frames; prevents panic
export class WebSocketFragmentGuard {
  private static readonly CLOSE_FRAME_SIZE = 2; // 2 bytes for status code
  private static readonly MAX_BUFFER_SIZE = 4096; // 4KB max buffer
  private static readonly OPCODE_CLOSE = 0x88;
  private static readonly OPCODE_TEXT = 0x01;
  private static readonly OPCODE_BINARY = 0x02;

  private static guardedConnections = new Set<WebSocketGuardedConnection>();
  private static metrics: FragmentMetrics = {
    bufferedCloseFrames: 0,
    fragmentedMessages: 0,
    bufferOverflows: 0,
    panicPreventions: 0,
  };

  // Zero-cost when WS_FRAGMENT_GUARD is disabled
  static createWebSocket(ws: any): any {
    if (!isFeatureEnabled("WS_FRAGMENT_GUARD")) {
      // Legacy: no fragment buffering
      return ws;
    }

    // Component #73: Buffer for fragmented frames
    const guardedWs: WebSocketGuardedConnection = {
      ws,
      closeFrameBuffer: new Uint8Array(),
      expectCloseFrame: false,
      originalSend: ws.send.bind(ws),
      originalClose: ws.close.bind(ws),
    };

    // Override close handler to buffer fragments
    guardedWs.originalClose = (code?: number, reason?: string) => {
      if (reason) {
        const encoder = new TextEncoder();
        const reasonBytes = encoder.encode(reason);
        const frame = new Uint8Array(
          this.CLOSE_FRAME_SIZE + reasonBytes.length
        );

        // Write status code (2 bytes)
        new DataView(frame.buffer).setUint16(0, code || 1000);

        // Write reason
        frame.set(reasonBytes, this.CLOSE_FRAME_SIZE);

        guardedWs.closeFrameBuffer = frame;
        this.metrics.bufferedCloseFrames++;
      }

      return guardedWs.originalClose(code, reason);
    };

    // Override message handler to detect fragmented close
    ws.addEventListener("message", (event: any) => {
      if (event.data instanceof ArrayBuffer) {
        const bytes = new Uint8Array(event.data);

        // Check if this is a close frame fragment
        if (bytes.length > 0 && bytes[0] === this.OPCODE_CLOSE) {
          guardedWs.expectCloseFrame = true;
          guardedWs.closeFrameBuffer = new Uint8Array(bytes.slice(1));
          this.metrics.fragmentedMessages++;
        } else if (guardedWs.expectCloseFrame) {
          // Append fragment
          const combined = new Uint8Array(
            guardedWs.closeFrameBuffer.length + bytes.length
          );
          combined.set(guardedWs.closeFrameBuffer);
          combined.set(bytes, guardedWs.closeFrameBuffer.length);

          guardedWs.closeFrameBuffer = combined;

          // Check buffer size
          if (guardedWs.closeFrameBuffer.length > this.MAX_BUFFER_SIZE) {
            this.metrics.bufferOverflows++;
            this.logBufferOverflow(guardedWs);

            // Reset buffer to prevent memory exhaustion
            guardedWs.closeFrameBuffer = new Uint8Array();
            guardedWs.expectCloseFrame = false;
            return;
          }

          // Process complete frame
          if (guardedWs.closeFrameBuffer.length >= this.CLOSE_FRAME_SIZE) {
            this.processCompleteCloseFrame(guardedWs, event);
          }
        }
      }
    });

    // Monitor for buffer overflow (Component #12 threat detection)
    this.monitorBufferSize(guardedWs);

    // Track connection
    this.guardedConnections.add(guardedWs);

    return guardedWs.ws;
  }

  private static processCompleteCloseFrame(
    guardedWs: WebSocketGuardedConnection,
    event: any
  ): void {
    try {
      const buffer = guardedWs.closeFrameBuffer;
      const code = new DataView(buffer.buffer).getUint16(0);
      const reason = new TextDecoder().decode(
        buffer.slice(this.CLOSE_FRAME_SIZE)
      );

      // Emit proper close event
      const closeEvent = new CloseEvent("close", {
        code,
        reason,
        wasClean: true,
      });

      // Dispatch to listeners
      if (guardedWs.ws.dispatchEvent) {
        guardedWs.ws.dispatchEvent(closeEvent);
      }

      // Reset buffer
      guardedWs.closeFrameBuffer = new Uint8Array();
      guardedWs.expectCloseFrame = false;

      this.metrics.panicPreventions++;
    } catch (error) {
      // Log error (Component #11 audit)
      this.logFragmentProcessingError(error);
    }
  }

  private static monitorBufferSize(
    guardedWs: WebSocketGuardedConnection
  ): void {
    const interval = setInterval(() => {
      if (!process.env.FEATURE_INFRASTRUCTURE_HEALTH_CHECKS === "1") return;

      if (guardedWs.closeFrameBuffer.length > 1024) {
        // Potential DoS attack
        this.metrics.bufferOverflows++;
        this.logBufferOverflow(guardedWs);

        // Reset buffer
        guardedWs.closeFrameBuffer = new Uint8Array();
        guardedWs.expectCloseFrame = false;
      }

      // Clean up if connection is closed
      if (guardedWs.ws.readyState === 3) {
        // CLOSED
        clearInterval(interval);
        this.guardedConnections.delete(guardedWs);
      }
    }, 1000);
  }

  private static logBufferOverflow(
    guardedWs: WebSocketGuardedConnection
  ): void {
    if (!process.env.FEATURE_INFRASTRUCTURE_HEALTH_CHECKS === "1") return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 73,
        action: "large_close_frame_buffer",
        size: guardedWs.closeFrameBuffer.length,
        severity: "high",
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }

  private static logFragmentProcessingError(error: any): void {
    if (!process.env.FEATURE_INFRASTRUCTURE_HEALTH_CHECKS === "1") return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 73,
        action: "close_frame_processing_error",
        error: error.message,
        severity: "medium",
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }

  // Get current metrics
  static getMetrics(): FragmentMetrics {
    return { ...this.metrics };
  }

  // Cleanup all connections
  static cleanupAll(): void {
    const connections = Array.from(this.guardedConnections);
    for (const connection of connections) {
      if (connection.ws.readyState === 1) {
        // OPEN
        try {
          connection.originalClose(1000, "Cleanup");
        } catch {
          // Ignore errors during cleanup
        }
      }
    }
    this.guardedConnections.clear();
    console.log("[WS_FRAGMENT_GUARD] Cleaned up all connections");
  }

  // Validate WebSocket frame against RFC 6455
  static validateFrame(frame: WebSocketFrame): boolean {
    // Check opcode validity
    const validOpcodes = [0x00, 0x01, 0x02, 0x08, 0x09, 0x0a]; // Continuation, Text, Binary, Close, Ping, Pong
    if (!validOpcodes.includes(frame.opcode)) {
      return false;
    }

    // Check payload size (RFC 6455 limit: 2^63 bytes, but practical limit is smaller)
    if (frame.payload.length > 9007199254740991) {
      // Number.MAX_SAFE_INTEGER
      return false;
    }

    // Close frame specific validation
    if (frame.opcode === 0x08) {
      if (frame.payload.length >= 2) {
        const code = new DataView(frame.payload.buffer).getUint16(0);
        // Validate close code range
        if (code < 1000 || (code > 1003 && code < 1006) || code > 1011) {
          return false;
        }
      }
    }

    return true;
  }

  // Create a mock WebSocket for testing
  static createMockWebSocket(): any {
    return {
      readyState: 1, // OPEN
      send: (data: any) => {},
      close: (code?: number, reason?: string) => {},
      addEventListener: (event: string, handler: (event: any) => void) => {},
      dispatchEvent: (event: any) => {},
      removeEventListener: (event: string, handler: (event: any) => void) => {},
    };
  }
}

// Zero-cost export
export const {
  createWebSocket,
  getMetrics,
  cleanupAll,
  validateFrame,
  createMockWebSocket,
} = process.env.FEATURE_WS_FRAGMENT_GUARD === "1"
  ? WebSocketFragmentGuard
  : {
      createWebSocket: (ws: any) => ws,
      getMetrics: () => ({
        bufferedCloseFrames: 0,
        fragmentedMessages: 0,
        bufferOverflows: 0,
        panicPreventions: 0,
      }),
      cleanupAll: () => {},
      validateFrame: (frame: WebSocketFrame) => true,
      createMockWebSocket: () => ({
        readyState: 1,
        send: () => {},
        close: () => {},
        addEventListener: () => {},
        dispatchEvent: () => {},
        removeEventListener: () => {},
      }),
    };

export default WebSocketFragmentGuard;
