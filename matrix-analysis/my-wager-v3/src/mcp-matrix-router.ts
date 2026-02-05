#!/usr/bin/env bun
// MCP Matrix Router - Intelligent API Routing based on Tier-1380 Matrix
// Routes MCP calls to appropriate services based on security, platform, and stability

// Make this a module
export {};

import { BUN_DOC_MAP, BunDocMatrixEntry, MATRIX_FILTERS, BunMatrixAnalyzer } from './bun-mcp-matrix-v2.ts';

interface MCPRoutingContext {
  clientId: string;
  platform: 'darwin' | 'linux' | 'win32';
  bunVersion: string;
  securityLevel: 'low' | 'medium' | 'high' | 'critical';
  environment: 'development' | 'staging' | 'production';
  requiredFlags?: string[];
}

interface MCPRouteDecision {
  allowed: boolean;
  reason?: string;
  requiredFlags?: string[];
  securityConcerns?: string[];
  platformIssues?: string[];
  versionIssues?: string[];
  routedService?: string;
}

class MCPMatrixRouter {
  private analyzer: BunMatrixAnalyzer;
  private serviceMap: Map<string, string>;
  
  constructor() {
    this.analyzer = new BunMatrixAnalyzer();
    
    // Map categories to services for ACP routing
    this.serviceMap = new Map([
      ['security', 'ThreatIntelligenceService'],
      ['storage', 'SecureDataRepository'],
      ['network', 'NetworkGateway'],
      ['runtime', 'ExecutionEngine'],
      ['bundler', 'BuildOptimizer'],
      ['pm', 'PackageRegistry']
    ]);
  }
  
  /**
   * Route an MCP request based on matrix constraints
   */
  routeRequest(
    apiTerm: string, 
    context: MCPRoutingContext
  ): MCPRouteDecision {
    const entry = BUN_DOC_MAP.find(e => e.term === apiTerm);
    
    if (!entry) {
      return {
        allowed: false,
        reason: `API "${apiTerm}" not found in matrix`
      };
    }
    
    const decision: MCPRouteDecision = {
      allowed: true,
      routedService: this.serviceMap.get(entry.category)
    };
    
    // Check stability
    if (context.environment === 'production' && entry.stability !== 'stable') {
      decision.allowed = false;
      decision.reason = `API "${apiTerm}" is ${entry.stability}, not stable for production`;
      return decision;
    }
    
    // Check required flags
    if (entry.requiredFlags && entry.requiredFlags.length > 0) {
      const missingFlags = entry.requiredFlags.filter(
        flag => !context.requiredFlags?.includes(flag)
      );
      
      if (missingFlags.length > 0) {
        decision.allowed = false;
        decision.reason = `Missing required flags: ${missingFlags.join(', ')}`;
        decision.requiredFlags = entry.requiredFlags;
        return decision;
      }
    }
    
    // Check platform compatibility
    if (!entry.platforms.includes(context.platform)) {
      decision.allowed = false;
      decision.reason = `API "${apiTerm}" not supported on ${context.platform}`;
      decision.platformIssues = [`Unsupported platform: ${context.platform}`];
      return decision;
    }
    
    // Check version compatibility
    if (!this.isVersionCompatible(entry.bunMinVersion, context.bunVersion)) {
      decision.allowed = false;
      decision.reason = `API "${apiTerm}" requires Bun ${entry.bunMinVersion}+, current: ${context.bunVersion}`;
      decision.versionIssues = [`Minimum version: ${entry.bunMinVersion}`];
      return decision;
    }
    
    // Security checks
    const securityIssues: string[] = [];
    
    if (entry.securityScope.requiresRoot && context.securityLevel !== 'critical') {
      securityIssues.push('Requires root privileges');
    }
    
    if (entry.securityScope.classification === 'critical' && 
        context.securityLevel !== 'critical' && 
        context.environment === 'production') {
      securityIssues.push('Critical security API requires elevated context');
    }
    
    if (securityIssues.length > 0) {
      decision.securityConcerns = securityIssues;
      
      // In production, block if there are security concerns
      if (context.environment === 'production') {
        decision.allowed = false;
        decision.reason = `Security restrictions: ${securityIssues.join(', ')}`;
        return decision;
      }
    }
    
    // Check breaking changes
    if (entry.breakingSince && entry.breakingSince.length > 0) {
      const latestBreaking = entry.breakingSince[entry.breakingSince.length - 1];
      if (this.isVersionGreater(latestBreaking, context.bunVersion)) {
        decision.allowed = false;
        decision.reason = `API "${apiTerm}" has breaking changes since ${latestBreaking}`;
        decision.versionIssues = [`Breaking changes since: ${latestBreaking}`];
        return decision;
      }
    }
    
    return decision;
  }
  
