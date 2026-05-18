// utils/versioned-taxonomy-validator.ts - Advanced versioned taxonomy management system
import { semver } from "bun";
import { Database } from "bun:sqlite";
import { TaxonomyValidator, TaxonomyNode, ValidationResult } from './taxonomy-validator';

export interface VersionedTaxonomyNode extends TaxonomyNode {
  version: string;
  versionRange?: string;
  dependencies: Array<{
    nodeId: string;
    versionRange: string;
    optional: boolean;
  }>;
  migrations?: Array<{
    fromVersion: string;
    toVersion: string;
    script: string;
    breaking: boolean;
  }>;
}

export interface DependencyCompatibilityReport {
  nodeId: string;
  version: string;
  satisfiesRange: boolean;
  dependencies: Array<{
    dependencyId: string;
    requiredRange: string;
    actualVersion: string;
    compatible: boolean;
  }>;
  recommendations: string[];
}

export interface VersionReleaseHistory {
  nodeId: string;
  versions: Array<{
    version: string;
    date: number;
    commitHash: string;
    breaking: boolean;
  }>;
  latest: string;
  outdated: boolean;
}

export interface VersionUpgradeSafetyCheck {
  safe: boolean;
  breakingChanges: string[];
  migrationPath?: string;
}

export interface VersionBumpSuggestion {
  current: string;
  suggested: string;
  type: 'patch' | 'minor' | 'major';
  reason: string;
}

export interface MigrationGuide {
  steps: string[];
  breakingChanges: string[];
  deprecationWarnings: string[];
}

export interface VersionConstraintViolation {
  nodeId: string;
  constraint: string;
  reason: string;
}

export interface VersionConstraintValidation {
  valid: boolean;
  violations: VersionConstraintViolation[];
}

/**
 * Bun-native semver-aware taxonomy validator extending the base validator
 */
export class VersionedTaxonomyValidator extends TaxonomyValidator {
  private versionedNodes: Map<string, VersionedTaxonomyNode> = new Map();

  constructor() {
    super();
    this.initializeVersionedTaxonomy();
  }

