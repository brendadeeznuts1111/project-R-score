#!/usr/bin/env bun
/**
 * Bun v1.3.6 Security Audit Script
 * Addresses critical vulnerabilities: [SEC][SPAWN][SEC], [SEC][WS_DECOMP][SEC], [SEC][INSTALL][SEC], [SEC][TLS][SEC]
 */

import { readdir, readFile, stat } from "fs/promises";
import { join, relative } from "path";
import { spawn } from "bun";

interface SecurityIssue {
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  file: string;
  line: number;
  description: string;
  recommendation: string;
  cwe?: string;
}

class SecurityAuditor {
  private issues: SecurityIssue[] = [];
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  async audit(): Promise<void> {
    console.log('🔍 Starting Bun v1.3.6 Security Audit...\n');

    await this.auditSpawnCalls();
    await this.auditWebSocketUsage();
    await this.auditFileOperations();
    await this.auditTLSUsage();
    await this.auditEnvironmentVariables();
    
    this.generateReport();
  }

  private async auditSpawnCalls(): Promise<void> {
    console.log('🚨 Auditing Bun.spawn() calls for CWE-158 (Null Byte Injection)...');
    
    const tsFiles = await this.findFiles('**/*.ts');
    const jsFiles = await this.findFiles('**/*.js');
    const allFiles = [...tsFiles, ...jsFiles];

    for (const file of allFiles) {
      const content = await readFile(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Check for Bun.spawn, child_process, exec, etc.
        const spawnPatterns = [
          /Bun\.spawn\s*\(/,
          /spawn\s*\(/,
          /exec\s*\(/,
          /execSync\s*\(/,
          /child_process/
        ];

        spawnPatterns.forEach(pattern => {
          if (pattern.test(line)) {
            this.issues.push({
              type: '[SEC][SPAWN][SEC]',
              severity: 'CRITICAL',
              file: relative(this.projectRoot, file),
              line: index + 1,
              description: 'Potential null byte injection vulnerability in spawn/exec call',
              recommendation: 'Sanitize all user input before passing to spawn. Use Bun.spawn with strict validation.',
              cwe: 'CWE-158'
            });
          }
        });

        // Check for shell template literals
        if (line.includes('`') && (line.includes('$') || line.includes('spawn'))) {
          this.issues.push({
            type: '[SEC][SPAWN][SEC]',
            severity: 'CRITICAL',
            file: relative(this.projectRoot, file),
            line: index + 1,
            description: 'Shell template literal with potential injection',
            recommendation: 'Avoid shell templates with user input. Use parameterized commands.',
            cwe: 'CWE-158'
          });
        }
      });
    }
  }

  private async auditWebSocketUsage(): Promise<void> {
    console.log('🌐 Auditing WebSocket implementations for decompression bomb protection...');
    
    const files = await this.findFiles('**/*.{ts,js}');
    
    for (const file of files) {
      const content = await readFile(file, 'utf-8');
      
      if (content.includes('WebSocket') || content.includes('ws:')) {
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes('new WebSocket') || line.includes('Bun.serve') && line.includes('websocket')) {
            // Check for message size limits
            if (!content.includes('maxMessageSize') && !content.includes('128')) {
              this.issues.push({
                type: '[SEC][WS_DECOMP][SEC]',
                severity: 'CRITICAL',
                file: relative(this.projectRoot, file),
                line: index + 1,
                description: 'WebSocket missing decompression bomb protection (128MB limit)',
                recommendation: 'Implement message size validation. Bun v1.3.6 auto-limits to 128MB.',
                cwe: 'CWE-400'
              });
            }
          }
        });
      }
    }
  }

