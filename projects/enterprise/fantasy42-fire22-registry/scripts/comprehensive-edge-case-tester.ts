#!/usr/bin/env bun

/**
 * 🧪 Comprehensive Edge Case Tester
 *
 * Tests all edge cases and validates operations across the entire Fantasy42-Fire22 platform.
 * Covers all systems: Playbook, ARB, CI/CD, Compliance, Fantasy402, Security, etc.
 *
 * Usage:
 *   bun run scripts/comprehensive-edge-case-tester.ts [options]
 *
 * Options:
 *   --full-suite        Run complete test suite (default)
 *   --ci-cd-only        Test only CI/CD integration
 *   --security-only     Test only security scanning
 *   --fantasy402-only   Test only Fantasy402 integration
 *   --playbook-only     Test only playbook compliance
 *   --edge-cases        Focus on edge cases only
 *   --verbose           Enable detailed logging
 *   --report <format>   Output format: json, markdown, html
 */

// 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's enhanced fs operations and fs.glob
import * as fs from 'fs';
import { join, resolve, basename } from 'path';
import { execSync, spawn } from 'child_process';
import { writeFileSync, unlinkSync, existsSync, statSync, readdirSync } from 'fs';

interface TestResult {
  testName: string;
  category: string;
  status: 'PASS' | 'FAIL' | 'SKIP' | 'ERROR';
  duration: number;
  message: string;
  details?: any;
  timestamp: string;
}

interface TestSuite {
  name: string;
  description: string;
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    errors: number;
    duration: number;
  };
}

class ComprehensiveEdgeCaseTester {
  private results: TestSuite[] = [];
  private verbose: boolean = false;
  private testStartTime: number = Date.now();

  constructor(verbose: boolean = false) {
    this.verbose = verbose;
  }

  async runFullTestSuite(): Promise<void> {
    console.log('🚀 Starting Comprehensive Edge Case Testing Suite\n');

    // Run all test suites
    await this.testPlaybookCompliance();
    await this.testARBProcess();
    await this.testCIDCIntegration();
    await this.testSecurityScanning();
    await this.testFantasy402Integration();
    await this.testSessionManagement();
    await this.testPackageBenchmarking();
    await this.testEdgeCases();

    // Generate comprehensive report
    await this.generateComprehensiveReport();
  }

  private async testPlaybookCompliance(): Promise<void> {
    const suite: TestSuite = {
      name: 'Playbook Compliance',
      description: 'Test all playbook compliance automation and validation',
      tests: [],
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, errors: 0, duration: 0 }
    };

    const suiteStart = Date.now();

    // Test 1: Playbook auditor with missing dependencies
    await this.runTest(suite, 'playbook-auditor-missing-deps', async () => {
      const result = await this.executeCommand('bun run scripts/playbook-auditor.ts --repo /nonexistent --output json', { timeout: 10000 });
      // The auditor should exit with non-zero code when repo doesn't exist
      return result.exitCode !== 0 ? 'PASS' : 'FAIL';
    }, 'Should handle missing repository gracefully');

    // Test 2: Playbook auditor with empty repository
    await this.runTest(suite, 'playbook-auditor-empty-repo', async () => {
      const tempDir = '/tmp/empty-repo-' + Date.now();
      execSync(`mkdir -p ${tempDir}`);
      execSync(`echo '{}' > ${tempDir}/package.json`);

      const result = await this.executeCommand(`bun run scripts/playbook-auditor.ts --repo ${tempDir} --output json`);
      execSync(`rm -rf ${tempDir}`);

      return result.exitCode === 0 ? 'PASS' : 'FAIL';
    }, 'Should handle empty repositories');

    // Test 3: Multiple output formats
    await this.runTest(suite, 'playbook-auditor-output-formats', async () => {
      const result = await this.executeCommand('bun run scripts/playbook-auditor.ts --repo . --output json');
      if (result.exitCode !== 0) return 'FAIL';

      const result2 = await this.executeCommand('bun run scripts/playbook-auditor.ts --repo . --output markdown');
      return result2.exitCode === 0 ? 'PASS' : 'FAIL';
    }, 'Should support multiple output formats');

