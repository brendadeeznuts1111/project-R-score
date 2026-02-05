/**
 * JSON-RPC 2.0 Error Code Definitions
 * Standard and application-specific error codes for Wire mode
 */

import { JsonRpcErrorCode } from '@types/wire.types';

/**
 * Error code to message mapping
 */
export const ERROR_MESSAGES: Record<number, string> = {
  // Standard JSON-RPC 2.0 errors
  [JsonRpcErrorCode.PARSE_ERROR]: 'Parse error',
  [JsonRpcErrorCode.INVALID_REQUEST]: 'Invalid request',
  [JsonRpcErrorCode.METHOD_NOT_FOUND]: 'Method not found',
  [JsonRpcErrorCode.INVALID_PARAMS]: 'Invalid params',
  [JsonRpcErrorCode.INTERNAL_ERROR]: 'Internal error',
  
  // Server-specific errors
  [JsonRpcErrorCode.SERVER_ERROR]: 'Server error',
  
  // Application-specific errors
  [JsonRpcErrorCode.CONFIG_NOT_FOUND]: 'Configuration not found',
  [JsonRpcErrorCode.INVALID_CONFIG]: 'Invalid configuration',
  [JsonRpcErrorCode.VALIDATION_FAILED]: 'Validation failed',
  [JsonRpcErrorCode.OPERATION_FAILED]: 'Operation failed'
};

/**
 * Get error message for a given error code
 */
export function getErrorMessage(code: number): string {
  return ERROR_MESSAGES[code] || 'Unknown error';
}

/**
 * Check if error code is a standard JSON-RPC error
 */
export function isStandardError(code: number): boolean {
  return code >= -32700 && code <= -32600;
}

/**
 * Check if error code is a server error (reserved range)
 */
export function isServerError(code: number): boolean {
  return code >= -32099 && code <= -32000;
}

/**
 * Check if error code is an application-specific error
 */
export function isApplicationError(code: number): boolean {
  return code < -32100 || code > -32000;
}

/**
 * Create a standard parse error
 */
export function createParseError(data?: unknown): { code: number; message: string; data?: unknown } {
  return {
    code: JsonRpcErrorCode.PARSE_ERROR,
    message: ERROR_MESSAGES[JsonRpcErrorCode.PARSE_ERROR],
    data
  };
}

/**
 * Create an invalid request error
 */
export function createInvalidRequestError(data?: unknown): { code: number; message: string; data?: unknown } {
  return {
    code: JsonRpcErrorCode.INVALID_REQUEST,
    message: ERROR_MESSAGES[JsonRpcErrorCode.INVALID_REQUEST],
    data
  };
}

/**
 * Create a method not found error
 */
export function createMethodNotFoundError(method: string): { code: number; message: string; data: string } {
  return {
    code: JsonRpcErrorCode.METHOD_NOT_FOUND,
    message: ERROR_MESSAGES[JsonRpcErrorCode.METHOD_NOT_FOUND],
    data: method
  };
}

/**
 * Create an invalid params error
 */
export function createInvalidParamsError(data?: unknown): { code: number; message: string; data?: unknown } {
  return {
    code: JsonRpcErrorCode.INVALID_PARAMS,
    message: ERROR_MESSAGES[JsonRpcErrorCode.INVALID_PARAMS],
    data
  };
}

/**
 * Create an internal error
 */
export function createInternalError(data?: unknown): { code: number; message: string; data?: unknown } {
  return {
    code: JsonRpcErrorCode.INTERNAL_ERROR,
    message: ERROR_MESSAGES[JsonRpcErrorCode.INTERNAL_ERROR],
    data
  };
}

/**
 * Create a server error
 */
export function createServerError(message: string, data?: unknown): { code: number; message: string; data?: unknown } {
  return {
    code: JsonRpcErrorCode.SERVER_ERROR,
    message,
    data
  };
}

/**
 * Create an application-specific error
 */
export function createApplicationError(
  code: JsonRpcErrorCode,
  message: string,
  data?: unknown
): { code: number; message: string; data?: unknown } {
  return {
    code,
    message,
    data
  };
}