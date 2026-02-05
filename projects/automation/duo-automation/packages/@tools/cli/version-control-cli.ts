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
    
    console.log(`🔍 Version Check for ${report.nodeId}@${report.version}`);
    console.log(`   Status: ${report.satisfiesRange ? '✅ Compatible' : '❌ Incompatible'}`);
    
    if (report.dependencies.length > 0) {
      console.log('\n📦 Dependencies:');
      for (const dep of report.dependencies) {
        const status = dep.compatible ? '✅' : '❌';
        console.log(`   ${status} ${dep.dependencyId}: ${dep.actualVersion} (requires ${dep.requiredRange})`);
      }
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(r => console.log(`   - ${r}`));
    }
  }

  private async checkAll(): Promise<void> {
    console.log('🔍 Checking all version compatibilities...\n');
    
    const reports = await this.validator.validateAllVersionCompatibilities();
    
    if (reports.length === 0) {
      console.log('✅ No dependencies to check');
      return;
    }

    let totalIssues = 0;
    for (const report of reports) {
      const status = report.satisfiesRange ? '✅' : '❌';
      console.log(`${status} ${report.nodeId}@${report.version}`);
      
      if (!report.satisfiesRange) {
        totalIssues++;
        report.recommendations.forEach(r => console.log(`   - ${r}`));
      }
    }

    console.log(`\n📊 Summary: ${reports.length} nodes checked, ${totalIssues} issues found`);
  }

  private async upgrade(nodeId: string, targetVersion: string): Promise<void> {
    if (!nodeId || !targetVersion) {
      console.error('❌ Node ID and target version are required');
      process.exit(1);
    }

    const result = this.validator.validateVersionUpgrade(nodeId, targetVersion);
    
    console.log(`⬆️  Upgrade ${nodeId} to ${targetVersion}`);
    console.log(`   Safe: ${result.safe ? '✅' : '❌'}`);
    
    if (result.breakingChanges.length > 0) {
      console.log('\n   ⚠️  Breaking Changes:');
      result.breakingChanges.forEach(c => console.log(`      - ${c}`));
    }
    
    if (result.migrationPath) {
      console.log(`   📋 Migration script: ${result.migrationPath}`);
    }

    if (!result.safe) {
      console.log('\n❌ Upgrade not recommended due to breaking changes');
      process.exit(1);
    }
  }

  private async history(nodeId: string): Promise<void> {
    if (!nodeId) {
      console.error('❌ Node ID is required');
      process.exit(1);
    }

    const history = await this.validator.getVersionHistory(nodeId);
    
    console.log(`📜 Version History for ${history.nodeId}`);
    console.log(`   Latest: ${history.latest}`);
    console.log(`   Outdated: ${history.outdated ? '⚠️' : '✅'}`);
    
    if (history.versions.length > 0) {
      console.log('\n📦 Versions:');
      history.versions.slice(0, 10).forEach(v => {
        const breaking = v.breaking ? '💥' : '📦';
        const date = new Date(v.date).toLocaleDateString();
        console.log(`   ${breaking} ${v.version} - ${date} (${v.commitHash})`);
      });
    }
  }

  private async suggest(nodeId: string): Promise<void> {
    if (!nodeId) {
      console.error('❌ Node ID is required');
      process.exit(1);
    }

    const suggestion = await this.validator.suggestVersionBump(nodeId);
    
    console.log(`💡 Suggested bump for ${nodeId}`);
    console.log(`   Current: ${suggestion.current}`);
    console.log(`   Suggested: ${suggestion.suggested} (${suggestion.type})`);
    console.log(`   Reason: ${suggestion.reason}`);
  }

  private async migrate(fromVersion: string, toVersion: string, nodeId?: string): Promise<void> {
    if (!fromVersion || !toVersion) {
      console.error('❌ From and to versions are required');
      process.exit(1);
    }

    const guide = this.validator.generateMigrationGuide(fromVersion, toVersion);
    
    console.log(`📋 Migration Guide: ${fromVersion} → ${toVersion}`);
    if (nodeId) {
      console.log(`   Node: ${nodeId}`);
    }
    
    console.log('\nSteps:');
    guide.steps.forEach(s => console.log(`   ${s}`));
    
    if (guide.breakingChanges.length > 0) {
      console.log('\n⚠️  Breaking Changes:');
      guide.breakingChanges.forEach(c => console.log(`   - ${c}`));
    }
    
    if (guide.deprecationWarnings.length > 0) {
      console.log('\n📢 Deprecations:');
      guide.deprecationWarnings.forEach(w => console.log(`   - ${w}`));
    }
  }

  private async constraints(): Promise<void> {
    const result = await this.validator.validateVersionConstraints();
    
    console.log(`🔒 Version Constraints: ${result.valid ? '✅' : '❌'}`);
    
    if (!result.valid) {
      console.log('\nViolations:');
      result.violations.forEach(v => {
        console.log(`   ${v.nodeId}: ${v.reason}`);
      });
    }
  }

  private async sort(nodeIds: string[]): Promise<void> {
    if (nodeIds.length === 0) {
      console.error('❌ At least one node ID is required');
      process.exit(1);
    }

    const sorted = this.validator.sortNodesByVersion(nodeIds);
    
    console.log('📊 Sorted by version:');
    sorted.forEach(id => {
      const node = this.validator.getSemverNode(id);
      if (node) {
        console.log(`   ${id}@${node.version}`);
      }
    });
  }

  private async dependencies(nodeId: string): Promise<void> {
    if (!nodeId) {
      console.error('❌ Node ID is required');
      process.exit(1);
    }

    const graph = this.validator.getDependencyGraph(nodeId);
    
    console.log(`🔗 Dependency Graph for ${nodeId}`);
    
    if (graph.direct.length > 0) {
      console.log('\n📦 Direct Dependencies:');
      graph.direct.forEach(dep => {
        const node = this.validator.getSemverNode(dep);
        console.log(`   - ${dep}@${node?.version || 'unknown'}`);
      });
    }
    
    if (graph.indirect.length > 0) {
      console.log('\n📦 Indirect Dependencies:');
      graph.indirect.forEach(dep => {
        const node = this.validator.getSemverNode(dep);
        console.log(`   - ${dep}@${node?.version || 'unknown'}`);
      });
    }
    
    if (graph.circular.length > 0) {
      console.log('\n🔄 Circular Dependencies:');
      graph.circular.forEach(dep => console.log(`   - ${dep}`));
    }
    
    if (graph.direct.length === 0 && graph.indirect.length === 0) {
      console.log('   No dependencies found');
    }
  }

  private async reverseDependencies(nodeId: string): Promise<void> {
    if (!nodeId) {
      console.error('❌ Node ID is required');
      process.exit(1);
    }

    const dependents = this.validator.getReverseDependencyGraph(nodeId);
    
    console.log(`🔗 Reverse Dependencies for ${nodeId}`);
    
    if (dependents.length > 0) {
      console.log('\n📦 Nodes that depend on this:');
      dependents.forEach(dep => {
        const node = this.validator.getSemverNode(dep);
        console.log(`   - ${dep}@${node?.version || 'unknown'}`);
      });
    } else {
      console.log('   No dependents found');
    }
  }

  private async export(format: string = 'json'): Promise<void> {
    switch (format.toLowerCase()) {
      case 'json':
        const json = this.validator.exportSemverJSON();
        console.log(json);
        break;
      case 'markdown':
        const markdown = this.validator.exportMarkdown();
        console.log(markdown);
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

    console.log(`🔍 Validating ${nodeId}`);
    
    // Check version format
    const validVersion = semver.satisfies(node.version, node.version);
    console.log(`   Version format: ${validVersion ? '✅' : '❌'} ${node.version}`);
    
    // Check version range
    if (node.versionRange) {
      try {
        semver.satisfies('1.0.0', node.versionRange);
        console.log(`   Version range: ✅ ${node.versionRange}`);
      } catch {
        console.log(`   Version range: ❌ ${node.versionRange}`);
      }
    }
    
    // Check dependencies
    if (node.dependencies) {
      console.log(`   Dependencies: ${node.dependencies.length} found`);
      for (const dep of node.dependencies) {
        try {
          semver.satisfies('1.0.0', dep.versionRange);
          console.log(`     - ${dep.nodeId}: ✅ ${dep.versionRange}`);
        } catch {
          console.log(`     - ${dep.nodeId}: ❌ ${dep.versionRange}`);
        }
      }
    }
  }

  private async graph(): Promise<void> {
    console.log('🕸️  Dependency Graph Overview');
    
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

    console.log(`   Total nodes: ${stats.total}`);
    console.log(`   With dependencies: ${stats.withDeps}`);
    console.log(`   With migrations: ${stats.withMigrations}`);
    console.log(`   Outdated: ${stats.outdated}`);
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

    console.log(`🔧 Bumping ${nodeId} version`);
    console.log(`   Current: ${current}`);
    console.log(`   New: ${newVersion}`);
    console.log(`   Type: ${bumpType}`);
    
    // Validate the upgrade
    const validation = this.validator.validateVersionUpgrade(nodeId, newVersion);
    if (!validation.safe) {
      console.log('\n⚠️  Warning: Upgrade may have breaking changes');
      validation.breakingChanges.forEach(c => console.log(`   - ${c}`));
    }
  }

  private async list(): Promise<void> {
    console.log('📋 All Semver Nodes');
    
    const nodes = this.validator.getAllSemverNodes();
    const sorted = Array.from(nodes.entries())
      .sort(([, a], [, b]) => semver.order(a.version, b.version));

    for (const [id, node] of sorted) {
      const status = node.dependencies?.length ? '📦' : '🔸';
      const migration = node.migrations?.length ? '🔄' : '';
      console.log(`   ${status}${migration} ${id}@${node.version}`);
    }
    
    console.log(`\nTotal: ${nodes.size} nodes`);
  }

  private showHelp(): void {
    console.log(`
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
