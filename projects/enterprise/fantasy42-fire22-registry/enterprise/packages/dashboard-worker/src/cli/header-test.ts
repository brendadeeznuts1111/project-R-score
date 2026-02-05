#!/usr/bin/env bun

/**
 * 🔍 Fire22 Header Testing CLI
 * Comprehensive header validation and security testing tool
 */

import { EnhancedHeaderValidator, HeaderValidatorFactory } from '../utils/header-validator';
import { HeaderManager } from '../utils/header-manager';

// CLI argument parsing
const args = process.argv.slice(2);
const command = args[0];

// Help information
const helpText = `
🔍 Fire22 Header Testing CLI

Usage: bun run header-test <command> [options]

Commands:
  test <url>                    Test headers for a specific URL
  batch <file>                  Test multiple URLs from a file
  audit                         Run comprehensive security audit
  report                        Generate validation report
  clear                         Clear test results
  help                          Show this help message

Options:
  --production                  Use production validation settings
  --development                 Use development validation settings
  --security                   Use security audit validation settings
  --output <format>            Output format: markdown, json, console
  --verbose                    Enable verbose logging

Examples:
  bun run header-test test https://example.com
  bun run header-test test https://api.fire22.com --production
  bun run header-test batch urls.txt --output json
  bun run header-test audit --verbose
  bun run header-test report --output markdown

Environment Variables:
  NODE_ENV                     Set environment (development/production)
  FIRE22_VERSION               Set Fire22 version for validation
  FIRE22_BUILD                 Set Fire22 build number for validation
`;

// Main CLI class
class HeaderTestCLI {
  private validator: EnhancedHeaderValidator;
  private headerManager: HeaderManager;
  private verbose: boolean = false;
  private outputFormat: 'markdown' | 'json' | 'console' = 'console';

  constructor() {
    this.validator = HeaderValidatorFactory.createProductionValidator();
    this.headerManager = HeaderManager.getInstance();
  }

