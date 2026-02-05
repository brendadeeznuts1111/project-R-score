#!/usr/bin/env bun

/**
 * Advanced Security Enhancement for DuoPlus CLI v3.0+
 * Enterprise-grade security with threat detection, encryption, and compliance
 */

import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { join } from 'path';

interface SecurityConfig {
  enableEncryption?: boolean;
  enableThreatDetection?: boolean;
  enableAuditLogging?: boolean;
  enableCompliance?: boolean;
  enableAccessControl?: boolean;
  encryptionKey?: string;
  auditLogPath?: string;
}

interface SecurityEvent {
  timestamp: Date;
  type: 'access' | 'modification' | 'threat' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  user: string;
  action: string;
  resource: string;
  details: any;
  ipAddress?: string;
}

interface ThreatDetection {
  anomalyScore: number;
  threats: string[];
  recommendations: string[];
  confidence: number;
}

interface ComplianceReport {
  overallScore: number;
  categories: {
    accessControl: number;
    dataProtection: number;
    auditTrail: number;
    encryption: number;
  };
  violations: SecurityEvent[];
  recommendations: string[];
  lastAssessment: Date;
}

export class AdvancedSecurityManager {
  private config: SecurityConfig;
  private auditLog: SecurityEvent[] = [];
  private threatModel: any;
  private complianceRules: any;
  private encryptionKey: Buffer;
  
  constructor(config: SecurityConfig = {}) {
    this.config = {
      enableEncryption: true,
      enableThreatDetection: true,
      enableAuditLogging: true,
      enableCompliance: true,
      enableAccessControl: true,
      encryptionKey: this.generateEncryptionKey(),
      auditLogPath: './logs/security-audit.json',
      ...config
    };
    
    this.encryptionKey = Buffer.from(this.config.encryptionKey!, 'hex');
    this.threatModel = this.initializeThreatModel();
    this.complianceRules = this.initializeComplianceRules();
    this.loadAuditLog();
  }
  
  /**
   * Initialize security system
   */
  async initialize(): Promise<void> {
    console.log('🔒 Initializing Advanced Security System...');
    
    // Setup encryption
    if (this.config.enableEncryption) {
      await this.setupEncryption();
    }
    
    // Initialize threat detection
    if (this.config.enableThreatDetection) {
      await this.initializeThreatDetection();
    }
    
    // Setup compliance monitoring
    if (this.config.enableCompliance) {
      await this.setupComplianceMonitoring();
    }
    
    // Initialize access control
    if (this.config.enableAccessControl) {
      await this.initializeAccessControl();
    }
    
    console.log('✅ Security system initialized');
  }
  
