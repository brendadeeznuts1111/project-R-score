// infrastructure/selective-hoisting-controller.ts
import { feature } from "bun:bundle";

// publicHoistPattern for @types/*, eslint plugins in isolated linker
export class SelectiveHoistingController {
  static readonly DEFAULT_PATTERNS = ["@types/*", "*eslint*"] as const;

  // Zero-cost when SELECTIVE_HOISTING is disabled
  static getHoistPatterns(fromConfig?: string | string[]): string[] {
    if (!feature("SELECTIVE_HOISTING")) {
      // Legacy: no hoisting in isolated mode
      return [];
    }

    const patterns = fromConfig || [...this.DEFAULT_PATTERNS];
    return Array.isArray(patterns) ? [...patterns] : [patterns];
  }

  static shouldHoist(packageName: string, patterns: string[]): boolean {
    if (!feature("SELECTIVE_HOISTING")) return false;

    return patterns.some(pattern => {
      // Simple glob matching
      const regex = new RegExp(
        pattern.replace(/\*/g, '.*').replace(/\?/g, '.')
      );
      return regex.test(packageName);
    });
  }

  // Applies to both public and internal hoisting
  static configureForWorkspace(config: any): {
    publicHoistPattern: string[];
    hoistPattern: string[];
  } {
    if (!feature("SELECTIVE_HOISTING")) {
      return { publicHoistPattern: [], hoistPattern: [] };
    }

    const result = {
      publicHoistPattern: this.getHoistPatterns(config.install?.publicHoistPattern),
      hoistPattern: this.getHoistPatterns(config.install?.hoistPattern)
    };

    // Log configuration (Component #11 audit)
    this.logHoistingConfig(result);

    return result;
  }

  // Creates symlinks for hoisted packages in isolated linker
  static async createHoistedSymlinks(
    packageName: string,
    targetPath: string,
    patterns: string[]
  ): Promise<void> {
    if (!feature("SELECTIVE_HOISTING") || !this.shouldHoist(packageName, patterns)) {
      return;
    }

    // Create symlink from node_modules/.bun/node_modules to package
    const symlinkPath = `node_modules/.bun/node_modules/${packageName}`;
    await this.createSymlink(targetPath, symlinkPath);

    // Also create in root node_modules for public hoisting
    const publicSymlink = `node_modules/${packageName}`;
    await this.createSymlink(targetPath, publicSymlink);

    this.logSymlinkCreation(packageName, targetPath);
  }

  private static async createSymlink(source: string, target: string): Promise<void> {
    // Use Bun.spawn for shell commands
    const proc = Bun.spawn(["ln", "-sf", source, target]);
    await proc.exited;
  }

  private static logHoistingConfig(config: { publicHoistPattern: string[]; hoistPattern: string[] }): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 67,
        publicPatterns: config.publicHoistPattern,
        internalPatterns: config.hoistPattern,
        timestamp: Date.now()
      })
    }).catch(() => {});
  }

  private static logSymlinkCreation(packageName: string, target: string): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 67,
        package: packageName,
        target,
        action: "hoist_symlink_created",
        timestamp: Date.now()
      })
    }).catch(() => {});
  }
}

// For .npmrc support
export const NpmrcHoistPattern = {
  parse(lines: string[]): string[] {
    const patterns: string[] = [];
    for (const line of lines) {
      const match = line.match(/^public-hoist-pattern\[\]\s*=\s*(.+)$/);
      if (match) {
        patterns.push(match[1].trim());
      }
    }
    return patterns;
  }
};

// Zero-cost export
export const {
  getHoistPatterns,
  shouldHoist,
  configureForWorkspace,
  createHoistedSymlinks
} = feature("SELECTIVE_HOISTING")
  ? SelectiveHoistingController
  : {
      getHoistPatterns: () => [],
      shouldHoist: () => false,
      configureForWorkspace: () => ({ publicHoistPattern: [], hoistPattern: [] }),
      createHoistedSymlinks: async () => {}
    };