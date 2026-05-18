// cli/version-control-cli.ts - Advanced version control CLI for versioned taxonomy
import { semver } from "bun";
import { VersionedTaxonomyValidator } from '../utils/versioned-taxonomy-validator';
import type { 
  DependencyCompatibilityReport, 
  VersionReleaseHistory, 
  VersionBumpSuggestion, 
  MigrationGuide,
  VersionConstraintValidation 
} from '../utils/versioned-taxonomy-validator';

export class VersionControlCLI {
  private validator = new VersionedTaxonomyValidator();

  async run(argv: string[]): Promise<void> {
    const command = argv[2];
    
    try {
      switch (command) {
        case 'check':
          await this.check(argv[3]);
          break;
        case 'check-all':
          await this.checkAll();
          break;
        case 'upgrade':
          await this.upgrade(argv[3], argv[4]);
          break;
        case 'history':
          await this.history(argv[3]);
          break;
        case 'suggest':
          await this.suggest(argv[3]);
          break;
        case 'migrate':
          await this.migrate(argv[3], argv[4], argv[5]);
          break;
        case 'constraints':
          await this.constraints();
          break;
        case 'sort':
          await this.sort(argv.slice(3));
          break;
        case 'deps':
          await this.dependencies(argv[3]);
          break;
        case 'reverse-deps':
          await this.reverseDependencies(argv[3]);
          break;
        case 'export':
          await this.export(argv[3]);
          break;
        case 'validate':
          await this.validate(argv[3]);
          break;
        case 'graph':
          await this.graph();
          break;
        case 'bump':
          await this.bump(argv[3], argv[4]);
          break;
        case 'list':
          await this.list();
          break;
        default:
          this.showHelp();
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  }

  private async check(nodeId: string): Promise<void> {
    if (!nodeId) {
      console.error('❌ Node ID is required');
      process.exit(1);
    }

    const report = await this.validator.validateVersionCompatibility(nodeId);
    
    console.info(`🔍 Version Check for ${report.nodeId}@${report.version}`);
    console.info(`   Status: ${report.satisfiesRange ? '✅ Compatible' : '❌ Incompatible'}`);
    
    if (report.dependencies.length > 0) {
      console.info('\n📦 Dependencies:');
      for (const dep of report.dependencies) {
        const status = dep.compatible ? '✅' : '❌';
        console.info(`   ${status} ${dep.dependencyId}: ${dep.actualVersion} (requires ${dep.requiredRange})`);
      }
    }
    
    if (report.recommendations.length > 0) {
      console.info('\n💡 Recommendations:');
      report.recommendations.forEach(r => console.info(`   - ${r}`));
    }
  }

  private async checkAll(): Promise<void> {
    console.info('🔍 Checking all version compatibilities...\n');
    
    const reports = await this.validator.validateAllVersionCompatibilities();
    
    if (reports.length === 0) {
      console.info('✅ No dependencies to check');
      return;
    }

    let totalIssues = 0;
    for (const report of reports) {
      const status = report.satisfiesRange ? '✅' : '❌';
      console.info(`${status} ${report.nodeId}@${report.version}`);
      
      if (!report.satisfiesRange) {
        totalIssues++;
        report.recommendations.forEach(r => console.info(`   - ${r}`));
      }
    }

    console.info(`\n📊 Summary: ${reports.length} nodes checked, ${totalIssues} issues found`);
  }

  private async upgrade(nodeId: string, targetVersion: string): Promise<void> {
    if (!nodeId || !targetVersion) {
      console.error('❌ Node ID and target version are required');
      process.exit(1);
    }

    const result = this.validator.validateVersionUpgrade(nodeId, targetVersion);
    
    console.info(`⬆️  Upgrade ${nodeId} to ${targetVersion}`);
    console.info(`   Safe: ${result.safe ? '✅' : '❌'}`);
    
    if (result.breakingChanges.length > 0) {
      console.info('\n   ⚠️  Breaking Changes:');
      result.breakingChanges.forEach(c => console.info(`      - ${c}`));
    }
    
    if (result.migrationPath) {
      console.info(`   📋 Migration script: ${result.migrationPath}`);
    }

    if (!result.safe) {
      console.info('\n❌ Upgrade not recommended due to breaking changes');
      process.exit(1);
    }
  }

  private async history(nodeId: string): Promise<void> {
    if (!nodeId) {
      console.error('❌ Node ID is required');
      process.exit(1);
    }

    const history = await this.validator.getVersionHistory(nodeId);
    
    console.info(`📜 Version History for ${history.nodeId}`);
    console.info(`   Latest: ${history.latest}`);
    console.info(`   Outdated: ${history.outdated ? '⚠️' : '✅'}`);
    
    if (history.versions.length > 0) {
      console.info('\n📦 Versions:');
      history.versions.slice(0, 10).forEach(v => {
        const breaking = v.breaking ? '💥' : '📦';
        const date = new Date(v.date).toLocaleDateString();
        console.info(`   ${breaking} ${v.version} - ${date} (${v.commitHash})`);
      });
    }
  }

  private async suggest(nodeId: string): Promise<void> {
    if (!nodeId) {
      console.error('❌ Node ID is required');
      process.exit(1);
    }

    const suggestion = await this.validator.suggestVersionBump(nodeId);
    
    console.info(`💡 Suggested bump for ${nodeId}`);
    console.info(`   Current: ${suggestion.current}`);
    console.info(`   Suggested: ${suggestion.suggested} (${suggestion.type})`);
    console.info(`   Reason: ${suggestion.reason}`);
  }

  private async migrate(fromVersion: string, toVersion: string, nodeId?: string): Promise<void> {
    if (!fromVersion || !toVersion) {
      console.error('❌ From and to versions are required');
      process.exit(1);
    }

    const guide = this.validator.generateMigrationGuide(fromVersion, toVersion);
    
    console.info(`📋 Migration Guide: ${fromVersion} → ${toVersion}`);
    if (nodeId) {
      console.info(`   Node: ${nodeId}`);
    }
    
    console.info('\nSteps:');
    guide.steps.forEach(s => console.info(`   ${s}`));
    
    if (guide.breakingChanges.length > 0) {
      console.info('\n⚠️  Breaking Changes:');
      guide.breakingChanges.forEach(c => console.info(`   - ${c}`));
    }
    
    if (guide.deprecationWarnings.length > 0) {
      console.info('\n📢 Deprecations:');
      guide.deprecationWarnings.forEach(w => console.info(`   - ${w}`));
    }
  }

  private async constraints(): Promise<void> {
    const result = await this.validator.validateVersionConstraints();
    
    console.info(`🔒 Version Constraints: ${result.valid ? '✅' : '❌'}`);
    
    if (!result.valid) {
      console.info('\nViolations:');
      result.violations.forEach(v => {
        console.info(`   ${v.nodeId}: ${v.reason}`);
      });
    }
  }

  private async sort(nodeIds: string[]): Promise<void> {
    if (nodeIds.length === 0) {
      console.error('❌ At least one node ID is required');
      process.exit(1);
    }

    const sorted = this.validator.sortNodesByVersion(nodeIds);
    
    console.info('📊 Sorted by version:');
    sorted.forEach(id => {
      const node = this.validator.getSemverNode(id);
      if (node) {
        console.info(`   ${id}@${node.version}`);
      }
    });
  }

  private async dependencies(nodeId: string): Promise<void> {
    if (!nodeId) {
      console.error('❌ Node ID is required');
      process.exit(1);
    }

    const graph = this.validator.getDependencyGraph(nodeId);
    
    console.info(`🔗 Dependency Graph for ${nodeId}`);
    
    if (graph.direct.length > 0) {
      console.info('\n📦 Direct Dependencies:');
      graph.direct.forEach(dep => {
        const node = this.validator.getSemverNode(dep);
        console.info(`   - ${dep}@${node?.version || 'unknown'}`);
      });
    }
    
    if (graph.indirect.length > 0) {
      console.info('\n📦 Indirect Dependencies:');
      graph.indirect.forEach(dep => {
        const node = this.validator.getSemverNode(dep);
        console.info(`   - ${dep}@${node?.version || 'unknown'}`);
      });
    }
    
    if (graph.circular.length > 0) {
      console.info('\n🔄 Circular Dependencies:');
      graph.circular.forEach(dep => console.info(`   - ${dep}`));
    }
    
    if (graph.direct.length === 0 && graph.indirect.length === 0) {
      console.info('   No dependencies found');
    }
  }

  private async reverseDependencies(nodeId: string): Promise<void> {
    if (!nodeId) {
      console.error('❌ Node ID is required');
      process.exit(1);
    }

    const dependents = this.validator.getReverseDependencyGraph(nodeId);
    
    console.info(`🔗 Reverse Dependencies for ${nodeId}`);
    
    if (dependents.length > 0) {
      console.info('\n📦 Nodes that depend on this:');
      dependents.forEach(dep => {
        const node = this.validator.getSemverNode(dep);
        console.info(`   - ${dep}@${node?.version || 'unknown'}`);
      });
    } else {
      console.info('   No dependents found');
    }
  }

  private async export(format: string = 'json'): Promise<void> {
    switch (format.toLowerCase()) {
      case 'json':
        const json = this.validator.exportSemverJSON();
        console.info(json);
        break;
      case 'markdown':
        const markdown = this.validator.exportMarkdown();
        console.info(markdown);
        break;
      default:
        console.error('❌ Supported formats: json, markdown');
        process.exit(1);
    }
  }

  private async validate(nodeId: string): Promise<void> {
    if (!nodeId) {
      console.error('❌ Node ID is required');
      process.exit(1);
    }

    const node = this.validator.getSemverNode(nodeId);
    if (!node) {
      console.error(`❌ Node ${nodeId} not found`);
      process.exit(1);
    }

    console.info(`🔍 Validating ${nodeId}`);
    
    // Check version format
    const validVersion = semver.satisfies(node.version, node.version);
    console.info(`   Version format: ${validVersion ? '✅' : '❌'} ${node.version}`);
    
    // Check version range
    if (node.versionRange) {
      try {
        semver.satisfies('1.0.0', node.versionRange);
        console.info(`   Version range: ✅ ${node.versionRange}`);
      } catch {
        console.info(`   Version range: ❌ ${node.versionRange}`);
      }
    }
    
    // Check dependencies
    if (node.dependencies) {
      console.info(`   Dependencies: ${node.dependencies.length} found`);
      for (const dep of node.dependencies) {
        try {
          semver.satisfies('1.0.0', dep.versionRange);
          console.info(`     - ${dep.nodeId}: ✅ ${dep.versionRange}`);
        } catch {
          console.info(`     - ${dep.nodeId}: ❌ ${dep.versionRange}`);
        }
      }
    }
  }

  private async graph(): Promise<void> {
    console.info('🕸️  Dependency Graph Overview');
    
    const nodes = this.validator.getAllSemverNodes();
    const stats = {
      total: nodes.size,
      withDeps: 0,
      withMigrations: 0,
      outdated: 0
    };

    for (const [id, node] of nodes) {
      if (node.dependencies?.length) stats.withDeps++;
      if (node.migrations?.length) stats.withMigrations++;
      
      const history = await this.validator.getVersionHistory(id);
      if (history.outdated) stats.outdated++;
    }

    console.info(`   Total nodes: ${stats.total}`);
    console.info(`   With dependencies: ${stats.withDeps}`);
    console.info(`   With migrations: ${stats.withMigrations}`);
    console.info(`   Outdated: ${stats.outdated}`);
  }

  private async bump(nodeId: string, bumpType: string): Promise<void> {
    if (!nodeId || !bumpType) {
      console.error('❌ Node ID and bump type are required');
      process.exit(1);
    }

    const node = this.validator.getSemverNode(nodeId);
    if (!node) {
      console.error(`❌ Node ${nodeId} not found`);
      process.exit(1);
    }

    const current = node.version;
    const parts = current.split('.').map(Number);
    
    let newVersion: string;
    
    switch (bumpType.toLowerCase()) {
      case 'major':
        newVersion = `${parts[0] + 1}.0.0`;
        break;
      case 'minor':
        newVersion = `${parts[0]}.${parts[1] + 1}.0`;
        break;
      case 'patch':
        newVersion = `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
        break;
      default:
        console.error('❌ Bump type must be: major, minor, or patch');
        process.exit(1);
    }

    console.info(`🔧 Bumping ${nodeId} version`);
    console.info(`   Current: ${current}`);
    console.info(`   New: ${newVersion}`);
    console.info(`   Type: ${bumpType}`);
    
    // Validate the upgrade
    const validation = this.validator.validateVersionUpgrade(nodeId, newVersion);
    if (!validation.safe) {
      console.info('\n⚠️  Warning: Upgrade may have breaking changes');
      validation.breakingChanges.forEach(c => console.info(`   - ${c}`));
    }
  }

  private async list(): Promise<void> {
    console.info('📋 All Semver Nodes');
    
    const nodes = this.validator.getAllSemverNodes();
    const sorted = Array.from(nodes.entries())
      .sort(([, a], [, b]) => semver.order(a.version, b.version));

    for (const [id, node] of sorted) {
      const status = node.dependencies?.length ? '📦' : '🔸';
      const migration = node.migrations?.length ? '🔄' : '';
      console.info(`   ${status}${migration} ${id}@${node.version}`);
    }
    
    console.info(`\nTotal: ${nodes.size} nodes`);
  }

  private showHelp(): void {
    console.info(`
Version Control CLI - Versioned Taxonomy Management

Commands:
  check <nodeId>         Check version compatibility for a node
  check-all              Check all nodes' version compatibility
  upgrade <nodeId> <ver> Validate version upgrade safety
  history <nodeId>       Show version history from git tags
  suggest <nodeId>       Suggest version bump based on commits
  migrate <from> <to>    Generate migration guide between versions
  constraints            Validate all version constraints
  sort <ids...>          Sort nodes by version
  deps <nodeId>          Show dependency graph for node
  reverse-deps <nodeId>  Show reverse dependencies
  export <format>        Export taxonomy (json|markdown)
  validate <nodeId>      Validate node version format and ranges
  graph                  Show dependency graph overview
  bump <nodeId> <type>   Bump version (major|minor|patch)
  list                   List all semver nodes

Examples:
  bun run cli/version-control-cli.ts check bun-native-cache
  bun run cli/version-control-cli.ts check-all
  bun run cli/version-control-cli.ts suggest unified-api-backbone
  bun run cli/version-control-cli.ts upgrade api-gateway 3.0.0
  bun run cli/version-control-cli.ts migrate 1.0.0 2.0.0
  bun run cli/version-control-cli.ts deps unified-api-backbone
  bun run cli/version-control-cli.ts export json
  bun run cli/version-control-cli.ts bump bun-native-cache minor
    `);
  }
}

// CLI entry point
if (import.meta.main) {
  const cli = new VersionControlCLI();
  await cli.run(process.argv);
}
