#!/usr/bin/env bun

/**
 * CLI interface for @fire22/security-audit
 *
 * Command-line interface for running security audits with detailed reporting.
 */

import { EnhancedFantasy42SecurityAuditor } from './auditor';
import type { CLIOptions, CLIResult } from './types';

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--help':
      case '-h':
        options.help = true;
        break;

      case '--version':
      case '-v':
        options.version = true;
        break;

      case '--verbose':
        options.verbose = true;
        break;

      case '--report':
        options.report = true;
        break;

      case '--fix':
        options.fix = true;
        break;

      case '--deep-scan':
        options.deepScan = true;
        break;

      case '--benchmark':
        options.benchmark = true;
        break;

      case '--fail-fast':
        options.failFast = true;
        break;

      case '--packages':
      case '-p':
        if (i + 1 < args.length) {
          options.packages = args[i + 1].split(',');
          i++;
        }
        break;

      case '--compliance':
        if (i + 1 < args.length) {
          options.compliance = args[i + 1].split(',');
          i++;
        }
        break;

      case '--output':
      case '-o':
        if (i + 1 < args.length) {
          options.output = args[i + 1];
          i++;
        }
        break;

      case '--format':
      case '-f':
        if (i + 1 < args.length) {
          options.format = args[i + 1] as 'json' | 'html' | 'markdown';
          i++;
        }
        break;

      case '--severity':
      case '-s':
        if (i + 1 < args.length) {
          options.severity = args[i + 1] as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
          i++;
        }
        break;

      case '--categories':
      case '-c':
        if (i + 1 < args.length) {
          options.categories = args[i + 1].split(',');
          i++;
        }
        break;

      default:
        // Assume it's a package name
        if (!options.packages) {
          options.packages = [];
        }
        options.packages.push(arg);
        break;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
🔒 @fire22/security-audit - Enterprise Security Audit Tool

USAGE:
  fire22-security-audit [options] [packages...]

EXAMPLES:
  fire22-security-audit                           # Audit all packages
  fire22-security-audit --verbose                 # Verbose output
  fire22-security-audit --deep-scan               # Deep source code analysis
  fire22-security-audit --compliance gdpr,pci     # Check specific compliance
  fire22-security-audit --report --format json    # Generate JSON report
  fire22-security-audit package-a package-b       # Audit specific packages

OPTIONS:
  -h, --help              Show this help message
  -v, --version           Show version information
  --verbose               Enable verbose output
  --report                Generate detailed audit report
  --fix                   Attempt automatic fixes for issues
  --deep-scan             Perform deep source code analysis
  --benchmark             Include performance benchmarks
  --fail-fast             Stop on first critical issue
  -p, --packages <list>   Comma-separated list of packages to audit
  --compliance <list>     Comma-separated compliance frameworks
  -o, --output <file>     Output file for report
  -f, --format <format>   Report format (json, html, markdown)
  -s, --severity <level>  Minimum severity level to report
  -c, --categories <list> Comma-separated categories to check

COMPLIANCE FRAMEWORKS:
  gdpr        - General Data Protection Regulation
  pci         - Payment Card Industry DSS
  aml         - Anti-Money Laundering
  kyc         - Know Your Customer
  responsible-gaming - Responsible Gambling Standards
  data-protection  - General Data Protection Standards

SECURITY CATEGORIES:
  Package Security      - Dependency vulnerabilities
  Code Security         - Source code vulnerabilities
  Configuration Security - Config file issues
  Infrastructure Security - System-level issues

EXIT CODES:
  0  - Audit passed, no critical issues
  1  - Audit failed, critical issues found
  2  - Audit error, unable to complete

For more information, visit: https://fire22.com/docs/security-audit
`);
}

function showVersion(): void {
  console.log('🔒 @fire22/security-audit v1.0.0');
  console.log('Enterprise Security Audit Tool for Fantasy42-Fire22');
  console.log('Built with Bun runtime and TypeScript');
}

async function runAudit(options: CLIOptions): Promise<CLIResult> {
  try {
    console.log('🔍 Starting Fantasy42 Enterprise Security Audit...\n');

    const auditor = new EnhancedFantasy42SecurityAuditor();
    const auditOptions = {
      packages: options.packages,
      verbose: options.verbose,
      report: options.report || true,
      fix: options.fix,
      deepScan: options.deepScan,
      compliance: options.compliance,
      benchmark: options.benchmark,
      failFast: options.failFast,
    };

    const summary = await auditor.runEnhancedSecurityAudit(auditOptions);

    // Display results
    displayResults(summary, auditor.getResults());

    // Determine exit code
    let exitCode = 0;
    let message = '✅ Security audit completed successfully';

    if (summary.criticalIssues > 0) {
      exitCode = 1;
      message = `❌ Security audit failed: ${summary.criticalIssues} critical issues found`;
    } else if (summary.highIssues > 0 && options.failFast) {
      exitCode = 1;
      message = `❌ Security audit failed: ${summary.highIssues} high-severity issues found`;
    }

    console.log(`\n${message}`);

    return {
      success: exitCode === 0,
      exitCode,
      message,
      report: auditor.getResults(),
    };
  } catch (error) {
    console.error('❌ Security audit failed:', error);
    return {
      success: false,
      exitCode: 2,
      message: 'Security audit encountered an error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function displayResults(summary: any, fullResults: any): void {
  console.log('\n📊 Enterprise Security Audit Results');
  console.log('=====================================');

  console.log(`\n🎯 Overall Security Score: ${summary.overallScore}/100`);
  console.log(`🚨 Risk Level: ${summary.riskLevel}`);
  console.log(`⏱️  Execution Time: ${summary.executionTime}ms`);

  console.log('\n📦 Package Summary:');
  console.log(`   Total Packages: ${summary.totalPackages}`);
  console.log(`   ✅ Secure: ${summary.securePackages}`);
  console.log(`   ⚠️  Vulnerable: ${summary.vulnerablePackages}`);

  console.log('\n🔍 Issues by Severity:');
  console.log(`   🚨 Critical: ${summary.criticalIssues}`);
  console.log(`   🔴 High: ${summary.highIssues}`);
  console.log(`   🟡 Medium: ${summary.mediumIssues}`);
  console.log(`   🟢 Low: ${summary.lowIssues}`);

  if (fullResults.recommendations?.length > 0) {
    console.log('\n💡 Key Recommendations:');
    fullResults.recommendations.forEach((rec: string, index: number) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }

  // Display top issues
  const issues = fullResults.issues || [];
  if (issues.length > 0) {
    console.log('\n🚨 Top Security Issues:');
    const topIssues = issues
      .sort((a: any, b: any) => {
        const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
      .slice(0, 5);

    topIssues.forEach((issue: any, index: number) => {
      const severityIcon =
        issue.severity === 'CRITICAL'
          ? '🚨'
          : issue.severity === 'HIGH'
            ? '🔴'
            : issue.severity === 'MEDIUM'
              ? '🟡'
              : '🟢';
      console.log(`   ${index + 1}. ${severityIcon} ${issue.code}: ${issue.title}`);
      console.log(`      📍 ${issue.file || 'Unknown file'}`);
      if (issue.line) {
        console.log(`      📝 Line ${issue.line}: ${issue.evidence?.substring(0, 60)}...`);
      }
    });
  }
}

// Main execution
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    return;
  }

  if (options.version) {
    showVersion();
    return;
  }

  const result = await runAudit(options);
  process.exit(result.exitCode);
}

// Run the CLI
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(2);
});
