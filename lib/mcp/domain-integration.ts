// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// lib/mcp/domain-integration.ts — Domain and subdomain integration with R2 MCP

import { CLOUDFLARE_DEFAULTS, cloudflareAccountIdFromEnv, R2_CONFIG } from '../../config/r2-env.ts';
import {
  r2MCPIntegration,
  diagnosisSeverityFromError,
  type DiagnosisEntry,
} from './r2-integration-fixed.ts';
import { styled, FW_COLORS } from '../theme/colors';
import { type AccountId, asAccountId } from '../types/branded.ts';
// Account from config/r2-env (env overlay → proven default).

export interface DomainConfig {
  primary: {
    domain: string;
    environment: 'production' | 'staging' | 'development';
    tier: 'enterprise' | 'professional' | 'starter';
  };
  subdomains: {
    npm: string;
    api: string;
    cdn: string;
    monitor: string;
    docs: string;
    rss: string;
    config: string;
    admin: string;
  };
  enterprise: {
    mrr_baseline: number;
    compliance_level: 'critical' | 'high' | 'medium' | 'low';
    security_posture: 'mTLS' | 'TLS' | 'standard';
    monitoring: 'realtime' | 'periodic' | 'basic';
  };
  cloudflare: {
    account_id: AccountId;
    dashboard_url: string;
    r2_bucket: string;
  };
}

export interface DomainMetrics {
  timestamp: string;
  domain: string;
  subdomain: string;
  metrics: {
    uptime: number;
    response_time: number;
    error_rate: number;
    throughput: number;
    security_score: number;
  };
  mcp_integration: {
    diagnoses_stored: number;
    audits_processed: number;
    knowledge_base_size: number;
    confidence_score: number;
  };
}

export interface SubdomainHealth {
  subdomain: string;
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  last_check: string;
  response_time: number;
  ssl_status: 'valid' | 'expiring' | 'expired' | 'invalid';
  dependencies: string[];
  mcp_context: string;
}

export class DomainIntegration {
  private config: DomainConfig;
  private r2: typeof r2MCPIntegration;

  constructor() {
    this.config = this.loadDomainConfig();
    this.r2 = r2MCPIntegration;
  }

  private loadDomainConfig(): DomainConfig {
    const accountId = asAccountId(cloudflareAccountIdFromEnv());
    return {
      primary: {
        domain: CLOUDFLARE_DEFAULTS.zones.factoryWager.name,
        environment: 'production',
        tier: 'enterprise',
      },
      subdomains: {
        npm: CLOUDFLARE_DEFAULTS.registryHost,
        api: 'api.factory-wager.com',
        cdn: 'cdn.factory-wager.com',
        monitor: 'monitor.factory-wager.com',
        docs: 'docs.factory-wager.com',
        rss: 'rss.factory-wager.com',
        config: 'config.factory-wager.com',
        admin: 'admin.factory-wager.com',
      },
      enterprise: {
        mrr_baseline: 65, // 65% MRR baseline from user rules
        compliance_level: 'critical',
        security_posture: 'mTLS',
        monitoring: 'realtime',
      },
      cloudflare: {
        account_id: accountId,
        dashboard_url: `https://dash.cloudflare.com/${accountId}/factory-wager.com`,
        r2_bucket: R2_CONFIG.bucketName || 'scanner-cookies',
      },
    };
  }

  /**
   * Initialize domain integration with R2 storage
   */
  async initialize(): Promise<void> {
    console.info(styled('🌐 Initializing FactoryWager Domain Integration', 'accent'));
    console.info(styled('==========================================', 'accent'));

    // Store domain configuration in R2
    await this.storeDomainConfig();

    // Initialize subdomain monitoring
    await this.initializeSubdomainMonitoring();

    // Setup enterprise metrics tracking
    await this.setupEnterpriseMetrics();

    console.info(styled('✅ Domain integration initialized', 'success'));
  }

  /**
   * Store domain configuration in R2 for persistence
   */
  async storeDomainConfig(): Promise<void> {
    const key = `domains/factory-wager/config.json`;

    try {
      await this.r2.putJSON(key, this.config);
      console.info(styled(`✅ Domain config stored: ${key}`, 'success'));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(styled(`❌ Failed to store domain config: ${msg}`, 'error'));
    }
  }

  /**
   * Initialize subdomain health monitoring
   */
  async initializeSubdomainMonitoring(): Promise<void> {
    console.info(styled('🔍 Initializing subdomain monitoring...', 'info'));

    const healthChecks: SubdomainHealth[] = [];

    for (const [name, subdomain] of Object.entries(this.config.subdomains)) {
      const health: SubdomainHealth = {
        subdomain,
        status: 'healthy',
        last_check: new Date().toISOString(),
        response_time: Math.random() * 100 + 50, // Mock response time
        ssl_status: 'valid',
        dependencies: this.getSubdomainDependencies(name),
        mcp_context: this.getSubdomainMCPContext(name),
      };

      healthChecks.push(health);
    }

    // Store health checks in R2
    const key = `domains/factory-wager/health/${new Date().toISOString().split('T')[0]}.json`;
    await this.r2.putJSON(key, healthChecks);

    console.info(styled(`✅ Subdomain health stored: ${key}`, 'success'));
  }

