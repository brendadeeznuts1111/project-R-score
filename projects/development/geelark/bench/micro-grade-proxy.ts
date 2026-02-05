#!/usr/bin/env bun
// micro-grade-proxy.ts - Ultra-minimal proxy validation benchmark

const ns = () => Number(process.hrtime.bigint());

// Suppress verbose logging during benchmark
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
console.log = (...args: any[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (msg.startsWith('[Validator]') || msg.startsWith('[DNS]')) return;
  originalConsoleLog(...args);
};
console.warn = (...args: any[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (msg.startsWith('[Validator]') || msg.startsWith('[DNS]')) return;
  originalConsoleWarn(...args);
};

const GRADES = {
  'A+': [50, 1e3, 3e3, 5e3],
  'A': [1e2, 5e3, 1e4, 2e4],
  'B': [5e2, 2e4, 5e4, 1e5],
  'C': [1e3, 5e4, 1e5, 2e5]
};

async function microGradeProxy() {
  // Import modules
  const {
    validateProxyHeader,
    validateProxyHeaders,
    calculateChecksum
  } = await import('./src/proxy/validator.js');

  const { HEADERS } = await import('./src/proxy/headers.js');

  const results = [];

  // Test 1: Single header validation (config version)
  let start = ns();
  for (let i = 0; i < 10000; i++) {
    validateProxyHeader(HEADERS.CONFIG_VERSION, '1');
  }
  results.push((ns() - start) / 10000);

  // Test 2: Hex header validation (registry hash)
  start = ns();
  for (let i = 0; i < 10000; i++) {
    validateProxyHeader(HEADERS.REGISTRY_HASH, '0xa1b2c3d4');
  }
  results.push((ns() - start) / 10000);

  // Test 3: Bulk validation (all headers)
  const headers = new Headers({
    [HEADERS.CONFIG_VERSION]: '1',
    [HEADERS.REGISTRY_HASH]: '0xa1b2c3d4',
    [HEADERS.FEATURE_FLAGS]: '0x00000007',
    [HEADERS.TERMINAL_MODE]: '2',
    [HEADERS.TERMINAL_ROWS]: '24',
    [HEADERS.TERMINAL_COLS]: '80',
    [HEADERS.PROXY_TOKEN]: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  });

  start = ns();
  for (let i = 0; i < 10000; i++) {
    validateProxyHeaders(headers);
  }
  results.push((ns() - start) / 10000);

  // Test 4: Checksum calculation
  const dump = new Uint8Array([0x01, 0xa1, 0xb2, 0xc3, 0xd4, 0x00, 0x00, 0x02, 0x07, 0x02, 0x18, 0x50]);
  start = ns();
  for (let i = 0; i < 10000; i++) {
    calculateChecksum(dump);
  }
  results.push((ns() - start) / 10000);

  // Grade
  const grade = Object.entries(GRADES).find(([, t]) =>
    results.every((r, i) => r <= t[i]))?.[0] || 'F';

  // Output
  console.log(`\n🏆 ${grade}\n${'─'.repeat(30)}`);
  const labels = ['Config Version', 'Registry Hash', 'Bulk (7 headers)', 'Checksum'];
  const emojis = ['🔢', '🔣', '📦', '🔐'];

  results.forEach((r, i) => {
    const perHeader = i === 2 ? ` (${(r/7).toFixed(0)}ns/header)` : '';
    console.log(`${emojis[i]} ${labels[i].padEnd(20)} ${r.toFixed(0).padStart(7)}ns${perHeader}`);
  });

  console.log(`${'─'.repeat(30)}`);
  console.log(`📊 Throughput: ${(1e9 / results[2]).toFixed(0)} req/sec`);

  return grade;
}

if (import.meta.main) console.log(await microGradeProxy());
