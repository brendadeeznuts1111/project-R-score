/**
 * 🔐 FactoryWager Master Token System v5.0
 * 
 * Enterprise-grade token management for MCP authentication
 * with rotating tokens, secure storage, and audit logging.
 */

import { createHmac, createHash, randomBytes } from 'node:crypto';
import { r2MCPIntegration } from '../mcp/r2-integration';

export interface MasterTokenConfig {
  tokenId: string;
  secret: string;
  expiresAt: Date;
  permissions: string[];
  metadata?: Record<string, any>;
}

export interface TokenValidation {
  valid: boolean;
  tokenId?: string;
  permissions?: string[];
  expiresAt?: Date;
  reason?: string;
}

export interface AuditLog {
  timestamp: string;
  tokenId: string;
  action: 'create' | 'validate' | 'revoke' | 'rotate';
  success: boolean;
  ip?: string;
  userAgent?: string;
  reason?: string;
}

export class MasterTokenManager {
  private static instance: MasterTokenManager;
  private tokens: Map<string, MasterTokenConfig> = new Map();
  private auditLogs: AuditLog[] = [];
  private readonly TOKEN_LIFETIME = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_AUDIT_LOGS = 1000;

  constructor() {
    this.loadTokensFromStorage();
  }

  static getInstance(): MasterTokenManager {
    if (!MasterTokenManager.instance) {
      MasterTokenManager.instance = new MasterTokenManager();
    }
    return MasterTokenManager.instance;
  }

  /**
   * Create a new master token
   */
  async createToken(permissions: string[], metadata?: Record<string, any>): Promise<string> {
    const tokenId = this.generateTokenId();
    const secret = this.generateSecret();
    const expiresAt = new Date(Date.now() + this.TOKEN_LIFETIME);

    const tokenConfig: MasterTokenConfig = {
      tokenId,
      secret,
      expiresAt,
      permissions,
      metadata
    };

    this.tokens.set(tokenId, tokenConfig);
    await this.saveTokensToStorage();
    
    // Log creation
    await this.logAudit('create', tokenId, true, undefined, undefined, 'Token created');

    return this.encodeToken(tokenId, secret);
  }

  /**
   * Validate a master token
   */
  async validateToken(token: string, context?: { ip?: string; userAgent?: string }): Promise<TokenValidation> {
    try {
      const decoded = this.decodeToken(token);
      
      if (!decoded) {
        await this.logAudit('validate', 'unknown', false, context?.ip, context?.userAgent, 'Invalid token format');
        return { valid: false, reason: 'Invalid token format' };
      }

      const tokenConfig = this.tokens.get(decoded.tokenId);
      
      if (!tokenConfig) {
        await this.logAudit('validate', decoded.tokenId, false, context?.ip, context?.userAgent, 'Token not found');
        return { valid: false, reason: 'Token not found' };
      }

      if (tokenConfig.secret !== decoded.secret) {
        await this.logAudit('validate', decoded.tokenId, false, context?.ip, context?.userAgent, 'Invalid secret');
        return { valid: false, reason: 'Invalid secret' };
      }

      if (new Date() > tokenConfig.expiresAt) {
        await this.logAudit('validate', decoded.tokenId, false, context?.ip, context?.userAgent, 'Token expired');
        return { valid: false, reason: 'Token expired' };
      }

      await this.logAudit('validate', decoded.tokenId, true, context?.ip, context?.userAgent);

      return {
        valid: true,
        tokenId: decoded.tokenId,
        permissions: tokenConfig.permissions,
        expiresAt: tokenConfig.expiresAt
      };

    } catch (error) {
      await this.logAudit('validate', 'unknown', false, context?.ip, context?.userAgent, `Validation error: ${error.message}`);
      return { valid: false, reason: `Validation error: ${error.message}` };
    }
  }

  /**
   * Check if token has specific permission
   */
  async hasPermission(token: string, permission: string): Promise<boolean> {
    const validation = await this.validateToken(token);
    return validation.valid && validation.permissions?.includes(permission) || false;
  }

  /**
   * Revoke a token
   */
  async revokeToken(tokenId: string, reason?: string): Promise<boolean> {
    const tokenConfig = this.tokens.get(tokenId);
    
    if (!tokenConfig) {
      return false;
    }

    this.tokens.delete(tokenId);
    await this.saveTokensToStorage();
    
    await this.logAudit('revoke', tokenId, true, undefined, undefined, reason || 'Token revoked');
    
    return true;
  }

