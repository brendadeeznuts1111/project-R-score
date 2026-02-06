#!/usr/bin/env bun

/**
 * 📦 Package Management Integration Layer
 *
 * Analyzes packages for Bun API usage, generates documentation,
 * and integrates with R2 storage and RSS feeds.
 */

export interface PackageInfo {
  name: string;
  version: string;
  description: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  bunDocs?: Array<{
    api: string;
    url: string;
    category: string;
  }>;
  r2Config?: {
    bucket: string;
    prefix: string;
  };
  rssFeed?: string;
}

export interface PackageDependencyGraph {
  name: string;
  version: string;
  dependencies: PackageDependencyGraph[];
  size: number;
  docsUrls: string[];
}

export class PackageManager {
  private projectRoot: string;
  private cacheDir: string;
  private r2Storage?: any; // R2Storage type

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.cacheDir = `${process.env.HOME || process.env.USERPROFILE || '/tmp'}/.cache/bun-docs/packages`;
    try {
      Bun.$`mkdir -p ${this.cacheDir}`.quiet();
    } catch {
      // Ignore if mkdir fails
    }
  }

  async analyzePackage(): Promise<PackageInfo> {
    const packageJsonPath = `${this.projectRoot}/package.json`;

    if (!(await Bun.file(packageJsonPath).exists())) {
      throw new Error('No package.json found');
    }

    const pkg = (await Bun.file(packageJsonPath).json()) as any;

    // Scan for Bun-specific APIs used
    const bunApis = await this.scanForBunAPIs();

    // Generate R2 configuration
    const r2Config = await this.generateR2Config(pkg.name);

    // Check for RSS feeds in dependencies
    const rssFeed = await this.findRSSFeeds(pkg);

    return {
      name: pkg.name || 'unknown',
      version: pkg.version || '1.0.0',
      description: pkg.description || '',
      dependencies: pkg.dependencies || {},
      devDependencies: pkg.devDependencies || {},
      bunDocs: bunApis,
      r2Config,
      rssFeed,
    };
  }

  private async scanForBunAPIs(): Promise<Array<{ api: string; url: string; category: string }>> {
    const apis: Array<{ api: string; url: string; category: string }> = [];

    try {
      // Scan project files for Bun API usage
      const scanner = new Bun.Glob('**/*.{ts,js,tsx,jsx}');

      for await (const file of scanner.scan({ cwd: this.projectRoot, absolute: false })) {
        try {
          const content = await Bun.file(`${this.projectRoot}/${file}`).text();

          // Match Bun.xxx patterns
          const bunMatches = content.match(/Bun\.(\w+)/g) || [];
          const apiMatches = content.match(/import.*from ['"]bun['"]/g) || [];

          // Map to documentation
          for (const match of [...bunMatches, ...apiMatches]) {
            const api = match.replace('Bun.', '').replace(/import.*from ['"]bun['"]/, 'bun');
            if (api && !apis.find(a => a.api === api)) {
              const doc = await this.getAPIDocumentation(api);
              if (doc) apis.push(doc);
            }
          }
        } catch {
          // Skip files that can't be read
        }
      }
    } catch {
      // If scanning fails, return empty array
    }

    return apis;
  }

  private async getAPIDocumentation(
    api: string
  ): Promise<{ api: string; url: string; category: string } | null> {
    try {
      // Try to import the docs fetcher
      const { EnhancedDocsFetcher } = await import('../docs/index-fetcher-enhanced.ts');
      const fetcher = new EnhancedDocsFetcher();
      const results = await fetcher.search(api);

      if (results.length > 0) {
        return {
          api,
          url: results[0].domains?.com || `https://bun.sh/docs/api/${api}`,
          category: results[0].category || 'api',
        };
      }
    } catch {
      // Fallback to basic URL
      return {
        api,
        url: `https://bun.sh/docs/api/${api}`,
        category: 'api',
      };
    }

    return null;
  }

  private async generateR2Config(packageName: string) {
    const sanitizedName = packageName.replace(/[@/]/g, '-');
    return {
      bucket: `bun-docs-${sanitizedName}`,
      prefix: `v${Date.now()}`,
    };
  }

  private async findRSSFeeds(pkg: any): Promise<string | undefined> {
    // Check for RSS feed in package.json
    if (pkg.rss) return pkg.rss;

    // Check dependencies for known RSS-capable packages
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const rssPackages = ['rss-parser', 'feed', 'rss-feed-emitter'];

    for (const dep of Object.keys(allDeps)) {
      if (rssPackages.includes(dep)) {
        // Try to get RSS feed from package documentation
        return `https://www.npmjs.com/package/${dep}/rss`;
      }
    }
  }

  async generateDependencyGraph(): Promise<PackageDependencyGraph> {
    const pkg = await this.analyzePackage();

    const graph: PackageDependencyGraph = {
      name: pkg.name,
      version: pkg.version,
      dependencies: [],
      size: 0,
      docsUrls: pkg.bunDocs?.map(d => d.url) || [],
    };

    // Analyze dependencies
    for (const [dep, version] of Object.entries(pkg.dependencies || {})) {
      const depInfo = await this.analyzeDependency(dep, version as string);
      graph.dependencies.push(depInfo);
      graph.size += depInfo.size;
    }

    return graph;
  }

  private async analyzeDependency(name: string, version: string): Promise<PackageDependencyGraph> {
    // Try to fetch from npm registry
    try {
      const response = await fetch(`https://registry.npmjs.org/${name}/${version}`);
      if (response.ok) {
        const pkg = (await response.json()) as any;

        return {
          name,
          version,
          dependencies: [],
          size: pkg.dist?.size || 0,
          docsUrls: [`https://www.npmjs.com/package/${name}`],
        };
      }
    } catch {
      // Fallback if fetch fails
    }

    return {
      name,
      version,
      dependencies: [],
      size: 0,
      docsUrls: [],
    };
  }

  async installMissingDocs(): Promise<void> {
    console.log('📦 Installing documentation dependencies...');

    const pkg = await this.analyzePackage();
    const docsDependencies = ['@types/bun', 'bun-types', 'rss-parser', '@cloudflare/wrangler'];

    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const missing = docsDependencies.filter(dep => !allDeps[dep]);

    if (missing.length > 0) {
      console.log(`Installing: ${missing.join(', ')}`);
      try {
        await Bun.$`bun add -d ${missing.join(' ')}`.quiet();
      } catch {
        console.warn('Failed to install dependencies automatically');
      }
    } else {
      console.log('✅ All documentation dependencies already installed');
    }
  }
}
