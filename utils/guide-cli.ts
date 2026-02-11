#!/usr/bin/env bun
/**
 * Guide CLI - Advanced project-specific binary resolution and execution
 * Demonstrates Bun.which patterns from BUN_WHICH_GUIDE.md
 *
 * Features:
 * - Platform-aware PATH building (POSIX vs Windows)
 * - Fallback strategy (project-local → system)
 * - Binary discovery diagnostics
 * - Caching for repeated lookups
 * - Comprehensive error reporting
 * - Simple mode using Bun.main (merged from cli-resolver.ts)
 *
 * Usage:
 *   bun utils/guide-cli.ts --project <name> --bin <binary> [--args <args...>] [--no-fallback]
 *   bun utils/guide-cli.ts typecheck           # Simple mode: run tsc --noEmit relative to Bun.main
 *   bun utils/guide-cli.ts <binary> [args...] # Simple mode: run any binary relative to Bun.main
 *
 * Examples:
 *   bun utils/guide-cli.ts --project my-bun-app --bin bun --args run dev
 *   bun utils/guide-cli.ts --project cli-dashboard --bin htop
 *   bun utils/guide-cli.ts --project edge-worker --bin wrangler --args deploy
 *   bun utils/guide-cli.ts typecheck
 *   bun utils/guide-cli.ts eslint src/
 *   bun utils/guide-cli.ts jest --coverage
 */

import { ensureDirectExecution } from "../lib/shared/tools/entry-guard.ts";
ensureDirectExecution();

import { which, spawn } from "bun";
import fs from "bun:fs";

// ============================================================================
// Simple mode using Bun.main (merged from cli-resolver.ts)
// ============================================================================

/**
 * Get directory of the main entrypoint script (Bun.main)
 */
function getMainDir(): string {
  return Bun.main.slice(0, Bun.main.lastIndexOf('/'));
}

/**
 * Resolve and run tsc --noEmit relative to Bun.main
 */
function resolveAndRunTypeCheck(): Promise<number> {
  const mainDir = getMainDir();
  const tscPath = which("tsc", {
    cwd: mainDir,
    PATH: `${mainDir}/node_modules/.bin:${process.env.PATH || ""}`
  });

  if (tscPath) {
    console.log(`Found tsc at: ${tscPath}`);

    // Spawn type-check without emitting
    const proc = spawn([tscPath, "--noEmit"], {
      cwd: mainDir,
      stdout: "inherit",
      stderr: "inherit",
      env: {
        ...process.env,
        PROJECT_HOME: mainDir
      }
    });

    return proc.exited.then((code: number) => {
      console.log(`Type-check complete in ${Bun.main} (exit code: ${code})`);
      return code;
    });
  } else {
    console.error(`tsc not found relative to ${Bun.main}`);
    console.error(`Ensure dependencies are installed in: ${mainDir}/node_modules`);
    return Promise.resolve(1);
  }
}

/**
 * Resolve and run any binary relative to Bun.main
 */
function resolveAndRunSimple(binary: string, args: string[] = []): Promise<number> {
  const mainDir = getMainDir();
  const binPath = which(binary, {
    cwd: mainDir,
    PATH: `${mainDir}/node_modules/.bin:${process.env.PATH || ""}`
  });

  if (!binPath) {
    console.error(`Binary not found: ${binary} (relative to ${Bun.main})`);
    return Promise.resolve(1);
  }

  console.log(`Running: ${binary} ${args.join(' ')}`);
  const proc = spawn([binPath, ...args], {
    cwd: mainDir,
    stdio: "inherit",
    env: {
      ...process.env,
      PROJECT_HOME: mainDir
    }
  });

  return proc.exited;
}

// ============================================================================
// Advanced Bun.which utilities (from BUN_WHICH_GUIDE.md)
// ============================================================================

/**
 * Get platform-specific PATH separator
 */
function getPathSeparator(): string {
  return process.platform === "win32" ? ";" : ":";
}

/**
 * Build a project-local PATH with system fallback
 */
function buildProjectPath(projectHome: string): string {
  const separator = getPathSeparator();
  return [
    `${projectHome}/node_modules/.bin`,
    process.env.PATH || ""
  ].join(separator);
}

/**
 * Cache for resolved binary paths (performance optimization)
 */
const binaryCache = new Map<string, string | null>();

