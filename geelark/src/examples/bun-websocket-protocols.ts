#!/usr/bin/env bun

/**
 * Bun WebSocket Protocol Options Examples
 *
 * Demonstrates WebSocketOptionsProtocolsOrProtocol usage:
 * - { protocols: string | string[] } - specify multiple protocols
 * - { protocol: string } - specify single protocol
 *
 * Reference: https://bun.sh/reference/bun/WebSocketOptionsProtocolsOrProtocol
 */

/**
 * Example 1: Server with protocol support
 */
function example1_ServerWithProtocols() {
  console.log('=== Example 1: Server with Protocol Support ===\n');

  const server = Bun.serve({
    port: 0,
    fetch(req, server) {
      // Upgrade to WebSocket with protocol support
      if (req.url.endsWith('/ws')) {
        // Option 1: Single protocol as object
        const success = server.upgrade(req, {
          protocol: 'chat-v1',
          // protocol: 'chat-v1' is equivalent to protocols: 'chat-v1'
        });

        if (!success) {
          return new Response('Upgrade failed', { status: 400 });
        }
        return undefined; // Upgrade in progress
      }

      if (req.url.endsWith('/ws-multi')) {
        // Option 2: Multiple protocols as array
        const success = server.upgrade(req, {
          protocols: ['chat-v1', 'chat-v2', 'binary-v1'],
          // Server will select the first matching protocol
        });

        if (!success) {
          return new Response('Upgrade failed', { status: 400 });
        }
        return undefined;
      }

      if (req.url.endsWith('/ws-string')) {
        // Option 3: Single protocol as string in protocols
        const success = server.upgrade(req, {
          protocols: 'json-v1',
        });

        if (!success) {
          return new Response('Upgrade failed', { status: 400 });
        }
        return undefined;
      }

      return new Response('WebSocket server');
    },
    websocket: {
      message(ws, message) {
        // Access the selected protocol
        console.log(`  Protocol: ${ws.protocol || 'none'}`);
        ws.send(`Echo (${ws.protocol || 'default'}): ${message}`);
      },
      open(ws) {
        console.log(`  ✅ WebSocket opened with protocol: ${ws.protocol || 'none'}`);
      },
      close(ws, code, reason) {
        console.log(`  ❌ WebSocket closed: ${code} - ${reason}`);
      },
    },
  });

  console.log(`Server running at: ${server.url.href}`);
  console.log(`WebSocket endpoints:`);
  console.log(`  - ${server.url.href}ws (protocol: chat-v1)`);
  console.log(`  - ${server.url.href}ws-multi (protocols: [chat-v1, chat-v2, binary-v1])`);
  console.log(`  - ${server.url.href}ws-string (protocols: json-v1)`);
  console.log('\nNote: In a real scenario, you would connect from a client.');

  // Return server for testing
  return server;
}

/**
 * Example 2: Type-safe protocol handling
 */
function example2_TypeSafeProtocols() {
  console.log('\n=== Example 2: Type-Safe Protocol Handling ===\n');

  type ProtocolConfig =
    | { protocol: string }
    | { protocols: string | string[] };

  // Type-safe protocol configuration
  const configs: ProtocolConfig[] = [
    { protocol: 'chat-v1' },
    { protocols: ['chat-v1', 'chat-v2'] },
    { protocols: 'binary-v1' },
  ];

  for (const config of configs) {
    if ('protocol' in config) {
      console.log(`  Single protocol: ${config.protocol}`);
    } else if (Array.isArray(config.protocols)) {
      console.log(`  Multiple protocols: ${config.protocols.join(', ')}`);
    } else {
      console.log(`  Protocol string: ${config.protocols}`);
    }
  }
}

/**
 * Example 3: Protocol negotiation helper
 */
class ProtocolNegotiator {
  private supportedProtocols: string[];

  constructor(supportedProtocols: string[]) {
    this.supportedProtocols = supportedProtocols;
  }

  /**
   * Negotiate protocol from client request
   */
  negotiate(clientProtocols: string[]): string | null {
    // Find first matching protocol (client preference order)
    for (const clientProtocol of clientProtocols) {
      if (this.supportedProtocols.includes(clientProtocol)) {
        return clientProtocol;
      }
    }
    return null; // No match
  }

  /**
   * Create upgrade options for Bun.serve
   */
  createUpgradeOptions(requestedProtocols: string[]):
    | { protocol: string }
    | { protocols: string | string[] } {
    const negotiated = this.negotiate(requestedProtocols);

    if (negotiated) {
      // Use single protocol if we found a match
      return { protocol: negotiated };
    }

    // Return all supported protocols for server to choose
    return { protocols: this.supportedProtocols };
  }
}

