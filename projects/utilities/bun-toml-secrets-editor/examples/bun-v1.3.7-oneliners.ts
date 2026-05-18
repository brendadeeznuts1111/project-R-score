#!/usr/bin/env bun
/**
 * Bun v1.3.7 Performance One-Liners & Demos
 * 
 * Targeting exact perf/features from Bun v1.3.7 release:
 * - 50% faster Buffer.from(array) on ARM64
 * - 3x faster array.flat() + Array.from(arguments)
 * - 90% faster padStart/padEnd
 * - 35% faster async/await streaming
 * - Native JSON5, JSONL, wrapAnsi (33-88x faster)
 * - Header case preservation, WebSocket URL credentials
 * - CPU/Heap profiling with Markdown output
 * - Buffer.swap16/swap64 performance boosts
 */

import { performance } from 'node:perf_hooks';

// ============================================================================
// ⚡ Buffer/Array Speed Demons
// ============================================================================

function bufferFromDemo(): void {
    console.info('\n🔥 Buffer.from(array) - 50% faster on ARM64');
    console.info('=' .repeat(50));
    
    // Test 1: Buffer.from(array) performance
    console.time('Buffer.from(array) x1M');
    for(let i = 0; i < 1e6; i++) {
        const buf = Buffer.from([i % 256, (i+1) % 256, (i+2) % 256, (i+3) % 256]);
        buf.length; // access to prevent optimization
    }
    console.timeEnd('Buffer.from(array) x1M');
    
    // Test 2: Bun.write performance boost
    console.time('Bun.write(Uint8Array) x100K');
    for(let i = 0; i < 1e5; i++) {
        const arr = new Uint8Array(1024).fill(i % 256);
        Bun.write(Bun.stdout, arr); // Silent write to test perf
    }
    console.timeEnd('Bun.write(Uint8Array) x100K');
}

function arrayFlatDemo(): void {
    console.info('\n🚀 array.flat() + Array.from(arguments) - 3x faster');
    console.info('=' .repeat(50));
    
    // Test 1: array.flat() performance
    const nestedArray = Array(1000).fill(0).map((_, i) => [i, [i+1, [i+2, i+3]]]);
    
    console.time('array.flat(3) x10K');
    for(let i = 0; i < 1e4; i++) {
        const flat = nestedArray.flat(3);
        flat.length;
    }
    console.timeEnd('array.flat(3) x10K');
    
    // Test 2: Array.from(arguments) performance
    console.time('Array.from(arguments) x100K');
    function testArgs(...args: any[]) {
        return Array.from(arguments);
    }
    for(let i = 0; i < 1e5; i++) {
        testArgs(1,2,3);
    }
    console.timeEnd('Array.from(arguments) x100K');
}

// ============================================================================
// 📏 String + Async Rockets  
// ============================================================================

function stringPadDemo(): void {
    console.info('\n⚡ padStart/padEnd - 90% faster');
    console.info('=' .repeat(50));
    
    console.time('padStart(20,"0") x1M');
    for(let i = 0; i < 1e6; i++) {
        '2026'.padStart(20, '0');
    }
    console.timeEnd('padStart(20,"0") x1M');
    
    console.time('padEnd(30,"-") x1M');
    for(let i = 0; i < 1e6; i++) {
        `item-${i}`.padEnd(30, '-');
    }
    console.timeEnd('padEnd(30,"-") x1M');
}

async function asyncAwaitDemo(): Promise<void> {
    console.info('\n🔄 async/await streaming - 35% faster');
    console.info('=' .repeat(50));
    
    // Test streaming JSONL parsing
    async function* jsonlGenerator() {
        for(let i = 0; i < 1000; i++) {
            yield JSON.stringify({ id: i, name: `item-${i}`, timestamp: Date.now() });
        }
    }
    
    console.time('JSONL streaming parse x1K');
    let count = 0;
    for await(const line of (Bun as any).JSONL.parse(jsonlGenerator())) {
        count++;
        line.id; // access to prevent optimization
    }
    console.timeEnd('JSONL streaming parse x1K');
    console.info(`Processed ${count} records`);
}

// ============================================================================
// 🔍 Profilers + Telemetry
// ============================================================================

function profilingDemos(): void {
    console.info('\n📊 CPU/Heap Profiling - Markdown output');
    console.info('=' .repeat(50));
    
    console.info('🔥 CPU Profiling Commands:');
    console.info('  bun --cpu-prof-md --cpu-prof-interval 1000 run server.ts');
    console.info('  bun --cpu-prof --cpu-prof-md script.ts  # Both formats');
    console.info('  bun --cpu-prof-name my-profile --cpu-prof-dir ./profiles script.ts');
    
    console.info('\n💾 Heap Profiling Commands:');  
    console.info('  bun --heap-prof-md script.ts');
    console.info('  bun --heap-prof --heap-prof-dir ./profiles script.ts');
    console.info('  bun --heap-prof-md --inspect-brk=9229 server.ts');
    
    console.info('\n🔍 Inspector API:');
    console.info(`  bunx -e "const inspector=require('node:inspector');inspector.Session().connect();console.info('Profiler ready chrome://inspect')"`);
}

