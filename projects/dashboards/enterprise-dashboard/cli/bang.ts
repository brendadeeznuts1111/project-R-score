#!/usr/bin/env bun
/**
 * Quick Actions & Shortcuts System
 * Execute quick commands, shortcuts, and aliases
 *
 * Usage:
 *   bun run cli/bang.ts <action>
 *   bun run cli/bang.ts list
 *   bun run cli/bang.ts help
 *
 * Examples:
 *   bun run cli/bang.ts health      # Quick health check
 *   bun run cli/bang.ts painpoints  # Show top painpoints
 *   bun run cli/bang.ts test        # Run tests
 *   bun run cli/bang.ts dev         # Start dev server
 */

import { parseArgs } from "util";
import { spawn } from "bun";

// ANSI colors
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
};

interface QuickAction {
  name: string;
  description: string;
  command: string[];
  category: string;
  aliases?: string[];
}

// =============================================================================
// Quick Actions Registry
// =============================================================================

const QUICK_ACTIONS: QuickAction[] = [
  // Health & Analysis
  {
    name: "health",
    description: "Quick project health check",
    command: ["bun", "run", "cli/diagnose.ts", "health", "--quick"],
    category: "analysis",
    aliases: ["h", "status"],
  },
  {
    name: "painpoints",
    description: "Show top 5 painpoints",
    command: ["bun", "run", "cli/diagnose.ts", "painpoints", "--top=5"],
    category: "analysis",
    aliases: ["pp", "issues"],
  },
  {
    name: "grade",
    description: "Get project grade",
    command: ["bun", "run", "cli/diagnose.ts", "grade"],
    category: "analysis",
    aliases: ["g", "score"],
  },
  {
    name: "analyze",
    description: "Run code analysis",
    command: ["bun", "run", "cli/analyze.ts", "scan", "src/", "--depth=2"],
    category: "analysis",
    aliases: ["a", "scan"],
  },
  {
    name: "types",
    description: "Extract TypeScript types",
    command: ["bun", "run", "cli/analyze.ts", "types", "--exported-only"],
    category: "analysis",
    aliases: ["t"],
  },

  // Development
  {
    name: "dev",
    description: "Start development server",
    command: ["bun", "run", "dev"],
    category: "dev",
    aliases: ["d", "start"],
  },
  {
    name: "test",
    description: "Run tests",
    command: ["bun", "test"],
    category: "dev",
    aliases: ["t"],
  },
  {
    name: "test:watch",
    description: "Run tests in watch mode",
    command: ["bun", "run", "test:watch"],
    category: "dev",
    aliases: ["tw"],
  },
  {
    name: "typecheck",
    description: "Type check TypeScript",
    command: ["bun", "run", "typecheck"],
    category: "dev",
    aliases: ["tc", "ts"],
  },
  {
    name: "lint",
    description: "Run linter",
    command: ["bun", "run", "lint"],
    category: "dev",
    aliases: ["l"],
  },
  {
    name: "format",
    description: "Format code",
    command: ["bun", "run", "format"],
    category: "dev",
    aliases: ["f", "fmt"],
  },

  // Build & Deploy
  {
    name: "build",
    description: "Build project",
    command: ["bun", "run", "build"],
    category: "build",
    aliases: ["b"],
  },
  {
    name: "build:all",
    description: "Build all variants",
    command: ["bun", "run", "build:all"],
    category: "build",
    aliases: ["ba"],
  },

  // Git Operations
  {
    name: "git:status",
    description: "Show git status",
    command: ["git", "status", "--short"],
    category: "git",
    aliases: ["gs", "status"],
  },
  {
    name: "git:diff",
    description: "Show git diff",
    command: ["git", "diff"],
    category: "git",
    aliases: ["gd", "diff"],
  },
  {
    name: "git:log",
    description: "Show recent commits",
    command: ["git", "log", "--oneline", "-10"],
    category: "git",
    aliases: ["gl", "log"],
  },

  // KYC Admin
  {
    name: "kyc:metrics",
    description: "Show KYC metrics",
    command: ["bun", "run", "cli/admin.ts", "--kyc-metrics"],
    category: "kyc",
    aliases: ["km"],
  },
  {
    name: "kyc:queue",
    description: "Process KYC review queue",
    command: ["bun", "run", "cli/admin.ts", "--review-queue"],
    category: "kyc",
    aliases: ["kq"],
  },

  // Config & Utils
  {
    name: "config:lint",
    description: "Lint configuration files",
    command: ["bun", "run", "config:lint"],
    category: "config",
    aliases: ["cl"],
  },
  {
    name: "shortcuts",
    description: "Show keyboard shortcuts",
    command: ["bun", "run", "scripts/shortcuts-help.ts", "--all"],
    category: "config",
    aliases: ["s", "keys"],
  },
  {
    name: "topology",
    description: "Show route topology",
    command: ["bun", "run", "topology"],
    category: "config",
    aliases: ["top"],
  },
  {
    name: "bun:news",
    description: "Show latest Bun news and updates",
    command: ["bun", "run", "cli/bun-news.ts"],
    category: "config",
    aliases: ["news", "bn"],
  },
];

