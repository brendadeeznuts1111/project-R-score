#!/usr/bin/env bun
// matrix-performance-test.ts - Benchmark the high-performance matrix utility

import { matrix, ROWS, COLUMNS } from './src/client/utils/matrix-utility.ts';

console.log('🧪 Matrix Performance Benchmark\n');

// Test 1: Sequential access (column-major order)
console.time('Sequential Column Access');
let total = 0;
for (let c = 0; c < COLUMNS; c++) {
  const col = matrix[`col${c}`];
  for (let r = 0; r < ROWS; r++) {
    total += col[r];
  }
}
console.timeEnd('Sequential Column Access');
console.log(`📊 Sequential total: ${total.toLocaleString()}\n`);

// Test 2: Random access patterns
console.time('Random Access (10k samples)');
total = 0;
for (let i = 0; i < 10000; i++) {
  const r = Math.floor(Math.random() * ROWS);
  const c = Math.floor(Math.random() * COLUMNS);
  total += matrix[`col${c}`][r];
}
console.timeEnd('Random Access (10k samples)');
console.log(`🎲 Random sample total: ${total.toLocaleString()}\n`);

// Test 3: Boolean filtering performance
console.time('Boolean Filter Query');
const activeRows = [];
for (let r = 0; r < ROWS; r++) {
  if (matrix.isActive[r]) {
    activeRows.push(r);
  }
}
console.timeEnd('Boolean Filter Query');
console.log(`🔍 Found ${activeRows.length.toLocaleString()} active rows\n`);

// Test 4: SIMD-ready operations (addition)
console.time('SIMD-Style Column Addition');
const result = new Float32Array(ROWS);
for (let r = 0; r < ROWS; r++) {
  result[r] = matrix.col0[r] + matrix.col1[r] + matrix.col2[r];
}
const sum = result.reduce((a, b) => a + b, 0);
console.timeEnd('SIMD-Style Column Addition');
console.log(`⚡ Column addition result: ${sum.toLocaleString()}\n`);

// Memory efficiency comparison
console.log('💾 Memory Efficiency Analysis:');
const typedArrayBytes = COLUMNS * ROWS * 4 + ROWS * 1; // Float32 + Uint8
const regularArrayBytes = COLUMNS * ROWS * 8 + ROWS * 1; // Number + boolean (est.)
const savings = ((regularArrayBytes - typedArrayBytes) / regularArrayBytes * 100).toFixed(1);

console.log(`   Typed Arrays: ${(typedArrayBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`   Regular Arrays: ~${(regularArrayBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`   Memory Saved: ${savings}% 🚀\n`);

console.log('✅ All performance tests completed successfully!');