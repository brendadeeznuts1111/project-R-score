#!/usr/bin/env bun
/**
 * Bun v1.3.7 Interactive Performance Demo
 * 
 * Run this and interactively test all the new features:
 * bun examples/bun-v1.3.7-interactive-demo.ts
 */

import { createInterface } from "node:readline";

const rl = createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt: string): Promise<string> {
    return new Promise(resolve => rl.question(prompt, resolve));
}

// ============================================================================
// Demo Functions
// ============================================================================

async function demoBufferSpeed(): Promise<void> {
    console.log('\n🔥 Buffer.from(array) - 50% faster on ARM64');
    console.log('='.repeat(50));
    
    console.time('Buffer.from(array) x100K');
    for(let i = 0; i < 1e5; i++) {
        const buf = Buffer.from([i % 256, (i+1) % 256, (i+2) % 256]);
        buf.length;
    }
    console.timeEnd('Buffer.from(array) x100K');
    
    console.log('\n💡 ARM64 systems see ~50% improvement');
    console.log('   Perfect for binary data processing, file I/O, network buffers');
}

async function demoArrayFlat(): Promise<void> {
    console.log('\n🚀 array.flat() - 3x faster');
    console.log('='.repeat(50));
    
    const nested = Array(100).fill(0).map((_, i) => [i, [i+1, [i+2, i+3]]]);
    
    console.time('array.flat(3) x10K');
    for(let i = 0; i < 1e4; i++) {
        const flat = nested.flat(3);
        flat.length;
    }
    console.timeEnd('array.flat(3) x10K');
    
    console.log('\n💡 Great for data processing, API responses, nested structures');
}

async function demoStringPadding(): Promise<void> {
    console.log('\n⚡ padStart/padEnd - 90% faster');
    console.log('='.repeat(50));
    
    console.time('padStart(20,"0") x1M');
    for(let i = 0; i < 1e6; i++) {
        '2026'.padStart(20, '0');
    }
    console.timeEnd('padStart(20,"0") x1M');
    
    console.log('\n💡 Perfect for formatting logs, tables, CLI output');
}

async function demoJSON5(): Promise<void> {
    console.log('\n📄 Native JSON5 - comments + trailing commas');
    console.log('='.repeat(50));
    
    const json5Config = `{
        // App configuration
        name: 'my-bun-app',
        version: "1.0.0",
        port: 3000,
        enabled: true,
        /* Features list */
        features: ['auth', 'api', 'websocket',],  // trailing comma!
        settings: {
            debug: false,
            timeout: 5000,
        }
    }`;
    
    console.log('JSON5 with comments and trailing commas:');
    console.log(json5Config);
    
    const parsed = (Bun as any).JSON5.parse(json5Config);
    console.log('\n✅ Parsed successfully:');
    console.log(JSON.stringify(parsed, null, 2));
    
    console.log('\n💡 No external JSON5 dependency needed!');
}

async function demoJSONL(): Promise<void> {
    console.log('\n📋 Streaming JSONL parsing');
    console.log('='.repeat(50));
    
    // Simulate streaming data
    async function* generateLogs() {
        const events = ['login', 'upload', 'download', 'logout'];
        for(let i = 0; i < 100; i++) {
            yield JSON.stringify({
                timestamp: Date.now(),
                user: `user-${i % 10}`,
                action: events[i % events.length],
                id: i
            });
        }
    }
    
    console.log('Processing streaming JSONL logs...');
    console.time('JSONL streaming parse');
    
    let count = 0;
    for await(const log of (Bun as any).JSONL.parse(generateLogs())) {
        count++;
        if (count <= 3) {
            console.log(`  ${log.user}: ${log.action}`);
        }
    }
    
    console.timeEnd('JSONL streaming parse');
    console.log(`✅ Processed ${count} log entries`);
    
    console.log('\n💡 Perfect for log processing, data pipelines, streaming APIs');
}

