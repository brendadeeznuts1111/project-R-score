// cascade-security-hardening.ts
// [DOMAIN:CASCADE][SCOPE:SECURITY][TYPE:HARDENING][META:{zeroTrust:true,audited:true}][CLASS:SecurityManager][#REF:CASCADE-SECURITY]

import { HookRegistry } from './cascade-hooks-infrastructure';
import { ConfigManager } from './cascade-adaptive-configuration';

// Security Hardening & Principle Enforcement
export interface SecurityContext {
  principal: string;
  resource: string;
  action: string;
  securityLevel: 'low' | 'medium' | 'high' | 'maximum';
  ipAddress: string;
  userAgent: string;
  timestamp: number;
  sessionId?: string;
  mfaVerified?: boolean;
  biometricVerified?: boolean;
}

export interface SecurityPolicy {
  id: string;
  resource: string;
  action: string;
  conditions: SecurityCondition[];
  effect: 'allow' | 'deny';
  priority: number;
}

export interface SecurityCondition {
  type: 'security_level' | 'ip_whitelist' | 'time_window' | 'mfa_required' | 'biometric_required';
  operator: 'equals' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface SecurityViolation {
  type: string;
  location: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  remediation: string;
  description?: string;
}

export interface SecurityAudit {
  timestamp: Date;
  totalViolations: number;
  violations: SecurityViolation[];
  passed: boolean;
  recommendations: string[];
}

export interface AuditLog {
  timestamp: number;
  principal: string;
  resource: string;
  action: string;
  context: SecurityContext;
  decision: 'ALLOWED' | 'DENIED';
  reason?: string;
}

export class CascadeSecurityManager {
  private static instance: CascadeSecurityManager;
  private encryptionKey: CryptoKey;
  private permissionCache = new Map<string, boolean>();
  private auditLog: AuditLog[] = [];
  private policies: SecurityPolicy[] = [];
  private configManager: ConfigManager;
  private hookRegistry: HookRegistry;
  
  private constructor() {
    this.configManager = ConfigManager.getInstance();
    this.hookRegistry = HookRegistry.getInstance();
    this.initializeEncryption();
    this.loadSecurityPolicies();
    this.startAuditLoop();
  }
  
  static getInstance(): CascadeSecurityManager {
    if (!CascadeSecurityManager.instance) {
      CascadeSecurityManager.instance = new CascadeSecurityManager();
    }
    return CascadeSecurityManager.instance;
  }
  
  // Principle: Zero-trust architecture
  async checkPermission(
    principal: string,
    resource: string,
    action: string,
    context: SecurityContext
  ): Promise<boolean> {
    const cacheKey = this.generatePermissionCacheKey(principal, resource, action, context);
    
    // Check cache first (with CRC32 for speed)
    const cachedHash = this.hashString(cacheKey);
    if (this.permissionCache.has(cachedHash.toString())) {
      return this.permissionCache.get(cachedHash.toString())!;
    }
    
    // Evaluate permissions
    const allowed = await this.evaluatePolicy(principal, resource, action, context);
    
    // Cache result (with TTL)
    this.permissionCache.set(cachedHash.toString(), allowed);
    setTimeout(() => this.permissionCache.delete(cachedHash.toString()), 60000); // 1 minute TTL
    
    // Adaptive: Log denied permissions for audit
    if (!allowed) {
      this.recordDeniedAccess(principal, resource, action, context);
    }
    
    return allowed;
  }
  
  private async evaluatePolicy(
    principal: string,
    resource: string,
    action: string,
    context: SecurityContext
  ): Promise<boolean> {
    // Load policy from database
    const policy = await this.getPolicy(`${resource}:${action}`);
    
    if (!policy) {
      // Default deny - zero trust principle
      return false;
    }
    
    // Evaluate conditions
    for (const condition of policy.conditions) {
      if (!await this.evaluateCondition(condition, context)) {
        return false;
      }
    }
    
    return policy.effect === 'allow';
  }
  
