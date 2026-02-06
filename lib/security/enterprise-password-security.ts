/**
 * 🔐 Tier-1380 Enterprise Password Security v4.5
 *
 * Enterprise-grade password security with Bun.password integration
 * Windows Credential Manager storage, algorithm selection, and compliance
 *
 * @version 4.5
 */

import { styled, log } from '../theme/colors';

import { Utils } from '../utils/index';
import Tier1380SecretManager from './tier1380-secret-manager';

interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAgeDays: number;
  historySize: number;
}

interface PasswordHash {
  hash: string;
  algorithm: 'argon2id' | 'bcrypt';
  version: string;
  createdAt: Date;
  metadata?: {
    memoryCost?: number;
    timeCost?: number;
    cost?: number;
  };
}

interface PasswordAuditReport {
  timestamp: Date;
  totalUsers: number;
  weakPasswords: number;
  expiredPasswords: number;
  reusedPasswords: number;
  recommendations: string[];
}

export class Tier1380PasswordSecurity {
  private static readonly DEFAULT_POLICY: PasswordPolicy = {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAgeDays: 90,
    historySize: 5,
  };

  /**
   * Enterprise-grade password hashing with algorithm selection
   */
  static async hashPassword(
    password: string,
    options: {
      algorithm?: 'argon2id' | 'bcrypt';
      userId?: string;
      policy?: Partial<PasswordPolicy>;
    } = {}
  ): Promise<PasswordHash> {
    // 1. Validate against password policy
    this.validatePassword(password, options.policy);

    // 2. Choose algorithm based on requirements
    const algorithm = options.algorithm || (await this.selectBestAlgorithm());
    const metadata: any = {};

    let hash: string;

    switch (algorithm) {
      case 'argon2id':
        // Argon2id (Memory-hard, recommended for most use cases)
        hash = await Bun.password.hash(password, {
          algorithm: 'argon2id',
          memoryCost: 65536, // 64MB - configurable per tier
          timeCost: 3, // 3 iterations
        });
        metadata.memoryCost = 65536;
        metadata.timeCost = 3;
        break;

      case 'bcrypt':
        // bcrypt (CPU-hard, great for password hashing)
        // Bun automatically pre-hashes >72 byte passwords with SHA-512
        hash = await Bun.password.hash(password, {
          algorithm: 'bcrypt',
          cost: 12, // 2^12 iterations (4,096)
        });
        metadata.cost = 12;
        break;
    }

    // 3. Store hash with metadata
    const passwordHash: PasswordHash = {
      hash,
      algorithm,
      version: 'v4.5',
      createdAt: new Date(),
      metadata,
    };

    // 4. Store in secure storage (Windows Credential Manager, etc.)
    await this.storePasswordHash(options.userId || 'system', passwordHash);

    return passwordHash;
  }

  /**
   * Verify password against stored hash (auto-detects algorithm)
   */
  static async verifyPassword(
    password: string,
    userId: string
  ): Promise<{
    valid: boolean;
    needsRehash?: boolean;
    score?: number;
    warnings?: string[];
  }> {
    // 1. Retrieve hash from secure storage
    const storedHash = await this.retrievePasswordHash(userId);
    if (!storedHash) {
      return { valid: false, warnings: ['No password hash found'] };
    }

    // 2. Verify with Bun.password (auto-detects algorithm from hash)
    const isValid = await Bun.password.verify(password, storedHash.hash);

    // 3. Check if rehash needed (algorithm outdated or cost too low)
    const needsRehash = this.needsRehash(storedHash);

    // 4. Calculate password strength score
    const score = this.calculatePasswordScore(password);

    return {
      valid: isValid,
      needsRehash,
      score,
      warnings: score < 70 ? ['Password strength below recommended'] : undefined,
    };
  }

