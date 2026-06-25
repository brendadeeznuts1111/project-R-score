#!/usr/bin/env bun
/**
 * ShortcutRegistry CLI
 * 
 * A command-line interface showcasing Bun macros for build-time data embedding.
 * 
 * Usage:
 *   bun run src/cli/index.ts [command]
 *   bun run cli [command]
 */

// Import macros - these execute at bundle-time and results are inlined
import { getDefaultShortcuts, getShortcutIds, getShortcutsByCategory } from '../macros/getDefaultShortcuts.ts' with { type: 'macro' };
import { getGitCommitHash, getShortCommitHash, getCommitInfo } from '../macros/getGitCommitHash.ts' with { type: 'macro' };
import { getBuildInfo, getBuildVersion } from '../macros/getBuildInfo.ts' with { type: 'macro' };
import { validateShortcuts, getShortcutStats } from '../macros/validateShortcuts.ts' with { type: 'macro' };

// These values are computed at build-time
const shortcuts = getDefaultShortcuts();
const shortcutIds = getShortcutIds();
const commitHash = getGitCommitHash();
const shortCommit = getShortCommitHash();
const commitInfo = getCommitInfo();
const buildInfo = await getBuildInfo();
const buildVersion = await getBuildVersion();
const stats = getShortcutStats();

// Validate shortcuts at build-time (will fail build if invalid)
validateShortcuts();

interface CLICommand {
  name: string;
  description: string;
  handler: () => void | Promise<void>;
}