  /**
   * Get all allowed APIs for a context
   */
  getAllowedAPIs(context: MCPRoutingContext): BunDocMatrixEntry[] {
    return BUN_DOC_MAP.filter(entry => {
      const decision = this.routeRequest(entry.term, context);
      return decision.allowed;
    });
  }
  
  /**
   * Generate security report for context
   */
  generateSecurityReport(context: MCPRoutingContext): {
    totalAPIs: number;
    allowed: number;
    blocked: number;
    blockedBySecurity: number;
    blockedByPlatform: number;
    blockedByVersion: number;
    blockedByStability: number;
    details: Array<{
      api: string;
      reason: string;
      category: string;
    }>;
  } {
    const allAPIs = BUN_DOC_MAP;
    const blocked: Array<{ api: string; reason: string; category: string }> = [];
    
    let blockedBySecurity = 0;
    let blockedByPlatform = 0;
    let blockedByVersion = 0;
    let blockedByStability = 0;
    
    allAPIs.forEach(api => {
      const decision = this.routeRequest(api.term, context);
      if (!decision.allowed) {
        blocked.push({
          api: api.term,
          reason: decision.reason || 'Unknown',
          category: api.category
        });
        
        if (decision.securityConcerns?.length) blockedBySecurity++;
        else if (decision.platformIssues?.length) blockedByPlatform++;
        else if (decision.versionIssues?.length) blockedByVersion++;
        else if (decision.reason?.includes('stable')) blockedByStability++;
      }
    });
    
    return {
      totalAPIs: allAPIs.length,
      allowed: allAPIs.length - blocked.length,
      blocked: blocked.length,
      blockedBySecurity,
      blockedByPlatform,
      blockedByVersion,
      blockedByStability,
      details: blocked
    };
  }
  
  private isVersionCompatible(minVersion: string, currentVersion: string): boolean {
    const [minMajor, minMinor, minPatch] = minVersion.split('.').map(Number);
    const [curMajor, curMinor, curPatch] = currentVersion.split('.').map(Number);
    
    if (curMajor > minMajor) return true;
    if (curMajor < minMajor) return false;
    if (curMinor > minMinor) return true;
    if (curMinor < minMinor) return false;
    return curPatch >= minPatch;
  }
  
  private isVersionGreater(v1: string, v2: string): boolean {
    const [major1, minor1, patch1] = v1.split('.').map(Number);
    const [major2, minor2, patch2] = v2.split('.').map(Number);
    
    if (major1 !== major2) return major1 > major2;
    if (minor1 !== minor2) return minor1 > minor2;
    return patch1 > patch2;
  }
}

// Demonstrate MCP routing
console.log('🛣️  MCP Matrix Router - Intelligent API Routing');
console.log('='.repeat(50));

const router = new MCPMatrixRouter();

// Example contexts
const contexts: MCPRoutingContext[] = [
  {
    clientId: 'prod-server-001',
    platform: 'linux',
    bunVersion: '1.3.7',
    securityLevel: 'critical',
    environment: 'production',
    requiredFlags: []
  },
  {
    clientId: 'dev-laptop-mac',
    platform: 'darwin',
    bunVersion: '1.3.7',
    securityLevel: 'medium',
    environment: 'development',
    requiredFlags: ['--experimental-secrets']
  },
  {
    clientId: 'win-workstation',
    platform: 'win32',
    bunVersion: '1.3.7',
    securityLevel: 'high',
    environment: 'staging',
    requiredFlags: []
  }
];

contexts.forEach(context => {
  console.log(`\n📋 Context: ${context.clientId} (${context.environment})`);
  console.log('─'.repeat(40));
  
  const report = router.generateSecurityReport(context);
  
  console.log(`API Access: ${report.allowed}/${report.totalAPIs} allowed`);
  console.log(`Blocked: ${report.blocked} (Security: ${report.blockedBySecurity}, Platform: ${report.blockedByPlatform}, Version: ${report.blockedByVersion}, Stability: ${report.blockedByStability})`);
  
  // Show some routing decisions
  const testAPIs = ['password', 'secrets', 'Bun.serve', 'Redis', 'mcp'];
  testAPIs.forEach(api => {
    const decision = router.routeRequest(api, context);
    const status = decision.allowed ? '✅' : '❌';
    const service = decision.routedService ? ` → ${decision.routedService}` : '';
    console.log(`  ${status} ${api}${service}`);
    if (!decision.allowed && decision.reason) {
      console.log(`     ${decision.reason}`);
    }
  });
});

console.log('\n✅ MCP Matrix Router ready for ACP integration! 🚀');

export { MCPMatrixRouter, MCPRoutingContext, MCPRouteDecision };
