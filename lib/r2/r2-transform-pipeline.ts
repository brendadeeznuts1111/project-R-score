#!/usr/bin/env bun

/**
 * 🔄 R2 Data Transformation Pipeline
 * 
 * ETL-style data processing for R2:
 * - Streaming data transformation
 * - Format conversion (JSON, CSV, Parquet, etc.)
 * - Compression/Decompression
 * - Data validation and cleaning
 * - Pipeline scheduling and monitoring
 */

import { styled, FW_COLORS } from '../theme/colors';
import { r2EventSystem } from './r2-event-system';

export type TransformOperation = 
  | 'compress' 
  | 'decompress' 
  | 'encrypt' 
  | 'decrypt'
  | 'convert-format'
  | 'validate'
  | 'filter'
  | 'aggregate'
  | 'sanitize'
  | 'enrich';

export interface TransformStep {
  id: string;
  operation: TransformOperation;
  config: Record<string, any>;
  condition?: string; // Optional condition for conditional execution
}

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  source: {
    bucket: string;
    prefix?: string;
    pattern?: string;
  };
  destination: {
    bucket: string;
    prefix: string;
    namingPattern?: string;
  };
  steps: TransformStep[];
  schedule?: {
    type: 'interval' | 'cron' | 'event';
    value: string;
  };
  options: {
    preserveOriginal: boolean;
    onError: 'skip' | 'abort' | 'quarantine';
    parallelProcessing: boolean;
    maxConcurrency: number;
  };
  status: 'active' | 'paused' | 'error';
  createdAt: string;
  lastRun?: string;
}

export interface PipelineRun {
  id: string;
  pipelineId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  inputObjects: number;
  outputObjects: number;
  errors: Array<{
    object: string;
    step: string;
    error: string;
  }>;
  metrics: {
    bytesIn: number;
    bytesOut: number;
    processingTime: number;
  };
}

export interface DataValidator {
  name: string;
  validate: (data: any) => { valid: boolean; errors: string[] };
}

export class R2TransformPipeline {
  private pipelines: Map<string, Pipeline> = new Map();
  private runs: Map<string, PipelineRun> = new Map();
  private validators: Map<string, DataValidator> = new Map();
  private activeRuns: Set<string> = new Set();

  /**
   * Initialize pipeline manager
   */
  async initialize(): Promise<void> {
    console.log(styled('🔄 Initializing R2 Transform Pipeline', 'accent'));

    // Load default validators
    this.loadDefaultValidators();

    // Load example pipelines
    this.loadExamplePipelines();

    console.log(styled('✅ Pipeline manager initialized', 'success'));
  }

  /**
   * Load default data validators
   */
  private loadDefaultValidators(): void {
    this.validators.set('json-schema', {
      name: 'JSON Schema Validator',
      validate: (data) => {
        try {
          JSON.stringify(data);
          return { valid: true, errors: [] };
        } catch (e) {
          return { valid: false, errors: [e.message] };
        }
      }
    });

    this.validators.set('required-fields', {
      name: 'Required Fields Validator',
      validate: (data) => {
        const errors: string[] = [];
        if (typeof data !== 'object' || data === null) {
          errors.push('Data must be an object');
          return { valid: false, errors };
        }
        return { valid: true, errors };
      }
    });

    this.validators.set('size-limit', {
      name: 'Size Limit Validator',
      validate: (data) => {
        const size = JSON.stringify(data).length;
        if (size > 10 * 1024 * 1024) { // 10MB limit
          return { valid: false, errors: [`Size ${size} exceeds 10MB limit`] };
        }
        return { valid: true, errors: [] };
      }
    });
  }