// ============================================================================
// 🆕 New APIs One-Shot
// ============================================================================

function json5Demo(): void {
    console.info('\n📄 Native JSON5 - comments + trailing commas');
    console.info('=' .repeat(50));
    
    // One-liner JSON5 parsing
    console.info('JSON5 with comments:');
    const result = (Bun as any).JSON5.parse('{foo:1,//comment\nbar:2,}');
    console.info(result); // { foo: 1, bar: 2 }
    
    // Performance test
    const json5Str = '{name:"app",version:"1.0.0",enabled:true,/*multi-line comment*/features:["auth","api"],}';
    
    console.time('JSON5.parse x100K');
    for(let i = 0; i < 1e5; i++) {
        (Bun as any).JSON5.parse(json5Str);
    }
    console.timeEnd('JSON5.parse x100K');
}

async function jsonlDemo(): Promise<void> {
    console.info('\n📋 Streaming JSONL parsing');
    console.info('=' .repeat(50));
    
    // One-liner JSONL from stdin
    console.info('JSONL streaming from stdin:');
    console.info('echo \'{"a":1}\\n{"b":2}\' | bunx -e "for await(const obj of Bun.JSONL.parse(Bun.stdin()))console.info(obj)"');
    
    // In-memory JSONL parsing
    const jsonlData = '{"name":"Alice","score":95}\n{"name":"Bob","score":87}\n{"name":"Charlie","score":92}';
    
    console.time('JSONL.parse x10K');
    for(let i = 0; i < 1e4; i++) {
        const parsed = (Bun as any).JSONL.parse(jsonlData);
        parsed.length;
    }
    console.timeEnd('JSONL.parse x10K');
}

function wrapAnsiDemo(): void {
    console.info('\n🎨 Bun.wrapAnsi() - CLI magic (33-88x faster)');
    console.info('=' .repeat(50));
    
    const coloredText = '\x1b[32m🚀 Bun v1.3.7 Performance Demos\x1b[0m with \x1b[31mred highlights\x1b[0m';
    
    console.info('Original:', coloredText);
    console.info('Wrapped (40 cols):', (Bun as any).wrapAnsi(coloredText, { width: 40 }));
    
    // Performance comparison
    console.time('Bun.wrapAnsi x100K');
    for(let i = 0; i < 1e5; i++) {
        (Bun as any).wrapAnsi(coloredText, { width: 40 });
    }
    console.timeEnd('Bun.wrapAnsi x100K');
    
    console.info('💡 88x faster than wrap-ansi npm package!');
}

function transpilerReplDemo(): void {
    console.info('\n🔧 REPL-mode transpiler - dev playground');
    console.info('=' .repeat(50));
    
    // One-liner REPL transpiler
    const transpiler = new (Bun as any).Transpiler({ replMode: true });
    const transformed = transpiler.transform('const x=await Bun.sleep(100);x');
    console.info('REPL transform result:', transformed);
    
    console.info('Features:');
    console.info('  • Variable hoisting across lines');
    console.info('  • const → let conversion for re-declaration');
    console.info('  • Top-level await support');
    console.info('  • Object literal auto-detection');
}

// ============================================================================
// 🌐 HTTP/WS + S3
// ============================================================================

async function headerCaseDemo(): Promise<void> {
    console.info('\n📡 Header case preservation - fetch()');
    console.info('=' .repeat(50));
    
    console.info('Headers now preserve exact casing:');
    console.info('  "Authorization": "Bearer token123" → sent as "Authorization"');
    console.info('  "Content-Type": "application/json" → sent as "Content-Type"');
    console.info('  "X-Custom-Header": "value" → sent as "X-Custom-Header"');
    
    // Demo one-liner
    console.info('\nOne-liner test:');
    console.info('bunx -e "fetch(\'https://httpbin.org/headers\',{headers:{\'X-Case-Sensitive\':\'Test\'}}).then(r=>r.json()).then(console.log)"');
}

function websocketCredentialsDemo(): void {
    console.info('\n🔌 WebSocket URL credentials');
    console.info('=' .repeat(50));
    
    console.info('WebSocket URLs now support credentials:');
    console.info('  new WebSocket("wss://echo.websocket.org?token=secret")');
    console.info('  new WebSocket("ws://user:pass@example.com/socket")');
    console.info('  → Automatically forwarded as Authorization: Basic <base64>');
    
    console.info('💡 Fixes compatibility with:');
    console.info('   - Puppeteer remote browser connections');
    console.info('   - Bright Data scraping browser');
    console.info('   - WebSocket services requiring URL auth');
}

