// @see https://bun.com/docs/runtime/hashing#bun-hash — Bun.hash
// @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password
// @see https://bun.com/docs/runtime/cookies — Bun.Cookie, Bun.CookieMap
// @see https://bun.com/docs/runtime/csrf — Bun.CSRF
// @see https://bun.com/docs/runtime/secrets — Bun.secrets
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// lib/security/index.ts — Security module index (Bun primitives at call sites)

export { Cookie, CookieMap } from 'bun';

export { zeroTrustManager } from './zero-trust-manager';
export { auditLogger } from './secret-audit-logger';
export {
  PARTNER_VAULT_KEY_VERSION,
  PARTNER_VAULT_MASTER_ENV,
  derivePartnerAesKey,
  encryptPartnerSecret,
  decryptPartnerSecret,
  setPartnerSecret,
  getPartnerSecret,
  type PartnerVaultOptions,
} from './partner-vault';
export {
  AGENT_API_KEY_PREFIX,
  AGENT_KEY_PREFIX_LEN,
  agentKeyPrefix,
  createAgent,
  verifyAgent,
  revokeAgentsForNode,
  type AgentStatus,
  type AgentRecord,
  type CreateAgentResult,
} from './ai-agents';

/** Security utilities — direct Bun.password / crypto.getRandomValues / Bun.hash */
export class SecurityUtils {
  static generateSecret(length: number = 32): string {
    const bytes = new Uint8Array(Math.max(1, Math.ceil(length / 2)));
    crypto.getRandomValues(bytes);
    return Buffer.from(bytes).toString('hex').slice(0, length);
  }

  static generateApiKey(prefix: string = 'sk'): string {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return `${prefix}_${Buffer.from(bytes).toString('hex')}`;
  }

  static generateJWTSecret(): string {
    const bytes = new Uint8Array(64);
    crypto.getRandomValues(bytes);
    return Buffer.from(bytes).toString('hex');
  }

  static generatePassword(length: number = 16): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars[bytes[i]! % chars.length];
    }
    return password;
  }

  static async hashPassword(
    password: string,
    options?: Parameters<typeof Bun.password.hash>[1]
  ): Promise<string> {
    return Bun.password.hash(password, options);
  }

  static hashPasswordSync(
    password: string,
    options?: Parameters<typeof Bun.password.hashSync>[1]
  ): string {
    return Bun.password.hashSync(password, options);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return Bun.password.verify(password, hash);
  }

  static verifyPasswordSync(password: string, hash: string): boolean {
    return Bun.password.verifySync(password, hash);
  }

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

    return { score: Math.max(0, score), issues, recommendations };
  }

  static hashSecret(secret: string): string {
    return new Bun.CryptoHasher('sha256').update(secret).digest('hex');
  }

  static compareSecret(secret1: string, secret2: string): boolean {
    const a = Buffer.from(this.hashSecret(secret1), 'hex');
    const b = Buffer.from(this.hashSecret(secret2), 'hex');
    if (a.byteLength !== b.byteLength) return false;
    return crypto.timingSafeEqual(a, b);
  }
}

export default {
  SecurityUtils,
};
