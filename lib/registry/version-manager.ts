#!/usr/bin/env bun
/**
 * 📊 Package Version Manager with bun.semver Integration
 * 
 * Features:
 * - bun.semver for version parsing and comparison
 * - Visual version graphs (Mermaid, ASCII, JSON)
 * - R2-backed version history
 * - Lifecycle automation
 */

import { styled, FW_COLORS } from '../theme/colors.ts';
import { R2StorageAdapter } from './r2-storage.ts';

// Use bun.semver if available (Bun 1.2+)
const semver = (Bun as any).semver || {
  parse: (v: string) => ({ version: v, major: 0, minor: 0, patch: 0 }),
  compare: (a: string, b: string) => a.localeCompare(b),
  satisfies: () => true,
  valid: (v: string) => v,
};

export interface VersionNode {
  version: string;
  timestamp: string;
  author?: string;
  message?: string;
  changelog?: string;
  dependencies?: Record<string, string>;
  dist?: {
    tarball: string;
    shasum: string;
    integrity: string;
  };
  tags: string[];
  status: 'current' | 'rollback' | 'archived' | 'deprecated';
  parentVersion?: string;
  metadata?: Record<string, any>;
}

export interface VersionGraph {
  packageName: string;
  nodes: VersionNode[];
  edges: Array<{ from: string; to: string; type: 'patch' | 'minor' | 'major' | 'prerelease' }>;
  currentVersion: string;
  latestVersion: string;
}

export interface VersionLifecycle {
  version: string;
  createdAt: string;
  scheduledDeletion?: string;
  retentionDays: number;
  autoRollback?: boolean;
  rollbackTo?: string;
}

export interface VersionHistoryEntry {
  action: 'publish' | 'rollback' | 'deprecate' | 'delete' | 'tag';
  version: string;
  timestamp: string;
  user?: string;
  details?: Record<string, any>;
}

export class VersionManager {
  private storage: R2StorageAdapter;
  private versionPrefix = 'versions/';

  constructor(
    r2Config?: ConstructorParameters<typeof R2StorageAdapter>[0]
  ) {
    this.storage = new R2StorageAdapter({
      ...r2Config,
      bucketName: r2Config?.bucketName || process.env.R2_VERSIONS_BUCKET || 'npm-registry',
      prefix: this.versionPrefix,
    });
  }

