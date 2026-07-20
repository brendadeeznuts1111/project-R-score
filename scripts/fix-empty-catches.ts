#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file, Bun.write
// @see https://bun.com/docs/runtime/glob — Bun.Glob
/**
 * Scan for empty catch blocks and add basic error logging.
 *
 * Usage: bun run scripts/fix-empty-catches.ts
 *
 * WARNING: This is a mechanical fix. Some empty catches are intentional
 * (e.g., cleanup in finally blocks). Review after running.
 */

import path from 'node:path';
import { readText, writeText, listFilesSync } from './lib/fs-bun';

const ROOT = process.cwd();
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.cache', 'coverage']);

const DRY_RUN = process.argv.includes('--dry-run');

function* walkFiles(): Generator<string> {
  for (const rel of listFilesSync('**/*.{ts,tsx,js,jsx,mjs,cjs}', { cwd: ROOT })) {
    if (rel.endsWith('.d.ts')) continue;
    if (rel.split(/[/\\]/).some(p => EXCLUDE_DIRS.has(p) || p.startsWith('.'))) continue;
    yield path.join(ROOT, rel);
  }
}

// Patterns for empty catches
const EMPTY_CATCH_RE = /catch\s*(\([^)]*\))?\s*\{\s*\}/g;

// Generate replacement based on context
function replacement(match: string): string {
  const hasParam = match.includes('(');
  if (hasParam) {
    const param = match.match(/\(([^)]*)\)/)?.[1] || 'e';
    return `catch (${param}) {\n    console.error('Unhandled error:', ${param});\n  }`;
  }
  return `catch {\n    console.error('Unhandled error:', error);\n  }`;
}

async function main() {
  let totalFixed = 0;
  let filesChanged = 0;

  for (const file of walkFiles()) {
    const content = await readText(file);
    const matches = content.match(EMPTY_CATCH_RE);
    if (!matches) continue;

    if (DRY_RUN) {
      console.info(`${file}: ${matches.length} empty catch(es)`);
      totalFixed += matches.length;
      filesChanged++;
      continue;
    }

    const newContent = content.replace(EMPTY_CATCH_RE, replacement);
    await writeText(file, newContent);
    totalFixed += matches.length;
    filesChanged++;
    console.info(`Fixed ${file}: ${matches.length} empty catch(es)`);
  }

  console.info(
    `\nDone! ${DRY_RUN ? 'Found' : 'Fixed'} ${totalFixed} empty catches across ${filesChanged} files.`
  );
  if (DRY_RUN) {
    console.info('Run without --dry-run to apply fixes.');
  }
}

if (import.meta.main) {
  await main();
}
