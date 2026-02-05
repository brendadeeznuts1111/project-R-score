#!/usr/bin/env bun
/**
 * @fileoverview Auto-fix script for common TypeScript errors in the codebase
 * @description Utility script for automatically fixing common TypeScript type errors including null checks, type assertions, and type definitions.
 * @module examples/demos/fix-type-errors
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-EXAMPLE@6.4.4.0.0.0.0;instance-id=EXAMPLE-FIX-TYPE-ERRORS-001;version=6.4.4.0.0.0.0}]
 * [PROPERTIES:{example={value:"Fix Type Errors";@root:"ROOT-EXAMPLES";@chain:["BP-EXAMPLES","BP-DEMO"];@version:"6.4.4.0.0.0.0"}}]
 * [CLASS:FixTypeErrors][#REF:v-6.4.4.0.0.0.0.BP.EXAMPLES.DEMO.1.0.A.1.1.EXAMPLE.1.1]]
 * 
 * Version: 6.4.4.0.0.0.0
 * Ripgrep Pattern: 6\.4\.4\.0\.0\.0\.0|EXAMPLE-FIX-TYPE-ERRORS-001|BP-EXAMPLE@6\.4\.4\.0\.0\.0\.0
 * 
 * @example 6.4.4.0.0.0.0.1: Auto-Fix Pattern
 * // Test Formula:
 * // 1. Run fix script on file with type errors
 * // 2. Verify fixes applied correctly
 * // 3. Check TypeScript compilation passes
 * // Expected Result: Type errors fixed automatically
 * //
 * // Snippet:
 * ```typescript
 * const fixes = applyFixes(filePath, content);
 * writeFileSync(filePath, fixes);
 * ```
 * 
 * // Ripgrep: 6.4.4.0.0.0.0
 * // Ripgrep: EXAMPLE-FIX-TYPE-ERRORS-001
 * // Ripgrep: BP-EXAMPLE@6.4.4.0.0.0.0
 */

import { readFileSync, writeFileSync } from 'fs';

const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
};

