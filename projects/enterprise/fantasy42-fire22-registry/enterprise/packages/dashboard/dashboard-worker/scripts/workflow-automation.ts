#!/usr/bin/env bun
/**
 * 🔄 Fire22 Workflow Automation
 *
 * Automated workflows for common development and deployment tasks
 * Combines multiple tools into streamlined processes
 *
 * @version 3.0.9
 * @author Fire22 Development Team
 */

import { spawn } from 'child_process';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

interface WorkflowStep {
  name: string;
  command: string;
  description: string;
  required: boolean;
  continueOnError?: boolean;
  timeout?: number;
  validation?: () => Promise<boolean>;
}

interface WorkflowResult {
  step: string;
  success: boolean;
  duration: number;
  output?: string;
  error?: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  icon: string;
  steps: WorkflowStep[];
  prerequisites?: string[];
  postActions?: string[];
}

class WorkflowAutomation {
  private workflows: Map<string, Workflow> = new Map();
  private results: WorkflowResult[] = [];
  private currentWorkflow?: string;

  constructor() {
    this.initializeWorkflows();
  }

  /**
   * Initialize predefined workflows
   */
  private initializeWorkflows(): void {
    // Daily startup workflow
    this.workflows.set('daily-startup', {
      id: 'daily-startup',
      name: 'Daily Startup Routine',
      description: 'Complete morning checks and environment setup',
      icon: '🌅',
      steps: [
        {
          name: 'Git Pull',
          command: 'git pull origin main',
          description: 'Update local repository',
          required: false,
          continueOnError: true,
        },
        {
          name: 'Install Dependencies',
          command: 'bun install --frozen-lockfile',
          description: 'Install locked dependencies',
          required: true,
        },
        {
          name: 'Environment Check',
          command: 'fire22 env validate',
          description: 'Validate environment configuration',
          required: true,
        },
        {
          name: 'Health Check',
          command: 'fire22 health:integrated',
          description: 'Run comprehensive health check',
          required: true,
        },
        {
          name: 'Quick Tests',
          command: 'fire22 test:quick',
          description: 'Run quick validation tests',
          required: false,
          continueOnError: true,
        },
        {
          name: 'Start Dev Server',
          command: 'fire22 dev',
          description: 'Start development server',
          required: false,
          continueOnError: true,
          timeout: 5000,
        },
      ],
      postActions: ['Display summary', 'Open dashboard'],
    });

    // Pre-commit workflow
    this.workflows.set('pre-commit', {
      id: 'pre-commit',
      name: 'Pre-Commit Validation',
      description: 'Ensure code quality before committing',
      icon: '✅',
      steps: [
        {
          name: 'Format Check',
          command: 'fire22 format',
          description: 'Check code formatting',
          required: true,
        },
        {
          name: 'Lint',
          command: 'fire22 lint',
          description: 'Run linting checks',
          required: true,
        },
        {
          name: 'Type Check',
          command: 'fire22 typecheck',
          description: 'Validate TypeScript types',
          required: true,
        },
        {
          name: 'Quick Tests',
          command: 'fire22 test:quick',
          description: 'Run quick tests',
          required: true,
        },
        {
          name: 'Security Scan',
          command: 'bun audit --audit-level=high',
          description: 'Check for security vulnerabilities',
          required: false,
          continueOnError: true,
        },
      ],
    });

    // Deployment workflow
    this.workflows.set('deploy-production', {
      id: 'deploy-production',
      name: 'Production Deployment',
      description: 'Full production deployment with validation',
      icon: '🚀',
      prerequisites: ['Clean working directory', 'Production environment configured'],
      steps: [
        {
          name: 'Deployment Dry-Run',
          command: 'fire22 dry-run deployment',
          description: 'Validate deployment readiness',
          required: true,
        },
        {
          name: 'Full QA Suite',
          command: 'fire22 qa --strict',
          description: 'Run comprehensive QA checks',
          required: true,
        },
        {
          name: 'Build Production',
          command: 'fire22 build:production',
          description: 'Create production build',
          required: true,
        },
        {
          name: 'Final Health Check',
          command: 'fire22 health:integrated',
          description: 'Verify system health',
          required: true,
        },
        {
          name: 'Create Backup',
          command: 'git tag -a backup-$(date +%Y%m%d-%H%M%S) -m "Pre-deployment backup"',
          description: 'Tag current version for rollback',
          required: false,
          continueOnError: true,
        },
        {
          name: 'Deploy to Cloudflare',
          command: 'fire22 deploy:production',
          description: 'Deploy to production environment',
          required: true,
        },
        {
          name: 'Post-Deploy Validation',
          command: 'fire22 test:api --base-url https://api.fire22.com',
          description: 'Validate production endpoints',
          required: true,
        },
      ],
      postActions: ['Send notification', 'Update documentation', 'Monitor for 5 minutes'],
    });

    // Hotfix workflow
    this.workflows.set('hotfix', {
      id: 'hotfix',
      name: 'Emergency Hotfix',
      description: 'Rapid fix and deployment for critical issues',
      icon: '🔥',
      steps: [
        {
          name: 'Create Hotfix Branch',
          command: 'git checkout -b hotfix-$(date +%Y%m%d-%H%M%S)',
          description: 'Create isolated hotfix branch',
          required: true,
        },
        {
          name: 'Quick Validation',
          command: 'fire22 test:quick',
          description: 'Run minimal tests',
          required: true,
        },
        {
          name: 'Security Check',
          command: 'fire22 dry-run deployment',
          description: 'Validate deployment safety',
          required: true,
        },
        {
          name: 'Build Hotfix',
          command: 'fire22 build:quick',
          description: 'Create quick build',
          required: true,
        },
        {
          name: 'Deploy Hotfix',
          command: 'fire22 deploy --env hotfix',
          description: 'Deploy to hotfix environment',
          required: true,
        },
        {
          name: 'Verify Fix',
          command: 'fire22 test:api --critical-only',
          description: 'Test critical endpoints',
          required: true,
        },
      ],
    });

    // Performance optimization workflow
    this.workflows.set('performance-optimization', {
      id: 'performance-optimization',
      name: 'Performance Optimization',
      description: 'Analyze and optimize system performance',
      icon: '⚡',
      steps: [
        {
          name: 'Baseline Benchmark',
          command: 'fire22 benchmark --save baseline',
          description: 'Establish performance baseline',
          required: true,
        },
        {
          name: 'Performance Monitor',
          command: 'fire22 monitor -d 60',
          description: 'Monitor for 1 minute',
          required: true,
          timeout: 65000,
        },
        {
          name: 'Memory Profile',
          command: 'bun run bench:memory',
          description: 'Analyze memory usage',
          required: false,
          continueOnError: true,
        },
        {
          name: 'Build Analysis',
          command: 'fire22 build:analyze',
          description: 'Analyze build size',
          required: false,
        },
        {
          name: 'Optimization Build',
          command: 'fire22 build:optimized',
          description: 'Create optimized build',
          required: true,
        },
        {
          name: 'Compare Benchmark',
          command: 'fire22 benchmark --compare baseline',
          description: 'Compare with baseline',
          required: true,
        },
      ],
    });

    // Security audit workflow
    this.workflows.set('security-audit', {
      id: 'security-audit',
      name: 'Security Audit',
      description: 'Comprehensive security validation',
      icon: '🔐',
      steps: [
        {
          name: 'Dependency Audit',
          command: 'bun audit --audit-level=low',
          description: 'Check all dependency vulnerabilities',
          required: true,
        },
        {
          name: 'Secret Scanning',
          command: 'grep -r "password\\|secret\\|token\\|api.*key" src/',
          description: 'Scan for hardcoded secrets',
          required: false,
          continueOnError: true,
        },
        {
          name: 'Environment Audit',
          command: 'fire22 env audit',
          description: 'Audit environment security',
          required: true,
        },
        {
          name: 'Permission Check',
          command: 'fire22 health:permissions',
          description: 'Verify file permissions',
          required: false,
        },
        {
          name: 'Security Report',
          command: 'fire22 security:report',
          description: 'Generate security report',
          required: false,
          continueOnError: true,
        },
      ],
    });

    // Maintenance workflow
    this.workflows.set('maintenance', {
      id: 'maintenance',
      name: 'System Maintenance',
      description: 'Regular maintenance and cleanup tasks',
      icon: '🧹',
      steps: [
        {
          name: 'Clean Build',
          command: 'bun run clean:all',
          description: 'Clean build artifacts',
          required: false,
          continueOnError: true,
        },
        {
          name: 'Update Dependencies',
          command: 'bun update --interactive',
          description: 'Update dependencies interactively',
          required: false,
          continueOnError: true,
        },
        {
          name: 'Cache Clear',
          command: 'bun pm cache rm',
          description: 'Clear package cache',
          required: false,
          continueOnError: true,
        },
        {
          name: 'Database Cleanup',
          command: 'fire22 db:cleanup',
          description: 'Clean up database',
          required: false,
          continueOnError: true,
        },
        {
          name: 'Log Rotation',
          command: 'rm -f *.log monitoring-report*.json qa-report*.json',
          description: 'Clean old log files',
          required: false,
          continueOnError: true,
        },
        {
          name: 'Git Cleanup',
          command: 'git gc --aggressive',
          description: 'Optimize git repository',
          required: false,
          continueOnError: true,
        },
      ],
    });
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflowId: string): Promise<boolean> {
    const workflow = this.workflows.get(workflowId);

    if (!workflow) {
      console.error(`❌ Workflow '${workflowId}' not found`);
      return false;
    }

    this.currentWorkflow = workflowId;
    this.results = [];

    console.log(`\n${workflow.icon} Starting Workflow: ${workflow.name}`);
    console.log('='.repeat(60));
    console.log(`📝 ${workflow.description}\n`);

    // Check prerequisites
    if (workflow.prerequisites && workflow.prerequisites.length > 0) {
      console.log('📋 Prerequisites:');
      workflow.prerequisites.forEach(prereq => {
        console.log(`   • ${prereq}`);
      });
      console.log('');
    }

    // Execute steps
    let allSuccess = true;
    const startTime = Date.now();

    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      const stepNumber = i + 1;

      console.log(`📍 Step ${stepNumber}/${workflow.steps.length}: ${step.name}`);
      console.log(`   ${step.description}`);

      const result = await this.executeStep(step);
      this.results.push(result);

      const statusIcon = result.success ? '✅' : '❌';
      const duration = `(${(result.duration / 1000).toFixed(1)}s)`;

      console.log(`   ${statusIcon} ${result.success ? 'Success' : 'Failed'} ${duration}\n`);

      if (!result.success && step.required && !step.continueOnError) {
        allSuccess = false;
        console.log('🛑 Workflow stopped due to failed required step');
        break;
      }

      if (!result.success) {
        allSuccess = false;
      }
    }