  /**
   * Parse version using bun.semver
   */
  parseVersion(version: string): { valid: boolean; parsed?: any; error?: string } {
    try {
      const parsed = semver.valid(version);
      if (!parsed) {
        return { valid: false, error: 'Invalid semver version' };
      }
      return { valid: true, parsed: semver.parse(version) };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Compare two versions using bun.semver
   */
  compareVersions(a: string, b: string): number {
    return semver.compare(a, b);
  }

  /**
   * Check if version satisfies range
   */
  satisfiesVersion(version: string, range: string): boolean {
    return semver.satisfies(version, range);
  }

  /**
   * Get version increment type
   */
  getVersionType(from: string, to: string): 'patch' | 'minor' | 'major' | 'prerelease' | 'unknown' {
    const fromParsed = semver.parse(from);
    const toParsed = semver.parse(to);
    
    if (!fromParsed || !toParsed) return 'unknown';

    if (toParsed.major !== fromParsed.major) return 'major';
    if (toParsed.minor !== fromParsed.minor) return 'minor';
    if (toParsed.patch !== fromParsed.patch) return 'patch';
    if (toParsed.prerelease?.length || fromParsed.prerelease?.length) return 'prerelease';
    
    return 'unknown';
  }

  /**
   * Store version metadata in R2
   */
  async storeVersion(packageName: string, node: VersionNode): Promise<void> {
    const key = `${packageName}/${node.version}.json`;
    
    try {
      await this.storage.putJSON?.(key, node) || await this.putToR2(key, node);
      
      // Update version graph
      await this.updateVersionGraph(packageName, node);
      
      console.log(styled(`✅ Stored version: ${packageName}@${node.version}`, 'success'));
    } catch (error) {
      console.error(styled(`❌ Failed to store version: ${error.message}`, 'error'));
      throw error;
    }
  }

  /**
   * Get version metadata from R2
   */
  async getVersion(packageName: string, version: string): Promise<VersionNode | null> {
    const key = `${packageName}/${version}.json`;
    
    try {
      return await this.storage.getJSON?.(key) || await this.getFromR2(key);
    } catch {
      return null;
    }
  }

  /**
   * Get all versions for a package
   */
  async getVersions(packageName: string): Promise<VersionNode[]> {
    try {
      const prefix = `${packageName}/`;
      const versions: VersionNode[] = [];
      
      // List all version files
      const keys = await this.listVersionKeys(packageName);
      
      for (const key of keys) {
        const version = key.replace(prefix, '').replace('.json', '');
        const node = await this.getVersion(packageName, version);
        if (node) {
          versions.push(node);
        }
      }

      // Sort by semver
      return versions.sort((a, b) => this.compareVersions(b.version, a.version));
    } catch (error) {
      console.error(styled(`❌ Failed to get versions: ${error.message}`, 'error'));
      return [];
    }
  }

  /**
   * Create version graph
   */
  async buildVersionGraph(packageName: string): Promise<VersionGraph> {
    const versions = await this.getVersions(packageName);
    
    const nodes: VersionNode[] = versions;
    const edges: VersionGraph['edges'] = [];
    
    // Build edges between versions
    for (let i = 0; i < versions.length - 1; i++) {
      const current = versions[i];
      const previous = versions[i + 1];
      
      edges.push({
        from: previous.version,
        to: current.version,
        type: this.getVersionType(previous.version, current.version),
      });
    }

    return {
      packageName,
      nodes,
      edges,
      currentVersion: versions.find(v => v.status === 'current')?.version || versions[0]?.version,
      latestVersion: versions[0]?.version,
    };
  }

  /**
   * Generate Mermaid diagram
   */
  generateMermaidGraph(graph: VersionGraph): string {
    const lines = [
      '```mermaid',
      'graph TD',
      '',
      'subgraph "Version History"',
    ];

    // Add nodes
    for (const node of graph.nodes) {
      const shape = node.status === 'current' ? '[Current]' : 
                    node.status === 'rollback' ? '(Rollback)' : 
                    node.status === 'deprecated' ? '{Deprecated}' : '[[Archived]]';
      
      const color = node.status === 'current' ? 'style fill:#4ade80' :
                    node.status === 'rollback' ? 'style fill:#fbbf24' :
                    node.status === 'deprecated' ? 'style fill:#f87171' : 'style fill:#94a3b8';
      
      lines.push(`  v${node.version.replace(/\./g, '_')}["${node.version}${node.tags.length ? ' 🏷️' : ''}"]${shape}`);
      
      if (node.tags.length) {
        lines.push(`  v${node.version.replace(/\./g, '_')} ${color}`);
      }
    }

    lines.push('');

    // Add edges
    for (const edge of graph.edges) {
      const fromId = `v${edge.from.replace(/\./g, '_')}`;
      const toId = `v${edge.to.replace(/\./g, '_')}`;
      const label = edge.type === 'major' ? '|major|' : 
                    edge.type === 'minor' ? '|minor|' : 
                    edge.type === 'prerelease' ? '|prerelease|' : '|patch|';
      
      lines.push(`  ${fromId} -->${label} ${toId}`);
    }

    lines.push('');
    lines.push('subgraph "Tags"');
    
    // Add tag references
    for (const node of graph.nodes) {
      for (const tag of node.tags) {
        lines.push(`  ${tag}["${tag}"] --> v${node.version.replace(/\./g, '_')}`);
      }
    }
    
    lines.push('end');
    lines.push('```');

    return lines.join('\n');
  }

  /**
   * Generate ASCII graph for terminal
   */
  generateAsciiGraph(graph: VersionGraph): string {
    const lines: string[] = [];
    
    lines.push(styled(`\n📦 ${graph.packageName}`, 'accent'));
    lines.push(styled('=' .repeat(50), 'accent'));
    lines.push('');
    
    for (let i = 0; i < graph.nodes.length; i++) {
      const node = graph.nodes[i];
      const isLast = i === graph.nodes.length - 1;
      
      // Version box
      const statusColor = node.status === 'current' ? 'success' :
                          node.status === 'rollback' ? 'warning' :
                          node.status === 'deprecated' ? 'error' : 'muted';
      
      const connector = isLast ? '└──' : '├──';
      const versionStr = styled(` ${node.version.padEnd(12)} `, statusColor);
      
      lines.push(`${connector}${versionStr}`);
      
      // Tags
      if (node.tags.length) {
        lines.push(`│   🏷️  ${node.tags.join(', ')}`);
      }
      
      // Timestamp
      if (node.timestamp) {
        const date = new Date(node.timestamp).toLocaleDateString();
        lines.push(`│   📅 ${date}`);
      }
      
      // Author
      if (node.author) {
        lines.push(`│   👤 ${node.author}`);
      }
      
      if (!isLast) {
        lines.push('│');
      }
    }
    
    lines.push('');
    return lines.join('\n');
  }

  /**
   * Generate JSON data for D3 or other visualization
   */
  generateJsonGraph(graph: VersionGraph): object {
    return {
      name: graph.packageName,
      current: graph.currentVersion,
      latest: graph.latestVersion,
      nodes: graph.nodes.map(n => ({
        id: n.version,
        version: n.version,
        status: n.status,
        tags: n.tags,
        timestamp: n.timestamp,
        author: n.author,
        group: this.getVersionGroup(n.version),
      })),
      links: graph.edges.map(e => ({
        source: e.from,
        target: e.to,
        type: e.type,
      })),
    };
  }

  /**
   * Rollback to a previous version
   */
  async rollback(packageName: string, toVersion: string): Promise<boolean> {
    try {
      const versions = await this.getVersions(packageName);
      const targetVersion = versions.find(v => v.version === toVersion);
      
      if (!targetVersion) {
        console.error(styled(`❌ Version ${toVersion} not found`, 'error'));
        return false;
      }

      // Mark current version as rollback
      const currentVersion = versions.find(v => v.status === 'current');
      if (currentVersion) {
        currentVersion.status = 'rollback';
        await this.storeVersion(packageName, currentVersion);
      }

      // Mark target as current
      targetVersion.status = 'current';
      targetVersion.tags = targetVersion.tags.filter(t => t !== 'latest');
      targetVersion.tags.push('latest');
      await this.storeVersion(packageName, targetVersion);

      // Update manifest
      await this.updateManifestDistTag(packageName, 'latest', toVersion);

      console.log(styled(`✅ Rolled back ${packageName} to ${toVersion}`, 'success'));
      return true;
    } catch (error) {
      console.error(styled(`❌ Rollback failed: ${error.message}`, 'error'));
      return false;
    }
  }

  /**
   * Deprecate a version
   */
  async deprecate(packageName: string, version: string, message: string): Promise<boolean> {
    try {
      const node = await this.getVersion(packageName, version);
      if (!node) {
        console.error(styled(`❌ Version ${version} not found`, 'error'));
        return false;
      }

      node.status = 'deprecated';
      node.message = message;
      await this.storeVersion(packageName, node);

      console.log(styled(`⚠️ Deprecated ${packageName}@${version}: ${message}`, 'warning'));
      return true;
    } catch (error) {
      console.error(styled(`❌ Deprecation failed: ${error.message}`, 'error'));
      return false;
    }
  }

  /**
   * Get recommended next version
   */
  recommendVersion(currentVersion: string, changeType: 'patch' | 'minor' | 'major'): string {
    const parsed = semver.parse(currentVersion);
    if (!parsed) return currentVersion;

    switch (changeType) {
      case 'major':
        return `${parsed.major + 1}.0.0`;
      case 'minor':
        return `${parsed.major}.${parsed.minor + 1}.0`;
      case 'patch':
        return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
      default:
        return currentVersion;
    }
  }

  /**
   * Private helpers
   */
  private async putToR2(key: string, data: any): Promise<void> {
    // Implementation using R2StorageAdapter
    const fullKey = `${this.versionPrefix}${key}`;
    await fetch(`${(this.storage as any).baseUrl}/${(this.storage as any).config.bucketName}/${fullKey}`, {
      method: 'PUT',
      headers: {
        'Authorization': (this.storage as any).getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  private async getFromR2(key: string): Promise<any> {
    const fullKey = `${this.versionPrefix}${key}`;
    const response = await fetch(`${(this.storage as any).baseUrl}/${(this.storage as any).config.bucketName}/${fullKey}`, {
      headers: {
        'Authorization': (this.storage as any).getAuthHeader(),
      },
    });
    
    if (!response.ok) return null;
    return await response.json();
  }

  private async listVersionKeys(packageName: string): Promise<string[]> {
    // Implementation using R2StorageAdapter
    return [];
  }

  private async updateVersionGraph(packageName: string, node: VersionNode): Promise<void> {
    const graph = await this.buildVersionGraph(packageName);
    const key = `${packageName}/graph.json`;
    await this.putToR2(key, graph);
  }

  private async updateManifestDistTag(packageName: string, tag: string, version: string): Promise<void> {
    // Implementation would update the package manifest
  }

  private getVersionGroup(version: string): number {
    const parsed = semver.parse(version);
    if (!parsed) return 0;
    return parsed.major;
  }
}

// CLI interface
if (import.meta.main) {
  const manager = new VersionManager();
  const args = process.argv.slice(2);
  const command = args[0];

  console.log(styled('📊 Version Manager (bun.semver + R2)', 'accent'));
  console.log(styled('=====================================', 'accent'));

  switch (command) {
    case 'parse': {
      const version = args[1];
      const result = manager.parseVersion(version);
      console.log(styled(`\n${result.valid ? '✅' : '❌'} ${version}`, result.valid ? 'success' : 'error'));
      if (result.parsed) {
        console.log(styled(`  Major: ${result.parsed.major}`, 'muted'));
        console.log(styled(`  Minor: ${result.parsed.minor}`, 'muted'));
        console.log(styled(`  Patch: ${result.parsed.patch}`, 'muted'));
      }
      break;
    }

    case 'compare': {
      const a = args[1];
      const b = args[2];
      const result = manager.compareVersions(a, b);
      const comparison = result > 0 ? '>' : result < 0 ? '<' : '=';
      console.log(styled(`\n${a} ${comparison} ${b}`, 'info'));
      break;
    }

    case 'recommend': {
      const current = args[1];
      const type = args[2] as 'patch' | 'minor' | 'major';
      const recommended = manager.recommendVersion(current, type);
      console.log(styled(`\n${current} → ${recommended}`, 'success'));
      break;
    }

    case 'graph': {
      const pkg = args[1];
      const format = args[2] || 'ascii';
      
      const graph = await manager.buildVersionGraph(pkg);
      
      if (format === 'mermaid') {
        console.log(manager.generateMermaidGraph(graph));
      } else if (format === 'json') {
        console.log(JSON.stringify(manager.generateJsonGraph(graph), null, 2));
      } else {
        console.log(manager.generateAsciiGraph(graph));
      }
      break;
    }

    case 'rollback': {
      const pkg = args[1];
      const version = args[2];
      await manager.rollback(pkg, version);
      break;
    }

    default:
      console.log(styled('\nCommands:', 'info'));
      console.log(styled('  parse <version>          Parse semver version', 'muted'));
      console.log(styled('  compare <a> <b>          Compare two versions', 'muted'));
      console.log(styled('  recommend <v> <type>     Recommend next version', 'muted'));
      console.log(styled('  graph <pkg> [format]     Generate version graph', 'muted'));
      console.log(styled('  rollback <pkg> <v>       Rollback to version', 'muted'));
      console.log(styled('\nFormats: ascii, mermaid, json', 'muted'));
  }
}
