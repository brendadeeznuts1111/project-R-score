/**
 * Version Manager CLI
 * Manages semantic versioning for releases and builds
 */

import {
  parseVersion,
  formatVersion,
  compareVersions,
  incrementVersion,
  createPrerelease,
  addMetadata,
  satisfiesRange,
  isValidVersion,
  getCurrentVersion,
  type SemanticVersion,
} from "../utils/version";

/**
 * Version management operations
 */
export interface VersionCommand {
  action:
    | "current"
    | "parse"
    | "format"
    | "compare"
    | "increment"
    | "prerelease"
    | "metadata"
    | "validate"
    | "satisfies";
  version?: string;
  type?: "major" | "minor" | "patch";
  prerelease?: string;
  metadata?: string;
  range?: string;
  other?: string;
}

/**
 * Parses CLI arguments into a version command
 */
export function parseVersionCommand(args: string[]): VersionCommand {
  const [action, ...params] = args;

  return {
    action: action as any,
    version: params[0],
    type: params[1] as any,
    prerelease: params[2],
    metadata: params[3],
    range: params[1],
    other: params[1],
  };
}

/**
 * Executes a version management command
 */
export function executeVersionCommand(command: VersionCommand): string {
  try {
    switch (command.action) {
      case "current":
        return getCurrentVersion();

      case "parse": {
        if (!command.version) {
          throw new Error("Version string required for parse command");
        }
        const parsed = parseVersion(command.version);
        return formatVersionInfo(parsed);
      }

      case "format": {
        if (!command.version) {
          throw new Error("Version string required for format command");
        }
        const parsed = parseVersion(command.version);
        return formatVersion(parsed);
      }

      case "compare": {
        if (!command.version || !command.other) {
          throw new Error("Two version strings required for compare command");
        }
        const result = compareVersions(command.version, command.other);
        const op =
          result < 0 ? "<" : result > 0 ? ">" : "=";
        return `${command.version} ${op} ${command.other}`;
      }

      case "increment": {
        if (!command.version || !command.type) {
          throw new Error(
            "Version string and type (major|minor|patch) required"
          );
        }
        if (!["major", "minor", "patch"].includes(command.type)) {
          throw new Error("Type must be major, minor, or patch");
        }
        return incrementVersion(command.version, command.type);
      }

      case "prerelease": {
        if (!command.version || !command.prerelease) {
          throw new Error(
            "Version string and prerelease identifier required"
          );
        }
        return createPrerelease(command.version, command.prerelease);
      }

      case "metadata": {
        if (!command.version || !command.metadata) {
          throw new Error("Version string and metadata required");
        }
        return addMetadata(command.version, command.metadata);
      }

      case "validate": {
        if (!command.version) {
          throw new Error("Version string required for validate command");
        }
        const valid = isValidVersion(command.version);
        return valid ? "Valid" : "Invalid";
      }

      case "satisfies": {
        if (!command.version || !command.range) {
          throw new Error(
            "Version string and range specification required"
          );
        }
        const satisfies = satisfiesRange(command.version, command.range);
        return satisfies
          ? `${command.version} satisfies ${command.range}`
          : `${command.version} does not satisfy ${command.range}`;
      }

      default:
        throw new Error(`Unknown action: ${command.action}`);
    }
  } catch (error) {
    throw new Error(
      `Version command error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Formats version information for display
 */
function formatVersionInfo(version: SemanticVersion): string {
  const lines = [
    `Version: ${formatVersion(version)}`,
    `Major: ${version.major}`,
    `Minor: ${version.minor}`,
    `Patch: ${version.patch}`,
  ];

  if (version.prerelease) {
    lines.push(`Pre-release: ${version.prerelease}`);
  }

  if (version.metadata) {
    lines.push(`Metadata: ${version.metadata}`);
  }

  return lines.join("\n");
}

/**
 * Displays help text for version commands
 */
export function getVersionHelp(): string {
  return `
Version Management Commands:

  current                   Show current project version
  parse <version>          Parse a semantic version string
  format <version>         Format a semantic version
  compare <v1> <v2>        Compare two versions
  increment <version> <type>   Increment version (type: major|minor|patch)
  prerelease <version> <id>    Create pre-release version
  metadata <version> <meta>    Add build metadata
  validate <version>       Validate semantic version format
  satisfies <version> <range>  Check if version satisfies range

Examples:
  bun version current
  bun version parse 1.2.3-alpha.1+build.123
  bun version compare 1.0.0 2.0.0
  bun version increment 1.2.3 patch
  bun version prerelease 1.2.3 beta.1
  bun version satisfies 1.2.3 ^1.0.0
`;
}

/**
 * Generates a changelog entry for a version
 */
export function generateChangelogEntry(
  version: string,
  changes: {
    added?: string[];
    changed?: string[];
    deprecated?: string[];
    removed?: string[];
    fixed?: string[];
    security?: string[];
  }
): string {
  const date = new Date().toISOString().split("T")[0];
  let entry = `## [${version}] - ${date}`;

  const sections: [string, string[]][] = [
    ["### 📚 Added", changes.added ?? []],
    ["### 🔧 Changed", changes.changed ?? []],
    ["### ⚠️ Deprecated", changes.deprecated ?? []],
    ["### 🗑️ Removed", changes.removed ?? []],
    ["### 🐛 Fixed", changes.fixed ?? []],
    ["### 🛡️ Security", changes.security ?? []],
  ];

  for (const [title, items] of sections) {
    if (items.length > 0) {
      entry += `\n\n${title}\n`;
      for (const item of items) {
        entry += `- ${item}\n`;
      }
    }
  }

  return entry;
}
