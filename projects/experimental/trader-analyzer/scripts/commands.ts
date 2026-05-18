#!/usr/bin/env bun
/**
 * Command Reference Generator
 * Shows all available bun run commands organized by category
 * 
 * @fileoverview Command reference utility
 * @module scripts/commands
 */

import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Script metadata interface
 */
interface ScriptMetadata {
  name: string;
  command: string;
  category: string;
}

/**
 * Category labels for display
 */
const CATEGORY_LABELS = {
  development: '🚀 Development',
  testing: '🧪 Testing',
  validation: '✅ Validation',
  formatting: '✨ Formatting',
  build: '📦 Build & Deploy',
  monitoring: '📊 Monitoring & Analytics',
  research: '🔬 Research & Analysis',
  telegram: '📱 Telegram',
  security: '🔒 Security',
  database: '💾 Database',
  utilities: '🛠️ Utilities',
  tmux: '🖥️ Terminal',
  other: '📋 Other'
} as const;

/**
 * Categorize script by name and command
 * 
 * @param name - Script name from package.json
 * @param command - Script command string
 * @returns Category key
 */
function categorizeScript(name: string, command: string): string {
  const lower = name.toLowerCase();
  const cmdLower = command.toLowerCase();

  if (lower.includes('dev') || lower.includes('start') || lower.includes('server') || lower.includes('console')) {
    return 'development';
  }
  if (lower.includes('test') || lower.includes('bench')) {
    return 'testing';
  }
  if (lower.includes('validate') || lower.includes('audit') || lower.includes('verify') || lower.includes('check')) {
    return 'validation';
  }
  if (lower.includes('format') || lower.includes('lint')) {
    return 'formatting';
  }
  if (lower.includes('build') || lower.includes('deploy')) {
    return 'build';
  }
  if (lower.includes('dashboard') || lower.includes('monitor') || lower.includes('metrics') || lower.includes('correlation')) {
    return 'monitoring';
  }
  if (lower.includes('research') || lower.includes('covert') || lower.includes('debug') || lower.includes('anomaly')) {
    return 'research';
  }
  if (lower.includes('telegram')) {
    return 'telegram';
  }
  if (lower.includes('security') || lower.includes('pentest') || lower.includes('sri') || lower.includes('headers')) {
    return 'security';
  }
  if (lower.includes('sqlite') || lower.includes('db') || lower.includes('database')) {
    return 'database';
  }
  if (lower.includes('tmux') || lower.includes('terminal')) {
    return 'tmux';
  }
  return 'other';
}

/**
 * Main entry point
 */
function main(): void {
  const packageJsonPath = join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  const scripts = packageJson.scripts || {};

  const categorized: Record<string, ScriptMetadata[]> = {};
  
  // Initialize categories
  for (const key of Object.keys(CATEGORY_LABELS)) {
    categorized[key] = [];
  }

  // Categorize scripts
  for (const [name, command] of Object.entries(scripts)) {
    const category = categorizeScript(name, command as string);
    categorized[category].push({
      name,
      command: command as string,
      category
    });
  }

  // Display
  console.info('\n📚 Available Commands\n');
  console.info('='.repeat(80));
  console.info('');

  for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
    const scriptsInCategory = categorized[key];
    if (scriptsInCategory.length === 0) continue;

    console.info(`\n${label}`);
    console.info('─'.repeat(80));
    
    // Sort scripts alphabetically
    scriptsInCategory.sort((a, b) => a.name.localeCompare(b.name));
    
    for (const script of scriptsInCategory) {
      const truncatedCommand = script.command.length > 60 
        ? script.command.substring(0, 57) + '...'
        : script.command;
      console.info(`  ${'bun run '.padEnd(12)}${script.name.padEnd(30)} ${truncatedCommand}`);
    }
  }

  console.info('\n' + '='.repeat(80));
  console.info('\n💡 Tips:');
  console.info('  • Use "bun run <script>" to execute any command');
  console.info('  • Press Tab in VS Code/Cursor to see available scripts');
  console.info('  • Use "bun run" without arguments to see all scripts');
  console.info('  • Common commands: dev, test, lint, typecheck, format');
  console.info('');
}

if (import.meta.main) {
  main();
}
