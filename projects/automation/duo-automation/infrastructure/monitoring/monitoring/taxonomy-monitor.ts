#!/usr/bin/env bun
// monitoring/taxonomy-monitor.ts - Continuous monitoring for taxonomy health
import { BunSemverTaxonomyValidator } from '../utils/taxonomy-validator-semver';

interface MonitoringConfig {
  intervalMs: number;
  logLevel: 'info' | 'warn' | 'error' | 'silent';
  reportToFile: boolean;
  reportPath: string;
}

class TaxonomyMonitor {
  private validator: BunSemverTaxonomyValidator;
  private config: MonitoringConfig;
  private interval: ReturnType<typeof setInterval> | null = null;
  private startTime: Date = new Date();

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.validator = BunSemverTaxonomyValidator.getInstance();
    this.config = {
      intervalMs: 60000, // 1 minute default
      logLevel: 'info',
      reportToFile: true,
      reportPath: './logs/taxonomy-health.log',
      ...config
    };
  }

  /**
   * Start monitoring
   */
  public start(): void {
    console.log(`🔍 Starting taxonomy monitoring with ${this.config.intervalMs}ms interval`);
    
    // Run initial check
    this.performHealthCheck();
    
    // Set up periodic checks
    this.interval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.intervalMs);

    // Graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  /**
   * Stop monitoring
   */
  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('🛑 Taxonomy monitoring stopped');
      process.exit(0);
    }
  }

  /**
   * Perform health check and log results
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const report = await this.validator.generateReport();
      const uptime = Math.floor(process.uptime());
      
      // Log summary
      const summary = `Health:${report.statistics.errorNodes} errors, ${report.statistics.warningNodes} warnings, ${report.statistics.validNodes} valid (uptime: ${uptime}s)`;
      
      if (this.config.logLevel !== 'silent') {
        if (report.statistics.errorNodes > 0) {
          console.error(`❌ ${summary}`);
          
          // Log error details
          if (this.config.logLevel === 'error' || this.config.logLevel === 'info') {
            report.validationResults
              .filter(r => r.status === 'error')
              .forEach(r => console.error(`   ❗ ${r.nodeId}: ${r.message}`));
          }
        } else if (report.statistics.warningNodes > 0 && (this.config.logLevel === 'warn' || this.config.logLevel === 'info')) {
          console.warn(`⚠️  ${summary}`);
          
          // Log warning details
          if (this.config.logLevel === 'info') {
            report.validationResults
              .filter(r => r.status === 'warning')
              .forEach(r => console.warn(`   ⚠️  ${r.nodeId}: ${r.message}`));
          }
        } else if (this.config.logLevel === 'info') {
          console.log(`✅ ${summary}`);
        }
      }

      // Write to file if enabled
      if (this.config.reportToFile) {
        await this.writeReportToFile(report);
      }

      // Trigger alerts if needed
      if (report.statistics.errorNodes > 0) {
        await this.triggerAlert(report, 'error');
      } else if (report.statistics.warningNodes > 3) {
        await this.triggerAlert(report, 'warning');
      }

    } catch (error) {
      console.error('❌ Health check failed:', error instanceof Error ? error.message : error);
    }
  }

  /**
   * Write report to log file
   */
  private async writeReportToFile(report: any): Promise<void> {
    try {
      const logEntry = {
        timestamp: report.timestamp,
        summary: {
          healthy: report.healthy,
          total: report.statistics.totalNodes,
          valid: report.statistics.validNodes,
          warnings: report.statistics.warningNodes,
          errors: report.statistics.errorNodes
        },
        uptime: Math.floor(process.uptime())
      };

      // Ensure log directory exists
      const logDir = this.config.reportPath.split('/').slice(0, -1).join('/');
      await Bun.$`mkdir -p ${logDir}`.quiet();

      // Append to log file
      const logLine = JSON.stringify(logEntry) + '\n';
      await Bun.write(this.config.reportPath, logLine, { createPath: true });
      
    } catch (error) {
      console.error('Failed to write report to file:', error);
    }
  }

  /**
   * Trigger alert (could be extended to send notifications)
   */
  private async triggerAlert(report: any, type: 'error' | 'warning'): Promise<void> {
    const alert = {
      timestamp: new Date().toISOString(),
      type,
      message: `Taxonomy health ${type}: ${report.statistics.errorNodes} errors, ${report.statistics.warningNodes} warnings`,
      details: report.validationResults.filter((r: any) => r.status === type)
    };

    // Log alert
    console.error(`🚨 ALERT [${type.toUpperCase()}]: ${alert.message}`);
    
    // Could be extended to send to external monitoring systems
    // e.g., Slack, Discord, email, etc.
  }

  /**
   * Get current status
   */
  public async getCurrentStatus(): Promise<any> {
    return await this.validator.generateReport();
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const config: Partial<MonitoringConfig> = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--interval' && args[i + 1]) {
      config.intervalMs = parseInt(args[i + 1]) * 1000; // Convert seconds to ms
      i++;
    } else if (arg === '--log-level' && args[i + 1]) {
      config.logLevel = args[i + 1] as any;
      i++;
    } else if (arg === '--no-file-log') {
      config.reportToFile = false;
    } else if (arg === '--help') {
      console.log(`
Taxonomy Monitor - Continuous health monitoring for versioned taxonomy

Usage: bun run monitoring/taxonomy-monitor.ts [options]

Options:
  --interval <seconds>    Check interval in seconds (default: 60)
  --log-level <level>     Log level: info, warn, error, silent (default: info)
  --no-file-log          Disable file logging
  --help                  Show this help

Examples:
  bun run monitoring/taxonomy-monitor.ts
  bun run monitoring/taxonomy-monitor.ts --interval 30 --log-level warn
      `);
      process.exit(0);
    }
  }

  const monitor = new TaxonomyMonitor(config);
  monitor.start();
}

export { TaxonomyMonitor, type MonitoringConfig };