  /**
   * Initialize versioned taxonomy with versioned components
   */
  private initializeVersionedTaxonomy() {
    // Initialize with versioned nodes
    this.addVersionedNode('bun-native-cache', {
      domain: 'INFRASTRUCTURE',
      type: 'COMPONENT',
      version: '1.2.0',
      versionRange: '^1.0.0',
      dependencies: [
        { nodeId: 'cross-platform-layer', versionRange: '^1.5.0', optional: false }
      ],
      migrations: [
        {
          fromVersion: '1.0.0',
          toVersion: '1.1.0',
          script: 'migrations/cache-v1.1.0.ts',
          breaking: false
        },
        {
          fromVersion: '1.1.0',
          toVersion: '2.0.0',
          script: 'migrations/cache-v2.0.0.ts',
          breaking: true
        }
      ],
      meta: { runtime: 'Bun', performance: 'native' },
      class: 'BunNativeCache',
      ref: 'utils/cache/bun-native-cache.ts',
      description: 'High-performance Bun-native caching with semver support',
      tests: ['tests/cache/bun-native-cache.test.ts']
    });

    this.addVersionedNode('unified-api-backbone', {
      domain: 'INFRASTRUCTURE',
      type: 'API',
      version: '2.1.0',
      versionRange: '^2.0.0',
      dependencies: [
        { nodeId: 'bun-native-cache', versionRange: '^1.0.0', optional: false },
        { nodeId: 'enterprise-secrets', versionRange: '^1.5.0', optional: false }
      ],
      migrations: [
        {
          fromVersion: '2.0.0',
          toVersion: '2.1.0',
          script: 'migrations/api-v2.1.0.ts',
          breaking: false
        }
      ],
      meta: { framework: 'Elysia', version: '2.1.0' },
      class: 'ElysiaAPI',
      ref: 'src/api/elysia-server.ts',
      description: 'Standardized API backbone with version compatibility',
      tests: ['tests/api/elysia-api.test.ts']
    });

    this.addVersionedNode('cross-platform-layer', {
      domain: 'INFRASTRUCTURE',
      type: 'COMPONENT',
      version: '1.5.2',
      versionRange: '~1.5.0',
      dependencies: [],
      meta: { platform: 'cross-platform', stability: 'stable' },
      class: 'PlatformDetector',
      ref: 'utils/platform-detector.ts',
      description: 'Cross-platform adaptation layer with version pinning',
      tests: ['tests/platform-capabilities.test.ts']
    });

    this.addVersionedNode('enterprise-secrets', {
      domain: 'SECURITY',
      type: 'CLIENT',
      version: '1.6.0',
      versionRange: '^1.5.0',
      dependencies: [
        { nodeId: 'platform-security', versionRange: '^1.0.0', optional: false }
      ],
      migrations: [
        {
          fromVersion: '1.5.0',
          toVersion: '1.6.0',
          script: 'migrations/secrets-v1.6.0.ts',
          breaking: false
        }
      ],
      meta: { persist: 'CRED_PERSIST_ENTERPRISE', encryption: 'AES-256' },
      class: 'EnterpriseSecretsManager',
      ref: 'utils/secrets-manager.ts',
      description: 'Enterprise secrets with version-aware isolation',
      tests: ['tests/secrets-scoping.test.ts']
    });

    this.addVersionedNode('platform-security', {
      domain: 'SECURITY',
      type: 'CAPABILITY',
      version: '1.0.0',
      versionRange: '1.0.0',
      dependencies: [],
      meta: { platform: 'OS-specific', critical: 'true' },
      class: 'PlatformSecurity',
      ref: 'utils/platform-detector.ts',
      description: 'Platform-specific security with pinned version',
      tests: ['tests/platform-capabilities.test.ts']
    });

    this.addVersionedNode('real-time-telemetry', {
      domain: 'OBSERVABILITY',
      type: 'COMPONENT',
      version: '1.3.0',
      versionRange: '^1.0.0',
      dependencies: [
        { nodeId: 'bun-native-cache', versionRange: '^1.0.0', optional: true }
      ],
      meta: { realtime: 'true', performance: 'monitoring' },
      class: 'TelemetryPipeline',
      ref: 'monitoring/telemetry/',
      description: 'Real-time telemetry with optional caching',
      tests: ['tests/telemetry/pipeline.test.ts']
    });
  }

  /**
   * Add a versioned taxonomy node
   */
  public addVersionedNode(id: string, node: VersionedTaxonomyNode): void {
    this.versionedNodes.set(id, node);
    // Also add to base validator for compatibility
    this['nodes'].set(id, node);
  }

  /**
   * Get versioned node by ID
   */
  public getVersionedNode(id: string): VersionedTaxonomyNode | undefined {
    return this.versionedNodes.get(id);
  }

  /**
   * Get all versioned nodes
   */
  public getAllVersionedNodes(): Map<string, VersionedTaxonomyNode> {
    return new Map(this.versionedNodes);
  }

  /**
   * Validate version compatibility across dependencies
   */
  public async validateVersionCompatibility(nodeId: string): Promise<DependencyCompatibilityReport> {
    const node = this.versionedNodes.get(nodeId);
    if (!node?.version) {
      throw new Error(`Node ${nodeId} has no version defined`);
    }

    const report: DependencyCompatibilityReport = {
      nodeId,
      version: node.version,
      satisfiesRange: true,
      dependencies: [],
      recommendations: []
    };

    // Check each dependency
    for (const dep of node.dependencies || []) {
      const depNode = this.versionedNodes.get(dep.nodeId);
      if (!depNode?.version) continue;

      const compatible = semver.satisfies(depNode.version, dep.versionRange);
      
      report.dependencies.push({
        dependencyId: dep.nodeId,
        requiredRange: dep.versionRange,
        actualVersion: depNode.version,
        compatible
      });

      if (!compatible) {
        report.satisfiesRange = false;
        report.recommendations.push(
          `Update ${dep.nodeId} to version ${dep.versionRange}` +
          ` (current: ${depNode.version})` 
        );
      }
    }

    return report;
  }

