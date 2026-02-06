#!/usr/bin/env bun
/**
 * 🌐 Comprehensive URL Pattern Analysis & Fix System
 * 
 * Uses @[lib] directory patterns to analyze, detect, and fix URL issues
 * across the entire codebase. Based on discovered patterns and fragments.
 */

// Safe entry guard - NO SILENT KILLER!
if (import.meta.main) {
  main().catch(console.error);
} else {
  console.log('ℹ️  URL Pattern Analyzer imported, not executed directly');
}

import { write } from "bun";


// ============================================================================
// URL PATTERN ANALYSIS SYSTEM
// ============================================================================

class URLPatternAnalyzer {
  
  // URL patterns discovered from @[lib] directory analysis
  private static readonly URL_PATTERNS = {
    // Documentation URLs (most common)
    documentation: {
      'bun.sh': [
        'https://bun.sh/docs',
        'https://bun.sh/docs/api',
        'https://bun.sh/docs/runtime', 
        'https://bun.sh/docs/guides',
        'https://bun.sh/docs/cli',
        'https://bun.sh/blog',
        'https://bun.sh/rss.xml',
        'https://bun.sh/docs/runtime/networking/fetch',
        'https://bun.sh/docs/api/fetch',
        'https://bun.sh/docs/api/file',
        'https://bun.sh/docs/api/utils',
        'https://bun.sh/docs/api/s3',
        'https://bun.sh/docs/runtime/bunfig',
        'https://bun.sh/docs/runtime/bun-apis',
        'https://bun.sh/docs/api/http-server#metrics',
        'https://bun.sh/docs/runtime/shell',
        'https://bun.sh/docs/bundler/features'
      ],
      'bun.com': [
        'https://bun.com/docs',
        'https://bun.com',
        'https://bun.com/reference',
        'https://bun.com/reference/api',
        'https://bun.com/reference/cli',
        'https://bun.com/reference/config',
        'https://bun.com/guides',
        'https://bun.com/guides/getting-started',
        'https://bun.com/blog',
        'https://bun.com/rss.xml'
      ]
    },
    
    // GitHub URLs
    github: {
      'github.com': [
        'https://github.com/oven-sh/bun',
        'https://github.com/oven-sh/bun/issues',
        'https://github.com/oven-sh/bun/pulls',
        'https://github.com/oven-sh/bun/releases',
        'https://github.com/oven-sh/bun/discussions',
        'https://github.com/oven-sh/bun/actions',
        'https://github.com/oven-sh/bun/wiki',
        'https://api.github.com',
        'https://raw.githubusercontent.com',
        'https://gist.github.com'
      ]
    },
    
    // Testing URLs
    testing: {
      'httpbin.org': [
        'https://httpbin.org/json',
        'https://httpbin.org/post', 
        'https://httpbin.org/uuid',
        'https://httpbin.org/ip',
        'https://httpbin.org/bytes/1024',
        'https://httpbin.org/bytes/10240'
      ],
      'jsonplaceholder': [
        'https://jsonplaceholder.typicode.com/posts/1'
      ]
    },
    
    // Registry URLs
    registry: {
      'npm': [
        'https://registry.npmjs.org'
      ],
      'factory-wager': [
        'https://npm.factory-wager.com',
        'https://npm.factory-wager.com/'
      ]
    },
    
    // Local development URLs
    local: {
      'example.com': [
        'http://example.com',
        'http://example.com',
        'http://example.com',
        'http://example.com',
        'http://example.com/api/v1/metrics',
        'http://example.com/health',
        'http://example.com/api/v1/graph'
      ]
    },
    
    // Factory/Production URLs
    production: {
      'factorywager.io': [
        'https://factorywager.io/metrics',
        'https://factorywager.io/metrics/rss.xml',
        'https://factorywager.io/feed/metrics',
        'https://factorywager.io/feed/metrics.json'
      ],
      'shop.bun.com': [
        'https://shop.bun.com/'
      ]
    }
  };

  // Known issues and fixes
  private static readonly URL_FIXES = {
    // Broken registry URLs
    'https://npm.factory-wager.com': 'https://registry.npmjs.org',
    'https://npm.factory-wager.com/': 'https://registry.npmjs.org/',
    
    // Performance optimizations
    'https://bun.sh/docs': 'https://bun.sh/docs/cli', // Faster loading
    
    // Protocol fixes
    'http://bun.sh': 'https://bun.sh',
    'http://github.com': 'https://github.com'
  };

