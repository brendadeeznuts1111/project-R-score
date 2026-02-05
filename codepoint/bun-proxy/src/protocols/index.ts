// @bun/proxy/protocols/index.ts - Enhanced with better method names
import { HTTPProxy } from './http-proxy.js';
import { HTTPSProxy } from './https-proxy.js';
import { SecureWebSocketProxy } from './secure-websocket-proxy.js';
import { SOCKS5Proxy } from './socks5-proxy.js';
import { WebSocketProxy } from './websocket-proxy.js';

export interface ProtocolConfiguration {
  protocolType: 'http' | 'https' | 'websocket' | 'wss' | 'socks5';
  endpointUrl: string;
  connectionTimeoutMilliseconds: number;
  maximumRetryAttempts: number;
  retryDelayMilliseconds: number;
  enableCompression: boolean;
  customHeaders?: Record<string, string>;
  authentication?: AuthenticationData;
}

export interface AuthenticationData {
  authenticationType: 'bearer' | 'basic' | 'api-key' | 'jwt';
  tokenValue?: string;
  username?: string;
  password?: string;
  jwtSecret?: string;
}

export interface HTTPProxyConfiguration extends ProtocolConfiguration {
  followRedirects: boolean;
  maximumRedirects: number;
  enableKeepAlive: boolean;
  enableHttp2: boolean;
  proxyConfiguration?: any; // Will be typed when core is complete
}

export interface WebSocketProxyConfiguration extends ProtocolConfiguration {
  subprotocols: string[];
  maximumMessageSizeBytes: number;
  handshakeTimeoutMilliseconds: number;
  protocolVersion: number;
  originHeader?: string;
}

export class ProtocolFactory {
  static createProtocol(
    configuration: ProtocolConfiguration
  ): HTTPProxy | HTTPSProxy | WebSocketProxy | SecureWebSocketProxy | SOCKS5Proxy {
    switch (configuration.protocolType) {
      case 'http':
        return new HTTPProxy(configuration as HTTPProxyConfiguration);
      case 'https':
        return new HTTPSProxy(configuration as HTTPProxyConfiguration);
      case 'websocket':
        return new WebSocketProxy(configuration as WebSocketProxyConfiguration);
      case 'wss':
        return new SecureWebSocketProxy(configuration as WebSocketProxyConfiguration);
      case 'socks5':
        return new SOCKS5Proxy(configuration);
      default:
        throw new Error(`Unsupported protocol type: ${configuration.protocolType}`);
    }
  }

  static createHTTPProxy(configuration: HTTPProxyConfiguration): HTTPProxy {
    return new HTTPProxy(configuration);
  }

  static createHTTPSProxy(configuration: HTTPProxyConfiguration): HTTPSProxy {
    return new HTTPSProxy(configuration);
  }

  static createWebSocketProxy(configuration: WebSocketProxyConfiguration): WebSocketProxy {
    return new WebSocketProxy(configuration);
  }

  static createSecureWebSocketProxy(configuration: WebSocketProxyConfiguration): SecureWebSocketProxy {
    return new SecureWebSocketProxy(configuration);
  }

  static createSOCKS5Proxy(configuration: ProtocolConfiguration): SOCKS5Proxy {
    return new SOCKS5Proxy(configuration);
  }
}

export {
    HTTPProxy,
    HTTPSProxy, SOCKS5Proxy, SecureWebSocketProxy, WebSocketProxy
};
