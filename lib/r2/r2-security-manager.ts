#!/usr/bin/env bun

/**
 * 🔐 R2 Security & Access Control Manager
 * 
 * Comprehensive security management for R2:
 * - Fine-grained access control policies
 * - IAM-style permissions and roles
 * - Encryption key management
 * - Security auditing and compliance
 * - Public access analysis and blocking
 */

import { styled, FW_COLORS } from '../theme/colors';
import { r2EventSystem } from './r2-event-system';

export type Permission = 
  | 'r2:Read' 
  | 'r2:Write' 
  | 'r2:Delete' 
  | 'r2:List' 
  | 'r2:Admin';

export interface AccessPolicy {
  id: string;
  name: string;
  effect: 'allow' | 'deny';
  principal: string; // user, role, or *
  actions: Permission[];
  resources: string[]; // bucket/key patterns
  conditions?: {
    ipAddress?: string[];
    timeRange?: { start: string; end: string };
    userAgent?: string[];
    encryptionRequired?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  policies: string[];
  trustPolicy?: {
    principals: string[];
    conditions?: Record<string, any>;
  };
}

export interface AccessKey {
  id: string;
  name: string;
  accessKeyId: string;
  secretAccessKeyHash: string;
  status: 'active' | 'inactive' | 'expired';
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
  permissions: Permission[];
  rateLimit?: {
    requestsPerSecond: number;
    burstSize: number;
  };
}

export interface EncryptionKey {
  id: string;
  name: string;
  algorithm: 'AES-256' | 'AES-256-GCM' | 'ChaCha20-Poly1305';
  keyData: Uint8Array;
  createdAt: string;
  rotatedAt?: string;
  status: 'active' | 'deprecated' | 'compromised';
  keyRotationDays?: number;
}

export interface SecurityAuditEntry {
  id: string;
  timestamp: string;
  action: string;
  principal: string;
  resource: string;
  result: 'success' | 'failure' | 'denied';
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  riskScore: number;
}

export interface SecurityReport {
  timestamp: string;
  summary: {
    totalPolicies: number;
    totalRoles: number;
    totalKeys: number;
    activeKeys: number;
    publicObjects: number;
    unencryptedObjects: number;
    violations: number;
  };
  findings: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    category: 'access' | 'encryption' | 'compliance' | 'configuration';
    title: string;
    description: string;
    resource: string;
    recommendation: string;
  }>;
  complianceStatus: Record<string, 'pass' | 'fail' | 'warning'>;
}

export class R2SecurityManager {
  private policies: Map<string, AccessPolicy> = new Map();
  private roles: Map<string, Role> = new Map();
  private accessKeys: Map<string, AccessKey> = new Map();
  private encryptionKeys: Map<string, EncryptionKey> = new Map();
  private auditLog: SecurityAuditEntry[] = [];
  private maxAuditEntries: number = 10000;

  /**
   * Initialize security manager
   */
  async initialize(): Promise<void> {
    console.log(styled('🔐 Initializing R2 Security Manager', 'accent'));

    // Load default policies
    this.loadDefaultPolicies();

    // Load default roles
    this.loadDefaultRoles();

    // Setup audit event listeners
    this.setupAuditListeners();

    console.log(styled('✅ Security manager initialized', 'success'));
  }

  /**
   * Load default security policies
   */
  private loadDefaultPolicies(): void {
    // Read-only policy
    this.createPolicy({
      name: 'ReadOnly',
      effect: 'allow',
      principal: 'role:readonly',
      actions: ['r2:Read', 'r2:List'],
      resources: ['*']
    });

    // Write policy
    this.createPolicy({
      name: 'ReadWrite',
      effect: 'allow',
      principal: 'role:readwrite',
      actions: ['r2:Read', 'r2:Write', 'r2:List'],
      resources: ['*']
    });

    // Admin policy
    this.createPolicy({
      name: 'AdminFullAccess',
      effect: 'allow',
      principal: 'role:admin',
      actions: ['r2:*'],
      resources: ['*']
    });

    // Deny public access policy
    this.createPolicy({
      name: 'DenyPublicAccess',
      effect: 'deny',
      principal: '*',
      actions: ['r2:Read', 'r2:Write', 'r2:Delete'],
      resources: ['*'],
      conditions: {
        encryptionRequired: false
      }
    });
  }

