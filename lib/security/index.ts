// lib/security/index.ts — Security module index

// Core security components
export * from './versioned-secrets';
export * from './version-graph';
export * from './secret-lifecycle';

// Security hardening utilities
export { safeString, safeHexColor, safeServiceName, type SafeResult } from './safe-validators';
export { secureBunRun, type SecureRunResult } from './secure-bun-run';
export { WikiSecretTransaction } from './wiki-secret-transaction';
export { writeAuditLog, type AuditEntry } from './audit-writer';

// Security utilities
export class SecurityUtils {
  /**
   * Generate secure random string using Bun.random.hex for better performance
   */
  static generateSecret(length: number = 32): string {
    return Bun.random.hex(length);
  }

  /**
   * Generate API key with prefix using secure random generation
   */
  static generateApiKey(prefix: string = 'sk'): string {
    return `${prefix}_${Bun.random.hex(24)}`;
  }

  /**
   * Generate JWT secret using secure random generation
   */
  static generateJWTSecret(): string {
    return Bun.random.hex(64);
  }

  /**
   * Generate secure password
   */
  static generatePassword(length: number = 16): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    return password;
  }

  /**
   * Hash password using Bun.password (argon2id by default with secure defaults)
   */
  static async hashPassword(
    password: string,
    options?: {
      algorithm?: 'argon2id' | 'argon2i' | 'argon2d' | 'bcrypt';
      memoryCost?: number;
      timeCost?: number;
      cost?: number;
    }
  ): Promise<string> {
    // Secure defaults for enterprise-grade password hashing
    const secureOptions = {
      algorithm: 'argon2id' as const,
      memoryCost: 65536, // 64MB - OWASP recommendation
      timeCost: 3, // 3 iterations - OWASP recommendation
      ...options,
    };

    // Override bcrypt cost if using bcrypt
    if (secureOptions.algorithm === 'bcrypt') {
      secureOptions.cost = secureOptions.cost || 12; // OWASP recommends 12+
      delete secureOptions.memoryCost;
      delete secureOptions.timeCost;
    }

    return await Bun.password.hash(password, secureOptions);
  }

  /**
   * Hash password synchronously
   */
  static hashPasswordSync(
    password: string,
    options?: {
      algorithm?: 'argon2id' | 'argon2i' | 'argon2d' | 'bcrypt';
      memoryCost?: number;
      timeCost?: number;
      cost?: number;
    }
  ): string {
    // Secure defaults for enterprise-grade password hashing
    const secureOptions = {
      algorithm: 'argon2id' as const,
      memoryCost: 65536, // 64MB - OWASP recommendation
      timeCost: 3, // 3 iterations - OWASP recommendation
      ...options,
    };

    // Override bcrypt cost if using bcrypt
    if (secureOptions.algorithm === 'bcrypt') {
      secureOptions.cost = secureOptions.cost || 12; // OWASP recommends 12+
      delete secureOptions.memoryCost;
      delete secureOptions.timeCost;
    }

    return Bun.password.hashSync(password, secureOptions);
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await Bun.password.verify(password, hash);
  }

  /**
   * Verify password synchronously
   */
  static verifyPasswordSync(password: string, hash: string): boolean {
    return Bun.password.verifySync(password, hash);
  }

  /**
   * Validate secret strength
   */
  static validateStrength(secret: string): {
    score: number;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    if (secret.length < 16) {
      issues.push('Secret too short (minimum 16 characters)');
      recommendations.push('Use at least 16 characters');
      score -= 30;
    }

    if (!/[A-Z]/.test(secret)) {
      issues.push('Missing uppercase letters');
      recommendations.push('Include uppercase letters');
      score -= 20;
    }

    if (!/[a-z]/.test(secret)) {
      issues.push('Missing lowercase letters');
      recommendations.push('Include lowercase letters');
      score -= 20;
    }

    if (!/[0-9]/.test(secret)) {
      issues.push('Missing numbers');
      recommendations.push('Include numbers');
      score -= 15;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(secret)) {
      issues.push('Missing special characters');
      recommendations.push('Include special characters');
      score -= 15;
    }

    return {
      score: Math.max(0, score),
      issues,
      recommendations,
    };
  }

  /**
   * Hash secret for comparison
   */
  static hashSecret(secret: string): string {
    return Bun.hash.sha256(secret).toString('hex');
  }

  /**
   * Compare secrets securely
   */
  static compareSecret(secret1: string, secret2: string): boolean {
    return this.hashSecret(secret1) === this.hashSecret(secret2);
  }
}

// Export commonly used items
export { VersionedSecretManager, VersionGraph, SecretLifecycleManager };
export type { VersionMetadata, VersionNode, RollbackOptions, LifecycleRule };

export default {
  VersionedSecretManager,
  VersionGraph,
  SecretLifecycleManager,
  SecurityUtils,
};
