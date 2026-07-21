#!/usr/bin/env bun
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/glob — Bun.Glob
// @see https://bun.com/docs/runtime/file-io — Bun.file, Bun.write
import { readText, writeText, listFilesSync } from './lib/fs-bun';
/**
 * Bulk fix: replace `as any` with `as unknown` or proper type assertions.
 *
 * Usage: bun run scripts/fix-as-any.ts [directory]
 *
 * Replaces common as any patterns:
 * - `(this as any).prop` -> `(this as Record<string, unknown>).prop`
 * - `(error as any).prop` -> `(error as Record<string, unknown>).prop`
 * - `(value as any).prop` -> `(value as Record<string, unknown>).prop`
 * - `(config as any).prop` -> `(config as Record<string, unknown>).prop`
 * - `(obj as any[])` -> `(obj as unknown[])`
 * - `(Bun as any).method` -> `(Bun as Record<string, unknown>).method`
 */

const ROOT = Bun.argv[2] || process.cwd();
const EXTENSIONS = new Set(['.ts', '.tsx']);
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.cache', '.npm-cache']);

const DRY_RUN = Bun.argv.includes('--dry-run');

function* walkFiles(): Generator<string> {
  for (const rel of listFilesSync('**/*.{ts,tsx}', { cwd: ROOT })) {
    if (rel.split(/[/\\]/).some(p => EXCLUDE_DIRS.has(p))) continue;
    yield `${ROOT}/${rel}`;
  }
}

const PATTERNS: Array<{ from: RegExp; to: string; label: string }> = [
  // (this as any).prop -> (this as Record<string, unknown>).prop
  {
    from: /\(this\s+as\s+any\)\.(\w+)/g,
    to: '(this as Record<string, unknown>).$1',
    label: '(this as any)',
  },
  // (error as any).prop -> (error as Record<string, unknown>).prop
  {
    from: /\(error\s+as\s+any\)\.(\w+)/g,
    to: '(error as Record<string, unknown>).$1',
    label: '(error as any)',
  },
  // (obj as any[]) -> (obj as unknown[])
  { from: /(\w+)\s+as\s+any\[\]/g, to: '$1 as unknown[]', label: 'as any[]' },
];

const SIMPLE_VAR_RE = /\(([a-zA-Z_]\w*)\s+as\s+any\)\.(\w+)/g;

let totalFixed = 0;
let filesChanged = 0;

for (const file of walkFiles()) {
  let content: string;
  try {
    content = await readText(file);
  } catch {
    continue;
  }

  let newContent = content;
  let changed = false;

  // Apply fixed patterns
  for (const { from, to } of PATTERNS) {
    newContent = newContent.replace(from, to);
  }

  // Apply general pattern: (variable as any).prop -> (variable as Record<string, unknown>).prop
  newContent = newContent.replace(SIMPLE_VAR_RE, '($1 as Record<string, unknown>).$2');

  if (newContent === content) continue;

  const count =
    (content.match(/as\s+any/g) || []).length - (newContent.match(/as\s+any/g) || []).length;

  if (DRY_RUN) {
    console.info(
      `${file.startsWith(ROOT + '/') ? file.slice(ROOT.length + 1) : file}: ${count} as any -> as Record/unknown`
    );
    totalFixed += count;
    filesChanged++;
    continue;
  }

  await writeText(file, newContent);
  totalFixed += count;
  filesChanged++;
}

console.info(
  `\nDone! ${DRY_RUN ? 'Found' : 'Fixed'} ${totalFixed} as any -> as unknown across ${filesChanged} files.`
);
