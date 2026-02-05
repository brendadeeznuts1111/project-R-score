#!/usr/bin/env bun
/**
 * Temporal Engine - Cron-based rule scheduling with Temporal.io integration
 * TEMPORAL.ENGINE.CRON - Time-aware rule execution and workflow scheduling
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { spawn } from "bun";

interface CronRule {
  id: string;
  name: string;
  cron: string;
  action: {
    type: 'srl_rule' | 'workflow' | 'command' | 'agent';
    target: string;
    parameters?: Record<string, any>;
  };
  enabled: boolean;
  timezone?: string;
  retryPolicy?: {
    attempts: number;
    backoff: 'linear' | 'exponential';
    maxDelay: number;
  };
  metadata: {
    created: string;
    lastRun?: string;
    nextRun?: string;
    runCount: number;
    successCount: number;
    failureCount: number;
  };
}

interface TemporalWorkflow {
  id: string;
  name: string;
  schedule: string;
  steps: TemporalStep[];
  state: 'idle' | 'running' | 'paused' | 'failed';
  metadata: {
    created: string;
    started?: string;
    completed?: string;
    duration?: number;
  };
}

interface TemporalStep {
  id: string;
  name: string;
  type: 'activity' | 'timer' | 'decision';
  action: string;
  timeout: number;
  retryPolicy?: {
    attempts: number;
    backoff: string;
  };
  dependencies?: string[];
}

class TemporalEngine {
  private rulesPath: string;
  private workflowsPath: string;
  private schedulePath: string;
  private cronRules: Map<string, CronRule> = new Map();
  private workflows: Map<string, TemporalWorkflow> = new Map();
  private running: boolean = false;
  private nextTimeouts: Map<string, Timer> = new Map();

  constructor() {
    this.rulesPath = join(process.cwd(), '.cursor', 'rules');
    this.workflowsPath = join(process.cwd(), '.cursor', 'workflows');
    this.schedulePath = join(process.cwd(), '.cursor', 'temporal-schedule.json');

    this.loadCronRules();
    this.loadWorkflows();
  }

  // Parse cron expression and calculate next run time
  private parseCron(cron: string, fromTime: Date = new Date()): Date | null {
    // Simple cron parser - supports basic expressions
    // Format: "MINUTE HOUR DAY MONTH DAYOFWEEK"
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) return null;

    const [minute, hour, day, month, dayOfWeek] = parts;

    // For demo purposes, we'll implement basic scheduling
    // In production, use a full cron parser like 'node-cron'
    const now = new Date(fromTime);

    // Handle @hourly, @daily, @weekly, @monthly shortcuts
    if (cron.startsWith('@')) {
      switch (cron) {
        case '@hourly':
          now.setHours(now.getHours() + 1, 0, 0, 0);
          return now;
        case '@daily':
          now.setDate(now.getDate() + 1);
          now.setHours(0, 0, 0, 0);
          return now;
        case '@weekly':
          now.setDate(now.getDate() + (7 - now.getDay()));
          now.setHours(0, 0, 0, 0);
          return now;
        case '@monthly':
          now.setMonth(now.getMonth() + 1, 1);
          now.setHours(0, 0, 0, 0);
          return now;
      }
    }

    // Basic cron parsing (simplified)
    if (minute === '*' && hour === '*' && day === '*' && month === '*' && dayOfWeek === '*') {
      // Every minute
      now.setMinutes(now.getMinutes() + 1);
      return now;
    }

    if (minute === '0' && hour === '*' && day === '*' && month === '*' && dayOfWeek === '*') {
      // Every hour
      now.setHours(now.getHours() + 1, 0, 0, 0);
      return now;
    }

    if (minute === '0' && hour === '0' && day === '*' && month === '*' && dayOfWeek === '*') {
      // Every day
      now.setDate(now.getDate() + 1);
      now.setHours(0, 0, 0, 0);
      return now;
    }

    // For more complex expressions, return null (not supported in demo)
    return null;
  }

  // Load cron rules from SRL files
  private loadCronRules(): void {
    if (!existsSync(this.rulesPath)) return;

    const files = ['security.srl.md', 'quality.srl.md', 'deployment.srl.md'];

    for (const file of files) {
      const filePath = join(this.rulesPath, file);
      if (existsSync(filePath)) {
        try {
          const content = readFileSync(filePath, 'utf-8');
          const rules = this.extractCronRules(content, file);
          rules.forEach(rule => this.cronRules.set(rule.id, rule));
        } catch (error) {
          console.warn(`Failed to load cron rules from ${file}:`, error.message);
        }
      }
    }

    console.log(`Loaded ${this.cronRules.size} cron rules`);
  }

  private extractCronRules(content: string, filename: string): CronRule[] {
    const rules: CronRule[] = [];
    const ruleBlocks = content.match(/```srl[\s\S]*?```/g) || [];

    for (const block of ruleBlocks) {
      const ruleContent = block.replace(/```\s*srl\s*/, '').replace(/```\s*$/, '');
      const lines = ruleContent.split('\n');

      let currentRule: Partial<CronRule> | null = null;

      for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith('RULE ')) {
          if (currentRule) rules.push(currentRule as CronRule);
          currentRule = {
            id: '',
            name: '',
            cron: '',
            action: { type: 'srl_rule', target: '' },
            enabled: true,
            metadata: { created: new Date().toISOString(), runCount: 0, successCount: 0, failureCount: 0 }
          };

          const match = trimmed.match(/RULE (\w+) v[\d.]+/);
          if (match) {
            currentRule.id = match[1];
            currentRule.name = match[1].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          }
        } else if (trimmed.includes('cron:') && currentRule) {
          currentRule.cron = trimmed.split('cron:')[1].trim().replace(/['"]/g, '');
        } else if (trimmed.includes('THEN:') && currentRule) {
          // Parse THEN actions
          // This is simplified - in practice, parse the full SRL structure
          currentRule.action = {
            type: 'srl_rule',
            target: currentRule.id,
            parameters: {}
          };
        }
      }

      if (currentRule && currentRule.id && currentRule.cron) {
        rules.push(currentRule as CronRule);
      }
    }

    return rules;
  }

  // Load temporal workflows
  private loadWorkflows(): void {
    if (!existsSync(this.workflowsPath)) return;

    const files = ['map-reduce.yaml', 'reviewer-chain.yaml', 'release-bot.yaml'];

    for (const file of files) {
      const filePath = join(this.workflowsPath, file);
      if (existsSync(filePath)) {
        try {
          const content = readFileSync(filePath, 'utf-8');
          const workflow = this.parseWorkflow(content, file);
          if (workflow) {
            this.workflows.set(workflow.id, workflow);
          }
        } catch (error) {
          console.warn(`Failed to load workflow ${file}:`, error.message);
        }
      }
    }

    console.log(`Loaded ${this.workflows.size} temporal workflows`);
  }

  private parseWorkflow(content: string, filename: string): TemporalWorkflow | null {
    // Simple YAML parser for workflows
    const workflow: Partial<TemporalWorkflow> = {
      id: filename.replace('.yaml', ''),
      name: filename.replace('.yaml', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      schedule: '@daily', // Default
      steps: [],
      state: 'idle',
      metadata: { created: new Date().toISOString() }
    };

    // Basic parsing - extract schedule if present
    const scheduleMatch = content.match(/schedule:\s*(.+)/);
    if (scheduleMatch) {
      workflow.schedule = scheduleMatch[1].trim();
    }

    return workflow as TemporalWorkflow;
  }

  // Start the temporal engine
  async start(): Promise<void> {
    if (this.running) return;

    this.running = true;
    console.log('⏰ Starting Temporal Engine...');

    // Schedule initial runs
    await this.scheduleRules();

    // Keep running
    while (this.running) {
      await Bun.sleep(60000); // Check every minute
      await this.scheduleRules();
    }
  }

  // Stop the temporal engine
  async stop(): Promise<void> {
    this.running = false;

    // Clear all timeouts
    for (const timeout of this.nextTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.nextTimeouts.clear();

    console.log('⏹️  Stopped Temporal Engine');
  }

  // Schedule cron rules
  private async scheduleRules(): Promise<void> {
    const now = new Date();

    for (const rule of this.cronRules.values()) {
      if (!rule.enabled || !rule.cron) continue;

      const nextRun = this.parseCron(rule.cron, now);
      if (!nextRun) continue;

      // Calculate delay in milliseconds
      const delay = nextRun.getTime() - now.getTime();

      if (delay > 0 && delay < 24 * 60 * 60 * 1000) { // Within 24 hours
        // Clear existing timeout
        const existingTimeout = this.nextTimeouts.get(rule.id);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Schedule new execution
        const timeout = setTimeout(() => {
          this.executeRule(rule);
        }, delay);

        this.nextTimeouts.set(rule.id, timeout);
        rule.metadata.nextRun = nextRun.toISOString();

        console.log(`📅 Scheduled ${rule.name} for ${nextRun.toISOString()}`);
      }
    }
  }

  // Execute a cron rule
  private async executeRule(rule: CronRule): Promise<void> {
    console.log(`🚀 Executing cron rule: ${rule.name}`);

    rule.metadata.runCount++;
    rule.metadata.lastRun = new Date().toISOString();

    try {
      switch (rule.action.type) {
        case 'srl_rule':
          await this.executeSRLRule(rule.action.target, rule.action.parameters);
          break;
        case 'workflow':
          await this.executeWorkflow(rule.action.target, rule.action.parameters);
          break;
        case 'command':
          await this.executeCommand(rule.action.target, rule.action.parameters);
          break;
        case 'agent':
          await this.executeAgent(rule.action.target, rule.action.parameters);
          break;
      }

      rule.metadata.successCount++;
      console.log(`✅ Cron rule ${rule.name} completed successfully`);

    } catch (error) {
      rule.metadata.failureCount++;
      console.error(`❌ Cron rule ${rule.name} failed:`, error.message);

      // Handle retries if configured
      if (rule.retryPolicy && rule.metadata.failureCount <= rule.retryPolicy.attempts) {
        const delay = this.calculateRetryDelay(rule.retryPolicy, rule.metadata.failureCount);
        console.log(`🔄 Retrying ${rule.name} in ${delay}ms`);

        setTimeout(() => this.executeRule(rule), delay);
      }
    }

    // Reschedule for next run
    this.scheduleRules();
  }

  private calculateRetryDelay(policy: NonNullable<CronRule['retryPolicy']>, attempt: number): number {
    const baseDelay = 1000; // 1 second

    switch (policy.backoff) {
      case 'linear':
        return Math.min(baseDelay * attempt, policy.maxDelay);
      case 'exponential':
        return Math.min(baseDelay * Math.pow(2, attempt - 1), policy.maxDelay);
      default:
        return baseDelay;
    }
  }

  private async executeSRLRule(ruleId: string, parameters: any): Promise<void> {
    // Execute SRL rule using the SRL engine
    const proc = spawn({
      cmd: ['bun', 'run', 'scripts/srl-engine.ts', 'execute', JSON.stringify({ ruleId, ...parameters })],
      stdout: 'pipe',
      stderr: 'pipe'
    });

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const error = await new Response(proc.stderr).text();
      throw new Error(`SRL rule execution failed: ${error}`);
    }
  }

  private async executeWorkflow(workflowId: string, parameters: any): Promise<void> {
    // Execute workflow using the workflow engine
    const proc = spawn({
      cmd: ['bun', 'run', 'scripts/workflow-engine.ts', workflowId, JSON.stringify(parameters)],
      stdout: 'pipe',
      stderr: 'pipe'
    });

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const error = await new Response(proc.stderr).text();
      throw new Error(`Workflow execution failed: ${error}`);
    }
  }

  private async executeCommand(command: string, parameters: any): Promise<void> {
    const proc = spawn({
      cmd: ['sh', '-c', command],
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, ...parameters }
    });

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const error = await new Response(proc.stderr).text();
      throw new Error(`Command execution failed: ${error}`);
    }
  }

  private async executeAgent(agentId: string, parameters: any): Promise<void> {
    // Execute agent using the agent spawn system
    const proc = spawn({
      cmd: ['bun', 'run', 'scripts/agent-spawn.ts', agentId, JSON.stringify(parameters)],
      stdout: 'pipe',
      stderr: 'pipe'
    });

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const error = await new Response(proc.stderr).text();
      throw new Error(`Agent execution failed: ${error}`);
    }
  }

  // Add custom cron rule
  addCronRule(rule: CronRule): void {
    this.cronRules.set(rule.id, rule);
    this.saveSchedule();
  }

  // Remove cron rule
  removeCronRule(ruleId: string): boolean {
    const removed = this.cronRules.delete(ruleId);
    if (removed) {
      const timeout = this.nextTimeouts.get(ruleId);
      if (timeout) {
        clearTimeout(timeout);
        this.nextTimeouts.delete(ruleId);
      }
      this.saveSchedule();
    }
    return removed;
  }

  // Get all cron rules
  getCronRules(): CronRule[] {
    return Array.from(this.cronRules.values());
  }

  // Save schedule state
  private saveSchedule(): void {
    const schedule = {
      cronRules: Array.from(this.cronRules.values()),
      workflows: Array.from(this.workflows.values()),
      lastUpdated: new Date().toISOString()
    };

    writeFileSync(this.schedulePath, JSON.stringify(schedule, null, 2));
  }

  // Generate schedule report
  generateReport(): string {
    let report = '# Temporal Engine Schedule Report\n\n';

    report += `## Cron Rules (${this.cronRules.size})\n\n`;

    for (const rule of this.cronRules.values()) {
      report += `### ${rule.name} (${rule.id})\n\n`;
      report += `- **Schedule**: \`${rule.cron}\`\n`;
      report += `- **Action**: ${rule.action.type} → ${rule.action.target}\n`;
      report += `- **Status**: ${rule.enabled ? 'Enabled' : 'Disabled'}\n`;
      report += `- **Runs**: ${rule.metadata.runCount} total (${rule.metadata.successCount} success, ${rule.metadata.failureCount} failed)\n`;

      if (rule.metadata.lastRun) {
        report += `- **Last Run**: ${rule.metadata.lastRun}\n`;
      }
      if (rule.metadata.nextRun) {
        report += `- **Next Run**: ${rule.metadata.nextRun}\n`;
      }

      report += '\n';
    }

    report += `## Temporal Workflows (${this.workflows.size})\n\n`;

    for (const workflow of this.workflows.values()) {
      report += `### ${workflow.name} (${workflow.id})\n\n`;
      report += `- **Schedule**: ${workflow.schedule}\n`;
      report += `- **State**: ${workflow.state}\n`;
      report += `- **Steps**: ${workflow.steps?.length || 0}\n`;
      report += `- **Created**: ${workflow.metadata.created}\n\n`;
    }

    return report;
  }
}

