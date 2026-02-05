#!/usr/bin/env bun
// Console Statement Cleanup Script
// Removes console statements from production code while preserving test/debug files

import { readdirSync, statSync, readFileSync, writeFileSync } from "fs";
import { join, extname } from "path";

interface CleanupResult {
  filesProcessed: number;
  consoleStatementsRemoved: number;
  filesModified: number;
  errors: string[];
}

class ConsoleCleanup {
  private result: CleanupResult = {
    filesProcessed: 0,
    consoleStatementsRemoved: 0,
    filesModified: 0,
    errors: []
  };

  // Directories to include (production source code)
  private includeDirs = [
    'src/nexus',
    'src/finance',
    'src/dashboards',
    'src/admin',
    'src/config',
    'src/database',
    'src/price',
    'src/security',
    'src/types',
    'src/orchestrators',
    'src/pools'
  ];

  // Directories to exclude (tests, examples, utilities)
  private excludeDirs = [
    'tests',
    'examples',
    'utilities',
    'scripts',
    'bench',
    'monitoring',
    'demo-app',
    'shopping',
    'ai',
    'factory',
    'data',
    'backups',
    'databases',
    'reports',
    'wiki',
    'pages',
    'styles',
    'components',
    'workflows'
  ];

  // File extensions to process
  private targetExtensions = ['.ts', '.js'];

  /**
   * Check if a directory should be included
   */
  private shouldIncludeDir(dirPath: string): boolean {
    const relativePath = dirPath.replace('./', '');

    // Exclude specific directories
    for (const excludeDir of this.excludeDirs) {
      if (relativePath.startsWith(excludeDir) || relativePath.includes(`/${excludeDir}/`)) {
        return false;
      }
    }

    // Include specific production directories
    for (const includeDir of this.includeDirs) {
      if (relativePath.startsWith(includeDir) || relativePath.includes(`/${includeDir}/`)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a file should be processed
   */
  private shouldProcessFile(filePath: string): boolean {
    const ext = extname(filePath);
    return this.targetExtensions.includes(ext) && !filePath.includes('.test.') && !filePath.includes('.spec.');
  }

  /**
   * Remove console statements from a file
   */
  private cleanFile(filePath: string): { removed: number; modified: boolean } {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const originalLines = content.split('\n');
      let removedCount = 0;

      // Use regex to find and remove console statements
      // This pattern matches console. methods but avoids removing them if they're part of other code
      const consoleRegex = /^\s*console\.\w+\([^;]*\);\s*$/gm;

      let cleanedContent = content;
      const matches = content.match(consoleRegex);

      if (matches) {
        // Remove each console statement
        for (const match of matches) {
          cleanedContent = cleanedContent.replace(match, '');
          removedCount++;
        }

        // Clean up extra blank lines that might be left
        cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n/g, '\n\n');
        cleanedContent = cleanedContent.trim() + '\n';
      }

      if (removedCount > 0) {
        writeFileSync(filePath, cleanedContent, 'utf-8');
        console.log(`✅ ${filePath}: Removed ${removedCount} console statements`);
        return { removed: removedCount, modified: true };
      }

      return { removed: 0, modified: false };

    } catch (error) {
      this.result.errors.push(`Failed to process ${filePath}: ${error}`);
      return { removed: 0, modified: false };
    }
  }

  /**
   * Recursively process directories
   */
  private processDirectory(dirPath: string): void {
    try {
      const items = readdirSync(dirPath);

      for (const item of items) {
        const fullPath = join(dirPath, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          if (this.shouldIncludeDir(fullPath)) {
            this.processDirectory(fullPath);
          }
        } else if (stat.isFile() && this.shouldProcessFile(fullPath)) {
          this.result.filesProcessed++;

          const { removed, modified } = this.cleanFile(fullPath);
          this.result.consoleStatementsRemoved += removed;

          if (modified) {
            this.result.filesModified++;
          }
        }
      }
    } catch (error) {
      this.result.errors.push(`Failed to process directory ${dirPath}: ${error}`);
    }
  }

  /**
   * Run the cleanup process
   */
  async run(): Promise<CleanupResult> {
    console.log('🧹 Starting Console Statement Cleanup');
    console.log('📁 Target directories:', this.includeDirs.join(', '));
    console.log('🚫 Excluded directories:', this.excludeDirs.join(', '));
    console.log('');

    this.processDirectory('./src');

    console.log('');
    console.log('📊 Cleanup Results:');
    console.log(`   📁 Files processed: ${this.result.filesProcessed}`);
    console.log(`   🗑️ Console statements removed: ${this.result.consoleStatementsRemoved}`);
    console.log(`   ✏️ Files modified: ${this.result.filesModified}`);

    if (this.result.errors.length > 0) {
      console.log(`   ❌ Errors: ${this.result.errors.length}`);
      this.result.errors.forEach(error => console.log(`      - ${error}`));
    }

    console.log('');
    console.log('✅ Console cleanup completed!');

    return this.result;
  }
}

// Execute cleanup if run directly
if (import.meta.main) {
  const cleaner = new ConsoleCleanup();
  cleaner.run().catch(console.error);
}

export { ConsoleCleanup };