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
    console.info('\n🔥 Buffer.from(array) - 50% faster on ARM64');
    console.info('='.repeat(50));
    
    console.time('Buffer.from(array) x100K');
    for(let i = 0; i < 1e5; i++) {
        const buf = Buffer.from([i % 256, (i+1) % 256, (i+2) % 256]);
        buf.length;
    }
    console.timeEnd('Buffer.from(array) x100K');
    
    console.info('\n💡 ARM64 systems see ~50% improvement');
    console.info('   Perfect for binary data processing, file I/O, network buffers');
}

async function demoArrayFlat(): Promise<void> {
    console.info('\n🚀 array.flat() - 3x faster');
    console.info('='.repeat(50));
    
    const nested = Array(100).fill(0).map((_, i) => [i, [i+1, [i+2, i+3]]]);
    
    console.time('array.flat(3) x10K');
    for(let i = 0; i < 1e4; i++) {
        const flat = nested.flat(3);
        flat.length;
    }
    console.timeEnd('array.flat(3) x10K');
    
    console.info('\n💡 Great for data processing, API responses, nested structures');
}

async function demoStringPadding(): Promise<void> {
    console.info('\n⚡ padStart/padEnd - 90% faster');
    console.info('='.repeat(50));
    
    console.time('padStart(20,"0") x1M');
    for(let i = 0; i < 1e6; i++) {
        '2026'.padStart(20, '0');
    }
    console.timeEnd('padStart(20,"0") x1M');
    
    console.info('\n💡 Perfect for formatting logs, tables, CLI output');
}

async function demoJSON5(): Promise<void> {
    console.info('\n📄 Native JSON5 - comments + trailing commas');
    console.info('='.repeat(50));
    
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
    
    console.info('JSON5 with comments and trailing commas:');
    console.info(json5Config);
    
    const parsed = (Bun as any).JSON5.parse(json5Config);
    console.info('\n✅ Parsed successfully:');
    console.info(JSON.stringify(parsed, null, 2));
    
    console.info('\n💡 No external JSON5 dependency needed!');
}

async function demoJSONL(): Promise<void> {
    console.info('\n📋 Streaming JSONL parsing');
    console.info('='.repeat(50));
    
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
    
    console.info('Processing streaming JSONL logs...');
    console.time('JSONL streaming parse');
    
    let count = 0;
    for await(const log of (Bun as any).JSONL.parse(generateLogs())) {
        count++;
        if (count <= 3) {
            console.info(`  ${log.user}: ${log.action}`);
        }
    }
    
    console.timeEnd('JSONL streaming parse');
    console.info(`✅ Processed ${count} log entries`);
    
    console.info('\n💡 Perfect for log processing, data pipelines, streaming APIs');
}

async function demoWrapAnsi(): Promise<void> {
    console.info('\n🎨 Bun.wrapAnsi() - CLI magic (33-88x faster)');
    console.info('='.repeat(50));
    
    const coloredText = '\x1b[32m🚀\x1b[0m \x1b[34mBun v1.3.7\x1b[0m \x1b[31mPerformance\x1b[0m \x1b[33mDemo\x1b[0m';
    
    console.info('Original:', coloredText);
    console.info('\nWrapped at different widths:');
    
    for(const width of [20, 30, 40]) {
        const wrapped = (Bun as any).wrapAnsi(coloredText, { width });
        console.info(`Width ${width}: ${wrapped}`);
    }
    
    console.time('Bun.wrapAnsi x100K');
    for(let i = 0; i < 1e5; i++) {
        (Bun as any).wrapAnsi(coloredText, { width: 40 });
    }
    console.timeEnd('Bun.wrapAnsi x100K');
    
    console.info('\n💡 88x faster than wrap-ansi npm package!');
    console.info('   Essential for CLI tools, terminal output, log formatting');
}

async function demoBufferSwapping(): Promise<void> {
    console.info('\n🔄 Buffer.swap16/swap64 - Fast byte swapping');
    console.info('='.repeat(50));
    
    // swap16 demo
    const buf16 = Buffer.from([0x48, 0x00, 0x65, 0x00, 0x6c, 0x00, 0x6c, 0x00]);
    console.info('UTF-16LE "Hell":', buf16.toString('hex'));
    
    buf16.swap16();
    console.info('After swap16:   ', buf16.toString('hex'));
    console.info('As UTF-16BE:     ', buf16.toString('utf16le'));
    
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
    console.info('\n64-bit value (LE):', buf64.toString('hex'));
    
    buf64.swap64();
    console.info('After swap64:    ', buf64.toString('hex'));
    console.info('As BE:           ', '0x' + buf64.readBigUInt64BE().toString(16));
    
    console.time('Buffer.swap64 x500K');
    for(let i = 0; i < 5e5; i++) {
        buf64.swap64();
        buf64.swap64(); // swap back
    }
    console.timeEnd('Buffer.swap64 x500K');
    
    console.info('\n💡 swap16: 1.8x faster, swap64: 3.6x faster');
    console.info('   Critical for binary protocols, endianness conversion');
}