    const totalDuration = Date.now() - startTime;

    // Display summary
    this.displaySummary(workflow, allSuccess, totalDuration);

    // Execute post actions
    if (allSuccess && workflow.postActions) {
      console.log('\n📮 Post Actions:');
      workflow.postActions.forEach(action => {
        console.log(`   • ${action}`);
      });
    }

    return allSuccess;
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(step: WorkflowStep): Promise<WorkflowResult> {
    const startTime = Date.now();

    try {
      // Run validation if provided
      if (step.validation) {
        const isValid = await step.validation();
        if (!isValid) {
          return {
            step: step.name,
            success: false,
            duration: Date.now() - startTime,
            error: 'Validation failed',
          };
        }
      }

      // Execute command
      const output = await this.execCommand(step.command, step.timeout);

      return {
        step: step.name,
        success: true,
        duration: Date.now() - startTime,
        output,
      };
    } catch (error) {
      return {
        step: step.name,
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute command with timeout
   */
  private execCommand(command: string, timeout = 30000): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, {
        shell: true,
        stdio: 'pipe',
      });

      let output = '';
      let errorOutput = '';

      child.stdout?.on('data', data => {
        output += data.toString();
      });

      child.stderr?.on('data', data => {
        errorOutput += data.toString();
      });

      const timeoutId = setTimeout(() => {
        child.kill();
        reject(new Error('Command timed out'));
      }, timeout);

      child.on('close', code => {
        clearTimeout(timeoutId);
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(errorOutput || `Command failed with exit code ${code}`));
        }
      });