  /**
   * Rotate a token (create new one, revoke old)
   */
  async rotateToken(oldToken: string, reason?: string): Promise<string> {
    const decoded = this.decodeToken(oldToken);
    
    if (!decoded) {
      throw new Error('Invalid token for rotation');
    }

    const oldConfig = this.tokens.get(decoded.tokenId);
    
    if (!oldConfig) {
      throw new Error('Token not found for rotation');
    }

    // Create new token with same permissions
    const newToken = await this.createToken(oldConfig.permissions, {
      ...oldConfig.metadata,
      rotatedFrom: decoded.tokenId,
      rotationReason: reason
    });

    // Revoke old token
    await this.revokeToken(decoded.tokenId, `Rotated: ${reason || 'Scheduled rotation'}`);

    return newToken;
  }

  /**
   * List all active tokens
   */
  listTokens(): Array<MasterTokenConfig & { tokenId: string }> {
    const now = new Date();
    return Array.from(this.tokens.entries())
      .filter(([_, config]) => config.expiresAt > now)
      .map(([tokenId, config]) => ({
        tokenId,
        ...config
      }));
  }

  /**
   * Get audit logs
   */
  getAuditLogs(limit: number = 100): AuditLog[] {
    return this.auditLogs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    const now = new Date();
    const expiredTokens: string[] = [];

    for (const [tokenId, config] of this.tokens.entries()) {
      if (config.expiresAt <= now) {
        expiredTokens.push(tokenId);
      }
    }

    for (const tokenId of expiredTokens) {
      this.tokens.delete(tokenId);
      await this.logAudit('revoke', tokenId, true, undefined, undefined, 'Token expired and cleaned up');
    }

    if (expiredTokens.length > 0) {
      await this.saveTokensToStorage();
    }

    return expiredTokens.length;
  }

  // Private methods

  private generateTokenId(): string {
    return `mt_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  private generateSecret(): string {
    return randomBytes(32).toString('hex');
  }

  private encodeToken(tokenId: string, secret: string): string {
    const payload = `${tokenId}:${secret}:${Date.now()}`;
    const signature = createHmac('sha256', this.getHmacKey()).update(payload).digest('hex');
    return Buffer.from(`${payload}.${signature}`).toString('base64');
  }

  private decodeToken(token: string): { tokenId: string; secret: string; timestamp: number } | null {
    try {
      const decoded = Buffer.from(token, 'base64').toString();
      const [payload, signature] = decoded.split('.');

      if (!payload || !signature) {
        return null;
      }

      // Verify signature
      const expectedSignature = createHmac('sha256', this.getHmacKey()).update(payload).digest('hex');
      if (signature !== expectedSignature) {
        return null;
      }

      const [tokenId, secret, timestampStr] = payload.split(':');
      
      if (!tokenId || !secret || !timestampStr) {
        return null;
      }

      const timestamp = parseInt(timestampStr, 10);
      if (isNaN(timestamp)) {
        return null;
      }

      return { tokenId, secret, timestamp };
    } catch {
      return null;
    }
  }

  private getHmacKey(): string {
    // Use environment variable or generate a persistent key
    return process.env.MASTER_TOKEN_HMAC_KEY || 'factorywager-mcp-default-key-change-in-production';
  }

  private async logAudit(action: AuditLog['action'], tokenId: string, success: boolean, ip?: string, userAgent?: string, reason?: string): Promise<void> {
    const logEntry: AuditLog = {
      timestamp: new Date().toISOString(),
      tokenId,
      action,
      success,
      ip,
      userAgent,
      reason
    };

    this.auditLogs.push(logEntry);

    // Keep only recent logs
    if (this.auditLogs.length > this.MAX_AUDIT_LOGS) {
      this.auditLogs = this.auditLogs.slice(-this.MAX_AUDIT_LOGS);
    }

    // Store in R2 if available
    try {
      await r2MCPIntegration.storeAuditEntry({
        id: `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: logEntry.timestamp,
        errorType: 'TokenAudit',
        errorMessage: `${action}: ${tokenId}`,
        resolution: success ? 'Success' : 'Failed',
        context: 'security',
        severity: success ? 'low' : 'medium',
        metadata: {
          action,
          success,
          ip,
          userAgent,
          reason
        }
      });
    } catch {
      // R2 not available, continue with local logging
    }
  }

  private async saveTokensToStorage(): Promise<void> {
    try {
      const tokenData = {
        tokens: Object.fromEntries(this.tokens),
        lastUpdated: new Date().toISOString()
      };

      await r2MCPIntegration.storeDiagnosis({
        id: `token-backup-${Date.now()}`,
        timestamp: new Date().toISOString(),
        error: {
          name: 'TokenBackup',
          message: 'Regular token backup'
        },
        fix: '',
        relatedAudits: [],
        relatedDocs: [],
        confidence: 1.0,
        context: 'security',
        metadata: tokenData
      });
    } catch {
      // R2 not available, tokens remain in memory
    }
  }

  private loadTokensFromStorage(): void {
    // In production, load from secure storage
    // For now, tokens are kept in memory with R2 backup
    
    // Set up automatic cleanup
    setInterval(() => {
      this.cleanupExpiredTokens();
    }, 60 * 60 * 1000); // Check every hour
  }
}