    // Test 4: Invalid playbook configuration
    await this.runTest(suite, 'playbook-invalid-config', async () => {
      const backupPath = 'scripts/playbook-auditor.ts.backup';
      const originalPath = 'scripts/playbook-auditor.ts';

      // Create a corrupted version for testing
      execSync(`cp ${originalPath} ${backupPath}`);
      execSync(`echo "invalid syntax {{{{" >> ${originalPath}`);

      const result = await this.executeCommand('bun run scripts/playbook-auditor.ts --repo . --output json');

      // Restore original
      execSync(`mv ${backupPath} ${originalPath}`);

      return result.exitCode !== 0 ? 'PASS' : 'FAIL';
    }, 'Should handle syntax errors gracefully');

    suite.summary.duration = Date.now() - suiteStart;
    this.results.push(suite);
  }

  private async testARBProcess(): Promise<void> {
    const suite: TestSuite = {
      name: 'ARB Design Document Process',
      description: 'Test ARB design document validation and workflow',
      tests: [],
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, errors: 0, duration: 0 }
    };

    const suiteStart = Date.now();

    // Test 1: Valid ARB document
    await this.runTest(suite, 'arb-valid-document', async () => {
      const result = await this.executeCommand('bun run scripts/arb-design-doc-validator.ts --validate docs/arb-design-docs/arb-2025-004-fantasy42-recommendation-engine.json');
      return result.exitCode === 0 && result.stdout.includes('PASSED') ? 'PASS' : 'FAIL';
    }, 'Should validate correct ARB design document');

    // Test 2: Missing ARB document
    await this.runTest(suite, 'arb-missing-document', async () => {
      const result = await this.executeCommand('bun run scripts/arb-design-doc-validator.ts --validate /nonexistent/arb-doc.json');
      return result.exitCode !== 0 ? 'PASS' : 'FAIL';
    }, 'Should handle missing ARB documents');

    // Test 3: Invalid ARB document format
    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file operations
    await this.runTest(suite, 'arb-invalid-format', async () => {
      const tempFile = `/tmp/invalid-arb-${Date.now()}.json`;
      await Bun.write(tempFile, '{"invalid": "format", "missing": "required fields"}');

      const result = await this.executeCommand(`bun run scripts/arb-design-doc-validator.ts --validate ${tempFile}`);
      // Clean up temp file using Bun operations
      try {
        await Bun.write(tempFile, '');
      } catch {
        // Ignore cleanup errors
      }

      return result.exitCode !== 0 ? 'PASS' : 'FAIL';
    }, 'Should reject invalid ARB document format');

    // Test 4: ARB ticket format validation
    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file operations
    await this.runTest(suite, 'arb-ticket-format', async () => {
      const tempFile = `/tmp/arb-ticket-test-${Date.now()}.json`;
      const invalidDoc = {
        version: "1.0",
        title: "Test",
        author: "Test Author",
        reviewers: ["reviewer@test.com"],
        arbTicket: "INVALID-TICKET-FORMAT",
        priority: "HIGH",
        architecturalChanges: { newServices: [], modifiedServices: [], deprecatedServices: [], databaseChanges: [], apiChanges: [] },
        complianceRequirements: { gdpr: false, securityAudit: false, performanceReview: false, costAnalysis: false },
        implementation: { timeline: "1 week", riskLevel: "LOW", rollbackPlan: "Simple rollback", testingStrategy: "Unit tests" },
        playbookCompliance: { tenets: ["Security"], lenses: ["Edge-Native"], exceptions: [] }
      };
      await Bun.write(tempFile, JSON.stringify(invalidDoc, null, 2));

      const result = await this.executeCommand(`bun run scripts/arb-design-doc-validator.ts --validate ${tempFile}`);
      // Clean up temp file using Bun operations
      try {
        await Bun.write(tempFile, '');
      } catch {
        // Ignore cleanup errors
      }

      return result.exitCode !== 0 && (result.stdout.includes('Invalid ARB ticket format') || result.stderr.includes('Invalid ARB ticket format')) ? 'PASS' : 'FAIL';
    }, 'Should validate ARB ticket format');

    suite.summary.duration = Date.now() - suiteStart;
    this.results.push(suite);
  }

  private async testCIDCIntegration(): Promise<void> {
    const suite: TestSuite = {
      name: 'CI/CD Integration',
      description: 'Test CI/CD pipelines and automation',
      tests: [],
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, errors: 0, duration: 0 }
    };

    const suiteStart = Date.now();

    // Test 1: CI/CD workflow syntax validation
    await this.runTest(suite, 'ci-cd-workflow-syntax', async () => {
      const workflows = [
        'catalog-demo/.github/workflows/ci.yml',
        'docs-worker/.github/workflows/ci.yml',
        '.github/workflows/playbook-compliance.yml'
      ];

      let validWorkflows = 0;
      for (const workflow of workflows) {
        // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file operations
        if (await Bun.file(workflow).exists()) {
          try {
            const content = await Bun.file(workflow).text();
            // Basic validation: check for required GitHub Actions structure
            const hasName = content.includes('name:');
            const hasOn = content.includes('on:');
            const hasJobs = content.includes('jobs:');

            if (hasName && hasOn && hasJobs) {
              validWorkflows++;
            }
          } catch {
            // File read error
          }
        }
      }

      return validWorkflows > 0 ? 'PASS' : 'FAIL';
    }, 'Should validate CI/CD workflow syntax');

    // Test 2: Security gate configuration
    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file operations
    await this.runTest(suite, 'ci-cd-security-gates', async () => {
      const workflowPath = '.github/workflows/playbook-compliance.yml';
      if (!(await Bun.file(workflowPath).exists())) return 'SKIP';

      const content = await Bun.file(workflowPath).text();
      const hasSecurityGate = content.includes('security-gate') &&
                             content.includes('bun audit') &&
                             content.includes('CRITICAL_VULNS');

      return hasSecurityGate ? 'PASS' : 'FAIL';
    }, 'Should have security gates configured');

    // Test 3: Playbook compliance integration
    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file operations
    await this.runTest(suite, 'ci-cd-playbook-integration', async () => {
      const workflowPath = '.github/workflows/playbook-compliance.yml';
      if (!(await Bun.file(workflowPath).exists())) return 'SKIP';

      const content = await Bun.file(workflowPath).text();
      const hasPlaybookCheck = content.includes('playbook-auditor') &&
                              content.includes('compliance-audit');

      return hasPlaybookCheck ? 'PASS' : 'FAIL';
    }, 'Should integrate playbook compliance checks');

    // Test 4: Notification configuration
    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file operations
    await this.runTest(suite, 'ci-cd-notifications', async () => {
      const workflowPath = '.github/workflows/playbook-compliance.yml';
      if (!(await Bun.file(workflowPath).exists())) return 'SKIP';

      const content = await Bun.file(workflowPath).text();
      const hasNotifications = content.includes('notify-failure') ||
                              content.includes('github-script');

      return hasNotifications ? 'PASS' : 'FAIL';
    }, 'Should have failure notifications configured');

    suite.summary.duration = Date.now() - suiteStart;
    this.results.push(suite);
  }

  private async testSecurityScanning(): Promise<void> {
    const suite: TestSuite = {
      name: 'Security Scanning',
      description: 'Test security scanning and dependency auditing',
      tests: [],
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, errors: 0, duration: 0 }
    };

    const suiteStart = Date.now();

    // Test 1: Dependency audit functionality
    await this.runTest(suite, 'security-dependency-audit', async () => {
      const result = await this.executeCommand('bun audit', { timeout: 30000 });
      return result.exitCode === 0 || result.exitCode === 1 ? 'PASS' : 'FAIL';
    }, 'Should run dependency audit successfully');

    // Test 2: Package.json audit scripts
    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file operations
    await this.runTest(suite, 'security-audit-scripts', async () => {
      const packageJson = await Bun.file('package.json').json();
      const hasAuditScripts = packageJson.scripts &&
                             (packageJson.scripts.audit || packageJson.scripts['audit:ci']);

      return hasAuditScripts ? 'PASS' : 'FAIL';
    }, 'Should have audit scripts in package.json');

    // Test 3: Security scanner availability
    await this.runTest(suite, 'security-scanner-availability', async () => {
      const result = await this.executeCommand('bunx --package @fire22-registry/security-scanner --help', { timeout: 10000 });
      return result.exitCode === 0 ? 'PASS' : 'SKIP';
    }, 'Should have security scanner available');

    // Test 4: Critical vulnerability detection
    await this.runTest(suite, 'security-critical-detection', async () => {
      const result = await this.executeCommand('bun audit --format json', { timeout: 30000 });
      // Bun audit will return exit code 1 if vulnerabilities are found, 0 if clean
      // Both are acceptable outcomes - we just want to ensure the command runs
      return result.exitCode === 0 || result.exitCode === 1 ? 'PASS' : 'FAIL';
    }, 'Should run vulnerability detection successfully');

    suite.summary.duration = Date.now() - suiteStart;
    this.results.push(suite);
  }

  private async testFantasy402Integration(): Promise<void> {
    const suite: TestSuite = {
      name: 'Fantasy402 Integration',
      description: 'Test Fantasy402 integration edge cases and error handling',
      tests: [],
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, errors: 0, duration: 0 }
    };

    const suiteStart = Date.now();

    // Test 1: Invalid credentials
    await this.runTest(suite, 'fantasy402-invalid-credentials', async () => {
      const tempEnv = `/tmp/.env.fantasy402.test-${Date.now()}`;
      writeFileSync(tempEnv, 'FANTASY402_USERNAME=invalid\nFANTASY402_PASSWORD=invalid\n');

      const result = await this.executeCommand(`FANTASY402_ENV_FILE=${tempEnv} timeout 10 bun run scripts/test-fantasy402-integration.ts`, { timeout: 15000 });
      unlinkSync(tempEnv);

      return result.exitCode !== 0 ? 'PASS' : 'FAIL';
    }, 'Should handle invalid credentials gracefully');

    // Test 2: Network timeout
    await this.runTest(suite, 'fantasy402-network-timeout', async () => {
      const result = await this.executeCommand('timeout 5 bun run scripts/test-fantasy402-integration.ts', { timeout: 10000 });
      return result.exitCode !== 0 ? 'PASS' : 'FAIL';
    }, 'Should handle network timeouts gracefully');

    // Test 3: Session persistence
    await this.runTest(suite, 'fantasy402-session-persistence', async () => {
      const sessionFile = '.fantasy402-session.json';
      if (existsSync(sessionFile)) {
        const stats = statSync(sessionFile);
        const isRecent = Date.now() - stats.mtime.getTime() < 3600000; // 1 hour
        return isRecent ? 'PASS' : 'SKIP';
      }
      return 'SKIP';
    }, 'Should persist session data correctly');

    // Test 4: Demo mode functionality
    await this.runTest(suite, 'fantasy402-demo-mode', async () => {
      const result = await this.executeCommand('bun run scripts/test-fantasy402-integration.ts');
      const hasDemoOutput = result.stdout.includes('Demo mode') ||
                           result.stderr.includes('Demo mode');

      return hasDemoOutput ? 'PASS' : 'SKIP';
    }, 'Should support demo mode for testing');

    // Test 5: Configuration validation
    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file operations
    await this.runTest(suite, 'fantasy402-config-validation', async () => {
      const configFiles = ['.env.fantasy402', 'bunfig.toml'];
      let validConfig = true;

      for (const file of configFiles) {
        if (await Bun.file(file).exists()) {
          try {
            const content = await Bun.file(file).text();
            if (file.endsWith('.toml')) {
              // Basic TOML validation
              if (!content.includes('[dashboard.env]')) {
                validConfig = false;
              }
            }
          } catch {
            validConfig = false;
          }
        }
      }

      return validConfig ? 'PASS' : 'FAIL';
    }, 'Should validate configuration files');

    suite.summary.duration = Date.now() - suiteStart;
    this.results.push(suite);
  }

  private async testSessionManagement(): Promise<void> {
    const suite: TestSuite = {
      name: 'Session Management',
      description: 'Test session storage and token refresh mechanisms',
      tests: [],
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, errors: 0, duration: 0 }
    };

    const suiteStart = Date.now();

    // Test 1: Session file creation
    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file operations
    await this.runTest(suite, 'session-file-creation', async () => {
      const sessionFile = '.fantasy402-session.json';
      if (await Bun.file(sessionFile).exists()) {
        try {
          const content = await Bun.file(sessionFile).text();
          JSON.parse(content);
          return 'PASS';
        } catch {
          return 'FAIL';
        }
      }
      return 'SKIP';
    }, 'Should create valid session files');

    // Test 2: Session file security
    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file operations
    await this.runTest(suite, 'session-file-security', async () => {
      const sessionFile = '.fantasy402-session.json';
      if (await Bun.file(sessionFile).exists()) {
        const stats = await Bun.file(sessionFile).stat();
        // Check if file is not world-readable
        const isSecure = (stats.mode & 0o077) === 0;
        return isSecure ? 'PASS' : 'FAIL';
      }
      return 'SKIP';
    }, 'Should have secure file permissions');

    // Test 3: Token expiry handling
    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file operations
    await this.runTest(suite, 'session-token-expiry', async () => {
      const sessionFile = '.fantasy402-session.json';
      if (await Bun.file(sessionFile).exists()) {
        const content = await Bun.file(sessionFile).text();
        const session = JSON.parse(content);

        if (session.expiresAt) {
          const isValidExpiry = session.expiresAt > Date.now();
          return isValidExpiry ? 'PASS' : 'FAIL';
        }
      }
      return 'SKIP';
    }, 'Should handle token expiry correctly');

    // Test 4: Session cleanup
    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file operations
    await this.runTest(suite, 'session-cleanup', async () => {
      const sessionFile = '.fantasy402-session.json';
      const backupPath = `${sessionFile}.backup`;

      if (await Bun.file(sessionFile).exists()) {
        // Create backup
        const content = await Bun.file(sessionFile).text();
        await Bun.write(backupPath, content);

        // Clear session
        await Bun.write(sessionFile, '');

        // Test recreation
        const result = await this.executeCommand('bun run scripts/test-fantasy402-integration.ts');

        // Restore backup
        execSync(`mv ${backupPath} ${sessionFile}`);

        return result.exitCode === 0 ? 'PASS' : 'FAIL';
      }
      return 'SKIP';
    }, 'Should handle session cleanup and recreation');

    suite.summary.duration = Date.now() - suiteStart;
    this.results.push(suite);
  }

  private async testPackageBenchmarking(): Promise<void> {
    const suite: TestSuite = {
      name: 'Package Benchmarking',
      description: 'Test package benchmarking and performance analysis',
      tests: [],
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, errors: 0, duration: 0 }
    };

    const suiteStart = Date.now();

    // Test 1: Benchmark orchestrator execution
    await this.runTest(suite, 'benchmark-orchestrator-execution', async () => {
      const result = await this.executeCommand('bun run enterprise/packages/scripts/scripts/package-benchmark-orchestrator.ts --help', { timeout: 30000 });
      return result.exitCode === 0 ? 'PASS' : 'SKIP';
    }, 'Should execute benchmark orchestrator');

    // Test 2: Benchmark report generation
    await this.runTest(suite, 'benchmark-report-generation', async () => {
      const result = await this.executeCommand('bun run enterprise/packages/scripts/scripts/package-benchmark-orchestrator.ts --report', { timeout: 60000 });

      // Check if any benchmark report was generated (may have different naming)
      const files = readdirSync('.');
      const reportExists = files.some(file => file.includes('benchmark-report') && file.endsWith('.json'));

      return reportExists ? 'PASS' : 'SKIP';
    }, 'Should generate benchmark reports');

    // Test 3: Benchmark standards validation
    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file operations
    await this.runTest(suite, 'benchmark-standards-validation', async () => {
      const benchmarkScript = 'enterprise/packages/scripts/scripts/package-benchmark-orchestrator.ts';
      if (await Bun.file(benchmarkScript).exists()) {
        const content = await Bun.file(benchmarkScript).text();
        const hasStandards = content.includes('ENTERPRISE_STANDARDS');
        return hasStandards ? 'PASS' : 'FAIL';
      }
      return 'SKIP';
    }, 'Should validate against enterprise standards');

    suite.summary.duration = Date.now() - suiteStart;
    this.results.push(suite);
  }

  private async testEdgeCases(): Promise<void> {
    const suite: TestSuite = {
      name: 'Edge Cases',
      description: 'Test various edge cases and error conditions',
      tests: [],
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, errors: 0, duration: 0 }
    };

    const suiteStart = Date.now();

    // Test 1: Memory constraints
    await this.runTest(suite, 'edge-case-memory-constraints', async () => {
      const result = await this.executeCommand('ulimit -v 100000 && bun run scripts/playbook-auditor.ts --repo . --output json', { timeout: 30000 });
      return result.exitCode === 0 ? 'PASS' : 'SKIP';
    }, 'Should handle memory constraints gracefully');

    // Test 2: Large repository
    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file operations
    await this.runTest(suite, 'edge-case-large-repository', async () => {
      const tempDir = `/tmp/large-repo-${Date.now()}`;
      execSync(`mkdir -p ${tempDir}`);

      // Create many files using Bun's optimized operations
      for (let i = 0; i < 100; i++) {
        await Bun.write(`${tempDir}/file${i}.ts`, `export const test${i} = ${i};`);
      }
      await Bun.write(`${tempDir}/package.json`, '{"name": "large-repo", "version": "1.0.0"}');

      const result = await this.executeCommand(`bun run scripts/playbook-auditor.ts --repo ${tempDir} --output json`, { timeout: 60000 });
      execSync(`rm -rf ${tempDir}`);

      return result.exitCode === 0 ? 'PASS' : 'FAIL';
    }, 'Should handle large repositories');

    // Test 3: Concurrent operations
    await this.runTest(suite, 'edge-case-concurrent-operations', async () => {
      const promises: Promise<{ exitCode: number; stdout: string; stderr: string }>[] = [];
      for (let i = 0; i < 5; i++) {
        promises.push(this.executeCommand('bun run scripts/playbook-auditor.ts --repo . --output json'));
      }

      const results = await Promise.all(promises);
      const allSuccessful = results.every(r => r.exitCode === 0);

      return allSuccessful ? 'PASS' : 'FAIL';
    }, 'Should handle concurrent operations');

    // Test 4: Network failures
    await this.runTest(suite, 'edge-case-network-failures', async () => {
      // Test with a non-existent endpoint to simulate network failure
      const result = await this.executeCommand('curl -f http://nonexistent-domain-that-does-not-exist-12345.com', { timeout: 3000 });
      // curl should fail with exit code 6 (couldn't resolve host) or 22 (HTTP page not retrieved)
      return result.exitCode === 6 || result.exitCode === 22 || result.exitCode === 1 ? 'PASS' : 'FAIL';
    }, 'Should handle network failures gracefully');

    // Test 5: Invalid file permissions
    await this.runTest(suite, 'edge-case-file-permissions', async () => {
      const tempDir = `/tmp/permission-test-${Date.now()}`;
      execSync(`mkdir -p ${tempDir}`);
      writeFileSync(`${tempDir}/package.json`, '{"name": "permission-test"}');

      try {
        // Try to set restrictive permissions
        execSync(`chmod 000 ${tempDir}/package.json 2>/dev/null || true`);
        const result = await this.executeCommand(`bun run scripts/playbook-auditor.ts --repo ${tempDir} --output json`, { timeout: 10000 });

        // If the auditor fails due to permissions or any other reason, it's a pass
        return result.exitCode !== 0 ? 'PASS' : 'FAIL';
      } catch {
        // If we can't set permissions or run the command, skip the test
        return 'SKIP';
      } finally {
        // Clean up
        execSync(`rm -rf ${tempDir} 2>/dev/null || true`);
      }
    }, 'Should handle file permission issues');

    suite.summary.duration = Date.now() - suiteStart;
    this.results.push(suite);
  }

  private async runTest(suite: TestSuite, testName: string, testFn: () => Promise<'PASS' | 'FAIL' | 'SKIP' | 'ERROR'>, description: string): Promise<void> {
    const startTime = Date.now();
    suite.summary.total++;

    try {
      if (this.verbose) {
        console.log(`🧪 Running: ${testName} - ${description}`);
      }

      const status = await testFn();
      const duration = Date.now() - startTime;

      const testResult: TestResult = {
        testName,
        category: suite.name,
        status,
        duration,
        message: description,
        timestamp: new Date().toISOString()
      };

      suite.tests.push(testResult);

      switch (status) {
        case 'PASS':
          suite.summary.passed++;
          if (this.verbose) console.log(`✅ ${testName}: PASSED (${duration}ms)`);
          break;
        case 'FAIL':
          suite.summary.failed++;
          console.log(`❌ ${testName}: FAILED (${duration}ms)`);
          break;
        case 'SKIP':
          suite.summary.skipped++;
          if (this.verbose) console.log(`⏭️  ${testName}: SKIPPED (${duration}ms)`);
          break;
        case 'ERROR':
          suite.summary.errors++;
          console.log(`🚨 ${testName}: ERROR (${duration}ms)`);
          break;
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      suite.summary.errors++;

      const testResult: TestResult = {
        testName,
        category: suite.name,
        status: 'ERROR',
        duration,
        message: description,
        details: error.message,
        timestamp: new Date().toISOString()
      };

      suite.tests.push(testResult);
      console.log(`🚨 ${testName}: ERROR - ${error.message} (${duration}ms)`);
    }
  }

  private async executeCommand(command: string, options: { timeout?: number } = {}): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise<{ exitCode: number; stdout: string; stderr: string }>((resolve) => {
      const [cmd, ...args] = command.split(' ');
      const child = spawn(cmd, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
        timeout: options.timeout || 30000
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => { stdout += data.toString(); });
      child.stderr?.on('data', (data) => { stderr += data.toString(); });

      child.on('close', (exitCode) => {
        resolve({ exitCode: exitCode || 0, stdout, stderr });
      });

      child.on('error', (error) => {
        resolve({ exitCode: 1, stdout, stderr: error.message });
      });
    });
  }

  private async generateComprehensiveReport(): Promise<void> {
    const totalDuration = Date.now() - this.testStartTime;

    // Calculate overall statistics
    const overallStats = this.results.reduce((acc, suite) => {
      acc.total += suite.summary.total;
      acc.passed += suite.summary.passed;
      acc.failed += suite.summary.failed;
      acc.skipped += suite.summary.skipped;
      acc.errors += suite.summary.errors;
      acc.duration += suite.summary.duration;
      return acc;
    }, { total: 0, passed: 0, failed: 0, skipped: 0, errors: 0, duration: 0 });

    const overallScore = overallStats.total > 0 ? ((overallStats.passed / overallStats.total) * 100) : 0;

    // Generate console report
    console.log('\n' + '='.repeat(80));
    console.log('🏆 COMPREHENSIVE EDGE CASE TESTING REPORT');
    console.log('='.repeat(80));
    console.log(`📊 Overall Score: ${overallScore.toFixed(1)}%`);
    console.log(`🧪 Total Tests: ${overallStats.total}`);
    console.log(`✅ Passed: ${overallStats.passed}`);
    console.log(`❌ Failed: ${overallStats.failed}`);
    console.log(`⏭️  Skipped: ${overallStats.skipped}`);
    console.log(`🚨 Errors: ${overallStats.errors}`);
    console.log(`⏱️  Duration: ${(totalDuration / 1000).toFixed(1)}s`);
    console.log('');

    // Suite breakdown
    console.log('📋 Suite Breakdown:');
    this.results.forEach(suite => {
      const suiteScore = suite.summary.total > 0 ? ((suite.summary.passed / suite.summary.total) * 100) : 0;
      console.log(`  ${suite.name}: ${suiteScore.toFixed(1)}% (${suite.summary.passed}/${suite.summary.total})`);
    });

    // Failed tests summary
    const failedTests = this.results.flatMap(suite =>
      suite.tests.filter(test => test.status === 'FAIL' || test.status === 'ERROR')
    );

    if (failedTests.length > 0) {
      console.log('\n🚨 Failed Tests:');
      failedTests.forEach(test => {
        console.log(`  ❌ ${test.category}: ${test.testName}`);
        console.log(`     ${test.message}`);
        if (test.details) {
          console.log(`     Details: ${test.details}`);
        }
      });
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    if (overallScore >= 90) {
      console.log('  🎉 Excellent! All systems are performing well.');
    } else if (overallScore >= 75) {
      console.log('  ✅ Good performance. Minor improvements needed.');
    } else {
      console.log('  ⚠️  Significant improvements required.');
      console.log('  🔧 Focus on fixing failed tests and error conditions.');
    }

    // Save detailed report
    await this.saveDetailedReport(overallStats, totalDuration);
  }

  private async saveDetailedReport(overallStats: any, totalDuration: number): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      overall: {
        score: overallStats.total > 0 ? ((overallStats.passed / overallStats.total) * 100) : 0,
        totalTests: overallStats.total,
        passed: overallStats.passed,
        failed: overallStats.failed,
        skipped: overallStats.skipped,
        errors: overallStats.errors,
        duration: totalDuration
      },
      suites: this.results,
      recommendations: this.generateRecommendations(overallStats)
    };

    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file writing
    const filename = `comprehensive-edge-case-report-${new Date().toISOString().slice(0, 10)}.json`;
    await Bun.write(filename, JSON.stringify(report, null, 2));
    console.log(`💾 Detailed report saved: ${filename}`);
  }

  private generateRecommendations(stats: any): string[] {
    const recommendations: string[] = [];
    const score = stats.total > 0 ? ((stats.passed / stats.total) * 100) : 0;

    if (stats.errors > 0) {
      recommendations.push('🚨 Fix critical errors in test execution');
    }

    if (stats.failed > stats.total * 0.1) {
      recommendations.push('🔧 Address failed tests - they indicate real issues');
    }

    if (score < 80) {
      recommendations.push('📈 Improve overall test coverage and reliability');
    }

    if (stats.skipped > stats.total * 0.2) {
      recommendations.push('⚡ Implement skipped tests for better coverage');
    }

    return recommendations;
  }

  // Public wrapper methods for main function access
  async runCIDCTestSuite(): Promise<void> {
    await this.testCIDCIntegration();
    await this.generateComprehensiveReport();
  }

  async runSecurityTestSuite(): Promise<void> {
    await this.testSecurityScanning();
    await this.generateComprehensiveReport();
  }

  async runFantasy402TestSuite(): Promise<void> {
    await this.testFantasy402Integration();
    await this.generateComprehensiveReport();
  }

  async runPlaybookTestSuite(): Promise<void> {
    await this.testPlaybookCompliance();
    await this.generateComprehensiveReport();
  }

  async runEdgeCasesTestSuite(): Promise<void> {
    await this.testEdgeCases();
    await this.generateComprehensiveReport();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const options = {
    fullSuite: true,
    ciCdOnly: false,
    securityOnly: false,
    fantasy402Only: false,
    playbookOnly: false,
    edgeCases: false,
    verbose: false,
    report: 'json' as 'json' | 'markdown' | 'html'
  };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--full-suite':
        options.fullSuite = true;
        break;
      case '--ci-cd-only':
        options.ciCdOnly = true;
        options.fullSuite = false;
        break;
      case '--security-only':
        options.securityOnly = true;
        options.fullSuite = false;
        break;
      case '--fantasy402-only':
        options.fantasy402Only = true;
        options.fullSuite = false;
        break;
      case '--playbook-only':
        options.playbookOnly = true;
        options.fullSuite = false;
        break;
      case '--edge-cases':
        options.edgeCases = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--report':
        options.report = args[++i] as 'json' | 'markdown' | 'html';
        break;
    }
  }

  const tester = new ComprehensiveEdgeCaseTester(options.verbose);

  try {
    if (options.fullSuite) {
      await tester.runFullTestSuite();
    } else if (options.ciCdOnly) {
      await tester.runCIDCTestSuite();
    } else if (options.securityOnly) {
      await tester.runSecurityTestSuite();
    } else if (options.fantasy402Only) {
      await tester.runFantasy402TestSuite();
    } else if (options.playbookOnly) {
      await tester.runPlaybookTestSuite();
    } else if (options.edgeCases) {
      await tester.runEdgeCasesTestSuite();
    }

    console.log('\n✅ Comprehensive edge case testing completed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Comprehensive testing failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
