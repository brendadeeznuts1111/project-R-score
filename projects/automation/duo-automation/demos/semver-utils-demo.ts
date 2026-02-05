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
    console.log('🏷️ Bun Semver Utilities Demo');
    console.log('='.repeat(50));
    console.log('');
    
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
      
      console.log('✅ Semver utilities demo completed successfully!');
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
      throw error;
    }
  }
  
  private demonstrateBasicOperations(): void {
    console.log('🔧 BASIC SEMVER OPERATIONS');
    console.log('─'.repeat(35));
    
    // Version satisfaction
    console.log('📋 Version Satisfaction:');
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
      console.log(`  ${status} ${version} satisfies ${range}: ${satisfied}`);
    });
    console.log('');
    
    // Version cleaning
    console.log('🧹 Version Cleaning:');
    const dirtyVersions = ['v1.2.3', '1.2', '1', '1.2.3-beta.0', ' 1.2.3  '];
    dirtyVersions.forEach(version => {
      const cleaned = SemverUtils.clean(version);
      console.log(`  "${version}" → "${cleaned}"`);
    });
    console.log('');
  }
  
  private demonstrateVersionComparison(): void {
    console.log('⚖️ VERSION COMPARISON');
    console.log('─'.repeat(35));
    
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
      console.log(`  ${v1} ${symbol} ${v2} (${result})`);
    });
    
    console.log('');
    console.log('🔍 Comparison Methods:');
    const testVersions = ['1.2.3', '1.2.4'];
    console.log(`  gt(1.2.4, 1.2.3): ${SemverUtils.gt('1.2.4', '1.2.3')}`);
    console.log(`  lt(1.2.3, 1.2.4): ${SemverUtils.lt('1.2.3', '1.2.4')}`);
    console.log(`  eq(1.2.3, 1.2.3): ${SemverUtils.eq('1.2.3', '1.2.3')}`);
    console.log(`  gte(1.2.3, 1.2.3): ${SemverUtils.gte('1.2.3', '1.2.3')}`);
    console.log(`  lte(1.2.3, 1.2.3): ${SemverUtils.lte('1.2.3', '1.2.3')}`);
    console.log(`  neq(1.2.3, 1.2.4): ${SemverUtils.neq('1.2.3', '1.2.4')}`);
    console.log('');
  }
  
  private demonstrateRangeMatching(): void {
    console.log('🎯 RANGE MATCHING');
    console.log('─'.repeat(35));
    
    const versions = ['1.0.0', '1.2.0', '1.2.3', '1.3.0', '2.0.0', '2.1.0'];
    const ranges = ['^1.2.0', '~1.2.0', '>=1.2.0 <2.0.0', '1.x', '*'];
    
    ranges.forEach(range => {
      console.log(`\n📊 Range: ${range}`);
      const satisfying = SemverUtils.satisfyingVersions(versions, range);
      const max = SemverUtils.maxSatisfying(versions, range);
      const min = SemverUtils.minSatisfying(versions, range);
      
      console.log(`  Satisfying: [${satisfying.join(', ')}]`);
      console.log(`  Max: ${max || 'none'}`);
      console.log(`  Min: ${min || 'none'}`);
    });
    console.log('');
  }
  
  private demonstrateVersionValidation(): void {
    console.log('✅ VERSION VALIDATION');
    console.log('─'.repeat(35));
    
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
    
    console.log('🔍 Valid Versions:');
    testVersions.forEach(version => {
      const valid = SemverUtils.valid(version);
      const status = valid ? '✅' : '❌';
      console.log(`  ${status} "${version}": ${valid}`);
    });
    
    console.log('\n🔍 Valid Ranges:');
    const testRanges = ['^1.2.0', '~1.2.0', '>=1.2.0', 'invalid', '', null as any];
    testRanges.forEach(range => {
      const valid = SemverUtils.validRange(range);
      const status = valid ? '✅' : '❌';
      console.log(`  ${status} "${range}": ${valid}`);
    });
    console.log('');
  }
  
  private demonstrateVersionSorting(): void {
    console.log('📊 VERSION SORTING');
    console.log('─'.repeat(35));
    
    const unsortedVersions = [
      '1.3.0',
      '1.2.0',
      '2.0.0',
      '1.2.3',
      '1.2.10',
      '1.10.0',
      '1.2.2'
    ];
    
    console.log(`📋 Original: [${unsortedVersions.join(', ')}]`);
    
    const sorted = SemverUtils.sort(unsortedVersions);
    console.log(`📈 Ascending: [${sorted.join(', ')}]`);
    
    const reverseSorted = SemverUtils.rsort(unsortedVersions);
    console.log(`📉 Descending: [${reverseSorted.join(', ')}]`);
    console.log('');
  }
  
  private demonstrateVersionIncrementing(): void {
    console.log('⬆️ VERSION INCREMENTING');
    console.log('─'.repeat(35));
    
    const baseVersion = '1.2.3';
    console.log(`🎯 Base Version: ${baseVersion}`);
    
    const increments = ['major', 'minor', 'patch', 'prerelease'] as const;
    increments.forEach(increment => {
      const newVersion = SemverUtils.increment(baseVersion, increment);
      console.log(`  ${increment}: ${baseVersion} → ${newVersion}`);
    });
    
    console.log('\n🔄 Increment Chain:');
    let version = '1.0.0';
    console.log(`  Start: ${version}`);
    version = SemverUtils.increment(version, 'patch');
    console.log(`  Patch:  ${version}`);
    version = SemverUtils.increment(version, 'minor');
    console.log(`  Minor:  ${version}`);
    version = SemverUtils.increment(version, 'major');
    console.log(`  Major:  ${version}`);
    console.log('');
  }
  
  private demonstrateConstraintValidation(): void {
    console.log('🔍 CONSTRAINT VALIDATION');
    console.log('─'.repeat(35));
    
    const constraints = [
      { version: '1.2.3', range: '^1.2.0' },
      { version: '2.0.0', range: '^1.2.0' },
      { version: '1.2.4', range: '~1.2.0' },
      { version: '1.3.0', range: '~1.2.0' },
      { version: '1.2.3-beta', range: '1.2.3-beta' },
    ];
    
    const results: VersionConstraint[] = SemverUtils.validateConstraints(constraints);
    
    console.log('📋 Constraint Results:');
    results.forEach(({ version, range, satisfied }) => {
      const status = satisfied ? '✅' : '❌';
      console.log(`  ${status} ${version} vs ${range}: ${satisfied}`);
    });
    
    console.log('\n📊 Version Differences:');
    const diffs: VersionComparison[] = [
      SemverUtils.diff('1.2.3', '1.2.4'),
      SemverUtils.diff('2.0.0', '1.9.9'),
      SemverUtils.diff('1.2.3', '1.2.3'),
    ];
    
    diffs.forEach(({ version1, version2, result, valid }) => {
      const symbol = result === 'lt' ? '<' : result === 'gt' ? '>' : '===';
      const validity = valid ? '✅' : '❌';
      console.log(`  ${validity} ${version1} ${symbol} ${version2} (${result})`);
    });
    console.log('');
  }
  
  private async demonstrateDependencyChecking(): Promise<void> {
    console.log('📦 DEPENDENCY CHECKING');
    console.log('─'.repeat(35));
    
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
    
    console.log('📋 Dependencies Found:');
    dependencies.forEach(({ name, version, type }) => {
      const typeIcon = {
        dependencies: '📦',
        devDependencies: '🛠️',
        peerDependencies: '🤝',
        optionalDependencies: '⚪'
      }[type];
      
      console.log(`  ${typeIcon} ${name}@${version} (${type})`);
    });
    
    console.log('\n🔍 Version Satisfaction Check:');
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
        console.log(`  ${status} ${name}: current ${current} satisfies ${version}: ${satisfied}`);
      }
    });
    console.log('');
  }
  
  private demonstrateVersionManager(): void {
    console.log('🎛️ VERSION MANAGER');
    console.log('─'.repeat(35));
    
    const manager = new VersionManager('1.0.0');
    
    console.log(`🎯 Initial Version: ${manager.getVersion()}`);
    
    console.log('\n⬆️ Version Increments:');
    console.log(`  Patch:  ${manager.increment('patch')}`);
    console.log(`  Minor:  ${manager.increment('minor')}`);
    console.log(`  Major:  ${manager.increment('major')}`);
    
    console.log('\n🔍 Version Comparisons:');
    console.log(`  vs 2.0.0: ${manager.compare('2.0.0')}`);
    console.log(`  vs 1.0.0: ${manager.compare('1.0.0')}`);
    console.log(`  vs 0.9.0: ${manager.compare('0.9.0')}`);
    
    console.log('\n📋 Range Satisfaction:');
    console.log(`  ^1.0.0: ${manager.satisfies('^1.0.0')}`);
    console.log(`  ~2.0.0: ${manager.satisfies('~2.0.0')}`);
    console.log(`  >=1.0.0: ${manager.satisfies('>=1.0.0')}`);
    
    console.log('\n🔄 Version Reset:');
    manager.setVersion('2.1.0');
    console.log(`  New version: ${manager.getVersion()}`);
    console.log('');
  }
  
  private demonstrateAdvancedOperations(): void {
    console.log('🚀 ADVANCED OPERATIONS');
    console.log('─'.repeat(35));
    
    // Range intersection
    console.log('🔗 Range Intersection:');
    const intersections = [
      { range1: '^1.0.0', range2: '~1.2.0' },
      { range1: '>=1.0.0', range2: '<2.0.0' },
      { range1: '^1.0.0', range2: '^2.0.0' },
    ];
    
    intersections.forEach(({ range1, range2 }) => {
      const intersection = SemverUtils.rangeIntersection(range1, range2);
      const result = intersection || 'no intersection';
      console.log(`  ${range1} ∩ ${range2} = ${result}`);
    });
    
    console.log('\n📊 Complex Range Examples:');
    const complexRanges = [
      '1.2.3 - 2.3.4',
      '~1.2.3 || ~2.0.0',
      '^1.2.3 || ^2.0.0',
      '>=1.2.3 <2.0.0 || >=3.0.0',
    ];
    
    const testVersions = ['1.2.3', '1.2.4', '1.3.0', '2.0.0', '2.1.0', '3.0.0'];
    
    complexRanges.forEach(range => {
      const satisfying = SemverUtils.satisfyingVersions(testVersions, range);
      console.log(`  ${range}: [${satisfying.join(', ')}]`);
    });
    
    console.log('\n🔍 Prerelease Handling:');
    const prereleaseTests = [
      { version: '1.0.0-alpha', range: '1.0.0-alpha' },
      { version: '1.0.0-alpha.1', range: '1.0.0-alpha' },
      { version: '1.0.0-beta', range: '1.0.0-alpha' },
      { version: '1.0.0', range: '1.0.0-alpha' },
    ];
    
    prereleaseTests.forEach(({ version, range }) => {
      const satisfied = SemverUtils.satisfies(version, range);
      const status = satisfied ? '✅' : '❌';
      console.log(`  ${status} ${version} satisfies ${range}: ${satisfied}`);
    });
    
    console.log('');
  }
}

