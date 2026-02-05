#!/usr/bin/env bun
/**
 * FactoryWager Untracked Files Cleanup
 * Removes organized files from original locations after archival
 */

import { existsSync, unlinkSync, statSync } from "fs";
import { execSync } from "child_process";

class UntrackedCleanup {
  private rootDir: string;
  private cleanupLog: Array<{
    file: string;
    status: string;
    size?: number;
    error?: string;
  }>;

  constructor() {
    this.rootDir = process.cwd();
    this.cleanupLog = [];
  }

  async cleanup(): Promise<void> {
    console.log("🧹 FactoryWager Untracked Files Cleanup");
    console.log("=" .repeat(45));

    // Get untracked files
    const untrackedFiles = this.getUntrackedFiles();
    console.log(`📊 Found ${untrackedFiles.length} untracked files\n`);

    // Files that should be removed (already organized/archived)
    const filesToRemove = [
      // Scripts that were organized
      ".factory-wager/deploy-bunx.ts",
      ".factory-wager/deploy-r2-s3.ts",
      ".factory-wager/fw-bunx-dns-setup.ts",
      ".factory-wager/fw-changelog.ts",
      ".factory-wager/fw-cloudflare-dns-setup.ts",
      ".factory-wager/fw-complete-deployment.ts",
      ".factory-wager/fw-deployment-status.ts",
      ".factory-wager/fw-dns-setup-guide.ts",
      ".factory-wager/fw-network-triage.ts",
      ".factory-wager/fw-nexus-status.ts",
      ".factory-wager/fw-release.ts",
      ".factory-wager/fw-validate.ts",
      ".factory-wager/fw-vault-health-fix.ts",
      ".factory-wager/fw-wrangler-setup.ts",
      ".factory-wager/scripts/archive-backup.ts",
      ".factory-wager/scripts/organize-and-archive.ts",

      // Config files that were organized
      ".factory-wager/wrangler.toml",

      // Documentation that was archived
      ".factory-wager/CPU.107056869962.8900.md",
      ".factory-wager/Heap.107056952005.8900.md",

      // Test files that were cleaned
      ".factory-wager/test-config.yaml",
      ".factory-wager/test-fixed.injected.yaml",
      ".factory-wager/test-fixed.yaml",
      ".factory-wager/test-punycode.js",

      // Temporary files that were cleaned
      ".factory-wager/final-status.ts",
      ".factory-wager/health.json",
      ".factory-wager/quick-status.ts",
      ".factory-wager/vault-metadata.json"
    ];

    let removed = 0;
    let errors = 0;

    for (const file of filesToRemove) {
      if (untrackedFiles.includes(file)) {
        try {
          if (existsSync(file)) {
            const stats = statSync(file);

            if (stats.isDirectory()) {
              // Remove directory recursively
              execSync(`rm -rf "${file}"`, { encoding: 'utf8' });
              console.log(`🗑️ Removed directory: ${file}`);
            } else {
              // Remove file
              unlinkSync(file);
              console.log(`🗑️ Removed file: ${file}`);
            }

            removed++;
            this.cleanupLog.push({ file, status: "removed", size: stats.size });
          }
        } catch (error) {
          console.log(`❌ Failed to remove ${file}: ${(error as Error).message}`);
          errors++;
          this.cleanupLog.push({ file, status: "error", error: (error as Error).message });
        }
      }
    }

    // Also remove empty directories
    await this.removeEmptyDirectories();

    // Save cleanup log
    this.saveCleanupLog(removed, errors);

    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Removed: ${removed} files/directories`);
    console.log(`   Errors: ${errors}`);

    // Show final status
    console.log("\n📊 Final git status:");
    try {
      const finalStatus = execSync('git status --porcelain', { encoding: 'utf8' });
      const lines = finalStatus.split('\n').filter(line => line.trim());
      console.log(`   Remaining untracked: ${lines.filter(l => l.startsWith('??')).length}`);
      console.log(`   Modified files: ${lines.filter(l => l.startsWith(' M')).length}`);
    } catch (error) {
      console.log("   Could not determine final status");
    }
  }

  private getUntrackedFiles(): string[] {
    try {
      const output = execSync('git status --porcelain', { encoding: 'utf8' });
      return output
        .split('\n')
        .filter(line => line.startsWith('??'))
        .map(line => line.substring(3).trim())
        .filter(file => file.length > 0);
    } catch (error) {
      console.error('Failed to get git status:', error);
      return [];
    }
  }

  private async removeEmptyDirectories(): Promise<void> {
    const directories = [
      ".factory-wager/scripts",
      ".factory-wager/cleanup",
      ".factory-wager/organized/scripts-tools"
    ];

    for (const dir of directories) {
      try {
        if (existsSync(dir)) {
          const files = execSync(`find "${dir}" -type f`, { encoding: 'utf8' }).trim();
          if (!files) {
            execSync(`rm -rf "${dir}"`, { encoding: 'utf8' });
            console.log(`🗑️ Removed empty directory: ${dir}`);
          }
        }
      } catch (error) {
        // Directory might not exist or can't be removed
      }
    }
  }

  private saveCleanupLog(removed: number, errors: number): void {
    const log = {
      timestamp: new Date().toISOString(),
      removed,
      errors,
      operations: this.cleanupLog
    };

    try {
      const logPath = ".factory-wager/cleanup-log.json";
      require('fs').writeFileSync(logPath, JSON.stringify(log, null, 2));
      console.log(`📄 Cleanup log saved: ${logPath}`);
    } catch (error) {
      console.log("⚠️ Could not save cleanup log");
    }
  }
}

// CLI interface
async function main() {
  const cleanup = new UntrackedCleanup();
  await cleanup.cleanup();
}

if (import.meta.main) {
  main().catch(error => {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  });
}

export { UntrackedCleanup };
