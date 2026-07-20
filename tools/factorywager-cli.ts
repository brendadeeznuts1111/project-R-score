#!/usr/bin/env bun
// tools/factorywager-cli.ts — Unified CLI for FactoryWager profiling tools

import { styled, log } from '../lib/theme/colors';

/**
 * 🚀 Prefetch Optimizations
 *
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 *
 * Generated automatically by optimize-examples-prefetch.ts
 */
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
import { join } from 'path';

const COMMANDS = {
  cpu: {
    description: 'Run CPU profiling with color-coded output',
    script: 'factorywager-cpu-profile.ts',
  },
  heap: {
    description: 'Run heap profiling with R2 metadata',
    script: 'factorywager-heap-profile.ts',
  },
  diagnose: {
    description: 'Run complete system diagnostics',
    script: 'factorywager-diagnose.ts',
  },
  realtime: {
    description: 'Start real-time profiling with animations',
    script: 'factorywager-realtime.ts',
  },
  dual: {
    description: 'Run dual CPU + heap profiling',
    script: 'factorywager-profile.sh',
  },
} as const;

type Command = keyof typeof COMMANDS;

function showHelp() {
  console.info(styled('\n🏭 FactoryWager Profiling CLI v4.0', 'accent'));
  console.info(styled('━'.repeat(50), 'muted'));
  console.info(styled('\nAvailable commands:', 'primary'));

  Object.entries(COMMANDS).forEach(([cmd, info]) => {
    console.info(styled(`  ${cmd.padEnd(10)}`, 'muted') + styled(info.description, 'success'));
  });

  console.info(styled('\nUsage:', 'primary'));
  console.info(styled('  bun factorywager-cli.ts <command>', 'muted'));
  console.info(styled('\nExamples:', 'primary'));
  console.info(styled('  bun factorywager-cli.ts cpu', 'muted'));
  console.info(styled('  bun factorywager-cli.ts heap', 'muted'));
  console.info(styled('  bun factorywager-cli.ts diagnose', 'muted'));

  console.info('\n' + styled('🚀 Happy profiling!', 'success'));
}

async function runCommand(command: Command) {
  const config = COMMANDS[command];

  if (!config) {
    console.info(styled('❌ Unknown command', 'error'));
    showHelp();
    process.exit(1);
  }

  log.section(`FactoryWager ${command.toUpperCase()} Profiling`, 'accent');
  log.info(`Running ${config.description}...`);

  const scriptPath = join(import.meta.dir, config.script);

  try {
    const cmd = config.script.endsWith('.sh')
      ? ['bash', scriptPath]
      : ['bun', scriptPath];
    const proc = Bun.spawn({
      cmd,
      stdout: 'inherit',
      stderr: 'inherit',
      cwd: import.meta.dir,
    });

    const code = await proc.exited;
    if (code === 0) {
      console.info(styled('\n✅ Command completed successfully', 'success'));
    } else {
      console.info(styled('\n❌ Command failed', 'error'));
      process.exit(code || 1);
    }
  } catch (error) {
    console.info(styled('❌ Error running command', 'error'));
    console.info(styled(String(error), 'muted'));
    process.exit(1);
  }
}

// Main CLI logic
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] as Command;

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    return;
  }

  await runCommand(command);
}

// Run if called directly
if (import.meta.main) {
  await main();
}
