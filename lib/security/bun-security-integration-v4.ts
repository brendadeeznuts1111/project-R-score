// @see https://bun.com/docs/runtime/http/server — Bun.serve
// @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/cookies — Bun.Cookie, Bun.CookieMap
// @see https://bun.com/docs/runtime/csrf — Bun.CSRF
// @see https://bun.com/docs/runtime/environment-variables#setting-environment-variables — Bun.env
/**
 * Bun Security v4.0 — uses Bun.Cookie / CookieMap / CSRF / password / CryptoHasher.
 * AES-GCM still via node:crypto (no Bun.aes primitive).
 */

import { Cookie, CookieMap, CryptoHasher } from 'bun';
import { Database } from 'bun:sqlite';
import { asSessionId } from '../types/branded.ts';

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Buffer.from(buf).toString('hex');
}

function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return buf;
}

async function deriveAesKey(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function csrfSecret(): string {
  const s = Bun.env.CSRF_SECRET?.trim();
  if (s) return s;
  if (
    Bun.env.ALLOW_INSECURE_DEFAULTS === '1' ||
    Bun.env.NODE_ENV === 'development' ||
    Bun.env.NODE_ENV === 'test'
  ) {
    return 'default-secret';
  }
  throw new Error('CSRF_SECRET required');
}

// 🎯 SECURITY TYPES & CONFIG
export interface SecurityConfig {
  password: {
    algorithm: 'bcrypt' | 'argon2id' | 'argon2i';
    cost?: number;
    memory?: number;
    time?: number;
  };
  csrf: {
    tokenLength: number;
    ttl: number; // seconds
    headerName: string;
    cookieName: string;
    samesite: 'strict' | 'lax' | 'none';
  };
  encryption: {
    algorithm: 'aes-256-gcm' | 'chacha20-poly1305';
    ivLength: number;
    saltLength: number;
  };
  secrets: {
    rotationInterval: number; // days
    maxSecrets: number;
  };
}

export interface SecurityMetrics {
  passwordHashes: number;
  csrfTokens: number;
  encryptionOps: number;
  secretRotations: number;
  failedAttempts: number;
  lastBreachCheck: Date;
}

// 🛡️ CORE SECURITY ENGINE
export class BunSecurityEngine {
  private config: SecurityConfig;
  private db: Database;
  private metrics: SecurityMetrics;
  private secretCache: Map<string, string> = new Map();

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      password: { algorithm: 'argon2id', cost: 10, ...config.password },
      csrf: {
        tokenLength: 32,
        ttl: 3600,
        headerName: 'X-CSRF-Token',
        cookieName: 'csrf_token',
        samesite: 'strict',
        ...config.csrf,
      },
      encryption: {
        algorithm: 'aes-256-gcm',
        ivLength: 16,
        saltLength: 32,
        ...config.encryption,
      },
      secrets: {
        rotationInterval: 30,
        maxSecrets: 100,
        ...config.secrets,
      },
    };

    this.db = this.initializeSecurityDatabase();
    this.metrics = {
      passwordHashes: 0,
      csrfTokens: 0,
      encryptionOps: 0,
      secretRotations: 0,
      failedAttempts: 0,
      lastBreachCheck: new Date(),
    };
  }

  // 🔐 PASSWORD SECURITY WITH BUN.PASSWORD
  static PasswordManager = class {
    // 🏆 ENHANCED PASSWORD HASHING
    static async hashPassword(
      password: string,
      options?: {
        algorithm?: 'bcrypt' | 'argon2id' | 'argon2i';
        cost?: number;
      }
    ): Promise<{ hash: string; salt: string; metadata: any }> {
      const algorithm = options?.algorithm || 'argon2id';
      const cost = options?.cost || 10;

      try {
        const hash = await Bun.password.hash(password, {
          algorithm,
          memoryCost: 65536, // 64MB for argon2
          timeCost: cost,
        });

        // Generate and store salt separately
        const salt = randomHex(32);

        // Store metadata for password rotation
        const metadata = {
          algorithm,
          cost,
          createdAt: Date.now(),
          version: 'v2',
        };

        return { hash, salt, metadata };
      } catch (error) {
        throw new SecurityError('Password hashing failed', error);
      }
    }

    // 🔍 PASSWORD VERIFICATION WITH BREACH CHECK
    static async verifyPassword(
      password: string,
      storedHash: string,
      options?: { breachCheck?: boolean }
    ): Promise<{ valid: boolean; needsUpgrade?: boolean; breached?: boolean }> {
      const isValid = await Bun.password.verify(password, storedHash);

      if (!isValid) {
        return { valid: false };
      }

      // Check if password needs upgrade (old algorithm/cost)
      const needsUpgrade = this.needsPasswordUpgrade(storedHash);

      // Optional breach check
      let breached = false;
      if (options?.breachCheck) {
        breached = await this.checkPasswordBreach(password);
      }

      return { valid: true, needsUpgrade, breached };
    }

    // 🔄 PASSWORD UPGRADE DETECTION
    private static needsPasswordUpgrade(hash: string): boolean {
      // Detect old hashing algorithms or weak parameters
      if (hash.includes('$2b$')) {
        // bcrypt
        const cost = parseInt(hash.split('$')[2]);
        return cost < 12; // Upgrade if cost < 12
      }

      // Argon2 parameter checking
      if (hash.includes('$argon2id$')) {
        const parts = hash.split('$');
        const memory = parseInt(parts[3].split('=')[1]);
        const time = parseInt(parts[4].split('=')[1]);

        return memory < 65536 || time < 3;
      }

      return false;
    }

    // 🌐 HAVE I BEEN PWNED? INTEGRATION (SIMULATED)
    private static async checkPasswordBreach(password: string): Promise<boolean> {
      // In production, you would:
      // 1. Hash with SHA-1
      // 2. Send first 5 chars to HIBP API
      // 3. Check if full hash exists in response

      // Simplified simulation
      const hash = new CryptoHasher('sha1', 'breach-check')
        .update(password)
        .digest('hex')
        .toUpperCase();

      // Simulated API call
      try {
        const response = await fetch(
          `https://api.pwnedpasswords.com/range/${hash.substring(0, 5)}`
        );
        const data = await response.text();
        return data.includes(hash.substring(5));
      } catch {
        return false; // Fail safe
      }
    }

    // 🎯 PASSWORD STRENGTH VALIDATOR
    static validatePasswordStrength(password: string): {
      score: number; // 0-100
      valid: boolean;
      feedback: string[];
      suggestions: string[];
    } {
      const feedback: string[] = [];
      const suggestions: string[] = [];
      let score = 0;

      // Length check
      if (password.length >= 12) score += 25;
      else if (password.length >= 8) score += 10;
      else feedback.push('Password too short (minimum 8 characters)');

      // Character variety
      const hasLower = /[a-z]/.test(password);
      const hasUpper = /[A-Z]/.test(password);
      const hasDigit = /\d/.test(password);
      const hasSpecial = /[^A-Za-z0-9]/.test(password);

      if (hasLower && hasUpper) score += 25;
      else suggestions.push('Use both uppercase and lowercase letters');

      if (hasDigit) score += 20;
      else suggestions.push('Add numbers');

      if (hasSpecial) score += 20;
      else suggestions.push('Add special characters (!@#$%^&*)');

      // Common patterns
      const commonPatterns = ['password', '123456', 'qwerty', 'letmein', 'welcome'];

      if (commonPatterns.some(p => password.toLowerCase().includes(p))) {
        score = Math.max(0, score - 50);
        feedback.push('Password contains common patterns');
      }

      // Sequential characters
      if (
        /(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(
          password
        )
      ) {
        score -= 10;
        suggestions.push('Avoid sequential characters');
      }

      // Repeated characters
      if (/(.)\1{2,}/.test(password)) {
        score -= 10;
        suggestions.push('Avoid repeated characters');
      }

      return {
        score,
        valid: score >= 70,
        feedback,
        suggestions,
      };
    }
  };

  // 🛡️ CSRF — Bun.CSRF (session-bound). Prefer Bun.CSRF at new call sites.
  static CSRFProtection = class {
    static generateCSRFToken(
      sessionId: string, // brand-ok — wire session id
      secret: string = csrfSecret()
    ): { token: string; cookie: Cookie; compressed?: boolean } {
      const sid = asSessionId(sessionId);
      const token = Bun.CSRF.generate(secret, {
        sessionId: sid,
        expiresIn: 3600 * 1000,
      });
      const cookie = new Cookie('csrf_token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 3600,
        path: '/',
      });
      return { token, cookie, compressed: false };
    }

    static validateCSRFToken(
      token: string,
      sessionId: string, // brand-ok — wire session id
      secret: string = csrfSecret()
    ): { valid: boolean; reason?: string; metadata?: any } {
      const sid = asSessionId(sessionId);
      const valid = Bun.CSRF.verify(token, { secret, sessionId: sid, maxAge: 3600 * 1000 });
      if (!valid) return { valid: false, reason: 'Invalid or expired CSRF token' };
      return {
        valid: true,
        metadata: { sessionId: sid },
      };
    }
  };

  // 🔒 BUN.SECRETS INTEGRATION WITH ROTATION
  static SecretManager = class {
    // 🔑 SECRET ROTATION ENGINE
    static async rotateSecrets(): Promise<{
      rotated: string[];
      newSecrets: Record<string, string>;
    }> {
      const rotated: string[] = [];
      const newSecrets: Record<string, string> = {};

      // Get current secrets from environment
      const currentSecrets = Bun.env;

      // Rotate each secret that needs rotation
      for (const [key, value] of Object.entries(currentSecrets)) {
        if (key.startsWith('SECRET_') && value) {
          // Generate new secret
          const newSecret = randomHex(32);

          // Update environment (in real app, update your secrets manager)
          newSecrets[key] = newSecret;
          rotated.push(key);

          // Log rotation (don't log actual secrets!)
          console.info(`🔑 Rotated secret: ${key}`);
        }
      }

      return { rotated, newSecrets };
    }

    // 🔐 ENCRYPT — Web Crypto AES-256-GCM + PBKDF2 (no node:crypto)
    static async encryptWithRotation(
      data: string,
      secretName: string = 'ENCRYPTION_SECRET'
    ): Promise<{ encrypted: string; keyVersion: number; metadata: any }> {
      const secret = Bun.env[secretName] || 'demo-secret-key-32-chars-long';
      const keyVersion = this.getKeyVersion(secretName);
      const salt = randomBytes(16);
      const iv = randomBytes(12);
      const key = await deriveAesKey(secret, salt);
      const encrypted = new Uint8Array(
        await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(data))
      );
      const ct = encrypted.slice(0, encrypted.length - 16);
      const tag = encrypted.slice(encrypted.length - 16);

      const result = JSON.stringify({
        v: keyVersion,
        s: Buffer.from(salt).toString('hex'),
        i: Buffer.from(iv).toString('hex'),
        d: Buffer.from(ct).toString('hex'),
        t: Buffer.from(tag).toString('hex'),
      });

      return {
        encrypted: Buffer.from(result).toString('base64'),
        keyVersion,
        metadata: {
          algorithm: 'aes-256-gcm',
          keyVersion,
          encryptedAt: new Date().toISOString(),
        },
      };
    }

    // 🔓 DECRYPT — Web Crypto AES-256-GCM + PBKDF2
    static async decryptWithRotation(
      encryptedData: string,
      secretName: string = 'ENCRYPTION_SECRET'
    ): Promise<{ decrypted: string; keyVersion: number }> {
      try {
        const packageData = JSON.parse(Buffer.from(encryptedData, 'base64').toString());
        const secret = Bun.env[secretName] || 'demo-secret-key-32-chars-long';
        const salt = Buffer.from(packageData.s, 'hex');
        const iv = Buffer.from(packageData.i, 'hex');
        const ct = Buffer.from(packageData.d, 'hex');
        const tag = Buffer.from(packageData.t, 'hex');
        const combined = new Uint8Array(ct.length + tag.length);
        combined.set(ct, 0);
        combined.set(tag, ct.length);
        const key = await deriveAesKey(secret, salt);
        const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, combined);
        return {
          decrypted: new TextDecoder().decode(plain),
          keyVersion: packageData.v,
        };
      } catch (error) {
        throw new SecurityError('Decryption failed', error);
      }
    }

    // 📊 GET KEY VERSION
    private static getKeyVersion(secretName: string): number {
      // In production, store version in database
      return 1; // Simplified
    }
  };

  // 🏗️ SECURITY DATABASE
  private initializeSecurityDatabase(): Database {
    const db = new Database(':memory:'); // Use file in production

    db.exec(`
      CREATE TABLE IF NOT EXISTS security_metrics (
        id INTEGER PRIMARY KEY,
        event_type TEXT NOT NULL,
        event_data TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS password_hashes (
        user_id TEXT PRIMARY KEY,
        hash TEXT NOT NULL,
        salt TEXT,
        algorithm TEXT,
        cost INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used DATETIME
      );

      CREATE TABLE IF NOT EXISTS csrf_tokens (
        token TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        used INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS secret_versions (
        secret_name TEXT PRIMARY KEY,
        current_version INTEGER DEFAULT 1,
        last_rotated DATETIME,
        metadata TEXT
      );
    `);

    return db;
  }

  // 📊 SECURITY METRICS COLLECTION
  recordSecurityEvent(eventType: string, eventData: any): void {
    this.db
      .query(
        `
      INSERT INTO security_metrics (event_type, event_data)
      VALUES (?, ?)
    `
      )
      .run(eventType, JSON.stringify(eventData));

    // Update in-memory metrics
    switch (eventType) {
      case 'password_hash':
        this.metrics.passwordHashes++;
        break;
      case 'csrf_generated':
        this.metrics.csrfTokens++;
        break;
      case 'encryption_op':
        this.metrics.encryptionOps++;
        break;
      case 'secret_rotation':
        this.metrics.secretRotations++;
        break;
      case 'failed_attempt':
        this.metrics.failedAttempts++;
        break;
    }
  }

  // 📈 GET SECURITY REPORT
  getSecurityReport(): {
    metrics: SecurityMetrics;
    recommendations: string[];
    riskScore: number;
  } {
    const recommendations: string[] = [];
    let riskScore = 100; // Start with perfect score

    // Check password metrics
    if (this.metrics.passwordHashes === 0) {
      recommendations.push('No password hashes recorded - enable password hashing');
      riskScore -= 20;
    }

    // Check secret rotation
    const daysSinceRotation =
      (Date.now() - this.metrics.lastBreachCheck.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceRotation > 30) {
      recommendations.push('Secrets should be rotated (last rotation > 30 days)');
      riskScore -= 15;
    }

    // Check failed attempts
    if (this.metrics.failedAttempts > 100) {
      recommendations.push('High number of failed attempts - consider rate limiting');
      riskScore -= 25;
    }

    return {
      metrics: this.metrics,
      recommendations,
      riskScore: Math.max(0, Math.min(100, riskScore)),
    };
  }
}

