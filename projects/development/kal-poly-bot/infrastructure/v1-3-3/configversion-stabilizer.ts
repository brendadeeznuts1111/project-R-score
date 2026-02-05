import "./types.d.ts";
// infrastructure/v1-3-3/configversion-stabilizer.ts
// Component #56: Config Version Stabilizer for Package Manager Stability


// Export interfaces for type safety
export interface LockfileInfo {
  configVersion: number;
  packages: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  optionalDependencies: Record<string, string>;
}

export interface LinkerConfig {
  type: "node-gyp" | "rust" | "zig" | "c" | "cpp";
  version: string;
  path: string;
}

// Package manager stability for Kalman dependencies
export class ConfigVersionStabilizer {
  static readonly VERSIONS = {
    V0: 0, // Legacy config
    V1: 1, // Stable config with configVersion
  } as const;

  private static lockfileInitialized = false;
  private static currentLinker: LinkerConfig | null = null;

  // Initialize lockfile with stable configVersion
  static initializeLockfile(): void {
    if (!process.env.FEATURE_CONFIG_VERSION_STABLE === "1") {
      console.warn(
        "Config version stabilization disabled - using legacy behavior"
      );
      return;
    }

    if (this.lockfileInitialized) {
      return; // Already initialized
    }

    try {
      // Read existing lockfile or create new one
      const lockfile = this.readLockfile();

      if (!lockfile || lockfile.configVersion === this.VERSIONS.V0) {
        // Upgrade to stable config version
        this.upgradeLockfile();
      }

      // Set default linker for Kalman native addons
      this.setDefaultLinker();

      this.lockfileInitialized = true;
      console.log(
        `[STABILITY] Config version stabilizer initialized (v${this.VERSIONS.V1})`
      );
    } catch (error) {
      console.error("[STABILITY] Failed to initialize lockfile:", error);
    }
  }

  // Get default linker for Kalman system
  static getDefaultLinker(): string {
    if (!process.env.FEATURE_CONFIG_VERSION_STABLE === "1") {
      return "node-gyp"; // Legacy fallback
    }

    if (!this.currentLinker) {
      // Auto-detect best linker for Kalman dependencies
      this.currentLinker = this.detectOptimalLinker();
    }

    return this.currentLinker.type;
  }

  // Read and parse lockfile
  private static readLockfile(): LockfileInfo | null {
    try {
      const lockfileContent = Bun.file("bun.lockb").exists()
        ? Bun.file("bun.lockb").arrayBuffer()
        : null;

      if (!lockfileContent) {
        return null;
      }

      // Parse lockfile (simplified for stability)
      const decoder = new TextDecoder();
      const content = decoder.decode(lockfileContent);

      try {
        return JSON.parse(content);
      } catch {
        // Binary lockfile - create stable version
        return null;
      }
    } catch {
      return null;
    }
  }

  // Upgrade lockfile to stable version
  private static upgradeLockfile(): void {
    const packageJson = this.readPackageJson();

    if (!packageJson) {
      throw new Error("package.json not found");
    }

    const stableLockfile: LockfileInfo = {
      configVersion: this.VERSIONS.V1,
      packages: {},
      dependencies: packageJson.dependencies || {},
      devDependencies: packageJson.devDependencies || {},
      peerDependencies: packageJson.peerDependencies || {},
      optionalDependencies: packageJson.optionalDependencies || {},
    };

    // Write stable lockfile
    this.writeLockfile(stableLockfile);
    console.log("[STABILITY] Upgraded to configVersion 1");
  }

