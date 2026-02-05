#!/usr/bin/env bun

// TypeScript type definitions for the modular MCP server

export interface MCPToolDefinition<TInput = any, TOutput = any> {
  name: string;
  description: string;
  schema: any; // ZodSchema
  execute: (input: TInput) => Promise<TOutput>;
}

export interface MCPResourceDefinition {
  name: string;
  mimeType: string;
  handler: (uri: URL) => Promise<{
    contents: Array<{
      uri: URL;
      mimeType: string;
      text: string;
    }>;
  }>;
}

export interface MCPPromptDefinition {
  name: string;
  description: string;
  schema?: any; // Optional ZodSchema
  handler: (args: any) => Promise<{
    messages: Array<{
      role: string;
      content: {
        type: string;
        text: string;
      };
    }>;
  }>;
}

// Tool input/output types
export interface ProjectSetupInput {
  projectName: string;
  template: 'minimal' | 'full' | 'websocket' | 'ml';
  includeTests: boolean;
  includeCI: boolean;
}

export interface TestConfigInput {
  coverage: boolean;
  concurrent: boolean;
  performance: boolean;
  integration: boolean;
}

export interface DeployConfigInput {
  environment: 'development' | 'staging' | 'production';
  region: string;
  force: boolean;
}

export interface BunHttpServerInput {
  port: number;
  hostname: string;
  routes?: Array<{
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    response: string;
  }>;
  staticDir?: string;
  cors: boolean;
}

export interface BunSearchInput {
  query: string;
}

export interface BunScriptInput {
  scriptPath: string;
  bunArgs?: string[];
  args?: string[];
  cwd?: string;
  timeout?: number;
}

export interface BunPackageInput {
  action: 'install' | 'add' | 'remove' | 'update';
  packageDir?: string;
  packages?: string[];
  dev?: boolean;
}

export interface BunBuildInput {
  entryPoint: string;
  outDir?: string;
  target?: 'browser' | 'bun' | 'node';
  minify?: boolean;
  sourcemap?: boolean;
  splitting?: boolean;
}

export interface ProjectHealthInput {
  deepScan?: boolean;
  security?: boolean;
  performance?: boolean;
}

// Execution result types
export interface ExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  executionTime?: number;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
}

export interface DocumentationResult {
  title: string;
  description: string;
  url: string;
  category: string;
  relevance: number;
}

// MCP Server configuration
export interface MCPServerConfig {
  name: string;
  version: string;
  port?: number;
  transport?: 'stdio' | 'http';
  environment?: string;
}

// Bun-specific types
export interface BunProcessOptions {
  cwd?: string;
  env?: Record<string, string>;
  stdout?: 'inherit' | 'pipe';
  stderr?: 'inherit' | 'pipe';
  timeout?: number;
}

export interface BunSpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

// Enhanced Bun v1.3+ types
export interface BunSQLConfig {
  database: string;
  query: string;
  timeout?: number;
}

export interface BunWebSocketConfig {
  open?: (ws: any) => void;
  message: (ws: any, message: string | Buffer) => void | Promise<void>;
  close?: (ws: any, code: number, reason: string) => void;
}

export interface BunTestConfig {
  pattern?: string;
  coverage: boolean;
  parallel: boolean;
}

// Error types for structured error handling
export interface MCPToolError {
  code: string;
  message: string;
  context: Record<string, any>;
  suggestions: string[];
  documentation?: DocumentationResult[];
  errorId?: string;
}

export const ErrorTypes = {
  VALIDATION: 'VALIDATION_ERROR',
  EXECUTION: 'EXECUTION_ERROR',
  FILE_SYSTEM: 'FILE_SYSTEM_ERROR',
  NETWORK: 'NETWORK_ERROR',
  BUN_RUNTIME: 'BUN_RUNTIME_ERROR',
  DEPENDENCY: 'DEPENDENCY_ERROR',
  PERMISSION: 'PERMISSION_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR'
} as const;

export type ErrorType = typeof ErrorTypes[keyof typeof ErrorTypes];

// Performance and monitoring types
export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage?: number;
  cpuUsage?: number;
  ioOperations?: number;
}

export interface ToolMetrics {
  toolName: string;
  executionCount: number;
  successRate: number;
  averageExecutionTime: number;
  lastExecution?: number;
}

// Configuration types
export interface ServerTransportConfig {
  type: 'stdio' | 'http';
  port?: number;
  hostname?: string;
  cors?: {
    origin: string;
    methods: string[];
    headers: string[];
  };
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
}

export interface ExecutionConfig {
  timeout: number;
  retryAttempts: number;
  concurrentLimit: number;
  streamOutput: boolean;
}

// File system types
export interface ProjectFile {
  path: string;
  content: string;
  encoding?: string;
}

export interface ProjectTemplate {
  name: string;
  description: string;
  files: ProjectFile[];
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

// Search and documentation types
export interface SearchOptions {
  limit?: number;
  categories?: string[];
  includeDocumentation?: boolean;
  includeExamples?: boolean;
}

export interface DocumentationIndex {
  [key: string]: {
    title: string;
    content: string;
    url?: string;
    category: string;
    keywords: string[];
    relevance: number;
  };
}