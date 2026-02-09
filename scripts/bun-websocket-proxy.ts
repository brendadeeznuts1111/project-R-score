// bun-websocket-proxy.ts - Bun v1.3.6 HTTP/HTTPS Proxy Support for WebSocket
// https://bun.com/blog/bun-v1.3.6#http-https-proxy-support-for-websocket

import { serve, redis } from 'bun';

// ==================== TYPES ====================
type ProxyConfig = {
  url: string; // http://proxy.company.com:8080
  username?: string;
  password?: string;
  headers?: Record<string, string>;
};

type WebSocketConnection = {
  id: string;
  ws: WebSocket;
  proxy?: ProxyConfig;
  connectedAt: string;
  messagesSent: number;
  messagesReceived: number;
};

type TlsConfig = {
  rejectUnauthorized?: boolean;
  ca?: string | Uint8Array;
  cert?: string | Uint8Array;
  key?: string | Uint8Array;
  passphrase?: string;
};

function envBoolean(value?: string): boolean {
  return value === '1' || value === 'true';
}

function loadProxyDefaults(): { proxy?: ProxyConfig; tls?: TlsConfig } {
  const url = Bun.env.WS_PROXY_URL?.trim();
  if (!url) return {};
  const proxy: ProxyConfig = {
    url,
    username: Bun.env.WS_PROXY_USERNAME?.trim() || undefined,
    password: Bun.env.WS_PROXY_PASSWORD?.trim() || undefined,
  };
  const authHeader = Bun.env.WS_PROXY_AUTHORIZATION?.trim();
  if (authHeader) proxy.headers = { 'Proxy-Authorization': authHeader };
  const tls: TlsConfig | undefined = envBoolean(Bun.env.WS_TLS_INSECURE)
    ? { rejectUnauthorized: false }
    : undefined;
  return { proxy, tls };
}

// ==================== PROXY WEBSOCKET CLIENT ====================
class ProxyWebSocketClient {
  private connections = new Map<string, WebSocketConnection>();

