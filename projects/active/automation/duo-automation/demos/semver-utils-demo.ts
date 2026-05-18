/**
 * 🏷️ Bun Semver Utilities Demo
 * 
 * Comprehensive demonstration of semantic versioning utilities using Bun's built-in semver functions.
 * Shows version validation, comparison, range matching, and dependency management.
 */

import { 
  SemverUtils, 
  VersionManager,
  type VersionConstraint,
  type DependencyInfo,
  type VersionComparison
} from '../src/@core/utils/semver-utils';

class SemverUtilsDemo {
  
  async runCompleteDemo(): Promise<void> {
    console.info('🏷️ Bun Semver Utilities Demo');
    console.info('='.repeat(50));
    console.info('');
    
    try {
      // Run all demonstrations
      this.demonstrateBasicOperations();
      this.demonstrateVersionComparison();
      this.demonstrateRangeMatching();
      this.demonstrateVersionValidation();
      this.demonstrateVersionSorting();
      this.demonstrateVersionIncrementing();
      this.demonstrateConstraintValidation();
      this.demonstrateDependencyChecking();
      this.demonstrateVersionManager();
      this.demonstrateAdvancedOperations();
      
      console.info('✅ Semver utilities demo completed successfully!');
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
      throw error;
    }
  }
  
  private demonstrateBasicOperations(): void {
    console.info('🔧 BASIC SEMVER OPERATIONS');
    console.info('─'.repeat(35));
    
    // Version satisfaction
    console.info('📋 Version Satisfaction:');
    const satisfactionTests = [
      { version: '1.2.3', range: '^1.2.0' },
      { version: '2.0.0', range: '^1.2.0' },
      { version: '1.3.0', range: '~1.2.0' },
      { version: '1.2.4', range: '~1.2.0' },
      { version: '1.2.3-beta', range: '1.2.3-beta' },
      { version: '1.2.3', range: '>=1.2.0 <2.0.0' },
    ];
    
    satisfactionTests.forEach(({ version, range }) => {
      const satisfied = SemverUtils.satisfies(version, range);
      const status = satisfied ? '✅' : '❌';
      console.info(`  ${status} ${version} satisfies ${range}: ${satisfied}`);
    });
    console.info('');
    
    // Version cleaning
    console.info('🧹 Version Cleaning:');
    const dirtyVersions = ['v1.2.3', '1.2', '1', '1.2.3-beta.0', ' 1.2.3  '];
    dirtyVersions.forEach(version => {
      const cleaned = SemverUtils.clean(version);
      console.info(`  "${version}" → "${cleaned}"`);
    });
    console.info('');
  }
  
  private demonstrateVersionComparison(): void {
    console.info('⚖️ VERSION COMPARISON');
    console.info('─'.repeat(35));
    
    const comparisons = [
      { v1: '1.2.3', v2: '1.2.4' },
      { v1: '1.2.3', v2: '1.2.3' },
      { v1: '1.2.5', v2: '1.2.4' },
      { v1: '2.0.0', v2: '1.9.9' },
      { v1: '1.2.3-alpha', v2: '1.2.3' },
    ];
    
    comparisons.forEach(({ v1, v2 }) => {
      const result = SemverUtils.compare(v1, v2);
      const symbol = result === 'lt' ? '<' : result === 'gt' ? '>' : '===';
      console.info(`  ${v1} ${symbol} ${v2} (${result})`);
    });
    
    console.info('');
    console.info('🔍 Comparison Methods:');
    const testVersions = ['1.2.3', '1.2.4'];
    console.info(`  gt(1.2.4, 1.2.3): ${SemverUtils.gt('1.2.4', '1.2.3')}`);
    console.info(`  lt(1.2.3, 1.2.4): ${SemverUtils.lt('1.2.3', '1.2.4')}`);
    console.info(`  eq(1.2.3, 1.2.3): ${SemverUtils.eq('1.2.3', '1.2.3')}`);
    console.info(`  gte(1.2.3, 1.2.3): ${SemverUtils.gte('1.2.3', '1.2.3')}`);
    console.info(`  lte(1.2.3, 1.2.3): ${SemverUtils.lte('1.2.3', '1.2.3')}`);
    console.info(`  neq(1.2.3, 1.2.4): ${SemverUtils.neq('1.2.3', '1.2.4')}`);
    console.info('');
  }
  
