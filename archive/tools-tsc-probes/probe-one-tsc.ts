#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
/** Print tsc errors for one tools/*.ts under tsconfig.bun.json. Usage: bun tools/probe-one-tsc.ts <file.ts> */
const name = process.argv[2];
if (!name) {
  console.error('usage: bun tools/probe-one-tsc.ts <file.ts>');
  process.exit(2);
}
const probe = 'tools/tsconfig.probe.json';
await Bun.write(
  probe,
  `${JSON.stringify(
    {
      extends: '../tsconfig.bun.json',
      compilerOptions: { lib: ['ESNext', 'DOM'] },
      include: [name],
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
const out = `${r.stdout.toString()}${r.stderr.toString()}`.trim();
console.log(out || '(clean)');
await Bun.$`rm -f ${probe}`.quiet();
process.exit(r.exitCode === 0 ? 0 : 1);