  /**
   * Encrypt sensitive data
   */
  encrypt(data: string): string {
    if (!this.config.enableEncryption) {
      return data;
    }
    
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }
  
  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string): string {
    if (!this.config.enableEncryption) {
      return encryptedData;
    }
    
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  /**
   * Log security event
   */
  async logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): Promise<void> {
    if (!this.config.enableAuditLogging) {
      return;
    }
    
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date(),
    };
    
    this.auditLog.push(securityEvent);
    
    // Save to file
    this.saveAuditLog();
    
    // Check for threats
    if (this.config.enableThreatDetection) {
      await this.analyzeForThreats(securityEvent);
    }
    
    // Check compliance
    if (this.config.enableCompliance) {
      await this.checkCompliance(securityEvent);
    }
    
    console.log(`🔒 Security event logged: ${event.type} - ${event.action}`);
  }
  
  /**
   * Detect threats and anomalies
   */
  async detectThreats(context: any): Promise<ThreatDetection> {
    if (!this.config.enableThreatDetection) {
      return {
        anomalyScore: 0,
        threats: [],
        recommendations: [],
        confidence: 0,
      };
    }
    
    const threats: string[] = [];
    const recommendations: string[] = [];
    let anomalyScore = 0;
    
    // Analyze access patterns
    const accessAnomalies = this.analyzeAccessPatterns(context);
    anomalyScore += accessAnomalies.score;
    threats.push(...accessAnomalies.threats);
    recommendations.push(...accessAnomalies.recommendations);
    
    // Analyze command patterns
    const commandAnomalies = this.analyzeCommandPatterns(context);
    anomalyScore += commandAnomalies.score;
    threats.push(...commandAnomalies.threats);
    recommendations.push(...commandAnomalies.recommendations);
    
    // Analyze time patterns
    const timeAnomalies = this.analyzeTimePatterns(context);
    anomalyScore += timeAnomalies.score;
    threats.push(...timeAnomalies.threats);
    recommendations.push(...timeAnomalies.recommendations);
    
    // Calculate confidence
    const confidence = Math.min(1.0, anomalyScore / 3);
    
    return {
      anomalyScore,
      threats,
      recommendations,
      confidence,
    };
  }
  
  /**
   * Generate compliance report
   */
  async generateComplianceReport(): Promise<ComplianceReport> {
    if (!this.config.enableCompliance) {
      return {
        overallScore: 0,
        categories: {
          accessControl: 0,
          dataProtection: 0,
          auditTrail: 0,
          encryption: 0,
        },
        violations: [],
        recommendations: [],
        lastAssessment: new Date(),
      };
    }
    
    const violations = this.auditLog.filter(event => 
      event.type === 'compliance' || event.severity === 'high' || event.severity === 'critical'
    );
    
    const categories = {
      accessControl: this.calculateAccessControlScore(),
      dataProtection: this.calculateDataProtectionScore(),
      auditTrail: this.calculateAuditTrailScore(),
      encryption: this.calculateEncryptionScore(),
    };
    
    const overallScore = Object.values(categories).reduce((sum, score) => sum + score, 0) / 4;
    
    const recommendations = this.generateComplianceRecommendations(categories, violations);
    
    return {
      overallScore,
      categories,
      violations,
      recommendations,
      lastAssessment: new Date(),
    };
  }
  
  /**
   * Validate user access
   */
  async validateAccess(user: string, resource: string, action: string): Promise<boolean> {
    if (!this.config.enableAccessControl) {
      return true;
    }
    
    // Check user permissions
    const hasPermission = await this.checkUserPermissions(user, resource, action);
    
    // Log access attempt
    await this.logSecurityEvent({
      type: 'access',
      severity: hasPermission ? 'low' : 'medium',
      user,
      action,
      resource,
      details: { granted: hasPermission },
    });
    
    return hasPermission;
  }
  
  /**
   * Setup encryption
   */
  private async setupEncryption(): Promise<void> {
    console.log('   🔐 Setting up encryption...');
    
    // Test encryption/decryption
    const testData = 'test encryption';
    const encrypted = this.encrypt(testData);
    const decrypted = this.decrypt(encrypted);
    
    if (decrypted !== testData) {
      throw new Error('Encryption setup failed');
    }
    
    console.log('   ✅ Encryption setup complete');
  }
  
  /**
   * Initialize threat detection
   */
  private async initializeThreatDetection(): Promise<void> {
    console.log('   🛡️ Initializing threat detection...');
    
    // Load threat patterns
    this.threatModel.patterns = {
      suspiciousCommands: ['rm -rf', 'sudo rm', 'chmod 777', 'wget http'],
      unusualTimes: { start: 22, end: 6 }, // 10 PM to 6 AM
      highFrequencyRequests: 100, // per minute
      unusualFileAccess: ['/etc/passwd', '/etc/shadow', '/root/'],
    };
    
    console.log('   ✅ Threat detection initialized');
  }
  
  /**
   * Setup compliance monitoring
   */
  private async setupComplianceMonitoring(): Promise<void> {
    console.log('   📋 Setting up compliance monitoring...');
    
    this.complianceRules = {
      requireAuthentication: true,
      requireAuditLog: true,
      requireEncryption: true,
      sessionTimeout: 3600, // 1 hour
      passwordComplexity: true,
      accessControl: true,
    };
    
    console.log('   ✅ Compliance monitoring setup');
  }
  
  /**
   * Initialize access control
   */
  private async initializeAccessControl(): Promise<void> {
    console.log('   🔑 Initializing access control...');
    
    // Load user permissions
    this.loadUserPermissions();
    
    console.log('   ✅ Access control initialized');
  }
  
  /**
   * Analyze access patterns for threats
   */
  private analyzeAccessPatterns(context: any): { score: number; threats: string[]; recommendations: string[] } {
    const threats: string[] = [];
    const recommendations: string[] = [];
    let score = 0;
    
    // Check for unusual access times
    const hour = new Date().getHours();
    if (hour >= this.threatModel.patterns.unusualTimes.start || 
        hour <= this.threatModel.patterns.unusualTimes.end) {
      threats.push('Unusual access time detected');
      recommendations.push('Review access logs for suspicious activity');
      score += 0.5;
    }
    
    // Check for high frequency access
    const recentAccess = this.auditLog.filter(event => 
      event.type === 'access' && 
      (Date.now() - event.timestamp.getTime()) < 60000 // Last minute
    );
    
    if (recentAccess.length > this.threatModel.patterns.highFrequencyRequests) {
      threats.push('High frequency access detected');
      recommendations.push('Implement rate limiting');
      score += 0.8;
    }
    
    return { score, threats, recommendations };
  }
  
  /**
   * Analyze command patterns for threats
   */
  private analyzeCommandPatterns(context: any): { score: number; threats: string[]; recommendations: string[] } {
    const threats: string[] = [];
    const recommendations: string[] = [];
    let score = 0;
    
    if (context.command) {
      const command = context.command.toLowerCase();
      
      for (const suspicious of this.threatModel.patterns.suspiciousCommands) {
        if (command.includes(suspicious)) {
          threats.push(`Suspicious command detected: ${suspicious}`);
          recommendations.push('Review command execution logs');
          score += 1.0;
        }
      }
    }
    
    return { score, threats, recommendations };
  }
  
  /**
   * Analyze time patterns for threats
   */
  private analyzeTimePatterns(context: any): { score: number; threats: string[]; recommendations: string[] } {
    const threats: string[] = [];
    const recommendations: string[] = [];
    let score = 0;
    
    // Check for prolonged sessions
    if (context.sessionDuration && context.sessionDuration > this.complianceRules.sessionTimeout) {
      threats.push('Prolonged session detected');
      recommendations.push('Implement automatic session timeout');
      score += 0.3;
    }
    
    return { score, threats, recommendations };
  }
  
  /**
   * Analyze security event for threats
   */
  private async analyzeForThreats(event: SecurityEvent): Promise<void> {
    const threatDetection = await this.detectThreats({
      user: event.user,
      action: event.action,
      resource: event.resource,
      timestamp: event.timestamp,
    });
    
    if (threatDetection.anomalyScore > 0.5) {
      await this.logSecurityEvent({
        type: 'threat',
        severity: threatDetection.confidence > 0.8 ? 'high' : 'medium',
        user: 'system',
        action: 'threat_detected',
        resource: 'security_monitor',
        details: {
          originalEvent: event,
          threatDetection,
        },
      });
    }
  }
  
  /**
   * Check compliance for event
   */
  private async checkCompliance(event: SecurityEvent): Promise<void> {
    const violations: string[] = [];
    
    // Check authentication requirement
    if (this.complianceRules.requireAuthentication && !event.user) {
      violations.push('Unauthenticated access detected');
    }
    
    // Check audit log requirement
    if (this.complianceRules.requireAuditLog && !this.config.enableAuditLogging) {
      violations.push('Audit logging not enabled');
    }
    
    // Check encryption requirement
    if (this.complianceRules.requireEncryption && !this.config.enableEncryption) {
      violations.push('Encryption not enabled');
    }
    
    if (violations.length > 0) {
      await this.logSecurityEvent({
        type: 'compliance',
        severity: 'medium',
        user: event.user,
        action: 'compliance_violation',
        resource: event.resource,
        details: { violations },
      });
    }
  }
  
  /**
   * Calculate access control score
   */
  private calculateAccessControlScore(): number {
    if (!this.config.enableAccessControl) return 0;
    
    let score = 0.5; // Base score
    
    // Check for recent access violations
    const violations = this.auditLog.filter(event => 
      event.type === 'access' && event.severity === 'high'
    );
    
    if (violations.length === 0) {
      score += 0.5;
    } else {
      score -= Math.min(0.5, violations.length * 0.1);
    }
    
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * Calculate data protection score
   */
  private calculateDataProtectionScore(): number {
    let score = 0.5;
    
    if (this.config.enableEncryption) {
      score += 0.3;
    }
    
    if (this.config.enableAuditLogging) {
      score += 0.2;
    }
    
    return Math.min(1, score);
  }
  
  /**
   * Calculate audit trail score
   */
  private calculateAuditTrailScore(): number {
    if (!this.config.enableAuditLogging) return 0;
    
    let score = 0.5;
    
    // Check audit log completeness
    const recentEvents = this.auditLog.filter(event => 
      (Date.now() - event.timestamp.getTime()) < 24 * 60 * 60 * 1000 // Last 24 hours
    );
    
    if (recentEvents.length > 0) {
      score += 0.5;
    }
    
    return Math.min(1, score);
  }
  
  /**
   * Calculate encryption score
   */
  private calculateEncryptionScore(): number {
    if (!this.config.enableEncryption) return 0;
    
    return 1.0; // If encryption is enabled, full score
  }
  
  /**
   * Generate compliance recommendations
   */
  private generateComplianceRecommendations(categories: any, violations: SecurityEvent[]): string[] {
    const recommendations: string[] = [];
    
    if (categories.accessControl < 0.8) {
      recommendations.push('Strengthen access control policies');
    }
    
    if (categories.dataProtection < 0.8) {
      recommendations.push('Enhance data protection measures');
    }
    
    if (categories.auditTrail < 0.8) {
      recommendations.push('Improve audit trail completeness');
    }
    
    if (categories.encryption < 0.8) {
      recommendations.push('Enable encryption for sensitive data');
    }
    
    if (violations.length > 5) {
      recommendations.push('Address recurring compliance violations');
    }
    
    return recommendations;
  }
  
  /**
   * Check user permissions
   */
  private async checkUserPermissions(user: string, resource: string, action: string): Promise<boolean> {
    // Simplified permission check - in real implementation, this would check against a database
    const permissions = this.loadUserPermissions();
    
    const userPerms = permissions[user] || [];
    return userPerms.includes(`${resource}:${action}`) || userPerms.includes('*:*');
  }
  
  /**
   * Load user permissions
   */
  private loadUserPermissions(): any {
    try {
      const permsPath = join(process.cwd(), '.duoplus', 'permissions.json');
      return JSON.parse(readFileSync(permsPath, 'utf-8'));
    } catch {
      return {
        'admin': ['*:*'],
        'developer': ['src:*:read', 'src:*:write', 'config:*:read'],
        'user': ['src:*:read'],
      };
    }
  }
  
  /**
   * Load audit log
   */
  private loadAuditLog(): void {
    try {
      if (existsSync(this.config.auditLogPath!)) {
        const data = readFileSync(this.config.auditLogPath!, 'utf-8');
        this.auditLog = JSON.parse(data);
      }
    } catch (error) {
      this.auditLog = [];
    }
  }
  
  /**
   * Save audit log
   */
  private saveAuditLog(): void {
    try {
      const logData = JSON.stringify(this.auditLog, null, 2);
      writeFileSync(this.config.auditLogPath!, logData);
    } catch (error) {
      console.error('Failed to save audit log:', error);
    }
  }
  
  /**
   * Initialize threat model
   */
  private initializeThreatModel(): any {
    return {
      patterns: {},
      thresholds: {
        anomalyScore: 0.7,
        threatConfidence: 0.8,
      },
    };
  }
  
  /**
   * Initialize compliance rules
   */
  private initializeComplianceRules(): any {
    return {};
  }
  
  /**
   * Generate encryption key
   */
  private generateEncryptionKey(): string {
    return randomBytes(32).toString('hex');
  }
  
  /**
   * Get security metrics
   */
  getSecurityMetrics(): any {
    const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
    const recentEvents = this.auditLog.filter(event => 
      event.timestamp.getTime() > last24Hours
    );
    
    const eventsByType = recentEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const eventsBySeverity = recentEvents.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalEvents: recentEvents.length,
      eventsByType,
      eventsBySeverity,
      encryptionEnabled: this.config.enableEncryption,
      threatDetectionEnabled: this.config.enableThreatDetection,
      auditLoggingEnabled: this.config.enableAuditLogging,
      complianceEnabled: this.config.enableCompliance,
      accessControlEnabled: this.config.enableAccessControl,
    };
  }
}

