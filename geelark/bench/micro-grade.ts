#!/usr/bin/env bun
// micro-grade.ts - Ultra-minimal benchmark

const ns = () => Number(process.hrtime.bigint());
const { tmpdir } = await import('node:os');
const { join } = await import('node:path');

const GRADES = { 'A+':[50,1e3,3e3,5e3], 'A':[1e2,5e3,1e4,2e4], 'B':[5e2,2e4,5e4,1e5], 'C':[1e3,5e4,1e5,2e5] };

async function microGrade() {
  const temps = [];

  try {
    // String width
    let start = ns();
    for (let i = 0; i < 1e4; i++) Bun.stringWidth('📊');
    const sw = (ns() - start) / 1e4;

    // File write
    const fw = join(tmpdir(), `bun-${Date.now()}.txt`);
    temps.push(fw);
    start = ns();
    await Bun.write(fw, 'x'.repeat(73));
    const fwTime = ns() - start;

    // Build
    const bf = join(tmpdir(), `b${Date.now()}.ts`);
    const out = join(tmpdir(), `o${Date.now()}`);
    temps.push(bf, out);
    await Bun.write(bf, '//');
    start = ns();
    await Bun.build({ entrypoints: [bf], outdir: out });
    const bTime = ns() - start;

    // Spawn
    start = ns();
    await Bun.spawn(['echo'], { stdout: 'pipe' }).exited;
    const sTime = ns() - start;

    // Grade
    const results = [sw, fwTime, bTime, sTime];
    const grade = Object.entries(GRADES).find(([, t]) =>
      results.every((r, i) => r <= t[i]))?.[0] || 'F';

    // Output
    console.log(`\n🏆 ${grade}\n${'-'.repeat(20)}`);
    results.forEach((r, i) =>
      console.log(`${['📏','💾','🔨','🚀'][i]} ${r.toFixed(i?0:1)} ns`));

    return grade;

  } finally {
    temps.forEach(p => Bun.file(p).delete().catch(() => {}));
  }
}

if (import.meta.main) console.log(await microGrade());
