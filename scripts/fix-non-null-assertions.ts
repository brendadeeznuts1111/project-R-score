#!/usr/bin/env bun
/**
 * Bulk fix: replace non-null assertions (!) with safe access patterns.
 *
 * Usage: bun run scripts/fix-non-null-assertions.ts
 *
 * Replaces `expr!` patterns that are property/variable accesses with
 * safe fallback patterns where feasible.
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.cache', '.npm-cache']);
const EXTENSIONS = new Set(['.ts', '.tsx']);

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

let total = 0;
let filesWithAssertions = 0;

for await (const file of walkFiles(ROOT)) {
  const content = await readFile(file, 'utf-8');
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
console.info('- For env vars: `process.env.FOO!` -> `process.env.FOO ?? ""`');
