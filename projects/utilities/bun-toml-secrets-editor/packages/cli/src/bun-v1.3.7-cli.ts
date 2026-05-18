#!/usr/bin/env bun
/**
 * Bun v1.3.7 Performance CLI
 * 
 * CLI tool to run, test, and benchmark Bun v1.3.7 features
 * Usage: bun run cli:v1.3.7 [command] [options]
 */

import { Command } from 'commander';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const program = new Command();

// Package info
const packageJson = JSON.parse(readFileSync(join(import.meta.dir, '../package.json'), 'utf8'));
const version = packageJson.version || '1.0.0';

// ============================================================================
// Utility Functions
// ============================================================================

function runCommand(command: string, description: string): void {
    console.info(`\n🚀 ${description}`);
    console.info('='.repeat(60));
    console.info(`$ ${command}`);
    console.info('');
    
    try {
        execSync(command, { 
            stdio: 'inherit', 
            cwd: join(import.meta.dir, '../../../') 
        });
        console.info(`\n✅ ${description} completed successfully!`);
    } catch (error) {
        console.error(`\n❌ ${description} failed:`, error);
        process.exit(1);
    }
}

function checkBunVersion(): void {
    const bunVersion = typeof Bun !== 'undefined' ? Bun.version : 'unknown';
    const requiredVersion = '1.3.7';
    
    console.info(`🔍 Checking Bun version...`);
    console.info(`Current: ${bunVersion}`);
    console.info(`Required: ${requiredVersion}+`);
    
    // Simple version check (would need semver for proper comparison)
    if (bunVersion !== 'unknown' && bunVersion < requiredVersion) {
        console.warn(`⚠️  Warning: Bun v${bunVersion} may not have all v1.3.7 features`);
        console.info('   Consider upgrading: bun upgrade');
    } else {
        console.info(`✅ Bun version supports v1.3.7 features`);
    }
}

// ============================================================================
// CLI Commands
// ============================================================================

program
    .name('bun-v1.3.7-cli')
    .description('CLI tool for Bun v1.3.7 performance testing and benchmarking')
    .version(version);

// Quick demo command
program
    .command('demo')
    .description('Run quick performance demos')
    .option('-a, --all', 'Run all demos')
    .option('-b, --buffer', 'Buffer/array performance demos')
    .option('-s, --string', 'String performance demos')
    .option('-j, --json', 'JSON5/JSONL demos')
    .option('-p, --profiling', 'Profiling demos')
    .action((options) => {
        checkBunVersion();
        
        if (options.all || (!options.buffer && !options.string && !options.json && !options.profiling)) {
            runCommand('bun examples/bun-v1.3.7-oneliners.ts', 'Running all performance demos');
        } else {
            let demoScript = 'bun examples/bun-v1.3.7-oneliners.ts';
            
            if (options.buffer) {
                console.info('\n🔥 Running Buffer/Array demos...');
                // Could create specific demo files for each category
            }
            if (options.string) {
                console.info('\n⚡ Running String demos...');
            }
            if (options.json) {
                console.info('\n📄 Running JSON demos...');
            }
            if (options.profiling) {
                console.info('\n📊 Running Profiling demos...');
            }
        }
    });

// Interactive demo command
program
    .command('interactive')
    .description('Run interactive performance demo menu')
    .action(() => {
        checkBunVersion();
        runCommand('bun examples/bun-v1.3.7-interactive-demo.ts', 'Starting interactive demo');
    });

// Benchmark command
program
    .command('bench')
    .description('Run comprehensive performance benchmarks')
    .option('-f, --feature <feature>', 'Benchmark specific feature (buffer|array|string|async|ansi|swap|json5|jsonl)')
    .option('-o, --output <file>', 'Save benchmark results to file')
    .option('--profile', 'Enable CPU profiling during benchmarks')
    .action((options) => {
        checkBunVersion();
        
        let command = 'bun examples/benchmarks/bun-v1.3.7-performance-bench.ts';
        
        if (options.profile) {
            command = `bun --cpu-prof-md --cpu-prof-dir ./profiles ${command}`;
        }
        
        if (options.output) {
            command += ` > ${options.output}`;
        }
        
        runCommand(command, 'Running performance benchmarks');
    });

// Test command
program
    .command('test')
    .description('Run tests for Bun v1.3.7 features')
    .option('--unit', 'Run unit tests only')
    .option('--integration', 'Run integration tests only')
    .option('--coverage', 'Generate coverage report')
    .action((options) => {
        checkBunVersion();
        
        let testCommand = 'bun test';
        
        if (options.unit) {
            testCommand = 'bun test tests/unit/';
        } else if (options.integration) {
            testCommand = 'bun test tests/integration/';
        }
        
        if (options.coverage) {
            testCommand += ' --coverage';
        }
        
        runCommand(testCommand, 'Running tests');
    });

