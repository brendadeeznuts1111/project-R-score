#!/usr/bin/env bun

/**
 * 🌐 Fire22 Language Code Validation Tool (Pattern Weaver Enhanced)
 *
 * Validates language codes across the codebase with Pattern Weaver observability
 */

import { Fire22LanguageManager } from '../src/i18n/language-manager';
import { Glob } from 'bun';
import { patternWeaver, createPatternOperation } from '../src/patterns/pattern-weaver-integration';
import { patternObservability, PatternAlert } from '../src/monitoring/pattern-observability';

interface ValidationResult {
  file: string;
  issues: Array<{
    line?: number;
    code: string;
    issue: 'missing' | 'unused' | 'invalid' | 'incomplete';
    message: string;
  }>;
}

export class LanguageCodeValidator {
  private languageManager: Fire22LanguageManager;
  private usedCodes: Set<string> = new Set();
  private definedCodes: Set<string> = new Set();
  private patternMetrics: Map<string, any> = new Map();
  private validationHistory: Array<{
    timestamp: Date;
    operation: string;
    duration: number;
    filesProcessed: number;
    issuesFound: number;
  }> = [];

  constructor() {
    this.languageManager = new Fire22LanguageManager();
    this.definedCodes = new Set(this.languageManager.getAllCodes());
    this.initializePatternWeaverIntegration();
  }

  /**
   * Initialize Pattern Weaver integration for enhanced monitoring
   */
  private initializePatternWeaverIntegration(): void {
    // Listen for pattern alerts related to language processing
    patternObservability.on('alert:created', (alert: PatternAlert) => {
      if (alert.pattern === 'SECURE' || alert.pattern === 'FILESYSTEM') {
        console.log(`🔍 Pattern Weaver Alert for ${alert.pattern}: ${alert.message}`);
      }
    });

    // Initialize pattern metrics tracking
    this.patternMetrics.set('totalValidations', 0);
    this.patternMetrics.set('averageValidationTime', 0);
    this.patternMetrics.set('cacheHitRate', 0);
  }

  /**
   * Validate all language codes in the project (Pattern Weaver Enhanced)
   */
  async validateProject(): Promise<ValidationResult[]> {
    return createPatternOperation(['SECURE', 'FILESYSTEM', 'TIMING', 'TABULAR'], async () => {
      const startTime = Bun.nanoseconds();
      const results: ValidationResult[] = [];
      let filesProcessed = 0;

      console.log('🔍 Scanning project for language codes with Pattern Weaver...');

      // Enhanced HTML file scanning with FILESYSTEM pattern
      const htmlFiles = new Glob('**/*.html').scan({ cwd: process.cwd() });
      for await (const file of htmlFiles) {
        if (file.includes('node_modules')) continue;

        const result = await this.validateFileWithPatterns(file, 'html');
        if (result.issues.length > 0) {
          results.push(result);
        }
        filesProcessed++;
      }

      // Enhanced TypeScript/JavaScript file scanning
      const jsFiles = new Glob('**/*.{ts,js,tsx,jsx}').scan({ cwd: process.cwd() });
      for await (const file of jsFiles) {
        if (file.includes('node_modules')) continue;

        const result = await this.validateFileWithPatterns(file, 'js');
        if (result.issues.length > 0) {
          results.push(result);
        }
        filesProcessed++;
      }

      // Record validation metrics
      const duration = Bun.nanoseconds() - startTime;
      const issuesFound = results.reduce((sum, r) => sum + r.issues.length, 0);

      this.recordValidationMetrics({
        timestamp: new Date(),
        operation: 'full_project_validation',
        duration: duration / 1_000_000, // Convert to ms
        filesProcessed,
        issuesFound,
      });

      console.log(
        `✅ Pattern Weaver validation complete: ${filesProcessed} files, ${issuesFound} issues, ${(duration / 1_000_000).toFixed(2)}ms`
      );

      return results;
    });
  }

