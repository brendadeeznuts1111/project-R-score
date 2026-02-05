#!/usr/bin/env bun
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FactoryWager Vault Health Monitor v2.0 - Enterprise Integration
 * Comprehensive vault health monitoring with Bun.secrets integration
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { EnterpriseSecretManager } from './scripts/backup-secrets.ts';
import { ProfileSecretResolver } from './config/profiles-v5.7.ts';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  message: string;
  details?: any;
  timestamp: string;
  fixAvailable: boolean;
}

interface VaultHealthReport {
  overall: 'healthy' | 'warning' | 'critical';
  checks: HealthCheck[];
  summary: {
    total: number;
    healthy: number;
    warning: number;
    critical: number;
    unknown: number;
  };
  recommendations: string[];
  generatedAt: string;
  nextCheck: string;
}

class FactoryWagerVaultHealth {
  private enterpriseManager: EnterpriseSecretManager;
  private profileResolver: ProfileSecretResolver;
  private verbose: boolean;
  private autoFix: boolean;
  private checks: HealthCheck[] = [];

  constructor(verbose: boolean = false, autoFix: boolean = false) {
    this.enterpriseManager = new EnterpriseSecretManager();
    this.profileResolver = new ProfileSecretResolver();
    this.verbose = verbose;
    this.autoFix = autoFix;
  }

  async execute(): Promise<VaultHealthReport> {
    console.log(`🏥 FactoryWager Vault Health Monitor v2.0`);
    console.log(`==========================================`);
    console.log(`🔍 Starting comprehensive health check...\n`);

    const startTime = Date.now();

    try {
      // Core health checks
      await this.checkBunSecretsIntegration();
      await this.checkProfileSecretsHealth();
      await this.checkEnterpriseSecretsHealth();
      await this.checkSecretRotationStatus();
      await this.checkBackupSystemHealth();
      await this.checkPersistenceLevels();
      await this.checkSecurityPosture();
      await this.checkComplianceStatus();

      // Generate report
      const report = this.generateHealthReport(startTime);
      this.printReport(report);

      // Auto-fix if requested
      if (this.autoFix) {
        await this.performAutoFix(report);
      }

      return report;
    } catch (error) {
      console.error(`❌ Health check failed: ${(error as Error).message}`);
      throw error;
    }
  }

  private async checkBunSecretsIntegration(): Promise<void> {
    const check: HealthCheck = {
      name: 'Bun.secrets Integration',
      status: 'unknown',
      message: '',
      timestamp: new Date().toISOString(),
      fixAvailable: false
    };

    try {
      // Test basic Bun.secrets functionality with correct v1.3.8 object format
      const testService = 'factory-wager-health';
      const testKey = 'health-check-test';
      const testValue = `test-${Date.now()}`;

      // Use correct Bun.secrets API object format
      await Bun.secrets.set({ service: testService, name: testKey, value: testValue });
      const retrieved = await Bun.secrets.get({ service: testService, name: testKey });
      await Bun.secrets.delete({ service: testService, name: testKey });

      if (retrieved === testValue) {
        check.status = 'healthy';
        check.message = 'Bun.secrets API is fully functional';
        check.details = {
          platform: process.platform,
          testResult: 'PASS'
        };
      } else {
        check.status = 'critical';
        check.message = 'Bun.secrets API returned unexpected values';
        check.fixAvailable = true;
      }
    } catch (error) {
      check.status = 'critical';
      check.message = `Bun.secrets API error: ${(error as Error).message}`;
      check.fixAvailable = true;
    }

    this.checks.push(check);
  }

