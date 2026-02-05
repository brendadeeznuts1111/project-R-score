#!/usr/bin/env bun
/**
 * 🔗 Focused URL Validator Script
 * 
 * Scans only project source files for URL validation
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

interface UrlValidationResult {
  url: string;
  file: string;
  line: number;
  valid: boolean;
  issues: string[];
}

interface FocusedValidationReport {
  timestamp: string;
  totalUrls: number;
  validUrls: number;
  hardcodedLocalhostUrls: number;
  httpUrls: number;
  httpsUrls: number;
  results: UrlValidationResult[];
  status: 'pass' | 'fail' | 'warning';
}

class FocusedUrlValidator {
  private readonly sourceDirectories = ['lib', 'services', 'scripts', 'docs', 'tools'];
  private readonly fileExtensions = ['.ts', '.js', '.md'];
  
  async validateProject(): Promise<FocusedValidationReport> {
    console.log('🔍 Starting focused URL validation...\n');
    
    const urls = await this.extractSourceUrls();
    const results = await this.validateUrls(urls);
    const report = this.generateReport(results);
    
    this.printSummary(report);
    
    return report;
  }
  
  private async extractSourceUrls(): Promise<Array<{ url: string; file: string; line: number }>> {
    console.log('📂 Scanning source files for URLs...');
    
    const urls: Array<{ url: string; file: string; line: number }> = [];
    
    for (const dir of this.sourceDirectories) {
      try {
        statSync(dir);
        const dirUrls = await this.extractUrlsFromDirectory(dir);
        urls.push(...dirUrls);
      } catch {
        // Directory doesn't exist, skip it
      }
    }
    
    console.log(`Found ${urls.length} URLs in source files\n`);
    return urls;
  }
  
  private async extractUrlsFromDirectory(dir: string): Promise<Array<{ url: string; file: string; line: number }>> {
    const urls: Array<{ url: string; file: string; line: number }> = [];
    
    function scanDirectory(currentDir: string): void {
      const entries = readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else {
          const ext = entry.name.substring(entry.name.lastIndexOf('.'));
          if (this.fileExtensions.includes(ext)) {
            const fileUrls = this.extractUrlsFromFile(fullPath);
            urls.push(...fileUrls);
          }
        }
      }
    }
    
    const self = this;
    scanDirectory = scanDirectory.bind(self);
    scanDirectory(dir);
    
    return urls;
  }
  
  private extractUrlsFromFile(filePath: string): Array<{ url: string; file: string; line: number }> {
    const urls: Array<{ url: string; file: string; line: number }> = [];
    
    try {
      const content = readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      // More precise URL regex that avoids template literals with env vars
      const urlRegex = /https?:\/\/[^\s"')\]}<>]+(?![^"']*["']?\s*\})/g;
      
      lines.forEach((line, index) => {
        const matches = line.match(urlRegex);
        if (matches) {
          matches.forEach(url => {
            // Filter out URLs that are part of template literals with environment variables
            const lineContext = line.trim();
            
            // Skip if it's part of a template literal with process.env
            if (lineContext.includes('process.env') && lineContext.includes('${')) {
              return;
            }
            
            // Skip if it's part of a template literal with environment variable pattern
            if (lineContext.includes('${') && lineContext.includes('||') && lineContext.includes('example.com')) {
              return;
            }
            
            // Filter out obvious false positives
            if (!url.includes('</') && !url.includes('${') && !url.includes('<')) {
              urls.push({
                url: url.trim(),
                file: filePath,
                line: index + 1
              });
            }
          });
        }
      });
    } catch (error) {
      // Silently ignore files that can't be read
    }
    
    return urls;
  }
  
  private async validateUrls(urls: Array<{ url: string; file: string; line: number }>): Promise<UrlValidationResult[]> {
    console.log('🧪 Validating URL formats and standards compliance...');
    
    const results: UrlValidationResult[] = [];
    
    for (const { url, file, line } of urls) {
      const result = this.validateSingleUrl(url, file, line);
      results.push(result);
    }
    
    return results;
  }
  
  private validateSingleUrl(url: string, file: string, line: number): UrlValidationResult {
    const result: UrlValidationResult = {
      url,
      file,
      line,
      valid: true,
      issues: []
    };
    
    try {
      // Basic URL format validation
      new URL(url);
      
      // Check for hardcoded localhost (but allow example.com as replacement)
      if (url.includes('localhost') || url.includes('127.0.0.1')) {
        result.valid = false;
        result.issues.push('Hardcoded localhost URL found');
      }
      
      // example.com URLs are acceptable (more portable than localhost)
      if (url.includes('example.com')) {
        // No issues - example.com is preferred over localhost
      }
      
      // Check protocol (allow HTTP for example.com and localhost examples)
      if (url.startsWith('http://') && !url.includes('localhost') && !url.includes('example.com')) {
        result.issues.push('Non-HTTPS URL in production code');
      }
      
    } catch (error) {
      result.valid = false;
      result.issues.push(`Invalid URL format: ${error.message}`);
    }
    
    return result;
  }
  
  private generateReport(results: UrlValidationResult[]): FocusedValidationReport {
    const totalUrls = results.length;
    const validUrls = results.filter(r => r.valid).length;
    const hardcodedLocalhostUrls = results.filter(r => 
      r.issues.includes('Hardcoded localhost URL found')
    ).length;
    const httpUrls = results.filter(r => r.url.startsWith('http://')).length;
    const httpsUrls = results.filter(r => r.url.startsWith('https://')).length;
    const exampleComUrls = results.filter(r => r.url.includes('example.com')).length;
    
    // Determine status
    let status: 'pass' | 'fail' | 'warning' = 'pass';
    
    if (hardcodedLocalhostUrls > 0) {
      status = 'fail';
    } else if (httpUrls > 10) { // Allow more HTTP URLs for examples
      status = 'warning';
    }
    
    return {
      timestamp: new Date().toISOString(),
      totalUrls,
      validUrls,
      hardcodedLocalhostUrls,
      httpUrls,
      httpsUrls,
      results,
      status
    };
  }
  
  private printSummary(report: FocusedValidationReport): void {
    console.log('🎯 Focused URL Validation Summary');
    console.log('===============================');
    console.log(`📊 Statistics:`);
    console.log(`   Total URLs: ${report.totalUrls}`);
    console.log(`   Valid URLs: ${report.validUrls}`);
    console.log(`   HTTPS URLs: ${report.httpsUrls} ✅`);
    console.log(`   HTTP URLs: ${report.httpUrls} ${report.httpUrls > 10 ? '⚠️' : '✅'}`);
    console.log(`   Localhost URLs: ${report.hardcodedLocalhostUrls} ${report.hardcodedLocalhostUrls > 0 ? '❌' : '✅'}`);
    
    // Count example.com URLs
    const exampleComUrls = report.results.filter(r => r.url.includes('example.com')).length;
    if (exampleComUrls > 0) {
      console.log(`   Example.com URLs: ${exampleComUrls} ✅ (portable examples)`);
    }
    
    const statusIcon = report.status === 'pass' ? '✅' : 
                      report.status === 'warning' ? '⚠️' : '❌';
    console.log(`\n🎯 Status: ${statusIcon} ${report.status.toUpperCase()}`);
    
    // Show problematic URLs (only localhost and invalid URLs)
    const problematicResults = report.results.filter(r => !r.valid || 
      (r.issues.length > 0 && !r.url.includes('example.com'))
    );
    
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
        console.log(`   ... and ${problematicResults.length - 10} more`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    
    if (report.status === 'pass') {
      console.log('🎉 All source file URLs are properly configured!');
      console.log('✅ Ready for production deployment');
      if (exampleComUrls > 0) {
        console.log('✅ Using portable example.com URLs instead of localhost');
      }
    } else if (report.status === 'warning') {
      console.log('⚠️  Some improvements recommended');
      console.log('🔧 Fix issues before production deployment');
    } else {
      console.log('❌ Critical issues found');
      console.log('🚫 Must fix issues before deployment');
    }
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main(): Promise<void> {
  const command = process.argv[2];
  const validator = new FocusedUrlValidator();
  
  switch (command) {
    case 'check':
    case 'quick':
    case '':
      console.log('🔗 Focused URL Validator - Source Files Only\n');
      const report = await validator.validateProject();
      
      // Return appropriate exit code
      if (report.status === 'pass') {
        process.exit(0);
      } else if (report.status === 'warning') {
        process.exit(1);
      } else {
        process.exit(2);
      }
      
      break;
      
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Usage: bun run url:check-focused');
      process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(error => {
    console.error('❌ URL validation failed:', error);
    process.exit(2);
  });
}

export { FocusedUrlValidator };