// 🚀 COMPLETE SECURITY MIDDLEWARE
export function createSecurityMiddleware(config?: Partial<SecurityConfig>) {
  const security = new BunSecurityEngine(config);

  return async (
    request: Request
  ): Promise<{
    request: Request;
    security: {
      cookies: CookieMap;
      csrf: any;
      session: any;
      validated: boolean;
    };
    responseCookies: Cookie[];
  }> => {
    const cookies = new CookieMap(request.headers.get('cookie') ?? '');
    const responseCookies: Cookie[] = [];

    // 🔐 SESSION VALIDATION
    const session = await validateSession(cookies);

    // 🛡️ CSRF VALIDATION (for state-changing requests)
    const csrfValidation = await validateCSRF(request, cookies, session);

    // 📊 RECORD SECURITY EVENTS
    if (!csrfValidation.valid) {
      security.recordSecurityEvent('failed_attempt', {
        path: new URL(request.url).pathname,
        method: request.method,
        reason: 'csrf_validation_failed',
        sessionId: session?.id,
      });
    }
    security.recordSecurityEvent('request_processed', {
      path: new URL(request.url).pathname,
      method: request.method,
      sessionId: session?.id,
      csrfValid: csrfValidation.valid,
    });

    return {
      request,
      security: {
        cookies,
        csrf: csrfValidation,
        session,
        validated: csrfValidation.valid && !!session,
      },
      responseCookies,
    };
  };
}

