#!/usr/bin/env bun
// tools/wasm-inspector.bench.ts — WASM Inspector Performance Benchmark
// Run: bun tools/wasm-inspector.bench.ts

import { WASM_API, getWasmClass, getWasmMember, getAllWasmUrls } from '../lib/docs/wasm-reference';

const ITERATIONS = 10_000;

interface BenchResult {
  operation: string;
  'ops/s': string;
  'ns/op': string;
  iters: number;
}

function bench(name: string, fn: () => void, iters = ITERATIONS): BenchResult {
  // Warm up
  for (let i = 0; i < 100; i++) fn();

  const t0 = Bun.nanoseconds();
  for (let i = 0; i < iters; i++) fn();
  const totalNs = Bun.nanoseconds() - t0;
  const nsPerOp = totalNs / iters;

  return {
    operation: name,
    'ops/s': (1e9 / nsPerOp).toFixed(0),
    'ns/op': nsPerOp.toFixed(1),
    iters,
  };
}

console.log('WASM Inspector Performance Benchmark');
console.log('='.repeat(60));

const results: BenchResult[] = [];

// 1. getWasmClass by full name
results.push(bench('getWasmClass (full name)', () => {
  getWasmClass('WebAssembly.Table');
}));

// 2. getWasmClass by short name
results.push(bench('getWasmClass (short name)', () => {
  getWasmClass('Memory');
}));

// 3. getWasmMember lookup
results.push(bench('getWasmMember', () => {
  getWasmMember('Table', 'set');
}));

// 4. getAllWasmUrls
results.push(bench('getAllWasmUrls', () => {
  getAllWasmUrls();
}));

// 5. WebAssembly.compile on minimal module
const minimalWasm = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d,
  0x01, 0x00, 0x00, 0x00,
]);
results.push(bench('WebAssembly.compile (minimal)', () => {
  WebAssembly.compile(minimalWasm);
}, 1_000));

// 6. WebAssembly.compile + exports/imports on module with export
const wasmWithExport = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
  0x01, 0x07, 0x01, 0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f,
  0x03, 0x02, 0x01, 0x00,
  0x07, 0x07, 0x01, 0x03, 0x61, 0x64, 0x64, 0x00, 0x00,
  0x0a, 0x09, 0x01, 0x07, 0x00, 0x20, 0x00, 0x20, 0x01, 0x6a, 0x0b,
]);
results.push(bench('WebAssembly.compile + exports/imports', async () => {
  const mod = await WebAssembly.compile(wasmWithExport);
  WebAssembly.Module.exports(mod);
  WebAssembly.Module.imports(mod);
}, 1_000));

// 7. WASM_API iteration
results.push(bench('WASM_API full iteration', () => {
  for (const entry of WASM_API) {
    if (entry.members) {
      for (const m of entry.members) {
        void m.name;
      }
    }
  }
}));

// Print results
console.log('');
console.log(Bun.inspect.table(results));

// Summary
const compileMini = results.find(r => r.operation.includes('minimal'));
const lookup = results.find(r => r.operation === 'getWasmClass (full name)');
const urlGen = results.find(r => r.operation === 'getAllWasmUrls');

console.log('Summary:');
console.log(`  WebAssembly.compile (minimal): ${compileMini?.['ns/op']}ns/op (${compileMini?.['ops/s']} ops/s)`);
console.log(`  Class lookup: ${lookup?.['ns/op']}ns/op (${lookup?.['ops/s']} ops/s)`);
console.log(`  URL generation: ${urlGen?.['ns/op']}ns/op (${urlGen?.['ops/s']} ops/s)`);
