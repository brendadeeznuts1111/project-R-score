#!/usr/bin/env bun
/**
 * @fileoverview Advanced tag management with context awareness, security, environment adaptation & custom error inspection
 * @description Production-ready tag management system with custom error inspection, context-aware formatting, security integration, environment adaptation, advanced array formatting, and caching system.
 * @module examples/demos/tag-manager-pro
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-EXAMPLE@6.3.2.0.0.0.0;instance-id=EXAMPLE-TAG-MANAGER-PRO-001;version=6.3.2.0.0.0.0}]
 * [PROPERTIES:{example={value:"Tag Manager Pro";@root:"ROOT-EXAMPLES";@chain:["BP-EXAMPLES","BP-DEMO"];@version:"6.3.2.0.0.0.0"}}]
 * [CLASS:TagManagerPro][#REF:v-6.3.2.0.0.0.0.BP.EXAMPLES.DEMO.1.0.A.1.1.EXAMPLE.1.1]]
 * 
 * Version: 6.3.2.0.0.0.0
 * Ripgrep Pattern: 6\.3\.2\.0\.0\.0\.0|EXAMPLE-TAG-MANAGER-PRO-001|BP-EXAMPLE@6\.3\.2\.0\.0\.0\.0
 * 
 * Features:
 * - Custom error inspection with Error.prepareStackTrace
 * - Context-aware formatting (Bun.main, import.meta.path)
 * - Security integration (sensitive data redaction)
 * - Environment adaptation (NODE_ENV, DEBUG_LEVEL)
 * - Advanced array formatting (arrayFormat, arraySeparator)
 * - Caching system with LRU eviction
 * - Zero dependencies - pure Bun APIs
 * - Type-safe environment variable access with Bun.Env interface
 * 
 * @example 6.3.2.0.0.0.0.1: Custom Error Inspection
 * // Test Formula:
 * // 1. Create TagManagerError with context
 * // 2. Throw and catch error
 * // 3. Verify custom stack trace formatting
 * // Expected Result: Error displayed with custom formatting and context
 * //
 * // Snippet:
 * ```typescript
 * throw new TagManagerError('Test error', {
 *   operation: 'scan',
 *   file: 'test.ts',
 *   tag: '[hyper-bun][utils][feat]',
 * });
 * ```
 * 
 * @example 6.3.2.0.0.0.0.2: Tag Parsing with Context
 * // Test Formula:
 * // 1. Create TagParser instance
 * // 2. Parse tag string with metadata
 * // 3. Verify parsed structure includes context
 * // Expected Result: Tag parsed with all metadata and context
 * //
 * // Snippet:
 * ```typescript
 * const parser = new TagParser();
 * const tag = parser.parse('[hyper-bun][utils][feat][META:priority=high]');
 * ```
 * 
 * // Ripgrep: 6.3.2.0.0.0.0
 * // Ripgrep: EXAMPLE-TAG-MANAGER-PRO-001
 * // Ripgrep: BP-EXAMPLE@6.3.2.0.0.0.0
 */

import type { MetadataTag } from '../../types/metadata';

// ============================================================================
// CUSTOM ERROR INSPECTION
// ============================================================================