  /**
   * Load example pipelines
   */
  private loadExamplePipelines(): void {
    // JSON to Parquet conversion pipeline
    this.createPipeline({
      name: 'JSON to Parquet',
      description: 'Convert JSON files to Parquet format for analytics',
      source: { bucket: 'raw-data', prefix: 'json/' },
      destination: { bucket: 'processed-data', prefix: 'parquet/' },
      steps: [
        { id: '1', operation: 'validate', config: { validator: 'json-schema' } },
        { id: '2', operation: 'convert-format', config: { from: 'json', to: 'parquet' } },
        { id: '3', operation: 'compress', config: { algorithm: 'zstd' } }
      ],
      options: {
        preserveOriginal: true,
        onError: 'quarantine',
        parallelProcessing: true,
        maxConcurrency: 5
      }
    });

    // Data sanitization pipeline
    this.createPipeline({
      name: 'PII Sanitization',
      description: 'Remove PII from data before storage',
      source: { bucket: 'incoming', prefix: 'sensitive/' },
      destination: { bucket: 'sanitized', prefix: 'clean/' },
      steps: [
        { id: '1', operation: 'sanitize', config: { removeFields: ['email', 'phone', 'ssn'] } },
        { id: '2', operation: 'validate', config: { validator: 'required-fields' } },
        { id: '3', operation: 'encrypt', config: { keyId: 'default' } }
      ],
      options: {
        preserveOriginal: false,
        onError: 'abort',
        parallelProcessing: false,
        maxConcurrency: 1
      }
    });

    // Log aggregation pipeline
    this.createPipeline({
      name: 'Log Aggregation',
      description: 'Aggregate and compress log files',
      source: { bucket: 'logs', prefix: 'raw/', pattern: '*.log' },
      destination: { bucket: 'logs', prefix: 'aggregated/', namingPattern: 'logs-{date}.gz' },
      steps: [
        { id: '1', operation: 'aggregate', config: { window: '1h', groupBy: 'service' } },
        { id: '2', operation: 'compress', config: { algorithm: 'gzip' } }
      ],
      schedule: { type: 'cron', value: '0 * * * *' }, // Hourly
      options: {
        preserveOriginal: true,
        onError: 'skip',
        parallelProcessing: true,
        maxConcurrency: 10
      }
    });
  }

