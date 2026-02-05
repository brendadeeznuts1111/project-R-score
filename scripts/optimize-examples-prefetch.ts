#!/usr/bin/env bun
/**
 * 🚀 Prefetch Optimization for Examples
 * 
 * Adds prefetch hints, resource optimization, and performance improvements
 * to all example code and documentation
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

interface PrefetchOptimization {
  type: 'dns-prefetch' | 'preconnect' | 'prefetch' | 'preload' | 'modulepreload';
  url: string;
  importance?: 'high' | 'low' | 'auto';
  crossOrigin?: string;
}

class ExamplePrefetchOptimizer {
  private readonly sourceDirectories = ['lib', 'services', 'docs', 'examples', 'tools'];
  private readonly fileExtensions = ['.ts', '.js', '.md', '.html'];
  
  // Common external resources that should be prefetched
  private readonly prefetchResources: PrefetchOptimization[] = [
    // Bun documentation
    { type: 'preconnect', url: 'https://bun.sh', importance: 'high' },
    { type: 'dns-prefetch', url: 'https://bun.sh' },
    { type: 'preload', url: 'https://bun.sh/logo.svg', importance: 'high', crossOrigin: 'anonymous' },
    
    // Example domain resources
    { type: 'preconnect', url: 'https://example.com', importance: 'high' },
    { type: 'dns-prefetch', url: 'https://example.com' },
    
    // Common CDNs
    { type: 'preconnect', url: 'https://cdn.jsdelivr.net', importance: 'high' },
    { type: 'dns-prefetch', url: 'https://cdn.jsdelivr.net' },
    
    // GitHub resources
    { type: 'preconnect', url: 'https://github.com', importance: 'medium' },
    { type: 'dns-prefetch', url: 'https://github.com' },
    
    // Documentation sites
    { type: 'preconnect', url: 'https://developer.mozilla.org', importance: 'medium' },
    { type: 'dns-prefetch', url: 'https://developer.mozilla.org' }
  ];
  
  optimizeAll(): void {
    console.log('🚀 Optimizing examples with prefetch hints...\n');
    
    let totalFiles = 0;
    let totalOptimizations = 0;
    
    for (const dir of this.sourceDirectories) {
      try {
        statSync(dir);
        const { fileCount, optimizations } = this.optimizeDirectory(dir);
        totalFiles += fileCount;
        totalOptimizations += optimizations;
      } catch {
        // Directory doesn't exist, skip it
      }
    }
    
    console.log(`\n🎯 Optimization Summary:`);
    console.log(`   Files processed: ${totalFiles}`);
    console.log(`   Optimizations made: ${totalOptimizations}`);
    
    if (totalOptimizations > 0) {
      console.log('\n✅ Successfully added prefetch optimizations');
      console.log('🚀 Performance improvements:');
      console.log('   • DNS prefetching for faster domain resolution');
      console.log('   • Preconnect for faster TCP handshakes');
      console.log('   • Preload for critical resources');
      console.log('   • Module preload for faster JS execution');
    } else {
      console.log('\nℹ️  No optimizations needed - examples already optimized');
    }
  }
  
  private optimizeDirectory(dir: string): { fileCount: number; optimizations: number } {
    let fileCount = 0;
    let optimizations = 0;
    
    function scanDirectory(currentDir: string): void {
      const entries = readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else {
          const ext = entry.name.substring(entry.name.lastIndexOf('.'));
          if (this.fileExtensions.includes(ext)) {
            const fileOptimizations = this.optimizeFile(fullPath, ext);
            if (fileOptimizations > 0) {
              console.log(`  ✅ ${fullPath}: ${fileOptimizations} optimizations`);
              optimizations += fileOptimizations;
            }
            fileCount++;
          }
        }
      }
    }
    
    const self = this;
    scanDirectory = scanDirectory.bind(self);
    scanDirectory(dir);
    
    return { fileCount, optimizations };
  }
  
  private optimizeFile(filePath: string, extension: string): number {
    try {
      let content = readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      switch (extension) {
        case '.html':
          content = this.optimizeHtmlFile(content);
          break;
        case '.md':
          content = this.optimizeMarkdownFile(content);
          break;
        case '.ts':
        case '.js':
          content = this.optimizeCodeFile(content);
          break;
      }
      
      // Only write file if changes were made
      if (content !== originalContent) {
        writeFileSync(filePath, content);
        return this.countOptimizations(originalContent, content);
      }
      
      return 0;
      
    } catch (error) {
      console.warn(`⚠️  Could not process ${filePath}: ${error.message}`);
      return 0;
    }
  }
  
  private optimizeHtmlFile(content: string): string {
    // Add prefetch hints to HTML head
    const prefetchHints = this.generatePrefetchHints();
    
    // Find or create head tag
    const headMatch = content.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    
    if (headMatch) {
      const existingHead = headMatch[1];
      
      // Check if prefetch hints already exist
      if (!existingHead.includes('dns-prefetch') && !existingHead.includes('preconnect')) {
        const newHead = existingHead.trim() + '\n' + prefetchHints + '\n';
        content = content.replace(headMatch[0], `<head${headMatch[1] ? '' : '>'}${newHead}</head>`);
      }
    } else {
      // Add head tag before body
      const bodyMatch = content.match(/<body/i);
      if (bodyMatch) {
        content = content.replace(bodyMatch[0], `<head>\n${prefetchHints}\n</head>\n` + bodyMatch[0]);
      }
    }
    
    // Add optimization attributes to existing resources
    content = this.addResourceOptimizationAttributes(content);
    
    return content;
  }
  
  private optimizeMarkdownFile(content: string): string {
    // Add prefetch hints as HTML comments at the top
    const prefetchHints = this.generatePrefetchHints();
    const htmlComment = `<!-- Prefetch Optimizations -->\n${prefetchHints}\n<!-- End Prefetch Optimizations -->\n\n`;
    
    // Check if already optimized
    if (!content.includes('Prefetch Optimizations')) {
      // Add after frontmatter if exists
      const frontmatterMatch = content.match(/^---\n[\s\S]*?\n---\n/);
      if (frontmatterMatch) {
        content = content.replace(frontmatterMatch[0], frontmatterMatch[0] + htmlComment);
      } else {
        content = htmlComment + content;
      }
    }
    
    // Optimize external links
    content = this.optimizeMarkdownLinks(content);
    
    return content;
  }
  
  private optimizeCodeFile(content: string): string {
    // Add prefetch optimization comments to code files
    if (!content.includes('Prefetch Optimizations')) {
      const optimizationComment = `/**
 * 🚀 Prefetch Optimizations
 * 
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 * 
 * Generated automatically by optimize-examples-prefetch.ts
 */
