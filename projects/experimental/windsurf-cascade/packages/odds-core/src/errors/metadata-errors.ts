// packages/odds-core/src/errors/metadata-errors.ts - Comprehensive error handling for metadata system

/**
 * Base metadata error class
 */
export abstract class MetadataError extends Error {
  abstract readonly code: string;
  abstract readonly category: 'validation' | 'processing' | 'quality' | 'topic' | 'type';
  
  constructor(message: string, public readonly context?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get detailed error information
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      category: this.category,
      message: this.message,
      context: this.context,
      stack: this.stack
    };
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return this.message;
  }

  /**
   * Get suggested actions
   */
  getSuggestions(): string[] {
    return [];
  }
}

/**
 * Validation errors for metadata structure
 */
export class MetadataValidationError extends MetadataError {
  readonly code = 'METADATA_VALIDATION_ERROR';
  readonly category = 'validation' as const;

  constructor(message: string, public readonly validationErrors: string[] = [], context?: Record<string, any>) {
    super(message, { ...context, validationErrors });
  }

  getUserMessage(): string {
    return `Metadata validation failed: ${this.validationErrors.join(', ')}`;
  }

  getSuggestions(): string[] {
    return [
      'Check that all required fields are present',
      'Verify field types and formats',
      'Ensure metadata follows the schema',
      'Review validation error details'
    ];
  }
}

/**
 * Topic-related errors
 */
export class TopicError extends MetadataError {
  readonly code = 'TOPIC_ERROR';
  readonly category = 'topic' as const;

  constructor(message: string, public readonly invalidTopics?: string[], context?: Record<string, any>) {
    super(message, { ...context, invalidTopics });
  }

  getUserMessage(): string {
    if (this.invalidTopics?.length) {
      return `Invalid topics detected: ${this.invalidTopics.join(', ')}`;
    }
    return this.message;
  }

  getSuggestions(): string[] {
    return [
      'Use topics from the MarketTopic enum',
      'Check topic spelling and format',
      'Verify topic hierarchy (category.subcategory)',
      'Use TopicValidator to check topics before use'
    ];
  }
}

/**
 * Quality assessment errors
 */
export class QualityAssessmentError extends MetadataError {
  readonly code = 'QUALITY_ASSESSMENT_ERROR';
  readonly category = 'quality' as const;

  constructor(message: string, public readonly qualityMetric?: string, context?: Record<string, any>) {
    super(message, { ...context, qualityMetric });
  }

  getUserMessage(): string {
    return `Quality assessment failed: ${this.message}`;
  }

  getSuggestions(): string[] {
    return [
      'Check data structure and required fields',
      'Verify data types and ranges',
      'Ensure timestamp is valid and recent',
      'Use QualityAssessorFactory for appropriate assessment method'
    ];
  }
}

/**
 * Processing errors for metadata operations
 */
export class MetadataProcessingError extends MetadataError {
  readonly code = 'METADATA_PROCESSING_ERROR';
  readonly category = 'processing' as const;

  constructor(message: string, public readonly operation?: string, context?: Record<string, any>) {
    super(message, { ...context, operation });
  }

  getUserMessage(): string {
    if (this.operation) {
      return `Failed to process metadata during ${this.operation}: ${this.message}`;
    }
    return this.message;
  }

  getSuggestions(): string[] {
    return [
      'Check input data format and structure',
      'Verify all dependencies are available',
      'Ensure sufficient memory for processing',
      'Try processing in smaller batches'
    ];
  }
}

/**
 * Type safety errors
 */
export class MetadataTypeError extends MetadataError {
  readonly code = 'METADATA_TYPE_ERROR';
  readonly category = 'type' as const;

  constructor(message: string, public readonly expectedType?: string, public readonly actualType?: string, context?: Record<string, any>) {
    super(message, { ...context, expectedType, actualType });
  }

  getUserMessage(): string {
    if (this.expectedType && this.actualType) {
      return `Type mismatch: expected ${this.expectedType}, got ${this.actualType}`;
    }
    return this.message;
  }

  getSuggestions(): string[] {
    return [
      'Check TypeScript types and interfaces',
      'Verify branded type usage',
      'Use type guards for union types',
      'Ensure proper type casting'
    ];
  }
}

/**
 * Error factory for creating appropriate error instances
 */
export class MetadataErrorFactory {
  /**
   * Create validation error with detailed information
   */
  static validation(message: string, errors: string[] = [], context?: Record<string, any>): MetadataValidationError {
    return new MetadataValidationError(message, errors, context);
  }

  /**
   * Create topic error with invalid topics list
   */
  static topic(message: string, invalidTopics?: string[], context?: Record<string, any>): TopicError {
    return new TopicError(message, invalidTopics, context);
  }

