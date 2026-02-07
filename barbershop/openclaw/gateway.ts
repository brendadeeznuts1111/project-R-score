#!/usr/bin/env bun
/**
 * OpenClaw Gateway - Matrix profile integration (Bun-native v3.16)
 * Part of Tier-1380 OMEGA Protocol
 * 
 * Integrates with lib/bun-context.ts for:
 * - Global config resolution
 * - Context-aware execution with caching
 * - Bun-native I/O and hashing
 */

import { homedir } from "node:os";
import { join } from "node:path";
import {
  type BunGlobalConfig,
  type BunCLIFlags,
  loadGlobalConfig,
  loadBunfigToml,
  parseFlags,
  generateContextHash,
  executeWithContext,
  c,
} from "../lib/bun-context.ts";

// Types
export interface OpenClawStatus {
  online: boolean;
  version: string;
  gatewayUrl: string;
  latencyMs: number;
  profilesActive: number;
  contextHash: string;
  globalConfig?: BunGlobalConfig;
}

export interface MatrixProfile {
  id: string;
  name: string;
  path: string;
  bound: boolean;
  lastUsed: string;
  context: Record<string, unknown>;
}

export interface ProfileBinding {
  profileId: string;
  directory: string;
  boundAt: string;
}

export interface MatrixBridgeStatus {
  bridgeOnline: boolean;
  matrixProtocol: string;
  gatewayConnected: boolean;
  profilesSynced: number;
  profilesTotal: number;
  lastSync: string;
  latencyMs: number;
  contextSync: {
    hash: string;
    synced: boolean;
    timestamp: string;
  };
  errors: string[];
  warnings: string[];
}

export interface ShellContext {
  OPENCLAW_PROFILE: string;
  OPENCLAW_CONTEXT: string;
  OPENCLAW_VERSION: string;
  OPENCLAW_CWD: string;
}

// Constants
const OPENCLAW_DIR = join(homedir(), ".openclaw");
const PROFILES_FILE = join(OPENCLAW_DIR, "profiles.json");
const BINDINGS_FILE = join(OPENCLAW_DIR, "bindings.json");
const GATEWAY_VERSION = "3.16.0-bun-context";

// Bun-native file helpers
async function fileExists(path: string): Promise<boolean> {
  const file = Bun.file(path);
  try {
    await file.text();
    return true;
  } catch {
    return false;
  }
}

async function readJSON<T>(path: string): Promise<T | null> {
  const file = Bun.file(path);
  try {
    return await file.json() as T;
  } catch {
    return null;
  }
}

async function writeJSON(path: string, data: unknown): Promise<void> {
  await Bun.write(path, JSON.stringify(data, null, 2));
}

async function ensureDir(): Promise<void> {
  try {
    await Bun.file(OPENCLAW_DIR).text();
  } catch {
    await Bun.write(join(OPENCLAW_DIR, ".keep"), "");
  }
}

// Load profiles with Bun-native I/O
async function loadProfiles(): Promise<MatrixProfile[]> {
  await ensureDir();
  
  const profiles = await readJSON<MatrixProfile[]>(PROFILES_FILE);
  if (profiles) return profiles;

  // Create default profiles
  const defaultProfiles: MatrixProfile[] = [
    {
      id: "default",
      name: "Default Matrix",
      path: homedir(),
      bound: false,
      lastUsed: new Date().toISOString(),
      context: {},
    },
    {
      id: "tier1380",
      name: "Tier-1380 OMEGA",
      path: "/Users/nolarose/Projects/barbershop",
      bound: true,
      lastUsed: new Date().toISOString(),
      context: { tier: 1380, phase: "3.9", apex: true },
    },
  ];
  
  await writeJSON(PROFILES_FILE, defaultProfiles);
  return defaultProfiles;
}

async function saveProfiles(profiles: MatrixProfile[]): Promise<void> {
  await ensureDir();
  await writeJSON(PROFILES_FILE, profiles);
}

async function loadBindings(): Promise<ProfileBinding[]> {
  await ensureDir();
  return (await readJSON<ProfileBinding[]>(BINDINGS_FILE)) || [];
}

async function saveBindings(bindings: ProfileBinding[]): Promise<void> {
  await ensureDir();
  await writeJSON(BINDINGS_FILE, bindings);
}

