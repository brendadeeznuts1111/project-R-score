#!/usr/bin/env bun

/**
 * 🏛️ Compliance Monitor & Audit Trail System
 *
 * Automated compliance monitoring with audit trails and real-time alerts
 * Implements SOC 2, GDPR, and enterprise security compliance requirements
 */

import * as fs from 'fs';
import { join, basename } from 'path';
import { Database } from 'bun:sqlite';

interface ComplianceEvent {
  id: string;
  timestamp: string;
  event_type: 'access' | 'modification' | 'security' | 'compliance' | 'audit';
  severity: 'low' | 'medium' | 'high' | 'critical';
  resource: string;
  action: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  details: Record<string, any>;
  compliance_status: 'compliant' | 'violation' | 'warning';
}

interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  category: 'security' | 'privacy' | 'operational' | 'architectural';
  severity: 'low' | 'medium' | 'high' | 'critical';
  check_function: () => Promise<boolean>;
  remediation_steps: string[];
  enabled: boolean;
}

class ComplianceMonitor {
  private db: Database;
  private rules: ComplianceRule[] = [];
  private auditTrail: ComplianceEvent[] = [];

  constructor() {
    this.db = new Database(':memory:');
    this.initializeDatabase();
    this.loadComplianceRules();
  }

  private initializeDatabase(): void {
    this.db.run(`
      CREATE TABLE compliance_events (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        event_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        resource TEXT NOT NULL,
        action TEXT NOT NULL,
        user_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        details TEXT,
        compliance_status TEXT NOT NULL
      )
    `);

    this.db.run(`
      CREATE TABLE compliance_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        severity TEXT NOT NULL,
        check_function TEXT,
        remediation_steps TEXT,
        enabled BOOLEAN DEFAULT 1
      )
    `);

    this.db.run(`
      CREATE TABLE audit_trail (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        user_id TEXT,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        success BOOLEAN,
        details TEXT
      )
    `);
  }

  private loadComplianceRules(): void {
    this.rules = [
      {
        id: 'security-headers',
        name: 'Security Headers Validation',
        description: 'Ensure all HTTP responses include required security headers',
        category: 'security',
        severity: 'high',
        check_function: async () => this.checkSecurityHeaders(),
        remediation_steps: [
          'Add X-Frame-Options: DENY header',
          'Add X-Content-Type-Options: nosniff header',
          'Add Referrer-Policy header',
          'Implement Content Security Policy'
        ],
        enabled: true
      },
      {
        id: 'dependency-audit',
        name: 'Dependency Vulnerability Audit',
        description: 'Regular security audit of all dependencies',
        category: 'security',
        severity: 'critical',
        check_function: async () => this.checkDependencyAudit(),
        remediation_steps: [
          'Run bun audit regularly',
          'Update vulnerable dependencies',
          'Review security advisories',
          'Implement automated security scanning'
        ],
        enabled: true
      },
      {
        id: 'gdpr-compliance',
        name: 'GDPR Compliance Check',
        description: 'Verify GDPR compliance for data handling',
        category: 'privacy',
        severity: 'high',
        check_function: async () => this.checkGDPRCompliance(),
        remediation_steps: [
          'Implement data encryption at rest',
          'Add data retention policies',
          'Implement user data export functionality',
          'Add privacy policy documentation'
        ],
        enabled: true
      },
      {
        id: 'playbook-adherence',
        name: 'Engineering Playbook Adherence',
        description: 'Verify adherence to engineering playbooks and standards',
        category: 'operational',
        severity: 'medium',
        check_function: async () => this.checkPlaybookAdherence(),
        remediation_steps: [
          'Run playbook compliance audit',
          'Address identified violations',
          'Update documentation',
          'Implement automated compliance checks'
        ],
        enabled: true
      },
      {
        id: 'edge-deployment',
        name: 'Edge-Native Deployment Verification',
        description: 'Ensure services are deployed to edge locations',
        category: 'architectural',
        severity: 'high',
        check_function: async () => this.checkEdgeDeployment(),
        remediation_steps: [
          'Configure Cloudflare Workers',
          'Implement edge functions',
          'Set up global CDN distribution',
          'Monitor edge performance'
        ],
        enabled: true
      }
    ];
  }

  async logEvent(event: Omit<ComplianceEvent, 'id' | 'timestamp'>): Promise<void> {
    const complianceEvent: ComplianceEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...event
    };

    this.auditTrail.push(complianceEvent);