function example3_ProtocolNegotiation() {
  console.log('\n=== Example 3: Protocol Negotiation ===\n');

  const negotiator = new ProtocolNegotiator(['chat-v1', 'chat-v2', 'binary-v1']);

  // Client requests protocols in preference order
  const clientProtocols1 = ['chat-v2', 'chat-v1', 'json-v1'];
  const negotiated1 = negotiator.negotiate(clientProtocols1);
  console.log(`  Client: [${clientProtocols1.join(', ')}]`);
  console.log(`  Negotiated: ${negotiated1 || 'none'}`);

  const clientProtocols2 = ['json-v1', 'xml-v1'];
  const negotiated2 = negotiator.negotiate(clientProtocols2);
  console.log(`  Client: [${clientProtocols2.join(', ')}]`);
  console.log(`  Negotiated: ${negotiated2 || 'none'}`);

  // Create upgrade options
  const options1 = negotiator.createUpgradeOptions(clientProtocols1);
  console.log(`  Upgrade options: ${JSON.stringify(options1)}`);

  const options2 = negotiator.createUpgradeOptions(clientProtocols2);
  console.log(`  Upgrade options: ${JSON.stringify(options2)}`);
}

/**
 * Example 4: Protocol-based message handling
 */
interface ProtocolMessageHandler {
  handle(ws: any, message: string | ArrayBuffer): void;
}

class ChatProtocolHandler implements ProtocolMessageHandler {
  handle(ws: any, message: string | ArrayBuffer) {
    if (typeof message === 'string') {
      ws.send(`[Chat] ${message}`);
    }
  }
}

class BinaryProtocolHandler implements ProtocolMessageHandler {
  handle(ws: any, message: string | ArrayBuffer) {
    if (message instanceof ArrayBuffer) {
      ws.send(new Uint8Array(message).reverse());
    }
  }
}

function example4_ProtocolHandlers() {
  console.log('\n=== Example 4: Protocol-Based Handlers ===\n');

  const handlers: Map<string, ProtocolMessageHandler> = new Map([
    ['chat-v1', new ChatProtocolHandler()],
    ['chat-v2', new ChatProtocolHandler()],
    ['binary-v1', new BinaryProtocolHandler()],
  ]);

  // Simulate WebSocket with protocol
  const simulateWS = (protocol: string, message: string | ArrayBuffer) => {
    const handler = handlers.get(protocol);
    if (handler) {
      console.log(`  [${protocol}] Handling message`);
      handler.handle({ send: (msg: any) => console.log(`    Response: ${msg}`) }, message);
    } else {
      console.log(`  [${protocol}] No handler found`);
    }
  };

  simulateWS('chat-v1', 'Hello');
  simulateWS('binary-v1', new TextEncoder().encode('Hello').buffer);
  simulateWS('unknown', 'Test');
}

/**
 * Example 5: Real server implementation
 */
function example5_RealServer() {
  console.log('\n=== Example 5: Real Server Implementation ===\n');

  const server = Bun.serve({
    port: 0,
    fetch(req, server) {
      const url = new URL(req.url);

      if (url.pathname === '/ws') {
        // Get requested protocols from headers
        const requestedProtocols = req.headers.get('sec-websocket-protocol');

        if (requestedProtocols) {
          const protocols = requestedProtocols.split(',').map(p => p.trim());
          console.log(`  Client requested protocols: ${protocols.join(', ')}`);

          // Negotiate protocol
          const negotiator = new ProtocolNegotiator(['chat-v1', 'chat-v2']);
          const negotiated = negotiator.negotiate(protocols);

          if (negotiated) {
            // Upgrade with negotiated protocol
            server.upgrade(req, { protocol: negotiated });
            return undefined;
          }
        }

        // Fallback: no protocol negotiation
        server.upgrade(req);
        return undefined;
      }

      return new Response(`
        <html>
          <head><title>WebSocket Protocol Test</title></head>
          <body>
            <h1>WebSocket Protocol Examples</h1>
            <p>Open browser console and run:</p>
            <pre>
const ws = new WebSocket('ws://localhost:${server.port}/ws', ['chat-v1', 'chat-v2']);
ws.onopen = () => console.log('Protocol:', ws.protocol);
ws.onmessage = (e) => console.log('Message:', e.data);
ws.send('Hello');
            </pre>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
      });
    },
    websocket: {
      message(ws, message) {
        ws.send(`Server received (protocol: ${ws.protocol || 'none'}): ${message}`);
      },
      open(ws) {
        console.log(`  ✅ Client connected with protocol: ${ws.protocol || 'none'}`);
      },
      close(ws) {
        console.log(`  ❌ Client disconnected`);
      },
    },
  });

  console.log(`Server running at: ${server.url.href}`);
  console.log(`WebSocket endpoint: ws://localhost:${server.port}/ws`);
  console.log(`\nTo test, open: ${server.url.href}`);

  return server;
}

// Run examples
console.log('🔌 Bun WebSocket Protocol Options Examples\n');

example1_ServerWithProtocols();
example2_TypeSafeProtocols();
example3_ProtocolNegotiation();
example4_ProtocolHandlers();
const testServer = example5_RealServer();

console.log('\n✅ All examples completed!');
console.log('\n💡 Key Points:');
console.log('  • Use { protocol: string } for single protocol');
console.log('  • Use { protocols: string | string[] } for multiple protocols');
console.log('  • Server selects matching protocol from client request');
console.log('  • Access selected protocol via ws.protocol');
console.log('\nPress Ctrl+C to stop the test server...\n');

// Keep server running
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  testServer.stop();
  process.exit(0);
});