// Get OpenClaw gateway status with bun-context integration
export async function getOpenClawStatus(): Promise<OpenClawStatus> {
  const start = Bun.nanoseconds();
  
  // Load global config via bun-context
  const globalConfig = await loadGlobalConfig();
  
  const profiles = await loadProfiles();
  const activeCount = profiles.filter(p => p.bound).length;
  
  const contextData = {
    version: GATEWAY_VERSION,
    timestamp: Date.now(),
    profiles: profiles.length,
    cwd: globalConfig.cwd,
    bunVersion: globalConfig.version,
  };
  
  const latencyMs = Number(Bun.nanoseconds() - start) / 1_000_000;
  
  return {
    online: true,
    version: GATEWAY_VERSION,
    gatewayUrl: "wss://gateway.openclaw.local:9443",
    latencyMs: Math.round(latencyMs * 100) / 100,
    profilesActive: activeCount,
    contextHash: await generateContextHash(contextData),
    globalConfig: {
      ...globalConfig,
      env: Object.keys(globalConfig.env).reduce((acc, k) => {
        acc[k] = k.includes("SECRET") || k.includes("KEY") || k.includes("PASS") 
          ? "***" 
          : globalConfig.env[k];
        return acc;
      }, {} as Record<string, string>),
    },
  };
}

// List available profiles
export async function listProfiles(): Promise<MatrixProfile[]> {
  return loadProfiles();
}

// Get current directory binding
export async function getCurrentBinding(): Promise<ProfileBinding | null> {
  const cwd = process.cwd();
  const bindings = await loadBindings();
  return bindings.find(b => b.directory === cwd) || null;
}

// Bind current directory to profile
export async function bindProfile(profileId: string): Promise<boolean> {
  const profiles = await loadProfiles();
  const profile = profiles.find(p => p.id === profileId);
  
  if (!profile) {
    console.error(`Profile '${profileId}' not found`);
    return false;
  }
  
  const cwd = process.cwd();
  const bindings = await loadBindings();
  
  // Remove existing binding for this directory
  const existingIndex = bindings.findIndex(b => b.directory === cwd);
  if (existingIndex >= 0) {
    bindings.splice(existingIndex, 1);
  }
  
  // Add new binding
  bindings.push({
    profileId,
    directory: cwd,
    boundAt: new Date().toISOString(),
  });
  
  // Update profile
  profile.bound = true;
  profile.lastUsed = new Date().toISOString();
  
  await Promise.all([
    saveBindings(bindings),
    saveProfiles(profiles),
  ]);
  
  console.log(`✓ Bound '${cwd}' to profile '${profile.name}' (${profileId})`);
  return true;
}

// Switch to different profile
export async function switchProfile(profileId: string): Promise<boolean> {
  const profiles = await loadProfiles();
  const profile = profiles.find(p => p.id === profileId);
  
  if (!profile) {
    console.error(`Profile '${profileId}' not found`);
    return false;
  }
  
  profile.lastUsed = new Date().toISOString();
  await saveProfiles(profiles);
  
  console.log(`✓ Switched to profile '${profile.name}' (${profileId})`);
  console.log(`  Path: ${profile.path}`);
  console.log(`  Context:`, profile.context);
  
  return true;
}

// Get profile-terminal binding status
export async function getProfileStatus(): Promise<{
  currentDirectory: string;
  binding: ProfileBinding | null;
  profile: MatrixProfile | null;
  allProfiles: MatrixProfile[];
  contextHash: string;
  globalConfig: BunGlobalConfig;
}> {
  const cwd = process.cwd();
  const binding = await getCurrentBinding();
  const profiles = await loadProfiles();
  const globalConfig = await loadGlobalConfig();
  
  let profile: MatrixProfile | null = null;
  if (binding) {
    profile = profiles.find(p => p.id === binding.profileId) || null;
  }
  
  const contextData = { 
    cwd, 
    profileId: profile?.id, 
    timestamp: Date.now(),
    bunfig: await loadBunfigToml(globalConfig.configPath),
  };
  
  return {
    currentDirectory: cwd,
    binding,
    profile,
    allProfiles: profiles,
    contextHash: await generateContextHash(contextData),
    globalConfig,
  };
}

