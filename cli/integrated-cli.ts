#!/usr/bin/env bun

/**
 * 🚀 Integrated Bun Documentation CLI
 * 
 * Complete CLI with package management, R2 storage, RSS feeds,
 * and enhanced documentation workflows.
 */

import { PackageManager, type PackageInfo } from '../lib/package/package-manager.ts';
import { R2Storage, type R2StorageConfig } from '../lib/r2/r2-storage-enhanced.ts';
import { RSSManager, type RSSFeed } from '../lib/rss/rss-manager.ts';

class IntegratedCLI {
  private packageManager: PackageManager;
  private r2Storage?: R2Storage;
  private rssManager: RSSManager;
  
  constructor() {
    this.packageManager = new PackageManager();
    
    // Initialize R2 if credentials are available
    if (this.hasR2Credentials()) {
      const config = this.loadR2Config();
      this.r2Storage = new R2Storage(config);
    }
    
    this.rssManager = new RSSManager(this.r2Storage);
  }
  
  async run() {
    const args = Bun.argv.slice(2);
    const command = args[0];
    
    switch (command) {
      case 'init':
        await this.initPackage(args.slice(1));
        break;
        
      case 'analyze':
        await this.analyzePackage(args.slice(1));
        break;
        
      case 'deps':
        await this.analyzeDependencies(args.slice(1));
        break;
        
      case 'r2':
        await this.r2Operations(args.slice(1));
        break;
        
      case 'rss':
        await this.rssOperations(args.slice(1));
        break;
        
      case 'sync':
        await this.syncAll(args.slice(1));
        break;
        
      case 'serve':
        await this.serveDocs(args.slice(1));
        break;
        
      case 'publish':
        await this.publishPackage(args.slice(1));
        break;
        
      default:
        this.showHelp();
        break;
    }
  }
  
