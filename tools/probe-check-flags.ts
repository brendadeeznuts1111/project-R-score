#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
/** Probe enabling one tsconfig.check.json flag at a time. */
const flag = Bun.argv[2];
if (!flag) {
  console.error('Usage: bun tools/probe-check-flags.ts <compilerOption>');
  process.exit(1);
}

const j = structuredClone(await Bun.file('tsconfig.check.json').json()) as {
  compilerOptions: Record<string, unknown>;
};
j.compilerOptions[flag] = true;
await Bun.write('tsconfig.check.probe.json', `${JSON.stringify(j, null, 2)}\n`);

const r = Bun.spawnSync({
  cmd: ['bunx', 'tsc', '-b', 'tsconfig.check.probe.json', '--pretty', 'false'],
  stdout: 'pipe',
  stderr: 'pipe',
});
const out = `${r.stdout.toString()}${r.stderr.toString()}`;
const errors = out.split('\n').filter(l => /error TS\d+/.test(l));
console.log(`${errors.length} :: ${flag}=true`);
for (const e of errors.slice(0, 25)) console.log(e);

await Bun.$`rm -f tsconfig.check.probe.json`.quiet();
process.exit(errors.length === 0 ? 0 : 1);
