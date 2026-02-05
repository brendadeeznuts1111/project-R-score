// examples/versioned-taxonomy-demo.ts - Complete versioned taxonomy workflow demonstration
import { semver } from "bun";
import { VersionedTaxonomyValidator } from '../utils/versioned-taxonomy-validator';
import type { 
  VersionedTaxonomyNode, 
  DependencyCompatibilityReport, 
  VersionReleaseHistory,
  VersionBumpSuggestion,
  MigrationGuide 
} from '../utils/versioned-taxonomy-validator';

const validator = new VersionedTaxonomyValidator();

async function demonstrateVersionedTaxonomyWorkflow() {
  console.log('🚀 Advanced Versioned Taxonomy Demo\n');
  
  // 1. Add new component with version
  console.log('1️⃣ Adding API Gateway v2 with semver support...');
  await addAPIGatewayV2();
  
  // 2. Validate version compatibility
  console.log('\n2️⃣ Checking version compatibility...');
  await checkCompatibility();
  
  // 3. Validate upgrade safety
  console.log('\n3️⃣ Validating version upgrade safety...');
  await validateUpgrade();
  
  // 4. Generate migration guide
  console.log('\n4️⃣ Generating migration guide...');
  await generateMigrationGuide();
  
  // 5. Get version history
  console.log('\n5️⃣ Retrieving version history...');
  await getVersionHistory();
  
  // 6. Suggest version bump
  console.log('\n6️⃣ Suggesting version bump...');
  await suggestVersionBump();
  
  // 7. Analyze dependency graph
  console.log('\n7️⃣ Analyzing dependency graph...');
  await analyzeDependencies();
  
  // 8. Sort components by version
  console.log('\n8️⃣ Sorting components by version...');
  await sortByVersion();
  
  // 9. Validate all constraints
  console.log('\n9️⃣ Validating all version constraints...');
  await validateConstraints();
  
  // 10. Performance comparison
  console.log('\n🔟 Performance comparison...');
  await performanceComparison();
  
  console.log('\n✅ Semver integration demo completed!');
}

async function addAPIGatewayV2() {
  const apiGatewayV2: VersionedTaxonomyNode = {
    domain: 'INFRASTRUCTURE',
    type: 'API',
    version: '2.1.0',
    versionRange: '^2.0.0',
    dependencies: [
      { 
        nodeId: 'bun-native-cache', 
        versionRange: '^1.0.0', 
        optional: false 
      },
      { 
        nodeId: 'cross-platform-layer', 
        versionRange: '~1.5.0', 
        optional: true 
      },
      { 
        nodeId: 'enterprise-secrets', 
        versionRange: '^1.5.0', 
        optional: false 
      }
    ],
    migrations: [
      {
        fromVersion: '2.0.0',
        toVersion: '2.1.0',
        script: 'migrations/api-gateway-v2.1.0.ts',
        breaking: false
      },
      {
        fromVersion: '2.1.0',
        toVersion: '3.0.0',
        script: 'migrations/api-gateway-v3.0.0.ts',
        breaking: true
      }
    ],
    meta: { 
      framework: 'Elysia', 
      stability: 'stable',
      performance: 'high' 
    },
    class: 'ApiGatewayV2',
    ref: 'src/api/gateway-v2.ts',
    description: 'API Gateway v2 with comprehensive semver support',
    tests: ['tests/api/gateway-v2.test.ts']
  };

  validator.addVersionedNode('api-gateway-v2', apiGatewayV2);
  
  const node = validator.getVersionedNode('api-gateway-v2');
  console.log(`   ✅ Added api-gateway-v2@${node?.version} with ${node?.dependencies?.length} dependencies`);
}

async function checkCompatibility() {
  const report = await validator.validateVersionCompatibility('api-gateway-v2');
  
  console.log(`   📊 Compatibility Report for ${report.nodeId}@${report.version}`);
  console.log(`   Status: ${report.satisfiesRange ? '✅ Compatible' : '❌ Incompatible'}`);
  
  for (const dep of report.dependencies) {
    const status = dep.compatible ? '✅' : '❌';
    console.log(`      ${status} ${dep.dependencyId}: ${dep.actualVersion} (requires ${dep.requiredRange})`);
  }
  
  if (report.recommendations.length > 0) {
    console.log('   💡 Recommendations:');
    report.recommendations.forEach(r => console.log(`      - ${r}`));
  }
}