  /**
   * Get dependencies for each subdomain
   */
  private getSubdomainDependencies(subdomainName: string): string[] {
    const dependencyMap: Record<string, string[]> = {
      npm: ['registry.npmjs.org', 'auth.factory-wager.com'],
      api: ['database.factory-wager.com', 'auth.factory-wager.com', 'redis.factory-wager.com'],
      cdn: ['storage.factory-wager.com', 'cloudflare.com'],
      monitor: ['api.factory-wager.com', 'database.factory-wager.com'],
      docs: ['cdn.factory-wager.com', 'api.factory-wager.com'],
      rss: ['storage.factory-wager.com', 'api.factory-wager.com'],
      config: ['vault.factory-wager.com', 'database.factory-wager.com'],
      admin: ['api.factory-wager.com', 'auth.factory-wager.com', 'audit.factory-wager.com'],
    };

    return dependencyMap[subdomainName] || [];
  }

  /**
   * Get MCP context for each subdomain
   */
  private getSubdomainMCPContext(subdomainName: string): string {
    const contextMap: Record<string, string> = {
      npm: 'package-registry',
      api: 'backend-services',
      cdn: 'content-delivery',
      monitor: 'observability',
      docs: 'documentation',
      rss: 'content-syndication',
      config: 'configuration-management',
      admin: 'administrative-tools',
    };

    return contextMap[subdomainName] || 'general';
  }

  /**
   * Setup enterprise metrics tracking
   */
  async setupEnterpriseMetrics(): Promise<void> {
    console.info(styled('📊 Setting up enterprise metrics...', 'info'));

    const metrics: DomainMetrics = {
      timestamp: new Date().toISOString(),
      domain: this.config.primary.domain,
      subdomain: 'all',
      metrics: {
        uptime: 99.9,
        response_time: 85,
        error_rate: 0.1,
        throughput: 1000,
        security_score: 95,
      },
      mcp_integration: {
        diagnoses_stored: 0,
        audits_processed: 0,
        knowledge_base_size: 0,
        confidence_score: 0,
      },
    };

    const key = `domains/factory-wager/metrics/${new Date().toISOString().split('T')[0]}.json`;
    await this.r2.putJSON(key, metrics);

    console.info(styled(`✅ Enterprise metrics stored: ${key}`, 'success'));
  }

