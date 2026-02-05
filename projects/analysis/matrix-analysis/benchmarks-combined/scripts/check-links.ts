#!/usr/bin/env bun
/**
 * Broken Link Checker
 *
 * Scans documentation for broken links and stale href pointers
 */

import { readdir, readFile, stat } from 'fs/promises';
import { join, relative, extname } from 'path';
import { lookup } from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(lookup);

interface LinkCheckResult {
  file: string;
  line: number;
  type: 'internal' | 'external' | 'anchor';
  link: string;
  status: 'ok' | 'broken' | 'warning';
  error?: string;
}

interface LinkStats {
  total: number;
  broken: number;
  warnings: number;
  byType: Record<string, number>;
}

class LinkChecker {
  private results: LinkCheckResult[] = [];
  private rootDir: string;
  private verbose: boolean;
  private checkExternal: boolean;

  constructor(rootDir: string = '.', verbose: boolean = false, checkExternal: boolean = false) {
    this.rootDir = rootDir;
    this.verbose = verbose;
    this.checkExternal = checkExternal;
  }

  async checkDirectory(dir: string = this.rootDir): Promise<void> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        // Skip system directories that might cause permission issues
        if (entry.isDirectory() &&
            (entry.name.startsWith('.') ||
             entry.name === 'node_modules' ||
             entry.name === 'Music' ||
             entry.name === 'Movies' ||
             entry.name === 'Pictures' ||
             entry.name === 'Library' ||
             entry.name === 'Applications')) {
          continue;
        }

        if (entry.isDirectory()) {
          await this.checkDirectory(fullPath);
        } else if (entry.isFile() && this.isDocFile(entry.name)) {
          await this.checkFile(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
      if (error instanceof Error && error.message.includes('EPERM')) {
        if (this.verbose) {
          console.warn(`Warning: Skipping directory due to permissions: ${dir}`);
        }
        return;
      }
      throw error;
    }
  }

  private isDocFile(filename: string): boolean {
    const ext = extname(filename).toLowerCase();
    return ['.md', '.mdx', '.txt'].includes(ext);
  }

  private async checkFile(filePath: string): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      // Check for markdown links [text](url)
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;

        // Find all markdown links
        const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
        let match;

        while ((match = linkRegex.exec(line)) !== null) {
          const link = match[2];
          await this.checkLink(filePath, lineNumber, link);
        }