async function validateUpgrade() {
  const upgradeScenarios = [
    { to: '2.2.0', expected: 'safe' },
    { to: '3.0.0', expected: 'breaking' },
    { to: '2.1.1', expected: 'safe' }
  ];
  
  for (const scenario of upgradeScenarios) {
    const result = validator.validateVersionUpgrade('api-gateway-v2', scenario.to);
    const status = result.safe ? '✅' : '⚠️';
    
    console.log(`   ${status} Upgrade to ${scenario.to}: ${result.safe ? 'Safe' : 'Breaking changes'}`);
    
    if (result.breakingChanges.length > 0) {
      result.breakingChanges.forEach(c => console.log(`      - ${c}`));
    }
  }
}

async function generateMigrationGuide() {
  const guide = validator.generateMigrationGuide('2.1.0', '3.0.0');
  
  console.log('   📋 Migration Guide: 2.1.0 → 3.0.0');
  console.log('   Steps:');
  guide.steps.forEach(s => console.log(`      ${s}`));
  
  if (guide.breakingChanges.length > 0) {
    console.log('   ⚠️  Breaking Changes:');
    guide.breakingChanges.forEach(c => console.log(`      - ${c}`));
  }
}

async function getVersionHistory() {
  try {
    const history = await validator.getVersionHistory('api-gateway-v2');
    
    console.log(`   📜 Version History for ${history.nodeId}`);
    console.log(`      Latest: ${history.latest}`);
    console.log(`      Outdated: ${history.outdated ? '⚠️' : '✅'}`);
    
    if (history.versions.length > 0) {
      history.versions.slice(0, 3).forEach(v => {
        const breaking = v.breaking ? '💥' : '📦';
        console.log(`      ${breaking} ${v.version} (${v.commitHash})`);
      });
    }
  } catch (error) {
    console.log(`   📝 Version history: Git not available, using current version`);
  }
}

async function suggestVersionBump() {
  try {
    const suggestion = await validator.suggestVersionBump('api-gateway-v2');
    
    console.log(`   💡 Version Bump Suggestion for api-gateway-v2`);
    console.log(`      Current: ${suggestion.current}`);
    console.log(`      Suggested: ${suggestion.suggested} (${suggestion.type})`);
    console.log(`      Reason: ${suggestion.reason}`);
  } catch (error) {
    console.log(`   📝 Version bump: Git not available, suggesting patch`);
    console.log(`      Suggested: 2.1.1 (patch)`);
  }
}

async function analyzeDependencies() {
  const graph = validator.getDependencyGraph('api-gateway-v2');
  
  console.log(`   🔗 Dependency Graph for api-gateway-v2`);
  console.log(`      Direct dependencies: ${graph.direct.length}`);
  graph.direct.forEach(dep => {
    const node = validator.getVersionedNode(dep);
    console.log(`         - ${dep}@${node?.version || 'unknown'}`);
  });
  
  console.log(`      Indirect dependencies: ${graph.indirect.length}`);
  console.log(`      Circular dependencies: ${graph.circular.length}`);
  
  // Show reverse dependencies
  const reverseDeps = validator.getReverseDependencyGraph('bun-native-cache');
  console.log(`      Nodes depending on bun-native-cache: ${reverseDeps.length}`);
  reverseDeps.slice(0, 3).forEach(dep => console.log(`         - ${dep}`));
}

async function sortByVersion() {
  const nodeIds = ['api-gateway-v2', 'bun-native-cache', 'unified-api-backbone', 'cross-platform-layer'];
  const sorted = validator.sortNodesByVersion(nodeIds);
  
  console.log('   📊 Components sorted by version:');
  sorted.forEach(id => {
    const node = validator.getVersionedNode(id);
    console.log(`      ${id}@${node?.version}`);
  });
}

async function validateConstraints() {
  const result = await validator.validateVersionConstraints();
  
  console.log(`   🔒 Version Constraints: ${result.valid ? '✅ Valid' : '❌ Invalid'}`);
  
  if (!result.valid) {
    console.log('   Violations:');
    result.violations.forEach(v => {
      console.log(`      ${v.nodeId}: ${v.reason}`);
    });
  }
}

