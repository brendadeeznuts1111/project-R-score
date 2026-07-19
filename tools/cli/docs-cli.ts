#!/usr/bin/env bun
import { EnhancedDocsFetcher } from '../../lib/docs/index-fetcher-enhanced';
import { ChromeAppManager } from '../../lib/cli/chrome-integration';
import { InteractiveDocsExplorer } from '../../lib/docs/interactive-docs';

class EnhancedDocsCLI {
  private fetcher: EnhancedDocsFetcher;
  private chromeManager: ChromeAppManager;
  private interactive: InteractiveDocsExplorer;

  constructor() {
    this.fetcher = new EnhancedDocsFetcher({
      ttl: 6 * 60 * 60 * 1000, // 6 hours
      offlineMode: false,
    });

    this.chromeManager = new ChromeAppManager({
      appName: 'Bun Documentation',
      appUrl: 'https://bun.com/docs',
    });

    this.interactive = new InteractiveDocsExplorer({
      maxResults: 15,
      showCategories: true,
      liveSearch: true,
      autoOpen: true,
      theme: 'auto',
    });
  }

  async handleCommand(args: string[]) {
    const command = args[0];

    switch (command) {
      case 'search':
        await this.search(args.slice(1));
        break;

      case 'open':
        await this.open(args.slice(1));
        break;

      case 'interactive':
      case 'i':
        await this.interactiveMode(args.slice(1));
        break;

      case 'index':
        await this.updateIndex();
        break;

      case 'cache':
        await this.cacheInfo();
        break;

      case 'clear-cache':
        await this.clearCache();
        break;

      case 'app':
        await this.createChromeApp(args.slice(1));
        break;

      case 'categories':
        await this.showCategories(args.slice(1));
        break;

      case 'recent':
        await this.showRecent();
        break;

      case 'stats':
        await this.showStats();
        break;

      default:
        this.showHelp();
        break;
    }
  }

  private async search(queries: string[]) {
    const query = queries.join(' ');
    const domain = queries.includes('--sh') ? 'sh' : 'com';

    const results = await this.fetcher.search(query, domain);

    if (results.length === 0) {
      console.info('No results found');
      return;
    }

    console.info(`Found ${results.length} results:\n`);

    results.forEach((result, i) => {
      console.info(`${i + 1}. ${result.topic}`);
      console.info(`   APIs: ${result.apis.join(', ')}`);
      console.info(`   Category: ${result.category}`);
      console.info(`   bun.sh: ${result.domains.sh}`);
      console.info(`   bun.com: ${result.domains.com}`);
      console.info();
    });
  }

  private async open(queries: string[]) {
    const query = queries.filter(q => !q.startsWith('--')).join(' ');
    const domain = queries.includes('--sh') ? 'sh' : 'com';
    const appMode = queries.includes('--app');

    await this.chromeManager.openDocs(query, domain, appMode);
  }

  private async updateIndex() {
    console.info('Updating documentation index...');
    await this.fetcher.updateFallbackData();
    console.info('✅ Index updated');
  }

  private async cacheInfo() {
    const stats = (this.fetcher as any).cache.getStats();
    console.info('📊 Enhanced Cache Statistics');
    console.info('='.repeat(35));
    console.info(`📦 Entries: ${stats.entries}/${stats.maxEntries}`);
    console.info(`💾 Total Size: ${stats.totalSize}`);
    console.info(`📏 Avg Size: ${stats.avgSize}`);
    console.info(`⏰ TTL: ${stats.ttl}`);
    console.info(`🌐 Offline Mode: ${stats.offlineMode}`);
    console.info(`🗜️  Compression: ${stats.compression}`);
    console.info(`🎯 Priority: ${stats.priority}`);
    console.info(`📁 Directory: ${stats.cacheDir}`);
    console.info();

    const accessStats = stats.accessStats;
    console.info('🔍 Access Statistics:');
    console.info(`   Total Requests: ${accessStats.totalRequests}`);
    console.info(`   Cache Hits: ${accessStats.cacheHits}`);
    console.info(`   Cache Misses: ${accessStats.cacheMisses}`);
    console.info(`   Hit Rate: ${accessStats.hitRate}`);
  }

