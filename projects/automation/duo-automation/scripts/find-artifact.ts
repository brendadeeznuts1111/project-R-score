#!/usr/bin/env bun

/**
 * Intelligent Search CLI for Artifact Discovery
 * Enhanced artifact search with multi-tag queries, status filtering, and multiple output formats
 */

import { join, extname } from 'path';

interface SearchOptions {
  tags?: string[];
  status?: string[];
  domain?: string[];
  output?: 'table' | 'json' | 'csv' | 'paths';
  fuzzy?: boolean;
  caseSensitive?: boolean;
  maxResults?: number;
}

interface ArtifactInfo {
  path: string;
  tags: string[];
  status?: string;
  domain?: string;
  audience?: string[];
  lastModified: Date;
  size: number;
  type: string;
}

class ArtifactSearchEngine {
  private artifactCache: Map<string, ArtifactInfo> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private initialized = false;

  /**
   * Initialize the search engine with artifact indexing
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🔍 Initializing artifact search engine...');
    const startTime = Date.now();

    await this.indexArtifacts('./');
    this.buildTagIndex();

    const elapsed = Date.now() - startTime;
    console.log(`✅ Indexed ${this.artifactCache.size} artifacts in ${elapsed}ms`);
    this.initialized = true;
  }

  /**
   * Search artifacts by tags, status, and domain
   */
  async search(options: SearchOptions): Promise<ArtifactInfo[]> {
    await this.initialize();

    let results = Array.from(this.artifactCache.values());

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      results = this.filterByTags(results, options.tags, options.fuzzy || false);
    }

    // Filter by status
    if (options.status && options.status.length > 0) {
      results = results.filter(artifact => 
        options.status!.some(status => 
          artifact.status?.toLowerCase().includes(status.toLowerCase())
        )
      );
    }

    // Filter by domain
    if (options.domain && options.domain.length > 0) {
      results = results.filter(artifact => 
        options.domain!.some(domain => 
          artifact.domain?.toLowerCase().includes(domain.toLowerCase())
        )
      );
    }

    // Apply limit
    if (options.maxResults) {
      results = results.slice(0, options.maxResults);
    }

