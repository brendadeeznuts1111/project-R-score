#!/usr/bin/env bun
/**
 * Bun Context v3.16 - Global config + context resolution
 * Part of Tier-1380 OMEGA Protocol
 * 
 * Bun-native features:
 * - Bun.file() / Bun.write() for I/O
 * - Bun.hash.crc32() for context hashing
 * - Bun.which() for command resolution
 * - Bun.spawn() for process execution
 * - Native TOML loading
 */

import { Glob } from "bun";
import { watch } from "node:fs";

// Types
export interface BunGlobalConfig {
  cwd: string;
  envFile: string[];
  configPath: string;
  env: Record<string, string>;
  argv: string[];
  execPath: string;
  version: string;
}

export interface BunfigConfig {
  run?: {
    shell?: "bun" | "system";
    preload?: string[];
    env?: Record<string, string>;
  };
  install?: {
    registry?: string;
    cache?: boolean;
  };
  test?: {
    preload?: string[];
    coverage?: boolean;
  };
  serve?: {
    port?: number;
    hostname?: string;
  };
}

export interface BunCLIFlags {
  cwd?: string;
  envFile?: string[];
  config?: string;
  shell?: "bun" | "system";
  preload?: string[];
  watch?: boolean;
  hot?: boolean;
  noClear?: boolean;
}

export interface ContextSession {
  id: string;
  flags: BunCLIFlags;
  command: string;
  args: string[];
  startTime: number;
  status: "running" | "completed" | "failed";
  durationMs?: number;
  exitCode?: number;
  globalConfig: BunGlobalConfig;
  bunfig: BunfigConfig;
  contextHash: string;
}

// Cache
const contextCache = new Map<string, ContextSession>();

// Color helpers
const c = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

// Load global configuration with precedence
export async function loadGlobalConfig(flags: BunCLIFlags = {}): Promise<BunGlobalConfig> {
  const config: BunGlobalConfig = {
    cwd: flags.cwd || process.cwd(),
    envFile: flags.envFile || [],
    configPath: flags.config || findBunfigToml(),
    env: { ...process.env } as Record<string, string>,
    argv: process.argv,
    execPath: process.execPath,
    version: Bun.version,
  };

  // 1. Load env files (CLI order matters)
  for (const envFile of config.envFile) {
    const envPath = resolvePath(config.cwd, envFile);
    const loaded = await loadEnvFile(envPath);
    config.env = { ...config.env, ...loaded };
  }

  // 2. Load bunfig.toml env (lower precedence than CLI env files)
  const bunfig = await loadBunfigToml(config.configPath);
  if (bunfig.run?.env) {
    config.env = { ...bunfig.run.env, ...config.env };
  }

  return config;
}

async function loadEnvFile(path: string): Promise<Record<string, string>> {
  const file = Bun.file(path);
  try {
    const content = await file.text();
    const env: Record<string, string> = {};

    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;

      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();

      // Handle quoted values
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      env[key] = value;
    }

    return env;
  } catch {
    console.warn(c.yellow(`⚠️  Env file not found: ${path}`));
    return {};
  }
}

async function loadBunfigToml(path: string): Promise<BunfigConfig> {
  const file = Bun.file(path);
  try {
    // Try native TOML import first
    const toml = await import(path + "?type=toml");
    return toml.default || {};
  } catch {
    // Fallback to manual parsing
    try {
      const content = await file.text();
      return parseMinimalTOML(content);
    } catch {
      return {};
    }
  }
}

function parseMinimalTOML(content: string): BunfigConfig {
  const config: BunfigConfig = {};
  let currentSection: keyof BunfigConfig | null = null;

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Section headers: [run], [install], [test]
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      currentSection = trimmed.slice(1, -1) as keyof BunfigConfig;
      (config as any)[currentSection] = {};
      continue;
    }

    // Key = value pairs
    const eq = trimmed.indexOf("=");
    if (eq === -1 || !currentSection) continue;

    const key = trimmed.slice(0, eq).trim();
    let value: any = trimmed.slice(eq + 1).trim();

    // Type coercion
    if (value === "true") value = true;
    else if (value === "false") value = false;
    else if (value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/["']/g, ""));
    } else if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    (config[currentSection] as any)[key] = value;
  }

  return config;
}

function findBunfigToml(): string {
  const candidates = ["bunfig.toml", ".bunfig.toml", "bun.toml"];
  for (const c of candidates) {
    const file = Bun.file(c);
    // Check if file exists by trying to stat it
    try {
      // Using a simple check - if we can get the file, it exists
      return c;
    } catch {
      continue;
    }
  }
  return "bunfig.toml";
}

function resolvePath(cwd: string, relPath: string): string {
  if (relPath.startsWith("/")) return relPath;
  return `${cwd}/${relPath}`;
}

