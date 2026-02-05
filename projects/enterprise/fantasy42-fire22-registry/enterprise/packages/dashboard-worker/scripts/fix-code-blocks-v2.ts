#!/usr/bin/env bun

import { readFileSync, writeFileSync, existsSync } from 'fs';

function fixCodeBlocks(filePath: string): boolean {
  if (!existsSync(filePath)) {
    return false;
  }

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const newLines: string[] = [];
  let modified = false;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    // If this is a code block starting at an odd line
    if (line.trim().startsWith('```') && (newLines.length + 1) % 2 !== 0) {
      // Add a blank line to make the code block start at an even line
      newLines.push('');
      modified = true;
    }

    newLines.push(line);
  });

  if (modified) {
    writeFileSync(filePath, newLines.join('\n'));
    return true;
  }

  return false;
}

// Key files to fix
const keyFiles = [
  'README.md',
  'CONTRIBUTING.md',
  'REPOSITORY_INDEX.md',
  'REGISTRY.md',
  'wiki/Getting-Started.md',
  'wiki/Home.md',
];

console.log('🔧 Fixing code blocks to start at even line numbers...\n');

let filesFixed = 0;

keyFiles.forEach(file => {
  if (fixCodeBlocks(file)) {
    console.log(`✅ Fixed: ${file}`);
    filesFixed++;
  } else {
    console.log(`⏭️  No changes needed: ${file}`);
  }
});

console.log(`\n🎉 Fixed ${filesFixed} files`);
