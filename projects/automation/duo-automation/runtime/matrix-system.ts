import { ScopeInspectable } from './inspect-custom';

// ============================================
// ENHANCED MATRIX SYSTEM INTEGRATION
// ============================================

export interface ScopeData {
  detectedScope: string;
  servingDomain: string;
  platform: string;
  featureFlags: string[];
  connectionConfig: {
    maxConnections: number;
    keepAlive: boolean;
    timeout: number;
  };
  stats?: {
    activeConnections?: number;
    totalRequests?: number;
    averageResponseTime?: number;
  };
}

export class EnhancedScope extends ScopeInspectable {
  constructor(scopeData: ScopeData) {
    super(
      scopeData.detectedScope,
      scopeData.servingDomain,
      scopeData.platform,
      scopeData.featureFlags,
      scopeData.connectionConfig,
      scopeData.stats
    );
  }
  
  // Additional scope-specific methods
  getScopeLevel(): number {
    const levels: Record<string, number> = {
      'GLOBAL': 0,
      'ENTERPRISE': 1,
      'DEVELOPMENT': 2,
      'LOCAL_SANDBOX': 3,
    };
    return levels[this.scope] || 999;
  }
  
  isProductionReady(): boolean {
    return this.scope === 'ENTERPRISE' && 
           this.featureFlags.includes('PREMIUM') &&
           this.connectionConfig.maxConnections >= 10;
  }
  
  getSecurityLevel(): string {
    if (this.featureFlags.includes('ENTERPRISE_SECURITY')) return 'HIGH';
    if (this.featureFlags.includes('ADVANCED_SECURITY')) return 'MEDIUM';
    return 'BASIC';
  }
  
  // Enhanced inspection with additional metrics
  [Symbol.for("Bun.inspect.custom")](): string {
    const baseInspection = super[Symbol.for("Bun.inspect.custom")]();
    const lines = baseInspection.split('\n');
    
    // Add additional scope-specific information
    const additionalInfo = [
      '',
      `🎯 Scope Level: ${this.getScopeLevel()}`,
      `🔒 Security:    ${this.getSecurityLevel()}`,
      `🚀 Production:  ${this.isProductionReady() ? '✅ Ready' : '❌ Not ready'}`,
    ];
    
    lines.push(...additionalInfo);
    
    return lines.join('\n');
  }
}

// ============================================
// MATRIX MANAGER INTEGRATION
// ============================================

export interface MatrixStats {
  totalScopes: number;
  activeScopes: number;
  scopeDistribution: Record<string, number>;
  totalConnections: number;
  totalRequests: number;
  averageResponseTime: number;
  lastUpdated: Date;
}

export class MatrixManager {
  private scopes = new Map<string, EnhancedScope>();
  private stats: MatrixStats;
  
  constructor() {
    this.stats = {
      totalScopes: 0,
      activeScopes: 0,
      scopeDistribution: {},
      totalConnections: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      lastUpdated: new Date(),
    };
  }
  
  addScope(scopeData: ScopeData): void {
    const scope = new EnhancedScope(scopeData);
    this.scopes.set(scopeData.detectedScope, scope);
    this.updateStats();
  }
  
  getScope(scopeName: string): EnhancedScope | undefined {
    return this.scopes.get(scopeName);
  }
  
  getAllScopes(): EnhancedScope[] {
    return Array.from(this.scopes.values());
  }
  
  getProductionScopes(): EnhancedScope[] {
    return this.getAllScopes().filter(scope => scope.isProductionReady());
  }
  
  getScopesByLevel(): Record<string, EnhancedScope[]> {
    const grouped: Record<string, EnhancedScope[]> = {};
    
    this.getAllScopes().forEach(scope => {
      const level = scope.scope;
      if (!grouped[level]) {
        grouped[level] = [];
      }
      grouped[level].push(scope);
    });
    
    return grouped;
  }
  
  private updateStats(): void {
    const scopes = this.getAllScopes();
    
    this.stats.totalScopes = scopes.length;
    this.stats.activeScopes = scopes.filter(s => s.stats?.activeConnections || 0 > 0).length;
    
    // Calculate scope distribution
    this.stats.scopeDistribution = {};
    scopes.forEach(scope => {
      this.stats.scopeDistribution[scope.scope] = 
        (this.stats.scopeDistribution[scope.scope] || 0) + 1;
    });
    
    // Calculate aggregate stats
    this.stats.totalConnections = scopes.reduce((sum, scope) => 
      sum + (scope.stats?.activeConnections || 0), 0);
    
    this.stats.totalRequests = scopes.reduce((sum, scope) => 
      sum + (scope.stats?.totalRequests || 0), 0);
    
    const responseTimes = scopes
      .map(s => s.stats?.averageResponseTime || 0)
      .filter(t => t > 0);
    
    this.stats.averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length 
      : 0;
    
    this.stats.lastUpdated = new Date();
  }
  