// Parse CLI flags
export function parseFlags(argv: string[]): { flags: BunCLIFlags; command: string; args: string[] } {
  const flags: BunCLIFlags = {};
  const args: string[] = [];
  let command = "";

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--cwd" && argv[i + 1]) {
      flags.cwd = argv[++i];
    } else if (arg === "--env-file" && argv[i + 1]) {
      flags.envFile = flags.envFile || [];
      flags.envFile.push(argv[++i]);
    } else if (arg === "--config" && argv[i + 1]) {
      flags.config = argv[++i];
    } else if (arg === "--shell" && argv[i + 1]) {
      flags.shell = argv[++i] as "bun" | "system";
    } else if (arg === "--preload" && argv[i + 1]) {
      flags.preload = flags.preload || [];
      flags.preload.push(argv[++i]);
    } else if (arg === "--watch" || arg === "-w") {
      flags.watch = true;
    } else if (arg === "--hot") {
      flags.hot = true;
    } else if (arg === "--no-clear") {
      flags.noClear = true;
    } else if (!command && !arg.startsWith("-")) {
      command = arg;
    } else if (command) {
      args.push(arg);
    }
  }

  return { flags, command, args };
}

// Generate context hash using Bun.hash.crc32
async function generateContextHash(data: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  const hash = Bun.hash.crc32(bytes);
  return hash.toString(16).padStart(8, "0");
}

// Context-aware execution with caching
export async function executeWithContext(
  rawArgs: string[],
  opts: { useCache?: boolean } = {}
): Promise<ContextSession> {
  const { flags, command, args } = parseFlags(rawArgs);
  
  if (!command) {
    throw new Error("No command specified");
  }

  const globalConfig = await loadGlobalConfig(flags);

  // Generate context hash for caching
  const contextHash = await generateContextHash({
    cwd: globalConfig.cwd,
    envFile: globalConfig.envFile,
    config: globalConfig.configPath,
    command,
    args,
  });

  // Check cache
  if (opts.useCache && contextCache.has(contextHash)) {
    console.log(c.gray(`[cache hit] ${command}`));
    return contextCache.get(contextHash)!;
  }

  const session: ContextSession = {
    id: crypto.randomUUID(),
    flags,
    command,
    args,
    startTime: performance.now(),
    status: "running",
    globalConfig,
    bunfig: await loadBunfigToml(globalConfig.configPath),
    contextHash,
  };

  // Apply bunfig defaults
  applyBunfigDefaults(session);

  // Execute with full context
  try {
    await executeWithResolutionOrder(session);
    session.status = "completed";
    session.exitCode = 0;
  } catch (err) {
    session.status = "failed";
    session.exitCode = 1;
  }

  session.durationMs = performance.now() - session.startTime;

  // Cache session
  if (opts.useCache) {
    contextCache.set(session.contextHash, session);
  }

  renderContextResult(session);
  return session;
}

function applyBunfigDefaults(session: ContextSession): void {
  const { flags, bunfig } = session;

  // Apply run defaults from bunfig
  if (bunfig.run) {
    if (!flags.shell && bunfig.run.shell) {
      flags.shell = bunfig.run.shell;
    }
    if (!flags.preload && bunfig.run.preload) {
      flags.preload = bunfig.run.preload;
    }
  }

  // Apply test defaults
  if (session.command === "test" && bunfig.test) {
    if (!flags.preload && bunfig.test.preload) {
      flags.preload = bunfig.test.preload;
    }
  }
}

async function executeWithResolutionOrder(session: ContextSession): Promise<void> {
  const { command, args, flags, globalConfig } = session;

  // Set up environment
  const env = { ...globalConfig.env };
  if (flags.shell) env.BUN_CONFIG_SHELL = flags.shell;

  // Resolution Order 1: package.json scripts
  if (await isPackageScript(command, globalConfig.cwd)) {
    await executeScriptWithContext(command, args, flags, globalConfig, session);
  }
  // Resolution Order 2: Source files
  else if (await isSourceFile(command, globalConfig.cwd)) {
    await executeFileWithContext(command, args, flags, globalConfig, session);
  }
  // Resolution Order 3: Binaries (using Bun.which)
  else if (Bun.which(command)) {
    await executeBinaryWithContext(command, args, flags, globalConfig, session);
  }
  // Resolution Order 4: System commands
  else {
    await executeSystemWithContext(command, args, flags, globalConfig, session);
  }
}

async function isPackageScript(cmd: string, cwd: string): Promise<boolean> {
  try {
    const pkg = await Bun.file(`${cwd}/package.json`).json();
    return !!pkg.scripts?.[cmd];
  } catch {
    return false;
  }
}

async function isSourceFile(cmd: string, cwd: string): Promise<boolean> {
  const exts = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
  if (!exts.some((e) => cmd.endsWith(e))) return false;

  const fullPath = resolvePath(cwd, cmd);
  const file = Bun.file(fullPath);
  try {
    await file.text();
    return true;
  } catch {
    return false;
  }
}