async function demoWrapAnsi(): Promise<void> {
    console.log('\n🎨 Bun.wrapAnsi() - CLI magic (33-88x faster)');
    console.log('='.repeat(50));
    
    const coloredText = '\x1b[32m🚀\x1b[0m \x1b[34mBun v1.3.7\x1b[0m \x1b[31mPerformance\x1b[0m \x1b[33mDemo\x1b[0m';
    
    console.log('Original:', coloredText);
    console.log('\nWrapped at different widths:');
    
    for(const width of [20, 30, 40]) {
        const wrapped = (Bun as any).wrapAnsi(coloredText, { width });
        console.log(`Width ${width}: ${wrapped}`);
    }
    
    console.time('Bun.wrapAnsi x100K');
    for(let i = 0; i < 1e5; i++) {
        (Bun as any).wrapAnsi(coloredText, { width: 40 });
    }
    console.timeEnd('Bun.wrapAnsi x100K');
    
    console.log('\n💡 88x faster than wrap-ansi npm package!');
    console.log('   Essential for CLI tools, terminal output, log formatting');
}

async function demoBufferSwapping(): Promise<void> {
    console.log('\n🔄 Buffer.swap16/swap64 - Fast byte swapping');
    console.log('='.repeat(50));
    
    // swap16 demo
    const buf16 = Buffer.from([0x48, 0x00, 0x65, 0x00, 0x6c, 0x00, 0x6c, 0x00]);
    console.log('UTF-16LE "Hell":', buf16.toString('hex'));
    
    buf16.swap16();
    console.log('After swap16:   ', buf16.toString('hex'));
    console.log('As UTF-16BE:     ', buf16.toString('utf16le'));
    
    // Performance test
    console.time('Buffer.swap16 x1M');
    for(let i = 0; i < 1e6; i++) {
        buf16.swap16();
        buf16.swap16(); // swap back
    }
    console.timeEnd('Buffer.swap16 x1M');
    
    // swap64 demo
    const buf64 = Buffer.alloc(8);
    buf64.writeBigUInt64LE(BigInt(Number('0x0102030405060708')));
    console.log('\n64-bit value (LE):', buf64.toString('hex'));
    
    buf64.swap64();
    console.log('After swap64:    ', buf64.toString('hex'));
    console.log('As BE:           ', '0x' + buf64.readBigUInt64BE().toString(16));
    
    console.time('Buffer.swap64 x500K');
    for(let i = 0; i < 5e5; i++) {
        buf64.swap64();
        buf64.swap64(); // swap back
    }
    console.timeEnd('Buffer.swap64 x500K');
    
    console.log('\n💡 swap16: 1.8x faster, swap64: 3.6x faster');
    console.log('   Critical for binary protocols, endianness conversion');
}

async function demoProfiling(): Promise<void> {
    console.log('\n📊 CPU/Heap Profiling - Markdown output');
    console.log('='.repeat(50));
    
    console.log('🔥 CPU Profiling Commands:');
    console.log('  bun --cpu-prof-md script.ts                    # Markdown only');
    console.log('  bun --cpu-prof --cpu-prof-md script.ts         # Both formats');
    console.log('  bun --cpu-prof-interval 1000 script.ts         # Custom interval');
    console.log('  bun --cpu-prof-dir ./profiles script.ts        # Custom directory');
    
    console.log('\n💾 Heap Profiling Commands:');
    console.log('  bun --heap-prof-md script.ts                   # Markdown heap');
    console.log('  bun --heap-prof --heap-prof-dir ./profiles script.ts');
    console.log('  bun --heap-prof-md --inspect-brk=9229 server.ts # With inspector');
    
    console.log('\n🔍 Inspector API:');
    console.log(`  const inspector = require('node:inspector');`);
    console.log(`  const session = new inspector.Session();`);
    console.log(`  session.connect();`);
    console.log(`  // Open chrome://inspect to debug`);
    
    console.log('\n💡 Markdown profiles are searchable and shareable!');
}

async function demoHeaderCase(): Promise<void> {
    console.log('\n📡 Header Case Preservation');
    console.log('='.repeat(50));
    
    console.log('✅ Headers now preserve exact casing in fetch()');
    console.log('\nBefore (Bun < 1.3.7):');
    console.log('  "Authorization" → "authorization"');
    console.log('  "Content-Type" → "content-type"');
    console.log('  "X-Custom-Header" → "x-custom-header"');
    
    console.log('\nAfter (Bun 1.3.7+):');
    console.log('  "Authorization" → "Authorization" ✅');
    console.log('  "Content-Type" → "Content-Type" ✅');
    console.log('  "X-Custom-Header" → "X-Custom-Header" ✅');
    
    console.log('\n💡 Fixes compatibility with strict APIs!');
    console.log('   Try: bunx -e "fetch(\'https://httpbin.org/headers\',{headers:{\'X-Case-Sensitive\':\'Test\'}}).then(r=>r.json()).then(console.log)"');
}