// Export singleton instance
export const masterTokenManager = MasterTokenManager.getInstance();

// Default permissions for different contexts
export const DEFAULT_PERMISSIONS = {
  'mcp:read': ['search:docs', 'read:metrics'],
  'mcp:write': ['search:docs', 'store:diagnosis', 'write:metrics'],
  'mcp:admin': ['search:docs', 'store:diagnosis', 'write:metrics', 'manage:tokens', 'read:audits'],
  'claude:desktop': ['search:docs', 'store:diagnosis', 'audit:search', 'metrics:read'],
  'cli:user': ['search:docs', 'generate:examples', 'validate:code']
};

// CLI interface for token management
if (import.meta.main) {
  const command = Bun.argv[2];
  const args = Bun.argv.slice(3);

  async function runCLI() {
    try {
      switch (command) {
        case 'create':
          const permissions = args[0]?.split(',') || ['mcp:read'];
          const token = await masterTokenManager.createToken(permissions);
          console.log('🔑 Generated Master Token:');
          console.log(token);
          console.log(`\n📋 Permissions: ${permissions.join(', ')}`);
          console.log(`⏰ Expires: ${new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString()}`);
          break;

        case 'validate':
          const tokenToValidate = args[0];
          if (!tokenToValidate) {
            console.error('❌ Token required');
            process.exit(1);
          }
          const validation = await masterTokenManager.validateToken(tokenToValidate);
          if (validation.valid) {
            console.log('✅ Token is valid');
            console.log(`🆔 Token ID: ${validation.tokenId}`);
            console.log(`🔑 Permissions: ${validation.permissions?.join(', ')}`);
            console.log(`⏰ Expires: ${validation.expiresAt?.toLocaleString()}`);
          } else {
            console.log(`❌ Token invalid: ${validation.reason}`);
          }
          break;

        case 'list':
          const tokens = masterTokenManager.listTokens();
          console.log(`📋 Active Tokens (${tokens.length}):`);
          tokens.forEach(token => {
            console.log(`\n🆔 ${token.tokenId}`);
            console.log(`🔑 Permissions: ${token.permissions.join(', ')}`);
            console.log(`⏰ Expires: ${token.expiresAt.toLocaleString()}`);
            if (token.metadata) {
              console.log(`📝 Metadata: ${JSON.stringify(token.metadata, null, 2)}`);
            }
          });
          break;

        case 'revoke':
          const tokenIdToRevoke = args[0];
          if (!tokenIdToRevoke) {
            console.error('❌ Token ID required');
            process.exit(1);
          }
          const revoked = await masterTokenManager.revokeToken(tokenIdToRevoke);
          if (revoked) {
            console.log('✅ Token revoked successfully');
          } else {
            console.log('❌ Token not found');
          }
          break;

        case 'rotate':
          const oldToken = args[0];
          if (!oldToken) {
            console.error('❌ Old token required');
            process.exit(1);
          }
          const newToken = await masterTokenManager.rotateToken(oldToken);
          console.log('🔄 Token rotated successfully');
          console.log('🔑 New Token:');
          console.log(newToken);
          break;

        case 'audit':
          const limit = parseInt(args[0]) || 10;
          const logs = masterTokenManager.getAuditLogs(limit);
          console.log(`📋 Audit Logs (Last ${limit}):`);
          logs.forEach(log => {
            const status = log.success ? '✅' : '❌';
            console.log(`${status} ${log.timestamp} - ${log.action} - ${log.tokenId}`);
            if (log.reason) console.log(`   Reason: ${log.reason}`);
            if (log.ip) console.log(`   IP: ${log.ip}`);
          });
          break;

        case 'cleanup':
          const cleaned = await masterTokenManager.cleanupExpiredTokens();
          console.log(`🧹 Cleaned up ${cleaned} expired tokens`);
          break;

        default:
          console.log('🔐 FactoryWager Master Token Manager');
          console.log('');
          console.log('Commands:');
          console.log('  create [permissions]  - Create a new token');
          console.log('  validate <token>      - Validate a token');
          console.log('  list                 - List active tokens');
          console.log('  revoke <tokenId>      - Revoke a token');
          console.log('  rotate <token>       - Rotate a token');
          console.log('  audit [limit]        - Show audit logs');
          console.log('  cleanup              - Clean up expired tokens');
          console.log('');
          console.log('Default Permissions:');
          Object.entries(DEFAULT_PERMISSIONS).forEach(([key, perms]) => {
            console.log(`  ${key}: ${perms.join(', ')}`);
          });
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  }

  runCLI();
}
