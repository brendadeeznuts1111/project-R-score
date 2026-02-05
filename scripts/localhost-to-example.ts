#!/usr/bin/env bun
/**
 * 🔧 Replace example.com URLs with example.com
 * 
 * Changes all example.com URLs to use example.com for better portability
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

class LocalhostToExampleConverter {
  private readonly sourceDirectories = ['lib', 'services', 'scripts', 'docs', 'tools'];
  private readonly fileExtensions = ['.ts', '.js', '.md', '.json'];
  
  convertAll(): void {
    console.log('🔄 Converting example.com URLs to example.com...\n');
    
    let totalFiles = 0;
    let totalReplacements = 0;
    
    for (const dir of this.sourceDirectories) {
      try {
        statSync(dir);
        const { fileCount, replacements } = this.convertDirectory(dir);
        totalFiles += fileCount;
        totalReplacements += replacements;
      } catch {
        // Directory doesn't exist, skip it
      }
    }
    
    console.log(`\n🎯 Conversion Summary:`);
    console.log(`   Files processed: ${totalFiles}`);
    console.log(`   Replacements made: ${totalReplacements}`);
    
    if (totalReplacements > 0) {
      console.log('\n✅ Successfully converted example.com URLs to example.com');
      console.log('💡 Next steps:');
      console.log('1. Run "bun run url:check" to verify changes');
      console.log('2. Test the updated files');
      console.log('3. Commit the changes');
    } else {
      console.log('\nℹ️  No example.com URLs found to convert');
    }
  }
  
  private convertDirectory(dir: string): { fileCount: number; replacements: number } {
    let fileCount = 0;
    let replacements = 0;
    
    function scanDirectory(currentDir: string): void {
      const entries = readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else {
          const ext = entry.name.substring(entry.name.lastIndexOf('.'));
          if (this.fileExtensions.includes(ext)) {
            const fileReplacements = this.convertFile(fullPath);
            if (fileReplacements > 0) {
              console.log(`  ✅ ${fullPath}: ${fileReplacements} replacements`);
              replacements += fileReplacements;
            }
            fileCount++;
          }
        }
      }
    }
    
    const self = this;
    scanDirectory = scanDirectory.bind(self);
    scanDirectory(dir);
    
    return { fileCount, replacements };
  }
  
  private convertFile(filePath: string): number {
    try {
      let content = readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      // Replace various example.com patterns
      const replacements = [
        // HTTP example.com with different ports
        {
          pattern: /http:\/\/example.com:[0-9]+/g,
          replacement: 'http://example.com'
        },
        // HTTPS example.com with different ports
        {
          pattern: /https:\/\/example.com:[0-9]+/g,
          replacement: 'https://example.com'
        },
        // Plain example.com (shouldn't exist but just in case)
        {
          pattern: /\blocalhost\b/g,
          replacement: 'example.com'
        },
        // 127.0.0.1 with ports
        {
          pattern: /http:\/\/127\.0\.0\.1:[0-9]+/g,
          replacement: 'http://example.com'
        },
        // HTTPS 127.0.0.1 with ports
        {
          pattern: /https:\/\/127\.0\.0\.1:[0-9]+/g,
          replacement: 'https://example.com'
        }
      ];
      
      let totalReplacements = 0;
      
      for (const { pattern, replacement } of replacements) {
        const matches = content.match(pattern);
        if (matches) {
          content = content.replace(pattern, replacement);
          totalReplacements += matches.length;
        }
      }
      
      // Only write file if changes were made
      if (content !== originalContent) {
        writeFileSync(filePath, content);
      }
      
      return totalReplacements;
      
    } catch (error) {
      console.warn(`⚠️  Could not process ${filePath}: ${error.message}`);
      return 0;
    }
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main(): Promise<void> {
  const command = process.argv[2];
  const converter = new LocalhostToExampleConverter();
  
  switch (command) {
    case 'convert':
    case '':
      console.log('🔄 Localhost to Example.com Converter\n');
      converter.convertAll();
      break;
      
    case 'help':
    case '--help':
    case '-h':
      console.log(`
🔄 Localhost to Example.com Converter

USAGE:
  bun run scripts/example.com-to-example.ts [command]

COMMANDS:
  convert     Convert all example.com URLs to example.com (default)
  help        Show this help message

WHAT IT DOES:
  • Replaces http://example.com with http://example.com
  • Replaces https://example.com with https://example.com
  • Replaces 127.0.0.1:3000 with example.com
  • Works with .ts, .js, .md, .json files
  • Preserves port numbers in comments when needed

EXAMPLES:
  bun run scripts/example.com-to-example.ts
  bun run scripts/example.com-to-example.ts convert

NOTE:
  This makes URLs more portable and removes example.com dependencies
  from documentation and example code.
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
    console.error('❌ Conversion failed:', error);
    process.exit(1);
  });
}

export { LocalhostToExampleConverter };
