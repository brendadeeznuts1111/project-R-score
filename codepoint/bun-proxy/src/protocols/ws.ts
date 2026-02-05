// @bun/proxy/protocols/ws.ts - WebSocket proxy implementation (Code Point: 0x120-0x12F)

import { ProxyServer, ProxyServerConfig } from '../core/server';

// WebSocket-specific configuration
export interface WebSocketProxyConfig extends ProxyServerConfig {
  target?: string;
  protocols?: string[];
  origin?: string;
  subprotocol?: string;
  heartbeat?: {
    enabled?: boolean;
    interval?: number;
    timeout?: number;
  };
  messageBuffer?: {
    enabled?: boolean;
    maxSize?: number;
    compression?: boolean;
  };
  reconnection?: {
    enabled?: boolean;
    maxAttempts?: number;
    delay?: number;
  };
}

// WebSocket connection state
export enum WebSocketConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  CLOSING = 'closing',
  CLOSED = 'closed',
  ERROR = 'error'
}

// WebSocket proxy server implementation
export class WebSocketProxy extends ProxyServer {
  private server?: any; // Bun WebSocket server
  private connections = new Map<string, WebSocketConnection>();

  constructor(config: WebSocketProxyConfig = {}) {
    super({
      protocol: 'ws',
      port: 8080,
      ...config
    });
  }

  protected async initializeServer(): Promise<void> {
    const config = this.config as WebSocketProxyConfig;

    // Create Bun WebSocket server
    this.server = Bun.serve({
      hostname: config.host || 'localhost',
      port: config.port || 8080,
      fetch: this.handleHTTPUpgrade.bind(this),
      websocket: {
        open: this.handleWebSocketOpen.bind(this),
        message: this.handleWebSocketMessage.bind(this),
        close: this.handleWebSocketClose.bind(this),
        error: this.handleWebSocketError.bind(this)
      }
    });

    console.log(`🔌 WebSocket Proxy listening on ws://${config.host}:${config.port}`);
  }

  protected async cleanup(): Promise<void> {
    if (this.server) {
      // Close all WebSocket connections
      for (const [id, connection] of this.connections) {
        try {
          await connection.close(1000, 'Server shutdown');
        } catch (error) {
          console.error(`Error closing connection ${id}:`, error);
        }
      }
      this.connections.clear();

      this.server.stop();
      this.server = undefined;
    }
  }

  protected async createConnection(id: string, options: any = {}): Promise<any> {
    // WebSocket connections are handled by Bun's WebSocket API
    return {
      id,
      type: 'websocket',
      created: new Date(),
      options,
      close: () => Promise.resolve()
    };
  }

  // Handle HTTP upgrade to WebSocket
  private async handleHTTPUpgrade(request: Request): Promise<Response> {
    const config = this.config as WebSocketProxyConfig;
    const url = new URL(request.url);

    // Check if this is a WebSocket upgrade request
    const upgrade = request.headers.get('upgrade');
    if (upgrade?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 400 });
    }

    // Build target WebSocket URL
    let targetUrl: string;
    if (config.target) {
      const targetUrlObj = new URL(config.target);
      targetUrlObj.pathname = url.pathname;
      targetUrlObj.search = url.search;
      targetUrl = targetUrlObj.toString().replace(/^http/, 'ws');
    } else {
      // Default to localhost with different port
      const targetPort = config.port === 8080 ? 3001 : config.port! + 1;
      targetUrl = `ws://localhost:${targetPort}${url.pathname}${url.search}`;
    }

    try {
      // Create connection to target WebSocket server
      const targetWs = new WebSocket(targetUrl, config.protocols);

      // Wait for target connection
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Target WebSocket connection timeout'));
        }, 10000);

        targetWs.onopen = () => {
          clearTimeout(timeout);
          resolve(undefined);
        };

        targetWs.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });

      // Upgrade to WebSocket
      const success = this.server?.upgrade(request);
      if (!success) {
        targetWs.close();
        return new Response('WebSocket upgrade failed', { status: 500 });
      }

      return new Response(); // WebSocket upgrade response

    } catch (error) {
      console.error('WebSocket proxy upgrade failed:', error);
      return new Response('WebSocket proxy error', { status: 502 });
    }
  }

  // Handle WebSocket connection open
  private handleWebSocketOpen(ws: WebSocket) {
    const connectionId = this.generateConnectionId();

    // Create WebSocket connection wrapper
    const connection = new WebSocketConnection(connectionId, ws, this.config as WebSocketProxyConfig);
    this.connections.set(connectionId, connection);

    this.stats.activeConnections++;
    this.stats.totalConnections++;

    console.log(`🔌 WebSocket connection opened: ${connectionId}`);

    // Setup heartbeat if enabled
    const config = this.config as WebSocketProxyConfig;
    if (config.heartbeat?.enabled) {
      connection.startHeartbeat();
    }

    this.emit('connection', { id: connectionId, type: 'websocket' });
  }

  // Handle WebSocket messages
  private handleWebSocketMessage(ws: WebSocket, message: string | Buffer) {
    // Find connection by WebSocket instance
    const connection = Array.from(this.connections.values()).find(conn => conn.ws === ws);

    if (connection) {
      this.stats.totalRequests++;
      connection.handleMessage(message);
    }
  }

  // Handle WebSocket connection close
  private handleWebSocketClose(ws: WebSocket, code: number, reason: string) {
    const connection = Array.from(this.connections.values()).find(conn => conn.ws === ws);

    if (connection) {
      connection.close(code, reason);
      this.connections.delete(connection.id);
      this.stats.activeConnections--;

      console.log(`🔌 WebSocket connection closed: ${connection.id} (${code})`);
      this.emit('disconnection', { id: connection.id, code, reason });
    }
  }

  // Handle WebSocket errors
  private handleWebSocketError(ws: WebSocket, error: Error) {
    const connection = Array.from(this.connections.values()).find(conn => conn.ws === ws);

    if (connection) {
      console.error(`WebSocket error for ${connection.id}:`, error);
      this.stats.errors++;
      this.emit('connectionError', { id: connection.id, error });
    }
  }

  // Get WebSocket connections
  getWebSocketConnections() {
    return Array.from(this.connections.entries()).map(([id, connection]) => ({
      id,
      state: connection.state,
      uptime: Date.now() - connection.created.getTime(),
      messagesSent: connection.messagesSent,
      messagesReceived: connection.messagesReceived,
      bytesTransferred: connection.bytesTransferred
    }));
  }
}

