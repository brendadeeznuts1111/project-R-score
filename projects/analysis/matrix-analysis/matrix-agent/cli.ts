#!/usr/bin/env bun
/**
 * Matrix Agent CLI - Integrated with Profile System and Kimi Shell
 */

import { join } from "path";
import { homedir } from "os";
import {
  listProfiles,
  loadProfile,
  getActiveProfile,
  applyProfileEnv,
  getProfileStats,
  type Profile,
} from "./lib/profile-integration.ts";
import {
  isKimiAvailable,
  getKimiVersion,
  runKimiWithContext,
  syncProfileWithKimi,
} from "./lib/kimi-integration.ts";

const MATRIX_DIR = join(homedir(), ".matrix");

interface CommandResult {
  success: boolean;
  output: string;
}

class MatrixAgentCLI {
  async status(): Promise<void> {
    console.log("📊 Matrix Agent Status");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Profile system status
    const profiles = await listProfiles();
    const activeProfile = getActiveProfile();
    console.log(`Profiles: ${profiles.length} available`);
    console.log(`Active: ${activeProfile || "none"}`);

    // Kimi integration status
    const kimiAvailable = await isKimiAvailable();
    console.log(`\nKimi Shell: ${kimiAvailable ? "✅ connected" : "❌ not found"}`);
    if (kimiAvailable) {
      const version = await getKimiVersion();
      console.log(`Version: ${version}`);
    }

    // Profile stats
    const stats = await getProfileStats();
    console.log("\nProfile Distribution:");
    for (const [env, count] of Object.entries(stats.environments)) {
      console.log(`  ${env}: ${count}`);
    }
  }

  async profileList(): Promise<void> {
    const profiles = await listProfiles();

    if (profiles.length === 0) {
      console.log("No profiles found. Create one with: matrix-agent profile create <name>");
      return;
    }

    const active = getActiveProfile();

    console.log("Available Profiles:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    for (const p of profiles) {
      const marker = p.name === active ? "● " : "  ";
      console.log(`${marker}${p.name} (${p.environment})`);
      if (p.description) {
        console.log(`     ${p.description.slice(0, 50)}`);
      }
    }
  }

  async profileShow(name: string): Promise<void> {
    const profile = await loadProfile(name);
    if (!profile) {
      console.error(`Profile "${name}" not found`);
      process.exit(1);
    }

    console.log(`Profile: ${profile.name}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Version: ${profile.version}`);
    console.log(`Environment: ${profile.environment || "not set"}`);
    console.log(`Description: ${profile.description || "none"}`);
    console.log(`Author: ${profile.author || "unknown"}`);
    console.log(`Created: ${profile.created || "unknown"}`);

    console.log("\nEnvironment Variables:");
    const envVars = applyProfileEnv(profile);
    for (const [key, value] of Object.entries(envVars)) {
      const displayValue = key.includes("KEY") || key.includes("SECRET") || key.includes("TOKEN")
        ? "***"
        : value;
      console.log(`  ${key}=${displayValue}`);
    }
  }

  async profileUse(name: string): Promise<void> {
    const profile = await loadProfile(name);
    if (!profile) {
      console.error(`Profile "${name}" not found`);
      process.exit(1);
    }

    const envVars = applyProfileEnv(profile);

    console.log(`# Activate profile: ${name}`);
    console.log("# Run these commands in your shell:");
    console.log();

    for (const [key, value] of Object.entries(envVars)) {
      console.log(`export ${key}="${value}"`);
    }

    console.log();
    console.log("# Or use: eval $(matrix-agent profile use-export " + name + ")");
  }

  async kimiStatus(): Promise<void> {
    console.log("🤖 Kimi Shell Integration");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const available = await isKimiAvailable();
    console.log(`Status: ${available ? "✅ available" : "❌ not installed"}`);

    if (available) {
      const version = await getKimiVersion();
      console.log(`Version: ${version}`);

      const sessionId = process.env.KIMI_SESSION_ID;
      console.log(`Session: ${sessionId || "none (new session)"}`);
      console.log(`Work Dir: ${process.cwd()}`);
    }
  }

