#!/usr/bin/env bun

// [SEC][WORKFLOW][DAILY][WF-SEC-001][v2.10][ACTIVE]

import { spawn } from 'child_process';

interface WorkflowStep {
  name: string;
  command: string;
  critical: boolean;
  description: string;
}

class SecurityDailyWorkflow {
  private workflow: WorkflowStep[] = [
    {
      name: 'security-scan',
      command: 'bun security:scan',
      critical: true,
      description: 'Full security assessment'
    },
    {
      name: 'secrets-rotate',
      command: 'bun secrets:rotate-all',
      critical: true,
      description: 'Rotate all secrets and tokens'
    },
    {
      name: 'rules-validate',
      command: 'bun rules:validate',
      critical: true,
      description: 'Validate all governance rules'
    },
    {
      name: 'vulns-audit',
      command: 'bun security:audit',
      critical: false,
      description: 'Dependency vulnerability audit'
    },
    {
      name: 'backup-check',
      command: 'bun backup:list',
      critical: false,
      description: 'Verify backup integrity'
    }
  ];

  async runMorningWorkflow(): Promise<void> {
    console.info('🌅 RUNNING MORNING SECURITY WORKFLOW');
    console.info('=====================================');

    const results = [];

    for (const step of this.workflow) {
      console.info(`\n🔄 ${step.name}: ${step.description}`);
      try {
        await this.runCommand(step.command);
        console.info(`✅ ${step.name}: PASSED`);
        results.push({ step: step.name, status: 'PASS' });
      } catch (error) {
        const status = step.critical ? 'FAIL' : 'WARN';
        console.info(`${step.critical ? '❌' : '⚠️'}  ${step.name}: ${status} - ${error.message}`);
        results.push({ step: step.name, status, error: error.message });

        if (step.critical) {
          console.info('🚨 Critical failure - stopping workflow');
          break;
        }
      }
    }

    this.generateReport(results);
  }

  async runDeployWorkflow(): Promise<void> {
    console.info('🚀 RUNNING DEPLOY SECURITY WORKFLOW');
    console.info('===================================');

    const deploySteps = [
      'bun test',
      'bun gov:full',
      'bun build:exe --sign',
      'bun security:scan'
    ];

    for (const cmd of deploySteps) {
      console.info(`🔄 ${cmd}`);
      try {
        await this.runCommand(cmd);
        console.info(`✅ PASSED`);
      } catch (error) {
        console.info(`❌ FAILED: ${error.message}`);
        throw error;
      }
    }

    console.info('🎉 Deploy security checks PASSED!');
  }

  async runMonitorWorkflow(): Promise<void> {
    console.info('👁️  RUNNING MONITOR SECURITY WORKFLOW');
    console.info('=====================================');

    // Continuous monitoring (simplified)
    setInterval(async () => {
      try {
        await this.runCommand('bun security:scan --quiet');
        console.info(`✅ Security check passed at ${new Date().toLocaleTimeString()}`);
      } catch (error) {
        console.error(`❌ Security alert: ${error.message}`);
        // Could send alerts here
      }
    }, 30 * 60 * 1000); // Every 30 minutes

    console.info('👁️  Security monitoring active...');
  }

  private async runCommand(cmd: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const [command, ...args] = cmd.split(' ');
      const child = spawn(command, args, {
        cwd: process.cwd(),
        stdio: 'pipe'
      });

      let stderr = '';

      child.stderr.on('data', (data) => stderr += data.toString());

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(stderr || `Command failed with code ${code}`));
        }
      });

      child.on('error', reject);
    });
  }

  private generateReport(results: any[]): void {
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const warnings = results.filter(r => r.status === 'WARN').length;
    const total = results.length;

    console.info(`\n📊 MORNING WORKFLOW REPORT:`);
    console.info(`   ✅ Passed: ${passed}/${total}`);
    console.info(`   ❌ Failed: ${failed}/${total}`);
    console.info(`   ⚠️  Warnings: ${warnings}/${total}`);

    if (failed > 0) {
      console.info(`\n🚨 FAILED STEPS:`);
      results.filter(r => r.status === 'FAIL').forEach(result => {
        console.info(`   ❌ ${result.step}: ${result.error}`);
      });
    }

    if (warnings > 0) {
      console.info(`\n⚠️  WARNINGS:`);
      results.filter(r => r.status === 'WARN').forEach(result => {
        console.info(`   ⚠️  ${result.step}: ${result.error}`);
      });
    }
  }
}

// CLI Interface
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help') {
  console.info(`
🌅 SYNDICATE DAILY SECURITY WORKFLOW v2.10

USAGE:
  bun sec:workflow morning    # Morning security checks
  bun sec:workflow deploy     # Pre-deploy security
  bun sec:workflow monitor    # Continuous monitoring

MORNING WORKFLOW:
  ✅ Security scan (critical)
  ✅ Secrets rotation (critical)
  ✅ Rules validation (critical)
  ✅ Vulnerability audit
  ✅ Backup verification

DEPLOY WORKFLOW:
  ✅ Run tests
  ✅ Governance validation
  ✅ Build signed executable
  ✅ Final security scan

MONITOR WORKFLOW:
  👁️  Continuous 30-minute security checks

AUTOMATION:
  # Add to crontab for daily morning run:
  0 9 * * 1-5 bun sec:workflow morning

  # Pre-deploy check:
  bun sec:workflow deploy

EXAMPLES:
  bun sec:workflow morning    # Complete morning security
  bun sec:workflow deploy     # Pre-deployment checks
  bun sec:workflow monitor    # Start monitoring (blocks)
  `);
  process.exit(0);
}

const workflow = new SecurityDailyWorkflow();

try {
  switch (command) {
    case 'morning':
      await workflow.runMorningWorkflow();
      break;

    case 'deploy':
      await workflow.runDeployWorkflow();
      break;

    case 'monitor':
      await workflow.runMonitorWorkflow();
      // This will run indefinitely
      break;

    default:
      console.error(`Unknown workflow: ${command}`);
      process.exit(1);
  }
} catch (error) {
  console.error('❌ Workflow error:', error.message);
  process.exit(1);
}