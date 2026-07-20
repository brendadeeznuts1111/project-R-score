#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file, Bun.write
// @see https://bun.com/docs/runtime/glob — Bun.Glob
/**
 * 🔧 Replace example.com URLs with example.com
 *
 * Changes all example.com URLs to use example.com for better portability
 */

import { join } from 'path';
import { readTextSync, writeText, listFilesSync, dirExistsSync } from './lib/fs-bun';

class LocalhostToExampleConverter {
  private readonly sourceDirectories = ['lib', 'services', 'scripts', 'docs', 'tools'];
  private readonly fileGlob = '**/*.{ts,js,md,json}';

  async convertAll(): Promise<void> {
    console.info('🔄 Converting example.com URLs to example.com...\n');

    let totalFiles = 0;
    let totalReplacements = 0;

    for (const dir of this.sourceDirectories) {
      if (!dirExistsSync(dir)) continue;
      const { fileCount, replacements } = await this.convertDirectory(dir);
      totalFiles += fileCount;
      totalReplacements += replacements;
    }

    console.info(`\n🎯 Conversion Summary:`);
    console.info(`   Files processed: ${totalFiles}`);
    console.info(`   Replacements made: ${totalReplacements}`);

    if (totalReplacements > 0) {
      console.info('\n✅ Successfully converted example.com URLs to example.com');
      console.info('💡 Next steps:');
      console.info('1. Run "bun run url:check" to verify changes');
      console.info('2. Test the updated files');
      console.info('3. Commit the changes');
    } else {
      console.info('\nℹ️  No example.com URLs found to convert');
    }
  }

  private async convertDirectory(
    dir: string
  ): Promise<{ fileCount: number; replacements: number }> {
    let fileCount = 0;
    let replacements = 0;

    for (const rel of listFilesSync(this.fileGlob, { cwd: dir })) {
      const fullPath = join(dir, rel);
      const fileReplacements = await this.convertFile(fullPath);
      if (fileReplacements > 0) {
        console.info(`  ✅ ${fullPath}: ${fileReplacements} replacements`);
        replacements += fileReplacements;
      }
      fileCount++;
    }

    return { fileCount, replacements };
  }

  private async convertFile(filePath: string): Promise<number> {
    try {
      let content = readTextSync(filePath);
      const originalContent = content;

      const replacements = [
        {
          pattern: /http:\/\/example.com:[0-9]+/g,
          replacement: 'http://example.com',
        },
        {
          pattern: /https:\/\/example.com:[0-9]+/g,
          replacement: 'https://example.com',
        },
        {
          pattern: /\blocalhost\b/g,
          replacement: 'example.com',
        },
        {
          pattern: /http:\/\/127\.0\.0\.1:[0-9]+/g,
          replacement: 'http://example.com',
        },
        {
          pattern: /https:\/\/127\.0\.0\.1:[0-9]+/g,
          replacement: 'https://example.com',
        },
      ];

      let totalReplacements = 0;

      for (const { pattern, replacement } of replacements) {
        const matches = content.match(pattern);
        if (matches) {
          content = content.replace(pattern, replacement);
          totalReplacements += matches.length;
        }
      }

      if (content !== originalContent) {
        // Bun.write is async; createPath defaults true (bun-types)
        await writeText(filePath, content);
      }

      return totalReplacements;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️  Could not process ${filePath}: ${message}`);
      return 0;
    }
  }
}

async function main(): Promise<void> {
  const command = process.argv[2];
  const converter = new LocalhostToExampleConverter();

  switch (command) {
    case 'convert':
    case undefined:
    case '':
      console.info('🔄 Localhost to Example.com Converter\n');
      await converter.convertAll();
      break;

    case 'help':
    case '--help':
    case '-h':
      console.info(`
🔄 Localhost to Example.com Converter

USAGE:
  bun run scripts/localhost-to-example.ts [command]

COMMANDS:
  convert     Convert all example.com URLs to example.com (default)
  help        Show this help message
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
