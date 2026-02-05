#!/usr/bin/env bun
/**
 * Version Bump CLI Tool - Tier-1380 Certified
 * Automates semantic versioning for BUN_CONSTANTS_VERSION
 * 
 * Usage:
 *   bun version-bump.ts --type patch    # 1.0.0 -> 1.0.1
 *   bun version-bump.ts --type minor    # 1.0.0 -> 1.1.0
 *   bun version-bump.ts --type major    # 1.0.0 -> 2.0.0
 *   bun version-bump.ts --version 1.2.3 # Set specific version
 *   bun version-bump.ts --current       # Show current version
 *   bun version-bump.ts --validate      # Validate integrity
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const REGISTRY_FILE = join(import.meta.dir, "BUN_CONSTANTS_VERSION.json");
const EXTRACT_SCRIPT = join(import.meta.dir, "scanner", "scripts", "extract-bun-constants.ts");

interface VersionRegistry {
  version: string;
  schemaVersion: string;
  bunVersion: string;
  mcpEnabled: boolean;
  tier1380: {
    compliant: boolean;
    certified: string;
    auditLevel: string;
    col89Max: number;
    col93Balanced: boolean;
  };
  projects: Record<string, {
    root: string;
    constants: number;
    lastScan: string;
  }>;
  constants: any[];
  metadata: {
    totalConstants: number;
    extractionTime: string;
    platform: string;
    nodeVersion: string;
    cliVersion: string;
  };
  changelog: Record<string, string>;
}

function parseVersion(version: string): [number, number, number] {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid version format: ${version}`);
  }
  return parts as [number, number, number];
}

function formatVersion([major, minor, patch]: [number, number, number]): string {
  return `${major}.${minor}.${patch}`;
}

function bumpVersion(current: string, type: "patch" | "minor" | "major"): string {
  const [major, minor, patch] = parseVersion(current);
  switch (type) {
    case "patch":
      return formatVersion([major, minor, patch + 1]);
    case "minor":
      return formatVersion([major, minor + 1, 0]);
    case "major":
      return formatVersion([major + 1, 0, 0]);
  }
}

function updateRegistry(registry: VersionRegistry, newVersion: string, reason: string): void {
  registry.version = newVersion;
  registry.metadata.extractionTime = new Date().toISOString();
  registry.changelog[newVersion] = reason;
  
  writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));
}

function updateExtractScript(newVersion: string): void {
  const content = readFileSync(EXTRACT_SCRIPT, "utf-8");
  // Match both single and double quotes, preserve the quote style used
  const updated = content.replace(
    /export const BUN_CONSTANTS_VERSION = (['"])([^'"]+)\1;/,
    (match, quote) => `export const BUN_CONSTANTS_VERSION = ${quote}${newVersion}${quote};`
  );
  writeFileSync(EXTRACT_SCRIPT, updated);
}

function validateIntegrity(): boolean {
  try {
    const registry: VersionRegistry = JSON.parse(readFileSync(REGISTRY_FILE, "utf-8"));
    const extractContent = readFileSync(EXTRACT_SCRIPT, "utf-8");
    // Match both single and double quotes
    const match = extractContent.match(/export const BUN_CONSTANTS_VERSION = ['"]([^'"]+)['"];/);
    
    if (!match) {
      console.error("❌ BUN_CONSTANTS_VERSION not found in extract script");
      return false;
    }
    
    const scriptVersion = match[1];
    if (scriptVersion !== registry.version) {
      console.error(`❌ Version mismatch: registry=${registry.version}, script=${scriptVersion}`);
      return false;
    }
    
    console.log(`✅ Integrity validated: v${registry.version}`);
    console.log(`✅ Tier-1380 Certified: ${registry.tier1380.compliant}`);
    console.log(`✅ MCP Enabled: ${registry.mcpEnabled}`);
    console.log(`✅ Schema Version: ${registry.schemaVersion}`);
    return true;
  } catch (error) {
    console.error(`❌ Validation failed: ${error.message}`);
    return false;
  }
}

function showCurrentVersion(): void {
  try {
    const registry: VersionRegistry = JSON.parse(readFileSync(REGISTRY_FILE, "utf-8"));
    console.log(`Current Version: ${registry.version}`);
    console.log(`Schema: ${registry.schemaVersion}`);
    console.log(`Bun: ${registry.bunVersion}`);
    console.log(`Tier-1380: ${registry.tier1380.compliant ? "✅ Certified" : "❌ Non-compliant"}`);
    console.log(`Last Updated: ${registry.metadata.extractionTime}`);
  } catch (error) {
    console.error(`❌ Failed to read registry: ${error.message}`);
    process.exit(1);
  }
}

function main(): void {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🔧 Version Bump CLI - Tier-1380 Certified

Usage:
  bun version-bump.ts --type <patch|minor|major>
  bun version-bump.ts --version <x.y.z>
  bun version-bump.ts --current
  bun version-bump.ts --validate

Examples:
  bun version-bump.ts --type patch     # 1.0.0 -> 1.0.1
  bun version-bump.ts --type minor     # 1.0.0 -> 1.1.0
  bun version-bump.ts --version 2.0.0  # Set specific version
  bun version-bump.ts --current        # Show current version
  bun version-bump.ts --validate       # Validate integrity
    `);
    return;
  }
  
  const flag = args[0];
  const value = args[1];
  
  try {
    switch (flag) {
      case "--current":
        showCurrentVersion();
        break;
        
      case "--validate":
        validateIntegrity();
        break;
        
      case "--type": {
        if (!value || !["patch", "minor", "major"].includes(value)) {
          console.error("❌ Invalid type. Use: patch, minor, or major");
          process.exit(1);
        }
        
        const registry: VersionRegistry = JSON.parse(readFileSync(REGISTRY_FILE, "utf-8"));
        const newVersion = bumpVersion(registry.version, value as "patch" | "minor" | "major");
        
        updateRegistry(registry, newVersion, `Automated ${value} bump`);
        updateExtractScript(newVersion);
        
        console.log(`🚀 Version bumped: ${registry.version} -> ${newVersion}`);
        console.log(`📝 Registry updated: ${REGISTRY_FILE}`);
        console.log(`📝 Script updated: ${EXTRACT_SCRIPT}`);
        console.log(`🏷️  Tag suggestion: git tag -a v${newVersion} -m "Tier-1380 Version ${newVersion}"`);
        break;
      }
      
      case "--version": {
        if (!value || !/^\d+\.\d+\.\d+$/.test(value)) {
          console.error("❌ Invalid version format. Use: x.y.z");
          process.exit(1);
        }
        
        const registry: VersionRegistry = JSON.parse(readFileSync(REGISTRY_FILE, "utf-8"));
        
        updateRegistry(registry, value, `Manual version set to ${value}`);
        updateExtractScript(value);
        
        console.log(`🚀 Version set: ${registry.version} -> ${value}`);
        console.log(`📝 Registry updated: ${REGISTRY_FILE}`);
        console.log(`📝 Script updated: ${EXTRACT_SCRIPT}`);
        break;
      }
      
      default:
        console.error(`❌ Unknown flag: ${flag}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Operation failed: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.path === Bun.main) {
  main();
}
