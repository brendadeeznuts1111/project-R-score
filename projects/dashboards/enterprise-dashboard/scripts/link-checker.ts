#!/usr/bin/env bun
// link-checker.ts - Comprehensive broken link scanner for enterprise-dashboard

import { readdirSync, statSync, readFileSync } from 'fs';
import { join, extname, basename } from 'path';
import { fetch } from 'bun';

interface LinkResult {
  url: string;
  file: string;
  line: number;
  status: 'valid' | 'broken' | 'timeout' | 'error';
  statusCode?: number;
  error?: string;
}

interface LinkCheckOptions {
  timeout?: number;
  userAgent?: string;
  excludePatterns?: RegExp[];
  includeLocalhost?: boolean;
}

// Common patterns to exclude from checking
const DEFAULT_EXCLUDE_PATTERNS = [
  // Local development URLs
  /^http:\/\/localhost/,
  /^http:\/\/127\.0\.0\.1/,
  /^http:\/\/0\.0\.0\.0/,
  /^https:\/\/localhost/,

  // Private/internal IPs and ranges
  /^http:\/\/10\./,
  /^http:\/\/172\./,
  /^http:\/\/192\.168\./,
  /^http:\/\/169\.254\./,
  /^http:\/\/\[::1\]/,

  // Example/placeholder URLs
  /example\.com/,
  /evil\.com/,
  /test\.com/,
  /proxy\.example\.com/,

  // Dynamic/placeholder patterns
  /\*/  // Wildcard patterns
];

async function checkUrl(url: string, options: LinkCheckOptions = {}): Promise<LinkResult> {
  const { timeout = 10000, userAgent = 'LinkChecker/1.0' } = options;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'HEAD', // Use HEAD to check existence without downloading content
      headers: {
        'User-Agent': userAgent
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    return {
      url,
      status: response.ok ? 'valid' : 'broken',
      statusCode: response.status
    };

  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        url,
        status: 'timeout',
        error: 'Request timeout'
      };
    }

    return {
      url,
      status: 'error',
      error: error.message
    };
  }
}

