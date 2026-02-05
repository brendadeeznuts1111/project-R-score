#!/usr/bin/env bun
/**
 * Security audit runner for tests
 * Usage: bun run test:audit --dry-run --validate-secrets
 */

import { parseArgs } from 'util';
import { readdir } from 'fs/promises';
import { join } from 'path';

const args = parseArgs({
  args: Bun.argv,
  options: {
    'dry-run': { type: 'boolean' },
    'validate-secrets': { type: 'boolean' },
    'check-dependencies': { type: 'boolean' },
    'scan-code': { type: 'boolean' }
  },
  allowPositionals: true,
});

const {
  'dry-run': dryRun = false,
  'validate-secrets': validateSecrets = true,
  'check-dependencies': checkDependencies = true,
  'scan-code': scanCode = true,
} = args.values;

interface AuditResult {
  category: string;
  status: 'pass' | 'warn' | 'fail';
  issues: string[];
  count: number;
}

async function runAudit() {
  console.log('🔍 Running security audit...\n');
  
  const results: AuditResult[] = [];
  
  // Validate secrets
  if (validateSecrets) {
    const secretResult = await auditSecrets();
    results.push(secretResult);
  }
  
  // Check dependencies
  if (checkDependencies) {
    const depResult = await auditDependencies();
    results.push(depResult);
  }
  
  // Scan code for security issues
  if (scanCode) {
    const codeResult = await auditCode();
    results.push(codeResult);
  }
  
  // Print results
  printAuditResults(results);
  
  // Exit with error code if any failures
  const hasFailures = results.some(r => r.status === 'fail');
  if (!dryRun && hasFailures) {
    process.exit(1);
  }
}

async function auditSecrets(): Promise<AuditResult> {
  console.log('🔐 Auditing secrets...');
  
  const issues: string[] = [];
  const testDirs = ['src/__tests__', '.', 'test', 'tests'];
  
  // Secret patterns to detect
  const secretPatterns = [
    { pattern: /password\s*=\s*['"]\w+['"]/i, name: 'Hardcoded password' },
    { pattern: /secret\s*=\s*['"]\w+['"]/i, name: 'Hardcoded secret' },
    { pattern: /api_key\s*=\s*['"]\w+['"]/i, name: 'Hardcoded API key' },
    { pattern: /token\s*=\s*['"]\w+['"]/i, name: 'Hardcoded token' },
    { pattern: /private_key\s*=\s*['"]\w+['"]/i, name: 'Hardcoded private key' },
    { pattern: /['"]sk-[a-zA-Z0-9]{20,}['"]/, name: 'Potential Stripe key' },
    { pattern: /['"]ghp_[a-zA-Z0-9]{36}['"]/, name: 'Potential GitHub token' },
  ];
  
  for (const dir of testDirs) {
    try {
      const files = await readdir(dir, { recursive: true });
      for (const file of files) {
        if (typeof file === 'string' && (file.endsWith('.test.ts') || file.endsWith('.spec.ts'))) {
          const fullPath = join(dir, file);
          const content = await Bun.file(fullPath).text();
          
          for (const { pattern, name } of secretPatterns) {
            const matches = content.match(pattern);
            if (matches) {
              issues.push(`${name} in ${fullPath}`);
            }
          }
        }
      }
    } catch (err) {
      // Directory might not exist
    }
  }
  
  return {
    category: 'Secrets',
    status: issues.length > 0 ? 'fail' : 'pass',
    issues,
    count: issues.length
  };
}

async function auditDependencies(): Promise<AuditResult> {
  console.log('📦 Auditing dependencies...');
  
  const issues: string[] = [];
  
  try {
    const packageJson = await Bun.file('package.json').json();
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Check for known vulnerable packages (simplified)
    const vulnerablePackages = [
      'lodash@<4.17.21',
      'request@<2.88.2',
      'axios@<0.21.1'
    ];
    
    for (const [pkg, version] of Object.entries(deps)) {
      for (const vulnerable of vulnerablePackages) {
        const [vulnPkg, vulnVersion] = vulnerable.split('@<');
        if (pkg === vulnPkg && version.startsWith(vulnVersion)) {
          issues.push(`${pkg}@${version} - Potential vulnerability`);
        }
      }
    }
    
    // Check for excessive dependencies
    if (Object.keys(deps).length > 500) {
      issues.push(`High dependency count: ${Object.keys(deps).length}`);
    }
    
  } catch (err) {
    issues.push('Could not read package.json');
  }
  
  return {
    category: 'Dependencies',
    status: issues.length > 0 ? 'warn' : 'pass',
    issues,
    count: issues.length
  };
}

async function auditCode(): Promise<AuditResult> {
  console.log('🔍 Auditing code patterns...');
  
  const issues: string[] = [];
  const testDirs = ['src/__tests__', '.', 'test', 'tests'];
  
  // Security anti-patterns
  const antiPatterns = [
    { pattern: /eval\s*\(/, name: 'Use of eval()' },
    { pattern: /Function\s*\(/, name: 'Use of Function constructor' },
    { pattern: /innerHTML\s*=/, name: 'Direct innerHTML assignment' },
    { pattern: /outerHTML\s*=/, name: 'Direct outerHTML assignment' },
    { pattern: /document\.write/, name: 'Use of document.write' },
    { pattern: /setTimeout\s*\(\s*['"`]/, name: 'setTimeout with string' },
    { pattern: /setInterval\s*\(\s*['"`]/, name: 'setInterval with string' },
  ];
  
  for (const dir of testDirs) {
    try {
      const files = await readdir(dir, { recursive: true });
      for (const file of files) {
        if (typeof file === 'string' && (file.endsWith('.test.ts') || file.endsWith('.spec.ts'))) {
          const fullPath = join(dir, file);
          const content = await Bun.file(fullPath).text();
          
          for (const { pattern, name } of antiPatterns) {
            const matches = content.match(pattern);
            if (matches) {
              issues.push(`${name} in ${fullPath}`);
            }
          }
        }
      }
    } catch (err) {
      // Directory might not exist
    }
  }
  
  return {
    category: 'Code Security',
    status: issues.length > 0 ? 'warn' : 'pass',
    issues,
    count: issues.length
  };
}

function printAuditResults(results: AuditResult[]) {
  console.log('\n📊 Audit Results:');
  console.log('═'.repeat(50));
  
  let totalIssues = 0;
  
  for (const result of results) {
    const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
    console.log(`\n${icon} ${result.category}: ${result.count} issues`);
    
    if (result.issues.length > 0) {
      for (const issue of result.issues.slice(0, 5)) {
        console.log(`   • ${issue}`);
      }
      if (result.issues.length > 5) {
        console.log(`   ... and ${result.issues.length - 5} more`);
      }
    }
    
    totalIssues += result.count;
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log(`Total issues found: ${totalIssues}`);
  
  if (totalIssues === 0) {
    console.log('🎉 Security audit passed!');
  } else {
    console.log('⚠️  Security issues detected. Please review and fix.');
  }
}

runAudit().catch(console.error);
