#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Probe candidate tools paths under Bun recommended options.
 * Island membership is now glob-based (`tools/tsconfig.json`); this helper
 * only reports whether a candidate is green before you rely on the ratchet.
 *
 *   bun tools/expand-tools-tsconfig.ts a.ts cli/b.ts
 */
const candidates = process.argv.slice(2);
if (candidates.length === 0) {
  console.info('usage: bun tools/expand-tools-tsconfig.ts <rel-path.ts>…');
  console.info('island globs: *.ts · cli/*.ts · benchmarks/*.ts');
  process.exit(0);
}

async function errorCount(include: string[]): Promise<{ n: number; out: string }> {
  const probe = 'tools/tsconfig.probe.json';
  await Bun.write(
    probe,
    `${JSON.stringify(
      {
        extends: '../tsconfig.bun.json',
        compilerOptions: { lib: ['ESNext', 'DOM'] },
        include,
        exclude: ['node_modules', 'dist'],
      },
      null,
      2
    )}\n`
  );
  const r = Bun.spawnSync({
    cmd: ['bunx', 'tsc', '-p', probe, '--pretty', 'false'],
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const out = `${r.stdout.toString()}${r.stderr.toString()}`;
  return { n: (out.match(/error TS/g) ?? []).length, out };
}

let failed = 0;
for (const c of candidates) {
  const { n, out } = await errorCount([c]);
  if (n === 0) console.log(`0 errors :: ${c}`);
  else {
    failed++;
    console.log(`${n} errors :: ${c}`);
    if (Bun.env.VERBOSE) console.log(out);
  }
}

if (await Bun.file('tools/tsconfig.probe.json').exists()) {
  await Bun.$`rm tools/tsconfig.probe.json`.quiet();
}
process.exit(failed > 0 ? 1 : 0);
