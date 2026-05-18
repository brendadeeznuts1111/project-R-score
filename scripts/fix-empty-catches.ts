#!/usr/bin/env bun
/**
 * Scan for empty catch blocks and add basic error logging.
 *
 * Usage: bun run scripts/fix-empty-catches.ts
 *
 * Replaces `} catch {
    console.error('Unhandled error:', error);
  }` and `} catch (e) {
    console.error('Unhandled error:', e);
  }` with `} catch { console.error(...) }`
 * and `} catch(e) { console.error(e) }` respectively.
 *
 * WARNING: This is a mechanical fix. Some empty catches are intentional
 * (e.g., cleanup in finally blocks). Review after running.
 */

import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.cache', 'coverage']);

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

  for await (const file of walkFiles(ROOT)) {
    const content = await readFile(file, 'utf-8');
    const matches = content.match(EMPTY_CATCH_RE);
    if (!matches) continue;

    if (DRY_RUN) {
      console.info(`${file}: ${matches.length} empty catch(es)`);
      totalFixed += matches.length;
      filesChanged++;
      continue;
    }

    const newContent = content.replace(EMPTY_CATCH_RE, replacement);
    await writeFile(file, newContent, 'utf-8');
    totalFixed += matches.length;
    filesChanged++;
    console.info(`Fixed ${file}: ${matches.length} empty catch(es)`);
  }

  console.info(`\nDone! ${DRY_RUN ? 'Found' : 'Fixed'} ${totalFixed} empty catches across ${filesChanged} files.`);
  if (DRY_RUN) {
    console.info('Run without --dry-run to apply fixes.');
  }
}

await main();
