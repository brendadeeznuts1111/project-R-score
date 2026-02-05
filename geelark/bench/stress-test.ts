#!/usr/bin/env bun
/**
 * Live performance validation of the 25µs hypothesis
 * Using high-resolution timers to measure each phase
 */

const PHASE1_START = performance.now();
// Phase 1: stringWidth tests (should be ~252ns)
const sw1 = Bun.stringWidth('🇺🇸');
const sw2 = Bun.stringWidth('👋🏽');
const sw3 = Bun.stringWidth('👨‍👩‍👧');
const sw4 = Bun.stringWidth('\u2060');
const sw5 = Bun.stringWidth('\x1b[31mRed\x1b[0m');
const sw6 = Bun.stringWidth('\x1b]8;;https://bun.sh\x07Bun\x1b]8;;\x07');
const PHASE1_END = performance.now();

const PHASE2_START = performance.now();
// Phase 2: File write (should be ~1.06µs)
await Bun.write('test.ts', 'import {feature} from "bun:bundle"; const enabled = feature("DEBUG") ? "YES" : "NO"; console.log("DEBUG:", enabled);');
const PHASE2_END = performance.now();

const PHASE3_START = performance.now();
// Phase 3: Build with DCE (should be ~3.17µs)
await Bun.build({
  entrypoints: ['test.ts'],
  outdir: './out',
  minify: true,
  feature: 'DEBUG'
});
const PHASE3_END = performance.now();

const PHASE4_START = performance.now();
// Phase 4: Spawn and execute (should be ~20.44µs)
const proc = Bun.spawn(['bun', './out/test.js']);
await proc.exited;
const PHASE4_END = performance.now();

// Results
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║  🔬 Architecture Stress Test Results                            ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log('📊 Phase 1: Bun.stringWidth() (6 tests)');
console.log(`   Measured: ${((PHASE1_END - PHASE1_START) * 1000).toFixed(0)}ns`);
console.log(`   Predicted: 252ns`);
console.log(`   Status: ${sw1===2 && sw2===2 && sw3===2 && sw4===0 && sw5===3 && sw6===3 ? '✅ PASS' : '❌ FAIL'}\n`);

console.log('📝 Phase 2: Bun.write() (73 bytes)');
console.log(`   Measured: ${((PHASE2_END - PHASE2_START) * 1000).toFixed(0)}ns`);
console.log(`   Predicted: 1.06µs`);
console.log(`   Status: ✅ File written\n`);

console.log('⚡ Phase 3: Bun.build() + DCE');
console.log(`   Measured: ${((PHASE3_END - PHASE3_START) * 1000).toFixed(0)}ns`);
console.log(`   Predicted: 3.17µs`);
console.log(`   Output: ${Bun.file('./out/test.js').size} bytes\n`);

console.log('🚀 Phase 4: Bun.spawn() + execute');
console.log(`   Measured: ${((PHASE4_END - PHASE4_START) * 1000).toFixed(0)}ns`);
console.log(`   Predicted: 20.44µs`);
console.log(`   Exit code: ${proc.exitCode}\n`);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const TOTAL = (PHASE4_END - PHASE1_START);
console.log(`📈 Total Execution Time: ${(TOTAL * 1000).toFixed(0)}ns (${TOTAL.toFixed(2)}ms)`);
console.log(`   Predicted: 25.29µs`);
console.log(`   Accuracy: ${((TOTAL / 0.02529) * 100).toFixed(1)}% of prediction\n`);

// Show minified output
console.log('🔍 Compiled Output:');
console.log('─────'.repeat(8));
await Bun.$('cat', ['./out/test.js']);
console.log('─────'.repeat(8));
