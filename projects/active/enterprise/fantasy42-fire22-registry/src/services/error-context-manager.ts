#!/usr/bin/env bun

/**
 * 🚨 Enhanced Error Context Manager
 *
 * Advanced error context management with comprehensive tracking,
 * correlation IDs, error chains, and contextual debugging information.
 *
 * Features:
 * - Hierarchical error context tracking
 * - Error correlation and chaining
 * - Context-aware error reporting
 * - Performance impact assessment
 * - Error pattern analysis
 * - Automated remediation suggestions
 */

import { EventEmitter } from 'events';
import { Database } from 'bun:sqlite';

// ============================================================================
// ENHANCED CONTEXT INTERFACES
// ============================================================================

export interface ErrorContext {
  id: string;
  operationId: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component: string;
  module: string;
  function: string;
  file?: string;
  line?: number;
  timestamp: string;
  duration?: number;
  userAgent?: string;
  ipAddress?: string;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, any>;
  body?: any;
  metadata: Record<string, any>;
  breadcrumbs: ErrorBreadcrumb[];
  performance: ErrorPerformance;
  environment: ErrorEnvironment;
}

export interface ErrorBreadcrumb {
  timestamp: string;
  message: string;
  data?: any;
  level: 'debug' | 'info' | 'warn' | 'error';
}

export interface ErrorPerformance {
  memoryUsage: number;
  cpuUsage: number;
  responseTime?: number;
  databaseQueries?: number;
  externalCalls?: number;
  cacheHits?: number;
  cacheMisses?: number;
}

export interface ErrorEnvironment {
  nodeVersion: string;
  platform: string;
  arch: string;
  uptime: number;
  loadAverage: number[];
  memory: {
    total: number;
    free: number;
    used: number;
  };
  process: {
    pid: number;
    ppid: number;
    uid?: number;
    gid?: number;
  };
}

export interface EnhancedErrorReport {
  id: string;
  code: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'system' | 'application' | 'network' | 'database' | 'external' | 'user';
  context: ErrorContext;
  stack?: string;
  cause?: Error;
  correlatedErrors: string[];
  impact: ErrorImpact;
  remediation: ErrorRemediation;
  patterns: ErrorPattern[];
  resolution?: ErrorResolution;
}

export interface ErrorImpact {
  usersAffected: number;
  servicesAffected: string[];
  businessImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
  dataLoss: boolean;
  securityRisk: boolean;
  downtime: number; // minutes
}

export interface ErrorRemediation {
  automatic: boolean;
  steps: string[];
  estimatedTime: number; // minutes
  rollbackRequired: boolean;
  contacts: string[];
  documentation: string[];
}

export interface ErrorPattern {
  type: 'frequent' | 'similar' | 'cascading' | 'resource' | 'timing';
  description: string;
  frequency: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  relatedErrors: string[];
}

export interface ErrorResolution {
  resolvedAt: string;
  resolvedBy: string;
  method: string;
  notes: string;
  prevention: string[];
}

// ============================================================================
// ENHANCED ERROR CODES WITH CONTEXT
// ============================================================================

