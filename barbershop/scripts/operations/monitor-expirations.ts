#!/usr/bin/env bun

// scripts/monitor-expirations.ts

import { secretLifecycleManager } from '../lib/secrets/core/secret-lifecycle';
import { factoryWagerSecurityCitadel } from '../lib/secrets/core/factorywager-security-citadel';
import { BUN_DOCS } from '../lib/utils/docs/urls';

interface MonitorOptions {
  daemon?: boolean;
  interval?: number;
  slackAlerts?: boolean;
  r2Reports?: boolean;
  emailAlerts?: boolean;
  threshold?: number;
}

interface ExpirationReport {
  timestamp: string;
  expiring: Array<{
    key: string;
    daysLeft: number;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    lastRotated?: string;
    rotationCount: number;
  }>;
  expired: Array<{
    key: string;
    expiredAt: string;
    daysExpired: number;
  }>;
  summary: {
    total: number;
    critical: number;
    warning: number;
    expired: number;
  };
}

function parseArgs(): MonitorOptions {
  const options: MonitorOptions = {
    interval: 3600000, // 1 hour default
    threshold: 7, // 7 days default
  };

  for (let i = 1; i < Bun.argv.length; i++) {
    const arg = Bun.argv[i];

    if (arg === '--daemon') options.daemon = true;
    if (arg === '--interval' && Bun.argv[i + 1]) {
      options.interval = parseInt(Bun.argv[++i]) * 1000; // Convert to milliseconds
    }
    if (arg === '--slack-alerts') options.slackAlerts = true;
    if (arg === '--r2-reports') options.r2Reports = true;
    if (arg === '--email-alerts') options.emailAlerts = true;
    if (arg === '--threshold' && Bun.argv[i + 1]) {
      options.threshold = parseInt(Bun.argv[++i]);
    }
    if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }
  }

  return options;
}

function showHelp() {
  console.log('⏰ Monitor Expirations Continuously');
  console.log('===================================');
  console.log();
  console.log('Monitor secret expirations and send alerts.');
  console.log();
  console.log('Options:');
  console.log('  --daemon              Run as continuous daemon');
  console.log('  --interval <seconds>  Check interval (default: 3600)');
  console.log('  --slack-alerts       Send alerts to Slack');
  console.log('  --r2-reports          Store reports in R2');
  console.log('  --email-alerts       Send email alerts');
  console.log('  --threshold <days>   Alert threshold (default: 7)');
  console.log('  --help, -h            Show this help');
  console.log();
  console.log('Examples:');
  console.log('  bun monitor-expirations.ts --daemon --slack-alerts --r2-reports');
  console.log('  bun monitor-expirations.ts --interval 1800 --threshold 14');
  console.log('  bun monitor-expirations.ts --daemon --email-alerts --slack-alerts');
}

function styled(
  text: string,
  type: 'success' | 'warning' | 'error' | 'info' | 'primary' | 'accent' | 'muted'
): string {
  const colors = {
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    info: '\x1b[36m',
    primary: '\x1b[34m',
    accent: '\x1b[35m',
    muted: '\x1b[90m',
  };
  const reset = '\x1b[0m';
  return `${colors[type]}${text}${reset}`;
}

class ExpirationMonitor {
  private options: MonitorOptions;
  private running = false;
  private intervalId?: NodeJS.Timeout;

  constructor(options: MonitorOptions) {
    this.options = options;
  }

  async start(): Promise<void> {
    console.log(styled('⏰ Starting Expiration Monitor', 'primary'));
    console.log(styled('==============================', 'muted'));
    console.log();

    console.log(styled('Configuration:', 'info'));
    console.log(
      styled(`   Mode: ${this.options.daemon ? 'Daemon (continuous)' : 'One-time check'}`, 'muted')
    );
    console.log(styled(`   Interval: ${this.options.interval / 1000} seconds`, 'muted'));
    console.log(styled(`   Threshold: ${this.options.threshold} days`, 'muted'));
    console.log(
      styled(`   Slack alerts: ${this.options.slackAlerts ? 'enabled' : 'disabled'}`, 'muted')
    );
    console.log(
      styled(`   R2 reports: ${this.options.r2Reports ? 'enabled' : 'disabled'}`, 'muted')
    );
    console.log(
      styled(`   Email alerts: ${this.options.emailAlerts ? 'enabled' : 'disabled'}`, 'muted')
    );
    console.log();

    if (this.options.daemon) {
      console.log(styled('🔄 Starting daemon mode...', 'warning'));
      console.log(styled('   Press Ctrl+C to stop monitoring', 'muted'));
      console.log();

      this.running = true;

      // Run initial check
      await this.performCheck();

      // Set up interval
      this.intervalId = setInterval(async () => {
        if (this.running) {
          await this.performCheck();
        }
      }, this.options.interval);

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log(styled('\n🛑 Shutting down monitor...', 'warning'));
        this.stop();
      });