// Demonstration
async function demonstrateAdvancedSecurity() {
  console.log('🔒 Advanced Security Enhancement Demo');
  console.log('='.repeat(60));
  
  const securityManager = new AdvancedSecurityManager({
    enableEncryption: true,
    enableThreatDetection: true,
    enableAuditLogging: true,
    enableCompliance: true,
    enableAccessControl: true,
  });
  
  await securityManager.initialize();
  
  // Demonstrate encryption
  console.log('\n🔐 Encryption Demo:');
  const sensitiveData = 'user:admin,password:secret123';
  const encrypted = securityManager.encrypt(sensitiveData);
  const decrypted = securityManager.decrypt(encrypted);
  
  console.log(`   Original: ${sensitiveData}`);
  console.log(`   Encrypted: ${encrypted.substring(0, 50)}...`);
  console.log(`   Decrypted: ${decrypted}`);
  
  // Demonstrate access control
  console.log('\n🔑 Access Control Demo:');
  const adminAccess = await securityManager.validateAccess('admin', 'src/api', 'write');
  const userAccess = await securityManager.validateAccess('user', 'src/api', 'write');
  
  console.log(`   Admin access to src/api:write: ${adminAccess ? '✅ Granted' : '❌ Denied'}`);
  console.log(`   User access to src/api:write: ${userAccess ? '✅ Granted' : '❌ Denied'}`);
  
  // Demonstrate threat detection
  console.log('\n🛡️ Threat Detection Demo:');
  const threatContext = {
    user: 'unknown',
    command: 'sudo rm -rf /',
    timestamp: new Date(),
    sessionDuration: 7200, // 2 hours
  };
  
  const threats = await securityManager.detectThreats(threatContext);
  console.log(`   Anomaly score: ${threats.anomalyScore.toFixed(2)}`);
  console.log(`   Threats detected: ${threats.threats.join(', ')}`);
  console.log(`   Recommendations: ${threats.recommendations.join(', ')}`);
  
  // Generate compliance report
  console.log('\n📋 Compliance Report:');
  const complianceReport = await securityManager.generateComplianceReport();
  console.log(`   Overall score: ${(complianceReport.overallScore * 100).toFixed(1)}%`);
  console.log(`   Access Control: ${(complianceReport.categories.accessControl * 100).toFixed(1)}%`);
  console.log(`   Data Protection: ${(complianceReport.categories.dataProtection * 100).toFixed(1)}%`);
  console.log(`   Audit Trail: ${(complianceReport.categories.auditTrail * 100).toFixed(1)}%`);
  console.log(`   Encryption: ${(complianceReport.categories.encryption * 100).toFixed(1)}%`);
  
  // Show security metrics
  console.log('\n📊 Security Metrics:');
  const metrics = securityManager.getSecurityMetrics();
  console.log(`   Total events (24h): ${metrics.totalEvents}`);
  console.log(`   Events by type: ${Object.entries(metrics.eventsByType).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
  console.log(`   Events by severity: ${Object.entries(metrics.eventsBySeverity).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
  
  console.log('\n🎉 Advanced Security Demo Complete!');
}

if (import.meta.main) {
  demonstrateAdvancedSecurity().catch(console.error);
}

export { AdvancedSecurityManager, SecurityConfig, SecurityEvent, ThreatDetection, ComplianceReport };