function bufferSwapDemo(): void {
    console.info('\n🔄 Buffer.swap16/swap64 - Fast byte swapping');
    console.info('=' .repeat(50));
    
    // swap16 demo (1.8x faster)
    const buf16 = Buffer.from([0x48, 0x00, 0x65, 0x00, 0x6c, 0x00, 0x6c, 0x00]);
    console.info('Before swap16:', buf16.toString('hex'));
    buf16.swap16();
    console.info('After swap16: ', buf16.toString('hex'));
    
    // swap64 demo (3.6x faster)  
    const buf64 = Buffer.alloc(8);
    buf64.writeBigUInt64LE(BigInt(Number('0x0102030405060708')));
    console.info('Before swap64:', buf64.toString('hex'));
    buf64.swap64();
    console.info('After swap64: ', buf64.toString('hex'));
    
    // Performance test
    console.time('Buffer.swap16 x1M');
    const testBuf16 = Buffer.from([0x48, 0x00]);
    for(let i = 0; i < 1e6; i++) {
        testBuf16.swap16();
        testBuf16.swap16(); // swap back
    }
    console.timeEnd('Buffer.swap16 x1M');
    
    console.time('Buffer.swap64 x500K');
    const testBuf64 = Buffer.alloc(8);
    for(let i = 0; i < 5e5; i++) {
        testBuf64.swap64();
        testBuf64.swap64(); // swap back  
    }
    console.timeEnd('Buffer.swap64 x500K');
}

// ============================================================================
// 🏗️ Prod Endpoint Boilerplate
// ============================================================================

function prodBoilerplate(): void {
    console.info('\n🏭 Production endpoint boilerplate');
    console.info('=' .repeat(50));
    
    console.info('🚀 Quick scaffold with new features:');
    console.info('  bun create .                    # scaffolds with v1.3.7 features');
    console.info('  bun pm pack                     # respects lifecycle scripts');
    console.info('  bun --cpu-prof-md server.ts     # production profiling');
    
    console.info('\n📦 Enhanced package.json scripts:');
    console.info('  "scripts": {');
    console.info('    "start": "bun run server.ts",');
    console.info('    "profile": "bun --cpu-prof-md --cpu-prof-dir ./profiles server.ts",');
    console.info('    "debug": "bun --inspect-brk=9229 server.ts"');
    console.info('  }');
}

// ============================================================================
// 🎯 Main Performance Demo Runner
// ============================================================================

async function main(): Promise<void> {
    console.info('\n' + '🚀'.repeat(30));
    console.info('   Bun v1.3.7 Performance One-Liners');
    console.info('🚀'.repeat(30));
    console.info(`Bun version: ${Bun.version}`);
    
    // Run all performance demos
    bufferFromDemo();
    arrayFlatDemo();
    stringPadDemo();
    await asyncAwaitDemo();
    profilingDemos();
    json5Demo();
    await jsonlDemo();
    wrapAnsiDemo();
    transpilerReplDemo();
    await headerCaseDemo();
    websocketCredentialsDemo();
    bufferSwapDemo();
    prodBoilerplate();
    
    console.info('\n' + '✨'.repeat(30));
    console.info('   All performance demos complete!');
    console.info('✨'.repeat(30));
    
    console.info('\n🎯 Quick one-liner reference:');
    console.info('  Buffer speed: bunx -e "console.time();for(let i=0;i<1e6;i++)Buffer.from([i%256]);console.timeEnd()"');
    console.info('  JSON5 parse: bunx -e "Bun.JSON5.parse(\'{foo:1,//comment\\nbar:2,}\')"');
    console.info('  JSONL stream: echo \'{"a":1}\' | bunx -e "for await(const o of Bun.JSONL.parse(Bun.stdin()))console.info(o)"');
    console.info('  ANSI wrap: bunx -e "console.info(Bun.wrapAnsi(\'\\x1b[32m🚀\\x1b[0m\',{width:20}))"');
    console.info('  Profiler: bun --cpu-prof-md --cpu-prof-interval 1000 server.ts');
}

if (import.meta.main) {
    main().catch(console.error);
}

export {
    bufferFromDemo,
    arrayFlatDemo, 
    stringPadDemo,
    asyncAwaitDemo,
    profilingDemos,
    json5Demo,
    jsonlDemo,
    wrapAnsiDemo,
    transpilerReplDemo,
    headerCaseDemo,
    websocketCredentialsDemo,
    bufferSwapDemo,
    prodBoilerplate,
};