export const ENHANCED_ERROR_CODES = {
  // System Errors
  SYS_MEMORY_EXHAUSTED: {
    code: 'SYS_MEMORY_EXHAUSTED',
    severity: 'critical' as const,
    category: 'system' as const,
    title: 'Memory Exhausted',
    description: 'System memory usage exceeded safe limits',
    automaticRemediation: true,
    remediationSteps: ['Scale memory resources', 'Optimize memory usage', 'Restart affected services'],
  },

  SYS_CPU_OVERLOAD: {
    code: 'SYS_CPU_OVERLOAD',
    severity: 'high' as const,
    category: 'system' as const,
    title: 'CPU Overload',
    description: 'CPU usage exceeded safe thresholds',
    automaticRemediation: true,
    remediationSteps: ['Scale CPU resources', 'Optimize CPU-intensive operations', 'Load balance requests'],
  },

  SYS_DISK_FULL: {
    code: 'SYS_DISK_FULL',
    severity: 'critical' as const,
    category: 'system' as const,
    title: 'Disk Space Exhausted',
    description: 'Available disk space is critically low',
    automaticRemediation: false,
    remediationSteps: ['Clean up disk space', 'Scale storage resources', 'Archive old data'],
  },

  // Database Errors
  DB_CONNECTION_LOST: {
    code: 'DB_CONNECTION_LOST',
    severity: 'high' as const,
    category: 'database' as const,
    title: 'Database Connection Lost',
    description: 'Lost connection to database server',
    automaticRemediation: true,
    remediationSteps: ['Reconnect to database', 'Check database server status', 'Failover to backup'],
  },

  DB_QUERY_TIMEOUT: {
    code: 'DB_QUERY_TIMEOUT',
    severity: 'medium' as const,
    category: 'database' as const,
    title: 'Database Query Timeout',
    description: 'Database query exceeded timeout limit',
    automaticRemediation: true,
    remediationSteps: ['Optimize query performance', 'Increase timeout limit', 'Scale database resources'],
  },

  DB_TRANSACTION_DEADLOCK: {
    code: 'DB_TRANSACTION_DEADLOCK',
    severity: 'medium' as const,
    category: 'database' as const,
    title: 'Database Transaction Deadlock',
    description: 'Database transaction deadlock detected',
    automaticRemediation: true,
    remediationSteps: ['Retry transaction', 'Optimize transaction ordering', 'Reduce transaction scope'],
  },

  // Network Errors
  NET_CONNECTION_REFUSED: {
    code: 'NET_CONNECTION_REFUSED',
    severity: 'high' as const,
    category: 'network' as const,
    title: 'Connection Refused',
    description: 'Network connection was refused by target service',
    automaticRemediation: true,
    remediationSteps: ['Retry connection', 'Check service availability', 'Use alternative endpoint'],
  },

  NET_TIMEOUT: {
    code: 'NET_TIMEOUT',
    severity: 'medium' as const,
    category: 'network' as const,
    title: 'Network Timeout',
    description: 'Network request timed out',
    automaticRemediation: true,
    remediationSteps: ['Retry request', 'Increase timeout', 'Check network connectivity'],
  },

  NET_DNS_FAILURE: {
    code: 'NET_DNS_FAILURE',
    severity: 'medium' as const,
    category: 'network' as const,
    title: 'DNS Resolution Failed',
    description: 'Failed to resolve hostname to IP address',
    automaticRemediation: true,
    remediationSteps: ['Retry DNS resolution', 'Check DNS configuration', 'Use IP address directly'],
  },

  // Application Errors
  APP_VALIDATION_FAILED: {
    code: 'APP_VALIDATION_FAILED',
    severity: 'medium' as const,
    category: 'application' as const,
    title: 'Validation Failed',
    description: 'Input validation failed',
    automaticRemediation: false,
    remediationSteps: ['Fix input data', 'Update validation rules', 'Provide user feedback'],
  },

  APP_AUTHENTICATION_FAILED: {
    code: 'APP_AUTHENTICATION_FAILED',
    severity: 'medium' as const,
    category: 'application' as const,
    title: 'Authentication Failed',
    description: 'User authentication failed',
    automaticRemediation: false,
    remediationSteps: ['Verify credentials', 'Check authentication service', 'Reset password if needed'],
  },

  APP_AUTHORIZATION_FAILED: {
    code: 'APP_AUTHORIZATION_FAILED',
    severity: 'medium' as const,
    category: 'application' as const,
    title: 'Authorization Failed',
    description: 'User authorization failed',
    automaticRemediation: false,
    remediationSteps: ['Check user permissions', 'Update authorization rules', 'Contact administrator'],
  },

  // External Service Errors
  EXT_SERVICE_DOWN: {
    code: 'EXT_SERVICE_DOWN',
    severity: 'high' as const,
    category: 'external' as const,
    title: 'External Service Down',
    description: 'Required external service is unavailable',
    automaticRemediation: true,
    remediationSteps: ['Retry request', 'Use cached data', 'Switch to backup service'],
  },

  EXT_API_RATE_LIMITED: {
    code: 'EXT_API_RATE_LIMITED',
    severity: 'low' as const,
    category: 'external' as const,
    title: 'API Rate Limited',
    description: 'External API rate limit exceeded',
    automaticRemediation: true,
    remediationSteps: ['Wait and retry', 'Reduce request frequency', 'Upgrade API plan'],
  },

  // User Errors
  USR_INPUT_INVALID: {
    code: 'USR_INPUT_INVALID',
    severity: 'low' as const,
    category: 'user' as const,
    title: 'Invalid User Input',
    description: 'User provided invalid input',
    automaticRemediation: false,
    remediationSteps: ['Show validation errors', 'Provide input guidance', 'Use default values'],
  },

  USR_SESSION_EXPIRED: {
    code: 'USR_SESSION_EXPIRED',
    severity: 'low' as const,
    category: 'user' as const,
    title: 'Session Expired',
    description: 'User session has expired',
    automaticRemediation: true,
    remediationSteps: ['Redirect to login', 'Refresh authentication', 'Restore session state'],
  },
} as const;

