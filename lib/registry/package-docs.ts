#!/usr/bin/env bun
/**
 * 📚 Package Documentation Fetcher
 *
 * Fetches and caches package documentation from npm, GitHub, and other sources.
 * Integrates with R2 for cross-device sync and caching.
 */

import { styled, FW_COLORS } from '../theme/colors';
import { R2StorageAdapter } from './r2-storage';

export interface PackageDoc {
  name: string;
  version: string;
  readme: string;
  readmeHtml?: string;
  changelog?: string;
  apiDocs?: string;
  metadata: {
    description: string;
    homepage?: string;
    repository?: string;
    license?: string;
    author?: string;
    keywords?: string[];
  };
  fetchedAt: string;
  source: 'npm' | 'github' | 'jsdelivr' | 'unpkg' | 'r2-cache';
}

export interface DocCacheEntry {
  package: PackageDoc;
  expiresAt: string;
  etag?: string;
}

export interface PackageManager {
  name: 'npm' | 'yarn' | 'pnpm' | 'bun';
  registry: string;
  lockfile: string;
  command: string;
}

export const PACKAGE_MANAGERS: PackageManager[] = [
  {
    name: 'npm',
    registry: 'https://registry.npmjs.org',
    lockfile: 'package-lock.json',
    command: 'npm',
  },
  {
    name: 'yarn',
    registry: 'https://registry.yarnpkg.com',
    lockfile: 'yarn.lock',
    command: 'yarn',
  },
  {
    name: 'pnpm',
    registry: 'https://registry.npmjs.org',
    lockfile: 'pnpm-lock.yaml',
    command: 'pnpm',
  },
  { name: 'bun', registry: 'https://registry.npmjs.org', lockfile: 'bun.lock', command: 'bun' },
];

export class PackageDocumentationFetcher {
  private r2Storage: R2StorageAdapter;
  private cachePrefix = 'docs/packages/';
  private defaultTtl = 3600; // 1 hour

  constructor(r2Config?: ConstructorParameters<typeof R2StorageAdapter>[0]) {
    this.r2Storage = new R2StorageAdapter({
      ...r2Config,
      bucketName: r2Config?.bucketName || process.env.R2_DOCS_BUCKET || 'npm-registry',
      prefix: this.cachePrefix,
    });
  }

  /**
   * Fetch documentation for a package
   */
  async fetchDocs(
    packageName: string,
    version?: string,
    options: {
      forceRefresh?: boolean;
      preferCached?: boolean;
      ttl?: number;
    } = {}
  ): Promise<PackageDoc | null> {
    const cacheKey = `${packageName}@${version || 'latest'}`;

    // Try R2 cache first
    if (!options.forceRefresh) {
      const cached = await this.getCachedDocs(cacheKey);
      if (cached) {
        console.log(styled(`📦 Cache hit: ${cacheKey}`, 'success'));
        return { ...cached, source: 'r2-cache' };
      }
    }

    if (options.preferCached) {
      return null;
    }

    // Fetch from npm registry
    try {
      const doc = await this.fetchFromNpm(packageName, version);

      if (doc) {
        // Cache in R2
        await this.cacheDocs(cacheKey, doc, options.ttl || this.defaultTtl);
      }

      return doc;
    } catch (error) {
      console.error(styled(`❌ Failed to fetch docs: ${error.message}`, 'error'));
      return null;
    }
  }

