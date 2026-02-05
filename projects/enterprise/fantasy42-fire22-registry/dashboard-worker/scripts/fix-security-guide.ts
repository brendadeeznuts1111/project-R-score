#!/usr/bin/env bun

import { readFileSync, writeFileSync } from 'fs';

function fixSecurityGuide() {
  const filePath = 'SECURITY-INTEGRATION-GUIDE.md';
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const newLines: string[] = [];
  let modified = false;

  lines.forEach((line, index) => {
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
    console.log('✅ Fixed SECURITY-INTEGRATION-GUIDE.md');
  } else {
    console.log('⏭️ No changes needed for SECURITY-INTEGRATION-GUIDE.md');
  }
}

fixSecurityGuide();
