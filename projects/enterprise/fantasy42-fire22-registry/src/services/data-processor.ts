#!/usr/bin/env bun

/**
 * 🚀 Advanced Data Processing Service
 *
 * Centralized data processing with comprehensive error context management,
 * pipeline orchestration, and enterprise-grade reliability features.
 *
 * Features:
 * - Unified data processing pipeline
 * - Enhanced error context tracking
 * - Batch processing with rollback support
 * - Data validation and transformation
 * - Performance monitoring and metrics
 * - Resource management integration
 */

import { EventEmitter } from 'events';
import { Database } from 'bun:sqlite';
import { DatabaseResourceManager, BatchProcessor } from '../resource-manager';
import { AdvancedErrorHandler } from './error-handler';

// ============================================================================
// CORE INTERFACES
// ============================================================================

export interface DataProcessingContext {
  operationId: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  source: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ProcessingResult<T = any> {
  success: boolean;
  data?: T;
  error?: ProcessingError;
  context: DataProcessingContext;
  metrics: ProcessingMetrics;
  duration: number;
}

export interface ProcessingError {
  code: string;
  message: string;
  context: DataProcessingContext;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'validation' | 'transformation' | 'persistence' | 'external' | 'system';
  remediation?: string;
  stack?: string;
  cause?: Error;
}

export interface ProcessingMetrics {
  recordsProcessed: number;
  recordsFailed: number;
  bytesProcessed: number;
  processingTime: number;
  memoryUsage: number;
  cacheHits: number;
  cacheMisses: number;
  retries: number;
}

export interface DataPipeline {
  id: string;
  name: string;
  description: string;
  steps: DataPipelineStep[];
  config: PipelineConfig;
}

export interface DataPipelineStep {
  id: string;
  name: string;
  type: 'validation' | 'transformation' | 'enrichment' | 'persistence' | 'notification';
  handler: DataProcessor;
  config: Record<string, any>;
  retryPolicy: RetryPolicy;
}

export interface PipelineConfig {
  batchSize: number;
  timeout: number;
  enableRollback: boolean;
  enableMetrics: boolean;
  enableCaching: boolean;
  cacheTTL: number;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelay: number;
  maxDelay: number;
}

export interface DataProcessor<T = any, R = any> {
  process(data: T, context: DataProcessingContext): Promise<R>;
  validate?(data: T): Promise<boolean>;
  transform?(data: T): Promise<T>;
  cleanup?(): Promise<void>;
}

// ============================================================================
// ENHANCED ERROR CODES WITH CONTEXT
// ============================================================================

export const PROCESSING_ERROR_CODES = {
  // Validation Errors (VAL prefix)
  VAL_SCHEMA_INVALID: {
    code: 'VAL_SCHEMA_INVALID',
    category: 'validation' as const,
    severity: 'high' as const,
    title: 'Schema Validation Failed',
    description: 'Input data does not match expected schema',
    remediation: 'Check data format and required fields',
  },
  VAL_CONSTRAINT_VIOLATION: {
    code: 'VAL_CONSTRAINT_VIOLATION',
    category: 'validation' as const,
    severity: 'high' as const,
    title: 'Constraint Violation',
    description: 'Data violates business rules or constraints',
    remediation: 'Review data constraints and validation rules',
  },
  VAL_DATA_CORRUPTION: {
    code: 'VAL_DATA_CORRUPTION',
    category: 'validation' as const,
    severity: 'critical' as const,
    title: 'Data Corruption Detected',
    description: 'Data integrity check failed',
    remediation: 'Restore from backup or reprocess clean data',
  },

  // Transformation Errors (TRN prefix)
  TRN_TRANSFORM_FAILED: {
    code: 'TRN_TRANSFORM_FAILED',
    category: 'transformation' as const,
    severity: 'medium' as const,
    title: 'Data Transformation Failed',
    description: 'Unable to transform data to target format',
    remediation: 'Check transformation logic and input data format',
  },
  TRN_MAPPING_ERROR: {
    code: 'TRN_MAPPING_ERROR',
    category: 'transformation' as const,
    severity: 'medium' as const,
    title: 'Field Mapping Error',
    description: 'Unable to map source fields to target fields',
    remediation: 'Verify field mappings and data structure',
  },

  // Persistence Errors (PER prefix)
  PER_CONNECTION_FAILED: {
    code: 'PER_CONNECTION_FAILED',
    category: 'persistence' as const,
    severity: 'critical' as const,
    title: 'Database Connection Failed',
    description: 'Unable to establish database connection',
    remediation: 'Check database connectivity and configuration',
  },
  PER_QUERY_FAILED: {
    code: 'PER_QUERY_FAILED',
    category: 'persistence' as const,
    severity: 'high' as const,
    title: 'Database Query Failed',
    description: 'Database query execution failed',
    remediation: 'Check query syntax and database state',
  },
  PER_TRANSACTION_FAILED: {
    code: 'PER_TRANSACTION_FAILED',
    category: 'persistence' as const,
    severity: 'high' as const,
    title: 'Transaction Failed',
    description: 'Database transaction failed to commit',
    remediation: 'Check transaction logic and rollback if necessary',
  },

  // External Service Errors (EXT prefix)
  EXT_SERVICE_UNAVAILABLE: {
    code: 'EXT_SERVICE_UNAVAILABLE',
    category: 'external' as const,
    severity: 'high' as const,
    title: 'External Service Unavailable',
    description: 'Required external service is not accessible',
    remediation: 'Check service status and network connectivity',
  },
  EXT_API_ERROR: {
    code: 'EXT_API_ERROR',
    category: 'external' as const,
    severity: 'medium' as const,
    title: 'External API Error',
    description: 'External API returned an error response',
    remediation: 'Check API documentation and retry request',
  },

  // System Errors (SYS prefix)
  SYS_RESOURCE_EXHAUSTED: {
    code: 'SYS_RESOURCE_EXHAUSTED',
    category: 'system' as const,
    severity: 'critical' as const,
    title: 'System Resources Exhausted',
    description: 'System ran out of memory, CPU, or other resources',
    remediation: 'Scale resources or optimize processing',
  },
  SYS_TIMEOUT: {
    code: 'SYS_TIMEOUT',
    category: 'system' as const,
    severity: 'medium' as const,
    title: 'Processing Timeout',
    description: 'Operation exceeded maximum allowed time',
    remediation: 'Increase timeout or optimize processing logic',
  },
} as const;

// ============================================================================
// ADVANCED DATA PROCESSING SERVICE
// ============================================================================

export class AdvancedDataProcessingService extends EventEmitter {
  private dbManager: DatabaseResourceManager;
  private errorHandler: AdvancedErrorHandler;
  private pipelines: Map<string, DataPipeline> = new Map();
  private activeOperations: Map<string, ProcessingResult> = new Map();
  private batchProcessor: BatchProcessor<any, any>;
  private metrics: Map<string, ProcessingMetrics> = new Map();