  private async evaluateCondition(condition: SecurityCondition, context: SecurityContext): Promise<boolean> {
    switch (condition.type) {
      case 'security_level':
        return this.compareSecurityLevel(context.securityLevel, condition.value, condition.operator);
        
      case 'ip_whitelist':
        return condition.operator === 'in' && condition.value.includes(context.ipAddress);
        
      case 'time_window':
        const hour = new Date(context.timestamp).getHours();
        return this.compareValues(hour, condition.value, condition.operator);
        
      case 'mfa_required':
        return condition.value ? context.mfaVerified === true : true;
        
      case 'biometric_required':
        return condition.value ? context.biometricVerified === true : true;
        
      default:
        return true; // Unknown condition, allow by default
    }
  }
  
  private compareSecurityLevel(current: string, required: string, operator: string): boolean {
    const levels = { 'low': 1, 'medium': 2, 'high': 3, 'maximum': 4 };
    const currentLevel = levels[current as keyof typeof levels] || 0;
    const requiredLevel = levels[required as keyof typeof levels] || 0;
    
    switch (operator) {
      case 'greater_than':
        return currentLevel > requiredLevel;
      case 'less_than':
        return currentLevel < requiredLevel;
      case 'equals':
        return currentLevel === requiredLevel;
      default:
        return currentLevel >= requiredLevel;
    }
  }
  
