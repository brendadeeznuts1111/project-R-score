#!/usr/bin/env bun

import { randomUUIDv7 } from 'bun';
import type { 
  DocumentationResult as CoreDocumentationResult 
} from '../../../packages/odds-core/src/error/error-handler.js';
import type { 
  MCPToolError, 
  ErrorType, 
  ErrorTypes, 
  DocumentationResult 
} from '../schemas/types.js';

// Enhanced error types for MCP server
export const MCPErrors = {
  VALIDATION: 'VALIDATION_ERROR' as ErrorType,
  EXECUTION: 'EXECUTION_ERROR' as ErrorType,
  FILE_SYSTEM: 'FILE_SYSTEM_ERROR' as ErrorType,
  NETWORK: 'NETWORK_ERROR' as ErrorType,
  BUN_RUNTIME: 'BUN_RUNTIME_ERROR' as ErrorType,
  DEPENDENCY: 'DEPENDENCY_ERROR' as ErrorType,
  PERMISSION: 'PERMISSION_ERROR' as ErrorType,
  TIMEOUT: 'TIMEOUT_ERROR' as ErrorType,
  CONFIGURATION: 'CONFIGURATION_ERROR' as ErrorType,
  RESOURCE_EXHAUSTED: 'RESOURCE_EXHAUSTED_ERROR' as ErrorType,
  DATABASE: 'DATABASE_ERROR' as ErrorType,
} as const;

export interface MCPErrorContext {
  timestamp: number;
  sessionId?: string;
  requestId?: string;
  userId?: string;
  toolName?: string;
  operation?: string;
  package?: string;
  function?: string;
  line?: number;
  column?: number;
  bunVersion?: string;
  platform?: string;
}

export interface EnhancedMCPToolError extends Omit<MCPToolError, 'code'> {
  code: ErrorType;
  errorId: string;
  timestamp: number;
  bunVersion?: string;
  platform?: string;
  stack?: string;
  suggestions: string[];
  documentation?: DocumentationResult[];
  recoveryActions?: string[];
}

export class MCPErrorHandler {
  private errorMetrics = new Map<string, number>();

  constructor() {
    // Initialize error metrics tracking
    this.initializeMetrics();
  }

  /**
   * Enhanced error handling with automatic documentation search and recovery suggestions
   */
  async handleError(
    error: Error | string, 
    context: MCPErrorContext,
    errorType: ErrorType = MCPErrors.EXECUTION
  ): Promise<EnhancedMCPToolError> {
    const errorId = randomUUIDv7();
    const timestamp = Date.now();
    
    // Normalize error input
    const normalizedError = typeof error === 'string' 
      ? new Error(error) 
      : error;

    // Create enhanced error object
    const enhancedError: EnhancedMCPToolError = {
      code: errorType,
      message: normalizedError.message,
      errorId,
      timestamp,
      context: {
        ...context,
        bunVersion: Bun.version,
        platform: process.platform,
      },
      suggestions: [],
      documentation: [],
      recoveryActions: [],
      stack: normalizedError.stack,
    };

    // Generate enhanced suggestions based on error type
    enhancedError.suggestions = this.generateEnhancedSuggestions(normalizedError, errorType, enhancedError.suggestions);
    
    // Generate recovery actions
    enhancedError.recoveryActions = this.generateRecoveryActions(errorType, enhancedError.context);

    // Track error metrics
    this.trackError(errorType, enhancedError.errorId);

    return enhancedError;
  }

  /**
   * Generate enhanced suggestions based on error type and context
   */
  private generateEnhancedSuggestions(
    error: Error, 
    errorType: ErrorType, 
    existingSuggestions: string[]
  ): string[] {
    const suggestions = [...existingSuggestions];
    const message = error.message.toLowerCase();

    switch (errorType) {
      case MCPErrors.VALIDATION:
        suggestions.push('Check input parameters against the schema definition');
        suggestions.push('Verify all required fields are present');
        suggestions.push('Ensure data types match expected formats');
        break;

      case MCPErrors.EXECUTION:
        suggestions.push('Check if the command or operation is supported by your system');
        suggestions.push('Verify you have necessary permissions');
        suggestions.push('Review the operation logs for detailed error information');
        break;

      case MCPErrors.BUN_RUNTIME:
        suggestions.push('Ensure you are using a compatible Bun version (1.3.0+)');
        suggestions.push('Check Bun documentation for the specific API');
        suggestions.push('Verify Bun is properly installed and accessible');
        break;

      case MCPErrors.FILE_SYSTEM:
        suggestions.push('Check file/directory permissions');
        suggestions.push('Verify the file path exists');
        suggestions.push('Ensure sufficient disk space is available');
        break;

      case MCPErrors.NETWORK:
        suggestions.push('Check network connectivity');
        suggestions.push('Verify the remote service is accessible');
        suggestions.push('Check firewall and proxy settings');
        break;

      case MCPErrors.DEPENDENCY:
        suggestions.push('Run "bun install" to ensure dependencies are installed');
        suggestions.push('Check package.json for version compatibility');
        suggestions.push('Verify package names are spelled correctly');
        break;

      case MCPErrors.TIMEOUT:
        suggestions.push('Increase timeout duration for long-running operations');
        suggestions.push('Check system resources and performance');
        suggestions.push('Consider breaking large operations into smaller chunks');
        break;

      case MCPErrors.PERMISSION:
        suggestions.push('Run with appropriate user permissions');
        suggestions.push('Check file system permissions');
        suggestions.push('Verify system security policies');
        break;
    }

    // Add common suggestions based on error patterns
    if (message.includes('cannot find module') || message.includes('module not found')) {
      suggestions.push('Run "bun install" to install missing dependencies');
      suggestions.push('Check if the module is properly listed in package.json');
    }

    if (message.includes('permission denied')) {
      suggestions.push('Check file or directory permissions');
      suggestions.push('Try running the command with elevated permissions if appropriate');
    }

    if (message.includes('port') && message.includes('already in use')) {
      suggestions.push('Use a different port number');
      suggestions.push('Check if another process is using the port: lsof -i :<port>');
    }

    return [...new Set(suggestions)].slice(0, 8); // Limit to 8 suggestions
  }

