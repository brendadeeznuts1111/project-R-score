#!/usr/bin/env bun
/**
 * 🏭 FactoryWager Profiling CLI
 * 
 * Unified command-line interface for all FactoryWager profiling tools
 * 
 * @version 4.0
 */

import { styled, log } from '../lib/theme/colors.ts';

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
import { spawn } from 'child_process';
import { join } from 'path';

const COMMANDS = {
  'cpu': {
    description: 'Run CPU profiling with color-coded output',
    script: 'factorywager-cpu-profile.ts',
  },
  'heap': {
    description: 'Run heap profiling with R2 metadata',
    script: 'factorywager-heap-profile.ts',
  },
  'diagnose': {
    description: 'Run complete system diagnostics',
    script: 'factorywager-diagnose.ts',
  },
  'realtime': {
    description: 'Start real-time profiling with animations',
    script: 'factorywager-realtime.ts',
  },
  'dual': {
    description: 'Run dual CPU + heap profiling',
    script: 'factorywager-profile.sh',
  },
} as const;

type Command = keyof typeof COMMANDS;

function showHelp() {
  console.log(styled('\n🏭 FactoryWager Profiling CLI v4.0', 'accent'));
  console.log(styled('━'.repeat(50), 'muted'));
  console.log(styled('\nAvailable commands:', 'primary'));
  
  Object.entries(COMMANDS).forEach(([cmd, info]) => {
    console.log(styled(`  ${cmd.padEnd(10)}`, 'muted') + styled(info.description, 'success'));
  });
  
  console.log(styled('\nUsage:', 'primary'));
  console.log(styled('  bun factorywager-cli.ts <command>', 'muted'));
  console.log(styled('\nExamples:', 'primary'));
  console.log(styled('  bun factorywager-cli.ts cpu', 'muted'));
  console.log(styled('  bun factorywager-cli.ts heap', 'muted'));
  console.log(styled('  bun factorywager-cli.ts diagnose', 'muted'));
  
  console.log('\n' + styled('🚀 Happy profiling!', 'success'));
}

async function runCommand(command: Command) {
  const config = COMMANDS[command];
  
  if (!config) {
    console.log(styled('❌ Unknown command', 'error'));
    showHelp();
    process.exit(1);
  }
  
  log.section(`FactoryWager ${command.toUpperCase()} Profiling`, 'accent');
  log.info(`Running ${config.description}...`);
  
  const scriptPath = join(import.meta.dir, config.script);
  
  try {
    if (config.script.endsWith('.sh')) {
      // Run shell script
      const proc = spawn('bash', [scriptPath], {
        stdio: 'inherit',
        cwd: import.meta.dir,
      });
      
      proc.on('exit', (code) => {
        if (code === 0) {
          console.log(styled('\n✅ Command completed successfully', 'success'));
        } else {
          console.log(styled('\n❌ Command failed', 'error'));
          process.exit(code || 1);
        }
      });
    } else {
      // Run TypeScript file
      const proc = spawn('bun', [scriptPath], {
        stdio: 'inherit',
        cwd: import.meta.dir,
      });
      
      proc.on('exit', (code) => {
        if (code === 0) {
          console.log(styled('\n✅ Command completed successfully', 'success'));
        } else {
          console.log(styled('\n❌ Command failed', 'error'));
          process.exit(code || 1);
        }
      });
    }
  } catch (error) {
    console.log(styled('❌ Error running command', 'error'));
    console.log(styled(String(error), 'muted'));
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
