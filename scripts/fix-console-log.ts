#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file, Bun.write
// @see https://bun.com/docs/runtime/glob — Bun.Glob
/**
 * Bulk fix: replace console.log with console.info across TypeScript files.
 *
 * Usage: bun run scripts/fix-console-log.ts
 *
 * This is a mechanical refactor — console.log is banned by project convention.
 * Only console.warn, console.error, console.info, console.table,
 * console.group, and console.groupEnd are permitted.
 */

import path from 'node:path';
import { readText, writeText, listFilesSync } from './lib/fs-bun';

const ROOT = process.cwd();
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.cache']);

function* walkTsFiles(): Generator<string> {
  for (const rel of listFilesSync('**/*.{ts,tsx,js,jsx}', { cwd: ROOT })) {
    if (rel.split(/[/\\]/).some(p => EXCLUDE_DIRS.has(p))) continue;
    yield path.join(ROOT, rel);
  }
}

let replaced = 0;
let filesChanged = 0;

for (const file of walkTsFiles()) {
  const content = await readText(file);

  // Replace non-template-literal console.log calls
  // Skip lines that are already console.info/error/warn/table/group/groupEnd
  // This is a simple regex that catches most cases
  const newContent = content.replace(/(?<![.\w])console\.log\(/g, 'console.info(');

  if (newContent !== content) {
    await writeText(file, newContent);
    const count =
      (newContent.match(/console\.info\(/g) || []).length -
      (content.match(/console\.info\(/g) || []).length;
    replaced += count;
    filesChanged++;
    console.info(`Fixed ${file}: ${count} console.log -> console.info`);
  }
}

console.info(`\nDone! Fixed ${replaced} console.log calls across ${filesChanged} files.`);
