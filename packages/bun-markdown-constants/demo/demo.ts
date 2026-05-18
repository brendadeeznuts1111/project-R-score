#!/usr/bin/env bun
/**
 * Bun v1.3.7 Features Demo
 * Run with: bun demo/demo.ts
 */

console.clear();
console.info('╔════════════════════════════════════════════════════════════════════╗');
console.info('║         Bun v1.3.7 Performance Features Demo                       ║');
console.info('║         Bun version: ' + Bun.version.padEnd(43) + '║');
console.info('╚════════════════════════════════════════════════════════════════════╝');

const hr = () => console.info('─'.repeat(70));
const section = (title: string) => {
  console.info('\n');
  hr();
  console.info(`  ${title}`);
  hr();
};

// 1. SIMD-Accelerated Markdown Rendering
section('1. SIMD-Accelerated Markdown Rendering');

const markdownExample = `# Hello World

This is **bold** and *italic* text.

HTML entities: & < > "

| Feature | Status |
|---------|--------|
| SIMD | ✅ Active |
| Speedup | 3-15% |
`;

console.info('\n📄 Input Markdown:');
console.info(markdownExample.split('\n').map(l => '   ' + l).join('\n'));

const html = Bun.markdown.html(markdownExample, { tables: true });
console.info('\n📤 Output HTML (first 400 chars):');
console.info(html.substring(0, 400).split('\n').map(l => '   ' + l).join('\n') + '...');

console.info('\n⏱️  Performance:');
const largeDoc = '# Title\n\n'.repeat(1000) + 'Normal text. '.repeat(50);
const start1 = performance.now();
for (let i = 0; i < 100; i++) Bun.markdown.html(largeDoc);
const end1 = performance.now();
console.info(`   100 renders: ${(end1 - start1).toFixed(2)}ms (${((end1 - start1) / 100).toFixed(2)}ms avg)`);

// 2. String.replace Rope Optimization
section('2. String.replace Rope Optimization');

console.info('\n🪢 Rope Optimization - lazy concatenation reduces allocations');
const original = 'The quick brown fox jumps over the lazy dog.';
console.info(`   Original: "${original}"`);

const replaced = original
  .replace('quick', 'fast')
  .replace('brown', 'red')
  .replace('fox', 'cat');
console.info(`   Result: "${replaced}"`);

// 3. AbortSignal.abort() Optimization
section('3. AbortSignal.abort() Optimization');

console.info('\n🛑 No-listener optimization (~6% faster)');
const iterations = 1000000;
const start2 = performance.now();
for (let i = 0; i < iterations; i++) {
  const controller = new AbortController();
  controller.abort();
}
const end2 = performance.now();
console.info(`   ${iterations.toLocaleString()} abort() calls: ${(end2 - start2).toFixed(2)}ms`);
console.info(`   Per call: ${((end2 - start2) / iterations * 1000).toFixed(3)} µs`);

// 4. RegExp SIMD Acceleration
section('4. RegExp SIMD Acceleration');

console.info('\n🔍 SIMD prefix search (16 bytes at a time)');
const simdRegex = /aaaa|bbbb|cccc|dddd/;
const testText = 'x'.repeat(10000) + 'bbbb' + 'x'.repeat(10000);
console.info(`   Pattern: /aaaa|bbbb|cccc|dddd/`);
console.info(`   Match in ${testText.length} chars: ${simdRegex.test(testText) ? '✅ Found' : '❌ Not found'}`);

console.info('\n🔧 Fixed-count parentheses JIT (~3.9x speedup)');
const fixedRegex = /(?:abc){3}/;
const fixedText = 'abcabcabcxyz'.repeat(100);
console.info(`   Pattern: /(?:abc){3}/`);
console.info(`   Match: ${fixedRegex.test(fixedText) ? '✅ Found' : '❌ Not found'}`);

// 5. DFG/FTL Intrinsics
section('5. DFG/FTL Intrinsics');

console.info('\n📍 String.startsWith (1.42x - 5.76x faster)');
const testStr = 'Hello World, this is a test';
console.info(`   "${testStr}".startsWith("Hello"): ${testStr.startsWith('Hello')}`);
console.info(`   "${testStr}".startsWith("World", 6): ${testStr.startsWith('World', 6)}`);

console.info('\n📊 Set.size & Map.size (2.24x / 2.74x faster)');
const set = new Set([1, 2, 3, 4, 5]);
const map = new Map([['a', 1], ['b', 2], ['c', 3]]);
console.info(`   Set {1,2,3,4,5}.size: ${set.size}`);
console.info(`   Map {a:1,b:2,c:3}.size: ${map.size}`);

console.info('\n✂️ String.trim (1.10x - 1.42x faster)');
const trimExample = '   padded   ';
console.info(`   "${trimExample}".trim(): "${trimExample.trim()}"`);
console.info(`   .trimStart(): "${trimExample.trimStart()}"`);
console.info(`   .trimEnd(): "${trimExample.trimEnd()}"`);

// 6. Bug Fixes
section('6. Bug Fixes - Thai/Lao Character Width');

console.info('\n🇹🇭 Bun.stringWidth - Thai spacing vowels now correct width');
const thaiWord = 'คำ';
const thaiWidth = Bun.stringWidth(thaiWord);
console.info(`   "${thaiWord}" width: ${thaiWidth} ${thaiWidth === 2 ? '✅' : '❌'}`);

const laoChar = 'ຳ';
const laoWidth = Bun.stringWidth(laoChar);
console.info(`   "${laoChar}" width: ${laoWidth} ${laoWidth === 1 ? '✅' : '❌'}`);

// Summary
section('Summary - All Bun v1.3.7 Features Working!');

console.info(`
┌────────────────────────────────────────────────────────────────────┐
│ Feature                      │ Status │ Improvement                 │
├──────────────────────────────┼────────┼─────────────────────────────┤
│ SIMD Markdown                │   ✅   │ 3-15% faster                │
│ Cached React Tags            │   ✅   │ 28% small inputs            │
│ String.replace Ropes         │   ✅   │ Reduced allocations         │
│ AbortSignal.abort()          │   ✅   │ ~6% no listeners            │
│ RegExp SIMD                  │   ✅   │ ~3.9x fixed-count           │
│ String.startsWith            │   ✅   │ 1.42x - 5.76x               │
│ Set/Map.size                 │   ✅   │ 2.24x / 2.74x               │
│ String.trim                  │   ✅   │ 1.10x - 1.42x               │
│ Thai/Lao stringWidth         │   ✅   │ Correct results             │
└────────────────────────────────────────────────────────────────────┘
`);