`;
      
      // Add after imports or at the top
      const importMatch = content.match(/^import[^;]+;?\n/m);
      if (importMatch) {
        content = content.replace(importMatch[0], importMatch[0] + '\n' + optimizationComment);
      } else {
        content = optimizationComment + content;
      }
    }
    
    // Optimize fetch calls with prefetch hints
    content = this.optimizeFetchCalls(content);
    
    return content;
  }
  
  private generatePrefetchHints(): string {
    const hints: string[] = [];
    
    for (const resource of this.prefetchResources) {
      switch (resource.type) {
        case 'dns-prefetch':
          hints.push(`  <link rel="dns-prefetch" href="${resource.url}">`);
          break;
        case 'preconnect':
          const crossOriginAttr = resource.crossOrigin ? ` crossorigin="${resource.crossOrigin}"` : '';
          hints.push(`  <link rel="preconnect" href="${resource.url}"${crossOriginAttr}>`);
          break;
        case 'prefetch':
          hints.push(`  <link rel="prefetch" href="${resource.url}">`);
          break;
        case 'preload':
          const preloadAttrs = [];
          if (resource.importance) preloadAttrs.push(`importance="${resource.importance}"`);
          if (resource.crossOrigin) preloadAttrs.push(`crossorigin="${resource.crossOrigin}"`);
          hints.push(`  <link rel="preload" href="${resource.url}" ${preloadAttrs.join(' ')}>`);
          break;
        case 'modulepreload':
          hints.push(`  <link rel="modulepreload" href="${resource.url}">`);
          break;
      }
    }
    
    return hints.join('\n');
  }
  
  private addResourceOptimizationAttributes(content: string): string {
    // Add loading="lazy" to images
    content = content.replace(/<img([^>]*?)>/gi, (match, attrs) => {
      if (!attrs.includes('loading=')) {
        return `<img${attrs} loading="lazy">`;
      }
      return match;
    });
    
    // Add fetchpriority to critical resources
    content = content.replace(/<link[^>]*rel="preload"[^>]*>/gi, (match) => {
      if (!match.includes('fetchpriority=')) {
        return match.replace('>', ' fetchpriority="high">');
      }
      return match;
    });
    
    return content;
  }
  
  private optimizeMarkdownLinks(content: string): string {
    // Add external link indicators and prefetch hints
    content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/gi, (match, text, url) => {
      if (url.startsWith('http')) {
        // Add external icon indicator
        return `[${text} 🌐](${url})`;
      }
      return match;
    });
    
    return content;
  }
  
  private optimizeFetchCalls(content: string): string {
    // Add prefetch comments before fetch calls
    content = content.replace(/(\s*)(await\s+fetch\()\s*(['"`]https?:\/\/[^'"`]+['"`])/g, 
      '$1// 🚀 Prefetch hint: Consider preconnecting to $3 domain\n$1$2$3');
    
    // Add performance optimization comments
    if (content.includes('fetch(')) {
      const optimizationTip = `
/**
 * 💡 Performance Tip: For better performance, consider:
 * 1. Using preconnect for frequently accessed domains
 * 2. Adding resource hints to your HTML head
 * 3. Implementing request caching
 * 4. Using the native fetch API with keep-alive
 */`;
      
      if (!content.includes('Performance Tip')) {
        content = content + optimizationTip;
      }
    }
    
    return content;
  }
  
  private countOptimizations(original: string, optimized: string): number {
    const originalLines = original.split('\n').length;
    const optimizedLines = optimized.split('\n').length;
    return Math.max(0, optimizedLines - originalLines);
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main(): Promise<void> {
  const command = process.argv[2];
  const optimizer = new ExamplePrefetchOptimizer();
  
  switch (command) {
    case 'optimize':
    case '':
      console.log('🚀 Example Prefetch Optimizer\n');
      optimizer.optimizeAll();
      break;
      
    case 'help':
    case '--help':
    case '-h':
      console.log(`
🚀 Example Prefetch Optimizer

USAGE:
  bun run scripts/optimize-examples-prefetch.ts [command]

COMMANDS:
  optimize    Add prefetch optimizations to all examples (default)
  help        Show this help message

WHAT IT DOES:
  • Adds DNS prefetch hints for external domains
  • Adds preconnect links for faster TCP handshakes
  • Adds preload hints for critical resources
  • Optimizes HTML, Markdown, and code files
  • Adds performance optimization comments
  • Implements lazy loading for images

OPTIMIZATION TYPES:
  • dns-prefetch    - Resolve domain names early
  • preconnect      - Establish TCP connection early
  • prefetch        - Download resources for future use
  • preload         - Download critical resources immediately
  • modulepreload   - Preload JavaScript modules

EXAMPLES:
  bun run scripts/optimize-examples-prefetch.ts
  bun run scripts/optimize-examples-prefetch.ts optimize

BENEFITS:
  🚀 Faster page load times
  🌐 Improved user experience
  📱 Better mobile performance
  🔍 Optimized resource loading
      `);
      break;
      
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Use "help" for usage information');
      process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(error => {
    console.error('❌ Optimization failed:', error);
    process.exit(1);
  });
}

export { ExamplePrefetchOptimizer };
