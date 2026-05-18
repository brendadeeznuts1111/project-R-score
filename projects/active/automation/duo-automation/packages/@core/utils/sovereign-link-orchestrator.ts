/**
 * SovereignLinkOrchestrator (Ticket 21.1.1.1.1)
 * High-speed local module linking for Sovereign development
 */

import { $ } from "bun";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

export class SovereignLinkOrchestrator {
  private static readonly MODULES_DIR = "modules";

  /**
   * 🔗 Batch register all modules in the modules/ directory
   */
  static async registerModules() {
    console.info("💎 Sovereign Batch Linker: Registering modules...");
    try {
      const entries = await readdir(this.MODULES_DIR, { withFileTypes: true });
      const modules = entries
        .filter(e => e.isDirectory())
        .map(e => e.name);

      for (const mod of modules) {
        const modPath = join(this.MODULES_DIR, mod);
        console.info(`📦 Linking workspace: ${mod}...`);
        
        // Execute bun link within each module directory
        const proc = Bun.spawn(["bun", "link"], {
          cwd: modPath,
        });

        if (await proc.exited !== 0) {
          console.error(`❌ Failed to register module: ${mod}`);
        }
      }
      
      console.info("✅ All Sovereign modules registered locally.");
      return modules;
    } catch (e) {
      console.error("❌ Link Orchestration failed:", e.message);
      return [];
    }
  }

  /**
   * 🚀 Link registered modules into a target directory
   */
  static async linkToTarget(targetDir: string, modules: string[]) {
    console.info(`🛰️ Linking modules into target: ${targetDir}...`);
    
    for (const mod of modules) {
      // Assuming @duoplus namespace for Sovereign v4.0
      const scopedName = `@duoplus/${mod}`;
      console.info(`🔗 Linking ${scopedName}...`);
      
      const proc = Bun.spawn(["bun", "link", scopedName, "--save"], {
        cwd: targetDir,
      });

      if (await proc.exited !== 0) {
        // Fallback to name without scope if @duoplus isn't in package.json
        await Bun.spawn(["bun", "link", mod, "--save"], { cwd: targetDir }).exited;
      }
    }
  }
}

if (import.meta.main) {
  SovereignLinkOrchestrator.registerModules().catch(console.error);
}