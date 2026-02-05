#!/usr/bin/env bun

import type { BunSpawnResult, BunProcessOptions } from '../schemas/types.js';
import { mcpErrorHandler, MCPErrors } from '../error/error-handler.js';
import type { MCPErrorContext } from '../error/error-handler.js';

/**
 * Bun-specific helpers leveraging existing odds-core Bun APIs
 * Provides enhanced functionality for Bun v1.3+ features
 */
export class BunHelpers {
  /**
   * Get Bun version and capabilities
   */
  getBunVersion(): {
    version: string;
    capabilities: string[];
    features: string[];
  } {
    const version = Bun.version || 'unknown';
    const capabilities = [
      'JavaScript Runtime',
      'TypeScript Support',
      'Package Manager',
      'Bundler',
      'Test Runner',
      'HTTP Server',
      'WebSocket Server',
      'SQL Client',
      'File System API',
      'Native APIs'
    ];

    const features = [
      'Hot Reload',
      'Source Maps',
      'Code Splitting',
      'Minification',
      'Tree Shaking',
      'ES Modules',
      'CommonJS',
      'JSON Import',
      'CSS Support',
      'WebAssembly'
    ];

    return { version, capabilities, features };
  }

  /**
   * Enhanced Bun.serve with v1.3+ features
   */
  createEnhancedServer(options: {
    port?: number;
    hostname?: string;
    development?: boolean;
    routes?: Record<string, (req: Request) => Response | Promise<Response>>;
    websocketHandler?: {
      open?: (ws: any) => void;
      message: (ws: any, message: string | Buffer) => void | Promise<void>;
      close?: (ws: any, code: number, reason: string) => void;
    };
  }) {
    return Bun.serve({
      port: options.port || 3000,
      hostname: options.hostname || 'localhost',
      development: options.development ?? (Bun.env.NODE_ENV !== 'production'),
      
      fetch(req: Request) {
        const url = new URL(req.url);
        
        // Route handling
        if (options.routes && options.routes[url.pathname]) {
          return options.routes[url.pathname](req);
        }
        
        // Default response
        return new Response('Not Found', { status: 404 });
      },
      
      websocket: options.websocketHandler
    });
  }

  /**
   * Execute SQL query using Bun's native SQL client
   */
  async executeSQLQuery(
    databaseUrl: string,
    query: string,
    params: any[] = []
  ): Promise<{
    rows: any[];
    duration: number;
    affectedRows?: number;
  }> {
    const start = performance.now();
    
    try {
      // Use Bun's native SQL client (Bun v1.3+ feature)
      const db = Bun.sql(databaseUrl);
      const result = await db.query(query, params);
      const duration = performance.now() - start;
      
      return {
        rows: Array.isArray(result) ? result : [result],
        duration,
        affectedRows: result?.changes || undefined,
      };
    } catch (error: any) {
      throw await mcpErrorHandler.handleError(error, {
        timestamp: Date.now(),
        operation: 'execute_sql_query',
        toolName: 'BunHelpers',
      } as MCPErrorContext, MCPErrors.EXECUTION);
    }
  }

  /**
   * Create Bun test configuration
   */
  createTestConfig(options: {
    pattern?: string;
    coverage?: boolean;
    parallel?: boolean;
    timeout?: number;
    reporter?: 'tap' | 'dot' | 'spec';
  } = {}): string {
    const config = {
      test: {
        timeout: options.timeout || 30000,
        reporter: options.reporter || 'tap',
        coverage: {
          enabled: options.coverage ?? true,
          provider: 'v8',
          threshold: 80,
          reporters: ['text', 'lcov', 'html'],
        },
        parallel: options.parallel ?? true,
        ...(options.pattern && { 
          include: [options.pattern] 
        })
      }
    };

    return JSON.stringify(config, null, 2);
  }

  /**
   * Optimize build configuration for production
   */
  getOptimizedBuildConfig(target: 'browser' | 'bun' | 'node' = 'browser'): {
    entryPoint: string;
    outdir: string;
    target: string;
    minify: boolean;
    sourcemap: boolean;
    splitting: boolean;
    define: Record<string, string>;
  } {
    const isProduction = Bun.env.NODE_ENV === 'production';
    
    return {
      entryPoint: './src/index.ts',
      outdir: './dist',
      target,
      minify: isProduction,
      sourcemap: !isProduction,
      splitting: isProduction,
      define: {
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
        'Bun.version': JSON.stringify(Bun.version),
      }
    };
  }