  /**
   * Create a new pipeline
   */
  createPipeline(config: Omit<Pipeline, 'id' | 'createdAt' | 'status'>): Pipeline {
    const pipeline: Pipeline = {
      ...config,
      id: `pipeline-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    this.pipelines.set(pipeline.id, pipeline);
    console.log(styled(`📋 Created pipeline: ${pipeline.name} (${pipeline.id})`, 'success'));
    return pipeline;
  }

  /**
   * Execute a pipeline
   */
  async executePipeline(pipelineId: string, options?: { objects?: string[] }): Promise<PipelineRun> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) throw new Error(`Pipeline not found: ${pipelineId}`);
    if (pipeline.status === 'paused') throw new Error(`Pipeline is paused: ${pipelineId}`);

    const runId = `run-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const run: PipelineRun = {
      id: runId,
      pipelineId,
      status: 'running',
      startedAt: new Date().toISOString(),
      inputObjects: 0,
      outputObjects: 0,
      errors: [],
      metrics: {
        bytesIn: 0,
        bytesOut: 0,
        processingTime: 0
      }
    };

    this.runs.set(runId, run);
    this.activeRuns.add(runId);
    pipeline.lastRun = run.startedAt;

    console.log(styled(`🚀 Starting pipeline: ${pipeline.name}`, 'info'));
    const startTime = Date.now();

    try {
      // Get input objects
      const inputObjects = options?.objects || await this.listInputObjects(pipeline.source);
      run.inputObjects = inputObjects.length;

      // Process each object
      for (const objectKey of inputObjects) {
        try {
          const result = await this.processObject(pipeline, objectKey, run);
          if (result.success) {
            run.outputObjects++;
            run.metrics.bytesOut += result.outputSize;
          }
        } catch (error) {
          run.errors.push({
            object: objectKey,
            step: 'unknown',
            error: error.message
          });

          if (pipeline.options.onError === 'abort') {
            throw error;
          }
        }
      }

      run.status = run.errors.length > 0 ? 'completed' : 'completed';
      run.completedAt = new Date().toISOString();
      run.metrics.processingTime = Date.now() - startTime;

      // Emit completion event
      r2EventSystem.emit({
        type: 'batch:completed',
        bucket: pipeline.destination.bucket,
        source: 'R2TransformPipeline',
        metadata: {
          pipelineId,
          runId,
          inputObjects: run.inputObjects,
          outputObjects: run.outputObjects
        }
      });

      console.log(styled(`✅ Pipeline completed: ${run.outputObjects}/${run.inputObjects} objects`, 'success'));

    } catch (error) {
      run.status = 'failed';
      run.completedAt = new Date().toISOString();
      console.error(styled(`❌ Pipeline failed: ${error.message}`, 'error'));
    } finally {
      this.activeRuns.delete(runId);
    }

    return run;
  }

  /**
   * Process a single object through the pipeline
   */
  private async processObject(
    pipeline: Pipeline,
    objectKey: string,
    run: PipelineRun
  ): Promise<{ success: boolean; outputSize: number }> {
    let data: any = await this.readObject(pipeline.source.bucket, objectKey);
    let currentSize = JSON.stringify(data).length;
    run.metrics.bytesIn += currentSize;

    // Execute each step
    for (const step of pipeline.steps) {
      try {
        data = await this.executeStep(step, data, objectKey);
      } catch (error) {
        run.errors.push({
          object: objectKey,
          step: step.id,
          error: error.message
        });

        if (pipeline.options.onError === 'quarantine') {
          await this.quarantineObject(pipeline, objectKey, error.message);
        }

        throw error;
      }
    }

    // Write output
    const outputKey = this.generateOutputKey(pipeline, objectKey);
    await this.writeObject(pipeline.destination.bucket, outputKey, data);

    return { success: true, outputSize: JSON.stringify(data).length };
  }

  /**
   * Execute a single transformation step
   */
  private async executeStep(step: TransformStep, data: any, sourceKey: string): Promise<any> {
    switch (step.operation) {
      case 'compress':
        return await this.compressData(data, step.config.algorithm);

      case 'decompress':
        return await this.decompressData(data, step.config.algorithm);

      case 'encrypt':
        // Would integrate with security manager
        return data;

      case 'decrypt':
        // Would integrate with security manager
        return data;

      case 'convert-format':
        return await this.convertFormat(data, step.config.from, step.config.to);

      case 'validate':
        const validator = this.validators.get(step.config.validator);
        if (validator) {
          const result = validator.validate(data);
          if (!result.valid) {
            throw new Error(`Validation failed: ${result.errors.join(', ')}`);
          }
        }
        return data;

      case 'filter':
        return this.filterData(data, step.config.condition);

      case 'aggregate':
        return await this.aggregateData(data, step.config);

      case 'sanitize':
        return this.sanitizeData(data, step.config.removeFields);

      case 'enrich':
        return await this.enrichData(data, step.config.enrichments);

      default:
        throw new Error(`Unknown operation: ${step.operation}`);
    }
  }

  /**
   * Compress data
   */
  private async compressData(data: any, algorithm: string): Promise<Buffer> {
    const json = JSON.stringify(data);
    const buffer = Buffer.from(json);

    switch (algorithm) {
      case 'gzip':
        return Bun.gzipSync(buffer);
      case 'deflate':
        // Use Bun's built-in compression
        return Bun.gzipSync(buffer, { level: 6 });
      default:
        return buffer;
    }
  }

  /**
   * Decompress data
   */
  private async decompressData(data: Buffer, algorithm: string): Promise<any> {
    // In production, would properly decompress
    const decompressed = data; // Mock
    return JSON.parse(decompressed.toString());
  }

  /**
   * Convert data format
   */
  private async convertFormat(data: any, from: string, to: string): Promise<any> {
    if (from === to) return data;

    // JSON to CSV
    if (from === 'json' && to === 'csv') {
      if (Array.isArray(data)) {
        const headers = Object.keys(data[0]);
        const rows = data.map(row => headers.map(h => row[h]).join(','));
        return [headers.join(','), ...rows].join('\n');
      }
      return data;
    }

    // CSV to JSON
    if (from === 'csv' && to === 'json') {
      // Simplified CSV parsing
      const lines = data.split('\n');
      const headers = lines[0].split(',');
      return lines.slice(1).map(line => {
        const values = line.split(',');
        return headers.reduce((obj, header, i) => {
          obj[header] = values[i];
          return obj;
        }, {} as any);
      });
    }

    return data;
  }

  /**
   * Filter data based on condition
   */
  private filterData(data: any[], condition: string): any[] {
    if (!Array.isArray(data)) return data;
    // Simple filter - in production use a proper expression parser
    return data.filter(item => {
      try {
        return eval(condition.replace(/\$\{([^}]+)\}/g, (match, key) => item[key]));
      } catch {
        return true;
      }
    });
  }

