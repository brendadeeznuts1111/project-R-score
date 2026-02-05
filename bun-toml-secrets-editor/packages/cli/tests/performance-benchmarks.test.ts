#!/usr/bin/env bun
/**
 * Performance Benchmarks for Bun v1.3.7 Features
 * 
 * Tests actual performance improvements and validates speed claims
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';

describe('Bun v1.3.7 Performance Benchmarks', () => {
    const BENCHMARK_ITERATIONS = {
        buffer: 1e5,
        string: 1e6,
        array: 1e4,
        swap16: 1e6,
        swap64: 5e5,
        json5: 1e5,
        jsonl: 1e3,
        wrapAnsi: 1e5
    };

    interface BenchmarkResult {
        name: string;
        time: number;
        opsPerSecond: number;
        iterations: number;
    }

    function benchmark(name: string, fn: () => void, iterations: number): BenchmarkResult {
        // Warm up
        for(let i = 0; i < 100; i++) fn();
        
        const start = performance.now();
        for(let i = 0; i < iterations; i++) fn();
        const end = performance.now();
        
        const time = end - start;
        const opsPerSecond = Math.round(iterations / time * 1000);
        
        return { name, time, opsPerSecond, iterations };
    }

    function compareBenchmarks(old: BenchmarkResult, newer: BenchmarkResult): string {
        const speedup = (old.time / newer.time).toFixed(2);
        const improvement = ((old.time - newer.time) / old.time * 100).toFixed(1);
        return `${speedup}x faster (${improvement}% improvement)`;
    }

    beforeAll(() => {
        console.log('\n🏁 Starting Bun v1.3.7 Performance Benchmarks...');
        console.log(`Bun version: ${Bun.version}`);
        console.log(`Platform: ${process.platform} ${process.arch}`);
    });

    afterAll(() => {
        console.log('\n🏁 Performance benchmarks completed');
    });

    describe('Buffer Performance', () => {
        it('should benchmark Buffer.from(array)', () => {
            const testData = Array(256).fill(0).map((_, i) => i % 256);
            
            const result = benchmark(
                'Buffer.from(array)',
                () => {
                    const buf = Buffer.from(testData);
                    buf.length; // prevent optimization
                },
                BENCHMARK_ITERATIONS.buffer
            );
            
            console.log(`📊 ${result.name}: ${result.time.toFixed(2)}ms (${result.opsPerSecond.toLocaleString()} ops/sec)`);
            
            expect(result.opsPerSecond).toBeGreaterThan(1000); // Should be fast
            expect(result.time).toBeLessThan(10000); // Should complete in reasonable time
        });

        it('should benchmark Buffer.write performance', () => {
            const result = benchmark(
                'Buffer.write',
                () => {
                    const buf = Buffer.alloc(1024);
                    buf.write('test data');
                },
                BENCHMARK_ITERATIONS.buffer
            );
            
            console.log(`📊 ${result.name}: ${result.time.toFixed(2)}ms (${result.opsPerSecond.toLocaleString()} ops/sec)`);
            expect(result.opsPerSecond).toBeGreaterThan(10000);
        });

        it('should benchmark Buffer.swap16', () => {
            const buf = Buffer.from([0x48, 0x00, 0x65, 0x00, 0x6c, 0x00, 0x6c, 0x00]);
            
            const result = benchmark(
                'Buffer.swap16',
                () => {
                    buf.swap16();
                    buf.swap16(); // swap back
                },
                BENCHMARK_ITERATIONS.swap16
            );
            
            console.log(`📊 ${result.name}: ${result.time.toFixed(2)}ms (${result.opsPerSecond.toLocaleString()} ops/sec)`);
            expect(result.opsPerSecond).toBeGreaterThan(100000);
        });

        it('should benchmark Buffer.swap64', () => {
            const buf = Buffer.alloc(8);
            buf.writeBigUInt64LE(BigInt(Number('0x0102030405060708')));
            
            const result = benchmark(
                'Buffer.swap64',
                () => {
                    buf.swap64();
                    buf.swap64(); // swap back
                },
                BENCHMARK_ITERATIONS.swap64
            );
            
            console.log(`📊 ${result.name}: ${result.time.toFixed(2)}ms (${result.opsPerSecond.toLocaleString()} ops/sec)`);
            expect(result.opsPerSecond).toBeGreaterThan(50000);
        });
    });

    describe('String Performance', () => {
        it('should benchmark padStart', () => {
            const result = benchmark(
                'String.padStart',
                () => {
                    '2026'.padStart(20, '0');
                },
                BENCHMARK_ITERATIONS.string
            );
            
            console.log(`📊 ${result.name}: ${result.time.toFixed(2)}ms (${result.opsPerSecond.toLocaleString()} ops/sec)`);
            expect(result.opsPerSecond).toBeGreaterThan(100000);
        });

        it('should benchmark padEnd', () => {
            const result = benchmark(
                'String.padEnd',
                () => {
                    `item-${Math.floor(Math.random() * 1000)}`.padEnd(30, '-');
                },
                BENCHMARK_ITERATIONS.string
            );
            
            console.log(`📊 ${result.name}: ${result.time.toFixed(2)}ms (${result.opsPerSecond.toLocaleString()} ops/sec)`);
            expect(result.opsPerSecond).toBeGreaterThan(100000);
        });

        it('should benchmark string well-formed methods', () => {
            const validString = 'Hello, 世界! 🌍';
            const invalidString = 'Hello, \uD800World!';
            
            if ('isWellFormed' in validString) {
                const result = benchmark(
                    'String.isWellFormed',
                    () => {
                        (validString as any).isWellFormed();
                        (invalidString as any).isWellFormed();
                    },
                    BENCHMARK_ITERATIONS.string
                );
                
                console.log(`📊 ${result.name}: ${result.time.toFixed(2)}ms (${result.opsPerSecond.toLocaleString()} ops/sec)`);
                expect(result.opsPerSecond).toBeGreaterThan(100000);
            }
        });
    });

    describe('Array Performance', () => {
        it('should benchmark array.flat', () => {
            const nestedArray = Array(100).fill(0).map((_, i) => [
                i, 
                [i+1, [i+2, i+3]],
                [[i+4, i+5], [i+6, [i+7, i+8]]]
            ]);
            
            const result = benchmark(
                'Array.flat(3)',
                () => {
                    const flat = nestedArray.flat(3);
                    flat.length; // prevent optimization
                },
                BENCHMARK_ITERATIONS.array
            );
            
            console.log(`📊 ${result.name}: ${result.time.toFixed(2)}ms (${result.opsPerSecond.toLocaleString()} ops/sec)`);
            expect(result.opsPerSecond).toBeGreaterThan(1000);
        });

        it('should benchmark Array.from(arguments)', () => {
            function testArgs(...args: any[]) {
                return Array.from(args);
            }
            
            const result = benchmark(
                'Array.from(arguments)',
                () => {
                    testArgs(1, 2, 3, 4, 5);
                },
                BENCHMARK_ITERATIONS.array
            );
            
            console.log(`📊 ${result.name}: ${result.time.toFixed(2)}ms (${result.opsPerSecond.toLocaleString()} ops/sec)`);
            expect(result.opsPerSecond).toBeGreaterThan(10000);
        });
    });

    describe('Bun v1.3.7 API Performance', () => {
        it('should benchmark JSON5 parsing', () => {
            if ('JSON5' in Bun) {
                const json5Str = '{name:"app",version:"1.0.0",enabled:true,features:["auth","api"],}';
                
                const result = benchmark(
                    'Bun.JSON5.parse',
                    () => {
                        (Bun as any).JSON5.parse(json5Str);
                    },
                    BENCHMARK_ITERATIONS.json5
                );
                
                console.log(`📊 ${result.name}: ${result.time.toFixed(2)}ms (${result.opsPerSecond.toLocaleString()} ops/sec)`);
                expect(result.opsPerSecond).toBeGreaterThan(1000);
            } else {
                console.log('⚠️  JSON5 not available - skipping benchmark');
            }
        });

        it('should benchmark JSONL parsing', () => {
            if ('JSONL' in Bun) {
                const jsonlData = Array(100).fill(0).map((_, i) => 
                    JSON.stringify({ id: i, name: `item-${i}`, value: Math.random() })
                ).join('\n');
                
                const result = benchmark(
                    'Bun.JSONL.parse',
                    () => {
                        (Bun as any).JSONL.parse(jsonlData);
                    },
                    BENCHMARK_ITERATIONS.jsonl
                );
                
                console.log(`📊 ${result.name}: ${result.time.toFixed(2)}ms (${result.opsPerSecond.toLocaleString()} ops/sec)`);
                expect(result.opsPerSecond).toBeGreaterThan(10);
            } else {
                console.log('⚠️  JSONL not available - skipping benchmark');
            }
        });

        it('should benchmark wrapAnsi', () => {
            if ('wrapAnsi' in Bun) {
                const coloredText = '\x1b[32m🚀 Bun v1.3.7 Performance Test\x1b[0m with \x1b[31mred highlights\x1b[0m';
                
                const result = benchmark(
                    'Bun.wrapAnsi',
                    () => {
                        (Bun as any).wrapAnsi(coloredText, { width: 40 });
                    },
                    BENCHMARK_ITERATIONS.wrapAnsi
                );
                
                console.log(`📊 ${result.name}: ${result.time.toFixed(2)}ms (${result.opsPerSecond.toLocaleString()} ops/sec)`);
                expect(result.opsPerSecond).toBeGreaterThan(1000);
            } else {
                console.log('⚠️  wrapAnsi not available - skipping benchmark');
            }
        });
    });

    describe('Async Performance', () => {
        it('should benchmark async/await streaming', async () => {
            async function* jsonlGenerator() {
                for(let i = 0; i < 100; i++) {
                    yield JSON.stringify({ id: i, name: `item-${i}`, timestamp: Date.now() });
                }
            }
            
            const start = performance.now();
            let count = 0;
            
            if ('JSONL' in Bun) {
                for await(const line of (Bun as any).JSONL.parse(jsonlGenerator())) {
                    count++;
                    line.id; // access to prevent optimization
                }
            } else {
                // Fallback test
                for await(const line of jsonlGenerator()) {
                    count++;
                    JSON.parse(line);
                }
            }
            
            const end = performance.now();
            const time = end - start;
            
            console.log(`📊 Async streaming (100 items): ${time.toFixed(2)}ms`);
            expect(count).toBe(100);
            expect(time).toBeLessThan(1000); // Should complete quickly
        });
    });

    describe('Memory Performance', () => {
        it('should benchmark memory allocation patterns', () => {
            const initialMemory = process.memoryUsage();
            
            // Buffer allocation pattern
            const buffers: Buffer[] = [];
            for(let i = 0; i < 1000; i++) {
                buffers.push(Buffer.alloc(1024, i % 256));
            }
            
            const afterBuffersMemory = process.memoryUsage();
            
            // Clean up
            buffers.length = 0;
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            const finalMemory = process.memoryUsage();
            
            console.log(`📊 Memory usage:`);
            console.log(`   Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
            console.log(`   After buffers: ${(afterBuffersMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
            console.log(`   Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
            
            // Memory should not grow excessively
            const memoryGrowth = afterBuffersMemory.heapUsed - initialMemory.heapUsed;
            expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB growth
        });
    });

    describe('Performance Regression Tests', () => {
        it('should maintain minimum performance thresholds', () => {
            // Define minimum performance expectations
            const thresholds = {
                'Buffer.from(array)': 1000,      // ops/sec
                'String.padStart': 100000,       // ops/sec
                'Array.flat(3)': 1000,           // ops/sec
                'Array.from(arguments)': 10000,  // ops/sec
                'Buffer.swap16': 100000,         // ops/sec
                'Buffer.swap64': 50000,          // ops/sec
            };
            
            const results: BenchmarkResult[] = [];
            
            // Run quick benchmarks
            results.push(benchmark('Buffer.from(array)', () => {
                Buffer.from([1, 2, 3, 4]);
            }, 1000));
            
            results.push(benchmark('String.padStart', () => {
                'test'.padStart(10, '0');
            }, 10000));
            
            results.push(benchmark('Array.flat(3)', () => {
                [[1, [2, 3]]].flat(2);
            }, 1000));
            
            results.push(benchmark('Array.from(arguments)', () => {
                (function() { return Array.from(arguments); })(1, 2, 3);
            }, 10000));
            
            // Check thresholds
            for (const result of results) {
                const threshold = thresholds[result.name as keyof typeof thresholds];
                if (threshold) {
                    expect(result.opsPerSecond).toBeGreaterThan(threshold);
                    console.log(`✅ ${result.name}: ${result.opsPerSecond.toLocaleString()} ops/sec (threshold: ${threshold.toLocaleString()})`);
                }
            }
        });
    });

    describe('Platform-Specific Performance', () => {
        it('should report ARM64 performance gains', () => {
            const isARM64 = process.arch === 'arm64';
            
            if (isARM64) {
                console.log('🚀 ARM64 platform detected - expecting Buffer performance gains');
                
                const result = benchmark('ARM64 Buffer.from', () => {
                    Buffer.from(Array(256).fill(0).map((_, i) => i % 256));
                }, 10000);
                
                console.log(`📊 ARM64 Buffer performance: ${result.opsPerSecond.toLocaleString()} ops/sec`);
                
                // ARM64 should show better performance
                expect(result.opsPerSecond).toBeGreaterThan(5000);
            } else {
                console.log('💻 Non-ARM64 platform - running standard benchmarks');
            }
        });
    });
});
