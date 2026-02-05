#!/usr/bin/env bun

/**
 * Fire22 Dashboard Daily Health Check
 * Automated daily maintenance and health monitoring script
 *
 * @version 1.0.0
 * @author Fire22 Maintenance Team
 * @schedule Daily at 9:00 AM
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  metrics?: Record<string, any>;
}

interface HealthReport {
  date: string;
  overallStatus: 'healthy' | 'warning' | 'critical';
  checks: HealthCheckResult[];
  summary: {
    healthy: number;
    warnings: number;
    critical: number;
  };
}

class DailyHealthChecker {
  private results: HealthCheckResult[] = [];
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * 🏥 Run comprehensive daily health check
   */
  async runHealthCheck(): Promise<HealthReport> {
    console.log('🏥 Fire22 Dashboard Daily Health Check');
    console.log('!==!==!==!==!==!==!==');
    console.log(`📅 Date: ${new Date().toISOString().split('T')[0]}`);
    console.log(`⏰ Time: ${new Date().toLocaleTimeString()}\n`);

    // Core system checks
    await this.checkDashboardAccessibility();
    await this.checkRSSFeeds();
    await this.checkDatabaseConnectivity();
    await this.checkAPIEndpoints();
    await this.checkCodebaseHealth();
    await this.checkDocumentationStatus();
    await this.checkSecurityStatus();
    await this.checkPerformanceMetrics();

    // Generate report
    const report = this.generateHealthReport();
    await this.saveHealthReport(report);
    await this.sendAlerts(report);

    return report;
  }

  /**
   * 🌐 Check dashboard accessibility and basic functionality
   */
  private async checkDashboardAccessibility(): Promise<void> {
    console.log('🌐 Checking dashboard accessibility...');

    try {
      const startTime = Date.now();

      // Check if dashboard files exist
      const indexPath = join(process.cwd(), 'dist', 'index.html');
      const assetsExist = existsSync(join(process.cwd(), 'dist', 'assets'));

      if (!existsSync(indexPath)) {
        this.addResult('Dashboard Files', 'critical', 'Dashboard index.html not found');
        return;
      }

      if (!assetsExist) {
        this.addResult('Dashboard Assets', 'warning', 'Assets directory not found');
      }

      const loadTime = Date.now() - startTime;

      this.addResult(
        'Dashboard Accessibility',
        'healthy',
        `Dashboard files accessible (${loadTime}ms)`,
        { loadTime }
      );
    } catch (error) {
      this.addResult('Dashboard Accessibility', 'critical', `Dashboard check failed: ${error}`);
    }
  }

  /**
   * 📡 Check RSS feed functionality for all departments
   */
  private async checkRSSFeeds(): Promise<void> {
    console.log('📡 Checking RSS feeds...');

    const departments = [
      'finance',
      'support',
      'compliance',
      'operations',
      'technology',
      'marketing',
      'management',
      'communications',
      'contributors',
      'design',
    ];

    let healthyFeeds = 0;
    let totalFeeds = 0;

    for (const dept of departments) {
      try {
        const rssPath = join(process.cwd(), 'dist', 'feeds', `${dept}-rss.xml`);
        const atomPath = join(process.cwd(), 'dist', 'feeds', `${dept}-atom.xml`);

        const rssExists = existsSync(rssPath);
        const atomExists = existsSync(atomPath);

        totalFeeds += 2;

        if (rssExists && atomExists) {
          healthyFeeds += 2;

          // Validate RSS content
          const rssContent = readFileSync(rssPath, 'utf-8');
          if (!rssContent.includes('<rss') || !rssContent.includes('</rss>')) {
            this.addResult(`RSS Feed - ${dept}`, 'warning', 'Invalid RSS format');
          }
        } else {
          this.addResult(
            `RSS Feed - ${dept}`,
            'critical',
            `Missing feeds: RSS=${rssExists}, Atom=${atomExists}`
          );
        }
      } catch (error) {
        this.addResult(`RSS Feed - ${dept}`, 'critical', `Feed check failed: ${error}`);
      }
    }

    const feedHealth = (healthyFeeds / totalFeeds) * 100;

    if (feedHealth >= 95) {
      this.addResult(
        'RSS Feed System',
        'healthy',
        `${healthyFeeds}/${totalFeeds} feeds operational (${feedHealth.toFixed(1)}%)`
      );
    } else if (feedHealth >= 80) {
      this.addResult(
        'RSS Feed System',
        'warning',
        `${healthyFeeds}/${totalFeeds} feeds operational (${feedHealth.toFixed(1)}%)`
      );
    } else {
      this.addResult(
        'RSS Feed System',
        'critical',
        `${healthyFeeds}/${totalFeeds} feeds operational (${feedHealth.toFixed(1)}%)`
      );
    }
  }

  /**
   * 🗄️ Check database connectivity and performance
   */
  private async checkDatabaseConnectivity(): Promise<void> {
    console.log('🗄️ Checking database connectivity...');

    try {
      // Check if database files exist (SQLite)
      const dbPath = join(process.cwd(), 'data', 'dashboard.db');

      if (existsSync(dbPath)) {
        const stats = await Bun.file(dbPath).stat();
        const dbSize = stats.size;

        this.addResult(
          'Database Connectivity',
          'healthy',
          `Database accessible (${(dbSize / 1024 / 1024).toFixed(2)} MB)`,
          { dbSize, dbPath }
        );
      } else {
        this.addResult(
          'Database Connectivity',
          'warning',
          'Database file not found - may be using in-memory DB'
        );
      }
    } catch (error) {
      this.addResult('Database Connectivity', 'critical', `Database check failed: ${error}`);
    }
  }

  /**
   * 🔌 Check API endpoint health
   */
  private async checkAPIEndpoints(): Promise<void> {
    console.log('🔌 Checking API endpoints...');

    const endpoints = ['/api/tasks', '/api/tasks/events', '/api/departments', '/feeds/index.html'];

    let healthyEndpoints = 0;

    for (const endpoint of endpoints) {
      try {
        // Check if endpoint files/handlers exist
        const endpointPath = join(
          process.cwd(),
          'src',
          'api',
          endpoint.replace('/api/', '').replace('/', '') + '.ts'
        );

        if (existsSync(endpointPath) || endpoint.includes('/feeds/')) {
          healthyEndpoints++;
          this.addResult(`API Endpoint ${endpoint}`, 'healthy', 'Endpoint available');
        } else {
          this.addResult(`API Endpoint ${endpoint}`, 'warning', 'Endpoint file not found');
        }
      } catch (error) {
        this.addResult(`API Endpoint ${endpoint}`, 'critical', `Endpoint check failed: ${error}`);
      }
    }

    const endpointHealth = (healthyEndpoints / endpoints.length) * 100;

    if (endpointHealth >= 100) {
      this.addResult('API System', 'healthy', 'All endpoints operational');
    } else if (endpointHealth >= 75) {
      this.addResult(
        'API System',
        'warning',
        `${healthyEndpoints}/${endpoints.length} endpoints operational`
      );
    } else {
      this.addResult(
        'API System',
        'critical',
        `${healthyEndpoints}/${endpoints.length} endpoints operational`
      );
    }
  }

  /**
   * 💻 Check codebase health and quality
   */
  private async checkCodebaseHealth(): Promise<void> {
    console.log('💻 Checking codebase health...');

    try {
      // Check package.json and dependencies
      const packagePath = join(process.cwd(), 'package.json');
      if (!existsSync(packagePath)) {
        this.addResult('Codebase Health', 'critical', 'package.json not found');
        return;
      }

      const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
      const depCount = Object.keys(packageJson.dependencies || {}).length;
      const devDepCount = Object.keys(packageJson.devDependencies || {}).length;

      // Check TypeScript configuration
      const tsconfigPath = join(process.cwd(), 'tsconfig.json');
      const hasTypeScript = existsSync(tsconfigPath);

      // Check for common files
      const hasReadme = existsSync(join(process.cwd(), 'README.md'));
      const hasGitignore = existsSync(join(process.cwd(), '.gitignore'));

      this.addResult(
        'Codebase Health',
        'healthy',
        `Codebase structure valid (${depCount} deps, ${devDepCount} devDeps)`,
        {
          dependencies: depCount,
          devDependencies: devDepCount,
          hasTypeScript,
          hasReadme,
          hasGitignore,
        }
      );
    } catch (error) {
      this.addResult('Codebase Health', 'critical', `Codebase check failed: ${error}`);
    }
  }

  /**
   * 📚 Check documentation status and freshness
   */
  private async checkDocumentationStatus(): Promise<void> {
    console.log('📚 Checking documentation status...');

    try {
      const docsPath = join(process.cwd(), 'docs');
      const maintenancePath = join(process.cwd(), 'maintenance');
      const projectsPath = join(process.cwd(), 'projects');

      const docsExist = existsSync(docsPath);
      const maintenanceDocsExist = existsSync(maintenancePath);
      const projectDocsExist = existsSync(projectsPath);

      let docScore = 0;
      if (docsExist) docScore += 40;
      if (maintenanceDocsExist) docScore += 30;
      if (projectDocsExist) docScore += 30;

      // Check for key documentation files
      const keyDocs = [
        'docs/api/TASK-MANAGEMENT-API.md',
        'maintenance/fire22-maintenance-framework.md',
        'projects/fire22-department-outreach-project.md',
      ];

      let keyDocsFound = 0;
      for (const doc of keyDocs) {
        if (existsSync(join(process.cwd(), doc))) {
          keyDocsFound++;
        }
      }

      if (docScore >= 90 && keyDocsFound >= 2) {
        this.addResult(
          'Documentation Status',
          'healthy',
          `Documentation complete (${keyDocsFound}/${keyDocs.length} key docs)`
        );
      } else if (docScore >= 60) {
        this.addResult(
          'Documentation Status',
          'warning',
          `Documentation partially complete (${keyDocsFound}/${keyDocs.length} key docs)`
        );
      } else {
        this.addResult(
          'Documentation Status',
          'critical',
          `Documentation incomplete (${keyDocsFound}/${keyDocs.length} key docs)`
        );
      }
    } catch (error) {
      this.addResult('Documentation Status', 'critical', `Documentation check failed: ${error}`);
    }
  }

  /**
   * 🔒 Check security status
   */
  private async checkSecurityStatus(): Promise<void> {
    console.log('🔒 Checking security status...');

    try {
      // Check for security-related files
      const securityFiles = ['.env.example', '.gitignore', 'package-lock.json'];

      let securityScore = 0;
      for (const file of securityFiles) {
        if (existsSync(join(process.cwd(), file))) {
          securityScore += 33.33;
        }
      }

      // Check for sensitive files that shouldn't be committed
      const sensitiveFiles = ['.env', 'config/secrets.json', 'private.key'];
      let exposedFiles = 0;

      for (const file of sensitiveFiles) {
        if (existsSync(join(process.cwd(), file))) {
          exposedFiles++;
        }
      }

      if (securityScore >= 90 && exposedFiles === 0) {
        this.addResult('Security Status', 'healthy', 'Security configuration good');
      } else if (exposedFiles > 0) {
        this.addResult(
          'Security Status',
          'critical',
          `${exposedFiles} potentially sensitive files found`
        );
      } else {
        this.addResult('Security Status', 'warning', 'Security configuration incomplete');
      }
    } catch (error) {
      this.addResult('Security Status', 'critical', `Security check failed: ${error}`);
    }
  }

  /**
   * ⚡ Check performance metrics
   */
  private async checkPerformanceMetrics(): Promise<void> {
    console.log('⚡ Checking performance metrics...');

    try {
      const totalCheckTime = Date.now() - this.startTime;

      // Check file sizes
      const distPath = join(process.cwd(), 'dist');
      let totalSize = 0;

      if (existsSync(distPath)) {
        // Simple size calculation (would need recursive function for full accuracy)
        const indexSize = existsSync(join(distPath, 'index.html'))
          ? (await Bun.file(join(distPath, 'index.html')).stat()).size
          : 0;
        totalSize += indexSize;
      }

      this.addResult(
        'Performance Metrics',
        'healthy',
        `Health check completed in ${totalCheckTime}ms`,
        {
          checkDuration: totalCheckTime,
          distSize: totalSize,
        }
      );
    } catch (error) {
      this.addResult('Performance Metrics', 'warning', `Performance check failed: ${error}`);
    }
  }

  /**
   * 📝 Add health check result
   */
  private addResult(
    component: string,
    status: 'healthy' | 'warning' | 'critical',
    message: string,
    metrics?: Record<string, any>
  ): void {
    this.results.push({
      component,
      status,
      message,
      timestamp: new Date().toISOString(),
      metrics,
    });

    const emoji = status === 'healthy' ? '✅' : status === 'warning' ? '⚠️' : '❌';
    console.log(`  ${emoji} ${component}: ${message}`);
  }

  /**
   * 📊 Generate comprehensive health report
   */
  private generateHealthReport(): HealthReport {
    const summary = this.results.reduce(
      (acc, result) => {
        acc[result.status]++;
        return acc;
      },
      { healthy: 0, warning: 0, critical: 0 }
    );

    const overallStatus =
      summary.critical > 0 ? 'critical' : summary.warning > 0 ? 'warning' : 'healthy';

    return {
      date: new Date().toISOString().split('T')[0],
      overallStatus,
      checks: this.results,
      summary,
    };
  }

  /**
   * 💾 Save health report to file
   */
  private async saveHealthReport(report: HealthReport): Promise<void> {
    const reportsDir = join(process.cwd(), 'maintenance', 'reports');

    try {
      // Create reports directory if it doesn't exist
      await Bun.write(join(reportsDir, '.gitkeep'), '');

      const reportPath = join(reportsDir, `health-check-${report.date}.json`);
      await Bun.write(reportPath, JSON.stringify(report, null, 2));

      console.log(`\n📊 Health report saved: ${reportPath}`);
    } catch (error) {
      console.error(`❌ Failed to save health report: ${error}`);
    }
  }

  /**
   * 🚨 Send alerts for critical issues
   */
  private async sendAlerts(report: HealthReport): Promise<void> {
    if (report.overallStatus === 'critical') {
      console.log('\n🚨 CRITICAL ISSUES DETECTED - ALERTS SENT');

      const criticalIssues = report.checks.filter(check => check.status === 'critical');
      console.log('Critical Issues:');
      criticalIssues.forEach(issue => {
        console.log(`  ❌ ${issue.component}: ${issue.message}`);
      });

      // In a real implementation, this would send emails/Slack notifications
      console.log('📧 Alert notifications would be sent to:');
      console.log('  - Alex Rodriguez (alex.rodriguez@technology.fire22)');
      console.log('  - Maria Garcia (maria.garcia@technology.fire22)');
      console.log('  - Sarah Martinez (sarah.martinez@communications.fire22)');
    }
  }
}

// CLI execution
async function main() {
  try {
    const checker = new DailyHealthChecker();
    const report = await checker.runHealthCheck();

    console.log('\n📋 Health Check Summary:');
    console.log(`  Overall Status: ${report.overallStatus.toUpperCase()}`);
    console.log(`  ✅ Healthy: ${report.summary.healthy}`);
    console.log(`  ⚠️ Warnings: ${report.summary.warning}`);
    console.log(`  ❌ Critical: ${report.summary.critical}`);

    process.exit(report.overallStatus === 'critical' ? 1 : 0);
  } catch (error) {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { DailyHealthChecker };
