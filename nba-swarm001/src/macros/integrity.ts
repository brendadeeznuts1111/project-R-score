/**
 * Integrity macros - Generate cryptographic hashes at build time
 */

import { computeHash } from "../utils/integrity.js";
import type { HashAlgorithm } from "../utils/integrity.js";

/**
 * Compute hash of a file at build time
 */
export async function hashFileMacro(
  filePath: string,
  algorithm: HashAlgorithm = "blake3"
): Promise<string> {
  try {
    const file = Bun.file(filePath);
    if (await file.exists()) {
      const content = await file.text();
      return computeHash(content, algorithm);
    }
  } catch {
    // Return empty hash if file doesn't exist
  }

  return "";
}

/**
 * Generate integrity manifest hash at build time
 */
export async function getIntegrityManifestHashMacro(): Promise<string> {
  try {
    const manifestFile = Bun.file(".governance-integrity.json");
    if (await manifestFile.exists()) {
      const content = await manifestFile.text();
      return computeHash(content, "blake3");
    }
  } catch {
    // Ignore errors
  }

  return "";
}

/**
 * Compute hash of governance rules at build time
 */
export async function hashGovernanceRulesMacro(): Promise<string> {
  try {
    const rulesFile = Bun.file(".governance.json");
    if (await rulesFile.exists()) {
      const content = await rulesFile.text();
      return computeHash(content, "blake3");
    }
  } catch {
    // Ignore errors
  }

  return "";
}

