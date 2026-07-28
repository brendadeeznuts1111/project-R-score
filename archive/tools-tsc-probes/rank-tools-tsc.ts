#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
/** Rank tools paths by standalone tsc error count under tsconfig.bun.json. */
import { Glob } from 'bun';

const island = new Set(
  [
    ...(await Array.fromAsync(new Glob('*.ts').scan({ cwd: 'tools', onlyFiles: true }))),
    ...(await Array.fromAsync(new Glob('cli/*.ts').scan({ cwd: 'tools', onlyFiles: true }))),
    ...(await Array.fromAsync(new Glob('benchmarks/*.ts').scan({ cwd: 'tools', onlyFiles: true }))),
  ].filter(f => !f.endsWith('.test.ts') && !f.endsWith('.bench.ts'))
);

console.info(`island coverage: ${island.size} files under tools/{*.ts,cli,benchmarks}`);
console.info('(full ratchet — type-check:tools must stay green)');

const base = {
  extends: '../tsconfig.bun.json',
  compilerOptions: { lib: ['ESNext', 'DOM'] },
  exclude: ['node_modules', 'dist'],
};

// Rank any other nested tools/*.ts not in the island (future subdirs).
const rows: { file: string; errors: number }[] = [];
for await (const name of new Glob('**/*.ts').scan({ cwd: 'tools', onlyFiles: true })) {
  if (island.has(name)) continue;
  if (name.endsWith('.test.ts') || name.endsWith('.bench.ts')) continue;
  await Bun.write(
    'tools/tsconfig.probe.json',
    `${JSON.stringify({ ...base, include: [name] }, null, 2)}\n`
  );
  const r = Bun.spawnSync({
    cmd: ['bunx', 'tsc', '-p', 'tools/tsconfig.probe.json', '--pretty', 'false'],
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const out = `${r.stdout.toString()}${r.stderr.toString()}`;
  const n = (out.match(/error TS/g) ?? []).length;
  rows.push({ file: name, errors: n });
}

rows.sort((a, b) => a.errors - b.errors || a.file.localeCompare(b.file));
if (rows.length === 0) console.info('no out-of-island tools/**/*.ts');
else console.log(Bun.inspect.table(rows, ['file', 'errors'], { colors: true }));
await Bun.$`rm -f tools/tsconfig.probe.json`.quiet();
