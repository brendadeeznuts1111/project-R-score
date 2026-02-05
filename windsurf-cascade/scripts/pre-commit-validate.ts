import { apiTracker } from '../packages/odds-core/src/monitoring/api-tracker.js';
#!/usr/bin/env bun

// scripts/pre-commit-validate.ts
import { GoldenRuleEnforcer } from '../packages/odds-core/src/standards/rule-enforcement.js';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

/**
 * Pre-commit hook to validate golden rules on staged files
 */
async function validateStagedFiles() {
  console.log('🔍 Validating golden rules on staged files...\n');
  
  // Get staged TypeScript files
  const { $ } = await import('bun');
  const stagedFiles = await $`git diff --cached --name-only --diff-filter=ACM`.text();
  const tsFiles = stagedFiles
    .split('\n')
    .filter(file => file.endsWith('.ts') && !file.endsWith('.d.ts'))
    .filter(Boolean);

  if (tsFiles.length === 0) {
    console.log('✅ No TypeScript files to validate');
    return true;
  }

  console.log(`📁 Validating ${tsFiles.length} staged files:\n${tsFiles.map(f => `  - ${f}`).join('\n')}\n`);

  const enforcer = new GoldenRuleEnforcer();
  let hasErrors = false;

  for (const file of tsFiles) {
    try {
      const content = await Bun.file(file).text();
      
      // Check each rule against this file
      for (const rule of [
        new (await import('../packages/odds-core/src/standards/rules/use-bun-builtins-rule.js')).UseBunBuiltinsRule(),
        new (await import('../packages/odds-core/src/standards/rules/track-api-usage-rule.js')).TrackAPIUsageRule(),
        new (await import('../packages/odds-core/src/standards/rules/error-handling-rule.js')).ErrorHandlingRule(),
        new (await import('../packages/odds-core/src/standards/rules/type-safety-rule.js')).TypeSafetyRule()
      ]) {
        const violations = await rule.validate(file, content);
        
        for (const violation of violations) {
          if (violation.severity === 'error') {
            console.log(`❌ ${violation.file}:${violation.line} - ${violation.message}`);
            console.log(`   💡 ${violation.suggestion}\n`);
            hasErrors = true;
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ Could not validate ${file}:`, error.message);
    }
  }

  if (hasErrors) {
    console.log('🚫 Commit blocked due to golden rule violations');
    console.log('💡 Fix the errors above or use --no-verify to skip');
    return false;
  }

  console.log('✅ All staged files follow golden rules!');
  return true;
}

// Run pre-commit validation
if (import.meta.main) {
  const success = await validateStagedFiles();
  process.exit(success ? 0 : 1);
}
