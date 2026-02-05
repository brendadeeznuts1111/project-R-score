/**
 * Wire Mode - JSON-RPC 2.0 Type Definitions
 * Type-safe definitions for JSON-RPC 2.0 protocol messages
 */

// JSON-RPC 2.0 Request Object
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: unknown[] | Record<string, unknown>;
}

// JSON-RPC 2.0 Notification Object (request without id)
export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown[] | Record<string, unknown>;
}

// JSON-RPC 2.0 Response Object
export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: JsonRpcError;
}

// JSON-RPC 2.0 Error Object
export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

// JSON-RPC 2.0 Error Codes
export const enum JsonRpcErrorCode {
  // Standard JSON-RPC 2.0 error codes
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  
  // Server-specific error codes (reserved range: -32000 to -32099)
  SERVER_ERROR = -32000,
  
  // Application-specific error codes
  CONFIG_NOT_FOUND = -32001,
  INVALID_CONFIG = -32002,
  VALIDATION_FAILED = -32003,
  OPERATION_FAILED = -32004
}

// Wire Mode Message Types
export type WireMessage = JsonRpcRequest | JsonRpcNotification | JsonRpcResponse;
export type WireMessageBatch = WireMessage[];

// Request/Response correlation tracking
export interface RequestCorrelation {
  id: string | number | null;
  method: string;
  timestamp: number;
  resolved: boolean;
}

// Protocol parsing result
export interface ParseResult<T> {
  success: boolean;
  data?: T;
  error?: JsonRpcError;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  error?: JsonRpcError;
}

// Method registry interface
export interface MethodHandler {
  (params: unknown): Promise<unknown>;
}

export interface MethodRegistry {
  [methodName: string]: MethodHandler;
}

// Transport layer message
export interface TransportMessage {
  type: 'request' | 'response' | 'notification' | 'batch';
  payload: WireMessage | WireMessageBatch;
  raw: string;
}

// Wire mode configuration
export interface WireConfig {
  maxBatchSize: number;
  requestTimeout: number;
  enableNotifications: boolean;
  enableBatches: boolean;
}