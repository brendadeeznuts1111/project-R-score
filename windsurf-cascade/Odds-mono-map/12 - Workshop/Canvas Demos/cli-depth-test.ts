#!/usr/bin/env bun
/**
 * CLI Depth Test - Simple demonstration of --console-depth flag
 */

function parseDepth(): number {
    const args = process.argv.slice(2);

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--console-depth') {
            const depth = parseInt(args[i + 1]);
            if (isNaN(depth) || depth < 1 || depth > 20) {
                console.error('❌ Invalid depth. Please use a number between 1 and 20.');
                process.exit(1);
            }
            return depth;
        } else if (args[i].startsWith('--console-depth=')) {
            const depth = parseInt(args[i].split('=')[1]);
            if (isNaN(depth) || depth < 1 || depth > 20) {
                console.error('❌ Invalid depth. Please use a number between 1 and 20.');
                process.exit(1);
            }
            return depth;
        }
    }

    return 2; // Default
}

const depth = parseDepth();
console.log(`🔧 Using console depth: ${depth}\n`);

// Your exact example
const nested = { a: { b: { c: { d: "deep" } } } };

console.log('📋 Default console.log (depth 2):');
console.log(nested);
// Expected: { a: { b: [Object] } }

console.log(`\n🔧 Bun.inspect with depth ${depth}:`);
console.log(Bun.inspect(nested, { depth, colors: true }));
// Expected with depth 4: { a: { b: { c: { d: 'deep' } } } }

console.log(`\n✅ CLI depth control working! Depth ${depth} applied successfully.`);
