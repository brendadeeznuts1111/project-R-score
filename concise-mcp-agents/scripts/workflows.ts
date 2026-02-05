#!/usr/bin/env bun

// [WORKFLOWS][FULL][ONE-LINERS][WF-SLASH-001][v2.8][STABLE]

// [AI][HEADERS][AI-HE-D63][v1.0.1][ACTIVE]

import { spawn } from 'child_process';
import { AgentRankingsSystem } from "./agent-rankings.ts";
import { GovernanceEngine } from "./gov-rules.ts";
import { MCPToolsRegistry } from "./mcp-tools.ts";

interface Workflow {
  name: string;
  description: string;
  commands: string[];
  parallel?: boolean;
  background?: boolean;
}

class WorkflowAutomation {
  private workflows: Map<string, Workflow> = new Map();

  constructor() {
    this.registerWorkflows();
  }

  private registerWorkflows(): void {
    // Daily Ops workflow
    this.registerWorkflow({
      name: 'daily-ops',
      description: 'Daily Ops - LIVE + Synced',
      commands: [
        'bun ws:start',
        'bun git:watch',
        'bun pipe:watch'
      ],
      background: true,
      parallel: true
    });

    // Telegram trigger workflow
    this.registerWorkflow({
      name: 'telegram-top',
      description: 'Telegram Trigger - Push to channel',
      commands: [
        'bun agents:top 3',
        'bun telegram:send --channel @syndicate'
      ]
    });

    // GOV Check workflow
    this.registerWorkflow({
      name: 'gov-check',
      description: 'GOV Check - Validate rules/tools',
      commands: [
        'bun rules:validate',
        'bun mcp:validate',
        'bun gov:full'
      ]
    });

    // Deploy workflow
    this.registerWorkflow({
      name: 'deploy',
      description: 'Deploy - v1.0.1.exe',
      commands: [
        'bun semver bump minor',
        'bun build:exe',
        'bun dist'
      ]
    });

    // Full system health check
    this.registerWorkflow({
      name: 'health-check',
      description: 'Full system health check',
      commands: [
        'bun datapipe:stats',
        'bun ws:status',
        'bun rules:count',
        'bun mcp:list CORE'
      ]
    });

    // Live dashboard update
    this.registerWorkflow({
      name: 'live-update',
      description: 'Live dashboard update',
      commands: [
        'bun datapipe:fetch --ws',
        'bun agents:export live-rankings.md',
        'bun ws:push'
      ]
    });

    // Backup workflow
    this.registerWorkflow({
      name: 'backup',
      description: 'Complete system backup',
      commands: [
        'bun datapipe:csv',
        'bun datapipe:yaml',
        'bun vault:sync',
        'git add . && git commit -m "Auto-backup $(date)" && git push'
      ]
    });

    // AI Header generation workflow
    this.registerWorkflow({
      name: 'ai-headers',
      description: 'AI Header generation workflow',
      commands: [
        'bun ai:analyze',
        'bun ai:generate --auto',
        'bun validate:headers'
      ]
    });

    // Performance monitoring
    this.registerWorkflow({
      name: 'perf-monitor',
      description: 'Performance monitoring',
      commands: [
        'bun agents:stats',
        'bun datapipe:query "delay>5"',
        'bun alerts:check'
      ]
    });
  }

  private registerWorkflow(workflow: Workflow): void {
    this.workflows.set(workflow.name, workflow);
  }

  async executeWorkflow(name: string): Promise<{ success: boolean; output: string[]; errors: string[] }> {
    const workflow = this.workflows.get(name);
    if (!workflow) {
      throw new Error(`Workflow '${name}' not found`);
    }

    console.log(`🚀 Executing workflow: ${workflow.name} - ${workflow.description}`);

    const output: string[] = [];
    const errors: string[] = [];

    if (workflow.parallel && workflow.background) {
      // Run all commands in parallel in background
      const promises = workflow.commands.map(async (cmd, index) => {
        try {
          const result = await this.executeCommand(cmd, `bg-${index}`);
          output.push(`✅ ${cmd}: ${result}`);
        } catch (error) {
          errors.push(`❌ ${cmd}: ${error}`);
        }
      });

      // Don't wait for completion, just start them
      Promise.all(promises).catch(err => {
        console.error(`Background workflow error: ${err.message}`);
      });

      return {
        success: true,
        output: [`Started ${workflow.commands.length} background processes`],
        errors: []
      };
    } else if (workflow.parallel) {
      // Run commands in parallel and wait
      const promises = workflow.commands.map(async (cmd, index) => {
        try {
          const result = await this.executeCommand(cmd, `parallel-${index}`);
          output.push(`✅ ${cmd}: ${result}`);
          return true;
        } catch (error) {
          errors.push(`❌ ${cmd}: ${error}`);
          return false;
        }
      });

      const results = await Promise.all(promises);
      const success = results.every(r => r);

      return { success, output, errors };
    } else {
      // Run commands sequentially
      for (const cmd of workflow.commands) {
        try {
          const result = await this.executeCommand(cmd);
          output.push(`✅ ${cmd}: ${result}`);
        } catch (error) {
          errors.push(`❌ ${cmd}: ${error}`);
          return { success: false, output, errors };
        }
      }

      return { success: true, output, errors };
    }
  }