  /**
   * Generate recovery actions based on error type
   */
  private generateRecoveryActions(errorType: ErrorType, context: Record<string, any>): string[] {
    const actions: string[] = [];

    switch (errorType) {
      case MCPErrors.VALIDATION:
        actions.push('Validate input against the tool schema');
        actions.push('Check tool documentation for required parameters');
        break;

      case MCPErrors.EXECUTION:
        actions.push('Retry the operation with different parameters');
        actions.push('Check system logs for detailed error information');
        break;

      case MCPErrors.BUN_RUNTIME:
        actions.push('Update Bun to the latest version');
        actions.push('Restart the MCP server');
        break;

      case MCPErrors.FILE_SYSTEM:
        actions.push('Check available disk space');
        actions.push('Verify file permissions');
        break;

      case MCPErrors.NETWORK:
        actions.push('Check network connectivity');
        actions.push('Retry after a brief delay');
        break;

      case MCPErrors.DEPENDENCY:
        actions.push('Run dependency installation');
        actions.push('Check package compatibility');
        break;
    }

    return actions;
  }

  /**
   * Create a structured error response for MCP tools
   */
  createErrorResponse<T extends 'text' = 'text'>(error: EnhancedMCPToolError): {
    content: Array<{
      type: T;
      text: string;
    }>;
    isError: boolean;
  } {
    const errorText = [
      `❌ **MCP Tool Error**`,
      ``,
      `**Error ID:** ${error.errorId}`,
      `**Type:** ${error.code}`,
      `**Message:** ${error.message}`,
      `**Timestamp:** ${new Date(error.timestamp).toISOString()}`,
      ``,
    ];

    if (error.suggestions.length > 0) {
      errorText.push(`💡 **Suggestions:**`);
      error.suggestions.forEach((suggestion, index) => {
        errorText.push(`${index + 1}. ${suggestion}`);
      });
      errorText.push('');
    }

    if (error.documentation && error.documentation.length > 0) {
      errorText.push(`📚 **Related Documentation:**`);
      error.documentation.forEach((doc, index) => {
        errorText.push(`${index + 1}. **${doc.title}**`);
        errorText.push(`   ${doc.description}`);
        if (doc.url) {
          errorText.push(`   🔗 ${doc.url}`);
        }
        errorText.push('');
      });
    }

    if (error.recoveryActions && error.recoveryActions.length > 0) {
      errorText.push(`🔄 **Recovery Actions:**`);
      error.recoveryActions.forEach((action, index) => {
        errorText.push(`${index + 1}. ${action}`);
      });
      errorText.push('');
    }

    return {
      content: [
        {
          type: 'text' as T,
          text: errorText.join('\n')
        }
      ],
      isError: true,
    };
  }

  /**
   * Initialize error metrics tracking
   */
  private initializeMetrics(): void {
    Object.values(MCPErrors).forEach(errorType => {
      this.errorMetrics.set(errorType, 0);
    });
  }

  /**
   * Track error occurrence
   */
  private trackError(errorType: ErrorType, errorId: string): void {
    const currentCount = this.errorMetrics.get(errorType) || 0;
    this.errorMetrics.set(errorType, currentCount + 1);

    // Log error for monitoring (in production, this would go to a logging service)
    console.error(`[MCP Error] ${errorType}: ${errorId}`, {
      errorType,
      errorId,
      timestamp: Date.now(),
      bunVersion: Bun.version,
      platform: process.platform,
    });
  }

  /**
   * Get error statistics
   */
  getErrorStats(): Record<string, number> {
    return Object.fromEntries(this.errorMetrics);
  }

  /**
   * Clear error metrics
   */
  clearMetrics(): void {
    this.initializeMetrics();
  }

  /**
   * Create a timeout error
   */
  createTimeoutError(operation: string, timeoutMs: number): EnhancedMCPToolError {
    const error = new Error(`Operation "${operation}" timed out after ${timeoutMs}ms`);
    return {
      code: MCPErrors.TIMEOUT,
      message: error.message,
      errorId: randomUUIDv7(),
      timestamp: Date.now(),
      context: {
        operation,
        timeout: timeoutMs,
        bunVersion: Bun.version,
        platform: process.platform,
      },
      suggestions: [
        'Increase timeout duration for long-running operations',
        'Check system performance and resources',
        'Consider breaking large operations into smaller chunks'
      ],
      recoveryActions: [
        'Retry with increased timeout',
        'Check system resource usage',
        'Optimize operation if possible'
      ],
      stack: error.stack,
    };
  }

  /**
   * Create a validation error
   */
  createValidationError(message: string, field?: string): EnhancedMCPToolError {
    const error = new Error(message);
    return {
      code: MCPErrors.VALIDATION,
      message: error.message,
      errorId: randomUUIDv7(),
      timestamp: Date.now(),
      context: {
        operation: 'validation',
        field,
        bunVersion: Bun.version,
        platform: process.platform,
      },
      suggestions: [
        'Check input parameters against the schema definition',
        'Verify all required fields are present',
        'Ensure data types match expected formats'
      ],
      recoveryActions: [
        'Validate input against the tool schema',
        'Check tool documentation for required parameters'
      ],
      stack: error.stack,
    };
  }
}

// Singleton instance
export const mcpErrorHandler = new MCPErrorHandler();

export default mcpErrorHandler;