#!/usr/bin/env bun
/**
 * Agent Spawn Engine - Execute agents with loaded rules
 * CMD.*.SPAWN - Backend for slash command macros
 */

import { spawn } from "bun";
import { readFileSync } from "fs";
import { join } from "path";

const [agentType, paramsJson] = process.argv.slice(2);

if (!agentType || !paramsJson) {
  console.error("Usage: agent-spawn.ts <agent-type> <params-json>");
  process.exit(1);
}

const params = JSON.parse(paramsJson);

// Load global rules
const globalRules = loadRules('_global');
const agentRules = loadRules(agentType);

const allRules = [...globalRules, ...agentRules];

async function main() {
  try {
    switch (agentType) {
      case 'coder':
        await executeCoder(params, allRules);
        break;
      case 'reviewer':
        await executeReviewer(params, allRules);
        break;
      case 'installer':
        await executeInstaller(params, allRules);
        break;
      default:
        throw new Error(`Unknown agent type: ${agentType}`);
    }
  } catch (error) {
    console.error(`Agent execution failed:`, error);
    process.exit(1);
  }
}

function loadRules(agentName: string): string[] {
  try {
    const rulePath = join(process.cwd(), '.cursor', 'rules', `${agentName}.md`);
    const content = readFileSync(rulePath, 'utf-8');

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

async function executeCoder(params: any, rules: string[]) {
  console.log(`🤖 Executing coder agent with rules:`, rules.length);

  // Apply coder-specific logic
  const { task, context } = params;

  // Simulate code generation with rules applied
  const result = {
    agent: 'coder',
    task,
    context,
    rulesApplied: rules.length,
    generated: `// Generated code for: ${task}\n// Following ${rules.length} rules`,
    timestamp: new Date().toISOString()
  };

  console.log(JSON.stringify(result, null, 2));
}

async function executeReviewer(params: any, rules: string[]) {
  console.log(`🔍 Executing reviewer agent with rules:`, rules.length);

  // Apply reviewer-specific logic
  const { code, criteria } = params;

  // Simulate code review with rules applied
  const result = {
    agent: 'reviewer',
    codeLength: code.length,
    criteria,
    rulesApplied: rules.length,
    findings: [
      { type: 'security', severity: 'high', message: 'Input validation missing' },
      { type: 'performance', severity: 'medium', message: 'Inefficient algorithm detected' }
    ],
    score: 85,
    timestamp: new Date().toISOString()
  };

  console.log(JSON.stringify(result, null, 2));
}

async function executeInstaller(params: any, rules: string[]) {
  console.log(`📦 Executing installer agent with rules:`, rules.length);

  // Apply installer-specific logic
  const { packageName, options } = params;

  // Simulate package installation with rules applied
  const result = {
    agent: 'installer',
    package: packageName,
    options,
    rulesApplied: rules.length,
    checks: {
      security: 'passed',
      compatibility: 'passed',
      license: 'MIT',
      bundleSize: '45KB'
    },
    installed: true,
    timestamp: new Date().toISOString()
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