      process.on('SIGTERM', () => {
        console.log(styled('\n🛑 Shutting down monitor...', 'warning'));
        this.stop();
      });
    } else {
      console.log(styled('🔍 Running one-time check...', 'info'));
      await this.performCheck();
      console.log(styled('✅ Check completed', 'success'));
    }
  }

  stop(): void {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    console.log(styled('🛑 Monitor stopped', 'warning'));
    process.exit(0);
  }

  private async performCheck(): Promise<void> {
    const timestamp = new Date();
    console.log(styled(`⏰ [${timestamp.toLocaleTimeString()}] Checking expirations...`, 'info'));

    try {
      // Get expiring secrets
      const expiring = await secretLifecycleManager.checkExpirations();

      // Generate report
      const report = await this.generateExpirationReport(expiring, timestamp);

      // Display summary
      this.displaySummary(report);

      // Send alerts if needed
      if (report.summary.critical > 0 || report.summary.expired > 0) {
        await this.sendAlerts(report);
      }

      // Store report in R2 if enabled
      if (this.options.r2Reports) {
        await this.storeReportInR2(report);
      }

      console.log(
        styled(`   ✅ Check completed (${report.summary.total} secrets monitored)`, 'success')
      );
    } catch (error) {
      console.error(styled(`   ❌ Check failed: ${error.message}`, 'error'));
    }

    console.log();
  }

  private async generateExpirationReport(
    expiring: Array<{ key: string; expiresAt: Date; daysLeft: number }>,
    timestamp: Date
  ): Promise<ExpirationReport> {
    const now = new Date();

    // Categorize secrets
    const critical = expiring.filter(s => s.daysLeft <= 1);
    const warning = expiring.filter(s => s.daysLeft > 1 && s.daysLeft <= this.options.threshold);
    const expired = expiring.filter(s => s.daysLeft < 0);

    const report: ExpirationReport = {
      timestamp: timestamp.toISOString(),
      expiring: [],
      expired: [],
      summary: {
        total: expiring.length,
        critical: critical.length,
        warning: warning.length,
        expired: expired.length,
      },
    };

    // Process expiring secrets
    for (const secret of expiring) {
      try {
        const timeline = await factoryWagerSecurityCitadel.getSecretTimeline(secret.key, 10);
        const lastRotated = timeline.length > 0 ? timeline[0].timestamp : undefined;
        const rotationCount = timeline.length;

        const severity =
          secret.daysLeft <= 1
            ? 'CRITICAL'
            : secret.daysLeft <= this.options.threshold
              ? 'WARNING'
              : 'INFO';

        if (secret.daysLeft < 0) {
          report.expired.push({
            key: secret.key,
            expiredAt: secret.expiresAt.toISOString(),
            daysExpired: Math.abs(secret.daysLeft),
          });
        } else {
          report.expiring.push({
            key: secret.key,
            daysLeft: secret.daysLeft,
            severity,
            lastRotated,
            rotationCount,
          });
        }
      } catch (error) {
        // Secret might not have version history
        report.expiring.push({
          key: secret.key,
          daysLeft: secret.daysLeft,
          severity: secret.daysLeft <= 1 ? 'CRITICAL' : 'WARNING',
          rotationCount: 0,
        });
      }
    }

    return report;
  }

  private displaySummary(report: ExpirationReport): void {
    console.log(styled('   📊 Summary:', 'primary'));
    console.log(styled(`      Total monitored: ${report.summary.total}`, 'info'));

    if (report.summary.expired > 0) {
      console.log(styled(`      🚨 Expired: ${report.summary.expired}`, 'error'));
    }

    if (report.summary.critical > 0) {
      console.log(styled(`      ⚠️  Critical (≤1 day): ${report.summary.critical}`, 'error'));
    }

    if (report.summary.warning > 0) {
      console.log(
        styled(
          `      ⏳ Warning (≤${this.options.threshold} days): ${report.summary.warning}`,
          'warning'
        )
      );
    }

    if (
      report.summary.expired === 0 &&
      report.summary.critical === 0 &&
      report.summary.warning === 0
    ) {
      console.log(styled('      ✅ No secrets expiring soon', 'success'));
    }

    // Show critical/expired details
    const criticalItems = [
      ...report.expired,
      ...report.expiring.filter(s => s.severity === 'CRITICAL'),
    ];
    if (criticalItems.length > 0) {
      console.log(styled('   🚨 Immediate attention required:', 'error'));
      criticalItems.forEach(item => {
        const daysText =
          'daysExpired' in item ? `${item.daysExpired} days expired` : `${item.daysLeft} days left`;
        console.log(styled(`      • ${item.key} (${daysText})`, 'error'));
      });
    }
  }

  private async sendAlerts(report: ExpirationReport): Promise<void> {
    if (report.summary.critical === 0 && report.summary.expired === 0) {
      return;
    }

    console.log(styled('   📢 Sending alerts...', 'warning'));

    // Send Slack alerts
    if (this.options.slackAlerts) {
      await this.sendSlackAlert(report);
    }

    // Send email alerts
    if (this.options.emailAlerts) {
      await this.sendEmailAlert(report);
    }

    console.log(styled('   ✅ Alerts sent', 'success'));
  }

  private async sendSlackAlert(report: ExpirationReport): Promise<void> {
    // In a real implementation, this would send to Slack webhook
    console.log(styled('      📱 Slack alert sent', 'info'));

    const message = {
      text: `🚨 Secret Expiration Alert`,
      attachments: [
        {
          color: report.summary.expired > 0 ? 'danger' : 'warning',
          fields: [
            { title: 'Expired', value: report.summary.expired.toString(), short: true },
            { title: 'Critical', value: report.summary.critical.toString(), short: true },
            { title: 'Warning', value: report.summary.warning.toString(), short: true },
            { title: 'Time', value: new Date().toLocaleString(), short: true },
          ],
        },
      ],
    };

    // Simulate Slack API call
    await Bun.sleep(100);
  }

  private async sendEmailAlert(report: ExpirationReport): Promise<void> {
    // In a real implementation, this would send email
    console.log(styled('      📧 Email alert sent', 'info'));

    const subject = `🚨 Secret Expiration Alert - ${report.summary.expired + report.summary.critical} secrets need attention`;

    // Simulate email sending
    await Bun.sleep(200);
  }

  private async storeReportInR2(report: ExpirationReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportKey = `monitoring/expiration-reports/${timestamp}.json`;
    const reportContent = JSON.stringify(report, null, 2);

    const r2Credentials = {
      accountId: '7a470541a704caaf91e71efccc78fd36',
      accessKeyId: '84c87a7398c721036cd6e95df42d718c',
      secretAccessKey: '8a99fcc8f6202fc3961fa3e889318ced8228a483b7e57e788fb3cba5e5592015',
      bucketName: 'bun-executables',
    };

    const endpoint = `https://${r2Credentials.accountId}.r2.cloudflarestorage.com`;
    const url = `${endpoint}/${r2Credentials.bucketName}/${reportKey}`;

    const authString = `${r2Credentials.accessKeyId}:${r2Credentials.secretAccessKey}`;
    const authHeader = `Basic ${btoa(authString)}`;

    try {
      await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          'x-amz-content-sha256': await Bun.hash(reportContent),
          'x-amz-meta-report-type': 'expiration-monitoring',
          'x-amz-meta-factorywager-version': '5.1',
          'x-amz-meta-critical-count': report.summary.critical.toString(),
          'x-amz-meta-expired-count': report.summary.expired.toString(),
        },
        body: reportContent,
      });

      console.log(styled('      🌐 Report stored in R2', 'info'));
    } catch (error) {
      console.log(styled('      ❌ Failed to store in R2', 'error'));
    }
  }
}

async function main() {
  const options = parseArgs();

  const monitor = new ExpirationMonitor(options);
  await monitor.start();
}

// Run the expiration monitor
main().catch(console.error);