  private async interactiveMode(args: string[]) {
    const query = args.join(' ');
    const domain = args.includes('--sh') ? 'sh' : 'com';

    await this.interactive.interactiveSearch(query, domain);
  }

  private async clearCache() {
    this.fetcher.cache.clear();
    console.info('✅ Cache cleared successfully');
  }

  private async showCategories(args: string[]) {
    const domain = args.includes('--sh') ? 'sh' : 'com';
    await this.interactive.showCategories(domain);
  }

  private async showRecent() {
    await this.interactive.showRecent();
  }

  private async showStats() {
    try {
      const cacheStats = (this.fetcher as any).cache.getStats();
      const recentCount = ((await (this.fetcher as any).cache.get<any[]>('recent_searches')) || [])
        .length;

      console.info('📊 Documentation System Statistics');
      console.info('='.repeat(40));
      console.info(`📦 Entries: ${cacheStats.entries}/${cacheStats.maxEntries}`);
      console.info(`💾 Total Size: ${cacheStats.totalSize}`);
      console.info(`📏 Avg Size: ${cacheStats.avgSize}`);
      console.info(`⏰ TTL: ${cacheStats.ttl}`);
      console.info(`🌐 Offline Mode: ${cacheStats.offlineMode}`);
      console.info(`🗜️  Compression: ${cacheStats.compression}`);
      console.info(`🎯 Priority: ${cacheStats.priority}`);
      console.info(`🕒 Recent Searches: ${recentCount}`);

      const accessStats = cacheStats.accessStats;
      console.info(
        `🔍 Access Stats: ${accessStats.hitRate} hit rate (${accessStats.totalRequests} requests)`
      );

      console.info(`🔍 Total API Count: ${(await this.fetcher.fetchIndex('com')).length}`);
    } catch (error) {
      console.info('❌ Error getting stats:', error.message);
      // Fallback basic stats
      console.info('📊 Basic Statistics');
      console.info('='.repeat(20));
      console.info(`🔍 Total API Count: ${(await this.fetcher.fetchIndex('com')).length}`);
    }
  }

  private async createChromeApp(args: string[]) {
    const domain = args.includes('--sh') ? 'sh' : 'com';
    const result = await this.chromeManager.createApp(domain);
    console.info(result.message);
  }

  private showHelp() {
    console.info(`
🎯 Enhanced Bun Documentation CLI v2.0
Usage: bun docs <command> [options]

Core Commands:
  search <query> [--sh]      Search documentation
  open <query> [--sh] [--app] Open docs in Chrome (optionally as app)
  interactive [query]        Interactive search with selection menu
  categories [--sh]          Browse documentation by category
  recent                     Show recently accessed documentation

Management Commands:
  index                      Update local index cache
  cache                      Show cache statistics
  clear-cache               Clear all cached data
  stats                     Show comprehensive system statistics
  app [--sh]                Create Chrome app for docs

Shortcuts:
  i                         Alias for interactive mode

Examples:
  bun docs search "http server"
  bun docs open semver --app
  bun docs interactive yaml
  bun docs categories
  bun docs recent
  bun docs stats
  bun docs index

Interactive Mode:
  • Type queries to search (e.g., "buffer", "http", "yaml")
  • Type "categories" to browse by category
  • Type "recent" to see recent searches
  • Type "help" for interactive help
  • Use numbers to select results
  • Press 'q' to quit

Tips:
  • Add --sh flag for bun.sh domain (default: bun.com)
  • Use --app flag with open for Chrome app mode
  • Cache survives restarts for offline usage
    `);
  }
}

// Main execution
const cli = new EnhancedDocsCLI();
await cli.handleCommand(process.argv.slice(2));
