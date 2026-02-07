// lib/utils/error-utils.ts — Error handling utilities

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
