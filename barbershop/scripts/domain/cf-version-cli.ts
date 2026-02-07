#!/usr/bin/env bun
/**
 * Unified Version Management CLI
 * 
 * Semantic versioning across all Cloudflare resources using Bun.semver
 * 
 * Usage:
 *   bun run cf-version.ts [command] [options]
 */

import { 
  versionManager, 
  semver,
  versionSatisfies,
  bumpVersion,
  isValidSemver 
} from '../../lib/cloudflare/unified-versioning';
import {
  ThemedConsole,
  getDomainTheme,
  themedSeparator
} from '../../themes/config/domain-theme';
import { FACTORY_WAGER_BRAND } from '../../src/config/domain';
import type { ThemeName } from '../../themes/config';

const args = process.argv.slice(2);
const command = args[0];
const subcommand = args[1];

// Initialize themed console
const t = new ThemedConsole('professional');

function printHeader(): void {
  const { icon, name } = FACTORY_WAGER_BRAND;
  const separator = themedSeparator('professional', 60);
  
  t.log();
  t.log(separator);
  t.log(`${icon} ${name} Version Manager`);
  t.log(`   Powered by Bun.semver`);
  t.log(separator);
  t.log();
}

// ==================== Commands ====================

async function cmdCompare(): Promise<void> {
  const [v1, v2] = [args[1], args[2]];
  
  if (!v1 || !v2) {
    t.error('Usage: compare <version1> <version2>');
    return;
  }

  t.header(`🔍 Comparing: ${v1} vs ${v2}`);
  t.log();

  if (!isValidSemver(v1) || !isValidSemver(v2)) {
    t.error('Invalid semver format');
    return;
  }

  const result = versionManager.compare(v1, v2);
  const comparison = result < 0 ? '<' : result > 0 ? '>' : '==';
  
  t.log(`  ${v1} ${comparison} ${v2}`);
  
  if (result < 0) {
    t.info(`${v2} is greater than ${v1}`);
  } else if (result > 0) {
    t.info(`${v1} is greater than ${v2}`);
  } else {
    t.info('Versions are equal');
  }
}

async function cmdSatisfies(): Promise<void> {
  const [version, range] = [args[1], args[2]];
  
  if (!version || !range) {
    t.error('Usage: satisfies <version> <range>');
    t.log('  Example: satisfies 1.2.3 ^1.0.0');
    return;
  }

  t.header(`✓ Version Check: ${version} satisfies ${range}?`);
  t.log();

  const satisfies = versionSatisfies(version, range);
  
  if (satisfies) {
    t.success(`Yes! ${version} satisfies ${range}`);
  } else {
    t.warning(`No! ${version} does NOT satisfy ${range}`);
  }
}

async function cmdBump(): Promise<void> {
  const [version, type] = [args[1], args[2] as 'major' | 'minor' | 'patch'];
  
  if (!version || !type) {
    t.error('Usage: bump <version> <major|minor|patch>');
    return;
  }

  if (!['major', 'minor', 'patch'].includes(type)) {
    t.error('Type must be: major, minor, or patch');
    return;
  }

  t.header(`⬆️  Bump: ${version} (${type})`);
  t.log();

  try {
    const newVersion = bumpVersion(version, type);
    t.success(`${version} → ${newVersion}`);
    
    const v = versionManager.parseVersion(newVersion);
    t.log(`   Major: ${v.major} | Minor: ${v.minor} | Patch: ${v.patch}`);
    
  } catch (error) {
    t.error(`Invalid version: ${version}`);
  }
}

async function cmdValidate(): Promise<void> {
  const version = args[1];
  
  if (!version) {
    t.error('Usage: validate <version>');
    return;
  }

  t.header(`✓ Validate: ${version}`);
  t.log();

  if (isValidSemver(version)) {
    t.success('Valid semver!');
    const v = versionManager.parseVersion(version);
    t.log(`   Major: ${v.major}`);
    t.log(`   Minor: ${v.minor}`);
    t.log(`   Patch: ${v.patch}`);
    if (v.prerelease) t.log(`   Prerelease: ${v.prerelease}`);
    if (v.build) t.log(`   Build: ${v.build}`);
  } else {
    t.error('Invalid semver format');
    t.log('   Expected format: MAJOR.MINOR.PATCH[-prerelease][+build]');
    t.log('   Example: 1.2.3, 2.0.0-beta.1, 3.1.4+exp.sha.5114f85');
  }
}

async function cmdSort(): Promise<void> {
  const versions = args.slice(1);
  
  if (versions.length < 2) {
    t.error('Usage: sort <version1> <version2> [version3...]');
    return;
  }

  t.header(`📊 Sort Versions`);
  t.log();

  const sorted = versionManager.sortVersions(versions);
  
  t.info('Ascending order:');
  sorted.forEach((v, i) => {
    const marker = i === sorted.length - 1 ? '→' : ' ';
    t.log(`  ${marker} ${v}`);
  });
  
  t.log();
  t.info('Descending order:');
  versionManager.sortVersionsDesc(versions).forEach((v, i) => {
    const marker = i === 0 ? '→' : ' ';
    t.log(`  ${marker} ${v}`);
  });
}

async function cmdRange(): Promise<void> {
  const range = args[1];
  const versions = args.slice(2);
  
  if (!range || versions.length === 0) {
    t.error('Usage: range <semver-range> <version1> [version2...]');
    t.log('  Example: range ^1.0.0 0.9.0 1.0.0 1.5.0 2.0.0');
    return;
  }

  t.header(`🎯 Range Filter: ${range}`);
  t.log();

  const matching = versionManager.filterByRange(versions, range);
  
  t.info('Matching versions:');
  if (matching.length === 0) {
    t.warning('  No versions match');
  } else {
    matching.forEach(v => t.success(`  ✓ ${v}`));
  }
  
  t.log();
  t.info('Non-matching versions:');
  const nonMatching = versions.filter(v => !matching.includes(v));
  if (nonMatching.length === 0) {
    t.muted('  None');
  } else {
    nonMatching.forEach(v => t.warning(`  ✗ ${v}`));
  }
}