function extractUrlsFromFile(filePath: string): Array<{ url: string; line: number }> {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const urls: Array<{ url: string; line: number }> = [];

  // Regex to match URLs (http/https)
  const urlRegex = /https?:\/\/[^\s"'<>{}[\]]+/g;

  lines.forEach((line, index) => {
    const matches = line.match(urlRegex);
    if (matches) {
      matches.forEach(match => {
        // Clean up the URL (remove trailing punctuation)
        const cleanUrl = match.replace(/[.,;:!?]$/, '');
        urls.push({ url: cleanUrl, line: index + 1 });
      });
    }
  });

  return urls;
}

function shouldCheckUrl(url: string, options: LinkCheckOptions): boolean {
  const { excludePatterns = DEFAULT_EXCLUDE_PATTERNS, includeLocalhost = false } = options;

  // Always exclude localhost unless explicitly requested
  if (!includeLocalhost && /^https?:\/\/localhost/.test(url)) {
    return false;
  }

  // Check against exclude patterns
  for (const pattern of excludePatterns) {
    if (pattern.test(url)) {
      return false;
    }
  }

  return true;
}

async function scanDirectory(dirPath: string, options: LinkCheckOptions = {}): Promise<LinkResult[]> {
  const results: LinkResult[] = [];
  const filesToCheck = [
    '.md', '.html', '.json', '.ts', '.tsx', '.js', '.jsx',
    '.toml', '.yaml', '.yml', 'Dockerfile', 'Makefile'
  ];

  function scanRecursive(currentPath: string): void {
    const items = readdirSync(currentPath);

    for (const item of items) {
      const fullPath = join(currentPath, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip common directories that shouldn't be scanned
        if (!['node_modules', '.git', 'dist', 'build', '.next', '.nuxt'].includes(item)) {
          scanRecursive(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = extname(item);
        if (filesToCheck.includes(ext) || filesToCheck.includes(basename(item))) {
          const urls = extractUrlsFromFile(fullPath);
          for (const { url, line } of urls) {
            if (shouldCheckUrl(url, options)) {
              results.push({
                url,
                file: fullPath,
                line,
                status: 'pending' as any // Will be updated when checked
              });
            }
          }
        }
      }
    }
  }

  console.log(`🔍 Scanning directory: ${dirPath}`);
  scanRecursive(dirPath);
  console.log(`📋 Found ${results.length} URLs to check`);

  return results;
}

async function checkLinks(results: LinkResult[], options: LinkCheckOptions = {}): Promise<LinkResult[]> {
  const { timeout = 10000 } = options;
  const updatedResults: LinkResult[] = [];

  console.log(`\n🌐 Checking ${results.length} links (timeout: ${timeout}ms)...`);

  // Process in batches to avoid overwhelming
  const batchSize = 5;
  for (let i = 0; i < results.length; i += batchSize) {
    const batch = results.slice(i, i + batchSize);
    const batchPromises = batch.map(async (result) => {
      console.log(`  Checking: ${result.url} (${result.file}:${result.line})`);
      const checkResult = await checkUrl(result.url, options);
      return { ...result, ...checkResult };
    });

    const batchResults = await Promise.all(batchPromises);
    updatedResults.push(...batchResults);

    // Small delay between batches to be respectful
    if (i + batchSize < results.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return updatedResults;
}

function printResults(results: LinkResult[]): void {
  const broken = results.filter(r => r.status === 'broken');
  const timeouts = results.filter(r => r.status === 'timeout');
  const errors = results.filter(r => r.status === 'error');
  const valid = results.filter(r => r.status === 'valid');

  console.log('\n📊 Link Check Results:');
  console.log('='.repeat(50));
  console.log(`✅ Valid links: ${valid.length}`);
  console.log(`❌ Broken links: ${broken.length}`);
  console.log(`⏱️  Timeouts: ${timeouts.length}`);
  console.log(`💥 Errors: ${errors.length}`);
  console.log(`📋 Total checked: ${results.length}`);

  if (broken.length > 0) {
    console.log('\n❌ BROKEN LINKS:');
    console.log('-'.repeat(30));
    broken.forEach(result => {
      console.log(`  ${result.url}`);
      console.log(`    File: ${result.file}:${result.line}`);
      console.log(`    Status: ${result.statusCode || 'Unknown'}`);
      console.log('');
    });
  }

  if (timeouts.length > 0) {
    console.log('\n⏱️  TIMEOUTS:');
    console.log('-'.repeat(30));
    timeouts.forEach(result => {
      console.log(`  ${result.url}`);
      console.log(`    File: ${result.file}:${result.line}`);
      console.log('');
    });
  }

  if (errors.length > 0) {
    console.log('\n💥 ERRORS:');
    console.log('-'.repeat(30));
    errors.forEach(result => {
      console.log(`  ${result.url}`);
      console.log(`    File: ${result.file}:${result.line}`);
      console.log(`    Error: ${result.error}`);
      console.log('');
    });
  }

  if (valid.length > 0 && broken.length === 0) {
    console.log('\n🎉 All checked links are valid!');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const options: LinkCheckOptions = {
    timeout: 10000,
    excludePatterns: DEFAULT_EXCLUDE_PATTERNS
  };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--timeout':
        options.timeout = parseInt(args[++i]) || 10000;
        break;
      case '--include-localhost':
        options.includeLocalhost = true;
        break;
      case '--help':
        console.log('Usage: bun run link-checker.ts [options]');
        console.log('');
        console.log('Options:');
        console.log('  --timeout <ms>       Request timeout (default: 10000)');
        console.log('  --include-localhost  Include localhost URLs in check');
        console.log('  --help               Show this help');
        console.log('');
        console.log('Excludes by default:');
        console.log('  - Localhost/private IPs');
        console.log('  - Example.com domains');
        console.log('  - Wildcard patterns');
        return;
    }
  }

  try {
    const pendingResults = await scanDirectory(process.cwd(), options);
    const results = await checkLinks(pendingResults, options);
    printResults(results);

    // Exit with error code if broken links found
    if (results.some(r => r.status === 'broken')) {
      process.exit(1);
    }

  } catch (error) {
    console.error('Error during link checking:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}

export { checkUrl, extractUrlsFromFile, scanDirectory, checkLinks };