async function performanceComparison() {
  const iterations = 1000;
  const testVersion = '2.1.0';
  const testRange = '^2.0.0';
  
  console.log(`   ⚡ Performance Test (${iterations} iterations)`);
  
  // Test Bun.semver.satisfies
  const bunStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    semver.satisfies(testVersion, testRange);
  }
  const bunTime = performance.now() - bunStart;
  
  // Test semver ordering
  const orderStart = performance.now();
  const versions = ['1.0.0', '2.1.0', '1.5.0', '2.0.0', '1.2.0'];
  for (let i = 0; i < iterations; i++) {
    versions.sort((a, b) => semver.order(a, b));
  }
  const orderTime = performance.now() - orderStart;
  
  console.log(`      Bun.semver.satisfies: ${bunTime.toFixed(2)}ms (${(bunTime/iterations).toFixed(4)}ms per call)`);
  console.log(`      Bun.semver.order: ${orderTime.toFixed(2)}ms (${(orderTime/iterations).toFixed(4)}ms per call)`);
  console.log(`      Performance: Excellent! 🚀`);
}

async function demonstrateAdvancedFeatures() {
  console.log('\n🎯 Advanced Semver Features');
  
  // 1. Complex version ranges
  console.log('\n1️⃣ Complex Version Ranges:');
  const complexRanges = [
    { range: '^2.0.0', version: '2.1.0', compatible: true },
    { range: '~1.5.0', version: '1.5.2', compatible: true },
    { range: '>=1.0.0 <3.0.0', version: '2.5.0', compatible: true },
    { range: '1.x || 2.x', version: '2.1.0', compatible: true }
  ];
  
  complexRanges.forEach(({ range, version, compatible }) => {
    const result = semver.satisfies(version, range);
    const status = result === compatible ? '✅' : '❌';
    console.log(`   ${status} ${version} satisfies ${range}: ${result}`);
  });
  
  // 2. Version difference calculation
  console.log('\n2️⃣ Version Difference:');
  const versions = ['1.0.0', '1.2.0', '2.0.0', '2.1.0'];
  for (let i = 0; i < versions.length - 1; i++) {
    const diff = semver.order(versions[i], versions[i + 1]);
    const relation = diff === -1 ? 'older than' : diff === 1 ? 'newer than' : 'equal to';
    console.log(`   ${versions[i]} is ${relation} ${versions[i + 1]}`);
  }
  
  // 3. Prerelease handling
  console.log('\n3️⃣ Prerelease Handling:');
  const prereleaseVersions = ['1.0.0-alpha.1', '1.0.0-beta.2', '1.0.0', '1.0.1'];
  prereleaseVersions.forEach(v => {
    console.log(`   ${v} - ${semver.satisfies(v, '^1.0.0') ? 'satisfies' : 'does not satisfy'} ^1.0.0`);
  });
}

async function exportTaxonomyData() {
  console.log('\n📤 Exporting Taxonomy Data');
  
  // Export as JSON
  const jsonExport = validator.exportVersionedTaxonomyJSON();
  console.log('   ✅ JSON export generated');
  
  // Export as Markdown
  const markdownExport = validator.exportMarkdown();
  console.log('   ✅ Markdown export generated');
  
  // Show statistics
  const nodes = validator.getAllVersionedNodes();
  const stats = {
    total: nodes.size,
    versioned: Array.from(nodes.values()).filter(n => n.version).length,
    withDeps: Array.from(nodes.values()).filter(n => n.dependencies?.length).length,
    withMigrations: Array.from(nodes.values()).filter(n => n.migrations?.length).length
  };
  
  console.log(`   📊 Statistics:`);
  console.log(`      Total nodes: ${stats.total}`);
  console.log(`      Versioned: ${stats.versioned}`);
  console.log(`      With dependencies: ${stats.withDeps}`);
  console.log(`      With migrations: ${stats.withMigrations}`);
}

// Main execution
async function main() {
  try {
    await demonstrateVersionedTaxonomyWorkflow();
    await demonstrateAdvancedFeatures();
    await exportTaxonomyData();
    
    console.log('\n🎉 All versioned taxonomy features demonstrated successfully!');
    console.log('\n📚 Next Steps:');
    console.log('   1. Run: bun run cli/version-control-cli.ts check-all');
    console.log('   2. Try: bun run cli/version-control-cli.ts suggest api-gateway-v2');
    console.log('   3. Test: bun run cli/version-control-cli.ts migrate 2.1.0 3.0.0');
    console.log('   4. Export: bun run cli/version-control-cli.ts export json');
    
  } catch (error) {
    console.error('❌ Error in versioned taxonomy demo:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.main) {
  main();
}