  // Read package.json
  private static readPackageJson(): any {
    try {
      const content = Bun.file("package.json").text();
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  // Write lockfile
  private static writeLockfile(lockfile: LockfileInfo): void {
    const content = JSON.stringify(lockfile, null, 2);
    Bun.write("bun.lockb", content);
  }

  // Detect optimal linker for Kalman dependencies
  private static detectOptimalLinker(): LinkerConfig {
    const packageJson = this.readPackageJson();

    if (!packageJson) {
      return { type: "node-gyp", version: "latest", path: "node-gyp" };
    }

    // Check for Rust dependencies (common in Kalman filters)
    const hasRustDeps = Object.keys(packageJson.dependencies || {}).some(
      (dep) => dep.includes("kalman") || dep.includes("napi-rs")
    );

    if (hasRustDeps) {
      return { type: "rust", version: "1.70+", path: "cargo" };
    }

    // Check for Zig dependencies
    const hasZigDeps = Object.keys(packageJson.dependencies || {}).some(
      (dep) => dep.includes("zig") || dep.includes("zigcc")
    );

    if (hasZigDeps) {
      return { type: "zig", version: "0.11+", path: "zig" };
    }

    // Default to node-gyp for native addons
    return { type: "node-gyp", version: "latest", path: "node-gyp" };
  }

  // Set default linker in bunfig.toml
  private static setDefaultLinker(): void {
    const bunfigPath = "bunfig.toml";
    let bunfigContent = "";

    try {
      if (Bun.file(bunfigPath).exists()) {
        bunfigContent = Bun.file(bunfigPath).text();
      }
    } catch {
      // Create new bunfig.toml
    }

    // Update or add linker configuration
    const linkerLine = `linker = "${this.currentLinker?.type || "node-gyp"}"`;

    if (bunfigContent.includes("linker =")) {
      bunfigContent = bunfigContent.replace(/linker = .*/g, linkerLine);
    } else {
      bunfigContent += `\n[install]\n${linkerLine}\n`;
    }

    Bun.write(bunfigPath, bunfigContent);
    console.log(`[STABILITY] Set linker to: ${this.currentLinker?.type}`);
  }

  // Validate package manager configuration
  static validateConfig(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!process.env.FEATURE_CONFIG_VERSION_STABLE === "1") {
      return { valid: true, issues: ["Config stabilization disabled"] };
    }

    const lockfile = this.readLockfile();

    if (!lockfile) {
      issues.push("No lockfile found");
      return { valid: false, issues };
    }

    if (lockfile.configVersion === this.VERSIONS.V0) {
      issues.push("Lockfile using legacy configVersion 0");
    }

    const packageJson = this.readPackageJson();
    if (!packageJson) {
      issues.push("package.json not found");
      return { valid: false, issues };
    }

    // Check for Kalman-specific dependencies
    const kalmanDeps = Object.keys(packageJson.dependencies || {}).filter(
      (dep) => dep.includes("kalman") || dep.includes("filter")
    );

    if (kalmanDeps.length === 0) {
      issues.push("No Kalman filter dependencies found");
    }

    return { valid: issues.length === 0, issues };
  }

  // Get stability metrics
  static getStabilityMetrics(): {
    configVersion: number;
    linkerType: string;
    lockfileExists: boolean;
    packageCount: number;
    kalmanDeps: number;
  } {
    const lockfile = this.readLockfile();
    const packageJson = this.readPackageJson();

    const allDeps = [
      ...Object.keys(packageJson?.dependencies || {}),
      ...Object.keys(packageJson?.devDependencies || {}),
      ...Object.keys(packageJson?.peerDependencies || {}),
      ...Object.keys(packageJson?.optionalDependencies || {}),
    ];

    const kalmanDeps = allDeps.filter(
      (dep) => dep.includes("kalman") || dep.includes("filter")
    );

    return {
      configVersion: lockfile?.configVersion || this.VERSIONS.V0,
      linkerType: this.currentLinker?.type || "unknown",
      lockfileExists: Bun.file("bun.lockb").exists(),
      packageCount: allDeps.length,
      kalmanDeps: kalmanDeps.length,
    };
  }
}

// Zero-cost export
export const {
  initializeLockfile,
  getDefaultLinker,
  validateConfig,
  getStabilityMetrics,
  VERSIONS,
} = process.env.FEATURE_CONFIG_VERSION_STABLE === "1"
  ? ConfigVersionStabilizer
  : {
      initializeLockfile: () =>
        console.warn("Config version stabilization disabled"),
      getDefaultLinker: () => "node-gyp",
      validateConfig: () => ({ valid: true, issues: ["Disabled"] }),
      getStabilityMetrics: () => ({
        configVersion: 0,
        linkerType: "node-gyp",
        lockfileExists: false,
        packageCount: 0,
        kalmanDeps: 0,
      }),
      VERSIONS: { V0: 0, V1: 1 },
    };

export default ConfigVersionStabilizer;