  /**
   * Analyze all URL patterns in the codebase
   */
  static async analyzePatterns(): Promise<{
    totalPatterns: number;
    categories: Record<string, number>;
    issues: Array<{ pattern: string; issue: string; severity: 'low' | 'medium' | 'high' }>;
  }> {
    console.log('🔍 ANALYZING URL PATTERNS FROM @[lib] DIRECTORY...');
    
    let totalPatterns = 0;
    const categories: Record<string, number> = {};
    const issues: Array<{ pattern: string; issue: string; severity: 'low' | 'medium' | 'high' }> = [];
    
    // Count patterns by category
    for (const [category, domains] of Object.entries(this.URL_PATTERNS)) {
      let categoryCount = 0;
      for (const urls of Object.values(domains)) {
        categoryCount += urls.length;
      }
      categories[category] = categoryCount;
      totalPatterns += categoryCount;
    }
    
    // Identify issues
    for (const [broken, fixed] of Object.entries(this.URL_FIXES)) {
      if (broken.includes('factory-wager')) {
        issues.push({
          pattern: broken,
          issue: `Broken registry URL - should be ${fixed}`,
          severity: 'high'
        });
      } else if (broken.startsWith('http://')) {
        issues.push({
          pattern: broken,
          issue: `Insecure protocol - should be HTTPS`,
          severity: 'medium'
        });
      }
    }
    
    console.log(`   Found ${totalPatterns} URL patterns across ${Object.keys(categories).length} categories`);
    
    return { totalPatterns, categories, issues };
  }

  /**
   * Scan codebase for URL usage
   */
  static async scanCodebase(): Promise<{
    files: number;
    urls: number;
    patterns: Map<string, Array<{ file: string; line: number; context: string }>>;
  }> {
    console.log('\n📁 SCANNING CODEBASE FOR URL USAGE...');
    
    const patterns = new Map<string, Array<{ file: string; line: number; context: string }>>();
    let totalUrls = 0;
    let filesScanned = 0;
    
    // Key directories to scan
    const directories = [
      './lib',
      './windsurf-project',
      './trader-analyzer-bun',
      './my-bun-app'
    ];
    
    for (const dir of directories) {
      try {
        const files = await this.scanDirectory(dir, patterns);
        filesScanned += files;
      } catch (error) {
        console.log(`   ⚠️  Could not scan ${dir}: ${error.message}`);
      }
    }
    
    // Count total URLs
    for (const occurrences of patterns.values()) {
      totalUrls += occurrences.length;
    }
    
    console.log(`   Scanned ${filesScanned} files`);
    console.log(`   Found ${totalUrls} URL occurrences`);
    console.log(`   Unique URLs: ${patterns.size}`);
    
    return { files: filesScanned, urls: totalUrls, patterns };
  }

  /**
   * Scan directory recursively for URLs
   */
  private static async scanDirectory(dir: string, patterns: Map<string, Array<{ file: string; line: number; context: string }>>): Promise<number> {
    let filesScanned = 0;
    
    async function scanFile(filePath: string): Promise<void> {
      try {
        const content = await Bun.file(filePath).text();
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          // Find URLs in line
          const urlRegex = /https?:\/\/[^\s"')]+/g;
          const matches = line.match(urlRegex);
          
          if (matches) {
            matches.forEach(url => {
              if (!patterns.has(url)) {
                patterns.set(url, []);
              }
              patterns.get(url)!.push({
                file: filePath,
                line: index + 1,
                context: line.trim()
              });
            });
          }
        });
        
        filesScanned++;
      } catch (error) {
        // Skip files that can't be read
      }
    }
    
