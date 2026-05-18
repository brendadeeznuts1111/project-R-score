/**
 * Pattern System Core Types
 * Shared types and interfaces for the pattern system
 */

export type PatternType =
  | 'LOADER'
  | 'STYLER'
  | 'TABULAR'
  | 'SECURE'
  | 'TIMING'
  | 'BUILDER'
  | 'VERSIONER'
  | 'SHELL'
  | 'BUNX'
  | 'INTERACTIVE'
  | 'STREAM'
  | 'FILESYSTEM'
  | 'UTILITIES';

export type PatternContext =
  | 'API'
  | 'DATABASE'
  | 'BUILD'
  | 'AUTH'
  | 'STYLES'
  | 'CONFIG'
  | 'MONITORING'
  | 'REPORTS'
  | 'AUTOMATION'
  | 'DEPLOYMENT'
  | 'DEVELOPMENT'
  | 'TOOLS'
  | 'CLI'
  | 'PIPES'
  | 'INPUT'
  | 'VALIDATION'
  | 'FILES'
  | 'TEXT'
  | 'COMPRESSION'
  | 'DEBUGGING'
  | 'PERFORMANCE';

export interface PatternDefinition {
  name: PatternType;
  description: string;
  emoji: string;
  contexts: PatternContext[];
  dependencies: PatternType[];
  config: PatternConfig;
}

export interface PatternConfig {
  enabled: boolean;
  priority: number;
  timeout?: number;
  retries?: number;
  cache?: boolean;
  async?: boolean;
}

export interface PatternConnection {
  from: PatternType;
  to: PatternType;
  strength: number; // 0-1
  bidirectional: boolean;
  metadata?: Record<string, any>;
}

export interface PatternExecutionContext {
  pattern: PatternType;
  context: any;
  options?: PatternExecutionOptions;
}

export interface PatternExecutionOptions {
  timeout?: number;
  retries?: number;
  cache?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
}

export interface PatternResult<T = any> {
  success: boolean;
  data: T;
  error?: string;
  executionTime: number;
  pattern: PatternType;
  metadata?: Record<string, any>;
}

export interface PatternPipeline {
  id: string;
  name: string;
  patterns: PatternType[];
  context: any;
  options?: PatternExecutionOptions;
  results?: PatternResult[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

export interface PatternMetrics {
  pattern: PatternType;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecutedAt?: Date;
  errorRate: number;
  cacheHitRate?: number;
}

export interface PatternValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface TabularResult {
  headers: string[];
  rows: any[][];
  summary?: {
    totalRows: number;
    totalColumns: number;
    executionTime: number;
  };
  formatted?: string;
}

export interface PatternSystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  patterns: Record<PatternType, 'healthy' | 'degraded' | 'unhealthy'>;
  metrics: Record<PatternType, PatternMetrics>;
  lastChecked: Date;
  issues: string[];
}

// Utility types
export type PatternHandler<T = any> = (
  context: any,
  options?: PatternExecutionOptions
) => Promise<PatternResult<T>>;
export type PatternValidator = (context: any) => PatternValidationResult;
export type PatternFormatter<T = any> = (result: PatternResult<T>) => string | TabularResult;

// Export default configurations
export const DEFAULT_PATTERN_CONFIG: Record<PatternType, PatternConfig> = {
  LOADER: { enabled: true, priority: 1, cache: true },
  STYLER: { enabled: true, priority: 2, cache: true },
  TABULAR: { enabled: true, priority: 3, cache: false },
  SECURE: { enabled: true, priority: 0, cache: false }, // Security patterns always high priority
  TIMING: { enabled: true, priority: 4, cache: false },
  BUILDER: { enabled: true, priority: 1, timeout: 300000 }, // 5 minutes
  VERSIONER: { enabled: true, priority: 2, cache: true },
  SHELL: { enabled: true, priority: 3, timeout: 60000, retries: 1 },
  BUNX: { enabled: true, priority: 3, timeout: 120000, retries: 1 },
  INTERACTIVE: { enabled: true, priority: 4, cache: false },
  STREAM: { enabled: true, priority: 2, cache: false },
  FILESYSTEM: { enabled: true, priority: 1, cache: true },
  UTILITIES: { enabled: true, priority: 5, cache: true },
};

export const PATTERN_DESCRIPTIONS: Record<PatternType, { description: string; emoji: string }> = {
  LOADER: { description: 'File Loading', emoji: '📂' },
  STYLER: { description: 'CSS Processing', emoji: '🎨' },
  TABULAR: { description: 'Data Tables', emoji: '📊' },
  SECURE: { description: 'Secrets Management', emoji: '🔐' },
  TIMING: { description: 'Performance Measurement', emoji: '⏱️' },
  BUILDER: { description: 'Build Process', emoji: '🔨' },
  VERSIONER: { description: 'Version Management', emoji: '📦' },
  SHELL: { description: 'Shell Command Execution', emoji: '🐚' },
  BUNX: { description: 'Package Execution', emoji: '📦' },
  INTERACTIVE: { description: 'Interactive CLI', emoji: '🎯' },
  STREAM: { description: 'Stream Processing', emoji: '🌊' },
  FILESYSTEM: { description: 'File System Operations', emoji: '📁' },
  UTILITIES: { description: 'Utility Functions', emoji: '🔧' },
};