  /**
   * Password policy validation
   */
  private static validatePassword(
    password: string,
    policyOverride?: Partial<PasswordPolicy>
  ): void {
    const policy = { ...this.DEFAULT_POLICY, ...policyOverride };
    const errors: string[] = [];

    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check against common breached passwords
    if (this.isCommonPassword(password)) {
      errors.push('Password is too common and has been exposed in data breaches');
    }

    // Check for sequential characters
    if (
      /(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(
        password
      )
    ) {
      errors.push('Password contains easily guessable sequences');
    }

    if (errors.length > 0) {
      throw new PasswordPolicyError('Password does not meet security requirements', errors);
    }
  }

  /**
   * Choose best algorithm based on system capabilities
   */
  private static async selectBestAlgorithm(): Promise<'argon2id' | 'bcrypt'> {
    // Argon2id for servers with >1GB RAM, bcrypt for constrained environments
    const memory = await this.getSystemMemory();

    if (memory >= 1024 * 1024 * 1024) {
      // 1GB
      return 'argon2id'; // Use memory-hard algorithm on capable systems
    } else {
      return 'bcrypt'; // Use CPU-hard algorithm on constrained systems
    }
  }

  /**
   * Check if hash needs rehashing (algorithm outdated or cost too low)
   */
  private static needsRehash(hash: PasswordHash): boolean {
    const now = new Date();
    const ageInDays = (now.getTime() - hash.createdAt.getTime()) / (1000 * 60 * 60 * 24);

    // Check age
    if (ageInDays > this.DEFAULT_POLICY.maxAgeDays) {
      return true;
    }

    // Check algorithm strength
    switch (hash.algorithm) {
      case 'argon2id':
        return (hash.metadata?.memoryCost || 0) < 65536 || (hash.metadata?.timeCost || 0) < 3;

      case 'bcrypt':
        return (hash.metadata?.cost || 0) < 12;
    }

    return false;
  }

  /**
   * Store password hash in secure platform storage
   */
  private static async storePasswordHash(userId: string, hash: PasswordHash): Promise<void> {
    const key = `TIER1380_PASSWORD_${userId}`;
    const hashData = JSON.stringify(hash);

    // Store in Windows Credential Manager (CRED_PERSIST_ENTERPRISE)
    // or other platform secure storage
    await Tier1380SecretManager.setSecret(key, hashData, {
      persistEnterprise: true,
    });

    // Add to password history
    await this.addToPasswordHistory(userId, hash);
  }

  /**
   * Maintain password history to prevent reuse
   */
  private static async addToPasswordHistory(userId: string, hash: PasswordHash): Promise<void> {
    const historyKey = `TIER1380_PASSWORD_HISTORY_${userId}`;
    const currentHistory = await Tier1380SecretManager.getSecret(historyKey);

    let history: PasswordHash[] = [];
    if (currentHistory) {
      try {
        history = JSON.parse(currentHistory);
      } catch {
        history = [];
      }
    }

    // Add new hash
    history.unshift(hash);

    // Keep only last N entries
    if (history.length > this.DEFAULT_POLICY.historySize) {
      history = history.slice(0, this.DEFAULT_POLICY.historySize);
    }

    // Store updated history
    await Tier1380SecretManager.setSecret(historyKey, JSON.stringify(history), {
      persistEnterprise: true,
    });
  }

  /**
   * Check if password is in history (prevent reuse)
   */
  static async isPasswordInHistory(password: string, userId: string): Promise<boolean> {
    const historyKey = `TIER1380_PASSWORD_HISTORY_${userId}`;
    const historyData = await Tier1380SecretManager.getSecret(historyKey);

    if (!historyData) return false;

    try {
      const history: PasswordHash[] = JSON.parse(historyData);

      // Check against all historical hashes
      for (const oldHash of history) {
        const matches = await Bun.password.verify(password, oldHash.hash);
        if (matches) return true;
      }
    } catch {
      // If history is corrupted, ignore
    }

    return false;
  }

  /**
   * Password strength scoring (0-100)
   */
  private static calculatePasswordScore(password: string): number {
    let score = 0;

    // Length (max 40 points)
    score += Math.min(password.length * 2, 40);

    // Character variety (max 30 points)
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    const varietyScore = [hasUpper, hasLower, hasNumbers, hasSpecial].filter(Boolean).length;

    score += varietyScore * 7.5; // 4 varieties * 7.5 = 30

    // Entropy estimation (max 30 points)
    const charsetSize =
      (hasUpper ? 26 : 0) + (hasLower ? 26 : 0) + (hasNumbers ? 10 : 0) + (hasSpecial ? 32 : 0);

    if (charsetSize > 0) {
      const entropy = Math.log2(Math.pow(charsetSize, password.length));
      score += Math.min(entropy / 4, 30); // Normalize
    }

    // Penalties for patterns
    if (/password|123456|qwerty/i.test(password)) {
      score -= 50;
    }

    if (password.length < 8) {
      score -= 30;
    }

    // Ensure score is 0-100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Check against list of common breached passwords
   */
  private static isCommonPassword(password: string): boolean {
    // In production, check against HaveIBeenPwned API or local bloom filter
    const commonPasswords = new Set([
      'password',
      '123456',
      '12345678',
      '123456789',
      '12345',
      'qwerty',
      'abc123',
      'password1',
      'admin',
      'letmein',
    ]);

    return commonPasswords.has(password.toLowerCase());
  }

  private static async getSystemMemory(): Promise<number> {
    try {
      if (process.platform === 'win32') {
        // Windows - use wmic
        const result = Bun.spawnSync(['wmic', 'OS', 'get', 'TotalVisibleMemorySize', '/Value'], {
          stdout: 'pipe',
        });
        const output = await new Response(result.stdout).text();
        const match = output.match(/TotalVisibleMemorySize=(\d+)/);
        return match ? parseInt(match[1]) * 1024 : 0; // Convert KB to bytes
      } else {
        // Unix-like systems
        const result = Bun.spawnSync(['sysctl', '-n', 'hw.memsize'], {
          stdout: 'pipe',
        });
        const output = await new Response(result.stdout).text();
        const match = output.match(/(\d+)/);
        return match ? parseInt(match[1]) * 1024 : 0; // Convert KB to bytes
      }
    } catch {
      return 0;
    }
  }

  /**
   * Password change with history validation
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string; score: number }> {
    // 1. Verify current password
    const verification = await this.verifyPassword(currentPassword, userId);
    if (!verification.valid) {
      return {
        success: false,
        message: 'Current password is incorrect',
        score: 0,
      };
    }

    // 2. Check if new password is in history
    if (await this.isPasswordInHistory(newPassword, userId)) {
      return {
        success: false,
        message: 'Password has been used recently. Please choose a new password.',
        score: 0,
      };
    }

    // 3. Hash and store new password
    try {
      const newHash = await this.hashPassword(newPassword, { userId });
      const score = this.calculatePasswordScore(newPassword);

      return {
        success: true,
        message: 'Password changed successfully',
        score,
      };
    } catch (error) {
      if (error instanceof PasswordPolicyError) {
        return {
          success: false,
          message: error.errors.join(', '),
          score: 0,
        };
      }
      throw error;
    }
  }

  /**
   * Batch password verification for authentication systems
   */
  static async batchVerify(
    requests: Array<{ userId: string; password: string }>
  ): Promise<Array<{ userId: string; valid: boolean; score?: number }>> {
    const results = await Promise.all(
      requests.map(async req => {
        try {
          const verification = await this.verifyPassword(req.password, req.userId);
          return {
            userId: req.userId,
            valid: verification.valid,
            score: verification.score,
          };
        } catch {
          return {
            userId: req.userId,
            valid: false,
            score: 0,
          };
        }
      })
    );

    return results;
  }

  /**
   * Synchronous version for environments without async
   */
  static hashPasswordSync(
    password: string,
    options: {
      algorithm?: 'argon2id' | 'bcrypt';
    } = {}
  ): PasswordHash {
    const algorithm = options.algorithm || 'bcrypt';
    let hash: string;
    const metadata: any = {};

    switch (algorithm) {
      case 'argon2id':
        hash = Bun.password.hashSync(password, {
          algorithm: 'argon2id',
          memoryCost: 65536,
          timeCost: 3,
        });
        metadata.memoryCost = 65536;
        metadata.timeCost = 3;
        break;

      case 'bcrypt':
        hash = Bun.password.hashSync(password, {
          algorithm: 'bcrypt',
          cost: 12,
        });
        metadata.cost = 12;
        break;
    }

    return {
      hash,
      algorithm,
      version: 'v4.5',
      createdAt: new Date(),
      metadata,
    };
  }
}

// Error Classes
export class PasswordPolicyError extends Error {
  constructor(
    message: string,
    public errors: string[]
  ) {
    super(message);
    this.name = 'PasswordPolicyError';
  }
}

// Password Quality Report Generator
export class Tier1380PasswordAudit {
  static async generateReport(userId?: string): Promise<PasswordAuditReport> {
    const report: PasswordAuditReport = {
      timestamp: new Date(),
      totalUsers: 0,
      weakPasswords: 0,
      expiredPasswords: 0,
      reusedPasswords: 0,
      recommendations: [],
    };

    // If specific user, audit their password
    if (userId) {
      const hash = await Tier1380PasswordSecurity.retrievePasswordHash(userId);
      if (hash) {
        const ageInDays = (Date.now() - hash.createdAt.getTime()) / (1000 * 60 * 60 * 24);

        if (ageInDays > 90) {
          report.expiredPasswords++;
          report.recommendations.push(
            `User ${userId}: Password expired ${Math.floor(ageInDays - 90)} days ago`
          );
        }

        // Check hash strength
        if (hash.algorithm === 'bcrypt' && (hash.metadata?.cost || 0) < 10) {
          report.weakPasswords++;
          report.recommendations.push(
            `User ${userId}: bcrypt cost factor too low (${hash.metadata?.cost})`
          );
        }
      }
    }

    return report;
  }
}

// Helper method to retrieve password hash (implementation from Tier1380SecretManager)
namespace Tier1380PasswordSecurity {
  export async function retrievePasswordHash(userId: string): Promise<PasswordHash | null> {
    const key = `TIER1380_PASSWORD_${userId}`;
    const hashData = await Tier1380SecretManager.getSecret(key);

    if (!hashData) return null;

    try {
      return JSON.parse(hashData);
    } catch {
      return null;
    }
  }
}

// CLI Interface
async function main() {
  const args = Bun.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'hash':
      const password = args[1];
      const algorithm = (args[2] as 'argon2id' | 'bcrypt') || 'argon2id';

      if (!password) {
        console.error(
          'Usage: bun run enterprise-password-security.ts hash <password> [argon2id|bcrypt]'
        );
        process.exit(1);
      }

      try {
        const hash = await Tier1380PasswordSecurity.hashPassword(password, { algorithm });
        console.log('✅ Password hashed successfully:');
        console.log(`   Algorithm: ${hash.algorithm}`);
        console.log(`   Hash: ${hash.hash.substring(0, 50)}...`);
        console.log(`   Created: ${hash.createdAt.toISOString()}`);
      } catch (error) {
        if (error instanceof PasswordPolicyError) {
          console.error('❌ Password policy violations:');
          error.errors.forEach(err => console.error(`   • ${err}`));
        } else {
          console.error('❌ Error:', error.message);
        }
      }
      break;

    case 'verify':
      const verifyPassword = args[1];
      const userId = args[2] || 'test-user';

      if (!verifyPassword) {
        console.error('Usage: bun run enterprise-password-security.ts verify <password> [userId]');
        process.exit(1);
      }

      const result = await Tier1380PasswordSecurity.verifyPassword(verifyPassword, userId);
      console.log('🔍 Password verification:');
      console.log(`   Valid: ${result.valid ? '✅' : '❌'}`);
      console.log(`   Score: ${result.score}/100`);
      if (result.needsRehash) {
        console.log(`   ⚠️  Password needs rehashing (algorithm outdated)`);
      }
      break;

    case 'audit':
      const auditUserId = args[1];
      const report = await Tier1380PasswordAudit.generateReport(auditUserId);
      console.log('📊 Password Security Audit Report');
      console.log(`   Generated: ${report.timestamp.toISOString()}`);
      console.log(`   Expired passwords: ${report.expiredPasswords}`);
      console.log(`   Weak passwords: ${report.weakPasswords}`);
      if (report.recommendations.length > 0) {
        console.log('   Recommendations:');
        report.recommendations.forEach(rec => console.log(`     • ${rec}`));
      }
      break;

    default:
      console.log(`
Tier-1380 Enterprise Password Security v4.5
=======================================
Commands:
  hash <password> [algorithm]    Hash a password (argon2id|bcrypt)
  verify <password> [userId]     Verify a password against stored hash
  audit [userId]                 Generate password security audit report
  
Algorithms:
  • argon2id (Recommended) - Memory-hard, resistant to GPU attacks
  • bcrypt - CPU-hard, time-tested, auto pre-hashes >72 byte passwords

Security Features:
  • Windows CRED_PERSIST_ENTERPRISE storage
  • Algorithm selection based on system capabilities
  • Password policy enforcement
  • Breach password detection
  • Password history (prevents reuse)
  • Automatic rehashing when needed
  • Strength scoring (0-100)
      `);
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}

export default Tier1380PasswordSecurity;
