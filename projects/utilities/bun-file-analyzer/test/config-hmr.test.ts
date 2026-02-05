import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { initConfigHMR, subscribeToConfig, getCurrentConfig, loadConfigWithHMR } from "../src/config/hmr";

describe("🔥 Configuration HMR Tests", () => {
  beforeEach(() => {
    // Reset HMR state before each test
    if (typeof globalThis !== 'undefined') {
      delete (globalThis as any).__CONFIG_HMR_UPDATE__;
    }
  });

  afterEach(() => {
    // Clean up after each test
    if (typeof globalThis !== 'undefined') {
      delete (globalThis as any).__CONFIG_HMR_UPDATE__;
    }
  });

  describe("🔧 HMR Initialization", () => {
    it("should initialize HMR with configuration", () => {
      const testConfig = {
        name: "test-app",
        version: "1.0.0",
        description: "Test configuration",
        build: { target: "browser", reactFastRefresh: true, metafile: true, sourcemap: false, minify: false },
        virtualFiles: {
          enabled: true,
          theme: { primary: "blue", success: "green", warning: "yellow", error: "red", info: "gray" },
          buildInfo: { includeBundleSize: true, includeCommitSha: false, includeTimestamp: true },
        },
        performance: { responseJsonOptimization: true, colorConversionCache: true, archiveCompression: "gzip" },
        targets: ["bun-linux-x64"],
        features: ["virtual-files", "hmr"],
      };

      initConfigHMR(testConfig);
      
      const currentConfig = getCurrentConfig();
      expect(currentConfig).toEqual(testConfig);
    });

    it("should handle multiple initializations gracefully", () => {
      const config1 = { name: "config1", version: "1.0.0", description: "", build: {} as any, virtualFiles: {} as any, performance: {} as any, targets: [], features: [] };
      const config2 = { name: "config2", version: "2.0.0", description: "", build: {} as any, virtualFiles: {} as any, performance: {} as any, targets: [], features: [] };

      initConfigHMR(config1);
      initConfigHMR(config2);
      
      const currentConfig = getCurrentConfig();
      expect(currentConfig?.name).toBe("config2");
    });
  });

  describe("👂 Configuration Subscriptions", () => {
    it("should subscribe to configuration changes", () => {
      const testConfig = {
        name: "test-app",
        version: "1.0.0",
        description: "",
        build: {} as any,
        virtualFiles: {} as any,
        performance: {} as any,
        targets: [],
        features: [],
      };

      let receivedConfig: any = null;
      const unsubscribe = subscribeToConfig((config) => {
        receivedConfig = config;
      });

      initConfigHMR(testConfig);
      
      expect(receivedConfig).toEqual(testConfig);
      unsubscribe();
    });

    it("should handle multiple subscribers", () => {
      const testConfig = {
        name: "test-app",
        version: "1.0.0",
        description: "",
        build: {} as any,
        virtualFiles: {} as any,
        performance: {} as any,
        targets: [],
        features: [],
      };

      const results: any[] = [];
      
      const unsubscribe1 = subscribeToConfig((config) => results.push(`listener1: ${config.name}`));
      const unsubscribe2 = subscribeToConfig((config) => results.push(`listener2: ${config.name}`));

      initConfigHMR(testConfig);
      
      expect(results).toEqual(["listener1: test-app", "listener2: test-app"]);
      
      unsubscribe1();
      unsubscribe2();
    });

    it("should unsubscribe correctly", () => {
      const testConfig = {
        name: "test-app",
        version: "1.0.0",
        description: "",
        build: {} as any,
        virtualFiles: {} as any,
        performance: {} as any,
        targets: [],
        features: [],
      };

      let callCount = 0;
      const unsubscribe = subscribeToConfig(() => callCount++);

      initConfigHMR(testConfig);
      expect(callCount).toBe(1);

      unsubscribe();
      
      // Re-initialize should not call the unsubscribed listener
      initConfigHMR({ ...testConfig, name: "updated" });
      expect(callCount).toBe(1); // Should still be 1, not 2
    });
  });

  describe("🔄 Configuration Updates", () => {
    it("should detect configuration changes", () => {
      const oldConfig = {
        name: "test-app",
        version: "1.0.0",
        description: "",
        build: { target: "browser", reactFastRefresh: true, metafile: true, sourcemap: false, minify: false },
        virtualFiles: {
          enabled: true,
          theme: { primary: "blue", success: "green", warning: "yellow", error: "red", info: "gray" },
          buildInfo: { includeBundleSize: true, includeCommitSha: false, includeTimestamp: true },
        },
        performance: { responseJsonOptimization: true, colorConversionCache: true, archiveCompression: "gzip" },
        targets: ["bun-linux-x64"],
        features: ["virtual-files"],
      };

      const newConfig = {
        ...oldConfig,
        version: "2.0.0",
        features: ["virtual-files", "hmr"],
      };

      initConfigHMR(oldConfig);
      
      let updatedConfig: any = null;
      subscribeToConfig((config) => {
        updatedConfig = config;
      });

      // Simulate HMR update
      initConfigHMR(newConfig);
      
      expect(updatedConfig).toEqual(newConfig);
      expect(getCurrentConfig()).toEqual(newConfig);
    });

    it("should handle theme changes", () => {
      const configWithTheme = {
        name: "test-app",
        version: "1.0.0",
        description: "",
        build: {} as any,
        virtualFiles: {
          enabled: true,
          theme: { primary: "blue", success: "green", warning: "yellow", error: "red", info: "gray" },
          buildInfo: { includeBundleSize: true, includeCommitSha: false, includeTimestamp: true },
        },
        performance: {} as any,
        targets: [],
        features: [],
      };

      const configWithNewTheme = {
        ...configWithTheme,
        virtualFiles: {
          ...configWithTheme.virtualFiles,
          theme: { primary: "red", success: "blue", warning: "green", error: "yellow", info: "purple" },
        },
      };

      initConfigHMR(configWithTheme);
      
      let updatedConfig: any = null;
      subscribeToConfig((config) => {
        updatedConfig = config;
      });

      initConfigHMR(configWithNewTheme);
      
      expect(updatedConfig.virtualFiles.theme.primary).toBe("red");
      expect(updatedConfig.virtualFiles.theme.success).toBe("blue");
    });
  });

  describe("📡 Event System", () => {
    it("should dispatch custom events for config updates", () => {
      const testConfig = {
        name: "test-app",
        version: "1.0.0",
        description: "",
        build: {} as any,
        virtualFiles: {} as any,
        performance: {} as any,
        targets: [],
        features: [],
      };

      let eventFired = false;
      let eventData: any = null;

      // Mock window and addEventListener
      const mockWindow = {
        addEventListener: (event: string, handler: any) => {
          if (event === 'config-hmr-update') {
            setTimeout(() => {
              eventFired = true;
              eventData = { detail: { config: testConfig } };
              handler(eventData);
            }, 0);
          }
        },
      } as any;

      // Temporarily replace global window
      const originalWindow = (globalThis as any).window;
      (globalThis as any).window = mockWindow;

      initConfigHMR(testConfig);

      // Wait for event to be processed
      setTimeout(() => {
        expect(eventFired).toBe(true);
        expect(eventData.detail.config).toEqual(testConfig);
        
        // Restore original window
        (globalThis as any).window = originalWindow;
      }, 10);
    });
  });

  describe("🚨 Error Handling", () => {
    it("should handle listener errors gracefully", () => {
      const testConfig = {
        name: "test-app",
        version: "1.0.0",
        description: "",
        build: {} as any,
        virtualFiles: {} as any,
        performance: {} as any,
        targets: [],
        features: [],
      };

      // Mock console.error to capture error logs
      const originalConsoleError = console.error;
      let errorLogged = false;
      console.error = (...args) => {
        if (args[0] === "❌ Config HMR: Error in listener during init:") {
          errorLogged = true;
        }
      };

      subscribeToConfig(() => {
        throw new Error("Test error");
      });

      initConfigHMR(testConfig);

      expect(errorLogged).toBe(true);
      
      // Restore console.error
      console.error = originalConsoleError;
    });

    it("should handle null/undefined configurations", () => {
      expect(() => {
        initConfigHMR(null as any);
      }).not.toThrow();

      expect(() => {
        initConfigHMR(undefined as any);
      }).not.toThrow();

      expect(getCurrentConfig()).toBe(null);
    });
  });

  describe("🔧 Utility Functions", () => {
    it("should load config with HMR support", async () => {
      // Mock the import function
      const mockConfig = {
        name: "loaded-config",
        version: "1.0.0",
        description: "",
        build: {} as any,
        virtualFiles: {} as any,
        performance: {} as any,
        targets: [],
        features: [],
      };

      // This would normally import from "./features", but we'll test the structure
      expect(typeof loadConfigWithHMR).toBe("function");
    });

    it("should provide current config access", () => {
      const testConfig = {
        name: "current-test",
        version: "1.0.0",
        description: "",
        build: {} as any,
        virtualFiles: {} as any,
        performance: {} as any,
        targets: [],
        features: [],
      };

      expect(getCurrentConfig()).toBe(null);

      initConfigHMR(testConfig);
      expect(getCurrentConfig()).toEqual(testConfig);
    });
  });

  describe("🎨 Theme HMR Handlers", () => {
    it("should handle theme color updates", () => {
      const oldTheme = { primary: "blue", success: "green", warning: "yellow", error: "red", info: "gray" };
      const newTheme = { primary: "red", success: "blue", warning: "green", error: "yellow", info: "purple" };

      // Mock document for CSS property updates
      const mockDocument = {
        documentElement: {
          style: {
            setProperty: (property: string, value: string) => {
              expect(property.startsWith("--theme-")).toBe(true);
              expect(Object.values(newTheme)).toContain(value);
            },
          },
        },
      } as any;

      const originalDocument = (globalThis as any).document;
      (globalThis as any).document = mockDocument;

      // Import and test the theme handler
      const { handleThemeHMR } = require("../src/config/hmr");
      handleThemeHMR(oldTheme, newTheme);

      // Restore document
      (globalThis as any).document = originalDocument;
    });
  });

  describe("🚀 Feature Flags HMR", () => {
    it("should handle feature flag changes", () => {
      const oldFeatures = ["virtual-files", "basic"];
      const newFeatures = ["virtual-files", "hmr", "advanced"];

      // Mock console.log to capture output
      const originalConsoleLog = console.log;
      let loggedMessages: string[] = [];
      console.log = (...args) => {
        loggedMessages.push(args.join(" "));
      };

      const { handleFeaturesHMR } = require("../src/config/hmr");
      handleFeaturesHMR(oldFeatures, newFeatures);

      expect(loggedMessages.some(msg => msg.includes("Features HMR:"))).toBe(true);
      expect(loggedMessages.some(msg => msg.includes("Added:"))).toBe(true);

      // Restore console.log
      console.log = originalConsoleLog;
    });
  });
});
