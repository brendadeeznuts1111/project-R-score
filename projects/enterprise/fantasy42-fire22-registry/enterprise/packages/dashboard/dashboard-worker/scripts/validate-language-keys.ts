#!/usr/bin/env bun

/**
 * Fire22 Language Keys Validation Tool
 *
 * Validates language key implementation across the Fire22 Dashboard:
 * - Checks for missing language keys in HTML files
 * - Validates translation completeness across languages
 * - Detects unused language codes
 * - Ensures consistency between language files and HTML
 */

import { readdir, readFile, stat } from 'fs/promises';
import { join, extname } from 'path';

interface ValidationResult {
  success: boolean;
  warnings: string[];
  errors: string[];
  stats: {
    totalKeysFound: number;
    totalKeysInFile: number;
    missingTranslations: number;
    unusedKeys: number;
    filesScanned: number;
  };
}

interface LanguageData {
  meta: any;
  languages: {
    [languageCode: string]: {
      [key: string]: string;
    };
  };
  plurals: any;
  templates: any;
  contexts: any;
}

class LanguageKeyValidator {
  private languageData: LanguageData | null = null;
  private keysFoundInFiles: Set<string> = new Set();
  private filesScanned: number = 0;
  private validationResult: ValidationResult;

  constructor() {
    this.validationResult = {
      success: true,
      warnings: [],
      errors: [],
      stats: {
        totalKeysFound: 0,
        totalKeysInFile: 0,
        missingTranslations: 0,
        unusedKeys: 0,
        filesScanned: 0,
      },
    };
  }

  /**
   * Main validation entry point
   */
  async validate(): Promise<ValidationResult> {
    console.log('🌐 Fire22 Language Keys Validation Started');
    console.log('='.repeat(50));

    try {
      // Load language data
      await this.loadLanguageData();

      // Scan HTML files for language keys
      await this.scanHtmlFiles();

      // Perform validations
      this.validateTranslations();
      this.validateKeyUsage();
      this.generateStats();

      // Print results
      this.printResults();
    } catch (error) {
      this.validationResult.success = false;
      this.validationResult.errors.push(`Validation failed: ${error.message}`);
      console.error('❌ Validation failed:', error);
    }

    return this.validationResult;
  }

  /**
   * Load language data from JSON file
   */
  private async loadLanguageData(): Promise<void> {
    const languageFilePath = join(process.cwd(), 'src/i18n/fire22-language-keys.json');

    try {
      const fileContent = await readFile(languageFilePath, 'utf-8');
      this.languageData = JSON.parse(fileContent);

      console.log(`✅ Loaded language data: ${this.languageData!.meta.totalKeys} keys`);
      console.log(`📅 Version: ${this.languageData!.meta.version}`);
    } catch (error) {
      throw new Error(`Failed to load language data from ${languageFilePath}: ${error.message}`);
    }
  }

  /**
   * Recursively scan HTML files for language keys
   */
  private async scanHtmlFiles(directory: string = process.cwd()): Promise<void> {
    const entries = await readdir(directory);

    for (const entry of entries) {
      const fullPath = join(directory, entry);
      const stats = await stat(fullPath);

      // Skip node_modules and other irrelevant directories
      if (stats.isDirectory() && !this.shouldSkipDirectory(entry)) {
        await this.scanHtmlFiles(fullPath);
      } else if (stats.isFile() && this.isHtmlFile(entry)) {
        await this.scanHtmlFile(fullPath);
      }
    }
  }

  /**
   * Scan individual HTML file for language keys
   */
  private async scanHtmlFile(filePath: string): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const keys = this.extractLanguageKeys(content);

      keys.forEach(key => this.keysFoundInFiles.add(key));
      this.filesScanned++;

      console.log(`📄 Scanned ${filePath}: found ${keys.length} language keys`);