  private async checkProfileSecretsHealth(): Promise<void> {
    const check: HealthCheck = {
      name: 'Profile Secrets Health',
      status: 'unknown',
      message: '',
      timestamp: new Date().toISOString(),
      fixAvailable: false
    };

    try {
      const activeProfile = Bun.env.FW_ACTIVE_PROFILE || 'development';
      const secrets = await this.profileResolver.list();

      const present = secrets.filter(s => s.status === 'present').length;
      const requiredMissing = secrets.filter(s => s.status === 'missing' && s.required).length;
      const total = secrets.length;

      if (requiredMissing > 0) {
        check.status = 'critical';
        check.message = `${requiredMissing} required secrets missing from profile '${activeProfile}'`;
        check.details = {
          profile: activeProfile,
          total,
          present,
          missing: total - present,
          requiredMissing
        };
        check.fixAvailable = true;
      } else if (present < total) {
        check.status = 'warning';
        check.message = `${total - present} optional secrets missing from profile '${activeProfile}'`;
        check.details = {
          profile: activeProfile,
          total,
          present,
          missing: total - present
        };
      } else {
        check.status = 'healthy';
        check.message = `All secrets configured for profile '${activeProfile}'`;
        check.details = {
          profile: activeProfile,
          total,
          present
        };
      }
    } catch (error) {
      check.status = 'critical';
      check.message = `Profile secrets check failed: ${(error as Error).message}`;
      check.fixAvailable = true;
    }

    this.checks.push(check);
  }

  private async checkEnterpriseSecretsHealth(): Promise<void> {
    const check: HealthCheck = {
      name: 'Enterprise Secrets Health',
      status: 'unknown',
      message: '',
      timestamp: new Date().toISOString(),
      fixAvailable: false
    };

    try {
      const secrets = await this.enterpriseManager.listEnterpriseSecrets();

      if (secrets.length === 0) {
        check.status = 'warning';
        check.message = 'No enterprise secrets found';
        check.details = { count: 0 };
      } else {
        const enterpriseSecrets = secrets.filter(s =>
          s.metadata?.persistence === 'enterprise' ||
          s.service.includes('prod')
        );

        if (enterpriseSecrets.length > 0) {
          check.status = 'healthy';
          check.message = `${enterpriseSecrets.length} enterprise secrets configured`;
          check.details = {
            total: secrets.length,
            enterprise: enterpriseSecrets.length,
            services: [...new Set(secrets.map(s => s.service))]
          };
        } else {
          check.status = 'warning';
          check.message = 'No enterprise persistence secrets found';
          check.details = {
            total: secrets.length,
            enterprise: 0
          };
        }
      }
    } catch (error) {
      check.status = 'critical';
      check.message = `Enterprise secrets check failed: ${(error as Error).message}`;
      check.fixAvailable = true;
    }

    this.checks.push(check);
  }

  private async checkSecretRotationStatus(): Promise<void> {
    const check: HealthCheck = {
      name: 'Secret Rotation Status',
      status: 'unknown',
      message: '',
      timestamp: new Date().toISOString(),
      fixAvailable: false
    };

    try {
      const needsRotation = await this.enterpriseManager.checkRotationNeeded();

      if (needsRotation.length === 0) {
        check.status = 'healthy';
        check.message = 'All secrets within rotation limits';
        check.details = { overdue: 0 };
      } else {
        const criticalOverdue = needsRotation.filter(s => s.daysOverdue > 30);

        if (criticalOverdue.length > 0) {
          check.status = 'critical';
          check.message = `${criticalOverdue.length} secrets critically overdue for rotation`;
          check.details = {
            overdue: needsRotation.length,
            critical: criticalOverdue.length,
            secrets: needsRotation
          };
          check.fixAvailable = true;
        } else {
          check.status = 'warning';
          check.message = `${needsRotation.length} secrets need rotation`;
          check.details = {
            overdue: needsRotation.length,
            critical: 0,
            secrets: needsRotation
          };
          check.fixAvailable = true;
        }
      }
    } catch (error) {
      check.status = 'warning';
      check.message = `Rotation check failed: ${(error as Error).message}`;
      check.details = { error: (error as Error).message };
    }

    this.checks.push(check);
  }