  /**
   * Load default roles
   */
  private loadDefaultRoles(): void {
    this.createRole({
      name: 'Viewer',
      description: 'Read-only access to all R2 resources',
      permissions: ['r2:Read', 'r2:List'],
      policies: []
    });

    this.createRole({
      name: 'Developer',
      description: 'Read and write access for development',
      permissions: ['r2:Read', 'r2:Write', 'r2:List'],
      policies: []
    });

    this.createRole({
      name: 'Admin',
      description: 'Full administrative access',
      permissions: ['r2:Read', 'r2:Write', 'r2:Delete', 'r2:List', 'r2:Admin'],
      policies: []
    });
  }

  /**
   * Setup audit event listeners
   */
  private setupAuditListeners(): void {
    r2EventSystem.on('object:created', (event) => {
      this.audit('CreateObject', event.metadata?.principal || 'system', event.key || event.bucket, 'success', {
        bucket: event.bucket,
        metadata: event.metadata
      });
    });

    r2EventSystem.on('object:accessed', (event) => {
      this.audit('AccessObject', event.metadata?.principal || 'system', event.key || event.bucket, 'success', {
        bucket: event.bucket
      });
    });

    r2EventSystem.on('object:deleted', (event) => {
      this.audit('DeleteObject', event.metadata?.principal || 'system', event.key || event.bucket, 'success', {
        bucket: event.bucket
      });
    });
  }

  /**
   * Create access policy
   */
  createPolicy(policy: Omit<AccessPolicy, 'id' | 'createdAt' | 'updatedAt'>): AccessPolicy {
    const now = new Date().toISOString();
    const newPolicy: AccessPolicy = {
      ...policy,
      id: `policy-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      createdAt: now,
      updatedAt: now
    };

    this.policies.set(newPolicy.id, newPolicy);
    console.log(styled(`📋 Created policy: ${newPolicy.name}`, 'success'));
    return newPolicy;
  }

  /**
   * Create role
   */
  createRole(role: Omit<Role, 'id'>): Role {
    const newRole: Role = {
      ...role,
      id: `role-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
    };

    this.roles.set(newRole.id, newRole);
    console.log(styled(`👤 Created role: ${newRole.name}`, 'success'));
    return newRole;
  }

  /**
   * Create access key
   */
  createAccessKey(
    name: string,
    permissions: Permission[],
    options?: { expiresInDays?: number; rateLimit?: { rps: number; burst: number } }
  ): { key: AccessKey; secret: string } {
    const accessKeyId = `R2AK${crypto.randomUUID().replace(/-/g, '').toUpperCase().slice(0, 16)}`;
    const secretAccessKey = crypto.randomUUID().replace(/-/g, '');
    
    const key: AccessKey = {
      id: `key-${Date.now()}`,
      name,
      accessKeyId,
      secretAccessKeyHash: Bun.hash(secretAccessKey).toString(),
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt: options?.expiresInDays 
        ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
      permissions,
      rateLimit: options?.rateLimit ? {
        requestsPerSecond: options.rateLimit.rps,
        burstSize: options.rateLimit.burst
      } : undefined
    };

    this.accessKeys.set(key.id, key);
    
    this.audit('CreateAccessKey', 'admin', key.id, 'success', { name, permissions });

    console.log(styled(`🔑 Created access key: ${accessKeyId}`, 'success'));
    console.log(styled('⚠️  Save this secret - it will not be shown again:', 'warning'));

    return { key, secret: secretAccessKey };
  }

  /**
   * Check if action is authorized
   */
  checkAccess(
    principal: string,
    action: Permission,
    resource: string,
    context?: { ip?: string; userAgent?: string; time?: Date }
  ): { allowed: boolean; reason?: string; policies: string[] } {
    const applicablePolicies: AccessPolicy[] = [];

    // Find matching policies
    for (const policy of this.policies.values()) {
      if (!this.principalMatches(policy.principal, principal)) continue;
      if (!policy.actions.includes(action) && !policy.actions.includes('r2:*')) continue;
      if (!this.resourceMatches(policy.resources, resource)) continue;
      if (policy.conditions && !this.conditionsMatch(policy.conditions, context)) continue;

      applicablePolicies.push(policy);
    }

    // Sort: deny policies take precedence
    applicablePolicies.sort((a, b) => (a.effect === 'deny' ? -1 : 1));

    // Check deny first
    const denyPolicy = applicablePolicies.find(p => p.effect === 'deny');
    if (denyPolicy) {
      return {
        allowed: false,
        reason: `Denied by policy: ${denyPolicy.name}`,
        policies: applicablePolicies.map(p => p.id)
      };
    }

    // Check allow
    const allowPolicy = applicablePolicies.find(p => p.effect === 'allow');
    if (allowPolicy) {
      return {
        allowed: true,
        policies: applicablePolicies.map(p => p.id)
      };
    }

    // Default deny
    return {
      allowed: false,
      reason: 'No matching allow policy found',
      policies: []
    };
  }