  private demonstrateRangeMatching(): void {
    console.info('🎯 RANGE MATCHING');
    console.info('─'.repeat(35));
    
    const versions = ['1.0.0', '1.2.0', '1.2.3', '1.3.0', '2.0.0', '2.1.0'];
    const ranges = ['^1.2.0', '~1.2.0', '>=1.2.0 <2.0.0', '1.x', '*'];
    
    ranges.forEach(range => {
      console.info(`\n📊 Range: ${range}`);
      const satisfying = SemverUtils.satisfyingVersions(versions, range);
      const max = SemverUtils.maxSatisfying(versions, range);
      const min = SemverUtils.minSatisfying(versions, range);
      
      console.info(`  Satisfying: [${satisfying.join(', ')}]`);
      console.info(`  Max: ${max || 'none'}`);
      console.info(`  Min: ${min || 'none'}`);
    });
    console.info('');
  }
  
  private demonstrateVersionValidation(): void {
    console.info('✅ VERSION VALIDATION');
    console.info('─'.repeat(35));
    
    const testVersions = [
      '1.2.3',
      'v1.2.3',
      '1.2.3-beta',
      '1.2.3-beta.0',
      '1.2.3-alpha.1',
      'invalid',
      '1.2.3.4',
      '1.2',
      '',
      null as any,
      undefined as any,
    ];
    
    console.info('🔍 Valid Versions:');
    testVersions.forEach(version => {
      const valid = SemverUtils.valid(version);
      const status = valid ? '✅' : '❌';
      console.info(`  ${status} "${version}": ${valid}`);
    });
    
    console.info('\n🔍 Valid Ranges:');
    const testRanges = ['^1.2.0', '~1.2.0', '>=1.2.0', 'invalid', '', null as any];
    testRanges.forEach(range => {
      const valid = SemverUtils.validRange(range);
      const status = valid ? '✅' : '❌';
      console.info(`  ${status} "${range}": ${valid}`);
    });
    console.info('');
  }
  
  private demonstrateVersionSorting(): void {
    console.info('📊 VERSION SORTING');
    console.info('─'.repeat(35));
    
    const unsortedVersions = [
      '1.3.0',
      '1.2.0',
      '2.0.0',
      '1.2.3',
      '1.2.10',
      '1.10.0',
      '1.2.2'
    ];
    
    console.info(`📋 Original: [${unsortedVersions.join(', ')}]`);
    
    const sorted = SemverUtils.sort(unsortedVersions);
    console.info(`📈 Ascending: [${sorted.join(', ')}]`);
    
    const reverseSorted = SemverUtils.rsort(unsortedVersions);
    console.info(`📉 Descending: [${reverseSorted.join(', ')}]`);
    console.info('');
  }
  
  private demonstrateVersionIncrementing(): void {
    console.info('⬆️ VERSION INCREMENTING');
    console.info('─'.repeat(35));
    
    const baseVersion = '1.2.3';
    console.info(`🎯 Base Version: ${baseVersion}`);
    
    const increments = ['major', 'minor', 'patch', 'prerelease'] as const;
    increments.forEach(increment => {
      const newVersion = SemverUtils.increment(baseVersion, increment);
      console.info(`  ${increment}: ${baseVersion} → ${newVersion}`);
    });
    
    console.info('\n🔄 Increment Chain:');
    let version = '1.0.0';
    console.info(`  Start: ${version}`);
    version = SemverUtils.increment(version, 'patch');
    console.info(`  Patch:  ${version}`);
    version = SemverUtils.increment(version, 'minor');
    console.info(`  Minor:  ${version}`);
    version = SemverUtils.increment(version, 'major');
    console.info(`  Major:  ${version}`);
    console.info('');
  }
  
