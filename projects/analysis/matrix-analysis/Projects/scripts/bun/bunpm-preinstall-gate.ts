/**
 * Pre-install Gate for bunpm add
 * Scans packages before download to block supply chain issues
 */

import { EnterpriseScanner } from "./enterprise-scanner.ts";
import * as path from "path";

/**
 * Hook into bunpm add to scan packages before installation
 */
export async function preInstallGate(
  packageName: string,
  version: string,
  options?: {
    forceLicense?: boolean;
    scannerConfig?: any;
  }
): Promise<{ allowed: boolean; reason?: string; requiresForce?: boolean }> {
  const scanner = new EnterpriseScanner({
    mode: "enforce",
    format: "github",
    cacheDir: ".bunpm/scan-cache",
    ...options?.scannerConfig
  });

  await scanner.initialize();

  const scanResult = await scanner.scanPackage(packageName, version);

  // Block if supply chain issue
  if (scanResult.blocked) {
    console.error(`\n❌ BLOCKED: ${packageName}@${version}`);
    console.error(`Reason: ${scanResult.reason}`);
    if (scanResult.advisoryUrl) {
      console.error(`Security Advisory: ${scanResult.advisoryUrl}`);
    }
    return {
      allowed: false,
      reason: scanResult.reason,
      requiresForce: false
    };
  }

  // Require --force-license flag if license not approved
  if (scanResult.requiresForce && !options?.forceLicense) {
    console.warn(`\n⚠️  LICENSE: ${packageName}@${version}`);
    console.warn(`Reason: ${scanResult.reason}`);
    console.warn(`Use --force-license to proceed (audited)`);
    return {
      allowed: false,
      reason: scanResult.reason,
      requiresForce: true
    };
  }

  return { allowed: true };
}

/**
 * Integration point for bunpm
 * This would be called from bunpm's package resolution logic
 */
export async function checkPackageBeforeInstall(
  packageName: string,
  version: string,
  flags: { forceLicense?: boolean }
): Promise<void> {
  const result = await preInstallGate(packageName, version, {
    forceLicense: flags.forceLicense
  });

  if (!result.allowed) {
    if (result.requiresForce) {
      throw new Error(`License not approved. Use --force-license to proceed.`);
    } else {
      throw new Error(`Package blocked: ${result.reason}`);
    }
  }
}