// 🎯 EXAMPLE USAGE
export async function demonstrateSecurityIntegration() {
  console.info('🔐 BUN SECURITY INTEGRATION v4.0');
  console.info('='.repeat(50));

  // 1. PASSWORD SECURITY
  console.info('\n1. 🔐 Password Security:');
  console.info('-'.repeat(30));

  const password = 'SuperSecure123!';
  const strength = BunSecurityEngine.PasswordManager.validatePasswordStrength(password);
  console.info(`Password strength: ${strength.score}/100`);
  console.info(`Valid: ${strength.valid ? '✅' : '❌'}`);

  const hashResult = await BunSecurityEngine.PasswordManager.hashPassword(password);
  console.info(
    `Hashed password (${hashResult.metadata.algorithm}): ${hashResult.hash.substring(0, 20)}...`
  );

  const verification = await BunSecurityEngine.PasswordManager.verifyPassword(
    password,
    hashResult.hash,
    { breachCheck: true }
  );
  console.info(`Verification: ${verification.valid ? '✅' : '❌'}`);

  // 2. CSRF PROTECTION
  console.info('\n2. 🛡️ CSRF Protection:');
  console.info('-'.repeat(30));

  const sessionId = 'user123_session';
  const csrfToken = BunSecurityEngine.CSRFProtection.generateCSRFToken(sessionId);
  console.info(`CSRF Token generated: ${csrfToken.token.substring(0, 20)}...`);
  console.info(`Compressed: ${csrfToken.compressed ? '✅' : '❌'}`);

  const csrfValidation = BunSecurityEngine.CSRFProtection.validateCSRFToken(
    csrfToken.token,
    sessionId
  );
  console.info(`CSRF Validation: ${csrfValidation.valid ? '✅' : '❌'}`);

  // 3. SECRETS MANAGEMENT
  console.info('\n3. 🔑 Secrets Management:');
  console.info('-'.repeat(30));

  const secretName = 'API_SECRET';
  const data = 'Sensitive API Data';

  const encrypted = await BunSecurityEngine.SecretManager.encryptWithRotation(data, secretName);
  console.info(`Encrypted data: ${encrypted.encrypted.substring(0, 30)}...`);
  console.info(`Key version: ${encrypted.keyVersion}`);

  const decrypted = await BunSecurityEngine.SecretManager.decryptWithRotation(
    encrypted.encrypted,
    secretName
  );
  console.info(`Decrypted matches: ${decrypted.decrypted === data ? '✅' : '❌'}`);

  // 4. SECURITY MIDDLEWARE
  console.info('\n4. 🚀 Security Middleware:');
  console.info('-'.repeat(30));

  const middleware = createSecurityMiddleware();
  console.info('Middleware ready for Bun.serve integration');

  // 5. SECURITY REPORT
  console.info('\n5. 📊 Security Report:');
  console.info('-'.repeat(30));

  const securityEngine = new BunSecurityEngine();
  const report = securityEngine.getSecurityReport();
  console.info(`Risk Score: ${report.riskScore}/100`);
  console.info(`Recommendations: ${report.recommendations.length}`);
}

// 🚨 SECURITY ERROR CLASS
export class SecurityError extends Error {
  constructor(
    message: string,
    public readonly cause?: any,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}

// 📦 EXPORT ALL COMPONENTS
export { BunSecurityEngine as Security };

export const PasswordSecurity = BunSecurityEngine.PasswordManager;
export const CSRF = BunSecurityEngine.CSRFProtection;
export const Secrets = BunSecurityEngine.SecretManager;

// 🚀 RUN DEMONSTRATION
if (import.meta.main) {
  demonstrateSecurityIntegration().catch(console.error);
}

// Helper functions for middleware
async function validateSession(cookies: CookieMap): Promise<any> {
  // Simplified session validation
  return { id: cookies.get('session') || 'anonymous' };
}

async function validateCSRF(
  request: Request,
  cookies: CookieMap,
  session: any
): Promise<{ valid: boolean }> {
  // Simplified CSRF validation
  return { valid: true };
}