// ============================================================================
// ENHANCED ERROR CONTEXT MANAGER
// ============================================================================

export class EnhancedErrorContextManager extends EventEmitter {
  private db: Database;
  private errorContexts: Map<string, ErrorContext> = new Map();
  private errorChains: Map<string, string[]> = new Map();
  private errorPatterns: Map<string, ErrorPattern[]> = new Map();
  private contextStack: ErrorContext[] = [];
  private breadcrumbBuffer: Map<string, ErrorBreadcrumb[]> = new Map();

  constructor(db: Database) {
    super();
    this.db = db;
    this.initializeDatabase();
    this.setupGlobalContextTracking();
  }

  // ============================================================================
  // CONTEXT MANAGEMENT
  // ============================================================================

  /**
   * Create a new error context
   */
  createContext(
    operationId: string,
    component: string,
    module: string,
    functionName: string,
    options: {
      userId?: string;
      sessionId?: string;
      requestId?: string;
      file?: string;
      line?: number;
      metadata?: Record<string, any>;
    } = {}
  ): ErrorContext {
    const contextId = this.generateContextId();
    const context: ErrorContext = {
      id: contextId,
      operationId,
      userId: options.userId,
      sessionId: options.sessionId,
      requestId: options.requestId,
      component,
      module,
      function: functionName,
      file: options.file,
      line: options.line,
      timestamp: new Date().toISOString(),
      metadata: options.metadata || {},
      breadcrumbs: [],
      performance: this.capturePerformanceMetrics(),
      environment: this.captureEnvironmentInfo(),
    };

    this.errorContexts.set(contextId, context);
    this.contextStack.push(context);

    // Add initial breadcrumb
    this.addBreadcrumb(contextId, `Context created for ${component}:${module}:${functionName}`, 'info', {
      operationId,
      ...options,
    });

    return context;
  }

  /**
   * Add breadcrumb to context
   */
  addBreadcrumb(
    contextId: string,
    message: string,
    level: 'debug' | 'info' | 'warn' | 'error' = 'info',
    data?: any
  ): void {
    const context = this.errorContexts.get(contextId);
    if (!context) return;

    const breadcrumb: ErrorBreadcrumb = {
      timestamp: new Date().toISOString(),
      message,
      data,
      level,
    };

    context.breadcrumbs.push(breadcrumb);

    // Keep only last 50 breadcrumbs
    if (context.breadcrumbs.length > 50) {
      context.breadcrumbs = context.breadcrumbs.slice(-50);
    }

    // Emit breadcrumb event
    this.emit('breadcrumb-added', { contextId, breadcrumb });
  }