async function demoWebSocketAuth(): Promise<void> {
    console.log('\n🔌 WebSocket URL Credentials');
    console.log('='.repeat(50));
    
    console.log('✅ WebSocket URLs now forward credentials as Basic Auth');
    console.log('\nExamples:');
    console.log('  new WebSocket("ws://user:pass@example.com/socket")');
    console.log('  new WebSocket("wss://token@secure.example.com/ws")');
    console.log('  new WebSocket("ws://api:key@service.com/realtime")');
    
    console.log('\n💡 Automatic Authorization header:');
    console.log('  Authorization: Basic <base64(user:pass)>');
    
    console.log('\n🔧 Fixes compatibility with:');
    console.log('   • Puppeteer remote browser connections');
    console.log('   • Bright Data scraping browser');
    console.log('   • WebSocket services requiring URL auth');
}

// ============================================================================
// Interactive Menu
// ============================================================================

function showMenu(): void {
    console.log('\n' + '🎯'.repeat(20));
    console.log('   Bun v1.3.7 Interactive Demo');
    console.log('🎯'.repeat(20));
    console.log('\nSelect a performance feature to test:');
    console.log('');
    console.log('1. 🔥 Buffer.from(array) - 50% faster on ARM64');
    console.log('2. 🚀 array.flat() - 3x faster');
    console.log('3. ⚡ padStart/padEnd - 90% faster');
    console.log('4. 📄 Native JSON5 parsing');
    console.log('5. 📋 Streaming JSONL parsing');
    console.log('6. 🎨 Bun.wrapAnsi() - CLI magic');
    console.log('7. 🔄 Buffer.swap16/swap64 - byte swapping');
    console.log('8. 📊 CPU/Heap profiling');
    console.log('9. 📡 Header case preservation');
    console.log('10. 🔌 WebSocket URL credentials');
    console.log('11. 🏃 Run all demos');
    console.log('12. ❌ Exit');
    console.log('');
}

async function main(): Promise<void> {
    console.log(`\n🚀 Bun v1.3.7 Interactive Performance Demo`);
    console.log(`Bun version: ${Bun.version}`);
    console.log(`Platform: ${process.platform} ${process.arch}`);
    
    while (true) {
        showMenu();
        
        const choice = await question('Enter your choice (1-12): ');
        
        switch (choice.trim()) {
            case '1':
                await demoBufferSpeed();
                break;
            case '2':
                await demoArrayFlat();
                break;
            case '3':
                await demoStringPadding();
                break;
            case '4':
                await demoJSON5();
                break;
            case '5':
                await demoJSONL();
                break;
            case '6':
                await demoWrapAnsi();
                break;
            case '7':
                await demoBufferSwapping();
                break;
            case '8':
                await demoProfiling();
                break;
            case '9':
                await demoHeaderCase();
                break;
            case '10':
                await demoWebSocketAuth();
                break;
            case '11':
                console.log('\n🏃 Running all demos...\n');
                await demoBufferSpeed();
                await demoArrayFlat();
                await demoStringPadding();
                await demoJSON5();
                await demoJSONL();
                await demoWrapAnsi();
                await demoBufferSwapping();
                await demoProfiling();
                await demoHeaderCase();
                await demoWebSocketAuth();
                break;
            case '12':
                console.log('\n👋 Thanks for testing Bun v1.3.7 performance!');
                rl.close();
                return;
            default:
                console.log('\n❌ Invalid choice. Please try again.');
        }
        
        if (choice.trim() !== '11') {
            await question('\nPress Enter to continue...');
        }
    }
}

if (import.meta.main) {
    main().catch(console.error);
}

export {
    demoBufferSpeed,
    demoArrayFlat,
    demoStringPadding,
    demoJSON5,
    demoJSONL,
    demoWrapAnsi,
    demoBufferSwapping,
    demoProfiling,
    demoHeaderCase,
    demoWebSocketAuth,
};
