#!/usr/bin/env bun
/**
 * Test configuration matrix generator
 * Usage: bun run test:matrix --format=unicode
 */

import { parseArgs } from 'util';
import { readFileSync } from 'fs';
import { join } from 'path';

const args = parseArgs({
  args: Bun.argv,
  options: {
    format: { type: 'string', default: 'unicode' },
    output: { type: 'string' },
  },
  allowPositionals: true,
});

const { format = 'unicode', output } = args.values;

interface TestConfig {
  name: string;
  command: string;
  description: string;
  context: string;
  coverage: boolean;
  timeout: number;
}

async function generateMatrix() {
  console.log('🏗️  Generating test configuration matrix...\n');
  
  const configs: TestConfig[] = [
    {
      name: 'Basic Test',
      command: 'bun test --config=ci --coverage --env-file=.env.test',
      description: 'Basic test with inheritance and coverage',
      context: 'ci',
      coverage: true,
      timeout: 30000
    },
    {
      name: 'CI Pipeline',
      command: 'bun run test:secure --context=ci --smol --threshold=0.9',
      description: 'CI pipeline with security validation',
      context: 'ci',
      coverage: true,
      timeout: 30000
    },
    {
      name: 'Local Dev',
      command: 'bun test --config=local --update-snapshots --match="*.spec.ts"',
      description: 'Local development with snapshots',
      context: 'local',
      coverage: false,
      timeout: 5000
    },
    {
      name: 'Security Audit',
      command: 'bun run test:audit --dry-run --validate-secrets',
      description: 'Security audit only',
      context: 'audit',
      coverage: false,
      timeout: 60000
    },
    {
      name: 'Matrix Gen',
      command: 'bun run test:matrix --format=unicode',
      description: 'Generate configuration matrix',
      context: 'matrix',
      coverage: false,
      timeout: 5000
    },
    {
      name: 'Inheritance Test',
      command: 'bun test --inherit=install.registry,install.cafile --preload=./security-mocks.ts',
      description: 'Run with specific inheritance',
      context: 'inheritance',
      coverage: false,
      timeout: 10000
    }
  ];
  
  if (format === 'unicode') {
    printUnicodeMatrix(configs);
  } else if (format === 'json') {
    printJsonMatrix(configs);
  } else if (format === 'markdown') {
    printMarkdownMatrix(configs);
  }
  
  if (output) {
    await saveMatrix(configs, output);
  }
}

function printUnicodeMatrix(configs: TestConfig[]) {
  console.log('┌─────────────────────────────────────────────────────────────────────────────────────┐');
  console.log('│' + ' '.center(92) + '│');
  console.log('│' + 'TEST CONFIGURATION MATRIX'.center(92) + '│');
  console.log('│' + ' '.center(92) + '│');
  console.log('├─────────────────────────┬─────────────────────────────────────────────────────────────┤');
  console.log('│' + ' Configuration'.padEnd(26) + '│' + ' Command & Description'.padEnd(66) + '│');
  console.log('├─────────────────────────┼─────────────────────────────────────────────────────────────┤');
  
  for (const config of configs) {
    const name = config.name.padEnd(26);
    const command = config.command.substring(0, 45).padEnd(45);
    const desc = config.description.substring(0, 20).padEnd(20);
    
    console.log(`│ ${name} │ ${command} │ ${desc} │`);
    
    if (config.command.length > 45 || config.description.length > 20) {
      const command2 = config.command.substring(45, 90).padEnd(45);
      const desc2 = config.description.substring(20, 40).padEnd(20);
      console.log(`│ ${' '.padEnd(26)} │ ${command2} │ ${desc2} │`);
    }
  }
  
  console.log('├─────────────────────────┴─────────────────────────────────────────────────────────────┤');
  console.log('│' + ' '.center(92) + '│');
  console.log('│' + 'Context Legend: CI=Continuous Integration, LOCAL=Local Development, AUDIT=Audit'.center(92) + '│');
  console.log('│' + ' '.center(92) + '│');
  console.log('└─────────────────────────────────────────────────────────────────────────────────────┘');
}

function printJsonMatrix(configs: TestConfig[]) {
  console.log(JSON.stringify(configs, null, 2));
}

function printMarkdownMatrix(configs: TestConfig[]) {
  console.log('# Test Configuration Matrix\n');
  console.log('| Configuration | Command | Description | Context | Coverage | Timeout |');
  console.log('|---------------|---------|-------------|---------|----------|---------|');
  
  for (const config of configs) {
    console.log(`| ${config.name} | \`${config.command}\` | ${config.description} | ${config.context} | ${config.coverage ? '✅' : '❌'} | ${config.timeout}ms |`);
  }
}

async function saveMatrix(configs: TestConfig[], filename: string) {
  const content = format === 'json' 
    ? JSON.stringify(configs, null, 2)
    : format === 'markdown'
    ? generateMarkdownContent(configs)
    : generateUnicodeContent(configs);
  
  await Bun.write(filename, content);
  console.log(`\n💾 Matrix saved to ${filename}`);
}

function generateMarkdownContent(configs: TestConfig[]): string {
  let content = '# Test Configuration Matrix\n\n';
  content += '| Configuration | Command | Description | Context | Coverage | Timeout |\n';
  content += '|---------------|---------|-------------|---------|----------|---------|\n';
  
  for (const config of configs) {
    content += `| ${config.name} | \`${config.command}\` | ${config.description} | ${config.context} | ${config.coverage ? '✅' : '❌'} | ${config.timeout}ms |\n`;
  }
  
  return content;
}

function generateUnicodeContent(configs: TestConfig[]): string {
  // Generate the same as printUnicodeMatrix but as a string
  return 'Test Configuration Matrix\n' +
         '============================\n' +
         configs.map(c => `${c.name}: ${c.command}`).join('\n');
}

// String center helper
String.prototype.center = function(len: number) {
  const pad = Math.max(0, len - this.length);
  return ' '.repeat(Math.floor(pad/2)) + this + ' '.repeat(Math.ceil(pad/2));
};

generateMatrix().catch(console.error);