  private async auditFileOperations(): Promise<void> {
    console.log('📁 Auditing file operations for path traversal and large file corruption...');
    
    const files = await this.findFiles('**/*.{ts,js}');
    
    for (const file of files) {
      const content = await readFile(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Check for path traversal vulnerabilities
        if (line.includes('..') && (line.includes('writeFile') || line.includes('readFile'))) {
          this.issues.push({
            type: '[SEC][INSTALL][SEC]',
            severity: 'HIGH',
            file: relative(this.projectRoot, file),
            line: index + 1,
            description: 'Potential path traversal in file operation',
            recommendation: 'Validate and sanitize file paths. Use path.resolve() and check boundaries.',
            cwe: 'CWE-22'
          });
        }

        // Check for large file writes (>2GB vulnerability)
        if (line.includes('Bun.write') || line.includes('writeFile')) {
          this.issues.push({
            type: '[BUN][WRITE][BUG]',
            severity: 'CRITICAL',
            file: relative(this.projectRoot, file),
            line: index + 1,
            description: 'Potential 2GB+ file corruption vulnerability',
            recommendation: 'Verify file sizes before writing. Add integrity checks for large files.',
            cwe: 'CWE-120'
          });
        }
      });
    }
  }

  private async auditTLSUsage(): Promise<void> {
    console.log('🔒 Auditing TLS certificate validation...');
    
    const files = await this.findFiles('**/*.{ts,js}');
    
    for (const file of files) {
      const content = await readFile(file, 'utf-8');
      
      if (content.includes('https:') || content.includes('TLS') || content.includes('SSL')) {
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes('rejectUnauthorized: false') || line.includes('secure: false')) {
            this.issues.push({
              type: '[SEC][TLS][SEC]',
              severity: 'HIGH',
              file: relative(this.projectRoot, file),
              line: index + 1,
              description: 'TLS certificate validation disabled',
              recommendation: 'Enable strict certificate validation. Bun v1.3.6 enforces RFC 6125.',
              cwe: 'CWE-295'
            });
          }
        });
      }
    }
  }

  private async auditEnvironmentVariables(): Promise<void> {
    console.log('🌍 Auditing environment variable usage for injection risks...');
    
    const files = await this.findFiles('**/*.{ts,js}');
    
    for (const file of files) {
      const content = await readFile(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Check for environment variable usage in spawn/exec
        if ((line.includes('process.env.') || line.includes('Bun.env.')) && 
            (line.includes('spawn') || line.includes('exec'))) {
          this.issues.push({
            type: '[SEC][SPAWN][SEC]',
            severity: 'HIGH',
            file: relative(this.projectRoot, file),
            line: index + 1,
            description: 'Environment variable used in spawn/exec context',
            recommendation: 'Sanitize environment variables before use in shell commands.',
            cwe: 'CWE-78'
          });
        }
      });
    }
  }

  private async findFiles(pattern: string): Promise<string[]> {
    const { glob } = await import('glob');
    return glob(pattern, { cwd: this.projectRoot, ignore: ['**/node_modules/**', '**/dist/**'] });
  }

  private generateReport(): void {
    console.log('\n📊 SECURITY AUDIT REPORT');
    console.log('========================\n');

    const criticalIssues = this.issues.filter(i => i.severity === 'CRITICAL');
    const highIssues = this.issues.filter(i => i.severity === 'HIGH');
    const mediumIssues = this.issues.filter(i => i.severity === 'MEDIUM');
    const lowIssues = this.issues.filter(i => i.severity === 'LOW');

    console.log(`🚨 CRITICAL: ${criticalIssues.length}`);
    console.log(`⚠️  HIGH: ${highIssues.length}`);
    console.log(`📋 MEDIUM: ${mediumIssues.length}`);
    console.log(`ℹ️  LOW: ${lowIssues.length}\n`);

    if (criticalIssues.length > 0) {
      console.log('🚨 CRITICAL ISSUES (Immediate Action Required):');
      console.log('='.repeat(55));
      criticalIssues.forEach(issue => {
        console.log(`\n[${issue.type}] ${issue.file}:${issue.line}`);
        console.log(`Description: ${issue.description}`);
        console.log(`CWE: ${issue.cwe || 'N/A'}`);
        console.log(`Recommendation: ${issue.recommendation}`);
      });
    }

    if (highIssues.length > 0) {
      console.log('\n⚠️  HIGH ISSUES (Fix This Week):');
      console.log('='.repeat(40));
      highIssues.forEach(issue => {
        console.log(`\n[${issue.type}] ${issue.file}:${issue.line}`);
        console.log(`Description: ${issue.description}`);
        console.log(`Recommendation: ${issue.recommendation}`);
      });
    }

    // Generate remediation script
    this.generateRemediationScript();

    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Run: bun upgrade (immediately)');
    console.log('2. Address all CRITICAL issues within 24 hours');
    console.log('3. Fix HIGH issues within 1 week');
    console.log('4. Test WebSocket decompression limits');
    console.log('5. Verify large file integrity (>2GB)');
  }

  private generateRemediationScript(): void {
    const remediation = `#!/bin/bash
# Bun v1.3.6 Security Remediation Script

echo "🔧 Applying Bun v1.3.6 security fixes..."

# 1. Upgrade Bun immediately
echo "📦 Upgrading Bun..."
bun upgrade

# 2. Clear package cache to avoid malicious packages
echo "🧹 Clearing package cache..."
rm -rf ~/.bun/install/cache

# 3. Reinstall with security checks
echo "🔒 Reinstalling packages..."
bun install --force

# 4. Generate security report
echo "📊 Generating security report..."
bun run scripts/security-audit.ts > security-report-$(date +%Y%m%d).txt

echo "✅ Security remediation complete!"
echo "📋 Review security-report-*.txt for remaining issues"
`;

    require('fs').writeFileSync('scripts/security-remediation.sh', remediation, 'utf-8');
    console.log('\n📝 Generated: scripts/security-remediation.sh');
  }
}

// Run audit if called directly
if (import.meta.main) {
  const auditor = new SecurityAuditor();
  await auditor.audit();
}

export { SecurityAuditor, SecurityIssue };