// One-liners command
program
    .command('oneliners')
    .description('Show copy-paste performance one-liners')
    .option('--copy', 'Copy to clipboard (requires pbcopy/clip)')
    .action((options) => {
        console.info('\n🎯 Bun v1.3.7 Performance One-Liners');
        console.info('='.repeat(60));
        
        runCommand('./examples/bun-v1.3.7-quick-oneliners.sh', 'Displaying one-liners');
        
        if (options.copy) {
            try {
                if (process.platform === 'darwin') {
                    execSync('./examples/bun-v1.3.7-quick-oneliners.sh | pbcopy', { cwd: join(import.meta.dir, '../../../') });
                    console.info('\n📋 One-liners copied to clipboard!');
                } else if (process.platform === 'win32') {
                    execSync('./examples/bun-v1.3.7-quick-oneliners.sh | clip', { cwd: join(import.meta.dir, '../../../') });
                    console.info('\n📋 One-liners copied to clipboard!');
                } else {
                    console.info('\n⚠️  Clipboard copy not supported on this platform');
                }
            } catch (error) {
                console.error('\n❌ Failed to copy to clipboard:', error);
            }
        }
    });

// Profile command
program
    .command('profile')
    .description('Profile specific scripts with Markdown output')
    .argument('<script>', 'Script to profile')
    .option('--cpu', 'Enable CPU profiling')
    .option('--heap', 'Enable heap profiling')
    .option('--interval <ms>', 'CPU profiling interval (default: 1000)', '1000')
    .option('--dir <directory>', 'Output directory for profiles', './profiles')
    .action((script, options) => {
        checkBunVersion();
        
        let profileCommand = `bun`;
        
        if (options.cpu) {
            profileCommand += ` --cpu-prof-md --cpu-prof-interval ${options.interval}`;
        }
        
        if (options.heap) {
            profileCommand += ` --heap-prof-md`;
        }
        
        if (options.dir) {
            if (options.cpu) profileCommand += ` --cpu-prof-dir ${options.dir}`;
            if (options.heap) profileCommand += ` --heap-prof-dir ${options.dir}`;
        }
        
        profileCommand += ` ${script}`;
        
        runCommand(profileCommand, `Profiling ${script}`);
    });

// Check command
program
    .command('check')
    .description('Check system and Bun compatibility')
    .option('--verbose', 'Detailed system information')
    .action((options) => {
        console.info('\n🔍 System Compatibility Check');
        console.info('='.repeat(60));
        
        checkBunVersion();
        
        console.info(`\n📊 System Information:`);
        console.info(`Platform: ${process.platform} ${process.arch}`);
        console.info(`Node.js: ${process.version}`);
        console.info(`Bun: ${typeof Bun !== 'undefined' ? Bun.version : 'unknown'}`);
        
        if (options.verbose) {
            console.info(`\n🔧 Detailed Info:`);
            console.info(`CPU: ${process.arch}`);
            console.info(`Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB used`);
            console.info(`PID: ${process.pid}`);
            console.info(`CWD: ${process.cwd()}`);
        }
        
        // Check for required files
        const requiredFiles = [
            'examples/bun-v1.3.7-oneliners.ts',
            'examples/benchmarks/bun-v1.3.7-performance-bench.ts',
            'examples/bun-v1.3.7-interactive-demo.ts',
            'examples/bun-v1.3.7-quick-oneliners.sh'
        ];
        
        console.info(`\n📁 Required Files:`);
        for (const file of requiredFiles) {
            const exists = existsSync(join(import.meta.dir, '../../../', file));
            console.info(`${exists ? '✅' : '❌'} ${file}`);
        }
        
        console.info(`\n🚀 Ready to run Bun v1.3.7 performance tests!`);
    });

// Prepare command (for packaging)
program
    .command('prepare')
    .description('Prepare for global packaging (bun pack / bunx --global)')
    .option('--dry-run', 'Show what would be done without executing')
    .action((options) => {
        console.info('\n📦 Preparing for Global Packaging');
        console.info('='.repeat(60));
        
        checkBunVersion();
        
        const steps = [
            { cmd: 'bun run build', desc: 'Build the project' },
            { cmd: 'bun run typecheck', desc: 'Type checking' },
            { cmd: 'bun test', desc: 'Run tests' },
            { cmd: 'bun examples/benchmarks/bun-v1.3.7-performance-bench.ts', desc: 'Run benchmarks' },
            { cmd: 'bun run check', desc: 'Final compatibility check' }
        ];
        
        if (options.dryRun) {
            console.info('\n🔍 Dry run - would execute:');
            steps.forEach(step => console.info(`  $ ${step.cmd} (${step.desc})`));
        } else {
            for (const step of steps) {
                runCommand(step.cmd, step.desc);
            }
        }
        
        console.info('\n📦 Ready for packaging!');
        console.info('Next steps:');
        console.info('  bun pack                     # Create npm package');
        console.info('  bunx --global ./bun-v1.3.7-*.tgz  # Install globally');
    });

// ============================================================================
// Parse and Execute
// ============================================================================

program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
    program.outputHelp();
    console.info('\n🚀 Quick Start:');
    console.info('  bun run cli:v1.3.7 demo          # Run demos');
    console.info('  bun run cli:v1.3.7 interactive    # Interactive menu');
    console.info('  bun run cli:v1.3.7 bench          # Run benchmarks');
    console.info('  bun run cli:v1.3.7 check          # System check');
    console.info('  bun run cli:v1.3.7 prepare        # Prepare for packaging');
}
