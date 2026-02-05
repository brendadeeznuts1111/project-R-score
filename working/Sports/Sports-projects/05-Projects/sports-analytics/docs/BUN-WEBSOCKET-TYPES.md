---
title: Bun WebSocket Types Reference
type: reference
tags:
  - bun
  - websocket
  - typescript
  - api
created: 2025-12-29
updated: 2025-12-29
author: Sports Analytics
status: active
domain: infrastructure
component: websocket-server
---

# Bun WebSocket Types Reference

TypeScript type definitions for Bun's WebSocket server functionality.

## Bun.serve Function

```typescript
namespace Bun {
  export function serve(params: {
    fetch: (req: Request, server: Server) => Response | Promise<Response>;
    websocket?: WebSocketOptions;
  }): Server;
}
```

### WebSocketOptions

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `message` | `(ws, message) => void` | required | Called when a message is received |
| `open?` | `(ws) => void` | undefined | Called when a client connects |
| `close?` | `(ws, code, reason) => void` | undefined | Called when a client disconnects |
| `error?` | `(ws, error) => void` | undefined | Called on WebSocket errors |
| `drain?` | `(ws) => void` | undefined | Called when backpressure drains |
| `maxPayloadLength?` | `number` | 16 MB | Maximum message size |
| `idleTimeout?` | `number` | 120s | Connection idle timeout |
| `backpressureLimit?` | `number` | 1 MB | Backpressure threshold |
| `closeOnBackpressureLimit?` | `boolean` | false | Close on backpressure |
| `sendPings?` | `boolean` | true | Send ping frames |
| `publishToSelf?` | `boolean` | false | Echo published messages |
| `perMessageDeflate?` | `boolean \| DeflateOptions` | undefined | Compression settings |

### Compressor Types

```typescript
type Compressor =
  | `"disable"`
  | `"shared"`
  | `"dedicated"`
  | `"3KB"`
  | `"4KB"`
  | `"8KB"`
  | `"16KB"`
  | `"32KB"`
  | `"64KB"`
  | `"128KB"`
  | `"256KB"`;
```

## Server Interface

```typescript
interface Server {
  pendingWebSockets: number;
  publish(topic: string, data: string | ArrayBufferView | ArrayBuffer, compress?: boolean): number;
  upgrade(req: Request, options?: { headers?: HeadersInit; data?: any }): boolean;
}
```

## ServerWebSocket Interface

```typescript
interface ServerWebSocket {
  readonly data: any;
  readonly readyState: number;
  readonly remoteAddress: string;
  readonly subscriptions: string[];
  send(message: string | ArrayBuffer | Uint8Array, compress?: boolean): number;
  close(code?: number, reason?: string): void;
  subscribe(topic: string): void;
  unsubscribe(topic: string): void;
  publish(topic: string, message: string | ArrayBuffer | Uint8Array): void;
  isSubscribed(topic: string): boolean;
  cork(cb: (ws: ServerWebSocket) => void): void;
}
```

## Ready States

| Value | State |
|-------|-------|
| 0 | CONNECTING |
| 1 | OPEN |
| 2 | CLOSING |
| 3 | CLOSED |

## Usage Example

```typescript
const server = Bun.serve({
  fetch(req, server) {
    // Upgrade HTTP to WebSocket
    if (server.upgrade(req)) return;
    return new Response("Use WebSocket");
  },
  websocket: {
    message(ws, message) {
      console.log("Received:", message);
      ws.send("Echo: " + message);
    },
    open(ws) {
      console.log("Client connected");
    },
    close(ws, code, reason) {
      console.log("Client disconnected:", code, reason);
    },
    publishToSelf: true,
    perMessageDeflate: "dedicated",
  },
});

console.log(`WebSocket server running on ${server.hostname}:${server.port}`);
```

## Pub/Sub Pattern

```typescript
// Server-side broadcast
server.publish("updates", JSON.stringify({ event: "score", data: }));

// Client subscriptions
ws.subscribe("updates");
ws.isSubscribed("updates"); // true
ws.unsubscribe("updates");
```

## Related

- [[Bun v1.3.2 Production Features]]
- [[HFT Config]]
- [[Sports Config]]