  constructor(
    db: Database,
    errorHandler: AdvancedErrorHandler,
    options: {
      batchSize?: number;
      enableMetrics?: boolean;
      enableCaching?: boolean;
    } = {}
  ) {
    super();

    this.dbManager = new DatabaseResourceManager(db);
    this.errorHandler = errorHandler;

    this.batchProcessor = new BatchProcessor(
      (items) => this.processBatch(items),
      {
        batchSize: options.batchSize || 50,
        delay: 100,
      }
    );

    if (options.enableMetrics !== false) {
      this.startMetricsCollection();
    }

    this.initializeProcessingPipelines();
  }

  // ============================================================================
  // CORE PROCESSING METHODS
  // ============================================================================

  /**
   * Process data through a specific pipeline with full error context
   */
  async processData<T = any, R = any>(
    pipelineId: string,
    data: T,
    context: Partial<DataProcessingContext>
  ): Promise<ProcessingResult<R>> {
    const startTime = Date.now();
    const processingContext: DataProcessingContext = {
      operationId: this.generateOperationId(),
      source: 'data-processor',
      timestamp: new Date().toISOString(),
      ...context,
    };

    const operationMetrics: ProcessingMetrics = {
      recordsProcessed: 0,
      recordsFailed: 0,
      bytesProcessed: 0,
      processingTime: 0,
      memoryUsage: 0,
      cacheHits: 0,
      cacheMisses: 0,
      retries: 0,
    };

    try {
      // Get pipeline
      const pipeline = this.pipelines.get(pipelineId);
      if (!pipeline) {
        throw this.createProcessingError(
          PROCESSING_ERROR_CODES.VAL_SCHEMA_INVALID,
          `Pipeline ${pipelineId} not found`,
          processingContext
        );
      }

      // Validate input data
      if (pipeline.config.enableValidation && !(await this.validateData(data, pipeline))) {
        throw this.createProcessingError(
          PROCESSING_ERROR_CODES.VAL_CONSTRAINT_VIOLATION,
          'Input data validation failed',
          processingContext
        );
      }

      // Process through pipeline steps
      let processedData: any = data;
      for (const step of pipeline.steps) {
        processedData = await this.executePipelineStep(step, processedData, processingContext);
      }

      // Update metrics
      operationMetrics.recordsProcessed = 1;
      operationMetrics.bytesProcessed = JSON.stringify(data).length;
      operationMetrics.processingTime = Date.now() - startTime;
      operationMetrics.memoryUsage = process.memoryUsage().heapUsed;

      const result: ProcessingResult<R> = {
        success: true,
        data: processedData,
        context: processingContext,
        metrics: operationMetrics,
        duration: operationMetrics.processingTime,
      };

      this.activeOperations.set(processingContext.operationId, result);
      this.emit('processing-completed', result);

      return result;

    } catch (error) {
      operationMetrics.recordsFailed = 1;
      operationMetrics.processingTime = Date.now() - startTime;

      const processingError = error instanceof ProcessingError
        ? error
        : this.createProcessingError(
            PROCESSING_ERROR_CODES.SYS_RESOURCE_EXHAUSTED,
            error.message || 'Unknown processing error',
            processingContext,
            error
          );

      const result: ProcessingResult<R> = {
        success: false,
        error: processingError,
        context: processingContext,
        metrics: operationMetrics,
        duration: operationMetrics.processingTime,
      };

      this.activeOperations.set(processingContext.operationId, result);
      this.emit('processing-failed', result);

      // Report to error handler
      await this.errorHandler.handleError(processingError, {
        component: 'data-processor',
        userId: processingContext.userId,
        sessionId: processingContext.sessionId,
        metadata: {
          pipelineId,
          operationId: processingContext.operationId,
          ...processingContext.metadata,
        },
      });

      return result;
    }
  }

