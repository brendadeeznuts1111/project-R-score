#!/usr/bin/env bun
// [1.0.0.0] Version CLI - Bun Native
// Provides version information and management commands
// Usage: bun run src/cli/version-cli.ts [command] [options]

import {
  VersionManager,
  VersionParser,
  VersionComparator,
  BuildVersionGenerator,
} from "../version";

/**
 * [1.1.0.0] Display version information
 */
function showVersion(): void {
  const version = VersionManager.getFullVersion();
  const versionObj = VersionParser.parse(version);

  console.log("📦 Version Information");
  console.log("======================\n");
  console.log(`Full Version:    ${version}`);
  console.log(`Major:           ${versionObj.major}`);
  console.log(`Minor:           ${versionObj.minor}`);
  console.log(`Patch:           ${versionObj.patch}`);
  if (versionObj.prerelease) {
    console.log(`Prerelease:      ${versionObj.prerelease}`);
  }
  if (versionObj.buildMetadata) {
    console.log(`Build Metadata:  ${versionObj.buildMetadata}`);
  }
  console.log(`Timestamp:       ${new Date().toISOString()}`);
}

/**
 * [1.2.0.0] Compare two versions
 */
function compareVersions(v1: string, v2: string): void {
  try {
    const version1 = VersionParser.parse(v1);
    const version2 = VersionParser.parse(v2);
    const comparison = VersionComparator.compare(version1, version2);

    console.log("📊 Version Comparison");
    console.log("====================\n");
    console.log(`Version 1: ${v1}`);
    console.log(`Version 2: ${v2}`);
    console.log("");

    if (comparison > 0) {
      console.log(`✅ ${v1} > ${v2}`);
    } else if (comparison < 0) {
      console.log(`✅ ${v1} < ${v2}`);
    } else {
      console.log(`✅ ${v1} == ${v2}`);
    }
  } catch (error) {
    console.error("❌ Invalid version format:", error);
    process.exit(1);
  }
}

/**
 * [1.3.0.0] Generate version constant
 */
function generateConstant(): void {
  const constant = BuildVersionGenerator.generateConstant();
  console.log(constant);
}

/**
 * [1.4.0.0] Generate version JSON
 */
function generateJSON(): void {
  const json = BuildVersionGenerator.generateJSON();
  console.log(json);
}

/**
 * [1.5.0.0] Show help
 */
function showHelp(): void {
  console.log(`
📦 Version CLI - Bun Native

Usage: bun run src/cli/version-cli.ts [command] [options]

Commands:
  show              Show current version information
  compare <v1> <v2> Compare two versions
  constant          Generate version constant (TypeScript)
  json              Generate version JSON
  help              Show this help message

Examples:
  bun run src/cli/version-cli.ts show
  bun run src/cli/version-cli.ts compare 1.0.0 2.0.0
  bun run src/cli/version-cli.ts constant
  bun run src/cli/version-cli.ts json

Environment Variables:
  BUILD_METADATA    Custom build metadata (default: git commit hash)
  `);
}

/**
 * [1.6.0.0] Main CLI handler
 */
function main(): void {
  const args = Bun.argv.slice(2);
  const command = args[0] || "show";

  switch (command) {
    case "show":
      showVersion();
      break;
    case "compare":
      if (args.length < 3) {
        console.error("❌ compare requires two version arguments");
        process.exit(1);
      }
      compareVersions(args[1], args[2]);
      break;
    case "constant":
      generateConstant();
      break;
    case "json":
      generateJSON();
      break;
    case "help":
    case "-h":
    case "--help":
      showHelp();
      break;
    default:
      console.error(`❌ Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main();

