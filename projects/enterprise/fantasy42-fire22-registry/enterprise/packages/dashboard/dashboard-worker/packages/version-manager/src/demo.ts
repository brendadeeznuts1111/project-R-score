#!/usr/bin/env bun

/**
 * @fire22/version-manager Demo
 *
 * Interactive demonstration of Bun.semver capabilities
 */

import { BunVersionManager, WorkspaceVersionManager, VersionUtils } from './index';

// Colors for output
const colors = {
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
};

function header(text: string) {
  console.log('\n' + colors.bold(colors.cyan('=' + '='.repeat(60))));
  console.log(colors.bold(colors.cyan(`🏷️  ${text}`)));
  console.log(colors.bold(colors.cyan('=' + '='.repeat(60))));
}

function section(text: string) {
  console.log('\n' + colors.blue(`📋 ${text}`));
  console.log(colors.blue('-'.repeat(40)));
}

async function main() {
  header('Fire22 Version Manager Demo - Powered by Bun.semver');

  // 1. Basic Version Parsing
  section('1. Version Parsing with Bun.semver');

  const versions = [
    '3.1.0',
    '3.1.0-beta.1',
    '3.1.0-beta.1+build.123',
    '1.0.0-alpha.2',
    '2.0.0-rc.1+exp.sha.5114f85',
  ];

  for (const version of versions) {
    try {
      const parsed = VersionUtils.parse(version);
      console.log(`${colors.green('✅')} ${version}`);
      console.log(`   Major: ${parsed.major}, Minor: ${parsed.minor}, Patch: ${parsed.patch}`);
      if (parsed.prerelease && parsed.prerelease.length > 0) {
        console.log(`   Prerelease: ${parsed.prerelease.join('.')}`);
      }
      if (parsed.build && parsed.build.length > 0) {
        console.log(`   Build: ${parsed.build.join('.')}`);
      }
      console.log(`   Formatted: ${parsed.format()}`);
    } catch (error) {
      console.log(`${colors.red('❌')} ${version}: ${error.message}`);
    }
    console.log();
  }

  // 2. Version Comparison
  section('2. Version Comparison');

  const comparisons = [
    ['3.1.0', '3.0.0'],
    ['3.1.0-beta.1', '3.1.0-beta.2'],
    ['3.1.0', '3.1.0-beta.1'],
    ['2.0.0', '1.9.9'],
    ['1.0.0-alpha.1', '1.0.0-alpha.2'],
  ];

  for (const [v1, v2] of comparisons) {
    const result = VersionUtils.compare(v1, v2);
    let comparison = '';
    if (result > 0) {
      comparison = colors.green(`${v1} > ${v2}`);
    } else if (result < 0) {
      comparison = colors.yellow(`${v1} < ${v2}`);
    } else {
      comparison = colors.blue(`${v1} = ${v2}`);
    }
    console.log(`${comparison}`);
  }

  // 3. Range Satisfaction
  section('3. Range Satisfaction');

  const ranges = [
    ['3.1.0', '^3.0.0'],
    ['3.1.0', '~3.1.0'],
    ['3.2.0', '^3.0.0'],
    ['4.0.0', '^3.0.0'],
    ['3.1.0-beta.1', '^3.1.0'],
    ['2.9.0', '>=3.0.0'],
  ];

  for (const [version, range] of ranges) {
    const satisfies = VersionUtils.satisfies(version, range);
    const icon = satisfies ? colors.green('✅') : colors.red('❌');
    console.log(`${icon} ${version} satisfies "${range}": ${satisfies}`);
  }

  // 4. Version Manager Demo
  section('4. Version Manager with History');

  const manager = new BunVersionManager({
    current: '3.1.0',
    minimum: '1.0.0',
  });

  console.log(`Current Version: ${colors.green(manager.getCurrentVersion())}`);

  // Show next version suggestions
  const suggestions = VersionUtils.getNextVersions('3.1.0');
  console.log(`\nNext Version Suggestions:`);
  console.log(`  Patch:  ${colors.green(suggestions.patch)}`);
  console.log(`  Minor:  ${colors.yellow(suggestions.minor)}`);
  console.log(`  Major:  ${colors.red(suggestions.major)}`);
  console.log(`  Alpha:  ${colors.blue(suggestions.prerelease.alpha)}`);
  console.log(`  Beta:   ${colors.blue(suggestions.prerelease.beta)}`);
  console.log(`  RC:     ${colors.blue(suggestions.prerelease.rc)}`);

  // Simulate version bumps
  console.log(`\n${colors.bold('Simulating Version Bumps:')}`);

  try {
    const newPatch = await manager.bumpVersion('patch', {
      author: 'demo-user',
      changes: ['Fix critical bug in authentication'],
      breaking: false,
      dryRun: false,
    });
    console.log(`${colors.green('✅')} Bumped to patch version: ${newPatch}`);

    const newMinor = manager.increment('minor');
    console.log(`${colors.green('✅')} Next minor would be: ${newMinor}`);

    const newMajor = manager.increment('major');
    console.log(`${colors.green('✅')} Next major would be: ${newMajor}`);
  } catch (error) {
    console.log(`${colors.red('❌')} Error in version bump: ${error.message}`);
  }

  // 5. Workspace Management
  section('5. Workspace Management');

  const workspace = new WorkspaceVersionManager('3.1.0');

  // Add some packages
  workspace.addWorkspace('@fire22/wager-system', '3.1.0');
  workspace.addWorkspace('@fire22/security-core', '3.0.8');
  workspace.addWorkspace('@fire22/env-manager', '3.1.0');

  const versions_workspace = workspace.getWorkspaceVersions();
  console.log(`${colors.bold('Workspace Versions:')}`);
  for (const [name, version] of Object.entries(versions_workspace)) {
    const badge = name === 'root' ? colors.yellow(' [ROOT]') : '';
    console.log(`  ${name}${badge}: ${colors.green(version)}`);
  }

  // Check consistency
  const consistency = workspace.checkConsistency();
  if (consistency.consistent) {
    console.log(`${colors.green('✅')} All workspace versions are consistent`);
  } else {
    console.log(`${colors.red('❌')} Version inconsistencies found:`);
    for (const issue of consistency.inconsistencies) {
      console.log(
        `  ${issue.package}: ${colors.red(issue.version)} (expected: ${colors.green(issue.expected)})`
      );
    }
  }

  // 6. Version Sorting and Filtering
  section('6. Version Sorting and Filtering');

  const mixedVersions = [
    '1.0.0',
    '2.0.0-alpha.1',
    '1.2.0',
    '2.0.0',
    '1.10.0',
    '2.0.0-beta.1',
    '1.1.0',
    '2.0.0-rc.1',
  ];

  console.log(`Original: ${mixedVersions.join(', ')}`);

  const sortedAsc = VersionUtils.sort(mixedVersions, false);
  console.log(`Sorted (ascending): ${colors.green(sortedAsc.join(', '))}`);

  const sortedDesc = VersionUtils.sort(mixedVersions, true);
  console.log(`Sorted (descending): ${colors.yellow(sortedDesc.join(', '))}`);

  const filtered = VersionUtils.filterByRange(mixedVersions, '^2.0.0');
  console.log(`Matching ^2.0.0: ${colors.blue(filtered.join(', '))}`);

  // 7. Performance Benchmark
  section('7. Performance Benchmark');

  const iterations = 10000;

  // Parsing benchmark
  const parseStart = Bun.nanoseconds();
  for (let i = 0; i < iterations; i++) {
    VersionUtils.parse('3.1.0-beta.1+build.123');
  }
  const parseTime = Number(Bun.nanoseconds() - parseStart) / 1000000;

  // Comparison benchmark
  const compareStart = Bun.nanoseconds();
  for (let i = 0; i < iterations; i++) {
    VersionUtils.compare('3.1.0', '3.0.0');
  }
  const compareTime = Number(Bun.nanoseconds() - compareStart) / 1000000;

  // Satisfaction benchmark
  const satisfiesStart = Bun.nanoseconds();
  for (let i = 0; i < iterations; i++) {
    VersionUtils.satisfies('3.1.0', '^3.0.0');
  }
  const satisfiesTime = Number(Bun.nanoseconds() - satisfiesStart) / 1000000;

  console.log(`${colors.bold('Performance Results')} (${iterations.toLocaleString()} operations):`);
  console.log(
    `  Parsing:     ${colors.green(parseTime.toFixed(2))}ms total, ${colors.cyan(((parseTime / iterations) * 1000).toFixed(3))}μs per op`
  );
  console.log(
    `  Comparison:  ${colors.green(compareTime.toFixed(2))}ms total, ${colors.cyan(((compareTime / iterations) * 1000).toFixed(3))}μs per op`
  );
  console.log(
    `  Satisfaction: ${colors.green(satisfiesTime.toFixed(2))}ms total, ${colors.cyan(((satisfiesTime / iterations) * 1000).toFixed(3))}μs per op`
  );

  // 8. Error Handling
  section('8. Error Handling');

  const invalidVersions = ['not.a.version', '1.2', '1.2.3.4', '', 'v1.2.3', '1.2.3-'];

  for (const invalid of invalidVersions) {
    try {
      VersionUtils.parse(invalid);
      console.log(`${colors.red('⚠️')} Should have failed: ${invalid}`);
    } catch (error) {
      console.log(`${colors.green('✅')} Correctly rejected: "${invalid}"`);
    }
  }

  // 9. Package Information
  section('9. Package Information');

  const { PACKAGE_INFO } = await import('./index');
  console.log(`Package: ${colors.bold(PACKAGE_INFO.name)}`);
  console.log(`Version: ${colors.green(PACKAGE_INFO.version)}`);
  console.log(`Description: ${PACKAGE_INFO.description}`);
  console.log('\nFeatures:');
  for (const feature of PACKAGE_INFO.features) {
    console.log(`  • ${feature}`);
  }
  console.log('\nPerformance Characteristics:');
  for (const [key, value] of Object.entries(PACKAGE_INFO.performance)) {
    console.log(`  ${key}: ${colors.cyan(value)}`);
  }

  header('Demo Complete - Fire22 Version Manager with Bun.semver');

  console.log(`
${colors.green('🎉 Demo completed successfully!')}

${colors.bold('Key Takeaways:')}
• Native Bun.semver provides ultra-fast parsing and comparison
• Zero external dependencies with full semver compliance
• Complete workspace management and synchronization
• Production-ready with comprehensive error handling
• Sub-millisecond performance for all operations

${colors.bold('Next Steps:')}
• Run: ${colors.cyan('bun run packages/version-manager/src/demo.ts')}
• Try CLI: ${colors.cyan('bun run scripts/version-cli.ts --help')}
• Integration: ${colors.cyan('import { BunVersionManager } from "@fire22/version-manager"')}

${colors.blue('🏷️ Fire22 Version Manager - Production Ready!')}
  `);
}

// Run demo
if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(colors.red(`❌ Demo failed: ${error.message}`));
    process.exit(1);
  }
}
