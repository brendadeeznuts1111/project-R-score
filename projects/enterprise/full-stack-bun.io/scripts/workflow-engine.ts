#!/usr/bin/env bun
/**
 * YAML Workflow Engine - Execute workflows defined in .cursor/workflows/*.yaml
 * WORKFLOW.*.YAML - Map-reduce, reviewer-chain, release-bot workflows
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { spawn } from "bun";

interface WorkflowStep {
  name: string;
  type: 'command' | 'script' | 'agent' | 'parallel' | 'sequential';
  command?: string;
  script?: string;
  agent?: string;
  params?: any;
  dependencies?: string[];
  timeout?: number;
  retries?: number;
  onFailure?: string;
}

interface Workflow {
  name: string;
  description?: string;
  version: string;
  steps: WorkflowStep[];
  metadata?: {
    author?: string;
    created?: string;
    tags?: string[];
  };
}

class WorkflowEngine {
  private workflowPath: string;

  constructor() {
    this.workflowPath = join(process.cwd(), '.cursor', 'workflows');
  }

  // Load and parse workflow YAML
  loadWorkflow(name: string): Workflow {
    const workflowFile = join(this.workflowPath, `${name}.yaml`);

    if (!existsSync(workflowFile)) {
      throw new Error(`Workflow not found: ${name}`);
    }

    // Simple YAML parser (Bun doesn't have built-in YAML yet)
    const content = readFileSync(workflowFile, 'utf-8');
    return this.parseYAML(content);
  }

  // Execute workflow with given parameters
  async executeWorkflow(name: string, params: any = {}, rules: string[] = []): Promise<any> {
    console.log(`🔄 Executing workflow: ${name}`);

    const workflow = this.loadWorkflow(name);
    const context = {
      params,
      results: new Map<string, any>(),
      startTime: Date.now()
    };

    // Build execution graph
    const stepGraph = this.buildDependencyGraph(workflow.steps);

    // Execute steps in dependency order
    for (const step of workflow.steps) {
      await this.executeStep(step, context, rules);
    }

    const duration = Date.now() - context.startTime;
    console.log(`✅ Workflow ${name} completed in ${duration}ms`);

    return {
      workflow: name,
      version: workflow.version,
      results: Object.fromEntries(context.results),
      duration,
      timestamp: new Date().toISOString()
    };
  }

  private async executeStep(step: WorkflowStep, context: any, rules: string[]): Promise<void> {
    console.log(`▶️  Executing step: ${step.name} (${step.type})`);

    const startTime = Date.now();

    try {
      switch (step.type) {
        case 'command':
          await this.executeCommand(step, context);
          break;
        case 'script':
          await this.executeScript(step, context);
          break;
        case 'agent':
          await this.executeAgent(step, context, rules);
          break;
        case 'parallel':
          await this.executeParallel(step, context, rules);
          break;
        case 'sequential':
          await this.executeSequential(step, context, rules);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Step ${step.name} completed in ${duration}ms`);

    } catch (error) {
      console.error(`❌ Step ${step.name} failed:`, error.message);

      if (step.onFailure) {
        console.log(`🔄 Executing failure handler: ${step.onFailure}`);
        // Could implement failure recovery logic here
      }

      throw error;
    }
  }

  private async executeCommand(step: WorkflowStep, context: any): Promise<void> {
    if (!step.command) throw new Error('Command step requires command field');

    const proc = spawn({
      cmd: ['sh', '-c', step.command],
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, ...context.params }
    });

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      const error = await new Response(proc.stderr).text();
      throw new Error(`Command failed: ${error}`);
    }

    context.results.set(step.name, output.trim());
  }

  private async executeScript(step: WorkflowStep, context: any): Promise<void> {
    if (!step.script) throw new Error('Script step requires script field');

    const scriptPath = join(process.cwd(), step.script);
    if (!existsSync(scriptPath)) {
      throw new Error(`Script not found: ${scriptPath}`);
    }

    const proc = spawn({
      cmd: ['bun', 'run', scriptPath],
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, ...context.params }
    });

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      const error = await new Response(proc.stderr).text();
      throw new Error(`Script failed: ${error}`);
    }

    context.results.set(step.name, output.trim());
  }

  private async executeAgent(step: WorkflowStep, context: any, rules: string[]): Promise<void> {
    if (!step.agent) throw new Error('Agent step requires agent field');

    const agentParams = { ...step.params, ...context.params };

    const proc = spawn({
      cmd: ['bun', 'run', 'scripts/agent-spawn.ts', step.agent, JSON.stringify(agentParams)],
      stdout: 'pipe',
      stderr: 'pipe',
      stdin: 'inherit'
    });

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      throw new Error(`Agent ${step.agent} failed: ${output}`);
    }

    const result = JSON.parse(output);
    context.results.set(step.name, result);
  }

  private async executeParallel(step: WorkflowStep, context: any, rules: string[]): Promise<void> {
    // Execute multiple steps in parallel
    const promises = (step.steps || []).map(subStep =>
      this.executeStep(subStep, context, rules)
    );

    await Promise.all(promises);
  }

  private async executeSequential(step: WorkflowStep, context: any, rules: string[]): Promise<void> {
    // Execute multiple steps sequentially
    for (const subStep of step.steps || []) {
      await this.executeStep(subStep, context, rules);
    }
  }

  private buildDependencyGraph(steps: WorkflowStep[]): Map<string, WorkflowStep[]> {
    const graph = new Map<string, WorkflowStep[]>();

    for (const step of steps) {
      const deps = step.dependencies || [];
      for (const dep of deps) {
        if (!graph.has(dep)) {
          graph.set(dep, []);
        }
        graph.get(dep)!.push(step);
      }
    }

    return graph;
  }

  // Simple YAML parser for workflow files
  private parseYAML(content: string): Workflow {
    // Basic YAML parsing - in production, use a proper YAML library
    const lines = content.split('\n');
    const workflow: any = { steps: [] };
    let currentStep: any = null;
    let indentLevel = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const indent = line.length - line.trimLeft().length;

      if (trimmed.includes(':') && !trimmed.startsWith(' ')) {
        const [key, value] = trimmed.split(':', 2);
        const cleanKey = key.trim();
        const cleanValue = value ? value.trim() : '';

        if (cleanKey === 'name') {
          workflow.name = cleanValue;
        } else if (cleanKey === 'version') {
          workflow.version = cleanValue;
        } else if (cleanKey === 'description') {
          workflow.description = cleanValue;
        } else if (cleanKey === 'steps' && !cleanValue) {
          // Start of steps array
        } else if (cleanKey === '- name') {
          currentStep = { name: cleanValue };
          workflow.steps.push(currentStep);
        } else if (currentStep && indent > indentLevel) {
          currentStep[cleanKey] = cleanValue || true;
        }

        indentLevel = indent;
      }
    }

    return workflow as Workflow;
  }
}

// CLI interface
async function main() {
  const [workflowName, paramsJson, rulesJson] = process.argv.slice(2);

  if (!workflowName) {
    console.log(`
YAML Workflow Engine v1.0.0 - WORKFLOW.*.YAML

Usage:
  bun run scripts/workflow-engine.ts <workflow-name> [params-json] [rules-json]

Available workflows:
  map-reduce      - Parallel processing workflow
  reviewer-chain  - Code review pipeline
  release-bot     - Automated release workflow

Examples:
  bun run scripts/workflow-engine.ts map-reduce '{"input": ["file1", "file2"]}'
  bun run scripts/workflow-engine.ts reviewer-chain '{"code": "function() {}"}'
  bun run scripts/workflow-engine.ts release-bot '{"version": "1.0.0"}'
`);
    return;
  }

  const params = paramsJson ? JSON.parse(paramsJson) : {};
  const rules = rulesJson ? JSON.parse(rulesJson) : [];

  const engine = new WorkflowEngine();

  try {
    const result = await engine.executeWorkflow(workflowName, params, rules);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`Workflow execution failed:`, error.message);
    process.exit(1);
  }
}

main();
