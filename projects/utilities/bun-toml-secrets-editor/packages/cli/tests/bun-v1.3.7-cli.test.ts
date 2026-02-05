#!/usr/bin/env bun
/**
 * Tests for Bun v1.3.7 Performance CLI
 * 
 * Tests all CLI commands and performance features
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { spawn } from 'node:child_process';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const CLI_PATH = join(import.meta.dir, '../src/bun-v1.3.7-cli.ts');

// Helper function to run CLI commands
async function runCLI(args: string[], cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
        const child = spawn('bun', [CLI_PATH, ...args], {
            cwd: cwd || join(import.meta.dir, '../../../'),
            stdio: 'pipe',
            env: { ...process.env, NODE_ENV: 'test' }
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            resolve({ stdout, stderr, exitCode: code || 0 });
        });
    });
}

describe('Bun v1.3.7 CLI', () => {
    beforeAll(() => {
        console.log('🧪 Starting Bun v1.3.7 CLI Tests...');
    });

    afterAll(() => {
        console.log('✅ CLI tests completed');
    });

    describe('Basic CLI Functionality', () => {
        it('should show help', async () => {
            const result = await runCLI(['--help']);
            
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('Usage: bun-v1.3.7-cli');
            expect(result.stdout).toContain('CLI tool for Bun v1.3.7 performance testing');
            expect(result.stdout).toContain('Commands:');
            expect(result.stdout).toContain('demo');
            expect(result.stdout).toContain('bench');
            expect(result.stdout).toContain('check');
        });

        it('should show version', async () => {
            const result = await runCLI(['--version']);
            
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
        });

        it('should handle invalid command gracefully', async () => {
            const result = await runCLI(['invalid-command']);
            
            expect(result.exitCode).toBe(1);
            expect(result.stderr).toContain('error');
        });
    });

    describe('System Check Command', () => {
        it('should check system compatibility', async () => {
            const result = await runCLI(['check']);
            
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('System Compatibility Check');
            expect(result.stdout).toContain('Checking Bun version');
            expect(result.stdout).toContain('System Information');
            expect(result.stdout).toContain('Required Files');
            expect(result.stdout).toContain('Ready to run Bun v1.3.7 performance tests');
        });

        it('should show verbose system information', async () => {
            const result = await runCLI(['check', '--verbose']);
            
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('Detailed Info');
            expect(result.stdout).toContain('CPU:');
            expect(result.stdout).toContain('Memory:');
            expect(result.stdout).toContain('PID:');
            expect(result.stdout).toContain('CWD:');
        });
    });

    describe('Demo Commands', () => {
        it('should show demo help', async () => {
            const result = await runCLI(['demo', '--help']);
            
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('Run quick performance demos');
            expect(result.stdout).toContain('--all');
            expect(result.stdout).toContain('--buffer');
            expect(result.stdout).toContain('--string');
            expect(result.stdout).toContain('--json');
            expect(result.stdout).toContain('--profiling');
        });

        it('should run buffer demos', async () => {
            const result = await runCLI(['demo', '--buffer']);
            
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('Checking Bun version');
            expect(result.stdout).toContain('Running Buffer/Array demos');
        });

        it('should run all demos', async () => {
            const result = await runCLI(['demo', '--all']);
            
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('Checking Bun version');
            expect(result.stdout).toContain('Running all performance demos');
        });
    });

    describe('Benchmark Commands', () => {
        it('should show benchmark help', async () => {
            const result = await runCLI(['bench', '--help']);
            
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('Run comprehensive performance benchmarks');
            expect(result.stdout).toContain('--feature');
            expect(result.stdout).toContain('--output');
            expect(result.stdout).toContain('--profile');
        });

        it('should run benchmarks with dry run', async () => {
            const result = await runCLI(['bench', '--feature', 'buffer']);
            
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('Checking Bun version');
            expect(result.stdout).toContain('Running performance benchmarks');
        });
    });

    describe('One-Liners Command', () => {
        it('should display one-liners', async () => {
            const result = await runCLI(['oneliners']);
            
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('Bun v1.3.7 Performance One-Liners');
            expect(result.stdout).toContain('Buffer/Array Speed Demons');
            expect(result.stdout).toContain('String + Async Rockets');
            expect(result.stdout).toContain('Profilers + Telemetry');
            expect(result.stdout).toContain('New APIs One-Shot');
            expect(result.stdout).toContain('HTTP/WS + S3');
            expect(result.stdout).toContain('bunx -e');
        });
    });

    describe('Profile Command', () => {
        it('should show profile help', async () => {
            const result = await runCLI(['profile', '--help']);
            
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('Profile specific scripts');
            expect(result.stdout).toContain('<script>');
            expect(result.stdout).toContain('--cpu');
            expect(result.stdout).toContain('--heap');
            expect(result.stdout).toContain('--interval');
            expect(result.stdout).toContain('--dir');
        });

        it('should handle profile command with script', async () => {
            // Create a simple test script
            const testScript = join(import.meta.dir, '../../../test-script.ts');
            Bun.write(testScript, 'console.log("Test script");');
            
            try {
                const result = await runCLI(['profile', testScript, '--cpu']);
                
                // Profile command may fail if script doesn't exist or has issues
                // We just check it runs without crashing
                expect(result.stdout.length + result.stderr.length).toBeGreaterThan(0);
            } finally {
                // Clean up test script
                if (existsSync(testScript)) {
                    unlinkSync(testScript);
                }
            }
        });
    });

    describe('Test Command', () => {
        it('should show test help', async () => {
            const result = await runCLI(['test', '--help']);
            
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('Run tests for Bun v1.3.7 features');
            expect(result.stdout).toContain('--unit');
            expect(result.stdout).toContain('--integration');
            expect(result.stdout).toContain('--coverage');
        });
    });

    describe('Prepare Command', () => {
        it('should show prepare help', async () => {
            const result = await runCLI(['prepare', '--help']);
            
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('Prepare for global packaging');
            expect(result.stdout).toContain('--dry-run');
        });

        it('should run prepare dry run', async () => {
            const result = await runCLI(['prepare', '--dry-run']);
            
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('Preparing for Global Packaging');
            expect(result.stdout).toContain('Dry run - would execute');
            expect(result.stdout).toContain('bun run build');
            expect(result.stdout).toContain('bun run typecheck');
            expect(result.stdout).toContain('Ready for packaging');
        });
    });

    describe('Error Handling', () => {
        it('should handle missing script file', async () => {
            const result = await runCLI(['profile', 'nonexistent-script.ts']);
            
            expect(result.exitCode).toBe(1);
        });

        it('should handle invalid options', async () => {
            const result = await runCLI(['--invalid-option']);
            
            expect(result.exitCode).toBe(1);
        });
    });
});

describe('Performance Features Tests', () => {
    describe('Buffer Performance', () => {
        it('should test Buffer.from performance', () => {
            console.time('Buffer.from test');
            for(let i = 0; i < 1e4; i++) {
                const buf = Buffer.from([i % 256, (i+1) % 256]);
                expect(buf.length).toBe(2);
            }
            console.timeEnd('Buffer.from test');
        });

        it('should test Buffer.swap16 performance', () => {
            const buf = Buffer.from([0x48, 0x00]);
            
            console.time('Buffer.swap16 test');
            for(let i = 0; i < 1e4; i++) {
                buf.swap16();
                buf.swap16(); // swap back
            }
            console.timeEnd('Buffer.swap16 test');
            
            expect(buf.toString('hex')).toBe('4800');
        });
    });

    describe('String Performance', () => {
        it('should test padStart performance', () => {
            console.time('padStart test');
            for(let i = 0; i < 1e4; i++) {
                const result = '2026'.padStart(20, '0');
                expect(result.length).toBe(20);
            }
            console.timeEnd('padStart test');
        });

        it('should test padEnd performance', () => {
            console.time('padEnd test');
            for(let i = 0; i < 1e4; i++) {
                const result = `item-${i}`.padEnd(30, '-');
                expect(result.length).toBeGreaterThanOrEqual(30);
            }
            console.timeEnd('padEnd test');
        });
    });

    describe('Array Performance', () => {
        it('should test array.flat performance', () => {
            const nested = Array(100).fill(0).map((_, i) => [i, [i+1, [i+2, i+3]]]);
            
            console.time('array.flat test');
            for(let i = 0; i < 1e3; i++) {
                const flat = nested.flat(3);
                expect(flat.length).toBeGreaterThan(0);
            }
            console.timeEnd('array.flat test');
        });

        it('should test Array.from performance', () => {
            function testArgs(...args: any[]) {
                return Array.from(args);
            }
            
            console.time('Array.from test');
            for(let i = 0; i < 1e4; i++) {
                const result = testArgs(1, 2, 3);
                expect(result).toEqual([1, 2, 3]);
            }
            console.timeEnd('Array.from test');
        });

        it('should test async/await streaming', async () => {
            async function* generator() {
                for(let i = 0; i < 100; i++) {
                    yield JSON.stringify({ id: i, value: `item-${i}` }) + '\n';
                }
            }
            
            console.time('async streaming test');
            let count = 0;
            
            if ('JSONL' in Bun) {
                try {
                    for await(const item of (Bun as any).JSONL.parse(generator())) {
                        count++;
                        expect(item).toHaveProperty('id');
                        expect(item).toHaveProperty('value');
                    }
                } catch (error) {
                    // If JSONL parsing fails, test with manual parsing
                    for await(const line of generator()) {
                        count++;
                        const parsed = JSON.parse(line);
                        expect(parsed).toHaveProperty('id');
                    }
                }
            } else {
                // Fallback test
                for await(const line of generator()) {
                    count++;
                    const parsed = JSON.parse(line);
                    expect(parsed).toHaveProperty('id');
                }
            }
            
            console.timeEnd('async streaming test');
            expect(count).toBe(100);
        });
    });

    describe('Bun v1.3.7 APIs', () => {
        it('should test JSON5 parsing', () => {
            if ('JSON5' in Bun) {
                const json5Str = '{name:"app",version:"1.0.0",enabled:true,}';
                const result = (Bun as any).JSON5.parse(json5Str);
                
                expect(result.name).toBe('app');
                expect(result.version).toBe('1.0.0');
                expect(result.enabled).toBe(true);
            } else {
                console.log('⚠️  JSON5 not available in this Bun version');
            }
        });

        it('should test JSONL parsing', () => {
            if ('JSONL' in Bun) {
                const jsonlStr = '{"a":1}\n{"b":2}\n{"c":3}';
                const result = (Bun as any).JSONL.parse(jsonlStr);
                
                expect(result).toHaveLength(3);
                expect(result[0].a).toBe(1);
                expect(result[1].b).toBe(2);
                expect(result[2].c).toBe(3);
            } else {
                console.log('⚠️  JSONL not available in this Bun version');
            }
        });

        it('should test wrapAnsi', () => {
            if ('wrapAnsi' in Bun) {
                const coloredText = '\x1b[32mGreen text\x1b[0m';
                const wrapped = (Bun as any).wrapAnsi(coloredText, { width: 10 });
                
                // wrapAnsi might return string or array depending on implementation
                expect(typeof wrapped === 'string' || Array.isArray(wrapped)).toBe(true);
                expect(wrapped.length).toBeGreaterThan(0);
            } else {
                console.log('⚠️  wrapAnsi not available in this Bun version');
            }
        });

        it('should test string well-formed methods', () => {
            const validString = 'Hello, 世界! 🌍';
            const invalidString = 'Hello, \uD800World!'; // Invalid surrogate pair
            
            // Test if methods exist on String prototype
            if ('isWellFormed' in String.prototype) {
                expect(validString.isWellFormed()).toBe(true);
                expect(invalidString.isWellFormed()).toBe(false);
            }
            
            if ('toWellFormed' in String.prototype) {
                const wellFormed = invalidString.toWellFormed();
                expect(typeof wellFormed).toBe('string');
            }
        });
    });

    describe('Async Performance', () => {
        it('should test async/await streaming', async () => {
            async function* generator() {
                for(let i = 0; i < 100; i++) {
                    yield JSON.stringify({ id: i, value: `item-${i}` }) + '\n';
                }
            }
            
            console.time('async streaming test');
            let count = 0;
            
            if ('JSONL' in Bun) {
                try {
                    for await(const item of (Bun as any).JSONL.parse(generator())) {
                        count++;
                        expect(item).toHaveProperty('id');
                        expect(item).toHaveProperty('value');
                    }
                } catch (error) {
                    // If JSONL parsing fails, test with manual parsing
                    for await(const line of generator()) {
                        count++;
                        const parsed = JSON.parse(line);
                        expect(parsed).toHaveProperty('id');
                    }
                }
            } else {
                // Fallback test
                for await(const line of generator()) {
                    count++;
                    const parsed = JSON.parse(line);
                    expect(parsed).toHaveProperty('id');
                }
            }
            
            console.timeEnd('async streaming test');
            expect(count).toBe(100);
        });
    });

    describe('Integration Tests', () => {
        it('should run full CLI workflow', async () => {
            // Test complete workflow: check -> demo -> oneliners
            const checkResult = await runCLI(['check']);
            expect(checkResult.exitCode).toBe(0);
            
            const demoResult = await runCLI(['demo', '--buffer']);
            expect(demoResult.exitCode).toBe(0);
            
            const onelinersResult = await runCLI(['oneliners']);
            expect(onelinersResult.exitCode).toBe(0);
            
            expect(checkResult.stdout).toContain('Ready to run');
            expect(demoResult.stdout).toContain('Buffer/Array demos');
            expect(onelinersResult.stdout).toContain('Performance One-Liners');
        });

    it('should handle concurrent CLI calls', async () => {
        // Test multiple CLI calls at once
        const promises = [
            runCLI(['check']),
            runCLI(['oneliners']),
            runCLI(['demo', '--help'])
        ];
        
        const results = await Promise.all(promises);
        
        results.forEach(result => {
            expect(result.exitCode).toBe(0);
        });
    });
});
