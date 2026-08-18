#!/usr/bin/env bun
/**
 * @fire22/version-manager CLI Entry Point
 *
 * Primary CLI binary for bunx --package usage
 * Supports all version management operations
 */

import { BunVersionManager, WorkspaceVersionManager, VersionUtils } from './index';

const args = process.argv.slice(2);
const command = args[0] || 'help';

async function main() {
  try {
    switch (command) {
      case 'status':
        await statusCommand();
        break;
      case 'bump':
        await bumpCommand();
        break;
      case 'compare':
        await compareCommand();
        break;
      case 'validate':
        await validateCommand();
        break;
      case 'satisfies':
        await satisfiesCommand();
        break;
      case 'workspace':
        await workspaceCommand();
        break;
      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;
      case 'version':
      case '--version':
      case '-v':
        console.info('3.1.0');
        break;
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

async function statusCommand() {
  const manager = new BunVersionManager({ current: '4.0.0-staging' });
  const current = manager.getCurrentVersion();
  const parsed = VersionUtils.parse(current);

  console.info('🏷️ Version Status');
  console.info(`Current: ${current}`);
  console.info(`Major: ${parsed.major}`);
  console.info(`Minor: ${parsed.minor}`);
  console.info(`Patch: ${parsed.patch}`);

  if (parsed.prerelease.length > 0) {
    console.info(`Prerelease: ${parsed.prerelease.join('.')}`);
  }

  const suggestions = manager.getNextVersionSuggestions();
  console.info('\n📈 Next Versions:');
  console.info(`Patch: ${suggestions.patch}`);
  console.info(`Minor: ${suggestions.minor}`);
  console.info(`Major: ${suggestions.major}`);
}

async function bumpCommand() {
  const strategy = args[args.indexOf('--strategy') + 1] || args[1] || 'patch';
  const reason = args[args.indexOf('--reason') + 1] || 'Version bump via CLI';

  const manager = new BunVersionManager({ current: '4.0.0-staging' });

  console.info(`🚀 Bumping version (${strategy})...`);

  const newVersion = await manager.bumpVersion(strategy as any, {
    author: 'bunx-cli',
    changes: [reason],
    breaking: strategy === 'major',
    dryRun: args.includes('--dry-run'),
  });

  console.info(`✅ Version bumped to: ${newVersion}`);
}

async function compareCommand() {
  const v1 = args[1];
  const v2 = args[2];

  if (!v1 || !v2) {
    console.error('Usage: compare <version1> <version2>');
    process.exit(1);
  }

  const result = VersionUtils.compare(v1, v2);
  const symbol = result > 0 ? '>' : result < 0 ? '<' : '=';

  console.info(`${v1} ${symbol} ${v2}`);
}

async function validateCommand() {
  const version = args[1];

  if (!version) {
    console.error('Usage: validate <version>');
    process.exit(1);
  }

  const isValid = VersionUtils.isValid(version);
  console.info(isValid ? '✅ Valid' : '❌ Invalid');

  if (isValid) {
    const parsed = VersionUtils.parse(version);
    console.info(`Formatted: ${parsed.format()}`);
  }
}

async function satisfiesCommand() {
  const version = args[1];
  const range = args[2];

  if (!version || !range) {
    console.error('Usage: satisfies <version> <range>');
    process.exit(1);
  }

  const satisfies = VersionUtils.satisfies(version, range);
  console.info(satisfies ? '✅ Satisfies' : '❌ Does not satisfy');
}

async function workspaceCommand() {
  const workspace = new WorkspaceVersionManager('4.0.0-staging');

  // Add some demo packages
  workspace.addWorkspace('@fire22/wager-system', '3.1.0');
  workspace.addWorkspace('@fire22/env-manager', '2.1.0');
  workspace.addWorkspace('@fire22/version-manager', '3.1.0');

  const consistency = workspace.checkConsistency();

  console.info('🔄 Workspace Status:');
  console.info(`Consistent: ${consistency.consistent ? '✅' : '❌'}`);

  if (!consistency.consistent) {
    console.info('\n⚠️ Inconsistencies:');
    for (const issue of consistency.inconsistencies) {
      console.info(`- ${issue.package}: ${issue.version} (expected: ${issue.expected})`);
    }
  }

  const versions = workspace.getWorkspaceVersions();
  console.info('\n📦 Package Versions:');
  for (const [pkg, version] of Object.entries(versions)) {
    console.info(`- ${pkg}: ${version}`);
  }
}

function showHelp() {
  console.info(`
🏷️ @fire22/version-manager CLI v3.1.0

USAGE:
  bunx --package @fire22/version-manager fire22-version-cli <command> [options]

COMMANDS:
  status                    Show current version status
  bump [strategy]           Bump version (patch|minor|major)
  compare <v1> <v2>        Compare two versions
  validate <version>        Validate version format
  satisfies <ver> <range>   Check range satisfaction
  workspace                 Show workspace status
  help                     Show this help message
  version                  Show CLI version

OPTIONS:
  --strategy <type>        Version bump strategy
  --reason <text>          Reason for version bump
  --dry-run               Preview changes without applying

EXAMPLES:
  bunx -p @fire22/version-manager fire22-version-cli status
  bunx -p @fire22/version-manager fire22-version-cli bump --strategy minor
  bunx -p @fire22/version-manager fire22-version-cli compare 1.0.0 2.0.0
  bunx -p @fire22/version-manager fire22-version-cli validate 1.0.0-alpha.1

🚀 Strict parsing with Bun-native comparison and range checks.
  `);
}

// Run CLI
if (import.meta.main) {
  main();
}
