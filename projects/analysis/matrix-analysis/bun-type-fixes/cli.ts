#!/usr/bin/env bun
/**
 * Bun Type Fixes CLI
 *
 * Flag-based command line interface for verifying TypeScript type fixes
 * Usage: bun run cli.ts [flags] [command]
 */

import { program } from 'commander';
import { verifyBunBuildTypes, verifySqliteTypes, verifyFileSinkTypes, verifyIntegration } from './src/verify.js';

// Configure CLI program
program
  .name('bun-type-fixes')
  .description('CLI for verifying Bun v1.3.6 TypeScript type fixes')
  .version('1.0.0');

// Verify command
program
  .command('verify')
  .description('Run type fix verifications')
  .option('-a, --autoload', 'Verify Bun.build() autoload options')
  .option('-s, --sqlite', 'Verify bun:sqlite .run() return type')
  .option('-f, --filesink', 'Verify FileSink.write() return type')
  .option('-i, --integration', 'Run integration tests')
  .option('-v, --verbose', 'Verbose output')
  .option('--all', 'Run all verifications (default)')
  .action(async (options) => {
    console.log('🔍 Bun Type Fixes Verification\n');

    const runAll = options.all || (!options.autoload && !options.sqlite && !options.filesink && !options.integration);

    const results = {
      autoload: false,
      sqlite: false,
      filesink: false,
      integration: false
    };

    if (runAll || options.autoload) {
      console.log('1. Verifying Bun.build() autoload options...');
      results.autoload = await verifyBunBuildTypes(options.verbose);
    }

    if (runAll || options.sqlite) {
      console.log('\n2. Verifying bun:sqlite .run() return type...');
      results.sqlite = await verifySqliteTypes(options.verbose);
    }

    if (runAll || options.filesink) {
      console.log('\n3. Verifying FileSink.write() return type...');
      results.filesink = await verifyFileSinkTypes(options.verbose);
    }

    if (runAll || options.integration) {
      console.log('\n4. Running integration tests...');
      results.integration = await verifyIntegration(options.verbose);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('RESULTS:');
    console.log('='.repeat(50));

    const testsRun = [];
    if (results.autoload || runAll) {
      testsRun.push(`Bun.build() autoload: ${results.autoload ? '✅ PASS' : '❌ FAIL'}`);
    }
    if (results.sqlite || runAll) {
      testsRun.push(`SQLite .run() types: ${results.sqlite ? '✅ PASS' : '❌ FAIL'}`);
    }
    if (results.filesink || runAll) {
      testsRun.push(`FileSink.write() types: ${results.filesink ? '✅ PASS' : '❌ FAIL'}`);
    }
    if (results.integration || runAll) {
      testsRun.push(`Integration test: ${results.integration ? '✅ PASS' : '❌ FAIL'}`);
    }

    // Only count tests that were actually run
    const runResults = {
      autoload: runAll || options.autoload ? results.autoload : true,
      sqlite: runAll || options.sqlite ? results.sqlite : true,
      filesink: runAll || options.filesink ? results.filesink : true,
      integration: runAll || options.integration ? results.integration : true
    };

    testsRun.forEach(test => console.log(test));

    const overall = Object.values(runResults).every(r => r);
    console.log('='.repeat(50));
    console.log(`Overall: ${overall ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

    process.exit(overall ? 0 : 1);
  });

// Test command
program
  .command('test')
  .description('Run unit tests')
  .option('-w, --watch', 'Watch mode')
  .action(async (options) => {
    const testCommand = options.watch ? 'bun test --watch' : 'bun test';
    console.log(`Running: ${testCommand}`);
    await Bun.$`${testCommand}`;
  });

// Build command
program
  .command('build')
  .description('Build the project')
  .option('-m, --minify', 'Minify output')
  .option('-o, --outdir <path>', 'Output directory', './dist')
  .action(async (options) => {
    const buildCommand = `bun build src/index.ts --outdir=${options.outdir}${options.minify ? ' --minify' : ''}`;
    console.log(`Building: ${buildCommand}`);
    await Bun.$`${buildCommand}`;
  });

// Clean command
program
  .command('clean')
  .description('Clean build artifacts')
  .action(async () => {
    console.log('Cleaning build artifacts...');
    await Bun.$`rm -rf dist`.catch(() => {});
    await Bun.$`rm -rf *.log`.catch(() => {});
    await Bun.$`rm -rf test-*.txt`.catch(() => {});
    console.log('✅ Clean completed');
  });

// Parse command line arguments
program.parse();
