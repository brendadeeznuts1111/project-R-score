// @bun/proxy/protocols/secure-websocket-proxy.ts - Secure WebSocket proxy implementation
import type { WebSocketProxyConfiguration } from './index.js';
import { WebSocketProxy } from './websocket-proxy.js';

export class SecureWebSocketProxy extends WebSocketProxy {
  constructor(configuration: WebSocketProxyConfiguration) {
    super(configuration);
  }
}
