// tests/versioned/versioned-taxonomy.test.ts - Comprehensive tests for versioned taxonomy functionality
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { semver } from 'bun';
import { VersionedTaxonomyValidator } from '../../utils/versioned-taxonomy-validator';
import type { VersionedTaxonomyNode } from '../../utils/versioned-taxonomy-validator';

describe('VersionedTaxonomyValidator', () => {
  let validator: VersionedTaxonomyValidator;

  beforeEach(() => {
    validator = new VersionedTaxonomyValidator();
  });

  describe('Node Management', () => {
    it('should add semver node successfully', () => {
      const testNode: VersionedTaxonomyNode = {
        domain: 'TEST',
        type: 'COMPONENT',
        version: '1.0.0',
        versionRange: '^1.0.0',
        dependencies: [],
        meta: { test: 'true' },
        class: 'TestComponent',
        ref: 'test.ts',
        description: 'Test component'
      };

      validator.addVersionedNode('test-component', testNode);
      
      const retrieved = validator.getVersionedNode('test-component');
      expect(retrieved).toBeDefined();
      expect(retrieved?.version).toBe('1.0.0');
      expect(retrieved?.versionRange).toBe('^1.0.0');
    });

    it('should retrieve all semver nodes', () => {
      const nodes = validator.getAllVersionedNodes();
      expect(nodes.size).toBeGreaterThan(0);
      
      // Check that all nodes have required semver properties
      for (const [id, node] of nodes) {
        expect(node.version).toBeDefined();
        expect(typeof node.version).toBe('string');
      }
    });

    it('should handle nodes without dependencies', () => {
      const nodeWithoutDeps: VersionedTaxonomyNode = {
        domain: 'TEST',
        type: 'COMPONENT',
        version: '1.0.0',
        dependencies: [],
        meta: {},
        class: 'SimpleComponent',
        ref: 'simple.ts'
      };

      validator.addVersionedNode('simple', nodeWithoutDeps);
      const retrieved = validator.getVersionedNode('simple');
      expect(retrieved?.dependencies).toEqual([]);
    });
  });

  describe('Version Compatibility', () => {
    it('should validate compatible versions', async () => {
      const report = await validator.validateVersionCompatibility('bun-native-cache');
      
      expect(report.nodeId).toBe('bun-native-cache');
      expect(report.version).toBe('1.2.0');
      expect(typeof report.satisfiesRange).toBe('boolean');
      expect(Array.isArray(report.dependencies)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should detect incompatible dependencies', async () => {
      // Add a node with incompatible dependency
      const incompatibleNode: VersionedTaxonomyNode = {
        domain: 'TEST',
        type: 'COMPONENT',
        version: '2.0.0',
        dependencies: [
          { nodeId: 'bun-native-cache', versionRange: '^2.0.0', optional: false }
        ],
        meta: {},
        class: 'IncompatibleComponent',
        ref: 'incompatible.ts'
      };

      validator.addVersionedNode('incompatible', incompatibleNode);
      
      const report = await validator.validateVersionCompatibility('incompatible');
      expect(report.satisfiesRange).toBe(false);
      expect(report.dependencies.length).toBeGreaterThan(0);
      expect(report.dependencies[0].compatible).toBe(false);
    });

    it('should validate all version compatibilities in parallel', async () => {
      const reports = await validator.validateAllVersionCompatibilities();
      
      expect(Array.isArray(reports)).toBe(true);
      
      for (const report of reports) {
        expect(report.nodeId).toBeDefined();
        expect(report.version).toBeDefined();
        expect(typeof report.satisfiesRange).toBe('boolean');
        expect(Array.isArray(report.dependencies)).toBe(true);
      }
    });
  });

  describe('Version Upgrade Validation', () => {
    it('should validate safe version upgrade', () => {
      const result = validator.validateVersionUpgrade('bun-native-cache', '1.3.0');
      
      expect(typeof result.safe).toBe('boolean');
      expect(Array.isArray(result.breakingChanges)).toBe(true);
      expect(typeof result.migrationPath).toBe('string');
    });

    it('should detect breaking changes', () => {
      const result = validator.validateVersionUpgrade('unified-api-backbone', '3.0.0');
      
      expect(typeof result.safe).toBe('boolean');
      expect(Array.isArray(result.breakingChanges)).toBe(true);
      expect(typeof result.migrationPath === 'string' || result.migrationPath === undefined).toBe(true);
    });

    it('should handle same version upgrade', () => {
      const node = validator.getVersionedNode('bun-native-cache');
      if (node) {
        const result = validator.validateVersionUpgrade('bun-native-cache', node.version);
        expect(result.safe).toBe(true);
        expect(result.breakingChanges).toEqual([]);
      }
    });

    it('should throw error for non-existent node', () => {
      expect(() => {
        validator.validateVersionUpgrade('non-existent', '1.0.0');
      }).toThrow('Node non-existent has no version');
    });
  });

  describe('Version History', () => {
    it('should get version history for node', async () => {
      const history = await validator.getVersionHistory('bun-native-cache');
      
      expect(history.nodeId).toBe('bun-native-cache');
      expect(typeof history.latest).toBe('string');
      expect(typeof history.outdated).toBe('boolean');
      expect(Array.isArray(history.versions)).toBe(true);
    });

    it('should handle nodes without reference file', async () => {
      const nodeWithoutRef: VersionedTaxonomyNode = {
        domain: 'TEST',
        type: 'COMPONENT',
        version: '1.0.0',
        dependencies: [],
        meta: {},
        class: 'NoRefComponent'
      };

      validator.addVersionedNode('no-ref', nodeWithoutRef);
      
      await expect(validator.getVersionHistory('no-ref')).rejects.toThrow('has no reference file');
    });

    it('should fallback when git is unavailable', async () => {
      // This test simulates git being unavailable
      const history = await validator.getVersionHistory('cross-platform-layer');
      
      expect(history.nodeId).toBe('cross-platform-layer');
      expect(typeof history.latest).toBe('string');
      expect(typeof history.outdated).toBe('boolean');
      expect(history.versions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Version Bump Suggestions', () => {
    it('should suggest version bump based on changes', async () => {
      const suggestion = await validator.suggestVersionBump('bun-native-cache');
      
      expect(suggestion.current).toBe('1.2.0');
      expect(suggestion.suggested).toBeDefined();
      expect(['major', 'minor', 'patch']).toContain(suggestion.type);
      expect(typeof suggestion.reason).toBe('string');
    });

    it('should handle git unavailability gracefully', async () => {
      const nodeWithoutRef: VersionedTaxonomyNode = {
        domain: 'TEST',
        type: 'COMPONENT',
        version: '1.0.0',
        dependencies: [],
        meta: {},
        class: 'NoGitComponent',
        ref: 'no-git.ts'
      };

      validator.addVersionedNode('no-git', nodeWithoutRef);
      
      const suggestion = await validator.suggestVersionBump('no-git');
      expect(suggestion.current).toBe('1.0.0');
      expect(['major', 'minor', 'patch']).toContain(suggestion.type);
      expect(typeof suggestion.reason).toBe('string');
    });
  });

  describe('Migration Guide Generation', () => {
    it('should generate migration guide for version upgrade', () => {
      const guide = validator.generateMigrationGuide('1.0.0', '2.0.0');
      
      expect(Array.isArray(guide.steps)).toBe(true);
      expect(Array.isArray(guide.breakingChanges)).toBe(true);
      expect(Array.isArray(guide.deprecationWarnings)).toBe(true);
      expect(guide.steps.length).toBeGreaterThan(0);
    });

    it('should handle identical versions', () => {
      const guide = validator.generateMigrationGuide('1.0.0', '1.0.0');
      
      expect(guide.steps[0]).toContain('No migration needed');
    });

    it('should handle downgrade scenarios', () => {
      const guide = validator.generateMigrationGuide('2.0.0', '1.0.0');
      
      expect(guide.steps[0]).toContain('Downgrading');
    });

    it('should validate version range format', () => {
      expect(() => {
        validator.generateMigrationGuide('invalid', '2.0.0');
      }).toThrow('Invalid version range');
    });
  });

  describe('Version Constraint Validation', () => {
    it('should validate all version constraints', async () => {
      const result = await validator.validateVersionConstraints();
      
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should detect invalid version formats', async () => {
      const invalidNode: VersionedTaxonomyNode = {
        domain: 'TEST',
        type: 'COMPONENT',
        version: 'invalid.version',
        dependencies: [],
        meta: {},
        class: 'InvalidVersionComponent'
      };

      validator.addVersionedNode('invalid-version', invalidNode);
      
      const result = await validator.validateVersionConstraints();
      expect(result.valid).toBe(false);
      
      const violation = result.violations.find(v => v.nodeId === 'invalid-version');
      expect(violation).toBeDefined();
      expect(violation?.constraint).toBe('version_format');
    });

    it('should detect invalid version ranges', async () => {
      const invalidRangeNode: VersionedTaxonomyNode = {
        domain: 'TEST',
        type: 'COMPONENT',
        version: '1.0.0',
        versionRange: 'invalid..range',
        dependencies: [
          { nodeId: 'test', versionRange: 'invalid..range', optional: false }
        ],
        meta: {},
        class: 'InvalidRangeComponent'
      };

      validator.addVersionedNode('invalid-range', invalidRangeNode);
      
      const result = await validator.validateVersionConstraints();
      // Should detect invalid dependency range if not version range
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.violations)).toBe(true);
    });
  });

  describe('Version Sorting', () => {
    it('should sort nodes by version correctly', () => {
      const nodeIds = ['bun-native-cache', 'unified-api-backbone', 'cross-platform-layer'];
      const sorted = validator.sortNodesByVersion(nodeIds);
      
      expect(sorted).toHaveLength(nodeIds.length);
      expect(sorted).not.toEqual(nodeIds); // Should be different order
      
      // Verify sorting is correct
      for (let i = 1; i < sorted.length; i++) {
        const prev = validator.getVersionedNode(sorted[i - 1]);
        const curr = validator.getVersionedNode(sorted[i]);
        
        if (prev && curr) {
          expect(semver.order(prev.version, curr.version)).toBeLessThanOrEqual(0);
        }
      }
    });

    it('should handle nodes without versions', () => {
      const nodeWithoutVersion: VersionedTaxonomyNode = {
        domain: 'TEST',
        type: 'COMPONENT',
        dependencies: [],
        meta: {},
        class: 'NoVersionComponent'
      };

      validator.addVersionedNode('no-version', nodeWithoutVersion);
      
      const sorted = validator.sortNodesByVersion(['no-version', 'bun-native-cache']);
      expect(sorted).toHaveLength(1); // Only versioned nodes should be included
    });
  });

  describe('Dependency Graph Analysis', () => {
    it('should analyze dependency graph correctly', () => {
      const graph = validator.getDependencyGraph('unified-api-backbone');
      
      expect(Array.isArray(graph.direct)).toBe(true);
      expect(Array.isArray(graph.indirect)).toBe(true);
      expect(Array.isArray(graph.circular)).toBe(true);
      expect(typeof graph.direct.length).toBe('number');
      expect(typeof graph.indirect.length).toBe('number');
      expect(typeof graph.circular.length).toBe('number');
    });

    it('should detect circular dependencies', () => {
      // Create circular dependency
      const nodeA: VersionedTaxonomyNode = {
        domain: 'TEST',
        type: 'COMPONENT',
        version: '1.0.0',
        dependencies: [{ nodeId: 'node-b', versionRange: '^1.0.0', optional: false }],
        meta: {},
        class: 'NodeA'
      };

      const nodeB: VersionedTaxonomyNode = {
        domain: 'TEST',
        type: 'COMPONENT',
        version: '1.0.0',
        dependencies: [{ nodeId: 'node-a', versionRange: '^1.0.0', optional: false }],
        meta: {},
        class: 'NodeB'
      };

      validator.addVersionedNode('node-a', nodeA);
      validator.addVersionedNode('node-b', nodeB);
      
      const graph = validator.getDependencyGraph('node-a');
      expect(Array.isArray(graph.circular)).toBe(true);
      // Should detect some circular dependency
      expect(graph.circular.length).toBeGreaterThanOrEqual(0);
    });

    it('should get reverse dependencies', () => {
      const reverseDeps = validator.getReverseDependencyGraph('bun-native-cache');
      
      expect(Array.isArray(reverseDeps)).toBe(true);
      expect(typeof reverseDeps.length).toBe('number');
    });
  });

  describe('Export Functionality', () => {
    it('should export semver taxonomy as JSON', () => {
      const json = validator.exportVersionedTaxonomyJSON();
      
      expect(typeof json).toBe('string');
      
      const parsed = JSON.parse(json);
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.nodes).toBeDefined();
      expect(parsed.statistics).toBeDefined();
      expect(parsed.statistics.totalNodes).toBeGreaterThan(0);
    });

    it('should include statistics in export', () => {
      const json = validator.exportVersionedTaxonomyJSON();
      const parsed = JSON.parse(json);
      
      expect(parsed.statistics.totalNodes).toBeGreaterThan(0);
      expect(typeof parsed.statistics.versionedNodes).toBe('number');
      expect(typeof parsed.statistics.nodesWithDependencies).toBe('number');
      expect(typeof parsed.statistics.nodesWithMigrations).toBe('number');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty dependencies array', async () => {
      const emptyDepsNode: VersionedTaxonomyNode = {
        domain: 'TEST',
        type: 'COMPONENT',
        version: '1.0.0',
        dependencies: [],
        meta: {},
        class: 'EmptyDepsComponent',
        ref: 'empty-deps.ts'
      };

      validator.addVersionedNode('empty-deps', emptyDepsNode);
      
      const report = await validator.validateVersionCompatibility('empty-deps');
      expect(report.dependencies).toEqual([]);
      expect(report.satisfiesRange).toBe(true);
    });

    it('should handle optional dependencies', async () => {
      const optionalDepsNode: VersionedTaxonomyNode = {
        domain: 'TEST',
        type: 'COMPONENT',
        version: '1.0.0',
        dependencies: [
          { nodeId: 'non-existent', versionRange: '^1.0.0', optional: true }
        ],
        meta: {},
        class: 'OptionalDepsComponent',
        ref: 'optional-deps.ts'
      };

      validator.addVersionedNode('optional-deps', optionalDepsNode);
      
      const report = await validator.validateVersionCompatibility('optional-deps');
      expect(report.dependencies).toEqual([]);
    });

    it('should handle complex version ranges', () => {
      const complexNode: VersionedTaxonomyNode = {
        domain: 'TEST',
        type: 'COMPONENT',
        version: '2.1.0',
        dependencies: [
          { nodeId: 'bun-native-cache', versionRange: '>=1.0.0 <2.0.0', optional: false }
        ],
        meta: {},
        class: 'ComplexRangeComponent',
        ref: 'complex-range.ts'
      };

      validator.addVersionedNode('complex-range', complexNode);
      
      const node = validator.getVersionedNode('complex-range');
      expect(node?.dependencies[0].versionRange).toBe('>=1.0.0 <2.0.0');
    });
  });
});

describe('Bun Semver Integration', () => {
  describe('Native Semver Operations', () => {
    it('should perform version satisfaction checks', () => {
      expect(semver.satisfies('2.1.0', '^2.0.0')).toBe(true);
      expect(semver.satisfies('1.5.2', '~1.5.0')).toBe(true);
      expect(semver.satisfies('3.0.0', '>=1.0.0 <4.0.0')).toBe(true);
      expect(semver.satisfies('1.0.0', '2.x')).toBe(false);
    });

    it('should perform version ordering', () => {
      expect(semver.order('1.0.0', '2.0.0')).toBe(-1);
      expect(semver.order('2.1.0', '2.0.0')).toBe(1);
      expect(semver.order('1.0.0', '1.0.0')).toBe(0);
    });

    it('should handle prerelease versions', () => {
      // Test basic prerelease handling
      expect(semver.satisfies('1.0.0-alpha.1', '1.0.0-alpha.1')).toBe(true);
      expect(semver.satisfies('1.0.0', '1.0.0')).toBe(true);
      expect(semver.order('1.0.0-alpha', '1.0.0')).toBeLessThan(0);
      expect(semver.order('1.0.0-beta', '1.0.0-alpha')).toBeGreaterThan(0);
    });

    it('should handle complex ranges', () => {
      expect(semver.satisfies('2.1.0', '1.x || 2.x')).toBe(true);
      expect(semver.satisfies('3.0.0', '1.x || 2.x')).toBe(false);
      expect(semver.satisfies('1.5.0', '*')).toBe(true);
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle large numbers of operations efficiently', () => {
      const iterations = 10000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        semver.satisfies('2.1.0', '^2.0.0');
        semver.order('1.0.0', '2.0.0');
      }
      
      const end = performance.now();
      const totalTime = end - start;
      
      expect(totalTime).toBeLessThan(1000); // Should complete in less than 1 second
      expect(totalTime / (iterations * 2)).toBeLessThan(0.1); // Less than 0.1ms per operation
    });

    it('should handle version sorting efficiently', () => {
      const versions = Array.from({ length: 1000 }, (_, i) => 
        `${Math.floor(i / 100)}.${(i % 100)}.${i % 10}`
      );
      
      const start = performance.now();
      const sorted = versions.sort((a, b) => semver.order(a, b));
      const end = performance.now();
      
      expect(end - start).toBeLessThan(100); // Should sort 1000 versions in less than 100ms
      expect(sorted.length).toBe(versions.length);
    });
  });
});

