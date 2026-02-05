/**
 * Cascade Observability Principle
 * Every operation emits structured telemetry for debugging and ML training
 * [#REF:PRINCIPLES-OBSERVABILITY]
 */

// Type declarations for Bun APIs and Node.js globals
declare const Bun: {
  metrics?: {
    set(options: { name: string; value: number; tags: Record<string, string> }): void;
  };
  write?(path: string, content: string, options?: any): Promise<void>;
} | undefined;

declare const process: {
  env: Record<string, string | undefined>;
  NODE_ENV?: string;
};

export interface TelemetrySpan {
  operation: string;
  startTime: number;
  endTime?: number;
  context: any;
  metadata: Record<string, any>;
  error?: Error;
  parentSpanId?: string;
  spanId: string;
  duration?: number;
}

export interface SpanExporter {
  export(spans: TelemetrySpanData): Promise<void>;
}

export interface TelemetrySpanData {
  spans: TelemetrySpan[];
  timestamp: number;
  system: string;
  version: string;
}

export interface AlertData {
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  spanId: string;
  context: any;
  timestamp: number;
}

export class ObservabilityManager {
  private static instance: ObservabilityManager;
  private spans: TelemetrySpan[] = [];
  private exporters: SpanExporter[] = [];
  private errorCounts = new Map<string, number>();
  private readonly MAX_SPANS_IN_MEMORY = 1000;
  private readonly SLOW_OPERATION_THRESHOLD = 100; // ms
  private readonly ERROR_ALERT_THRESHOLD = 5;
  
  static getInstance(): ObservabilityManager {
    if (!ObservabilityManager.instance) {
      ObservabilityManager.instance = new ObservabilityManager();
    }
    return ObservabilityManager.instance;
  }
  
  private constructor() {
    this.initializeDefaultExporters();
  }
  
  /**
   * Adaptive: Auto-instrument based on performance thresholds
   */
  async instrument<T>(
    operation: string,
    context: any,
    handler: () => Promise<T>,
    metadata: Record<string, any> = {}
  ): Promise<T> {
    const spanId = this.generateSpanId();
    const span: TelemetrySpan = {
      operation,
      startTime: Date.now(),
      context,
      metadata,
      parentSpanId: context.spanId,
      spanId
    };
    
    // Set current span ID in context
    context.spanId = spanId;
    
    try {
      const result = await handler();
      span.endTime = Date.now();
      span.duration = span.endTime - span.startTime;
      span.metadata.result = 'success';
      
      // Adaptive: Log slow operations
      if (span.duration > this.SLOW_OPERATION_THRESHOLD) {
        span.metadata.slow = true;
        console.warn(`⚠️ Slow operation detected: ${operation} (${span.duration}ms)`);
      }
      
      // Record success metrics
      this.recordMetric(`${operation}.success`, 1, { operation, result: 'success' });
      
      return result;
      
    } catch (error) {
      span.endTime = Date.now();
      span.duration = span.endTime - span.startTime;
      span.error = error as Error;
      span.metadata.result = 'error';
      span.metadata.errorMessage = (error as Error).message;
      
      // Record error metrics
      this.recordMetric(`${operation}.error`, 1, { operation, result: 'error' });
      
      // Adaptive: Handle repeated errors
      await this.handleError(span);
      
      throw error;
      
    } finally {
      this.recordSpan(span);
      await this.exportSpans();
    }
  }
  
  /**
   * Record a metric value
   */
  recordMetric(name: string, value: number, tags: Record<string, string>): void {
    // Use Bun's native metrics system if available
    if (Bun?.metrics) {
      Bun.metrics.set({
        name: `cascade.${name}`,
        value,
        tags: {
          ...tags,
          timestamp: Date.now().toString()
        }
      });
    }
  }
  
  /**
   * Add a span exporter
   */
  addExporter(exporter: SpanExporter): void {
    this.exporters.push(exporter);
  }
  
  /**
   * Get span statistics
   */
  getSpanStats(): Record<string, any> {
    const stats: Record<string, any> = {
      totalSpans: this.spans.length,
      operations: {} as Record<string, { count: number; avgDuration: number; errorRate: number }>
    };
    
    // Group by operation
    const operationStats = new Map<string, { durations: number[]; errors: number }>();
    
    for (const span of this.spans) {
      if (!operationStats.has(span.operation)) {
        operationStats.set(span.operation, { durations: [], errors: 0 });
      }
      
      const opStats = operationStats.get(span.operation)!;
      
      if (span.duration) {
        opStats.durations.push(span.duration);
      }
      
      if (span.error) {
        opStats.errors++;
      }
    }
    
    // Calculate statistics
    for (const [operation, data] of operationStats.entries()) {
      const avgDuration = data.durations.length > 0 
        ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length 
        : 0;
      
      const errorRate = data.durations.length > 0 
        ? data.errors / data.durations.length 
        : 0;
      
      stats.operations[operation] = {
        count: data.durations.length,
        avgDuration: Math.round(avgDuration * 100) / 100,
        errorRate: Math.round(errorRate * 10000) / 100 // percentage with 2 decimals
      };
    }
    
    return stats;
  }
  