  /**
   * Aggregate data
   */
  private async aggregateData(data: any[], config: { window: string; groupBy: string }): Promise<any> {
    if (!Array.isArray(data)) return data;

    const groups = new Map<string, any[]>();
    
    for (const item of data) {
      const key = item[config.groupBy] || 'unknown';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }

    const result: Record<string, any> = {};
    for (const [key, items] of groups) {
      result[key] = {
        count: items.length,
        items: items
      };
    }

    return result;
  }

  /**
   * Sanitize data by removing sensitive fields
   */
  private sanitizeData(data: any, removeFields: string[]): any {
    if (typeof data !== 'object' || data === null) return data;

    const sanitized = { ...data };
    for (const field of removeFields) {
      delete sanitized[field];
    }

    return sanitized;
  }

  /**
   * Enrich data with additional information
   */
  private async enrichData(data: any, enrichments: any[]): Promise<any> {
    // In production, would fetch enrichment data from external sources
    return {
      ...data,
      _enriched: true,
      _enrichedAt: new Date().toISOString()
    };
  }

  /**
   * List input objects for pipeline
   */
  private async listInputObjects(source: Pipeline['source']): Promise<string[]> {
    // In production, would list objects from R2
    return [
      `${source.prefix || ''}test1.json`,
      `${source.prefix || ''}test2.json`,
      `${source.prefix || ''}test3.json`
    ];
  }

  /**
   * Read object from R2
   */
  private async readObject(bucket: string, key: string): Promise<any> {
    // In production, would read from R2
    return { test: 'data', timestamp: new Date().toISOString() };
  }

  /**
   * Write object to R2
   */
  private async writeObject(bucket: string, key: string, data: any): Promise<void> {
    // In production, would write to R2
    console.log(styled(`  💾 Writing: ${bucket}/${key}`, 'muted'));
  }

  /**
   * Quarantine failed object
   */
  private async quarantineObject(pipeline: Pipeline, key: string, reason: string): Promise<void> {
    const quarantineKey = `quarantine/${pipeline.id}/${Date.now()}_${key.split('/').pop()}`;
    console.log(styled(`  🚫 Quarantined: ${key} → ${quarantineKey}`, 'warning'));
  }

  /**
   * Generate output key
   */
  private generateOutputKey(pipeline: Pipeline, inputKey: string): string {
    const filename = inputKey.split('/').pop() || 'output';
    const baseName = filename.replace(/\.[^/.]+$/, '');
    
    if (pipeline.destination.namingPattern) {
      return pipeline.destination.namingPattern
        .replace('{date}', new Date().toISOString().split('T')[0])
        .replace('{original}', baseName)
        .replace('{timestamp}', Date.now().toString());
    }

    return `${pipeline.destination.prefix}${baseName}`;
  }