  /**
   * Update context with additional metadata
   */
  updateContext(contextId: string, updates: Partial<ErrorContext>): void {
    const context = this.errorContexts.get(contextId);
    if (!context) return;

    Object.assign(context, updates);
    context.timestamp = new Date().toISOString();

    this.emit('context-updated', { contextId, updates });
  }

  /**
   * Close context and persist to database
   */
  async closeContext(contextId: string): Promise<void> {
    const context = this.errorContexts.get(contextId);
    if (!context) return;

    // Calculate duration
    const startTime = new Date(context.timestamp).getTime();
    const endTime = Date.now();
    context.duration = endTime - startTime;

    // Update performance metrics
    context.performance = this.capturePerformanceMetrics();

    // Persist to database
    await this.persistContext(context);

    // Remove from active contexts
    this.errorContexts.delete(contextId);
    const stackIndex = this.contextStack.findIndex(c => c.id === contextId);
    if (stackIndex > -1) {
      this.contextStack.splice(stackIndex, 1);
    }

    this.emit('context-closed', { contextId, duration: context.duration });
  }

  // ============================================================================
  // ENHANCED ERROR REPORTING
  // ============================================================================

  /**
   * Create comprehensive error report with context
   */
  async createErrorReport(
    error: Error,
    contextId: string,
    options: {
      code?: string;
      severity?: 'critical' | 'high' | 'medium' | 'low';
      category?: 'system' | 'application' | 'network' | 'database' | 'external' | 'user';
      correlatedErrors?: string[];
      impact?: Partial<ErrorImpact>;
    } = {}
  ): Promise<EnhancedErrorReport> {
    const context = this.errorContexts.get(contextId);
    if (!context) {
      throw new Error(`Context ${contextId} not found`);
    }

    const errorCode = options.code || this.classifyError(error);
    const errorConfig = ENHANCED_ERROR_CODES[errorCode as keyof typeof ENHANCED_ERROR_CODES];

    const report: EnhancedErrorReport = {
      id: this.generateErrorId(),
      code: errorCode,
      message: error.message,
      severity: options.severity || errorConfig?.severity || 'medium',
      category: options.category || errorConfig?.category || 'application',
      context,
      stack: error.stack,
      cause: error,
      correlatedErrors: options.correlatedErrors || [],
      impact: this.assessImpact(error, context, options.impact),
      remediation: this.generateRemediation(error, errorCode, context),
      patterns: await this.analyzeErrorPatterns(error, context),
    };

    // Add to error chain if correlated
    for (const correlatedId of report.correlatedErrors) {
      this.addToErrorChain(correlatedId, report.id);
    }

    // Persist error report
    await this.persistErrorReport(report);

    this.emit('error-report-created', report);

    return report;
  }

  /**
   * Classify error and return appropriate error code
   */
  private classifyError(error: Error): string {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // Database errors
    if (message.includes('connection') || message.includes('connect')) {
      return 'DB_CONNECTION_LOST';
    }
    if (message.includes('timeout') && stack.includes('database')) {
      return 'DB_QUERY_TIMEOUT';
    }
    if (message.includes('deadlock')) {
      return 'DB_TRANSACTION_DEADLOCK';
    }

    // Network errors
    if (message.includes('connection refused') || message.includes('econnrefused')) {
      return 'NET_CONNECTION_REFUSED';
    }
    if (message.includes('timeout') && (message.includes('fetch') || message.includes('http'))) {
      return 'NET_TIMEOUT';
    }
    if (message.includes('dns') || message.includes('enotfound')) {
      return 'NET_DNS_FAILURE';
    }

    // System errors
    if (message.includes('out of memory') || message.includes('memory')) {
      return 'SYS_MEMORY_EXHAUSTED';
    }
    if (message.includes('cpu') || message.includes('overload')) {
      return 'SYS_CPU_OVERLOAD';
    }
    if (message.includes('disk') || message.includes('space')) {
      return 'SYS_DISK_FULL';
    }

    // Application errors
    if (message.includes('validation') || message.includes('invalid')) {
      return 'APP_VALIDATION_FAILED';
    }
    if (message.includes('authentication') || message.includes('auth')) {
      return 'APP_AUTHENTICATION_FAILED';
    }
    if (message.includes('authorization') || message.includes('permission')) {
      return 'APP_AUTHORIZATION_FAILED';
    }

    // External service errors
    if (message.includes('service unavailable') || message.includes('502') || message.includes('503')) {
      return 'EXT_SERVICE_DOWN';
    }
    if (message.includes('rate limit') || message.includes('429')) {
      return 'EXT_API_RATE_LIMITED';
    }

    // User errors
    if (message.includes('session') && message.includes('expired')) {
      return 'USR_SESSION_EXPIRED';
    }
    if (message.includes('input') && message.includes('invalid')) {
      return 'USR_INPUT_INVALID';
    }

    return 'APP_VALIDATION_FAILED'; // Default
  }