  private demonstrateConstraintValidation(): void {
    console.info('🔍 CONSTRAINT VALIDATION');
    console.info('─'.repeat(35));
    
    const constraints = [
      { version: '1.2.3', range: '^1.2.0' },
      { version: '2.0.0', range: '^1.2.0' },
      { version: '1.2.4', range: '~1.2.0' },
      { version: '1.3.0', range: '~1.2.0' },
      { version: '1.2.3-beta', range: '1.2.3-beta' },
    ];
    
    const results: VersionConstraint[] = SemverUtils.validateConstraints(constraints);
    
    console.info('📋 Constraint Results:');
    results.forEach(({ version, range, satisfied }) => {
      const status = satisfied ? '✅' : '❌';
      console.info(`  ${status} ${version} vs ${range}: ${satisfied}`);
    });
    
    console.info('\n📊 Version Differences:');
    const diffs: VersionComparison[] = [
      SemverUtils.diff('1.2.3', '1.2.4'),
      SemverUtils.diff('2.0.0', '1.9.9'),
      SemverUtils.diff('1.2.3', '1.2.3'),
    ];
    
    diffs.forEach(({ version1, version2, result, valid }) => {
      const symbol = result === 'lt' ? '<' : result === 'gt' ? '>' : '===';
      const validity = valid ? '✅' : '❌';
      console.info(`  ${validity} ${version1} ${symbol} ${version2} (${result})`);
    });
    console.info('');
  }
  
  private async demonstrateDependencyChecking(): Promise<void> {
    console.info('📦 DEPENDENCY CHECKING');
    console.info('─'.repeat(35));
    
    // Create a mock package.json
    const mockPackageJson = {
      name: 'duoplus-demo',
      version: '1.0.0',
      dependencies: {
        'bun': '^1.0.0',
        'typescript': '^5.0.0',
        'react': '^18.0.0',
      },
      devDependencies: {
        'jest': '^29.0.0',
        'eslint': '^8.0.0',
      },
      peerDependencies: {
        'node': '>=18.0.0',
      },
      optionalDependencies: {
        'lodash': '^4.0.0',
      }
    };
    
    const dependencies: DependencyInfo[] = await SemverUtils.checkDependencies(mockPackageJson);
    
    console.info('📋 Dependencies Found:');
    dependencies.forEach(({ name, version, type }) => {
      const typeIcon = {
        dependencies: '📦',
        devDependencies: '🛠️',
        peerDependencies: '🤝',
        optionalDependencies: '⚪'
      }[type];
      
      console.info(`  ${typeIcon} ${name}@${version} (${type})`);
    });
    
    console.info('\n🔍 Version Satisfaction Check:');
    // Check if we're satisfying some common constraints
    const currentVersions = {
      'bun': '1.0.15',
      'typescript': '5.2.2',
      'react': '18.2.0',
      'node': '20.0.0',
    };
    
    dependencies.forEach(({ name, version, type }) => {
      if (currentVersions[name as keyof typeof currentVersions]) {
        const current = currentVersions[name as keyof typeof currentVersions];
        const satisfied = SemverUtils.satisfies(current, version);
        const status = satisfied ? '✅' : '❌';
        console.info(`  ${status} ${name}: current ${current} satisfies ${version}: ${satisfied}`);
      }
    });
    console.info('');
  }
  
  private demonstrateVersionManager(): void {
    console.info('🎛️ VERSION MANAGER');
    console.info('─'.repeat(35));
    
    const manager = new VersionManager('1.0.0');
    
    console.info(`🎯 Initial Version: ${manager.getVersion()}`);
    
    console.info('\n⬆️ Version Increments:');
    console.info(`  Patch:  ${manager.increment('patch')}`);
    console.info(`  Minor:  ${manager.increment('minor')}`);
    console.info(`  Major:  ${manager.increment('major')}`);
    
    console.info('\n🔍 Version Comparisons:');
    console.info(`  vs 2.0.0: ${manager.compare('2.0.0')}`);
    console.info(`  vs 1.0.0: ${manager.compare('1.0.0')}`);
    console.info(`  vs 0.9.0: ${manager.compare('0.9.0')}`);
    
    console.info('\n📋 Range Satisfaction:');
    console.info(`  ^1.0.0: ${manager.satisfies('^1.0.0')}`);
    console.info(`  ~2.0.0: ${manager.satisfies('~2.0.0')}`);
    console.info(`  >=1.0.0: ${manager.satisfies('>=1.0.0')}`);
    
    console.info('\n🔄 Version Reset:');
    manager.setVersion('2.1.0');
    console.info(`  New version: ${manager.getVersion()}`);
    console.info('');
  }
  
