#!/usr/bin/env bun
/**
 * src/cli/publish-skill.ts
 * Hybrid npm + R2 Publishing CLI
 * - Full publish (R2 + npm)
 * - npm only (skip R2)
 * - R2 only (skip npm)
 * - Validation without publishing
 */

import { existsSync } from "fs";
import { join } from "path";
import { SkillPublisher, type SkillPublishConfig } from "../lib/skill-publisher";

const CLI_VERSION = "1.0.0";

// =============================================================================
// CLI Help
// =============================================================================

const HELP = `
Bun Skill Publisher v${CLI_VERSION}
Hybrid npm + R2 publishing for native executables

Usage: publish-skill <command> [skill-id] [options]

Commands:
  publish, full              Full publish (R2 + npm) [default]
  publish:npm, npm           npm only (skip R2)
  publish:r2, r2             R2 only (skip npm)
  publish:check, check       Validate without publishing
  help                       Show this help

Options:
  -v, --version <version>    Override version (default: from package.json)
  --access <public|restricted>  npm access level
  --tag <tag>                npm dist-tag (default: latest)
  --dry-run                  Simulate publish
  --tolerate-republish       Don't fail if version exists
  --otp <code>               One-time password for 2FA
  --registry <url>           Custom npm registry
  --platforms <list>         Comma-separated platforms
  --no-compress              Disable gzip compression
  --ci                       CI mode (no prompts, tolerant)
  --verbose                  Show detailed logging

Environment Variables:
  R2_BUCKET                  R2 bucket name
  R2_ACCOUNT_ID              Cloudflare Account ID
  R2_ACCESS_KEY_ID           R2 access key
  R2_SECRET_ACCESS_KEY       R2 secret key
  R2_PUBLIC_URL              R2 public URL (optional)
  NPM_CONFIG_TOKEN           npm auth token
  CI                         CI mode detection

Platform Options:
  linux-x64, linux-arm64, macos-x64, macos-arm64, windows-x64

Examples:
  # Full publish with auto-detection
  publish-skill publish

  # Publish specific skill to beta tag
  publish-skill publish weather --tag beta --platforms linux-x64,macos-arm64

  # Quick npm-only publish
  publish-skill npm weather --access public

  # Validate everything without publishing
  publish-skill check weather --verbose

  # CI/CD usage
  CI=true publish-skill publish weather --tolerate-republish

  # Publish with OTP (2FA)
  publish-skill publish weather --otp 123456

Workflow:
  1. Build native executables for all platforms
  2. Upload to R2 (zero egress costs)
  3. Create distribution manifest
  4. Prepare npm package with install script
  5. Publish to npm registry
  6. Users get tiny npm package + fast R2 downloads
`;

// =============================================================================
// Main CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || ["-h", "--help", "help"].includes(args[0])) {
    console.log(HELP);
    process.exit(0);
  }

  if (args[0] === "--version" || args[0] === "-V") {
    console.log(CLI_VERSION);
    process.exit(0);
  }

  const command = args[0];
  const skillId = args[1] && !args[1].startsWith("-") ? args[1] : detectSkillId();

  if (!skillId) {
    console.error("Error: Could not detect skill ID. Specify it explicitly:");
    console.error("   publish-skill <command> <skill-id>");
    process.exit(1);
  }

  const config = parsePublishArgs(args);

  try {
    switch (command) {
      case "publish":
      case "full": {
        const publisher = new SkillPublisher({ skillId, ...config });
        const result = await publisher.publish();
        if (result.errors.length > 0 && !config.dryRun) {
          process.exit(1);
        }
        break;
      }

      case "publish:npm":
      case "npm": {
        // Skip R2 upload for quick npm-only publish
        config.r2Config = undefined;
        const publisher = new SkillPublisher({ skillId, ...config });
        const result = await publisher.publish();
        if (result.errors.length > 0 && !config.dryRun) {
          process.exit(1);
        }
        break;
      }

      case "publish:r2":
      case "r2": {
        // Only upload to R2, skip npm
        const tempConfig = { ...config, dryRun: true }; // Prevent npm publish
        const publisher = new SkillPublisher({ skillId, ...tempConfig });
        const result = await publisher.publish();

        if (!result.r2?.success) {
          console.error("R2 publish failed");
          process.exit(1);
        }
        break;
      }

      case "publish:check":
      case "check": {
        // Validate everything without publishing
        config.dryRun = true;
        const publisher = new SkillPublisher({ skillId, ...config });
        const result = await publisher.publish();

        if (result.errors.length > 0) {
          console.error("\nValidation failed with errors");
          process.exit(1);
        }
        console.log("\nValidation passed - ready to publish");
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        console.log(HELP);
        process.exit(1);
    }
  } catch (error: any) {
    console.error("Fatal error:", error.message);
    if (process.env.VERBOSE) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function detectSkillId(): string | null {
  try {
    // Try skill.json first
    const skillJsonPath = join(process.cwd(), "skill.json");
    if (existsSync(skillJsonPath)) {
      const skillJson = require(skillJsonPath);
      if (skillJson.id) return skillJson.id;
    }

    // Try package.json
    const packageJsonPath = join(process.cwd(), "package.json");
    if (existsSync(packageJsonPath)) {
      const packageJson = require(packageJsonPath);
      // Extract from scoped name: @skills/weather -> weather
      if (packageJson.name) {
        return packageJson.name.split("/").pop() || null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function parsePublishArgs(args: string[]): Partial<SkillPublishConfig> {
  const config: Partial<SkillPublishConfig> = {};

  // Parse flags
  for (let i = 2; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--access":
        config.access = args[++i] as "public" | "restricted";
        break;

      case "--tag":
        config.tag = args[++i];
        break;

      case "--version":
      case "-v":
        config.version = args[++i];
        break;

      case "--dry-run":
        config.dryRun = true;
        break;

      case "--tolerate-republish":
        config.tolerateRepublish = true;
        break;

      case "--otp":
        config.otp = args[++i];
        break;

      case "--registry":
        config.registry = args[++i];
        break;

      case "--platforms":
        config.platforms = args[++i]?.split(",");
        break;

      case "--no-compress":
        config.compress = false;
        break;

      case "--ci":
        // CI mode: no prompts, tolerate republish, no progress bars
        config.tolerateRepublish = true;
        process.env.CI = "true";
        break;

      case "--verbose":
        process.env.VERBOSE = "true";
        break;
    }
  }

  // Load R2 config from environment with validation
  if (process.env.R2_BUCKET) {
    const required = ["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      console.warn(`R2 configuration incomplete. Missing: ${missing.join(", ")}`);
      console.warn("Publishing to npm only. Set these env vars for R2 support.\n");
    } else {
      config.r2Config = {
        bucket: process.env.R2_BUCKET,
        endpoint:
          process.env.R2_ENDPOINT ||
          `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        region: process.env.R2_REGION || "auto",
        publicUrl: process.env.R2_PUBLIC_URL,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
      };
    }
  }

  return config;
}

// =============================================================================
// Run CLI
// =============================================================================

main().catch((error) => {
  console.error("Fatal error:", error.message);
  if (process.env.VERBOSE) {
    console.error(error.stack);
  }
  process.exit(1);
});
