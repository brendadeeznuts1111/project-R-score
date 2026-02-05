#!/usr/bin/env bun
/**
 * Pre-commit hook: Check .npmrc for unguarded ${...} patterns
 * 
 * This hook prevents committing .npmrc files that contain unguarded environment
 * variable patterns like ${TOKEN} or ${API_KEY} which could expose sensitive
 * information in version control.
 * 
 * Usage:
 *   - Runs automatically on git commit
 *   - Can be run manually: bun scripts/check-npmrc-security.ts
 *   - Configurable via environment variables
 */

import { join } from 'path';
import { $ } from 'bun';

interface SecurityCheckResult {
  hasUnguardedPatterns: boolean;
  violations: Array<{
    line: number;
    content: string;
    pattern: string;
    suggestion: string;
  }>;
  file: string;
}

const UNGUARDED_PATTERNS = [
  /\$\{[A-Z_][A-Z0-9_]*\}/g, // ${TOKEN}, ${API_KEY}, etc.
  /\$\{[a-z_][a-z0-9_]*\}/g, // ${token}, ${api_key}, etc.
];

const GUARDED_PATTERNS = [
  /\$\{\#?[A-Z_][A-Z0-9_]*\}/g, // ${#TOKEN}, ${#API_KEY}, etc.
  /\$\{\#?[a-z_][a-z0-9_]*\}/g, // ${#token}, ${#api_key}, etc.
];

const ALLOWED_PATTERNS = [
  /\$\{npm_config_[a-z_][a-z0-9_]*\}/g, // ${npm_config_cache}
  /\$\{init-author-[a-z-]+\}/g, // ${init-author-name}
  /\$\{init-license-[a-z-]+\}/g, // ${init-license}
  /\$\{package-[a-z-]+\}/g, // ${package-name}
  /\$\{repository-[a-z-]+\}/g, // ${repository-url}
  /\$\{bugs-[a-z-]+\}/g, // ${bugs-url}
  /\$\{homepage-[a-z-]+\}/g, // ${homepage-url}
  /\$\{author-[a-z-]+\}/g, // ${author-email}
  /\$\{maintainer-[a-z-]+\}/g, // ${maintainer-email}
];

/**
 * Check if a line contains unguarded environment variable patterns
 */
function checkLineForUnguardedPatterns(line: string, lineNumber: number): Array<{
  line: number;
  content: string;
  pattern: string;
  suggestion: string;
}> {
  const violations: Array<{
    line: number;
    content: string;
    pattern: string;
    suggestion: string;
  }> = [];

  // Skip comments and empty lines
  const trimmedLine = line.trim();
  if (trimmedLine.startsWith('#') || trimmedLine === '') {
    return violations;
  }

  // Find all environment variable patterns
  const allMatches = line.match(/\$\{[^}]+\}/g) || [];
  
  for (const match of allMatches) {
    // Check if it's an allowed pattern first
    let isAllowed = false;
    for (const allowedPattern of ALLOWED_PATTERNS) {
      allowedPattern.lastIndex = 0; // Reset regex state
      if (allowedPattern.test(match)) {
        isAllowed = true;
        break;
      }
    }
    if (isAllowed) {
      continue;
    }

    // Check if it's properly guarded (has # prefix after ${)
    const isGuarded = match.startsWith('${#');
    
    if (!isGuarded) {
      // This is an unguarded pattern
      const suggestion = match.replace('${', '${#'); // Add # guard
      violations.push({
        line: lineNumber,
        content: line.trim(),
        pattern: match,
        suggestion: line.replace(match, suggestion)
      });
    }
  }

  return violations;
}

/**
 * Check .npmrc file for security issues
 */
async function checkNpmrcSecurity(filePath: string = '.npmrc'): Promise<SecurityCheckResult> {
  const result: SecurityCheckResult = {
    hasUnguardedPatterns: false,
    violations: [],
    file: filePath
  };

  if (!(await Bun.file(filePath).exists())) {
    console.log(`ℹ️  .npmrc file not found at ${filePath}`);
    return result;
  }

  try {
    const content = await Bun.file(filePath).text();
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const lineViolations = checkLineForUnguardedPatterns(lines[i], i + 1);
      result.violations.push(...lineViolations);
    }

    result.hasUnguardedPatterns = result.violations.length > 0;

  } catch (error) {
    console.error(`❌ Error reading .npmrc file: ${error}`);
    result.hasUnguardedPatterns = true; // Fail safe
  }

  return result;
}