  // Custom inspection for the matrix manager
  [Symbol.for("Bun.inspect.custom")](): string {
    this.updateStats();
    
    const productionScopes = this.getProductionScopes();
    const scopesByLevel = this.getScopesByLevel();
    
    const lines = [
      '🌐 MATRIX MANAGER',
      `${'═'.repeat(50)}`,
      `📊 Scopes: ${this.stats.totalScopes} total, ${this.stats.activeScopes} active`,
      `🚀 Production Ready: ${productionScopes.length}`,
      `🔗 Total Connections: ${this.stats.totalConnections}`,
      `📈 Total Requests: ${this.stats.totalRequests}`,
      `⏱️  Average Response: ${this.stats.averageResponseTime.toFixed(2)}ms`,
      '',
      `📋 SCOPE DISTRIBUTION:`,
    ];
    
    Object.entries(this.stats.scopeDistribution).forEach(([scope, count]) => {
      const emoji = scopesByLevel[scope]?.[0]?.getScopeEmoji() || '⚙️';
      lines.push(`  ${emoji} ${scope}: ${count}`);
    });
    
    if (productionScopes.length > 0) {
      lines.push('');
      lines.push(`🚀 PRODUCTION SCOPES:`);
      productionScopes.slice(0, 3).forEach(scope => {
        lines.push(`  ✅ ${scope.scope} (${scope.domain})`);
      });
      if (productionScopes.length > 3) {
        lines.push(`  • ... and ${productionScopes.length - 3} more`);
      }
    }
    
    lines.push('');
    lines.push(`🕐 Last Updated: ${this.stats.lastUpdated.toLocaleString()}`);
    
    return lines.join('\n');
  }
}

// ============================================
// SCOPE DETECTOR INTEGRATION
// ============================================

export interface ScopeDetectionResult {
  scope: string;
  confidence: number;
  domain: string;
  platform: string;
  detectedFeatures: string[];
  metadata: Record<string, any>;
}

export class ScopeDetector {
  detectScope(): ScopeDetectionResult {
    // This would integrate with the actual scope detection logic
    // For now, return a mock result
    return {
      scope: 'ENTERPRISE',
      confidence: 0.95,
      domain: 'https://duoplus-registry.utahj4754.workers.dev',
      platform: 'macOS',
      detectedFeatures: ['PREMIUM', 'TERMINAL_PTY', 'ADVANCED_CONNECTIONS'],
      metadata: {
        detectedAt: new Date(),
        method: 'environment_analysis',
        version: '3.7',
      }
    };
  }
  
  createScopeFromDetection(): EnhancedScope {
    const detection = this.detectScope();
    
    return new EnhancedScope({
      detectedScope: detection.scope,
      servingDomain: detection.domain,
      platform: detection.platform,
      featureFlags: detection.detectedFeatures,
      connectionConfig: {
        maxConnections: detection.scope === 'ENTERPRISE' ? 20 : 10,
        keepAlive: true,
        timeout: 15000,
      },
      stats: {
        activeConnections: 0,
        totalRequests: 0,
        averageResponseTime: 0,
      }
    });
  }
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

export function createScopeData(data: Partial<ScopeData>): ScopeData {
  return {
    detectedScope: data.detectedScope || 'LOCAL_SANDBOX',
    servingDomain: data.servingDomain || 'localhost',
    platform: data.platform || 'unknown',
    featureFlags: data.featureFlags || [],
    connectionConfig: data.connectionConfig || {
      maxConnections: 5,
      keepAlive: false,
      timeout: 5000,
    },
    stats: data.stats || {
      activeConnections: 0,
      totalRequests: 0,
      averageResponseTime: 0,
    }
  };
}

export function createMatrixStats(data: Partial<MatrixStats>): MatrixStats {
  return {
    totalScopes: data.totalScopes || 0,
    activeScopes: data.activeScopes || 0,
    scopeDistribution: data.scopeDistribution || {},
    totalConnections: data.totalConnections || 0,
    totalRequests: data.totalRequests || 0,
    averageResponseTime: data.averageResponseTime || 0,
    lastUpdated: data.lastUpdated || new Date(),
  };
}

// ============================================
// EXPORTS
// ============================================

export {
  ScopeInspectable,
  EnhancedScope as Scope,
};