/**
 * Resolve binary with caching
 */
function resolveBinary(name: string, projectHome: string, allowFallback: boolean = true): string | null {
  const cacheKey = `${projectHome}:${name}:${allowFallback}`;

  // Check cache first
  if (binaryCache.has(cacheKey)) {
    return binaryCache.get(cacheKey)!;
  }

  // Build custom PATH prioritizing project-local
  const customPath = buildProjectPath(projectHome);

  // Try project-local first
  let binPath = which(name, {
    cwd: projectHome,
    PATH: customPath
  });

  // Fallback to system PATH only if allowed and not found
  if (!binPath && allowFallback) {
    binPath = which(name);
  }

  // Cache the result
  binaryCache.set(cacheKey, binPath);
  return binPath;
}

/**
 * Resolve binary with diagnostic output (which directories were searched)
 */
function resolveWithDiagnostics(binary: string, projectHome: string): {
  path: string | null;
  searched: string[];
} {
  const searched: string[] = [];
  const customPath = buildProjectPath(projectHome);
  const pathDirs = customPath.split(getPathSeparator());

  for (const dir of pathDirs) {
    searched.push(dir);
    const fullPath = `${dir}/${binary}`;
    try {
      const stat = Bun.stat(fullPath);
      if (stat && stat.isFile) {
        // On POSIX, check executable bit; on Windows, any file is executable
        if (process.platform !== "win32" && !(stat.mode & 0o111)) {
          continue; // Skip non-executable on POSIX
        }
        return { path: fullPath, searched };
      }
    } catch {
      // File doesn't exist or no permission
    }
  }

  return { path: null, searched };
}

// ============================================================================
// Argument parsing & mode detection
// ============================================================================

const args = Bun.argv.slice(2);

// Check if we're in simple mode (no --project flag)
const isSimpleMode = !args.includes("--project") && !args.includes("--help");

// Simple mode: handle cli-resolver.ts compatibility
if (isSimpleMode) {
  if (args.length === 0) {
    console.log(`
Guide CLI - Uses Bun.main for project-specific binary resolution

Simple Mode (merged from cli-resolver.ts):
Usage:
  bun utils/guide-cli.ts typecheck           # Run tsc --noEmit
  bun utils/guide-cli.ts <binary> [args...] # Run any binary

Examples:
  bun utils/guide-cli.ts typecheck
  bun utils/guide-cli.ts eslint src/
  bun utils/guide-cli.ts jest --coverage

Note: All binaries are resolved relative to the directory of Bun.main
      (the entrypoint script: ${Bun.main})

Advanced Mode (with --project):
  bun utils/guide-cli.ts --help
`);
    Bun.exit(0);
  }

  // Handle simple mode commands
  if (args[0] === "typecheck") {
    resolveAndRunTypeCheck().then(code => Bun.exit(code));
  } else {
    resolveAndRunSimple(args[0], args.slice(1)).then(code => Bun.exit(code));
  }
  // Exit early in simple mode
  Bun.exit(0);
}

// Advanced mode: parse project-specific arguments
function getArgValue(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return undefined;
}

function getArgsAfter(flag: string): string[] {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    return args.slice(idx + 1);
  }
  return [];
}

function hasFlag(flag: string): boolean {
  return args.includes(flag);
}

// Required arguments
const projectName = getArgValue("--project");
const binary = getArgValue("--bin");
const binaryArgs = getArgsAfter("--args");
const allowFallback = !hasFlag("--no-fallback");
const showDiagnostics = hasFlag("--diagnostics");