  /**
   * Validate all nodes' version compatibility in parallel
   */
  public async validateAllVersionCompatibilities(): Promise<DependencyCompatibilityReport[]> {
    const nodeIds = Array.from(this.versionedNodes.keys());
    
    const results = await Promise.all(
      nodeIds.map(id => this.validateVersionCompatibility(id))
    );
    
    return results.filter(r => r.dependencies.length > 0);
  }

  /**
   * Check if a version upgrade is safe
   */
  public validateVersionUpgrade(nodeId: string, targetVersion: string): VersionUpgradeSafetyCheck {
    const node = this.versionedNodes.get(nodeId);
    if (!node?.version) {
      throw new Error(`Node ${nodeId} has no version`);
    }

    const current = node.version;
    const target = targetVersion;

    // Check if it's an upgrade or downgrade
    const order = semver.order(current, target);
    if (order === 0) {
      return { safe: true, breakingChanges: [], migrationPath: undefined };
    }

    // Check for migrations
    const migrations = node.migrations || [];
    const applicableMigration = migrations.find(m => {
      const isUpgrade = order === -1;
      return isUpgrade 
        ? semver.satisfies(current, `>=${m.fromVersion}`) && semver.satisfies(target, `<=${m.toVersion}`)
        : semver.satisfies(current, `<=${m.fromVersion}`) && semver.satisfies(target, `>=${m.toVersion}`);
    });

    return {
      safe: !!applicableMigration && !applicableMigration.breaking,
      breakingChanges: applicableMigration?.breaking ? [
        `Breaking change in migration ${applicableMigration.fromVersion} -> ${applicableMigration.toVersion}` 
      ] : [],
      migrationPath: applicableMigration?.script
    };
  }

  /**
   * Get version history from git tags
   */
  public async getVersionHistory(nodeId: string): Promise<VersionReleaseHistory> {
    const node = this.versionedNodes.get(nodeId);
    if (!node?.ref) {
      throw new Error(`Node ${nodeId} has no reference file`);
    }

    try {
      // Get git tags related to this file
      const { stdout } = await Bun.$`git tag --list --sort=-version:refname -- ${node.ref}`.quiet();
      const tags = stdout.toString().split('\n').filter(Boolean);

      const versions = tags.map(tag => ({
        version: tag.replace(/^v/, ''),
        date: Date.now(), // Simplified - would parse actual tag date
        commitHash: tag,
        breaking: tag.includes('-breaking')
      }));

      // Sort using Bun.semver.order
      versions.sort((a, b) => semver.order(a.version, b.version));

      return {
        nodeId,
        versions,
        latest: versions[0]?.version || '0.0.0',
        outdated: this.isOutdated(nodeId, versions)
      };
    } catch (error) {
      // Fallback if git is not available
      return {
        nodeId,
        versions: [{
          version: node.version,
          date: Date.now(),
          commitHash: 'current',
          breaking: false
        }],
        latest: node.version,
        outdated: false
      };
    }
  }

  /**
   * Check if node version is outdated compared to latest
   */
  private isOutdated(nodeId: string, versionHistory: VersionReleaseHistory['versions']): boolean {
    const node = this.versionedNodes.get(nodeId);
    if (!node?.version) return false;

    const latest = versionHistory[0]?.version;
    if (!latest) return false;

    return semver.order(node.version, latest) === -1;
  }

