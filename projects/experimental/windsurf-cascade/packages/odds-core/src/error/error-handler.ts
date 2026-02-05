import { apiTracker } from '../packages/odds-core/src/monitoring/api-tracker.js';
// Intelligent error handler with automatic documentation search
import { randomUUIDv7 } from "bun";

export interface ErrorContext {
  timestamp: number;
  sessionId?: string;
  requestId?: string;
  userId?: string;
  package?: string;
  function?: string;
  line?: number;
  column?: number;
}

export interface DocumentationResult {
  title: string;
  content: string;
  url?: string;
  relevanceScore: number;
}

export class SmartErrorHandler {
  private errorLog: Map<string, any[]> = new Map();
  private mcpServerAvailable: boolean = false;

  constructor() {
    // Check if MCP server is available
    this.checkMCPAvailability();
  }

  /**
   * Handle error with automatic documentation search
   */
  async handleError(error: Error, context: ErrorContext): Promise<{
    errorId: string;
    message: string;
    documentation?: DocumentationResult[];
    suggestions?: string[];
  }> {
    const errorId = randomUUIDv7();
    
    // Log the error
    this.logError(errorId, error, context);
    
    // Extract error keywords for search
    const searchTerms = this.extractSearchTerms(error);
    
    // Search documentation if MCP is available
    let documentation: DocumentationResult[] = [];
    let suggestions: string[] = [];
    
    if (this.mcpServerAvailable && searchTerms.length > 0) {
      try {
        documentation = await this.searchDocumentation(searchTerms);
        suggestions = this.generateSuggestions(error, documentation);
      } catch (searchError) {
        console.warn('Documentation search failed:', searchError);
      }
    }
    
    return {
      errorId,
      message: error.message,
      documentation,
      suggestions
    };
  }

