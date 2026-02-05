#!/usr/bin/env bun
// bun-grade.ts - Ultimate performance benchmark

const ns = () => performance.now() * 1e6; // nanoseconds
const tmp = () => `/tmp/bg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const flags = new Set(process.argv.slice(2));

const GRADES = {
  'A+':[50,1e3,3e3,5e3],
  'A':[100,5e3,1e4,2e4],
  'B':[500,2e4,5e4,1e5],
  'C':[1e3,5e4,1e5,2e5]
};

async function benchmark() {
  const files = [];

  try {
    // 1. String width (10k ops)
    let t = ns();
    for (let i = 0; i < 1e4; i++) Bun.stringWidth('🚀');
    const sw = (ns() - t) / 1e4;

    // 2. File write (73 bytes)
    const f1 = tmp();
    files.push(f1);
    t = ns();
    await Bun.write(f1, 'x'.repeat(73));
    const fw = ns() - t;

    // 3. Build (minimal TS)
    const f2 = `${tmp()}.ts`;
    files.push(f2);
    await Bun.write(f2, 'export {}');
    t = ns();
    await Bun.build({ entrypoints: [f2], outdir: '/tmp' });
    const bd = ns() - t;

    // 4. Spawn (lightweight)
    t = ns();
    await Bun.spawn(['true'], { stdout: 'ignore' }).exited;
    const sp = ns() - t;

    // Calculate grade
    const results = [sw, fw, bd, sp];
    const grade = Object.entries(GRADES).find(([, t]) =>
      results.every((r, i) => r <= t[i]))?.[0] || 'F';

    // Output
    if (flags.has('-q') || flags.has('--quiet')) {
      console.log(grade);
    } else if (flags.has('-j') || flags.has('--json')) {
      console.log(JSON.stringify({
        grade, stringWidth: sw, fileWrite: fw,
        build: bd, spawn: sp, bun: Bun.version,
        platform: `${process.platform}/${process.arch}`
      }, null, flags.has('--min') ? 0 : 2));
    } else if (flags.has('-h') || flags.has('--help')) {
      console.log(`bun-grade - Bun Performance Benchmark
Usage: bun grade [flags]

Flags:
  -j, --json     JSON output
  -q, --quiet    Grade only
  --min          Minified JSON
  -h, --help     This help
  -v, --version  Version info

Examples:
  bun grade          # Full report
  bun grade -q       # "A" or "B"
  bun grade -j       # JSON for CI
  bun grade -j --min # Compact JSON`);
    } else if (flags.has('-v') || flags.has('--version')) {
      console.log('bun-grade/1.0');
    } else {
      console.log(`\n🏆 Bun Performance: ${grade}\n${'─'.repeat(30)}`);
      ['String Width', 'File Write', 'Build', 'Spawn'].forEach((name, i) => {
        console.log(`  ${name.padEnd(12)} ${results[i].toFixed(i ? 0 : 1).padStart(8)} ns`);
      });
      console.log(`\n  Bun ${Bun.version} on ${process.platform}/${process.arch}`);
    }

    return grade;

  } finally {
    // Cleanup
    await Promise.allSettled(files.map(f => Bun.file(f).delete()));
  }
}

// Run if called directly
if (import.meta.main) await benchmark();
