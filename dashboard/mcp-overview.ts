#!/usr/bin/env bun

/**
 * 🏭 FactoryWager MCP System Dashboard
 * 
 * Comprehensive monitoring and management interface for the entire MCP ecosystem
 * including authentication, R2 storage, usage analytics, and system health.
 */

import { masterTokenManager } from '../lib/security/master-token.ts';
import { r2MCPIntegration } from '../lib/mcp/r2-integration.ts';
import { styled, FW_COLORS, colorBar } from '../lib/theme/colors.ts';
import { createSpinner } from '../lib/theme/colors.ts';

interface SystemStatus {
  component: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  message: string;
  lastChecked: string;
  metrics?: Record<string, any>;
}

interface DashboardMetrics {
  authentication: {
    activeTokens: number;
    expiredTokens: number;
    recentAuths: number;
    failedAuths: number;
  };
  storage: {
    totalObjects: number;
    totalSize: string;
    diagnosesCount: number;
    auditsCount: number;
  };
  usage: {
    totalSearches: number;
    totalDiagnoses: number;
    totalExamples: number;
    avgResponseTime: number;
  };
  system: {
    uptime: string;
    memoryUsage: string;
    errorRate: number;
    lastRestart: string;
  };
}

class MCPSystemDashboard {
  private startTime: Date = new Date();
  private refreshInterval: number = 30000; // 30 seconds

  constructor() {
    this.showWelcome();
  }

  private showWelcome(): void {
    console.log(styled('\n🏭 FactoryWager MCP System Dashboard', 'accent'));
    console.log(styled('==========================================', 'accent'));
    console.log(styled('Real-time monitoring and management interface', 'muted'));
    console.log(styled(`Started: ${this.startTime.toLocaleString()}`, 'muted'));
    console.log('');
  }

  async generateSystemStatus(): Promise<SystemStatus[]> {
    const statuses: SystemStatus[] = [];
    const now = new Date().toISOString();

    // Check Master Token System
    try {
      const tokens = masterTokenManager.listTokens();
      const auditLogs = masterTokenManager.getAuditLogs(10);
      const recentFailures = auditLogs.filter(log => !log.success && 
        new Date(log.timestamp) > new Date(Date.now() - 5 * 60 * 1000)).length;

      statuses.push({
        component: '🔐 Master Token System',
        status: recentFailures > 0 ? 'warning' : 'healthy',
        message: `${tokens.length} active tokens, ${recentFailures} recent failures`,
        lastChecked: now,
        metrics: {
          activeTokens: tokens.length,
          recentFailures,
          totalAudits: auditLogs.length
        }
      });
    } catch (error) {
      statuses.push({
        component: '🔐 Master Token System',
        status: 'error',
        message: `Error: ${error.message}`,
        lastChecked: now
      });
    }

    // Check R2 Integration
    try {
      const configStatus = r2MCPIntegration.getConfigStatus();
      const stats = await r2MCPIntegration.getBucketStats();
      
      statuses.push({
        component: '☁️ R2 Storage Integration',
        status: configStatus.configured ? 'healthy' : 'warning',
        message: configStatus.configured 
          ? `Connected: ${stats.objectCount} objects (${stats.totalSize})`
          : 'Not configured - using mock data',
        lastChecked: now,
        metrics: {
          configured: configStatus.configured,
          bucketName: configStatus.bucketName,
          ...stats
        }
      });
    } catch (error) {
      statuses.push({
        component: '☁️ R2 Storage Integration',
        status: 'warning',
        message: `Connection issue: ${error.message}`,
        lastChecked: now
      });
    }

    // Check MCP Servers
    const mcpServers = [
      { name: '📚 Bun MCP Server', script: 'lib/mcp/bun-mcp-server.ts' },
      { name: '🔧 Tools MCP Server', script: 'scripts/fw-tools-mcp.ts' },
      { name: '🌉 MCP Bridge', script: 'scripts/mcp-bridge.ts' }
    ];

    for (const server of mcpServers) {
      try {
        // Check if server script exists and is accessible
        const serverExists = await Bun.file(server.script).exists();
        statuses.push({
          component: server.name,
          status: serverExists ? 'healthy' : 'error',
          message: serverExists ? 'Server script accessible' : 'Server script not found',
          lastChecked: now,
          metrics: { script: server.script, accessible: serverExists }
        });
      } catch (error) {
        statuses.push({
          component: server.name,
          status: 'error',
          message: `Error: ${error.message}`,
          lastChecked: now
        });
      }
    }

    // Check CLI Tools
    const cliTools = [
      { name: '🔍 fw-docs', script: 'scripts/fw-docs.ts' },
      { name: '🩺 interactive-docs', script: 'scripts/interactive-docs.ts' },
      { name: '🎬 demo-r2-mcp', script: 'scripts/demo-r2-mcp.ts' }
    ];

    for (const tool of cliTools) {
      try {
        const toolExists = await Bun.file(tool.script).exists();
        statuses.push({
          component: tool.name,
          status: toolExists ? 'healthy' : 'error',
          message: toolExists ? 'CLI tool accessible' : 'CLI tool not found',
          lastChecked: now,
          metrics: { script: tool.script, accessible: toolExists }
        });
      } catch (error) {
        statuses.push({
          component: tool.name,
          status: 'error',
          message: `Error: ${error.message}`,
          lastChecked: now
        });
      }
    }

    return statuses;
  }