  /**
   * Create quality assessment error
   */
  static quality(message: string, metric?: string, context?: Record<string, any>): QualityAssessmentError {
    return new QualityAssessmentError(message, metric, context);
  }

  /**
   * Create processing error
   */
  static processing(message: string, operation?: string, context?: Record<string, any>): MetadataProcessingError {
    return new MetadataProcessingError(message, operation, context);
  }

  /**
   * Create type error
   */
  static type(message: string, expected?: string, actual?: string, context?: Record<string, any>): MetadataTypeError {
    return new MetadataTypeError(message, expected, actual, context);
  }

  /**
   * Create error from unknown error type
   */
  static fromUnknown(error: unknown, context?: Record<string, any>): MetadataError {
    if (error instanceof MetadataError) {
      return error;
    }

    if (error instanceof Error) {
      // Determine appropriate error type based on message
      if (error.message.includes('validation') || error.message.includes('invalid')) {
        return new MetadataValidationError(error.message, [], context);
      }
      if (error.message.includes('topic')) {
        return new TopicError(error.message, [], context);
      }
      if (error.message.includes('quality')) {
        return new QualityAssessmentError(error.message, undefined, context);
      }
      if (error.message.includes('type')) {
        return new MetadataTypeError(error.message, undefined, undefined, context);
      }
      
      return new MetadataProcessingError(error.message, undefined, context);
    }

    return new MetadataProcessingError('Unknown error occurred', undefined, { ...context, originalError: error });
  }
}

/**
 * Error handler for metadata operations
 */
export class MetadataErrorHandler {
  private static errorCounts = new Map<string, number>();
  private static maxErrors = 100;

  /**
   * Handle error with logging and tracking
   */
  static handle(error: MetadataError, context?: Record<string, any>): void {
    // Track error frequency
    const errorKey = `${error.category}:${error.code}`;
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);

    // Log error details
    console.error('🔍 Metadata Error:', {
      name: error.name,
      code: error.code,
      category: error.category,
      message: error.getUserMessage(),
      suggestions: error.getSuggestions(),
      context: { ...error.context, ...context },
      timestamp: new Date().toISOString(),
      frequency: this.errorCounts.get(errorKey)
    });

    // Prevent error flooding
    if (this.errorCounts.get(errorKey)! > this.maxErrors) {
      console.warn(`⚠️ Error threshold exceeded for ${errorKey}. Consider investigating the root cause.`);
    }
  }

  /**
   * Handle error and return fallback value
   */
  static handleWithFallback<T>(
    error: MetadataError, 
    fallback: T, 
    context?: Record<string, any>
  ): T {
    this.handle(error, context);
    return fallback;
  }

  /**
   * Wrap function with error handling
   */
  static wrap<T extends any[], R>(
    fn: (...args: T) => R,
    fallback?: R,
    context?: Record<string, any>
  ): (...args: T) => R | typeof fallback {
    return (...args: T) => {
      try {
        return fn(...args);
      } catch (error) {
        const metadataError = MetadataErrorFactory.fromUnknown(error, context);
        if (fallback !== undefined) {
          return this.handleWithFallback(metadataError, fallback, context);
        }
        this.handle(metadataError, context);
        throw metadataError;
      }
    };
  }

  /**
   * Get error statistics
   */
  static getErrorStats(): Record<string, number> {
    return Object.fromEntries(this.errorCounts);
  }

  /**
   * Reset error tracking
   */
  static resetStats(): void {
    this.errorCounts.clear();
  }
}

/**
 * Utility functions for error handling
 */
export const MetadataErrorUtils = {
  /**
   * Check if error is metadata-related
   */
  isMetadataError(error: unknown): error is MetadataError {
    return error instanceof MetadataError;
  },

  /**
   * Get error category
   */
  getErrorCategory(error: unknown): string | null {
    if (error instanceof MetadataError) {
      return error.category;
    }
    return null;
  },

  /**
   * Get error suggestions
   */
  getErrorSuggestions(error: unknown): string[] {
    if (error instanceof MetadataError) {
      return error.getSuggestions();
    }
    return ['Check the error details and try again'];
  },

  /**
   * Format error for user display
   */
  formatErrorForUser(error: unknown): string {
    if (error instanceof MetadataError) {
      return error.getUserMessage();
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'An unknown error occurred';
  },

  /**
   * Create safe result wrapper
   */
  safeResult<T>(operation: () => T, fallback: T): { success: true; result: T } | { success: false; error: MetadataError; result: T } {
    try {
      const result = operation();
      return { success: true, result };
    } catch (error) {
      const metadataError = MetadataErrorFactory.fromUnknown(error);
      MetadataErrorHandler.handle(metadataError);
      return { success: false, error: metadataError, result: fallback };
    }
  }
};