  private demonstrateAdvancedOperations(): void {
    console.info('🚀 ADVANCED OPERATIONS');
    console.info('─'.repeat(35));
    
    // Range intersection
    console.info('🔗 Range Intersection:');
    const intersections = [
      { range1: '^1.0.0', range2: '~1.2.0' },
      { range1: '>=1.0.0', range2: '<2.0.0' },
      { range1: '^1.0.0', range2: '^2.0.0' },
    ];
    
    intersections.forEach(({ range1, range2 }) => {
      const intersection = SemverUtils.rangeIntersection(range1, range2);
      const result = intersection || 'no intersection';
      console.info(`  ${range1} ∩ ${range2} = ${result}`);
    });
    
    console.info('\n📊 Complex Range Examples:');
    const complexRanges = [
      '1.2.3 - 2.3.4',
      '~1.2.3 || ~2.0.0',
      '^1.2.3 || ^2.0.0',
      '>=1.2.3 <2.0.0 || >=3.0.0',
    ];
    
    const testVersions = ['1.2.3', '1.2.4', '1.3.0', '2.0.0', '2.1.0', '3.0.0'];
    
    complexRanges.forEach(range => {
      const satisfying = SemverUtils.satisfyingVersions(testVersions, range);
      console.info(`  ${range}: [${satisfying.join(', ')}]`);
    });
    
    console.info('\n🔍 Prerelease Handling:');
    const prereleaseTests = [
      { version: '1.0.0-alpha', range: '1.0.0-alpha' },
      { version: '1.0.0-alpha.1', range: '1.0.0-alpha' },
      { version: '1.0.0-beta', range: '1.0.0-alpha' },
      { version: '1.0.0', range: '1.0.0-alpha' },
    ];
    
    prereleaseTests.forEach(({ version, range }) => {
      const satisfied = SemverUtils.satisfies(version, range);
      const status = satisfied ? '✅' : '❌';
      console.info(`  ${status} ${version} satisfies ${range}: ${satisfied}`);
    });
    
    console.info('');
  }
}

// Main execution
async function runSemverUtilsDemo(): Promise<void> {
  const demo = new SemverUtilsDemo();
  
  try {
    await demo.runCompleteDemo();
    
    console.info('🎉 Semver Utilities Demo Summary');
    console.info('='.repeat(45));
    console.info('');
    console.info('✅ Features Demonstrated:');
    console.info('   🔧 Basic semver operations (satisfies, clean)');
    console.info('   ⚖️ Version comparison (gt, lt, eq, gte, lte, neq)');
    console.info('   🎯 Range matching with complex patterns');
    console.info('   ✅ Version and range validation');
    console.info('   📊 Version sorting (ascending/descending)');
    console.info('   ⬆️ Version incrementing (major, minor, patch, prerelease)');
    console.info('   🔍 Constraint validation and diffing');
    console.info('   📦 Dependency checking from package.json');
    console.info('   🎛️ Version manager class');
    console.info('   🚀 Advanced operations (intersection, complex ranges)');
    console.info('');
    console.info('🎯 Key Benefits:');
    console.info('   • Built on Bun\'s native semver implementation');
    console.info('   • Type-safe with comprehensive TypeScript support');
    console.info('   • Handles all standard semver patterns and ranges');
    console.info('   • Includes prerelease and build metadata support');
    console.info('   • Performance optimized for large version arrays');
    console.info('   • Comprehensive error handling and validation');
    console.info('');
    console.info('🚀 Production Ready! 🎉');
    
  } catch (error) {
    console.error('❌ Semver utilities demo failed to complete:', error);
    process.exit(1);
  }
}

// Execute demo if run directly
if (import.meta.main) {
  runSemverUtilsDemo();
}

export { SemverUtilsDemo, runSemverUtilsDemo };
