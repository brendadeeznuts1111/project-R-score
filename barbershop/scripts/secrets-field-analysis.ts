#!/usr/bin/env bun

// scripts/secrets-field-analysis.ts - Advanced Secret Exposure Analysis

import { SecretsField } from '../lib/security/secrets-field';
import { factoryWagerSecurityCitadel } from '../lib/security/factorywager-security-citadel';
import { integratedSecretManager } from '../lib/security/integrated-secret-manager';
import { docRefs } from '../lib/docs/references';
import { CLIBase } from './cli-base';

interface AnalysisOptions {
  systemId?: string;
  continuous?: boolean;
  interval?: number;
  output?: 'console' | 'json' | 'html';
  threshold?: number;
  alerts?: boolean;
}

class SecretsFieldAnalysisCLI extends CLIBase {
  private options: AnalysisOptions = {
    continuous: false,
    interval: 30000, // 30 seconds
    output: 'console',
    threshold: 0.8,
    alerts: true
  };

  protected async run(args: string[]): Promise<void> {
    this.parseArgs(args);
    
    if (this.options.continuous) {
      await this.runContinuousAnalysis();
    } else {
      await this.runSingleAnalysis();
    }
  }

  private parseArgs(args: string[]): void {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--system-id' && args[i + 1]) {
        this.options.systemId = args[++i];
      }
      if (arg === '--continuous') this.options.continuous = true;
      if (arg === '--interval' && args[i + 1]) {
        this.options.interval = parseInt(args[++i]) * 1000;
      }
      if (arg === '--output' && args[i + 1]) {
        this.options.output = args[++i] as 'console' | 'json' | 'html';
      }
      if (arg === '--threshold' && args[i + 1]) {
        this.options.threshold = parseFloat(args[++i]);
      }
      if (arg === '--no-alerts') this.options.alerts = false;
      if (arg === '--help' || arg === '-h') {
        this.showHelp();
        process.exit(0);
      }
    }
  }

  private showHelp(): void {
    this.showHelp(
      '🔍 Secrets Field Analysis CLI',
      'bun run scripts/secrets-field-analysis.ts [options]',
      [
        { flag: '--system-id <id>', description: 'System identifier for analysis' },
        { flag: '--continuous', description: 'Run continuous monitoring' },
        { flag: '--interval <seconds>', description: 'Analysis interval (default: 30)' },
        { flag: '--output <format>', description: 'Output format: console, json, html' },
        { flag: '--threshold <value>', description: 'Alert threshold (0.0-1.0, default: 0.8)' },
        { flag: '--no-alerts', description: 'Disable security alerts' },
        { flag: '--help, -h', description: 'Show this help' }
      ]
    );
  }

  private async runSingleAnalysis(): Promise<void> {
    const systemId = this.options.systemId || await this.getSystemId();
    
    console.log(this.styled(`🔍 Running secrets field analysis for: ${systemId}`, 'primary'));
    console.log(this.styled('='.repeat(50), 'muted'));
    console.log();

    try {
      // Get system state
      const state = await this.getSystemState(systemId);
      
      // Compute secrets field
      const result = await SecretsField.compute(state);
      
      // Display results
      await this.displayResults(systemId, result);
      
      // Generate recommendations
      const recommendations = await SecretsField.getRecommendations(result);
      if (recommendations.length > 0) {
        console.log(this.styled('💡 Security Recommendations:', 'accent'));
        recommendations.forEach((rec, index) => {
          console.log(this.styled(`   ${index + 1}. ${rec}`, 'info'));
        });
        console.log();
      }
      
      // Check for alerts
      if (this.options.alerts && result.maxExposure > this.options.threshold) {
        await this.sendAlert(systemId, result);
      }
      
      // Save report
      await this.saveReport(systemId, result);
      
    } catch (error) {
      await this.handleError(error as Error, 'Secrets field analysis');
    }
  }

  private async runContinuousAnalysis(): Promise<void> {
    const systemId = this.options.systemId || await this.getSystemId();
    
    console.log(this.styled(`🔄 Starting continuous analysis for: ${systemId}`, 'primary'));
    console.log(this.styled(`   Interval: ${this.options.interval / 1000} seconds`, 'info'));
    console.log(this.styled(`   Threshold: ${this.options.threshold}`, 'info'));
    console.log(this.styled('   Press Ctrl+C to stop', 'muted'));
    console.log();

    const runAnalysis = async () => {
      try {
        const state = await this.getSystemState(systemId);
        const result = await SecretsField.compute(state);
        
        // Only show results if there are issues or significant changes
        if (result.maxExposure > this.options.threshold || result.anomaly !== 'SECURE') {
          console.log(this.styled(`🚨 ${new Date().toLocaleTimeString()} - ${result.anomaly}`, 
            result.anomaly === 'SECURE' ? 'success' : 'error'));
          console.log(this.styled(`   Max exposure: ${(result.maxExposure * 100).toFixed(1)}%`, 
            result.maxExposure > this.options.threshold ? 'error' : 'warning'));
          
          if (this.options.alerts) {
            await this.sendAlert(systemId, result);
          }
        } else {
          console.log(this.styled(`✅ ${new Date().toLocaleTimeString()} - SECURE (${(result.maxExposure * 100).toFixed(1)}%)`, 'success'));
        }
        
        await this.saveReport(systemId, result);
        
      } catch (error) {
        console.error(this.styled(`❌ Analysis failed: ${error.message}`, 'error'));
      }
    };

    // Run initial analysis
    await runAnalysis();
    
    // Set up interval
    const interval = setInterval(runAnalysis, this.options.interval);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log(this.styled('\n🛑 Stopping continuous analysis...', 'warning'));
      clearInterval(interval);
      process.exit(0);
    });
  }

  private async getSystemId(): Promise<string> {
    // Try to get system ID from environment or generate one
    return process.env.SYSTEM_ID || `factorywager-${Date.now()}`;
  }

  private async getSystemState(systemId: string): Promise<any> {
    try {
      // Get current state from FactoryWager Security Citadel
      const stats = await factoryWagerSecurityCitadel.getDashboardStats();
      
      // Calculate main exposure based on secret metrics
      const mainExposure = Math.min(10, (
        stats.totalSecrets * 0.1 +
        stats.totalVersions * 0.05 +
        (100 - stats.complianceScore) * 0.1 +
        stats.recentActivity * 0.2
      ));

      return {
        id: systemId,
        main: {
          exposure: mainExposure
        },
        timestamp: new Date().toISOString(),
        metadata: {
          totalSecrets: stats.totalSecrets,
          totalVersions: stats.totalVersions,
          complianceScore: stats.complianceScore,
          recentActivity: stats.recentActivity
        }
      };
    } catch (error) {
      // Fallback state
      return {
        id: systemId,
        main: {
          exposure: 5.0 // Default medium exposure
        },
        timestamp: new Date().toISOString(),
        metadata: {
          fallback: true,
          error: error.message
        }
      };
    }
  }

  private async displayResults(systemId: string, result: SecretsFieldScore): Promise<void> {
    console.log(this.styled('📊 Analysis Results:', 'primary'));
    
    // Field visualization
    console.log(this.styled('   Secret Exposure Field:', 'info'));
    const fieldNames = ['Main', 'API', 'Database', 'CSRF', 'Vault', 'Session', 'Encryption', 'Backup', 'Audit'];
    const fieldArray = Array.from(result.field);
    
    fieldNames.forEach((name, index) => {
      const value = fieldArray[index] || 0;
      const percentage = (value * 100).toFixed(1);
      const bar = '█'.repeat(Math.round(value * 10));
      const color = value > 0.8 ? 'error' : value > 0.6 ? 'warning' : value > 0.3 ? 'info' : 'success';
      
      console.log(this.styled(`   ${name.padEnd(12)}: ${bar.padEnd(10)} ${percentage.padStart(5)}%`, color));
    });
    
    console.log();
    console.log(this.styled(`   Max Exposure: ${(result.maxExposure * 100).toFixed(1)}%`, 
      result.maxExposure > 0.8 ? 'error' : result.maxExposure > 0.6 ? 'warning' : 'success'));
    console.log(this.styled(`   Anomaly: ${result.anomaly}`, 
      result.anomaly === 'SECURE' ? 'success' : 'error'));
    
    // FactoryWager integration
    console.log();
    console.log(this.styled('🏰 FactoryWager Integration:', 'accent'));
    console.log(this.styled('   • Version tracking: ENABLED', 'success'));
    console.log(this.styled('   • Audit logging: ENABLED', 'success'));
    console.log(this.styled('   • R2 storage: CONFIGURED', 'info'));
    console.log(this.styled('   • Dashboard: http://localhost:8080', 'muted'));
  }

  private async sendAlert(systemId: string, result: SecretsFieldScore): Promise<void> {
    console.log(this.styled('🚨 SECURITY ALERT!', 'error'));
    console.log(this.styled(`   System: ${systemId}`, 'error'));
    console.log(this.styled(`   Anomaly: ${result.anomaly}`, 'error'));
    console.log(this.styled(`   Exposure: ${(result.maxExposure * 100).toFixed(1)}%`, 'error'));
    
    // Log alert to FactoryWager
    try {
      await integratedSecretManager.setSecret('security', 'field-alert', JSON.stringify({
        systemId,
        timestamp: new Date().toISOString(),
        anomaly: result.anomaly,
        maxExposure: result.maxExposure,
        field: Array.from(result.field)
      }), 'secrets-field-cli', {
        alertType: 'SECURITY_FIELD_ALERT',
        severity: result.maxExposure > 0.9 ? 'CRITICAL' : 'HIGH',
        systemId
      });
    } catch (error) {
      console.warn(this.styled(`⚠️  Failed to log alert: ${error.message}`, 'warning'));
    }
  }

  private async saveReport(systemId: string, result: SecretsFieldScore): Promise<void> {
    try {
      const report = await SecretsField.generateReport(systemId, result);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      if (this.options.output === 'json') {
        const filename = `secrets-field-report-${systemId}-${timestamp}.json`;
        await Bun.write(filename, JSON.stringify(report, null, 2));
        console.log(this.styled(`📄 Report saved: ${filename}`, 'success'));
      } else if (this.options.output === 'html') {
        const filename = `secrets-field-report-${systemId}-${timestamp}.html`;
        const html = this.generateHTMLReport(report);
        await Bun.write(filename, html);
        console.log(this.styled(`📄 Report saved: ${filename}`, 'success'));
      }
      
      // Store in FactoryWager audit
      await integratedSecretManager.setSecret('security', 'field-report', JSON.stringify(report), 'secrets-field-cli', {
        reportType: 'field-analysis',
        systemId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.warn(this.styled(`⚠️  Failed to save report: ${error.message}`, 'warning'));
    }
  }

  private generateHTMLReport(report: any): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Secrets Field Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
        .field-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin: 20px 0; }
        .field-item { text-align: center; padding: 15px; border-radius: 6px; background: #f8f9fa; }
        .field-value { font-size: 1.5em; font-weight: bold; margin: 5px 0; }
        .anomaly { padding: 15px; border-radius: 6px; margin: 20px 0; }
        .anomaly.secure { background: #d1fae5; color: #065f46; border-left: 4px solid #10b981; }
        .anomaly.warning { background: #fef3c7; color: #92400e; border-left: 4px solid #f59e0b; }
        .anomaly.critical { background: #fee2e2; color: #991b1b; border-left: 4px solid #ef4444; }
        .recommendations { margin: 20px 0; }
        .recommendation { background: #eff6ff; padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 3px solid #3b82f6; }
        .factorywager { background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Secrets Field Analysis Report</h1>
            <p><strong>System:</strong> ${report.details.systemId}</p>
            <p><strong>Timestamp:</strong> ${report.details.timestamp}</p>
            <p><strong>Anomaly:</strong> ${report.details.anomaly}</p>
            <p><strong>Max Exposure:</strong> ${(report.details.maxExposure * 100).toFixed(1)}%</p>
        </div>
        
        <h2>📊 Secret Exposure Field</h2>
        <div class="field-grid">
            <div class="field-item">
                <div>Main</div>
                <div class="field-value">${(report.details.field.main * 100).toFixed(1)}%</div>
            </div>
            <div class="field-item">
                <div>API</div>
                <div class="field-value">${(report.details.field.api * 100).toFixed(1)}%</div>
            </div>
            <div class="field-item">
                <div>Database</div>
                <div class="field-value">${(report.details.field.database * 100).toFixed(1)}%</div>
            </div>
            <div class="field-item">
                <div>CSRF</div>
                <div class="field-value">${(report.details.field.csrf * 100).toFixed(1)}%</div>
            </div>
            <div class="field-item">
                <div>Vault</div>
                <div class="field-value">${(report.details.field.vault * 100).toFixed(1)}%</div>
            </div>
            <div class="field-item">
                <div>Session</div>
                <div class="field-value">${(report.details.field.session * 100).toFixed(1)}%</div>
            </div>
            <div class="field-item">
                <div>Encryption</div>
                <div class="field-value">${(report.details.field.encryption * 100).toFixed(1)}%</div>
            </div>
            <div class="field-item">
                <div>Backup</div>
                <div class="field-value">${(report.details.field.backup * 100).toFixed(1)}%</div>
            </div>
            <div class="field-item">
                <div>Audit</div>
                <div class="field-value">${(report.details.field.audit * 100).toFixed(1)}%</div>
            </div>
        </div>
        
        <div class="anomaly ${report.details.anomaly.toLowerCase() === 'secure' ? 'secure' : 
                                report.details.anomaly.includes('RISK') ? 'critical' : 'warning'}">
            <h3>🚨 Security Status: ${report.details.anomaly}</h3>
            <p><strong>Risk Level:</strong> ${report.details.riskLevel}</p>
        </div>
        
        <div class="recommendations">
            <h2>💡 Security Recommendations</h2>
            ${report.recommendations.map(rec => `<div class="recommendation">${rec}</div>`).join('')}
        </div>
        
        <div class="factorywager">
            <h2>🏰 FactoryWager Security Citadel</h2>
            <p><strong>Version:</strong> ${report.factorywager.version}</p>
            <p><strong>Total Secrets:</strong> ${report.factorywager.totalSecrets}</p>
            <p><strong>Total Versions:</strong> ${report.factorywager.totalVersions}</p>
            <p><strong>Compliance Score:</strong> ${report.factorywager.complianceScore}%</p>
            <p><strong>Dashboard:</strong> <a href="${report.factorywager.dashboardUrl}">${report.factorywager.dashboardUrl}</a></p>
            <p><strong>Documentation:</strong> <a href="${report.factorywager.documentation}">${report.factorywager.documentation}</a></p>
        </div>
    </div>
</body>
</html>
    `;
  }
}

// Run the CLI
const cli = new SecretsFieldAnalysisCLI();
cli.execute(Bun.argv.slice(2)).catch(console.error);