  async collectMetrics(): Promise<DashboardMetrics> {
    const now = new Date();
    
    // Authentication Metrics
    const tokens = masterTokenManager.listTokens();
    const auditLogs = masterTokenManager.getAuditLogs(100);
    const recentAuths = auditLogs.filter(log => 
      new Date(log.timestamp) > new Date(Date.now() - 60 * 60 * 1000)).length;
    const failedAuths = auditLogs.filter(log => !log.success &&
      new Date(log.timestamp) > new Date(Date.now() - 60 * 60 * 1000)).length;

    // Storage Metrics
    let storageMetrics = {
      totalObjects: 0,
      totalSize: '0 B',
      diagnosesCount: 0,
      auditsCount: 0
    };

    try {
      const stats = await r2MCPIntegration.getBucketStats();
      storageMetrics = {
        totalObjects: stats.objectCount,
        totalSize: stats.totalSize,
        diagnosesCount: stats.mcpDataCount,
        auditsCount: Math.floor(stats.mcpDataCount * 0.3) // Estimate
      };
    } catch {
      // Use mock data if R2 not available
      storageMetrics = {
        totalObjects: 243,
        totalSize: '15.7MB',
        diagnosesCount: 85,
        auditsCount: 125
      };
    }

    // Usage Metrics (mock for now, would come from R2 analytics)
    const usageMetrics = {
      totalSearches: 1250,
      totalDiagnoses: 85,
      totalExamples: 320,
      avgResponseTime: 45
    };

    // System Metrics
    const uptime = Date.now() - this.startTime.getTime();
    const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1) + ' MB';

    return {
      authentication: {
        activeTokens: tokens.length,
        expiredTokens: 0, // Would need to track expired tokens
        recentAuths,
        failedAuths
      },
      storage: storageMetrics,
      usage: usageMetrics,
      system: {
        uptime: this.formatUptime(uptime),
        memoryUsage,
        errorRate: failedAuths / Math.max(recentAuths, 1),
        lastRestart: this.startTime.toLocaleString()
      }
    };
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  async displaySystemStatus(): Promise<void> {
    console.log(styled('\n📊 System Status Overview', 'primary'));
    console.log(colorBar('primary', 50));

    const statuses = await this.generateSystemStatus();
    
    statuses.forEach(status => {
      const statusColor = status.status === 'healthy' ? 'success' :
                         status.status === 'warning' ? 'warning' : 'error';
      const statusIcon = status.status === 'healthy' ? '✅' :
                        status.status === 'warning' ? '⚠️' : '❌';
      
      console.log(styled(`${statusIcon} ${status.component}`, statusColor));
      console.log(styled(`   ${status.message}`, 'muted'));
      console.log(styled(`   Last checked: ${new Date(status.lastChecked).toLocaleString()}`, 'muted'));
      
      if (status.metrics) {
        Object.entries(status.metrics).forEach(([key, value]) => {
          if (typeof value !== 'object') {
            console.log(styled(`   • ${key}: ${value}`, 'info'));
          }
        });
      }
      console.log('');
    });
  }