const commands: CLICommand[] = [
  {
    name: 'info',
    description: 'Display build information',
    handler: () => {
      console.info('\n📦 ShortcutRegistry Build Information\n');
      console.info(`  Version:      ${buildInfo.version}`);
      console.info(`  Build Time:   ${buildInfo.buildTime}`);
      console.info(`  Git Commit:   ${commitHash}`);
      console.info(`  Short Commit: ${shortCommit}`);
      console.info(`  Platform:     ${buildInfo.platform}`);
      console.info(`  Node Env:      ${buildInfo.nodeEnv}`);
      console.info(`  Build Version: ${buildVersion}`);
      console.info('');
    },
  },
  {
    name: 'shortcuts',
    description: 'List all available shortcuts',
    handler: () => {
      console.info(`\n⌨️  Available Shortcuts (${shortcuts.length} total)\n`);
      shortcuts.forEach((shortcut, index) => {
        const key = shortcut.default.macOS || shortcut.default.primary;
        console.info(`  ${(index + 1).toString().padStart(2)}. ${shortcut.id.padEnd(20)} ${key.padEnd(15)} ${shortcut.description}`);
      });
      console.info('');
    },
  },
  {
    name: 'stats',
    description: 'Display shortcut statistics',
    handler: () => {
      console.info('\n📊 Shortcut Statistics\n');
      console.info(`  Total Shortcuts: ${stats.total}`);
      console.info('\n  By Category:');
      Object.entries(stats.byCategory).forEach(([category, count]) => {
        console.info(`    ${category.padEnd(15)} ${count}`);
      });
      console.info('\n  By Scope:');
      Object.entries(stats.byScope).forEach(([scope, count]) => {
        console.info(`    ${scope.padEnd(15)} ${count}`);
      });
      console.info('');
    },
  },
  {
    name: 'git',
    description: 'Display Git commit information',
    handler: () => {
      console.info('\n🔀 Git Commit Information\n');
      console.info(`  Full Hash:    ${commitHash}`);
      console.info(`  Short Hash:   ${shortCommit}`);
      console.info(`  Timestamp:    ${commitInfo.timestamp}`);
      console.info('');
    },
  },
  {
    name: 'validate',
    description: 'Validate shortcuts configuration',
    handler: () => {
      console.info('\n✅ Validating Shortcuts...\n');
      try {
        validateShortcuts();
        console.info('  ✓ All shortcuts are valid!');
        console.info(`  ✓ No conflicts detected`);
        console.info(`  ✓ ${shortcuts.length} shortcuts validated`);
      } catch (error) {
        console.error('  ✗ Validation failed:', error);
        process.exit(1);
      }
      console.info('');
    },
  },
  {
    name: 'search',
    description: 'Search shortcuts by keyword',
    handler: () => {
      const keyword = process.argv[3];
      if (!keyword) {
        console.error('\n❌ Error: Please provide a search keyword\n');
        console.info('Usage: bun run cli search <keyword>\n');
        return;
      }
      
      const results = shortcuts.filter(
        (s) =>
          s.id.toLowerCase().includes(keyword.toLowerCase()) ||
          s.description.toLowerCase().includes(keyword.toLowerCase()) ||
          s.action.toLowerCase().includes(keyword.toLowerCase())
      );
      
      console.info(`\n🔍 Search Results for "${keyword}" (${results.length} found)\n`);
      if (results.length === 0) {
        console.info('  No shortcuts found matching your search.\n');
        return;
      }
      
      results.forEach((shortcut) => {
        const key = shortcut.default.macOS || shortcut.default.primary;
        console.info(`  ${shortcut.id.padEnd(20)} ${key.padEnd(15)} ${shortcut.description}`);
      });
      console.info('');
    },
  },
  {
    name: 'category',
    description: 'List shortcuts by category',
    handler: () => {
      const category = process.argv[3];
      if (!category) {
        console.error('\n❌ Error: Please provide a category\n');
        console.info('Usage: bun run cli category <category>\n');
        console.info('Available categories:');
        Object.keys(stats.byCategory).forEach((cat) => {
          console.info(`  - ${cat}`);
        });
        console.info('');
        return;
      }
      
      // Filter at runtime since category is dynamic (macros need static values)
      const categoryShortcuts = shortcuts.filter((s) => s.category === category);
      console.info(`\n📁 Shortcuts in "${category}" category (${categoryShortcuts.length} total)\n`);
      
      if (categoryShortcuts.length === 0) {
        console.info(`  No shortcuts found in category "${category}".\n`);
        return;
      }
      
      categoryShortcuts.forEach((shortcut) => {
        const key = shortcut.default.macOS || shortcut.default.primary;
        console.info(`  ${shortcut.id.padEnd(20)} ${key.padEnd(15)} ${shortcut.description}`);
      });
      console.info('');
    },
  },
  {
    name: 'export',
    description: 'Export shortcuts as JSON',
    handler: () => {
      const output = {
        version: buildInfo.version,
        buildTime: buildInfo.buildTime,
        gitCommit: commitHash,
        shortcuts: shortcuts,
        stats: stats,
      };
      console.info(JSON.stringify(output, null, 2));
    },
  },
  {
    name: 'version',
    description: 'Display version information',
    handler: () => {
      console.info(`\n${buildInfo.version} (${shortCommit})\n`);
    },
  },
  {
    name: 'all',
    description: 'Display all information',
    handler: async () => {
      // Run all commands except 'all' and 'search'/'category'/'export' (which need args or special handling)
      commands
        .filter((cmd) => !['all', 'search', 'category', 'export'].includes(cmd.name))
        .forEach((cmd) => {
          cmd.handler();
        });
    },
  },
];

function printHelp() {
  console.info('\n🚀 ShortcutRegistry CLI\n');
  console.info('Usage: bun run cli [command]\n');
  console.info('Commands:');
  commands.forEach((cmd) => {
    console.info(`  ${cmd.name.padEnd(15)} ${cmd.description}`);
  });
  console.info('\nExamples:');
  console.info('  bun run cli info');
  console.info('  bun run cli shortcuts');
  console.info('  bun run cli search save');
  console.info('  bun run cli category general');
  console.info('  bun run cli all');
  console.info('');
}

function main() {
  const command = process.argv[2] || 'help';

  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  const cmd = commands.find((c) => c.name === command);

  if (!cmd) {
    console.error(`\n❌ Unknown command: ${command}\n`);
    printHelp();
    process.exit(1);
  }

  try {
    cmd.handler();
  } catch (error) {
    console.error(`\n❌ Error executing command "${command}":`, error);
    process.exit(1);
  }
}

// Run CLI if executed directly
if (import.meta.main) {
  main();
}

export { shortcuts, buildInfo, stats, commitHash, shortCommit };
