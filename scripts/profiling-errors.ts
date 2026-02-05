#!/usr/bin/env bun
/**
 * Profiling Error Handling System
 * 
 * Standardized error codes with documentation references for profiling operations.
 * Integrates with examples/corrected-docs-constants.ts pattern.
 */

import { DOCS } from '../lib/docs-reference.ts';

/**
 * Profiling documentation URLs following corrected-docs-constants.ts pattern
 * Reference: https://bun.sh/docs/project/benchmarking
 */
const PROFILING_DOCS = {
  BASE: 'https://bun.sh/docs/project/benchmarking',
  CPU_PROFILING: 'https://bun.sh/docs/project/benchmarking#cpu-profiling',
  HEAP_PROFILING: 'https://bun.sh/docs/project/benchmarking#heap-profiling',
  MEASURING_MEMORY: 'https://bun.sh/docs/project/benchmarking#measuring-memory-usage',
  BENCHMARKING_TOOLS: 'https://bun.sh/docs/project/benchmarking#benchmarking-tools',
} as const;

/**
 * Profiling-specific error codes
 */
export enum ProfilingErrorCode {
  // Profile Generation Errors (PROF_1000-1099)
  PROFILE_GENERATION_FAILED = 'PROF_1000',
  PROFILE_TIMEOUT = 'PROF_1001',
  ENTRY_POINT_NOT_FOUND = 'PROF_1002',
  PROFILE_FILE_NOT_CREATED = 'PROF_1003',
  INVALID_PROJECT_PATH = 'PROF_1004',
  
  // Analysis Errors (PROF_2000-2099)
  PROFILE_NOT_FOUND = 'PROF_2000',
  PROFILE_PARSE_ERROR = 'PROF_2001',
  ANALYSIS_FAILED = 'PROF_2002',
  INVALID_PROFILE_FORMAT = 'PROF_2003',
  
  // Optimization Errors (PROF_3000-3099)
  OPTIMIZATION_FAILED = 'PROF_3000',
  FILE_WRITE_FAILED = 'PROF_3001',
  OPTIMIZATION_NOT_APPLICABLE = 'PROF_3002',
}

/**
 * Error messages with documentation references
 */
export const PROFILING_ERRORS = {
  PROFILE_GENERATION_FAILED: {
    code: ProfilingErrorCode.PROFILE_GENERATION_FAILED,
    message: 'Failed to generate profile',
    docs: PROFILING_DOCS.CPU_PROFILING,
    severity: 'error' as const,
  },
  PROFILE_TIMEOUT: {
    code: ProfilingErrorCode.PROFILE_TIMEOUT,
    message: 'Profile generation timed out after 30 seconds',
    docs: PROFILING_DOCS.CPU_PROFILING,
    severity: 'warning' as const,
  },
  ENTRY_POINT_NOT_FOUND: {
    code: ProfilingErrorCode.ENTRY_POINT_NOT_FOUND,
    message: 'No entry point found for project',
    docs: PROFILING_DOCS.BASE,
    severity: 'warning' as const,
  },
  PROFILE_FILE_NOT_CREATED: {
    code: ProfilingErrorCode.PROFILE_FILE_NOT_CREATED,
    message: 'Profile command succeeded but output file not found',
    docs: PROFILING_DOCS.CPU_PROFILING,
    severity: 'error' as const,
  },
  INVALID_PROJECT_PATH: {
    code: ProfilingErrorCode.INVALID_PROJECT_PATH,
    message: 'Invalid project path',
    docs: PROFILING_DOCS.BASE,
    severity: 'error' as const,
  },
  PROFILE_NOT_FOUND: {
    code: ProfilingErrorCode.PROFILE_NOT_FOUND,
    message: 'Profile file not found',
    docs: PROFILING_DOCS.HEAP_PROFILING,
    severity: 'error' as const,
  },
  PROFILE_PARSE_ERROR: {
    code: ProfilingErrorCode.PROFILE_PARSE_ERROR,
    message: 'Failed to parse profile file',
    docs: PROFILING_DOCS.HEAP_PROFILING,
    severity: 'error' as const,
  },
  ANALYSIS_FAILED: {
    code: ProfilingErrorCode.ANALYSIS_FAILED,
    message: 'Bottleneck analysis failed',
    docs: PROFILING_DOCS.BASE,
    severity: 'error' as const,
  },
  INVALID_PROFILE_FORMAT: {
    code: ProfilingErrorCode.INVALID_PROFILE_FORMAT,
    message: 'Invalid profile format',
    docs: PROFILING_DOCS.HEAP_PROFILING,
    severity: 'error' as const,
  },
  OPTIMIZATION_FAILED: {
    code: ProfilingErrorCode.OPTIMIZATION_FAILED,
    message: 'Failed to apply optimization',
    docs: PROFILING_DOCS.BASE,
    severity: 'error' as const,
  },
  FILE_WRITE_FAILED: {
    code: ProfilingErrorCode.FILE_WRITE_FAILED,
    message: 'Failed to write optimization file',
    docs: PROFILING_DOCS.BASE,
    severity: 'error' as const,
  },
  OPTIMIZATION_NOT_APPLICABLE: {
    code: ProfilingErrorCode.OPTIMIZATION_NOT_APPLICABLE,
    message: 'Optimization not applicable to this project',
    docs: PROFILING_DOCS.BASE,
    severity: 'info' as const,
  },
} as const;