  /**
   * Extract searchable terms from error
   */
  private extractSearchTerms(error: Error): string[] {
    const terms: string[] = [];
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';
    
    // Common error patterns in Bun/Node.js
    const patterns = [
      /cannot find module '(.+)'/,
      /module not found: (.+)/,
      /(.+) is not defined/,
      /(.+) is not a function/,
      /failed to load (.+)/,
      /invalid (.+)/,
      /missing (.+)/,
      /(.+) error/,
      /typescript (.+)/,
      /build (.+)/,
      /websocket (.+)/,
      /server (.+)/,
      /port (.+)/,
      /connection (.+)/,
      /timeout (.+)/,
      /permission (.+)/,
      /file (.+)/,
      /directory (.+)/,
      /network (.+)/,
      /http (.+)/,
      /https (.+)/
    ];
    
    // Extract from error message
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        terms.push(match[1].trim());
      }
    }
    
    // Extract specific Bun-related terms
    const bunTerms = [
      'bun', 'bunfig', 'bun.lock', 'bun install', 'bun build',
      'bun test', 'bun run', 'bun serve', 'websocket', 'server',
      'typescript', 'jsx', 'tsx', 'import', 'export', 'module'
    ];
    
    for (const term of bunTerms) {
      if (message.includes(term) || stack.includes(term)) {
        terms.push(term);
      }
    }
    
    // Remove duplicates and limit to 5 terms
    return [...new Set(terms)].slice(0, 5);
  }

  /**
   * Search documentation using MCP server
   */
  private async searchDocumentation(searchTerms: string[]): Promise<DocumentationResult[]> {
    const results: DocumentationResult[] = [];
    
    for (const term of searchTerms) {
      try {
        // Simulate MCP server search (in real implementation, this would call the MCP server)
        const result = await this.simulateMCPSearch(term);
        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.warn(`Failed to search for "${term}":`, error);
      }
    }
    
    // Sort by relevance score
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 3);
  }

  /**
   * Simulate MCP server search (placeholder for actual MCP integration)
   */
  private async simulateMCPSearch(term: string): Promise<DocumentationResult | null> {
    // In real implementation, this would call your MCP server's SearchBun tool
    const documentationMap: Record<string, DocumentationResult> = {
      'websocket': {
        title: 'Bun WebSocket Server',
        content: 'Bun.serve() provides high-performance WebSocket server with automatic compression and subprotocol negotiation.',
        url: 'https://bun.sh/docs/api/websockets',
        relevanceScore: 0.9
      },
      'typescript': {
        title: 'TypeScript Support in Bun',
        content: 'Bun supports TypeScript out of the box with no configuration needed. Use .ts files directly.',
        url: 'https://bun.sh/docs/typescript',
        relevanceScore: 0.85
      },
      'module': {
        title: 'ES Modules in Bun',
        content: 'Bun supports ES modules with import/export syntax. Use .js extension for imports in TypeScript files.',
        url: 'https://bun.sh/docs/modules/esm',
        relevanceScore: 0.8
      },
      'bun install': {
        title: 'Package Installation',
        content: 'bun install installs dependencies 10x faster than npm. Use bun add for new dependencies.',
        url: 'https://bun.sh/docs/install/install',
        relevanceScore: 0.85
      },
      'server': {
        title: 'HTTP Server with Bun.serve',
        content: 'Create high-performance HTTP servers with Bun.serve(). Includes WebSocket upgrade and CORS support.',
        url: 'https://bun.sh/docs/api/http',
        relevanceScore: 0.9
      }
    };
    
    return documentationMap[term.toLowerCase()] || null;
  }

  /**
   * Generate suggestions based on error and documentation
   */
  private generateSuggestions(error: Error, documentation: DocumentationResult[]): string[] {
    const suggestions: string[] = [];
    const message = error.message.toLowerCase();
    
    // Common error suggestions
    if (message.includes('cannot find module') || message.includes('module not found')) {
      suggestions.push('Run "bun install" to install missing dependencies');
      suggestions.push('Check if the module name is spelled correctly');
      suggestions.push('Verify the module is listed in package.json');
    }
    
    if (message.includes('permission denied')) {
      suggestions.push('Check file/directory permissions');
      suggestions.push('Try running with appropriate permissions');
    }
    
    if (message.includes('port') && message.includes('already in use')) {
      suggestions.push('Use a different port number');
      suggestions.push('Check if another process is using the port');
      suggestions.push('Kill existing process on the port');
    }
    
    if (message.includes('timeout')) {
      suggestions.push('Increase timeout duration');
      suggestions.push('Check network connectivity');
      suggestions.push('Verify server is responsive');
    }
    
    // Add documentation-based suggestions
    if (documentation.length > 0) {
      suggestions.push(`Check documentation: ${documentation[0].title}`);
      suggestions.push(`Visit: ${documentation[0].url}`);
    }
    
    return [...new Set(suggestions)].slice(0, 5);
  }

  /**
   * Log error with context
   */
  private logError(errorId: string, error: Error, context: ErrorContext): void {
    const logEntry = {
      errorId,
      timestamp: context.timestamp,
      message: error.message,
      stack: error.stack,
      context,
      severity: this.calculateSeverity(error)
    };
    
    const key = `${context.package || 'unknown'}-${context.function || 'unknown'}`;
    
    if (!this.errorLog.has(key)) {
      this.errorLog.set(key, []);
    }
    
    this.errorLog.get(key)!.push(logEntry);
    
    // Keep only last 100 errors per key
    const errors = this.errorLog.get(key)!;
    if (errors.length > 100) {
      errors.splice(0, errors.length - 100);
    }
  }

  /**
   * Calculate error severity
   */
  private calculateSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    const message = error.message.toLowerCase();
    
    if (message.includes('critical') || message.includes('fatal')) {
      return 'critical';
    }
    
    if (message.includes('error') || message.includes('failed')) {
      return 'high';
    }
    
    if (message.includes('warning') || message.includes('deprecated')) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Check if MCP server is available
   */
  private async checkMCPAvailability(): Promise<void> {
    try {
      // In real implementation, check if MCP server is running
      this.mcpServerAvailable = true;
    } catch (error) {
      this.mcpServerAvailable = false;
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [key, errors] of this.errorLog.entries()) {
      if (!errors) continue;
      
      const severityCount = errors.reduce((acc, error) => {
        const severity = error?.severity || 'low';
        acc[severity] = (acc[severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const lastError = errors[errors.length - 1];
      
      stats[key] = {
        total: errors.length,
        severity: severityCount,
        lastError: lastError?.timestamp
      };
    }
    
    return stats;
  }

  /**
   * Clear error logs
   */
  clearErrors(packageName?: string): void {
    if (packageName) {
      const keysToDelete = Array.from(this.errorLog.keys()).filter(key => 
        key.startsWith(packageName)
      );
      keysToDelete.forEach(key => this.errorLog.delete(key));
    } else {
      this.errorLog.clear();
    }
  }
}

// Singleton instance
export const smartErrorHandler = new SmartErrorHandler();
