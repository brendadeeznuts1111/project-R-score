#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/environment-variables#setting-environment-variables — Bun.env
// @see https://bun.com/docs/runtime/file-io — Bun.file, Bun.write
// @see https://bun.com/docs/runtime/glob — Bun.Glob
/**
 * Multi-root env sweep: process.env → Bun.env
 * Preserves quoted catalog tokens ('process.env' / "process.env").
 * Skips detector catalogs that must still match the string process.env.
 *
 * Usage:
 *   bun scripts/env-sweep-roots.ts [--dry-run] [--roots=scripts,packages,lib]
 */
const DRY = Bun.argv.includes('--dry-run');
const rootsArg = Bun.argv.find(a => a.startsWith('--roots='))?.slice('--roots='.length);
const ROOTS = (rootsArg ?? 'scripts,packages,lib')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const SKIP = new Set([
  // Catalogs that must still detect the string "process.env"
  'lib/validation/bun-first-auditor.ts',
  'lib/validation/bun-first-compliance.ts',
  'lib/guards/bun-first-guard.ts',
  'packages/guards/src/bun-first-guard.ts',
  'scripts/bun-rules.ts',
  'scripts/dx-mcp.ts',
  'scripts/env-sweep-lib.ts',
  'scripts/env-sweep-roots.ts',
  'scripts/bun-native-discover.ts',
]);

const ENV_SEE = '// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env';

const glob = new Bun.Glob('**/*.{ts,tsx}');
const changed: string[] = [];
const stats = { files: 0, replacements: 0, skippedFiles: 0 };

for (const root of ROOTS) {
  for await (const rel of glob.scan({ cwd: root, onlyFiles: true })) {
    const file = `${root}/${rel}`;
    if (SKIP.has(file)) {
      stats.skippedFiles++;
      continue;
    }
    if (rel.includes('node_modules') || rel.endsWith('.d.ts')) continue;
    // Skip intentional process.env string samples in discover report consumers
    if (rel.includes('__tests__') || rel.includes('.test.')) continue;

    const original = await Bun.file(file).text();
    if (!original.includes('process.env')) continue;

    let text = original;

    // Protect quoted catalog tokens: 'process.env' / "process.env"
    const placeholders: string[] = [];
    text = text.replace(/(['"])process\.env\1/g, m => {
      const i = placeholders.length;
      placeholders.push(m);
      return `__ENV_STR_${i}__`;
    });

    const matches = text.match(/\bprocess\.env\b/g);
    if (!matches?.length) continue;

    text = text.replace(/\bprocess\.env\b/g, 'Bun.env');
    stats.replacements += matches.length;

    text = text.replace(/__ENV_STR_(\d+)__/g, (_, i) => placeholders[Number(i)]!);

    // Ensure @see for Bun.env
    if (
      text.includes('Bun.env') &&
      !text.includes('utils#bun-env') &&
      !text.includes('environment-variables') &&
      !text.includes('— Bun.env')
    ) {
      if (text.startsWith('#!')) {
        const nl = text.indexOf('\n');
        text = text.slice(0, nl + 1) + ENV_SEE + '\n' + text.slice(nl + 1);
      } else {
        const lines = text.split('\n');
        let insertAt = 0;
        for (let i = 0; i < Math.min(lines.length, 30); i++) {
          const line = lines[i]!;
          if (line.startsWith('//') || line.trim() === '' || line.startsWith('#!')) {
            insertAt = i + 1;
            continue;
          }
          break;
        }
        lines.splice(insertAt, 0, ENV_SEE);
        text = lines.join('\n');
      }
    }

    if (text === original) continue;

    changed.push(`${file} (${matches.length})`);
    stats.files++;
    if (!DRY) {
      await Bun.write(file, text);
    }
  }
}

console.info(DRY ? 'Dry-run env sweep' : 'Env sweep applied');
console.info(JSON.stringify({ roots: ROOTS, stats, changed }, null, 2));