// WebSocket connection wrapper class
class WebSocketConnection {
  public id: string;
  public ws: WebSocket;
  public targetWs?: WebSocket;
  public state: WebSocketConnectionState = WebSocketConnectionState.CONNECTING;
  public created: Date = new Date();
  public messagesSent: number = 0;
  public messagesReceived: number = 0;
  public bytesTransferred: number = 0;
  private heartbeatInterval?: NodeJS.Timeout;
  private config: WebSocketProxyConfig;

  constructor(id: string, ws: WebSocket, config: WebSocketProxyConfig) {
    this.id = id;
    this.ws = ws;
    this.config = config;

    this.setupConnection();
  }

  private async setupConnection() {
    try {
      // Connect to target WebSocket server
      const targetUrl = this.buildTargetUrl();
      this.targetWs = new WebSocket(targetUrl, this.config.protocols);

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Target connection timeout'));
        }, this.config.timeout || 30000);

        this.targetWs!.onopen = () => {
          clearTimeout(timeout);
          this.state = WebSocketConnectionState.CONNECTED;
          resolve(undefined);
        };

        this.targetWs!.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };

        this.targetWs!.onmessage = (event) => {
          // Forward messages from target to client
          if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(event.data);
            this.messagesSent++;
            this.updateBytesTransferred(event.data);
          }
        };

        this.targetWs!.onclose = (code, reason) => {
          this.close(code, reason);
        };
      });

      // Setup message forwarding from client to target
      this.ws.onmessage = (event) => {
        if (this.targetWs?.readyState === WebSocket.OPEN) {
          this.targetWs.send(event.data);
          this.messagesReceived++;
          this.updateBytesTransferred(event.data);
        }
      };

    } catch (error) {
      this.state = WebSocketConnectionState.ERROR;
      console.error(`WebSocket connection setup failed for ${this.id}:`, error);
      this.close(1011, 'Connection setup failed');
    }
  }

  private buildTargetUrl(): string {
    // This would be implemented based on the request URL
    // For now, return a default target
    const config = this.config;
    if (config.target) {
      return config.target.replace(/^http/, 'ws');
    }
    const targetPort = config.port === 8080 ? 3001 : config.port! + 1;
    return `ws://localhost:${targetPort}`;
  }

  private updateBytesTransferred(data: any) {
    if (typeof data === 'string') {
      this.bytesTransferred += Buffer.byteLength(data, 'utf8');
    } else if (data instanceof Buffer) {
      this.bytesTransferred += data.length;
    } else if (data instanceof ArrayBuffer) {
      this.bytesTransferred += data.byteLength;
    }
  }

  // Start heartbeat monitoring
  startHeartbeat() {
    const config = this.config.heartbeat;
    if (!config?.enabled) return;

    this.heartbeatInterval = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, config.interval || 30000);
  }

  // Stop heartbeat
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  // Handle incoming messages
  handleMessage(message: string | Buffer) {
    // Apply any message transformations here
    const config = this.config.messageBuffer;

    if (config?.enabled) {
      // Buffer and potentially compress messages
      // Implementation would go here
    }

    // Forward to target
    if (this.targetWs?.readyState === WebSocket.OPEN) {
      this.targetWs.send(message);
      this.messagesReceived++;
      this.updateBytesTransferred(message);
    }
  }

  // Close connection
  close(code: number = 1000, reason: string = '') {
    this.state = WebSocketConnectionState.CLOSING;

    this.stopHeartbeat();

    try {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(code, reason);
      }
    } catch (error) {
      console.error(`Error closing client WebSocket ${this.id}:`, error);
    }

    try {
      if (this.targetWs?.readyState === WebSocket.OPEN) {
        this.targetWs.close(code, reason);
      }
    } catch (error) {
      console.error(`Error closing target WebSocket ${this.id}:`, error);
    }

    this.state = WebSocketConnectionState.CLOSED;
  }
}

// Factory function to create WebSocket proxy
export function createWebSocketProxy(config?: WebSocketProxyConfig): WebSocketProxy {
  return new WebSocketProxy(config);
}

// Export default
export default WebSocketProxy;