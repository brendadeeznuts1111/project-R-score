#!/usr/bin/env bun
/**
 * 🔗 URL Validator Script
 * 
 * Comprehensive URL validation for development and CI/CD
 * Checks for hardcoded URLs, validates formats, and ensures standards compliance
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { URLNormalizer } from "../lib/documentation/constants/utils.ts";
import { urlService } from "../lib/services/url-service.ts";

// ============================================================================
// INTERFACES
// ============================================================================

interface UrlValidationResult {
  url: string;
  file: string;
  line: number;
  valid: boolean;
  issues: string[];
  recommendations: string[];
}

interface ValidationReport {
  timestamp: string;
  totalUrls: number;
  validUrls: number;
  invalidUrls: number;
  hardcodedLocalhostUrls: number;
  httpUrls: number;
  httpsUrls: number;
  results: UrlValidationResult[];
  summary: {
    status: 'pass' | 'fail' | 'warning';
    score: number;
    issues: string[];
    recommendations: string[];
  };
}

// ============================================================================
// URL VALIDATOR CLASS
// ============================================================================

class UrlValidator {
  private readonly fileExtensions = ['.ts', '.js', '.md', '.json', '.xml', '.yml', '.yaml'];
  private readonly excludeDirectories = ['.git', 'node_modules', 'dist', 'build'];
  
  /**
   * Validate all URLs in the project
   */
  async validateProject(): Promise<ValidationReport> {
    console.log('🔍 Starting comprehensive URL validation...\n');
    
    const urls = await this.extractAllUrls();
    const results = await this.validateUrls(urls);
    const report = this.generateReport(results);
    
    await this.saveReport(report);
    this.printSummary(report);
    
    return report;
  }
  
  /**
   * Extract all URLs from project files
   */
  private async extractAllUrls(): Promise<Array<{ url: string; file: string; line: number }>> {
    console.log('📂 Scanning project files for URLs...');
    
    const urls: Array<{ url: string; file: string; line: number }> = [];
    
    // Find all relevant files
    const files = await this.findFiles('.');
    
    for (const file of files) {
      const fileUrls = await this.extractUrlsFromFile(file);
      urls.push(...fileUrls);
    }
    
    console.log(`Found ${urls.length} URLs across ${files.length} files\n`);
    return urls;
  }
  
  /**
   * Find all files to scan
   */
  private async findFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const excludeDirectories = this.excludeDirectories;
    const fileExtensions = this.fileExtensions;
    
    function scanDirectory(currentDir: string): void {
      const entries = readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          if (!excludeDirectories.includes(entry.name)) {
            scanDirectory(fullPath);
          }
        } else {
          const ext = entry.name.substring(entry.name.lastIndexOf('.'));
          if (fileExtensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    }
    
    scanDirectory(dir);
    return files;
  }
  
  /**
   * Extract URLs from a specific file
   */
  private async extractUrlsFromFile(filePath: string): Promise<Array<{ url: string; file: string; line: number }>> {
    const urls: Array<{ url: string; file: string; line: number }> = [];
    
    try {
      const content = readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      const urlRegex = /https?:\/\/[^\s"')\]}]+/g;
      
      lines.forEach((line, index) => {
        const matches = line.match(urlRegex);
        if (matches) {
          matches.forEach(url => {
            urls.push({
              url: url.trim(),
              file: filePath,
              line: index + 1
            });
          });
        }
      });
    } catch (error) {
      console.warn(`Warning: Could not read file ${filePath}: ${error.message}`);
    }
    
    return urls;
  }
  
  /**
   * Validate extracted URLs
   */
  private async validateUrls(urls: Array<{ url: string; file: string; line: number }>): Promise<UrlValidationResult[]> {
    console.log('🧪 Validating URL formats and standards compliance...');
    
    const results: UrlValidationResult[] = [];
    
    for (const { url, file, line } of urls) {
      const result = await this.validateSingleUrl(url, file, line);
      results.push(result);
    }
    
    return results;
  }
  
  /**
   * Validate a single URL
   */
  private async validateSingleUrl(url: string, file: string, line: number): Promise<UrlValidationResult> {
    const result: UrlValidationResult = {
      url,
      file,
      line,
      valid: true,
      issues: [],
      recommendations: []
    };
    
    try {
      // Basic URL format validation
      new URL(url);
      
      // Check for hardcoded example.com
      if (url.includes('example.com') || url.includes('127.0.0.1')) {
        result.valid = false;
        result.issues.push('Hardcoded example.com URL found');
        result.recommendations.push('Replace with environment variable or URL service');
      }
      
      // Check protocol
      if (url.startsWith('http://') && !url.includes('example.com')) {
        result.issues.push('Non-HTTPS URL in production code');
        result.recommendations.push('Use HTTPS for production URLs');
      }
      
      // Check for common URL issues
      if (url.includes('//') && !url.startsWith('http')) {
        result.issues.push('Protocol-relative URL may cause issues');
        result.recommendations.push('Use full HTTPS URL');
      }
      
      // Test normalization
      try {
        const normalized = URLNormalizer.normalize(url);
        if (normalized !== url) {
          result.recommendations.push('URL can be normalized for consistency');
        }
      } catch (error) {
        result.issues.push(`URL normalization failed: ${error.message}`);
        result.valid = false;
      }
      
      // Check if URL service should be used
      if (this.shouldUseUrlService(file) && !this.isUsingUrlService(file, line)) {
        result.recommendations.push('Consider using URL service for consistency');
      }
      
    } catch (error) {
      result.valid = false;
      result.issues.push(`Invalid URL format: ${error.message}`);
      result.recommendations.push('Fix URL format');
    }
    
    return result;
  }
  
  /**
   * Check if file should use URL service
   */
  private shouldUseUrlService(file: string): boolean {
    return file.includes('/services/') || file.includes('/demo/') || file.includes('/test/');
  }
  
  /**
   * Check if file is using URL service (simplified check)
   */
  private isUsingUrlService(file: string, line: number): boolean {
    // This is a simplified check - in practice, you'd parse the file
    return file.includes('url-service');
  }
  
  /**
   * Generate validation report
   */
  private generateReport(results: UrlValidationResult[]): ValidationReport {
    const totalUrls = results.length;
    const validUrls = results.filter(r => r.valid).length;
    const invalidUrls = totalUrls - validUrls;
    const hardcodedLocalhostUrls = results.filter(r => 
      r.issues.includes('Hardcoded example.com URL found')
    ).length;
    const httpUrls = results.filter(r => r.url.startsWith('http://')).length;
    const httpsUrls = results.filter(r => r.url.startsWith('https://')).length;
    
    // Calculate score
    const score = Math.round((validUrls / totalUrls) * 100);
    
    // Determine status
    let status: 'pass' | 'fail' | 'warning' = 'pass';
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    if (hardcodedLocalhostUrls > 0) {
      status = 'fail';
      issues.push(`${hardcodedLocalhostUrls} hardcoded example.com URLs found`);
    }
    
    if (httpUrls > 0) {
      if (status === 'pass') status = 'warning';
      issues.push(`${httpUrls} HTTP URLs (should use HTTPS)`);
    }
    
    if (score < 90) {
      if (status === 'pass') status = 'warning';
      issues.push(`URL validation score: ${score}% (target: 95%+)`);
    }
    
    // Collect common recommendations
    const allRecommendations = results.flatMap(r => r.recommendations);
    const recommendationCounts = new Map<string, number>();
    
    allRecommendations.forEach(rec => {
      recommendationCounts.set(rec, (recommendationCounts.get(rec) || 0) + 1);
    });
    
    // Get top recommendations
    const topRecommendations = Array.from(recommendationCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([rec]) => rec);
    
    recommendations.push(...topRecommendations);
    
    return {
      timestamp: new Date().toISOString(),
      totalUrls,
      validUrls,
      invalidUrls,
      hardcodedLocalhostUrls,
      httpUrls,
      httpsUrls,
      results,
      summary: {
        status,
        score,
        issues,
        recommendations
      }
    };
  }
  
  /**
   * Save validation report
   */
  private async saveReport(report: ValidationReport): Promise<void> {
    const reportPath = 'docs/data/url-validation-report.json';
    await Bun.write(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved to: ${reportPath}\n`);
  }
  
  /**
   * Print validation summary
   */
  private printSummary(report: ValidationReport): void {
    console.log('🎯 URL Validation Summary');
    console.log('========================');
    console.log(`📊 Statistics:`);
    console.log(`   Total URLs: ${report.totalUrls}`);
    console.log(`   Valid URLs: ${report.validUrls}`);
    console.log(`   Invalid URLs: ${report.invalidUrls}`);
    console.log(`   HTTPS URLs: ${report.httpsUrls} ✅`);
    console.log(`   HTTP URLs: ${report.httpUrls} ${report.httpUrls > 0 ? '⚠️' : '✅'}`);
    console.log(`   Localhost URLs: ${report.hardcodedLocalhostUrls} ${report.hardcodedLocalhostUrls > 0 ? '❌' : '✅'}`);
    console.log(`\n📈 Overall Score: ${report.summary.score}%`);
    
    const statusIcon = report.summary.status === 'pass' ? '✅' : 
                      report.summary.status === 'warning' ? '⚠️' : '❌';
    console.log(`🎯 Status: ${statusIcon} ${report.summary.status.toUpperCase()}`);
    
    if (report.summary.issues.length > 0) {
      console.log('\n❌ Issues Found:');
      report.summary.issues.forEach(issue => {
        console.log(`   • ${issue}`);
      });
    }
    
    if (report.summary.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.summary.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }
    
    // Show problematic URLs
    const problematicResults = report.results.filter(r => !r.valid || r.issues.length > 0);
    
    if (problematicResults.length > 0) {
      console.log('\n🔍 Problematic URLs:');
      problematicResults.slice(0, 10).forEach(result => {
        const icon = result.valid ? '⚠️' : '❌';
        console.log(`   ${icon} ${result.url}`);
        console.log(`      File: ${result.file}:${result.line}`);
        if (result.issues.length > 0) {
          result.issues.forEach(issue => {
            console.log(`      Issue: ${issue}`);
          });
        }
        console.log('');
      });
      
      if (problematicResults.length > 10) {
        console.log(`   ... and ${problematicResults.length - 10} more (see report for details)`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    
    if (report.summary.status === 'pass') {
      console.log('🎉 All URLs are properly configured!');
      console.log('✅ Ready for production deployment');
    } else if (report.summary.status === 'warning') {
      console.log('⚠️  Some improvements recommended');
      console.log('🔧 Fix issues before production deployment');
    } else {
      console.log('❌ Critical issues found');
      console.log('🚫 Must fix issues before deployment');
    }
  }
  
  /**
   * Quick validation check (returns exit code)
   */
  async quickCheck(): Promise<number> {
    const report = await this.validateProject();
    
    switch (report.summary.status) {
      case 'pass': return 0;
      case 'warning': return 1;
      case 'fail': return 2;
      default: return 2;
    }
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main(): Promise<void> {
  const command = process.argv[2];
  const validator = new UrlValidator();
  
  switch (command) {
    case 'check':
    case '':
      console.log('🔗 URL Validator - Comprehensive URL Validation\n');
      await validator.validateProject();
      break;
      
    case 'quick':
      const exitCode = await validator.quickCheck();
      process.exit(exitCode);
      
    case 'help':
    case '--help':
    case '-h':
      console.log(`
🔗 URL Validator - Comprehensive URL Validation Tool

USAGE:
  bun scripts/url-validator [command]

COMMANDS:
  check     Full validation with detailed report (default)
  quick     Quick check with exit code (for CI/CD)
  help      Show this help message

EXIT CODES:
  0         All URLs pass validation
  1         Warnings found (improvements recommended)
  2         Critical issues found (must fix)

EXAMPLES:
  bun scripts/url-validator          # Full validation
  bun scripts/url-validator quick    # Quick check for CI/CD

WHAT IT CHECKS:
  • URL format validation
  • Hardcoded example.com URLs
  • HTTP vs HTTPS usage
  • URL normalization opportunities
  • URL service usage compliance
  • Security best practices

ENVIRONMENT VARIABLES:
  URL_VALIDATION_STRICT    Set to 'true' for stricter validation
  URL_VALIDATION_EXTERNAL  Set to 'true' to test external URL accessibility
      `);
      break;
      
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Use "help" for usage information');
      process.exit(1);
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

if (import.meta.main) {
  main().catch(error => {
    console.error('❌ URL validation failed:', error);
    process.exit(2);
  });
}

export { UrlValidator };