  /**
   * Connect to WebSocket through HTTP/HTTPS proxy (Bun v1.3.6+)
   *
   * Usage:
   *   // Simple proxy URL
   *   new WebSocket("wss://example.com", { proxy: "http://proxy:8080" });
   *
   *   // With authentication
   *   new WebSocket("wss://example.com", { proxy: "http://user:pass@proxy:8080" });
   *
   *   // Object format with custom headers
   *   new WebSocket("wss://example.com", {
   *     proxy: { url: "http://proxy:8080", headers: { "Proxy-Authorization": "Bearer token" } }
   *   });
   *
   *   // HTTPS proxy with TLS options
   *   new WebSocket("wss://example.com", {
   *     proxy: "https://proxy:8443",
   *     tls: { rejectUnauthorized: false }
   *   });
   */
  async connect(
    url: string,
    proxy?: ProxyConfig | string,
    protocols?: string | string[],
    tls?: TlsConfig
  ): Promise<WebSocketConnection> {
    const id = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Bun v1.3.6+: WebSocket proxy in 2nd parameter (options object)
    const wsOptions: WebSocketInit & {
      proxy?: string | { url: string; headers?: Record<string, string> };
      tls?: Record<string, unknown>;
    } = {};

    if (proxy) {
      if (typeof proxy === 'string') {
        // Simple proxy URL string
        wsOptions.proxy = proxy;
      } else {
        // Object format with auth
        let proxyUrl = proxy.url;
        if (proxy.username && proxy.password) {
          const urlObj = new URL(proxy.url);
          urlObj.username = proxy.username;
          urlObj.password = proxy.password;
          proxyUrl = urlObj.toString();
        }
        wsOptions.proxy = proxy.headers ? { url: proxyUrl, headers: proxy.headers } : proxyUrl;
      }
      console.log(
        `🌐 Connecting through proxy: ${typeof wsOptions.proxy === 'string' ? wsOptions.proxy.replace(/:\/\/[^:]+:[^@]+@/, '://***@') : '[configured]'}`
      );
    }
    if (tls) wsOptions.tls = { ...tls };

    // Note: protocols go in the options object too if using proxy
    const ws = new WebSocket(url, protocols ? { ...wsOptions, protocols } : wsOptions);

    const conn: WebSocketConnection = {
      id,
      ws,
      proxy,
      connectedAt: new Date().toISOString(),
      messagesSent: 0,
      messagesReceived: 0,
    };

    this.connections.set(id, conn);

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        this.connections.delete(id);
      };
      const timeout = setTimeout(() => {
        cleanup();
        try {
          ws.close();
        } catch {}
        reject(new Error('Connection timeout'));
      }, 10000);
      ws.onopen = () => {
        clearTimeout(timeout);
        console.log(`✅ WebSocket ${id} connected${proxy ? ' via proxy' : ''}`);
        redis.publish('ws:connected', JSON.stringify({ id, url, proxy: !!proxy }));
        resolve();
      };
      ws.onmessage = event => {
        conn.messagesReceived++;
        this.handleMessage(id, event.data);
      };
      ws.onclose = event => {
        console.log(`❌ WebSocket ${id} closed: ${event.code} ${event.reason}`);
        this.connections.delete(id);
        redis.publish('ws:disconnected', JSON.stringify({ id, code: event.code }));
      };
      ws.onerror = err => {
        clearTimeout(timeout);
        cleanup();
        try {
          ws.close();
        } catch {}
        console.error(`💥 WebSocket ${id} error:`, err);
        redis.publish('ws:error', JSON.stringify({ id, error: String(err) }));
        reject(err);
      };
    });

    return conn;
  }

  private handleMessage(connId: string, data: any): void {
    console.log(`📨 ${connId}: ${data.toString().substring(0, 100)}`);
  }

  send(connId: string, message: string | object): void {
    const conn = this.connections.get(connId);
    if (conn && conn.ws.readyState === WebSocket.OPEN) {
      const msg = typeof message === 'string' ? message : JSON.stringify(message);
      conn.ws.send(msg);
      conn.messagesSent++;
    }
  }

  disconnect(connId: string): void {
    const conn = this.connections.get(connId);
    if (conn) {
      conn.ws.close();
      this.connections.delete(connId);
    }
  }

  getStats(): object {
    const stats: Record<string, any> = {};
    for (const [id, conn] of this.connections) {
      stats[id] = {
        proxy: conn.proxy?.url || 'direct',
        connectedAt: conn.connectedAt,
        messagesSent: conn.messagesSent,
        messagesReceived: conn.messagesReceived,
        readyState: conn.ws.readyState,
      };
    }
    return stats;
  }
}

// ==================== WEBSOCKET SERVER WITH PROXY AWARENESS ====================
const wss = serve({
  port: 3006,
  websocket: {
    open(ws) {
      console.log('🔌 Client connected to server');
      ws.subscribe('broadcast');
      ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to Bun WebSocket server' }));
    },
    message(ws, message) {
      const data = JSON.parse(message.toString());
      console.log('📥 Server received:', data);

      // Echo back
      ws.send(JSON.stringify({ type: 'echo', received: data, timestamp: Date.now() }));

      // Broadcast to all
      ws.publish(
        'broadcast',
        JSON.stringify({ type: 'broadcast', from: data.clientId, msg: data.msg })
      );
    },
    close(ws, code, reason) {
      console.log('🔌 Client disconnected:', code, reason);
    },
  },
  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === '/ws') {
      const upgraded = server.upgrade(req);
      if (upgraded) return undefined;
    }

    if (url.pathname === '/proxy-demo') {
      return new Response(
        `
        <!DOCTYPE html>
        <html>
        <head><title>Bun WebSocket Proxy Demo</title></head>
        <body>
          <h1>🌐 Bun v1.3.6 WebSocket Proxy Demo</h1>
          <div id="log"></div>
          <script>
            const log = (msg) => document.getElementById('log').innerHTML += '<p>' + msg + '</p>';
            
            // Connect through proxy (if configured)
            const ws = new WebSocket('ws://localhost:3006/ws');
            ws.onopen = () => {
              log('✅ Connected');
              ws.send(JSON.stringify({ clientId: 'browser', msg: 'Hello from browser!' }));
            };
            ws.onmessage = (e) => log('📨 ' + e.data);
            ws.onerror = (e) => log('💥 Error: ' + e);
          </script>
        </body>
        </html>
      `,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    return Response.json({
      service: 'Bun WebSocket Proxy Demo',
      version: '1.3.6',
      endpoints: {
        websocket: '/ws',
        demo: '/proxy-demo',
        stats: '/stats',
      },
    });
  },
});