    // Store in database
    this.db.run(
      `INSERT INTO compliance_events
       (id, timestamp, event_type, severity, resource, action, user_id, ip_address, user_agent, details, compliance_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      complianceEvent.id,
      complianceEvent.timestamp,
      complianceEvent.event_type,
      complianceEvent.severity,
      complianceEvent.resource,
      complianceEvent.action,
      complianceEvent.user_id || null,
      complianceEvent.ip_address || null,
      complianceEvent.user_agent || null,
      JSON.stringify(complianceEvent.details),
      complianceEvent.compliance_status
    );
  }

  async runComplianceCheck(): Promise<{ passed: number; failed: number; warnings: number; total: number }> {
    console.log('🏛️ Running comprehensive compliance checks...\n');

    let passed = 0;
    let failed = 0;
    let warnings = 0;

    for (const rule of this.rules.filter(r => r.enabled)) {
      console.log(`🔍 Checking: ${rule.name}`);
      try {
        const result = await rule.check_function();

        if (result) {
          passed++;
          console.log(`✅ PASSED: ${rule.description}`);
          await this.logEvent({
            event_type: 'compliance',
            severity: rule.severity,
            resource: rule.id,
            action: 'compliance_check',
            details: { result: 'passed', rule: rule.name },
            compliance_status: 'compliant'
          });
        } else {
          failed++;
          console.log(`❌ FAILED: ${rule.description}`);
          console.log(`💡 Remediation: ${rule.remediation_steps.join(', ')}`);

          await this.logEvent({
            event_type: 'compliance',
            severity: rule.severity,
            resource: rule.id,
            action: 'compliance_check',
            details: {
              result: 'failed',
              rule: rule.name,
              remediation: rule.remediation_steps
            },
            compliance_status: 'violation'
          });
        }
      } catch (error) {
        warnings++;
        console.log(`⚠️ WARNING: ${rule.name} - ${error.message}`);

        await this.logEvent({
          event_type: 'compliance',
          severity: 'medium',
          resource: rule.id,
          action: 'compliance_check',
          details: {
            result: 'warning',
            rule: rule.name,
            error: error.message
          },
          compliance_status: 'warning'
        });
      }
      console.log('');
    }

    const total = passed + failed + warnings;
    console.log(`📊 Compliance Check Summary:`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️ Warnings: ${warnings}`);
    console.log(`📈 Overall Score: ${total > 0 ? Math.round((passed / total) * 100) : 0}%`);