  /**
   * Create memory-optimized build command
   */
  getMemoryOptimizedCommand(script: string): string[] {
    return [
      'bun',
      '--smol', // Reduced memory usage
      'run',
      script
    ];
  }

  /**
   * Enhanced file operations with Bun.file
   */
  async readFileWithStats(path: string): Promise<{
    content: string;
    size: number;
    modified: Date;
  }> {
    try {
      const file = Bun.file(path);
      
      if (!await file.exists()) {
        throw new Error(`File not found: ${path}`);
      }
      
      const content = await file.text();
      const stats = await file.stat();
      
      return {
        content,
        size: stats?.size || file.size,
        modified: stats?.mtime ? new Date(stats.mtime) : new Date(),
      };
    } catch (error: any) {
      throw await mcpErrorHandler.handleError(error, {
        timestamp: Date.now(),
        operation: 'read_file_with_stats',
        toolName: 'BunHelpers',
      } as MCPErrorContext, MCPErrors.FILE_SYSTEM);
    }
  }

  /**
   * Concurrent file operations
   */
  async writeFilesConcurrently(
    files: Array<{ path: string; content: string }>
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    const writePromises = files.map(async (file) => {
      try {
        await Bun.write(file.path, file.content);
        success++;
      } catch (error) {
        failed++;
      }
    });

    await Promise.allSettled(writePromises);
    
    return { success, failed };
  }

  /**
   * Create HTTP client with Bun.fetch
   */
  createHttpClient() {
    return {
      async get(url: string, headers?: Record<string, string>) {
        return fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Bun-MCP-Server/1.0',
            ...headers,
          },
        });
      },
      
      async post(url: string, data?: any, headers?: Record<string, string>) {
        return fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Bun-MCP-Server/1.0',
            ...headers,
          },
          body: data ? JSON.stringify(data) : undefined,
        });
      },
      
      async put(url: string, data?: any, headers?: Record<string, string>) {
        return fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Bun-MCP-Server/1.0',
            ...headers,
          },
          body: data ? JSON.stringify(data) : undefined,
        });
      },
      
      async delete(url: string, headers?: Record<string, string>) {
        return fetch(url, {
          method: 'DELETE',
          headers: {
            'User-Agent': 'Bun-MCP-Server/1.0',
            ...headers,
          },
        });
      }
    };
  }

  /**
   * Generate WebSocket server configuration
   */
  createWebSocketConfig(options: {
    port?: number;
    heartbeatInterval?: number;
    maxConnections?: number;
  } = {}) {
    return {
      port: options.port || 3000,
      heartbeatInterval: options.heartbeatInterval || 30000,
      maxConnections: options.maxConnections || 1000,
      
      // WebSocket handlers
      open: (ws: any) => {
        console.log('WebSocket connection opened');
      },
      
      message: (ws: any, message: string | Buffer) => {
        console.log('Received message:', message.toString());
      },
      
      close: (ws: any, code: number, reason: string) => {
        console.log('WebSocket connection closed:', code, reason);
      }
    };
  }

  /**
   * Get system information relevant to Bun
   */
  getSystemInfo(): {
    bunVersion: string;
    platform: string;
    arch: string;
    nodeVersion: string;
    availableMemory?: number;
  } {
    return {
      bunVersion: Bun.version || 'unknown',
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      availableMemory: (globalThis as any)?.process?.memoryUsage?.()?.heapTotal,
    };
  }

  /**
   * Validate Bun environment
   */
  validateBunEnvironment(): {
    isValid: boolean;
    version: string;
    capabilities: string[];
    issues: string[];
  } {
    const issues: string[] = [];
    const version = Bun.version;
    
    if (!version) {
      issues.push('Bun version not detected');
    }
    
    // Check for required capabilities
    const capabilities = [];
    
    if (typeof Bun.serve === 'function') {
      capabilities.push('HTTP Server');
    }
    
    if (typeof Bun.spawn === 'function') {
      capabilities.push('Process Spawning');
    }
    
    if (typeof Bun.file === 'function') {
      capabilities.push('File System');
    }
    
    if (typeof Bun.sql === 'function') {
      capabilities.push('SQL Client');
    }
    
    if (typeof Bun.write === 'function') {
      capabilities.push('File Writing');
    }
    
    return {
      isValid: issues.length === 0 && capabilities.length >= 3,
      version: version || 'unknown',
      capabilities,
      issues,
    };
  }
}

// Singleton instance
export const bunHelpers = new BunHelpers();

export default bunHelpers;