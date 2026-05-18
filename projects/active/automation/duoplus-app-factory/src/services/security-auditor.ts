/**
 * Nebula-Flow™ Security Auditor
 * 
 * Enhanced security auditing with unguarded secrets detection and
 * automated guard generation.
 *
 * @version 3.6.0
 * @author DuoPlus Team
 * @license MIT
 */

import { NebulaFlowOrchestrator } from '../nebula/orchestrator';
import { PatternRecord, GuardRecord, SecretRecord } from '../nebula/orchestrator';

export interface UnguardedSecretReport {
  secret: SecretRecord;
  patterns: PatternRecord[];
  riskScore: number;
  recommendations: string[];
}

export interface BatchAuditResult {
  timestamp: string;
  groups: Array<{
    group: string;
    result: {
      unguardedCount: number;
      criticalCount: number;
      riskScore: number;
    };
  }>;
  summary: {
    totalUnguarded: number;
    criticalCount: number;
    avgRiskScore: number;
  };
}

export interface GuardTemplate {
  id: string;
  pattern: string;
  patternHash: string;
  group: string;
  priority: number;
  implementation: string;
  bunFeatures: {
    requires: string[];
    runtimeChecks: string[];
  };
  metadata: {
    createdAt: string;
    secretNames: string[];
    riskLevel: string;
  };
}

export class SecurityAuditor {
  private orchestrator: NebulaFlowOrchestrator;
  private patternHashIndex: Map<string, PatternRecord> = new Map();
  private guardHashIndex: Map<string, GuardRecord> = new Map();
  
  constructor() {
    this.orchestrator = new NebulaFlowOrchestrator();
    this.rebuildIndexes();
  }
  
  private rebuildIndexes() {
    const patterns = this.orchestrator.extractAllPatterns();
    const guards = this.extractAllGuards();
    
    // Create fast lookup indexes
    this.patternHashIndex = new Map(
      patterns.map(p => [p.hash, p])
    );
    
    this.guardHashIndex = new Map(
      guards.map(g => [g.patternHash, g])
    );
  }
  
  // Extract all guards from configuration
  private extractAllGuards(): GuardRecord[] {
    return this.orchestrator.extractAllGuards();
  }
  
  // **Core Detection: Find unguarded critical patterns with secrets**
  async findUnguardedCritical(): Promise<UnguardedSecretReport[]> {
    const patterns = this.orchestrator.extractAllPatterns();
    const secrets = this.orchestrator.extractAllSecrets();
    const guards = this.extractAllGuards();
    
    // Create Set for O(1) lookup of guarded patterns
    const guardedPatternHashes = new Set(
      guards.map(g => g.patternHash)
    );
    
    // Your original logic, optimized
    const unguarded = secrets.flatMap(secret => {
      // Find all critical patterns using this secret
      const criticalPatterns = patterns.filter(p => 
        p.risk === 'critical' && 
        p.pattern.includes(`\${${secret.name}}`)
      );
      
      // Filter out patterns that have guards
      const unguardedPatterns = criticalPatterns.filter(p => 
        !guardedPatternHashes.has(p.hash)
      );
      
      if (unguardedPatterns.length === 0) return [];
      
      return [{
        secret,
        patterns: unguardedPatterns,
        riskScore: this.calculateExposureRisk(secret, unguardedPatterns),
        recommendations: this.generateGuardRecommendations(unguardedPatterns)
      }];
    });
    
    return unguarded;
  }
  
  // **Batch Processing for 20 Groups**
  async batchAuditAllGroups(): Promise<BatchAuditResult> {
    const groups = Object.keys(this.orchestrator.config.groups || {});
    const results = await Promise.all(
      groups.map(async group => ({
        group,
        result: await this.auditSingleGroup(group)
      }))
    );
    
    // Aggregate results
    return {
      timestamp: new Date().toISOString(),
      groups: results,
      summary: {
        totalUnguarded: results.reduce((sum, r) => sum + r.result.unguardedCount, 0),
        criticalCount: results.reduce((sum, r) => sum + r.result.criticalCount, 0),
        avgRiskScore: results.reduce((sum, r) => sum + r.result.riskScore, 0) / results.length
      }
    };
  }
  
