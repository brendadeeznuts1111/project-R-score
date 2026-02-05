#!/usr/bin/env bun
/**
 * Bun v1.3.7 Performance Benchmarks
 * 
 * Focused benchmarks for the exact performance improvements in v1.3.7:
 * - 50% faster Buffer.from(array) on ARM64
 * - 3x faster array.flat() + Array.from(arguments)  
 * - 90% faster padStart/padEnd
 * - 35% faster async/await streaming
 * - 88x faster Bun.wrapAnsi() vs wrap-ansi npm
 * - 1.8x faster Buffer.swap16, 3.6x faster Buffer.swap64
 * - 5.2-5.4x faster String.isWellFormed/toWellFormed
 */

import { performance } from 'node:perf_hooks';

// Benchmark utilities
function benchmark(name: string, fn: () => void, iterations: number = 1e6): number {
    // Warm up
    for(let i = 0; i < 1000; i++) fn();
    
    const start = performance.now();
    for(let i = 0; i < iterations; i++) fn();
    const end = performance.now();
    
    const duration = end - start;
    const opsPerSec = (iterations / duration * 1000).toFixed(0);
    
    console.log(`${name.padEnd(40)} ${duration.toFixed(2)}ms (${opsPerSec} ops/sec)`);
    return duration;
}

function compareBenchmarks(name: string, oldFn: () => void, newFn: () => void, iterations: number = 1e6): void {
    console.log(`\n📊 ${name}`);
    console.log('-'.repeat(60));
    
    const oldTime = benchmark('Old implementation:', oldFn, iterations);
    const newTime = benchmark('New implementation:', newFn, iterations);
    
    const speedup = (oldTime / newTime).toFixed(2);
    const improvement = ((oldTime - newTime) / oldTime * 100).toFixed(1);
    
    console.log(`${'Speedup:'.padEnd(40)} ${speedup}x (${improvement}% faster)`);
}

// ============================================================================
// ⚡ Buffer/Array Performance
// ============================================================================

function benchmarkBufferFrom(): void {
    console.log('\n🔥 Buffer.from(array) Performance');
    console.log('='.repeat(60));
    
    const testData = Array(256).fill(0).map((_, i) => i % 256);
    
    benchmark('Buffer.from(array)', () => {
        const buf = Buffer.from(testData);
        buf.length;
    }, 1e5);
    
    benchmark('Buffer.from(Uint8Array)', () => {
        const buf = Buffer.from(new Uint8Array(testData));
        buf.length;
    }, 1e5);
    
    benchmark('new Uint8Array(1024)', () => {
        const arr = new Uint8Array(1024).fill(42);
        arr.length;
    }, 1e6);
    
    console.log('\n💡 ARM64 systems see ~50% improvement in Buffer.from(array)');
}

function benchmarkArrayFlat(): void {
    console.log('\n🚀 Array.flat() + Array.from(arguments)');
    console.log('='.repeat(60));
    
    // Test array.flat() performance
    const nestedArray = Array(100).fill(0).map((_, i) => [
        i, 
        [i+1, [i+2, i+3]],
        [[i+4, i+5], [i+6, [i+7, i+8]]]
    ]);
    
    benchmark('array.flat(1)', () => {
        const flat = nestedArray.flat(1);
        flat.length;
    }, 1e5);
    
    benchmark('array.flat(2)', () => {
        const flat = nestedArray.flat(2);
        flat.length;
    }, 1e5);
    
    benchmark('array.flat(3)', () => {
        const flat = nestedArray.flat(3);
        flat.length;
    }, 1e5);
    
    // Test Array.from(arguments)
    function testFromArgs(...args: any[]) {
        return Array.from(args);
    }
    
    benchmark('Array.from(arguments)', () => {
        testFromArgs(1, 2, 3, 4, 5);
    }, 1e6);
    
    console.log('\n💡 ~3x faster array.flat() and Array.from(arguments)');
}

// ============================================================================
// 📏 String Performance
// ============================================================================

function benchmarkStringPadding(): void {
    console.log('\n⚡ String Padding Performance');
    console.log('='.repeat(60));
    
    benchmark('padStart(20, "0")', () => {
        '2026'.padStart(20, '0');
    }, 1e6);
    
    benchmark('padEnd(30, "-")', () => {
        `item-${Math.random()}`.padEnd(30, '-');
    }, 1e6);
    
    benchmark('padStart with emoji', () => {
        '🚀'.padStart(10, ' ');
    }, 1e6);
    
    benchmark('complex padStart', () => {
        `ID-${Math.floor(Math.random() * 10000)}`.padStart(15, '0');
    }, 1e6);
    
    console.log('\n💡 ~90% faster padStart/padEnd operations');
}

