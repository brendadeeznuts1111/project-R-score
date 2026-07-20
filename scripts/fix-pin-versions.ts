#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file, Bun.write
import { readText, writeText } from './lib/fs-bun';
/**
 * Pin all dependency versions to exact versions across the monorepo.
 *
 * Usage: bun run scripts/fix-pin-versions.ts
 *
 * Converts:
 *   "typescript": "^5.6.3" -> "typescript": "5.6.3"
 *   "zod": "~3.22.0"      -> "zod": "3.22.0"
 *   "prettier": "^3.0.0"  -> "prettier": "3.0.0"
 *
 * Skips:
 *   - workspace:* protocol
 *   - catalog: protocol
 *   - file: protocol
 *   - git: / github: protocols
 *   - "latest"
 *   - "*" (any version)
 *   - URL-based versions
 */

import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.npm-cache',
  '.git',
  'dist',
  'build',
  '.cache',
  'coverage',
  '.wrangler',
  '.bun-docs-cache',
]);

const DRY_RUN = process.argv.includes('--dry-run');

const CARET_TILDE_RE = /^[\^~]/;
const KEEP_PROTOCOLS = ['workspace:', 'catalog:', 'file:', 'git:', 'github:'];

function isPinned(version: string): boolean {
  // Already exact
  if (/^\d+\.\d+\.\d+/.test(version)) return true;
  // Protocol reference
  if (KEEP_PROTOCOLS.some(p => version.startsWith(p))) return true;
  // Special values
  if (version === 'latest' || version === '*' || version === '') return true;
  return false;
}

function pinVersion(version: string): string {
  if (isPinned(version)) return version;
  // Remove leading ^ or ~
  const stripped = version.replace(CARET_TILDE_RE, '');
  // If what remains is a valid semver, return it pinned
  if (/^\d+\.\d+\.\d+/.test(stripped)) return stripped;
  // Handle pre-release tags: ^1.2.3-alpha.1 -> 1.2.3-alpha.1
  if (/^\d+\.\d+\.\d+-/.test(stripped)) return stripped;
  // Handle >= style
  if (
    version.startsWith('>=') ||
    version.startsWith('<=') ||
    version.startsWith('>') ||
    version.startsWith('<')
  ) {
    const match = stripped.match(/(\d+\.\d+\.\d+)/);
    if (match) return match[1];
  }
  // Can't parse, leave as-is
  return version;
}

async function* walkFiles(dir: string): AsyncGenerator<string> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (entry === '.git' || entry === 'node_modules' || entry === '.npm-cache') continue;
    let s;
    try {
      s = await stat(full);
    } catch {
      continue;
    }
    if (s.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry) || (entry.startsWith('.') && entry !== '.')) continue;
      yield* walkFiles(full);
    } else if (entry === 'package.json') {
      yield full;
    }
  }
}

const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

let totalPinned = 0;
let filesChanged = 0;

for await (const file of walkFiles(ROOT)) {
  let content: string;
  let pkg: Record<string, unknown>;
  try {
    content = await readText(file);
    pkg = JSON.parse(content);
  } catch {
    continue;
  }

  let changed = false;

  for (const field of DEP_FIELDS) {
    const deps = pkg[field] as Record<string, string> | undefined;
    if (!deps) continue;

    for (const [name, version] of Object.entries(deps)) {
      if (typeof version !== 'string') continue;
      const pinned = pinVersion(version);
      if (pinned !== version) {
        deps[name] = pinned;
        changed = true;
        if (!DRY_RUN) {
          console.info(`${path.relative(ROOT, file)}: ${name} ${version} -> ${pinned}`);
        }
      }
    }
  }

  // Also pin catalog entries in root package.json
  const catalog = pkg['catalog'] as Record<string, string> | undefined;
  if (catalog) {
    for (const [name, version] of Object.entries(catalog)) {
      if (typeof version !== 'string') continue;
      const pinned = pinVersion(version);
      if (pinned !== version) {
        catalog[name] = pinned;
        changed = true;
        if (!DRY_RUN) {
          console.info(`${path.relative(ROOT, file)}: catalog.${name} ${version} -> ${pinned}`);
        }
      }
    }
  }

  if (!changed) continue;

  if (DRY_RUN) {
    // Count changes
    for (const field of DEP_FIELDS) {
      const deps = pkg[field] as Record<string, string> | undefined;
      if (!deps) continue;
      for (const [name, version] of Object.entries(deps)) {
        if (typeof version !== 'string') continue;
        if (version !== (pkg as any)[field][name]) totalPinned++;
      }
    }
    filesChanged++;
    continue;
  }

  await writeText(file, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
  filesChanged++;
}

// Count total in dry-run mode
if (DRY_RUN) {
  let dryCount = 0;
  for await (const file of walkFiles(ROOT)) {
    let content: string;
    try {
      content = await readText(file);
    } catch {
      continue;
    }
    const matches = content.match(/"[\w@/-]+":\s*"[\^~]\d+\.\d+\.\d+/g);
    if (matches) dryCount += matches.length;
  }
  console.info(`\nDry-run: ${dryCount} version ranges found across the monorepo.`);
  console.info('Run without --dry-run to pin all versions.');
} else {
  console.info(`\nDone! Pinned versions across ${filesChanged} files.`);
}
