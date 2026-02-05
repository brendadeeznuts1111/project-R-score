#!/usr/bin/env bun
/**
 * Quick Link Check
 *
 * Fast check for internal links only
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, extname, resolve } from 'path';

const rootDir = process.argv[2] || '.';
const verbose = process.argv.includes('--verbose');

let brokenCount = 0;
let checkedCount = 0;

function isDocFile(filename: string): boolean {
  const ext = extname(filename).toLowerCase();
  return ['.md', '.mdx'].includes(ext);
}

function checkFile(filePath: string): void {
  const relativePath = relative(rootDir, filePath);
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Check markdown links
    const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(line)) !== null) {
      const link = match[2];
      checkedCount++;

      // Skip external and special links
      if (link.startsWith('http') || link.startsWith('#') ||
          link.startsWith('mailto:') || link.startsWith('tel:')) {
        continue;
      }

      // Resolve the target path
      let targetPath: string;
      if (link.startsWith('/')) {
        targetPath = join(rootDir, link.slice(1));
      } else {
        targetPath = join(filePath, '..', link);
      }

      // Check if target exists
      try {
        const stats = statSync(targetPath);
        if (stats.isDirectory()) {
          // Check for index.md or README.md
          try {
            statSync(join(targetPath, 'index.md'));
          } catch {
            try {
              statSync(join(targetPath, 'README.md'));
            } catch {
              console.log(`⚠️  ${relativePath}:${lineNumber} - Directory exists but no index.md/README.md: ${link}`);
            }
          }
        }
      } catch (error) {
        console.log(`❌ ${relativePath}:${lineNumber} - Broken link: ${link}`);
        brokenCount++;
      }
    }
  }
}

function scanDirectory(dir: string): void {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      // Skip system directories that might cause permission issues
      if (entry.isDirectory() &&
          (entry.name.startsWith('.') ||
           entry.name === 'node_modules' ||
           entry.name === 'Music' ||
           entry.name === 'Movies' ||
           entry.name === 'Pictures' ||
           entry.name === 'Library' ||
           entry.name === 'Applications' ||
           entry.name === 'reports')) {
        continue;
      }

      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.isFile() && isDocFile(entry.name)) {
        checkFile(fullPath);
      }
    }
  } catch (error) {
    // Skip directories we can't read
    if (error instanceof Error && error.message.includes('EPERM')) {
      return;
    }
    throw error;
  }
}

console.log(`🔍 Quick link check in: ${rootDir}`);
scanDirectory(resolve(rootDir));

console.log(`\n📊 Results:`);
console.log(`  Total checked: ${checkedCount}`);
console.log(`  Broken: ${brokenCount}`);
console.log(`  OK: ${checkedCount - brokenCount}`);

if (brokenCount > 0) {
  console.log(`\n❌ Found ${brokenCount} broken links!`);
  process.exit(1);
} else {
  console.log(`\n✅ All links OK!`);
}
