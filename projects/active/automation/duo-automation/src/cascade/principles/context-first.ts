/**
 * Cascade Context-First Design Principle
 * Ensures complete traceability and debugging capabilities
 * [#REF:PRINCIPLES-CONTEXT]
 */

export interface CascadeContext {
  requestId: string;        // Unique trace ID
  merchantId: string;       // Target merchant
  userId?: string;          // Acting user
  timestamp: number;        // Unix ms
  domain?: string;          // Business domain
  deviceInfo?: DeviceInfo;  // Client device
  network?: NetworkInfo;    // Network conditions
  session?: SessionInfo;    // Session data
  security?: SecurityInfo;  // Security context
  spanId?: string;          // Telemetry span ID
  [key: string]: any;       // Extension point
}

export interface DeviceInfo {
  userAgent?: string;
  platform?: string;
  biometricAvailable?: boolean;
  hardwareConcurrency?: number;
  memory?: number;
  screenResolution?: string;
}

export interface NetworkInfo {
  ipAddress?: string;
  userAgent?: string;
  connectionType?: string;
  latency?: number;
  bandwidth?: number;
}

export interface SessionInfo {
  sessionId: string;
  startTime: number;
  lastActivity: number;
  duration?: number;
}

export interface SecurityInfo {
  level: 'low' | 'medium' | 'high' | 'maximum';
  requiresBiometric?: boolean;
  ipAddress?: string;
  userAgent?: string;
  mfaVerified?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Reinforcement: Runtime context validation
 */
export class ContextValidator {
  private static readonly REQUIRED_FIELDS = ['requestId', 'merchantId', 'timestamp'];
  private static readonly MAX_CONTEXT_AGE = 60000; // 1 minute
  
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
    if (age > this.MAX_CONTEXT_AGE) {
      errors.push(`Context too old: ${age}ms (max: ${this.MAX_CONTEXT_AGE}ms)`);
    }
    
    // Check future timestamps
    if (age < -5000) { // 5 second tolerance
      errors.push(`Context timestamp is in the future: ${-age}ms`);
    }
    
    // Validate optional fields
    warnings.push(...this.validateOptionalFields(context));
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  private static validateOptionalFields(context: CascadeContext): string[] {
    const warnings: string[] = [];
    
    if (context.deviceInfo) {
      if (!context.deviceInfo.userAgent) {
        warnings.push('deviceInfo missing userAgent');
      }
      if (context.deviceInfo.biometricAvailable === undefined) {
        warnings.push('deviceInfo missing biometricAvailable flag');
      }
    }
    
    if (context.security) {
      if (!context.security.ipAddress) {
        warnings.push('security missing ipAddress');
      }
      if (!context.security.level) {
        warnings.push('security missing level');
      }
    }
    
    if (context.session) {
      if (!context.session.sessionId) {
        warnings.push('session missing sessionId');
      }
    }
    
    return warnings;
  }
  
  static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  static createBaseContext(merchantId: string, overrides: Partial<CascadeContext> = {}): CascadeContext {
    return {
      requestId: this.generateRequestId(),
      merchantId,
      timestamp: Date.now(),
      ...overrides
    };
  }
}

/**
 * Usage enforcement with validation
 */
export async function withValidatedContext<T>(
  context: CascadeContext,
  handler: (ctx: CascadeContext) => Promise<T>
): Promise<T> {
  const validation = ContextValidator.validate(context);
  
  if (!validation.valid) {
    throw new ValidationError('Invalid context', validation.errors);
  }
  
  // Adaptive: Log warnings but proceed
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Context warnings:', validation.warnings);
  }
  
  return await handler(context);
}

export class ValidationError extends Error {
  constructor(message: string, public errors: string[]) {
    super(message);
    this.name = 'ValidationError';
  }
}