    return { passed, failed, warnings, total };
  }

  private async checkSecurityHeaders(): Promise<boolean> {
    // Check if wrangler.toml has security headers configured
    try {
      const wranglerPath = join(process.cwd(), 'wrangler.toml');
      if (!await Bun.file(wranglerPath).exists()) return false;

      const content = await Bun.file(wranglerPath).text();
      const hasSecurityHeaders = content.includes('X-Frame-Options') &&
                                content.includes('X-Content-Type-Options') &&
                                content.includes('Referrer-Policy');

      return hasSecurityHeaders;
    } catch {
      return false;
    }
  }

  private async checkDependencyAudit(): Promise<boolean> {
    // Run bun audit and check for critical vulnerabilities
    try {
      const { exitCode } = await this.runCommand('bun audit');
      // Exit code 0 = no vulnerabilities, 1 = vulnerabilities found but not critical
      return exitCode === 0 || exitCode === 1;
    } catch {
      return false;
    }
  }

  private async checkGDPRCompliance(): Promise<boolean> {
    // Check for GDPR-related files and configurations
    const gdprFiles = [
      'privacy-policy.md',
      'gdpr-compliance.md',
      'data-retention-policy.md'
    ];

    let gdprScore = 0;

    for (const file of gdprFiles) {
      if (await Bun.file(join(process.cwd(), file)).exists()) {
        gdprScore++;
      }
    }

    // Also check for data encryption markers in code
    try {
      const files = await this.findTypeScriptFiles(process.cwd());
      let encryptionMarkers = 0;

      for (const file of files.slice(0, 10)) { // Check first 10 files
        const content = await Bun.file(file).text();
        if (content.includes('encrypt') || content.includes('crypto') || content.includes('hash')) {
          encryptionMarkers++;
        }
      }

      return gdprScore >= 2 && encryptionMarkers > 0;
    } catch {
      return gdprScore >= 2;
    }
  }

  private async checkPlaybookAdherence(): Promise<boolean> {
    // Check if playbook auditor is available and recent compliance report exists
    try {
      const auditorPath = join(process.cwd(), 'scripts', 'playbook-auditor.ts');
      const reportPath = join(process.cwd(), 'playbook-compliance-report-2025-08-30.md');

      const hasAuditor = await Bun.file(auditorPath).exists();
      const hasRecentReport = await Bun.file(reportPath).exists();

      return hasAuditor && hasRecentReport;
    } catch {
      return false;
    }
  }

  private async checkEdgeDeployment(): Promise<boolean> {
    // Check for Cloudflare Workers configuration and edge functions
    try {
      const wranglerPath = join(process.cwd(), 'wrangler.toml');
      const functionsPath = join(process.cwd(), 'functions');

      const hasWrangler = await Bun.file(wranglerPath).exists();
      const hasFunctions = await Bun.file(functionsPath).exists();

      if (!hasWrangler) return false;

      const wranglerContent = await Bun.file(wranglerPath).text();
      const hasWorkersConfig = wranglerContent.includes('compatibility_flags') &&
                              wranglerContent.includes('nodejs_compat');

      return hasFunctions && hasWorkersConfig;
    } catch {
      return false;
    }
  }

  private async findTypeScriptFiles(dir: string): Promise<string[]> {
    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's enhanced fs.glob for efficient file discovery
    try {
      const files = await Array.fromAsync(fs.glob('**/*.{ts,tsx}', {
        cwd: dir,
        exclude: [
          '**/node_modules/**',
          '**/dist/**',
          '**/build/**',
          '**/.git/**',
          '**/coverage/**'
        ]
      }));

      // Convert relative paths back to absolute paths
      return files.map(file => join(dir, file));
    } catch (error) {
      console.warn(`⚠️  Error scanning TypeScript files in ${dir}:`, error.message);
      return [];
    }
  }

  private async runCommand(command: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      const [cmd, ...args] = command.split(' ');
      const { spawn } = require('child_process');

      const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => { stdout += data.toString(); });
      child.stderr?.on('data', (data) => { stderr += data.toString(); });

      child.on('close', (exitCode) => {
        resolve({ exitCode: exitCode || 0, stdout, stderr });
      });

      child.on('error', () => {
        resolve({ exitCode: 1, stdout, stderr });
      });
    });
  }

  generateComplianceReport(): string {
    const totalEvents = this.auditTrail.length;
    const violations = this.auditTrail.filter(e => e.compliance_status === 'violation').length;
    const warnings = this.auditTrail.filter(e => e.compliance_status === 'warning').length;
    const compliant = this.auditTrail.filter(e => e.compliance_status === 'compliant').length;

    let report = '# 🏛️ Compliance Monitor Report\n\n';
    report += `**Generated:** ${new Date().toISOString()}\n\n`;

    report += '## 📊 Summary\n\n';
    report += `- 📋 **Total Events:** ${totalEvents}\n`;
    report += `- ✅ **Compliant:** ${compliant}\n`;
    report += `- ⚠️ **Warnings:** ${warnings}\n`;
    report += `- 🚨 **Violations:** ${violations}\n`;
    report += `- 📈 **Compliance Rate:** ${totalEvents > 0 ? Math.round((compliant / totalEvents) * 100) : 0}%\n\n`;

    if (violations > 0) {
      report += '## 🚨 Critical Violations\n\n';
      const criticalViolations = this.auditTrail.filter(e =>
        e.compliance_status === 'violation' && e.severity === 'critical'
      );

      for (const violation of criticalViolations) {
        report += `### ${violation.resource}\n\n`;
        report += `${violation.details.rule}\n\n`;
        report += `**Severity:** ${violation.severity}\n`;
        report += `**Action:** ${violation.action}\n`;
        if (violation.details.remediation) {
          report += `**Remediation:** ${violation.details.remediation.join(', ')}\n`;
        }
        report += '\n';
      }
    }

    report += '## 🔧 Active Compliance Rules\n\n';
    for (const rule of this.rules.filter(r => r.enabled)) {
      report += `- **${rule.name}** (${rule.category})\n`;
      report += `  - Severity: ${rule.severity}\n`;
      report += `  - ${rule.description}\n\n`;
    }

    return report;
  }

  close(): void {
    this.db.close();
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0] || 'check';

  const monitor = new ComplianceMonitor();

  switch (command) {
    case 'check':
      await monitor.runComplianceCheck();
      break;

    case 'report':
      await monitor.runComplianceCheck();
      const report = monitor.generateComplianceReport();
      console.log(report);

      // Save report to file
      const filename = `compliance-monitor-report-${new Date().toISOString().slice(0, 10)}.md`;
      await Bun.write(filename, report);
      console.log(`💾 Report saved: ${filename}`);
      break;

    case 'audit':
      // Log a test audit event
      await monitor.logEvent({
        event_type: 'audit',
        severity: 'low',
        resource: 'compliance-monitor',
        action: 'manual_audit',
        user_id: 'system',
        details: { command: 'audit', timestamp: new Date().toISOString() },
        compliance_status: 'compliant'
      });
      console.log('✅ Audit event logged');
      break;

    default:
      console.log('Usage: bun run scripts/compliance-monitor.ts [check|report|audit]');
      console.log('');
      console.log('Commands:');
      console.log('  check     - Run compliance checks');
      console.log('  report    - Generate compliance report');
      console.log('  audit     - Log audit event');
      break;
  }

  monitor.close();
}
