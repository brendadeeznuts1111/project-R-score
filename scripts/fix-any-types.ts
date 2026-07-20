#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file, Bun.write
import { readText } from './lib/fs-bun';
/**
 * Bulk fix: list any-type usages that should be replaced with unknown or proper types.
 *
 * Usage: bun run scripts/fix-any-types.ts
 *
 * This script finds patterns like `: any`, `as any`, `as any[]`
 * and reports them. Manual review is needed for each case.
 */

import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.cache', '.npm-cache']);
const EXTENSIONS = new Set(['.ts', '.tsx']);

const patterns = [
  { re: /:\s*any\b/g, label: ': any' },
  { re: /as\s+any\b/g, label: 'as any' },
  { re: /as\s+any\[\]\b/g, label: 'as any[]' },
];

async function* walkFiles(dir: string): AsyncGenerator<string> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    let s;
    try {
      s = await stat(full);
    } catch {
      continue;
    }
    if (s.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry)) continue;
      yield* walkFiles(full);
    } else {
      const ext = path.extname(entry);
      if (EXTENSIONS.has(ext)) yield full;
    }
  }
}

const results: Array<{ file: string; line: number; text: string; pattern: string }> = [];

for await (const file of walkFiles(ROOT)) {
  const content = await readText(file);
  const lines = content.split('\n');

  for (const { re, label } of patterns) {
    for (let i = 0; i < lines.length; i++) {
      re.lastIndex = 0;
      if (re.test(lines[i])) {
        results.push({
          file,
          line: i + 1,
          text: lines[i].trim(),
          pattern: label,
        });
      }
    }
  }
}

results.sort((a, b) => a.file.localeCompare(b.file));

let totalByPattern: Record<string, number> = {};
for (const r of results) {
  totalByPattern[r.pattern] = (totalByPattern[r.pattern] || 0) + 1;
}

console.info('Any type usage summary:');
console.info('='.repeat(60));
for (const [pattern, count] of Object.entries(totalByPattern).sort((a, b) => b[1] - a[1])) {
  console.info(`${pattern}: ${count} occurrences`);
}
console.info(`Total: ${results.length}\n`);

if (results.length > 100) {
  console.info(`Showing first 100 of ${results.length} results:\n`);
}

const display = results.length > 100 ? results.slice(0, 100) : results;
for (const r of display) {
  console.info(`${r.file}:${r.line} (${r.pattern})`);
  console.info(`  ${r.text}\n`);
}

console.info('\nFix guidance:');
console.info('- `: any` -> `: unknown` (with type guard) or a proper interface');
console.info('- `as any` -> proper type assertion or restructure code');
console.info('- Parameters: add proper interface rather than any');
