#!/usr/bin/env bun

/**
 * 🚀 Bun Quick Wins - Tabular Display
 * 
 * Uses Bun.inspect.table() for beautiful terminal output
 * @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options
 */

import { styled, FW_COLORS, colorBar } from '../lib/theme/colors.ts';

interface QuickWin {
  priority: string;
  pattern: string;
  files: string;
  replacement: string;
  gain: string;
  path: string;
}

const quickWins: QuickWin[] = [
  {
    priority: '🔴 CRITICAL',
    pattern: 'child_process.spawn()',
    files: '27',
    replacement: 'Bun.spawn()',
    gain: '2-3x faster',
    path: 'tools/factorywager-cli.ts',
  },
  {
    priority: '🔴 CRITICAL',
    pattern: 'fs.readFileSync()',
    files: '5',
    replacement: 'Bun.file().text()',
    gain: '50% faster',
    path: 'lib/docs/url-fixer-optimizer.ts',
  },
  {
    priority: '🔴 CRITICAL',
    pattern: 'fs.writeFileSync()',
    files: '5',
    replacement: 'Bun.write()',
    gain: '40% faster',
    path: 'lib/docs/url-fixer-optimizer.ts',
  },
  {
    priority: '🔴 CRITICAL',
    pattern: 'crypto.createHash()',
    files: '3',
    replacement: 'Bun.hash()',
    gain: '30% faster',
    path: 'lib/security/master-token.ts',
  },
  {
    priority: '🔴 CRITICAL',
    pattern: 'require("fs")',
    files: '9',
    replacement: 'Bun.file/Bun.write',
    gain: '3x faster',
    path: 'lib/validation/automated-validation-system.ts',
  },
  {
    priority: '🟡 MEDIUM',
    pattern: 'fs.existsSync()',
    files: '4',
    replacement: 'Bun.file().exists()',
    gain: 'Consistent API',
    path: 'lib/http/port-management-system.ts',
  },
  {
    priority: '🟡 MEDIUM',
    pattern: 'axios.get/post()',
    files: '6',
    replacement: 'fetch()',
    gain: '20% faster',
    path: 'projects/** (various)',
  },
  {
    priority: '🟡 MEDIUM',
    pattern: 'Date.now()',
    files: '10+',
    replacement: 'Bun.nanoseconds()',
    gain: 'High precision',
    path: 'lib/performance/*.ts',
  },
  {
    priority: '🟢 OPTIMIZED',
    pattern: 'fetch()',
    files: '122',
    replacement: '✅ Already native',
    gain: 'Native',
    path: 'lib/**/*.ts',
  },
  {
    priority: '🟢 OPTIMIZED',
    pattern: 'Bun.file()',
    files: '15+',
    replacement: '✅ Already using',
    gain: 'Native',
    path: 'lib/r2/*.ts',
  },
];

/**
 * Display using Bun.inspect.table()
 * @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options
 */
function displayTable(): void {
  console.log(styled`{bold}{cyan}🚀 BUN QUICK WINS MIGRATION TABLE{/cyan}{/bold}`);
  console.log();

  // Bun.inspect.table() with options
  const tableOutput = Bun.inspect.table(quickWins, {
    showIndex: true,
    colors: true,
    compact: false,
    depth: 1,
    // Column alignment
    getters: {
      priority: (row: QuickWin) => row.priority,
      pattern: (row: QuickWin) => row.pattern,
      files: (row: QuickWin) => row.files,
      replacement: (row: QuickWin) => row.replacement,
      gain: (row: QuickWin) => row.gain,
      path: (row: QuickWin) => row.path,
    },
  });

  console.log(tableOutput);

  // Summary statistics
  console.log();
  console.log(colorBar(FW_COLORS.info));
  console.log(styled`{bold}📊 SUMMARY{/bold}`);
  console.log(`Total Opportunities: ${quickWins.filter(w => !w.priority.includes('OPTIMIZED')).length}`);
  console.log(`Critical Priority: ${quickWins.filter(w => w.priority.includes('CRITICAL')).length}`);
  console.log(`Medium Priority: ${quickWins.filter(w => w.priority.includes('MEDIUM')).length}`);
  console.log(`Already Optimized: ${quickWins.filter(w => w.priority.includes('OPTIMIZED')).length}`);
  console.log();
  console.log(styled`{gray}Documentation:{/gray} docs/QUICK_WINS_BUN_NATIVE.md`);
  console.log(styled`{gray}Examples:{/gray} docs/BUN_MIGRATION_EXAMPLES.ts`);
}

/**
 * Display compact table for quick overview
 */
function displayCompactTable(): void {
  console.log(styled`{bold}{cyan}🚀 QUICK WINS (Compact){/cyan}{/bold}\n`);

  const criticalWins = quickWins.filter(w => w.priority.includes('CRITICAL'));

  const compactOutput = Bun.inspect.table(criticalWins, {
    showIndex: false,
    colors: true,
    compact: true,
    columns: ['pattern', 'replacement', 'path'],
  });

  console.log(compactOutput);
}

/**
 * Display detailed view with full paths
 */
function displayDetailedTable(): void {
  console.log(styled`{bold}{cyan}🚀 DETAILED QUICK WINS VIEW{/cyan}{/bold}\n`);

  // Create enhanced rows with colors
  const enhancedWins = quickWins.map(win => ({
    ...win,
    fullPath: `/${win.path}`,
    effort: win.priority.includes('CRITICAL') ? 'Low' : 'Medium',
    impact: win.gain,
  }));

  const detailedOutput = Bun.inspect.table(enhancedWins, {
    showIndex: true,
    colors: true,
    compact: false,
    // Sort by priority
    sort: (a: QuickWin, b: QuickWin) => {
      const priorityOrder = ['🔴 CRITICAL', '🟡 MEDIUM', '🟢 OPTIMIZED'];
      return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
    },
  });

  console.log(detailedOutput);
}

/**
 * Export data for use in other tools
 */
export function getQuickWinsData(): QuickWin[] {
  return quickWins;
}

/**
 * Generate markdown table
 */
export function generateMarkdownTable(): string {
  const headers = '| Priority | Pattern | Files | Replacement | Performance Gain | Path |';
  const separator = '|----------|---------|-------|-------------|------------------|------|';

  const rows = quickWins.map(win =>
    `| ${win.priority} | ${win.pattern} | ${win.files} | ${win.replacement} | ${win.gain} | ${win.path} |`
  );

  return [headers, separator, ...rows].join('\n');
}

// CLI
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'compact':
      displayCompactTable();
      break;
    case 'detailed':
      displayDetailedTable();
      break;
    case 'markdown':
      console.log(generateMarkdownTable());
      break;
    case 'json':
      console.log(JSON.stringify(quickWins, null, 2));
      break;
    default:
      displayTable();
      break;
  }
}

export { displayTable, displayCompactTable, displayDetailedTable };