// Get Matrix Bridge status
export async function getMatrixBridgeStatus(): Promise<MatrixBridgeStatus> {
  const startTime = Bun.nanoseconds();
  
  // Load profiles and check sync status
  const profiles = await loadProfiles();
  const bindings = await loadBindings();
  const globalConfig = await loadGlobalConfig();
  
  // Calculate sync status
  const syncedProfiles = profiles.filter(p => p.bound).length;
  const totalProfiles = profiles.length;
  
  // Get current context hash
  const contextData = {
    cwd: process.cwd(),
    timestamp: Date.now(),
    profiles: totalProfiles,
  };
  const contextHash = await generateContextHash(contextData);
  
  // Check last sync time (from bindings)
  const lastSyncTime = bindings.length > 0 
    ? bindings.reduce((latest, b) => {
        const time = new Date(b.boundAt).getTime();
        return time > latest ? time : latest;
      }, 0)
    : Date.now();
  
  const latencyMs = Number(Bun.nanoseconds() - startTime) / 1_000_000;
  
  // Check for warnings/errors
  const warnings: string[] = [];
  const errors: string[] = [];
  
  if (syncedProfiles === 0 && totalProfiles > 0) {
    warnings.push('No profiles currently bound');
  }
  
  if (totalProfiles === 0) {
    errors.push('No Matrix profiles configured');
  }
  
  // Check if default profile exists
  const hasDefault = profiles.some(p => p.id === 'default');
  if (!hasDefault) {
    warnings.push('Default profile not found');
  }
  
  // Check bunfig.toml access
  try {
    const bunfig = await loadBunfigToml(globalConfig.configPath);
    if (!bunfig) {
      warnings.push(`bunfig.toml not found at ${globalConfig.configPath}`);
    }
  } catch (e) {
    errors.push('Failed to load bunfig.toml');
  }
  
  return {
    bridgeOnline: true,
    matrixProtocol: 'v3.28-tier1380',
    gatewayConnected: true,
    profilesSynced: syncedProfiles,
    profilesTotal: totalProfiles,
    lastSync: new Date(lastSyncTime).toISOString(),
    latencyMs: Math.round(latencyMs * 100) / 100,
    contextSync: {
      hash: contextHash,
      synced: syncedProfiles > 0,
      timestamp: new Date().toISOString(),
    },
    errors,
    warnings,
  };
}

// Build shell context from profile
async function buildShellContext(profile: MatrixProfile | null): Promise<ShellContext> {
  return {
    OPENCLAW_PROFILE: profile?.id || "default",
    OPENCLAW_CONTEXT: JSON.stringify(profile?.context || {}),
    OPENCLAW_VERSION: GATEWAY_VERSION,
    OPENCLAW_CWD: process.cwd(),
  };
}

// Execute shell command with profile context using Bun.spawn
export async function shellExecute(
  command: string,
  args: string[] = [],
  options: {
    env?: Record<string, string>;
    cwd?: string;
    timeout?: number;
    useContext?: boolean;
  } = {}
): Promise<{ stdout: string; stderr: string; exitCode: number; durationMs: number }> {
  const binding = await getCurrentBinding();
  const profiles = await loadProfiles();
  const profile = binding ? profiles.find(p => p.id === binding.profileId) : null;
  
  // Build context
  const shellContext = await buildShellContext(profile);
  
  // Merge environment
  const env: Record<string, string | undefined> = {
    ...process.env,
    ...shellContext,
    ...options.env,
  };
  
  const startTime = Bun.nanoseconds();
  
  // Resolve command using Bun.which
  let resolvedCmd = command;
  if (!command.includes("/")) {
    const whichResult = Bun.which(command);
    if (whichResult) resolvedCmd = whichResult;
  }
  
  // Spawn with Bun
  const proc = Bun.spawn({
    cmd: [resolvedCmd, ...args],
    cwd: options.cwd || process.cwd(),
    env,
    stdout: "pipe",
    stderr: "pipe",
  });
  
  // Timeout handling
  let timeoutId: Timer | null = null;
  if (options.timeout) {
    timeoutId = setTimeout(() => {
      proc.kill();
    }, options.timeout);
  }
  
  // Read output
  const [stdoutBuf, stderrBuf] = await Promise.all([
    new Response(proc.stdout).arrayBuffer(),
    new Response(proc.stderr).arrayBuffer(),
  ]);
  
  const exitCode = await proc.exited;
  if (timeoutId) clearTimeout(timeoutId);
  
  const durationMs = Number(Bun.nanoseconds() - startTime) / 1_000_000;
  
  return {
    stdout: new TextDecoder().decode(stdoutBuf),
    stderr: new TextDecoder().decode(stderrBuf),
    exitCode,
    durationMs: Math.round(durationMs * 100) / 100,
  };
}