  /**
   * Suggest version bump based on changes
   */
  public async suggestVersionBump(nodeId: string): Promise<VersionBumpSuggestion> {
    const node = this.versionedNodes.get(nodeId);
    if (!node?.version) {
      throw new Error(`Node ${nodeId} has no version`);
    }

    const current = node.version;
    
    try {
      // Analyze recent commits
      const { stdout } = await Bun.$`git log --oneline -5 -- ${node.ref}`.quiet();
      const commits = stdout.toString().split('\n').filter(Boolean);

      // Determine bump type based on commit messages
      const hasBreaking = commits.some(c => 
        c.toLowerCase().includes('breaking') || 
        c.toLowerCase().includes('!') ||
        c.toLowerCase().startsWith('feat')
      );
      
      const hasFeatures = commits.some(c => 
        c.toLowerCase().startsWith('feat') || 
        c.toLowerCase().includes('add') ||
        c.toLowerCase().includes('new')
      );

      let suggested: string;
      let type: 'patch' | 'minor' | 'major';
      let reason: string;

      if (hasBreaking) {
        // Major bump: increment first digit
        const parts = current.split('.').map(Number);
        suggested = `${parts[0] + 1}.0.0`;
        type = 'major';
        reason = 'Breaking changes detected';
      } else if (hasFeatures) {
        // Minor bump: increment second digit
        const parts = current.split('.').map(Number);
        suggested = `${parts[0]}.${parts[1] + 1}.0`;
        type = 'minor';
        reason = 'New features added';
      } else {
        // Patch bump: increment third digit
        const parts = current.split('.').map(Number);
        suggested = `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
        type = 'patch';
        reason = 'Bug fixes or minor changes';
      }

      return { current, suggested, type, reason };
    } catch (error) {
      // Fallback if git is not available
      const parts = current.split('.').map(Number);
      return {
        current,
        suggested: `${parts[0]}.${parts[1]}.${parts[2] + 1}`,
        type: 'patch',
        reason: 'Default patch bump (git unavailable)'
      };
    }
  }

  /**
   * Generate migration guide between versions
   */
  public generateMigrationGuide(fromVersion: string, toVersion: string): MigrationGuide {
    const guide: MigrationGuide = {
      steps: [],
      breakingChanges: [],
      deprecationWarnings: []
    };

    // Parse version ranges
    const isValidRange = semver.satisfies(fromVersion, `>=${fromVersion}`);
    if (!isValidRange) {
      throw new Error(`Invalid version range: ${fromVersion}`);
    }

    // Determine upgrade direction
    const order = semver.order(fromVersion, toVersion);
    
    if (order === 0) {
      guide.steps.push('No migration needed - versions are identical');
      return guide;
    }

    if (order === 1) {
      guide.steps.push('⚠️  Downgrading - exercise caution');
    } else {
      guide.steps.push('⬆️  Upgrading - review changes below');
    }

    // Check for breaking changes in the range
    const hasBreaking = semver.satisfies(toVersion, `>=${fromVersion}`);
    
    if (!hasBreaking) {
      guide.breakingChanges.push(
        `Major version change between ${fromVersion} and ${toVersion} may contain breaking changes` 
      );
    }

    // Add migration steps based on version difference
    const fromParts = fromVersion.split('.').map(Number);
    const toParts = toVersion.split('.').map(Number);

    if (toParts[0] > fromParts[0]) {
      guide.steps.push('1. Review all API changes in major version upgrade');
      guide.steps.push('2. Update dependency version ranges');
      guide.steps.push('3. Run full test suite');
      guide.steps.push('4. Deploy to staging first');
    } else if (toParts[1] > fromParts[1]) {
      guide.steps.push('1. Review new features and deprecations');
      guide.steps.push('2. Update optional dependencies');
      guide.steps.push('3. Update documentation');
    } else {
      guide.steps.push('1. Update dependency');
      guide.steps.push('2. Run tests');
    }

    return guide;
  }

  /**
   * Validate version constraints across entire taxonomy
   */
  public async validateVersionConstraints(): Promise<VersionConstraintValidation> {
    const nodes = Array.from(this.versionedNodes.entries());
    const violations: VersionConstraintViolation[] = [];
    
    for (const [id, node] of nodes) {
      // Check version format
      if (node.version && !this.isValidVersion(node.version)) {
        violations.push({
          nodeId: id,
          constraint: 'version_format',
          reason: `Invalid version format: ${node.version}` 
        });
      }
      
      // Check version range format
      if (node.versionRange && !this.isValidRange(node.versionRange)) {
        violations.push({
          nodeId: id,
          constraint: 'range_format',
          reason: `Invalid version range: ${node.versionRange}` 
        });
      }

      // Check dependency version ranges
      for (const dep of node.dependencies || []) {
        if (!this.isValidRange(dep.versionRange)) {
          violations.push({
            nodeId: id,
            constraint: 'dependency_range_format',
            reason: `Invalid dependency version range for ${dep.nodeId}: ${dep.versionRange}` 
          });
        }
      }
    }
    
    return { valid: violations.length === 0, violations };
  }

  private isValidVersion(version: string): boolean {
    try {
      return semver.satisfies(version, version);
    } catch {
      return false;
    }
  }

  private isValidRange(range: string): boolean {
    try {
      // Test with a dummy version
      semver.satisfies('1.0.0', range);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sort nodes by version
   */
  public sortNodesByVersion(nodeIds: string[]): string[] {
    const nodes = nodeIds
      .map(id => ({ id, version: this.versionedNodes.get(id)?.version }))
      .filter(n => n.version) as Array<{ id: string; version: string }>;

    return nodes
      .sort((a, b) => semver.order(a.version, b.version))
      .map(n => n.id);
  }

  /**
   * Get dependency graph for a node
   */
  public getDependencyGraph(nodeId: string): {
    direct: string[];
    indirect: string[];
    circular: string[];
  } {
    const direct = new Set<string>();
    const indirect = new Set<string>();
    const circular = new Set<string>();
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (id: string, depth: number = 0): void => {
      if (recursionStack.has(id)) {
        circular.add(id);
        return;
      }
      
      if (visited.has(id)) return;
      
      visited.add(id);
      recursionStack.add(id);
      
      const node = this.versionedNodes.get(id);
      if (node?.dependencies) {
        for (const dep of node.dependencies) {
          if (depth === 0) {
            direct.add(dep.nodeId);
          } else {
            indirect.add(dep.nodeId);
          }
          dfs(dep.nodeId, depth + 1);
        }
      }
      
      recursionStack.delete(id);
    };

    dfs(nodeId);

    return {
      direct: Array.from(direct),
      indirect: Array.from(indirect),
      circular: Array.from(circular)
    };
  }

  /**
   * Get reverse dependency graph (what depends on this node)
   */
  public getReverseDependencyGraph(nodeId: string): string[] {
    const dependents: string[] = [];
    
    for (const [id, node] of this.versionedNodes) {
      if (node.dependencies?.some(dep => dep.nodeId === nodeId)) {
        dependents.push(id);
      }
    }
    
    return dependents;
  }

  /**
   * Export versioned taxonomy as JSON
   */
  public exportVersionedTaxonomyJSON(): string {
    const data = {
      timestamp: new Date().toISOString(),
      nodes: Object.fromEntries(this.versionedNodes),
      statistics: {
        totalNodes: this.versionedNodes.size,
        versionedNodes: Array.from(this.versionedNodes.values()).filter(n => n.version).length,
        nodesWithDependencies: Array.from(this.versionedNodes.values()).filter(n => n.dependencies?.length).length,
        nodesWithMigrations: Array.from(this.versionedNodes.values()).filter(n => n.migrations?.length).length
      }
    };
    
    return JSON.stringify(data, null, 2);
  }
}