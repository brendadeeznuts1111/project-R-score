#!/usr/bin/env bun
/**
 * Test script for Bun v1.3.7 CLI
 * Validates all CLI commands work before packaging
 */

console.log('🧪 Testing Bun v1.3.7 CLI...');

const commands = [
    { cmd: 'cli:v1.3.7 --help', desc: 'CLI help command' },
    { cmd: 'cli:v1.3.7 check', desc: 'System compatibility check' },
    { cmd: 'cli:v1.3.7 check --verbose', desc: 'Verbose system check' },
    { cmd: 'cli:v1.3.7 oneliners', desc: 'Display one-liners' },
    { cmd: 'cli:v1.3.7 prepare --dry-run', desc: 'Prepare dry run' }
];

async function testCommands() {
    for (const { cmd, desc } of commands) {
        console.log(`\n🔧 Testing: ${desc}`);
        console.log(`$ bun run ${cmd}`);
        
        try {
            const result = await Bun.spawn(['bun', 'run', cmd], {
                stdout: 'pipe',
                stderr: 'pipe',
                cwd: process.cwd()
            }).exited;
            
            if (result === 0) {
                console.log(`✅ ${desc} - PASSED`);
            } else {
                console.log(`❌ ${desc} - FAILED`);
            }
        } catch (error) {
            console.log(`❌ ${desc} - ERROR: ${error}`);
        }
    }
    
    console.log('\n🎯 Quick performance tests...');
    try {
        console.log('Testing Buffer performance...');
        const start = performance.now();
        for(let i = 0; i < 1e5; i++) {
            Buffer.from([i % 256, (i+1) % 256]);
        }
        const end = performance.now();
        console.log(`✅ Buffer test: ${(end - start).toFixed(2)}ms`);
        
        console.log('Testing string padding...');
        const start2 = performance.now();
        for(let i = 0; i < 1e5; i++) {
            '2026'.padStart(20, '0');
        }
        const end2 = performance.now();
        console.log(`✅ String padding test: ${(end2 - start2).toFixed(2)}ms`);
        
        console.log('Testing JSON5...');
        const json5Result = (Bun as any).JSON5?.parse('{foo:1,bar:2,}');
        if (json5Result) {
            console.log('✅ JSON5 test: PASSED');
        } else {
            console.log('⚠️  JSON5 test: Not available (may need Bun 1.3.7+)');
        }
        
    } catch (error) {
        console.log(`❌ Performance tests failed: ${error}`);
    }
    
    console.log('\n🚀 CLI test complete!');
}

testCommands().catch(console.error);
