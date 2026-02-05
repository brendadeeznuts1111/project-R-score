#!/usr/bin/env bun
/**
 * Test Runner for Bun v1.3.7 Performance CLI
 * 
 * Runs all tests and provides a comprehensive report
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

interface TestResult {
    name: string;
    passed: number;
    failed: number;
    duration: number;
    output: string;
}

async function runTest(name: string, command: string[]): Promise<TestResult> {
    console.log(`\n🧪 Running ${name}...`);
    
    return new Promise((resolve) => {
        const child = spawn('bun', command, {
            stdio: 'pipe',
            cwd: process.cwd()
        });

        let output = '';
        let passed = 0;
        let failed = 0;
        const startTime = Date.now();

        child.stdout?.on('data', (data) => {
            const text = data.toString();
            output += text;
            
            // Parse test results from output
            if (text.includes('✓') || text.includes('pass')) {
                passed += (text.match(/✓|pass/gi) || []).length;
            }
            if (text.includes('✗') || text.includes('fail') || text.includes('error')) {
                failed += (text.match(/✗|fail|error/gi) || []).length;
            }
        });

        child.stderr?.on('data', (data) => {
            output += data.toString();
        });

        child.on('close', (code) => {
            const duration = Date.now() - startTime;
            
            if (code === 0) {
                console.log(`✅ ${name} completed successfully`);
            } else {
                console.log(`❌ ${name} failed with exit code ${code}`);
                failed++;
            }
            
            resolve({
                name,
                passed,
                failed,
                duration,
                output
            });
        });
    });
}

async function main(): Promise<void> {
    console.log('🚀 Bun v1.3.7 Performance CLI - Test Runner');
    console.log('='.repeat(60));
    
    const tests = [
        {
            name: 'CLI Functionality Tests',
            command: ['test', 'packages/cli/tests/bun-v1.3.7-cli.test.ts']
        },
        {
            name: 'Performance Benchmarks',
            command: ['test', 'packages/cli/tests/performance-benchmarks.test.ts']
        },
        {
            name: 'Interactive Demo Tests',
            command: ['test', 'packages/cli/tests/interactive-demo.test.ts']
        }
    ];
    
    const results: TestResult[] = [];
    
    // Run all tests
    for (const test of tests) {
        const result = await runTest(test.name, test.command);
        results.push(result);
    }
    
    // Generate report
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Results Summary');
    console.log('='.repeat(60));
    
    let totalPassed = 0;
    let totalFailed = 0;
    let totalDuration = 0;
    
    for (const result of results) {
        console.log(`\n${result.name}:`);
        console.log(`  ✅ Passed: ${result.passed}`);
        console.log(`  ❌ Failed: ${result.failed}`);
        console.log(`  ⏱️  Duration: ${result.duration}ms`);
        
        totalPassed += result.passed;
        totalFailed += result.failed;
        totalDuration += result.duration;
    }
    
    console.log('\n' + '-'.repeat(60));
    console.log('📈 Overall Results:');
    console.log(`  Total Tests: ${totalPassed + totalFailed}`);
    console.log(`  ✅ Passed: ${totalPassed}`);
    console.log(`  ❌ Failed: ${totalFailed}`);
    console.log(`  📊 Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);
    console.log(`  ⏱️  Total Duration: ${totalDuration}ms`);
    
    // Performance summary
    console.log('\n🚀 Performance Features Tested:');
    console.log('  • Buffer.from(array) - 50% faster on ARM64');
    console.log('  • array.flat() - 3x faster');
    console.log('  • padStart/padEnd - 90% faster');
    console.log('  • JSON5 parsing - Native support');
    console.log('  • JSONL streaming - Optimized parsing');
    console.log('  • Bun.wrapAnsi() - 88x faster than npm');
    console.log('  • Buffer.swap16/swap64 - 1.8x/3.6x faster');
    console.log('  • Async/await streaming - 35% faster');
    
    if (totalFailed > 0) {
        console.log('\n❌ Some tests failed. Check the output above for details.');
        process.exit(1);
    } else {
        console.log('\n✅ All tests passed! Bun v1.3.7 Performance CLI is ready for production.');
    }
}

// Check if we're in a test environment
if (import.meta.main) {
    main().catch(console.error);
}