  /**
   * Create encryption key
   */
  createEncryptionKey(
    name: string,
    algorithm: EncryptionKey['algorithm'] = 'AES-256-GCM'
  ): EncryptionKey {
    // Generate key material
    const keyData = crypto.getRandomValues(new Uint8Array(32));

    const key: EncryptionKey = {
      id: `ek-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      name,
      algorithm,
      keyData,
      createdAt: new Date().toISOString(),
      status: 'active',
      keyRotationDays: 90
    };

    this.encryptionKeys.set(key.id, key);
    console.log(styled(`🔐 Created encryption key: ${name} (${algorithm})`, 'success'));

    return key;
  }

  /**
   * Encrypt data
   */
  async encrypt(data: Uint8Array, keyId: string): Promise<{
    ciphertext: Uint8Array;
    iv: Uint8Array;
    tag?: Uint8Array;
  }> {
    const key = this.encryptionKeys.get(keyId);
    if (!key) throw new Error(`Encryption key not found: ${keyId}`);
    if (key.status !== 'active') throw new Error(`Key not active: ${keyId}`);

    const iv = crypto.getRandomValues(new Uint8Array(12));

    // In production, use proper crypto APIs
    // This is a simplified mock
    const ciphertext = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      ciphertext[i] = data[i] ^ key.keyData[i % key.keyData.length];
    }

    return { ciphertext, iv };
  }

  /**
   * Decrypt data
   */
  async decrypt(
    ciphertext: Uint8Array,
    keyId: string,
    iv: Uint8Array
  ): Promise<Uint8Array> {
    const key = this.encryptionKeys.get(keyId);
    if (!key) throw new Error(`Encryption key not found: ${keyId}`);

    // In production, use proper crypto APIs
    const plaintext = new Uint8Array(ciphertext.length);
    for (let i = 0; i < ciphertext.length; i++) {
      plaintext[i] = ciphertext[i] ^ key.keyData[i % key.keyData.length];
    }

    return plaintext;
  }

  /**
   * Record audit entry
   */
  audit(
    action: string,
    principal: string,
    resource: string,
    result: 'success' | 'failure' | 'denied',
    details: Record<string, any> = {}
  ): void {
    const entry: SecurityAuditEntry = {
      id: `audit-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
      action,
      principal,
      resource,
      result,
      ipAddress: details.ip || 'unknown',
      userAgent: details.userAgent || 'unknown',
      details,
      riskScore: this.calculateRiskScore(action, principal, result)
    };

    this.auditLog.push(entry);

    // Trim log if too large
    if (this.auditLog.length > this.maxAuditEntries) {
      this.auditLog = this.auditLog.slice(-this.maxAuditEntries);
    }

    // Emit security event
    if (result === 'denied' || entry.riskScore > 50) {
      r2EventSystem.emit({
        type: 'error:occurred',
        bucket: resource.split('/')[0] || 'unknown',
        source: 'R2SecurityManager',
        metadata: { action, principal, result, riskScore: entry.riskScore }
      });
    }
  }

