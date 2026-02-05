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
import { logger } from "../lib/utils/logger.ts";
import { safeReadFile, safeWriteFile } from "../lib/utils/safe-file-operations.ts";

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

async function updateRegistry(registry: VersionRegistry, newVersion: string, reason: string): Promise<void> {
  registry.version = newVersion;
  registry.metadata.extractionTime = new Date().toISOString();
  registry.changelog[newVersion] = reason;
  
  const result = await safeWriteFile(REGISTRY_FILE, JSON.stringify(registry, null, 2), { backup: true });
  if (!result.success) {
    logger.error(`❌ Failed to write registry file: ${result.error}`);
    throw new Error(`Failed to write registry file: ${result.error}`);
  }
}

async function updateExtractScript(newVersion: string): Promise<void> {
  const result = await safeReadFile(EXTRACT_SCRIPT);
  if (!result.success) {
    logger.error(`❌ Failed to read extract script: ${result.error}`);
    throw new Error(`Failed to read extract script: ${result.error}`);
  }

  const content = result.data!;
  // Match both single and double quotes, preserve the quote style used
  const updated = content.replace(
    /export const BUN_CONSTANTS_VERSION = (['"])([^'"]+)\1;/,
    (match, quote) => `export const BUN_CONSTANTS_VERSION = ${quote}${newVersion}${quote};`
  );

  const writeResult = await safeWriteFile(EXTRACT_SCRIPT, updated, { backup: true });
  if (!writeResult.success) {
    logger.error(`❌ Failed to write extract script: ${writeResult.error}`);
    throw new Error(`Failed to write extract script: ${writeResult.error}`);
  }
}

async function validateIntegrity(): Promise<boolean> {
  try {
    const registryResult = await safeReadFile(REGISTRY_FILE);
    if (!registryResult.success) {
      logger.error(`❌ Failed to read registry file: ${registryResult.error}`);
      return false;
    }

    const extractResult = await safeReadFile(EXTRACT_SCRIPT);
    if (!extractResult.success) {
      logger.error(`❌ Failed to read extract script: ${extractResult.error}`);
      return false;
    }

    const registry: VersionRegistry = JSON.parse(registryResult.data!);
    const extractContent = extractResult.data!;
    
    // Match both single and double quotes
    const match = extractContent.match(/export const BUN_CONSTANTS_VERSION = ['"]([^'"]+)['"];/);
    
    if (!match) {
      logger.error("❌ BUN_CONSTANTS_VERSION not found in extract script");
      return false;
    }
    
    const scriptVersion = match[1];
    if (scriptVersion !== registry.version) {
      logger.error(`❌ Version mismatch: registry=${registry.version}, script=${scriptVersion}`);
      return false;
    }
    
    logger.info(`✅ Integrity validated: v${registry.version}`);
    logger.info(`✅ Tier-1380 Certified: ${registry.tier1380.compliant}`);
    logger.info(`✅ MCP Enabled: ${registry.mcpEnabled}`);
    logger.info(`✅ Schema Version: ${registry.schemaVersion}`);
    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error(`❌ Validation failed: ${errorMessage}`);
    return false;
  }
}

async function showCurrentVersion(): Promise<void> {
  try {
    const result = await safeReadFile(REGISTRY_FILE);
    if (!result.success) {
      logger.error(`❌ Failed to read registry: ${result.error}`);
      process.exit(1);
    }

    const registry: VersionRegistry = JSON.parse(result.data!);
    logger.info(`Current Version: ${registry.version}`);
    logger.info(`Schema: ${registry.schemaVersion}`);
    logger.info(`Bun: ${registry.bunVersion}`);
    logger.info(`Tier-1380: ${registry.tier1380.compliant ? "✅ Certified" : "❌ Non-compliant"}`);
    logger.info(`Last Updated: ${registry.metadata.extractionTime}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error(`❌ Failed to read registry: ${errorMessage}`);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    logger.info(`
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
        await showCurrentVersion();
        break;
        
      case "--validate":
        const isValid = await validateIntegrity();
        process.exit(isValid ? 0 : 1);
        break;
        
      case "--type": {
        if (!value || !["patch", "minor", "major"].includes(value)) {
          logger.error("❌ Invalid type. Use: patch, minor, or major");
          process.exit(1);
        }
        
        const registryResult = await safeReadFile(REGISTRY_FILE);
        if (!registryResult.success) {
          logger.error(`❌ Failed to read registry: ${registryResult.error}`);
          process.exit(1);
        }
        
        const registry: VersionRegistry = JSON.parse(registryResult.data!);
        const newVersion = bumpVersion(registry.version, value as "patch" | "minor" | "major");
        
        await updateRegistry(registry, newVersion, `Automated ${value} bump`);
        await updateExtractScript(newVersion);
        
        logger.info(`🚀 Version bumped: ${registry.version} -> ${newVersion}`);
        logger.info(`📝 Registry updated: ${REGISTRY_FILE}`);
        logger.info(`📝 Script updated: ${EXTRACT_SCRIPT}`);
        logger.info(`🏷️  Tag suggestion: git tag -a v${newVersion} -m "Tier-1380 Version ${newVersion}"`);
        break;
      }
      
      case "--version": {
        if (!value || !/^\d+\.\d+\.\d+$/.test(value)) {
          logger.error("❌ Invalid version format. Use: x.y.z");
          process.exit(1);
        }
        
        const registryResult = await safeReadFile(REGISTRY_FILE);
        if (!registryResult.success) {
          logger.error(`❌ Failed to read registry: ${registryResult.error}`);
          process.exit(1);
        }
        
        const registry: VersionRegistry = JSON.parse(registryResult.data!);
        
        await updateRegistry(registry, value, `Manual version set to ${value}`);
        await updateExtractScript(value);
        
        logger.info(`🚀 Version set: ${registry.version} -> ${value}`);
        logger.info(`📝 Registry updated: ${REGISTRY_FILE}`);
        logger.info(`📝 Script updated: ${EXTRACT_SCRIPT}`);
        break;
      }
      
      default:
        logger.error(`❌ Unknown flag: ${flag}`);
        process.exit(1);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error(`❌ Operation failed: ${errorMessage}`);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  logger.error(`❌ Fatal error: ${errorMessage}`);
  process.exit(1);
});
