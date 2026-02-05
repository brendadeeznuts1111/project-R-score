#!/usr/bin/env bun
// [DUOPLUS][CLOUDFLARE][TS][META:{cdn,cache,purge}][CDN][#REF:CF-PURGE-46][BUN:4.6]

import { CloudflareClient, DEFAULT_DOMAIN } from './cloudflare-api';
import { urlLink, fileLink } from './tty-hyperlink';

/**
 * Cloudflare Cache Invalidation v4.6
 *
 * Purge CDN cache by URL, prefix, tag, or everything.
 * Zone: factory-wager.com
 *
 * Use cases:
 * - Deploy new assets: purge specific files
 * - Major release: purge everything
 * - Feature flag change: purge by prefix
 */

interface PurgeOptions {
  all?: boolean;
  files?: string[];
  prefixes?: string[];
  tags?: string[];
  hosts?: string[];
}

interface PurgeResult {
  success: boolean;
  purgeId?: string;
  purgedCount?: number;
  message: string;
}

/**
 * Cache Purge Manager
 */
class CachePurgeManager {
  private client: CloudflareClient;
  private domain: string;

  constructor() {
    this.client = new CloudflareClient();
    this.domain = process.env.CF_DOMAIN || DEFAULT_DOMAIN;
  }

  /**
   * Purge all cached content
   */
  async purgeEverything(): Promise<PurgeResult> {
    console.log('🗑️  Purging all cached content...');
    console.log(`   Zone: ${this.domain}`);

    try {
      const result = await this.client.purgeEverything();
      return {
        success: true,
        purgeId: result.id,
        message: `Successfully purged all cache for ${this.domain}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to purge cache: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Purge specific files/URLs
   */
  async purgeFiles(files: string[]): Promise<PurgeResult> {
    console.log('🗑️  Purging specific files...');

    // Normalize URLs to full paths
    const normalizedFiles = files.map(file => {
      if (file.startsWith('http://') || file.startsWith('https://')) {
        return file;
      }
      // Add domain prefix
      const path = file.startsWith('/') ? file : `/${file}`;
      return `https://${this.domain}${path}`;
    });

    console.log(`   Files to purge:`);
    for (const file of normalizedFiles) {
      console.log(`   • ${file}`);
    }

    try {
      const result = await this.client.purgeCache(normalizedFiles);
      return {
        success: true,
        purgeId: result.id,
        purgedCount: normalizedFiles.length,
        message: `Successfully purged ${normalizedFiles.length} file(s)`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to purge files: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Purge by URL prefix
   */
  async purgePrefixes(prefixes: string[]): Promise<PurgeResult> {
    console.log('🗑️  Purging by prefixes...');

    // Normalize prefixes
    const normalizedPrefixes = prefixes.map(prefix => {
      if (prefix.startsWith('http://') || prefix.startsWith('https://')) {
        return prefix;
      }
      const path = prefix.startsWith('/') ? prefix : `/${prefix}`;
      return `https://${this.domain}${path}`;
    });

    console.log(`   Prefixes to purge:`);
    for (const prefix of normalizedPrefixes) {
      console.log(`   • ${prefix}*`);
    }

    try {
      const result = await this.client.purgeCacheByPrefixes(normalizedPrefixes);
      return {
        success: true,
        purgeId: result.id,
        purgedCount: normalizedPrefixes.length,
        message: `Successfully purged ${normalizedPrefixes.length} prefix(es)`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to purge prefixes: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Purge by cache tags (Enterprise only)
   */
  async purgeTags(tags: string[]): Promise<PurgeResult> {
    console.log('🗑️  Purging by cache tags (Enterprise feature)...');
    console.log(`   Tags: ${tags.join(', ')}`);

    try {
      const result = await this.client.purgeCacheByTags(tags);
      return {
        success: true,
        purgeId: result.id,
        purgedCount: tags.length,
        message: `Successfully purged ${tags.length} tag(s)`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to purge tags: ${(error as Error).message}. Note: Cache-Tag purge requires Enterprise plan.`,
      };
    }
  }

  /**
   * Smart purge based on file patterns
   */
  async smartPurge(pattern: string): Promise<PurgeResult> {
    console.log(`🧠 Smart purge: ${pattern}`);

    // Common patterns
    const patterns: Record<string, string[]> = {
      'assets': ['/assets/', '/static/', '/dist/'],
      'js': ['/assets/js/', '/*.js'],
      'css': ['/assets/css/', '/*.css'],
      'images': ['/assets/images/', '/images/', '/*.png', '/*.jpg', '/*.webp'],
      'api': ['/api/'],
      'html': ['/*.html', '/'],
    };

    const prefixes = patterns[pattern];
    if (!prefixes) {
      return {
        success: false,
        message: `Unknown pattern: ${pattern}. Available: ${Object.keys(patterns).join(', ')}`,
      };
    }

    return this.purgePrefixes(prefixes);
  }

  /**
   * Display purge status
   */
  displayResult(result: PurgeResult): void {
    console.log('\n' + '═'.repeat(50));
    if (result.success) {
      console.log('✅ ' + result.message);
      if (result.purgeId) {
        console.log(`   Purge ID: ${result.purgeId}`);
      }
      if (result.purgedCount) {
        console.log(`   Items purged: ${result.purgedCount}`);
      }
    } else {
      console.log('❌ ' + result.message);
    }
    console.log('═'.repeat(50));

    // Dashboard link
    const dashboardUrl = this.client.getDashboardUrl();
    console.log(`\n📊 Dashboard: ${urlLink(dashboardUrl + '/caching/configuration', 'Cloudflare Caching')}`);
  }
}

// ═══════════════════════════════════════════════════════════
// CLI INTERFACE
// ═══════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Check for API token
  if (!process.env.CF_API_TOKEN && command !== '--help' && command !== '-h') {
    console.log('⚠️  CF_API_TOKEN environment variable is required');
    console.log(`   Get your token: ${urlLink('https://dash.cloudflare.com/profile/api-tokens', 'Cloudflare API Tokens')}`);
    process.exit(1);
  }

  const manager = command !== '--help' && command !== '-h' ? new CachePurgeManager() : null;

  switch (command) {
    case '--all':
    case '-a':
      const allResult = await manager!.purgeEverything();
      manager!.displayResult(allResult);
      break;

    case '--files':
    case '-f':
      const files = args.slice(1);
      if (files.length === 0) {
        console.log('Usage: bun run cf:purge --files /path/to/file1.js /path/to/file2.css');
        process.exit(1);
      }
      const filesResult = await manager!.purgeFiles(files);
      manager!.displayResult(filesResult);
      break;

    case '--prefixes':
    case '-p':
      const prefixes = args.slice(1);
      if (prefixes.length === 0) {
        console.log('Usage: bun run cf:purge --prefixes /assets/ /api/');
        process.exit(1);
      }
      const prefixesResult = await manager!.purgePrefixes(prefixes);
      manager!.displayResult(prefixesResult);
      break;

    case '--tags':
    case '-t':
      const tags = args.slice(1);
      if (tags.length === 0) {
        console.log('Usage: bun run cf:purge --tags release-v1 feature-xyz');
        process.exit(1);
      }
      const tagsResult = await manager!.purgeTags(tags);
      manager!.displayResult(tagsResult);
      break;

    case '--smart':
    case '-s':
      const pattern = args[1];
      if (!pattern) {
        console.log('Usage: bun run cf:purge --smart <pattern>');
        console.log('Patterns: assets, js, css, images, api, html');
        process.exit(1);
      }
      const smartResult = await manager!.smartPurge(pattern);
      manager!.displayResult(smartResult);
      break;

    case '--help':
    case '-h':
    default:
      console.log(`
🗑️  Cloudflare Cache Purge v4.6

Invalidate CDN cache for ${DEFAULT_DOMAIN}

Usage:
  bun run scripts/cf-cache-purge.ts --all                    # Purge everything
  bun run scripts/cf-cache-purge.ts --files <urls...>        # Purge specific files
  bun run scripts/cf-cache-purge.ts --prefixes <paths...>    # Purge by prefix
  bun run scripts/cf-cache-purge.ts --tags <tags...>         # Purge by tag (Enterprise)
  bun run scripts/cf-cache-purge.ts --smart <pattern>        # Smart purge by pattern

npm scripts:
  bun run cf:purge --all                                     # Purge everything
  bun run cf:purge --files /app.js /style.css                # Purge specific files
  bun run cf:purge --smart assets                            # Purge all assets

Smart Patterns:
  assets   - /assets/, /static/, /dist/
  js       - /assets/js/, /*.js
  css      - /assets/css/, /*.css
  images   - /assets/images/, /images/, /*.png, /*.jpg, /*.webp
  api      - /api/
  html     - /*.html, /

Examples:
  # After deploying new JavaScript
  CF_API_TOKEN=xxx bun run cf:purge --smart js

  # After major release
  CF_API_TOKEN=xxx bun run cf:purge --all

  # Specific files after hotfix
  CF_API_TOKEN=xxx bun run cf:purge --files /api/v1/users /app.bundle.js

Environment:
  CF_API_TOKEN   - Cloudflare API Token (required)
  CF_ZONE_ID     - Zone ID (optional, has default)
  CF_DOMAIN      - Domain (optional, default: ${DEFAULT_DOMAIN})

⚠️  Note: Cache-Tag purge (--tags) requires Cloudflare Enterprise plan.
      `);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { CachePurgeManager, PurgeOptions, PurgeResult };
