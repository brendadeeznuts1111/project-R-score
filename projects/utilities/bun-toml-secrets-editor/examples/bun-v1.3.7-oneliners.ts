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
    console.log('\n🔥 Buffer.from(array) - 50% faster on ARM64');
    console.log('=' .repeat(50));
    
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
    console.log('\n🚀 array.flat() + Array.from(arguments) - 3x faster');
    console.log('=' .repeat(50));
    
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
    console.log('\n⚡ padStart/padEnd - 90% faster');
    console.log('=' .repeat(50));
    
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
    console.log('\n🔄 async/await streaming - 35% faster');
    console.log('=' .repeat(50));
    
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
    console.log(`Processed ${count} records`);
}

// ============================================================================
// 🔍 Profilers + Telemetry
// ============================================================================

function profilingDemos(): void {
    console.log('\n📊 CPU/Heap Profiling - Markdown output');
    console.log('=' .repeat(50));
    
    console.log('🔥 CPU Profiling Commands:');
    console.log('  bun --cpu-prof-md --cpu-prof-interval 1000 run server.ts');
    console.log('  bun --cpu-prof --cpu-prof-md script.ts  # Both formats');
    console.log('  bun --cpu-prof-name my-profile --cpu-prof-dir ./profiles script.ts');
    
    console.log('\n💾 Heap Profiling Commands:');  
    console.log('  bun --heap-prof-md script.ts');
    console.log('  bun --heap-prof --heap-prof-dir ./profiles script.ts');
    console.log('  bun --heap-prof-md --inspect-brk=9229 server.ts');
    
    console.log('\n🔍 Inspector API:');
    console.log(`  bunx -e "const inspector=require('node:inspector');inspector.Session().connect();console.log('Profiler ready chrome://inspect')"`);
}

// ============================================================================
// 🆕 New APIs One-Shot
// ============================================================================

function json5Demo(): void {
    console.log('\n📄 Native JSON5 - comments + trailing commas');
    console.log('=' .repeat(50));
    
    // One-liner JSON5 parsing
    console.log('JSON5 with comments:');
    const result = (Bun as any).JSON5.parse('{foo:1,//comment\nbar:2,}');
    console.log(result); // { foo: 1, bar: 2 }
    
    // Performance test
    const json5Str = '{name:"app",version:"1.0.0",enabled:true,/*multi-line comment*/features:["auth","api"],}';
    
    console.time('JSON5.parse x100K');
    for(let i = 0; i < 1e5; i++) {
        (Bun as any).JSON5.parse(json5Str);
    }
    console.timeEnd('JSON5.parse x100K');
}

async function jsonlDemo(): Promise<void> {
    console.log('\n📋 Streaming JSONL parsing');
    console.log('=' .repeat(50));
    
    // One-liner JSONL from stdin
    console.log('JSONL streaming from stdin:');
    console.log('echo \'{"a":1}\\n{"b":2}\' | bunx -e "for await(const obj of Bun.JSONL.parse(Bun.stdin()))console.log(obj)"');
    
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
    console.log('\n🎨 Bun.wrapAnsi() - CLI magic (33-88x faster)');
    console.log('=' .repeat(50));
    
    const coloredText = '\x1b[32m🚀 Bun v1.3.7 Performance Demos\x1b[0m with \x1b[31mred highlights\x1b[0m';
    
    console.log('Original:', coloredText);
    console.log('Wrapped (40 cols):', (Bun as any).wrapAnsi(coloredText, { width: 40 }));
    
    // Performance comparison
    console.time('Bun.wrapAnsi x100K');
    for(let i = 0; i < 1e5; i++) {
        (Bun as any).wrapAnsi(coloredText, { width: 40 });
    }
    console.timeEnd('Bun.wrapAnsi x100K');
    
    console.log('💡 88x faster than wrap-ansi npm package!');
}

function transpilerReplDemo(): void {
    console.log('\n🔧 REPL-mode transpiler - dev playground');
    console.log('=' .repeat(50));
    
    // One-liner REPL transpiler
    const transpiler = new (Bun as any).Transpiler({ replMode: true });
    const transformed = transpiler.transform('const x=await Bun.sleep(100);x');
    console.log('REPL transform result:', transformed);
    
    console.log('Features:');
    console.log('  • Variable hoisting across lines');
    console.log('  • const → let conversion for re-declaration');
    console.log('  • Top-level await support');
    console.log('  • Object literal auto-detection');
}

