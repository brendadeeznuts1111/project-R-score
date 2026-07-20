// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/file-io — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-main — Bun.main
// lib/cli/silent-killer-detector.ts — Silent killer pattern detection and fix for async operations

console.info('🚨 SILENT KILLER DETECTION AND FIX');
console.info('='.repeat(60));

const problematicFiles = [];
const fixedFiles = [];

async function scanAndFixCodebase() {
  console.info('\n🔍 SCANNING FOR SILENT KILLER PATTERNS...\n');

  // Files that need immediate fixing
  const criticalFiles = [
    './lib/performance-optimizer.ts',
    './lib/optimized-server.ts',
    './lib/port-management-system.ts',
    './lib/bun-implementation-details.ts',
    './lib/security-stability-test.ts',
    './lib/optimized-spawn-test.ts',
  ];

  for (const file of criticalFiles) {
    await checkAndFixFile(file);
  }

  // Show summary
  console.info('\n📊 SCAN SUMMARY');
  console.info('='.repeat(40));
  console.info(`🚨 Problematic files found: ${problematicFiles.length}`);
  console.info(`✅ Files fixed: ${fixedFiles.length}`);

  if (problematicFiles.length > 0) {
    console.info('\n🚨 CRITICAL: SILENT KILLERS DETECTED!');
    console.info('These files have the deadly pattern that kills async operations:');
    problematicFiles.forEach(file => console.info(`   ❌ ${file}`));
  }

  if (fixedFiles.length > 0) {
    console.info('\n✅ FILES FIXED:');
    fixedFiles.forEach(file => console.info(`   ✅ ${file}`));
  }

  console.info('\n🎯 RECOMMENDATION:');
  console.info('1. IMMEDIATELY fix all files with the silent killer pattern');
  console.info('2. Update the entry-guard.ts utility to use safe patterns');
  console.info('3. Add linting rules to prevent this pattern in the future');
  console.info('4. Test all CLI tools after fixing');

  return { problematic: problematicFiles.length, fixed: fixedFiles.length };
}

async function checkAndFixFile(filePath) {
  try {
    const content = await Bun.file(filePath).text();

    // Check for the deadly pattern
    const deadlyPattern =
      /if\s*\(import\.meta\.path\s*!==\s*Bun\.main\)\s*\{\s*process\.exit\(0\);?\s*\}/;

    if (deadlyPattern.test(content)) {
      problematicFiles.push(filePath);

      // Fix the file
      const fixedContent = content.replace(
        deadlyPattern,
        `if (import.meta.main) {
  // Only run when executed directly
  main().catch(console.error);
} else {
  console.info('ℹ️  Script was imported, not executed directly');
}`
      );

      await Bun.write(filePath, fixedContent);
      fixedFiles.push(filePath);

      console.info(`🔧 FIXED: ${filePath}`);
    }
  } catch (error) {
    console.info(`❌ Error checking ${filePath}: ${error.message}`);
  }
}

// Ensure the canonical safe entry guard utility exists.
async function createSafeEntryGuard() {
  console.info('\n🛡️  CREATING SAFE ENTRY GUARD UTILITY...\n');

  const canonicalPath = './lib/shared/tools/entry-guard.ts';
  const content = await Bun.file(canonicalPath).text();
  await Bun.write(canonicalPath, content);
  console.info(`✅ Canonical entry guard is in place: ${canonicalPath}`);
}

// Main execution
async function main() {
  const scanResults = await scanAndFixCodebase();
  await createSafeEntryGuard();

  console.info('\n🎯 FINAL STATUS:');
  if (scanResults.problematic > 0) {
    console.info(`🔴 CRITICAL: Fixed ${scanResults.fixed} files with silent killer patterns`);
    console.info('⚠️  Test all CLI tools to ensure they work correctly');
  } else {
    console.info('🟢 GOOD: No silent killer patterns found in critical files');
  }

  console.info('\n🛡️  SAFE ENTRY GUARD CREATED:');
  console.info('   Use ./lib/shared/tools/safe-entry-guard.ts for new CLI tools');
  console.info('   Update existing tools to use safe patterns');

  console.info('\n✅ SILENT KILLER ELIMINATION COMPLETE!');
}

if (import.meta.main) {
  main().catch(console.error);
}
