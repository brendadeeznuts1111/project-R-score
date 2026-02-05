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
      console.log('\n📦 ShortcutRegistry Build Information\n');
      console.log(`  Version:      ${buildInfo.version}`);
      console.log(`  Build Time:   ${buildInfo.buildTime}`);
      console.log(`  Git Commit:   ${commitHash}`);
      console.log(`  Short Commit: ${shortCommit}`);
      console.log(`  Platform:     ${buildInfo.platform}`);
      console.log(`  Node Env:      ${buildInfo.nodeEnv}`);
      console.log(`  Build Version: ${buildVersion}`);
      console.log('');
    },
  },
  {
    name: 'shortcuts',
    description: 'List all available shortcuts',
    handler: () => {
      console.log(`\n⌨️  Available Shortcuts (${shortcuts.length} total)\n`);
      shortcuts.forEach((shortcut, index) => {
        const key = shortcut.default.macOS || shortcut.default.primary;
        console.log(`  ${(index + 1).toString().padStart(2)}. ${shortcut.id.padEnd(20)} ${key.padEnd(15)} ${shortcut.description}`);
      });
      console.log('');
    },
  },
  {
    name: 'stats',
    description: 'Display shortcut statistics',
    handler: () => {
      console.log('\n📊 Shortcut Statistics\n');
      console.log(`  Total Shortcuts: ${stats.total}`);
      console.log('\n  By Category:');
      Object.entries(stats.byCategory).forEach(([category, count]) => {
        console.log(`    ${category.padEnd(15)} ${count}`);
      });
      console.log('\n  By Scope:');
      Object.entries(stats.byScope).forEach(([scope, count]) => {
        console.log(`    ${scope.padEnd(15)} ${count}`);
      });
      console.log('');
    },
  },
  {
    name: 'git',
    description: 'Display Git commit information',
    handler: () => {
      console.log('\n🔀 Git Commit Information\n');
      console.log(`  Full Hash:    ${commitHash}`);
      console.log(`  Short Hash:   ${shortCommit}`);
      console.log(`  Timestamp:    ${commitInfo.timestamp}`);
      console.log('');
    },
  },
  {
    name: 'validate',
    description: 'Validate shortcuts configuration',
    handler: () => {
      console.log('\n✅ Validating Shortcuts...\n');
      try {
        validateShortcuts();
        console.log('  ✓ All shortcuts are valid!');
        console.log(`  ✓ No conflicts detected`);
        console.log(`  ✓ ${shortcuts.length} shortcuts validated`);
      } catch (error) {
        console.error('  ✗ Validation failed:', error);
        process.exit(1);
      }
      console.log('');
    },
  },
  {
    name: 'search',
    description: 'Search shortcuts by keyword',
    handler: () => {
      const keyword = process.argv[3];
      if (!keyword) {
        console.error('\n❌ Error: Please provide a search keyword\n');
        console.log('Usage: bun run cli search <keyword>\n');
        return;
      }
      
      const results = shortcuts.filter(
        (s) =>
          s.id.toLowerCase().includes(keyword.toLowerCase()) ||
          s.description.toLowerCase().includes(keyword.toLowerCase()) ||
          s.action.toLowerCase().includes(keyword.toLowerCase())
      );
      
      console.log(`\n🔍 Search Results for "${keyword}" (${results.length} found)\n`);
      if (results.length === 0) {
        console.log('  No shortcuts found matching your search.\n');
        return;
      }
      
      results.forEach((shortcut) => {
        const key = shortcut.default.macOS || shortcut.default.primary;
        console.log(`  ${shortcut.id.padEnd(20)} ${key.padEnd(15)} ${shortcut.description}`);
      });
      console.log('');
    },
  },
  {
    name: 'category',
    description: 'List shortcuts by category',
    handler: () => {
      const category = process.argv[3];
      if (!category) {
        console.error('\n❌ Error: Please provide a category\n');
        console.log('Usage: bun run cli category <category>\n');
        console.log('Available categories:');
        Object.keys(stats.byCategory).forEach((cat) => {
          console.log(`  - ${cat}`);
        });
        console.log('');
        return;
      }
      
      // Filter at runtime since category is dynamic (macros need static values)
      const categoryShortcuts = shortcuts.filter((s) => s.category === category);
      console.log(`\n📁 Shortcuts in "${category}" category (${categoryShortcuts.length} total)\n`);
      
      if (categoryShortcuts.length === 0) {
        console.log(`  No shortcuts found in category "${category}".\n`);
        return;
      }
      
      categoryShortcuts.forEach((shortcut) => {
        const key = shortcut.default.macOS || shortcut.default.primary;
        console.log(`  ${shortcut.id.padEnd(20)} ${key.padEnd(15)} ${shortcut.description}`);
      });
      console.log('');
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
      console.log(JSON.stringify(output, null, 2));
    },
  },
  {
    name: 'version',
    description: 'Display version information',
    handler: () => {
      console.log(`\n${buildInfo.version} (${shortCommit})\n`);
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
  console.log('\n🚀 ShortcutRegistry CLI\n');
  console.log('Usage: bun run cli [command]\n');
  console.log('Commands:');
  commands.forEach((cmd) => {
    console.log(`  ${cmd.name.padEnd(15)} ${cmd.description}`);
  });
  console.log('\nExamples:');
  console.log('  bun run cli info');
  console.log('  bun run cli shortcuts');
  console.log('  bun run cli search save');
  console.log('  bun run cli category general');
  console.log('  bun run cli all');
  console.log('');
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