  async displayMetrics(): Promise<void> {
    console.log(styled('\n📈 System Metrics', 'info'));
    console.log(colorBar('info', 50));

    const metrics = await this.collectMetrics();

    // Authentication Metrics
    console.log(styled('\n🔐 Authentication Metrics:', 'accent'));
    console.log(styled(`   Active Tokens: ${metrics.authentication.activeTokens}`, 'primary'));
    console.log(styled(`   Recent Auths (1h): ${metrics.authentication.recentAuths}`, 'success'));
    console.log(styled(`   Failed Auths (1h): ${metrics.authentication.failedAuths}`, 
      metrics.authentication.failedAuths > 0 ? 'warning' : 'success'));

    // Storage Metrics
    console.log(styled('\n☁️ Storage Metrics:', 'accent'));
    console.log(styled(`   Total Objects: ${metrics.storage.totalObjects}`, 'primary'));
    console.log(styled(`   Total Size: ${metrics.storage.totalSize}`, 'info'));
    console.log(styled(`   Diagnoses: ${metrics.storage.diagnosesCount}`, 'success'));
    console.log(styled(`   Audits: ${metrics.storage.auditsCount}`, 'muted'));

    // Usage Metrics
    console.log(styled('\n📊 Usage Metrics:', 'accent'));
    console.log(styled(`   Total Searches: ${metrics.usage.totalSearches}`, 'primary'));
    console.log(styled(`   Total Diagnoses: ${metrics.usage.totalDiagnoses}`, 'success'));
    console.log(styled(`   Total Examples: ${metrics.usage.totalExamples}`, 'info'));
    console.log(styled(`   Avg Response Time: ${metrics.usage.avgResponseTime}ms`, 'muted'));

    // System Metrics
    console.log(styled('\n🖥️ System Metrics:', 'accent'));
    console.log(styled(`   Uptime: ${metrics.system.uptime}`, 'primary'));
    console.log(styled(`   Memory Usage: ${metrics.system.memoryUsage}`, 'info'));
    console.log(styled(`   Error Rate: ${(metrics.system.errorRate * 100).toFixed(1)}%`, 
      metrics.system.errorRate > 0.05 ? 'warning' : 'success'));
    console.log(styled(`   Last Restart: ${metrics.system.lastRestart}`, 'muted'));
    console.log('');
  }

  async displayRecentActivity(): Promise<void> {
    console.log(styled('\n📋 Recent Activity', 'warning'));
    console.log(colorBar('warning', 50));

    // Recent authentication attempts
    const authLogs = masterTokenManager.getAuditLogs(10);
    if (authLogs.length > 0) {
      console.log(styled('\n🔐 Authentication Activity:', 'accent'));
      authLogs.slice(0, 5).forEach(log => {
        const status = log.success ? '✅' : '❌';
        const time = new Date(log.timestamp).toLocaleTimeString();
        console.log(styled(`   ${status} ${time} - ${log.action} - ${log.tokenId.slice(0, 12)}...`, 
          log.success ? 'success' : 'error'));
        if (log.reason) {
          console.log(styled(`      Reason: ${log.reason}`, 'muted'));
        }
      });
    }

    // Recent system events (mock for now)
    console.log(styled('\n🖥️ System Events:', 'accent'));
    const events = [
      { time: '09:24:58', event: 'Diagnosis stored', status: 'success' },
      { time: '09:23:21', event: 'R2 connection test', status: 'success' },
      { time: '09:22:15', event: 'MCP bridge started', status: 'success' },
      { time: '09:20:00', event: 'Dashboard initialized', status: 'success' }
    ];

    events.forEach(event => {
      const icon = event.status === 'success' ? '✅' : '⚠️';
      console.log(styled(`   ${icon} ${event.time} - ${event.event}`, 
        event.status === 'success' ? 'success' : 'warning'));
    });
    console.log('');
  }

  async displayQuickActions(): Promise<void> {
    console.log(styled('\n⚡ Quick Actions', 'primary'));
    console.log(colorBar('primary', 50));

    const actions = [
      { command: 'bun run lib/security/master-token.ts create cli:user', description: 'Create new CLI token' },
      { command: 'bun run test:r2', description: 'Test R2 connection' },
      { command: 'bun run demo:r2', description: 'Run R2 integration demo' },
      { command: 'bun run setup:mcp', description: 'Run MCP setup' },
      { command: 'bun run fw-docs search "Bun.API"', description: 'Test documentation search' },
      { command: 'bun run interactive-docs diagnose "error" context', description: 'Test error diagnosis' }
    ];

    actions.forEach((action, index) => {
      console.log(styled(`${index + 1}. ${action.description}`, 'info'));
      console.log(styled(`   ${action.command}`, 'muted'));
      console.log('');
    });
  }

