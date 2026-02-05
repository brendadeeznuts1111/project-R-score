#!/usr/bin/env bun
/**
 * Prepare Bun v1.3.7 Performance CLI for Global Distribution
 * 
 * This script prepares the CLI for global installation via:
 * - bun pack
 * - bunx --global
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

console.log('📦 Preparing Bun v1.3.7 CLI for Global Distribution');
console.log('='.repeat(60));

// Check prerequisites
function checkPrerequisites(): void {
    console.log('\n🔍 Checking prerequisites...');
    
    const bunVersion = Bun.version;
    if (bunVersion < '1.3.7') {
        console.warn(`⚠️  Warning: Bun v${bunVersion} detected. v1.3.7+ recommended`);
    } else {
        console.log(`✅ Bun v${bunVersion} - OK`);
    }
    
    const requiredFiles = [
        'packages/cli/src/bun-v1.3.7-cli.ts',
        'examples/bun-v1.3.7-oneliners.ts',
        'examples/benchmarks/bun-v1.3.7-performance-bench.ts',
        'examples/bun-v1.3.7-interactive-demo.ts',
        'examples/bun-v1.3.7-quick-oneliners.sh'
    ];
    
    for (const file of requiredFiles) {
        if (existsSync(file)) {
            console.log(`✅ ${file}`);
        } else {
            console.error(`❌ Missing: ${file}`);
            process.exit(1);
        }
    }
}

// Create standalone CLI package
function createStandalonePackage(): void {
    console.log('\n📁 Creating standalone package structure...');
    
    const distDir = './dist/bun-v1.3.7-cli';
    
    // Create directories
    mkdirSync(distDir, { recursive: true });
    mkdirSync(join(distDir, 'examples'), { recursive: true });
    mkdirSync(join(distDir, 'examples/benchmarks'), { recursive: true });
    mkdirSync(join(distDir, 'bin'), { recursive: true });
    
    // Copy CLI file
    const cliSource = readFileSync('packages/cli/src/bun-v1.3.7-cli.ts', 'utf8');
    writeFileSync(join(distDir, 'bin/bun-v1.3.7-cli.ts'), cliSource);
    
    // Copy example files
    const exampleFiles = [
        { src: 'examples/bun-v1.3.7-oneliners.ts', dest: 'examples/bun-v1.3.7-oneliners.ts' },
        { src: 'examples/benchmarks/bun-v1.3.7-performance-bench.ts', dest: 'examples/benchmarks/bun-v1.3.7-performance-bench.ts' },
        { src: 'examples/bun-v1.3.7-interactive-demo.ts', dest: 'examples/bun-v1.3.7-interactive-demo.ts' },
        { src: 'examples/bun-v1.3.7-quick-oneliners.sh', dest: 'examples/bun-v1.3.7-quick-oneliners.sh' }
    ];
    
    for (const { src, dest } of exampleFiles) {
        const content = readFileSync(src, 'utf8');
        writeFileSync(join(distDir, dest), content);
        // Make shell script executable
        if (dest.endsWith('.sh')) {
            execSync(`chmod +x ${join(distDir, dest)}`);
        }
    }
    
    // Create package.json for standalone
    const standalonePackageJson = {
        name: 'bun-v1.3.7-performance-cli',
        version: '1.0.0',
        description: 'Bun v1.3.7 Performance Testing and Benchmarking CLI',
        main: 'bin/bun-v1.3.7-cli.ts',
        bin: {
            'bun-v1.3.7': './bin/bun-v1.3.7-cli.ts'
        },
        scripts: {
            start: 'bun bin/bun-v1.3.7-cli.ts',
            demo: 'bun bin/bun-v1.3.7-cli.ts demo',
            bench: 'bun bin/bun-v1.3.7-cli.ts bench',
            interactive: 'bun bin/bun-v1.3.7-cli.ts interactive',
            check: 'bun bin/bun-v1.3.7-cli.ts check'
        },
        dependencies: {
            commander: '^12.0.0'
        },
        engines: {
            bun: '>=1.3.7'
        },
        keywords: [
            'bun',
            'performance',
            'benchmarking',
            'cli',
            'v1.3.7'
        ],
        author: 'Bun Performance Tools',
        license: 'MIT'
    };
    
    writeFileSync(join(distDir, 'package.json'), JSON.stringify(standalonePackageJson, null, 2));
    
    // Create README
    const readme = `# Bun v1.3.7 Performance CLI

A comprehensive CLI tool for testing and benchmarking Bun v1.3.7 performance features.

## Installation

\`\`\`bash
# Global installation
bunx --global bun-v1.3.7-performance-cli

# Or download and run
bun pack
bunx --global bun-v1.3.7-performance-cli-*.tgz
\`\`\`

## Quick Start

\`\`\`bash
# Check system compatibility
bun-v1.3.7 check

# Run interactive demo
bun-v1.3.7 interactive

# Run all performance demos
bun-v1.3.7 demo

# Run comprehensive benchmarks
bun-v1.3.7 bench

# Show performance one-liners
bun-v1.3.7 oneliners
\`\`\`

## Features

- 🔥 50% faster Buffer.from(array) on ARM64
- 🚀 3x faster array.flat() and Array.from(arguments)
- ⚡ 90% faster padStart/padEnd
- 🔄 35% faster async/await streaming
- 🎨 88x faster Bun.wrapAnsi() vs wrap-ansi npm
- 📄 Native JSON5 and JSONL parsing
- 📊 CPU/Heap profiling with Markdown output
- 🔧 Buffer.swap16/swap64 performance boosts

## Commands

- \`demo\` - Run performance demos
- \`interactive\` - Interactive demo menu
- \`bench\` - Comprehensive benchmarks
- \`test\` - Run test suite
- \`oneliners\` - Show copy-paste one-liners
- \`profile\` - Profile scripts
- \`check\` - System compatibility
- \`prepare\` - Prepare for packaging

## Requirements

- Bun v1.3.7 or higher
- macOS, Linux, or Windows

## License

MIT
`;
    
    writeFileSync(join(distDir, 'README.md'), readme);
    
    console.log(`✅ Standalone package created in ${distDir}`);
}

// Test the standalone package
function testStandalonePackage(): void {
    console.log('\n🧪 Testing standalone package...');
    
    try {
        // Change to standalone directory
        process.chdir('./dist/bun-v1.3.7-cli');
        
        // Test basic commands
        console.log('Testing help command...');
        execSync('bun bin/bun-v1.3.7-cli.ts --help', { stdio: 'pipe' });
        console.log('✅ Help command works');
        
        console.log('Testing check command...');
        execSync('bun bin/bun-v1.3.7-cli.ts check', { stdio: 'pipe' });
        console.log('✅ Check command works');
        
        // Change back
        process.chdir('../..');
        
    } catch (error) {
        console.error('❌ Standalone package test failed:', error);
        process.exit(1);
    }
}

// Create distribution package
function createDistributionPackage(): void {
    console.log('\n📦 Creating distribution package...');
    
    try {
        // Run pack from the standalone directory but output to parent
        const originalDir = process.cwd();
        process.chdir('./dist/bun-v1.3.7-cli');
        
        // Create npm package using bun pack from this directory
        execSync('bun pack', { stdio: 'inherit' });
        
        const packageFiles = execSync('ls *.tgz', { encoding: 'utf8' }).trim();
        console.log(`✅ Package created: ${packageFiles}`);
        
        // Move to parent directory
        execSync(`mv ${packageFiles} ../..`, { stdio: 'pipe' });
        
        process.chdir(originalDir);
        
        console.log('\n🎉 Package ready for global distribution!');
        console.log('\nInstallation options:');
        console.log(`1. bunx --global ${packageFiles}`);
        console.log('2. Upload to npm registry');
        console.log('3. Share the package file directly');
        
    } catch (error) {
        console.error('❌ Package creation failed:', error);
        process.exit(1);
    }
}

// Main execution
async function main(): Promise<void> {
    checkPrerequisites();
    createStandalonePackage();
    testStandalonePackage();
    createDistributionPackage();
    
    console.log('\n🚀 Bun v1.3.7 Performance CLI is ready for global distribution!');
    console.log('\nNext steps:');
    console.log('1. Test: bunx --global bun-v1.3.7-performance-cli-*.tgz');
    console.log('2. Use: bun-v1.3.7 --help');
    console.log('3. Share: Distribute the .tgz file');
}

if (import.meta.main) {
    main().catch(console.error);
}