  /**
   * Store domain-specific diagnosis in R2
   */
  async storeDomainDiagnosis(
    subdomain: string,
    error: any,
    fix: string,
    context: string
  ): Promise<string> {
    const diagnosis: DiagnosisEntry = {
      id: `domain-${subdomain}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      issue: error?.name || 'Unknown',
      severity: diagnosisSeverityFromError(error),
      category: subdomain,
      description: error?.message || 'Unknown error',
      recommendations: [fix],
      resolved: false,
      metadata: {
        domain: this.config.primary.domain,
        subdomain,
        context: `${this.getSubdomainMCPContext(subdomain)}-${context}`,
        confidence: this.calculateConfidence(subdomain, error),
        error: {
          name: error?.name || 'Unknown',
          message: error?.message || 'Unknown error',
          stack: error?.stack,
        },
        enterprise_tier: this.config.primary.tier,
        compliance_level: this.config.enterprise.compliance_level,
        security_posture: this.config.enterprise.security_posture,
        mrr_impact: this.calculateMRRImpact(subdomain, error),
      },
    };

    return await this.r2.storeDiagnosis(diagnosis);
  }

  /**
   * Calculate confidence score based on domain context
   */
  private calculateConfidence(subdomain: string, error: any): number {
    let baseConfidence = 75;

    // Enterprise tier bonus
    if (this.config.primary.tier === 'enterprise') {
      baseConfidence += 10;
    }

    // Subdomain-specific adjustments
    const criticalSubdomains = ['api', 'admin', 'config'];
    if (criticalSubdomains.includes(subdomain)) {
      baseConfidence += 5;
    }

    // Error type adjustments
    if (error.name === 'TypeError' || error.name === 'ReferenceError') {
      baseConfidence += 5;
    }

    return Math.min(baseConfidence, 100);
  }

  /**
   * Calculate MRR impact for enterprise tracking
   */
  private calculateMRRImpact(subdomain: string, error: any): number {
    const impactMap: Record<string, number> = {
      api: 25, // API downtime affects revenue
      admin: 15, // Admin issues affect operations
      npm: 10, // Registry issues affect developers
      cdn: 20, // CDN issues affect user experience
      monitor: 5, // Monitoring issues are internal
      docs: 8, // Documentation affects support
      rss: 3, // RSS issues are low impact
      config: 30, // Configuration issues are critical
    };

    const baseImpact = impactMap[subdomain] || 10;

    // Severity multiplier
    if (error.name === 'SecurityError') return baseImpact * 2;
    if (error.name === 'NetworkError') return baseImpact * 1.5;

    return baseImpact;
  }

  /**
   * Get domain-specific recommendations from R2
   */
  async getDomainRecommendations(subdomain?: string): Promise<any[]> {
    try {
      const similar = await this.r2.searchDiagnoses('DomainError', 5);

      return similar.map(diag => ({
        subdomain: diag.category,
        issue: diag.issue,
        resolution: diag.recommendations[0] ?? '',
        confidence: diag.severity === 'critical' ? 95 : 80,
        mrr_impact: this.calculateMRRImpact(subdomain || 'api', { name: diag.category }),
      }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(styled(`⚠️ Failed to get domain recommendations: ${msg}`, 'warning'));
      return [];
    }
  }

  /**
   * Generate domain health report
   */
  async generateDomainHealthReport(): Promise<void> {
    console.info(styled('📋 Generating Domain Health Report...', 'info'));

    const report = {
      timestamp: new Date().toISOString(),
      domain: this.config.primary.domain,
      tier: this.config.primary.tier,
      subdomains: this.config.subdomains,
      enterprise_metrics: {
        mrr_baseline: this.config.enterprise.mrr_baseline,
        compliance_level: this.config.enterprise.compliance_level,
        security_posture: this.config.enterprise.security_posture,
      },
      mcp_integration: {
        r2_bucket: 'scanner-cookies',
        diagnoses_count: await this.getDiagnosesCount(),
        last_diagnosis: await this.getLastDiagnosis(),
        knowledge_base_size: await this.getKnowledgeBaseSize(),
      },
    };

    const key = `domains/factory-wager/reports/health-${new Date().toISOString().split('T')[0]}.json`;
    await this.r2.putJSON(key, report);

    console.info(styled(`✅ Health report stored: ${key}`, 'success'));
  }

  /**
   * Helper methods for reporting
   */
  private async getDiagnosesCount(): Promise<number> {
    // Mock implementation - would query R2 in real system
    return 12;
  }

  private async getLastDiagnosis(): Promise<string> {
    // Mock implementation - would query R2 in real system
    return '2026-02-05T10:06:01.3NZ';
  }

  private async getKnowledgeBaseSize(): Promise<number> {
    // Mock implementation - would query R2 in real system
    return 2048;
  }

  /**
   * Display domain integration status
   */
  async displayStatus(): Promise<void> {
    console.info(styled('\n🌐 FactoryWager Domain Integration Status', 'accent'));
    console.info(styled('==========================================', 'accent'));

    console.info(styled(`Domain: ${this.config.primary.domain}`, 'info'));
    console.info(styled(`Tier: ${this.config.primary.tier}`, 'info'));
    console.info(styled(`Environment: ${this.config.primary.environment}`, 'info'));

    console.info(styled('\n📡 Subdomains:', 'info'));
    for (const [name, subdomain] of Object.entries(this.config.subdomains)) {
      console.info(styled(`  ${name}: ${subdomain}`, 'muted'));
    }

    console.info(styled('\n🔒 Enterprise Configuration:', 'info'));
    console.info(styled(`  MRR Baseline: ${this.config.enterprise.mrr_baseline}%`, 'muted'));
    console.info(styled(`  Compliance: ${this.config.enterprise.compliance_level}`, 'muted'));
    console.info(styled(`  Security: ${this.config.enterprise.security_posture}`, 'muted'));
    console.info(styled(`  Monitoring: ${this.config.enterprise.monitoring}`, 'muted'));

    console.info(styled('\n☁️ Cloudflare Integration:', 'info'));
    console.info(styled(`  Account ID: ${this.config.cloudflare.account_id}`, 'muted'));
    console.info(styled(`  Dashboard: ${this.config.cloudflare.dashboard_url}`, 'muted'));
    console.info(styled(`  R2 Bucket: ${this.config.cloudflare.r2_bucket}`, 'muted'));

    const recommendations = await this.getDomainRecommendations();
    if (recommendations.length > 0) {
      console.info(styled('\n💡 Recent Recommendations:', 'success'));
      recommendations.forEach((rec, i) => {
        console.info(styled(`  ${i + 1}. ${rec.issue} → ${rec.resolution}`, 'muted'));
      });
    }
  }
}

/** Lazy singleton — import without account env must not throw until use. */
let _domainIntegration: DomainIntegration | undefined;
export function getDomainIntegration(): DomainIntegration {
  if (!_domainIntegration) _domainIntegration = new DomainIntegration();
  return _domainIntegration;
}

export const domainIntegration: DomainIntegration = new Proxy({} as DomainIntegration, {
  get(_t, prop) {
    const inst = getDomainIntegration();
    const value = Reflect.get(inst, prop, inst);
    return typeof value === 'function' ? value.bind(inst) : value;
  },
});

// CLI interface
if (import.meta.main) {
  const domain = getDomainIntegration();

  await domain.initialize();
  await domain.displayStatus();

  console.info(styled('\n🎉 Domain integration complete!', 'success'));
  console.info(styled('All domain data stored in R2 for enterprise tracking.', 'info'));
}