      if (keys.length > 0) {
        console.log(`   Keys: ${keys.join(', ')}`);
      }
    } catch (error) {
      this.validationResult.warnings.push(`Failed to read ${filePath}: ${error.message}`);
    }
  }

  /**
   * Extract language keys from HTML content
   */
  private extractLanguageKeys(content: string): string[] {
    const keys: string[] = [];

    // Match data-language attributes
    const dataLanguagePattern = /data-language=["']([^"']+)["']/g;
    let match;

    while ((match = dataLanguagePattern.exec(content)) !== null) {
      keys.push(match[1]);
    }

    // Also look for L-### patterns in comments or text content
    const lKeyPattern = /L-\d+/g;
    let lKeyMatch;

    while ((lKeyMatch = lKeyPattern.exec(content)) !== null) {
      if (!keys.includes(lKeyMatch[0])) {
        keys.push(lKeyMatch[0]);
      }
    }

    return Array.from(new Set(keys)); // Remove duplicates
  }

  /**
   * Validate translation completeness
   */
  private validateTranslations(): void {
    if (!this.languageData) return;

    const languages = Object.keys(this.languageData.languages).filter(
      lang => !lang.startsWith('_')
    );
    const englishKeys = Object.keys(this.languageData.languages['en'] || {}).filter(
      key => !key.startsWith('_')
    );

    for (const lang of languages) {
      if (lang === 'en') continue; // Skip English as it's the base

      const langKeys = Object.keys(this.languageData.languages[lang] || {}).filter(
        key => !key.startsWith('_')
      );
      const missingKeys = englishKeys.filter(key => !langKeys.includes(key));

      if (missingKeys.length > 0) {
        this.validationResult.warnings.push(
          `Missing ${missingKeys.length} translations in ${lang}: ${missingKeys.slice(0, 5).join(', ')}${missingKeys.length > 5 ? '...' : ''}`
        );
        this.validationResult.stats.missingTranslations += missingKeys.length;
      }
    }
  }

  /**
   * Validate key usage - check for unused keys and missing definitions
   */
  private validateKeyUsage(): void {
    if (!this.languageData) return;

    const definedKeys = new Set(
      Object.keys(this.languageData.languages['en'] || {}).filter(key => !key.startsWith('_'))
    );
    const usedKeys = this.keysFoundInFiles;

    // Check for keys used in files but not defined in language data
    const undefinedKeys = Array.from(usedKeys).filter(key => !definedKeys.has(key));
    undefinedKeys.forEach(key => {
      this.validationResult.errors.push(
        `Key '${key}' used in files but not defined in language data`
      );
    });

    // Check for keys defined but not used in files
    const unusedKeys = Array.from(definedKeys).filter(key => !usedKeys.has(key));
    if (unusedKeys.length > 0) {
      this.validationResult.warnings.push(
        `${unusedKeys.length} defined keys are not used in files: ${unusedKeys.slice(0, 5).join(', ')}${unusedKeys.length > 5 ? '...' : ''}`
      );
      this.validationResult.stats.unusedKeys = unusedKeys.length;
    }
  }

  /**
   * Generate validation statistics
   */
  private generateStats(): void {
    this.validationResult.stats.totalKeysFound = this.keysFoundInFiles.size;
    this.validationResult.stats.totalKeysInFile = this.languageData?.meta.totalKeys || 0;
    this.validationResult.stats.filesScanned = this.filesScanned;

    // Determine overall success
    this.validationResult.success = this.validationResult.errors.length === 0;
  }

  /**
   * Print validation results
   */
  private printResults(): void {
    console.log('\n' + '='.repeat(50));
    console.log('📊 VALIDATION RESULTS');
    console.log('='.repeat(50));

    // Print statistics
    console.log('\n📈 Statistics:');
    console.log(`   Files scanned: ${this.validationResult.stats.filesScanned}`);
    console.log(`   Language keys found in files: ${this.validationResult.stats.totalKeysFound}`);
    console.log(`   Language keys defined: ${this.validationResult.stats.totalKeysInFile}`);
    console.log(`   Missing translations: ${this.validationResult.stats.missingTranslations}`);
    console.log(`   Unused keys: ${this.validationResult.stats.unusedKeys}`);

    // Print errors
    if (this.validationResult.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.validationResult.errors.forEach(error => console.log(`   • ${error}`));
    }

    // Print warnings
    if (this.validationResult.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.validationResult.warnings.forEach(warning => console.log(`   • ${warning}`));
    }

    // Overall result
    console.log('\n' + '='.repeat(50));
    if (this.validationResult.success) {
      console.log('✅ VALIDATION PASSED');
      console.log('🌐 Language key implementation is valid!');
    } else {
      console.log('❌ VALIDATION FAILED');
      console.log('🔧 Please fix the errors above before proceeding.');
    }
    console.log('='.repeat(50));
  }

  /**
   * Check if directory should be skipped during scanning
   */
  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'temp'];
    return skipDirs.includes(dirName);
  }

  /**
   * Check if file is an HTML file
   */
  private isHtmlFile(fileName: string): boolean {
    const htmlExtensions = ['.html', '.htm'];
    return htmlExtensions.includes(extname(fileName).toLowerCase());
  }

  /**
   * Export detailed report as JSON
   */
  exportReport(outputPath?: string): ValidationResult {
    if (outputPath) {
      // In a real implementation, you would write to file
      console.log(`📄 Report would be exported to: ${outputPath}`);
    }

    return this.validationResult;
  }
}

// CLI Tool Functions
class LanguageKeyCLI {
  /**
   * Run validation with CLI arguments
   */
  static async run(): Promise<void> {
    const args = process.argv.slice(2);
    const validator = new LanguageKeyValidator();

    if (args.includes('--help') || args.includes('-h')) {
      this.printHelp();
      return;
    }

    try {
      const result = await validator.validate();

      // Export report if requested
      if (args.includes('--export')) {
        const exportIndex = args.indexOf('--export');
        const exportPath = args[exportIndex + 1] || 'language-validation-report.json';
        validator.exportReport(exportPath);
      }

      // Exit with error code if validation failed
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('❌ CLI execution failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Print CLI help
   */
  static printHelp(): void {
    console.log(`
🌐 Fire22 Language Keys Validation Tool

Usage: bun run validate-language-keys [options]

Options:
  --help, -h        Show this help message
  --export [path]   Export validation report to JSON file
  
Examples:
  bun run validate-language-keys
  bun run validate-language-keys --export report.json

Description:
  This tool validates the Fire22 language key implementation by:
  • Scanning HTML files for language key usage
  • Checking translation completeness across languages
  • Identifying unused or undefined language keys
  • Generating comprehensive validation reports
`);
  }
}

// Execute CLI if run directly
if (import.meta.main) {
  await LanguageKeyCLI.run();
}

// Export for programmatic usage
export { LanguageKeyValidator, LanguageKeyCLI };
export type { ValidationResult };
