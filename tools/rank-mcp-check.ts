#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
/** Per-file error counts for lib/mcp under tsconfig.check.json flags. */
import { Glob } from 'bun';

const check = (await Bun.file('tsconfig.check.json').json()) as {
  compilerOptions: Record<string, unknown>;
  exclude: string[];
};

const rows: { f: string; n: number }[] = [];
for await (const f of new Glob('lib/mcp/**/*.ts').scan({ onlyFiles: true })) {
  if (f.endsWith('.test.ts')) continue;
  await Bun.write(
    'tsconfig.check.probe.json',
    `${JSON.stringify(
      {
        extends: './tsconfig.bun.json',
        compilerOptions: {
          ...check.compilerOptions,
          incremental: false,
          lib: ['ESNext', 'DOM'],
        },
        include: [f],
        exclude: check.exclude,
      },
      null,
      2
    )}\n`
  );
  const r = Bun.spawnSync({
    cmd: ['bunx', 'tsc', '-p', 'tsconfig.check.probe.json', '--pretty', 'false'],
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const n = (`${r.stdout}${r.stderr}`.match(/error TS/g) ?? []).length;
  rows.push({ f, n });
  console.log(`${String(n).padStart(3)} ${f}`);
}
rows.sort((a, b) => a.n - b.n);
console.log(
  '\ngreen:',
  rows.filter(r => r.n === 0).map(r => r.f)
);
await Bun.$`rm -f tsconfig.check.probe.json`.quiet();