  private async executeCommand(command: string, prefix: string = ''): Promise<string> {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      const proc = spawn(cmd, args, {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          const output = stdout.trim() || 'completed';
          resolve(output);
        } else {
          reject(new Error(`Exit code ${code}: ${stderr.trim() || 'unknown error'}`));
        }
      });

      proc.on('error', (error) => {
        reject(error);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        proc.kill();
        reject(new Error('Command timeout (30s)'));
      }, 30000);
    });
  }

  getAvailableWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  getWorkflow(name: string): Workflow | null {
    return this.workflows.get(name) || null;
  }

  formatWorkflowsTable(): string {
    const workflows = this.getAvailableWorkflows();
    const header = '| Workflow | Commands |\n|-------------|--------------|';

    const rows = workflows.map(wf =>
      `| **${wf.name}** | ${wf.commands.length} commands |`
    );

    return `${header}\n${rows.join('\n')}`;
  }

  async runQuickOps(): Promise<void> {
    console.log('⚡ Running Quick Ops - Daily essentials...');

    // Start essential services
    await this.executeWorkflow('daily-ops');

    // Run health check
    const health = await this.executeWorkflow('health-check');
    if (health.success) {
      console.log('✅ System healthy');
    } else {
      console.log('⚠️  Health issues detected');
      health.errors.forEach(error => console.log(`   ${error}`));
    }

    // Update live data
    await this.executeWorkflow('live-update');

    console.log('🎯 Quick Ops complete!');
  }
}

// CLI Interface
async function main() {
  const automation = new WorkflowAutomation();
  const command = process.argv[2];

  switch (command) {
    case 'list':
      const workflows = automation.getAvailableWorkflows();
      console.log(`\n🚀 WORKFLOWS – ONE-LINERS\n`);
      console.log(automation.formatWorkflowsTable());

      console.log('\n📋 Available workflows:');
      workflows.forEach(wf => {
        console.log(`   ${wf.name}: ${wf.description}`);
        console.log(`     Commands: ${wf.commands.join(' → ')}`);
        console.log('');
      });
      break;

    case 'run':
      const workflowName = process.argv[3];
      if (!workflowName) {
        console.log('Usage: bun workflows:run <workflow_name>');
        console.log('Available: daily-ops, telegram-top, gov-check, deploy, health-check, live-update, backup, ai-headers, perf-monitor');
        break;
      }

      try {
        const result = await automation.executeWorkflow(workflowName);
        console.log(`\n🎯 Workflow: ${workflowName}`);

        if (result.success) {
          console.log('✅ Completed successfully');
        } else {
          console.log('❌ Completed with errors');
        }

        result.output.forEach(line => console.log(`   ${line}`));
        result.errors.forEach(error => console.log(`   ${error}`));

      } catch (error) {
        console.log(`❌ Workflow failed: ${error.message}`);
      }
      break;

    case 'quick':
      await automation.runQuickOps();
      break;

    default:
      console.log(`🚀 Workflow Automation

USAGE:
  bun workflows:list              # List all workflows
  bun workflows:run <name>        # Execute workflow
  bun workflows:quick             # Quick daily ops

AVAILABLE WORKFLOWS:
  daily-ops     - Daily Ops (LIVE + Synced)
  telegram-top  - Telegram Trigger (Push to channel)
  gov-check     - GOV Check (Validate rules/tools)
  deploy        - Deploy (v1.0.1.exe)
  health-check  - Full system health check
  live-update   - Live dashboard update
  backup        - Complete system backup
  ai-headers    - AI Header generation
  perf-monitor  - Performance monitoring

EXAMPLES:
  bun workflows:run daily-ops     # Start all services
  bun workflows:run deploy        # Full deployment
  bun workflows:quick             # Daily essentials
`);
  }
}

// Export for use in other scripts
export { WorkflowAutomation, type Workflow };

// CLI execution
if (import.meta.main) {
  main().catch(console.error);
}
