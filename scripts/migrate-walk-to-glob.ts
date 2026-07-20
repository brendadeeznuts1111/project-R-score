#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file, Bun.write
// @see https://bun.com/docs/runtime/glob — Bun.Glob
/**
 * One-shot: rewrite readdir/stat walkers → listFilesSync(Bun.Glob) in listed files.
 * Usage: bun scripts/migrate-walk-to-glob.ts [--dry-run]
 */
const DRY = Bun.argv.includes('--dry-run');

const FILES = [
  'scripts/fix-as-any.ts',
  'scripts/fix-default-exports.ts',
  'scripts/fix-default-exports-bulk.ts',
  'scripts/fix-pin-versions.ts',
  'scripts/fix-non-null-assertions.ts',
];

const WALK_REPLACEMENT = `function* walkFiles(): Generator<string> {
  for (const rel of listFilesSync('**/*.{ts,tsx}', { cwd: ROOT })) {
    if (rel.split(/[/\\\\]/).some(p => EXCLUDE_DIRS.has(p))) continue;
    yield path.join(ROOT, rel);
  }
}`;

for (const file of FILES) {
  if (!(await Bun.file(file).exists())) {
    console.info('skip missing', file);
    continue;
  }
  let t = await Bun.file(file).text();
  if (!t.includes('node:fs/promises')) {
    console.info('unchanged (no node:fs)', file);
    continue;
  }

  t = t.replace(/import \{ readdir, stat \} from ['"]node:fs\/promises['"];?\n/, '');

  // Add listFilesSync to fs-bun import
  if (/from ['"]\.\/lib\/fs-bun['"]/.test(t)) {
    t = t.replace(/import \{([^}]+)\} from ['"]\.\/lib\/fs-bun['"];?/, (_m, body: string) => {
      const names = body
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
      if (!names.includes('listFilesSync')) names.push('listFilesSync');
      return `import { ${names.join(', ')} } from './lib/fs-bun';`;
    });
  }

  if (!t.includes('runtime/glob')) {
    if (t.startsWith('#!')) {
      const nl = t.indexOf('\n');
      t = t.slice(0, nl + 1) + '// @see https://bun.com/docs/runtime/glob — Bun.Glob\n' + t.slice(nl + 1);
    } else {
      t = '// @see https://bun.com/docs/runtime/glob — Bun.Glob\n' + t;
    }
  }

  const walkRe = /async function\* walkFiles\(dir: string\): AsyncGenerator<string> \{[\s\S]*?\n\}/;
  if (walkRe.test(t)) {
    t = t.replace(walkRe, WALK_REPLACEMENT);
  } else {
    console.info('warn: no walk match', file);
  }

  t = t.replace(/for await \(const (\w+) of walkFiles\(ROOT\)\)/g, 'for (const $1 of walkFiles())');

  if (!DRY) await Bun.write(file, t);
  console.info(DRY ? 'would' : 'wrote', file);
}