// Main execution
async function runSemverUtilsDemo(): Promise<void> {
  const demo = new SemverUtilsDemo();
  
  try {
    await demo.runCompleteDemo();
    
    console.log('🎉 Semver Utilities Demo Summary');
    console.log('='.repeat(45));
    console.log('');
    console.log('✅ Features Demonstrated:');
    console.log('   🔧 Basic semver operations (satisfies, clean)');
    console.log('   ⚖️ Version comparison (gt, lt, eq, gte, lte, neq)');
    console.log('   🎯 Range matching with complex patterns');
    console.log('   ✅ Version and range validation');
    console.log('   📊 Version sorting (ascending/descending)');
    console.log('   ⬆️ Version incrementing (major, minor, patch, prerelease)');
    console.log('   🔍 Constraint validation and diffing');
    console.log('   📦 Dependency checking from package.json');
    console.log('   🎛️ Version manager class');
    console.log('   🚀 Advanced operations (intersection, complex ranges)');
    console.log('');
    console.log('🎯 Key Benefits:');
    console.log('   • Built on Bun\'s native semver implementation');
    console.log('   • Type-safe with comprehensive TypeScript support');
    console.log('   • Handles all standard semver patterns and ranges');
    console.log('   • Includes prerelease and build metadata support');
    console.log('   • Performance optimized for large version arrays');
    console.log('   • Comprehensive error handling and validation');
    console.log('');
    console.log('🚀 Production Ready! 🎉');
    
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
