#!/usr/bin/env bun
/**
 * Frozen Lockfile Protection
 * LOCKFILE.FROZEN - Prevent accidental lockfile modifications
 */

import { readFileSync, statSync } from "fs";
import { spawn } from "bun";
import { join } from "path";

// LOCKFILE.FROZEN - Frozen lockfile protection mechanisms
class LockfileProtector {
  private lockfilePath: string;
  private baselineHash: string | null = null;

  constructor() {
    this.lockfilePath = "bun.lock";
    this.loadBaseline();
  }

  private loadBaseline() {
    try {
      // Try to load baseline from .lockfile-baseline
      const baselinePath = ".lockfile-baseline";
      this.baselineHash = readFileSync(baselinePath, "utf-8").trim();
    } catch {
      // No baseline exists yet
      this.baselineHash = null;
    }
  }

  // Calculate SHA-256 hash of lockfile
  private async calculateHash(): Promise<string> {
    const content = readFileSync(this.lockfilePath, "utf-8");

    // Use Bun's crypto for hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Check if lockfile has been modified
  async checkIntegrity(): Promise<{ isValid: boolean; message: string }> {
    try {
      // Check if lockfile exists
      statSync(this.lockfilePath);

      const currentHash = await this.calculateHash();

      if (!this.baselineHash) {
        return {
          isValid: false,
          message: `LOCKFILE.FROZEN - No baseline hash found. Run 'bun run lockfile:baseline' to establish baseline.`
        };
      }

      if (currentHash === this.baselineHash) {
        return {
          isValid: true,
          message: `LOCKFILE.FROZEN - ✅ Lockfile integrity verified (${currentHash.slice(0, 8)}...)`
        };
      } else {
        return {
          isValid: false,
          message: `LOCKFILE.FROZEN - ❌ Lockfile modified! Expected: ${this.baselineHash.slice(0, 8)}..., Got: ${currentHash.slice(0, 8)}...`
        };
      }
    } catch (error) {
      return {
        isValid: false,
        message: `LOCKFILE.FROZEN - Error checking lockfile: ${error.message}`
      };
    }
  }

  // Establish baseline hash
  async createBaseline(): Promise<{ success: boolean; message: string }> {
    try {
      const hash = await this.calculateHash();

      // Write baseline to file
      await Bun.write(".lockfile-baseline", hash);

      return {
        success: true,
        message: `LOCKFILE.FROZEN - ✅ Baseline established: ${hash.slice(0, 8)}...`
      };
    } catch (error) {
      return {
        success: false,
        message: `LOCKFILE.FROZEN - Error creating baseline: ${error.message}`
      };
    }
  }

  // Check if working directory is clean (no staged lockfile changes)
  async checkGitStatus(): Promise<{ isClean: boolean; message: string }> {
    try {
      // Check if we're in a git repository first
      const gitCheck = spawn({
        cmd: ["git", "rev-parse", "--git-dir"],
        stdout: "pipe",
        stderr: "pipe"
      });

      const gitExitCode = await gitCheck.exited;
      if (gitExitCode !== 0) {
        return {
          isClean: true,
          message: "LOCKFILE.FROZEN - ⚠️ Not in a git repository, skipping git status check"
        };
      }

      const result = spawn({
        cmd: ["git", "status", "--porcelain", "bun.lock"],
        stdout: "pipe",
        stderr: "pipe"
      });

      const output = await new Response(result.stdout).text();
      const exitCode = await result.exited;

      if (exitCode !== 0) {
        return {
          isClean: false,
          message: "LOCKFILE.FROZEN - Error checking git status"
        };
      }

      if (output.trim()) {
        return {
          isClean: false,
          message: `LOCKFILE.FROZEN - ❌ Lockfile has uncommitted changes:\n${output}`
        };
      }

      return {
        isClean: true,
        message: "LOCKFILE.FROZEN - ✅ No uncommitted lockfile changes"
      };
    } catch (error) {
      return {
        isClean: false,
        message: `LOCKFILE.FROZEN - Error checking git status: ${error.message}`
      };
    }
  }

  // Verify lockfile matches current package.json
  async verifyConsistency(): Promise<{ isConsistent: boolean; message: string }> {
    try {
      console.log("LOCKFILE.FROZEN - Verifying lockfile consistency...");

      // Run bun install --dry-run to check consistency
      const result = spawn({
        cmd: ["bun", "install", "--dry-run"],
        stdout: "pipe",
        stderr: "pipe"
      });

      const exitCode = await result.exited;

      if (exitCode === 0) {
        return {
          isConsistent: true,
          message: "LOCKFILE.FROZEN - ✅ Lockfile is consistent with package.json"
        };
      } else {
        const stderr = new Response(result.stderr).textSync();
        return {
          isConsistent: false,
          message: `LOCKFILE.FROZEN - ❌ Lockfile inconsistency detected:\n${stderr}`
        };
      }
    } catch (error) {
      return {
        isConsistent: false,
        message: `LOCKFILE.FROZEN - Error verifying consistency: ${error.message}`
      };
    }
  }

  // Comprehensive lockfile audit
  async audit(): Promise<{ passed: boolean; results: any[] }> {
    console.log("🔍 Performing comprehensive lockfile audit...\n");

    const results = [];

    // 1. Check integrity
    const integrity = await this.checkIntegrity();
    results.push({ check: "Integrity", ...integrity });
    console.log(integrity.message);

    // 2. Check git status
    const gitStatus = await this.checkGitStatus();
    results.push({ check: "Git Status", ...gitStatus });
    console.log(gitStatus.message);

    // 3. Verify consistency
    const consistency = await this.verifyConsistency();
    results.push({ check: "Consistency", ...consistency });
    console.log(consistency.message);

    const passed = results.every(r => r.isValid !== false && r.isClean !== false && r.isConsistent !== false);

    console.log(`\n${passed ? '✅' : '❌'} Lockfile audit ${passed ? 'PASSED' : 'FAILED'}`);

    return { passed, results };
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'audit';

  const protector = new LockfileProtector();

  try {
    switch (command) {
      case 'check':
        const result = await protector.checkIntegrity();
        console.log(result.message);
        process.exit(result.isValid ? 0 : 1);
        break;

      case 'baseline':
        const baseline = await protector.createBaseline();
        console.log(baseline.message);
        process.exit(baseline.success ? 0 : 1);
        break;

      case 'git-check':
        const gitResult = await protector.checkGitStatus();
        console.log(gitResult.message);
        process.exit(gitResult.isClean ? 0 : 1);
        break;

      case 'verify':
        const verifyResult = await protector.verifyConsistency();
        console.log(verifyResult.message);
        process.exit(verifyResult.isConsistent ? 0 : 1);
        break;

      case 'audit':
        const auditResult = await protector.audit();
        process.exit(auditResult.passed ? 0 : 1);
        break;

      default:
        console.log(`
LOCKFILE.FROZEN - Frozen Lockfile Protection v1.3.5

Usage:
  bun run scripts/lockfile-check.ts <command>

Commands:
  check       Check lockfile integrity against baseline
  baseline    Establish new baseline hash
  git-check   Check for uncommitted lockfile changes
  verify      Verify lockfile consistency with package.json
  audit       Run comprehensive lockfile audit (default)

Examples:
  bun run lockfile:check                    # Full audit
  bun run lockfile:check baseline          # Set baseline
  bun run lockfile:check check             # Integrity check only

CI Usage:
  # In CI, ensure lockfile is frozen
  bun run lockfile:check check && bun run lockfile:check verify
`);
        break;
    }
  } catch (error) {
    console.error('LOCKFILE.FROZEN - Error:', error);
    process.exit(1);
  }
}

main();
