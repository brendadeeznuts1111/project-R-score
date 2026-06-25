#!/usr/bin/env bun

/**
 * Bun.file().exists() Examples
 *
 * Demonstrates checking file existence using Bun.file().exists()
 *
 * Reference: https://bun.sh/docs/api/file-io
 */

/**
 * Example 1: Basic file existence check
 */
async function example1_BasicExists() {
  console.info('=== Example 1: Basic File Existence Check ===\n');

  const files = [
    './package.json',
    './README.md',
    './nonexistent-file.txt',
    './tsconfig.json',
  ];

  for (const path of files) {
    const file = Bun.file(path);
    const exists = await file.exists();

    console.info(`File: ${path}`);
    console.info(`  Exists: ${exists ? '✅ Yes' : '❌ No'}`);
    console.info();
  }
}

/**
 * Example 2: Safe file reading with existence check
 */
async function example2_SafeFileReading() {
  console.info('=== Example 2: Safe File Reading ===\n');

  async function safeReadFile(path: string): Promise<string | null> {
    const file = Bun.file(path);

    if (!(await file.exists())) {
      return null; // File doesn't exist
    }

    return await file.text();
  }

  const paths = ['./package.json', './nonexistent.txt'];

  for (const path of paths) {
    const content = await safeReadFile(path);
    if (content === null) {
      console.info(`${path}: File not found`);
    } else {
      console.info(`${path}: Found (${content.length} characters)`);
    }
  }
  console.info();
}

/**
 * Example 3: Batch existence checking
 */
async function example3_BatchExistenceCheck() {
  console.info('=== Example 3: Batch Existence Checking ===\n');

  async function checkMultipleFiles(paths: string[]): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    // Check all files in parallel
    const checks = await Promise.all(
      paths.map(async (path) => {
        const file = Bun.file(path);
        const exists = await file.exists();
        return { path, exists };
      })
    );

    for (const { path, exists } of checks) {
      results[path] = exists;
    }

    return results;
  }

  const paths = [
    './package.json',
    './README.md',
    './tsconfig.json',
    './nonexistent-1.txt',
    './nonexistent-2.txt',
  ];

  const results = await checkMultipleFiles(paths);

  console.info('Batch check results:');
  for (const [path, exists] of Object.entries(results)) {
    console.info(`  ${exists ? '✅' : '❌'} ${path}`);
  }
  console.info();
}

/**
 * Example 4: File existence with size check
 */
async function example4_ExistsWithSize() {
  console.info('=== Example 4: Existence with Size Check ===\n');

  async function getFileInfo(path: string): Promise<{
    exists: boolean;
    size?: number;
    type?: string;
  }> {
    const file = Bun.file(path);
    const exists = await file.exists();

    if (!exists) {
      return { exists: false };
    }

    return {
      exists: true,
      size: file.size,
      type: file.type || undefined,
    };
  }

  const paths = ['./package.json', './README.md', './nonexistent.txt'];

  for (const path of paths) {
    const info = await getFileInfo(path);
    console.info(`${path}:`);
    console.info(`  Exists: ${info.exists ? '✅' : '❌'}`);
    if (info.exists) {
      console.info(`  Size: ${info.size} bytes`);
      console.info(`  Type: ${info.type || 'unknown'}`);
    }
    console.info();
  }
}

/**
 * Example 5: Conditional file operations
 */
async function example5_ConditionalOperations() {
  console.info('=== Example 5: Conditional File Operations ===\n');

  const configPath = './config.json';
  const file = Bun.file(configPath);

  if (await file.exists()) {
    console.info(`✅ Config file exists, reading...`);
    const config = await file.json();
    console.info(`  Config loaded: ${Object.keys(config).length} keys`);
  } else {
    console.info(`❌ Config file not found, creating default...`);
    const defaultConfig = { version: '1.0.0', settings: {} };
    await Bun.write(configPath, JSON.stringify(defaultConfig, null, 2));
    console.info(`  Default config created`);
  }
  console.info();
}

/**
 * Example 6: File existence validation helper
 */
class FileValidator {
  /**
   * Validate that required files exist
   */
  async validateRequired(files: string[]): Promise<{
    allExist: boolean;
    missing: string[];
    existing: string[];
  }> {
    const checks = await Promise.all(
      files.map(async (path) => {
        const file = Bun.file(path);
        const exists = await file.exists();
        return { path, exists };
      })
    );

    const existing = checks.filter(c => c.exists).map(c => c.path);
    const missing = checks.filter(c => !c.exists).map(c => c.path);

    return {
      allExist: missing.length === 0,
      missing,
      existing,
    };
  }