async function executeScriptWithContext(
  script: string,
  args: string[],
  flags: BunCLIFlags,
  config: BunGlobalConfig,
  session: ContextSession
): Promise<void> {
  const pkgPath = `${config.cwd}/package.json`;
  const pkg = await Bun.file(pkgPath).json();
  const scriptCmd = pkg.scripts[script];

  console.log(c.gray(`$ ${scriptCmd}`));

  const proc = Bun.spawn({
    cmd: buildCommand(["bun", "run", script, ...args], flags),
    cwd: config.cwd,
    stdout: "inherit",
    stderr: "inherit",
    env: config.env,
  });

  session.exitCode = await proc.exited;
}

async function executeFileWithContext(
  file: string,
  args: string[],
  flags: BunCLIFlags,
  config: BunGlobalConfig,
  session: ContextSession
): Promise<void> {
  const fullPath = resolvePath(config.cwd, file);

  if (flags.watch || flags.hot) {
    // Watch mode with context-aware restart
    const watcher = watch(fullPath, { recursive: false }, async (event) => {
      if (!flags.noClear) console.clear();
      console.log(c.cyan(`[${fmtTime()}] ${event} → ${file}`));
      await runFileOnce(fullPath, args, flags, config);
    });

    await runFileOnce(fullPath, args, flags, config);
    await new Promise(() => {}); // Keep alive
  } else {
    await runFileOnce(fullPath, args, flags, config);
  }
}

async function runFileOnce(
  file: string,
  args: string[],
  flags: BunCLIFlags,
  config: BunGlobalConfig
): Promise<void> {
  const proc = Bun.spawn({
    cmd: buildCommand(["bun", "run", file, ...args], flags),
    cwd: config.cwd,
    stdout: "inherit",
    stderr: "inherit",
    env: config.env,
  });

  await proc.exited;
}

async function executeBinaryWithContext(
  command: string,
  args: string[],
  flags: BunCLIFlags,
  config: BunGlobalConfig,
  session: ContextSession
): Promise<void> {
  const resolvedCmd = Bun.which(command);
  if (!resolvedCmd) throw new Error(`Binary not found: ${command}`);

  const proc = Bun.spawn({
    cmd: buildCommand([resolvedCmd, ...args], flags),
    cwd: config.cwd,
    stdout: "inherit",
    stderr: "inherit",
    env: config.env,
  });

  session.exitCode = await proc.exited;
}

async function executeSystemWithContext(
  command: string,
  args: string[],
  flags: BunCLIFlags,
  config: BunGlobalConfig,
  session: ContextSession
): Promise<void> {
  const proc = Bun.spawn({
    cmd: buildCommand([command, ...args], flags),
    cwd: config.cwd,
    stdout: "inherit",
    stderr: "inherit",
    env: config.env,
    shell: true,
  });

  session.exitCode = await proc.exited;
}

function buildCommand(baseCmd: string[], flags: BunCLIFlags): string[] {
  const cmd = [...baseCmd];

  if (flags.preload) {
    for (const preload of flags.preload) {
      cmd.splice(1, 0, "--preload", preload);
    }
  }

  return cmd;
}

function renderContextResult(session: ContextSession): void {
  const { command, durationMs, globalConfig, contextHash } = session;
  const status = session.exitCode === 0 ? c.green("✓") : c.red("✗");

  console.log(`\n${status} ${c.bold(command)}`);
  console.log(c.gray(`  CWD: ${globalConfig.cwd}`));
  console.log(c.gray(`  Config: ${globalConfig.configPath}`));
  console.log(c.gray(`  Context: ${contextHash}`));
  console.log(c.gray(`  Duration: ${(durationMs || 0).toFixed(2)}ms`));
}

function fmtTime(): string {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

// Export all
export {
  c,
  contextCache,
  generateContextHash,
  resolvePath,
  fmtTime,
  loadBunfigToml,
};

// CLI handler
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
${c.cyan("Bun Context v3.16")} - Global config + context resolution

Usage:
  bun run lib/bun-context.ts <command> [args...]

Commands:
  exec <cmd>     Execute with context resolution
  config         Show loaded configuration
  cache          Show cache status
  clear-cache    Clear context cache

Examples:
  bun run lib/bun-context.ts exec bun --version
  bun run lib/bun-context.ts config
`);
    return;
  }

  const [cmd, ...rest] = args;

  switch (cmd) {
    case "exec": {
      await executeWithContext(rest, { useCache: true });
      break;
    }

    case "config": {
      const config = await loadGlobalConfig();
      const bunfig = await loadBunfigToml(config.configPath);
      console.log("Global Config:");
      console.log(JSON.stringify(config, null, 2));
      console.log("\nBunfig:");
      console.log(JSON.stringify(bunfig, null, 2));
      break;
    }

    case "cache": {
      console.log(`Cached sessions: ${contextCache.size}`);
      for (const [hash, session] of contextCache) {
        console.log(`  ${hash}: ${session.command} (${session.status})`);
      }
      break;
    }

    case "clear-cache": {
      contextCache.clear();
      console.log("Cache cleared");
      break;
    }

    default: {
      console.error(`Unknown command: ${cmd}`);
      process.exit(1);
    }
  }
}

if (import.meta.main) {
  main();
}