  private async handleError(span: TelemetrySpan): Promise<void> {
    const errorKey = `${span.operation}:${span.error?.message}`;
    const errorCount = (this.errorCounts.get(errorKey) || 0) + 1;
    this.errorCounts.set(errorKey, errorCount);
    
    // Adaptive: Escalate after threshold
    if (errorCount > this.ERROR_ALERT_THRESHOLD) {
      await this.sendAlert({
        severity: 'error',
        message: `Repeated error in ${span.operation}: ${span.error?.message}`,
        spanId: span.spanId,
        context: span.context,
        timestamp: Date.now()
      });
    }
  }
  
  private recordSpan(span: TelemetrySpan): void {
    this.spans.push(span);
    
    // Keep only recent spans in memory
    if (this.spans.length > this.MAX_SPANS_IN_MEMORY) {
      this.spans = this.spans.slice(-this.MAX_SPANS_IN_MEMORY);
    }
  }
  
  private async exportSpans(): Promise<void> {
    if (this.exporters.length === 0) return;
    
    const exportData: TelemetrySpanData = {
      spans: [...this.spans],
      timestamp: Date.now(),
      system: 'cascade',
      version: '2.1'
    };
    
    // Export to all registered exporters
    const exportPromises = this.exporters.map(exporter => 
      exporter.export(exportData).catch(error => {
        console.error('❌ Export failed:', error);
      })
    );
    
    await Promise.allSettled(exportPromises);
  }
  
  private generateSpanId(): string {
    return `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private initializeDefaultExporters(): void {
    // Console exporter for development
    if (process.env?.NODE_ENV === 'development') {
      this.addExporter(new ConsoleSpanExporter());
    }
    
    // File exporter for production
    if (process.env?.NODE_ENV === 'production') {
      this.addExporter(new FileSpanExporter());
    }
  }
  
  private async sendAlert(alert: AlertData): Promise<void> {
    console.error(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
    
    // In production, this would send to monitoring system
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with monitoring system
    }
  }
}

/**
 * Usage enforcement wrapper
 */
export async function withInstrumentation<T>(
  operation: string,
  context: any,
  metadata: Record<string, any>,
  handler: () => Promise<T>
): Promise<T> {
  const obs = ObservabilityManager.getInstance();
  return await obs.instrument(operation, context, handler, metadata);
}

/**
 * Console span exporter for development
 */
class ConsoleSpanExporter implements SpanExporter {
  async export(data: TelemetrySpanData): Promise<void> {
    if (process.env?.NODE_ENV !== 'development') return;
    
    console.log(`📊 Exporting ${data.spans.length} spans to console`);
    
    for (const span of data.spans.slice(-5)) { // Show last 5 spans
      const status = span.error ? '❌' : span.metadata?.slow ? '⚠️' : '✅';
      console.log(
        `${status} ${span.operation}: ${span.duration || 'N/A'}ms ` +
        (span.error ? `(${span.error.message})` : '')
      );
    }
  }
}

/**
 * File span exporter for production
 */
class FileSpanExporter implements SpanExporter {
  private readonly EXPORT_INTERVAL = 60000; // 1 minute
  private lastExport = 0;
  
  async export(data: TelemetrySpanData): Promise<void> {
    const now = Date.now();
    if (now - this.lastExport < this.EXPORT_INTERVAL) return;
    
    try {
      const filename = `./logs/telemetry-${new Date().toISOString().split('T')[0]}.jsonl`;
      const line = JSON.stringify(data) + '\n';
      
      if (Bun?.write) {
        await Bun.write(filename, line, { createPathIfMissing: true });
      } else {
        // Fallback: use fs module if available
        console.log(`📝 Would export telemetry to ${filename}`);
      }
      
      this.lastExport = now;
      console.log(`📝 Exported telemetry to ${filename}`);
    } catch (error) {
      console.error('❌ Failed to export telemetry:', error);
    }
  }
}

/**
 * Example usage with hook integration
 */
export class CascadeRuleEngine {
  async evaluateRule(rule: any, context: any): Promise<any> {
    return await withInstrumentation(
      'rule.evaluate',
      { ruleId: rule.id, ...context },
      { ruleType: rule.type, priority: rule.priority },
      async () => {
        // Main rule evaluation logic
        await new Promise(resolve => setTimeout(resolve, 10)); // Simulate work
        return { result: 'evaluated', ruleId: rule.id };
      }
    );
  }
}
