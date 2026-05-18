#!/usr/bin/env bun
/**
 * Bulk fix: identify default exports that should be named exports.
 *
 * Usage: bun run scripts/fix-default-exports.ts
 *
 * This script lists all files with default exports.
 * Manual review is needed to convert each one to named exports,
 * since the correct name depends on context.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.cache']);
const EXTENSIONS = new Set(['.ts', '.tsx']);

const defaultExportRE = /export\s+default\s+(function|class|const|let|var|interface|type|abstract\s+class)\s+(\w+)/;
const defaultExportObjectRE = /export\s+default\s*\{/;
const defaultExportExprRE = /export\s+default\s+(\w+);?$/m;

async function* walkFiles(dir: string): AsyncGenerator<string> {
  const entries = await Bun.readdir(dir).catch(() => []);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stat = await Bun.stat(full).catch(() => null);
    if (!stat) continue;
    if (stat.isDirectory()) {
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
  const content = await readFile(file, 'utf-8');
  let match;

  if ((match = content.match(defaultExportRE))) {
    console.info(`${file}:\n  export default ${match[1]} ${match[2]} -> export ${match[1]} ${match[2]}`);
  } else if ((match = content.match(defaultExportObjectRE))) {
    console.info(`${file}:\n  export default { ... } -> export const ... = { ... }`);
  } else if ((match = content.match(defaultExportExprRE))) {
    console.info(`${file}:\n  export default ${match[1]} -> export const ${match[1]} = ...`);
  }
}

console.info('\nTo fix: change export default to named export and update all imports.');
