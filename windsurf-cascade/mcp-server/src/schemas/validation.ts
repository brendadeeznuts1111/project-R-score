#!/usr/bin/env bun

import { z } from 'zod';

// All Zod validation schemas extracted from the original monolithic file
export const schemas = {
  // Project setup schemas
  ProjectSetupSchema: z.object({
    projectName: z.string().min(1, 'Project name is required'),
    template: z.enum(['minimal', 'full', 'websocket', 'ml'], {
      errorMap: () => ({ message: 'Template must be minimal, full, websocket, or ml' })
    }),
    includeTests: z.boolean().default(true),
    includeCI: z.boolean().default(true),
  }),

  // Test configuration schemas
  TestConfigSchema: z.object({
    coverage: z.boolean().default(true),
    concurrent: z.boolean().default(true),
    performance: z.boolean().default(false),
    integration: z.boolean().default(true),
  }),

  // Deployment configuration schemas
  DeployConfigSchema: z.object({
    environment: z.enum(['development', 'staging', 'production'], {
      errorMap: () => ({ message: 'Environment must be development, staging, or production' })
    }),
    region: z.string().default('us-east-1'),
    force: z.boolean().default(false),
  }),

  // Bun HTTP server schemas
  BunHttpServerSchema: z.object({
    port: z.number().min(1).max(65535).default(3000),
    hostname: z.string().default('localhost'),
    routes: z.array(z.object({
      path: z.string().min(1, 'Route path is required'),
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('GET'),
      response: z.string().min(1, 'Route response is required'),
    })).optional().default([]),
    staticDir: z.string().optional(),
    cors: z.boolean().default(true),
  }),

  // Bun search schemas
  BunSearchSchema: z.object({
    query: z.string().min(1, 'Search query is required').max(500, 'Query too long'),
  }),

  // Bun script execution schemas
  BunScriptSchema: z.object({
    scriptPath: z.string().min(1, 'Script path is required'),
    bunArgs: z.array(z.string()).optional().default([]),
    args: z.array(z.string()).optional().default([]),
    cwd: z.string().optional().default(() => process.cwd()),
    timeout: z.number().min(1000).max(300000).optional().default(30000),
  }).refine(data => {
    if (data.timeout && data.timeout < 1000) {
      throw new Error('Timeout must be at least 1000ms');
    }
    return true;
  }),

  // Bun package management schemas
  BunPackageSchema: z.object({
    action: z.enum(['install', 'add', 'remove', 'update'], {
      errorMap: () => ({ message: 'Action must be install, add, remove, or update' })
    }),
    packageDir: z.string().optional().default(() => process.cwd()),
    packages: z.array(z.string()).optional().default([]),
    dev: z.boolean().optional().default(false),
  }).refine(data => {
    if ((data.action === 'add' || data.action === 'remove') && data.packages.length === 0) {
      throw new Error('Package names are required for add/remove actions');
    }
    return true;
  }),

  // Bun build optimization schemas
  BunBuildSchema: z.object({
    entryPoint: z.string().min(1, 'Entry point is required'),
    outDir: z.string().optional().default('./dist'),
    target: z.enum(['browser', 'bun', 'node']).optional().default('browser'),
    minify: z.boolean().optional().default(true),
    sourcemap: z.boolean().optional().default(false),
    splitting: z.boolean().optional().default(true),
  }),

  // Project health verification schemas
  ProjectHealthSchema: z.object({
    deepScan: z.boolean().default(false),
    security: z.boolean().default(true),
    performance: z.boolean().default(true),
  }),

  // Bun SQL query schemas
  BunSQLSchema: z.object({
    database: z.string().min(1, 'Database connection string is required'),
    query: z.string().min(1, 'SQL query is required'),
    params: z.array(z.any()).optional(),
    timeout: z.number().min(1000).max(60000).optional(),
  }),

  // Bun SQL migration schemas
  BunSQLMigrationSchema: z.object({
    database: z.string().min(1, 'Database connection string is required'),
    migrations: z.array(z.string().min(1, 'Migration content required')).min(1),
    rollbackOnError: z.boolean().default(true),
  }),

  // Bun SQL connection test schemas
  BunSQLConnectionSchema: z.object({
    database: z.string().min(1, 'Database connection string is required'),
    testQuery: z.string().optional(),
    connectionTimeout: z.number().min(1000).max(30000).optional(),
  }),

  // Bun SQL backup schemas
  BunSQLBackupSchema: z.object({
    database: z.string().min(1, 'Database connection string is required'),
    outputPath: z.string().min(1, 'Output path is required'),
    includeSchema: z.boolean().default(true),
    compression: z.enum(['gzip', 'deflate', 'zstd']).optional(),
  }),

  // Bun WebSocket configuration schemas
  BunWebSocketSchema: z.object({
    port: z.number().min(1).max(65535).default(3000),
    hostname: z.string().default('localhost'),
    cors: z.boolean().default(true),
    heartbeatInterval: z.number().min(1000).max(60000).optional().default(30000),
    maxConnections: z.number().min(1).max(10000).optional().default(1000),
    protocols: z.array(z.string()).optional(),
  }),

  // Bun WebSocket cluster schemas
  BunWebSocketClusterSchema: z.object({
    port: z.number().min(1).max(65535),
    workers: z.number().min(1).max(16).optional().default(4),
    hostname: z.string().optional().default('localhost'),
    loadBalancer: z.enum(['round-robin', 'random', 'least-connections']).optional().default('round-robin'),
    sticky: z.boolean().default(true),
  }),

  // Bun WebSocket monitor schemas
  BunWebSocketMonitorSchema: z.object({
    servers: z.array(z.object({
      host: z.string(),
      port: z.number(),
    })).min(1),
    interval: z.number().min(1000).max(60000).optional().default(5000),
    alertThreshold: z.number().min(1).max(10000).optional().default(100),
    outputFormat: z.enum(['json', 'table', 'stream']).optional().default('table'),
  }),

  // Bun WebSocket migration schemas
  BunWebSocketMigrationSchema: z.object({
    sourceVersion: z.string().min(1),
    targetVersion: z.string().min(1),
    migrationPath: z.string().optional(),
    preserveConfig: z.boolean().default(true),
    rollbackOnError: z.boolean().default(true),
  }),

  // Bun test runner schemas
  BunTestSchema: z.object({
    pattern: z.string().optional(),
    coverage: z.boolean().default(true),
    parallel: z.boolean().default(true),
    timeout: z.number().min(1000).max(60000).optional().default(30000),
    reporter: z.enum(['tap', 'dot', 'spec']).optional().default('tap'),
  }),

  // Bun test coverage schemas
  BunTestCoverageSchema: z.object({
    pattern: z.string().optional(),
    threshold: z.number().min(0).max(100).optional(),
    outputFormat: z.enum(['html', 'json', 'lcov']).optional().default('html'),
    include: z.array(z.string()).optional(),
  }),

  // Bun performance test schemas
  BunPerformanceTestSchema: z.object({
    script: z.string().min(1, 'Performance test script is required'),
    iterations: z.number().min(1).max(10000).optional().default(100),
    warmup: z.number().min(0).max(1000).optional().default(10),
    concurrent: z.boolean().default(false),
    memory: z.boolean().default(true),
  }),

  // Bun parallel test schemas
  BunParallelTestSchema: z.object({
    pattern: z.string().min(1, 'Test pattern is required'),
    workers: z.number().min(1).max(16).optional(),
    shard: z.string().optional(),
    retry: z.number().min(0).max(5).optional(),
    bail: z.boolean().default(false),
  }),

  // Bun performance monitor schemas
  BunPerformanceMonitorSchema: z.object({
    target: z.string().optional(),
    interval: z.number().min(100).max(60000).optional().default(5000),
    duration: z.number().min(1000).max(3600000).optional().default(300000),
    metrics: z.array(z.string()).optional().default(['cpu', 'memory', 'io', 'network']),
    threshold: z.record(z.number()).optional(),
    outputFormat: z.enum(['json', 'prometheus', 'dashboard']).optional().default('json'),
  }),

  // Bun memory profiler schemas
  BunMemoryProfilerSchema: z.object({
    target: z.string().optional(),
    duration: z.number().min(1000).max(600000).optional().default(30000),
    gcForce: z.boolean().default(true),
    heapSnapshot: z.boolean().default(true),
    allocationTracking: z.boolean().default(false),
  }),

  // Bun benchmark suite schemas
  BunBenchmarkSuiteSchema: z.object({
    categories: z.array(z.string()).optional().default(['cpu', 'memory', 'io', 'network']),
    iterations: z.number().min(1).max(10000).optional().default(1000),
    warmup: z.number().min(0).max(1000).optional().default(10),
    concurrent: z.boolean().default(false),
    outputFormat: z.enum(['table', 'json', 'prometheus']).optional().default('table'),
    target: z.string().optional(),
  }),

  // Bun resource monitor schemas
  BunResourceMonitorSchema: z.object({
    resources: z.array(z.string()).optional().default(['cpu', 'memory', 'disk', 'network']),
    interval: z.number().min(100).max(60000).optional().default(2000),
    duration: z.number().min(1000).max(3600000).optional().default(60000),
    alertThresholds: z.record(z.number()).optional(),
    exportFormat: z.enum(['csv', 'json', 'prometheus']).optional().default('json'),
  }),

  // Bun file watcher schemas
  BunFileWatcherSchema: z.object({
    paths: z.array(z.string()).min(1),
    events: z.array(z.string()).optional().default(['create', 'modify', 'delete', 'rename']),
    recursive: z.boolean().default(true),
    debounceMs: z.number().min(0).max(10000).optional().default(100),
    maxEvents: z.number().min(1).max(100000).optional().default(10000),
    outputFormat: z.enum(['json', 'console', 'file']).optional().default('console'),
    logFile: z.string().optional(),
  }),

  // Bun file compression schemas
  BunFileCompressionSchema: z.object({
    inputPaths: z.array(z.string()).min(1),
    outputPath: z.string().min(1),
    algorithm: z.enum(['gzip', 'deflate', 'zstd', 'brotli']).optional().default('gzip'),
    level: z.number().min(1).max(9).optional().default(6),
    recursive: z.boolean().default(true),
    preserveStructure: z.boolean().default(true),
  }),

  // Bun file encryption schemas
  BunFileEncryptionSchema: z.object({
    inputPaths: z.array(z.string()).min(1),
    outputPath: z.string().min(1),
    algorithm: z.enum(['aes-256-gcm', 'aes-128-cbc', 'chacha20-poly1305']).optional().default('aes-256-gcm'),
    password: z.string().min(1),
    salt: z.string().optional(),
    preserveStructure: z.boolean().default(true),
  }),

  // Bun file transfer schemas
  BunFileTransferSchema: z.object({
    sourcePaths: z.array(z.string()).min(1),
    destination: z.string().min(1),
    protocol: z.enum(['local', 'scp', 'rsync', 'ftp']).optional().default('local'),
    options: z.record(z.any()).optional(),
    verify: z.boolean().default(true),
    preserveAttributes: z.boolean().default(true),
  }),

  // File operation schemas
  FileOperationSchema: z.object({
    path: z.string().min(1, 'File path is required'),
    content: z.string().optional(),
    encoding: z.enum(['utf-8', 'base64', 'hex']).optional().default('utf-8'),
    createPath: z.boolean().default(false),
  }),

  // Directory operation schemas
  DirectoryOperationSchema: z.object({
    path: z.string().min(1, 'Directory path is required'),
    recursive: z.boolean().default(false),
    permissions: z.string().optional(),
  }),

  // Network operation schemas
  NetworkOperationSchema: z.object({
    url: z.string().url('Invalid URL format'),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('GET'),
    headers: z.record(z.string()).optional(),
    body: z.string().optional(),
    timeout: z.number().min(1000).max(60000).optional().default(10000),
  }),

  // Process operation schemas
  ProcessOperationSchema: z.object({
    command: z.string().min(1, 'Command is required'),
    args: z.array(z.string()).optional().default([]),
    cwd: z.string().optional(),
    env: z.record(z.string()).optional(),
    timeout: z.number().min(1000).max(300000).optional().default(30000),
    stream: z.boolean().default(false),
  }),

  // Configuration schemas
  ServerConfigSchema: z.object({
    name: z.string().default('odds-protocol-mcp'),
    version: z.string().default('1.0.0'),
    port: z.number().min(1).max(65535).optional().default(3000),
    transport: z.enum(['stdio', 'http']).default('stdio'),
    environment: z.enum(['development', 'staging', 'production']).default('development'),
    cors: z.boolean().default(true),
    timeout: z.number().min(1000).max(300000).optional().default(30000),
  }),

  // Performance monitoring schemas
  PerformanceMonitorSchema: z.object({
    enabled: z.boolean().default(true),
    interval: z.number().min(1000).max(60000).optional().default(5000),
    thresholds: z.object({
      cpu: z.number().min(0).max(100).optional().default(80),
      memory: z.number().min(0).max(100).optional().default(85),
      responseTime: z.number().min(0).optional().default(5000),
    }).optional(),
  }),

  // Cache configuration schemas
  CacheConfigSchema: z.object({
    enabled: z.boolean().default(true),
    ttl: z.number().min(1000).max(3600000).optional().default(300000), // 5 minutes
    maxSize: z.number().min(1).max(10000).optional().default(1000),
    strategy: z.enum(['lru', 'lfu', 'fifo']).optional().default('lru'),
  }),

  // Logging configuration schemas
  LoggingConfigSchema: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    format: z.enum(['json', 'text']).default('text'),
    output: z.enum(['stdout', 'stderr', 'file']).default('stdout'),
    file: z.string().optional(),
    maxSize: z.number().min(1).max(100).optional().default(10), // MB
    maxFiles: z.number().min(1).max(30).optional().default(5),
  }),

  // Security configuration schemas
  SecurityConfigSchema: z.object({
    enableValidation: z.boolean().default(true),
    maxRequestSize: z.number().min(1024).max(10485760).optional().default(1048576), // 1MB
    rateLimit: z.object({
      enabled: z.boolean().default(false),
      windowMs: z.number().min(60000).max(3600000).optional().default(900000), // 15 minutes
      maxRequests: z.number().min(1).max(1000).optional().default(100),
    }).optional(),
    cors: z.object({
      origin: z.string().or(z.array(z.string())).default('*'),
      methods: z.array(z.string()).optional().default(['GET', 'POST', 'PUT', 'DELETE']),
      headers: z.array(z.string()).optional().default(['Content-Type', 'Authorization']),
    }).optional(),
  }),
};