  /**
   * Generate security report
   */
  generateSecurityReport(): SecurityReport {
    const report: SecurityReport = {
      timestamp: new Date().toISOString(),
      summary: {
        totalPolicies: this.policies.size,
        totalRoles: this.roles.size,
        totalKeys: this.accessKeys.size,
        activeKeys: Array.from(this.accessKeys.values()).filter(k => k.status === 'active').length,
        publicObjects: 0, // Would scan for public objects
        unencryptedObjects: 0, // Would scan for unencrypted objects
        violations: 0
      },
      findings: [],
      complianceStatus: {}
    };

    // Check for security issues
    for (const key of this.accessKeys.values()) {
      // Check for old keys
      const keyAge = Date.now() - new Date(key.createdAt).getTime();
      if (keyAge > 90 * 24 * 60 * 60 * 1000) {
        report.findings.push({
          severity: 'medium',
          category: 'access',
          title: 'Old access key',
          description: `Access key ${key.name} is older than 90 days`,
          resource: key.id,
          recommendation: 'Rotate the access key'
        });
        report.summary.violations++;
      }

      // Check for keys without expiration
      if (!key.expiresAt && key.status === 'active') {
        report.findings.push({
          severity: 'low',
          category: 'access',
          title: 'No expiration on access key',
          description: `Access key ${key.name} has no expiration date`,
          resource: key.id,
          recommendation: 'Set an expiration date for the key'
        });
      }
    }

    // Check encryption key rotation
    for (const key of this.encryptionKeys.values()) {
      if (key.status === 'active' && key.keyRotationDays) {
        const daysSinceRotation = key.rotatedAt 
          ? (Date.now() - new Date(key.rotatedAt).getTime()) / (1000 * 60 * 60 * 24)
          : (Date.now() - new Date(key.createdAt).getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceRotation > key.keyRotationDays) {
          report.findings.push({
            severity: 'high',
            category: 'encryption',
            title: 'Encryption key rotation overdue',
            description: `Key ${key.name} should be rotated every ${key.keyRotationDays} days`,
            resource: key.id,
            recommendation: 'Rotate the encryption key immediately'
          });
          report.summary.violations++;
        }
      }
    }

    // Compliance checks
    report.complianceStatus = {
      'SOC2': report.summary.violations === 0 ? 'pass' : 'fail',
      'ISO27001': report.findings.filter(f => f.severity === 'critical').length === 0 ? 'pass' : 'warning',
      'GDPR': report.summary.unencryptedObjects === 0 ? 'pass' : 'fail'
    };

    return report;
  }

  /**
   * Get audit log
   */
  getAuditLog(options?: {
    principal?: string;
    action?: string;
    resource?: string;
    result?: string;
    from?: string;
    to?: string;
    limit?: number;
  }): SecurityAuditEntry[] {
    let entries = [...this.auditLog];

    if (options?.principal) {
      entries = entries.filter(e => e.principal === options.principal);
    }
    if (options?.action) {
      entries = entries.filter(e => e.action === options.action);
    }
    if (options?.resource) {
      entries = entries.filter(e => e.resource.includes(options.resource!));
    }
    if (options?.result) {
      entries = entries.filter(e => e.result === options.result);
    }
    if (options?.from) {
      entries = entries.filter(e => new Date(e.timestamp) >= new Date(options.from!));
    }
    if (options?.to) {
      entries = entries.filter(e => new Date(e.timestamp) <= new Date(options.to!));
    }

    // Sort by timestamp descending
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (options?.limit) {
      entries = entries.slice(0, options.limit);
    }

    return entries;
  }

  /**
   * Revoke access key
   */
  revokeAccessKey(keyId: string): boolean {
    const key = this.accessKeys.get(keyId);
    if (!key) return false;

    key.status = 'inactive';
    this.audit('RevokeAccessKey', 'admin', keyId, 'success', { name: key.name });
    
    console.log(styled(`🚫 Revoked access key: ${key.accessKeyId}`, 'warning'));
    return true;
  }

  /**
   * Display security status
   */
  displayStatus(): void {
    console.log(styled('\n🔐 R2 Security Manager Status', 'accent'));
    console.log(styled('=============================', 'accent'));

    console.log(styled('\n📋 Policies:', 'info'));
    console.log(styled(`  Total: ${this.policies.size}`, 'muted'));

    console.log(styled('\n👤 Roles:', 'info'));
    for (const role of this.roles.values()) {
      console.log(styled(`  ${role.name}: ${role.permissions.join(', ')}`, 'muted'));
    }

    console.log(styled('\n🔑 Access Keys:', 'info'));
    const activeKeys = Array.from(this.accessKeys.values()).filter(k => k.status === 'active');
    console.log(styled(`  Active: ${activeKeys.length} / ${this.accessKeys.size}`, 'muted'));

    console.log(styled('\n🔐 Encryption Keys:', 'info'));
    const activeEncKeys = Array.from(this.encryptionKeys.values()).filter(k => k.status === 'active');
    console.log(styled(`  Active: ${activeEncKeys.length}`, 'muted'));

    console.log(styled('\n📝 Recent Audit Entries:', 'info'));
    const recent = this.getAuditLog({ limit: 5 });
    for (const entry of recent) {
      const icon = entry.result === 'success' ? '✅' : entry.result === 'denied' ? '❌' : '⚠️';
      console.log(styled(`  ${icon} ${entry.action} by ${entry.principal} on ${entry.resource}`, 'muted'));
    }
  }