// ============================================================================
// 🌐 HTTP/WS + S3
// ============================================================================

async function headerCaseDemo(): Promise<void> {
    console.log('\n📡 Header case preservation - fetch()');
    console.log('=' .repeat(50));
    
    console.log('Headers now preserve exact casing:');
    console.log('  "Authorization": "Bearer token123" → sent as "Authorization"');
    console.log('  "Content-Type": "application/json" → sent as "Content-Type"');
    console.log('  "X-Custom-Header": "value" → sent as "X-Custom-Header"');
    
    // Demo one-liner
    console.log('\nOne-liner test:');
    console.log('bunx -e "fetch(\'https://httpbin.org/headers\',{headers:{\'X-Case-Sensitive\':\'Test\'}}).then(r=>r.json()).then(console.log)"');
}

function websocketCredentialsDemo(): void {
    console.log('\n🔌 WebSocket URL credentials');
    console.log('=' .repeat(50));
    
    console.log('WebSocket URLs now support credentials:');
    console.log('  new WebSocket("wss://echo.websocket.org?token=secret")');
    console.log('  new WebSocket("ws://user:pass@example.com/socket")');
    console.log('  → Automatically forwarded as Authorization: Basic <base64>');
    
    console.log('💡 Fixes compatibility with:');
    console.log('   - Puppeteer remote browser connections');
    console.log('   - Bright Data scraping browser');
    console.log('   - WebSocket services requiring URL auth');
}

function bufferSwapDemo(): void {
    console.log('\n🔄 Buffer.swap16/swap64 - Fast byte swapping');
    console.log('=' .repeat(50));
    
    // swap16 demo (1.8x faster)
    const buf16 = Buffer.from([0x48, 0x00, 0x65, 0x00, 0x6c, 0x00, 0x6c, 0x00]);
    console.log('Before swap16:', buf16.toString('hex'));
    buf16.swap16();
    console.log('After swap16: ', buf16.toString('hex'));
    
    // swap64 demo (3.6x faster)  
    const buf64 = Buffer.alloc(8);
    buf64.writeBigUInt64LE(BigInt(Number('0x0102030405060708')));
    console.log('Before swap64:', buf64.toString('hex'));
    buf64.swap64();
    console.log('After swap64: ', buf64.toString('hex'));
    
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
    console.log('\n🏭 Production endpoint boilerplate');
    console.log('=' .repeat(50));
    
    console.log('🚀 Quick scaffold with new features:');
    console.log('  bun create .                    # scaffolds with v1.3.7 features');
    console.log('  bun pm pack                     # respects lifecycle scripts');
    console.log('  bun --cpu-prof-md server.ts     # production profiling');
    
    console.log('\n📦 Enhanced package.json scripts:');
    console.log('  "scripts": {');
    console.log('    "start": "bun run server.ts",');
    console.log('    "profile": "bun --cpu-prof-md --cpu-prof-dir ./profiles server.ts",');
    console.log('    "debug": "bun --inspect-brk=9229 server.ts"');
    console.log('  }');
}

// ============================================================================
// 🎯 Main Performance Demo Runner
// ============================================================================

async function main(): Promise<void> {
    console.log('\n' + '🚀'.repeat(30));
    console.log('   Bun v1.3.7 Performance One-Liners');
    console.log('🚀'.repeat(30));
    console.log(`Bun version: ${Bun.version}`);
    
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
    
    console.log('\n' + '✨'.repeat(30));
    console.log('   All performance demos complete!');
    console.log('✨'.repeat(30));
    
    console.log('\n🎯 Quick one-liner reference:');
    console.log('  Buffer speed: bunx -e "console.time();for(let i=0;i<1e6;i++)Buffer.from([i%256]);console.timeEnd()"');
    console.log('  JSON5 parse: bunx -e "Bun.JSON5.parse(\'{foo:1,//comment\\nbar:2,}\')"');
    console.log('  JSONL stream: echo \'{"a":1}\' | bunx -e "for await(const o of Bun.JSONL.parse(Bun.stdin()))console.log(o)"');
    console.log('  ANSI wrap: bunx -e "console.log(Bun.wrapAnsi(\'\\x1b[32m🚀\\x1b[0m\',{width:20}))"');
    console.log('  Profiler: bun --cpu-prof-md --cpu-prof-interval 1000 server.ts');
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