// Fix 1: Add null-checks for PipelineUser
function fixPipelineUserUndefined(filePath: string, content: string): string {
  if (filePath === 'src/funnel/router.ts') {
    // Fix line 66: Add null check before passing user to isEnabled
    // user is optional but isEnabled requires non-optional PipelineUser
    return content.replace(
      /if \(rule\.featureFlag && featureFlagManager\) \{\s*if \(!featureFlagManager\.isEnabled\(rule\.featureFlag, user\)\) \{/,
      `if (rule.featureFlag && featureFlagManager) {
					if (!user || !featureFlagManager.isEnabled(rule.featureFlag, user)) {`
    );
  }
  return content;
}

// Fix 2: Add explicit types to callbacks
function fixImplicitAnyErrors(filePath: string, content: string): string {
  // Fix implicit any in error handlers
  let fixed = content.replace(
    /\.catch\(\(error:\s*any\)\s*=>/g,
    '.catch((error: Error) =>'
  ).replace(
    /\.catch\(error\s*=>/g,
    '.catch((error: Error) =>'
  );
  
  // Fix import.meta.hot.on("bun:error", (error) => ...)
  if (filePath === 'src/index.ts') {
    fixed = fixed.replace(
      /import\.meta\.hot\.on\("bun:error",\s*\(error\)\s*=>/,
      'import.meta.hot.on("bun:error", (error: Error) =>'
    );
  }
  
  return fixed;
}

// Fix 3: Fix SQLQueryBindings[] issues - convert string arguments to arrays
function fixSQLQueryBindings(filePath: string, content: string): string {
  // Fix sql() calls that pass strings instead of arrays
  // Pattern: sql`...`, stringArg -> sql`...`, [stringArg]
  if (filePath.includes('src/logging/bookmaker-profile.ts')) {
    // Line 86: sql`...`, profile.bookmaker -> sql`...`, [profile.bookmaker, ...]
    return content.replace(
      /sql`[\s\S]*?`,\s*profile\.bookmaker,\s*profile\.name,\s*profile\.endpoint_config,\s*profile\.url_encoding_behavior,\s*profile\.last_profiled,\s*profile\.updated_at\s*\)/,
      `sql\`INSERT INTO bookmaker_profiles (
			bookmaker, name, endpoint_config, url_encoding_behavior, last_profiled, updated_at
		) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
	\`,
		[
			profile.bookmaker,
			profile.name,
			profile.endpoint_config,
			profile.url_encoding_behavior,
			profile.last_profiled,
			profile.updated_at,
		]`
    );
  }
  
  // Similar fixes for other logging files
  if (filePath.includes('src/logging/corrected-forensic-logger.ts') || 
      filePath.includes('src/logging/forensic-movement-logger.ts')) {
    // These need manual review - pattern varies
    console.log(`  ${colors.yellow('⚠')} SQL bindings in ${filePath} need manual review`);
  }
  
  return content;
}

// Fix 4: Add missing exports to src/types/index.ts (re-export from pipeline/types)
function fixMissingExports(filePath: string, content: string): string {
  if (filePath === 'src/types/index.ts') {
    // Add re-exports for CanonicalData and EnrichedData from pipeline/types
    const hasReExport = content.includes('from "../pipeline/types"');
    if (!hasReExport) {
      // Find the last export statement
      const lastExportMatch = content.match(/export\s+type\s+{[^}]*}/g);
      if (lastExportMatch) {
        const lastExport = lastExportMatch[lastExportMatch.length - 1];
        const newExport = lastExport.replace('}', ', CanonicalData, EnrichedData }');
        return content.replace(lastExport, newExport) + '\n\nexport type { CanonicalData, EnrichedData } from "../pipeline/types";\n';
      } else {
        return content + '\n\nexport type { CanonicalData, EnrichedData } from "../pipeline/types";\n';
      }
    }
  }
  
  // Fix imports in enrichment.ts - change from ../../types to ../types for CanonicalData/EnrichedData
  if (filePath === 'src/pipeline/stages/enrichment.ts') {
    return content.replace(
      /import type { CanonicalData, EnrichedData, Result } from "\.\.\/\.\.\/types";/,
      'import type { Result } from "../../types";\nimport type { CanonicalData, EnrichedData } from "../types";'
    );
  }
  
  return content;
}

// Fix 5: Remove duplicate identifiers
function fixDuplicateIdentifiers(filePath: string, content: string): string {
  if (filePath.includes('src/orca/arbitrage/index.ts')) {
    // Remove duplicate OrcaArbitrageOpportunity on line 18
    const lines = content.split('\n');
    const seen = new Set<string>();
    const filtered: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Check if this is a duplicate OrcaArbitrageOpportunity (line 18)
      if (i === 17 && line.includes('OrcaArbitrageOpportunity')) {
        // Check if we already saw it on line 17 (index 16)
        if (lines[16]?.includes('OrcaArbitrageOpportunity')) {
          console.log(`  ${colors.yellow('⚠')} Removing duplicate: OrcaArbitrageOpportunity (line ${i + 1})`);
          continue;
        }
      }
      filtered.push(line);
    }
    return filtered.join('\n');
  }
  return content;
}

// Fix 6: Fix interface extension - UserWithRole conflicts with PipelineUser.role
function fixInterfaceExtension(filePath: string, content: string): string {
  if (filePath.includes('src/rbac/types.ts')) {
    // Fix UserWithRole to use Omit to exclude the conflicting role property
    return content.replace(
      /export interface UserWithRole extends PipelineUser \{[\s\S]*?role: Role;[\s\S]*?\}/,
      `export interface UserWithRole extends Omit<PipelineUser, 'role'> {
	/** User's role definition */
	role: Role;
}`
    );
  }
  return content;
}

// Main auto-fix function
async function autoFixFiles() {
  const files = [
    'src/funnel/router.ts',
    'src/index.ts',
    'src/logging/bookmaker-profile.ts',
    'src/logging/corrected-forensic-logger.ts',
    'src/logging/forensic-movement-logger.ts',
    'src/orca/arbitrage/index.ts',
    'src/pipeline/types.ts',
    'src/types.ts',
    'src/pipeline/stages/enrichment.ts',
    'src/pipeline/stages/serving.ts',
    'src/properties/registry.ts',
    'src/rbac/manager.ts',
    'src/rbac/types.ts',
  ];

  console.log(`${colors.bold('🔧 Auto-Fixing TypeScript Errors\n')}`);
  
  let fixedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  for (const file of files) {
    try {
      if (!Bun.file(file).exists()) {
        console.log(`  ${colors.gray('○')} File not found: ${file}`);
        skippedCount++;
        continue;
      }
      
      const content = readFileSync(file, 'utf-8');
      let newContent = content;
      
      newContent = fixPipelineUserUndefined(file, newContent);
      newContent = fixImplicitAnyErrors(file, newContent);
      newContent = fixSQLQueryBindings(file, newContent);
      newContent = fixMissingExports(file, newContent);
      newContent = fixDuplicateIdentifiers(file, newContent);
      newContent = fixInterfaceExtension(file, newContent);
      
      if (newContent !== content) {
        writeFileSync(file, newContent, 'utf-8');
        console.log(`  ${colors.green('✅')} Fixed: ${file}`);
        fixedCount++;
      } else {
        console.log(`  ${colors.gray('○')} No changes: ${file}`);
        skippedCount++;
      }
    } catch (e) {
      console.log(`  ${colors.red('❌')} Error processing ${file}: ${(e as Error).message}`);
      errorCount++;
    }
  }
  
  console.log(`\n${colors.bold('📊 Summary:')}`);
  console.log(`  ${colors.green('Fixed:')} ${fixedCount} files`);
  console.log(`  ${colors.gray('Skipped:')} ${skippedCount} files`);
  console.log(`  ${colors.red('Errors:')} ${errorCount} files`);
  console.log(`\n${colors.bold('🎉 Auto-fix complete!')}`);
  console.log(`${colors.blue('Next: Run `bun run typecheck` again to verify fixes')}`);
}

// Execute
if (import.meta.main) {
  await autoFixFiles();
}

export { autoFixFiles };
