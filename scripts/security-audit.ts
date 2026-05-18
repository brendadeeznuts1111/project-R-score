#!/usr/bin/env bun

/**
 * 🔒 FactoryWager Security Audit v5.1
 *
 * Comprehensive security audit with version context and historical analysis
 *
 * @version 5.1
 */

import { VersionedSecretManager } from '../lib/security/versioned-secrets.ts';
import { SecretLifecycleManager } from '../lib/security/secret-lifecycle.ts';
import { styled } from '../lib/theme/colors.ts';
import { refs } from '@fw/business';

const versionedManager = new VersionedSecretManager(refs);
const lifecycleManager = new SecretLifecycleManager();

interface AuditOptions {
  includeVersions?: boolean;
  days?: number;
  output?: 'console' | 'html' | 'json';
  criticalOnly?: boolean;
}

async function main() {
  const args = Bun.argv.slice(2);
  const options: AuditOptions = {
    includeVersions: args.includes('--include-versions'),
    days: parseInt(args.find(arg => arg.startsWith('--days='))?.split('=')[1] || '30'),
    output: (args.find(arg => arg.startsWith('--output='))?.split('=')[1] as any) || 'console',
    criticalOnly: args.includes('--critical-only'),
  };

  console.info(styled('🔒 FactoryWager Security Audit v5.1', 'accent'));
  console.info(styled('===================================', 'muted'));
  console.info('');

  try {
    const auditResults = await performSecurityAudit(options);

    // Output results based on format
    switch (options.output) {
      case 'html':
        await outputHTMLReport(auditResults);
        break;
      case 'json':
        await outputJSONReport(auditResults);
        break;
      default:
        outputConsoleReport(auditResults);
        break;
    }

    // Summary
    const critical = auditResults.filter(r => r.severity === 'CRITICAL').length;
    const warnings = auditResults.filter(r => r.severity === 'WARNING').length;
    const info = auditResults.filter(r => r.severity === 'INFO').length;

    console.info('');
    console.info(styled('📊 Audit Summary:', 'accent'));
    console.info(styled(`   Critical: ${critical}`, critical > 0 ? 'error' : 'success'));
    console.info(styled(`   Warnings: ${warnings}`, warnings > 0 ? 'warning' : 'muted'));
    console.info(styled(`   Info: ${info}`, 'muted'));
    console.info(styled(`   Total: ${auditResults.length}`, 'primary'));

    if (critical > 0) {
      console.info('');
      console.info(styled('🚨 CRITICAL ISSUES FOUND - Immediate attention required!', 'error'));
    } else {
      console.info('');
      console.info(styled('✅ Audit passed - No critical security issues', 'success'));
    }
  } catch (error) {
    console.error(styled(`❌ Audit failed: ${error.message}`, 'error'));
    process.exit(1);
  }
}

interface AuditResult {
  key: string;
  issue: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  description: string;
  recommendation: string;
  versions?: string[];
  lastRotated?: string;
  expiresIn?: number;
}