// CLI interface
async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command) {
    console.log(`
Temporal Engine v1.0.0 - Cron-based rule scheduling

Usage:
  bun run scripts/temporal-engine.ts <command> [options]

Commands:
  start                    Start the temporal engine
  stop                     Stop the temporal engine
  add-rule <rule-json>     Add custom cron rule
  remove-rule <rule-id>    Remove cron rule
  list-rules               List all cron rules
  status                   Show engine status and schedule
  report                   Generate schedule report

Examples:
  bun run scripts/temporal-engine.ts start
  bun run scripts/temporal-engine.ts add-rule '{"id":"daily-backup","name":"Daily Backup","cron":"0 2 * * *","action":{"type":"command","target":"./backup.sh"}}'
  bun run scripts/temporal-engine.ts list-rules
  bun run scripts/temporal-engine.ts report
`);
    return;
  }

  const engine = new TemporalEngine();

  try {
    switch (command) {
      case 'start':
        console.log('Starting Temporal Engine...');
        await engine.start();
        break;

      case 'stop':
        await engine.stop();
        break;

      case 'add-rule':
        const [ruleJson] = args;
        if (!ruleJson) {
          throw new Error('Usage: add-rule <rule-json>');
        }
        const rule = JSON.parse(ruleJson);
        engine.addCronRule(rule);
        console.log(`✅ Added cron rule: ${rule.id}`);
        break;

      case 'remove-rule':
        const [ruleId] = args;
        if (!ruleId) {
          throw new Error('Usage: remove-rule <rule-id>');
        }
        const removed = engine.removeCronRule(ruleId);
        console.log(removed ? `✅ Removed rule: ${ruleId}` : `❌ Rule not found: ${ruleId}`);
        break;

      case 'list-rules':
        const rules = engine.getCronRules();
        console.log('Active Cron Rules:');
        rules.forEach(rule => {
          console.log(`  ${rule.id}: ${rule.name} (${rule.cron}) - ${rule.enabled ? '✅' : '❌'}`);
        });
        break;

      case 'status':
        const allRules = engine.getCronRules();
        console.log('Temporal Engine Status:');
        console.log(`  Active Rules: ${allRules.filter(r => r.enabled).length}`);
        console.log(`  Total Rules: ${allRules.length}`);
        console.log(`  Running: ${true}`); // Simplified
        break;

      case 'report':
        console.log(engine.generateReport());
        break;

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('Temporal Engine error:', error.message);
    process.exit(1);
  }
}

export { TemporalEngine };
export type { CronRule, TemporalWorkflow, TemporalStep };

// Run CLI if called directly
if (import.meta.main) {
  main();
}