// =============================================================================
// Action Resolution
// =============================================================================

function findAction(name: string): QuickAction | null {
  // Exact match
  let action = QUICK_ACTIONS.find((a) => a.name === name);
  if (action) return action;

  // Alias match
  action = QUICK_ACTIONS.find((a) => a.aliases?.includes(name));
  if (action) return action;

  // Partial match
  const matches = QUICK_ACTIONS.filter((a) =>
    a.name.startsWith(name) || a.aliases?.some((alias) => alias.startsWith(name))
  );
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    console.error(`${c.yellow}Multiple matches for "${name}":${c.reset}`);
    matches.forEach((m) => console.error(`  - ${m.name} (${m.aliases?.join(", ") || "no aliases"})`));
    return null;
  }

  return null;
}

// =============================================================================
// Commands
// =============================================================================

async function executeAction(action: QuickAction, args: string[] = []) {
  console.log(`${c.cyan}→${c.reset} ${c.bold}${action.name}${c.reset}: ${action.description}`);
  console.log(`${c.dim}Running: ${action.command.join(" ")} ${args.join(" ")}${c.reset}\n`);

  const proc = spawn([...action.command, ...args], {
    stdout: "inherit",
    stderr: "inherit",
    cwd: process.cwd(),
  });

  const exitCode = await proc.exited;
  return exitCode;
}

function listActions(category?: string) {
  const actions = category
    ? QUICK_ACTIONS.filter((a) => a.category === category)
    : QUICK_ACTIONS;

  const byCategory = new Map<string, QuickAction[]>();
  for (const action of actions) {
    if (!byCategory.has(action.category)) {
      byCategory.set(action.category, []);
    }
    byCategory.get(action.category)!.push(action);
  }

  console.log(`${c.bold}Available Quick Actions${category ? ` (${category})` : ""}${c.reset}\n`);

  for (const [cat, catActions] of Array.from(byCategory.entries()).sort()) {
    console.log(`${c.bold}${cat.toUpperCase()}${c.reset}`);
    for (const action of catActions.sort((a, b) => a.name.localeCompare(b.name))) {
      const aliases = action.aliases ? ` (${action.aliases.join(", ")})` : "";
      console.log(`  ${c.green}${action.name.padEnd(20)}${c.reset}${aliases.padEnd(15)} ${action.description}`);
    }
    console.log();
  }

  console.log(`${c.dim}Usage: bun run cli/bang.ts <action> [args...]${c.reset}`);
  console.log(`${c.dim}Example: bun run cli/bang.ts health${c.reset}`);
}

function showHelp() {
  console.log(`
${c.bold}Quick Actions & Shortcuts System${c.reset}

${c.bold}Usage:${c.reset}
  bun run cli/bang.ts <action> [args...]
  bun run cli/bang.ts list [category]
  bun run cli/bang.ts help

${c.bold}Examples:${c.reset}
  bun run cli/bang.ts health          # Quick health check
  bun run cli/bang.ts painpoints      # Show top painpoints
  bun run cli/bang.ts dev             # Start dev server
  bun run cli/bang.ts test            # Run tests
  bun run cli/bang.ts git:status      # Show git status

${c.bold}Categories:${c.reset}
  analysis    Health, analysis, painpoints
  dev         Development (test, lint, format)
  build       Build commands
  git         Git operations
  kyc         KYC admin commands
  config      Configuration and utilities

${c.bold}Commands:${c.reset}
  list [category]    List all actions (optionally filtered by category)
  help               Show this help message

${c.bold}Tips:${c.reset}
  - Use aliases for faster typing (e.g., 'h' for 'health')
  - Partial matches work (e.g., 'git' matches 'git:status')
  - Pass additional args: bun run cli/bang.ts test --watch
`);
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const args = Bun.argv.slice(2);
  
  // Handle help
  if (args.length === 0 || args[0] === "help" || args.includes("--help")) {
    showHelp();
    process.exit(0);
  }

  const command = args[0];

  if (command === "list") {
    const category = args[1];
    listActions(category);
    process.exit(0);
  }

  // Find and execute action
  const action = findAction(command);
  if (!action) {
    console.error(`${c.red}Unknown action: ${command}${c.reset}\n`);
    console.log(`${c.yellow}Did you mean one of these?${c.reset}`);
    const suggestions = QUICK_ACTIONS
      .filter((a) => a.name.includes(command) || a.aliases?.some((alias) => alias.includes(command)))
      .slice(0, 5);
    if (suggestions.length > 0) {
      suggestions.forEach((a) => {
        const aliases = a.aliases ? ` (${a.aliases.join(", ")})` : "";
        console.log(`  ${c.green}${a.name}${c.reset}${aliases} - ${a.description}`);
      });
    } else {
      console.log(`  Run ${c.cyan}bun run cli/bang.ts list${c.reset} to see all available actions`);
    }
    process.exit(1);
  }

  // Pass through all remaining arguments (including flags)
  const actionArgs = args.slice(1);
  const exitCode = await executeAction(action, actionArgs);
  process.exit(exitCode);
}

if (import.meta.main) {
  main();
}