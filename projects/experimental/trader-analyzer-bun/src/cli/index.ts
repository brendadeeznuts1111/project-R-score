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
        console.info(colors.red('Error: Pattern ID required'));
        console.info(colors.gray('Usage: patterns:stats <pattern-id>'));
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
      console.info(colors.yellow('Quick benchmark not yet implemented'));
      console.info(colors.gray('Use "bench" for full suite'));
    },
  },

  // System commands
  'status': {
    description: 'Show system status',
    handler: async () => {
      console.info(colors.cyan('NEXUS System Status'));
      console.info(colors.gray('─'.repeat(40)));

      // Runtime info
      const { runtime } = await import('../utils');
      console.info(`Runtime: ${colors.cyan('Bun ' + runtime.version)}`);
      console.info(`Platform: ${colors.cyan(runtime.platform)}`);
      console.info(`Memory: ${colors.cyan(runtime.memoryFormatted().heapUsed)}`);

      // Pattern registry status
      const { globalPatternRegistry } = await import('../patterns');
      const stats = globalPatternRegistry.getStats();
      console.info(`Patterns: ${colors.cyan(stats.totalPatterns + ' registered, ' + stats.enabledPatterns + ' enabled')}`);

      console.info(colors.green('\n✅ System operational'));
    },
  },

  'help': {
    description: 'Show this help message',
    handler: () => showHelp(),
  },
};

function showHelp() {
  console.info(colors.cyan('NEXUS CLI - Trading Intelligence Platform'));
  console.info(colors.gray('Usage: bun run cli <command> [args...]'));
  console.info();

  console.info(colors.yellow('Available Commands:'));
  console.info();

  // Group commands by category
  const categories = {
    'Pattern Registry': Object.keys(commands).filter(cmd => cmd.startsWith('patterns:')),
    'Benchmarking': Object.keys(commands).filter(cmd => cmd.startsWith('bench')),
    'System': Object.keys(commands).filter(cmd => !cmd.includes(':')),
  };

  for (const [category, cmds] of Object.entries(categories)) {
    console.info(colors.cyan(category + ':'));
    for (const cmd of cmds) {
      const info = commands[cmd as keyof typeof commands];
      console.info(`  ${colors.green(cmd.padEnd(20))} ${info.description}`);
      if (info.usage) {
        console.info(`  ${' '.repeat(22)}${colors.gray(info.usage)}`);
      }
    }
    console.info();
  }

  console.info(colors.gray('Examples:'));
  console.info(colors.gray('  bun run cli patterns:status'));
  console.info(colors.gray('  bun run cli patterns:stats cross-market-spread'));
  console.info(colors.gray('  bun run cli bench'));
  console.info(colors.gray('  bun run cli status'));
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
    console.info(colors.red(`Unknown command: ${command}`));
    console.info();
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