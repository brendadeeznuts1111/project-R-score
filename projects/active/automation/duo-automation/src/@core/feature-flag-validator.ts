/**
 * Feature Flag Security Validator
 * Prevents injection attacks and privilege escalation through feature flags
 */

export class FeatureFlagValidator {
  private static readonly ALLOWED_FLAGS = new Set([
    'autonomic_v2',
    'beta_features', 
    'advanced_analytics',
    'early_access',
    'premium_support',
    'enterprise_mode',
    'experimental_ui',
    'debug_mode',
    'enhanced_security',
    'priority_support'
  ]);

  private static readonly MAX_FLAGS = 10;
  private static readonly MAX_FLAG_LENGTH = 50;

  static sanitize(flags: string[]): string[] {
    if (!Array.isArray(flags)) return [];
    
    return Array.from(new Set(
      flags.filter(flag => this.isValidFlag(flag))
    )).slice(0, this.MAX_FLAGS);
  }

  private static isValidFlag(flag: string): boolean {
    if (typeof flag !== 'string') return false;
    if (flag.length === 0 || flag.length > this.MAX_FLAG_LENGTH) return false;
    
    // Prevent prototype pollution
    if (['__proto__', 'constructor', 'prototype'].includes(flag)) return false;
    
    // Prevent path traversal
    if (flag.includes('../') || flag.includes('..\\')) return false;
    
    // Prevent script injection
    if (/<script|javascript:|data:/i.test(flag)) return false;
    
    // Prevent SQL injection patterns
    if (/union|select|drop|delete|insert|update/i.test(flag)) return false;
    
    // Prevent command injection
    if (/\$\(|`|\|\||&&|;|&|\|/i.test(flag)) return false;
    
    // Whitelist approach - only allow known flags
    return this.ALLOWED_FLAGS.has(flag);
  }

  static validateAndLog(flags: string[], context: string): string[] {
    const sanitized = this.sanitize(flags);
    
    // Log security events for audit trail
    if (sanitized.length !== flags.length) {
      console.warn(`🚨 FEATURE FLAG SECURITY EVENT: ${context}`);
      console.warn(`   Original: [${flags.join(', ')}]`);
      console.warn(`   Sanitized: [${sanitized.join(', ')}]`);
      console.warn(`   Blocked: [${flags.filter(f => !sanitized.includes(f)).join(', ')}]`);
    }
    
    return sanitized;
  }

  static getSecurityStats(): {
    totalFlags: number;
    allowedFlags: number;
    maxFlags: number;
    maxLength: number;
  } {
    return {
      totalFlags: this.ALLOWED_FLAGS.size,
      allowedFlags: this.ALLOWED_FLAGS.size,
      maxFlags: this.MAX_FLAGS,
      maxLength: this.MAX_FLAG_LENGTH
    };
  }
}
