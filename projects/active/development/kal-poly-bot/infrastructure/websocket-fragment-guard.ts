// infrastructure/websocket-fragment-guard.ts
import { feature } from "bun:bundle";

// Buffers fragmented close frames; prevents panic
export class WebSocketFragmentGuard {
  // Zero-cost when WS_FRAGMENT_GUARD is disabled
  static createWebSocket(ws: any): any {
    if (!feature("WS_FRAGMENT_GUARD")) {
      return ws; // Legacy: no fragment buffering
    }

    const guardedWs = {
      ...ws,
      closeFrameBuffer: new Uint8Array(),
      expectCloseFrame: false,
      originalSend: ws.send.bind(ws),
      originalClose: ws.close.bind(ws)
    };

    // Override close to buffer fragments
    guardedWs.close = (code?: number, reason?: string) => {
      if (reason) {
        const encoder = new TextEncoder();
        const reasonBytes = encoder.encode(reason);
        const frame = new Uint8Array(2 + reasonBytes.length);

        // Status code (2 bytes)
        new DataView(frame.buffer).setUint16(0, code || 1000);

        // Reason
        frame.set(reasonBytes, 2);

        guardedWs.closeFrameBuffer = frame;
      }

      return guardedWs.originalClose(code, reason);
    };

    // Monitor message handler
    ws.addEventListener("message", (event: any) => {
      if (event.data instanceof ArrayBuffer) {
        const bytes = new Uint8Array(event.data);

        // Close frame fragment detection
        if (bytes[0] === 0x88) { // Close opcode
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
          if (combined.length >= 2) {
            this.processCompleteFrame(guardedWs, combined);
          }
        }
      }
    });

    // Component #12: Monitor for DoS (excessive fragments)
    this.monitorFragmentBuffer(guardedWs);

    return guardedWs;
  }

  private static processCompleteFrame(guardedWs: any, buffer: Uint8Array): void {
    try {
      const code = new DataView(buffer.buffer).getUint16(0);
      const reason = new TextDecoder().decode(buffer.slice(2));

      guardedWs.dispatchEvent(new CloseEvent("close", {
        code,
        reason,
        wasClean: true
      }));

      guardedWs.closeFrameBuffer = new Uint8Array();
      guardedWs.expectCloseFrame = false;

    } catch (error) {
      // Component #11 audit
      this.logFragmentError(error);
    }
  }

  private static monitorFragmentBuffer(guardedWs: any): void {
    setInterval(() => {
      if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

      if (guardedWs.closeFrameBuffer.length > 1024) {
        fetch("https://api.buncatalog.com/v1/threat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            component: 95,
            threatType: "websocket_fragment_dos",
            size: guardedWs.closeFrameBuffer.length,
            timestamp: Date.now()
          })
        }).catch(() => {});
      }
    }, 1000);
  }

  private static logFragmentError(error: any): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 95,
        action: "fragment_processing_error",
        error: error.message,
        timestamp: Date.now()
      })
    }).catch(() => {});
  }
}

// Zero-cost export
export const { createWebSocket } = feature("WS_FRAGMENT_GUARD")
  ? WebSocketFragmentGuard
  : { createWebSocket: (ws: any) => ws };
