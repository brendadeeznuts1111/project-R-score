// lib/versioning/version-cli.ts — CLI for version management and rollbacks

import { write, read } from 'bun';

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
      console.error(
        `❌ Error executing ${command}:`,
        error instanceof Error ? error.message : error
      );
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

    console.info(`📝 Registering version ${version} for component ${component}...`);

    const versionId = await this.tracker.registerVersion(component, version, {
      author,
      description: description || `Version ${version} deployment`,
      dependencies: {}, // Would be parsed from package.json in real implementation
      environment: environment || 'development',
      tags: tags || [],
    });

    console.info(`✅ Version registered successfully!`);
    console.info(`   Version ID: ${versionId}`);
    console.info(`   Component: ${component}`);
    console.info(`   Version: ${version}`);
    console.info(`   Author: ${author}`);
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

      console.info(`🔄 Rolling back component ${component} to version ${version}...`);

      const result = await this.tracker.rollbackToVersion(
        component,
        version,
        rollbackReason,
        author,
        'manual'
      );

      if (result.success) {
        console.info(`✅ Rollback successful!`);
        console.info(`   Component: ${component}`);
        console.info(`   From: ${result.message.split(' from ')[1]?.split(' to ')[0]}`);
        console.info(`   To: ${version}`);
        console.info(`   Reason: ${rollbackReason}`);
      } else {
        console.error(`❌ Rollback failed: ${result.message}`);
      }
    } else if (endpoint) {
      if (!version) {
        console.error('❌ Required: --version for endpoint rollback');
        return;
      }

      console.info(`🔄 Rolling back endpoint ${endpoint} to version ${version}...`);

      const result = await this.tracker.rollbackEndpoint(endpoint, version, rollbackReason, author);

      console.info(`✅ Endpoint rollback completed!`);
      console.info(`   Endpoint: ${endpoint}`);
      console.info(`   Success: ${result.success}`);
      console.info(`   Message: ${result.message}`);

      if (result.components.length > 0) {
        console.info(`   Affected Components:`);
        for (const comp of result.components) {
          console.info(`     - ${comp.uri}: ${comp.success ? '✅' : '❌'} ${comp.message}`);
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
        console.info(JSON.stringify({ current, history }, null, 2));
      } else if (format === 'csv') {
        console.info('Version,Timestamp,Author,Description,Environment,Tags');
        for (const version of history) {
          console.info(
            `"${version.version}","${version.timestamp}","${version.author}","${version.description}","${version.environment}","${version.tags.join(';')}"`
          );
        }
      } else {
        console.info(`📋 Version History for ${component}\n`);

        if (current) {
          console.info(`📍 Current Version: ${current.version} (${current.timestamp})`);
          console.info(`   Author: ${current.author}`);
          console.info(`   Description: ${current.description}\n`);
        }

        console.info(`📚 All Versions:`);
        for (const version of history) {
          const isCurrent = version.version === current?.version;
          const marker = isCurrent ? '📍' : '  ';
          console.info(`${marker} ${version.version}`);
          console.info(`    📅 ${version.timestamp}`);
          console.info(`    👤 ${version.author}`);
          console.info(`    📝 ${version.description}`);
          console.info(`    🏷️  ${version.tags.join(', ')}`);
          console.info(`    🌍 ${version.environment}\n`);
        }
      }
    } else {
      // List all components
      const healthStatus = this.tracker.getHealthStatus();
      const components = Object.keys(healthStatus);

      if (format === 'json') {
        console.info(JSON.stringify(components, null, 2));
      } else if (format === 'csv') {
        console.info('Component,Current Version,Health Status,Error Rate,Uptime');
        for (const component of components) {
          const current = this.tracker.getCurrentVersion(component);
          const status = healthStatus[component];
          console.info(
            `"${component}","${current?.version || 'N/A'}","${status.healthStatus}","${status.errorRate}%","${status.uptimePercentage}%"`
          );
        }
      } else {
        console.info(`📋 All Components (${components.length})\n`);

        for (const component of components) {
          const current = this.tracker.getCurrentVersion(component);
          const status = healthStatus[component];
          const healthIcon =
            status.healthStatus === 'healthy'
              ? '✅'
              : status.healthStatus === 'degraded'
                ? '⚠️'
                : '❌';

          console.info(`${healthIcon} ${component}`);
          console.info(`    📍 Version: ${current?.version || 'N/A'}`);
          console.info(`    🏥 Health: ${status.healthStatus} (${status.errorRate}% error rate)`);
          console.info(`    ⏱️  Uptime: ${status.uptimePercentage}%`);
          console.info(`    👤 Deployed by: ${status.deployedBy}\n`);
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
        console.info(JSON.stringify({ current, health, rollbacks }, null, 2));
      } else {
        console.info(`📊 Status for ${component}\n`);

        if (current) {
          console.info(`📍 Current Version:`);
          console.info(`    Version: ${current.version}`);
          console.info(`    Timestamp: ${current.timestamp}`);
          console.info(`    Author: ${current.author}`);
          console.info(`    Description: ${current.description}`);
          console.info(`    Environment: ${current.environment}`);
          console.info(`    Tags: ${current.tags.join(', ')}\n`);
        }

        if (health) {
          console.info(`🏥 Health Status:`);
          console.info(`    Status: ${health.healthStatus}`);
          console.info(`    Error Rate: ${health.errorRate}%`);
          console.info(`    Uptime: ${health.uptimePercentage}%`);
          console.info(`    Last Deployed: ${health.lastDeployed}`);
          console.info(`    Deployed By: ${health.deployedBy}\n`);
        }

        console.info(`🔄 Rollback Statistics:`);
        console.info(`    Total Rollbacks: ${rollbacks.totalRollbacks}`);
        console.info(`    Success Rate: ${rollbacks.successRate.toFixed(2)}%`);
        console.info(`    Avg Rollback Time: ${rollbacks.averageRollbackTime.toFixed(2)}ms`);
      }
    } else {
      // Overall system status
      const healthStatus = this.tracker.getHealthStatus();
      const rollbackReport = this.tracker.generateRollbackReport();

      const totalComponents = Object.keys(healthStatus).length;
      const healthy = Object.values(healthStatus).filter(s => s.healthStatus === 'healthy').length;
      const degraded = Object.values(healthStatus).filter(
        s => s.healthStatus === 'degraded'
      ).length;
      const failed = Object.values(healthStatus).filter(s => s.healthStatus === 'failed').length;

      if (format === 'json') {
        console.info(
          JSON.stringify(
            {
              summary: { totalComponents, healthy, degraded, failed },
              healthStatus,
              rollbackReport,
            },
            null,
            2
          )
        );
      } else {
        console.info(`📊 System Status Overview\n`);
        console.info(`📈 Summary:`);
        console.info(`    Total Components: ${totalComponents}`);
        console.info(`    ✅ Healthy: ${healthy}`);
        console.info(`    ⚠️  Degraded: ${degraded}`);
        console.info(`    ❌ Failed: ${failed}\n`);

        console.info(`🔄 Rollback Metrics:`);
        console.info(`    Total Rollbacks: ${rollbackReport.totalRollbacks}`);
        console.info(`    Success Rate: ${rollbackReport.successRate.toFixed(2)}%`);
        console.info(`    Average Time: ${rollbackReport.averageRollbackTime.toFixed(2)}ms\n`);

        console.info(`🏥 Component Health:`);
        for (const [component, status] of Object.entries(healthStatus)) {
          const icon =
            status.healthStatus === 'healthy'
              ? '✅'
              : status.healthStatus === 'degraded'
                ? '⚠️'
                : '❌';
          console.info(`    ${icon} ${component}: ${status.errorRate}% error rate`);
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
        uptimePercentage: 95 + Math.random() * 5,
      });
      console.info(`✅ Health metrics updated for ${component}`);
    } else {
      const healthStatus = this.tracker.getHealthStatus();

      if (format === 'json') {
        console.info(JSON.stringify(healthStatus, null, 2));
      } else {
        console.info(`🏥 Health Status Dashboard\n`);

        for (const [component, status] of Object.entries(healthStatus)) {
          const icon =
            status.healthStatus === 'healthy'
              ? '✅'
              : status.healthStatus === 'degraded'
                ? '⚠️'
                : '❌';

          console.info(`${icon} ${component}`);
          console.info(`    Status: ${status.healthStatus}`);
          console.info(`    Error Rate: ${status.errorRate.toFixed(2)}%`);
          console.info(`    Uptime: ${status.uptimePercentage.toFixed(2)}%`);
          console.info(`    Last Deployed: ${status.lastDeployed}\n`);
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
      console.info(JSON.stringify(auditLog, null, 2));
    } else if (format === 'csv') {
      console.info('Timestamp,Action,Component,Version,Author,Details');
      for (const entry of auditLog) {
        console.info(
          `"${entry.timestamp}","${entry.action}","${entry.componentUri}","${entry.version}","${entry.author}","${entry.details}"`
        );
      }
    } else {
      console.info(`📋 Audit Log (${auditLog.length} entries)\n`);

      for (const entry of auditLog) {
        const actionIcon =
          entry.action === 'rollback'
            ? '🔄'
            : entry.action === 'version_registered'
              ? '📝'
              : entry.action === 'rollback_failed'
                ? '❌'
                : '📋';

        console.info(`${actionIcon} ${entry.timestamp}`);
        console.info(`    Action: ${entry.action}`);
        console.info(`    Component: ${entry.componentUri}`);
        console.info(`    Version: ${entry.version}`);
        console.info(`    Author: ${entry.author}`);
        console.info(`    Details: ${entry.details}\n`);
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
      healthSnapshot: component ? healthStatus[component] : healthStatus,
    };

    if (output) {
      await write(output, JSON.stringify(report, null, 2));
      console.info(`📄 Report saved to ${output}`);
    } else if (format === 'json') {
      console.info(JSON.stringify(report, null, 2));
    } else {
      console.info(`📊 Version Tracking Report\n`);
      console.info(`Generated: ${report.timestamp}`);
      console.info(`Component: ${report.component}\n`);

      console.info(`🔄 Rollback Metrics:`);
      console.info(`    Total Rollbacks: ${rollbackReport.totalRollbacks}`);
      console.info(`    Success Rate: ${rollbackReport.successRate.toFixed(2)}%`);
      console.info(`    Average Time: ${rollbackReport.averageRollbackTime.toFixed(2)}ms`);
      console.info(`    Rollbacks by Type:`);
      for (const [type, count] of Object.entries(rollbackReport.rollbackByType)) {
        console.info(`      ${type}: ${count}`);
      }

      if (rollbackReport.recentRollbacks.length > 0) {
        console.info(`\n📈 Recent Rollbacks:`);
        for (const rollback of rollbackReport.recentRollbacks.slice(0, 5)) {
          const statusIcon = rollback.success ? '✅' : '❌';
          console.info(`    ${statusIcon} ${rollback.timestamp}`);
          console.info(`      ${rollback.fromVersion} → ${rollback.toVersion}`);
          console.info(`      Reason: ${rollback.reason}`);
          console.info(`      Duration: ${rollback.rollbackDuration}ms\n`);
        }
      }
    }
  }

  private async handleEndpoint(options: CLIOptions): Promise<void> {
    const { endpoint, component, format } = options;

    if (endpoint && component) {
      await this.tracker.registerEndpoint(endpoint, component);
      console.info(`✅ Endpoint ${endpoint} registered for component ${component}`);
    } else {
      // List all endpoints
      console.info('📋 Endpoint management requires --endpoint and --component for registration');
      console.info('Use --help for more information');
    }
  }

  private async handleMonitor(options: CLIOptions): Promise<void> {
    console.info('🔍 Starting real-time monitoring...');
    console.info('Press Ctrl+C to stop\n');

    const interval = setInterval(async () => {
      const healthStatus = this.tracker.getHealthStatus();
      const timestamp = new Date().toLocaleTimeString();

      console.clear();
      console.info(`🔍 Real-time Monitoring - ${timestamp}\n`);

      for (const [component, status] of Object.entries(healthStatus)) {
        const icon =
          status.healthStatus === 'healthy'
            ? '✅'
            : status.healthStatus === 'degraded'
              ? '⚠️'
              : '❌';

        console.info(`${icon} ${component}`);
        console.info(
          `   Error Rate: ${status.errorRate.toFixed(2)}% | Uptime: ${status.uptimePercentage.toFixed(2)}%`
        );
      }

      console.info('\nPress Ctrl+C to stop');
    }, 2000);

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      clearInterval(interval);
      console.info('\n👋 Monitoring stopped');
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
    console.info(`
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