const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  magenta: (s: string) => `\x1b[35m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

// Configure custom stack trace formatting
// Error.prepareStackTrace is called by V8 when accessing Error.stack
// It receives the error and an array of CallSite objects
Error.prepareStackTrace = (err: Error, stack: any[]): any[] => {
  return stack.map((callSite: any) => {
    try {
      return {
        function: callSite.getFunctionName?.() || callSite.getFunction?.()?.name || '<anonymous>',
        file: callSite.getFileName?.() || callSite.getFile?.() || 'unknown',
        line: callSite.getLineNumber?.() || callSite.getLine?.() || 0,
        column: callSite.getColumnNumber?.() || callSite.getColumn?.() || 0,
        type: callSite.getTypeName?.() || null,
        isConstructor: callSite.isConstructor?.() || false,
        isNative: callSite.isNative?.() || false,
        isEval: callSite.isEval?.() || false,
        isAsync: callSite.isAsync?.() || false,
        method: callSite.getMethodName?.() || null,
      };
    } catch {
      return {
        function: '<unknown>',
        file: 'unknown',
        line: 0,
        column: 0,
        type: null,
        isConstructor: false,
        isNative: false,
        isEval: false,
        isAsync: false,
        method: null,
      };
    }
  });
};

interface EnhancedError extends Error {
  stackTrace?: any[];
  tagContext?: any;
}

class TagManagerError extends Error {
  public stackTrace: any[];
  public context: Record<string, any>;
  public tagContext?: any;
  
  constructor(message: string, context: Record<string, any> = {}) {
    super(message);
    this.name = 'TagManagerError';
    this.context = context;
    
    // Capture stack trace with custom formatting
    // Error.captureStackTrace is V8-specific, use fallback if not available
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TagManagerError);
    }
    
    // Extract formatted stack trace
    // Accessing .stack will trigger Error.prepareStackTrace if configured
    try {
      const stackValue = this.stack;
      if (Array.isArray(stackValue)) {
        // prepareStackTrace returned array directly
        this.stackTrace = stackValue;
      } else if (typeof stackValue === 'string') {
        // Parse stack string
        this.stackTrace = this.parseStackString(stackValue);
      } else {
        this.stackTrace = [];
      }
    } catch {
      this.stackTrace = [];
    }
    
    // Add tag context if available
    if (context.tag) {
      try {
        this.tagContext = TagParser.parse(context.tag);
      } catch {
        // Ignore parse errors for tag context
      }
    }
  }
  
  /**
   * Parse stack string into structured format
   */
  private parseStackString(stack: string): any[] {
    const lines = stack.split('\n').slice(1); // Skip error message line
    return lines
      .map(line => {
        // Match: "    at functionName (file:line:column)" or "    at file:line:column"
        const match = line.match(/^\s*at\s+(?:(.+?)\s+\()?([^(]+?):(\d+):(\d+)\)?$/);
        if (match) {
          return {
            function: match[1] || '<anonymous>',
            file: match[2],
            line: parseInt(match[3], 10),
            column: parseInt(match[4], 10),
            type: null,
            isConstructor: false,
            isNative: match[2].includes('node:') || match[2].includes('bun:'),
            isEval: false,
            isAsync: false,
            method: null,
          };
        }
        return null;
      })
      .filter((frame): frame is any => frame !== null);
  }
  
  [Bun.inspect.custom](depth: number, options: any) {
    if (depth < 0) {
      return `[TagManagerError: ${this.message}]`;
    }

    const header = `${colors.red('✗')} ${colors.bold(this.name)}: ${this.message}`;
    
    // Context information
    let contextStr = '';
    if (this.context && Object.keys(this.context).length > 0) {
      const contextDisplay = { ...this.context };
      if (this.tagContext) {
        contextDisplay.tagParsed = this.tagContext;
      }
      contextStr = `\n${colors.gray('Context:')} ${Bun.inspect(contextDisplay, { ...options, depth: depth - 1, colors: true })}`;
    }
    
    // Stack trace (filtered and formatted)
    const stackStr = this.stackTrace
      .filter((frame: any) => {
        const file = frame.file || '';
        return file && 
               !file.includes('node_modules') && 
               !file.includes('bun:') &&
               !frame.isNative;
      })
      .slice(0, 10) // Limit to 10 frames
      .map((frame: any, i: number) => {
        const file = frame.file || 'unknown';
        const line = frame.line || 0;
        const column = frame.column || 0;
        const location = `${file}:${line}:${column}`;
        const fn = frame.function ? colors.yellow(frame.function) : colors.dim('<anonymous>');
        const type = frame.type ? `${colors.cyan(frame.type)}.` : '';
        const async = frame.isAsync ? colors.magenta('async ') : '';
        const ctor = frame.isConstructor ? colors.blue('new ') : '';
        
        return `${colors.gray(`  ${i + 1}.`)} ${async}${ctor}${type}${fn} ${colors.dim(`(${location})`)}`;
      })
      .join('\n');
    
    // Error metadata
    let metadataStr = '';
    if (options.showHidden || Bun.env.DEBUG_LEVEL === 'debug') {
      const metadata: any = {
        errorName: this.name,
        errorMessage: this.message,
        stackTraceLength: this.stackTrace.length,
      };
      if (this.tagContext) {
        metadata.tagContext = this.tagContext;
      }
      metadataStr = `\n${colors.gray('Metadata:')} ${Bun.inspect(metadata, { ...options, depth: depth - 1, colors: true })}`;
    }
    
    return `${header}${contextStr}${metadataStr}\n${colors.gray('Stack Trace:')}\n${stackStr}`;
  }
}

// ============================================================================
// CONFIGURATION (with error handling)
// ============================================================================

interface TagManagerConfig {
  arrayFormat: 'dense' | 'expanded' | 'compact';
  arraySeparator: string;
  maxArrayLength: number;
  includeExecutionContext: boolean;
  includeFileContext: boolean;
  environment: 'development' | 'production' | 'test';
  debugLevel: number;
  redactSensitive: boolean;
  sensitiveKeys: RegExp[];
  enableCaching: boolean;
  maxCacheSize: number;
  // Table formatting options
  tableColors: boolean;
  tableProperties?: string[]; // Custom columns to show
  tableMaxWidth: number;
  tableTruncate: boolean;
  tableDepth: number;
}

// ============================================================================
// TYPE-SAFE CONFIGURATION LOADER
// ============================================================================

class ConfigLoader {
  static load(): TagManagerConfig {
    try {
      const nodeEnv = Bun.env.NODE_ENV || 'development';
      const isProduction = nodeEnv === 'production';
      
      return {
        arrayFormat: (Bun.env.TAG_ARRAY_FORMAT || (isProduction ? 'compact' : 'expanded')) as TagManagerConfig['arrayFormat'],
        arraySeparator: Bun.env.TAG_ARRAY_SEP || ', ',
        maxArrayLength: parseInt(Bun.env.TAG_MAX_ARRAY_LEN || '50', 10),
        includeExecutionContext: Bun.env.TAG_INCLUDE_EXEC_CONTEXT === 'true' || !isProduction,
        includeFileContext: Bun.env.TAG_INCLUDE_FILE_CONTEXT === 'true' || !isProduction,
        environment: nodeEnv as TagManagerConfig['environment'],
        debugLevel: parseInt(Bun.env.DEBUG_LEVEL || '0', 10),
        redactSensitive: Bun.env.TAG_REDACT_SENSITIVE !== 'false' && isProduction,
        sensitiveKeys: [
          /password/i, /token/i, /secret/i, /key/i, /auth/i,
          /api[-_]?key/i, /private/i, /credential/i
        ],
        enableCaching: Bun.env.TAG_ENABLE_CACHE === 'true' || !isProduction,
        maxCacheSize: parseInt(Bun.env.TAG_MAX_CACHE_SIZE || '1000', 10),
        // Table formatting
        tableColors: Bun.env.TAG_TABLE_COLORS !== 'false',
        tableProperties: Bun.env.TAG_TABLE_PROPERTIES 
          ? Bun.env.TAG_TABLE_PROPERTIES.split(',').map(p => p.trim())
          : undefined,
        tableMaxWidth: parseInt(Bun.env.TAG_TABLE_MAX_WIDTH || '40', 10),
        tableTruncate: Bun.env.TAG_TABLE_TRUNCATE !== 'false',
        tableDepth: parseInt(Bun.env.TAG_TABLE_DEPTH || '2', 10),
      };
    } catch (error) {
      throw new TagManagerError('Failed to load configuration', { 
        error: (error as Error).message,
        env: Object.keys(Bun.env).slice(0, 10), // Limit env exposure
      });
    }
  }
}

// ============================================================================
// TYPE-SAFE ENV ACCESS HELPERS
// ============================================================================

/**
 * Get environment variable or throw if not set
 */
function getEnvOrThrow(key: keyof Bun.Env): string {
  const value = Bun.env[key];
  if (!value) {
    throw new TagManagerError(`Required environment variable ${key} is not set`, {
      variable: key,
      suggestion: `Add ${key} to your .env file or export it`,
    });
  }
  return value;
}

/**
 * Get environment variable with default value
 */
function getEnvWithDefault<T>(key: keyof Bun.Env, defaultValue: T): string | T {
  return Bun.env[key] ?? defaultValue;
}

// Safe configuration loading with error boundaries
function loadConfig(): TagManagerConfig {
  return ConfigLoader.load();
}

const CONFIG = loadConfig();

// ============================================================================
// CACHE SYSTEM (with error tracking)
// ============================================================================

class TagCache {
  private cache = new Map<string, { data: any; timestamp: number; accessCount: number }>();
  private stats = { hits: 0, misses: 0, errors: 0 };
  
  get(key: string): any {
    try {
      const entry = this.cache.get(key);
      if (entry) {
        entry.accessCount++;
        this.stats.hits++;
        return entry.data;
      }
      this.stats.misses++;
      return null;
    } catch (error) {
      this.stats.errors++;
      throw new TagManagerError('Cache get failed', { key, error: (error as Error).message });
    }
  }
  
  set(key: string, data: any): void {
    try {
      if (this.cache.size >= CONFIG.maxCacheSize) {
        // Evict least recently used
        const lru = [...this.cache.entries()]
          .sort((a, b) => a[1].accessCount - b[1].accessCount)[0];
        if (lru) this.cache.delete(lru[0]);
      }
      this.cache.set(key, { data, timestamp: Date.now(), accessCount: 0 });
    } catch (error) {
      throw new TagManagerError('Cache set failed', { key, error: (error as Error).message });
    }
  }
  
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, errors: 0 };
  }
  
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: total > 0 ? `${((this.stats.hits / total) * 100).toFixed(1)}%` : '0%',
      totalRequests: total,
    };
  }
  
  [Bun.inspect.custom](depth: number, options: any) {
    const stats = this.getStats();
    return {
      type: 'TagCache',
      size: stats.size,
      maxSize: CONFIG.maxCacheSize,
      hitRate: stats.hitRate,
      hits: stats.hits,
      misses: stats.misses,
      errors: stats.errors,
      utilization: `${((stats.size / CONFIG.maxCacheSize) * 100).toFixed(1)}%`,
    };
  }
}

const tagCache = CONFIG.enableCaching ? new TagCache() : null;

// ============================================================================
// TAG PARSER (with error handling)
// ============================================================================

// MetadataTag is now imported from types/metadata.ts

class TagParser {
  private static readonly TAG_REGEX = /^\[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]\[META:([^\]]+)\]\[([^\]]+)\]\[(\#REF:[^\]]+)\]$/;
  
  static parse(tag: string): MetadataTag {
    try {
      const match = tag.match(TagParser.TAG_REGEX);
      if (!match) {
        throw new TagManagerError('Invalid tag format', { tag });
      }

      const meta: Record<string, string> = {};
      const metaStr = match[4];
      
      // Parse META properties: property=value,property2=value2
      // Values can contain commas (e.g., bun-functions=spawn,which,sleep)
      // Match until next property (starts with letter-hyphen-letter pattern followed by =) or end
      const metaRegex = /([a-zA-Z-]+)=([^,]+(?:,[^=]+)*?)(?=,[a-zA-Z-]+=|$)/g;
      let metaPair;
      metaRegex.lastIndex = 0;
      while ((metaPair = metaRegex.exec(metaStr)) !== null) {
        meta[metaPair[1]] = metaPair[2];
      }

      return {
        domain: match[1],
        scope: match[2],
        type: match[3],
        meta,
        class: match[5],
        ref: match[6],
      };
    } catch (error) {
      if (error instanceof TagManagerError) {
        throw error;
      }
      throw new TagManagerError('Tag parsing failed', { tag, error: (error as Error).message });
    }
  }
  
  static validate(tag: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Fast path: check regex first to avoid expensive exception handling
    const match = tag.match(TagParser.TAG_REGEX);
    if (!match) {
      errors.push('Invalid tag format');
      return { valid: false, errors };
    }
    
    // Parse without throwing exceptions
    const meta: Record<string, string> = {};
    const metaStr = match[4];
    
    // Parse META properties: property=value,property2=value2
    const metaRegex = /([a-zA-Z-]+)=([^,]+(?:,[^=]+)*?)(?=,[a-zA-Z-]+=|$)/g;
    let metaPair;
    metaRegex.lastIndex = 0;
    while ((metaPair = metaRegex.exec(metaStr)) !== null) {
      meta[metaPair[1]] = metaPair[2];
    }
    
    const domain = match[1];
    const scope = match[2];
    const type = match[3];
    const ref = match[6];
    
    // Validation checks
    if (!domain) errors.push('Domain required');
    if (!scope) errors.push('Scope required');
    
    const validTypes = ['plan', 'feat', 'refactor', 'fix', 'docs', 'perf', 'test'];
    if (!validTypes.includes(type)) {
      errors.push(`Invalid type: must be one of ${validTypes.join(', ')}`);
    }
    
    if (!meta.priority) errors.push('META:priority required');
    
    if (!ref.startsWith('#REF:')) {
      errors.push('REF must start with #REF:');
    }
    
    return { valid: errors.length === 0, errors };
  }
}

// ============================================================================
// SECURITY: SENSITIVE DATA REDACTION
// ============================================================================

class SecurityRedactor {
  static redact(value: any, patterns: RegExp[]): any {
    if (typeof value === 'string') {
      let redacted = value;
      for (const pattern of patterns) {
        redacted = redacted.replace(pattern, (match, key, secret) => {
          return `${key}: [REDACTED]`;
        });
      }
      return redacted;
    }
    
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.map(item => SecurityRedactor.redact(item, patterns));
      }
      
      const redacted: any = {};
      for (const [key, val] of Object.entries(value)) {
        const isSensitiveKey = patterns.some(p => p.test(key));
        if (isSensitiveKey && typeof val === 'string') {
          redacted[key] = '[REDACTED]';
        } else {
          redacted[key] = SecurityRedactor.redact(val, patterns);
        }
      }
      return redacted;
    }
    
    return value;
  }
}

// ============================================================================
// TAG MANAGER CORE
// ============================================================================

class TagManagerPro {
  private config: TagManagerConfig;
  private cache: TagCache | null;
  
  constructor(config?: Partial<TagManagerConfig>) {
    this.config = { ...CONFIG, ...config };
    this.cache = this.config.enableCaching ? (tagCache || new TagCache()) : null;
  }
  
  /**
   * Scan files for metadata tags with advanced features
   */
  async scanFiles(pattern: string): Promise<Array<{
    file: string;
    tag: string;
    line: number;
    valid: boolean;
    parsed?: MetadataTag;
    timeNs: number;
    memoryDelta: number;
  }>> {
    const startTime = Bun.nanoseconds();
    const memoryBefore = process.memoryUsage();
    
    try {
      const glob = new Bun.Glob(pattern);
      const files = Array.from(glob.scanSync());
      const results: Array<{
        file: string;
        tag: string;
        line: number;
        valid: boolean;
        parsed?: MetadataTag;
        timeNs: number;
        memoryDelta: number;
      }> = [];
      
      const isVerbose = import.meta.main || Bun.env.NODE_ENV !== 'production';
      let processed = 0;
      
      for (const file of files) {
        try {
          const fileStartTime = Bun.nanoseconds();
          const fileMemoryBefore = process.memoryUsage();
          
          // Check cache first
          const cacheKey = `scan:${file}`;
          let content: string;
          
          if (this.cache) {
            const cached = this.cache.get(cacheKey);
            if (cached) {
              content = cached;
            } else {
              content = await Bun.file(file).text();
              this.cache.set(cacheKey, content);
            }
          } else {
            content = await Bun.file(file).text();
          }
          
          const lines = content.split('\n');
          
          lines.forEach((line, idx) => {
            const tagMatch = line.match(/\[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]\[META:[^\]]+\]\[([^\]]+)\]\[(\#REF:[^\]]+)\]/);
            if (tagMatch) {
              const tag = tagMatch[0];
              const validation = TagParser.validate(tag);
              
              let parsed: MetadataTag | undefined;
              try {
                parsed = TagParser.parse(tag);
                parsed.file = file;
                parsed.line = idx + 1;
              } catch {
                // Parsing failed, but we have validation errors
              }
              
              const timeNs = Bun.nanoseconds() - fileStartTime;
              const memoryDelta = process.memoryUsage().heapUsed - fileMemoryBefore.heapUsed;
              
              results.push({
                file,
                tag,
                line: idx + 1,
                valid: validation.valid,
                parsed,
                timeNs,
                memoryDelta,
              });
            }
          });
          
          processed++;
          if (isVerbose && processed % 10 === 0) {
            process.stdout.write(`\r${colors.cyan('Scanning...')} ${processed}/${files.length} (${((processed / files.length) * 100).toFixed(1)}%)`);
          }
        } catch (error) {
          throw new TagManagerError(`Failed to scan file: ${file}`, {
            file,
            error: (error as Error).message,
            stack: (error as Error).stack,
          });
        }
      }
      
      if (isVerbose) {
        process.stdout.write('\r' + ' '.repeat(50) + '\r');
      }
      
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
      const memoryDelta = process.memoryUsage().heapUsed - memoryBefore.heapUsed;
      
      return results;
    } catch (error) {
      if (error instanceof TagManagerError) {
        throw error;
      }
      throw new TagManagerError('File scan failed', {
        pattern,
        error: (error as Error).message,
      });
    }
  }
  
  /**
   * Format results as table using Bun.inspect.table
   */
  formatResultsAsTable(results: Array<{
    file: string;
    tag: string;
    line: number;
    valid: boolean;
    parsed?: MetadataTag;
    timeNs?: number;
    memoryDelta?: number;
  }>): string {
    // Apply security redaction if enabled
    let displayResults = results;
    if (this.config.redactSensitive) {
      displayResults = SecurityRedactor.redact(results, this.config.sensitiveKeys) as typeof results;
    }
    
    // Limit results
    const slice = displayResults.slice(0, this.config.maxArrayLength);
    
    // Build table data
    const tableData = slice.map(r => {
      const base: Record<string, any> = {
        File: this.formatFile(r.file),
        Line: r.line,
        Valid: r.valid ? '✅' : '❌',
      };
      
      if (r.parsed) {
        base.Domain = r.parsed.domain;
        base.Scope = r.parsed.scope;
        base.Type = r.parsed.type;
        base.Priority = r.parsed.meta.priority || '-';
        base.Status = r.parsed.meta.status || '-';
        base.Class = r.parsed.class;
        base.Ref = this.formatRef(r.parsed.ref);
      }
      
      if (r.timeNs !== undefined) {
        base.Time = `${(r.timeNs / 1_000_000).toFixed(2)}ms`;
      }
      
      if (r.memoryDelta !== undefined) {
        base.Memory = this.formatMemory(r.memoryDelta);
      }
      
      // Filter by tableProperties if specified
      if (this.config.tableProperties && this.config.tableProperties.length > 0) {
        const filtered: Record<string, any> = {};
        for (const prop of this.config.tableProperties) {
          const key = prop.trim();
          if (base[key] !== undefined) {
            filtered[key] = base[key];
          }
        }
        return filtered;
      }
      
      return base;
    });
    
    if (tableData.length === 0) {
      return '(no results)';
    }
    
    // Format with Bun.inspect.table
    return Bun.inspect.table(tableData, {
      colors: this.config.tableColors,
      depth: this.config.tableDepth,
    });
  }
  
  /**
   * Format file path with truncation
   */
  private formatFile(file: string): string {
    if (!this.config.tableTruncate) {
      return file;
    }
    
    const maxWidth = this.config.tableMaxWidth;
    const displayWidth = Bun.stringWidth(file);
    
    if (displayWidth <= maxWidth) {
      return file;
    }
    
    // Truncate from start if too long
    let truncated = '';
    let width = 0;
    const ellipsis = '...';
    const ellipsisWidth = Bun.stringWidth(ellipsis);
    
    // Work backwards from end
    for (let i = file.length - 1; i >= 0; i--) {
      const char = file[i];
      const charWidth = Bun.stringWidth(char);
      if (width + charWidth + ellipsisWidth > maxWidth) {
        break;
      }
      truncated = char + truncated;
      width += charWidth;
    }
    
    return ellipsis + truncated;
  }
  
  /**
   * Format reference with truncation
   */
  private formatRef(ref: string): string {
    if (!this.config.tableTruncate) {
      return ref;
    }
    
    const maxWidth = Math.min(this.config.tableMaxWidth, 30);
    const displayWidth = Bun.stringWidth(ref);
    
    if (displayWidth <= maxWidth) {
      return ref;
    }
    
    return ref.slice(0, maxWidth - 3) + '...';
  }
  
  /**
   * Format memory bytes
   */
  private formatMemory(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  
  /**
   * Format results with advanced array formatting
   */
  formatResults(results: Array<{ file: string; tag: string; line: number; valid: boolean; parsed?: MetadataTag }>): string {
    // Apply security redaction if enabled
    let displayResults = results;
    if (this.config.redactSensitive) {
      displayResults = SecurityRedactor.redact(results, this.config.sensitiveKeys) as typeof results;
    }
    
    // Format based on arrayFormat option
    const slice = displayResults.slice(0, this.config.maxArrayLength);
    
    switch (this.config.arrayFormat) {
      case 'dense':
        return Bun.inspect(slice, { compact: true, colors: this.config.tableColors });
      case 'compact':
        return Bun.inspect(slice, { compact: true, colors: this.config.tableColors, maxArrayLength: this.config.maxArrayLength });
      case 'expanded':
      default:
        return Bun.inspect(slice, { compact: false, colors: this.config.tableColors, maxArrayLength: this.config.maxArrayLength });
    }
  }
  
  /**
   * Get execution context
   */
  getExecutionContext(): Record<string, any> {
    const context: Record<string, any> = {
      bunVersion: Bun.version,
      bunRevision: Bun.revision,
      nodeEnv: Bun.env.NODE_ENV || 'development',
      debugLevel: Bun.env.DEBUG_LEVEL || '0',
    };
    
    if (this.config.includeExecutionContext) {
      context.mainScript = Bun.main;
      context.currentPath = import.meta.path;
      context.isMainScript = import.meta.main;
    }
    
    if (this.config.includeFileContext) {
      context.timestamp = new Date().toISOString();
    }
    
    return context;
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache?.getStats() || null;
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main() {
  const args = Bun.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${colors.bold('Tag Manager Pro')} ${colors.blue('(Advanced)')}

${colors.bold('Commands:')}
  scan      [glob] [options]   Scan files for tags
                              Options: --table, --json
  validate  [tag]              Validate tag format
  validate-bun-functions        Validate Bun function tracking in commit message
                              Reads from stdin (use in git hooks)
  stats                         Show cache statistics
  config                        Show current configuration
  table-demo                    Demonstrate table formatting options

${colors.bold('Environment Variables:')}
  TAG_ARRAY_FORMAT              Array format: dense|expanded|compact
  TAG_ARRAY_SEP                 Array separator (default: ', ')
  TAG_MAX_ARRAY_LEN             Max array length (default: 50)
  TAG_INCLUDE_EXEC_CONTEXT      Include execution context (true/false)
  TAG_INCLUDE_FILE_CONTEXT      Include file context (true/false)
  TAG_REDACT_SENSITIVE          Redact sensitive data (true/false)
  TAG_ENABLE_CACHE              Enable caching (true/false)
  TAG_MAX_CACHE_SIZE            Max cache size (default: 1000)
  TAG_TABLE_COLORS              Enable table colors (default: true)
  TAG_TABLE_PROPERTIES          Comma-separated column list (e.g., "File,Valid,Domain")
  TAG_TABLE_MAX_WIDTH           Max column width (default: 40)
  TAG_TABLE_TRUNCATE            Enable truncation (default: true)
  TAG_TABLE_DEPTH               Table inspection depth (default: 2)
  TAG_TABLE_FORMAT              Use table format for scan (true/false)
  DEBUG_LEVEL                   Debug level (0-5)

${colors.bold('Examples:')}
  bun run examples/demos/tag-manager-pro.ts scan "src/**/*.ts"
  bun run examples/demos/tag-manager-pro.ts scan "src/**/*.ts" --table
  bun run examples/demos/tag-manager-pro.ts scan "src/**/*.ts" --json > tags.json
  bun run examples/demos/tag-manager-pro.ts validate "[hyper-bun][utils][feat][META:priority=high][tag-manager][#REF:Bun.utils]"
  echo "commit message" | bun run examples/demos/tag-manager-pro.ts validate-bun-functions
  bun run examples/demos/tag-manager-pro.ts table-demo
  
${colors.bold('Table Formatting Examples:')}
  # Custom columns
  TAG_TABLE_PROPERTIES=File,Valid,Domain,Priority bun run examples/demos/tag-manager-pro.ts scan "src/**/*.ts" --table
  
  # CI-friendly (no colors)
  TAG_TABLE_COLORS=false bun run examples/demos/tag-manager-pro.ts stats
  
  # Wide columns
  TAG_TABLE_MAX_WIDTH=50 bun run examples/demos/tag-manager-pro.ts scan "src/**/*.ts" --table
  
  # No truncation
  TAG_TABLE_TRUNCATE=false bun run examples/demos/tag-manager-pro.ts scan "src/**/*.ts" --table
  
  # Combined (production-ready)
  NODE_ENV=production TAG_TABLE_COLORS=true TAG_TABLE_MAX_ARRAY_LEN=5 TAG_TABLE_DEPTH=1 \\
    bun run examples/demos/tag-manager-pro.ts stats
`);
    process.exit(0);
  }
  
  const manager = new TagManagerPro();
  const cmd = args[0];
  
  try {
    switch (cmd) {
      case 'scan': {
        const pattern = args[1] || 'src/**/*.ts';
        const useTable = args.includes('--table') || Bun.env.TAG_TABLE_FORMAT === 'true';
        const useJson = args.includes('--json');
        
        if (!useJson) {
          console.log(`\n${colors.cyan('Scanning files...')}\n`);
        }
        
        const results = await manager.scanFiles(pattern);
        const context = manager.getExecutionContext();
        
        if (useJson) {
          // JSON output mode - write to stdout
          const output = JSON.stringify({
            timestamp: new Date().toISOString(),
            context,
            stats: {
              total: results.length,
              valid: results.filter(r => r.valid).length,
              invalid: results.filter(r => !r.valid).length,
            },
            cache: tagCache ? tagCache.getStats() : null,
            results,
          }, null, 2);
          console.log(output);
        } else {
          console.log(`\n${colors.bold('📊 Scan Results:')}\n`);
          console.log(`  Files scanned: ${results.length}`);
          console.log(`  Valid tags: ${results.filter(r => r.valid).length}`);
          console.log(`  Invalid tags: ${results.filter(r => !r.valid).length}`);
          
          if (CONFIG.includeExecutionContext) {
            console.log(`  Execution context:`, Bun.inspect(context, { colors: CONFIG.tableColors }));
          }
          
          if (tagCache) {
            console.log(`  Cache stats:`, Bun.inspect(tagCache, { colors: CONFIG.tableColors }));
          }
          
          console.log(`\n${colors.bold('Tags:')}\n`);
          if (useTable) {
            console.log(manager.formatResultsAsTable(results));
          } else {
            console.log(manager.formatResults(results));
          }
        }
        break;
      }
      
      case 'table-demo': {
        console.log(`\n${colors.bold('📋 Table Formatting Demos')}\n`);
        console.log('-'.repeat(70));
        
        // Demo 1: Basic table
        console.log(`\n${colors.cyan('Demo 1: Basic Table')}\n`);
        const demoResults1 = [
          { file: 'src/utils/bun.ts', line: 10, valid: true, parsed: { domain: 'hyper-bun', scope: 'utils', type: 'feat', meta: { priority: 'high' }, class: 'bun-utils', ref: '#REF:Bun.utils' } as MetadataTag },
          { file: 'src/hyper-bun/scheduler.ts', line: 25, valid: true, parsed: { domain: 'hyper-bun', scope: 'scheduler', type: 'refactor', meta: { priority: 'high', status: 'production' }, class: 'scheduler', ref: '#REF:scheduler.ts' } as MetadataTag },
          { file: 'src/utils/fetch-wrapper.ts', line: 5, valid: false, parsed: undefined },
        ];
        console.log(manager.formatResultsAsTable(demoResults1));
        
        // Demo 2: Custom properties
        console.log(`\n${colors.cyan('Demo 2: Custom Properties (File, Valid, Domain, Priority)')}\n`);
        const originalProps = CONFIG.tableProperties;
        CONFIG.tableProperties = ['File', 'Valid', 'Domain', 'Priority'];
        console.log(manager.formatResultsAsTable(demoResults1));
        CONFIG.tableProperties = originalProps;
        
        // Demo 3: No colors (CI-friendly)
        console.log(`\n${colors.cyan('Demo 3: No Colors (CI-friendly)')}\n`);
        const originalColors = CONFIG.tableColors;
        CONFIG.tableColors = false;
        console.log(manager.formatResultsAsTable(demoResults1));
        CONFIG.tableColors = originalColors;
        
        // Demo 4: Wide columns
        console.log(`\n${colors.cyan('Demo 4: Wide Columns (maxWidth=50)')}\n`);
        const originalWidth = CONFIG.tableMaxWidth;
        CONFIG.tableMaxWidth = 50;
        console.log(manager.formatResultsAsTable(demoResults1));
        CONFIG.tableMaxWidth = originalWidth;
        
        // Demo 5: No truncation
        console.log(`\n${colors.cyan('Demo 5: No Truncation (show full values)')}\n`);
        const originalTruncate = CONFIG.tableTruncate;
        CONFIG.tableTruncate = false;
        console.log(manager.formatResultsAsTable(demoResults1));
        CONFIG.tableTruncate = originalTruncate;
        
        // Demo 6: Combined configuration
        console.log(`\n${colors.cyan('Demo 6: Combined Configuration (Production-ready)')}\n`);
        CONFIG.tableColors = true;
        CONFIG.tableMaxWidth = 50;
        CONFIG.tableProperties = ['File', 'Domain', 'Type', 'Priority', 'Status'];
        CONFIG.tableDepth = 1;
        console.log(manager.formatResultsAsTable(demoResults1));
        
        // Reset
        CONFIG.tableProperties = originalProps;
        CONFIG.tableMaxWidth = originalWidth;
        CONFIG.tableTruncate = originalTruncate;
        
        console.log(`\n${colors.green('✅ Table demos complete!')}\n`);
        break;
      }
      
      case 'validate': {
        const tag = args[1];
        if (!tag) {
          throw new TagManagerError('Tag required', { command: 'validate' });
        }
        
        const validation = TagParser.validate(tag);
        if (validation.valid) {
          console.log(`${colors.green('✅ Valid tag')}`);
          const parsed = TagParser.parse(tag);
          console.log(Bun.inspect(parsed, { colors: true }));
        } else {
          console.log(`${colors.red('❌ Invalid tag')}`);
          validation.errors.forEach(err => console.log(`  ${colors.red('-')} ${err}`));
          process.exit(1);
        }
        break;
      }
      
      case 'validate-bun-functions': {
        // Read commit message from stdin
        const commitMsg = await Bun.stdin.text();
        const firstLine = commitMsg.split('\n')[0];
        
        // Match tag format: [DOMAIN][SCOPE][TYPE][META:...]
        const tagMatch = firstLine.match(/^\[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]\[META:([^\]]+)\]/);
        
        if (!tagMatch) {
          // No tag found - this is fine for non-tagged commits
          console.log(`${colors.gray('No tag found in commit message')}`);
          console.log(`${colors.gray('  This is normal for standard commits without tags')}`);
          process.exit(0);
        }
        
        const domain = tagMatch[1];
        const scope = tagMatch[2];
        const type = tagMatch[3];
        const metaStr = tagMatch[4];
        const hasBunFunc = metaStr.includes('bun-function') || metaStr.includes('bun-functions');
        const isBunRelated = domain.includes('hyper-bun') || firstLine.includes('Bun.');
        
        // Check if commit type suggests it might need Bun tracking (not docs/config)
        const needsBunTracking = type !== 'docs' && scope !== 'docs' && scope !== 'config';
        
        if (hasBunFunc) {
          console.log(`${colors.green('✅ Bun function tracking found in META')}`);
          // Match bun-function=value or bun-functions=value1,value2,value3
          const bunFuncMatch = metaStr.match(/bun-function(?:s)?=([^,}]+(?:,[^,}]+)*)/);
          if (bunFuncMatch) {
            const functions = bunFuncMatch[1].split(',').map(f => f.trim());
            console.log(`${colors.cyan('  Functions:')} ${functions.join(', ')}`);
            console.log(`${colors.gray('  Count:')} ${functions.length} function${functions.length !== 1 ? 's' : ''}`);
          }
          process.exit(0);
        } else if (isBunRelated && needsBunTracking) {
          // Bun-related commit but missing bun-function tracking
          console.log(`${colors.yellow('⚠️  Warning: Bun-related commit but no bun-function in META')}`);
          console.log(`${colors.gray('  Commit:')} ${firstLine.substring(0, 80)}${firstLine.length > 80 ? '...' : ''}`);
          console.log(`${colors.gray('  Domain:')} ${domain}`);
          console.log(`${colors.gray('  Type:')} ${type}`);
          console.log(`${colors.gray('  Suggestion: Add bun-function=<api> or bun-functions=<api1,api2> to META')}`);
          console.log(`${colors.gray('  Example: [META:priority=high,bun-function=spawn]')}`);
          console.log(`${colors.gray('  Note: This is advisory only - commit will proceed')}`);
          process.exit(0); // Non-blocking - advisory only
        } else {
          console.log(`${colors.gray('No Bun function tracking needed')}`);
          if (type === 'docs' || scope === 'docs') {
            console.log(`${colors.gray('  Reason: Documentation commit (docs/config changes don\'t need Bun tracking)')}`);
          } else {
            console.log(`${colors.gray('  Reason: Commit is not Bun-related')}`);
          }
          process.exit(0);
        }
      }
      
      case 'stats': {
        if (tagCache) {
          const stats = tagCache.getStats();
          const statsTable = [{
            Metric: 'Cache Size',
            Value: `${stats.size}/${CONFIG.maxCacheSize}`,
            Utilization: `${((stats.size / CONFIG.maxCacheSize) * 100).toFixed(1)}%`,
          }, {
            Metric: 'Hit Rate',
            Value: stats.hitRate,
            Utilization: `${stats.hits} hits / ${stats.totalRequests} requests`,
          }, {
            Metric: 'Misses',
            Value: stats.misses.toString(),
            Utilization: '-',
          }, {
            Metric: 'Errors',
            Value: stats.errors.toString(),
            Utilization: stats.errors > 0 ? colors.red('⚠️') : colors.green('✓'),
          }];
          
          console.log(Bun.inspect.table(statsTable, { 
            colors: CONFIG.tableColors,
            depth: CONFIG.tableDepth,
          }));
        } else {
          console.log('Cache is disabled');
        }
        break;
      }
      
      case 'config': {
        console.log(Bun.inspect(CONFIG, { colors: true }));
        console.log(`\n${colors.bold('Console Configuration:')}`);
        console.log(`  Depth: Set via --console-depth flag or bunfig.toml [console] depth`);
        console.log(`  Default: 2 levels`);
        console.log(`  Current: Using default (check with --console-depth flag)`);
        break;
      }
      
      default:
        throw new TagManagerError(`Unknown command: ${cmd}`, { command: cmd });
    }
  } catch (error) {
    if (error instanceof TagManagerError) {
      console.error(error);
    } else {
      console.error(new TagManagerError('Unexpected error', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      }));
    }
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  await main();
}

export { TagManagerPro, TagParser, TagManagerError, TagCache };