function benchmarkStringWellFormed(): void {
    console.log('\n✅ String.isWellFormed/toWellFormed');
    console.log('='.repeat(60));
    
    const validString = 'Hello, 世界! 🌍';
    const invalidString = 'Hello, \uD800World!'; // Invalid surrogate pair
    
    benchmark('String.isWellFormed (valid)', () => {
        (validString as any).isWellFormed();
    }, 1e6);
    
    benchmark('String.isWellFormed (invalid)', () => {
        (invalidString as any).isWellFormed();
    }, 1e6);
    
    benchmark('String.toWellFormed (valid)', () => {
        (validString as any).toWellFormed();
    }, 1e6);
    
    benchmark('String.toWellFormed (invalid)', () => {
        (invalidString as any).toWellFormed();
    }, 1e6);
    
    console.log('\n💡 5.2-5.4x faster than previous implementation');
}

// ============================================================================
// 🔄 Async/Await Streaming
// ============================================================================

async function benchmarkAsyncStreaming(): Promise<void> {
    console.log('\n🔄 Async/Await Streaming Performance');
    console.log('='.repeat(60));
    
    // Generate test data
    const testData = Array(10000).fill(0).map((_, i) => ({
        id: i,
        name: `item-${i}`,
        timestamp: Date.now(),
        data: new Array(10).fill(0).map(() => Math.random())
    }));
    
    // Test 1: JSONL streaming
    async function* jsonlGenerator() {
        for(const item of testData) {
            yield JSON.stringify(item);
        }
    }
    
    const jsonlStart = performance.now();
    let count = 0;
    for await(const line of (Bun as any).JSONL.parse(jsonlGenerator())) {
        count++;
        if (count % 1000 === 0) {
            // Prevent over-optimization
            line.id;
        }
    }
    const jsonlEnd = performance.now();
    
    console.log(`JSONL streaming (${count} records)`.padEnd(40) + `${(jsonlEnd - jsonlStart).toFixed(2)}ms`);
    
    // Test 2: Regular async iteration
    async function* regularGenerator() {
        for(const item of testData) {
            yield item;
        }
    }
    
    const regularStart = performance.now();
    count = 0;
    for await(const item of regularGenerator()) {
        count++;
        if (count % 1000 === 0) {
            item.id;
        }
    }
    const regularEnd = performance.now();
    
    console.log(`Regular async iteration (${count} records)`.padEnd(40) + `${(regularEnd - regularStart).toFixed(2)}ms`);
    
    console.log('\n💡 ~35% faster async/await streaming operations');
}

// ============================================================================
// 🎨 ANSI Wrapping Performance
// ============================================================================

function benchmarkWrapAnsi(): void {
    console.log('\n🎨 Bun.wrapAnsi() Performance');
    console.log('='.repeat(60));
    
    const coloredText = '\x1b[32m🚀 Bun v1.3.7 Performance Test\x1b[0m with \x1b[31mred highlights\x1b[0m and \x1b[34mblue text\x1b[0m';
    const longColoredText = coloredText.repeat(10);
    
    benchmark('Bun.wrapAnsi (short, width=40)', () => {
        (Bun as any).wrapAnsi(coloredText, { width: 40 });
    }, 1e5);
    
    benchmark('Bun.wrapAnsi (long, width=40)', () => {
        (Bun as any).wrapAnsi(longColoredText, { width: 40 });
    }, 1e4);
    
    benchmark('Bun.wrapAnsi (hard wrap)', () => {
        (Bun as any).wrapAnsi(coloredText, { width: 20, hard: true });
    }, 1e5);
    
    benchmark('Bun.wrapAnsi (no trim)', () => {
        (Bun as any).wrapAnsi(`   ${coloredText}   `, { width: 40, trim: false });
    }, 1e5);
    
    console.log('\n💡 33-88x faster than wrap-ansi npm package');
}

// ============================================================================
// 🔄 Buffer Byte Swapping
// ============================================================================

function benchmarkBufferSwapping(): void {
    console.log('\n🔄 Buffer Byte Swapping Performance');
    console.log('='.repeat(60));
    
    // swap16 benchmark
    const buf16 = Buffer.from([0x48, 0x00, 0x65, 0x00, 0x6c, 0x00, 0x6c, 0x00]);
    
    benchmark('Buffer.swap16()', () => {
        buf16.swap16();
        buf16.swap16(); // swap back for next iteration
    }, 1e6);
    
    // swap64 benchmark
    const buf64 = Buffer.alloc(8);
    buf64.writeBigUInt64LE(BigInt(Number('0x0102030405060708')));
    
    benchmark('Buffer.swap64()', () => {
        buf64.swap64();
        buf64.swap64(); // swap back for next iteration
    }, 5e5);
    
    // Compare with manual swapping
    benchmark('Manual swap16 (for comparison)', () => {
        for(let i = 0; i < buf16.length; i += 2) {
            const temp = buf16[i];
            buf16[i] = buf16[i + 1];
            buf16[i + 1] = temp;
        }
        // Swap back
        for(let i = 0; i < buf16.length; i += 2) {
            const temp = buf16[i];
            buf16[i] = buf16[i + 1];
            buf16[i + 1] = temp;
        }
    }, 1e6);
    
    console.log('\n💡 swap16: 1.8x faster, swap64: 3.6x faster');
}

