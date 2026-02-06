#!/usr/bin/env bun
/**
 * Documentation Reference Validation Script
 * 
 * Validates and updates all documentation references across the codebase.
 * Ensures consistency and correctness of all Bun documentation links.
 */

import { readFile, writeFile } from 'fs/promises';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { docs, validateDocUrl } from '../lib/docs/reference';

// Configuration
const CONFIG = {
  ROOT_DIR: join(import.meta.dir, '..'),
  INCLUDE_EXTENSIONS: ['.ts', '.js', '.md', '.json'],
  EXCLUDE_DIRS: ['.git', 'node_modules', '.bun-cache', 'dist', 'build'],
  BUN_URL_PATTERN: /https:\/\/bun\.sh\/[^\s)\]]+/g,
  GITHUB_URL_PATTERN: /https:\/\/github\.com\/oven-sh\/bun\/[^\s)\]]+/g,
  DRY_RUN: process.argv.includes('--dry-run'),
  FIX: process.argv.includes('--fix'),
  VERBOSE: process.argv.includes('--verbose')
} as const;

interface ValidationResult {
  file: string;
  line: number;
  url: string;
  isValid: boolean;
  suggestedUrl?: string;
  error?: string;
}

interface FileResult {
  filePath: string;
  totalUrls: number;
  validUrls: number;
  invalidUrls: number;
  issues: ValidationResult[];
}

/**
 * Validate a single URL and suggest corrections
 */
function validateUrl(url: string): { isValid: boolean; suggestedUrl?: string; error?: string } {
  try {
    const parsed = new URL(url);
    
    // Normalize protocol to https
    if (parsed.protocol !== 'https:') {
      return {
        isValid: false,
        suggestedUrl: url.replace(/^http:/, 'https:'),
        error: 'Protocol should be https'
      };
    }
    
    // Check if it's a known documentation pattern
    if (parsed.hostname === 'bun.sh') {
      if (!validateDocUrl(url)) {
        return {
          isValid: false,
          error: 'URL does not match known Bun documentation patterns'
        };
      }
    }
    
    // Normalize path (remove double slashes)
    if (parsed.pathname.includes('//')) {
      const normalized = parsed.pathname.replace(/\/+/g, '/');
      parsed.pathname = normalized;
      return {
        isValid: false,
        suggestedUrl: parsed.toString(),
        error: 'Path contains double slashes'
      };
    }
    
    return { isValid: true };
    
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid URL'
    };
  }
}

/**
 * Process a single file for documentation references
 */
async function processFile(filePath: string): Promise<FileResult> {
  const content = await readFile(filePath, 'utf8');
  const lines = content.split('\n');
  
  const result: FileResult = {
    filePath,
    totalUrls: 0,
    validUrls: 0,
    invalidUrls: 0,
    issues: []
  };
  
  lines.forEach((line, lineIndex) => {
    // Find all Bun documentation URLs
    const bunUrls = line.match(CONFIG.BUN_URL_PATTERN) || [];
    const githubUrls = line.match(CONFIG.GITHUB_URL_PATTERN) || [];
    const allUrls = [...bunUrls, ...githubUrls];
    
    allUrls.forEach(url => {
      result.totalUrls++;
      const validation = validateUrl(url);
      
      if (!validation.isValid) {
        result.invalidUrls++;
        result.issues.push({
          file: filePath,
          line: lineIndex + 1,
          url,
          isValid: false,
          suggestedUrl: validation.suggestedUrl,
          error: validation.error
        });
      } else {
        result.validUrls++;
      }
    });
  });
  
  return result;
}

/**
 * Fix documentation references in a file
 */
async function fixFile(filePath: string, issues: ValidationResult[]): Promise<void> {
  const content = await readFile(filePath, 'utf8');
  let fixedContent = content;
  
  // Apply fixes in reverse order to maintain line numbers
  const sortedIssues = issues.sort((a, b) => b.line - a.line);
  
  for (const issue of sortedIssues) {
    if (issue.suggestedUrl) {
      fixedContent = fixedContent.replace(issue.url, issue.suggestedUrl);
      
      if (CONFIG.VERBOSE) {
        console.log(`  Fixed: ${issue.url} → ${issue.suggestedUrl}`);
      }
    }
  }
  
  await writeFile(filePath, fixedContent, 'utf8');
}

