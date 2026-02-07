#!/usr/bin/env bun
/**
 * OpenClaw One-Liner CLI
 * Context switching with --cwd, --env-file, --config flags
 * 
 * Examples:
 *   bun openclaw/oneliner.ts --cwd ./apps/api --env-file .env.local run dev
 *   bun openclaw/oneliner.ts --env-file .env --env-file .env.override run build
 *   bun openclaw/oneliner.ts --config ./ci.bunfig.toml run test
 *   bun openclaw/oneliner.ts --cwd ./packages/core --watch run index.ts
 *   bun openclaw/oneliner.ts --cwd /var/app --env-file /etc/secrets/app.env --smol run server.js
 */

import { 
  executeWithContext, 
  parseFlags,
  loadGlobalConfig,
  generateContextHash,
  c 
} from "../lib/bun-context.ts";

interface OneLinerFlags {
  cwd?: string;
  envFile?: string[];
  config?: string;
  filter?: string;
  watch?: boolean;
  hot?: boolean;
  smol?: boolean;
  help?: boolean;
}

function parseOneLinerFlags(argv: string[]): { flags: OneLinerFlags; command: string; args: string[] } {
  const flags: OneLinerFlags = {};
  const args: string[] = [];
  let command = "";
  let skipNext = false;
  
  for (let i = 0; i < argv.length; i++) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    
    const arg = argv[i];
    const nextArg = argv[i + 1];
    
    if (arg === "--cwd" && nextArg) {
      flags.cwd = nextArg;
      skipNext = true;
    } else if (arg === "--env-file" && nextArg) {
      flags.envFile = flags.envFile || [];
      flags.envFile.push(nextArg);
      skipNext = true;
    } else if (arg === "--config" && nextArg) {
      flags.config = nextArg;
      skipNext = true;
    } else if (arg === "--filter" && nextArg) {
      flags.filter = nextArg;
      skipNext = true;
    } else if (arg === "--watch" || arg === "-w") {
      flags.watch = true;
    } else if (arg === "--hot") {
      flags.hot = true;
    } else if (arg === "--smol") {
      flags.smol = true;
    } else if (arg === "--help" || arg === "-h") {
      flags.help = true;
    } else if (arg === "--") {
      // Remaining args after --
      args.push(...argv.slice(i + 1));
      break;
    } else if (!command && !arg.startsWith("-")) {
      command = arg;
    } else if (command) {
      args.push(arg);
    }
  }
  
  return { flags, command, args };
}

function buildFlagArray(flags: OneLinerFlags): string[] {
  const result: string[] = [];
  if (flags.cwd) result.push("--cwd", flags.cwd);
  if (flags.envFile) {
    for (const f of flags.envFile) {
      result.push("--env-file", f);
    }
  }
  if (flags.config) result.push("--config", flags.config);
  if (flags.filter) result.push("--filter", flags.filter);
  if (flags.watch) result.push("--watch");
  if (flags.hot) result.push("--hot");
  return result;
}

async function main() {
  const argv = process.argv.slice(2);
  const { flags, command, args } = parseOneLinerFlags(argv);
  
  if (flags.help || !command) {
    console.log(`
${c.cyan("╔════════════════════════════════════════════════════════╗")}
${c.cyan("║")}  OpenClaw One-Liner CLI v3.16                        ${c.cyan("║")}
${c.cyan("╠════════════════════════════════════════════════════════╣")}
${c.cyan("║")}  Context switching with Bun-native flags             ${c.cyan("║")}
${c.cyan("╚════════════════════════════════════════════════════════╝")}

${c.bold("Usage:")}
  bun openclaw/oneliner.ts [flags] <command> [args...]

${c.bold("Flags:")}
  --cwd <path>          Set working directory
  --env-file <path>     Load env file (can specify multiple)
  --config <path>       Use custom bunfig.toml
  --filter <pattern>    Filter packages (for monorepos)
  --watch, -w           Watch mode
  --hot                 Hot reload mode
  --smol                Use smol mode (lower memory)
  --help, -h            Show this help

${c.bold("Examples:")}
  ${c.gray("# Context switching with --cwd")}
  bun openclaw/oneliner.ts --cwd ./apps/api --env-file .env.local run dev

  ${c.gray("# Multiple env files (last wins)")}
  bun openclaw/oneliner.ts --env-file .env --env-file .env.local run build

  ${c.gray("# Custom config file")}
  bun openclaw/oneliner.ts --config ./ci.bunfig.toml run test

  ${c.gray("# Context-aware watch")}
  bun openclaw/oneliner.ts --cwd ./packages/core --watch run index.ts

  ${c.gray("# Production context")}
  bun openclaw/oneliner.ts --cwd /var/app --env-file /etc/secrets/app.env --smol run server.js

${c.bold("Environment:")}
  OPENCLAW_PORT     Dashboard server port (default: 8765)
  OPENCLAW_HOST     Dashboard server host (default: 0.0.0.0)
`);
    return;
  }
  
  // Convert to bun-context format
  const flagArgs = buildFlagArray(flags);
  const allArgs = [...flagArgs, command, ...args];
  
  // Show context summary
  console.log(c.gray("Context:"));
  if (flags.cwd) console.log(c.gray(`  CWD:      ${flags.cwd}`));
  if (flags.envFile) console.log(c.gray(`  Env:      ${flags.envFile.join(", ")}`));
  if (flags.config) console.log(c.gray(`  Config:   ${flags.config}`));
  if (flags.filter) console.log(c.gray(`  Filter:   ${flags.filter}`));
  console.log(c.gray(`  Command:  ${command} ${args.join(" ")}`));
  console.log();
  
  // Execute with context
  const startTime = performance.now();
  
  try {
    const session = await executeWithContext(allArgs, { useCache: true });
    
    const duration = performance.now() - startTime;
    
    console.log();
    console.log(c.gray(`Context Hash: ${session.contextHash}`));
    console.log(c.gray(`Duration: ${duration.toFixed(2)}ms`));
    console.log(c.gray(`Status: ${session.status}`));
    
    if (session.exitCode !== undefined && session.exitCode !== 0) {
      process.exit(session.exitCode);
    }
  } catch (err) {
    console.error(c.red("Error:"), err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

// Also support direct bun-style usage
if (import.meta.main) {
  main();
}

export { parseOneLinerFlags, buildFlagArray };