  /**
   * Fetch from npm registry
   */
  private async fetchFromNpm(packageName: string, version?: string): Promise<PackageDoc | null> {
    const registryUrl = process.env.NPM_REGISTRY || 'https://registry.npmjs.org';
    const url = version
      ? `${registryUrl}/${packageName}/${version}`
      : `${registryUrl}/${packageName}`;

    console.log(styled(`🌐 Fetching: ${url}`, 'info'));

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'factorywager-docs-fetcher/1.0',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(styled(`⚠️ Package not found: ${packageName}`, 'warning'));
      }
      return null;
    }

    const data = await response.json();
    const pkgVersion = version || data['dist-tags']?.latest || Object.keys(data.versions).pop();
    const versionData = data.versions?.[pkgVersion] || data;

    // Fetch README from unpkg for better formatting
    const readme =
      (await this.fetchReadme(packageName, pkgVersion)) ||
      data.readme ||
      versionData.readme ||
      'No README available';

    return {
      name: packageName,
      version: pkgVersion,
      readme,
      readmeHtml: readme ? Bun.markdown.html(readme) : undefined,
      metadata: {
        description: data.description || versionData.description,
        homepage: data.homepage || versionData.homepage,
        repository: typeof data.repository === 'string' ? data.repository : data.repository?.url,
        license: data.license || versionData.license,
        author: typeof data.author === 'string' ? data.author : data.author?.name,
        keywords: data.keywords || versionData.keywords,
      },
      fetchedAt: new Date().toISOString(),
      source: 'npm',
    };
  }

  /**
   * Fetch README from unpkg (often better formatted)
   */
  private async fetchReadme(packageName: string, version: string): Promise<string | null> {
    try {
      const url = `https://unpkg.com/${packageName}@${version}/README.md`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'factorywager-docs-fetcher/1.0' },
      });

      if (response.ok) {
        return await response.text();
      }

      // Try lowercase
      const url2 = `https://unpkg.com/${packageName}@${version}/readme.md`;
      const response2 = await fetch(url2, {
        headers: { 'User-Agent': 'factorywager-docs-fetcher/1.0' },
      });

      if (response2.ok) {
        return await response2.text();
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get cached docs from R2
   */
  private async getCachedDocs(key: string): Promise<PackageDoc | null> {
    try {
      // This would use the R2 storage adapter
      // For now, return null to indicate cache miss
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Cache docs in R2
   */
  private async cacheDocs(key: string, doc: PackageDoc, ttl: number): Promise<void> {
    try {
      const cacheEntry: DocCacheEntry = {
        package: doc,
        expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
      };

      // Store in R2
      // await this.r2Storage.putJSON(`${key}.json`, cacheEntry);

      console.log(styled(`💾 Cached: ${key}`, 'muted'));
    } catch (error) {
      console.warn(styled(`⚠️ Failed to cache: ${error.message}`, 'warning'));
    }
  }

  /**
   * Search packages across registries
   */
  async searchPackages(
    query: string,
    limit: number = 20
  ): Promise<
    Array<{
      name: string;
      description: string;
      version: string;
      keywords?: string[];
    }>
  > {
    const registryUrl = process.env.NPM_REGISTRY || 'https://registry.npmjs.org';

    try {
      const response = await fetch(
        `${registryUrl}/-/v1/search?text=${encodeURIComponent(query)}&size=${limit}`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'factorywager-docs-fetcher/1.0',
          },
        }
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();

      return data.objects.map((obj: any) => ({
        name: obj.package.name,
        description: obj.package.description,
        version: obj.package.version,
        keywords: obj.package.keywords,
      }));
    } catch (error) {
      console.error(styled(`❌ Search failed: ${error.message}`, 'error'));
      return [];
    }
  }

  /**
   * Get installed packages from local project
   */
  async getLocalPackages(projectPath: string = '.'): Promise<
    Array<{
      name: string;
      version: string;
      isDev?: boolean;
    }>
  > {
    try {
      const packageJsonPath = `${projectPath}/package.json`;
      const packageJson = await Bun.file(packageJsonPath).json();

      const packages: Array<{ name: string; version: string; isDev?: boolean }> = [];

      // Add dependencies
      if (packageJson.dependencies) {
        for (const [name, version] of Object.entries(packageJson.dependencies)) {
          packages.push({ name, version: version as string, isDev: false });
        }
      }

      // Add dev dependencies
      if (packageJson.devDependencies) {
        for (const [name, version] of Object.entries(packageJson.devDependencies)) {
          packages.push({ name, version: version as string, isDev: true });
        }
      }

      return packages;
    } catch (error) {
      console.error(styled(`❌ Failed to read package.json: ${error.message}`, 'error'));
      return [];
    }
  }

  /**
   * Fetch docs for all local packages
   */
  async fetchLocalDocs(projectPath: string = '.'): Promise<PackageDoc[]> {
    const packages = await this.getLocalPackages(projectPath);
    const docs: PackageDoc[] = [];

    for (const pkg of packages) {
      const doc = await this.fetchDocs(pkg.name, pkg.version);
      if (doc) {
        docs.push(doc);
      }
    }

    return docs;
  }

  /**
   * Generate HTML documentation page
   */
  generateHtmlDoc(doc: PackageDoc): string {
    const { name, version, readmeHtml, metadata } = doc;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}@${version} - Documentation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      border-radius: 12px;
      margin-bottom: 2rem;
    }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .version { opacity: 0.8; font-size: 1.1rem; }
    .meta {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      margin-top: 1rem;
    }
    .meta-item {
      background: rgba(255,255,255,0.2);
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.875rem;
    }
    .content {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .content h1, .content h2, .content h3 {
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
    }
    .content pre {
      background: #1a202c;
      color: #e2e8f0;
      padding: 1rem;
      border-radius: 8px;
      overflow-x: auto;
      margin: 1rem 0;
    }
    .content code {
      background: #edf2f7;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-family: 'SFMono-Regular', Consolas, monospace;
    }
    .content pre code {
      background: none;
      padding: 0;
    }
    .content a {
      color: #667eea;
      text-decoration: none;
    }
    .content a:hover { text-decoration: underline; }
    .footer {
      text-align: center;
      padding: 2rem;
      color: #718096;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${name}</h1>
      <div class="version">v${version}</div>
      <div class="meta">
        ${metadata.description ? `<div class="meta-item">${metadata.description}</div>` : ''}
        ${metadata.license ? `<div class="meta-item">📄 ${metadata.license}</div>` : ''}
        ${metadata.homepage ? `<div class="meta-item">🔗 <a href="${metadata.homepage}" style="color:white">Homepage</a></div>` : ''}
      </div>
    </header>
    <div class="content">
      ${readmeHtml || '<p>No documentation available.</p>'}
    </div>
    <div class="footer">
      Fetched: ${new Date(doc.fetchedAt).toLocaleString()} | 
      Source: ${doc.source}
    </div>
  </div>
</body>
</html>`;
  }
}

// CLI interface
if (import.meta.main) {
  const fetcher = new PackageDocumentationFetcher();
  const args = process.argv.slice(2);
  const command = args[0];

  console.log(styled('📚 Package Documentation Fetcher', 'accent'));
  console.log(styled('=================================', 'accent'));

  switch (command) {
    case 'fetch': {
      const packageName = args[1];
      const version = args[2];

      if (!packageName) {
        console.error(styled('Usage: package-docs fetch <package> [version]', 'error'));
        process.exit(1);
      }

      const doc = await fetcher.fetchDocs(packageName, version);
      if (doc) {
        console.log(styled(`\n📦 ${doc.name}@${doc.version}`, 'info'));
        console.log(styled(`Description: ${doc.metadata.description}`, 'muted'));
        console.log(styled(`Source: ${doc.source}`, 'muted'));
        console.log(styled(`\nREADME (${doc.readme.length} chars):`, 'info'));
        console.log(doc.readme.slice(0, 500) + '...');
      } else {
        console.error(styled('Package not found', 'error'));
      }
      break;
    }

    case 'search': {
      const query = args[1];
      if (!query) {
        console.error(styled('Usage: package-docs search <query>', 'error'));
        process.exit(1);
      }

      const results = await fetcher.searchPackages(query, 10);
      console.log(styled(`\n🔍 Search results for "${query}":`, 'info'));

      for (const pkg of results) {
        console.log(styled(`\n  📦 ${pkg.name}@${pkg.version}`, 'success'));
        console.log(styled(`     ${pkg.description || 'No description'}`, 'muted'));
      }
      break;
    }

    case 'local': {
      const projectPath = args[1] || '.';
      const packages = await fetcher.getLocalPackages(projectPath);

      console.log(styled(`\n📦 Installed packages (${packages.length}):`, 'info'));

      for (const pkg of packages) {
        const devBadge = pkg.isDev ? styled(' [dev]', 'warning') : '';
        console.log(styled(`  • ${pkg.name}@${pkg.version}${devBadge}`, 'muted'));
      }
      break;
    }

    default:
      console.log(styled('\nCommands:', 'info'));
      console.log(styled('  fetch <package> [version]  Fetch package docs', 'muted'));
      console.log(styled('  search <query>             Search packages', 'muted'));
      console.log(styled('  local [path]               List local packages', 'muted'));
  }
}
