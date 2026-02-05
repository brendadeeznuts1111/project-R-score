/**
 * CMD.*.SPAWN - Root slash-command engine for Cursor IDE
 * Spawn agents and workflows from chat using Bun macros
 */

import { spawn } from "bun";
import { readFileSync } from "fs";
import { join } from "path";

// [CMD][CODER][SPAWN] - Spawn coding agent
export macro function coder(task: string, context?: string): Promise<any> {
  // Load coder agent rules
  const rules = loadAgentRules('coder');

  // Spawn coder agent process
  const result = await spawnCoderAgent(task, context, rules);

  return result;
}

// [CMD][REVIEWER][SPAWN] - Spawn code review agent
export macro function reviewer(code: string, criteria?: string): Promise<any> {
  // Load reviewer agent rules
  const rules = loadAgentRules('reviewer');

  // Spawn reviewer agent process
  const result = await spawnReviewerAgent(code, criteria, rules);

  return result;
}

// [CMD][INSTALL][SPAWN] - Spawn package installer agent
export macro function install(packageName: string, options?: any): Promise<any> {
  // Load installer agent rules
  const rules = loadAgentRules('installer');

  // Spawn installer agent process
  const result = await spawnInstallerAgent(packageName, options, rules);

  return result;
}

// [CMD][WORKFLOW][SPAWN] - Spawn workflow agent
export macro function workflow(name: string, params?: any): Promise<any> {
  // Load workflow agent rules
  const rules = loadAgentRules('workflow');

  // Execute workflow
  const result = await executeWorkflow(name, params, rules);

  return result;
}

// Internal helper functions
function loadAgentRules(agentName: string): string[] {
  try {
    const rulePath = join(process.cwd(), '.cursor', 'rules', `${agentName}.md`);
    const content = readFileSync(rulePath, 'utf-8');

    // Extract rules from markdown
    const rules: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.includes('[RULE]') && line.includes('**AGENT.')) {
        const ruleMatch = line.match(/\*\*AGENT\.\w+\.RULE\*\* - (.+)/);
        if (ruleMatch) {
          rules.push(ruleMatch[1]);
        }
      }
    }

    return rules;
  } catch (error) {
    console.warn(`Failed to load ${agentName} rules:`, error);
    return [];
  }
}

async function spawnCoderAgent(task: string, context?: string, rules?: string[]): Promise<any> {
  // CMD.CODER.SPAWN - Execute coding task
  const cmd = [
    'bun', 'run', 'scripts/agent-spawn.ts',
    'coder',
    JSON.stringify({ task, context, rules })
  ];

  const proc = spawn({
    cmd,
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'inherit'
  });

  const output = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(`Coder agent failed: ${output}`);
  }

  return JSON.parse(output);
}

async function spawnReviewerAgent(code: string, criteria?: string, rules?: string[]): Promise<any> {
  // CMD.REVIEWER.SPAWN - Execute code review
  const cmd = [
    'bun', 'run', 'scripts/agent-spawn.ts',
    'reviewer',
    JSON.stringify({ code, criteria, rules })
  ];

  const proc = spawn({
    cmd,
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'inherit'
  });

  const output = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(`Reviewer agent failed: ${output}`);
  }

  return JSON.parse(output);
}

async function spawnInstallerAgent(packageName: string, options?: any, rules?: string[]): Promise<any> {
  // CMD.INSTALL.SPAWN - Execute package installation
  const cmd = [
    'bun', 'run', 'scripts/agent-spawn.ts',
    'installer',
    JSON.stringify({ packageName, options, rules })
  ];

  const proc = spawn({
    cmd,
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'inherit'
  });

  const output = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(`Installer agent failed: ${output}`);
  }

  return JSON.parse(output);
}

async function executeWorkflow(name: string, params?: any, rules?: string[]): Promise<any> {
  // CMD.WORKFLOW.SPAWN - Execute named workflow
  const cmd = [
    'bun', 'run', 'scripts/workflow-engine.ts',
    name,
    JSON.stringify(params || {}),
    JSON.stringify(rules || [])
  ];

  const proc = spawn({
    cmd,
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'inherit'
  });

  const output = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(`Workflow execution failed: ${output}`);
  }

  return JSON.parse(output);
}

// Export the slash command functions
export { coder, reviewer, install, workflow };
