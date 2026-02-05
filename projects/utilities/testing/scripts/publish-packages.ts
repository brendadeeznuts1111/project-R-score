/**
 * 🚀 CI/CD PUBLISH AUTOMATION
 * Uses Bun v1.2+ "bun pm" utilities for professional package management.
 */

import { spawn } from "bun";
import { readdir, mkdir } from "node:fs/promises";
import { join } from "node:path";

const PACKAGES_DIR = join(import.meta.dir, "../packages");
const DIST_DIR = join(import.meta.dir, "../dist/artifacts");

async function publishPackages() {
  console.log("🛠️ Starting implementation of CI/CD pipeline...");
  
  try {
    await mkdir(DIST_DIR, { recursive: true });
    
    const entries = await readdir(PACKAGES_DIR, { withFileTypes: true });
    const packages = entries.filter(e => e.isDirectory()).map(e => e.name);

    for (const pkg of packages) {
      console.log(`\n📦 Processing package: ${pkg}`);
      const pkgPath = join(PACKAGES_DIR, pkg);

      // 1. Pack the package using bun pm pack
      console.log(`  -> Running 'bun pm pack' in ${pkgPath}`);
      const packProc = spawn(["bun", "pm", "pack"], {
        cwd: pkgPath,
        stdout: "pipe"
      });

      const output = await new Response(packProc.stdout).text();
      const tarballMatch = output.match(/([a-zA-Z0-9-.]+\.tgz)/);
      
      if (tarballMatch) {
        const tarballName = tarballMatch[1];
        const sourcePath = join(pkgPath, tarballName);
        const destPath = join(DIST_DIR, tarballName);

        // 2. Move tarball to artifacts directory
        const file = Bun.file(sourcePath);
        await Bun.write(destPath, file);
        
        // Cleanup original
        await spawn(["rm", sourcePath]).exited;

        console.log(`  ✅ Artifact created: ${destPath}`);
        
        // 3. Optional: Check for untrusted dependencies
        const untrustedProc = spawn(["bun", "pm", "untrusted"], { cwd: pkgPath });
        const untrustedCode = await untrustedProc.exited;
        if (untrustedCode === 0) {
            console.log(`  🛡️ Security check passed (No untrusted dependencies)`);
        }
      } else {
          console.warn(`  ⚠️ Failed to identify tarball name from output: ${output}`);
      }
    }

    console.log("\n✨ CI/CD Task Completed! All artifacts are in dist/artifacts/");
  } catch (error) {
    console.error("❌ CI/CD Pipeline Failed", error);
    process.exit(1);
  }
}

publishPackages();
