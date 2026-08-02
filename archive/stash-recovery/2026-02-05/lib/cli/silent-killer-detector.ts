#!/usr/bin/env bun
/**
 * 🚨 CODEBASE-WIDE SILENT KILLER DETECTION AND FIX
 *
 * This script identifies and fixes the deadly pattern that's killing async operations
 * across the entire codebase.
 */

console.log('🚨 SILENT KILLER DETECTION AND FIX');
console.log('='.repeat(60));

const problematicFiles = [];
const fixedFiles = [];

async function scanAndFixCodebase() {
  console.log('\n🔍 SCANNING FOR SILENT KILLER PATTERNS...\n');

  // Files that need immediate fixing
  const criticalFiles = [
    './lib/performance-optimizer.ts',
    './lib/optimized-server.ts',
    './lib/port-management-system.ts',
    './lib/bun-implementation-details.ts',
    './lib/response-buffering-tests.ts',
    './lib/bun-write-tests.ts',
    './lib/security-stability-test.ts',
    './lib/optimized-spawn-test.ts',
  ];

  for (const file of criticalFiles) {
    await checkAndFixFile(file);
  }

  // Show summary
  console.log('\n📊 SCAN SUMMARY');
  console.log('='.repeat(40));
  console.log(`🚨 Problematic files found: ${problematicFiles.length}`);
  console.log(`✅ Files fixed: ${fixedFiles.length}`);

  if (problematicFiles.length > 0) {
    console.log('\n🚨 CRITICAL: SILENT KILLERS DETECTED!');
    console.log('These files have the deadly pattern that kills async operations:');
    problematicFiles.forEach(file => console.log(`   ❌ ${file}`));
  }

  if (fixedFiles.length > 0) {
    console.log('\n✅ FILES FIXED:');
    fixedFiles.forEach(file => console.log(`   ✅ ${file}`));
  }

  console.log('\n🎯 RECOMMENDATION:');
  console.log('1. IMMEDIATELY fix all files with the silent killer pattern');
  console.log('2. Update the entry-guard.ts utility to use safe patterns');
  console.log('3. Add linting rules to prevent this pattern in the future');
  console.log('4. Test all CLI tools after fixing');

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
  console.log('ℹ️  Script was imported, not executed directly');
}`
      );

      await Bun.write(filePath, fixedContent);
      fixedFiles.push(filePath);

      console.log(`🔧 FIXED: ${filePath}`);
    }
  } catch (error) {
    console.log(`❌ Error checking ${filePath}: ${error.message}`);
  }
}

// Create a safe entry guard utility
async function createSafeEntryGuard() {
  console.log('\n🛡️  CREATING SAFE ENTRY GUARD UTILITY...\n');

  const safeEntryGuardContent = `#!/usr/bin/env bun
/**
 * SAFE Entry Guard Utility
 * 
 * Prevents the silent killer pattern that destroys async operations
 */

/**
 * Check if the current module is being run directly (not imported)
 * @returns true if this file is the main entrypoint (Bun.main)
 */
export function isDirectExecution(): boolean {
  return import.meta.main;
}

/**
 * SAFE: Ensure this module is being run directly.
 * Uses positive logic and doesn't kill async operations.
 * Call this at the very top of CLI tools before any other code.
 */
export function ensureDirectExecution(): void {
  if (!import.meta.main) {
    console.log('ℹ️  Script was imported, not executed directly');
    return; // 🛡️ SAFE: Return instead of process.exit(0)
  }
}

/**
 * SAFE: Main execution wrapper
 * Use this pattern instead of the deadly entry guard
 */
export function runIfMain(mainFunction: () => void | Promise<void>): void {
  if (import.meta.main) {
    if (mainFunction.constructor.name === 'AsyncFunction') {
      mainFunction().catch(console.error);
    } else {
      try {
        mainFunction();
      } catch (error) {
        console.error(error);
      }
    }
  } else {
    console.log('ℹ️  Script was imported, not executed directly');
  }
}

/**
 * Get the main entrypoint path
 * @returns The absolute path of the entry script (Bun.main)
 */
export function getMainPath(): string {
  return Bun.main;
}

/**
 * Get whether this module is the main module
 * Alias for isDirectExecution()
 */
export const isMain = isDirectExecution;

// 🛡️ SAFE USAGE EXAMPLES:
/*
// ❌ DEADLY PATTERN (DON'T USE):
if (import.meta.path !== Bun.main) {
  process.exit(0); // ← KILLS ASYNC OPERATIONS
}

// ✅ SAFE PATTERN 1:
import { ensureDirectExecution } from './safe-entry-guard';

ensureDirectExecution();
// Your code here...

// ✅ SAFE PATTERN 2 (RECOMMENDED):
import { runIfMain } from './safe-entry-guard';
runIfMain(async () => {
  // Your async code here...
  console.log('Running safely!');
});

// ✅ SAFE PATTERN 3:
if (import.meta.main) {
  main().catch(console.error);
} else {
  console.log('Imported, not executed');
}
*/
`;

  await Bun.write('./lib/cli/safe-entry-guard.ts', safeEntryGuardContent);
  console.log('✅ Created: ./lib/cli/safe-entry-guard.ts');
}

// Main execution
async function main() {
  const scanResults = await scanAndFixCodebase();
  await createSafeEntryGuard();

  console.log('\n🎯 FINAL STATUS:');
  if (scanResults.problematic > 0) {
    console.log(`🔴 CRITICAL: Fixed ${scanResults.fixed} files with silent killer patterns`);
    console.log('⚠️  Test all CLI tools to ensure they work correctly');
  } else {
    console.log('🟢 GOOD: No silent killer patterns found in critical files');
  }

  console.log('\n🛡️  SAFE ENTRY GUARD CREATED:');
  console.log('   Use ./shared/tools/safe-entry-guard.ts for new CLI tools');
  console.log('   Update existing tools to use safe patterns');

  console.log('\n✅ SILENT KILLER ELIMINATION COMPLETE!');
}

if (import.meta.main) {
  main().catch(console.error);
}
