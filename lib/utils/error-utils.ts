/**
 * 🛠️ Error Handling Utilities
 *
 * Shared utilities for consistent error handling across the codebase
 *
 * @version 1.0.0
 */

/**
 * Safely extract error message from unknown error type
 *
 * @param error - Unknown error value (could be Error, string, or anything)
 * @returns String representation of the error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}
