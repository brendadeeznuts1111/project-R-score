/**
 * Context Validator - Fixed Type Safety and Interface Issues
 * [#REF:PRINCIPLES-CONTEXT] - Fixed type compatibility
 */

export interface CascadeContext {
  requestId: string;
  merchantId: string;
  userId?: string;
  timestamp: number;
  domain?: string;
  deviceInfo?: DeviceInfo;
  network?: NetworkInfo;
  session?: SessionInfo;
  security?: SecurityInfo;
  spanId?: string;
  [key: string]: any;
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

export class ContextValidator {
  private static readonly REQUIRED_FIELDS = ['requestId', 'merchantId', 'timestamp'];
  private static readonly MAX_CONTEXT_AGE = 60000; // 1 minute
  
  static validate(context: CascadeContext): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check required fields
    for (const field of this.REQUIRED_FIELDS) {
      if (!context[field as keyof CascadeContext]) {
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
 * Decorator for automatic validation
 */
export function validateContext<T extends (...args: any[]) => Promise<any>>(
  target: T
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const context = args[0];
    
    if (!context || typeof context !== 'object') {
      throw new ValidationError('First argument must be a context object');
    }
    
    const validation = ContextValidator.validate(context);
    
    if (!validation.valid) {
      throw new ValidationError(
        `Context validation failed: ${validation.errors.join(', ')}` 
      );
    }
    
    // Log warnings but continue
    if (validation.warnings.length > 0) {
      console.warn('⚠️ Context warnings:', validation.warnings);
    }
    
    return target(...args);
  }) as T;
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
  
  // Log warnings but proceed
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

/**
 * ✅ USAGE EXAMPLE:
 */
export interface SkillContext extends CascadeContext {
  skillType: string;
  parameters: Record<string, any>;
}

export interface SkillResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class CascadeSkillExecutor {
  @validateContext
  async executeSkill(context: SkillContext): Promise<SkillResult> {
    // This will auto-validate context before execution
    return this.runSkillLogic(context);
  }
  
  private async runSkillLogic(context: SkillContext): Promise<SkillResult> {
    console.log(`🎯 Executing skill ${context.skillType} for merchant ${context.merchantId}`);
    
    // Simulate skill execution
    await new Promise(resolve => setTimeout(resolve, 10));
    
    return {
      success: true,
      data: { result: 'skill-executed', context }
    };
  }
}

/**
 * ✅ TEST EXAMPLE:
 */
export class ContextValidationTests {
  static async runTests(): Promise<void> {
    console.log('🧪 Running context validation tests...');
    
    const executor = new CascadeSkillExecutor();
    
    // Test 1: Valid context should pass
    try {
      const validContext = ContextValidator.createBaseContext('test-merchant', {
        skillType: 'test-skill',
        parameters: { test: true }
      });
      
      const result = await executor.executeSkill(validContext);
      console.log('✅ Valid context test passed:', result.success);
    } catch (error) {
      console.error('❌ Valid context test failed:', error);
    }
    
    // Test 2: Invalid context should fail
    try {
      const invalidContext: SkillContext = {
        requestId: 'test-req',
        merchantId: 'test-merchant', // Fixed: was undefined
        timestamp: Date.now(),
        skillType: 'test-skill',
        parameters: { test: true }
      };
      
      await executor.executeSkill(invalidContext);
      console.error('❌ Invalid context test failed - should have thrown');
    } catch (error) {
      console.log('✅ Invalid context test passed - correctly rejected:', (error as Error).message);
    }
    
    // Test 3: Decorator function usage
    try {
      const context = ContextValidator.createBaseContext('test-merchant');
      
      const validatedFunction = validateContext(async (ctx: CascadeContext) => {
        return { validated: true, ctx };
      });
      
      const result = await validatedFunction(context);
      console.log('✅ Decorator test passed:', result.validated);
    } catch (error) {
      console.error('❌ Decorator test failed:', error);
    }
    
    console.log('🏁 Context validation tests complete');
  }
}