  /**
   * Check if at least one file exists
   */
  async anyExists(files: string[]): Promise<{ found: string | null; exists: boolean }> {
    for (const path of files) {
      const file = Bun.file(path);
      if (await file.exists()) {
        return { found: path, exists: true };
      }
    }
    return { found: null, exists: false };
  }
}

async function example6_FileValidator() {
  console.info('=== Example 6: File Validator Helper ===\n');

  const validator = new FileValidator();

  // Validate required files
  const required = ['./package.json', './README.md', './missing.txt'];
  const validation = await validator.validateRequired(required);

  console.info('Required files validation:');
  console.info(`  All exist: ${validation.allExist ? '✅' : '❌'}`);
  console.info(`  Existing: ${validation.existing.join(', ')}`);
  console.info(`  Missing: ${validation.missing.join(', ') || 'none'}`);
  console.info();

  // Check if any exists
  const alternatives = ['./package.json', './alternative.json', './backup.json'];
  const any = await validator.anyExists(alternatives);
  console.info('Any file exists:');
  console.info(`  Found: ${any.found || 'none'}`);
  console.info(`  Exists: ${any.exists ? '✅' : '❌'}`);
  console.info();
}

/**
 * Example 7: File existence caching
 */
class FileExistenceCache {
  private cache = new Map<string, { exists: boolean; timestamp: number }>();
  private ttl: number;

  constructor(ttl: number = 5000) {
    this.ttl = ttl;
  }

  async exists(path: string, useCache: boolean = true): Promise<boolean> {
    if (useCache) {
      const cached = this.cache.get(path);
      if (cached && Date.now() - cached.timestamp < this.ttl) {
        return cached.exists;
      }
    }

    const file = Bun.file(path);
    const exists = await file.exists();

    this.cache.set(path, { exists, timestamp: Date.now() });

    return exists;
  }

  clear(): void {
    this.cache.clear();
  }
}

async function example7_CachedExists() {
  console.info('=== Example 7: Cached Existence Checks ===\n');

  const cache = new FileExistenceCache(1000); // 1 second TTL

  const path = './package.json';

  console.info('First check (uncached):');
  const start1 = Date.now();
  const exists1 = await cache.exists(path, false);
  const time1 = Date.now() - start1;
  console.info(`  Exists: ${exists1}, Time: ${time1}ms`);

  console.info('\nSecond check (cached):');
  const start2 = Date.now();
  const exists2 = await cache.exists(path, true);
  const time2 = Date.now() - start2;
  console.info(`  Exists: ${exists2}, Time: ${time2}ms`);
  console.info(`  Speedup: ${(time1 / time2).toFixed(1)}x faster`);
  console.info();
}

/**
 * Example 8: File existence with error handling
 */
async function example8_ErrorHandling() {
  console.info('=== Example 8: Error Handling ===\n');

  async function safeExists(path: string): Promise<{ exists: boolean; error?: string }> {
    try {
      const file = Bun.file(path);
      const exists = await file.exists();
      return { exists };
    } catch (error) {
      return {
        exists: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const paths = ['./package.json', '/invalid/path/../../etc/passwd', './README.md'];

  for (const path of paths) {
    const result = await safeExists(path);
    console.info(`${path}:`);
    console.info(`  Exists: ${result.exists ? '✅' : '❌'}`);
    if (result.error) {
      console.info(`  Error: ${result.error}`);
    }
    console.info();
  }
}

// Run all examples
async function main() {
  try {
    await example1_BasicExists();
    await example2_SafeFileReading();
    await example3_BatchExistenceCheck();
    await example4_ExistsWithSize();
    await example5_ConditionalOperations();
    await example6_FileValidator();
    await example7_CachedExists();
    await example8_ErrorHandling();

    console.info('✅ All examples completed!');
    console.info('\n💡 Key Points:');
    console.info('  • file.exists() returns a Promise<boolean>');
    console.info('  • Use for safe file operations before reading');
    console.info('  • Can be used in conditional logic');
    console.info('  • Consider caching for performance in loops');
    console.info('  • Always handle errors gracefully');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();

