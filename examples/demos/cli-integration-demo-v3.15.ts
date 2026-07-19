#!/usr/bin/env bun

/**
 * Official CLI Integration Demo v3.15
 * 
 * Demonstrates the complete Bun CLI native integration
 * with official resolution order and all flags
 */

import { executeBunCLI, parseOfficialFlags, getAllSessions, clearSessions } from '../../lib/bun-cli-native-v3.15';
import { startWatchFilterCLI, listWatchSessions, getWatchSessionStats } from '../../lib/enhanced-watch-filter-v3.15';

// Color utilities
const c = {
  red: (s: string) => `\x1b[38;2;255;100;100m${s}\x1b[0m`,
  green: (s: string) => `\x1b[38;2;100;255;100m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[38;2;100;200;255m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[38;2;255;255;100m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[38;2;100;150;255m${s}\x1b[0m`,
  magenta: (s: string) => `\x1b[38;2;255;100;255m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[38;2;150;150;150m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

/**
 * Demo 1: Official CLI Resolution Order
 */
async function demoResolutionOrder(): Promise<void> {
  console.info(c.bold('\n🎯 Demo 1: Official CLI Resolution Order'));
  console.info(c.gray('=====================================\n'));
  
  const testCommands = [
    // Resolution Order 1: package.json scripts
    ['--filter', '*', 'dev'],
    ['--filter', 'api-*', 'build'],
    
    // Resolution Order 2: Source files  
    ['--watch', 'src/server.ts'],
    ['--hot', '--smol', 'src/app.tsx'],
    
    // Resolution Order 3: Binaries
    ['--bun', 'vite'],
    ['--bun', 'eslint', '--fix'],
    
    // Resolution Order 4: System commands
    ['--shell', 'system', 'ls', '-la'],
    ['--shell', 'bun', 'echo', '$BUN_VERSION']
  ];
  
  for (const cmd of testCommands) {
    console.info(c.cyan(`📋 Testing: ${cmd.join(' ')}`));
    
    try {
      const session = await executeBunCLI(cmd, { captureOutput: true });
      console.info(c.green(`  ✓ ${session.command} - ${session.durationMs?.toFixed(2)}ms`));
    } catch (error) {
      console.info(c.red(`  ✗ Error: ${error}`));
    }
    
    console.info('');
  }
}

/**
 * Demo 2: Complete Flag Coverage
 */
async function demoFlagCoverage(): Promise<void> {
  console.info(c.bold('\n🚀 Demo 2: Complete Flag Coverage'));
  console.info(c.gray('===============================\n'));
  
  const flagTests = [
    // Execution flags
    { name: 'Silent execution', flags: ['--silent', '--if-present', 'echo', 'test'] },
    { name: 'Eval mode', flags: ['-e', 'console.info("Hello from eval")'] },
    { name: 'Print mode', flags: ['-p', '"2 + 2"'] },
    
    // Workspace flags
    { name: 'Filter with output limit', flags: ['--filter', '*', '--filter-output-lines', '3', 'echo', 'test'] },
    { name: 'Workspace parallel', flags: ['--ws', '--parallel', 'echo', 'test'] },
    { name: 'Sequential execution', flags: ['--sequential', '--continue-on-error', 'echo', 'test'] },
    
    // Runtime flags
    { name: 'Force Bun runtime', flags: ['--bun', 'echo', 'test'] },
    { name: 'Memory optimized', flags: ['--smol', 'echo', 'test'] },
    { name: 'Shell selection', flags: ['--shell', 'system', 'echo', 'test'] },
    
    // Development flags
    { name: 'Watch mode', flags: ['--watch', '--no-clear', 'echo', 'test'] },
    { name: 'Hot reload', flags: ['--hot', 'echo', 'test'] },
    
    // Module flags
    { name: 'Preload module', flags: ['-r', './setup.js', 'echo', 'test'] },
    { name: 'Install mode', flags: ['--install', 'auto', 'echo', 'test'] },
    
    // Transpilation flags
    { name: 'Custom tsconfig', flags: ['--tsconfig', './tsconfig.json', 'echo', 'test'] },
    { name: 'Environment define', flags: ['--define', 'process.env.NODE_ENV:"development"', 'echo', 'test'] },
    { name: 'Drop console', flags: ['--drop', 'console', 'echo', 'test'] },
    
    // Network flags
    { name: 'Custom port', flags: ['--port', '3001', 'echo', 'test'] },
    { name: 'DNS preference', flags: ['--dns', 'ipv4first', 'echo', 'test'] },
    
    // Config flags
    { name: 'Custom config', flags: ['--config', './bunfig.toml', 'echo', 'test'] },
    { name: 'Working directory', flags: ['--cwd', './src', 'echo', 'test'] }
  ];
  
  for (const test of flagTests) {
    console.info(c.cyan(`🔧 ${test.name}:`));
    console.info(c.gray(`   Flags: ${test.flags.join(' ')}`));
    
    try {
      const session = await executeBunCLI(test.flags, { captureOutput: true });
      console.info(c.green(`   ✓ Success - ${session.durationMs?.toFixed(2)}ms`));
    } catch (error) {
      console.info(c.yellow(`   ⚠ Expected: ${error}`));
    }
    
    console.info('');
  }
}

/**
 * Demo 3: Enhanced Watch Filter Integration
 */
async function demoWatchFilterIntegration(): Promise<void> {
  console.info(c.bold('\n👁️ Demo 3: Enhanced Watch Filter Integration'));
  console.info(c.gray('==========================================\n'));
  
  const watchTests = [
    {
      name: 'Basic watch filter',
      args: ['--filter', '*', '--filter-output-lines', '5', 'echo', "Watching all packages"]
    },
    {
      name: 'Hot reload with memory optimization',
      args: ['--filter', 'ui-*', '--hot', '--smol', '--no-clear', 'echo', "Hot reloading UI"]
    },
    {
      name: 'Parallel execution with continue on error',
      args: ['--filter', 'test-*', '--parallel', '--continue-on-error', 'echo', "Running tests"]
    },
    {
      name: 'Sequential with custom output',
      args: ['--filter', 'build-*', '--sequential', '--filter-output-lines', '3', 'echo', "Building sequentially"]
    }
  ];
  
  for (const test of watchTests) {
    console.info(c.cyan(`🔄 ${test.name}:`));
    console.info(c.gray(`   Args: ${test.args.join(' ')}`));
    
    try {
      const session = await startWatchFilterCLI(test.args);
      console.info(c.green(`   ✓ Session started: ${session.id}`));
      
      // Show session stats
      const stats = getWatchSessionStats(session.id);
      if (stats) {
        console.info(c.blue(`   📊 Uptime: ${(stats.uptime / 1000).toFixed(1)}s`));
        console.info(c.blue(`   📋 Events: ${Object.keys(stats.eventSummary).join(', ')}`));
      }
      
      // Clean up
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Note: In real usage, you wouldn't immediately stop the session
      
    } catch (error) {
      console.info(c.red(`   ✗ Error: ${error}`));
    }
    
    console.info('');
  }
}

/**
 * Demo 4: Advanced CLI Patterns
 */
async function demoAdvancedPatterns(): Promise<void> {
  console.info(c.bold('\n⚡ Demo 4: Advanced CLI Patterns'));
  console.info(c.gray('===============================\n'));
  
  const advancedTests = [
    {
      name: 'Development server with all optimizations',
      pattern: 'bun --watch --hot --preload ./setup.ts --define process.env.NODE_ENV:"development" --port 3000 run dev',
      description: 'Complete development setup with hot reload and optimizations'
    },
    {
      name: 'Production build with filtering',
      pattern: 'bun --filter "api-*" --sequential --drop console --tsconfig ./tsconfig.prod.json run build',
      description: 'Production build for API packages with optimizations'
    },
    {
      name: 'Testing with parallel execution',
      pattern: 'bun --ws --parallel --continue-on-error --filter-output-lines 10 run test',
      description: 'Run tests across all workspaces in parallel'
    },
    {
      name: 'Memory-optimized development',
      pattern: 'bun --smol --watch --no-clear --expose-gc run dev',
      description: 'Memory-conscious development with GC exposure'
    }
  ];
  
  for (const test of advancedTests) {
    console.info(c.magenta(`🎨 ${test.name}:`));
    console.info(c.gray(`   Pattern: ${test.pattern}`));
    console.info(c.blue(`   ${test.description}\n`));
    
    // Parse and show the flags
    const args = test.pattern.split(' ').slice(1); // Remove 'bun'
    const { flags, command, args: cmdArgs } = parseOfficialFlags(args);
    
    console.info(c.cyan(`   📋 Parsed Command: ${command}`));
    console.info(c.cyan(`   📋 Parsed Args: ${cmdArgs.join(', ')}`));
    
    if (Object.keys(flags).length > 0) {
      console.info(c.cyan(`   📋 Active Flags:`));
      Object.entries(flags).forEach(([key, value]) => {
        if (typeof value === 'boolean' && value) {
          console.info(c.gray(`     --${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`));
        } else if (value !== undefined && value !== '') {
          console.info(c.gray(`     --${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`));
        }
      });
    }
    
    console.info('');
  }
}

/**
 * Demo 5: Performance Benchmarks
 */
async function demoPerformanceBenchmarks(): Promise<void> {
  console.info(c.bold('\n📊 Demo 5: Performance Benchmarks'));
  console.info(c.gray('================================\n'));
  
  const benchmarkTests = [
    { name: 'Simple command', flags: ['echo', 'test'] },
    { name: 'With filter', flags: ['--filter', '*', 'echo', 'test'] },
    { name: 'With multiple flags', flags: ['--watch', '--hot', '--smol', '--silent', 'echo', 'test'] },
    { name: 'Complex command', flags: ['--filter', '*', '--parallel', '--filter-output-lines', '5', '--define', 'NODE_ENV:"dev"', 'echo', 'test'] }
  ];
  
  console.info(c.cyan('Running performance benchmarks...\n'));
  
  for (const test of benchmarkTests) {
    const times: number[] = [];
    
    // Run multiple iterations
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      try {
        await executeBunCLI(test.flags, { captureOutput: true });
        times.push(performance.now() - start);
      } catch {
        // Ignore errors for benchmarking
      }
    }
    
    if (times.length > 0) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      
      console.info(c.yellow(`${test.name}:`));
      console.info(c.gray(`   Average: ${avg.toFixed(2)}ms`));
      console.info(c.gray(`   Min: ${min.toFixed(2)}ms`));
      console.info(c.gray(`   Max: ${max.toFixed(2)}ms\n`));
    }
  }
}

/**
 * Main demo runner
 */
async function main(): Promise<void> {
  console.info(c.bold('🎯 Official CLI Integration Demo v3.15'));
  console.info(c.gray('=======================================\n'));
  console.info(c.blue('Demonstrating 100% Bun-native CLI integration'));
  console.info(c.blue('with official resolution order and complete flag coverage\n'));
  
  const demo = process.argv[2] || 'all';
  
  switch (demo) {
    case 'resolution':
      await demoResolutionOrder();
      break;
      
    case 'flags':
      await demoFlagCoverage();
      break;
      
    case 'watch':
      await demoWatchFilterIntegration();
      break;
      
    case 'patterns':
      await demoAdvancedPatterns();
      break;
      
    case 'benchmark':
      await demoPerformanceBenchmarks();
      break;
      
    case 'all':
    default:
      await demoResolutionOrder();
      await demoFlagCoverage();
      await demoWatchFilterIntegration();
      await demoAdvancedPatterns();
      await demoPerformanceBenchmarks();
      break;
  }
  
  // Show session summary
  const sessions = getAllSessions();
  const watchSessions = listWatchSessions();
  
  console.info(c.bold('\n📈 Session Summary'));
  console.info(c.gray('==================\n'));
  console.info(c.cyan(`CLI Sessions: ${sessions.length}`));
  console.info(c.cyan(`Watch Sessions: ${watchSessions.length}`));
  
  if (sessions.length > 0) {
    console.info(c.gray('\nCLI Sessions:'));
    sessions.forEach(session => {
      console.info(c.gray(`  ${session.id}: ${session.command} (${session.status}) - ${(session.durationMs || 0).toFixed(2)}ms`));
    });
  }
  
  // Cleanup
  clearSessions();
  
  console.info(c.green('\n✅ Demo completed successfully!'));
  console.info(c.blue('📚 Documentation: https://bun.com/docs/runtime'));
}

// Run demo if this file is executed directly
if (process.argv[1] && process.argv[1].endsWith('cli-integration-demo-v3.15.ts')) {
  main().catch(console.error);
}
