#!/usr/bin/env bun
/**
 * WindSurf Project - Shortcuts CLI
 * 
 * Integrated with ShortcutRegistry system for keyboard shortcut management.
 * Uses Bun macros for build-time data embedding.
 * 
 * Usage:
 *   bun run cli/shortcuts/shortcuts-cli.ts [command]
 */

// Import macros from ShortcutRegistry - these execute at bundle-time
// Path relative to windsurf-project directory
import { getDefaultShortcuts, getShortcutIds } from '../../../../wind/src/macros/getDefaultShortcuts.ts' with { type: 'macro' };
import { getBuildInfo } from '../../../../wind/src/macros/getBuildInfo.ts' with { type: 'macro' };
import { validateShortcuts, getShortcutStats } from '../../../../wind/src/macros/validateShortcuts.ts' with { type: 'macro' };

// WindSurf-specific shortcuts
const windsurfShortcuts = [
  {
    id: 'dashboard.refresh',
    action: 'refresh',
    description: 'Refresh dashboard data',
    category: 'general',
    default: {
      primary: 'Ctrl+R',
      macOS: 'Cmd+R'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'dashboard.export',
    action: 'export',
    description: 'Export dashboard data',
    category: 'data',
    default: {
      primary: 'Ctrl+E',
      macOS: 'Cmd+E'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'risk.analyze',
    action: 'analyze',
    description: 'Run risk analysis',
    category: 'compliance',
    default: {
      primary: 'Ctrl+A',
      macOS: 'Cmd+A'
    },
    enabled: true,
    scope: 'panel'
  },
  {
    id: 'admin.config',
    action: 'config',
    description: 'Open admin configuration',
    category: 'developer',
    default: {
      primary: 'Ctrl+,',
      macOS: 'Cmd+,'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'financial.process',
    action: 'process',
    description: 'Process financial transaction',
    category: 'payment',
    default: {
      primary: 'Ctrl+P',
      macOS: 'Cmd+P'
    },
    enabled: true,
    scope: 'panel'
  },
  {
    id: 'kyc.validate',
    action: 'validate',
    description: 'Validate KYC information',
    category: 'compliance',
    default: {
      primary: 'Ctrl+K',
      macOS: 'Cmd+K'
    },
    enabled: true,
    scope: 'panel'
  },
  {
    id: 'fraud.detect',
    action: 'detect',
    description: 'Run fraud detection',
    category: 'compliance',
    default: {
      primary: 'Ctrl+F',
      macOS: 'Cmd+F'
    },
    enabled: true,
    scope: 'panel'
  },
  {
    id: 'pool.rebalance',
    action: 'rebalance',
    description: 'Rebalance pool',
    category: 'payment',
    default: {
      primary: 'Ctrl+B',
      macOS: 'Cmd+B'
    },
    enabled: true,
    scope: 'panel'
  },
  {
    id: 'monitor.start',
    action: 'monitor',
    description: 'Start monitoring',
    category: 'logs',
    default: {
      primary: 'Ctrl+M',
      macOS: 'Cmd+M'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'nexus.dashboard',
    action: 'dashboard',
    description: 'Show Citadel dashboard',
    category: 'nexus',
    default: {
      primary: 'Ctrl+D',
      macOS: 'Cmd+D'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'nexus.metrics',
    action: 'metrics',
    description: 'Show advanced metrics',
    category: 'nexus',
    default: {
      primary: 'Ctrl+Shift+M',
      macOS: 'Cmd+Shift+M'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'nexus.telemetry.start',
    action: 'telemetry',
    description: 'Start telemetry streaming',
    category: 'nexus',
    default: {
      primary: 'Ctrl+Shift+T',
      macOS: 'Cmd+Shift+T'
    },
    enabled: true,
    scope: 'panel'
  },
  {
    id: 'nexus.vault.profiles',
    action: 'vault',
    description: 'Show vault profiles',
    category: 'nexus',
    default: {
      primary: 'Ctrl+Shift+V',
      macOS: 'Cmd+Shift+V'
    },
    enabled: true,
    scope: 'panel'
  },
  {
    id: 'nexus.profile.create',
    action: 'create',
    description: 'Create device profile',
    category: 'nexus',
    default: {
      primary: 'Ctrl+Shift+N',
      macOS: 'Cmd+Shift+N'
    },
    enabled: true,
    scope: 'panel'
  }
];

// Combine default shortcuts with WindSurf-specific ones
const allShortcuts = [...getDefaultShortcuts(), ...windsurfShortcuts];

// Build-time validation
validateShortcuts();
const buildInfo = await getBuildInfo();
const stats = getShortcutStats();

interface CLICommand {
  name: string;
  description: string;
  handler: () => void | Promise<void>;
}

const commands: CLICommand[] = [
  {
    name: 'list',
    description: 'List all available shortcuts',
    handler: () => {
      console.log(`\n⌨️  WindSurf Project Shortcuts (${allShortcuts.length} total)\n`);
      allShortcuts.forEach((shortcut, index) => {
        const key = shortcut.default.macOS || shortcut.default.primary;
        const category = shortcut.category.padEnd(15);
        console.log(`  ${(index + 1).toString().padStart(2)}. ${shortcut.id.padEnd(25)} ${key.padEnd(15)} [${category}] ${shortcut.description}`);
      });
      console.log('');
    },
  },
  {
    name: 'windsurf',
    description: 'List WindSurf-specific shortcuts',
    handler: () => {
      console.log(`\n🚀 WindSurf-Specific Shortcuts (${windsurfShortcuts.length} total)\n`);
      windsurfShortcuts.forEach((shortcut, index) => {
        const key = shortcut.default.macOS || shortcut.default.primary;
        console.log(`  ${(index + 1).toString().padStart(2)}. ${shortcut.id.padEnd(25)} ${key.padEnd(15)} ${shortcut.description}`);
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
        console.log('Available categories:');
        const categories = [...new Set(allShortcuts.map(s => s.category))];
        categories.forEach(cat => console.log(`  - ${cat}`));
        console.log('');
        return;
      }
      
      const filtered = allShortcuts.filter(s => s.category === category);
      console.log(`\n📁 Shortcuts in "${category}" category (${filtered.length} total)\n`);
      
      if (filtered.length === 0) {
        console.log(`  No shortcuts found in category "${category}".\n`);
        return;
      }
      
      filtered.forEach((shortcut) => {
        const key = shortcut.default.macOS || shortcut.default.primary;
        console.log(`  ${shortcut.id.padEnd(25)} ${key.padEnd(15)} ${shortcut.description}`);
      });
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
        console.log('Usage: bun run cli/shortcuts/shortcuts-cli.ts search <keyword>\n');
        return;
      }
      
      const results = allShortcuts.filter(
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
        console.log(`  ${shortcut.id.padEnd(25)} ${key.padEnd(15)} ${shortcut.description}`);
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
        project: 'windsurf-project',
        shortcuts: allShortcuts,
        windsurfShortcuts: windsurfShortcuts,
        stats: {
          total: allShortcuts.length,
          windsurf: windsurfShortcuts.length,
          default: getDefaultShortcuts().length,
        },
      };
      console.log(JSON.stringify(output, null, 2));
    },
  },
  {
    name: 'info',
    description: 'Display integration information',
    handler: () => {
      console.log('\n🔗 ShortcutRegistry Integration\n');
      console.log(`  Registry Version: ${buildInfo.version}`);
      console.log(`  Build Time:       ${buildInfo.buildTime}`);
      console.log(`  Total Shortcuts:   ${allShortcuts.length}`);
      console.log(`  WindSurf Shortcuts: ${windsurfShortcuts.length}`);
      console.log(`  Default Shortcuts:  ${getDefaultShortcuts().length}`);
      console.log('');
    },
  },
];

function printHelp() {
  console.log('\n🚀 WindSurf Project - Shortcuts CLI\n');
  console.log('Usage: bun run cli/shortcuts/shortcuts-cli.ts [command]\n');
  console.log('Commands:');
  commands.forEach((cmd) => {
    console.log(`  ${cmd.name.padEnd(15)} ${cmd.description}`);
  });
  console.log('\nExamples:');
  console.log('  bun run cli/shortcuts/shortcuts-cli.ts list');
  console.log('  bun run cli/shortcuts/shortcuts-cli.ts windsurf');
  console.log('  bun run cli/shortcuts/shortcuts-cli.ts search dashboard');
  console.log('  bun run cli/shortcuts/shortcuts-cli.ts category compliance');
  console.log('  bun run cli/shortcuts/shortcuts-cli.ts export');
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

if (import.meta.main) {
  main();
}

export { allShortcuts, windsurfShortcuts };