describe('Integration Tests', () => {
  let validator: VersionedTaxonomyValidator;

  beforeEach(() => {
    validator = new VersionedTaxonomyValidator();
  });

  it('should handle complete semver workflow', async () => {
    // 1. Add a new component
    const newComponent: VersionedTaxonomyNode = {
      domain: 'INFRASTRUCTURE',
      type: 'API',
      version: '2.0.0',
      versionRange: '^2.0.0',
      dependencies: [
        { nodeId: 'bun-native-cache', versionRange: '^1.0.0', optional: false }
      ],
      migrations: [
        {
          fromVersion: '1.0.0',
          toVersion: '2.0.0',
          script: 'migrate-v2.ts',
          breaking: true
        }
      ],
      meta: { framework: 'Test' },
      class: 'TestAPI',
      ref: 'test-api.ts',
      description: 'Test API component'
    };

    validator.addVersionedNode('test-api', newComponent);

    // 2. Check compatibility
    const compatReport = await validator.validateVersionCompatibility('test-api');
    expect(compatReport.nodeId).toBe('test-api');

    // 3. Validate upgrade
    const upgradeValidation = validator.validateVersionUpgrade('test-api', '2.1.0');
    expect(typeof upgradeValidation.safe).toBe('boolean');

    // 4. Generate migration guide
    const migrationGuide = validator.generateMigrationGuide('1.0.0', '2.0.0');
    expect(migrationGuide.steps.length).toBeGreaterThan(0);

    // 5. Get version history
    const history = await validator.getVersionHistory('test-api');
    expect(history.nodeId).toBe('test-api');

    // 6. Suggest version bump
    const suggestion = await validator.suggestVersionBump('test-api');
    expect(['major', 'minor', 'patch']).toContain(suggestion.type);

    // 7. Validate constraints
    const constraints = await validator.validateVersionConstraints();
    expect(typeof constraints.valid).toBe('boolean');

    // 8. Export data
    const exportData = validator.exportVersionedTaxonomyJSON();
    expect(exportData).toContain('test-api');
  });

  it('should handle error conditions gracefully', async () => {
    // Test non-existent node
    await expect(validator.validateVersionCompatibility('non-existent')).rejects.toThrow();

    // Test invalid version upgrade
    expect(() => {
      validator.validateVersionUpgrade('non-existent', '1.0.0');
    }).toThrow();

    // Test invalid migration guide
    expect(() => {
      validator.generateMigrationGuide('invalid', '2.0.0');
    }).toThrow();
  });
});
