/**
 * Development Server Types
 * Shared types and interfaces for HMR development server operations
 */

import type { BaseEntity } from '../shared/common';

export type ServerMode = 'development' | 'production' | 'test';

export type FileChangeType = 'add' | 'modify' | 'delete' | 'rename';

export type HMRMessageType = 'connect' | 'disconnect' | 'file-change' | 'reload' | 'error' | 'log';

export interface ServerConfig {
  port: number;
  host: string;
  mode: ServerMode;
  watchPaths: string[];
  ignoredPaths: string[];
  hmrEnabled: boolean;
  liveReloadEnabled: boolean;
  corsEnabled: boolean;
  compressionEnabled: boolean;
  cacheEnabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxConnections: number;
  timeout: number;
}

export interface FileChangeEvent {
  type: FileChangeType;
  path: string;
  oldPath?: string;
  timestamp: Date;
  size?: number;
  mtime?: Date;
}

export interface HMRMessage {
  type: HMRMessageType;
  payload: any;
  timestamp: Date;
  clientId?: string;
}

export interface WebSocketClient {
  id: string;
  socket: any; // WebSocket instance
  connectedAt: Date;
  lastActivity: Date;
  userAgent: string;
  ipAddress: string;
  subscribedPaths: string[];
  isAlive: boolean;
}

export interface HTTPRequest extends Request {
  clientId?: string;
  sessionId?: string;
  startTime: Date;
}

export interface HTTPResponse extends Response {
  processingTime?: number;
  cacheHit?: boolean;
  compressed?: boolean;
}

export interface ServerStats {
  uptime: number;
  totalRequests: number;
  activeConnections: number;
  websocketClients: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  fileChanges: number;
  hmrMessages: number;
  errors: number;
  averageResponseTime: number;
}

export interface RouteHandler {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  path: string;
  pattern: RegExp;
  handler: (request: HTTPRequest) => Promise<HTTPResponse>;
  middleware?: MiddlewareFunction[];
}

export interface MiddlewareFunction {
  name: string;
  handler: (request: HTTPRequest, next: () => Promise<HTTPResponse>) => Promise<HTTPResponse>;
}

export interface StaticFileConfig {
  root: string;
  index: string;
  extensions: string[];
  maxAge: number;
  etag: boolean;
  lastModified: boolean;
  compress: boolean;
}

export interface WatchConfig {
  paths: string[];
  ignored: string[];
  debounceMs: number;
  usePolling: boolean;
  interval: number;
}

export interface HMRConfig {
  enabled: boolean;
  port: number;
  heartbeatInterval: number;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  overlay: boolean;
}

export interface LogEntry extends BaseEntity {
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  message: string;
  category: string;
  data?: Record<string, any>;
  requestId?: string;
  clientId?: string;
  sessionId?: string;
  timestamp: Date;
  source: string;
}

// Development UI Types
export interface DevUIConfig {
  title: string;
  theme: 'light' | 'dark' | 'auto';
  showStats: boolean;
  showLogs: boolean;
  showHMR: boolean;
  customCSS?: string;
  customJS?: string;
}

export interface DevUIPage {
  path: string;
  title: string;
  content: string;
  scripts: string[];
  styles: string[];
  data?: Record<string, any>;
}

// Error Types
export interface ServerError extends Error {
  code: string;
  statusCode: number;
  details?: Record<string, any>;
  stack?: string;
}

// Export utility types
export type ServerConfigCreate = Omit<ServerConfig, 'mode'>;
export type RouteHandlerCreate = Omit<RouteHandler, 'pattern'>;
export type WebSocketClientCreate = Omit<WebSocketClient, 'id' | 'connectedAt' | 'lastActivity'>;

// Export type guards
export function isFileChangeEvent(obj: any): obj is FileChangeEvent {
  return obj && typeof obj.type === 'string' && typeof obj.path === 'string';
}

export function isHMRMessage(obj: any): obj is HMRMessage {
  return obj && typeof obj.type === 'string' && obj.timestamp instanceof Date;
}

export function isWebSocketClient(obj: any): obj is WebSocketClient {
  return obj && typeof obj.id === 'string' && obj.connectedAt instanceof Date;
}

export function isServerError(obj: any): obj is ServerError {
  return obj && obj instanceof Error && typeof obj.code === 'string';
}
