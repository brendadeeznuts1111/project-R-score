#!/usr/bin/env bun
/**
 * Bulk fix: replace `: any` with `: unknown` in function signatures.
 *
 * Usage: bun run scripts/fix-any-to-unknown.ts [directory]
 *
 * This handles the safe mechanical cases:
 * - `(param: any)` → `(param: unknown)`
 * - `): any {` → `): unknown {`
 * - `): any =>` → `): unknown =>`
 * - `): any |` → `): unknown |`
 * - `): any)` → `): unknown)`
 * - `: any[]` → `: unknown[]`
 *
 * WARNING: This only handles the mechanical cases. Some : any usages
 * need proper context-specific types and should be reviewed.
 */

import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.argv[2] || process.cwd();
const EXTENSIONS = new Set(['.ts', '.tsx']);
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.cache', '.npm-cache', '.wrangler']);

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

// Safe patterns:
// 1. Function param: `(param: any)` → `(param: unknown)`
// 2. Return type: `): any {` → `): unknown {`
// 3. Return type arrow: `): any =>` → `): unknown =>`
// 4. Variable: `const x: any` → `const x: unknown`
// 5. Array: `: any[]` → `: unknown[]`
const SAFE_ANY_RE = /:\s*any\b(?!\s*\/\/)/g;

function replaceSafeAny(content: string): string {
  // Skip lines that are comments
  const lines = content.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      result.push(line);
      continue;
    }
    // Replace : any with : unknown but skip vendor annotations and test assertions
    if (line.includes('as any')) {
      // Keep as any for now - these need manual review
      result.push(line);
      continue;
    }
    // Replace : any with : unknown in function signatures and variables
    const newLine = line.replace(SAFE_ANY_RE, ': unknown');
    result.push(newLine);
  }

  return result.join('\n');
}

let totalFixed = 0;
let filesChanged = 0;

for await (const file of walkFiles(ROOT)) {
  const content = await readFile(file, 'utf-8');
  const newContent = replaceSafeAny(content);

  if (newContent === content) continue;

  if (DRY_RUN) {
    const count = (content.match(SAFE_ANY_RE) || []).length;
    console.info(`${file}: ${count} :any -> :unknown`);
    totalFixed += count;
    filesChanged++;
    continue;
  }

  await writeFile(file, newContent, 'utf-8');
  const count = (content.match(SAFE_ANY_RE) || []).length;
  totalFixed += count;
  filesChanged++;
}

console.info(`\nDone! ${DRY_RUN ? 'Found' : 'Fixed'} ${totalFixed} :any -> :unknown across ${filesChanged} files.`);
