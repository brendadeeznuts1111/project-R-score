#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/glob — Bun.Glob
// @see https://bun.com/docs/runtime/file-io — Bun.file, Bun.write
import { readText, listFilesSync } from './lib/fs-bun';
/**
 * Bulk fix: identify default exports that should be named exports.
 *
 * Usage: bun run scripts/fix-default-exports.ts
 *
 * This script lists all files with default exports.
 * Manual review is needed to convert each one to named exports,
 * since the correct name depends on context.
 */

const ROOT = process.cwd();
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.cache', '.npm-cache']);
const EXTENSIONS = new Set(['.ts', '.tsx']);

const defaultExportRE =
  /export\s+default\s+(function|class|const|let|var|interface|type|abstract\s+class)\s+(\w+)/;
const defaultExportObjectRE = /export\s+default\s*\{/;
const defaultExportExprRE = /export\s+default\s+(\w+);?$/m;

function* walkFiles(): Generator<string> {
  for (const rel of listFilesSync('**/*.{ts,tsx}', { cwd: ROOT })) {
    if (rel.split(/[/\\]/).some(p => EXCLUDE_DIRS.has(p))) continue;
    yield `${ROOT}/${rel}`;
  }
}

console.info('Files with default exports:');
console.info('='.repeat(60));

for (const file of walkFiles()) {
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
