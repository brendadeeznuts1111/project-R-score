#!/usr/bin/env bun
/**
 * @fileoverview NEXUS CLI - Command Line Interface for Trading Intelligence Platform
 * @description Main CLI entry point with pattern registry and system management
 */

import { patternCommands } from '../patterns/viz';
import { runBenchmarks } from '../bench';
import { colors, box } from '../utils';

// CLI command definitions
const commands = {
  // Pattern registry commands
  'patterns:status': {
    description: 'Display pattern registry status',
    handler: () => patternCommands.status(),
  },
  'patterns:list': {
    description: 'List all registered patterns',
    handler: () => patternCommands.list(),
  },
  'patterns:stats': {
    description: 'Show detailed stats for a pattern',
    usage: 'patterns:stats <pattern-id>',
    handler: (args: string[]) => {
      const patternId = args[0];
      if (!patternId) {
        console.log(colors.red('Error: Pattern ID required'));
        console.log(colors.gray('Usage: patterns:stats <pattern-id>'));
        return;
      }
      patternCommands.stats(patternId);
    },
  },
  'patterns:health': {
    description: 'Run pattern registry health check',
    handler: () => patternCommands.health(),
  },

  // Benchmarking commands
  'bench': {
    description: 'Run full performance benchmark suite',
    handler: () => runBenchmarks(),
  },
  'bench:quick': {
    description: 'Run quick benchmark (subset of tests)',
    handler: async () => {
      console.log(colors.yellow('Quick benchmark not yet implemented'));
      console.log(colors.gray('Use "bench" for full suite'));
    },
  },

  // System commands
  'status': {
    description: 'Show system status',
    handler: async () => {
      console.log(colors.cyan('NEXUS System Status'));
      console.log(colors.gray('─'.repeat(40)));

      // Runtime info
      const { runtime } = await import('../utils');
      console.log(`Runtime: ${colors.cyan('Bun ' + runtime.version)}`);
      console.log(`Platform: ${colors.cyan(runtime.platform)}`);
      console.log(`Memory: ${colors.cyan(runtime.memoryFormatted().heapUsed)}`);

      // Pattern registry status
      const { globalPatternRegistry } = await import('../patterns');
      const stats = globalPatternRegistry.getStats();
      console.log(`Patterns: ${colors.cyan(stats.totalPatterns + ' registered, ' + stats.enabledPatterns + ' enabled')}`);

      console.log(colors.green('\n✅ System operational'));
    },
  },

  'help': {
    description: 'Show this help message',
    handler: () => showHelp(),
  },
};

function showHelp() {
  console.log(colors.cyan('NEXUS CLI - Trading Intelligence Platform'));
  console.log(colors.gray('Usage: bun run cli <command> [args...]'));
  console.log();

  console.log(colors.yellow('Available Commands:'));
  console.log();

  // Group commands by category
  const categories = {
    'Pattern Registry': Object.keys(commands).filter(cmd => cmd.startsWith('patterns:')),
    'Benchmarking': Object.keys(commands).filter(cmd => cmd.startsWith('bench')),
    'System': Object.keys(commands).filter(cmd => !cmd.includes(':')),
  };

  for (const [category, cmds] of Object.entries(categories)) {
    console.log(colors.cyan(category + ':'));
    for (const cmd of cmds) {
      const info = commands[cmd as keyof typeof commands];
      console.log(`  ${colors.green(cmd.padEnd(20))} ${info.description}`);
      if (info.usage) {
        console.log(`  ${' '.repeat(22)}${colors.gray(info.usage)}`);
      }
    }
    console.log();
  }

  console.log(colors.gray('Examples:'));
  console.log(colors.gray('  bun run cli patterns:status'));
  console.log(colors.gray('  bun run cli patterns:stats cross-market-spread'));
  console.log(colors.gray('  bun run cli bench'));
  console.log(colors.gray('  bun run cli status'));
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showHelp();
    return;
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  const cmdInfo = commands[command as keyof typeof commands];

  if (!cmdInfo) {
    console.log(colors.red(`Unknown command: ${command}`));
    console.log();
    showHelp();
    return;
  }

  try {
    await cmdInfo.handler(commandArgs);
  } catch (error) {
    console.error(colors.red('Command failed:'), error);
    process.exit(1);
  }
}

// Run CLI
main().catch(console.error);