  async initPackage(args: string[]) {
    const packageName = args[0] || (await Bun.$`basename ${Bun.env.PWD || process.cwd()}`.text()).trim();
    
    console.log(`🚀 Initializing ${packageName}...`);
    
    // Create package.json if it doesn't exist
    const packageJsonPath = './package.json';
    if (!await Bun.file(packageJsonPath).exists()) {
      const packageJson = {
        name: packageName,
        version: '1.0.0',
        description: 'Project with Bun documentation integration',
        scripts: {
          'docs:dev': 'bun-docs serve',
          'docs:build': 'bun-docs publish',
          'docs:sync': 'bun-docs sync'
        },
        dependencies: {},
        devDependencies: {
          '@types/bun': 'latest',
          'bun-types': 'latest'
        },
        bunDocs: {
          r2: this.r2Storage ? 'enabled' : 'disabled',
          rss: 'enabled'
        }
      };
      
      await Bun.write(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('✅ Created package.json');
    }
    
    // Set up R2 bucket
    if (this.r2Storage) {
      const bucket = await this.r2Storage.createBucketForPackage(packageName);
      console.log(`✅ Created R2 bucket: ${bucket}`);
    }
    
    // Subscribe to RSS feeds
    await this.rssManager.subscribe(
      'https://bun.sh/rss.xml',
      'Bun Blog',
      'bun'
    );
    console.log('✅ Subscribed to Bun RSS feed');
    
    // Install dependencies
    await this.packageManager.installMissingDocs();
    
    console.log('\n🎉 Package initialized!');
    console.log('Next steps:');
    console.log('  bun-docs analyze      # Analyze package for Bun APIs');
    console.log('  bun-docs serve        # Start documentation server');
    console.log('  bun-docs sync         # Sync with R2');
  }
  
  async analyzePackage(args: string[]) {
    const packageInfo = await this.packageManager.analyzePackage();
    
    console.log(`📦 ${packageInfo.name}@${packageInfo.version}`);
    console.log(`📝 ${packageInfo.description || 'No description'}`);
    
    if (packageInfo.bunDocs && packageInfo.bunDocs.length > 0) {
      console.log('\n🚀 Bun APIs used:');
      packageInfo.bunDocs.forEach(doc => {
        console.log(`  • ${doc.api} (${doc.category})`);
        console.log(`    📚 ${doc.url}`);
      });
    }
    
    if (packageInfo.r2Config) {
      console.log(`\n☁️  R2 Storage: ${packageInfo.r2Config.bucket}`);
    }
    
    if (packageInfo.rssFeed) {
      console.log(`\n📰 RSS Feed: ${packageInfo.rssFeed}`);
    }
    
    // Generate dependency graph
    if (args.includes('--graph')) {
      const graph = await this.packageManager.generateDependencyGraph();
      console.log('\n🌳 Dependency Graph:');
      this.printDependencyGraph(graph, 0);
    }
  }
  
  private printDependencyGraph(graph: any, depth: number) {
    const indent = '  '.repeat(depth);
    console.log(`${indent}${graph.name}@${graph.version} (${graph.size} bytes)`);
    
    if (graph.docsUrls.length > 0) {
      console.log(`${indent}  📚 Docs: ${graph.docsUrls[0]}`);
    }
    
    for (const dep of graph.dependencies) {
      this.printDependencyGraph(dep, depth + 1);
    }
  }
  
  async analyzeDependencies(args: string[]) {
    const graph = await this.packageManager.generateDependencyGraph();
    
    console.log('📊 Dependency Analysis:');
    console.log(`Total packages: ${this.countDependencies(graph)}`);
    console.log(`Total size: ${this.formatBytes(graph.size)}`);
    
    // Check for Bun-compatible packages
    const bunPackages = await this.findBunCompatiblePackages(graph);
    if (bunPackages.length > 0) {
      console.log('\n⚡ Bun-compatible packages:');
      bunPackages.forEach(pkg => {
        console.log(`  • ${pkg.name} - ${pkg.docsUrls[0] || 'No docs'}`);
      });
    }
  }
  
  private countDependencies(graph: any): number {
    let count = 1; // Include self
    for (const dep of graph.dependencies) {
      count += this.countDependencies(dep);
    }
    return count;
  }
  
  private async findBunCompatiblePackages(graph: any): Promise<any[]> {
    const compatible: any[] = [];
    
    // Check if package has Bun-specific documentation
    if (graph.docsUrls.some((url: string) => url.includes('bun'))) {
      compatible.push(graph);
    }
    
    for (const dep of graph.dependencies) {
      compatible.push(...await this.findBunCompatiblePackages(dep));
    }
    
    return compatible;
  }
  
  async r2Operations(args: string[]) {
    if (!this.r2Storage) {
      console.error('❌ R2 storage not configured');
      console.log('Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY environment variables');
      return;
    }
    
    const operation = args[0];
    
    switch (operation) {
      case 'list':
        const packages = await this.r2Storage.listPackages();
        console.log('📦 Packages in R2:');
        packages.forEach(pkg => {
          console.log(`  • ${pkg.name} (${pkg.versions.length} versions)`);
          console.log(`    Last updated: ${pkg.lastUpdated}`);
        });
        break;
        
      case 'upload':
        const packageInfo = await this.packageManager.analyzePackage();
        const url = await this.r2Storage.uploadPackageDocs(
          packageInfo.name,
          packageInfo
        );
        console.log(`✅ Uploaded to: ${url}`);
        break;
        
      case 'sync':
        const localCache = new Map(); // TODO: placeholder — populate from actual package cache
        await this.r2Storage.syncPackageCache(
          (await this.packageManager.analyzePackage()).name,
          localCache
        );
        break;
        
      default:
        console.log('Available R2 operations: list, upload, sync');
        break;
    }
  }
  
  async rssOperations(args: string[]) {
    const operation = args[0];
    
    switch (operation) {
      case 'subscribe':
        const [url, name] = args.slice(1);
        await this.rssManager.subscribe(url, name);
        console.log(`✅ Subscribed to ${name}`);
        break;
        
      case 'fetch':
        const feeds = await this.rssManager.fetchAll();
        console.log('📰 Latest updates:');
        
        for (const [name, feed] of feeds) {
          console.log(`\n${name}:`);
          feed.items.slice(0, 3).forEach(item => {
            console.log(`  • ${item.title}`);
            console.log(`    ${item.link}`);
          });
        }
        break;
        
      case 'package':
        const packageName = args[1] || (await this.packageManager.analyzePackage()).name;
        const packageFeeds = await this.rssManager.getPackageFeeds(packageName);
        
        console.log(`📦 RSS feeds for ${packageName}:`);
        packageFeeds.forEach(feed => {
          console.log(`\n${feed.title}:`);
          feed.items.slice(0, 2).forEach(item => {
            console.log(`  • ${item.title}`);
          });
        });
        break;
        
      case 'generate':
        const pkgInfo = await this.packageManager.analyzePackage();
        const feed = await this.rssManager.generatePackageFeed(pkgInfo.name, pkgInfo);
        
        if (this.r2Storage) {
          const feedUrl = await this.rssManager.publishPackageFeed(pkgInfo.name, feed);
          console.log(`✅ Published RSS feed: ${feedUrl}`);
        } else {
          const xml = generateRSS(feed);
          await Bun.write('./docs/feed.rss', xml);
          console.log('✅ Generated feed.rss');
        }
        break;
        
      default:
        console.log('Available RSS operations: subscribe, fetch, package, generate');
        break;
    }
  }
  
  async syncAll(args: string[]) {
    console.log('🔄 Synchronizing everything...');
    
    // Sync package to R2
    if (this.r2Storage) {
      const packageInfo = await this.packageManager.analyzePackage();
      await this.r2Storage.uploadPackageDocs(packageInfo.name, packageInfo);
      console.log('✅ Package docs uploaded to R2');
    }
    
    // Update RSS feeds
    await this.rssManager.fetchAll();
    console.log('✅ RSS feeds updated');
    
    console.log('\n🎉 All systems synchronized!');
  }
  
  async serveDocs(args: string[]) {
    const portArg = args.find(arg => arg.startsWith('--port='));
    const port = parseInt(portArg?.split('=')[1] || '3000', 10);
    
    console.log(`🌐 Starting documentation server on http://localhost:${port}`);
    
    const server = Bun.serve({
      port,
      async fetch(req) {
        const url = new URL(req.url);
        
        // Serve package documentation
        if (url.pathname === '/') {
          const packageInfo = await new PackageManager().analyzePackage();
          const html = await generatePackagePage(packageInfo);
          return new Response(html, { headers: { 'Content-Type': 'text/html' } });
        }
        
        // Serve RSS feed
        if (url.pathname === '/feed.rss') {
          const packageInfo = await new PackageManager().analyzePackage();
          const rssManager = new RSSManager();
          const feed = await rssManager.generatePackageFeed(packageInfo.name, packageInfo);
          return new Response(generateRSS(feed), { 
            headers: { 'Content-Type': 'application/rss+xml' } 
          });
        }
        
        // API endpoints
        if (url.pathname === '/api/docs') {
          const packageInfo = await new PackageManager().analyzePackage();
          return new Response(JSON.stringify(packageInfo, null, 2), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        return new Response('Not found', { status: 404 });
      }
    });
    
    console.log(`Server running at ${server.url}`);
    console.log('Press Ctrl+C to stop');
  }
  
  async publishPackage(args: string[]) {
    console.log('🚀 Publishing package documentation...');
    
    const packageInfo = await this.packageManager.analyzePackage();
    
    // Generate documentation
    const docs = {
      package: packageInfo,
      timestamp: new Date().toISOString(),
      bunVersion: Bun.version
    };
    
    // Upload to R2
    if (this.r2Storage) {
      const url = await this.r2Storage.uploadPackageDocs(packageInfo.name, docs);
      console.log(`✅ Published to: ${url}`);
    }
    
    // Generate RSS feed
    const feed = await this.rssManager.generatePackageFeed(packageInfo.name, packageInfo);
    
    if (this.r2Storage) {
      const feedUrl = await this.rssManager.publishPackageFeed(packageInfo.name, feed);
      console.log(`✅ RSS feed: ${feedUrl}`);
    }
    
    // Create deployment summary
    const summary = {
      package: packageInfo.name,
      version: packageInfo.version,
      publishedAt: new Date().toISOString(),
      documentationUrl: this.r2Storage ? 
        `https://${this.r2Storage['config'].defaultBucket}.r2.dev/packages/${packageInfo.name}/` :
        'R2 not configured',
      bunApis: packageInfo.bunDocs?.length || 0,
      dependencies: Object.keys(packageInfo.dependencies || {}).length
    };
    
    await Bun.write('./docs/deployment.json', JSON.stringify(summary, null, 2));
    console.log('✅ Deployment summary saved to docs/deployment.json');
  }
  
  private hasR2Credentials(): boolean {
    return !!(Bun.env.R2_ACCOUNT_ID &&
              Bun.env.R2_ACCESS_KEY_ID &&
              Bun.env.R2_SECRET_ACCESS_KEY);
  }

  private loadR2Config(): R2StorageConfig {
    return {
      accountId: Bun.env.R2_ACCOUNT_ID!,
      accessKeyId: Bun.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: Bun.env.R2_SECRET_ACCESS_KEY!,
      defaultBucket: Bun.env.R2_BUCKET || 'bun-docs-global'
    };
  }
  
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
  
  private showHelp() {
    console.log(`
🚀 Bun Documentation CLI

Commands:
  init [name]          Initialize a new project with documentation
  analyze [--graph]    Analyze package for Bun APIs
  deps                 Analyze dependencies
  r2 <op>              R2 operations (list, upload, sync)
  rss <op>             RSS operations (subscribe, fetch, package, generate)
  sync                 Sync everything to R2
  serve [--port=3000]  Start documentation server
  publish              Publish documentation to R2

Examples:
  bun-docs init my-project
  bun-docs analyze --graph
  bun-docs rss subscribe https://bun.sh/rss.xml "Bun Blog"
  bun-docs serve --port=8080
  bun-docs publish
`);
  }
}

// Helper function to generate package page
async function generatePackagePage(packageInfo: PackageInfo): Promise<string> {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>${packageInfo.name} - Documentation</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        :root { --primary: #00b4d8; --secondary: #0077b6; }
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 2rem; }
        header { background: linear-gradient(135deg, var(--primary), var(--secondary)); color: white; padding: 2rem; border-radius: 12px; }
        .api-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; margin: 2rem 0; }
        .api-card { border: 1px solid #e0e0e0; padding: 1rem; border-radius: 8px; }
        .feed-item { border-left: 3px solid var(--primary); padding-left: 1rem; margin: 1rem 0; }
    </style>
</head>
<body>
    <header>
        <h1>${packageInfo.name}</h1>
        <p>${packageInfo.description || 'No description'}</p>
        <p>Version: ${packageInfo.version} | Bun: ${Bun.version}</p>
    </header>
    
    <main>
        <section id="apis">
            <h2>Bun APIs Used</h2>
            <div class="api-grid">
                ${packageInfo.bunDocs?.map(doc => `
                <div class="api-card">
                    <h3>${doc.api}</h3>
                    <p>Category: ${doc.category}</p>
                    <a href="${doc.url}" target="_blank">Documentation →</a>
                </div>
                `).join('') || '<p>No Bun APIs detected</p>'}
            </div>
        </section>
        
        <section id="rss">
            <h2>Latest Updates</h2>
            <div id="rss-feed"></div>
        </section>
        
        <section id="dependencies">
            <h2>Dependencies</h2>
            <pre>${JSON.stringify(packageInfo.dependencies, null, 2)}</pre>
        </section>
    </main>
    
    <script>
        // Load RSS feed
        fetch('/feed.rss')
            .then(r => r.text())
            .then(xml => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(xml, 'text/xml');
                const items = doc.querySelectorAll('item');
                
                const feedContainer = document.getElementById('rss-feed');
                items.forEach(item => {
                    const title = item.querySelector('title')?.textContent || '';
                    const link = item.querySelector('link')?.textContent || '';
                    feedContainer.innerHTML += \`
                        <div class="feed-item">
                            <h3>\${title}</h3>
                            <a href="\${link}">Read more →</a>
                        </div>
                    \`;
                });
            })
            .catch(() => {});
    </script>
</body>
</html>`;
}

// Helper function to generate RSS
function generateRSS(feed: RSSFeed): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${feed.title}</title>
    <link>${feed.link}</link>
    <description>${feed.description}</description>
    <lastBuildDate>${feed.lastBuildDate}</lastBuildDate>
    <ttl>${feed.ttl}</ttl>
    ${feed.items.map(item => `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${item.link}</link>
      <description><![CDATA[${item.description}]]></description>
      <pubDate>${item.pubDate}</pubDate>
      <guid>${item.guid}</guid>
    </item>
    `).join('')}
  </channel>
</rss>`;
}

// Run CLI
const cli = new IntegratedCLI();
await cli.run();
process.exit(0);