// Validate
if (!projectName || !binary) {
  console.log(`
Guide CLI (Advanced) - Project-specific binary resolution with diagnostics

Usage:
  bun utils/guide-cli.ts --project <name> --bin <binary> [--args <args...>] [options]
  bun utils/guide-cli.ts typecheck           # Simple mode: run tsc --noEmit relative to Bun.main
  bun utils/guide-cli.ts <binary> [args...] # Simple mode: run any binary relative to Bun.main

Arguments:
  --project <name>    Project directory name under $BUN_PLATFORM_HOME
  --bin <binary>      Binary to execute (e.g., bun, tsc, eslint)
  --args <args...>    Additional arguments passed to the binary

Options:
  --no-fallback       Don't fall back to system PATH if project-local not found
  --diagnostics       Show detailed resolution diagnostics (searched paths)
  --help              Show this help message

Examples (Advanced Mode):
  bun utils/guide-cli.ts --project my-bun-app --bin bun --args run dev
  bun utils/guide-cli.ts --project cli-dashboard --bin htop
  bun utils/guide-cli.ts --project edge-worker --bin wrangler --args deploy
  bun utils/guide-cli.ts --project native-addon-tool --bin cargo --args build --release --diagnostics

Examples (Simple Mode):
  bun utils/guide-cli.ts typecheck
  bun utils/guide-cli.ts eslint src/
  bun utils/guide-cli.ts jest --coverage

Features:
  - Platform-aware PATH building (auto-detects Windows vs POSIX)
  - Caching for repeated lookups (improves performance in loops)
  - Fallback strategy: project-local → system (configurable)
  - Diagnostics: see exactly which directories were searched
  - Detailed error reporting with PATH context
  - Simple mode using Bun.main for quick binary resolution

Note:
  - Advanced mode: Project path is resolved as: $BUN_PLATFORM_HOME/<project>
  - Simple mode: Binary is resolved relative to the directory of Bun.main
  - Uses Bun.which with custom PATH and cwd options for isolation
`);
  Bun.exit(1);
}

// ============================================================================
// Main execution
// ============================================================================

// Resolve project home
const platformHome = process.env.BUN_PLATFORM_HOME || Bun.cwd;
const projectHome = `${platformHome}/${projectName}`;

// Verify project exists
if (!fs.existsSync(projectHome)) {
  console.error(`❌ Project not found: ${projectHome}`);
  console.error(`   BUN_PLATFORM_HOME=${platformHome}`);
  Bun.exit(1);
}

console.log(`🎯 Guide CLI (Advanced)`);
console.log(`   Platform:    ${platformHome}`);
console.log(`   Project:     ${projectHome}`);
console.log(`   Binary:      ${binary}`);
console.log(`   Args:        ${binaryArgs.join(" ") || "(none)"}`);
console.log(`   Fallback:    ${allowFallback ? "enabled" : "disabled"}`);
console.log("");

// Resolve binary (with or without diagnostics)
let binPath: string | null;
let searchedPaths: string[] = [];

if (showDiagnostics) {
  const result = resolveWithDiagnostics(binary, projectHome);
  binPath = result.path;
  searchedPaths = result.searched;
} else {
  binPath = resolveBinary(binary, projectHome, allowFallback);
}

// Error handling
if (!binPath) {
  console.error(`❌ Binary not found: ${binary}`);

  if (showDiagnostics && searchedPaths.length > 0) {
    console.error(`   Searched in:`);
    for (const dir of searchedPaths) {
      console.error(`     - ${dir}`);
    }
  } else {
    console.error(`   Expected in: ${projectHome}/node_modules/.bin`);
    console.error(`   PATH: ${buildProjectPath(projectHome)}`);
  }

  console.error(`\n💡 Tips:`);
  console.error(`   - Ensure ${projectName}/node_modules/.bin exists: bun install`);
  console.error(`   - Check binary name is correct (e.g., 'tsc' not 'typescript')`);
  console.error(`   - Use --diagnostics to see all searched paths`);
  console.error(`   - Use --no-fallback to only check project-local binaries`);

  Bun.exit(1);
}

console.log(`✅ Found: ${binPath}`);

if (showDiagnostics) {
  console.log(`   Searched: ${searchedPaths.join(" → ")}`);
}

console.log(`🚀 Spawning...\n`);

// Spawn the process with proper isolation
const proc = spawn([binPath!, ...binaryArgs], {
  cwd: projectHome,
  stdio: "inherit",
  env: {
    ...process.env,
    PROJECT_HOME: projectHome,
    BUN_PLATFORM_HOME: platformHome
  },
  onExit(proc: any, exitCode: number, signalCode: any, error: any) {
    if (error) {
      console.error(`\n❌ Process error: ${error}`);
    } else if (exitCode !== 0) {
      console.log(`\n⚠️  Exited with code ${exitCode}${signalCode ? ` (signal: ${signalCode})` : ""}`);
    } else {
      console.log(`\n✅ Completed successfully`);
    }
  },
});

// Wait for completion
await proc.exited;
