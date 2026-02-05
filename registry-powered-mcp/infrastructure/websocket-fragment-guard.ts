// infrastructure/websocket-fragment-guard.ts
import { feature } from "bun:bundle";

// Buffers fragmented close frames; prevents panic
export class WebSocketFragmentGuard {
  private static readonly CLOSE_FRAME_SIZE = 2; // 2 bytes for status code

  // Zero-cost when WS_FRAGMENT_GUARD is disabled
  static createWebSocket(ws: any): any {
    if (!feature("WS_FRAGMENT_GUARD")) {
      // Legacy: no fragment buffering
      return ws;
    }

    // Component #73: Buffer for fragmented frames
    const guardedWs = {
      ...ws,
      closeFrameBuffer: new Uint8Array(),
      expectCloseFrame: false,
      originalSend: ws.send.bind(ws),
      originalClose: ws.close.bind(ws)
    };

    // Override close handler to buffer fragments
    guardedWs.close = (code?: number, reason?: string) => {
      if (reason) {
        const encoder = new TextEncoder();
        const reasonBytes = encoder.encode(reason);
        const frame = new Uint8Array(this.CLOSE_FRAME_SIZE + reasonBytes.length);

        // Write status code (2 bytes)
        new DataView(frame.buffer).setUint16(0, code || 1000);

        // Write reason
        frame.set(reasonBytes, this.CLOSE_FRAME_SIZE);

        guardedWs.closeFrameBuffer = frame;
      }

      return guardedWs.originalClose(code, reason);
    };

    // Override message handler to detect fragmented close
    ws.addEventListener("message", (event: any) => {
      if (event.data instanceof ArrayBuffer) {
        const bytes = new Uint8Array(event.data);

        // Check if this is a close frame fragment
        if (bytes[0] === 0x88) { // Close frame opcode
          guardedWs.expectCloseFrame = true;
          guardedWs.closeFrameBuffer = new Uint8Array(bytes.slice(1));
        } else if (guardedWs.expectCloseFrame) {
          // Append fragment
          const combined = new Uint8Array(
            guardedWs.closeFrameBuffer.length + bytes.length
          );
          combined.set(guardedWs.closeFrameBuffer);
          combined.set(bytes, guardedWs.closeFrameBuffer.length);

          guardedWs.closeFrameBuffer = combined;

          // Process complete frame
          if (guardedWs.closeFrameBuffer.length >= this.CLOSE_FRAME_SIZE) {
            this.processCompleteCloseFrame(guardedWs, event);
          }
        }
      }
    });

    // Monitor for buffer overflow (Component #12 threat detection)
    this.monitorBufferSize(guardedWs);

    return guardedWs;
  }

  private static processCompleteCloseFrame(guardedWs: any, event: any): void {
    try {
      const buffer = guardedWs.closeFrameBuffer;
      const code = new DataView(buffer.buffer).getUint16(0);
      const reason = new TextDecoder().decode(buffer.slice(this.CLOSE_FRAME_SIZE));

      // Emit proper close event
      guardedWs.dispatchEvent(new CloseEvent("close", {
        code,
        reason,
        wasClean: true
      }));

      // Reset buffer
      guardedWs.closeFrameBuffer = new Uint8Array();
      guardedWs.expectCloseFrame = false;

    } catch (error) {
      // Log error (Component #11 audit)
      this.logFragmentProcessingError(error);
    }
  }

  private static monitorBufferSize(guardedWs: any): void {
    setInterval(() => {
      if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

      if (guardedWs.closeFrameBuffer.length > 1024) {
        // Potential DoS attack
        fetch("https://api.buncatalog.com/v1/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            component: 73,
            action: "large_close_frame_buffer",
            size: guardedWs.closeFrameBuffer.length,
            severity: "high",
            timestamp: Date.now()
          })
        }).catch(() => {});
      }
    }, 1000);
  }

  private static logFragmentProcessingError(error: any): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 73,
        action: "close_frame_processing_error",
        error: error.message,
        severity: "medium",
        timestamp: Date.now()
      })
    }).catch(() => {});
  }
}

// Zero-cost export
export const { createWebSocket } = feature("WS_FRAGMENT_GUARD")
  ? WebSocketFragmentGuard
  : { createWebSocket: (ws: any) => ws };