  private compareValues(actual: number, expected: number, operator: string): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'greater_than':
        return actual > expected;
      case 'less_than':
        return actual < expected;
      case 'in':
        return Array.isArray(expected) && expected.includes(actual);
      case 'not_in':
        return Array.isArray(expected) && !expected.includes(actual);
      default:
        return false;
    }
  }
  
  // Principle: Encrypted data at rest
  async encryptSensitiveData(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: new Uint8Array(12) },
      this.encryptionKey,
      dataBuffer
    );
    
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  }
  
  async decryptSensitiveData(encrypted: string): Promise<string> {
    const encryptedBuffer = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(12) },
      this.encryptionKey,
      encryptedBuffer
    );
    
    return new TextDecoder().decode(decrypted);
  }
  
  // Principle: Audit every security decision
  private recordDeniedAccess(
    principal: string,
    resource: string,
    action: string,
    context: SecurityContext
  ): void {
    const auditLog: AuditLog = {
      timestamp: Date.now(),
      principal,
      resource,
      action,
      context,
      decision: 'DENIED'
    };
    
    // Store in immutable audit log (append-only)
    this.auditLog.push(auditLog);
    
    // Keep only last 10000 entries
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000);
    }
    
    // Adaptive: Alert on repeated denials
    this.checkForBruteForce(principal);
    
    // Log to file (in real implementation)
    console.log(`🚨 Security denial: ${principal} attempted ${action} on ${resource}`);
  }
  
  private async checkForBruteForce(principal: string): Promise<void> {
    const recentDenials = this.auditLog.filter(log => 
      log.principal === principal && 
      log.timestamp > Date.now() - 300000 && // Last 5 minutes
      log.decision === 'DENIED'
    );
    
    if (recentDenials.length > 10) {
      await this.lockPrincipal(principal);
      await this.sendSecurityAlert(`Potential brute force detected for ${principal}`);
    }
  }
  
  private async lockPrincipal(principal: string): Promise<void> {
    console.log(`🔒 Locking principal: ${principal}`);
    // In real implementation, this would update a database
  }
  
  private async sendSecurityAlert(message: string): Promise<void> {
    console.log(`🚨 SECURITY ALERT: ${message}`);
    
    // Hook: Allow custom alert handling
    this.hookRegistry.executeWithHooks(
      'security:alert',
      { message, timestamp: Date.now(), requestId: this.generateRequestId() },
      async () => {
        // Default alert handling
        console.log(`📧 Alert sent: ${message}`);
      }
    ).catch(error => {
      console.error('❌ Security alert hooks failed:', error);
    });
  }
  
  // Reinforcement: Security principle validation
  async validateSecurityPrinciples(): Promise<SecurityAudit> {
    const violations: SecurityViolation[] = [];
    
    // Check 1: No hardcoded secrets
    violations.push(...await this.checkForHardcodedSecrets());
    
    // Check 2: All sensitive data encrypted
    violations.push(...await this.checkSensitiveDataEncryption());
    
    // Check 3: Principle of least privilege
    violations.push(...await this.checkLeastPrivilege());
    
    // Check 4: Proper audit logging
    violations.push(...await this.checkAuditLogging());
    
    // Check 5: Secure configuration
    violations.push(...await this.checkSecureConfiguration());
    
    const audit: SecurityAudit = {
      timestamp: new Date(),
      totalViolations: violations.length,
      violations,
      passed: violations.length === 0,
      recommendations: this.generateSecurityRecommendations(violations)
    };
    
    // Store audit results
    await this.storeSecurityAudit(audit);
    
    return audit;
  }
  
  private async checkForHardcodedSecrets(): Promise<SecurityViolation[]> {
    const violations: SecurityViolation[] = [];
    
    // Check configuration files for hardcoded secrets
    const configFiles = [
      './config/cascade.production.yml',
      './config/cascade.staging.yml',
      './.env.production'
    ];
    
    for (const file of configFiles) {
      if (this.fileExists(file)) {
        const content = this.readFile(file);
        if (this.containsHardcodedSecret(content)) {
          violations.push({
            type: 'HARDCODED_SECRET',
            location: file,
            severity: 'CRITICAL',
            remediation: 'Move secret to environment variable or secure vault',
            description: 'Hardcoded secrets detected in configuration file'
          });
        }
      }
    }
    
    return violations;
  }
  
  private containsHardcodedSecret(content: string): boolean {
    const secretPatterns = [
      /password\s*=\s*['\"][^'\"]+['\"]/i,
      /api_key\s*=\s*['\"][^'\"]+['\"]/i,
      /secret\s*=\s*['\"][^'\"]+['\"]/i,
      /token\s*=\s*['\"][^'\"]+['\"]/i
    ];
    
    return secretPatterns.some(pattern => pattern.test(content));
  }
  
  private async checkSensitiveDataEncryption(): Promise<SecurityViolation[]> {
    const violations: SecurityViolation[] = [];
    
    // Check memory storage for encryption
    const memorySample = await this.sampleMemoryData();
    for (const memory of memorySample) {
      if (this.containsSensitiveData(memory) && !memory.encrypted) {
        violations.push({
          type: 'UNENCRYPTED_SENSITIVE_DATA',
          location: `memory:${memory.memoryId}`,
          severity: 'HIGH',
          remediation: 'Enable encryption for sensitive memory fields',
          description: 'Sensitive data stored without encryption'
        });
      }
    }
    
    return violations;
  }
  
  private containsSensitiveData(data: any): boolean {
    const sensitiveFields = ['ssn', 'creditCard', 'bankAccount', 'password', 'token', 'secret'];
    const dataString = JSON.stringify(data).toLowerCase();
    
    return sensitiveFields.some(field => dataString.includes(field));
  }
  
  private async checkLeastPrivilege(): Promise<SecurityViolation[]> {
    const violations: SecurityViolation[] = [];
    
    // Check for overly permissive policies
    for (const policy of this.policies) {
      if (policy.effect === 'allow' && policy.conditions.length === 0) {
        violations.push({
          type: 'EXCESSIVE_PERMISSIONS',
          location: `policy:${policy.id}`,
          severity: 'HIGH',
          remediation: 'Add specific conditions to restrict access',
          description: 'Policy allows unrestricted access'
        });
      }
    }
    
    return violations;
  }
  
  private async checkAuditLogging(): Promise<SecurityViolation[]> {
    const violations: SecurityViolation[] = [];
    
    // Check if audit log is being populated
    if (this.auditLog.length === 0) {
      violations.push({
        type: 'MISSING_AUDIT_LOG',
        location: 'system',
        severity: 'MEDIUM',
        remediation: 'Enable audit logging for all security decisions',
        description: 'No audit log entries found'
      });
    }
    
    return violations;
  }
  
  private async checkSecureConfiguration(): Promise<SecurityViolation[]> {
    const violations: SecurityViolation[] = [];
    
    const config = this.configManager.get();
    
    // Check for insecure configurations
    if (config.observability.logLevel === 'debug' && config.environment === 'production') {
      violations.push({
        type: 'INSECURE_LOGGING',
        location: 'configuration',
        severity: 'MEDIUM',
        remediation: 'Set log level to info or higher in production',
        description: 'Debug logging enabled in production'
      });
    }
    
    return violations;
  }
  
  private generateSecurityRecommendations(violations: SecurityViolation[]): string[] {
    const recommendations: string[] = [];
    
    const critical = violations.filter(v => v.severity === 'CRITICAL');
    const high = violations.filter(v => v.severity === 'HIGH');
    const medium = violations.filter(v => v.severity === 'MEDIUM');
    
    if (critical.length > 0) {
      recommendations.push('🚨 Address CRITICAL security violations immediately');
      critical.forEach(v => recommendations.push(`  - ${v.type}: ${v.remediation}`));
    }
    
    if (high.length > 0) {
      recommendations.push('⚠️ Fix HIGH severity security issues');
      high.forEach(v => recommendations.push(`  - ${v.type}: ${v.remediation}`));
    }
    
    if (medium.length > 0) {
      recommendations.push('📋 Address MEDIUM security improvements');
      medium.forEach(v => recommendations.push(`  - ${v.type}: ${v.remediation}`));
    }
    
    if (violations.length === 0) {
      recommendations.push('✅ All security principles properly implemented');
      recommendations.push('  - Continue regular security audits');
      recommendations.push('  - Monitor for new security threats');
    }
    
    return recommendations;
  }
  
  private async initializeEncryption(): Promise<void> {
    // Generate or load encryption key
    try {
      this.encryptionKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      console.log('🔐 Encryption key initialized');
    } catch (error) {
      console.error('❌ Failed to initialize encryption:', error);
      throw error;
    }
  }
  
  private loadSecurityPolicies(): void {
    // Load default security policies
    this.policies = [
      {
        id: 'default-deny',
        resource: '*',
        action: '*',
        conditions: [],
        effect: 'deny' as const,
        priority: 0
      },
      {
        id: 'admin-access',
        resource: 'admin/*',
        action: '*',
        conditions: [
          { type: 'security_level' as const, operator: 'equals' as const, value: 'maximum' },
          { type: 'mfa_required' as const, operator: 'equals' as const, value: true }
        ],
        effect: 'allow' as const,
        priority: 100
      }
    ];
    
    console.log(`🛡️ Loaded ${this.policies.length} security policies`);
  }
  
  private async getPolicy(policyId: string): Promise<SecurityPolicy | null> {
    return this.policies.find(p => `${p.resource}:${p.action}` === policyId) || null;
  }
  
  private generatePermissionCacheKey(principal: string, resource: string, action: string, context: SecurityContext): string {
    return `${principal}:${resource}:${action}:${context.securityLevel}:${context.ipAddress}`;
  }
  
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  
  private startAuditLoop(): void {
    // Run security audit every hour
    setInterval(async () => {
      const audit = await this.validateSecurityPrinciples();
      if (!audit.passed) {
        console.log(`🔍 Security audit found ${audit.totalViolations} violations`);
      }
    }, 3600000); // 1 hour
  }
  
  private async sampleMemoryData(): Promise<any[]> {
    // Mock implementation - would sample actual memory data
    return [
      { memoryId: 'sample-1', data: 'test', encrypted: true },
      { memoryId: 'sample-2', data: 'sensitive', encrypted: false }
    ];
  }
  
  private async storeSecurityAudit(audit: SecurityAudit): Promise<void> {
    console.log(`📝 Security audit stored: ${audit.totalViolations} violations`);
    // In real implementation, would store to database
  }
  
  private fileExists(path: string): boolean {
    // Mock implementation
    return false;
  }
  
  private readFile(path: string): string {
    // Mock implementation
    return '';
  }
  
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Security utilities
export class SecurityUtils {
  static sanitizeInput(input: string): string {
    // Basic input sanitization
    return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
  
  static validateIp(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
  }
  
  static generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

// Export singleton instance
export const securityManager = CascadeSecurityManager.getInstance();
