// infrastructure/bundler-determinism-patch.ts
import { feature } from "bun:bundle";
import { stat } from "fs/promises";
import { dirname } from "path";

// Fixes macOS APFS cross-volume EXDEV, self-referencing symlinks
export class BundlerDeterminismPatch {
  // Zero-cost when BUNDLER_DETERMINISM is disabled
  static async createSymlink(source: string, target: string): Promise<void> {
    if (!feature("BUNDLER_DETERMINISM")) {
      // Legacy: may fail on cross-volume
      await this.createBasicSymlink(source, target);
      return;
    }

    // Handle cross-volume symlinks (macOS APFS)
    const isCrossVolume = await this.isCrossVolume(source, target);

    if (isCrossVolume) {
      // Use hardlink or copy instead of symlink
      await this.createCrossVolumeLink(source, target);
    } else {
      // Normal symlink
      await this.createBasicSymlink(source, target);
    }

    // Log determinism action (Component #11 audit)
    this.logSymlinkCreation(source, target, isCrossVolume);
  }

  // Self-referencing workspace dependency fix
  static async linkWorkspaceSelfReference(workspacePath: string, packageName: string): Promise<void> {
    if (!feature("BUNDLER_DETERMINISM")) {
      // Legacy: no self-reference links
      return;
    }

    // Create symlink: node_modules/{packageName} -> {workspacePath}
    const selfRefLink = `${workspacePath}/node_modules/${packageName}`;
    await this.createSymlink(workspacePath, selfRefLink);

    // Also link in root node_modules for visibility
    const rootSelfRef = `node_modules/${packageName}`;
    await this.createSymlink(workspacePath, rootSelfRef);
  }

  // node_modules/.bun/node_modules determinism fix
  static async ensureDeterministicHoisting(bunDir: string): Promise<void> {
    if (!feature("BUNDLER_DETERMINISM")) return;

    // Sort dependencies alphabetically before hoisting
    const packages = await this.getSortedPackages(bunDir);

    for (const pkg of packages) {
      const target = `${bunDir}/node_modules/${pkg}`;
      const linkPath = `${bunDir}/node_modules/.bun/node_modules/${pkg}`;

      await this.createSymlink(target, linkPath);
    }

    this.logDeterministicHoisting(bunDir);
  }

  private static async isCrossVolume(source: string, target: string): Promise<boolean> {
    if (process.platform !== "darwin") return false;

    // Check device ID on macOS
    try {
      const sourceStat = await stat(source);
      const targetStat = await stat(dirname(target));
      return sourceStat.dev !== targetStat.dev;
    } catch {
      return false;
    }
  }

  private static async createCrossVolumeLink(source: string, target: string): Promise<void> {
    // On cross-volume, copy instead of symlink
    if (await Bun.file(source).exists()) {
      await Bun.write(target, Bun.file(source));
    } else {
      const proc = Bun.spawn(["mkdir", "-p", target]);
      await proc.exited;
    }
  }

  private static async createBasicSymlink(source: string, target: string): Promise<void> {
    const proc = Bun.spawn(["ln", "-sf", source, target]);
    await proc.exited;
  }

  private static async getSortedPackages(bunDir: string): Promise<string[]> {
    try {
      const proc = Bun.spawn(["ls", `${bunDir}/node_modules`], { stdout: "pipe" });
      const output = await new Response(proc.stdout).text();
      return output.split('\n').filter(p => p).sort();
    } catch {
      return [];
    }
  }

  private static logSymlinkCreation(source: string, target: string, crossVolume: boolean): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 69,
        source,
        target,
        crossVolume,
        action: crossVolume ? "copy" : "symlink",
        timestamp: Date.now()
      })
    }).catch(() => {});
  }

  private static logDeterministicHoisting(bunDir: string): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 69,
        bunDir,
        action: "deterministic_hoisting",
        timestamp: Date.now()
      })
    }).catch(() => {});
  }
}

// Zero-cost export
export const {
  createSymlink,
  linkWorkspaceSelfReference,
  ensureDeterministicHoisting
} = feature("BUNDLER_DETERMINISM")
  ? BundlerDeterminismPatch
  : {
      createSymlink: async (s: string, t: string) => {
        const proc = Bun.spawn(["ln", "-s", s, t]);
        await proc.exited;
      },
      linkWorkspaceSelfReference: async () => {},
      ensureDeterministicHoisting: async () => {}
    };