  /**
   * Enhanced file validation with Pattern Weaver integration
   */
  private async validateFileWithPatterns(
    filePath: string,
    fileType: 'html' | 'js'
  ): Promise<ValidationResult> {
    return await patternWeaver.executePattern('FILESYSTEM', async () => {
      const result: ValidationResult = {
        file: filePath,
        issues: [],
      };

      try {
        // Use Pattern Weaver SECURE validation for file reading
        const content = await patternWeaver.executePattern('SECURE', async () => {
          return await Bun.file(filePath).text();
        });

        const lines = content.split('\n');

        lines.forEach((line, index) => {
          const lineNumber = index + 1;

          // Enhanced pattern matching with SECURE validation
          const patterns = [
            /data-language="(L-\d+)"/g, // HTML attributes
            /\.getText\(['"`](L-\d+)['"`]\)/g, // JavaScript calls
            /t\(['"`](L-\d+)['"`]\)/g, // Helper function calls
            /getLanguageText\(['"`](L-\d+)['"`]/g, // Custom function calls
            /Fire22Language\.[\w]+\(['"`](L-\d+)['"`]/g, // Fire22Language calls
          ];

          patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(line)) !== null) {
              const code = match[1];
              this.usedCodes.add(code);

              // Pattern Weaver enhanced validation
              if (!this.definedCodes.has(code)) {
                result.issues.push({
                  line: lineNumber,
                  code,
                  issue: 'missing',
                  message: `Language code '${code}' is used but not defined in translations [Pattern: SECURE]`,
                });
              }
            }
          });
        });
      } catch (error) {
        result.issues.push({
          code: '',
          issue: 'invalid',
          message: `Failed to read file with Pattern Weaver: ${error}`,
        });
      }

      return result;
    });
  }

  /**
   * Record validation metrics for Pattern Weaver observability
   */
  private recordValidationMetrics(metrics: {
    timestamp: Date;
    operation: string;
    duration: number;
    filesProcessed: number;
    issuesFound: number;
  }): void {
    this.validationHistory.push(metrics);

    // Keep only last 50 validation records
    if (this.validationHistory.length > 50) {
      this.validationHistory = this.validationHistory.slice(-50);
    }

    // Update pattern metrics
    const totalValidations = this.patternMetrics.get('totalValidations') + 1;
    this.patternMetrics.set('totalValidations', totalValidations);

    // Calculate average validation time
    const avgTime =
      this.validationHistory.reduce((sum, v) => sum + v.duration, 0) /
      this.validationHistory.length;
    this.patternMetrics.set('averageValidationTime', avgTime);
  }

  /**
   * Validate a specific file
   */
  private async validateFile(filePath: string, fileType: 'html' | 'js'): Promise<ValidationResult> {
    const result: ValidationResult = {
      file: filePath,
      issues: [],
    };

    try {
      const content = await Bun.file(filePath).text();
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const lineNumber = index + 1;

        // Find language codes in different formats
        const patterns = [
          /data-language="(L-\d+)"/g, // HTML attributes
          /\.getText\(['"`](L-\d+)['"`]\)/g, // JavaScript calls
          /t\(['"`](L-\d+)['"`]\)/g, // Helper function calls
          /getLanguageText\(['"`](L-\d+)['"`]/g, // Custom function calls
        ];

        patterns.forEach(pattern => {
          let match;
          while ((match = pattern.exec(line)) !== null) {
            const code = match[1];
            this.usedCodes.add(code);

            // Check if code is defined
            if (!this.definedCodes.has(code)) {
              result.issues.push({
                line: lineNumber,
                code,
                issue: 'missing',
                message: `Language code '${code}' is used but not defined in translations`,
              });
            }
          }
        });
      });
    } catch (error) {
      result.issues.push({
        code: '',
        issue: 'invalid',
        message: `Failed to read file: ${error}`,
      });
    }

    return result;
  }

  /**
   * Find unused language codes
   */
  findUnusedCodes(): string[] {
    const unused: string[] = [];

    for (const code of this.definedCodes) {
      if (!this.usedCodes.has(code)) {
        unused.push(code);
      }
    }

    return unused;
  }

  /**
   * Check translation completeness
   */
  checkTranslationCompleteness(): Array<{ code: string; missingLanguages: string[] }> {
    return this.languageManager.getMissingTranslationsReport();
  }

  /**
   * Generate enhanced validation report with Pattern Weaver metrics
   */
  generateReport(results: ValidationResult[]): void {
    console.log('\n📊 FIRE22 LANGUAGE CODE VALIDATION REPORT (Pattern Weaver Enhanced)');
    console.log('═'.repeat(80));

    // Pattern Weaver Performance Metrics
    const patternHealth = patternObservability.getHealthStatus();
    const patternMetrics = patternWeaver.getMetrics() as Map<string, any>;

    console.log('\n🔍 Pattern Weaver Performance:');
    console.log(
      `   Overall Health: ${this.getHealthIcon(patternHealth.overall)} ${patternHealth.overall.toUpperCase()}`
    );
    console.log(`   Total Validations: ${this.patternMetrics.get('totalValidations')}`);
    console.log(
      `   Average Time: ${this.patternMetrics.get('averageValidationTime')?.toFixed(2)}ms`
    );

    if (this.validationHistory.length > 0) {
      const lastValidation = this.validationHistory[this.validationHistory.length - 1];
      console.log(
        `   Last Validation: ${lastValidation.filesProcessed} files in ${lastValidation.duration.toFixed(2)}ms`
      );
    }

    // Summary
    const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
    const filesWithIssues = results.length;

    console.log(`\n📈 Summary:`);
    console.log(`   Files scanned: ${this.usedCodes.size > 0 ? 'Multiple' : 'None'}`);
    console.log(`   Files with issues: ${filesWithIssues}`);
    console.log(`   Total issues: ${totalIssues}`);
    console.log(`   Language codes used: ${this.usedCodes.size}`);
    console.log(`   Language codes defined: ${this.definedCodes.size}`);

    // Missing codes
    const missingCodes = new Set<string>();
    results.forEach(result => {
      result.issues.forEach(issue => {
        if (issue.issue === 'missing') {
          missingCodes.add(issue.code);
        }
      });
    });

    if (missingCodes.size > 0) {
      console.log(`\n❌ Missing Language Codes (${missingCodes.size}):`);
      Array.from(missingCodes)
        .sort()
        .forEach(code => {
          console.log(`   • ${code} - Needs to be added to translations`);
        });
    }

    // Unused codes
    const unused = this.findUnusedCodes();
    if (unused.length > 0) {
      console.log(`\n⚠️  Unused Language Codes (${unused.length}):`);
      unused.forEach(code => {
        const info = this.languageManager.getCodeInfo(code);
        console.log(`   • ${code} - "${info?.en}" (${info?.context || 'No context'})`);
      });
    }

    // Translation completeness
    const incomplete = this.checkTranslationCompleteness();
    if (incomplete.length > 0) {
      console.log(`\n🌐 Incomplete Translations (${incomplete.length}):`);
      incomplete.forEach(({ code, missingLanguages }) => {
        const info = this.languageManager.getCodeInfo(code);
        console.log(`   • ${code} - "${info?.en}" missing: ${missingLanguages.join(', ')}`);
      });
    }

    // File-specific issues
    if (results.length > 0) {
      console.log(`\n📁 File-specific Issues:`);
      results.forEach(result => {
        console.log(`\n   📄 ${result.file}:`);
        result.issues.forEach(issue => {
          const lineInfo = issue.line ? `:${issue.line}` : '';
          console.log(`      ${this.getIssueIcon(issue.issue)} ${issue.message}${lineInfo}`);
        });
      });
    }

    // Statistics
    const stats = this.languageManager.getStatistics();
    console.log(`\n📊 Translation Statistics:`);
    console.log(`   Total codes: ${stats.totalCodes}`);
    console.log(`   Supported languages: ${stats.supportedLanguages}`);
    console.log(`   Completion rates:`);
    Object.entries(stats.completionRates).forEach(([lang, rate]) => {
      const status = rate === 100 ? '✅' : rate > 80 ? '⚠️' : '❌';
      console.log(`     ${status} ${lang.toUpperCase()}: ${rate}%`);
    });

    // Recommendations
    console.log(`\n💡 Recommendations:`);
    if (missingCodes.size > 0) {
      console.log(`   • Add ${missingCodes.size} missing language codes to translations`);
    }
    if (unused.length > 0) {
      console.log(`   • Review ${unused.length} unused codes - remove or implement`);
    }
    if (incomplete.length > 0) {
      console.log(`   • Complete translations for ${incomplete.length} codes`);
    }
    if (totalIssues === 0) {
      console.log(`   🎉 All language codes are properly defined and used!`);
    }

    // Pattern Weaver Recommendations
    console.log('\n🔧 Pattern Weaver Insights:');
    if (this.validationHistory.length >= 5) {
      const recentAvg =
        this.validationHistory.slice(-3).reduce((sum, v) => sum + v.duration, 0) / 3;
      const olderAvg =
        this.validationHistory.slice(-8, -5).reduce((sum, v) => sum + v.duration, 0) / 3;

      if (recentAvg < olderAvg * 0.8) {
        console.log('   📈 Validation performance improving over time');
      } else if (recentAvg > olderAvg * 1.2) {
        console.log('   📉 Validation performance degrading - consider optimization');
      } else {
        console.log('   📊 Validation performance stable');
      }
    }

    // Pattern health summary
    const healthyPatterns = patternHealth.patterns.filter(p => p.status === 'healthy').length;
    const totalPatterns = patternHealth.patterns.length;
    console.log(`   🏥 Pattern Health: ${healthyPatterns}/${totalPatterns} patterns healthy`);

    console.log(`\n${'═'.repeat(80)}\n`);
  }

  /**
   * Get health status icon
   */
  private getHealthIcon(status: string): string {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'degraded':
        return '⚠️';
      case 'critical':
        return '❌';
      default:
        return '❓';
    }
  }

  /**
   * Get Pattern Weaver validation metrics
   */
  getPatternWeaverMetrics(): any {
    return {
      totalValidations: this.patternMetrics.get('totalValidations'),
      averageValidationTime: this.patternMetrics.get('averageValidationTime'),
      validationHistory: this.validationHistory,
      patternHealth: patternObservability.getHealthStatus(),
      activeAlerts: patternObservability.getActiveAlerts(),
    };
  }

  /**
   * Get icon for issue type
   */
  private getIssueIcon(issueType: string): string {
    switch (issueType) {
      case 'missing':
        return '❌';
      case 'unused':
        return '⚠️';
      case 'invalid':
        return '🚫';
      case 'incomplete':
        return '🌐';
      default:
        return '•';
    }
  }

  /**
   * Export missing codes for translation
   */
  async exportMissingCodes(format: 'json' | 'csv' = 'json'): Promise<void> {
    const results = await this.validateProject();
    const missingCodes = new Set<string>();

    results.forEach(result => {
      result.issues.forEach(issue => {
        if (issue.issue === 'missing') {
          missingCodes.add(issue.code);
        }
      });
    });

    if (missingCodes.size === 0) {
      console.log('✅ No missing codes to export');
      return;
    }

    const exportData: Record<string, any> = {};
    Array.from(missingCodes)
      .sort()
      .forEach(code => {
        exportData[code] = {
          en: '', // To be filled by translator
          es: '',
          pt: '',
          fr: '',
          context: '', // To be filled by developer
        };
      });

    const filename = `missing-language-codes.${format}`;
    let content: string;

    if (format === 'csv') {
      content = 'Code,English,Spanish,Portuguese,French,Context\n';
      Object.keys(exportData).forEach(code => {
        content += `"${code}","","","","",""\n`;
      });
    } else {
      content = JSON.stringify(exportData, null, 2);
    }

    await Bun.write(filename, content);
    console.log(`📄 Exported ${missingCodes.size} missing codes to ${filename}`);
  }
}

// Enhanced CLI interface with Pattern Weaver integration
if (import.meta.main) {
  const validator = new LanguageCodeValidator();
  const args = process.argv.slice(2);

  console.log('🔧 Pattern Weaver Enhanced Language Validator initialized');
  console.log(`🕒 Starting at: ${new Date().toISOString()}`);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🌐 Fire22 Language Code Validator

Usage: bun run validate-language-codes.ts [options]

Options:
  --help, -h        Show this help message
  --unused          Show only unused codes
  --missing         Show only missing codes
  --incomplete      Show only incomplete translations
  --export-missing  Export missing codes for translation
  --format csv      Export format (json|csv)

Examples:
  bun run validate-language-codes.ts
  bun run validate-language-codes.ts --unused
  bun run validate-language-codes.ts --export-missing --format csv
    `);
    process.exit(0);
  }

  async function main() {
    if (args.includes('--export-missing')) {
      const format = args.includes('--format')
        ? (args[args.indexOf('--format') + 1] as 'json' | 'csv')
        : 'json';
      await validator.exportMissingCodes(format);
      return;
    }

    if (args.includes('--unused')) {
      const unused = validator.findUnusedCodes();
      console.log(`\n⚠️  Unused Language Codes (${unused.length}):`);
      unused.forEach(code => console.log(`   • ${code}`));
      return;
    }

    if (args.includes('--incomplete')) {
      const incomplete = validator.checkTranslationCompleteness();
      console.log(`\n🌐 Incomplete Translations (${incomplete.length}):`);
      incomplete.forEach(({ code, missingLanguages }) => {
        console.log(`   • ${code} missing: ${missingLanguages.join(', ')}`);
      });
      return;
    }

    // Full validation with Pattern Weaver integration
    console.log('🌊 Starting comprehensive validation with Pattern Weaver...');
    const results = await validator.validateProject();
    validator.generateReport(results);

    // Show Pattern Weaver metrics summary
    const pwMetrics = validator.getPatternWeaverMetrics();
    console.log('\n🔧 Pattern Weaver Session Summary:');
    console.log(`   Validations: ${pwMetrics.totalValidations}`);
    console.log(`   Avg Duration: ${pwMetrics.averageValidationTime?.toFixed(2)}ms`);
    console.log(`   Active Alerts: ${pwMetrics.activeAlerts.length}`);

    if (pwMetrics.activeAlerts.length > 0) {
      console.log('\n⚠️ Active Pattern Alerts:');
      pwMetrics.activeAlerts.slice(0, 3).forEach(alert => {
        console.log(`   ${alert.pattern}: ${alert.message}`);
      });
    }
  }

  main().catch(console.error);
}