    return results;
  }

  /**
   * Output search results in specified format
   */
  outputResults(results: ArtifactInfo[], format: string = 'table'): void {
    switch (format) {
      case 'json':
        console.log(JSON.stringify(results, null, 2));
        break;
      case 'csv':
        this.outputCSV(results);
        break;
      case 'paths':
        results.forEach(artifact => console.log(artifact.path));
        break;
      case 'table':
      default:
        this.outputTable(results);
        break;
    }
  }

  /**
   * Get search statistics
   */
  getStats(): {
    totalArtifacts: number;
    totalTags: number;
    tagDistribution: Record<string, number>;
    statusDistribution: Record<string, number>;
    domainDistribution: Record<string, number>;
  } {
    const tagDistribution: Record<string, number> = {};
    const statusDistribution: Record<string, number> = {};
    const domainDistribution: Record<string, number> = {};

    this.artifactCache.forEach(artifact => {
      // Count tags
      artifact.tags.forEach(tag => {
        tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
      });

      // Count statuses
      if (artifact.status) {
        statusDistribution[artifact.status] = (statusDistribution[artifact.status] || 0) + 1;
      }

      // Count domains
      if (artifact.domain) {
        domainDistribution[artifact.domain] = (domainDistribution[artifact.domain] || 0) + 1;
      }
    });

    return {
      totalArtifacts: this.artifactCache.size,
      totalTags: this.tagIndex.size,
      tagDistribution,
      statusDistribution,
      domainDistribution
    };
  }

  /**
   * Suggest tags based on partial input
   */
  suggestTags(partial: string, limit: number = 10): string[] {
    const suggestions = Array.from(this.tagIndex.keys())
      .filter(tag => tag.toLowerCase().includes(partial.toLowerCase()))
      .slice(0, limit);
    
    return suggestions;
  }

  /**
   * Index all artifacts in the repository
   */
  private async indexArtifacts(rootPath: string): Promise<void> {
    const excludeDirs = [
      '.git', 'node_modules', '.bun', 'dist', 'build', 'coverage',
      '.next', '.nuxt', '.cache', 'tmp', 'temp'
    ];

    const indexDirectory = (dirPath: string): void => {
      try {
        const entries = readdirSync(dirPath);

        for (const entry of entries) {
          const fullPath = join(dirPath, entry);
          const stat = statSync(fullPath);

          if (stat.isDirectory() && !excludeDirs.includes(entry)) {
            indexDirectory(fullPath);
          } else if (stat.isFile()) {
            this.indexArtifact(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };

    indexDirectory(rootPath);
  }

  /**
   * Index a single artifact file
   */
  private indexArtifact(filePath: string): void {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const artifact = this.extractMetadata(filePath, content);
      
      if (artifact.tags.length > 0) {
        this.artifactCache.set(filePath, artifact);
      }
    } catch (error) {
      // Skip files we can't read
    }
  }

  /**
   * Extract metadata from file content
   */
  private extractMetadata(filePath: string, content: string): ArtifactInfo {
    const tags = this.extractTags(content);
    const status = this.extractStatus(content);
    const domain = this.extractDomain(content);
    const audience = this.extractAudience(content);
    
    const stat = statSync(filePath);
    const ext = extname(filePath);

    return {
      path: filePath,
      tags,
      status,
      domain,
      audience,
      lastModified: stat.mtime,
      size: stat.size,
      type: this.getFileType(ext)
    };
  }

  /**
   * Extract tags from content
   */
  private extractTags(content: string): string[] {
    const tagRegex = /#[a-z0-9-]+/g;
    const matches = content.match(tagRegex) || [];
    return [...new Set(matches)].sort();
  }

  /**
   * Extract status from content
   */
  private extractStatus(content: string): string | undefined {
    const statusRegex = /#(ready|wip|review|blocked|deprecated)/i;
    const match = content.match(statusRegex);
    return match ? `#${match[1].toLowerCase()}` : undefined;
  }

  /**
   * Extract domain from content
   */
  private extractDomain(content: string): string | undefined {
    const domainTags = [
      '#config-management', '#security', '#devops', '#monitoring',
      '#authentication', '#authorization', '#database', '#api',
      '#ui', '#testing', '#documentation', '#performance'
    ];
    
    return domainTags.find(tag => content.includes(tag));
  }

  /**
   * Extract audience from content
   */
  private extractAudience(content: string): string[] {
    const audienceTags = ['#developers', '#devops', '#security', '#users', '#admins', '#all'];
    return audienceTags.filter(tag => content.includes(tag));
  }

  /**
   * Get file type from extension
   */
  private getFileType(ext: string): string {
    const typeMap: Record<string, string> = {
      '.ts': 'typescript',
      '.js': 'javascript',
      '.tsx': 'typescript-react',
      '.jsx': 'javascript-react',
      '.md': 'markdown',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.toml': 'toml',
      '.html': 'html',
      '.css': 'css',
      '.sh': 'shell',
      '.py': 'python'
    };
    
    return typeMap[ext] || 'unknown';
  }

  /**
   * Build tag index for fast lookups
   */
  private buildTagIndex(): void {
    this.tagIndex.clear();
    
    this.artifactCache.forEach((artifact, path) => {
      artifact.tags.forEach(tag => {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(path);
      });
    });
  }

  /**
   * Filter artifacts by tags
   */
  private filterByTags(artifacts: ArtifactInfo[], tags: string[], fuzzy: boolean): ArtifactInfo[] {
    return artifacts.filter(artifact => {
      if (fuzzy) {
        // Fuzzy matching - artifact must contain at least one of the tags
        return tags.some(searchTag => 
          artifact.tags.some(artifactTag => 
            artifactTag.toLowerCase().includes(searchTag.toLowerCase())
          )
        );
      } else {
        // Exact matching - artifact must contain all specified tags
        return tags.every(searchTag => 
          artifact.tags.some(artifactTag => 
            artifactTag.toLowerCase() === searchTag.toLowerCase()
          )
        );
      }
    });
  }

  /**
   * Output results as table
   */
  private outputTable(results: ArtifactInfo[]): void {
    if (results.length === 0) {
      console.log('No artifacts found matching your criteria.');
      return;
    }

    console.log('\n📋 Search Results:');
    console.log('─'.repeat(120));
    
    results.forEach((artifact, index) => {
      const tagsStr = artifact.tags.slice(0, 3).join(', ') + 
                      (artifact.tags.length > 3 ? '...' : '');
      const statusStr = artifact.status || 'N/A';
      const domainStr = artifact.domain || 'N/A';
      
      console.log(`${(index + 1).toString().padStart(3)}. ${artifact.path}`);
      console.log(`     Tags: ${tagsStr}`);
      console.log(`     Status: ${statusStr} | Domain: ${domainStr} | Type: ${artifact.type}`);
      console.log(`     Modified: ${artifact.lastModified.toLocaleDateString()} | Size: ${artifact.size} bytes`);
      console.log('');
    });
    
    console.log(`Found ${results.length} artifact(s)`);
  }

  /**
   * Output results as CSV
   */
  private outputCSV(results: ArtifactInfo[]): void {
    console.log('Path,Tags,Status,Domain,Type,LastModified,Size');
    
    results.forEach(artifact => {
      const row = [
        `"${artifact.path}"`,
        `"${artifact.tags.join(';')}"`,
        `"${artifact.status || ''}"`,
        `"${artifact.domain || ''}"`,
        `"${artifact.type}"`,
        `"${artifact.lastModified.toISOString()}"`,
        artifact.size.toString()
      ];
      
      console.log(row.join(','));
    });
  }
}

/**
 * CLI interface for artifact search
 */
async function main() {
  const args = process.argv.slice(2);
  const options: SearchOptions = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--tag':
      case '-t':
        options.tags = args[++i]?.split(',') || [];
        break;
      case '--status':
      case '-s':
        options.status = args[++i]?.split(',') || [];
        break;
      case '--domain':
      case '-d':
        options.domain = args[++i]?.split(',') || [];
        break;
      case '--output':
      case '-o':
        options.output = args[++i] as any;
        break;
      case '--fuzzy':
      case '-f':
        options.fuzzy = true;
        break;
      case '--max-results':
      case '-m':
        options.maxResults = parseInt(args[++i]) || undefined;
        break;
      case '--stats':
        const engine = new ArtifactSearchEngine();
        await engine.initialize();
        const stats = engine.getStats();
        console.log('📊 Search Engine Statistics:');
        console.log(`Total Artifacts: ${stats.totalArtifacts}`);
        console.log(`Total Tags: ${stats.totalTags}`);
        console.log('\nTag Distribution:');
        Object.entries(stats.tagDistribution)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .forEach(([tag, count]) => console.log(`  ${tag}: ${count}`));
        return;
      case '--suggest':
        const partial = args[++i] || '';
        const suggestEngine = new ArtifactSearchEngine();
        await suggestEngine.initialize();
        const suggestions = suggestEngine.suggestTags(partial);
        console.log(`💡 Tag suggestions for "${partial}":`);
        suggestions.forEach(tag => console.log(`  ${tag}`));
        return;
      case '--help':
      case '-h':
        console.log(`
🔍 Artifact Search CLI

Usage: bun run scripts/find-artifact.ts [options]

Options:
  -t, --tag <tags>        Filter by tags (comma-separated)
  -s, --status <status>   Filter by status (ready,wip,review,blocked,deprecated)
  -d, --domain <domain>   Filter by domain
  -o, --output <format>   Output format: table, json, csv, paths
  -f, --fuzzy            Enable fuzzy tag matching
  -m, --max-results <n>   Limit number of results
  --stats                 Show search engine statistics
  --suggest <partial>     Suggest tags based on partial input
  -h, --help              Show this help

Examples:
  bun run scripts/find-artifact.ts --tag "#devops,#typescript"
  bun run scripts/find-artifact.ts --status "ready" --output json
  bun run scripts/find-artifact.ts --domain "#security" --fuzzy
  bun run scripts/find-artifact.ts --tag "#config" --max-results 5
        `);
        return;
    }
  }

  const engine = new ArtifactSearchEngine();
  const results = await engine.search(options);
  engine.outputResults(results, options.output);
}

// Run CLI if called directly
if (import.meta.main) {
  main().catch(console.error);
}

export { ArtifactSearchEngine, SearchOptions, ArtifactInfo };