  async kimiAsk(prompt: string, options: { profile?: string } = {}): Promise<void> {
    if (!await isKimiAvailable()) {
      console.error("Kimi CLI is not installed or not in PATH");
      console.error("Install from: https://kimi.com");
      process.exit(1);
    }

    console.log(`Asking Kimi: ${prompt.slice(0, 50)}...`);
    console.log();

    const result = await runKimiWithContext(prompt, {
      profile: options.profile,
      matrixContext: true,
    });

    if (result.success) {
      console.log(result.output);
    } else {
      console.error("Error:", result.output);
      process.exit(1);
    }
  }

  async kimiSync(profileName: string): Promise<void> {
    const success = await syncProfileWithKimi(profileName);
    if (success) {
      console.log(`✅ Profile "${profileName}" synced with Kimi environment`);
      console.log(`Location: ~/.kimi/.matrix-env`);
    } else {
      console.error(`❌ Failed to sync profile "${profileName}"`);
      process.exit(1);
    }
  }

  async health(): Promise<void> {
    console.log("🏥 Matrix Agent Health Check");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const checks: { name: string; check: () => Promise<boolean> | boolean }[] = [
      { name: "Config directory", check: () => Bun.file(join(MATRIX_DIR, "agent/config.json")).exists() },
      { name: "Profiles directory", check: () => Bun.file(join(MATRIX_DIR, "profiles")).exists() },
      { name: "Kimi CLI", check: () => isKimiAvailable() },
      { name: "Profile system", check: async () => (await listProfiles()).length >= 0 },
    ];

    let passed = 0;
    for (const { name, check } of checks) {
      const ok = await check();
      console.log(`  ${ok ? "✅" : "❌"} ${name}`);
      if (ok) passed++;
    }

    console.log(`\n${passed}/${checks.length} checks passed`);
  }

  showHelp(): void {
    console.log(`
Matrix Agent CLI - Profile & Kimi Integration

USAGE:
  matrix-agent <command> [options]

COMMANDS:
  status              Show agent status
  health              Run health checks

Profile Commands:
  profile list        List available profiles
  profile show <name> Show profile details
  profile use <name>  Generate export commands for profile
  profile stats       Show profile statistics

Kimi Integration:
  kimi status         Check Kimi shell integration
  kimi ask <prompt>   Ask Kimi with matrix context
  kimi sync <profile> Sync profile with Kimi environment

EXAMPLES:
  matrix-agent profile list
  matrix-agent profile use dev
  matrix-agent kimi ask "optimize this code"
  matrix-agent kimi sync production
`);
  }
}

// Main CLI
async function main() {
  const cli = new MatrixAgentCLI();
  const args = process.argv.slice(2);
  const command = args[0];
  const subcommand = args[1];
  const params = args.slice(2);

  switch (`${command} ${subcommand}`) {
    case "status":
      await cli.status();
      break;
    case "health":
      await cli.health();
      break;

    // Profile commands
    case "profile list":
      await cli.profileList();
      break;
    case "profile show":
      if (!params[0]) {
        console.error("Usage: matrix-agent profile show <name>");
        process.exit(1);
      }
      await cli.profileShow(params[0]);
      break;
    case "profile use":
      if (!params[0]) {
        console.error("Usage: matrix-agent profile use <name>");
        process.exit(1);
      }
      await cli.profileUse(params[0]);
      break;
    case "profile stats":
      const stats = await getProfileStats();
      console.log("Profile Statistics:");
      console.log(`  Total: ${stats.total}`);
      console.log("  Environments:");
      for (const [env, count] of Object.entries(stats.environments)) {
        console.log(`    ${env}: ${count}`);
      }
      break;

    // Kimi commands
    case "kimi status":
      await cli.kimiStatus();
      break;
    case "kimi ask":
      if (!params[0]) {
        console.error("Usage: matrix-agent kimi ask <prompt>");
        process.exit(1);
      }
      await cli.kimiAsk(params.join(" "), { profile: getActiveProfile() || undefined });
      break;
    case "kimi sync":
      if (!params[0]) {
        console.error("Usage: matrix-agent kimi sync <profile>");
        process.exit(1);
      }
      await cli.kimiSync(params[0]);
      break;

    default:
      cli.showHelp();
      break;
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