async function demoProfiling(): Promise<void> {
    console.info('\n📊 CPU/Heap Profiling - Markdown output');
    console.info('='.repeat(50));
    
    console.info('🔥 CPU Profiling Commands:');
    console.info('  bun --cpu-prof-md script.ts                    # Markdown only');
    console.info('  bun --cpu-prof --cpu-prof-md script.ts         # Both formats');
    console.info('  bun --cpu-prof-interval 1000 script.ts         # Custom interval');
    console.info('  bun --cpu-prof-dir ./profiles script.ts        # Custom directory');
    
    console.info('\n💾 Heap Profiling Commands:');
    console.info('  bun --heap-prof-md script.ts                   # Markdown heap');
    console.info('  bun --heap-prof --heap-prof-dir ./profiles script.ts');
    console.info('  bun --heap-prof-md --inspect-brk=9229 server.ts # With inspector');
    
    console.info('\n🔍 Inspector API:');
    console.info(`  const inspector = require('node:inspector');`);
    console.info(`  const session = new inspector.Session();`);
    console.info(`  session.connect();`);
    console.info(`  // Open chrome://inspect to debug`);
    
    console.info('\n💡 Markdown profiles are searchable and shareable!');
}

async function demoHeaderCase(): Promise<void> {
    console.info('\n📡 Header Case Preservation');
    console.info('='.repeat(50));
    
    console.info('✅ Headers now preserve exact casing in fetch()');
    console.info('\nBefore (Bun < 1.3.7):');
    console.info('  "Authorization" → "authorization"');
    console.info('  "Content-Type" → "content-type"');
    console.info('  "X-Custom-Header" → "x-custom-header"');
    
    console.info('\nAfter (Bun 1.3.7+):');
    console.info('  "Authorization" → "Authorization" ✅');
    console.info('  "Content-Type" → "Content-Type" ✅');
    console.info('  "X-Custom-Header" → "X-Custom-Header" ✅');
    
    console.info('\n💡 Fixes compatibility with strict APIs!');
    console.info('   Try: bunx -e "fetch(\'https://httpbin.org/headers\',{headers:{\'X-Case-Sensitive\':\'Test\'}}).then(r=>r.json()).then(console.log)"');
}

async function demoWebSocketAuth(): Promise<void> {
    console.info('\n🔌 WebSocket URL Credentials');
    console.info('='.repeat(50));
    
    console.info('✅ WebSocket URLs now forward credentials as Basic Auth');
    console.info('\nExamples:');
    console.info('  new WebSocket("ws://user:pass@example.com/socket")');
    console.info('  new WebSocket("wss://token@secure.example.com/ws")');
    console.info('  new WebSocket("ws://api:key@service.com/realtime")');
    
    console.info('\n💡 Automatic Authorization header:');
    console.info('  Authorization: Basic <base64(user:pass)>');
    
    console.info('\n🔧 Fixes compatibility with:');
    console.info('   • Puppeteer remote browser connections');
    console.info('   • Bright Data scraping browser');
    console.info('   • WebSocket services requiring URL auth');
}

// ============================================================================
// Interactive Menu
// ============================================================================

function showMenu(): void {
    console.info('\n' + '🎯'.repeat(20));
    console.info('   Bun v1.3.7 Interactive Demo');
    console.info('🎯'.repeat(20));
    console.info('\nSelect a performance feature to test:');
    console.info('');
    console.info('1. 🔥 Buffer.from(array) - 50% faster on ARM64');
    console.info('2. 🚀 array.flat() - 3x faster');
    console.info('3. ⚡ padStart/padEnd - 90% faster');
    console.info('4. 📄 Native JSON5 parsing');
    console.info('5. 📋 Streaming JSONL parsing');
    console.info('6. 🎨 Bun.wrapAnsi() - CLI magic');
    console.info('7. 🔄 Buffer.swap16/swap64 - byte swapping');
    console.info('8. 📊 CPU/Heap profiling');
    console.info('9. 📡 Header case preservation');
    console.info('10. 🔌 WebSocket URL credentials');
    console.info('11. 🏃 Run all demos');
    console.info('12. ❌ Exit');
    console.info('');
}

async function main(): Promise<void> {
    console.info(`\n🚀 Bun v1.3.7 Interactive Performance Demo`);
    console.info(`Bun version: ${Bun.version}`);
    console.info(`Platform: ${process.platform} ${process.arch}`);
    
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
                console.info('\n🏃 Running all demos...\n');
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
                console.info('\n👋 Thanks for testing Bun v1.3.7 performance!');
                rl.close();
                return;
            default:
                console.info('\n❌ Invalid choice. Please try again.');
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