// ==================== DEMO ====================
async function runDemo() {
  const defaults = loadProxyDefaults();
  console.log(`
🌐 Bun v1.3.6 WebSocket Proxy Support Demo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Server: ws://localhost:${wss.port}/ws
Demo:   http://localhost:${wss.port}/proxy-demo

Features:
✅ HTTP proxy support for WebSocket connections
✅ HTTPS proxy support for secure WebSocket (wss://)
✅ Proxy authentication (username/password)
✅ Corporate firewall traversal

Usage:
  // Simple proxy URL
  const ws = new WebSocket('wss://api.example.com', {
    proxy: 'http://proxy.company.com:8080'
  });

  // With authentication
  const ws = new WebSocket('wss://api.example.com', {
    proxy: 'http://user:pass@proxy.company.com:8080'
  });

  // Object format with headers
  const ws = new WebSocket('wss://api.example.com', {
    proxy: {
      url: 'http://proxy.company.com:8080',
      headers: { 'Proxy-Authorization': 'Bearer token' }
    }
  });

  // HTTPS proxy with TLS options
  const ws = new WebSocket('wss://api.example.com', {
    proxy: 'https://proxy.company.com:8443',
    tls: { rejectUnauthorized: false }
  });
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
  if (defaults.proxy) {
    console.log(`Env proxy default detected: ${defaults.proxy.url}`);
  }

  // Create proxy client
  const client = new ProxyWebSocketClient();

  // Test 1: Direct connection (no proxy)
  console.log('\n--- Test 1: Direct Connection ---');
  try {
    const direct = await client.connect('ws://localhost:3006/ws');
    client.send(direct.id, { type: 'test', msg: 'Direct connection works!' });

    await new Promise(r => setTimeout(r, 1000));
    client.disconnect(direct.id);
  } catch (err) {
    console.error('Direct connection failed:', err);
  }

  // Test 2: Simulated proxy connection (would need actual proxy)
  console.log('\n--- Test 2: Proxy Configuration Demo ---');
  if (defaults.proxy) {
    try {
      const proxied = await client.connect(
        'ws://localhost:3006/ws',
        defaults.proxy,
        undefined,
        defaults.tls
      );
      client.send(proxied.id, { type: 'test', msg: 'Proxy defaults are configured via env.' });
      await new Promise(r => setTimeout(r, 1000));
      client.disconnect(proxied.id);
    } catch (err) {
      console.error('Proxy demo connection failed (check WS_PROXY_URL):', err);
    }
  } else {
    console.log('To use proxy:');
    console.log('  export WS_PROXY_URL="http://proxy.company.com:8080"');
    console.log('  export WS_PROXY_USERNAME="user"');
    console.log('  export WS_PROXY_PASSWORD="pass"');
    console.log('  export WS_TLS_INSECURE="true"   # optional');
  }

  // Show current stats
  console.log('\n--- Connection Stats ---');
  console.log(client.getStats());
}

runDemo().catch(console.error);

// Export for use
export { ProxyWebSocketClient, type ProxyConfig, type WebSocketConnection };