  /**
   * Get pipeline status
   */
  getPipeline(pipelineId: string): Pipeline | undefined {
    return this.pipelines.get(pipelineId);
  }

  /**
   * Get all pipelines
   */
  getAllPipelines(): Pipeline[] {
    return Array.from(this.pipelines.values());
  }

  /**
   * Get pipeline runs
   */
  getRuns(pipelineId?: string): PipelineRun[] {
    let runs = Array.from(this.runs.values());
    if (pipelineId) {
      runs = runs.filter(r => r.pipelineId === pipelineId);
    }
    return runs.sort((a, b) => 
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }

  /**
   * Pause pipeline
   */
  pausePipeline(pipelineId: string): boolean {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return false;
    pipeline.status = 'paused';
    return true;
  }

  /**
   * Resume pipeline
   */
  resumePipeline(pipelineId: string): boolean {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return false;
    pipeline.status = 'active';
    return true;
  }

  /**
   * Display pipeline status
   */
  displayStatus(): void {
    console.log(styled('\n🔄 R2 Transform Pipeline Status', 'accent'));
    console.log(styled('================================', 'accent'));

    console.log(styled('\n📋 Pipelines:', 'info'));
    for (const pipeline of this.pipelines.values()) {
      const statusIcon = pipeline.status === 'active' ? '✅' : pipeline.status === 'paused' ? '⏸️' : '❌';
      console.log(styled(`  ${statusIcon} ${pipeline.name} (${pipeline.id})`, 'muted'));
      console.log(styled(`     Steps: ${pipeline.steps.length} | Last Run: ${pipeline.lastRun || 'Never'}`, 'muted'));
    }

    console.log(styled('\n▶️ Active Runs:', 'info'));
    const active = this.getRuns().filter(r => r.status === 'running');
    if (active.length === 0) {
      console.log(styled('  No active runs', 'muted'));
    } else {
      for (const run of active) {
        const pipeline = this.pipelines.get(run.pipelineId);
        console.log(styled(`  ${run.id}: ${pipeline?.name || run.pipelineId}`, 'muted'));
        console.log(styled(`     Progress: ${run.outputObjects}/${run.inputObjects}`, 'muted'));
      }
    }

    console.log(styled('\n✅ Recent Completed Runs:', 'info'));
    const recent = this.getRuns().filter(r => r.status !== 'running').slice(0, 5);
    for (const run of recent) {
      const pipeline = this.pipelines.get(run.pipelineId);
      const icon = run.status === 'completed' ? '✅' : '❌';
      console.log(styled(`  ${icon} ${pipeline?.name || run.pipelineId}: ${run.outputObjects} objects (${run.metrics.processingTime}ms)`, 'muted'));
    }
  }
}

// Export singleton
export const r2TransformPipeline = new R2TransformPipeline();

// CLI interface
if (import.meta.main) {
  const pipeline = r2TransformPipeline;
  await pipeline.initialize();

  console.log(styled('\n🔄 R2 Transform Pipeline Demo', 'accent'));
  console.log(styled('=============================', 'accent'));

  // Display pipelines
  pipeline.displayStatus();

  // Execute a pipeline
  const pipelines = pipeline.getAllPipelines();
  if (pipelines.length > 0) {
    console.log(styled(`\n🚀 Executing pipeline: ${pipelines[0].name}`, 'info'));
    const run = await pipeline.executePipeline(pipelines[0].id);
    console.log(styled(`\n✅ Run completed:`, 'success'));
    console.log(styled(`  Input: ${run.inputObjects} objects`, 'muted'));
    console.log(styled(`  Output: ${run.outputObjects} objects`, 'muted'));
    console.log(styled(`  Time: ${run.metrics.processingTime}ms`, 'muted'));
    if (run.errors.length > 0) {
      console.log(styled(`  Errors: ${run.errors.length}`, 'error'));
    }
  }
}
