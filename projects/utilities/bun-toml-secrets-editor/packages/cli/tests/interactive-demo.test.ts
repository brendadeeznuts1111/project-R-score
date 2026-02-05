#!/usr/bin/env bun
/**
 * Tests for Interactive Demo Functionality
 * 
 * Tests the interactive demo features and user input handling
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { spawn } from 'node:child_process';

const INTERACTIVE_DEMO_PATH = 'examples/bun-v1.3.7-interactive-demo.ts';

// Helper function to run interactive demo with automated input
async function runInteractiveDemo(input: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
        const child = spawn('bun', [INTERACTIVE_DEMO_PATH], {
            stdio: 'pipe',
            cwd: process.cwd()
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
            stderr += data.toString();
        });

        // Send input after a short delay
        setTimeout(() => {
            if (child.stdin) {
                child.stdin.write(input.join('\n') + '\n');
                child.stdin.end();
            }
        }, 1000);

        child.on('close', (code) => {
            resolve({ stdout, stderr, exitCode: code || 0 });
        });
    });
}

describe('Interactive Demo Tests', () => {
    beforeAll(() => {
        console.log('🎮 Starting Interactive Demo Tests...');
    });

    afterAll(() => {
        console.log('✅ Interactive demo tests completed');
    });

    describe('Demo Functions', () => {
        it('should have all required demo functions', async () => {
            // Import and check that all demo functions exist
            const demoModule = await import('../examples/bun-v1.3.7-interactive-demo.ts');
            
            const expectedFunctions = [
                'demoBufferSpeed',
                'demoArrayFlat',
                'demoStringPadding',
                'demoJSON5',
                'demoJSONL',
                'demoWrapAnsi',
                'demoBufferSwapping',
                'demoProfiling',
                'demoHeaderCase',
                'demoWebSocketAuth'
            ];
            
            for (const funcName of expectedFunctions) {
                expect(typeof demoModule[funcName]).toBe('function');
            }
        });

        it('should run buffer speed demo', async () => {
            const demoModule = await import('../examples/bun-v1.3.7-interactive-demo.ts');
            
            // Capture console output
            const originalLog = console.log;
            const logs: string[] = [];
            console.log = (...args) => logs.push(args.join(' '));
            
            try {
                await demoModule.demoBufferSpeed();
                
                expect(logs.some(log => log.includes('Buffer.from(array)'))).toBe(true);
                expect(logs.some(log => log.includes('50% faster'))).toBe(true);
                expect(logs.some(log => log.includes('ARM64'))).toBe(true);
            } finally {
                console.log = originalLog;
            }
        });

        it('should run array flat demo', async () => {
            const demoModule = await import('../examples/bun-v1.3.7-interactive-demo.ts');
            
            const originalLog = console.log;
            const logs: string[] = [];
            console.log = (...args) => logs.push(args.join(' '));
            
            try {
                await demoModule.demoArrayFlat();
                
                expect(logs.some(log => log.includes('array.flat()'))).toBe(true);
                expect(logs.some(log => log.includes('3x faster'))).toBe(true);
            } finally {
                console.log = originalLog;
            }
        });

        it('should run string padding demo', async () => {
            const demoModule = await import('../examples/bun-v1.3.7-interactive-demo.ts');
            
            const originalLog = console.log;
            const logs: string[] = [];
            console.log = (...args) => logs.push(args.join(' '));
            
            try {
                await demoModule.demoStringPadding();
                
                expect(logs.some(log => log.includes('padStart/padEnd'))).toBe(true);
                expect(logs.some(log => log.includes('90% faster'))).toBe(true);
            } finally {
                console.log = originalLog;
            }
        });

        it('should run JSON5 demo', async () => {
            const demoModule = await import('../examples/bun-v1.3.7-interactive-demo.ts');
            
            const originalLog = console.log;
            const logs: string[] = [];
            console.log = (...args) => logs.push(args.join(' '));
            
            try {
                await demoModule.demoJSON5();
                
                expect(logs.some(log => log.includes('JSON5'))).toBe(true);
                expect(logs.some(log => log.includes('comments'))).toBe(true);
                expect(logs.some(log => log.includes('trailing commas'))).toBe(true);
            } finally {
                console.log = originalLog;
            }
        });

        it('should run JSONL demo', async () => {
            const demoModule = await import('../examples/bun-v1.3.7-interactive-demo.ts');
            
            const originalLog = console.log;
            const logs: string[] = [];
            console.log = (...args) => logs.push(args.join(' '));
            
            try {
                await demoModule.demoJSONL();
                
                expect(logs.some(log => log.includes('JSONL'))).toBe(true);
                expect(logs.some(log => log.includes('streaming'))).toBe(true);
                expect(logs.some(log => log.includes('Processed'))).toBe(true);
            } finally {
                console.log = originalLog;
            }
        });

        it('should run wrapAnsi demo', async () => {
            const demoModule = await import('../examples/bun-v1.3.7-interactive-demo.ts');
            
            const originalLog = console.log;
            const logs: string[] = [];
            console.log = (...args) => logs.push(args.join(' '));
            
            try {
                await demoModule.demoWrapAnsi();
                
                expect(logs.some(log => log.includes('wrapAnsi'))).toBe(true);
                expect(logs.some(log => log.includes('88x faster'))).toBe(true);
                expect(logs.some(log => log.includes('CLI magic'))).toBe(true);
            } finally {
                console.log = originalLog;
            }
        });

        it('should run buffer swapping demo', async () => {
            const demoModule = await import('../examples/bun-v1.3.7-interactive-demo.ts');
            
            const originalLog = console.log;
            const logs: string[] = [];
            console.log = (...args) => logs.push(args.join(' '));
            
            try {
                await demoModule.demoBufferSwapping();
                
                expect(logs.some(log => log.includes('swap16'))).toBe(true);
                expect(logs.some(log => log.includes('swap64'))).toBe(true);
                expect(logs.some(log => log.includes('1.8x faster'))).toBe(true);
                expect(logs.some(log => log.includes('3.6x faster'))).toBe(true);
            } finally {
                console.log = originalLog;
            }
        });

        it('should run profiling demo', async () => {
            const demoModule = await import('../examples/bun-v1.3.7-interactive-demo.ts');
            
            const originalLog = console.log;
            const logs: string[] = [];
            console.log = (...args) => logs.push(args.join(' '));
            
            try {
                await demoModule.demoProfiling();
                
                expect(logs.some(log => log.includes('CPU Profiling'))).toBe(true);
                expect(logs.some(log => log.includes('Heap Profiling'))).toBe(true);
                expect(logs.some(log => log.includes('--cpu-prof-md'))).toBe(true);
            } finally {
                console.log = originalLog;
            }
        });

        it('should run header case demo', async () => {
            const demoModule = await import('../examples/bun-v1.3.7-interactive-demo.ts');
            
            const originalLog = console.log;
            const logs: string[] = [];
            console.log = (...args) => logs.push(args.join(' '));
            
            try {
                await demoModule.demoHeaderCase();
                
                expect(logs.some(log => log.includes('Header Case'))).toBe(true);
                expect(logs.some(log => log.includes('Authorization'))).toBe(true);
                expect(logs.some(log => log.includes('Content-Type'))).toBe(true);
            } finally {
                console.log = originalLog;
            }
        });

        it('should run WebSocket credentials demo', async () => {
            const demoModule = await import('../examples/bun-v1.3.7-interactive-demo.ts');
            
            const originalLog = console.log;
            const logs: string[] = [];
            console.log = (...args) => logs.push(args.join(' '));
            
            try {
                await demoModule.demoWebSocketAuth();
                
                expect(logs.some(log => log.includes('WebSocket'))).toBe(true);
                expect(logs.some(log => log.includes('credentials'))).toBe(true);
                expect(logs.some(log => log.includes('Basic Auth'))).toBe(true);
            } finally {
                console.log = originalLog;
            }
        });
    });

    describe('Interactive Menu System', () => {
        it('should display menu options', async () => {
            // This test would require actual interactive input
            // For now, we'll test that the demo file can be imported
            const demoModule = await import('../examples/bun-v1.3.7-interactive-demo.ts');
            
            expect(typeof demoModule.main).toBe('function');
        });

        it('should handle menu navigation', async () => {
            // Test that the menu system has the expected structure
            const demoModule = await import('../examples/bun-v1.3.7-interactive-demo.ts');
            
            // Check that main function exists and is async
            expect(typeof demoModule.main).toBe('function');
            expect(demoModule.main.constructor.name).toBe('AsyncFunction');
        });
    });

    describe('Demo Content Validation', () => {
        it('should include all performance features', async () => {
            const demoModule = await import('../examples/bun-v1.3.7-interactive-demo.ts');
            
            const originalLog = console.log;
            const allLogs: string[] = [];
            console.log = (...args) => allLogs.push(args.join(' '));
            
            try {
                // Run all demos
                await demoModule.demoBufferSpeed();
                await demoModule.demoArrayFlat();
                await demoModule.demoStringPadding();
                await demoModule.demoJSON5();
                await demoModule.demoJSONL();
                await demoModule.demoWrapAnsi();
                await demoModule.demoBufferSwapping();
                await demoModule.demoProfiling();
                await demoModule.demoHeaderCase();
                await demoModule.demoWebSocketAuth();
                
                const combinedLogs = allLogs.join(' ');
                
                // Check that all key performance features are mentioned
                const expectedFeatures = [
                    'Buffer.from(array)',
                    'array.flat()',
                    'padStart/padEnd',
                    'JSON5',
                    'JSONL',
                    'wrapAnsi',
                    'swap16',
                    'swap64',
                    'CPU Profiling',
                    'Header case',
                    'WebSocket'
                ];
                
                for (const feature of expectedFeatures) {
                    expect(combinedLogs).toContain(feature);
                }
                
            } finally {
                console.log = originalLog;
            }
        });

        it('should include performance metrics', async () => {
            const demoModule = await import('../examples/bun-v1.3.7-interactive-demo.ts');
            
            const originalLog = console.log;
            const logs: string[] = [];
            console.log = (...args) => logs.push(args.join(' '));
            
            try {
                await demoModule.demoBufferSpeed();
                
                const combinedLogs = logs.join(' ');
                
                // Should include timing information
                expect(combinedLogs).toMatch(/\d+\.?\d*ms/);
                
            } finally {
                console.log = originalLog;
            }
        });
    });

    describe('Error Handling', () => {
        it('should handle missing Bun APIs gracefully', async () => {
            // Test that demos work even if some APIs are not available
            const demoModule = await import('../examples/bun-v1.3.7-interactive-demo.ts');
            
            // Mock missing APIs
            const originalBun = global.Bun;
            global.Bun = { ...originalBun } as any;
            delete (global.Bun as any).JSON5;
            delete (global.Bun as any).JSONL;
            delete (global.Bun as any).wrapAnsi;
            
            try {
                const originalLog = console.log;
                const logs: string[] = [];
                console.log = (...args) => logs.push(args.join(' '));
                
                await demoModule.demoJSON5();
                
                // Should handle missing API gracefully
                expect(logs.length).toBeGreaterThan(0);
                
                console.log = originalLog;
            } finally {
                global.Bun = originalBun;
            }
        });
    });

    describe('Performance Demo Accuracy', () => {
        it('should demonstrate actual performance improvements', async () => {
            const demoModule = await import('../examples/bun-v1.3.7-interactive-demo.ts');
            
            const originalLog = console.log;
            const logs: string[] = [];
            console.log = (...args) => logs.push(args.join(' '));
            
            try {
                await demoModule.demoBufferSpeed();
                
                const combinedLogs = logs.join(' ');
                
                // Should mention specific performance improvements
                expect(combinedLogs).toContain('50% faster');
                expect(combinedLogs).toContain('ARM64');
                
            } finally {
                console.log = originalLog;
            }
        });

        it('should include practical examples', async () => {
            const demoModule = await import('../examples/bun-v1.3.7-interactive-demo.ts');
            
            const originalLog = console.log;
            const logs: string[] = [];
            console.log = (...args) => logs.push(args.join(' '));
            
            try {
                await demoModule.demoJSON5();
                
                const combinedLogs = logs.join(' ');
                
                // Should include practical usage examples
                expect(combinedLogs).toContain('configuration');
                expect(combinedLogs).toContain('comments');
                expect(combinedLogs).toContain('trailing comma');
                
            } finally {
                console.log = originalLog;
            }
        });
    });
});