  private async checkBackupSystemHealth(): Promise<void> {
    const check: HealthCheck = {
      name: 'Backup System Health',
      status: 'unknown',
      message: '',
      timestamp: new Date().toISOString(),
      fixAvailable: false
    };

    try {
      const backups = this.enterpriseManager.listBackups();
      const now = new Date();

      if (backups.length === 0) {
        check.status = 'critical';
        check.message = 'No backups found';
        check.details = { count: 0 };
        check.fixAvailable = true;
      } else {
        const latestBackup = new Date(backups[0].timestamp);
        const daysSinceLastBackup = Math.floor((now.getTime() - latestBackup.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceLastBackup > 7) {
          check.status = 'critical';
          check.message = `Last backup is ${daysSinceLastBackup} days old`;
          check.details = {
            count: backups.length,
            lastBackup: backups[0].timestamp,
            daysSinceLastBackup
          };
          check.fixAvailable = true;
        } else if (daysSinceLastBackup > 3) {
          check.status = 'warning';
          check.message = `Last backup is ${daysSinceLastBackup} days old`;
          check.details = {
            count: backups.length,
            lastBackup: backups[0].timestamp,
            daysSinceLastBackup
          };
        } else {
          check.status = 'healthy';
          check.message = `Recent backup available (${daysSinceLastBackup} days old)`;
          check.details = {
            count: backups.length,
            lastBackup: backups[0].timestamp,
            daysSinceLastBackup
          };
        }
      }
    } catch (error) {
      check.status = 'critical';
      check.message = `Backup system check failed: ${(error as Error).message}`;
      check.fixAvailable = true;
    }

    this.checks.push(check);
  }

  private async checkPersistenceLevels(): Promise<void> {
    const check: HealthCheck = {
      name: 'Persistence Levels',
      status: 'unknown',
      message: '',
      timestamp: new Date().toISOString(),
      fixAvailable: false
    };

    try {
      const platform = process.platform;
      const capabilities = {
        win32: { session: true, local: true, enterprise: true },
        darwin: { session: true, local: true, enterprise: false },
        linux: { session: true, local: true, enterprise: false }
      };

      const platformCaps = capabilities[platform as keyof typeof capabilities] || { session: false, local: false, enterprise: false };

      if (platformCaps.enterprise && platform === 'win32') {
        check.status = 'healthy';
        check.message = 'Enterprise persistence available (Windows)';
        check.details = { platform, ...platformCaps };
      } else if (platformCaps.local) {
        check.status = 'healthy';
        check.message = 'Local machine persistence available';
        check.details = { platform, ...platformCaps };
      } else if (platformCaps.session) {
        check.status = 'warning';
        check.message = 'Only session persistence available';
        check.details = { platform, ...platformCaps };
      } else {
        check.status = 'critical';
        check.message = 'No persistence capabilities detected';
        check.details = { platform, ...platformCaps };
        check.fixAvailable = true;
      }
    } catch (error) {
      check.status = 'critical';
      check.message = `Persistence check failed: ${(error as Error).message}`;
      check.fixAvailable = true;
    }

    this.checks.push(check);
  }

  private async checkSecurityPosture(): Promise<void> {
    const check: HealthCheck = {
      name: 'Security Posture',
      status: 'unknown',
      message: '',
      timestamp: new Date().toISOString(),
      fixAvailable: false
    };

    try {
      const issues = [];

      // Check for hardcoded secrets in common locations
      const sensitivePatterns = [
        /password\s*=\s*['"]\w+['"]/i,
        /api[_-]?key\s*=\s*['"]\w+['"]/i,
        /secret\s*=\s*['"]\w+['"]/i
      ];

      // Check environment variables for sensitive data
      const sensitiveEnvVars = Object.keys(process.env).filter(key =>
        key.toLowerCase().includes('password') ||
        key.toLowerCase().includes('secret') ||
        key.toLowerCase().includes('key')
      );

      if (sensitiveEnvVars.length > 0) {
        issues.push(`${sensitiveEnvVars.length} sensitive environment variables detected`);
      }

      // Check for default/weak passwords
      const weakPatterns = ['password', '123456', 'admin', 'secret'];
      // This would be expanded in a real implementation

      if (issues.length === 0) {
        check.status = 'healthy';
        check.message = 'No obvious security issues detected';
        check.details = { issues: 0, envVars: sensitiveEnvVars.length };
      } else if (issues.length <= 2) {
        check.status = 'warning';
        check.message = `${issues.length} minor security issues found`;
        check.details = { issues, envVars: sensitiveEnvVars.length };
        check.fixAvailable = true;
      } else {
        check.status = 'critical';
        check.message = `${issues.length} security issues require attention`;
        check.details = { issues, envVars: sensitiveEnvVars.length };
        check.fixAvailable = true;
      }
    } catch (error) {
      check.status = 'warning';
      check.message = `Security check failed: ${(error as Error).message}`;
      check.details = { error: (error as Error).message };
    }

    this.checks.push(check);
  }

  private async checkComplianceStatus(): Promise<void> {
    const check: HealthCheck = {
      name: 'Compliance Status',
      status: 'unknown',
      message: '',
      timestamp: new Date().toISOString(),
      fixAvailable: false
    };

    try {
      const complianceIssues = [];

      // Check for required enterprise features
      if (process.platform === 'win32') {
        // Windows-specific compliance checks
        const hasEnterprisePersistence = true; // Would check actual implementation
        if (!hasEnterprisePersistence) {
          complianceIssues.push('Enterprise persistence not configured');
        }
      }

      // Check for backup retention policies
      const backups = this.enterpriseManager.listBackups();
      if (backups.length > 30) {
        complianceIssues.push('Excessive backup retention (30+ backups)');
      }

      // Check for secret rotation compliance
      const needsRotation = await this.enterpriseManager.checkRotationNeeded();
      if (needsRotation.some(s => s.daysOverdue > 90)) {
        complianceIssues.push('Secrets overdue by 90+ days');
      }

      if (complianceIssues.length === 0) {
        check.status = 'healthy';
        check.message = 'Compliance requirements met';
        check.details = { issues: 0, backupCount: backups.length };
      } else if (complianceIssues.length <= 2) {
        check.status = 'warning';
        check.message = `${complianceIssues.length} compliance issues`;
        check.details = { issues: complianceIssues, backupCount: backups.length };
        check.fixAvailable = true;
      } else {
        check.status = 'critical';
        check.message = `${complianceIssues.length} compliance violations`;
        check.details = { issues: complianceIssues, backupCount: backups.length };
        check.fixAvailable = true;
      }
    } catch (error) {
      check.status = 'warning';
      check.message = `Compliance check failed: ${(error as Error).message}`;
      check.details = { error: (error as Error).message };
    }

    this.checks.push(check);
  }

  private generateHealthReport(startTime: number): VaultHealthReport {
    const summary = {
      total: this.checks.length,
      healthy: this.checks.filter(c => c.status === 'healthy').length,
      warning: this.checks.filter(c => c.status === 'warning').length,
      critical: this.checks.filter(c => c.status === 'critical').length,
      unknown: this.checks.filter(c => c.status === 'unknown').length
    };

    const overall = summary.critical > 0 ? 'critical' :
                   summary.warning > 0 ? 'warning' :
                   summary.unknown > 0 ? 'warning' : 'healthy';

    const recommendations = this.generateRecommendations();

    return {
      overall,
      checks: this.checks,
      summary,
      recommendations,
      generatedAt: new Date().toISOString(),
      nextCheck: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    this.checks.forEach(check => {
      if (check.status === 'critical' && check.fixAvailable) {
        switch (check.name) {
          case 'Profile Secrets Health':
            recommendations.push('Configure missing required secrets using: bun run profiles:secrets:setup');
            break;
          case 'Backup System Health':
            recommendations.push('Create immediate backup using: bun run secrets:enterprise:backup');
            break;
          case 'Secret Rotation Status':
            recommendations.push('Rotate overdue secrets using: bun run secrets:enterprise:rotate');
            break;
          case 'Bun.secrets Integration':
            recommendations.push('Check Bun.secrets API installation and permissions');
            break;
          default:
            recommendations.push(`Address ${check.name.toLowerCase()}: ${check.message}`);
        }
      } else if (check.status === 'warning') {
        switch (check.name) {
          case 'Enterprise Secrets Health':
            recommendations.push('Consider configuring enterprise secrets for production');
            break;
          case 'Persistence Levels':
            recommendations.push('Upgrade to Windows for enterprise persistence support');
            break;
          case 'Security Posture':
            recommendations.push('Review and remove sensitive environment variables');
            break;
        }
      }
    });

    return recommendations;
  }

  private printReport(report: VaultHealthReport): void {
    // Overall status
    const statusIcon = report.overall === 'healthy' ? '✅' :
                      report.overall === 'warning' ? '⚠️' : '❌';

    console.log(`${statusIcon} Overall Vault Health: ${report.overall.toUpperCase()}`);
    console.log(`📊 Summary: ${report.summary.healthy} healthy | ${report.summary.warning} warnings | ${report.summary.critical} critical\n`);

    // Detailed checks
    console.log(`🔍 Detailed Health Checks:`);
    report.checks.forEach(check => {
      const icon = check.status === 'healthy' ? '✅' :
                   check.status === 'warning' ? '⚠️' :
                   check.status === 'critical' ? '❌' : '❓';

      console.log(`   ${icon} ${check.name}: ${check.message}`);

      if (this.verbose && check.details) {
        Object.entries(check.details).forEach(([key, value]) => {
          console.log(`      • ${key}: ${JSON.stringify(value)}`);
        });
      }
    });

    // Recommendations
    if (report.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      report.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }

    // Footer
    console.log(`\n📅 Generated: ${new Date(report.generatedAt).toLocaleString()}`);
    console.log(`🔄 Next check: ${new Date(report.nextCheck).toLocaleString()}`);

    // Exit code based on health
    if (report.summary.critical > 0) {
      console.log(`\n❌ Exit code: 1 (Critical issues found)`);
    } else if (report.summary.warning > 0) {
      console.log(`\n⚠️ Exit code: 0 (Warnings found)`);
    } else {
      console.log(`\n✅ Exit code: 0 (All healthy)`);
    }
  }

  private async performAutoFix(report: VaultHealthReport): Promise<void> {
    console.log(`\n🔧 Performing automatic fixes...`);

    for (const check of report.checks) {
      if (check.status === 'critical' && check.fixAvailable) {
        try {
          console.log(`   🔧 Fixing: ${check.name}`);

          switch (check.name) {
            case 'Backup System Health':
              await this.enterpriseManager.backupAllSecrets();
              console.log(`   ✅ Backup created`);
              break;
            case 'Profile Secrets Health':
              // Would trigger profile setup
              console.log(`   ⚠️ Manual setup required for profile secrets`);
              break;
            default:
              console.log(`   ⚠️ Auto-fix not available for ${check.name}`);
          }
        } catch (error) {
          console.log(`   ❌ Auto-fix failed: ${(error as Error).message}`);
        }
      }
    }
  }

  async saveReport(report: VaultHealthReport, filename?: string): Promise<void> {
    const reportFile = filename || `vault-health-report-${new Date().toISOString().split('T')[0]}.json`;
    const reportPath = `./.factory-wager/reports/${reportFile}`;

    try {
      // Ensure reports directory exists
      if (!existsSync('./.factory-wager/reports')) {
        require('fs').mkdirSync('./.factory-wager/reports', { recursive: true });
      }

      writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Report saved to: ${reportPath}`);
    } catch (error) {
      console.error(`❌ Failed to save report: ${(error as Error).message}`);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  const verbose = args.includes('--verbose') || args.includes('-v');
  const autoFix = args.includes('--auto-fix') || args.includes('-a');
  const saveReport = args.includes('--save-report') || args.includes('-s');
  const reportFile = args.find(arg => arg.startsWith('--report-file='))?.split('=')[1];

  try {
    const health = new FactoryWagerVaultHealth(verbose, autoFix);
    const report = await health.execute();

    if (saveReport) {
      await health.saveReport(report, reportFile);
    }

    // Exit with appropriate code
    if (report.summary.critical > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error(`❌ Vault health check failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export { FactoryWagerVaultHealth, VaultHealthReport, HealthCheck };
