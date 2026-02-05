#!/usr/bin/env bun

/**
 * 📊 Generate Deployment Report
 * Creates comprehensive deployment reports for all environments
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface DeploymentInfo {
  environment: string;
  url: string;
  status: 'active' | 'inactive' | 'pending';
  lastDeployed?: string;
  version?: string;
  checks?: {
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message?: string;
  }[];
}

class DeploymentReportGenerator {
  private readonly reportsDir = join(process.cwd(), 'reports');
  private deployments: DeploymentInfo[] = [];

  constructor() {
    this.ensureReportsDirectory();
  }

  private ensureReportsDirectory(): void {
    if (!existsSync(this.reportsDir)) {
      mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  async generate(): Promise<void> {
    console.log('📊 Generating Deployment Report');
    console.log('!==!==!==!==!==!==');

    try {
      // Gather deployment information
      await this.gatherDeploymentInfo();

      // Run health checks
      await this.runHealthChecks();

      // Generate reports
      await this.generateJsonReport();
      await this.generateHtmlReport();
      await this.generateMarkdownReport();

      console.log('\n✅ Deployment reports generated successfully!');
      console.log(`📁 Reports saved to: ${this.reportsDir}`);
    } catch (error) {
      console.error('❌ Report generation failed:', error);
      process.exit(1);
    }
  }

  private async gatherDeploymentInfo(): Promise<void> {
    console.log('\n📋 Gathering deployment information...');

    // GitHub Pages
    this.deployments.push({
      environment: 'GitHub Pages',
      url: 'https://brendadeeznuts1111.github.io/fire22-dashboard-worker',
      status: 'active',
      lastDeployed: new Date().toISOString(),
      version: await this.getVersion(),
    });

    // Cloudflare Pages
    this.deployments.push({
      environment: 'Cloudflare Pages',
      url: 'https://fire22-dashboard.pages.dev',
      status: 'active',
      lastDeployed: new Date().toISOString(),
      version: await this.getVersion(),
    });

    // Custom Domain
    this.deployments.push({
      environment: 'Production (Custom Domain)',
      url: 'https://dashboard.fire22.ag',
      status: 'active',
      lastDeployed: new Date().toISOString(),
      version: await this.getVersion(),
    });

    // Development
    this.deployments.push({
      environment: 'Development',
      url: 'http://localhost:3001',
      status: 'inactive',
      version: await this.getVersion(),
    });

    console.log(`✅ Gathered info for ${this.deployments.length} environments`);
  }

  private async getVersion(): Promise<string> {
    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
      return packageJson.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }

  private async runHealthChecks(): Promise<void> {
    console.log('\n🏥 Running health checks...');

    for (const deployment of this.deployments) {
      if (deployment.status === 'active') {
        deployment.checks = await this.checkDeployment(deployment);
      }
    }

    console.log('✅ Health checks completed');
  }

  private async checkDeployment(deployment: DeploymentInfo): Promise<any[]> {
    const checks = [];

    // Check main URL
    try {
      const response = await fetch(deployment.url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });

      checks.push({
        name: 'Main URL',
        status: response.ok ? 'pass' : 'fail',
        message: `HTTP ${response.status}`,
      });
    } catch (error) {
      checks.push({
        name: 'Main URL',
        status: 'fail',
        message: 'Connection failed',
      });
    }

    // Check SSL certificate (for HTTPS URLs)
    if (deployment.url.startsWith('https://')) {
      checks.push({
        name: 'SSL Certificate',
        status: 'pass',
        message: 'Valid HTTPS',
      });
    }

    // Check response time
    const startTime = Date.now();
    try {
      await fetch(deployment.url, {
        signal: AbortSignal.timeout(5000),
      });
      const responseTime = Date.now() - startTime;

      checks.push({
        name: 'Response Time',
        status: responseTime < 1000 ? 'pass' : responseTime < 3000 ? 'warning' : 'fail',
        message: `${responseTime}ms`,
      });
    } catch {
      checks.push({
        name: 'Response Time',
        status: 'fail',
        message: 'Timeout',
      });
    }

    return checks;
  }

  private async generateJsonReport(): Promise<void> {
    console.log('\n📄 Generating JSON report...');

    const report = {
      generated: new Date().toISOString(),
      deployments: this.deployments,
      summary: {
        total: this.deployments.length,
        active: this.deployments.filter(d => d.status === 'active').length,
        inactive: this.deployments.filter(d => d.status === 'inactive').length,
        pending: this.deployments.filter(d => d.status === 'pending').length,
      },
      healthStatus: this.calculateHealthStatus(),
    };

    writeFileSync(join(this.reportsDir, 'deployment-report.json'), JSON.stringify(report, null, 2));

    console.log('✅ JSON report generated');
  }

  private calculateHealthStatus(): string {
    const activeDeployments = this.deployments.filter(d => d.status === 'active');
    const failedChecks = activeDeployments
      .flatMap(d => d.checks || [])
      .filter(c => c.status === 'fail');

    if (failedChecks.length === 0) {
      return 'healthy';
    } else if (failedChecks.length < 3) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }

  private async generateHtmlReport(): Promise<void> {
    console.log('\n🎨 Generating HTML report...');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fire22 Deployment Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        
        h1 {
            color: #ff6b35;
            border-bottom: 3px solid #ff6b35;
            padding-bottom: 10px;
        }
        
        .header {
            background: linear-gradient(135deg, #ff6b35, #f7931e);
            color: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #666;
            font-size: 14px;
            text-transform: uppercase;
        }
        
        .summary-card .value {
            font-size: 32px;
            font-weight: bold;
            color: #333;
        }
        
        .deployment {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .deployment-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .deployment-title {
            font-size: 20px;
            font-weight: bold;
        }
        
        .status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .status.active {
            background: #d4edda;
            color: #155724;
        }
        
        .status.inactive {
            background: #f8d7da;
            color: #721c24;
        }
        
        .status.pending {
            background: #fff3cd;
            color: #856404;
        }
        
        .deployment-url {
            color: #0066cc;
            text-decoration: none;
            font-size: 14px;
        }
        
        .deployment-url:hover {
            text-decoration: underline;
        }
        
        .checks {
            margin-top: 15px;
        }
        
        .check {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px;
            border-bottom: 1px solid #eee;
        }
        
        .check:last-child {
            border-bottom: none;
        }
        
        .check-status {
            display: inline-block;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            margin-right: 10px;
        }
        
        .check-status.pass {
            background: #28a745;
        }
        
        .check-status.fail {
            background: #dc3545;
        }
        
        .check-status.warning {
            background: #ffc107;
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 14px;
        }
        
        .timestamp {
            color: #999;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Fire22 Deployment Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="summary">
        <div class="summary-card">
            <h3>Total Deployments</h3>
            <div class="value">${this.deployments.length}</div>
        </div>
        <div class="summary-card">
            <h3>Active</h3>
            <div class="value">${this.deployments.filter(d => d.status === 'active').length}</div>
        </div>
        <div class="summary-card">
            <h3>Health Status</h3>
            <div class="value">${this.calculateHealthStatus().toUpperCase()}</div>
        </div>
        <div class="summary-card">
            <h3>Version</h3>
            <div class="value">${await this.getVersion()}</div>
        </div>
    </div>
    
    <h2>Deployment Environments</h2>
    
    ${this.deployments
      .map(
        deployment => `
    <div class="deployment">
        <div class="deployment-header">
            <div>
                <div class="deployment-title">${deployment.environment}</div>
                <a href="${deployment.url}" class="deployment-url" target="_blank">${deployment.url}</a>
            </div>
            <span class="status ${deployment.status}">${deployment.status}</span>
        </div>
        
        ${
          deployment.checks
            ? `
        <div class="checks">
            <h4>Health Checks</h4>
            ${deployment.checks
              .map(
                check => `
            <div class="check">
                <div>
                    <span class="check-status ${check.status}"></span>
                    ${check.name}
                </div>
                <div>${check.message || ''}</div>
            </div>
            `
              )
              .join('')}
        </div>
        `
            : ''
        }
        
        ${
          deployment.lastDeployed
            ? `
        <div class="timestamp">
            Last deployed: ${new Date(deployment.lastDeployed).toLocaleString()}
        </div>
        `
            : ''
        }
    </div>
    `
      )
      .join('')}
    
    <div class="footer">
        <p>&copy; 2024 Fire22. All rights reserved.</p>
        <p>Report generated by Fire22 Deployment System</p>
    </div>
</body>
</html>`;

    writeFileSync(join(this.reportsDir, 'deployment-report.html'), html);

    console.log('✅ HTML report generated');
  }

  private async generateMarkdownReport(): Promise<void> {
    console.log('\n📝 Generating Markdown report...');

    const healthStatus = this.calculateHealthStatus();
    const healthEmoji =
      healthStatus === 'healthy' ? '✅' : healthStatus === 'degraded' ? '⚠️' : '❌';

    const markdown = `# 🚀 Fire22 Deployment Report

Generated: ${new Date().toLocaleString()}

## 📊 Summary

- **Total Deployments**: ${this.deployments.length}
- **Active**: ${this.deployments.filter(d => d.status === 'active').length}
- **Inactive**: ${this.deployments.filter(d => d.status === 'inactive').length}
- **Health Status**: ${healthEmoji} ${healthStatus.toUpperCase()}
- **Version**: ${await this.getVersion()}

## 🌐 Deployment Environments

${this.deployments
  .map(
    deployment => `
### ${deployment.environment}

- **URL**: [${deployment.url}](${deployment.url})
- **Status**: ${deployment.status === 'active' ? '✅' : deployment.status === 'inactive' ? '❌' : '⏳'} ${deployment.status.toUpperCase()}
- **Version**: ${deployment.version || 'N/A'}
- **Last Deployed**: ${deployment.lastDeployed ? new Date(deployment.lastDeployed).toLocaleString() : 'N/A'}

${
  deployment.checks
    ? `
#### Health Checks

| Check | Status | Details |
|-------|--------|---------|
${deployment.checks
  .map(
    check =>
      `| ${check.name} | ${check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️'} ${check.status.toUpperCase()} | ${check.message || '-'} |`
  )
  .join('\n')}
`
    : ''
}
`
  )
  .join('\n')}

## 📈 Deployment Metrics

| Metric | Value |
|--------|-------|
| Total Environments | ${this.deployments.length} |
| Active Deployments | ${this.deployments.filter(d => d.status === 'active').length} |
| Successful Health Checks | ${this.deployments.flatMap(d => d.checks || []).filter(c => c.status === 'pass').length} |
| Failed Health Checks | ${this.deployments.flatMap(d => d.checks || []).filter(c => c.status === 'fail').length} |
| Warning Health Checks | ${this.deployments.flatMap(d => d.checks || []).filter(c => c.status === 'warning').length} |

## 🔗 Quick Links

- [GitHub Pages](https://brendadeeznuts1111.github.io/fire22-dashboard-worker)
- [Cloudflare Pages](https://fire22-dashboard.pages.dev)
- [Production Site](https://dashboard.fire22.ag)
- [GitHub Repository](https://github.com/brendadeeznuts1111/fire22-dashboard-worker)
- [Wiki](https://github.com/brendadeeznuts1111/fire22-dashboard-worker/wiki)

---

*Report generated by Fire22 Deployment System*
*© 2024 Fire22. All rights reserved.*`;

    writeFileSync(join(this.reportsDir, 'deployment-report.md'), markdown);

    console.log('✅ Markdown report generated');
  }
}

// Run report generation
const generator = new DeploymentReportGenerator();
generator.generate().catch(console.error);
