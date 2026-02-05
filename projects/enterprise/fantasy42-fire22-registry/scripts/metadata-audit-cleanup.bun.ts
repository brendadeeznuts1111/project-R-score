#!/usr/bin/env bun

/**
 * 🔍 Hidden Metadata Audit & Cleanup System for Fantasy42-Fire22
 *
 * Comprehensive audit and removal of hidden metadata, sensitive data, and security risks
 * Ensures no sensitive information is exposed in the codebase
 */

import { existsSync, readFileSync, writeFileSync, statSync, readdirSync, unlinkSync } from 'fs';
import { join, extname, basename, dirname } from 'path';
import { Database } from 'bun:sqlite';

interface MetadataFinding {
  type: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: string;
  file: string;
  line?: number;
  description: string;
  sensitiveData?: string;
  recommendation: string;
  autoFixable: boolean;
}

interface AuditResult {
  totalFiles: number;
  findings: MetadataFinding[];
  riskScore: number;
  cleanupActions: string[];
}

class MetadataAuditCleanup {
  private findings: MetadataFinding[] = [];
  private scannedFiles = new Set<string>();
  private riskPatterns: {
    [key: string]: { pattern: RegExp; severity: string; description: string };
  } = {
    // API Keys and Tokens (exclude environment variables)
    api_key: {
      pattern:
        /(?:^|[^a-zA-Z0-9_])(api[_-]?key|apikey)\s*[=:]\s*['"]?([a-zA-Z0-9_-]{32,})['"]?(?:[^a-zA-Z0-9_]|$)/gim,
      severity: 'CRITICAL',
      description: 'Hardcoded API Key detected',
    },
    bearer_token: {
      pattern:
        /(?:^|[^a-zA-Z0-9_])(bearer|token|auth[_-]?token)\s*[=:]\s*['"]?([a-zA-Z0-9_.-]{32,})['"]?(?:[^a-zA-Z0-9_]|$)/gim,
      severity: 'CRITICAL',
      description: 'Hardcoded Bearer token detected',
    },
    jwt_token: {
      pattern:
        /(?:^|[^a-zA-Z0-9_])eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*(?:[^a-zA-Z0-9_]|$)/g,
      severity: 'CRITICAL',
      description: 'JWT token detected',
    },

    // Database Credentials
    db_password: {
      pattern: /(password|pwd|passwd)\s*[=:]\s*['"]?([^'"\s]{3,})['"]?/gi,
      severity: 'CRITICAL',
      description: 'Database password detected',
    },
    db_connection: {
      pattern: /(mongodb|postgresql|mysql|sqlite):\/\/[^:]+:[^@]+@/gi,
      severity: 'CRITICAL',
      description: 'Database connection string with credentials',
    },

    // Cloud Credentials
    aws_secret: {
      pattern: /(aws|amazon).*secret.*[=:]\s*['"]?([a-zA-Z0-9/+=]{20,})['"]?/gi,
      severity: 'CRITICAL',
      description: 'AWS secret key detected',
    },
    cloudflare_token: {
      pattern: /(cloudflare|cf).*token.*[=:]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?/gi,
      severity: 'CRITICAL',
      description: 'Cloudflare token detected',
    },

    // Private Keys
    private_key: {
      pattern:
        /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----[\s\S]*?-----END (RSA |EC |DSA )?PRIVATE KEY-----/g,
      severity: 'CRITICAL',
      description: 'Private key detected',
    },
    ssh_key: {
      pattern: /-----BEGIN OPENSSH PRIVATE KEY-----[\s\S]*?-----END OPENSSH PRIVATE KEY-----/g,
      severity: 'CRITICAL',
      description: 'SSH private key detected',
    },

    // Personal Information
    email_address: {
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      severity: 'HIGH',
      description: 'Email address detected',
    },
    phone_number: {
      pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      severity: 'HIGH',
      description: 'Phone number detected',
    },
    social_security: {
      pattern: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
      severity: 'CRITICAL',
      description: 'Social Security Number detected',
    },

    // Internal URLs and IPs
    internal_ip: {
      pattern: /\b(10\.|172\.|192\.168\.|127\.|localhost)\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
      severity: 'MEDIUM',
      description: 'Internal IP address detected',
    },
    internal_url: {
      pattern: /\bhttps?:\/\/(localhost|127\.0\.0\.1|10\.|172\.|192\.168\.)\S+/gi,
      severity: 'MEDIUM',
      description: 'Internal URL detected',
    },

    // Sensitive File References
    secret_files: {
      pattern: /\.(key|pem|crt|p12|pfx|wallet|keystore)$/gi,
      severity: 'HIGH',
      description: 'Sensitive file reference detected',
    },

    // Environment Variables (only flag actual hardcoded values, not references)
    hardcoded_env: {
      pattern:
        /(?:^|[^a-zA-Z0-9_])(process\.env\.|BUN_ENV\[)[A-Z_]+\s*[=:]\s*['"]?([^'"\s]{3,})['"]?/g,
      severity: 'MEDIUM',
      description: 'Hardcoded environment variable value',
    },

    // Comments with sensitive info
    todo_secrets: {
      pattern: /(TODO|FIXME|XXX).*(password|secret|key|token)/gi,
      severity: 'MEDIUM',
      description: 'TODO comment with sensitive information',
    },
  };

  constructor() {
    console.log('🔍 Starting Hidden Metadata Audit & Cleanup...\n');
  }

  private async auditFile(filePath: string): Promise<void> {
    if (this.scannedFiles.has(filePath)) return;
    this.scannedFiles.add(filePath);

    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Check for sensitive patterns
      for (const [patternName, config] of Object.entries(this.riskPatterns)) {
        let match;
        while ((match = config.pattern.exec(content)) !== null) {
          const lineNumber = content.substring(0, match.index).split('\n').length;

          this.findings.push({
            type: config.severity as any,
            category: 'Sensitive Data',
            file: filePath,
            line: lineNumber,
            description: config.description,
            sensitiveData: match[0].length > 100 ? match[0].substring(0, 100) + '...' : match[0],
            recommendation: this.getRecommendation(patternName, match[0]),
            autoFixable: this.isAutoFixable(patternName),
          });
        }
      }

      // Check for file-specific issues
      await this.auditFileSpecificIssues(filePath, content, lines);
    } catch (error) {
      // Skip files that can't be read (binary files, permissions, etc.)
      if (error.code !== 'EISDIR' && error.code !== 'ENOENT') {
        this.findings.push({
          type: 'LOW',
          category: 'File Access',
          file: filePath,
          description: `Could not read file: ${error.message}`,
          recommendation: 'Check file permissions or exclude from audit',
          autoFixable: false,
        });
      }
    }
  }

  private async auditFileSpecificIssues(
    filePath: string,
    content: string,
    lines: string[]
  ): Promise<void> {
    const ext = extname(filePath).toLowerCase();
    const filename = basename(filePath).toLowerCase();

    // Git-related files
    if (filename === '.gitignore' && content.includes('.env')) {
      this.findings.push({
        type: 'MEDIUM',
        category: 'Git Security',
        file: filePath,
        description: '.env files should be in .gitignore',
        recommendation: 'Ensure .env files are properly ignored',
        autoFixable: true,
      });
    }

    // Environment files
    if (filename.startsWith('.env') || filename.includes('secret') || filename.includes('config')) {
      if (!filePath.includes('.example') && !filePath.includes('.template')) {
        this.findings.push({
          type: 'CRITICAL',
          category: 'Configuration Security',
          file: filePath,
          description: 'Sensitive configuration file detected',
          recommendation: 'Move to .env.example or remove sensitive data',
          autoFixable: false,
        });
      }
    }

    // Package.json files
    if (filename === 'package.json') {
      try {
        const pkg = JSON.parse(content);

        // Check for sensitive scripts
        if (pkg.scripts) {
          for (const [scriptName, scriptCommand] of Object.entries(pkg.scripts)) {
            if (typeof scriptCommand === 'string') {
              if (scriptCommand.includes('password') || scriptCommand.includes('secret')) {
                this.findings.push({
                  type: 'HIGH',
                  category: 'Package Security',
                  file: filePath,
                  description: `Script '${scriptName}' contains sensitive information`,
                  sensitiveData: scriptCommand,
                  recommendation: 'Remove sensitive data from package scripts',
                  autoFixable: true,
                });
              }
            }
          }
        }

        // Check for sensitive dependencies
        const sensitiveDeps = ['dotenv', 'config', 'secrets'];
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        for (const dep of sensitiveDeps) {
          if (allDeps[dep]) {
            this.findings.push({
              type: 'MEDIUM',
              category: 'Dependency Security',
              file: filePath,
              description: `Potentially sensitive dependency: ${dep}`,
              recommendation: 'Review dependency usage for security implications',
              autoFixable: false,
            });
          }
        }
      } catch (error) {
        this.findings.push({
          type: 'LOW',
          category: 'JSON Parsing',
          file: filePath,
          description: 'Could not parse package.json',
          recommendation: 'Fix JSON syntax',
          autoFixable: false,
        });
      }
    }

    // Log files
    if (filename.includes('.log') || ext === '.log') {
      this.findings.push({
        type: 'HIGH',
        category: 'Log Security',
        file: filePath,
        description: 'Log file containing potentially sensitive information',
        recommendation: 'Review log file contents and remove if containing sensitive data',
        autoFixable: true,
      });
    }

    // SQLite database files
    if (filename.includes('.db') || filename.includes('.sqlite')) {
      this.findings.push({
        type: 'HIGH',
        category: 'Database Security',
        file: filePath,
        description: 'SQLite database file detected',
        recommendation: 'Audit database contents for sensitive data',
        autoFixable: false,
      });
    }

    // Cache and temporary files
    if (filename.includes('cache') || filename.includes('tmp') || filename.includes('.tmp')) {
      this.findings.push({
        type: 'MEDIUM',
        category: 'Cache Files',
        file: filePath,
        description: 'Cache or temporary file detected',
        recommendation: 'Review contents and clean if containing sensitive data',
        autoFixable: true,
      });
    }
  }

  private getRecommendation(patternName: string, match: string): string {
    switch (patternName) {
      case 'api_key':
      case 'bearer_token':
      case 'jwt_token':
        return 'Move to environment variables or secure key management system';
      case 'db_password':
      case 'db_connection':
        return 'Use environment variables and connection pooling';
      case 'private_key':
      case 'ssh_key':
        return 'Store in secure key management system, never in codebase';
      case 'email_address':
      case 'phone_number':
        return 'Use placeholder data or anonymize personal information';
      default:
        return 'Remove sensitive data or use environment variables';
    }
  }

  private isAutoFixable(patternName: string): boolean {
    // Most patterns can be automatically fixed by removing or replacing
    return !['private_key', 'ssh_key', 'db_connection'].includes(patternName);
  }

  public async auditDirectory(rootPath: string = '.'): Promise<void> {
    console.log(`🔍 Scanning directory: ${rootPath}`);

    const scanDirectory = async (dirPath: string): Promise<void> => {
      try {
        const items = readdirSync(dirPath, { withFileTypes: true });

        for (const item of items) {
          const fullPath = join(dirPath, item.name);

          // Skip common directories that shouldn't be audited
          if (item.isDirectory()) {
            if (['node_modules', '.git', '.next', 'dist', 'build', '.cache'].includes(item.name)) {
              continue;
            }
            if (item.name.startsWith('.')) {
              continue; // Skip hidden directories
            }
            await scanDirectory(fullPath);
          } else if (item.isFile()) {
            // Only audit text files and common config files
            const ext = extname(item.name).toLowerCase();
            const textExtensions = [
              '.js',
              '.ts',
              '.json',
              '.txt',
              '.md',
              '.yml',
              '.yaml',
              '.env',
              '.config',
              '.ini',
              '.toml',
            ];

            if (textExtensions.includes(ext) || !ext) {
              await this.auditFile(fullPath);
            }
          }
        }
      } catch (error) {
        this.findings.push({
          type: 'LOW',
          category: 'Directory Access',
          file: dirPath,
          description: `Could not scan directory: ${error.message}`,
          recommendation: 'Check directory permissions',
          autoFixable: false,
        });
      }
    };

    await scanDirectory(rootPath);
  }

  public async auditGitHistory(): Promise<void> {
    console.log('🔍 Auditing Git History...');

    try {
      // Check for sensitive data in git history
      const { stdout: gitLog } = await new Promise((resolve, reject) => {
        const { spawn } = require('child_process');
        const git = spawn(
          'git',
          [
            'log',
            '--all',
            '--grep=password',
            '--grep=secret',
            '--grep=key',
            '--grep=token',
            '--oneline',
          ],
          { cwd: process.cwd() }
        );

        let stdout = '';
        let stderr = '';

        git.stdout.on('data', data => {
          stdout += data.toString();
        });
        git.stderr.on('data', data => {
          stderr += data.toString();
        });

        git.on('close', code => {
          if (code === 0) resolve({ stdout, stderr });
          else reject(new Error(stderr || 'Git command failed'));
        });
      });

      if (gitLog.trim()) {
        this.findings.push({
          type: 'HIGH',
          category: 'Git History',
          file: '.git/',
          description: 'Git history contains sensitive keywords',
          sensitiveData: gitLog.trim(),
          recommendation: 'Review git history and remove sensitive commits if found',
          autoFixable: false,
        });
      }

      // Check for large files in git
      const { stdout: largeFiles } = await new Promise((resolve, reject) => {
        const { spawn } = require('child_process');
        const git = spawn('git', ['rev-list', '--objects', '--all'], { cwd: process.cwd() });

        let stdout = '';
        git.stdout.on('data', data => {
          stdout += data.toString();
        });

        git.on('close', code => {
          if (code === 0) resolve({ stdout });
          else reject(new Error('Git command failed'));
        });
      });

      const fileSizes = new Map<string, number>();
      for (const line of largeFiles.trim().split('\n')) {
        const [hash, ...fileParts] = line.trim().split(/\s+/);
        if (fileParts.length > 0) {
          const fileName = fileParts.join(' ');
          // This is a simplified check - in practice, you'd use git cat-file to get actual sizes
          if (
            fileName.includes('.db') ||
            fileName.includes('.sqlite') ||
            fileName.includes('.log')
          ) {
            this.findings.push({
              type: 'MEDIUM',
              category: 'Git Large Files',
              file: fileName,
              description: 'Potentially large or sensitive file in git history',
              recommendation:
                'Review file contents and consider removing from git history if sensitive',
              autoFixable: false,
            });
          }
        }
      }
    } catch (error) {
      this.findings.push({
        type: 'LOW',
        category: 'Git Audit',
        file: '.git/',
        description: `Could not audit git history: ${error.message}`,
        recommendation: 'Ensure git repository is accessible',
        autoFixable: false,
      });
    }
  }

  public async performCleanup(): Promise<string[]> {
    console.log('🧹 Performing automatic cleanup...');

    const cleanupActions: string[] = [];

    for (const finding of this.findings) {
      if (finding.autoFixable) {
        try {
          switch (finding.category) {
            case 'Log Security':
            case 'Cache Files':
              if (existsSync(finding.file)) {
                unlinkSync(finding.file);
                cleanupActions.push(`Removed file: ${finding.file}`);
              }
              break;

            case 'Package Security':
              if (finding.file.endsWith('package.json')) {
                const content = readFileSync(finding.file, 'utf-8');
                const pkg = JSON.parse(content);

                // Remove sensitive scripts
                if (pkg.scripts) {
                  for (const [scriptName, scriptCommand] of Object.entries(pkg.scripts)) {
                    if (
                      typeof scriptCommand === 'string' &&
                      (scriptCommand.includes('password') || scriptCommand.includes('secret'))
                    ) {
                      delete pkg.scripts[scriptName];
                      cleanupActions.push(
                        `Removed sensitive script '${scriptName}' from ${finding.file}`
                      );
                    }
                  }

                  writeFileSync(finding.file, JSON.stringify(pkg, null, 2));
                }
              }
              break;
          }
        } catch (error) {
          console.warn(`⚠️ Could not auto-fix ${finding.file}: ${error.message}`);
        }
      }
    }

    return cleanupActions;
  }

  public generateReport(): AuditResult {
    const totalFiles = this.scannedFiles.size;
    const riskScore = this.calculateRiskScore();

    return {
      totalFiles,
      findings: this.findings,
      riskScore,
      cleanupActions: [],
    };
  }

  private calculateRiskScore(): number {
    let score = 100;

    for (const finding of this.findings) {
      switch (finding.type) {
        case 'CRITICAL':
          score -= 25;
          break;
        case 'HIGH':
          score -= 15;
          break;
        case 'MEDIUM':
          score -= 10;
          break;
        case 'LOW':
          score -= 5;
          break;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  public async runFullAudit(): Promise<AuditResult> {
    const startTime = Date.now();

    // Audit filesystem
    await this.auditDirectory();

    // Audit git history
    await this.auditGitHistory();

    const totalTime = Date.now() - startTime;
    console.log(`\n⏱️  Audit completed in ${Math.round(totalTime / 1000)}s`);

    const result = this.generateReport();
    this.displayReport(result);

    return result;
  }

  private displayReport(result: AuditResult): void {
    console.log('\n' + '='.repeat(80));
    console.log('🔒 HIDDEN METADATA AUDIT REPORT');
    console.log('='.repeat(80));

    const critical = result.findings.filter(f => f.type === 'CRITICAL').length;
    const high = result.findings.filter(f => f.type === 'HIGH').length;
    const medium = result.findings.filter(f => f.type === 'MEDIUM').length;
    const low = result.findings.filter(f => f.type === 'LOW').length;
    const info = result.findings.filter(f => f.type === 'INFO').length;

    console.log(`\n📊 Audit Summary:`);
    console.log(`   📁 Files Scanned: ${result.totalFiles}`);
    console.log(`   🔍 Findings: ${result.findings.length}`);
    console.log(`   📊 Risk Score: ${result.riskScore}/100`);

    console.log(`\n🚨 Severity Breakdown:`);
    console.log(`   🔴 Critical: ${critical}`);
    console.log(`   🟠 High: ${high}`);
    console.log(`   🟡 Medium: ${medium}`);
    console.log(`   🔵 Low: ${low}`);
    console.log(`   ℹ️  Info: ${info}`);

    // Show top findings
    if (result.findings.length > 0) {
      console.log(`\n🔍 Top Findings:`);

      // Group by category
      const categories = result.findings.reduce(
        (acc, f) => {
          acc[f.category] = (acc[f.category] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      Object.entries(categories)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .forEach(([category, count]) => {
          console.log(`   • ${category}: ${count} findings`);
        });

      // Show critical findings
      const criticalFindings = result.findings.filter(f => f.type === 'CRITICAL');
      if (criticalFindings.length > 0) {
        console.log(`\n🚨 Critical Issues:`);
        criticalFindings.slice(0, 3).forEach(finding => {
          console.log(`   • ${finding.file}: ${finding.description}`);
        });
      }
    }

    console.log('\n💡 Security Assessment:');
    if (result.riskScore >= 90) {
      console.log('   🟢 EXCELLENT: No significant security risks detected');
    } else if (result.riskScore >= 70) {
      console.log('   🟡 GOOD: Minor security issues found, address as needed');
    } else if (result.riskScore >= 50) {
      console.log('   🟠 MODERATE: Security issues require attention');
    } else {
      console.log('   🔴 CRITICAL: Immediate security review required');
    }

    console.log('\n🔧 Recommended Actions:');
    console.log('   1. Review all CRITICAL and HIGH severity findings');
    console.log('   2. Remove or secure any sensitive data found');
    console.log('   3. Update .gitignore to prevent future leaks');
    console.log('   4. Consider using git-secrets or similar tools');
    console.log('   5. Implement automated security scanning in CI/CD');

    console.log('='.repeat(80));
  }
}

// Export for use in other tools
export { MetadataAuditCleanup };

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0] || 'audit';

  const auditor = new MetadataAuditCleanup();

  switch (command) {
    case 'audit':
      await auditor.runFullAudit();
      break;

    case 'cleanup':
      const result = await auditor.runFullAudit();
      const cleanupActions = await auditor.performCleanup();
      console.log(`\n🧹 Cleanup Summary:`);
      cleanupActions.forEach(action => console.log(`   ✅ ${action}`));
      console.log(`\n📊 ${cleanupActions.length} automatic cleanup actions performed`);
      break;

    case 'report':
      const auditResult = await auditor.runFullAudit();
      const report = JSON.stringify(auditResult, null, 2);
      const filename = `metadata-audit-${new Date().toISOString().split('T')[0]}.json`;
      await Bun.write(filename, report);
      console.log(`📄 Detailed report saved to: ${filename}`);
      break;

    default:
      console.log('Usage: bun run scripts/metadata-audit-cleanup.bun.ts [audit|cleanup|report]');
      console.log('');
      console.log('Commands:');
      console.log('  audit     - Run comprehensive metadata audit');
      console.log('  cleanup   - Run audit and perform automatic cleanup');
      console.log('  report    - Run audit and generate detailed JSON report');
      console.log('');
      console.log('Examples:');
      console.log('  bun run scripts/metadata-audit-cleanup.bun.ts audit');
      console.log('  bun run scripts/metadata-audit-cleanup.bun.ts cleanup');
      break;
  }
}