async function performSecurityAudit(options: AuditOptions): Promise<AuditResult[]> {
  const results: AuditResult[] = [];

  // Get all secrets (mock implementation)
  const allSecrets = await getAllSecrets();

  for (const secret of allSecrets) {
    // Check version history if requested
    if (options.includeVersions) {
      const history = await versionedManager.getHistory(secret.key, 10);

      if (history.length === 0) {
        results.push({
          key: secret.key,
          issue: 'No version history',
          severity: 'WARNING',
          description: 'Secret has no version history',
          recommendation: 'Initialize versioning for this secret',
        });
      } else {
        // Check rotation frequency
        const lastRotation = new Date(history[0].timestamp);
        const daysSinceRotation = (Date.now() - lastRotation.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceRotation > options.days!) {
          results.push({
            key: secret.key,
            issue: 'Stale secret',
            severity: 'WARNING',
            description: `Last rotated ${Math.floor(daysSinceRotation)} days ago`,
            recommendation: 'Consider rotating this secret',
            lastRotated: history[0].timestamp,
            versions: history.map(h => h.version),
          });
        }
      }
    }

    // Check expiration
    const expiring = await lifecycleManager.checkExpirations();
    const expiration = expiring.find(e => e.key === secret.key);

    if (expiration && expiration.daysLeft <= 7) {
      results.push({
        key: secret.key,
        issue: 'Expiring soon',
        severity: expiration.daysLeft <= 3 ? 'CRITICAL' : 'WARNING',
        description: `Expires in ${expiration.daysLeft} days`,
        recommendation: 'Rotate before expiration',
        expiresIn: expiration.daysLeft,
      });
    }

    // Skip INFO level issues if critical-only
    if (
      options.criticalOnly &&
      results.length > 0 &&
      results[results.length - 1].severity === 'INFO'
    ) {
      results.pop();
    }
  }

  return results;
}

function outputConsoleReport(results: AuditResult[]) {
  if (results.length === 0) {
    console.info(styled('✅ No security issues found', 'success'));
    return;
  }

  console.info(styled('🚨 Security Issues Found:', 'error'));
  console.info('');

  for (const result of results) {
    const color =
      result.severity === 'CRITICAL'
        ? 'error'
        : result.severity === 'WARNING'
          ? 'warning'
          : 'muted';

    console.info(styled(`${result.severity}: ${result.key}`, color));
    console.info(styled(`   Issue: ${result.issue}`, 'muted'));
    console.info(styled(`   Description: ${result.description}`, 'muted'));
    console.info(styled(`   Recommendation: ${result.recommendation}`, 'primary'));
    console.info('');
  }
}

async function outputHTMLReport(results: AuditResult[]) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>FactoryWager Security Audit v5.1</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .critical { color: #dc3545; }
    .warning { color: #ffc107; }
    .info { color: #17a2b8; }
    .success { color: #28a745; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔒 FactoryWager Security Audit v5.1</h1>
    <p>Generated: ${new Date().toISOString()}</p>
    <p>Issues Found: ${results.length}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Severity</th>
        <th>Key</th>
        <th>Issue</th>
        <th>Description</th>
        <th>Recommendation</th>
      </tr>
    </thead>
    <tbody>
      ${results
        .map(
          result => `
        <tr class="${result.severity.toLowerCase()}">
          <td>${result.severity}</td>
          <td>${result.key}</td>
          <td>${result.issue}</td>
          <td>${result.description}</td>
          <td>${result.recommendation}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>
</body>
</html>`;

  const filename = `.audit/security-audit-${Date.now()}.html`;
  await Bun.write(filename, html);

  console.info(styled(`📄 HTML report: ${filename}`, 'success'));
}

async function outputJSONReport(results: AuditResult[]) {
  const report = {
    version: '5.1',
    generated: new Date().toISOString(),
    totalIssues: results.length,
    critical: results.filter(r => r.severity === 'CRITICAL').length,
    warnings: results.filter(r => r.severity === 'WARNING').length,
    info: results.filter(r => r.severity === 'INFO').length,
    results,
  };

  const filename = `.audit/security-audit-${Date.now()}.json`;
  await Bun.write(filename, JSON.stringify(report, null, 2));

  console.info(styled(`📄 JSON report: ${filename}`, 'success'));
}

// Mock function - replace with actual implementation
async function getAllSecrets(): Promise<Array<{ key: string; value: string }>> {
  // This would use Bun.secrets.list() or similar
  return [
    { key: 'API_KEY_V3', value: 'sk_live_123' },
    { key: 'DATABASE_URL', value: 'postgres://...' },
    { key: 'JWT_SECRET', value: 'secret123' },
  ];
}

main().catch(error => {
  console.error(styled(`💥 Fatal error: ${error.message}`, 'error'));
  process.exit(1);
});