// Execute with bun-context integration (uses executeWithContext)
export async function shellExecuteWithContext(
  rawArgs: string[],
  options: { useCache?: boolean } = {}
): Promise<{ stdout: string; stderr: string; exitCode: number; durationMs: number }> {
  const startTime = Bun.nanoseconds();
  
  // Use bun-context's executeWithContext
  const session = await executeWithContext(rawArgs, { useCache: options.useCache });
  
  return {
    stdout: "",
    stderr: "",
    exitCode: session.exitCode || 0,
    durationMs: session.durationMs || 0,
  };
}

// CLI handler
async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  
  switch (cmd) {
    case "status":
    case "openclaw_status": {
      const status = await getOpenClawStatus();
      console.log(JSON.stringify(status, null, 2));
      break;
    }
    
    case "profiles":
    case "profile_list": {
      const profiles = await listProfiles();
      console.table(profiles.map(p => ({
        ID: p.id,
        Name: p.name,
        Bound: p.bound ? "✓" : "",
        "Last Used": new Date(p.lastUsed).toLocaleDateString(),
      })));
      break;
    }
    
    case "bind":
    case "profile_bind": {
      const [profileId] = args;
      if (!profileId) {
        console.error("Usage: bind <profile-id>");
        process.exit(1);
      }
      await bindProfile(profileId);
      break;
    }
    
    case "switch":
    case "profile_switch": {
      const [profileId] = args;
      if (!profileId) {
        console.error("Usage: switch <profile-id>");
        process.exit(1);
      }
      await switchProfile(profileId);
      break;
    }
    
    case "profile_status": {
      const status = await getProfileStatus();
      console.log("Current Directory:", status.currentDirectory);
      console.log("Binding:", status.binding ? 
        `${status.binding.profileId} (bound at ${status.binding.boundAt})` : 
        "None");
      console.log("Active Profile:", status.profile?.name || "None");
      console.log("Context Hash:", status.contextHash);
      console.log("Bunfig:", status.globalConfig.configPath);
      console.log("\nAll Profiles:");
      console.table(status.allProfiles.map(p => ({
        ID: p.id,
        Name: p.name,
        Bound: p.bound ? "✓" : "",
      })));
      break;
    }
    
    case "exec":
    case "shell_execute": {
      const [shellCmd, ...shellArgs] = args;
      if (!shellCmd) {
        console.error("Usage: exec <command> [args...]");
        process.exit(1);
      }
      const result = await shellExecute(shellCmd, shellArgs);
      console.log(result.stdout);
      if (result.stderr) console.error(result.stderr);
      console.log(c.gray(`Duration: ${result.durationMs}ms`));
      process.exit(result.exitCode);
    }
    
    case "context": {
      // Use bun-context to execute
      const result = await shellExecuteWithContext(args, { useCache: true });
      console.log(c.gray(`Duration: ${result.durationMs}ms`));
      process.exit(result.exitCode);
    }
    
    default: {
      console.log(`
OpenClaw Gateway v${GATEWAY_VERSION} (Bun Context v3.16)

Commands:
  status              Check OpenClaw gateway status
  profiles            List available Matrix profiles
  bind <profile>      Bind current directory to profile
  switch <profile>    Switch to different profile
  profile_status      Show profile-terminal binding status
  exec <command>      Execute shell command with profile context
  context <cmd>       Execute with bun-context resolution

Environment:
  OPENCLAW_PROFILE    Current profile ID
  OPENCLAW_CONTEXT    Profile context (JSON)
  OPENCLAW_VERSION    Gateway version
  OPENCLAW_CWD        Working directory

Examples:
  bun openclaw/gateway.ts status
  bun openclaw/gateway.ts profiles
  bun openclaw/gateway.ts bind tier1380
  bun openclaw/gateway.ts exec echo "Hello from profile"
  bun openclaw/gateway.ts context bun --version
`);
    }
  }
}

if (import.meta.main) {
  main();
}

export default {
  getOpenClawStatus,
  getMatrixBridgeStatus,
  listProfiles,
  bindProfile,
  switchProfile,
  getProfileStatus,
  shellExecute,
  shellExecuteWithContext,
};
