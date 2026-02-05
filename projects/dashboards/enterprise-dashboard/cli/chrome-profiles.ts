#!/usr/bin/env bun
/**
 * Chrome Profile Management
 * Manage Chrome profiles per user/environment for opening HTML reports
 * 
 * Usage:
 *   bun run cli/chrome-profiles.ts list
 *   bun run cli/chrome-profiles.ts set dev DEV-Projects
 *   bun run cli/chrome-profiles.ts get dev
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import { existsSync } from "fs";

interface ProfileConfig {
  [user: string]: {
    profileName: string;
    profileDirectory?: string;
    lastUsed?: string;
  };
}

const CONFIG_DIR = join(homedir(), ".config", "enterprise-dashboard");
const CONFIG_FILE = join(CONFIG_DIR, "chrome-profiles.json");

async function loadConfig(): Promise<ProfileConfig> {
  try {
    if (existsSync(CONFIG_FILE)) {
      const content = await readFile(CONFIG_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch {
    // Config file doesn't exist or is invalid
  }
  return {};
}

async function saveConfig(config: ProfileConfig): Promise<void> {
  try {
    await mkdir(CONFIG_DIR, { recursive: true });
    await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch (error) {
    console.error(`Failed to save config: ${error}`);
    process.exit(1);
  }
}

async function findChromeProfile(profileName: string): Promise<string | null> {
  if (process.platform !== "darwin") return null;
  
  try {
    const localStatePath = join(
      homedir(),
      "Library/Application Support/Google/Chrome/Local State"
    );
    const localState = JSON.parse(await readFile(localStatePath, "utf-8"));
    const profiles = localState?.profile?.info_cache || {};
    
    for (const [dir, info] of Object.entries(profiles as Record<string, any>)) {
      if (info?.name === profileName) {
        return dir;
      }
    }
  } catch {
    // If we can't read Local State, return null
  }
  
  return null;
}

async function listChromeProfiles(): Promise<Array<{ name: string; directory: string }>> {
  if (process.platform !== "darwin") return [];
  
  try {
    const localStatePath = join(
      homedir(),
      "Library/Application Support/Google/Chrome/Local State"
    );
    const localState = JSON.parse(await readFile(localStatePath, "utf-8"));
    const profiles = localState?.profile?.info_cache || {};
    
    return Object.entries(profiles as Record<string, any>).map(([dir, info]) => ({
      name: info?.name || "Unnamed",
      directory: dir,
    }));
  } catch {
    return [];
  }
}

async function cmdList() {
  const config = await loadConfig();
  const chromeProfiles = await listChromeProfiles();
  
  console.log("📋 Configured User Profiles:\n");
  
  if (Object.keys(config).length === 0) {
    console.log("  No profiles configured yet.");
    console.log("  Use: bun run cli/chrome-profiles.ts set <user> <profile-name>\n");
  } else {
    for (const [user, profile] of Object.entries(config)) {
      console.log(`  ${user}:`);
      console.log(`    Profile: ${profile.profileName}`);
      if (profile.profileDirectory) {
        console.log(`    Directory: ${profile.profileDirectory}`);
      }
      if (profile.lastUsed) {
        console.log(`    Last Used: ${profile.lastUsed}`);
      }
      console.log();
    }
  }
  
  console.log("🌐 Available Chrome Profiles:\n");
  if (chromeProfiles.length === 0) {
    console.log("  No Chrome profiles found.");
  } else {
    chromeProfiles.forEach((p) => {
      console.log(`  • ${p.name} (${p.directory})`);
    });
  }
}

async function cmdSet(user: string, profileName: string) {
  if (!user || !profileName) {
    console.error("Usage: bun run cli/chrome-profiles.ts set <user> <profile-name>");
    process.exit(1);
  }
  
  const config = await loadConfig();
  const profileDir = await findChromeProfile(profileName);
  
  config[user] = {
    profileName,
    profileDirectory: profileDir || undefined,
    lastUsed: new Date().toISOString(),
  };
  
  await saveConfig(config);
  
  console.log(`✅ Profile configured for user: ${user}`);
  console.log(`   Chrome Profile: ${profileName}`);
  if (profileDir) {
    console.log(`   Directory: ${profileDir}`);
  } else {
    console.log(`   ⚠️  Profile directory not found - will use default Chrome profile`);
  }
}

async function cmdGet(user: string) {
  if (!user) {
    console.error("Usage: bun run cli/chrome-profiles.ts get <user>");
    process.exit(1);
  }
  
  const config = await loadConfig();
  const profile = config[user];
  
  if (!profile) {
    console.error(`❌ No profile configured for user: ${user}`);
    console.log(`   Use: bun run cli/chrome-profiles.ts set ${user} <profile-name>`);
    process.exit(1);
  }
  
  console.log(JSON.stringify(profile, null, 2));
}

async function cmdRemove(user: string) {
  if (!user) {
    console.error("Usage: bun run cli/chrome-profiles.ts remove <user>");
    process.exit(1);
  }
  
  const config = await loadConfig();
  
  if (!config[user]) {
    console.error(`❌ No profile configured for user: ${user}`);
    process.exit(1);
  }
  
  delete config[user];
  await saveConfig(config);
  
  console.log(`✅ Profile removed for user: ${user}`);
}

async function cmdDefault(user: string) {
  if (!user) {
    console.error("Usage: bun run cli/chrome-profiles.ts default <user>");
    process.exit(1);
  }
  
  const config = await loadConfig();
  
  if (!config[user]) {
    console.error(`❌ No profile configured for user: ${user}`);
    console.log(`   Use: bun run cli/chrome-profiles.ts set ${user} <profile-name>`);
    process.exit(1);
  }
  
  config._default = user;
  await saveConfig(config);
  
  console.log(`✅ Default user set to: ${user}`);
}

async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  switch (command) {
    case "list":
      await cmdList();
      break;
    case "set":
      await cmdSet(args[0], args[1]);
      break;
    case "get":
      await cmdGet(args[0]);
      break;
    case "remove":
      await cmdRemove(args[0]);
      break;
    case "default":
      await cmdDefault(args[0]);
      break;
    default:
      console.log(`
Chrome Profile Management

Usage:
  bun run cli/chrome-profiles.ts list              List all configured profiles
  bun run cli/chrome-profiles.ts set <user> <name> Set profile for user
  bun run cli/chrome-profiles.ts get <user>        Get profile for user (JSON)
  bun run cli/chrome-profiles.ts remove <user>     Remove profile for user
  bun run cli/chrome-profiles.ts default <user>    Set default user

Examples:
  bun run cli/chrome-profiles.ts set dev DEV-Projects
  bun run cli/chrome-profiles.ts set staging Personal
  bun run cli/chrome-profiles.ts default dev
      `);
      process.exit(0);
  }
}

if (import.meta.main) {
  main();
}
