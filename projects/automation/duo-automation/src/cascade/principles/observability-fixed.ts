/**
 * Observability Manager - Fixed with Bun-Native Exporters
 * [#REF:PRINCIPLES-OBSERVABILITY] - Fixed missing implementations
 */

export interface TelemetrySpan {
  traceId: string;
  spanId: string;
  operation: string;
  startTime: number;
  endTime?: number;
  metadata: Record<string, any>;
  tags: Record<string, string>;
  status: 'ok' | 'error';
  error?: Error;
}

export interface MetricData {
  name: string;
  value: number;
  tags: Record<string, string>;
  timestamp: number;
  source: string;
}

export interface ExportData {
  system: string;
  timestamp: number;
  spans: TelemetrySpan[];
  metrics: MetricData[];
}

export interface SpanExporter {
  export(data: ExportData): Promise<void>;
}

/**
 * Bun-native console exporter (zero overhead)
 */
export class BunConsoleExporter implements SpanExporter {
  async export(data: ExportData): Promise<void> {
    for (const span of data.spans) {
      const duration = span.endTime ? span.endTime - span.startTime : 'incomplete';
      const status = span.status === 'error' ? `❌ ${span.error?.message}` : '✅';
      console.log(`[${span.operation}] ${duration}ms | ${status} | ${span.metadata.result || 'running'}`);
    }
    
    for (const metric of data.metrics) {
      const tagsStr = Object.entries(metric.tags).map(([k, v]) => `${k}=${v}`).join(',');
      console.log(`📊 METRIC: ${metric.name} = ${metric.value} [${tagsStr}]`);
    }
  }
}

/**
 * Main observability manager
 */
export class ObservabilityManager {
  private static instance: ObservabilityManager;
  private spans: TelemetrySpan[] = [];
  private exporters: SpanExporter[] = [];
  private metrics: MetricData[] = [];
  private readonly maxSpans = 1000;
  
  constructor() {
    // Add default Bun-native exporters
    this.exporters.push(new BunConsoleExporter());
    
    // Optional: Add external exporters if configured
    if (process.env.OTEL_ENDPOINT) {
      this.exporters.push(new OTLPExporter(process.env.OTEL_ENDPOINT));
    }
  }
  
  static getInstance(): ObservabilityManager {
    if (!ObservabilityManager.instance) {
      ObservabilityManager.instance = new ObservabilityManager();
    }
    return ObservabilityManager.instance;
  }
  
  /**
   * Create a new telemetry span
   */
  createSpan(operation: string, metadata: Record<string, any> = {}): TelemetrySpan {
    const span: TelemetrySpan = {
      traceId: this.generateTraceId(),
      spanId: this.generateSpanId(),
      operation,
      startTime: Date.now(),
      metadata,
      tags: {},
      status: 'ok'
    };
    
    this.spans.push(span);
    
    // Maintain memory bounds
    if (this.spans.length > this.maxSpans) {
      this.spans = this.spans.slice(-this.maxSpans);
    }
    
    return span;
  }
  
  /**
   * Record metric with Bun-native performance
   */
  recordMetric(name: string, value: number, tags: Record<string, string> = {}): void {
    const metric: MetricData = {
      name,
      value,
      tags: {
        ...tags,
        timestamp: Date.now().toString()
      },
      timestamp: Date.now(),
      source: 'cascade'
    };
    
    this.metrics.push(metric);
    
    // Store in Bun's native metrics store if available
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
    
    // Also emit to console for local development
    if (process.env.NODE_ENV === 'development') {
      const tagsStr = Object.entries(tags).map(([k, v]) => `${k}=${v}`).join(',');
      console.log(`📊 METRIC: ${name} = ${value} [${tagsStr}]`);
    }
  }
  
  /**
   * Execute with automatic instrumentation
   */
  async withInstrumentation<T>(
    operation: string,
    context: Record<string, any>,
    options: { traceId?: string; system?: string } = {},
    fn: () => Promise<T>
  ): Promise<T> {
    const span = this.createSpan(operation, {
      ...context,
      system: options.system || 'cascade'
    });
    
    if (options.traceId) {
      span.traceId = options.traceId;
    }
    
    try {
      const result = await fn();
      this.completeSpan(span);
      return result;
    } catch (error) {
      this.completeSpan(span, error as Error);
      throw error;
    }
  }
  
  /**
   * Complete a span
   */
  private completeSpan(span: TelemetrySpan, error?: Error): void {
    span.endTime = Date.now();
    if (error) {
      span.status = 'error';
      span.error = error;
    }
    
    // Export completed span
    this.exportSpans([span]);
  }
  
  /**
   * Export spans to all configured exporters
   */
  private async exportSpans(spans: TelemetrySpan[]): Promise<void> {
    const exportData: ExportData = {
      system: 'cascade',
      timestamp: Date.now(),
      spans,
      metrics: this.metrics.slice(-100) // Last 100 metrics
    };
    
    // Export to all configured exporters
    await Promise.allSettled(
      this.exporters.map(exporter => 
        exporter.export(exportData).catch(error => 
          console.warn('⚠️ Export failed:', error)
        )
      )
    );
  }
  
  /**
   * Get span statistics
   */
  getSpanStats(): Record<string, any> {
    const stats = {
      totalSpans: this.spans.length,
      activeSpans: this.spans.filter(s => !s.endTime).length,
      completedSpans: this.spans.filter(s => s.endTime).length,
      errorSpans: this.spans.filter(s => s.status === 'error').length,
      averageDuration: 0,
      operations: new Set<string>(),
      exporters: this.exporters.length
    };
    
    const completedSpans = this.spans.filter(s => s.endTime && s.startTime);
    if (completedSpans.length > 0) {
      stats.averageDuration = completedSpans.reduce((sum, s) => 
        sum + (s.endTime! - s.startTime), 0) / completedSpans.length;
    }
    
    for (const span of this.spans) {
      stats.operations.add(span.operation);
    }
    
    return stats;
  }
  
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generateSpanId(): string {
    return `span_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
}

/**
 * OpenTelemetry Protocol (OTLP) exporter
 */
export class OTLPExporter implements SpanExporter {
  constructor(private endpoint: string) {}
  
  async export(data: ExportData): Promise<void> {
    try {
      await fetch(`${this.endpoint}/v1/traces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.warn('⚠️ Failed to export to OTLP:', error);
    }
  }
}
