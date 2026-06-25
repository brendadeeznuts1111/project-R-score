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
    console.info("📊 Matrix Agent Status");
    console.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Profile system status
    const profiles = await listProfiles();
    const activeProfile = getActiveProfile();
    console.info(`Profiles: ${profiles.length} available`);
    console.info(`Active: ${activeProfile || "none"}`);

    // Kimi integration status
    const kimiAvailable = await isKimiAvailable();
    console.info(`\nKimi Shell: ${kimiAvailable ? "✅ connected" : "❌ not found"}`);
    if (kimiAvailable) {
      const version = await getKimiVersion();
      console.info(`Version: ${version}`);
    }

    // Profile stats
    const stats = await getProfileStats();
    console.info("\nProfile Distribution:");
    for (const [env, count] of Object.entries(stats.environments)) {
      console.info(`  ${env}: ${count}`);
    }
  }

  async profileList(): Promise<void> {
    const profiles = await listProfiles();

    if (profiles.length === 0) {
      console.info("No profiles found. Create one with: matrix-agent profile create <name>");
      return;
    }

    const active = getActiveProfile();

    console.info("Available Profiles:");
    console.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    for (const p of profiles) {
      const marker = p.name === active ? "● " : "  ";
      console.info(`${marker}${p.name} (${p.environment})`);
      if (p.description) {
        console.info(`     ${p.description.slice(0, 50)}`);
      }
    }
  }

  async profileShow(name: string): Promise<void> {
    const profile = await loadProfile(name);
    if (!profile) {
      console.error(`Profile "${name}" not found`);
      process.exit(1);
    }

    console.info(`Profile: ${profile.name}`);
    console.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.info(`Version: ${profile.version}`);
    console.info(`Environment: ${profile.environment || "not set"}`);
    console.info(`Description: ${profile.description || "none"}`);
    console.info(`Author: ${profile.author || "unknown"}`);
    console.info(`Created: ${profile.created || "unknown"}`);

    console.info("\nEnvironment Variables:");
    const envVars = applyProfileEnv(profile);
    for (const [key, value] of Object.entries(envVars)) {
      const displayValue = key.includes("KEY") || key.includes("SECRET") || key.includes("TOKEN")
        ? "***"
        : value;
      console.info(`  ${key}=${displayValue}`);
    }
  }

  async profileUse(name: string): Promise<void> {
    const profile = await loadProfile(name);
    if (!profile) {
      console.error(`Profile "${name}" not found`);
      process.exit(1);
    }

    const envVars = applyProfileEnv(profile);

    console.info(`# Activate profile: ${name}`);
    console.info("# Run these commands in your shell:");
    console.info();

    for (const [key, value] of Object.entries(envVars)) {
      console.info(`export ${key}="${value}"`);
    }

    console.info();
    console.info("# Or use: eval $(matrix-agent profile use-export " + name + ")");
  }

  async kimiStatus(): Promise<void> {
    console.info("🤖 Kimi Shell Integration");
    console.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const available = await isKimiAvailable();
    console.info(`Status: ${available ? "✅ available" : "❌ not installed"}`);

    if (available) {
      const version = await getKimiVersion();
      console.info(`Version: ${version}`);

      const sessionId = process.env.KIMI_SESSION_ID;
      console.info(`Session: ${sessionId || "none (new session)"}`);
      console.info(`Work Dir: ${process.cwd()}`);
    }
  }

  async kimiAsk(prompt: string, options: { profile?: string } = {}): Promise<void> {
    if (!await isKimiAvailable()) {
      console.error("Kimi CLI is not installed or not in PATH");
      console.error("Install from: https://kimi.com");
      process.exit(1);
    }

    console.info(`Asking Kimi: ${prompt.slice(0, 50)}...`);
    console.info();

    const result = await runKimiWithContext(prompt, {
      profile: options.profile,
      matrixContext: true,
    });

    if (result.success) {
      console.info(result.output);
    } else {
      console.error("Error:", result.output);
      process.exit(1);
    }
  }

  async kimiSync(profileName: string): Promise<void> {
    const success = await syncProfileWithKimi(profileName);
    if (success) {
      console.info(`✅ Profile "${profileName}" synced with Kimi environment`);
      console.info(`Location: ~/.kimi/.matrix-env`);
    } else {
      console.error(`❌ Failed to sync profile "${profileName}"`);
      process.exit(1);
    }
  }

  async health(): Promise<void> {
    console.info("🏥 Matrix Agent Health Check");
    console.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const checks: { name: string; check: () => Promise<boolean> | boolean }[] = [
      { name: "Config directory", check: () => Bun.file(join(MATRIX_DIR, "agent/config.json")).exists() },
      { name: "Profiles directory", check: () => Bun.file(join(MATRIX_DIR, "profiles")).exists() },
      { name: "Kimi CLI", check: () => isKimiAvailable() },
      { name: "Profile system", check: async () => (await listProfiles()).length >= 0 },
    ];

    let passed = 0;
    for (const { name, check } of checks) {
      const ok = await check();
      console.info(`  ${ok ? "✅" : "❌"} ${name}`);
      if (ok) passed++;
    }

    console.info(`\n${passed}/${checks.length} checks passed`);
  }

  showHelp(): void {
    console.info(`
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
      console.info("Profile Statistics:");
      console.info(`  Total: ${stats.total}`);
      console.info("  Environments:");
      for (const [env, count] of Object.entries(stats.environments)) {
        console.info(`    ${env}: ${count}`);
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
