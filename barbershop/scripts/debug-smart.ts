#!/usr/bin/env bun
// Simplified progressive debug for immediate use

import { spawn } from 'node:child_process';

const phases = [
  { depth: 1, name: 'Quick Scan', timeout: 2000 },
  { depth: 3, name: 'Standard Debug', timeout: 5000 },
  { depth: 5, name: 'Deep Analysis', timeout: 10000 }
];

interface PhaseResult {
  depth: number;
  name: string;
  exitCode: number | null;
  output: string;
  error: string;
  truncated: boolean;
  duration: number;
}

const runWithDepth = async (depth: number, name: string, timeout: number): Promise<PhaseResult> => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      console.error('❌ Usage: bun run debug-smart <command> [args...]');
      resolve({
        depth,
        name,
        exitCode: 1,
        output: '',
        error: 'No command provided',
        truncated: false,
        duration: 0
      });
      return;
    }

    const child = spawn('bun', ['run', ...args], {
      env: { ...process.env, BUN_CONSOLE_DEPTH: depth.toString() },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    let output = '';
    let errorOutput = '';

    child.stdout?.on('data', (data) => {
      output += data.toString();
    });

    child.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });

    const timeoutId = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({
        depth,
        name,
        exitCode: null,
        output,
        error: `Timeout after ${timeout}ms`,
        truncated: true,
        duration: Date.now() - startTime
      });
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      
      // Check for truncation indicators
      const truncated = output.includes('[Object]') || 
                       output.includes('[Circular]') || 
                       output.includes('...') ||
                       output.includes('[Array]');

      resolve({
        depth,
        name,
        exitCode: code,
        output,
        error: errorOutput,
        truncated,
        duration
      });
    });

    child.on('error', (error) => {
      clearTimeout(timeoutId);
      resolve({
        depth,
        name,
        exitCode: 1,
        output,
        error: error.message,
        truncated: false,
        duration: Date.now() - startTime
      });
    });
  });
};

const shouldContinue = (result: PhaseResult): boolean => {
  // Continue if:
  // 1. Process failed
  // 2. Output appears truncated
  // 3. No exit code (timeout)
  return result.exitCode !== 0 || result.truncated || result.exitCode === null;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const main = async () => {
  console.log('🐛 Smart Progressive Debug');
  console.log('='.repeat(40));

  const results: PhaseResult[] = [];

  for (const phase of phases) {
    console.log(`\n🔍 Phase: ${phase.name} (depth=${phase.depth})`);
    
    const result = await runWithDepth(phase.depth, phase.name, phase.timeout);
    results.push(result);

    console.log(`   Duration: ${result.duration}ms`);
    console.log(`   Output Size: ${formatBytes(result.output.length)}`);
    console.log(`   Exit Code: ${result.exitCode ?? 'timeout'}`);
    
    if (result.truncated) {
      console.log(`   ⚠️  Output appears truncated`);
    }
    
    if (result.error && !result.output) {
      console.log(`   Error: ${result.error}`);
    }

    if (result.exitCode === 0 && !result.truncated) {
      console.log(`   ✅ ${phase.name} completed successfully`);
      console.log(`\n🎯 Optimal depth found: ${phase.depth}`);
      break;
    } else if (shouldContinue(result)) {
      console.log(`   ⚠️  Issues detected, continuing to next phase...`);
      continue;
    } else {
      console.log(`   ✅ ${phase.name} completed with acceptable results`);
      break;
    }
  }

  // Summary
  console.log('\n📊 Debug Session Summary:');
  console.log('='.repeat(40));
  
  results.forEach((result, index) => {
    const status = result.exitCode === 0 && !result.truncated ? '✅' : 
                  result.exitCode === null ? '⏰' : '❌';
    console.log(`${status} ${result.name.padEnd(15)} depth=${result.depth} (${result.duration}ms)`);
  });

  const finalResult = results[results.length - 1];
  if (finalResult.exitCode === 0) {
    console.log(`\n🎉 Debugging completed successfully!`);
    console.log(`   Final depth: ${finalResult.depth}`);
    console.log(`   Total duration: ${results.reduce((sum, r) => sum + r.duration, 0)}ms`);
  } else {
    console.log(`\n❌ All phases failed. Last error: ${finalResult.error}`);
  }
};

main().catch(console.error);