async function cmdCompatibility(): Promise<void> {
  const domain = args[1];
  const worker = args[2];
  const r2 = args[3];
  
  if (!domain || !worker || !r2) {
    t.error('Usage: compatibility <domain-v> <worker-v> <r2-v>');
    return;
  }

  t.header(`🔗 Compatibility Check`);
  t.log();

  const matrix = versionManager.checkCompatibility({
    domainVersion: domain,
    workerVersion: worker,
    r2Version: r2,
  });

  t.log(`  Domain: ${matrix.domain}`);
  t.log(`  Worker: ${matrix.worker}`);
  t.log(`  R2:     ${matrix.r2Assets}`);
  t.log();

  if (matrix.compatible) {
    t.success('✓ All components are compatible!');
  } else {
    t.error('✗ Compatibility issues found:');
    matrix.issues?.forEach(issue => t.warning(`  • ${issue}`));
  }
}

async function cmdChangelog(): Promise<void> {
  const fromVersion = args[1];
  const toVersion = args[2];
  
  if (!fromVersion || !toVersion) {
    t.error('Usage: changelog <from-version> <to-version>');
    return;
  }

  t.header(`📝 Changelog: ${fromVersion} → ${toVersion}`);
  t.log();

  const changes = versionManager.generateChangelog(fromVersion, toVersion);
  
  if (changes.length === 0) {
    t.info('No version changes');
  } else {
    changes.forEach(change => t.log(`  ${change}`));
  }
}

async function cmdAuto(): Promise<void> {
  const current = args[1];
  const breaking = parseInt(args[2]) || 0;
  const features = parseInt(args[3]) || 0;
  const fixes = parseInt(args[4]) || 0;
  
  if (!current) {
    t.error('Usage: auto <current-version> [breaking] [features] [fixes]');
    t.log('  Example: auto 1.2.3 0 2 5');
    return;
  }

  t.header(`🤖 Auto Version: ${current}`);
  t.log();

  const result = versionManager.autoIncrement(current, { breaking, features, fixes });
  
  t.info(`Changes: ${breaking} breaking, ${features} features, ${fixes} fixes`);
  t.log();
  t.success(`Recommended: ${result.type} bump`);
  t.log(`  ${current} → ${result.version}`);
}

async function cmdStats(): Promise<void> {
  t.header(`📈 Version Statistics`);
  t.log();

  const stats = versionManager.getStats();
  
  t.info(`Resources: ${stats.totalResources}`);
  t.info(`Deployments: ${stats.totalDeployments}`);
  
  if (stats.versionRange.min && stats.versionRange.max) {
    t.log(`  Range: ${stats.versionRange.min} → ${stats.versionRange.max}`);
  }
}

async function cmdHelp(): Promise<void> {
  printHeader();

  t.header('Usage:');
  t.log('  bun run cf-version.ts <command> [options]');
  t.log();

  t.header('Commands:');
  t.log('  compare <v1> <v2>           Compare two versions');
  t.log('  satisfies <v> <range>       Check if version satisfies range');
  t.log('  bump <version> <type>       Bump version (major|minor|patch)');
  t.log('  validate <version>          Validate semver format');
  t.log('  sort <v1> <v2> [v3...]      Sort versions');
  t.log('  range <range> <v1> [v2...]  Filter versions by range');
  t.log('  compatibility <d> <w> <r>   Check component compatibility');
  t.log('  changelog <from> <to>       Generate changelog');
  t.log('  auto <v> [b] [f] [x]        Auto-increment based on changes');
  t.log('  stats                       Show version statistics');
  t.log('  help                        Show this help');
  t.log();

  t.header('Bun.semver Features:');
  t.log('  • satisfies(version, range) - Check compatibility');
  t.log('  • order(v1, v2)             - Compare versions');
  t.log();

  t.header('Examples:');
  t.log('  bun run cf-version.ts compare 1.2.3 1.3.0');
  t.log('  bun run cf-version.ts satisfies 1.2.3 ^1.0.0');
  t.log('  bun run cf-version.ts bump 1.2.3 minor');
  t.log('  bun run cf-version.ts range ^1.0.0 0.9.0 1.0.0 1.5.0 2.0.0');
  t.log('  bun run cf-version.ts compatibility 2.1.0 2.0.5 2.1.3');
  t.log();
}

// ==================== Main ====================

async function main() {
  if (!command || ['help', '--help', '-h'].includes(command)) {
    await cmdHelp();
    return;
  }

  // Don't print header for help
  if (!['help', '--help', '-h'].includes(command)) {
    printHeader();
  }

  switch (command) {
    case 'compare':
      await cmdCompare();
      break;
    case 'satisfies':
      await cmdSatisfies();
      break;
    case 'bump':
      await cmdBump();
      break;
    case 'validate':
      await cmdValidate();
      break;
    case 'sort':
      await cmdSort();
      break;
    case 'range':
      await cmdRange();
      break;
    case 'compatibility':
      await cmdCompatibility();
      break;
    case 'changelog':
      await cmdChangelog();
      break;
    case 'auto':
      await cmdAuto();
      break;
    case 'stats':
      await cmdStats();
      break;
    default:
      t.error(`Unknown command: ${command}`);
      t.log('Run "help" for available commands');
  }
}

main().catch(console.error);