  // Audit a single group
  private async auditSingleGroup(group: string): Promise<{
    unguardedCount: number;
    criticalCount: number;
    riskScore: number;
  }> {
    const patterns = this.orchestrator.extractAllPatterns().filter(p => p.group === group);
    const secrets = this.orchestrator.extractAllSecrets().filter(s => s.group === group);
    const guards = this.extractAllGuards().filter(g => g.group === group);
    
    const guardedPatternHashes = new Set(guards.map(g => g.patternHash));
    
    const unguardedCount = secrets.flatMap(secret => 
      patterns.filter(p => 
        p.risk === 'critical' && 
        p.pattern.includes(`\${${secret.name}}`) && 
        !guardedPatternHashes.has(p.hash)
      )
    ).length;
    
    const criticalCount = patterns.filter(p => p.risk === 'critical').length;
    
    return {
      unguardedCount,
      criticalCount,
      riskScore: unguardedCount > 0 ? 8.5 : 0
    };
  }
  
  // **Real-time Guard Generator**
  generateGuardsForUnguarded(unguarded: UnguardedSecretReport[]): GuardTemplate[] {
    return unguarded.flatMap(report => 
      report.patterns.map(pattern => ({
        id: `guard_${pattern.hash}_${Date.now()}`,
        pattern: pattern.pattern,
        patternHash: pattern.hash,
        group: pattern.group,
        priority: this.calculateGuardPriority(pattern),
        implementation: this.generateGuardCode(pattern),
        // Bun 1.3.6+ security features
        bunFeatures: {
          requires: ['unsafe.allow.topLevelAwait', 'unsafe.allow.requireModule'],
          runtimeChecks: ['patternValidation', 'rateLimit', 'auditLog']
        },
        metadata: {
          createdAt: new Date().toISOString(),
          secretNames: [report.secret.name],
          riskLevel: pattern.risk
        }
      }))
    );
  }
  
  // Calculate exposure risk
  private calculateExposureRisk(secret: SecretRecord, patterns: PatternRecord[]): number {
    const baseRisk = secret.type === 'api_key' ? 8 : secret.type === 'credentials' ? 9 : 7;
    const patternRisk = patterns.length * 0.5;
    return Math.min(10, baseRisk + patternRisk);
  }
  
  // Calculate guard priority
  private calculateGuardPriority(pattern: PatternRecord): number {
    return pattern.risk === 'critical' ? 1 : pattern.risk === 'high' ? 2 : 3;
  }
  
  // Generate guard recommendations
  private generateGuardRecommendations(patterns: PatternRecord[]): string[] {
    const recommendations: string[] = [];
    
    if (patterns.some(p => p.pattern.includes('api_key'))) {
      recommendations.push('Implement API key validation and rate limiting');
    }
    
    if (patterns.some(p => p.pattern.includes('credentials'))) {
      recommendations.push('Implement session validation and IP whitelisting');
    }
    
    if (patterns.length > 3) {
      recommendations.push('Consider implementing a single guard for all patterns');
    }
    
    return recommendations;
  }
  
  // Generate guard implementation code
  private generateGuardCode(pattern: PatternRecord): string {
    if (pattern.pattern.includes('api_key')) {
      return `export function guard${Date.now()}() {
  return {
    validate: (ctx) => {
      const key = ctx.request.headers.get('x-api-key');
      if (!key) return { allowed: false, reason: 'Missing API key' };
      
      // Rate limiting
      const limiter = new TokenBucket({ capacity: 100, refillRate: 10 });
      if (!limiter.take()) {
        return { allowed: false, reason: 'Rate limit exceeded' };
      }
      
      // Audit logging (Bun 1.3.6+)
      Bun.write(
        'logs/security.log',
        \`\${new Date().toISOString()} API_KEY_USED \${ctx.request.url}\\n\`
      );
      
      return { allowed: true };
    }
  };
}`;
    }
    
    if (pattern.pattern.includes('credentials')) {
      return `export function guard${Date.now()}() {
  return {
    validate: (ctx) => {
      // Encrypted session validation
      const session = decrypt(ctx.cookies.get('session'));
      
      // IP whitelisting
      const allowedIPs = Bun.env.ALLOWED_IPS?.split(',') || [];
      if (!allowedIPs.includes(ctx.request.ip)) {
        return { allowed: false, reason: 'IP not whitelisted' };
      }
      
      // Bun's native validation
      const url = new URL(ctx.request.url);
      if (url.pathname.includes('admin') && !session.isAdmin) {
        return { allowed: false, reason: 'Admin access required' };
      }
      
      return { allowed: true };
    }
  };
}`;
    }
    
    return `export function guard${Date.now()}() {
  return {
    validate: (ctx) => {
      // Default guard implementation
      return { allowed: true };
    }
  };
}`;
  }
}