        // Check for HTML href attributes
        const hrefRegex = /href="([^"]+)"/g;
        while ((match = hrefRegex.exec(line)) !== null) {
          const link = match[1];
          await this.checkLink(filePath, lineNumber, link);
        }

        // Check for reference links [text]: url
        const refRegex = /^\s*\[([^\]]+)\]:\s*(.+)$/gm;
        while ((match = refRegex.exec(line)) !== null) {
          const link = match[2].trim();
          await this.checkLink(filePath, lineNumber, link);
        }
      }
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
    }
  }

  private async checkLink(filePath: string, lineNumber: number, link: string): Promise<void> {
    const relativePath = relative(this.rootDir, filePath);

    // Skip special links
    if (link.startsWith('#') || link.startsWith('mailto:') || link.startsWith('tel:')) {
      return;
    }

    // Check anchor links
    if (link.includes('#')) {
      const [url, anchor] = link.split('#');
      if (!url && anchor) {
        // Internal anchor
        await this.checkInternalAnchor(filePath, lineNumber, anchor);
        return;
      }
    }

    // Check internal links
    if (link.startsWith('./') || link.startsWith('../') || link.startsWith('/')) {
      await this.checkInternalLink(filePath, lineNumber, link);
      return;
    }

    // Check external links
    if (link.startsWith('http://') || link.startsWith('https://')) {
      if (this.checkExternal) {
        await this.checkExternalLink(filePath, lineNumber, link);
      } else {
        this.results.push({
          file: relativePath,
          line: lineNumber,
          type: 'external',
          link,
          status: 'warning',
          error: 'External link checking disabled'
        });
      }
      return;
    }

    // Check file references
    if (!link.includes('://') && !link.startsWith('#')) {
      await this.checkFileReference(filePath, lineNumber, link);
    }
  }

  private async checkInternalLink(filePath: string, lineNumber: number, link: string): Promise<void> {
    const relativePath = relative(this.rootDir, filePath);
    let targetPath: string;

    if (link.startsWith('/')) {
      // Absolute path from root
      targetPath = join(this.rootDir, link.slice(1));
    } else {
      // Relative path
      targetPath = join(filePath, '..', link);
    }

    try {
      const stats = await stat(targetPath);
      if (stats.isDirectory()) {
        // Check for index.md or README.md
        const indexPath = join(targetPath, 'index.md');
        const readmePath = join(targetPath, 'README.md');

        try {
          await stat(indexPath);
          this.results.push({
            file: relativePath,
            line: lineNumber,
            type: 'internal',
            link,
            status: 'ok'
          });
        } catch {
          try {
            await stat(readmePath);
            this.results.push({
              file: relativePath,
              line: lineNumber,
              type: 'internal',
              link,
              status: 'ok'
            });
          } catch {
            this.results.push({
              file: relativePath,
              line: lineNumber,
              type: 'internal',
              link,
              status: 'warning',
              error: 'Directory exists but no index.md or README.md found'
            });
          }
        }
      } else {
        this.results.push({
          file: relativePath,
          line: lineNumber,
          type: 'internal',
          link,
          status: 'ok'
        });
      }
    } catch (error) {
      this.results.push({
        file: relativePath,
        line: lineNumber,
        type: 'internal',
        link,
        status: 'broken',
        error: 'File or directory not found'
      });
    }
  }

  private async checkInternalAnchor(filePath: string, lineNumber: number, anchor: string): Promise<void> {
    const relativePath = relative(this.rootDir, filePath);

    try {
      const content = await readFile(filePath, 'utf-8');

      // Look for heading anchors
      const headingRegex = new RegExp(`^#{1,6}\\s+.*${anchor.replace(/[-_]/g, '[-_]')}.*`, 'im');
      if (headingRegex.test(content)) {
        this.results.push({
          file: relativePath,
          line: lineNumber,
          type: 'anchor',
          link: `#${anchor}`,
          status: 'ok'
        });
        return;
      }

      // Look for custom anchors
      const customAnchorRegex = new RegExp(`{#${anchor}}`, 'i');
      if (customAnchorRegex.test(content)) {
        this.results.push({
          file: relativePath,
          line: lineNumber,
          type: 'anchor',
          link: `#${anchor}`,
          status: 'ok'
        });
        return;
      }

      this.results.push({
        file: relativePath,
        line: lineNumber,
        type: 'anchor',
        link: `#${anchor}`,
        status: 'broken',
        error: 'Anchor not found'
      });
    } catch (error) {
      this.results.push({
        file: relativePath,
        line: lineNumber,
        type: 'anchor',
        link: `#${anchor}`,
        status: 'broken',
        error: 'Could not read file to check anchor'
      });
    }
  }

  private async checkExternalLink(filePath: string, lineNumber: number, link: string): Promise<void> {
    const relativePath = relative(this.rootDir, filePath);

    try {
      // Extract hostname from URL
      const url = new URL(link);

      // Check DNS resolution
      await dnsLookup(url.hostname);

      // Note: We don't actually fetch the URL to avoid rate limits
      // In a real implementation, you might want to use fetch with timeout
      this.results.push({
        file: relativePath,
        line: lineNumber,
        type: 'external',
        link,
        status: 'ok'
      });
    } catch (error) {
      this.results.push({
        file: relativePath,
        line: lineNumber,
        type: 'external',
        link,
        status: 'broken',
        error: error instanceof Error ? error.message : 'DNS lookup failed'
      });
    }
  }

  private async checkFileReference(filePath: string, lineNumber: number, link: string): Promise<void> {
    const relativePath = relative(this.rootDir, filePath);
    const targetPath = join(filePath, '..', link);

    try {
      await stat(targetPath);
      this.results.push({
        file: relativePath,
        line: lineNumber,
        type: 'internal',
        link,
        status: 'ok'
      });
    } catch (error) {
      this.results.push({
        file: relativePath,
        line: lineNumber,
        type: 'internal',
        link,
        status: 'broken',
        error: 'File reference not found'
      });
    }
  }

  getStats(): LinkStats {
    const stats: LinkStats = {
      total: this.results.length,
      broken: 0,
      warnings: 0,
      byType: {}
    };

    for (const result of this.results) {
      stats.byType[result.type] = (stats.byType[result.type] || 0) + 1;

      if (result.status === 'broken') {
        stats.broken++;
      } else if (result.status === 'warning') {
        stats.warnings++;
      }
    }

    return stats;
  }

  printResults(): void {
    const stats = this.getStats();

    console.log('\n🔗 Link Check Results');
    console.log('==================');
    console.log(`Total links checked: ${stats.total}`);
    console.log(`✅ OK: ${stats.total - stats.broken - stats.warnings}`);
    console.log(`⚠️  Warnings: ${stats.warnings}`);
    console.log(`❌ Broken: ${stats.broken}`);

    console.log('\n📊 By Type:');
    for (const [type, count] of Object.entries(stats.byType)) {
      console.log(`  ${type}: ${count}`);
    }

    if (this.verbose || stats.broken > 0 || stats.warnings > 0) {
      console.log('\n📋 Detailed Results:');
      console.log('-------------------');

      const broken = this.results.filter(r => r.status === 'broken');
      const warnings = this.results.filter(r => r.status === 'warning');

      if (broken.length > 0) {
        console.log('\n❌ Broken Links:');
        for (const result of broken) {
          console.log(`  ${result.file}:${result.line} - ${result.link}`);
          if (result.error) {
            console.log(`    Error: ${result.error}`);
          }
        }
      }

      if (warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        for (const result of warnings) {
          console.log(`  ${result.file}:${result.line} - ${result.link}`);
          if (result.error) {
            console.log(`    Warning: ${result.error}`);
          }
        }
      }
    }

    // Exit with error code if broken links found
    if (stats.broken > 0) {
      process.exit(1);
    }
  }

  async exportResults(format: 'json' | 'csv' = 'json'): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `link-check-results-${timestamp}.${format}`;

    if (format === 'json') {
      await Bun.write(filename, JSON.stringify({
        timestamp: new Date().toISOString(),
        stats: this.getStats(),
        results: this.results
      }, null, 2));
    } else {
      const csv = [
        'File,Line,Type,Link,Status,Error',
        ...this.results.map(r =>
          `"${r.file}",${r.line},"${r.type}","${r.link}","${r.status}","${r.error || ''}"`
        )
      ].join('\n');

      await Bun.write(filename, csv);
    }

    console.log(`\n📄 Results exported to: ${filename}`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  let dir = '.';
  let verbose = false;
  let checkExternal = false;
  let exportFormat: 'json' | 'csv' | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    } else if (arg === '--external' || arg === '-e') {
      checkExternal = true;
    } else if (arg === '--export' || arg === '-x') {
      exportFormat = args[++i] as 'json' | 'csv';
    } else if (!arg.startsWith('-')) {
      dir = arg;
    }
  }

  console.log(`🔍 Checking links in: ${dir}`);
  if (checkExternal) {
    console.log('🌐 External link checking enabled');
  }

  const checker = new LinkChecker(dir, verbose, checkExternal);
  await checker.checkDirectory();
  checker.printResults();

  if (exportFormat) {
    await checker.exportResults(exportFormat);
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}

export { LinkChecker, LinkCheckResult, LinkStats };