/**
 * Profiling error class with documentation reference
 */
export class ProfilingError extends Error {
  public readonly code: ProfilingErrorCode;
  public readonly docs: string;
  public readonly severity: 'error' | 'warning' | 'info';
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: number;

  constructor(
    errorDef: typeof PROFILING_ERRORS[keyof typeof PROFILING_ERRORS],
    context?: Record<string, unknown>
  ) {
    super(errorDef.message);
    this.name = 'ProfilingError';
    this.code = errorDef.code;
    this.docs = errorDef.docs;
    this.severity = errorDef.severity;
    this.context = context;
    this.timestamp = Date.now();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ProfilingError);
    }
  }

  /**
   * Format error message with documentation link
   */
  public formatMessage(): string {
    const contextStr = this.context 
      ? `\n   Context: ${JSON.stringify(this.context, null, 2)}`
      : '';
    return `${this.message}${contextStr}\n   Documentation: ${this.docs}`;
  }

  /**
   * Log error with formatted message
   */
  public log(): void {
    const emoji = this.severity === 'error' ? '❌' : this.severity === 'warning' ? '⚠️' : 'ℹ️';
    console.error(`${emoji} [${this.code}] ${this.message}`);
    if (this.context) {
      console.error(`   Context:`, this.context);
    }
    console.error(`   Docs: ${this.docs}`);
  }
}

/**
 * Create profiling error
 */
export function createProfilingError(
  code: ProfilingErrorCode,
  context?: Record<string, unknown>
): ProfilingError {
  const errorDef = Object.values(PROFILING_ERRORS).find(e => e.code === code);
  if (!errorDef) {
    throw new Error(`Unknown profiling error code: ${code}`);
  }
  return new ProfilingError(errorDef, context);
}

/**
 * Handle error safely with documentation reference
 */
export function handleProfilingError(
  error: unknown,
  defaultCode: ProfilingErrorCode = ProfilingErrorCode.PROFILE_GENERATION_FAILED,
  context?: Record<string, unknown>
): ProfilingError {
  if (error instanceof ProfilingError) {
    return error;
  }

  if (error instanceof Error) {
    return new ProfilingError(
      PROFILING_ERRORS[defaultCode],
      { ...context, originalError: error.message, stack: error.stack }
    );
  }

  return new ProfilingError(
    PROFILING_ERRORS[defaultCode],
    { ...context, originalError: String(error) }
  );
}
