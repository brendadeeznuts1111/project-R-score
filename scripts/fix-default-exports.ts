#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file, Bun.write
import { readText } from './lib/fs-bun';
/**
 * Bulk fix: identify default exports that should be named exports.
 *
 * Usage: bun run scripts/fix-default-exports.ts
 *
 * This script lists all files with default exports.
 * Manual review is needed to convert each one to named exports,
 * since the correct name depends on context.
 */

import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.cache', '.npm-cache']);
const EXTENSIONS = new Set(['.ts', '.tsx']);

const defaultExportRE =
  /export\s+default\s+(function|class|const|let|var|interface|type|abstract\s+class)\s+(\w+)/;
const defaultExportObjectRE = /export\s+default\s*\{/;
const defaultExportExprRE = /export\s+default\s+(\w+);?$/m;

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

console.info('Files with default exports:');
console.info('='.repeat(60));

for await (const file of walkFiles(ROOT)) {
  const content = await readText(file);
  let match;

  if ((match = content.match(defaultExportRE))) {
    console.info(
      `${file}:\n  export default ${match[1]} ${match[2]} -> export ${match[1]} ${match[2]}`
    );
  } else if ((match = content.match(defaultExportObjectRE))) {
    console.info(`${file}:\n  export default { ... } -> export const ... = { ... }`);
  } else if ((match = content.match(defaultExportExprRE))) {
    console.info(`${file}:\n  export default ${match[1]} -> export const ${match[1]} = ...`);
  }
}

console.info('\nTo fix: change export default to named export and update all imports.');
