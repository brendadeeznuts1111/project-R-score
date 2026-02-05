#!/usr/bin/env bun
// proxy-grade.ts - Proxy Validation Performance Benchmark (Honest Grading)

const ns = () => performance.now() * 1e6;
const flags = new Set(process.argv.slice(2));

// Use the SAME strict grading as bun-grade
const GRADES = {
  'A+': [50, 1e3, 3e3, 5e3],
  'A': [100, 5e3, 1e4, 2e4],
  'B': [500, 2e4, 5e4, 1e5],
  'C': [1e3, 5e4, 1e5, 2e5]
};

async function benchmark() {
  // Suppress logging
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = (...args: any[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (msg.startsWith('[Validator]') || msg.startsWith('[DNS]')) return;
    originalLog(...args);
  };
  console.warn = (...args: any[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (msg.startsWith('[Validator]') || msg.startsWith('[DNS]')) return;
    originalWarn(...args);
  };

  const {
    validateProxyHeader,
    validateProxyHeaders,
    calculateChecksum
  } = await import('./src/proxy/validator.js');

  const { HEADERS } = await import('./src/proxy/headers.js');

  try {
    // 1. Single header: config version (10k ops)
    let t = ns();
    for (let i = 0; i < 1e4; i++) {
      validateProxyHeader(HEADERS.CONFIG_VERSION, '1');
    }
    const cv = (ns() - t) / 1e4;

    // 2. Single header: registry hash (10k ops)
    t = ns();
    for (let i = 0; i < 1e4; i++) {
      validateProxyHeader(HEADERS.REGISTRY_HASH, '0xa1b2c3d4');
    }
    const rh = (ns() - t) / 1e4;

    // 3. Bulk validation: all 7 headers (10k ops)
    const headers = new Headers({
      [HEADERS.CONFIG_VERSION]: '1',
      [HEADERS.REGISTRY_HASH]: '0xa1b2c3d4',
      [HEADERS.FEATURE_FLAGS]: '0x00000007',
      [HEADERS.TERMINAL_MODE]: '2',
      [HEADERS.TERMINAL_ROWS]: '24',
      [HEADERS.TERMINAL_COLS]: '80',
      [HEADERS.PROXY_TOKEN]: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    });

    t = ns();
    for (let i = 0; i < 1e4; i++) {
      validateProxyHeaders(headers);
    }
    const bulk = (ns() - t) / 1e4;

    // 4. Checksum calculation (10k ops)
    const dump = new Uint8Array([0x01, 0xa1, 0xb2, 0xc3, 0xd4, 0x00, 0x00, 0x02, 0x07, 0x02, 0x18, 0x50]);
    t = ns();
    for (let i = 0; i < 1e4; i++) {
      calculateChecksum(dump);
    }
    const cs = (ns() - t) / 1e4;

    // Calculate grade
    const results = [cv, rh, bulk, cs];
    const grade = Object.entries(GRADES).find(([, t]) =>
      results.every((r, i) => r <= t[i]))?.[0] || 'F';

    // Output
    if (flags.has('-q') || flags.has('--quiet')) {
      console.log(grade);
    } else if (flags.has('-j') || flags.has('--json')) {
      const perHeader = (bulk / 7).toFixed(0);
      console.log(JSON.stringify({
        grade,
        configVersion: cv,
        registryHash: rh,
        bulkValidation: bulk,
        perHeader: Number(perHeader),
        checksum: cs,
        throughput: Math.floor(1e9 / bulk),
        bun: Bun.version,
        platform: `${process.platform}/${process.arch}`
      }, null, 2));
    } else if (flags.has('-h') || flags.has('--help')) {
      console.log(`proxy-grade - Proxy Validation Benchmark
Usage: bun grade [flags]

Flags:
  -j, --json     JSON output
  -q, --quiet    Grade only
  -h, --help     This help

Examples:
  bun grade          # Full report
  bun grade -q       # "A" or "B"
  bun grade -j       # JSON for CI`);
    } else {
      console.log(`\n🏆 Proxy Validation: ${grade}\n${'─'.repeat(35)}`);
      console.log(`  Config Version      ${cv.toFixed(1).padStart(10)} ns`);
      console.log(`  Registry Hash       ${rh.toFixed(1).padStart(10)} ns`);
      console.log(`  Bulk (7 headers)    ${bulk.toFixed(0).padStart(10)} ns`);
      console.log(`  Per-header          ${(bulk / 7).toFixed(0).padStart(10)} ns`);
      console.log(`  Checksum            ${cs.toFixed(1).padStart(10)} ns`);
      console.log(`\n  Throughput           ${Math.floor(1e9 / bulk).toLocaleString()} req/sec`);
      console.log(`  Bun ${Bun.version} on ${process.platform}/${process.arch}`);
    }

    return grade;

  } finally {
    // Restore console
    console.log = originalLog;
    console.warn = originalWarn;
  }
}

if (import.meta.main) await benchmark();
