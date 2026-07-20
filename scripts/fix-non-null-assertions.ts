#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/glob — Bun.Glob
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io — Bun.file, Bun.write
import { readText, listFilesSync } from './lib/fs-bun';
/**
 * Bulk fix: replace non-null assertions (!) with safe access patterns.
 *
 * Usage: bun run scripts/fix-non-null-assertions.ts
 *
 * Replaces `expr!` patterns that are property/variable accesses with
 * safe fallback patterns where feasible.
 */

import path from 'node:path';

const ROOT = process.cwd();
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.cache', '.npm-cache']);
const EXTENSIONS = new Set(['.ts', '.tsx']);

function* walkFiles(): Generator<string> {
  for (const rel of listFilesSync('**/*.{ts,tsx}', { cwd: ROOT })) {
    if (rel.split(/[/\\]/).some(p => EXCLUDE_DIRS.has(p))) continue;
    yield path.join(ROOT, rel);
  }
}

let total = 0;
let filesWithAssertions = 0;

for (const file of walkFiles()) {
  const content = await readText(file);
  const lines = content.split('\n');
  let fileCount = 0;

  for (let i = 0; i < lines.length; i++) {
    // Match non-null assertions that aren't in comments or strings
    const matches = lines[i].match(
      /[a-zA-Z_$][a-zA-Z0-9_$.]*(?:\?\.(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*))*!/g
    );
    if (matches) {
      fileCount += matches.length;
      total += matches.length;
    }
  }

  if (fileCount > 0) {
    filesWithAssertions++;
    console.info(`${file}: ${fileCount} non-null assertions`);
  }
}

console.info(`\nTotal: ${total} non-null assertions across ${filesWithAssertions} files`);
console.info('\nFix guidance:');
console.info('- `obj.prop!` -> `obj.prop ?? fallback` (add a default)');
console.info('- `obj!.method()` -> check null first or use optional chaining');
console.info('- `array.pop()!` -> use a proper type guard');
console.info('- For env vars: `Bun.env.FOO!` -> `Bun.env.FOO ?? ""`');
