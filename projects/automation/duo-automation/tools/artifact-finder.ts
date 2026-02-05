// tools/artifact-finder.ts - CLI tool for finding artifacts by tags and metadata

#!/usr/bin/env bun

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

interface Artifact {
  path: string;
  type: string;
  domain: string;
  priority: string;
  audience: string;
  tech: string[];
  status: string;
  title: string;
  description: string;
  tags: string[];
}

interface SearchOptions {
  tag?: string;
  type?: string;
  domain?: string;
  priority?: string;
  audience?: string;
  status?: string;
  tech?: string;
  path?: string;
  format?: 'table' | 'json' | 'list';
  verbose?: boolean;
}

class ArtifactFinder {
  private artifacts: Artifact[] = [];
  private rootDir: string;

  constructor() {
    this.rootDir = process.cwd();
    // Initialize async loading
    this.loadArtifacts().catch(console.error);
  }

  /**
   * Load all artifacts from the project
   */
  private async loadArtifacts(): Promise<void> {
    // This would typically read from the master index
    // For now, we'll implement a basic scanning approach
    await this.scanForArtifacts(this.rootDir);
  }

  /**
   * Scan directory for artifacts
   */
  private async scanForArtifacts(dir: string, depth = 0): Promise<void> {
    if (depth > 3) return; // Limit depth to avoid scanning too deep

    try {
      const entries = await Array.fromAsync(await Bun.dir(dir));
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const stat = await Bun.file(fullPath).stat();
        
        if (stat.isDirectory && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await this.scanForArtifacts(fullPath, depth + 1);
        } else if (stat.isFile && this.isArtifactFile(fullPath)) {
          await this.parseArtifact(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  /**
   * Check if file is likely an artifact
   */
  private isArtifactFile(filePath: string): boolean {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const name = filePath.split('/').pop()?.toLowerCase();
    
    return (
      ext === 'md' ||
      ext === 'ts' ||
      ext === 'js' ||
      ext === 'json' ||
      name?.includes('readme') ||
      name?.includes('config') ||
      name?.includes('guide')
    );
  }

  /**
   * Parse artifact file for metadata
   */
  private async parseArtifact(filePath: string): Promise<void> {
    try {
      const content = await Bun.file(filePath).text();
      const relativePath = filePath.replace(this.rootDir, '');
      
      // Extract metadata from frontmatter or comments
      const metadata = this.extractMetadata(content);
      
      this.artifacts.push({
        path: relativePath,
        type: this.detectType(filePath, content),
        domain: this.detectDomain(content),
        priority: this.detectPriority(content),
        audience: this.detectAudience(content),
        tech: this.detectTech(content),
        status: this.detectStatus(content),
        title: this.extractTitle(content, filePath),
        description: this.extractDescription(content),
        tags: this.extractTags(content)
      });
    } catch (error) {
      // Skip files we can't read
    }
  }

  /**
   * Extract metadata from file content
   */
  private extractMetadata(content: string): any {
    // Look for frontmatter in markdown files
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      try {
        // Simple YAML-like parsing
        const metadata: any = {};
        frontmatterMatch[1].split('\n').forEach(line => {
          const [key, ...valueParts] = line.split(':');
          if (key && valueParts.length > 0) {
            metadata[key.trim()] = valueParts.join(':').trim();
          }
        });
        return metadata;
      } catch (error) {
        // Fall back to other extraction methods
      }
    }
    
    return {};
  }

  /**
   * Detect artifact type
   */
  private detectType(filePath: string, content: string): string {
    if (filePath.includes('.md')) {
      if (content.includes('# API') || content.includes('API Reference')) return 'api';
      if (content.includes('# Guide') || content.includes('Tutorial')) return 'guide';
      if (content.includes('# README') || content.includes('# Overview')) return 'readme';
      if (content.includes('# Report') || content.includes('Analysis')) return 'report';
      return 'documentation';
    }
    
    if (filePath.includes('.ts') || filePath.includes('.js')) {
      if (filePath.includes('test')) return 'test';
      if (filePath.includes('config')) return 'config';
      if (filePath.includes('utils')) return 'utility';
      if (filePath.includes('server') || filePath.includes('api')) return 'service';
      return 'code';
    }
    
    if (filePath.includes('.json')) {
      if (filePath.includes('package')) return 'config';
      if (filePath.includes('tsconfig')) return 'config';
      return 'data';
    }
    
    return 'other';
  }

  /**
   * Detect domain
   */
  private detectDomain(content: string): string {
    if (content.includes('infrastructure') || content.includes('devops')) return 'infrastructure';
    if (content.includes('payment') || content.includes('venmo') || content.includes('cashapp')) return 'payment';
    if (content.includes('security') || content.includes('auth')) return 'security';
    if (content.includes('monitoring') || content.includes('metrics')) return 'monitoring';
    if (content.includes('testing') || content.includes('test')) return 'testing';
    if (content.includes('deployment') || content.includes('deploy')) return 'deployment';
    if (content.includes('documentation') || content.includes('docs')) return 'documentation';
    return 'core';
  }

  /**
   * Detect priority
   */
  private detectPriority(content: string): string {
    if (content.includes('#critical') || content.includes('critical')) return 'critical';
    if (content.includes('#high') || content.includes('high')) return 'high';
    if (content.includes('#low') || content.includes('low')) return 'low';
    return 'medium';
  }

  /**
   * Detect audience
   */
  private detectAudience(content: string): string {
    if (content.includes('developer') || content.includes('dev')) return 'developer';
    if (content.includes('user') || content.includes('end-user')) return 'user';
    if (content.includes('admin') || content.includes('administrator')) return 'admin';
    if (content.includes('maintainer') || content.includes('maint')) return 'maintainer';
    return 'all';
  }

  /**
   * Detect technology
   */
  private detectTech(content: string): string[] {
    const tech: string[] = [];
    
    if (content.includes('typescript') || content.includes('ts')) tech.push('typescript');
    if (content.includes('javascript') || content.includes('js')) tech.push('javascript');
    if (content.includes('bun')) tech.push('bun');
    if (content.includes('react')) tech.push('react');
    if (content.includes('node')) tech.push('node');
    if (content.includes('docker')) tech.push('docker');
    if (content.includes('kubernetes') || content.includes('k8s')) tech.push('kubernetes');
    if (content.includes('cloudflare')) tech.push('cloudflare');
    if (content.includes('aws')) tech.push('aws');
    
    return tech;
  }

  /**
   * Detect status
   */
  private detectStatus(content: string): string {
    if (content.includes('#ready') || content.includes('ready')) return 'ready';
    if (content.includes('#wip') || content.includes('work in progress')) return 'wip';
    if (content.includes('#draft') || content.includes('draft')) return 'draft';
    if (content.includes('#deprecated') || content.includes('deprecated')) return 'deprecated';
    if (content.includes('#archived') || content.includes('archived')) return 'archived';
    return 'active';
  }

  /**
   * Extract title
   */
  private extractTitle(content: string, filePath: string): string {
    // Try to find first H1 heading
    const h1Match = content.match(/^# (.+)$/m);
    if (h1Match) return h1Match[1];
    
    // Try to find first comment block title
    const commentMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+?)\n/);
    if (commentMatch) return commentMatch[1];
    
    // Use filename as fallback
    return filePath.split('/').pop() || 'Untitled';
  }

  /**
   * Extract description
   */
  private extractDescription(content: string): string {
    // Try to find description after title
    const lines = content.split('\n');
    let foundTitle = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('# ')) {
        foundTitle = true;
        continue;
      }
      if (foundTitle && line.trim() && !line.startsWith('#')) {
        return line.trim();
      }
    }
    
    return '';
  }

