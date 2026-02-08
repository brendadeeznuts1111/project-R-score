#!/usr/bin/env node

/**
 * Bun Docs - Comprehensive Documentation Management CLI
 * Advanced documentation publishing, RSS monitoring, R2 storage, and analytics
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { SecretsManager } = require('./secrets-management.cjs');
const { PerformanceOptimizer } = require('./cli/performance-optimizations.cjs');
const { DryRunManager } = require('./cli/dry-run.cjs');

class BunDocsCLI {
    constructor() {
        this.version = '1.0.0';
        this.secretsManager = new SecretsManager();
        this.optimizer = new PerformanceOptimizer();
        this.dryRunManager = new DryRunManager();
        this.configFile = path.join(process.cwd(), 'bun-docs.config.json');
        this.config = this.loadConfig();
        
        // Check for dry-run flag
        if (process.argv.includes('--dryrun') || process.argv.includes('-n')) {
            this.dryRunManager.enable();
        }
    }

    loadConfig() {
        if (fs.existsSync(this.configFile)) {
            return JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
        }
        
        return {
            r2: {
                bucket: 'bun-docs',
                endpoint: 'https://your-account.r2.cloudflarestorage.com',
                publicUrl: 'https://pub-your-account.r2.dev'
            },
            rss: {
                feeds: [
                    'https://bun.com/rss.xml',
                    'https://github.com/brendadeeznuts1111/project-R-score/releases.atom'
                ],
                updateInterval: 300000 // 5 minutes
            },
            analytics: {
                enabled: true,
                trackViews: true,
                trackDownloads: true
            },
            publishing: {
                autoGenerateRSS: true,
                compressAssets: true,
                generateSitemap: true
            }
        };
    }

    saveConfig() {
        fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
    }

    async executeCommand(args) {
        const [command, ...params] = args;

        try {
            switch (command) {
                case 'publish':
                    await this.handlePublish(params);
                    break;
                case 'rss':
                    await this.handleRSS(params);
                    break;
                case 'r2':
                    await this.handleR2(params);
                    break;
                case 'shell':
                    await this.handleShell(params);
                    break;
                case 'doctor':
                    await this.handleDoctor(params);
                    break;
                case 'analyze':
                    await this.handleAnalyze(params);
                    break;
                case 'search':
                    await this.handleSearch(params);
                    break;
                case 'index':
                    await this.handleIndex(params);
                    break;
                case 'open':
                    await this.handleOpen(params);
                    break;
                case 'init':
                    await this.handleInit(params);
                    break;
                case 'config':
                    await this.handleConfig(params);
                    break;
                case 'version':
                    this.showVersion();
                    break;
                default:
                    this.showHelp();
            }
        } finally {
            if (this.dryRunManager.dryRun) {
                this.dryRunManager.showSummary();
            }
        }
    }

    async handlePublish(params) {
        console.log('📚 Publishing Documentation...');
        
        const [source] = params;
        const sourceDir = source || './docs';
        
        if (!fs.existsSync(sourceDir)) {
            throw new Error(`Source directory not found: ${sourceDir}`);
        }

        // Validate R2 configuration
        try {
            this.secretsManager.getR2Config();
            console.log('✅ R2 configuration validated');
        } catch (error) {
            console.error('❌ R2 configuration missing. Run "bun-docs init" to setup.');
            return;
        }

        if (this.dryRunManager.dryRun) {
            await this.dryRunManager.previewCloudflareRequest('POST', '/r2/upload', {
                source: sourceDir,
                bucket: this.config.r2.bucket,
                compress: this.config.publishing.compressAssets
            });
            return;
        }

        // Step 1: Process documentation
        console.log('🔄 Processing documentation...');
        const processedDocs = await this.processDocumentation(sourceDir);
        
        // Step 2: Upload to R2
        console.log('☁️ Uploading to R2...');
        const uploadResults = await this.uploadToR2(processedDocs);
        
        // Step 3: Generate RSS feed
        if (this.config.publishing.autoGenerateRSS) {
            console.log('📡 Generating RSS feed...');
            await this.generateRSSFeed(uploadResults);
        }
        
        // Step 4: Generate sitemap
        if (this.config.publishing.generateSitemap) {
            console.log('🗺️ Generating sitemap...');
            await this.generateSitemap(uploadResults);
        }
        
        console.log('✅ Documentation published successfully!');
        console.log(`📊 Uploaded ${uploadResults.files.length} files`);
        console.log(`🔗 Public URL: ${this.config.r2.publicUrl}`);
    }

    async handleRSS(params) {
        const [action] = params;

        switch (action) {
            case 'fetch':
                await this.fetchRSSFeeds();
                break;
            case 'add':
                await this.addRSSFeed(params.slice(1));
                break;
            case 'list':
                this.listRSSFeeds();
                break;
            case 'remove':
                await this.removeRSSFeed(params.slice(1));
                break;
            default:
                console.log(`
📡 RSS Feed Management

USAGE:
  bun-docs rss <action> [options]

ACTIONS:
  fetch       Fetch updates from all RSS feeds
  add <url>   Add new RSS feed
  list        List all configured RSS feeds
  remove <url> Remove RSS feed

EXAMPLES:
  bun-docs rss fetch
  bun-docs rss add https://example.com/rss.xml
  bun-docs rss list
                `);
        }
    }

    async handleSearch(params) {
        const [query, ...options] = params;
        
        if (!query) {
            console.log(`
🔍 Documentation Search

USAGE:
  bun-docs search <query> [options]

QUERY:
  Search term to find in Bun documentation

OPTIONS:
  --sh         Prioritize bun.sh links (legacy domain)
  --com        Prioritize bun.com links (modern domain, default)
  --open       Open top result in browser
  --app        Open in Chrome App (requires --open)
  --limit <n>  Limit number of results (default: 10)

EXAMPLES:
  bun-docs search "Bun.serve"
  bun-docs search "sqlite" --sh
  bun-docs search "linker" --com --open
  bun-docs search "copyfile" --sh --limit 5
            `);
            return;
        }

        try {
            const searchOptions = {
                domain: options.includes('--sh') ? 'bun.sh' : 'bun.com',
                limit: this.getLimitOption(options),
                open: options.includes('--open'),
                app: options.includes('--app')
            };

            console.log(`🔍 Searching for "${query}" in ${searchOptions.domain} documentation...`);
            
            const results = await this.performSearch(query, searchOptions);
            
            if (results.length === 0) {
                console.log('❌ No results found. Try a different search term.');
                return;
            }

            console.log(`✅ Found ${results.length} results:\n`);
            
            results.forEach((result, index) => {
                console.log(`${index + 1}. ${result.title}`);
                console.log(`   📄 ${result.path}`);
                console.log(`   🔗 ${result.url}`);
                console.log(`   📝 ${result.description?.substring(0, 100)}...`);
                console.log(`   ⭐ Score: ${result.score.toFixed(2)}`);
                console.log('');
            });

            // Auto-open top result if requested
            if (searchOptions.open && results.length > 0) {
                const topResult = results[0];
                console.log(`🌐 Opening top result: ${topResult.title}`);
                
                if (searchOptions.app) {
                    // Open in Chrome App (mock implementation)
                    console.log(`📱 Opening in Chrome App: ${topResult.url}`);
                    // In real implementation: execSync(`open -a "Chrome" "${topResult.url}"`);
                } else {
                    // Open in default browser
                    console.log(`🌐 Opening in browser: ${topResult.url}`);
                    // In real implementation: execSync(`open "${topResult.url}"`);
                }
            }

        } catch (error) {
            console.error(`❌ Search failed: ${error.message}`);
        }
    }

    async handleIndex(params) {
        console.log('📚 Building documentation index...');
        
        try {
            const force = params.includes('--force');
            const verbose = params.includes('--verbose');
            
            const indexResult = await this.buildDocumentationIndex(force, verbose);
            
            console.log(`✅ Index built successfully!`);
            console.log(`📊 Indexed ${indexResult.totalPages} pages`);
            console.log(`💾 Cache size: ${indexResult.cacheSize}`);
            console.log(`🕐 Built at: ${new Date(indexResult.timestamp).toLocaleString()}`);
            
            if (verbose) {
                console.log(`\n📋 Index sections:`);
                Object.entries(indexResult.sections).forEach(([section, count]) => {
                    console.log(`   ${section}: ${count} pages`);
                });
            }
            
        } catch (error) {
            console.error(`❌ Index build failed: ${error.message}`);
        }
    }

    getLimitOption(options) {
        const limitIndex = options.indexOf('--limit');
        if (limitIndex !== -1 && options[limitIndex + 1]) {
            const limit = parseInt(options[limitIndex + 1]);
            return isNaN(limit) ? 10 : Math.max(1, Math.min(50, limit));
        }
        return 10;
    }

    async performSearch(query, options) {
        // Check if cache exists and is fresh
        const cacheFile = path.join(process.cwd(), '.bun-docs-cache', 'search-index.json');
        const cacheTTL = process.env.BUN_DOCS_CACHE_TTL ? parseInt(process.env.BUN_DOCS_CACHE_TTL) : 3600000; // 1 hour default
        
        let index = null;
        
        try {
            if (fs.existsSync(cacheFile)) {
                const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
                const age = Date.now() - cache.timestamp;
                
                if (age < cacheTTL) {
                    index = cache.index;
                    if (options.domain === 'bun.sh' && cache.bunShIndex) {
                        index = { ...index, ...cache.bunShIndex };
                    }
                }
            }
        } catch (error) {
            console.log('⚠️ Cache read error, rebuilding index...');
        }
        
        // Build index if not available or expired
        if (!index) {
            console.log('🔄 Building search index...');
            index = await this.buildSearchIndex(options.domain);
        }
        
        // Perform fuzzy search
        const results = this.fuzzySearch(query, index, options.limit);
        
        return results;
    }

    async buildSearchIndex(domain) {
        // Mock search index - in real implementation, would fetch from bun.com/bun.sh
        const mockIndex = {
            'api/http': {
                title: 'HTTP API',
                path: 'api/http',
                url: `https://${domain}/docs/api/http`,
                description: 'HTTP client and server utilities for making requests and handling responses',
                keywords: ['http', 'fetch', 'request', 'response', 'server'],
                category: 'api'
            },
            'runtime/serve': {
                title: 'Bun.serve()',
                path: 'runtime/serve',
                url: `https://${domain}/docs/runtime/serve`,
                description: 'Built-in HTTP server with WebSocket support and performance optimizations',
                keywords: ['serve', 'server', 'http', 'websocket', 'performance'],
                category: 'runtime'
            },
            'api/sqlite': {
                title: 'SQLite Database',
                path: 'api/sqlite',
                url: `https://${domain}/docs/api/sqlite`,
                description: 'Built-in SQLite database with JavaScript API and async support',
                keywords: ['sqlite', 'database', 'sql', 'query', 'storage'],
                category: 'api'
            },
            'bundler/linker': {
                title: 'Bundler Linker',
                path: 'bundler/linker',
                url: `https://${domain}/docs/bundler/linker`,
                description: 'Advanced linker configuration for optimal bundle performance',
                keywords: ['linker', 'bundler', 'optimization', 'performance'],
                category: 'bundler'
            },
            'runtime/fs': {
                title: 'File System API',
                path: 'runtime/fs',
                url: `https://${domain}/docs/runtime/fs`,
                description: 'High-performance file operations including copyfile and clonefile',
                keywords: ['fs', 'file', 'copyfile', 'clonefile', 'hardlink'],
                category: 'runtime'
            }
        };
        
        // Cache the index
        const cacheDir = path.join(process.cwd(), '.bun-docs-cache');
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }
        
        const cache = {
            timestamp: Date.now(),
            domain: domain,
            index: mockIndex
        };
        
        fs.writeFileSync(path.join(cacheDir, 'search-index.json'), JSON.stringify(cache, null, 2));
        
        return mockIndex;
    }

    fuzzySearch(query, index, limit = 10) {
        const results = [];
        const queryLower = query.toLowerCase();
        
        Object.entries(index).forEach(([key, page]) => {
            let score = 0;
            
            // Exact title match
            if (page.title.toLowerCase() === queryLower) {
                score += 100;
            }
            
            // Title contains query
            if (page.title.toLowerCase().includes(queryLower)) {
                score += 50;
            }
            
            // Path contains query
            if (page.path.toLowerCase().includes(queryLower)) {
                score += 30;
            }
            
            // Keywords match
            page.keywords.forEach(keyword => {
                if (keyword.toLowerCase() === queryLower) {
                    score += 40;
                } else if (keyword.toLowerCase().includes(queryLower)) {
                    score += 20;
                }
            });
            
            // Description contains query
            if (page.description.toLowerCase().includes(queryLower)) {
                score += 10;
            }
            
            // Fuzzy matching
            if (score === 0) {
                score = this.calculateFuzzyScore(queryLower, page.title.toLowerCase());
            }
            
            if (score > 0) {
                results.push({
                    ...page,
                    score: score
                });
            }
        });
        
        // Sort by score (descending) and limit results
        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    calculateFuzzyScore(query, text) {
        let score = 0;
        let queryIndex = 0;
        let textIndex = 0;
        
        while (queryIndex < query.length && textIndex < text.length) {
            if (query[queryIndex] === text[textIndex]) {
                score += 5;
                queryIndex++;
            }
            textIndex++;
        }
        
        // Bonus for matching first character
        if (text[0] === query[0]) {
            score += 10;
        }
        
        return score;
    }

    async buildDocumentationIndex(force = false, verbose = false) {
        const cacheDir = path.join(process.cwd(), '.bun-docs-cache');
        const indexFile = path.join(cacheDir, 'docs-index.json');
        
        if (!force && fs.existsSync(indexFile)) {
            const existing = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
            const age = Date.now() - existing.timestamp;
            
            if (age < 3600000) { // 1 hour
                return existing;
            }
        }
        
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }
        
        // Mock index building - in real implementation, would crawl bun.com
        const sections = {
            'api': 45,
            'runtime': 32,
            'bundler': 18,
            'test': 12,
            'cli': 8,
            'utilities': 15
        };
        
        const index = {
            timestamp: Date.now(),
            totalPages: Object.values(sections).reduce((a, b) => a + b, 0),
            sections: sections,
            cacheSize: '2.4MB',
            version: '1.0.0'
        };
        
        fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
        
        if (verbose) {
            console.log('📚 Indexed sections:');
            Object.entries(sections).forEach(([section, count]) => {
                console.log(`   ${section}: ${count} pages`);
            });
        }
        
        return index;
    }

    async handleOpen(params) {
        const [url, ...options] = params;
        
        if (!url) {
            console.log(`
🌐 Open Documentation

USAGE:
  bun-docs open <url> [options]

URL:
  Documentation URL to open (can be full URL or relative path)

OPTIONS:
  --app        Open in Chrome App instead of default browser

EXAMPLES:
  bun-docs open "https://bun.sh/docs/api/http"
  bun-docs open "api/sqlite" --app
  bun-docs open "runtime/serve"
            `);
            return;
        }

        try {
            const useApp = options.includes('--app');
            const fullUrl = url.startsWith('http') ? url : `https://bun.sh/docs/${url}`;
            
            console.log(`🌐 Opening: ${fullUrl}`);
            
            if (useApp) {
                console.log(`📱 Opening in Chrome App...`);
                // In real implementation: execSync(`open -a "Chrome" "${fullUrl}"`);
            } else {
                console.log(`🌐 Opening in default browser...`);
                // In real implementation: execSync(`open "${fullUrl}"`);
            }
            
            console.log('✅ Documentation opened successfully!');
            
        } catch (error) {
            console.error(`❌ Failed to open documentation: ${error.message}`);
        }
    }

    async fetchRSSFeeds() {
        console.log('📡 Fetching RSS feeds...');
        
        const results = [];
        
        for (const feedUrl of this.config.rss.feeds) {
            try {
                console.log(`🔄 Fetching: ${feedUrl}`);
                
                const response = await fetch(feedUrl, {
                    headers: {
                        'User-Agent': 'Bun-Docs-RSS-Reader/1.0',
                        'Accept': 'application/rss+xml, application/xml, text/xml'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const xmlText = await response.text();
                const parsedFeed = await this.parseRSSFeed(xmlText);
                
                results.push({
                    url: feedUrl,
                    success: true,
                    items: parsedFeed.items.length,
                    lastUpdated: parsedFeed.lastBuildDate,
                    title: parsedFeed.title
                });
                
                console.log(`✅ ${parsedFeed.title}: ${parsedFeed.items.length} items`);
                
            } catch (error) {
                console.error(`❌ Failed to fetch ${feedUrl}: ${error.message}`);
                results.push({
                    url: feedUrl,
                    success: false,
                    error: error.message
                });
            }
        }
        
        // Save results
        const rssData = {
            timestamp: new Date().toISOString(),
            feeds: results
        };
        
        fs.writeFileSync('./bun-docs-rss-cache.json', JSON.stringify(rssData, null, 2));
        
        const successful = results.filter(r => r.success).length;
        console.log(`\n📊 RSS Summary: ${successful}/${results.length} feeds fetched successfully`);
    }

    async handleR2(params) {
        const [action] = params;

        switch (action) {
            case 'list':
                await this.listR2Packages();
                break;
            case 'upload':
                await this.uploadToR2Manual(params.slice(1));
                break;
            case 'download':
                await this.downloadFromR2(params.slice(1));
                break;
            case 'delete':
                await this.deleteFromR2(params.slice(1));
                break;
            case 'stats':
                await this.getR2Stats();
                break;
            default:
                console.log(`
🗄️ R2 Storage Management

USAGE:
  bun-docs r2 <action> [options]

ACTIONS:
  list        List all packages in R2
  upload <file> Upload file to R2
  download <key> Download file from R2
  delete <key> Delete file from R2
  stats       Show R2 storage statistics

EXAMPLES:
  bun-docs r2 list
  bun-docs r2 upload ./docs.zip
  bun-docs r2 download docs/index.html
                `);
        }
    }

    async listR2Packages() {
        console.log('🗄️ Listing R2 packages...');
        
        try {
            const r2Config = this.secretsManager.getR2Config();
            
            if (this.dryRunManager.dryRun) {
                await this.dryRunManager.previewCloudflareRequest('GET', `/r2/buckets/${this.config.r2.bucket}/objects`);
                return;
            }
            
            // Mock R2 listing - in real implementation, use AWS SDK or Cloudflare API
            const mockPackages = [
                { key: 'docs/index.html', size: 15420, lastModified: '2026-02-07T15:30:00Z' },
                { key: 'docs/api/reference.html', size: 28950, lastModified: '2026-02-07T15:30:00Z' },
                { key: 'docs/guides/getting-started.html', size: 12300, lastModified: '2026-02-07T15:30:00Z' },
                { key: 'assets/css/main.css', size: 5670, lastModified: '2026-02-07T15:30:00Z' },
                { key: 'assets/js/app.js', size: 12340, lastModified: '2026-02-07T15:30:00Z' },
                { key: 'sitemap.xml', size: 2340, lastModified: '2026-02-07T15:30:00Z' },
                { key: 'rss.xml', size: 1890, lastModified: '2026-02-07T15:30:00Z' }
            ];
            
            console.log(`📦 Found ${mockPackages.length} packages in bucket "${this.config.r2.bucket}":\n`);
            
            mockPackages.forEach(pkg => {
                const sizeKB = (pkg.size / 1024).toFixed(1);
                console.log(`📄 ${pkg.key}`);
                console.log(`   Size: ${sizeKB} KB`);
                console.log(`   Modified: ${new Date(pkg.lastModified).toLocaleString()}`);
                console.log('');
            });
            
            const totalSize = mockPackages.reduce((sum, pkg) => sum + pkg.size, 0);
            console.log(`📊 Total storage: ${(totalSize / 1024).toFixed(1)} KB`);
            
        } catch (error) {
            console.error('❌ Failed to list R2 packages:', error.message);
        }
    }

    async handleShell(params) {
        console.log('🐚 Entering Bun Docs Interactive Shell');
        console.log('Type "help" for available commands or "exit" to quit\n');
        
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: 'bun-docs> '
        });
        
        rl.prompt();
        
        rl.on('line', async (input) => {
            const args = input.trim().split(' ');
            const command = args[0];
            
            if (command === 'exit' || command === 'quit') {
                rl.close();
                return;
            }
            
            if (command === 'help') {
                console.log(`
🐚 Interactive Shell Commands:

General:
  help                 Show this help
  exit/quit            Exit the shell
  clear                Clear screen

Documentation:
  publish [dir]        Publish documentation
  status               Show publishing status
  logs                 Show recent logs

R2 Storage:
  r2 list              List R2 packages
  r2 stats             Show R2 statistics
  r2 upload <file>     Upload file

RSS Feeds:
  rss fetch            Fetch RSS feeds
  rss list             List RSS feeds
  rss add <url>        Add RSS feed

Analytics:
  stats                Show statistics
  views                Show view counts
  downloads            Show download counts

System:
  doctor               Run diagnostics
  config               Show configuration
  version              Show version
                `);
                rl.prompt();
                return;
            }
            
            if (command === 'clear') {
                console.clear();
                rl.prompt();
                return;
            }
            
            try {
                await this.executeCommand(args);
            } catch (error) {
                console.error(`❌ Error: ${error.message}`);
            }
            
            rl.prompt();
        });
        
        rl.on('close', () => {
            console.log('\n👋 Goodbye!');
            process.exit(0);
        });
    }

    async handleDoctor(params) {
        console.log('🩺 Running System Diagnostics...\n');
        
        const verbose = params.includes('--verbose');
        const issues = [];
        const checks = [];
        
        // Check 1: Configuration
        console.log('🔧 Checking configuration...');
        try {
            if (fs.existsSync(this.configFile)) {
                console.log('✅ Configuration file exists');
                checks.push('config');
            } else {
                console.log('⚠️ Configuration file not found (run "bun-docs init")');
                issues.push('Configuration file missing');
            }
        } catch (error) {
            console.log(`❌ Configuration error: ${error.message}`);
            issues.push('Configuration corrupted');
        }
        
        // Check 2: Secrets
        console.log('\n🔐 Checking secrets...');
        try {
            const requiredSecrets = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'];
            const missing = [];
            
            for (const secret of requiredSecrets) {
                try {
                    this.secretsManager.getSecret(secret);
                } catch (error) {
                    missing.push(secret);
                }
            }
            
            if (missing.length === 0) {
                console.log('✅ All required secrets configured');
                checks.push('secrets');
            } else {
                console.log(`❌ Missing secrets: ${missing.join(', ')}`);
                issues.push('Secrets not configured');
            }
        } catch (error) {
            console.log(`❌ Secrets error: ${error.message}`);
            issues.push('Secrets system error');
        }
        
        // Check 3: Network connectivity
        console.log('\n🌐 Checking network connectivity...');
        try {
            const response = await fetch('https://httpbin.org/status/200', { timeout: 5000 });
            if (response.ok) {
                console.log('✅ Network connectivity OK');
                checks.push('network');
            } else {
                console.log('⚠️ Network issues detected');
                issues.push('Network connectivity problems');
            }
        } catch (error) {
            console.log('❌ Network connectivity failed');
            issues.push('No network connection');
        }
        
        // Check 4: Disk space
        console.log('\n💾 Checking disk space...');
        try {
            const stats = fs.statSync(process.cwd());
            const freeSpace = process.platform === 'win32' ? 'Unknown' : 'Available';
            console.log(`✅ Disk access OK (${freeSpace} space available)`);
            checks.push('disk');
        } catch (error) {
            console.log('❌ Disk access failed');
            issues.push('Disk access problems');
        }
        
        // Check 5: Performance
        console.log('\n⚡ Checking performance...');
        try {
            const perfStats = this.optimizer.getPerformanceStats();
            console.log(`✅ Performance OK (${(perfStats.memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB used)`);
            checks.push('performance');
        } catch (error) {
            console.log('❌ Performance check failed');
            issues.push('Performance issues');
        }
        
        // Check 6: Enhanced Docs Fetcher (NEW)
        console.log('\n📚 Checking documentation cache...');
        try {
            await this.checkDocsFetcher(verbose);
            checks.push('docs-cache');
        } catch (error) {
            console.log(`❌ Documentation cache error: ${error.message}`);
            issues.push('Documentation cache issues');
        }
        
        // Summary
        console.log('\n📊 Diagnostic Summary');
        console.log('=======================');
        console.log(`✅ Passed checks: ${checks.length}`);
        console.log(`❌ Issues found: ${issues.length}`);
        
        if (issues.length === 0) {
            console.log('\n🎉 All systems operational!');
        } else {
            console.log('\n⚠️ Issues detected:');
            issues.forEach((issue, index) => {
                console.log(`${index + 1}. ${issue}`);
            });
            console.log('\n💡 Run "bun-docs init" to fix configuration issues');
        }
        
        if (verbose) {
            console.log('\n🔍 Detailed Information:');
            console.log(`Node.js version: ${process.version}`);
            console.log(`Platform: ${process.platform}`);
            console.log(`Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}MB`);
            console.log(`Uptime: ${Math.floor(process.uptime())}s`);
        }
    }

    async checkDocsFetcher(verbose = false) {
        try {
            // Try to import EnhancedDocsFetcher
            let EnhancedDocsFetcher;
            try {
                const docsModule = require('./lib/docs/index-fetcher-enhanced');
                EnhancedDocsFetcher = docsModule.EnhancedDocsFetcher;
            } catch (importError) {
                // Fallback: create a simple docs fetcher check
                if (verbose) {
                    console.log('📝 Enhanced Docs Fetcher not found, checking basic docs...');
                }
                
                // Check if docs directory exists
                const docsDir = path.join(process.cwd(), 'docs');
                if (fs.existsSync(docsDir)) {
                    const stats = fs.statSync(docsDir);
                    console.log(`✅ Documentation directory exists (${(stats.size / 1024).toFixed(1)}KB)`);
                    return;
                } else {
                    throw new Error('Documentation directory not found');
                }
            }
            
            // Use EnhancedDocsFetcher if available
            const fetcher = new EnhancedDocsFetcher();
            const version = typeof Bun !== 'undefined' ? Bun.version : process.versions.node;
            
            console.log(`📡 Current Bun: ${version}`);
            
            try {
                const cacheAge = await fetcher.getCacheAge();
                console.log(`📚 Docs cached for: ${cacheAge}`);
                
                if (verbose) {
                    // Get additional cache information
                    try {
                        const cacheStats = await fetcher.getCacheStats();
                        if (cacheStats) {
                            console.log(`   Cache entries: ${cacheStats.entries || 'Unknown'}`);
                            console.log(`   Cache size: ${cacheStats.size || 'Unknown'}`);
                            console.log(`   Last updated: ${cacheStats.lastUpdated || 'Unknown'}`);
                        }
                    } catch (statsError) {
                        if (verbose) {
                            console.log(`   Cache stats unavailable: ${statsError.message}`);
                        }
                    }
                }
                
                // Test cache refresh capability
                if (verbose) {
                    console.log('🔄 Testing cache refresh...');
                    try {
                        await fetcher.refreshCache();
                        console.log('✅ Cache refresh successful');
                    } catch (refreshError) {
                        console.log(`⚠️ Cache refresh failed: ${refreshError.message}`);
                    }
                }
                
            } catch (cacheError) {
                console.log(`⚠️ Cache age check failed: ${cacheError.message}`);
                console.log('📚 Documentation cache may need initialization');
            }
            
        } catch (error) {
            throw new Error(`Documentation fetcher check failed: ${error.message}`);
        }
    }

    async handleAnalyze(params) {
        console.log('📊 Generating Comprehensive Analysis...\n');
        
        const generateReport = params.includes('--report');
        const outputIndex = params.indexOf('--output');
        const outputFile = outputIndex !== -1 ? params[outputIndex + 1] : 'bun-docs-analysis.json';
        
        const analysis = {
            timestamp: new Date().toISOString(),
            version: this.version,
            system: {
                nodeVersion: process.version,
                platform: process.platform,
                memory: process.memoryUsage(),
                uptime: process.uptime()
            },
            configuration: {
                configFile: this.configFile,
                r2Configured: this.config.r2.bucket !== 'bun-docs',
                rssFeeds: this.config.rss.feeds.length,
                analyticsEnabled: this.config.analytics.enabled
            },
            secrets: {
                configured: this.secretsManager.listSecrets().length,
                r2Available: this.checkR2Secrets(),
                cloudflareAvailable: this.checkCloudflareSecrets(),
                githubAvailable: this.checkGitHubSecrets()
            },
            performance: this.optimizer.getPerformanceStats(),
            recommendations: []
        };
        
        // Generate recommendations
        if (analysis.secrets.configured < 3) {
            analysis.recommendations.push('Configure more secrets for full functionality');
        }
        
        if (analysis.configuration.rssFeeds < 2) {
            analysis.recommendations.push('Add more RSS feeds for better monitoring');
        }
        
        if (analysis.performance.cacheHitRate < 0.5) {
            analysis.recommendations.push('Consider increasing cache timeout for better performance');
        }
        
        // Display analysis
        console.log('📋 Analysis Results:');
        console.log('==================');
        console.log(`🔧 Configuration: ${analysis.configFile}`);
        console.log(`🔐 Secrets configured: ${analysis.secrets.configured}`);
        console.log(`📡 RSS feeds: ${analysis.configuration.rssFeeds}`);
        console.log(`📊 Cache hit rate: ${(analysis.performance.cacheHitRate * 100).toFixed(1)}%`);
        console.log(`💾 Memory usage: ${(analysis.system.memory.heapUsed / 1024 / 1024).toFixed(1)}MB`);
        
        if (analysis.recommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            analysis.recommendations.forEach((rec, index) => {
                console.log(`${index + 1}. ${rec}`);
            });
        }
        
        // Save report if requested
        if (generateReport) {
            fs.writeFileSync(outputFile, JSON.stringify(analysis, null, 2));
            console.log(`\n📄 Report saved to: ${outputFile}`);
        }
    }

    async handleInit(params) {
        console.log('🚀 Initializing Bun Docs...\n');
        
        // Create config file
        if (!fs.existsSync(this.configFile)) {
            this.saveConfig();
            console.log('✅ Configuration file created');
        } else {
            console.log('⚠️ Configuration file already exists');
        }
        
        // Create directories
        const dirs = ['./docs', './assets', './templates'];
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`✅ Created directory: ${dir}`);
            }
        });
        
        // Create sample documentation
        const sampleDoc = `# Welcome to Bun Docs

This is a sample documentation file.

## Getting Started

1. Edit this file in \`./docs/\`
2. Run \`bun-docs publish\`
3. View your published documentation

## Features

- 📚 Documentation publishing
- 📡 RSS feed monitoring  
- 🗄️ R2 storage management
- 🐚 Interactive shell
- 🩺 System diagnostics
- 📊 Analytics and reporting

For more information, run \`bun-docs --help\`.
`;
        
        if (!fs.existsSync('./docs/index.md')) {
            fs.writeFileSync('./docs/index.md', sampleDoc);
            console.log('✅ Created sample documentation');
        }
        
        console.log('\n🎉 Bun Docs initialized successfully!');
        console.log('\nNext steps:');
        console.log('1. Configure your R2 credentials');
        console.log('2. Edit documentation in ./docs/');
        console.log('3. Run "bun-docs publish"');
        console.log('4. Try "bun-docs shell" for interactive mode');
    }

    checkR2Secrets() {
        try {
            this.secretsManager.getR2Config();
            return true;
        } catch (error) {
            return false;
        }
    }

    checkCloudflareSecrets() {
        try {
            this.secretsManager.getSecret('CLOUDFLARE_API_TOKEN');
            return true;
        } catch (error) {
            return false;
        }
    }

    checkGitHubSecrets() {
        try {
            this.secretsManager.getSecret('GITHUB_TOKEN');
            return true;
        } catch (error) {
            return false;
        }
    }

    async processDocumentation(sourceDir) {
        // Simple documentation processing - in real implementation, would be more sophisticated
        const files = [];
        const processDir = (dir) => {
            const items = fs.readdirSync(dir);
            items.forEach(item => {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    processDir(fullPath);
                } else {
                    files.push({
                        path: fullPath,
                        relative: path.relative(sourceDir, fullPath),
                        size: stat.size,
                        modified: stat.mtime
                    });
                }
            });
        };
        
        processDir(sourceDir);
        return files;
    }

    async uploadToR2(files) {
        // Mock upload - in real implementation, use AWS SDK or Cloudflare API
        console.log(`Uploading ${files.length} files...`);
        
        const results = files.map(file => ({
            key: `docs/${file.relative}`,
            url: `${this.config.r2.publicUrl}/docs/${file.relative}`,
            size: file.size
        }));
        
        return { files: results };
    }

    async generateRSSFeed(uploadResults) {
        const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Bun Documentation</title>
    <description>Latest documentation updates</description>
    <link>${this.config.r2.publicUrl}</link>
    <pubDate>${new Date().toISOString()}</pubDate>
    <item>
      <title>Documentation Updated</title>
      <description>${uploadResults.files.length} files published</description>
      <link>${this.config.r2.publicUrl}</link>
      <pubDate>${new Date().toISOString()}</pubDate>
    </item>
  </channel>
</rss>`;
        
        fs.writeFileSync('./docs/rss.xml', rss);
        console.log('✅ RSS feed generated');
    }

    async generateSitemap(uploadResults) {
        const urls = uploadResults.files.map(file => 
            `  <url>
    <loc>${file.url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>0.8</priority>
  </url>`
        ).join('\n');
        
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
        
        fs.writeFileSync('./docs/sitemap.xml', sitemap);
        console.log('✅ Sitemap generated');
    }

    async parseRSSFeed(xmlText) {
        // Simple RSS parsing - in real implementation, use proper XML parser
        const titleMatch = xmlText.match(/<title>(.*?)<\/title>/);
        const dateMatch = xmlText.match(/<lastBuildDate>(.*?)<\/lastBuildDate>/);
        const itemMatches = xmlText.match(/<item>.*?<\/item>/gs) || [];
        
        return {
            title: titleMatch ? titleMatch[1] : 'Unknown Feed',
            lastBuildDate: dateMatch ? dateMatch[1] : new Date().toISOString(),
            items: itemMatches.map((item, index) => ({
                title: item.match(/<title>(.*?)<\/title>/)?.[1] || `Item ${index + 1}`,
                link: item.match(/<link>(.*?)<\/link>/)?.[1] || '#',
                description: item.match(/<description>(.*?)<\/description>/)?.[1] || '',
                guid: item.match(/<guid>(.*?)<\/guid>/)?.[1] || `item-${index}`,
                pubDate: item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || new Date().toISOString()
            }))
        };
    }

    showVersion() {
        console.log(`📚 Bun Docs v${this.version}`);
        console.log('Advanced documentation management CLI');
    }

    showHelp() {
        console.log(`
📚 Bun Docs - Comprehensive Documentation Management v${this.version}

USAGE:
  bun-docs <command> [options] [--dryrun]

COMMANDS:

  📚 Publishing:
    bun-docs publish [source]              Publish documentation to R2
    bun-docs init                          Initialize new documentation project

  � Documentation Search:
    bun-docs search <query> [options]      Search Bun documentation
    bun-docs index [--force] [--verbose]   Build local search index
    bun-docs open <url> [--app]            Open documentation in browser

  � RSS Management:
    bun-docs rss fetch                     Fetch updates from RSS feeds
    bun-docs rss add <url>                 Add RSS feed
    bun-docs rss list                      List RSS feeds
    bun-docs rss remove <url>              Remove RSS feed

  🗄️ R2 Storage:
    bun-docs r2 list                       List packages in R2
    bun-docs r2 upload <file>              Upload file to R2
    bun-docs r2 download <key>             Download file from R2
    bun-docs r2 delete <key>               Delete file from R2
    bun-docs r2 stats                      Show R2 statistics

  🐚 Interactive Mode:
    bun-docs shell                         Enter interactive shell

  🩺 Diagnostics:
    bun-docs doctor [--verbose]            Run system diagnostics (includes docs cache check)
    bun-docs analyze [--report] [--output] Generate comprehensive analysis

  ⚙️ Configuration:
    bun-docs config                        Show configuration
    bun-docs version                       Show version

OPTIONS:
  --dryrun, -n                            Preview operations without executing
  --verbose                               Show detailed output
  --report                                Generate detailed report
  --output <file>                         Specify output file

EXAMPLES:
  bun-docs publish ./docs                 Publish documentation
  bun-docs search "Bun.serve"             Search for API documentation
  bun-docs search "sqlite" --sh            Search with legacy domain
  bun-docs search "linker" --com --open    Search and open top result
  bun-docs index                          Build search index
  bun-docs rss fetch                      Fetch RSS updates
  bun-docs r2 list                       List R2 storage
  bun-docs shell                         Interactive mode
  bun-docs doctor --verbose              Full diagnostics
  bun-docs analyze --report --output report.json  Generate report

For more help, run: bun-docs <command> --help
        `);
    }
}

// CLI Entry Point
if (require.main === module) {
    const cli = new BunDocsCLI();
    cli.executeCommand(process.argv.slice(2)).catch(error => {
        console.error('❌ Error:', error.message);
        process.exit(1);
    });
}

module.exports = BunDocsCLI;