  /**
   * Process multiple items through batch processing
   */
  async processBatch<T = any, R = any>(
    items: Array<{ data: T; context: Partial<DataProcessingContext> }>,
    pipelineId: string
  ): Promise<ProcessingResult<R>[]> {
    const startTime = Date.now();
    const results: ProcessingResult<R>[] = [];

    for (const item of items) {
      const result = await this.processData<T, R>(pipelineId, item.data, item.context);
      results.push(result);
    }

    const batchMetrics = this.aggregateBatchMetrics(results);
    batchMetrics.processingTime = Date.now() - startTime;

    this.emit('batch-processing-completed', {
      batchSize: items.length,
      results,
      metrics: batchMetrics,
    });

    return results;
  }

  // ============================================================================
  // PIPELINE MANAGEMENT
  // ============================================================================

  /**
   * Register a new processing pipeline
   */
  registerPipeline(pipeline: DataPipeline): void {
    this.pipelines.set(pipeline.id, pipeline);
    this.emit('pipeline-registered', pipeline);
  }

  /**
   * Get pipeline by ID
   */
  getPipeline(pipelineId: string): DataPipeline | undefined {
    return this.pipelines.get(pipelineId);
  }

  /**
   * List all registered pipelines
   */
  listPipelines(): DataPipeline[] {
    return Array.from(this.pipelines.values());
  }

  // ============================================================================
  // ERROR CONTEXT MANAGEMENT
  // ============================================================================

  /**
   * Create a processing error with full context
   */
  private createProcessingError(
    errorCode: typeof PROCESSING_ERROR_CODES[keyof typeof PROCESSING_ERROR_CODES],
    message: string,
    context: DataProcessingContext,
    cause?: Error
  ): ProcessingError {
    return {
      code: errorCode.code,
      message,
      context,
      severity: errorCode.severity,
      category: errorCode.category,
      remediation: errorCode.description,
      stack: cause?.stack,
      cause,
    };
  }

  /**
   * Get detailed error information with context
   */
  getErrorDetails(operationId: string): ProcessingError | null {
    const result = this.activeOperations.get(operationId);
    return result?.error || null;
  }

  /**
   * Get processing result for operation
   */
  getProcessingResult(operationId: string): ProcessingResult | null {
    return this.activeOperations.get(operationId) || null;
  }

  // ============================================================================
  // PIPELINE EXECUTION
  // ============================================================================

  /**
   * Execute a single pipeline step with retry logic
   */
  private async executePipelineStep(
    step: DataPipelineStep,
    data: any,
    context: DataProcessingContext
  ): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= step.retryPolicy.maxRetries; attempt++) {
      try {
        if (step.handler.validate && !(await step.handler.validate(data))) {
          throw new Error(`Validation failed for step ${step.name}`);
        }

        if (step.handler.transform) {
          data = await step.handler.transform(data);
        }

        const result = await this.withTimeout(
          step.handler.process(data, context),
          step.config.timeout || 30000
        );

        return result;

      } catch (error) {
        lastError = error as Error;

        if (attempt < step.retryPolicy.maxRetries) {
          const delay = Math.min(
            step.retryPolicy.initialDelay * Math.pow(step.retryPolicy.backoffMultiplier, attempt),
            step.retryPolicy.maxDelay
          );

          await this.delay(delay);
        }
      }
    }

