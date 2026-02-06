#!/usr/bin/env bun
// fix-package-json.ts - Auto-Clean Duplicate Keys from package.json

async function fixPackageJson() {
  const pkg = JSON.parse(await Bun.file('package.json').text());
  const scripts = pkg.scripts || {};
  
  // Remove duplicate keys (comments like "# Section")
  const uniqueScripts: Record<string, string> = {};
  const seenKeys = new Set<string>();
  
  for (const [key, val] of Object.entries(scripts)) {
    // Skip comment keys
    if (key.startsWith('#')) continue;
    
    // Only keep string values (actual scripts)
    if (typeof val !== 'string') continue;
    
    // Skip duplicates - keep first occurrence
    if (seenKeys.has(key)) {
      console.log(`🗑️  Removing duplicate script: ${key}`);
      continue;
    }
    
    uniqueScripts[key] = val;
    seenKeys.add(key);
  }
  
  // Count changes
  const originalCount = Object.keys(scripts).filter(k => !k.startsWith('#')).length;
  const cleanedCount = Object.keys(uniqueScripts).length;
  const removedCount = originalCount - cleanedCount;
  
  // Update package.json
  pkg.scripts = uniqueScripts;
  await Bun.write('package.json', JSON.stringify(pkg, null, 2));
  
  console.log(`✅ package.json deduped!`);
  console.log(`📊 Original scripts: ${originalCount}`);
  console.log(`🧹 Cleaned scripts: ${cleanedCount}`);
  console.log(`🗑️  Removed duplicates: ${removedCount}`);
  console.log(`🎯 No more duplicate key warnings!`);
}

// CLI interface
async function main() {
  try {
    await fixPackageJson();
  } catch (error) {
    console.error('❌ Error fixing package.json:', error.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