/**
 * Format and display security check results
 */
function displayResults(result: SecurityCheckResult): void {
  if (!result.hasUnguardedPatterns) {
    console.log('✅ .npmrc security check passed - no unguarded patterns found');
    return;
  }

  console.log(`\n🚨 SECURITY VIOLATIONS FOUND in ${result.file}`);
  console.log('═'.repeat(60));
  
  result.violations.forEach((violation, index) => {
    console.log(`\n${index + 1}. Line ${violation.line}:`);
    console.log(`   Current:  ${violation.content}`);
    console.log(`   Issue:     Unguarded environment variable: ${violation.pattern}`);
    console.log(`   Suggested: ${violation.suggestion}`);
  });

  console.log('\n💡 SECURITY TIPS:');
  console.log('   • Use ${#VARIABLE} for sensitive values (requires explicit substitution)');
  console.log('   • Use ${VARIABLE} only for non-sensitive npm config values');
  console.log('   • Consider using .npmrc.local for local development secrets');
  console.log('   • Add sensitive patterns to .gitignore');
}

/**
 * Generate automatic fix for .npmrc file
 */
function generateFix(result: SecurityCheckResult): string | null {
  if (!result.hasUnguardedPatterns || !existsSync(result.file)) {
    return null;
  }

  try {
    const content = readFileSync(result.file, 'utf8');
    let fixedContent = content;

    // Apply fixes for each violation
    result.violations.forEach(violation => {
      fixedContent = fixedContent.replace(violation.pattern, violation.pattern.replace('${', '${#'));
    });

    return fixedContent;
  } catch (error) {
    console.error(`❌ Error generating fix: ${error}`);
    return null;
  }
}

/**
 * Main execution
 */
async function main(): Promise<number> {
  console.log('🔒 Checking .npmrc for unguarded environment variable patterns...');
  
  const npmrcPath = process.argv[2] || '.npmrc';
  const autoFix = process.argv.includes('--fix');
  const verbose = process.argv.includes('--verbose');

  if (verbose) {
    console.log(`📁 Checking file: ${npmrcPath}`);
    console.log(`🔧 Auto-fix: ${autoFix ? 'Enabled' : 'Disabled'}`);
  }

  const result = await checkNpmrcSecurity(npmrcPath);

  if (result.hasUnguardedPatterns) {
    displayResults(result);

    if (autoFix) {
      console.log('\n🔧 Attempting to fix automatically...');
      const fixedContent = generateFix(result);
      
      if (fixedContent) {
        try {
          await Bun.write(npmrcPath, fixedContent);
          console.log('✅ Automatic fix applied successfully');
          console.log('💡 Please review the changes and run git add to include them');
          return 0;
        } catch (error) {
          console.error(`❌ Failed to apply fix: ${error}`);
          return 1;
        }
      } else {
        console.error('❌ Could not generate automatic fix');
        return 1;
      }
    }

    console.log('\n🛠️  To fix manually:');
    console.log('   1. Add # prefix to sensitive variables: ${TOKEN} → ${#TOKEN}');
    console.log('   2. Or run: bun scripts/check-npmrc-security.ts --fix');
    console.log('   3. Then run: git add .npmrc');
    
    return 1; // Fail the commit
  }

  if (verbose) {
    console.log('✅ No security issues found');
  }
  
  return 0; // Success
}

// Export functions for testing
export {
  checkNpmrcSecurity,
  checkLineForUnguardedPatterns,
  generateFix,
  displayResults,
  UNGUARDED_PATTERNS,
  GUARDED_PATTERNS,
  ALLOWED_PATTERNS
};

// Run if called directly
if (import.meta.main) {
  const exitCode = await main();
  process.exit(exitCode);
}