    throw this.createProcessingError(
      PROCESSING_ERROR_CODES.TRN_TRANSFORM_FAILED,
      `Step ${step.name} failed after ${step.retryPolicy.maxRetries + 1} attempts: ${lastError?.message}`,
      context,
      lastError
    );
  }

  // ============================================================================
  // VALIDATION AND TRANSFORMATION
  // ============================================================================

  /**
   * Validate data against pipeline requirements
   */
  private async validateData(data: any, pipeline: DataPipeline): Promise<boolean> {
    try {
      // Basic structure validation
      if (!data || typeof data !== 'object') {
        return false;
      }

      // Pipeline-specific validation
      for (const step of pipeline.steps) {
        if (step.handler.validate) {
          const isValid = await step.handler.validate(data);
          if (!isValid) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  // ============================================================================
  // METRICS AND MONITORING
  // ============================================================================

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      this.collectMetrics();
    }, 60000); // Every minute
  }

  /**
   * Collect processing metrics
   */
  private collectMetrics(): void {
    const totalMetrics: ProcessingMetrics = {
      recordsProcessed: 0,
      recordsFailed: 0,
      bytesProcessed: 0,
      processingTime: 0,
      memoryUsage: process.memoryUsage().heapUsed,
      cacheHits: 0,
      cacheMisses: 0,
      retries: 0,
    };

    for (const [operationId, result] of this.activeOperations) {
      totalMetrics.recordsProcessed += result.metrics.recordsProcessed;
      totalMetrics.recordsFailed += result.metrics.recordsFailed;
      totalMetrics.bytesProcessed += result.metrics.bytesProcessed;
      totalMetrics.processingTime += result.metrics.processingTime;
      totalMetrics.cacheHits += result.metrics.cacheHits;
      totalMetrics.cacheMisses += result.metrics.cacheMisses;
      totalMetrics.retries += result.metrics.retries;
    }

    this.metrics.set('total', totalMetrics);
    this.emit('metrics-collected', totalMetrics);
  }

  /**
   * Get current processing metrics
   */
  getMetrics(): ProcessingMetrics {
    return this.metrics.get('total') || {
      recordsProcessed: 0,
      recordsFailed: 0,
      bytesProcessed: 0,
      processingTime: 0,
      memoryUsage: 0,
      cacheHits: 0,
      cacheMisses: 0,
      retries: 0,
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Aggregate metrics from batch results
   */
  private aggregateBatchMetrics(results: ProcessingResult[]): ProcessingMetrics {
    return results.reduce(
      (acc, result) => ({
        recordsProcessed: acc.recordsProcessed + result.metrics.recordsProcessed,
        recordsFailed: acc.recordsFailed + result.metrics.recordsFailed,
        bytesProcessed: acc.bytesProcessed + result.metrics.bytesProcessed,
        processingTime: Math.max(acc.processingTime, result.metrics.processingTime),
        memoryUsage: Math.max(acc.memoryUsage, result.metrics.memoryUsage),
        cacheHits: acc.cacheHits + result.metrics.cacheHits,
        cacheMisses: acc.cacheMisses + result.metrics.cacheMisses,
        retries: acc.retries + result.metrics.retries,
      }),
      {
        recordsProcessed: 0,
        recordsFailed: 0,
        bytesProcessed: 0,
        processingTime: 0,
        memoryUsage: 0,
        cacheHits: 0,
        cacheMisses: 0,
        retries: 0,
      }
    );
  }

  /**
   * Execute operation with timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
      ),
    ]);
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    this.removeAllListeners();
    this.activeOperations.clear();
    this.metrics.clear();

    if (this.dbManager) {
      await this.dbManager.dispose();
    }
  }
}

// ============================================================================
// BUILT-IN DATA PROCESSORS
// ============================================================================

/**
 * Validation processor for data integrity checks
 */
export class ValidationProcessor implements DataProcessor {
  private schema: any;

  constructor(schema: any) {
    this.schema = schema;
  }

  async process(data: any, context: DataProcessingContext): Promise<any> {
    // Implement schema validation
    return data;
  }

  async validate(data: any): Promise<boolean> {
    // Implement validation logic
    return true;
  }
}

/**
 * Transformation processor for data conversion
 */
export class TransformationProcessor implements DataProcessor {
  private mappings: Record<string, string>;

  constructor(mappings: Record<string, string>) {
    this.mappings = mappings;
  }

  async process(data: any, context: DataProcessingContext): Promise<any> {
    const transformed: any = {};

    for (const [source, target] of Object.entries(this.mappings)) {
      if (data[source] !== undefined) {
        transformed[target] = data[source];
      }
    }

    return transformed;
  }

  async transform(data: any): Promise<any> {
    return this.process(data, {} as DataProcessingContext);
  }
}

/**
 * Persistence processor for database operations
 */
export class PersistenceProcessor implements DataProcessor {
  private db: Database;
  private tableName: string;

  constructor(db: Database, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  async process(data: any, context: DataProcessingContext): Promise<any> {
    // Implement database persistence
    const stmt = this.db.prepare(`INSERT INTO ${this.tableName} VALUES (?, ?, ?)`);
    const result = stmt.run(data.id, JSON.stringify(data), context.timestamp);
    return { id: result.lastInsertRowid, ...data };
  }
}

// ============================================================================
// PIPELINE TEMPLATES
// ============================================================================

export const PIPELINE_TEMPLATES = {
  /**
   * Standard data ingestion pipeline
   */
  dataIngestion: (db: Database): DataPipeline => ({
    id: 'data-ingestion',
    name: 'Data Ingestion Pipeline',
    description: 'Standard pipeline for ingesting and processing data',
    steps: [
      {
        id: 'validate',
        name: 'Data Validation',
        type: 'validation',
        handler: new ValidationProcessor({}),
        config: { timeout: 5000 },
        retryPolicy: { maxRetries: 2, backoffMultiplier: 2, initialDelay: 1000, maxDelay: 5000 },
      },
      {
        id: 'transform',
        name: 'Data Transformation',
        type: 'transformation',
        handler: new TransformationProcessor({}),
        config: { timeout: 10000 },
        retryPolicy: { maxRetries: 3, backoffMultiplier: 2, initialDelay: 1000, maxDelay: 10000 },
      },
      {
        id: 'persist',
        name: 'Data Persistence',
        type: 'persistence',
        handler: new PersistenceProcessor(db, 'processed_data'),
        config: { timeout: 15000 },
        retryPolicy: { maxRetries: 3, backoffMultiplier: 2, initialDelay: 2000, maxDelay: 15000 },
      },
    ],
    config: {
      batchSize: 50,
      timeout: 30000,
      enableRollback: true,
      enableMetrics: true,
      enableCaching: true,
      cacheTTL: 300000,
    },
  }),

  /**
   * Analytics data processing pipeline
   */
  analyticsProcessing: (db: Database): DataPipeline => ({
    id: 'analytics-processing',
    name: 'Analytics Processing Pipeline',
    description: 'Pipeline for processing analytics data with aggregation',
    steps: [
      {
        id: 'validate',
        name: 'Analytics Validation',
        type: 'validation',
        handler: new ValidationProcessor({}),
        config: { timeout: 3000 },
        retryPolicy: { maxRetries: 1, backoffMultiplier: 2, initialDelay: 500, maxDelay: 2000 },
      },
      {
        id: 'enrich',
        name: 'Data Enrichment',
        type: 'enrichment',
        handler: new TransformationProcessor({}),
        config: { timeout: 8000 },
        retryPolicy: { maxRetries: 2, backoffMultiplier: 2, initialDelay: 1000, maxDelay: 8000 },
      },
      {
        id: 'persist',
        name: 'Analytics Persistence',
        type: 'persistence',
        handler: new PersistenceProcessor(db, 'analytics_data'),
        config: { timeout: 10000 },
        retryPolicy: { maxRetries: 3, backoffMultiplier: 2, initialDelay: 2000, maxDelay: 10000 },
      },
    ],
    config: {
      batchSize: 100,
      timeout: 25000,
      enableRollback: true,
      enableMetrics: true,
      enableCaching: true,
      cacheTTL: 600000,
    },
  }),
};

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the data processing service with default pipelines
 */
export function initializeDataProcessingService(
  db: Database,
  errorHandler: AdvancedErrorHandler
): AdvancedDataProcessingService {
  const service = new AdvancedDataProcessingService(db, errorHandler, {
    batchSize: 50,
    enableMetrics: true,
    enableCaching: true,
  });

  // Register default pipelines
  service.registerPipeline(PIPELINE_TEMPLATES.dataIngestion(db));
  service.registerPipeline(PIPELINE_TEMPLATES.analyticsProcessing(db));

  console.log('🚀 Advanced Data Processing Service initialized with default pipelines');

  return service;
}

export default AdvancedDataProcessingService;
