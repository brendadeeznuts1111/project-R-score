#!/usr/bin/env bun
// fix-package-json-v2.ts - Raw text processing to remove duplicate keys

async function fixPackageJsonRaw() {
  const content = await Bun.file('package.json').text();
  const lines = content.split('\n');
  
  const seenKeys = new Set<string>();
  const cleanedLines: string[] = [];
  let inScripts = false;
  let removedCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Track if we're in scripts section
    if (trimmed === '"scripts": {') {
      inScripts = true;
      cleanedLines.push(line);
      continue;
    }
    
    if (inScripts && trimmed === '}') {
      inScripts = false;
      cleanedLines.push(line);
      continue;
    }
    
    // Process scripts section
    if (inScripts) {
      const keyMatch = line.match(/^\s*"([^"]+)":/);
      if (keyMatch) {
        const key = keyMatch[1];
        
        // Skip comment keys
        if (key.startsWith('#')) {
          console.log(`🗑️  Removing comment key: ${key}`);
          removedCount++;
          continue;
        }
        
        // Skip duplicate keys
        if (seenKeys.has(key)) {
          console.log(`🗑️  Removing duplicate key: ${key}`);
          removedCount++;
          continue;
        }
        
        seenKeys.add(key);
      }
    }
    
    cleanedLines.push(line);
  }
  
  // Write back cleaned content
  const cleanedContent = cleanedLines.join('\n');
  await Bun.write('package.json', cleanedContent);
  
  console.log(`✅ package.json deduped (raw mode)!`);
  console.log(`🧹 Total unique scripts: ${seenKeys.size}`);
  console.log(`🗑️  Total removed entries: ${removedCount}`);
  console.log(`🎯 No more duplicate key warnings!`);
}

// CLI interface
async function main() {
  try {
    await fixPackageJsonRaw();
  } catch (error) {
    console.error('❌ Error fixing package.json:', error.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