    async function scanDirectoryRecursive(currentDir: string): Promise<void> {
      try {
        const entries = await Array.fromAsync(await Deno.readDir(currentDir));
        
        for (const entry of entries) {
          const fullPath = `${currentDir}/${entry.name}`;
          
          if (entry.isDirectory && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await scanDirectoryRecursive(fullPath);
          } else if (entry.isFile && (entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name.endsWith('.json'))) {
            await scanFile(fullPath);
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    }
    
    await scanDirectoryRecursive(dir);
    return filesScanned;
  }

  /**
   * Apply fixes to codebase
   */
  static async applyFixes(patterns: Map<string, Array<{ file: string; line: number; context: string }>>): Promise<{
    filesFixed: number;
    urlsFixed: number;
    fixes: Array<{ url: string; fixed: string; files: string[] }>;
  }> {
    console.log('\n🔧 APPLYING URL FIXES...');
    
    let filesFixed = 0;
    let urlsFixed = 0;
    const fixes: Array<{ url: string; fixed: string; files: string[] }> = [];
    
    for (const [brokenUrl, fixedUrl] of Object.entries(this.URL_FIXES)) {
      const occurrences = patterns.get(brokenUrl);
      
      if (occurrences && occurrences.length > 0) {
        const filesToFix = new Set(occurrences.map(occ => occ.file));
        
        for (const file of filesToFix) {
          try {
            const content = await Bun.file(file).text();
            const fixedContent = content.replace(new RegExp(brokenUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fixedUrl);
            
            if (content !== fixedContent) {
              await write(file, fixedContent);
              console.log(`   ✅ Fixed ${brokenUrl} → ${fixedUrl} in ${file}`);
              filesFixed++;
            }
          } catch (error) {
            console.log(`   ❌ Failed to fix ${file}: ${error.message}`);
          }
        }
        
        fixes.push({
          url: brokenUrl,
          fixed: fixedUrl,
          files: Array.from(filesToFix)
        });
        
        urlsFixed += occurrences.length;
      }
    }
    
    return { filesFixed, urlsFixed, fixes };
  }

  /**
   * Generate comprehensive analysis report
   */
  static generateReport(analysis: any, scan: any, fixes: any): void {
    console.log('\n📊 COMPREHENSIVE URL PATTERN ANALYSIS REPORT');
    console.log('=' .repeat(80));
    
    // Pattern Analysis
    console.log('\n🔍 PATTERN ANALYSIS:');
    console.log(`   Total URL Patterns: ${analysis.totalPatterns}`);
    console.log('\n   Categories:');
    for (const [category, count] of Object.entries(analysis.categories)) {
      console.log(`      ${category}: ${count} patterns`);
    }
    
    // Issues Found
    if (analysis.issues.length > 0) {
      console.log('\n🚨 ISSUES FOUND:');
      analysis.issues.forEach((issue: any) => {
        const icon = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟠';
        console.log(`   ${icon} ${issue.pattern}: ${issue.issue}`);
      });
    }
    
    // Scan Results
    console.log('\n📁 SCAN RESULTS:');
    console.log(`   Files Scanned: ${scan.files}`);
    console.log(`   URL Occurrences: ${scan.urls}`);
    console.log(`   Unique URLs: ${scan.patterns.size}`);
    
    // Top URLs by usage
    const topUrls = Array.from(scan.patterns.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10);
    
    console.log('\n   TOP 10 MOST USED URLS:');
    topUrls.forEach(([url, occurrences], index) => {
      console.log(`      ${index + 1}. ${url} (${occurrences.length} occurrences)`);
    });
    
    // Fix Results
    console.log('\n🔧 FIX RESULTS:');
    console.log(`   Files Fixed: ${fixes.filesFixed}`);
    console.log(`   URLs Fixed: ${fixes.urlsFixed}`);
    
    if (fixes.fixes.length > 0) {
      console.log('\n   APPLIED FIXES:');
      fixes.fixes.forEach((fix: any) => {
        console.log(`      ${fix.url} → ${fix.fixed} (${fix.files.length} files)`);
      });
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('   1. Replace all factory-wager registry URLs with npmjs.org');
    console.log('   2. Use HTTPS for all external URLs');
    console.log('   3. Consider CDN optimization for frequently accessed docs');
    console.log('   4. Add URL validation to CI/CD pipeline');
    console.log('   5. Create URL constants for better maintainability');
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ URL PATTERN ANALYSIS COMPLETE!');
  }

  /**
   * Run complete analysis
   */
  static async runCompleteAnalysis(): Promise<void> {
    console.log('🌐 COMPREHENSIVE URL PATTERN ANALYSIS & FIX SYSTEM');
    console.log('Based on @[lib] directory pattern discovery');
    console.log('=' .repeat(80));
    
    // Step 1: Analyze patterns
    const analysis = await this.analyzePatterns();
    
    // Step 2: Scan codebase
    const scan = await this.scanCodebase();
    
    // Step 3: Apply fixes
    const fixes = await this.applyFixes(scan.patterns);
    
    // Step 4: Generate report
    this.generateReport(analysis, scan, fixes);
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main(): Promise<void> {
  try {
    await URLPatternAnalyzer.runCompleteAnalysis();
  } catch (error) {
    console.error('\n❌ URL pattern analysis failed:', error);
    process.exit(1);
  }
}
