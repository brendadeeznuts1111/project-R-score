#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/file-io — Bun.write
// @see https://bun.com/docs/runtime/glob — Bun.Glob
/**
 * Replace crypto.randomUUID() → Bun.randomUUIDv7() under lib/
 * Usage: bun scripts/uuid-sweep-lib.ts [--dry-run]
 */
const DRY = Bun.argv.includes('--dry-run');
const SEE = '// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7\n';

const glob = new Bun.Glob('**/*.{ts,tsx}');
const changed: string[] = [];

for await (const rel of glob.scan({ cwd: 'lib', onlyFiles: true })) {
  if (rel.includes('node_modules') || rel.endsWith('.d.ts')) continue;
  const path = `lib/${rel}`;
  const original = await Bun.file(path).text();
  if (!/\bcrypto\.randomUUID\s*\(/.test(original)) continue;

  let text = original.replace(/\bcrypto\.randomUUID\s*\(\s*\)/g, 'Bun.randomUUIDv7()');
  if (text === original) continue;

  if (!text.includes('utils#bun-randomuuidv7') && !text.includes('Bun.randomUUIDv7 —')) {
    if (text.startsWith('#!')) {
      const nl = text.indexOf('\n');
      text = text.slice(0, nl + 1) + SEE + text.slice(nl + 1);
    } else {
      text = SEE + text;
    }
  }

  const count = (original.match(/\bcrypto\.randomUUID\s*\(/g) || []).length;
  changed.push(`${path} (${count})`);
  if (!DRY) await Bun.write(path, text);
}

console.info(DRY ? 'Dry-run uuid sweep' : 'UUID sweep applied');
console.info(JSON.stringify({ files: changed.length, changed }, null, 2));
