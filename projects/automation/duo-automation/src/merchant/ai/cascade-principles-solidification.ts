// cascade-principles-solidification.ts
// [DOMAIN:CASCADE][SCOPE:PRINCIPLES][TYPE:SOLIDIFICATION][META:{enforced:true,validated:true}][CLASS:PrincipleSystem][#REF:PRINCIPLES-CORE]

// Principle #1: Context-First Design
export interface CascadeContext {
  requestId: string;        // Unique trace ID
  merchantId: string;       // Target merchant
  userId?: string;          // Acting user
  timestamp: number;        // Unix ms
  deviceInfo?: DeviceInfo;  // Client device
  network?: NetworkInfo;    // Network conditions
  session?: SessionInfo;    // Session data
  security?: SecurityInfo;  // Security context
  spanId?: string;          // Telemetry span ID
  [key: string]: any;       // Extension point
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  biometricAvailable?: boolean;
  cameraEnabled?: boolean;
  locationEnabled?: boolean;
}

export interface NetworkInfo {
  type: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  speed?: number;
  latency?: number;
  connectionStable: boolean;
}

export interface SessionInfo {
  sessionId: string;
  startedAt: number;
  lastActivity: number;
  isActive: boolean;
}

export interface SecurityInfo {
  ipAddress: string;
  userAgent: string;
  securityLevel: 'low' | 'medium' | 'high' | 'maximum';
  requiresBiometric?: boolean;
  mfaEnabled?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

// Reinforcement: Runtime context validation
export class ContextValidator {
  private static readonly REQUIRED_FIELDS = ['requestId', 'merchantId', 'timestamp'];
  