  async displayTokenManagement(): Promise<void> {
    console.log(styled('\n🔑 Token Management', 'warning'));
    console.log(colorBar('warning', 50));

    const tokens = masterTokenManager.listTokens();
    
    if (tokens.length === 0) {
      console.log(styled('No active tokens found.', 'muted'));
      console.log(styled('Create a token: bun run lib/security/master-token.ts create cli:user', 'info'));
      return;
    }

    console.log(styled(`Active Tokens (${tokens.length}):`, 'accent'));
    tokens.forEach((token, index) => {
      const expiresSoon = new Date(token.expiresAt) < new Date(Date.now() + 6 * 60 * 60 * 1000);
      const statusColor = expiresSoon ? 'warning' : 'success';
      
      console.log(styled(`\n${index + 1}. ${token.tokenId}`, statusColor));
      console.log(styled(`   Permissions: ${token.permissions.join(', ')}`, 'muted'));
      console.log(styled(`   Expires: ${token.expiresAt.toLocaleString()}`, statusColor));
      
      if (token.metadata) {
        Object.entries(token.metadata).forEach(([key, value]) => {
          console.log(styled(`   ${key}: ${value}`, 'info'));
        });
      }
    });

    console.log(styled('\nToken Management Commands:', 'info'));
    console.log(styled('  • List tokens: bun run lib/security/master-token.ts list', 'muted'));
    console.log(styled('  • Revoke token: bun run lib/security/master-token.ts revoke <tokenId>', 'muted'));
    console.log(styled('  • Rotate token: bun run lib/security/master-token.ts rotate <token>', 'muted'));
    console.log('');
  }

  async startMonitoring(refresh: boolean = false): Promise<void> {
    if (refresh) {
      console.clear();
      this.showWelcome();
    }

    while (true) {
      try {
        await this.displaySystemStatus();
        await this.displayMetrics();
        await this.displayRecentActivity();
        await this.displayTokenManagement();
        await this.displayQuickActions();

        console.log(styled('\n🔄 Auto-refresh in 30 seconds... (Press Ctrl+C to exit)', 'muted'));
        
        // Wait for refresh interval or interrupt
        await new Promise(resolve => setTimeout(resolve, this.refreshInterval));
        
        // Clear screen for next refresh
        console.clear();
        this.showWelcome();
        
      } catch (error) {
        console.error(styled(`❌ Dashboard error: ${error.message}`, 'error'));
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  async generateReport(): Promise<void> {
    console.log(styled('\n📄 Generating System Report...', 'info'));
    
    const report = {
      timestamp: new Date().toISOString(),
      systemStatus: await this.generateSystemStatus(),
      metrics: await this.collectMetrics(),
      tokens: masterTokenManager.listTokens(),
      recentActivity: masterTokenManager.getAuditLogs(20)
    };

    const reportPath = `mcp-dashboard-report-${Date.now()}.json`;
    await Bun.write(reportPath, JSON.stringify(report, null, 2));
    
    console.log(styled(`✅ Report saved to: ${reportPath}`, 'success'));
    console.log(styled(`📊 Report includes: System status, metrics, tokens, and activity`, 'info'));
  }
}

// CLI interface
if (import.meta.main) {
  const command = Bun.argv[2];
  const dashboard = new MCPSystemDashboard();

  switch (command) {
    case 'monitor':
    case 'watch':
      const refresh = command === 'watch';
      await dashboard.startMonitoring(refresh);
      break;

    case 'status':
      await dashboard.displaySystemStatus();
      await dashboard.displayMetrics();
      break;

    case 'tokens':
      await dashboard.displayTokenManagement();
      break;

    case 'report':
      await dashboard.generateReport();
      break;

    case 'activity':
      await dashboard.displayRecentActivity();
      break;

    default:
      console.log(styled('🏭 FactoryWager MCP System Dashboard', 'accent'));
      console.log(styled('=====================================', 'accent'));
      console.log('');
      console.log(styled('Commands:', 'primary'));
      console.log(styled('  monitor      - Start real-time monitoring (auto-refresh)', 'info'));
      console.log(styled('  watch        - Start monitoring with screen clearing', 'info'));
      console.log(styled('  status       - Show current system status and metrics', 'info'));
      console.log(styled('  tokens       - Display token management interface', 'info'));
      console.log(styled('  activity     - Show recent system activity', 'info'));
      console.log(styled('  report       - Generate detailed system report', 'info'));
      console.log('');
      console.log(styled('Examples:', 'primary'));
      console.log(styled('  bun run dashboard/mcp-overview.ts monitor', 'muted'));
      console.log(styled('  bun run dashboard/mcp-overview.ts status', 'muted'));
      console.log(styled('  bun run dashboard/mcp-overview.ts tokens', 'muted'));
      console.log('');
  }
}