// ============================================================================
// 📄 JSON5/JSONL Performance
// ============================================================================

function benchmarkJSON5(): void {
    console.log('\n📄 JSON5 Performance');
    console.log('='.repeat(60));
    
    const simpleJSON5 = '{name:"app",version:"1.0.0",enabled:true,}';
    const complexJSON5 = `{
        // Application configuration
        name: 'my-app',
        version: "1.0.0",
        port: 3000,
        enabled: true,
        /* Multi-line comment explaining features */
        features: ['auth', 'api', 'websocket',],
        settings: {
            debug: false,
            retryCount: 0x5,
            timeout: 5000,
        },
    }`;
    
    benchmark('JSON5.parse (simple)', () => {
        (Bun as any).JSON5.parse(simpleJSON5);
    }, 1e5);
    
    benchmark('JSON5.parse (complex)', () => {
        (Bun as any).JSON5.parse(complexJSON5);
    }, 1e4);
    
    benchmark('JSON5.stringify', () => {
        const obj = { name: 'app', version: '1.0.0', features: ['auth', 'api'] };
        (Bun as any).JSON5.stringify(obj);
    }, 1e5);
    
    console.log('\n💡 Native JSON5 parsing - no external dependencies needed');
}

function benchmarkJSONL(): void {
    console.log('\n📋 JSONL Performance');
    console.log('='.repeat(60));
    
    const jsonlData = Array(1000).fill(0).map((_, i) => 
        JSON.stringify({ id: i, name: `item-${i}`, value: Math.random() })
    ).join('\n');
    
    benchmark('JSONL.parse (1K lines)', () => {
        (Bun as any).JSONL.parse(jsonlData);
    }, 1e3);
    
    // Test chunk parsing
    const chunk = jsonlData.slice(0, 1000);
    
    benchmark('JSONL.parseChunk', () => {
        (Bun as any).JSONL.parseChunk(chunk);
    }, 1e4);
    
    console.log('\n💡 Streaming JSONL parsing for large datasets');
}

// ============================================================================
// 🎯 Main Benchmark Runner
// ============================================================================

async function main(): Promise<void> {
    console.log('\n' + '🏁'.repeat(30));
    console.log('   Bun v1.3.7 Performance Benchmarks');
    console.log('🏁'.repeat(30));
    console.log(`Bun version: ${Bun.version}`);
    console.log(`Node.js version: ${process.version}`);
    console.log(`Platform: ${process.platform} ${process.arch}`);
    console.log(`Date: ${new Date().toISOString()}`);
    
    // Run all benchmarks
    benchmarkBufferFrom();
    benchmarkArrayFlat();
    benchmarkStringPadding();
    benchmarkStringWellFormed();
    await benchmarkAsyncStreaming();
    benchmarkWrapAnsi();
    benchmarkBufferSwapping();
    benchmarkJSON5();
    benchmarkJSONL();
    
    console.log('\n' + '📊'.repeat(30));
    console.log('   Benchmark Summary');
    console.log('📊'.repeat(30));
    
    console.log('\n🔥 Key Performance Improvements in Bun v1.3.7:');
    console.log('  • Buffer.from(array): ~50% faster on ARM64');
    console.log('  • array.flat(): ~3x faster');
    console.log('  • Array.from(arguments): ~3x faster');
    console.log('  • padStart/padEnd: ~90% faster');
    console.log('  • async/await streaming: ~35% faster');
    console.log('  • Bun.wrapAnsi(): 33-88x faster than wrap-ansi npm');
    console.log('  • Buffer.swap16(): 1.8x faster');
    console.log('  • Buffer.swap64(): 3.6x faster');
    console.log('  • String.isWellFormed/toWellFormed: 5.2-5.4x faster');
    
    console.log('\n💡 Run individual benchmarks:');
    console.log('  bun examples/benchmarks/bun-v1.3.7-performance-bench.ts');
    console.log('\n📈 Profile this script:');
    console.log('  bun --cpu-prof-md examples/benchmarks/bun-v1.3.7-performance-bench.ts');
}

if (import.meta.main) {
    main().catch(console.error);
}

export {
    benchmarkBufferFrom,
    benchmarkArrayFlat,
    benchmarkStringPadding,
    benchmarkStringWellFormed,
    benchmarkAsyncStreaming,
    benchmarkWrapAnsi,
    benchmarkBufferSwapping,
    benchmarkJSON5,
    benchmarkJSONL,
};