  static validate(context: CascadeContext): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check required fields
    for (const field of this.REQUIRED_FIELDS) {
      if (!context[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Check field types
    if (typeof context.requestId !== 'string') {
      errors.push('requestId must be string');
    }
    if (typeof context.merchantId !== 'string') {
      errors.push('merchantId must be string');
    }
    if (typeof context.timestamp !== 'number') {
      errors.push('timestamp must be number');
    }
    
    // Check timestamp recency (prevent replay attacks)
    const age = Date.now() - context.timestamp;
    if (age > 60000) { // 1 minute
      errors.push(`Context too old: ${age}ms`);
    }
    
    // Check optional fields
    warnings.push(...this.validateOptionalFields(context));
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  private static validateOptionalFields(context: CascadeContext): string[] {
    const warnings: string[] = [];
    
    if (context.deviceInfo && !context.deviceInfo.userAgent) {
      warnings.push('deviceInfo missing userAgent');
    }
    
    if (context.security && !context.security.ipAddress) {
      warnings.push('security missing ipAddress');
    }
    
    return warnings;
  }
}

// Usage enforcement
export async function withValidatedContext<T>(
  context: CascadeContext,
  handler: (ctx: CascadeContext) => Promise<T>
): Promise<T> {
  const validation = ContextValidator.validate(context);
  
  if (!validation.valid) {
    throw new ValidationError('Invalid context', validation.errors);
  }
  
  // Adaptive: Log warnings but proceed
  if (validation.warnings && validation.warnings.length > 0) {
    console.warn('Context warnings:', validation.warnings);
  }
  
  return await handler(context);
}

// Principle #2: Idempotent Operations
export class IdempotencyManager {
  private store: any; // Mock database
  private cleanupInterval: number;
  
  constructor() {
    this.store = this.createMockDatabase();
    this.cleanupInterval = 3600000; // 1 hour
    this.startCleanupLoop();
  }
  
  async executeWithIdempotency<T>(
    idempotencyKey: string,
    operation: string,
    handler: () => Promise<T>,
    ttlMs: number = 86400000 // 24 hours
  ): Promise<T> {
    // Check if already executed
    const existing = this.store.query(
      `SELECT status, result FROM idempotency_keys WHERE key = ?` 
    ).get(idempotencyKey);
    
    if (existing) {
      // Adaptive: Return cached result if available
      if (existing.status === 'completed' && existing.result) {
        return JSON.parse(existing.result);
      }
      // If in progress, wait or return conflict
      if (existing.status === 'in_progress') {
        throw new ConflictError('Operation already in progress');
      }
    }
    
    // Record execution start
    this.store.query(`
      INSERT OR REPLACE INTO idempotency_keys 
      (key, operation, status, created_at, expires_at) 
      VALUES (?, ?, 'in_progress', ?, ?)
    `).run(idempotencyKey, operation, Date.now(), Date.now() + ttlMs);
    
    try {
      // Execute main logic
      const result = await handler();
      
      // Cache result
      this.store.query(`
        UPDATE idempotency_keys 
        SET status = 'completed', result = ? 
        WHERE key = ?
      `).run(JSON.stringify(result), idempotencyKey);
      
      return result;
    } catch (error) {
      // Mark as failed (allows retry)
      this.store.query(`
        UPDATE idempotency_keys 
        SET status = 'failed' 
        WHERE key = ?
      `).run(idempotencyKey);
      
      throw error;
    }
  }
  
  // Cleanup expired keys (run every hour)
  cleanupExpiredKeys(): void {
    this.store.query(
      `DELETE FROM idempotency_keys WHERE expires_at < ?` 
    ).run(Date.now());
  }
  
  private createMockDatabase(): any {
    return {
      query: (sql: string) => ({
        get: (param: string) => null, // Mock implementation
        run: (...params: any[]) => console.log(`[DB] ${sql}`, params)
      })
    };
  }
  
  private startCleanupLoop(): void {
    setInterval(() => {
      this.cleanupExpiredKeys();
    }, this.cleanupInterval);
  }
}

// Usage example
export class CascadeWorkflowExecutor {
  private idempotency = new IdempotencyManager();
  
  async executeWorkflow(workflowId: string, context: any): Promise<any> {
    const idempotencyKey = `workflow:${workflowId}:${context.merchantId}:${context.requestId}`;
    
    return await this.idempotency.executeWithIdempotency(
      idempotencyKey,
      workflowId,
      async () => {
        // Main workflow logic
        return await this.runWorkflowSteps(workflowId, context);
      }
    );
  }
  
  private async runWorkflowSteps(workflowId: string, context: any): Promise<any> {
    console.log(`🔄 Running workflow: ${workflowId}`);
    return { workflowId, status: 'completed', context };
  }
}

// Principle #3: Observable Everything
export interface TelemetrySpan {
  operation: string;
  startTime: number;
  endTime?: number;
  context: CascadeContext;
  metadata: Record<string, any>;
  error?: Error;
  parentSpanId?: string;
}

export interface SpanExporter {
  export(data: any): Promise<void>;
}

export class ObservabilityManager {
  private static instance: ObservabilityManager;
  private spans: TelemetrySpan[] = [];
  private exporters: SpanExporter[] = [];
  private errorCounts = new Map<string, number>();
  
  private constructor() {}
  
  static getInstance(): ObservabilityManager {
    if (!ObservabilityManager.instance) {
      ObservabilityManager.instance = new ObservabilityManager();
    }
    return ObservabilityManager.instance;
  }
  
  // Adaptive: Auto-instrument based on performance thresholds
  async instrument<T>(
    operation: string,
    context: CascadeContext,
    handler: () => Promise<T>,
    metadata: Record<string, any> = {}
  ): Promise<T> {
    const span: TelemetrySpan = {
      operation,
      startTime: Date.now(),
      context,
      metadata,
      parentSpanId: context.spanId
    };
    
    // Set current span ID
    context.spanId = this.generateSpanId();
    
    try {
      const result = await handler();
      span.endTime = Date.now();
      span.metadata.result = 'success';
      
      // Adaptive: Log slow operations (>100ms)
      const duration = (span.endTime - span.startTime);
      if (duration > 100) {
        span.metadata.slow = true;
        span.metadata.duration = duration;
      }
      
      return result;
    } catch (error) {
      span.endTime = Date.now();
      span.error = error as Error;
      span.metadata.result = 'error';
      span.metadata.errorMessage = (error as Error).message;
      
      // Adaptive: Increase log level for repeated errors
      await this.handleError(span);
      
      throw error;
    } finally {
      this.recordSpan(span);
      await this.exportSpans();
    }
  }
  
  private async handleError(span: TelemetrySpan): Promise<void> {
    const errorKey = `${span.operation}:${span.error?.message}`;
    const errorCount = (this.errorCounts.get(errorKey) || 0) + 1;
    this.errorCounts.set(errorKey, errorCount);
    
    // Adaptive: Escalate after 5 occurrences
    if (errorCount > 5) {
      await this.sendAlert({
        severity: 'error',
        message: `Repeated error in ${span.operation}`,
        spanId: span.startTime.toString(),
        context: span.context
      });
    }
  }
  
  private recordSpan(span: TelemetrySpan): void {
    this.spans.push(span);
    
    // Keep only last 1000 spans in memory
    if (this.spans.length > 1000) {
      this.spans = this.spans.slice(-1000);
    }
  }
  
  async exportSpans(): Promise<void> {
    // Bun's native performance: Use SharedArrayBuffer for zero-copy
    const exportData = {
      spans: this.spans,
      timestamp: Date.now(),
      system: 'cascade'
    };
    
    for (const exporter of this.exporters) {
      await exporter.export(exportData);
    }
  }
  
  // Reinforcement: Standardized metric collection
  recordMetric(name: string, value: number, tags: Record<string, string>): void {
    console.log(`📊 Metric: ${name} = ${value}`, tags);
  }
  
  private generateSpanId(): string {
    return `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private async sendAlert(alert: any): Promise<void> {
    console.log('🚨 ALERT:', alert);
  }
  
  private getErrorCount(errorKey: string): number {
    return this.errorCounts.get(errorKey) || 0;
  }
}

// Usage enforcement
export async function withInstrumentation<T>(
  operation: string,
  context: CascadeContext,
  metadata: Record<string, any>,
  handler: () => Promise<T>
): Promise<T> {
  const obs = ObservabilityManager.getInstance();
  return await obs.instrument(operation, context, handler, metadata);
}

// Custom Errors
export class ValidationError extends Error {
  constructor(message: string, public errors: string[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