// Export individual schemas for direct import
export const {
  ProjectSetupSchema,
  TestConfigSchema,
  DeployConfigSchema,
  BunHttpServerSchema,
  BunSearchSchema,
  BunScriptSchema,
  BunPackageSchema,
  BunBuildSchema,
  ProjectHealthSchema,
  BunSQLSchema,
  BunWebSocketSchema,
  BunTestSchema,
  FileOperationSchema,
  DirectoryOperationSchema,
  NetworkOperationSchema,
  ProcessOperationSchema,
  ServerConfigSchema,
  PerformanceMonitorSchema,
  CacheConfigSchema,
  LoggingConfigSchema,
  SecurityConfigSchema,
} = schemas;

// Utility functions for schema validation
export class SchemaValidator {
  static validateAndParse<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join('; ');
        throw new Error(`Validation failed: ${errorMessage}`);
      }
      throw error;
    }
  }

  static createSafeParser<T>(schema: z.ZodSchema<T>) {
    return (data: unknown): { success: true; data: T } | { success: false; error: string } => {
      try {
        return { success: true, data: schema.parse(data) };
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorMessage = error.errors
            .map(err => `${err.path.join('.')}: ${err.message}`)
            .join('; ');
          return { success: false, error: errorMessage };
        }
        return { success: false, error: 'Unknown validation error' };
      }
    };
  }
}

export default schemas;