  /**
   * Parse CLI arguments and execute commands
   */
  async run(): Promise<void> {
    try {
      // Parse global options
      this.parseGlobalOptions();

      // Execute command
      switch (command) {
        case 'test':
          await this.testUrl(args[1]);
          break;

        case 'batch':
          await this.testBatch(args[1]);
          break;

        case 'audit':
          await this.runAudit();
          break;

        case 'report':
          await this.generateReport();
          break;

        case 'clear':
          await this.clearResults();
          break;

        case 'help':
        case '--help':
        case '-h':
          this.showHelp();
          break;

        default:
          console.error('❌ Unknown command. Use "help" for usage information.');
          process.exit(1);
      }
    } catch (error) {
      console.error('❌ CLI execution failed:', error.message);
      if (this.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  /**
   * Parse global CLI options
   */
  private parseGlobalOptions(): void {
    // Check for verbose flag
    this.verbose = args.includes('--verbose');

    // Check for output format
    const outputIndex = args.indexOf('--output');
    if (outputIndex !== -1 && args[outputIndex + 1]) {
      const format = args[outputIndex + 1];
      if (['markdown', 'json', 'console'].includes(format)) {
        this.outputFormat = format as any;
      } else {
        console.warn(`⚠️ Invalid output format: ${format}. Using console.`);
      }
    }

    // Check for environment flags
    if (args.includes('--production')) {
      this.validator = HeaderValidatorFactory.createProductionValidator();
    } else if (args.includes('--development')) {
      this.validator = HeaderValidatorFactory.createDevelopmentValidator();
    } else if (args.includes('--security')) {
      this.validator = HeaderValidatorFactory.createSecurityAuditValidator();
    }

    if (this.verbose) {
    }
  }

  /**
   * Test headers for a specific URL
   */
  private async testUrl(url: string): Promise<void> {
    if (!url) {
      console.error('❌ URL is required for test command');
      process.exit(1);
    }

    try {
      const result = await this.validator.validateEndpoint(url);

      // Display results based on output format
      switch (this.outputFormat) {
        case 'json':
          break;

        case 'markdown':
          break;

        case 'console':
        default:
          this.displayResultConsole(result);
          break;
      }

      // Save results for later reporting
    } catch (error) {
      console.error('❌ Failed to test URL:', error.message);
      process.exit(1);
    }
  }

  /**
   * Test multiple URLs from a file
   */
  private async testBatch(filename: string): Promise<void> {
    if (!filename) {
      console.error('❌ Filename is required for batch command');
      process.exit(1);
    }

    try {
      const fileContent = await Bun.file(filename).text();
      const urls = fileContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .filter(line => line.startsWith('http'));

      if (urls.length === 0) {
        console.error('❌ No valid URLs found in file');
        process.exit(1);
      }

      // Test each URL
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];

        try {
          await this.validator.validateEndpoint(url);
        } catch (error) {
          console.error(`❌ Failed: ${url} - ${error.message}\n`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to read batch file:', error.message);
      process.exit(1);
    }
  }

  /**
   * Run comprehensive security audit
   */
  private async runAudit(): Promise<void> {
    // Test common endpoints
    const endpoints = [
      'http://localhost:8787',
      'http://localhost:8787/api/health',
      'http://localhost:8787/health',
      'http://localhost:8787/dashboard',
    ];

    for (const endpoint of endpoints) {
      try {
        await this.validator.validateEndpoint(endpoint);
      } catch (error) {
        console.error(`❌ Failed: ${endpoint} - ${error.message}\n`);
      }
    }
  }

  /**
   * Generate validation report
   */
  private async generateReport(): Promise<void> {
    const results = this.validator.getResults();

    if (results.length === 0) {
      return;
    }

    switch (this.outputFormat) {
      case 'json':
        break;

      case 'markdown':
        break;

      case 'console':
      default:
        this.displaySummaryConsole(results);
        break;
    }

    // Save report to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `header-validation-report-${timestamp}.${this.outputFormat === 'json' ? 'json' : 'md'}`;

    try {
      if (this.outputFormat === 'json') {
        await Bun.write(filename, this.validator.exportResultsToJSON());
      } else {
        await Bun.write(filename, this.validator.generateValidationReport());
      }
    } catch (error) {
      console.warn(`⚠️ Failed to save report: ${error.message}`);
    }
  }

  /**
   * Clear test results
   */
  private async clearResults(): Promise<void> {
    this.validator.clearResults();
  }

  /**
   * Display help information
   */
  private showHelp(): void {}

  /**
   * Display result in console format
   */
  private displayResultConsole(result: any): void {
    if (result.detailedResults.security.issues.length > 0) {
      result.detailedResults.security.issues.forEach((issue: string) => {});
    }

    if (result.detailedResults.cors.issues.length > 0) {
      result.detailedResults.cors.issues.forEach((issue: string) => {});
    }

    if (result.detailedResults.system.issues.length > 0) {
      result.detailedResults.system.issues.forEach((issue: string) => {});
    }

    if (result.recommendations.length > 0) {
      result.recommendations.forEach((rec: string) => {});
    }
  }

  /**
   * Display summary in console format
   */
  private displaySummaryConsole(results: any[]): void {
    const avgScore = Math.round(
      results.reduce((sum, result) => sum + result.overallScore, 0) / results.length
    );

    const compliantCount = results.filter(result => result.compliant).length;
    const complianceRate = Math.round((compliantCount / results.length) * 100);

    const totalIssues = results.reduce((sum, result) => sum + result.issues.length, 0);
    const totalRecommendations = results.reduce(
      (sum, result) => sum + result.recommendations.length,
      0
    );

    const topResults = results.sort((a, b) => b.overallScore - a.overallScore).slice(0, 3);

    topResults.forEach((result, index) => {});

    const needsAttention = results
      .filter(result => result.overallScore < 70)
      .sort((a, b) => a.overallScore - b.overallScore)
      .slice(0, 3);

    if (needsAttention.length > 0) {
      needsAttention.forEach((result, index) => {});
    } else {
    }
  }

  /**
   * Format result as markdown
   */
  private formatResultAsMarkdown(result: any): string {
    let markdown = `# Header Validation Result\n\n`;
    markdown += `**URL**: ${result.url}\n`;
    markdown += `**Timestamp**: ${result.timestamp}\n`;
    markdown += `**Overall Score**: ${result.overallScore}/100\n`;
    markdown += `**Compliant**: ${result.compliant ? '✅ Yes' : '❌ No'}\n\n`;

    markdown += `## Security Headers\n\n`;
    markdown += `- **Score**: ${result.detailedResults.security.score}/100\n`;
    markdown += `- **Compliant**: ${result.detailedResults.security.compliant ? '✅ Yes' : '❌ No'}\n`;

    if (result.detailedResults.security.issues.length > 0) {
      markdown += `\n### Issues\n\n`;
      result.detailedResults.security.issues.forEach((issue: string) => {
        markdown += `- ❌ ${issue}\n`;
      });
    }

    markdown += `\n## CORS Headers\n\n`;
    markdown += `- **Score**: ${result.detailedResults.cors.score}/100\n`;
    markdown += `- **Valid**: ${result.detailedResults.cors.valid ? '✅ Yes' : '❌ No'}\n`;

    if (result.detailedResults.cors.issues.length > 0) {
      markdown += `\n### Issues\n\n`;
      result.detailedResults.cors.issues.forEach((issue: string) => {
        markdown += `- ❌ ${issue}\n`;
      });
    }

    markdown += `\n## System Headers\n\n`;
    markdown += `- **Score**: ${result.detailedResults.system.score}/100\n`;
    markdown += `- **Compliant**: ${result.detailedResults.system.compliant ? '✅ Yes' : '❌ No'}\n`;

    if (result.detailedResults.system.issues.length > 0) {
      markdown += `\n### Issues\n\n`;
      result.detailedResults.system.issues.forEach((issue: string) => {
        markdown += `- ❌ ${issue}\n`;
      });
    }

    if (result.recommendations.length > 0) {
      markdown += `\n## Recommendations\n\n`;
      result.recommendations.forEach((rec: string) => {
        markdown += `- 💡 ${rec}\n`;
      });
    }

    return markdown;
  }
}

// Run CLI if this file is executed directly
if (import.meta.main) {
  const cli = new HeaderTestCLI();
  cli.run().catch(error => {
    console.error('❌ CLI execution failed:', error);
    process.exit(1);
  });
}

export default HeaderTestCLI;
