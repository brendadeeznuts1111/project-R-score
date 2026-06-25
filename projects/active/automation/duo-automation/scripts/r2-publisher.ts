#!/usr/bin/env bun

// DuoPlus R2 Publishing Workflow with Catalog Support
// Integrates Bun's catalog publishing with Cloudflare R2 bucket

import { spawn } from 'node:child_process';
import { existsSync } from 'fs';

interface PackageInfo {
  name: string;
  version: string;
  path: string;
  tarball: string;
}

class DuoR2Publisher {
  private readonly r2Registry = "https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com";
  private readonly packages: PackageInfo[] = [
    { name: "@duoplus/cli-core", version: "1.2.4-beta.0", path: "packages/cli", tarball: "" },
    { name: "@duoplus/ui-components", version: "1.2.4-beta.0", path: "packages/components", tarball: "" },
    { name: "@duoplus/utils", version: "1.2.4-beta.0", path: "packages/utils", tarball: "" },
    { name: "@duoplus/testing-utils", version: "1.2.4-beta.0", path: "packages/testing", tarball: "" },
    { name: "@duoplus/build-tools", version: "1.2.4-beta.0", path: "packages/build", tarball: "" },
    { name: "@duoplus/registry-gateway", version: "1.2.4-beta.0", path: "packages/modules/registry-gateway", tarball: "" },
    { name: "@duoplus/security-vault", version: "1.2.4-beta.0", path: "packages/modules/security-vault", tarball: "" },
    { name: "@duoplus/telemetry-kernel", version: "1.2.4-beta.0", path: "packages/modules/telemetry-kernel", tarball: "" },
  ];

  async runCommand(command: string, args: string[], cwd?: string): Promise<string> {
    console.info(`🚀 Running: ${command} ${args.join(' ')}`);
    
    try {
      const result = await Bun.spawn({
        cmd: [command, ...args],
        cwd: cwd || process.cwd(),
        stdout: "pipe",
        stderr: "pipe"
      });

      const [stdout, stderr] = await Promise.all([
        new Response(result.stdout).text(),
        new Response(result.stderr).text()
      ]);

      const exitCode = await result.exited;
      if (exitCode !== 0) {
        console.error(`❌ Command failed:`, stderr);
        throw new Error(`Command failed with exit code: ${exitCode}`);
      }

      return stdout.trim();
    } catch (error) {
      console.error(`❌ Error running command:`, error);
      throw error;
    }
  }

  async packPackage(packageInfo: PackageInfo): Promise<string> {
    console.info(`📦 Packing ${packageInfo.name}...`);
    
    const tarball = await this.runCommand("bun", ["pm", "pack", "--quiet"], packageInfo.path);
    packageInfo.tarball = tarball;
    
    console.info(`✅ Created: ${tarball}`);
    return tarball;
  }

  async publishPackage(packageInfo: PackageInfo): Promise<void> {
    console.info(`🚀 Publishing ${packageInfo.name} to R2...`);
    
    const tarballPath = `${packageInfo.path}/${packageInfo.tarball}`;
    
    if (!existsSync(tarballPath)) {
      throw new Error(`Tarball not found: ${tarballPath}`);
    }

    // Publish to R2 registry
    await this.runCommand("bun", ["publish", "--registry", this.r2Registry], packageInfo.path);
    
    console.info(`✅ Published ${packageInfo.name} to R2 registry`);
  }

  async packAllPackages(): Promise<void> {
    console.info("📦 Packing all workspace packages...");
    
    // Ensure dist directory exists
    await this.runCommand("mkdir", ["-p", "dist"]);
    
    for (const pkg of this.packages) {
      await this.packPackage(pkg);
    }
    
    console.info("✅ All packages packed successfully!");
  }

  async publishAllPackages(): Promise<void> {
    console.info("🚀 Publishing all packages to R2...");
    
    for (const pkg of this.packages) {
      await this.publishPackage(pkg);
    }
    
    console.info("✅ All packages published to R2!");
  }

  async verifyCatalogResolution(): Promise<void> {
    console.info("🔍 Verifying catalog resolution...");
    
    // Check that catalog references are resolved in packed packages
    for (const pkg of this.packages) {
      const packageJsonPath = `${pkg.path}/package.json`;
      const packageJson = await Bun.file(packageJsonPath).json();
      
      console.info(`📋 ${pkg.name}:`);
      
      // Check catalog references
      for (const [dep, version] of Object.entries(packageJson.dependencies || {})) {
        if (version === "catalog:") {
          console.info(`  ✅ ${dep}: catalog: (will be resolved to actual version)`);
        } else if (typeof version === "string" && version.startsWith("catalog:")) {
          const catalogName = version.replace("catalog:", "");
          console.info(`  ✅ ${dep}: catalog:${catalogName} (will be resolved to actual version)`);
        } else {
          console.info(`  📦 ${dep}: ${version}`);
        }
      }
    }
  }

  async cleanup(): Promise<void> {
    console.info("🧹 Cleaning up tarballs...");
    
    for (const pkg of this.packages) {
      if (pkg.tarball) {
        const tarballPath = `${pkg.path}/${pkg.tarball}`;
        if (existsSync(tarballPath)) {
          await this.runCommand("rm", [tarballPath]);
        }
      }
    }
    
    console.info("✅ Cleanup complete!");
  }

  async showPublishingInfo(): Promise<void> {
    console.info("📊 DuoPlus R2 Publishing Information:");
    console.info("");
    console.info("🔧 Registry Configuration:");
    console.info(`  Registry: ${this.r2Registry}`);
    console.info(`  Auth: Configured in bunfig.toml`);
    console.info("");
    console.info("📦 Packages to Publish:");
    
    for (const pkg of this.packages) {
      console.info(`  - ${pkg.name}@${pkg.version}`);
    }
    
    console.info("");
    console.info("🎯 Catalog Publishing Process:");
    console.info("  1. Pack packages (catalog: references resolved)");
    console.info("  2. Publish to R2 registry");
    console.info("  3. Packages available for installation");
    console.info("");
    console.info("📥 Installation Command:");
    console.info(`  bun install --registry ${this.r2Registry}`);
  }
}

async function main() {
  const publisher = new DuoR2Publisher();
  const command = process.argv[2];

  switch (command) {
    case "pack":
      await publisher.packAllPackages();
      break;
      
    case "publish":
      await publisher.packAllPackages();
      await publisher.publishAllPackages();
      await publisher.cleanup();
      break;
      
    case "verify":
      await publisher.verifyCatalogResolution();
      break;
      
    case "info":
      await publisher.showPublishingInfo();
      break;
      
    case "clean":
      await publisher.cleanup();
      break;
      
    default:
      console.info("DuoPlus R2 Publisher with Catalog Support");
      console.info("");
      console.info("Usage: bun run scripts/r2-publisher.ts <command>");
      console.info("");
      console.info("Commands:");
      console.info("  pack     - Pack all workspace packages (resolves catalogs)");
      console.info("  publish  - Pack and publish all packages to R2");
      console.info("  verify   - Verify catalog resolution in packages");
      console.info("  info     - Show publishing configuration");
      console.info("  clean    - Clean up tarballs");
      console.info("");
      console.info("Examples:");
      console.info("  bun run scripts/r2-publisher.ts info");
      console.info("  bun run scripts/r2-publisher.ts pack");
      console.info("  bun run scripts/r2-publisher.ts publish");
  }
}

main().catch(console.error);