  /**
   * Extract tags
   */
  private extractTags(content: string): string[] {
    const tags: string[] = [];
    
    // Look for hashtags
    const hashtagMatches = content.matchAll(/#(\w+)/g);
    for (const match of hashtagMatches) {
      tags.push(match[1]);
    }
    
    // Look for tag lists
    const tagListMatch = content.match(/tags?:\s*(.+)/i);
    if (tagListMatch) {
      const tagList = tagListMatch[1].split(',').map(t => t.trim().replace('#', ''));
      tags.push(...tagList);
    }
    
    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Search artifacts based on criteria
   */
  search(options: SearchOptions): Artifact[] {
    let results = this.artifacts;

    if (options.tag) {
      results = results.filter(a => a.tags.includes(options.tag!));
    }

    if (options.type) {
      results = results.filter(a => a.type === options.type);
    }

    if (options.domain) {
      results = results.filter(a => a.domain === options.domain);
    }

    if (options.priority) {
      results = results.filter(a => a.priority === options.priority);
    }

    if (options.audience) {
      results = results.filter(a => a.audience === options.audience);
    }

    if (options.status) {
      results = results.filter(a => a.status === options.status);
    }

    if (options.tech) {
      results = results.filter(a => a.tech.includes(options.tech!));
    }

    if (options.path) {
      results = results.filter(a => a.path.includes(options.path!));
    }

    return results;
  }

  /**
   * Format output
   */
  formatOutput(artifacts: Artifact[], format: string, verbose: boolean = false): void {
    if (artifacts.length === 0) {
      console.log('No artifacts found matching your criteria.');
      return;
    }

    switch (format) {
      case 'json':
        console.log(JSON.stringify(artifacts, null, 2));
        break;
      
      case 'list':
        artifacts.forEach(artifact => {
          console.log(`${artifact.path} (${artifact.type})`);
        });
        break;
      
      case 'table':
      default:
        if (verbose) {
          console.table(artifacts);
        } else {
          const simplified = artifacts.map(a => ({
            Path: a.path,
            Type: a.type,
            Domain: a.domain,
            Priority: a.priority,
            Status: a.status,
            Title: a.title
          }));
          console.table(simplified);
        }
        break;
    }
  }

  /**
   * Show statistics
   */
  showStats(): void {
    const stats = {
      total: this.artifacts.length,
      byType: this.groupBy(this.artifacts, 'type'),
      byDomain: this.groupBy(this.artifacts, 'domain'),
      byPriority: this.groupBy(this.artifacts, 'priority'),
      byAudience: this.groupBy(this.artifacts, 'audience'),
      byStatus: this.groupBy(this.artifacts, 'status'),
      byTech: this.groupBy(this.artifacts.flatMap(a => a.tech))
    };

    console.log('📊 Artifact Statistics');
    console.log('===================');
    console.log(`Total Artifacts: ${stats.total}\n`);

    console.log('By Type:');
    Object.entries(stats.byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    console.log('\nBy Domain:');
    Object.entries(stats.byDomain).forEach(([domain, count]) => {
      console.log(`  ${domain}: ${count}`);
    });

    console.log('\nBy Priority:');
    Object.entries(stats.byPriority).forEach(([priority, count]) => {
      console.log(`  ${priority}: ${count}`);
    });

    console.log('\nBy Status:');
    Object.entries(stats.byStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
  }

  /**
   * Group items by key
   */
  private groupBy(items: any[], key: string): Record<string, number> {
    return items.reduce((acc, item) => {
      const value = item[key] || 'unknown';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Show help
   */
  showHelp(): void {
    console.log(`
🔍 Artifact Finder - Search and discover project artifacts

Usage: bun run tools/artifact-finder.ts [command] [options]

Commands:
  search                    Search for artifacts (default)
  stats                     Show artifact statistics
  help                      Show this help message

Search Options:
  --tag=<tag>              Filter by tag (e.g., #ready, #critical)
  --type=<type>            Filter by type (e.g., api, guide, config)
  --domain=<domain>        Filter by domain (e.g., payment, security)
  --priority=<priority>    Filter by priority (e.g., critical, high)
  --audience=<audience>    Filter by audience (e.g., developer, user)
  --status=<status>        Filter by status (e.g., ready, wip, draft)
  --tech=<tech>            Filter by technology (e.g., typescript, react)
  --path=<path>            Filter by path pattern
  --format=<format>        Output format: table, json, list
  --verbose                Show detailed output

Examples:
  # Find all ready artifacts
  bun run tools/artifact-finder.ts search --tag=ready

  # Find critical payment artifacts
  bun run tools/artifact-finder.ts search --priority=critical --domain=payment

  # Find TypeScript documentation
  bun run tools/artifact-finder.ts search --type=documentation --tech=typescript

  # Show statistics
  bun run tools/artifact-finder.ts stats

  # Export results as JSON
  bun run tools/artifact-finder.ts search --format=json --type=api
    `);
  }
}

// CLI execution
if (import.meta.main) {
  const finder = new ArtifactFinder();
  const args = process.argv.slice(2);
  
  const command = args[0] || 'search';
  const options: SearchOptions = {};
  
  // Parse options
  for (const arg of args) {
    if (arg.startsWith('--tag=')) options.tag = arg.split('=')[1];
    if (arg.startsWith('--type=')) options.type = arg.split('=')[1];
    if (arg.startsWith('--domain=')) options.domain = arg.split('=')[1];
    if (arg.startsWith('--priority=')) options.priority = arg.split('=')[1];
    if (arg.startsWith('--audience=')) options.audience = arg.split('=')[1];
    if (arg.startsWith('--status=')) options.status = arg.split('=')[1];
    if (arg.startsWith('--tech=')) options.tech = arg.split('=')[1];
    if (arg.startsWith('--path=')) options.path = arg.split('=')[1];
    if (arg.startsWith('--format=')) options.format = arg.split('=')[1] as any;
    if (arg === '--verbose') options.verbose = true;
  }
  
  switch (command) {
    case 'search':
      const results = finder.search(options);
      finder.formatOutput(results, options.format || 'table', options.verbose);
      break;
    
    case 'stats':
      finder.showStats();
      break;
    
    case 'help':
    default:
      finder.showHelp();
      break;
  }
}

export { ArtifactFinder };