  /**
   * Assess the impact of an error
   */
  private assessImpact(
    error: Error,
    context: ErrorContext,
    providedImpact?: Partial<ErrorImpact>
  ): ErrorImpact {
    const impact: ErrorImpact = {
      usersAffected: 1,
      servicesAffected: [context.component],
      businessImpact: 'low',
      dataLoss: false,
      securityRisk: false,
      downtime: 0,
      ...providedImpact,
    };

    // Assess based on error severity and context
    const message = error.message.toLowerCase();

    if (context.userId) {
      impact.usersAffected = Math.max(impact.usersAffected, 1);
    }

    if (message.includes('critical') || context.component === 'database') {
      impact.businessImpact = 'high';
      impact.downtime = 30; // 30 minutes estimated
    }

    if (message.includes('security') || message.includes('auth')) {
      impact.securityRisk = true;
    }

    if (message.includes('data') && message.includes('loss')) {
      impact.dataLoss = true;
    }

    return impact;
  }

  /**
   * Generate remediation steps for error
   */
  private generateRemediation(
    error: Error,
    errorCode: string,
    context: ErrorContext
  ): ErrorRemediation {
    const errorConfig = ENHANCED_ERROR_CODES[errorCode as keyof typeof ENHANCED_ERROR_CODES];

    const remediation: ErrorRemediation = {
      automatic: errorConfig?.automaticRemediation || false,
      steps: errorConfig?.remediationSteps || ['Investigate error details', 'Apply appropriate fix', 'Test resolution'],
      estimatedTime: this.estimateResolutionTime(errorCode, context),
      rollbackRequired: this.requiresRollback(errorCode),
      contacts: this.getRelevantContacts(context.component),
      documentation: this.getRelevantDocumentation(errorCode),
    };

    return remediation;
  }

  /**
   * Analyze error patterns for better insights
   */
  private async analyzeErrorPatterns(error: Error, context: ErrorContext): Promise<ErrorPattern[]> {
    const patterns: ErrorPattern[] = [];
    const similarErrors = await this.findSimilarErrors(error, context);

    if (similarErrors.length > 5) {
      patterns.push({
        type: 'frequent',
        description: `Similar error occurred ${similarErrors.length} times in the last hour`,
        frequency: similarErrors.length,
        trend: 'increasing',
        relatedErrors: similarErrors.map(e => e.id),
      });
    }

    // Check for cascading errors
    const cascadingErrors = await this.findCascadingErrors(context);
    if (cascadingErrors.length > 0) {
      patterns.push({
        type: 'cascading',
        description: `Error triggered ${cascadingErrors.length} related errors`,
        frequency: cascadingErrors.length,
        trend: 'stable',
        relatedErrors: cascadingErrors,
      });
    }

    return patterns;
  }

  // ============================================================================
  // ERROR CORRELATION AND CHAINS
  // ============================================================================

  /**
   * Add error to correlation chain
   */
  private addToErrorChain(parentErrorId: string, childErrorId: string): void {
    const chain = this.errorChains.get(parentErrorId) || [];
    chain.push(childErrorId);
    this.errorChains.set(parentErrorId, chain);
  }

