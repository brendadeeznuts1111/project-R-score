/**
 * Structured error types for ShortcutRegistry
 */

export class ShortcutRegistryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ShortcutRegistryError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ShortcutNotFoundError extends ShortcutRegistryError {
  constructor(shortcutId: string) {
    super(`Shortcut not found: ${shortcutId}`, 'SHORTCUT_NOT_FOUND', { shortcutId });
    this.name = 'ShortcutNotFoundError';
  }
}

export class ProfileNotFoundError extends ShortcutRegistryError {
  constructor(profileId: string) {
    super(`Profile not found: ${profileId}`, 'PROFILE_NOT_FOUND', { profileId });
    this.name = 'ProfileNotFoundError';
  }
}

export class ProfileLockedError extends ShortcutRegistryError {
  constructor(profileId: string) {
    super(`Profile is locked: ${profileId}`, 'PROFILE_LOCKED', { profileId });
    this.name = 'ProfileLockedError';
  }
}

export class ConflictError extends ShortcutRegistryError {
  constructor(
    key: string,
    conflictingActions: string[],
    public readonly severity: 'low' | 'medium' | 'high'
  ) {
    super(
      `Key conflict detected: ${key} is used by ${conflictingActions.join(', ')}`,
      'CONFLICT',
      { key, conflictingActions, severity }
    );
    this.name = 'ConflictError';
  }
}

export class InvalidKeyCombinationError extends ShortcutRegistryError {
  constructor(keyCombination: string, reason?: string) {
    super(
      `Invalid key combination: ${keyCombination}${reason ? ` - ${reason}` : ''}`,
      'INVALID_KEY_COMBINATION',
      { keyCombination, reason }
    );
    this.name = 'InvalidKeyCombinationError';
  }
}

export class ValidationError extends ShortcutRegistryError {
  constructor(message: string, field?: string, value?: any) {
    super(message, 'VALIDATION_ERROR', { field, value });
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends ShortcutRegistryError {
  constructor(message: string, operation?: string, originalError?: Error) {
    super(
      `Database error${operation ? ` during ${operation}` : ''}: ${message}`,
      'DATABASE_ERROR',
      { operation, originalError: originalError?.message }
    );
    this.name = 'DatabaseError';
    if (originalError) {
      this.cause = originalError;
    }
  }
}

export class MigrationError extends ShortcutRegistryError {
  constructor(message: string, version?: number) {
    super(
      `Migration error${version ? ` at version ${version}` : ''}: ${message}`,
      'MIGRATION_ERROR',
      { version }
    );
    this.name = 'MigrationError';
  }
}

/**
 * Error recovery utilities
 */
export class ErrorRecovery {
  /**
   * Retry an operation with exponential backoff
   */
  static async retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Check if error is recoverable
   */
  static isRecoverable(error: Error): boolean {
    if (error instanceof DatabaseError) {
      // Database connection errors might be recoverable
      return error.message.includes('locked') || error.message.includes('busy');
    }
    return false;
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: Error): string {
    if (error instanceof ShortcutRegistryError) {
      return error.message;
    }
    
    // Generic fallback
    return 'An unexpected error occurred. Please try again.';
  }
}
