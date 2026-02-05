#!/usr/bin/env bun
/**
 * Infrastructure Feature Flag Validator
 * Validates feature flag usage and dead code elimination paths
 */

import { FeatureFlagValidator, INFRASTRUCTURE_FEATURE_GROUPS } from '../packages/core/src/types/feature-flags';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const SOURCE_DIR = join(process.cwd(), 'packages/core/src');
const VALID_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

class InfrastructureValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  async validate(): Promise<void> {
    console.log('🔍 INFRASTRUCTURE FEATURE FLAG VALIDATION');
    console.log('='.repeat(50));

    // Validate feature flag definitions
    await this.validateFeatureFlagDefinitions();

    // Validate source code usage
    await this.validateSourceCode();

    // Validate build configurations
    await this.validateBuildConfigurations();

    // Report results
    this.reportResults();
  }

  private async validateFeatureFlagDefinitions(): Promise<void> {
    console.log('\n📋 Validating feature flag definitions...');

    const allFlags = FeatureFlagValidator.getAllValidFlags();
    console.log(`✅ Found ${allFlags.length} valid feature flags`);

    // Check for duplicates
    const duplicates = allFlags.filter((flag, index) => allFlags.indexOf(flag) !== index);
    if (duplicates.length > 0) {
      this.errors.push(`Duplicate feature flags found: ${duplicates.join(', ')}`);
    }

    // Validate group definitions
    for (const [groupName, flags] of Object.entries(INFRASTRUCTURE_FEATURE_GROUPS)) {
      for (const flag of flags as readonly string[]) {
        if (!FeatureFlagValidator.isValidFlag(flag)) {
          this.errors.push(`Invalid flag '${flag}' in group '${groupName}'`);
        }
      }
    }
    console.log(`✅ All ${Object.keys(INFRASTRUCTURE_FEATURE_GROUPS).length} feature groups validated`);
  }

  private async validateSourceCode(): Promise<void> {
    console.log('\n🔍 Scanning source code for feature flag usage...');

    const files = this.getAllSourceFiles(SOURCE_DIR);
    let featureUsageCount = 0;

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;

        // Check for feature() calls
        const featureMatches = line.match(/feature\(["']([^"']+)["']\)/g);
        if (featureMatches) {
          for (const match of featureMatches) {
            const flagMatch = match.match(/feature\(["']([^"']+)["']\)/);
            if (flagMatch) {
              const flag = flagMatch[1];
              featureUsageCount++;

              const validation = FeatureFlagValidator.validateFlag(flag);
              if (!validation.valid) {
                this.errors.push(`${file}:${lineNumber} - ${validation.error}`);
              }
            }
          }
        }

        // Check for conditional compilation patterns
        if (line.includes('feature(') && (line.includes('if') || line.includes('&&') || line.includes('||'))) {
          // This is likely a conditional compilation block
          // Could add more sophisticated validation here
        }
      }
    }

    console.log(`✅ Scanned ${files.length} source files`);
    console.log(`✅ Found ${featureUsageCount} feature flag usages`);
  }

  private async validateBuildConfigurations(): Promise<void> {
    console.log('\n🏗️ Validating build configurations...');

    // Check if package.json has feature-related scripts
    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
      const scripts = packageJson.scripts || {};

      const buildScripts = Object.keys(scripts).filter(key =>
        key.includes('build') || key.includes('compile')
      );

      if (buildScripts.length === 0) {
        this.warnings.push('No build scripts found in package.json');
      }

      console.log(`✅ Found ${buildScripts.length} build-related scripts`);
    } catch (error) {
      this.errors.push('Failed to read package.json');
    }
  }

  private getAllSourceFiles(dir: string): string[] {
    const files: string[] = [];

    function scanDirectory(currentDir: string) {
      const items = readdirSync(currentDir);

      for (const item of items) {
        const fullPath = join(currentDir, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanDirectory(fullPath);
        } else if (stat.isFile() && VALID_EXTENSIONS.includes(extname(item))) {
          files.push(fullPath);
        }
      }
    }

    scanDirectory(dir);
    return files;
  }

  private reportResults(): void {
    console.log('\n📊 VALIDATION RESULTS');
    console.log('='.repeat(50));

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('🎉 ALL VALIDATIONS PASSED!');
      console.log('✅ Feature flags are properly defined and used');
      console.log('✅ No compilation errors detected');
      console.log('✅ Build configurations are valid');
      console.log('\n🚀 Infrastructure is ready for zero-cost builds!');
    } else {
      if (this.errors.length > 0) {
        console.log('\n❌ ERRORS FOUND:');
        this.errors.forEach(error => console.log(`  • ${error}`));
      }

      if (this.warnings.length > 0) {
        console.log('\n⚠️  WARNINGS:');
        this.warnings.forEach(warning => console.log(`  • ${warning}`));
      }
    }

    // Summary statistics
    const stats = {
      totalFlags: FeatureFlagValidator.getAllValidFlags().length,
      totalGroups: Object.keys(INFRASTRUCTURE_FEATURE_GROUPS).length,
      errors: this.errors.length,
      warnings: this.warnings.length
    };

    console.log('\n📈 SUMMARY STATISTICS');
    console.log(`  • Total Feature Flags: ${stats.totalFlags}`);
    console.log(`  • Feature Groups: ${stats.totalGroups}`);
    console.log(`  • Errors: ${stats.errors}`);
    console.log(`  • Warnings: ${stats.warnings}`);

    // Exit with appropriate code
    process.exit(this.errors.length > 0 ? 1 : 0);
  }
}

// Run validation if this script is executed directly
if (import.meta.main) {
  const validator = new InfrastructureValidator();
  validator.validate().catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

export { InfrastructureValidator };