  /**
   * Get error correlation chain
   */
  getErrorChain(errorId: string): string[] {
    return this.errorChains.get(errorId) || [];
  }

  /**
   * Find similar errors in recent history
   */
  private async findSimilarErrors(error: Error, context: ErrorContext): Promise<any[]> {
    // This would query the database for similar errors
    // Implementation depends on the database schema
    return [];
  }

  /**
   * Find cascading errors triggered by this context
   */
  private async findCascadingErrors(context: ErrorContext): Promise<string[]> {
    // Look for errors that occurred after this context with similar metadata
    return [];
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Capture current performance metrics
   */
  private capturePerformanceMetrics(): ErrorPerformance {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memoryUsage: memUsage.heapUsed,
      cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
      databaseQueries: 0, // Would be tracked separately
      externalCalls: 0, // Would be tracked separately
      cacheHits: 0, // Would be tracked separately
      cacheMisses: 0, // Would be tracked separately
    };
  }

  /**
   * Capture environment information
   */
  private captureEnvironmentInfo(): ErrorEnvironment {
    const memUsage = process.memoryUsage();

    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      loadAverage: process.platform === 'win32' ? [] : require('os').loadavg(),
      memory: {
        total: memUsage.heapTotal,
        free: memUsage.heapTotal - memUsage.heapUsed,
        used: memUsage.heapUsed,
      },
      process: {
        pid: process.pid,
        ppid: process.ppid || 0,
        uid: process.getuid?.(),
        gid: process.getgid?.(),
      },
    };
  }

  /**
   * Estimate resolution time for error
   */
  private estimateResolutionTime(errorCode: string, context: ErrorContext): number {
    const errorConfig = ENHANCED_ERROR_CODES[errorCode as keyof typeof ENHANCED_ERROR_CODES];

    switch (errorConfig?.severity) {
      case 'critical': return 60; // 1 hour
      case 'high': return 30; // 30 minutes
      case 'medium': return 15; // 15 minutes
      case 'low': return 5; // 5 minutes
      default: return 10; // 10 minutes
    }
  }

  /**
   * Check if error requires rollback
   */
  private requiresRollback(errorCode: string): boolean {
    const rollbackErrors = ['DB_TRANSACTION_DEADLOCK', 'SYS_MEMORY_EXHAUSTED', 'APP_VALIDATION_FAILED'];
    return rollbackErrors.includes(errorCode);
  }

  /**
   * Get relevant contacts for component
   */
  private getRelevantContacts(component: string): string[] {
    const contacts: Record<string, string[]> = {
      database: ['database-admin@company.com', 'devops@company.com'],
      network: ['network-admin@company.com', 'devops@company.com'],
      authentication: ['security@company.com', 'auth-team@company.com'],
      api: ['api-team@company.com', 'backend@company.com'],
    };

    return contacts[component] || ['support@company.com'];
  }

  /**
   * Get relevant documentation
   */
  private getRelevantDocumentation(errorCode: string): string[] {
    const docs: Record<string, string[]> = {
      DB_CONNECTION_LOST: ['database-troubleshooting.md', 'connection-pooling-guide.md'],
      NET_TIMEOUT: ['network-timeout-guide.md', 'api-resilience-patterns.md'],
      SYS_MEMORY_EXHAUSTED: ['memory-optimization-guide.md', 'scaling-best-practices.md'],
    };

    return docs[errorCode] || ['general-troubleshooting.md'];
  }

  /**
   * Generate unique IDs
   */
  private generateContextId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================================
  // DATABASE OPERATIONS
  // ============================================================================

  /**
   * Initialize database tables
   */
  private initializeDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS error_contexts (
        id TEXT PRIMARY KEY,
        operation_id TEXT,
        user_id TEXT,
        session_id TEXT,
        request_id TEXT,
        component TEXT,
        module TEXT,
        function TEXT,
        file TEXT,
        line INTEGER,
        timestamp TEXT,
        duration INTEGER,
        metadata TEXT,
        breadcrumbs TEXT,
        performance TEXT,
        environment TEXT
      );

      CREATE TABLE IF NOT EXISTS error_reports (
        id TEXT PRIMARY KEY,
        code TEXT,
        message TEXT,
        severity TEXT,
        category TEXT,
        context_id TEXT,
        stack TEXT,
        correlated_errors TEXT,
        impact TEXT,
        remediation TEXT,
        patterns TEXT,
        resolution TEXT,
        created_at TEXT,
        FOREIGN KEY (context_id) REFERENCES error_contexts (id)
      );

      CREATE TABLE IF NOT EXISTS error_chains (
        parent_error_id TEXT,
        child_error_id TEXT,
        created_at TEXT,
        FOREIGN KEY (parent_error_id) REFERENCES error_reports (id),
        FOREIGN KEY (child_error_id) REFERENCES error_reports (id)
      );

      CREATE INDEX IF NOT EXISTS idx_error_contexts_operation ON error_contexts (operation_id);
      CREATE INDEX IF NOT EXISTS idx_error_contexts_component ON error_contexts (component);
      CREATE INDEX IF NOT EXISTS idx_error_reports_code ON error_reports (code);
      CREATE INDEX IF NOT EXISTS idx_error_reports_severity ON error_reports (severity);
    `);
  }

  /**
   * Persist context to database
   */
  private async persistContext(context: ErrorContext): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO error_contexts
      (id, operation_id, user_id, session_id, request_id, component, module, function,
       file, line, timestamp, duration, metadata, breadcrumbs, performance, environment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      context.id,
      context.operationId,
      context.userId || null,
      context.sessionId || null,
      context.requestId || null,
      context.component,
      context.module,
      context.function,
      context.file || null,
      context.line || null,
      context.timestamp,
      context.duration || null,
      JSON.stringify(context.metadata),
      JSON.stringify(context.breadcrumbs),
      JSON.stringify(context.performance),
      JSON.stringify(context.environment)
    );
  }

  /**
   * Persist error report to database
   */
  private async persistErrorReport(report: EnhancedErrorReport): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO error_reports
      (id, code, message, severity, category, context_id, stack, correlated_errors,
       impact, remediation, patterns, resolution, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      report.id,
      report.code,
      report.message,
      report.severity,
      report.category,
      report.context.id,
      report.stack || null,
      JSON.stringify(report.correlatedErrors),
      JSON.stringify(report.impact),
      JSON.stringify(report.remediation),
      JSON.stringify(report.patterns),
      report.resolution ? JSON.stringify(report.resolution) : null,
      new Date().toISOString()
    );

    // Persist error chains
    for (const childErrorId of report.correlatedErrors) {
      const chainStmt = this.db.prepare(`
        INSERT INTO error_chains (parent_error_id, child_error_id, created_at)
        VALUES (?, ?, ?)
      `);
      chainStmt.run(report.id, childErrorId, new Date().toISOString());
    }
  }

  // ============================================================================
  // GLOBAL CONTEXT TRACKING
  // ============================================================================

  /**
   * Setup global context tracking
   */
  private setupGlobalContextTracking(): void {
    // Track unhandled errors
    process.on('unhandledRejection', (reason, promise) => {
      this.handleGlobalError(reason, 'unhandledRejection', { promise });
    });

    process.on('uncaughtException', (error) => {
      this.handleGlobalError(error, 'uncaughtException');
    });

    // Track process metrics
    setInterval(() => {
      this.trackProcessMetrics();
    }, 30000); // Every 30 seconds
  }

  /**
   * Handle global errors with context
   */
  private async handleGlobalError(
    error: any,
    type: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const context = this.createContext(
      `global_${Date.now()}`,
      'system',
      'global',
      type,
      {
        metadata: { type, ...metadata },
      }
    );

    try {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      await this.createErrorReport(errorObj, context.id, {
        category: 'system',
        severity: 'critical',
      });
    } finally {
      await this.closeContext(context.id);
    }
  }

  /**
   * Track process metrics
   */
  private trackProcessMetrics(): void {
    const metrics = this.capturePerformanceMetrics();
    this.emit('process-metrics', metrics);
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get error statistics
   */
  async getErrorStatistics(timeframe: number = 3600000): Promise<any> {
    const cutoff = new Date(Date.now() - timeframe).toISOString();

    const stats = this.db.prepare(`
      SELECT
        severity,
        category,
        COUNT(*) as count
      FROM error_reports
      WHERE created_at > ?
      GROUP BY severity, category
    `).all(cutoff);

    return stats;
  }

  /**
   * Get recent error reports
   */
  async getRecentErrors(limit: number = 50): Promise<EnhancedErrorReport[]> {
    const rows = this.db.prepare(`
      SELECT * FROM error_reports
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit);

    return rows.map(row => ({
      ...row,
      context: JSON.parse(row.context || '{}'),
      correlatedErrors: JSON.parse(row.correlated_errors || '[]'),
      impact: JSON.parse(row.impact || '{}'),
      remediation: JSON.parse(row.remediation || '{}'),
      patterns: JSON.parse(row.patterns || '[]'),
      resolution: row.resolution ? JSON.parse(row.resolution) : undefined,
    }));
  }

  /**
   * Resolve an error
   */
  async resolveError(
    errorId: string,
    resolvedBy: string,
    method: string,
    notes: string,
    prevention: string[]
  ): Promise<void> {
    const resolution: ErrorResolution = {
      resolvedAt: new Date().toISOString(),
      resolvedBy,
      method,
      notes,
      prevention,
    };

    const stmt = this.db.prepare(`
      UPDATE error_reports
      SET resolution = ?
      WHERE id = ?
    `);

    stmt.run(JSON.stringify(resolution), errorId);

    this.emit('error-resolved', { errorId, resolution });
  }

  /**
   * Get active contexts
   */
  getActiveContexts(): ErrorContext[] {
    return Array.from(this.errorContexts.values());
  }

  /**
   * Cleanup old contexts and reports
   */
  async cleanup(retentionDays: number = 30): Promise<void> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

    // Delete old contexts
    this.db.prepare('DELETE FROM error_contexts WHERE timestamp < ?').run(cutoff);

    // Delete old error reports
    this.db.prepare('DELETE FROM error_reports WHERE created_at < ?').run(cutoff);

    // Delete orphaned chains
    this.db.prepare(`
      DELETE FROM error_chains
      WHERE parent_error_id NOT IN (SELECT id FROM error_reports)
         OR child_error_id NOT IN (SELECT id FROM error_reports)
    `).run();

    this.emit('cleanup-completed', { retentionDays, cutoff });
  }
}

