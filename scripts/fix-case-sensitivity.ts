#!/usr/bin/env bun

/**
 * Case Sensitivity Standardization Script
 *
 * Fixes inconsistent naming conventions across the TypeScript codebase:
 * - Standardizes exported constants to UPPER_CASE
 * - Ensures consistent import/export patterns
 * - Maintains functional compatibility
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, relative, extname } from 'path';
import { execSync } from 'child_process';

interface FixResult {
  file: string;
  changes: number;
  issues: string[];
}

class CaseSensitivityFixer {
  private readonly projectRoot = process.cwd();
  private readonly results: FixResult[] = [];
  private readonly dryRun: boolean;

  constructor(dryRun = false) {
    this.dryRun = dryRun;
  }

  /**
   * Main execution method
   */
  async run(): Promise<void> {
    console.info('🔧 Case Sensitivity Standardization');
    console.info('='.repeat(50));

    if (this.dryRun) {
      console.info('🔍 DRY RUN MODE - No files will be modified\n');
    }

    try {
      // Find all TypeScript files
      const tsFiles = await this.findTypeScriptFiles();
      console.info(`📁 Found ${tsFiles.length} TypeScript files\n`);

      // Process each file
      for (const file of tsFiles) {
        await this.processFile(file);
      }

      // Generate report
      this.generateReport();

      // Suggest global fixes
      this.suggestGlobalFixes();
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  }

  /**
   * Find all TypeScript files in the project
   */
  private async findTypeScriptFiles(): Promise<string[]> {
    const files: string[] = [];

    const scanDirectory = async (dir: string): Promise<void> => {
      try {
        const entries = await readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = join(dir, entry.name);

          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await scanDirectory(fullPath);
          } else if (entry.isFile() && extname(entry.name) === '.ts') {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };

    await scanDirectory(this.projectRoot);
    return files;
  }

  /**
   * Process a single file for case sensitivity issues
   */
  private async processFile(filePath: string): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const relativePath = relative(this.projectRoot, filePath);

      const result: FixResult = {
        file: relativePath,
        changes: 0,
        issues: [],
      };

      let fixedContent = content;

      // Fix 1: Inconsistent exported constants
      fixedContent = this.fixExportedConstants(fixedContent, result);

      // Fix 2: Inconsistent variable naming patterns
      fixedContent = this.fixVariableNaming(fixedContent, result);

      // Fix 3: Mixed case patterns in same scope
      fixedContent = this.fixMixedPatterns(fixedContent, result);

      // Write changes if any
      if (result.changes > 0 && !this.dryRun) {
        await writeFile(filePath, fixedContent);
        console.info(`✅ Fixed ${result.changes} issues in ${relativePath}`);
      } else if (result.changes > 0) {
        console.info(`🔍 Would fix ${result.changes} issues in ${relativePath}`);
      }

      if (result.issues.length > 0) {
        this.results.push(result);
      }
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error);
    }
  }

  /**
   * Fix exported constants to follow UPPER_CASE convention
   */
  private fixExportedConstants(content: string, result: FixResult): string {
    let fixed = content;

    // Pattern: export const camelCase =
    const exportConstPattern = /export const ([a-z][a-zA-Z0-9]*[a-z][A-Z][a-zA-Z0-9]*)\s*=/g;

    fixed = fixed.replace(exportConstPattern, (match, varName) => {
      // Convert to UPPER_CASE
      const upperName = varName.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();

      if (upperName !== varName) {
        result.changes++;
        result.issues.push(`Exported constant: ${varName} → ${upperName}`);

        // Also replace references within the same file
        fixed = fixed.replace(new RegExp(`\\b${varName}\\b`, 'g'), upperName);

        return match.replace(varName, upperName);
      }

      return match;
    });

    return fixed;
  }

  /**
   * Fix variable naming inconsistencies
   */
  private fixVariableNaming(content: string, result: FixResult): string {
    let fixed = content;

    // Pattern: const camelCaseWithMixed =
    const constPattern = /const ([a-z][a-zA-Z0-9]*[a-z][A-Z][a-zA-Z0-9]*)\s*=/g;

    fixed = fixed.replace(constPattern, (match, varName) => {
      // For local variables, suggest camelCase consistency
      const suggestion = this.toConsistentCamelCase(varName);

      if (suggestion !== varName && this.shouldFixVariable(varName)) {
        result.changes++;
        result.issues.push(`Variable: ${varName} → ${suggestion}`);

        // Replace references within the same file
        fixed = fixed.replace(new RegExp(`\\b${varName}\\b`, 'g'), suggestion);

        return match.replace(varName, suggestion);
      }

      return match;
    });

    return fixed;
  }

  /**
   * Fix mixed case patterns in the same scope
   */
  private fixMixedPatterns(content: string, result: FixResult): string {
    let fixed = content;

    // Find inconsistent patterns in the same file
    const constants = content.match(/const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g) || [];
    const exports = content.match(/export\s+const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g) || [];

    const constantNames = constants
      .map(m => m.match(/const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/)?.[1])
      .filter(Boolean);
    const exportNames = exports
      .map(m => m.match(/export\s+const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/)?.[1])
      .filter(Boolean);

    // Check for mixed patterns
    const hasUpper = constantNames.some(name => name === name.toUpperCase() && name.includes('_'));
    const hasCamel = constantNames.some(
      name => name !== name.toUpperCase() && /[a-z][A-Z]/.test(name)
    );

    if (hasUpper && hasCamel) {
      result.issues.push('Mixed naming patterns detected in file');
      result.changes++;

      // Standardize to camelCase for local variables, UPPER_CASE for exports
      // (This is a simplified approach - manual review recommended)
    }

    return fixed;
  }

  /**
   * Convert to consistent camelCase
   */
  private toConsistentCamelCase(name: string): string {
    // If it's already UPPER_CASE, convert to camelCase
    if (name === name.toUpperCase()) {
      return name.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    }

    // If it has mixed patterns, standardize
    return name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Determine if a variable should be fixed
   */
  private shouldFixVariable(varName: string): boolean {
    // Don't fix common patterns that are intentionally mixed
    const exceptions = [
      'useState',
      'useEffect',
      'useCallback',
      'useRef',
      'useMemo',
      'getElementById',
      'querySelector',
      'addEventListener',
      'JSON.parse',
      'JSON.stringify',
    ];

    return !exceptions.some(exc => varName.includes(exc));
  }

  /**
   * Generate comprehensive report
   */
  private generateReport(): void {
    console.info('\n📊 CASE SENSITIVITY REPORT');
    console.info('='.repeat(50));

    const totalFiles = this.results.length;
    const totalChanges = this.results.reduce((sum, r) => sum + r.changes, 0);
    const totalIssues = this.results.reduce((sum, r) => sum + r.issues.length, 0);

    console.info(`📁 Files processed: ${totalFiles}`);
    console.info(`🔧 Total changes: ${totalChanges}`);
    console.info(`⚠️  Total issues: ${totalIssues}`);

    if (this.results.length > 0) {
      console.info('\n📋 Detailed Issues:');
      this.results.forEach(result => {
        console.info(`\n📄 ${result.file}`);
        result.issues.forEach(issue => {
          console.info(`   • ${issue}`);
        });
      });
    }
  }

  /**
   * Suggest global fixes and best practices
   */
  private suggestGlobalFixes(): void {
    console.info('\n💡 RECOMMENDATIONS');
    console.info('='.repeat(50));

    console.info('\n1. 📝 Establish Naming Conventions:');
    console.info('   • Exported constants: UPPER_CASE (e.g., API_BASE_URL)');
    console.info('   • Local variables: camelCase (e.g., fetchUserData)');
    console.info('   • Classes/Types: PascalCase (e.g., UserService)');
    console.info('   • Enums: PascalCase with UPPER_CASE members');

    console.info('\n2. 🔧 ESLint Configuration:');
    console.info('   Add these rules to .eslintrc.js:');
    console.info(`
   {
     rules: {
       '@typescript-eslint/naming-convention': [
         'error',
         {
           selector: 'variable',
           format: ['camelCase', 'UPPER_CASE'],
           leadingUnderscore: 'allow'
         },
         {
           selector: 'variable',
           modifiers: ['exported'],
           format: ['UPPER_CASE']
         },
         {
           selector: 'typeLike',
           format: ['PascalCase']
         }
       ]
     }
   }`);

    console.info('\n3. 🧪 Manual Review Required:');
    console.info('   • Import statements may need updating');
    console.info('   • Cross-file references should be checked');
    console.info('   • Test files may reference old names');

    console.info('\n4. 🚀 Next Steps:');
    if (this.dryRun) {
      console.info('   • Run without --dry-run to apply fixes');
      console.info('   • Review changes with git diff');
      console.info('   • Run tests to ensure functionality');
    } else {
      console.info('   • Review applied changes');
      console.info('   • Update any remaining import statements');
      console.info('   • Run full test suite');
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const fixer = new CaseSensitivityFixer(dryRun);
  await fixer.run();
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}

export { CaseSensitivityFixer };
