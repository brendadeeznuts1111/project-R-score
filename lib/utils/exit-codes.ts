/**
 * 🚪 Standardized Exit Codes for FactoryWager Applications
 * 
 * Provides consistent exit codes across all CLI tools for better
 * automation and error handling.
 */

export const EXIT_CODES = {
  SUCCESS: 0,
  INVALID_INPUT: 1,
  SYSTEM_ERROR: 2,
  NETWORK_ERROR: 3,
  AUTHENTICATION_ERROR: 4,
  PERMISSION_ERROR: 5,
  FILE_NOT_FOUND: 6,
  VALIDATION_ERROR: 7,
  TIMEOUT_ERROR: 8,
  MEMORY_ERROR: 9,
  CONFIGURATION_ERROR: 10,
} as const;

export type ExitCode = typeof EXIT_CODES[keyof typeof EXIT_CODES];

/**
 * Get a human-readable description for an exit code
 */
export function getExitCodeDescription(code: ExitCode): string {
  const descriptions: Record<ExitCode, string> = {
    [EXIT_CODES.SUCCESS]: 'Success',
    [EXIT_CODES.INVALID_INPUT]: 'Invalid input or parameters',
    [EXIT_CODES.SYSTEM_ERROR]: 'System error occurred',
    [EXIT_CODES.NETWORK_ERROR]: 'Network connectivity issue',
    [EXIT_CODES.AUTHENTICATION_ERROR]: 'Authentication failed',
    [EXIT_CODES.PERMISSION_ERROR]: 'Insufficient permissions',
    [EXIT_CODES.FILE_NOT_FOUND]: 'File or resource not found',
    [EXIT_CODES.VALIDATION_ERROR]: 'Data validation failed',
    [EXIT_CODES.TIMEOUT_ERROR]: 'Operation timed out',
    [EXIT_CODES.MEMORY_ERROR]: 'Memory allocation failed',
    [EXIT_CODES.CONFIGURATION_ERROR]: 'Configuration error',
  };
  
  return descriptions[code] || `Unknown exit code: ${code}`;
}

/**
 * Exit the process with a standardized exit code and optional message
 */
export function exitWithCode(code: ExitCode, message?: string): never {
  if (message) {
    if (code === EXIT_CODES.SUCCESS) {
      console.log(message);
    } else {
      console.error(message);
    }
  }
  
  process.exit(code);
}
