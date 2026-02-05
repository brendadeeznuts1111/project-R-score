/**
 * Unit tests for dependency and module resolution functionality
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import chalk from "chalk";

// Mock console methods to capture output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
let mockConsoleLog: string[] = [];
let mockConsoleError: string[] = [];

// Mock process.env to track changes
const originalEnv = { ...process.env };

// Import the function we want to test
// We need to extract it from CLI.ts for testing
async function handleDependencyOptions(options: any) {
  // Handle null/undefined options
  if (!options) {
    return;
  }

  // Handle preload/require/import options
  const preloadModules = [];

  if (options.preload) {
    preloadModules.push(options.preload);
  }
  if (options.require) {
    preloadModules.push(options.require);
  }
  if (options.import) {
    preloadModules.push(options.import);
  }

  // Load preload modules
  for (const module of preloadModules) {
    try {
      await import(module);
      if (options.verbose) {
        console.log(chalk.green(`✅ Preloaded module: ${module}`));
      }
    } catch (error) {
      console.error(chalk.red(`❌ Failed to preload module: ${module}`), error);
      if (!options.dryRun) {
        throw new Error(`Failed to preload module: ${module}`);
      }
    }
  }

  // Handle install behavior
  if (options.noInstall) {
    process.env.BUN_NO_INSTALL = "true";
    if (options.verbose) {
      console.log(chalk.yellow("🔧 Auto-install disabled"));
    }
  }

  if (options.install && options.install !== "auto") {
    const validBehaviors = ["auto", "fallback", "force"];
    if (!validBehaviors.includes(options.install)) {
      throw new Error(`Invalid install behavior: ${options.install}. Valid options: ${validBehaviors.join(", ")}`);
    }
    process.env.BUN_INSTALL = options.install;
    if (options.verbose) {
      console.log(chalk.yellow(`🔧 Install behavior set to: ${options.install}`));
    }
  }

  if (options.i) {
    process.env.BUN_INSTALL = "fallback";
    if (options.verbose) {
      console.log(chalk.yellow("🔧 Auto-install enabled (fallback mode)"));
    }
  }

  // Handle package resolution preferences
  if (options.preferOffline) {
    process.env.BUN_PREFER_OFFLINE = "true";
    if (options.verbose) {
      console.log(chalk.yellow("🔧 Preferring offline packages"));
    }
  }

  if (options.preferLatest) {
    process.env.BUN_PREFER_LATEST = "true";
    if (options.verbose) {
      console.log(chalk.yellow("🔧 Preferring latest package versions"));
    }
  }

  // Handle custom conditions
  if (options.conditions) {
    process.env.BUN_CONDITIONS = options.conditions;
    if (options.verbose) {
      console.log(chalk.yellow(`🔧 Custom conditions: ${options.conditions}`));
    }
  }

  // Handle main fields
  if (options.mainFields) {
    process.env.BUN_MAIN_FIELDS = options.mainFields;
    if (options.verbose) {
      console.log(chalk.yellow(`🔧 Main fields: ${options.mainFields}`));
    }
  }

  // Handle symlink preservation
  if (options.preserveSymlinks) {
    process.env.BUN_PRESERVE_SYMLINKS = "true";
    if (options.verbose) {
      console.log(chalk.yellow("🔧 Preserving symlinks when resolving files"));
    }
  }

  if (options.preserveSymlinksMain) {
    process.env.BUN_PRESERVE_SYMLINKS_MAIN = "true";
    if (options.verbose) {
      console.log(chalk.yellow("🔧 Preserving symlinks when resolving main entry point"));
    }
  }

  // Handle extension order
  if (options.extensionOrder && options.extensionOrder !== ".tsx,.ts,.jsx,.js,.json") {
    process.env.BUN_EXTENSION_ORDER = options.extensionOrder;
    if (options.verbose) {
      console.log(chalk.yellow(`🔧 Extension order: ${options.extensionOrder}`));
    }
  }
}

describe("Dependency Resolution Options", () => {
  beforeEach(() => {
    // Reset console mocks
    mockConsoleLog = [];
    mockConsoleError = [];
    console.log = (...args) => mockConsoleLog.push(args.join(" ").replace(/\u001b\[[0-9;]*m/g, ''));
    console.error = (...args) => mockConsoleError.push(args.join(" ").replace(/\u001b\[[0-9;]*m/g, ''));

    // Reset process.env
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('BUN_')) {
        delete process.env[key];
      }
    });
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;

    // Restore process.env
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('BUN_')) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);
  });

  describe("Preload Options", () => {
    it("should preload a single module successfully", async () => {
      const options = {
        preload: "fs",
        verbose: true
      };

      await handleDependencyOptions(options);

      expect(mockConsoleLog).toContain("✅ Preloaded module: fs");
    });

    it("should handle multiple preload modules", async () => {
      const options = {
        preload: "fs",
        require: "path",
        import: "util",
        verbose: true
      };

      await handleDependencyOptions(options);

      expect(mockConsoleLog).toContain("✅ Preloaded module: fs");
      expect(mockConsoleLog).toContain("✅ Preloaded module: path");
      expect(mockConsoleLog).toContain("✅ Preloaded module: util");
    });

    it("should handle preload module failure in dry-run mode", async () => {
      const options = {
        preload: "non-existent-module",
        dryRun: true,
        verbose: true
      };

      await handleDependencyOptions(options);

      expect(mockConsoleError.length).toBeGreaterThan(0);
      expect(mockConsoleError[0]).toContain("❌ Failed to preload module: non-existent-module");
    });

    it("should throw error on preload failure when not in dry-run mode", async () => {
      const options = {
        preload: "non-existent-module",
        dryRun: false
      };

      await expect(handleDependencyOptions(options)).rejects.toThrow("Failed to preload module: non-existent-module");
    });
  });

  describe("Install Behavior Options", () => {
    it("should disable auto-install when --no-install is used", async () => {
      const options = {
        noInstall: true,
        verbose: true
      };

      await handleDependencyOptions(options);

      expect(process.env.BUN_NO_INSTALL).toBe("true");
      expect(mockConsoleLog).toContain("🔧 Auto-install disabled");
    });

    it("should set install behavior to fallback", async () => {
      const options = {
        install: "fallback",
        verbose: true
      };

      await handleDependencyOptions(options);

      expect(process.env.BUN_INSTALL).toBe("fallback");
      expect(mockConsoleLog).toContain("🔧 Install behavior set to: fallback");
    });

    it("should set install behavior to force", async () => {
      const options = {
        install: "force",
        verbose: true
      };

      await handleDependencyOptions(options);

      expect(process.env.BUN_INSTALL).toBe("force");
      expect(mockConsoleLog).toContain("🔧 Install behavior set to: force");
    });

    it("should handle -i flag as fallback", async () => {
      const options = {
        i: true,
        verbose: true
      };

      await handleDependencyOptions(options);

      expect(process.env.BUN_INSTALL).toBe("fallback");
      expect(mockConsoleLog).toContain("🔧 Auto-install enabled (fallback mode)");
    });

    it("should reject invalid install behavior", async () => {
      const options = {
        install: "invalid"
      };

      await expect(handleDependencyOptions(options)).rejects.toThrow("Invalid install behavior: invalid");
    });

    it("should not set anything for default auto install", async () => {
      const options = {
        install: "auto"
      };

      await handleDependencyOptions(options);

      expect(process.env.BUN_INSTALL).toBeUndefined();
    });
  });

  describe("Package Resolution Options", () => {
    it("should set prefer offline preference", async () => {
      const options = {
        preferOffline: true,
        verbose: true
      };

      await handleDependencyOptions(options);

      expect(process.env.BUN_PREFER_OFFLINE).toBe("true");
      expect(mockConsoleLog).toContain("🔧 Preferring offline packages");
    });

    it("should set prefer latest preference", async () => {
      const options = {
        preferLatest: true,
        verbose: true
      };

      await handleDependencyOptions(options);

      expect(process.env.BUN_PREFER_LATEST).toBe("true");
      expect(mockConsoleLog).toContain("🔧 Preferring latest package versions");
    });

    it("should set custom conditions", async () => {
      const options = {
        conditions: "development",
        verbose: true
      };

      await handleDependencyOptions(options);

      expect(process.env.BUN_CONDITIONS).toBe("development");
      expect(mockConsoleLog).toContain("🔧 Custom conditions: development");
    });

    it("should set custom main fields", async () => {
      const options = {
        mainFields: "main,module",
        verbose: true
      };

      await handleDependencyOptions(options);

      expect(process.env.BUN_MAIN_FIELDS).toBe("main,module");
      expect(mockConsoleLog).toContain("🔧 Main fields: main,module");
    });
  });

  describe("File Resolution Options", () => {
    it("should preserve symlinks when resolving files", async () => {
      const options = {
        preserveSymlinks: true,
        verbose: true
      };

      await handleDependencyOptions(options);

      expect(process.env.BUN_PRESERVE_SYMLINKS).toBe("true");
      expect(mockConsoleLog).toContain("🔧 Preserving symlinks when resolving files");
    });

    it("should preserve symlinks when resolving main entry point", async () => {
      const options = {
        preserveSymlinksMain: true,
        verbose: true
      };

      await handleDependencyOptions(options);

      expect(process.env.BUN_PRESERVE_SYMLINKS_MAIN).toBe("true");
      expect(mockConsoleLog).toContain("🔧 Preserving symlinks when resolving main entry point");
    });

    it("should set custom extension order", async () => {
      const options = {
        extensionOrder: ".ts,.js,.json",
        verbose: true
      };

      await handleDependencyOptions(options);

      expect(process.env.BUN_EXTENSION_ORDER).toBe(".ts,.js,.json");
      expect(mockConsoleLog).toContain("🔧 Extension order: .ts,.js,.json");
    });

    it("should not set extension order for default value", async () => {
      const options = {
        extensionOrder: ".tsx,.ts,.jsx,.js,.json"
      };

      await handleDependencyOptions(options);

      expect(process.env.BUN_EXTENSION_ORDER).toBeUndefined();
    });
  });

  describe("Combined Options", () => {
    it("should handle multiple options simultaneously", async () => {
      const options = {
        preload: "fs",
        noInstall: true,
        preferOffline: true,
        preserveSymlinks: true,
        verbose: true
      };

      await handleDependencyOptions(options);

      expect(mockConsoleLog).toContain("✅ Preloaded module: fs");
      expect(mockConsoleLog).toContain("🔧 Auto-install disabled");
      expect(mockConsoleLog).toContain("🔧 Preferring offline packages");
      expect(mockConsoleLog).toContain("🔧 Preserving symlinks when resolving files");
      expect(process.env.BUN_NO_INSTALL).toBe("true");
      expect(process.env.BUN_PREFER_OFFLINE).toBe("true");
      expect(process.env.BUN_PRESERVE_SYMLINKS).toBe("true");
    });

    it("should handle options without verbose mode", async () => {
      const options = {
        noInstall: true,
        preferOffline: true
      };

      await handleDependencyOptions(options);

      expect(process.env.BUN_NO_INSTALL).toBe("true");
      expect(process.env.BUN_PREFER_OFFLINE).toBe("true");
      expect(mockConsoleLog.length).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty options object", async () => {
      const options = {};

      await handleDependencyOptions(options);

      // Should not set any environment variables or log anything
      expect(mockConsoleLog.length).toBe(0);
      expect(mockConsoleError.length).toBe(0);
      Object.keys(process.env).forEach(key => {
        expect(key.startsWith('BUN_')).toBe(false);
      });
    });

    it("should handle null options", async () => {
      const options = null;

      // Should not throw error
      await expect(handleDependencyOptions(options)).resolves.toBeUndefined();
    });

    it("should handle undefined options", async () => {
      const options = undefined;

      // Should not throw error
      await expect(handleDependencyOptions(options)).resolves.toBeUndefined();
    });
  });
});