      child.on('error', error => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  /**
   * Display workflow summary
   */
  private displaySummary(workflow: Workflow, success: boolean, duration: number): void {
    console.log('\n📊 Workflow Summary');
    console.log('='.repeat(60));
    console.log(`${workflow.icon} ${workflow.name}`);
    console.log(`🎯 Status: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);

    const successCount = this.results.filter(r => r.success).length;
    const failedCount = this.results.filter(r => !r.success).length;

    console.log(`✅ Successful Steps: ${successCount}`);
    console.log(`❌ Failed Steps: ${failedCount}`);

    if (failedCount > 0) {
      console.log('\n❌ Failed Steps:');
      this.results
        .filter(r => !r.success)
        .forEach(result => {
          console.log(`   • ${result.step}: ${result.error}`);
        });
    }

    // Save workflow report
    this.saveReport(workflow, success, duration);
  }

  /**
   * Save workflow report
   */
  private saveReport(workflow: Workflow, success: boolean, duration: number): void {
    const report = {
      timestamp: new Date().toISOString(),
      workflow: {
        id: workflow.id,
        name: workflow.name,
        success,
        duration,
      },
      results: this.results,
      summary: {
        totalSteps: this.results.length,
        successfulSteps: this.results.filter(r => r.success).length,
        failedSteps: this.results.filter(r => !r.success).length,
      },
    };

    const reportPath = `workflow-report-${workflow.id}-${Date.now()}.json`;
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📄 Report saved to: ${reportPath}`);
  }

  /**
   * List available workflows
   */
  listWorkflows(): void {
    console.log('\n🔄 Available Workflows');
    console.log('='.repeat(60));

    Array.from(this.workflows.values()).forEach(workflow => {
      console.log(`\n${workflow.icon} ${workflow.name} (${workflow.id})`);
      console.log(`   ${workflow.description}`);
      console.log(`   Steps: ${workflow.steps.length}`);
      console.log(`   Required: ${workflow.steps.filter(s => s.required).length}`);
    });

    console.log('\n💡 Run a workflow with: fire22 workflow <id>');
  }

  /**
   * Create custom workflow interactively
   */
  async createCustomWorkflow(): Promise<void> {
    console.log('\n🎨 Create Custom Workflow');
    console.log('='.repeat(60));
    console.log('Feature coming soon! Use predefined workflows for now.');

    // In a real implementation, this would guide users through
    // creating a custom workflow with interactive prompts
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const automation = new WorkflowAutomation();

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
🔄 Fire22 Workflow Automation

DESCRIPTION:
  Automated workflows for common development and deployment tasks.
  Combines multiple Fire22 tools into streamlined processes.

USAGE:
  bun run scripts/workflow-automation.ts [workflow-id] [options]

WORKFLOWS:
  daily-startup           Morning checks and environment setup
  pre-commit             Pre-commit validation checks
  deploy-production      Full production deployment
  hotfix                 Emergency hotfix deployment
  performance-optimization    Performance analysis and optimization
  security-audit         Comprehensive security validation
  maintenance            System maintenance and cleanup

OPTIONS:
  --list                 List all available workflows
  --create               Create custom workflow (interactive)
  -h, --help            Show this help message

EXAMPLES:
  bun run scripts/workflow-automation.ts daily-startup
  bun run scripts/workflow-automation.ts deploy-production
  fire22 workflow pre-commit

🔥 Fire22 Development Team - Enterprise Dashboard System
`);
    process.exit(0);
  }

  if (args.includes('--list')) {
    automation.listWorkflows();
    process.exit(0);
  }

  if (args.includes('--create')) {
    await automation.createCustomWorkflow();
    process.exit(0);
  }

  // Execute workflow
  const workflowId = args[0];

  try {
    const success = await automation.executeWorkflow(workflowId);
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('💥 Workflow failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch(error => {
    console.error('💥 Workflow automation failed:', error);
    process.exit(1);
  });
}

export { WorkflowAutomation, Workflow, WorkflowStep };