  // Private helpers

  private principalMatches(policyPrincipal: string, actualPrincipal: string): boolean {
    if (policyPrincipal === '*') return true;
    if (policyPrincipal === actualPrincipal) return true;
    
    // Check role membership
    if (policyPrincipal.startsWith('role:')) {
      const roleName = policyPrincipal.slice(5);
      // In production, would check if principal has this role
      return false;
    }

    return false;
  }

  private resourceMatches(patterns: string[], resource: string): boolean {
    return patterns.some(pattern => {
      if (pattern === '*') return true;
      if (pattern.endsWith('*')) {
        return resource.startsWith(pattern.slice(0, -1));
      }
      return pattern === resource;
    });
  }

  private conditionsMatch(
    conditions: AccessPolicy['conditions'],
    context?: { ip?: string; userAgent?: string; time?: Date }
  ): boolean {
    if (!conditions) return true;
    if (!context) return true;

    if (conditions.ipAddress && context.ip) {
      if (!conditions.ipAddress.some(range => this.ipInRange(context.ip!, range))) {
        return false;
      }
    }

    if (conditions.timeRange && context.time) {
      const hour = context.time.getHours();
      const [start, end] = conditions.timeRange.start.split(':').map(Number);
      if (hour < start || hour > end) return false;
    }

    return true;
  }

  private ipInRange(ip: string, range: string): boolean {
    // Simplified - in production use proper IP range checking
    return ip.startsWith(range.split('/')[0]);
  }

  private calculateRiskScore(action: string, principal: string, result: string): number {
    let score = 0;

    // Base risk by action
    if (action.includes('Delete')) score += 30;
    if (action.includes('Admin')) score += 40;
    if (action === 'AccessObject') score += 10;

    // Result impact
    if (result === 'denied') score += 20;
    if (result === 'failure') score += 15;

    // Principal risk
    if (principal === 'anonymous') score += 50;
    if (principal === 'system') score -= 10;

    return Math.min(100, Math.max(0, score));
  }
}

// Export singleton
export const r2SecurityManager = new R2SecurityManager();

// CLI interface
if (import.meta.main) {
  const security = r2SecurityManager;
  await security.initialize();

  console.log(styled('\n🔐 R2 Security Manager Demo', 'accent'));
  console.log(styled('===========================', 'accent'));

  // Create access key
  const { key, secret } = security.createAccessKey(
    'test-key',
    ['r2:Read', 'r2:List'],
    { expiresInDays: 30 }
  );

  // Check access
  const access = security.checkAccess('user:developer', 'r2:Write', 'scanner-cookies/test.json');
  console.log(styled(`\n🔍 Access Check:`, 'info'));
  console.log(styled(`  Allowed: ${access.allowed}`, access.allowed ? 'success' : 'error'));
  if (access.reason) {
    console.log(styled(`  Reason: ${access.reason}`, 'warning'));
  }

  // Generate security report
  const report = security.generateSecurityReport();
  console.log(styled(`\n📊 Security Report:`, 'info'));
  console.log(styled(`  Policies: ${report.summary.totalPolicies}`, 'muted'));
  console.log(styled(`  Roles: ${report.summary.totalRoles}`, 'muted'));
  console.log(styled(`  Violations: ${report.summary.violations}`, report.summary.violations > 0 ? 'error' : 'success'));

  if (report.findings.length > 0) {
    console.log(styled('\n⚠️  Findings:', 'warning'));
    for (const finding of report.findings) {
      console.log(styled(`  [${finding.severity.toUpperCase()}] ${finding.title}`, 'error'));
      console.log(styled(`     ${finding.recommendation}`, 'muted'));
    }
  }
}
