#!/usr/bin/env bun
/**
 * 🔄 Version Tracking CLI Tool
 * 
 * Command-line interface for managing versions, rollbacks, and monitoring
 */

import { write, read } from "bun";

import VersionTracker from './version-tracking';

// ============================================================================
// CLI INTERFACES
// ============================================================================

interface CLIOptions {
  command?: string;
  component?: string;
  endpoint?: string;
  version?: string;
  author?: string;
  description?: string;
  reason?: string;
  environment?: 'development' | 'staging' | 'production';
  tags?: string[];
  format?: 'json' | 'table' | 'csv';
  output?: string;
  config?: string;
  help?: boolean;
  verbose?: boolean;
}

interface ComponentConfig {
  uri: string;
  version: string;
  author: string;
  description: string;
  dependencies: Record<string, string>;
  environment: 'development' | 'staging' | 'production';
  tags: string[];
}

// ============================================================================
// CLI CLASS
// ============================================================================

class VersionCLI {
  private tracker: VersionTracker;

  constructor(configPath?: string) {
    const config = configPath ? this.loadConfig(configPath) : {};
    this.tracker = new VersionTracker(config);
  }

  // ============================================================================
  // COMMAND HANDLERS
  // ============================================================================

  async handleCommand(options: CLIOptions): Promise<void> {
    const { command } = options;

    if (!command || options.help) {
      this.showHelp();
      return;
    }

    try {
      switch (command) {
        case 'register':
          await this.handleRegister(options);
          break;
        case 'rollback':
          await this.handleRollback(options);
          break;
        case 'list':
          await this.handleList(options);
          break;
        case 'status':
          await this.handleStatus(options);
          break;
        case 'health':
          await this.handleHealth(options);
          break;
        case 'audit':
          await this.handleAudit(options);
          break;
        case 'report':
          await this.handleReport(options);
          break;
        case 'endpoint':
          await this.handleEndpoint(options);
          break;
        case 'monitor':
          await this.handleMonitor(options);
          break;
        default:
          console.error(`❌ Unknown command: ${command}`);
          this.showHelp();
          process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Error executing ${command}:`, error instanceof Error ? error.message : error);
      if (options.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  }

  // ============================================================================
  // COMMAND IMPLEMENTATIONS
  // ============================================================================

  private async handleRegister(options: CLIOptions): Promise<void> {
    const { component, version, author, description, environment, tags } = options;

    if (!component || !version || !author) {
      console.error('❌ Required: --component, --version, --author');
      return;
    }

    console.log(`📝 Registering version ${version} for component ${component}...`);

    const versionId = await this.tracker.registerVersion(component, version, {
      author,
      description: description || `Version ${version} deployment`,
      dependencies: {}, // Would be parsed from package.json in real implementation
      environment: environment || 'development',
      tags: tags || []
    });

    console.log(`✅ Version registered successfully!`);
    console.log(`   Version ID: ${versionId}`);
    console.log(`   Component: ${component}`);
    console.log(`   Version: ${version}`);
    console.log(`   Author: ${author}`);
  }

  private async handleRollback(options: CLIOptions): Promise<void> {
    const { component, endpoint, version, reason, author } = options;

    if (!author) {
      console.error('❌ Required: --author');
      return;
    }

    if (!component && !endpoint) {
      console.error('❌ Required: --component or --endpoint');
      return;
    }

    const rollbackReason = reason || 'Manual rollback via CLI';

    if (component) {
      if (!version) {
        console.error('❌ Required: --version for component rollback');
        return;
      }

      console.log(`🔄 Rolling back component ${component} to version ${version}...`);

      const result = await this.tracker.rollbackToVersion(
        component,
        version,
        rollbackReason,
        author,
        'manual'
      );

      if (result.success) {
        console.log(`✅ Rollback successful!`);
        console.log(`   Component: ${component}`);
        console.log(`   From: ${result.message.split(' from ')[1]?.split(' to ')[0]}`);
        console.log(`   To: ${version}`);
        console.log(`   Reason: ${rollbackReason}`);
      } else {
        console.error(`❌ Rollback failed: ${result.message}`);
      }
    } else if (endpoint) {
      if (!version) {
        console.error('❌ Required: --version for endpoint rollback');
        return;
      }

      console.log(`🔄 Rolling back endpoint ${endpoint} to version ${version}...`);

      const result = await this.tracker.rollbackEndpoint(endpoint, version, rollbackReason, author);

      console.log(`✅ Endpoint rollback completed!`);
      console.log(`   Endpoint: ${endpoint}`);
      console.log(`   Success: ${result.success}`);
      console.log(`   Message: ${result.message}`);
      
      if (result.components.length > 0) {
        console.log(`   Affected Components:`);
        for (const comp of result.components) {
          console.log(`     - ${comp.uri}: ${comp.success ? '✅' : '❌'} ${comp.message}`);
        }
      }
    }
  }

  private async handleList(options: CLIOptions): Promise<void> {
    const { component, format } = options;

    if (component) {
      const history = this.tracker.getVersionHistory(component);
      const current = this.tracker.getCurrentVersion(component);

      if (format === 'json') {
        console.log(JSON.stringify({ current, history }, null, 2));
      } else if (format === 'csv') {
        console.log('Version,Timestamp,Author,Description,Environment,Tags');
        for (const version of history) {
          console.log(`"${version.version}","${version.timestamp}","${version.author}","${version.description}","${version.environment}","${version.tags.join(';')}"`);
        }
      } else {
        console.log(`📋 Version History for ${component}\n`);
        
        if (current) {
          console.log(`📍 Current Version: ${current.version} (${current.timestamp})`);
          console.log(`   Author: ${current.author}`);
          console.log(`   Description: ${current.description}\n`);
        }

        console.log(`📚 All Versions:`);
        for (const version of history) {
          const isCurrent = version.version === current?.version;
          const marker = isCurrent ? '📍' : '  ';
          console.log(`${marker} ${version.version}`);
          console.log(`    📅 ${version.timestamp}`);
          console.log(`    👤 ${version.author}`);
          console.log(`    📝 ${version.description}`);
          console.log(`    🏷️  ${version.tags.join(', ')}`);
          console.log(`    🌍 ${version.environment}\n`);
        }
      }
    } else {
      // List all components
      const healthStatus = this.tracker.getHealthStatus();
      const components = Object.keys(healthStatus);

      if (format === 'json') {
        console.log(JSON.stringify(components, null, 2));
      } else if (format === 'csv') {
        console.log('Component,Current Version,Health Status,Error Rate,Uptime');
        for (const component of components) {
          const current = this.tracker.getCurrentVersion(component);
          const status = healthStatus[component];
          console.log(`"${component}","${current?.version || 'N/A'}","${status.healthStatus}","${status.errorRate}%","${status.uptimePercentage}%"`);
        }
      } else {
        console.log(`📋 All Components (${components.length})\n`);
        
        for (const component of components) {
          const current = this.tracker.getCurrentVersion(component);
          const status = healthStatus[component];
          const healthIcon = status.healthStatus === 'healthy' ? '✅' : 
                           status.healthStatus === 'degraded' ? '⚠️' : '❌';
          
          console.log(`${healthIcon} ${component}`);
          console.log(`    📍 Version: ${current?.version || 'N/A'}`);
          console.log(`    🏥 Health: ${status.healthStatus} (${status.errorRate}% error rate)`);
          console.log(`    ⏱️  Uptime: ${status.uptimePercentage}%`);
          console.log(`    👤 Deployed by: ${status.deployedBy}\n`);
        }
      }
    }
  }

  private async handleStatus(options: CLIOptions): Promise<void> {
    const { component, format } = options;

    if (component) {
      const current = this.tracker.getCurrentVersion(component);
      const health = this.tracker.getHealthStatus()[component];
      const rollbacks = this.tracker.generateRollbackReport(component);

      if (format === 'json') {
        console.log(JSON.stringify({ current, health, rollbacks }, null, 2));
      } else {
        console.log(`📊 Status for ${component}\n`);
        
        if (current) {
          console.log(`📍 Current Version:`);
          console.log(`    Version: ${current.version}`);
          console.log(`    Timestamp: ${current.timestamp}`);
          console.log(`    Author: ${current.author}`);
          console.log(`    Description: ${current.description}`);
          console.log(`    Environment: ${current.environment}`);
          console.log(`    Tags: ${current.tags.join(', ')}\n`);
        }

        if (health) {
          console.log(`🏥 Health Status:`);
          console.log(`    Status: ${health.healthStatus}`);
          console.log(`    Error Rate: ${health.errorRate}%`);
          console.log(`    Uptime: ${health.uptimePercentage}%`);
          console.log(`    Last Deployed: ${health.lastDeployed}`);
          console.log(`    Deployed By: ${health.deployedBy}\n`);
        }

        console.log(`🔄 Rollback Statistics:`);
        console.log(`    Total Rollbacks: ${rollbacks.totalRollbacks}`);
        console.log(`    Success Rate: ${rollbacks.successRate.toFixed(2)}%`);
        console.log(`    Avg Rollback Time: ${rollbacks.averageRollbackTime.toFixed(2)}ms`);
      }
    } else {
      // Overall system status
      const healthStatus = this.tracker.getHealthStatus();
      const rollbackReport = this.tracker.generateRollbackReport();

      const totalComponents = Object.keys(healthStatus).length;
      const healthy = Object.values(healthStatus).filter(s => s.healthStatus === 'healthy').length;
      const degraded = Object.values(healthStatus).filter(s => s.healthStatus === 'degraded').length;
      const failed = Object.values(healthStatus).filter(s => s.healthStatus === 'failed').length;

      if (format === 'json') {
        console.log(JSON.stringify({
          summary: { totalComponents, healthy, degraded, failed },
          healthStatus,
          rollbackReport
        }, null, 2));
      } else {
        console.log(`📊 System Status Overview\n`);
        console.log(`📈 Summary:`);
        console.log(`    Total Components: ${totalComponents}`);
        console.log(`    ✅ Healthy: ${healthy}`);
        console.log(`    ⚠️  Degraded: ${degraded}`);
        console.log(`    ❌ Failed: ${failed}\n`);

        console.log(`🔄 Rollback Metrics:`);
        console.log(`    Total Rollbacks: ${rollbackReport.totalRollbacks}`);
        console.log(`    Success Rate: ${rollbackReport.successRate.toFixed(2)}%`);
        console.log(`    Average Time: ${rollbackReport.averageRollbackTime.toFixed(2)}ms\n`);

        console.log(`🏥 Component Health:`);
        for (const [component, status] of Object.entries(healthStatus)) {
          const icon = status.healthStatus === 'healthy' ? '✅' : 
                      status.healthStatus === 'degraded' ? '⚠️' : '❌';
          console.log(`    ${icon} ${component}: ${status.errorRate}% error rate`);
        }
      }
    }
  }

  private async handleHealth(options: CLIOptions): Promise<void> {
    const { component, format } = options;

    if (component) {
      await this.tracker.updateHealthMetrics(component, {
        healthStatus: 'healthy',
        errorRate: Math.random() * 2,
        uptimePercentage: 95 + Math.random() * 5
      });
      console.log(`✅ Health metrics updated for ${component}`);
    } else {
      const healthStatus = this.tracker.getHealthStatus();

      if (format === 'json') {
        console.log(JSON.stringify(healthStatus, null, 2));
      } else {
        console.log(`🏥 Health Status Dashboard\n`);
        
        for (const [component, status] of Object.entries(healthStatus)) {
          const icon = status.healthStatus === 'healthy' ? '✅' : 
                      status.healthStatus === 'degraded' ? '⚠️' : '❌';
          
          console.log(`${icon} ${component}`);
          console.log(`    Status: ${status.healthStatus}`);
          console.log(`    Error Rate: ${status.errorRate.toFixed(2)}%`);
          console.log(`    Uptime: ${status.uptimePercentage.toFixed(2)}%`);
          console.log(`    Last Deployed: ${status.lastDeployed}\n`);
        }
      }
    }
  }

  private async handleAudit(options: CLIOptions): Promise<void> {
    const { component, author, format } = options;
    
    const filter: any = {};
    if (component) filter.componentUri = component;
    if (author) filter.author = author;

    const auditLog = this.tracker.getAuditLog(filter);

    if (format === 'json') {
      console.log(JSON.stringify(auditLog, null, 2));
    } else if (format === 'csv') {
      console.log('Timestamp,Action,Component,Version,Author,Details');
      for (const entry of auditLog) {
        console.log(`"${entry.timestamp}","${entry.action}","${entry.componentUri}","${entry.version}","${entry.author}","${entry.details}"`);
      }
    } else {
      console.log(`📋 Audit Log (${auditLog.length} entries)\n`);
      
      for (const entry of auditLog) {
        const actionIcon = entry.action === 'rollback' ? '🔄' :
                          entry.action === 'version_registered' ? '📝' :
                          entry.action === 'rollback_failed' ? '❌' : '📋';
        
        console.log(`${actionIcon} ${entry.timestamp}`);
        console.log(`    Action: ${entry.action}`);
        console.log(`    Component: ${entry.componentUri}`);
        console.log(`    Version: ${entry.version}`);
        console.log(`    Author: ${entry.author}`);
        console.log(`    Details: ${entry.details}\n`);
      }
    }
  }

  private async handleReport(options: CLIOptions): Promise<void> {
    const { component, format, output } = options;

    const rollbackReport = this.tracker.generateRollbackReport(component);
    const healthStatus = this.tracker.getHealthStatus();

    const report = {
      timestamp: new Date().toISOString(),
      component: component || 'all',
      rollbackMetrics: rollbackReport,
      healthSnapshot: component ? healthStatus[component] : healthStatus
    };

    if (output) {
      await write(output, JSON.stringify(report, null, 2));
      console.log(`📄 Report saved to ${output}`);
    } else if (format === 'json') {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`📊 Version Tracking Report\n`);
      console.log(`Generated: ${report.timestamp}`);
      console.log(`Component: ${report.component}\n`);

      console.log(`🔄 Rollback Metrics:`);
      console.log(`    Total Rollbacks: ${rollbackReport.totalRollbacks}`);
      console.log(`    Success Rate: ${rollbackReport.successRate.toFixed(2)}%`);
      console.log(`    Average Time: ${rollbackReport.averageRollbackTime.toFixed(2)}ms`);
      console.log(`    Rollbacks by Type:`);
      for (const [type, count] of Object.entries(rollbackReport.rollbackByType)) {
        console.log(`      ${type}: ${count}`);
      }

      if (rollbackReport.recentRollbacks.length > 0) {
        console.log(`\n📈 Recent Rollbacks:`);
        for (const rollback of rollbackReport.recentRollbacks.slice(0, 5)) {
          const statusIcon = rollback.success ? '✅' : '❌';
          console.log(`    ${statusIcon} ${rollback.timestamp}`);
          console.log(`      ${rollback.fromVersion} → ${rollback.toVersion}`);
          console.log(`      Reason: ${rollback.reason}`);
          console.log(`      Duration: ${rollback.rollbackDuration}ms\n`);
        }
      }
    }
  }

  private async handleEndpoint(options: CLIOptions): Promise<void> {
    const { endpoint, component, format } = options;

    if (endpoint && component) {
      await this.tracker.registerEndpoint(endpoint, component);
      console.log(`✅ Endpoint ${endpoint} registered for component ${component}`);
    } else {
      // List all endpoints
      console.log('📋 Endpoint management requires --endpoint and --component for registration');
      console.log('Use --help for more information');
    }
  }

  private async handleMonitor(options: CLIOptions): Promise<void> {
    console.log('🔍 Starting real-time monitoring...');
    console.log('Press Ctrl+C to stop\n');

    const interval = setInterval(async () => {
      const healthStatus = this.tracker.getHealthStatus();
      const timestamp = new Date().toLocaleTimeString();

      console.clear();
      console.log(`🔍 Real-time Monitoring - ${timestamp}\n`);

      for (const [component, status] of Object.entries(healthStatus)) {
        const icon = status.healthStatus === 'healthy' ? '✅' : 
                    status.healthStatus === 'degraded' ? '⚠️' : '❌';
        
        console.log(`${icon} ${component}`);
        console.log(`   Error Rate: ${status.errorRate.toFixed(2)}% | Uptime: ${status.uptimePercentage.toFixed(2)}%`);
      }

      console.log('\nPress Ctrl+C to stop');
    }, 2000);

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      clearInterval(interval);
      console.log('\n👋 Monitoring stopped');
      process.exit(0);
    });
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private loadConfig(configPath: string): any {
    try {
      const configData = read(configPath);
      return JSON.parse(configData.toString());
    } catch (error) {
      console.warn(`Warning: Could not load config from ${configPath}, using defaults`);
      return {};
    }
  }

  private showHelp(): void {
    console.log(`
🔄 Version Tracking CLI Tool

USAGE:
  version-cli [COMMAND] [OPTIONS]

COMMANDS:
  register     Register a new component version
  rollback     Rollback component or endpoint to previous version
  list         List versions or components
  status       Show status information
  health       Show health metrics
  audit        Show audit log
  report       Generate comprehensive report
  endpoint     Manage endpoint-component mappings
  monitor      Real-time monitoring dashboard

OPTIONS:
  --component <uri>      Component URI
  --endpoint <path>      Endpoint path
  --version <version>    Version string
  --author <email>       Author email
  --description <text>   Version description
  --reason <text>        Rollback reason
  --environment <env>    Environment (dev/staging/prod)
  --tags <tag1,tag2>     Comma-separated tags
  --format <format>      Output format: json, table, csv
  --output <file>        Output file for reports
  --config <file>        Configuration file
  --verbose              Verbose output
  --help                 Show this help

EXAMPLES:
  # Register a new version
  version-cli register --component /api/users/v1 --version 1.2.3 \\
    --author dev@company.com --description "Added user profiles"

  # Rollback to previous version
  version-cli rollback --component /api/users/v1 --version 1.2.2 \\
    --author ops@company.com --reason "Bug in v1.2.3"

  # List all components
  version-cli list

  # Show component history
  version-cli list --component /api/users/v1

  # Show system health
  version-cli health

  # Generate report
  version-cli report --format json --output report.json

  # Real-time monitoring
  version-cli monitor

For more information, see the documentation.
`);
  }
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case 'register':
      case 'rollback':
      case 'list':
      case 'status':
      case 'health':
      case 'audit':
      case 'report':
      case 'endpoint':
      case 'monitor':
        options.command = arg;
        break;
      case '--component':
        options.component = args[++i];
        break;
      case '--endpoint':
        options.endpoint = args[++i];
        break;
      case '--version':
        options.version = args[++i];
        break;
      case '--author':
        options.author = args[++i];
        break;
      case '--description':
        options.description = args[++i];
        break;
      case '--reason':
        options.reason = args[++i];
        break;
      case '--environment':
        options.environment = args[++i] as any;
        break;
      case '--tags':
        options.tags = args[++i]?.split(',').map(t => t.trim());
        break;
      case '--format':
        options.format = args[++i] as any;
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--config':
        options.config = args[++i];
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main(): Promise<void> {
  const options = parseArgs();
  const cli = new VersionCLI(options.config);
  await cli.handleCommand(options);
}

// Execute if run directly
if (import.meta.main) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
