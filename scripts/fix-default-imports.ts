#!/usr/bin/env bun
/**
 * Convert default imports to named imports after fixing exports.
 *
 * Usage: bun run scripts/fix-default-imports.ts [directory]
 *
 * Changes `import X from './X'` to `import { X } from './X'`
 * for local modules (path starts with ./ ../ @/).
 * Skips third-party packages.
 *
 * WARNING: May break if X is not the actual exported name.
 * Review changes after running.
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

// Pattern: import DefaultName from './local-path' or '@/local-path'
// But NOT: import { named } from '...' or import * as ns from '...'
const IMPORT_DEFAULT_RE = /^import\s+(\w+)\s+from\s+['"](\.[^'"]+|@\/[^'"]+)['"];?$/m;

let totalFixed = 0;
let filesChanged = 0;

for await (const file of walkFiles(ROOT)) {
  const content = await readFile(file, 'utf-8');
  let newContent = content;
  let changed = false;

  newContent = newContent.replace(IMPORT_DEFAULT_RE, (match, name, modulePath) => {
    changed = true;
    return `import { ${name} } from '${modulePath}';`;
  });

  if (!changed) continue;

  if (DRY_RUN) {
    console.info(`${file}: updated import(s)`);
    totalFixed++;
    filesChanged++;
    continue;
  }

  await writeFile(file, newContent, 'utf-8');
  totalFixed++;
  filesChanged++;
}

console.info(
  `\nDone! ${DRY_RUN ? 'Found' : 'Fixed'} ${totalFixed} default imports across ${filesChanged} files.`
);
if (DRY_RUN) {
  console.info('Run without --dry-run to apply fixes.');
}
