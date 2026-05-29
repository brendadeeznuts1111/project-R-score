#!/usr/bin/env bun
/**
 * 🛡️ FactoryWager Error Handler Utility
 * 
 * Consistent error handling across the codebase
 */

/**
 * Safely extract error message from unknown error type
 */
export function getErrorMessage(error: unknown, fallback: string = 'Unknown error'): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return String(error);
  } catch {
    return fallback;
  }
}

/**
 * Handle error with context and optional logging
 */
export function handleError(
  error: unknown,
  context: string,
  options: {
    log?: boolean;
    logStack?: boolean;
  } = { log: true, logStack: false }
): string {
  const message = getErrorMessage(error);
  
  if (options.log) {
    if (error instanceof Error && options.logStack && error.stack) {
      console.error(`[${context}] ${message}`, error.stack);
    } else {
      console.error(`[${context}] ${message}`);
    }
  }
  
  return message;
}
