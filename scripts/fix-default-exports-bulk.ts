#!/usr/bin/env bun
/**
 * Bulk fix: convert `export default function Name` to `export function Name`
 * and `export default Name` to `export const Name = ...` where possible.
 *
 * Usage: bun run scripts/fix-default-exports-bulk.ts [directory]
 *
 * This handles the mechanical cases:
 * - export default function Foo → export function Foo
 * - export default class Foo → export class Foo
 * - export default Foo (at end of file) → export const Foo = ...
 *
 * WARNING: Review changes after running. Some default exports are legit
 * (e.g., Next.js pages, dynamic imports).
 */

import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.argv[2] || process.cwd();
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.cache', '.npm-cache']);

const DRY_RUN = process.argv.includes('--dry-run');

async function* walkFiles(dir: string): AsyncGenerator<string> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (entry === '.git' || entry === 'node_modules') continue;
    let s;
    try {
      s = await stat(full);
    } catch {
      continue;
    }
    if (s.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry) || entry.startsWith('.')) continue;
      yield* walkFiles(full);
    } else {
      const ext = path.extname(entry);
      if (EXTENSIONS.has(ext) && !entry.endsWith('.d.ts')) yield full;
    }
  }
}

// Pattern 1: export default function Foo → export function Foo
const PATTERN_FUNC = /export\s+default\s+(async\s+)?function\s+(\w+)/g;
// Pattern 2: export default class Foo → export class Foo
const PATTERN_CLASS = /export\s+default\s+(abstract\s+)?class\s+(\w+)/g;
// Pattern 3: export default const Foo = → export const Foo =
const PATTERN_CONST = /export\s+default\s+(const|let|var)\s+(\w+)/g;

let totalFixed = 0;
let filesChanged = 0;

for await (const file of walkFiles(ROOT)) {
  const content = await readFile(file, 'utf-8');
  let newContent = content;
  let changed = false;

  // Fix export default function
  newContent = newContent.replace(PATTERN_FUNC, (match, asyncKw, name) => {
    changed = true;
    return `export ${asyncKw ? asyncKw + ' ' : ''}function ${name}`;
  });

  // Fix export default class
  newContent = newContent.replace(PATTERN_CLASS, (match, abstractKw, name) => {
    changed = true;
    return `export ${abstractKw || ''}class ${name}`;
  });

  // Fix export default const
  newContent = newContent.replace(PATTERN_CONST, (match, kind, name) => {
    changed = true;
    return `export ${kind} ${name}`;
  });

  if (!changed) continue;

  if (DRY_RUN) {
    const funcs = (content.match(PATTERN_FUNC) || []).length;
    const classes = (content.match(PATTERN_CLASS) || []).length;
    const consts = (content.match(PATTERN_CONST) || []).length;
    console.info(`${file}: ${funcs + classes + consts} default export(s)`);
    totalFixed += funcs + classes + consts;
    filesChanged++;
    continue;
  }

  await writeFile(file, newContent, 'utf-8');
  const funcs = (content.match(PATTERN_FUNC) || []).length;
  const classes = (content.match(PATTERN_CLASS) || []).length;
  const consts = (content.match(PATTERN_CONST) || []).length;
  totalFixed += funcs + classes + consts;
  filesChanged++;
}

console.info(`\nDone! ${DRY_RUN ? 'Found' : 'Fixed'} ${totalFixed} default exports across ${filesChanged} files.`);
if (DRY_RUN) {
  console.info('Run without --dry-run to apply fixes.');
}