/**
 * Recursively find all files to process
 */
async function findFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (!CONFIG.EXCLUDE_DIRS.includes(entry.name)) {
          files.push(...await findFiles(fullPath));
        }
      } else if (entry.isFile()) {
        const ext = entry.name.toLowerCase().slice(entry.name.lastIndexOf('.'));
        if (CONFIG.INCLUDE_EXTENSIONS.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dir}:`, error);
  }
  
  return files;
}

/**
 * Generate documentation reference table
 */
function generateReferenceTable(): string {
  return docs.generateMarkdownTable('R-Score Optimization Documentation References');
}

/**
 * Main validation function
 */
async function main() {
  console.log('🔍 Documentation Reference Validation');
  console.log('=====================================\n');
  
  if (CONFIG.DRY_RUN) {
    console.log('🔬 DRY RUN MODE - No files will be modified\n');
  }
  
  if (CONFIG.FIX) {
    console.log('🔧 FIX MODE - Invalid URLs will be corrected\n');
  }
  
  // Find all files to process
  const files = await findFiles(CONFIG.ROOT_DIR);
  console.log(`📁 Found ${files.length} files to check\n`);
  
  let totalUrls = 0;
  let totalValid = 0;
  let totalInvalid = 0;
  const allIssues: ValidationResult[] = [];
  
  // Process each file
  for (const filePath of files) {
    if (CONFIG.VERBOSE) {
      console.log(`🔍 Processing: ${filePath}`);
    }
    
    const result = await processFile(filePath);
    
    if (result.issues.length > 0) {
      console.log(`❌ ${filePath}: ${result.issues.length} issues`);
      
      if (CONFIG.VERBOSE) {
        result.issues.forEach(issue => {
          console.log(`   Line ${issue.line}: ${issue.url}`);
          if (issue.error) console.log(`   Error: ${issue.error}`);
          if (issue.suggestedUrl) console.log(`   Suggested: ${issue.suggestedUrl}`);
        });
      }
      
      allIssues.push(...result.issues);
      
      // Fix file if requested
      if (CONFIG.FIX && !CONFIG.DRY_RUN) {
        await fixFile(filePath, result.issues);
        console.log(`✅ Fixed: ${filePath}`);
      }
    } else if (CONFIG.VERBOSE && result.totalUrls > 0) {
      console.log(`✅ ${filePath}: ${result.totalUrls} URLs validated`);
    }
    
    totalUrls += result.totalUrls;
    totalValid += result.validUrls;
    totalInvalid += result.invalidUrls;
  }
  
  // Summary
  console.log('\n📊 Validation Summary');
  console.log('=====================');
  console.log(`Total URLs found: ${totalUrls}`);
  console.log(`Valid URLs: ${totalValid}`);
  console.log(`Invalid URLs: ${totalInvalid}`);
  console.log(`Success rate: ${((totalValid / totalUrls) * 100).toFixed(1)}%`);
  
  if (totalInvalid > 0) {
    console.log(`\n⚠️  Found ${totalInvalid} invalid documentation references`);
    
    if (!CONFIG.FIX && !CONFIG.DRY_RUN) {
      console.log('💡 Run with --fix to automatically correct issues');
      console.log('💡 Run with --dry-run --fix to preview corrections');
    }
  } else {
    console.log('\n🎉 All documentation references are valid!');
  }
  
  // Generate reference table
  console.log('\n📚 Documentation Reference Table');
  console.log('================================');
  console.log(generateReferenceTable());
  
  // Exit with appropriate code
  process.exit(totalInvalid > 0 && !CONFIG.FIX ? 1 : 0);
}

// Run the script
if (import.meta.path === Bun.main) {
  main().catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
}
