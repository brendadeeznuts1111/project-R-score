#!/usr/bin/env bun
/**
 * Bulk fix: replace console.log with console.info across TypeScript files.
 *
 * Usage: bun run scripts/fix-console-log.ts
 *
 * This is a mechanical refactor — console.log is banned by project convention.
 * Only console.warn, console.error, console.info, console.table,
 * console.group, and console.groupEnd are permitted.
 */

import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.cache']);

async function* walkTsFiles(dir: string): AsyncGenerator<string> {
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
      yield* walkTsFiles(full);
    } else {
      const ext = path.extname(entry);
      if (EXTENSIONS.has(ext)) yield full;
    }
  }
}

let replaced = 0;
let filesChanged = 0;

for await (const file of walkTsFiles(ROOT)) {
  const content = await readFile(file, 'utf-8');

  // Replace non-template-literal console.log calls
  // Skip lines that are already console.info/error/warn/table/group/groupEnd
  // This is a simple regex that catches most cases
  const newContent = content.replace(/(?<![.\w])console\.log\(/g, 'console.info(');

  if (newContent !== content) {
    await writeFile(file, newContent, 'utf-8');
    const count =
      (newContent.match(/console\.info\(/g) || []).length -
      (content.match(/console\.info\(/g) || []).length;
    replaced += count;
    filesChanged++;
    console.info(`Fixed ${file}: ${count} console.log -> console.info`);
  }
}

console.info(`\nDone! Fixed ${replaced} console.log calls across ${filesChanged} files.`);
