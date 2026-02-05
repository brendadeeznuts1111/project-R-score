#!/usr/bin/env bun
/**
 * 🔍 Error Code Documentation Validator
 * Comprehensive validation and linting for error code registry
 * Ensures consistency, completeness, and correctness
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { color } from 'bun' with { type: 'macro' };

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  stats: ValidationStats;
}

interface ValidationError {
  code: string;
  field?: string;
  message: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  suggestion?: string;
}

interface ValidationWarning {
  code: string;
  field?: string;
  message: string;
  suggestion?: string;
}

interface ValidationStats {
  totalErrorCodes: number;
  validErrorCodes: number;
  totalCategories: number;
  httpStatusCodes: Set<number>;
  missingDocumentation: number;
  orphanedCodes: number;
  duplicateCodes: number;
}

class ErrorDocValidator {
  private registry: any;
  private projectRoot: string;
  private validHttpCodes = new Set([
    200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503, 504, 507,
  ]);
  private validSeverities = new Set(['CRITICAL', 'ERROR', 'WARNING', 'INFO']);
  private validDocTypes = new Set(['guide', 'reference', 'troubleshooting', 'specification']);

  constructor() {
    this.projectRoot = process.cwd();
  }

  /**
   * Load and parse error registry
   */
  private loadRegistry(): boolean {
    const registryPath = join(this.projectRoot, 'docs', 'error-codes.json');

    if (!existsSync(registryPath)) {
      console.error(color('#ef4444', 'css') + '❌ Error registry not found at: ' + registryPath);
      return false;
    }

    try {
      const content = readFileSync(registryPath, 'utf-8');
      this.registry = JSON.parse(content);
      return true;
    } catch (error) {
      console.error(
        color('#ef4444', 'css') + '❌ Failed to parse error registry: ' + error.message
      );
      return false;
    }
  }

  /**
   * Validate error code structure and content
   */
  private validateErrorCodes(): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const stats: ValidationStats = {
      totalErrorCodes: 0,
      validErrorCodes: 0,
      totalCategories: Object.keys(this.registry.errorCategories || {}).length,
      httpStatusCodes: new Set(),
      missingDocumentation: 0,
      orphanedCodes: 0,
      duplicateCodes: 0,
    };

    if (!this.registry.errorCodes) {
      errors.push({
        code: 'MISSING_ERROR_CODES',
        message: 'Error codes section is missing from registry',
        severity: 'ERROR',
      });
      return { valid: false, errors, warnings, stats };
    }

    const errorCodes = this.registry.errorCodes;
    const categories = new Set(Object.keys(this.registry.errorCategories || {}));
    const codePattern = /^E[1-8]\d{3}$/;
    const seenCodes = new Set<string>();
    const seenNames = new Set<string>();

    stats.totalErrorCodes = Object.keys(errorCodes).length;

    for (const [codeKey, errorData] of Object.entries(errorCodes) as [string, any][]) {
      let isValid = true;

      // Check code format
      if (!codePattern.test(codeKey)) {
        errors.push({
          code: codeKey,
          field: 'code',
          message: `Invalid error code format. Expected E[1-8]XXX pattern`,
          severity: 'ERROR',
          suggestion: 'Use format like E1001, E2001, etc.',
        });
        isValid = false;
      }

      // Check for duplicate codes
      if (seenCodes.has(codeKey)) {
        errors.push({
          code: codeKey,
          message: `Duplicate error code detected`,
          severity: 'ERROR',
        });
        stats.duplicateCodes++;
        isValid = false;
      }
      seenCodes.add(codeKey);

      // Check for duplicate names
      if (errorData.name && seenNames.has(errorData.name)) {
        warnings.push({
          code: codeKey,
          field: 'name',
          message: `Duplicate error name: ${errorData.name}`,
          suggestion: 'Consider using more specific naming',
        });
      }
      if (errorData.name) seenNames.add(errorData.name);

      // Validate required fields
      const requiredFields = ['code', 'name', 'message', 'severity', 'category', 'httpStatusCode'];
      for (const field of requiredFields) {
        if (!errorData[field]) {
          errors.push({
            code: codeKey,
            field,
            message: `Missing required field: ${field}`,
            severity: 'ERROR',
          });
          isValid = false;
        }
      }

      // Validate severity
      if (errorData.severity && !this.validSeverities.has(errorData.severity)) {
        errors.push({
          code: codeKey,
          field: 'severity',
          message: `Invalid severity: ${errorData.severity}`,
          severity: 'ERROR',
          suggestion: 'Use: CRITICAL, ERROR, WARNING, or INFO',
        });
        isValid = false;
      }

      // Validate category
      if (errorData.category && !categories.has(errorData.category)) {
        errors.push({
          code: codeKey,
          field: 'category',
          message: `Unknown category: ${errorData.category}`,
          severity: 'ERROR',
          suggestion: `Available categories: ${Array.from(categories).join(', ')}`,
        });
        isValid = false;
      }

      // Validate HTTP status code
      if (errorData.httpStatusCode) {
        if (!this.validHttpCodes.has(errorData.httpStatusCode)) {
          warnings.push({
            code: codeKey,
            field: 'httpStatusCode',
            message: `Uncommon HTTP status code: ${errorData.httpStatusCode}`,
            suggestion: 'Verify this is the correct status code',
          });
        }
        stats.httpStatusCodes.add(errorData.httpStatusCode);
      }

      // Validate documentation links
      if (errorData.documentation) {
        if (!Array.isArray(errorData.documentation) || errorData.documentation.length === 0) {
          warnings.push({
            code: codeKey,
            field: 'documentation',
            message: 'No documentation links provided',
            suggestion: 'Add at least one documentation link',
          });
          stats.missingDocumentation++;
        } else {
          for (const [index, doc] of errorData.documentation.entries()) {
            if (!doc.title || !doc.url || !doc.type) {
              errors.push({
                code: codeKey,
                field: `documentation[${index}]`,
                message: 'Documentation entry missing required fields (title, url, type)',
                severity: 'ERROR',
              });
              isValid = false;
            }

            if (doc.type && !this.validDocTypes.has(doc.type)) {
              warnings.push({
                code: codeKey,
                field: `documentation[${index}].type`,
                message: `Invalid documentation type: ${doc.type}`,
                suggestion: 'Use: guide, reference, troubleshooting, or specification',
              });
            }
          }
        }
      }

      // Validate solutions array
      if (errorData.solutions) {
        if (!Array.isArray(errorData.solutions) || errorData.solutions.length === 0) {
          warnings.push({
            code: codeKey,
            field: 'solutions',
            message: 'No solutions provided',
            suggestion: 'Add at least one solution step',
          });
        }
      }

      // Validate causes array
      if (errorData.causes) {
        if (!Array.isArray(errorData.causes) || errorData.causes.length === 0) {
          warnings.push({
            code: codeKey,
            field: 'causes',
            message: 'No common causes listed',
            suggestion: 'Add common causes to help troubleshooting',
          });
        }
      }

      // Validate related codes exist
      if (errorData.relatedCodes && Array.isArray(errorData.relatedCodes)) {
        for (const relatedCode of errorData.relatedCodes) {
          if (!errorCodes[relatedCode]) {
            warnings.push({
              code: codeKey,
              field: 'relatedCodes',
              message: `Related error code ${relatedCode} does not exist`,
              suggestion: 'Remove or add the related error code',
            });
            stats.orphanedCodes++;
          }
        }
      }

      // Validate description length
      if (errorData.description && errorData.description.length < 20) {
        warnings.push({
          code: codeKey,
          field: 'description',
          message: 'Description is too short',
          suggestion: 'Provide a more detailed description (at least 20 characters)',
        });
      }

      if (isValid) {
        stats.validErrorCodes++;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      stats,
    };
  }

  /**
   * Validate category definitions
   */
  private validateCategories(): ValidationError[] {
    const errors: ValidationError[] = [];
    const categories = this.registry.errorCategories || {};

    const requiredCategoryFields = ['prefix', 'name', 'description', 'range', 'severity', 'color'];
    const validPrefixes = new Set(['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8']);
    const rangePattern = /^\d{4}-\d{4}$/;
    const colorPattern = /^#[0-9a-f]{6}$/i;

    for (const [categoryKey, categoryData] of Object.entries(categories) as [string, any][]) {
      // Check required fields
      for (const field of requiredCategoryFields) {
        if (!categoryData[field]) {
          errors.push({
            code: `CATEGORY_${categoryKey}`,
            field,
            message: `Missing required category field: ${field}`,
            severity: 'ERROR',
          });
        }
      }

      // Validate prefix
      if (categoryData.prefix && !validPrefixes.has(categoryData.prefix)) {
        errors.push({
          code: `CATEGORY_${categoryKey}`,
          field: 'prefix',
          message: `Invalid category prefix: ${categoryData.prefix}`,
          severity: 'ERROR',
          suggestion: 'Use E1-E8 for category prefixes',
        });
      }

      // Validate range format
      if (categoryData.range && !rangePattern.test(categoryData.range)) {
        errors.push({
          code: `CATEGORY_${categoryKey}`,
          field: 'range',
          message: `Invalid range format: ${categoryData.range}`,
          severity: 'ERROR',
          suggestion: 'Use format like "1000-1999"',
        });
      }

      // Validate color format
      if (categoryData.color && !colorPattern.test(categoryData.color)) {
        errors.push({
          code: `CATEGORY_${categoryKey}`,
          field: 'color',
          message: `Invalid color format: ${categoryData.color}`,
          severity: 'ERROR',
          suggestion: 'Use hex color format like "#dc2626"',
        });
      }
    }

    return errors;
  }

  /**
   * Validate metadata consistency
   */
  private validateMetadata(): ValidationError[] {
    const errors: ValidationError[] = [];
    const metadata = this.registry.metadata || {};
    const errorCodes = this.registry.errorCodes || {};

    // Check total error codes count
    const actualCount = Object.keys(errorCodes).length;
    if (metadata.totalErrorCodes !== actualCount) {
      errors.push({
        code: 'METADATA_COUNT_MISMATCH',
        field: 'totalErrorCodes',
        message: `Metadata count (${metadata.totalErrorCodes}) doesn't match actual count (${actualCount})`,
        severity: 'ERROR',
        suggestion: 'Update metadata.totalErrorCodes or regenerate metadata',
      });
    }

    // Validate category counts
    if (metadata.categoryCounts) {
      const actualCategoryCounts: Record<string, number> = {};
      Object.values(errorCodes).forEach((error: any) => {
        const category = error.category;
        actualCategoryCounts[category] = (actualCategoryCounts[category] || 0) + 1;
      });

      for (const [category, expectedCount] of Object.entries(metadata.categoryCounts)) {
        const actualCount = actualCategoryCounts[category] || 0;
        if (expectedCount !== actualCount) {
          errors.push({
            code: 'METADATA_CATEGORY_COUNT',
            field: `categoryCounts.${category}`,
            message: `Category count mismatch for ${category}: expected ${expectedCount}, got ${actualCount}`,
            severity: 'ERROR',
          });
        }
      }
    }

    return errors;
  }

  /**
   * Check for consistency with constants file
   */
  private validateConstantsConsistency(): ValidationError[] {
    const errors: ValidationError[] = [];
    const constantsPath = join(this.projectRoot, 'src', 'constants', 'index.ts');

    if (!existsSync(constantsPath)) {
      errors.push({
        code: 'CONSTANTS_FILE_MISSING',
        message: 'Constants file not found at src/constants/index.ts',
        severity: 'WARNING',
      });
      return errors;
    }

    // This is a simplified check - in a real implementation,
    // you'd parse the TypeScript file and check for consistency
    try {
      const constantsContent = readFileSync(constantsPath, 'utf-8');
      const errorCodesInRegistry = new Set(Object.keys(this.registry.errorCodes || {}));

      // Check if major error codes are referenced in constants
      const majorCodes = ['E1001', 'E2001', 'E3001', 'E4001'];
      for (const code of majorCodes) {
        if (errorCodesInRegistry.has(code) && !constantsContent.includes(code)) {
          errors.push({
            code: 'CONSTANTS_MISSING_ERROR_CODE',
            field: code,
            message: `Error code ${code} not found in constants file`,
            severity: 'WARNING',
            suggestion: 'Add error code to ERROR_MESSAGES in constants file',
          });
        }
      }
    } catch (error) {
      errors.push({
        code: 'CONSTANTS_FILE_READ_ERROR',
        message: `Failed to read constants file: ${error.message}`,
        severity: 'WARNING',
      });
    }

    return errors;
  }

  /**
   * Run comprehensive validation
   */
  async validate(): Promise<ValidationResult> {
    console.log('🔍 Starting error code documentation validation...\n');

    if (!this.loadRegistry()) {
      return {
        valid: false,
        errors: [
          {
            code: 'REGISTRY_LOAD_FAILED',
            message: 'Failed to load error registry',
            severity: 'ERROR',
          },
        ],
        warnings: [],
        stats: {
          totalErrorCodes: 0,
          validErrorCodes: 0,
          totalCategories: 0,
          httpStatusCodes: new Set(),
          missingDocumentation: 0,
          orphanedCodes: 0,
          duplicateCodes: 0,
        },
      };
    }

    console.log('📋 Validating error codes...');
    const errorCodeValidation = this.validateErrorCodes();

    console.log('🏷️ Validating categories...');
    const categoryErrors = this.validateCategories();

    console.log('📊 Validating metadata...');
    const metadataErrors = this.validateMetadata();

    console.log('🔧 Checking constants consistency...');
    const constantsErrors = this.validateConstantsConsistency();

    // Combine all validation results
    const allErrors = [
      ...errorCodeValidation.errors,
      ...categoryErrors,
      ...metadataErrors,
      ...constantsErrors,
    ];

    return {
      valid: allErrors.filter(e => e.severity === 'ERROR').length === 0,
      errors: allErrors,
      warnings: errorCodeValidation.warnings,
      stats: errorCodeValidation.stats,
    };
  }

  /**
   * Display validation results
   */
  displayResults(result: ValidationResult): void {
    console.log('\n📊 VALIDATION RESULTS');
    console.log('='.repeat(80));

    // Overall status
    if (result.valid) {
      console.log(color('#10b981', 'css') + '✅ VALIDATION PASSED');
    } else {
      console.log(color('#ef4444', 'css') + '❌ VALIDATION FAILED');
    }

    // Statistics
    console.log('\n📈 Statistics:');
    console.log(`   Total Error Codes: ${result.stats.totalErrorCodes}`);
    console.log(`   Valid Error Codes: ${result.stats.validErrorCodes}`);
    console.log(`   Total Categories: ${result.stats.totalCategories}`);
    console.log(
      `   HTTP Status Codes: ${Array.from(result.stats.httpStatusCodes).sort().join(', ')}`
    );
    console.log(`   Missing Documentation: ${result.stats.missingDocumentation}`);
    console.log(`   Orphaned References: ${result.stats.orphanedCodes}`);
    console.log(`   Duplicate Codes: ${result.stats.duplicateCodes}`);

    // Errors
    if (result.errors.length > 0) {
      console.log(`\n❌ ERRORS (${result.errors.length}):`);
      const errorsBySeverity = result.errors.reduce(
        (acc, error) => {
          acc[error.severity] = (acc[error.severity] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      console.log(`   Critical: ${errorsBySeverity.ERROR || 0}`);
      console.log(`   Warnings: ${errorsBySeverity.WARNING || 0}`);

      console.log('\n🔍 Error Details:');
      result.errors.forEach((error, index) => {
        const severityColor =
          error.severity === 'ERROR' ? color('#ef4444', 'css') : color('#f59e0b', 'css');
        console.log(
          `${index + 1}. ${severityColor}[${error.severity}]${color('#ffffff', 'css')} ${error.code}${error.field ? '.' + error.field : ''}`
        );
        console.log(`   ${error.message}`);
        if (error.suggestion) {
          console.log(`   💡 Suggestion: ${error.suggestion}`);
        }
        console.log();
      });
    }

    // Warnings
    if (result.warnings.length > 0) {
      console.log(`\n⚠️ WARNINGS (${result.warnings.length}):`);
      result.warnings.slice(0, 10).forEach((warning, index) => {
        console.log(
          `${index + 1}. ${color('#f59e0b', 'css')}${warning.code}${warning.field ? '.' + warning.field : ''}${color('#ffffff', 'css')}`
        );
        console.log(`   ${warning.message}`);
        if (warning.suggestion) {
          console.log(`   💡 ${warning.suggestion}`);
        }
      });

      if (result.warnings.length > 10) {
        console.log(`   ... and ${result.warnings.length - 10} more warnings`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`Validation completed at: ${new Date().toLocaleString()}`);
  }
}

// CLI execution
if (import.meta.main) {
  const validator = new ErrorDocValidator();

  try {
    const result = await validator.validate();
    validator.displayResults(result);

    // Exit with error code if validation failed
    if (!result.valid) {
      process.exit(1);
    }
  } catch (error) {
    console.error(color('#ef4444', 'css') + '❌ Validation failed:', error.message);
    process.exit(1);
  }
}