// ============================================================================
// CONTEXT-AWARE ERROR DECORATOR
// ============================================================================

/**
 * Decorator to add error context tracking to functions
 */
export function withErrorContext(
  component: string,
  module: string,
  options: {
    trackPerformance?: boolean;
    enableBreadcrumbs?: boolean;
  } = {}
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const errorManager = (global as any).errorContextManager;
      if (!errorManager) {
        return originalMethod.apply(this, args);
      }

      const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const context = errorManager.createContext(
        operationId,
        component,
        module,
        propertyKey,
        {
          metadata: {
            argsCount: args.length,
            method: 'decorated',
          },
        }
      );

      try {
        if (options.enableBreadcrumbs) {
          errorManager.addBreadcrumb(
            context.id,
            `Executing ${propertyKey}`,
            'info',
            { argsCount: args.length }
          );
        }

        const result = await originalMethod.apply(this, args);

        if (options.enableBreadcrumbs) {
          errorManager.addBreadcrumb(
            context.id,
            `Successfully executed ${propertyKey}`,
            'info',
            { hasResult: result !== undefined }
          );
        }

        return result;
      } catch (error) {
        await errorManager.createErrorReport(error as Error, context.id);
        throw error;
      } finally {
        await errorManager.closeContext(context.id);
      }
    };

    return descriptor;
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export default EnhancedErrorContextManager;
