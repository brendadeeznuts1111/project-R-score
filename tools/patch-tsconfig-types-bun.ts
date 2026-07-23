#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/** Add `"types": ["bun"]` to tsconfigs that omit types (TS6 allowlist). */
const files = Bun.argv.slice(2);
if (!files.length) {
  console.error('Usage: bun tools/patch-tsconfig-types-bun.ts <tsconfig.json>...');
  process.exit(1);
}

for (const f of files) {
  if (!(await Bun.file(f).exists())) {
    console.log('missing', f);
    continue;
  }
  const j = (await Bun.file(f).json()) as {
    compilerOptions?: Record<string, unknown>;
  };
  j.compilerOptions = j.compilerOptions ?? {};
  if (j.compilerOptions.types) {
    console.log('skip (has types)', f);
    continue;
  }
  j.compilerOptions.types = ['bun'];
  if (!j.compilerOptions.ignoreDeprecations) {
    j.compilerOptions.ignoreDeprecations = '6.0';
  }
  await Bun.write(f, `${JSON.stringify(j, null, 2)}\n`);
  console.log('types:bun →', f);
}
