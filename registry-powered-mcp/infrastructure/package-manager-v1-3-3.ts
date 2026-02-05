// infrastructure/package-manager-v1-3-3.ts
import { feature } from "bun:bundle";
import { NoPeerDepsOptimizer } from "./no-peerdeps-optimizer";
import { NpmrcEmailForwarder } from "./npmrc-email-forwarder";
import { SelectiveHoistingController } from "./selective-hoisting-controller";
import { BundlerDeterminismPatch } from "./bundler-determinism-patch";
import { BunPackEnforcer } from "./bun-pack-enforcer";

// Zero-cost package manager orchestrator
export class PackageManagerV133 {
  static async install(packageJsonPath: string): Promise<void> {
    // Component #65: Skip wait if no peer deps
    await NoPeerDepsOptimizer.optimizeInstall(packageJsonPath);

    // Component #66: Include email in registry auth
    const registry = "https://registry.example.com";
    const auth = await NpmrcEmailForwarder.getRegistryAuth(registry);

    // Component #67: Apply selective hoisting
    const hoistConfig = SelectiveHoistingController.configureForWorkspace(
      await Bun.file("bunfig.toml").json().catch(() => ({}))
    );

    // Component #69: Ensure deterministic symlinks
    await BundlerDeterminismPatch.ensureDeterministicHoisting("node_modules/.bun");

    // Run actual install
    const proc = Bun.spawn(["bun", "install"]);
    await proc.exited;
  }

  static async pack(packagePath: string): Promise<Uint8Array> {
    // Component #70: Enforce bin/ directory inclusion
    return BunPackEnforcer.pack(packagePath);
  }
}

// Zero-cost export
export const { install, pack } = feature("BUN_PM_OPTIMIZATIONS")
  ? PackageManagerV133
  : {
      install: async () => {
        const proc = Bun.spawn(["bun", "install"]);
        await proc.exited;
      },
      pack: async (path: string) => new Uint8Array(0)
    };