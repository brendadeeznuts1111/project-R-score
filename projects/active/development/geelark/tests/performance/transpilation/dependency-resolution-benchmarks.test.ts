#!/usr/bin/env bun

/**
 * Bun Dependency Resolution Benchmarks
 * Performance tests for module resolution, package loading, and dependency management
 *
 * Run with: bun test tests/performance/transpilation/dependency-resolution-benchmarks.test.ts
 */

// @ts-ignore - Bun types are available at runtime
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { PerformanceTracker } from "../../../src/core/benchmark.js";

describe("📦 Bun Dependency Resolution Benchmarks", () => {

  beforeEach(() => {
    // Clean environment before each test
    // @ts-ignore - Bun.gc is available at runtime
    Bun.gc(true);
  });

  afterEach(() => {
    // Clean environment after each test
    // @ts-ignore - Bun.gc is available at runtime
    Bun.gc(true);
  });

  describe("🔍 Module Resolution Algorithms", () => {

    it("should benchmark bare specifier resolution", () => {
      const bareSpecifiers = [
        "react",
        "lodash",
        "axios",
        "@types/react",
        "express",
        "typescript",
        "eslint",
        "prettier"
      ];

      const result = PerformanceTracker.measure(() => {
        // Simulate bare specifier resolution
        const resolvedModules = bareSpecifiers.map(specifier => {
          // Simulate node_modules lookup
          const possiblePaths = [
            `node_modules/${specifier}/package.json`,
            `node_modules/${specifier}/index.js`,
            `node_modules/${specifier}/index.ts`,
            `node_modules/${specifier}/dist/index.js`
          ];

          // Simulate resolution time
          const resolutionTime = Math.random() * 5; // 0-5ms

          return {
            specifier,
            resolved: possiblePaths[0], // First match
            resolutionTime,
            isTypeOnly: specifier.startsWith('@types/')
          };
        });

        return resolvedModules;
      }, "Bare specifier resolution");

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(8);
      result.forEach(module => {
        expect(module).toHaveProperty("specifier");
        expect(module).toHaveProperty("resolved");
        expect(module).toHaveProperty("resolutionTime");
      });
    });

    it("should benchmark relative path resolution", () => {
      const relativePaths = [
        "./utils",
        "../components/Button",
        "./types/index.ts",
        "../services/api.ts",
        "../../config/database",
        "./styles.module.css",
        "../assets/logo.png",
        "./vendor/library.js"
      ];

      const result = PerformanceTracker.measure(() => {
        // Simulate relative path resolution
        const resolvedPaths = relativePaths.map(path => {
          // Simulate path normalization and resolution
          const normalized = path
            .replace(/\.\//g, '')
            .replace(/\.\.\//g, '../')
            .replace(/\.(ts|js|tsx|jsx)$/, '');

          const extensions = ['.js', '.ts', '.jsx', '.tsx', '/index.js', '/index.ts'];
          const resolved = `${normalized}${extensions[0]}`;

          return {
            original: path,
            normalized,
            resolved,
            hasExtension: /\.[a-z]+$/.test(path)
          };
        });

        return resolvedPaths;
      }, "Relative path resolution");

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(8);
    });

    it("should benchmark conditional exports resolution", () => {
      const packageWithConditionalExports = {
        name: "example-package",
        exports: {
          ".": {
            "import": "./dist/esm/index.js",
            "require": "./dist/cjs/index.js",
            "types": "./dist/types/index.d.ts"
          },
          "./client": {
            "import": "./dist/esm/client.js",
            "require": "./dist/cjs/client.js",
            "browser": "./dist/browser/client.js"
          },
          "./server": {
            "import": "./dist/esm/server.js",
            "require": "./dist/cjs/server.js",
            "node": "./dist/node/server.js"
          }
        }
      };

      const conditions = ["import", "require", "types", "browser", "node"];

      const result = PerformanceTracker.measure(() => {
        // Simulate conditional exports resolution
        const resolutions = [];

        for (const [exportPath, exportConfig] of Object.entries(packageWithConditionalExports.exports)) {
          for (const condition of conditions) {
            if (exportConfig[condition]) {
              resolutions.push({
                export: exportPath,
                condition,
                resolved: exportConfig[condition],
                priority: condition === "import" ? 1 : condition === "require" ? 2 : 3
              });
            }
          }
        }

        return resolutions;
      }, "Conditional exports resolution");

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(5);
    });
  });

  describe("📁 Package.json Processing", () => {

    it("should benchmark package.json parsing", () => {
      const complexPackageJson = {
        name: "complex-app",
        version: "1.2.3",
        description: "A complex application with many dependencies",
        main: "./dist/index.js",
        module: "./dist/index.esm.js",
        types: "./dist/index.d.ts",
        exports: {
          ".": {
            "import": "./dist/index.esm.js",
            "require": "./dist/index.js",
            "types": "./dist/index.d.ts"
          },
          "./client": "./dist/client.js",
          "./server": "./dist/server.js"
        },
        scripts: {
          "build": "bun build src/index.ts --outdir dist",
          "dev": "bun --watch src/index.ts",
          "test": "bun test",
          "lint": "eslint src/**/*.ts",
          "type-check": "tsc --noEmit"
        },
        dependencies: {
          "react": "^18.2.0",
          "react-dom": "^18.2.0",
          "express": "^4.18.2",
          "lodash": "^4.17.21",
          "axios": "^1.4.0",
          "moment": "^2.29.4",
          "uuid": "^9.0.0"
        },
        devDependencies: {
          "@types/react": "^18.2.0",
          "@types/react-dom": "^18.2.0",
          "@types/express": "^4.17.17",
          "@types/lodash": "^4.14.195",
          "typescript": "^5.1.0",
          "eslint": "^8.44.0",
          "prettier": "^3.0.0"
        },
        peerDependencies: {
          "react": ">=16.8.0",
          "react-dom": ">=16.8.0"
        },
        engines: {
          "node": ">=16.0.0",
          "bun": ">=0.6.0"
        }
      };

      const result = PerformanceTracker.measure(() => {
        // Simulate package.json processing
        const processed = {
          name: complexPackageJson.name,
          version: complexPackageJson.version,
          entryPoints: {
            main: complexPackageJson.main,
            module: complexPackageJson.module,
            types: complexPackageJson.types
          },
          dependencyCount: Object.keys(complexPackageJson.dependencies || {}).length,
          devDependencyCount: Object.keys(complexPackageJson.devDependencies || {}).length,
          peerDependencyCount: Object.keys(complexPackageJson.peerDependencies || {}).length,
          scriptCount: Object.keys(complexPackageJson.scripts || {}).length,
          hasExports: !!complexPackageJson.exports,
          exportCount: complexPackageJson.exports ? Object.keys(complexPackageJson.exports).length : 0
        };

        return processed;
      }, "Package.json parsing");

      expect(result.name).toBe("complex-app");
      expect(result.dependencyCount).toBe(7);
      expect(result.devDependencyCount).toBe(7);
      expect(result.scriptCount).toBe(5);
      expect(result.hasExports).toBe(true);
    });

    it("should benchmark workspace resolution", () => {
      const workspaceConfig = {
        packages: [
          "packages/*",
          "apps/*",
          "tools/*"
        ]
      };

      const mockPackages = [
        { name: "@my-app/core", path: "packages/core", version: "1.0.0" },
        { name: "@my-app/ui", path: "packages/ui", version: "1.0.0" },
        { name: "@my-app/utils", path: "packages/utils", version: "1.0.0" },
        { name: "@my-app/web", path: "apps/web", version: "1.0.0" },
        { name: "@my-app/api", path: "apps/api", version: "1.0.0" },
        { name: "@my-app/cli", path: "tools/cli", version: "1.0.0" }
      ];

      const result = PerformanceTracker.measure(() => {
        // Simulate workspace resolution
        const workspaceMap = new Map();

        mockPackages.forEach(pkg => {
          workspaceMap.set(pkg.name, {
            path: pkg.path,
            version: pkg.version,
            isInternal: true,
            category: pkg.path.split('/')[0] // packages, apps, tools
          });
        });

        return {
          packageCount: workspaceMap.size,
          packages: Array.from(workspaceMap.entries()).map(([name, info]) => ({
            name,
            ...info
          })),
          categories: ['packages', 'apps', 'tools'].map(category => ({
            category,
            count: mockPackages.filter(pkg => pkg.path.startsWith(category)).length
          }))
        };
      }, "Workspace resolution");

      expect(result.packageCount).toBe(6);
      expect(result.packages).toHaveLength(6);
      expect(result.categories).toHaveLength(3);
    });
  });

  describe("🔄 Import Performance", () => {

    it("should benchmark different import patterns", () => {
      const importPatterns = {
        namedImports: "import { useState, useEffect } from 'react';",
        defaultImport: "import React from 'react';",
        namespaceImport: "import * as Utils from './utils';",
        mixedImports: "import React, { Component } from 'react';",
        typeOnlyImport: "import type { User, Product } from './types';",
        dynamicImport: "const module = await import('./module');",
        requireCall: "const module = require('module');",
        requireResolve: "const path = require.resolve('module');"
      };

      const results = PerformanceTracker.measure(() => {
        // @ts-ignore - Bun.Transpiler is available at runtime
        const transpiler = new Bun.Transpiler({ loader: "ts" });

        const patternResults = Object.entries(importPatterns).map(([pattern, code]) => {
          const scanned = transpiler.scanImports(code);
          return {
            pattern,
            code,
            importCount: scanned.length,
            importTypes: scanned.map(imp => imp.kind),
            transpileTime: performance.now()
          };
        });

        return patternResults;
      }, "Import pattern analysis");

      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(8);

      results.forEach(result => {
        expect(result).toHaveProperty("pattern");
        expect(result).toHaveProperty("importCount");
        expect(Array.isArray(result.importTypes)).toBe(true);
      });
    });

    it("should benchmark circular dependency detection", () => {
      const dependencyGraph = {
        "index.ts": ["./utils", "./components/App"],
        "utils/index.ts": ["./helpers", "./types"],
        "utils/helpers.ts": ["../types"],
        "components/App.tsx": ["../utils", "./Button"],
        "components/Button.tsx": ["../utils"],
        "types/index.ts": [] // No dependencies
      };

      const result = PerformanceTracker.measure(() => {
        // Simulate circular dependency detection
        const visited = new Set();
        const recursionStack = new Set();
        const circularDeps = [];

        function detectCircular(module: string, path: string[]): void {
          if (recursionStack.has(module)) {
            const cycleStart = path.indexOf(module);
            circularDeps.push([...path.slice(cycleStart), module]);
            return;
          }

          if (visited.has(module)) return;

          visited.add(module);
          recursionStack.add(module);

          const deps = dependencyGraph[module] || [];
          for (const dep of deps) {
            detectCircular(dep, [...path, module]);
          }

          recursionStack.delete(module);
        }

        // Check all modules
        Object.keys(dependencyGraph).forEach(module => {
          if (!visited.has(module)) {
            detectCircular(module, []);
          }
        });

        return {
          totalModules: Object.keys(dependencyGraph).length,
          circularDependencies: circularDeps,
          hasCircularDeps: circularDeps.length > 0
        };
      }, "Circular dependency detection");

      expect(result.totalModules).toBe(6);
      expect(Array.isArray(result.circularDependencies)).toBe(true);
      expect(typeof result.hasCircularDeps).toBe("boolean");
    });
  });

  describe("⚡ Loading Performance", () => {

    it("should benchmark module loading strategies", async () => {
      const strategies = [
        { name: "ESM import", code: "import { module } from 'package';", type: "esm" },
        { name: "CommonJS require", code: "const module = require('package');", type: "cjs" },
        { name: "Dynamic import", code: "const module = await import('package');", type: "dynamic" },
        { name: "Conditional import", code: "if (process.env.NODE_ENV === 'development') { import('./dev'); }", type: "conditional" }
      ];

      const results = await PerformanceTracker.measureAsync(async () => {
        // Simulate different loading strategies
        const strategyResults = [];

        for (const strategy of strategies) {
          const startTime = performance.now();

          // Simulate loading time based on strategy
          let loadTime = 0;
          switch (strategy.type) {
            case "esm":
              loadTime = Math.random() * 10 + 5; // 5-15ms
              break;
            case "cjs":
              loadTime = Math.random() * 8 + 3; // 3-11ms
              break;
            case "dynamic":
              loadTime = Math.random() * 15 + 10; // 10-25ms
              break;
            case "conditional":
              loadTime = Math.random() * 5 + 2; // 2-7ms
              break;
          }

          await new Promise(resolve => setTimeout(resolve, loadTime));

          const endTime = performance.now();

          strategyResults.push({
            strategy: strategy.name,
            type: strategy.type,
            simulatedLoadTime: loadTime,
            actualTime: endTime - startTime,
            code: strategy.code
          });
        }

        return strategyResults;
      }, "Module loading strategies");

      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(4);

      results.forEach(result => {
        expect(result).toHaveProperty("strategy");
        expect(result).toHaveProperty("simulatedLoadTime");
        expect(result.simulatedLoadTime).toBeGreaterThan(0);
      });
    });

    it("should benchmark tree shaking simulation", () => {
      const largeModule = {
        exports: [
          "usedFunction1", "usedFunction2", "usedFunction3",
          "unusedFunction1", "unusedFunction2", "unusedFunction3",
          "unusedFunction4", "unusedFunction5", "unusedFunction6",
          "usedUtility1", "usedUtility2",
          "unusedUtility1", "unusedUtility2", "unusedUtility3"
        ],
        usedExports: ["usedFunction1", "usedFunction2", "usedFunction3", "usedUtility1", "usedUtility2"]
      };

      const result = PerformanceTracker.measure(() => {
        // Simulate tree shaking
        const { exports, usedExports } = largeModule;

        // Identify unused exports
        const unusedExports = exports.filter(exp => !usedExports.includes(exp));

        // Calculate bundle size reduction
        const originalSize = exports.length * 100; // Assume 100 bytes per export
        const finalSize = usedExports.length * 100;
        const reduction = originalSize - finalSize;
        const reductionPercentage = (reduction / originalSize) * 100;

        return {
          originalExports: exports.length,
          usedExports: usedExports.length,
          unusedExports: unusedExports.length,
          originalSize,
          finalSize,
          reduction,
          reductionPercentage
        };
      }, "Tree shaking simulation");

      expect(result.originalExports).toBe(14);
      expect(result.usedExports).toBe(5);
      expect(result.unusedExports).toBe(9);
      expect(result.reductionPercentage).toBeGreaterThan(50);
    });
  });

  describe("🌐 Network Resolution", () => {

    it("should benchmark URL resolution", () => {
      const testUrls = [
        "https://cdn.example.com/lib.js",
        "/api/users",
        "./relative/path.js",
        "../parent/path.js",
        "https://api.example.com/v1/data",
        "/static/assets/image.png",
        "https://fonts.googleapis.com/css2?family=Inter"
      ];

      const result = PerformanceTracker.measure(() => {
        // Simulate URL resolution
        const resolvedUrls = testUrls.map(url => {
          const isAbsolute = url.startsWith('http');
          const isRelative = url.startsWith('./');
          const isRootRelative = url.startsWith('/');
          const isExternal = isAbsolute && !url.includes('localhost'); // Simplified for test environment

          return {
            original: url,
            isAbsolute,
            isRelative,
            isRootRelative,
            isExternal,
            protocol: isAbsolute ? new URL(url).protocol : null,
            hostname: isAbsolute ? new URL(url).hostname : null
          };
        });

        return resolvedUrls;
      }, "URL resolution");

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(7);

      result.forEach(resolved => {
        expect(resolved).toHaveProperty("original");
        expect(typeof resolved.isAbsolute).toBe("boolean");
        expect(typeof resolved.isExternal).toBe("boolean");
      });
    });

    it("should benchmark CDN fallback resolution", () => {
      const cdnProviders = [
        { name: "jsdelivr", url: "https://cdn.jsdelivr.net/npm/{package}@{version}" },
        { name: "unpkg", url: "https://unpkg.com/{package}@{version}" },
        { name: "skypack", url: "https://cdn.skypack.dev/{package}@{version}" },
        { name: "esm.sh", url: "https://esm.sh/{package}@{version}" }
      ];

      const packages = ["react", "lodash", "axios", "moment"];

      const result = PerformanceTracker.measure(() => {
        // Simulate CDN fallback resolution
        const resolutions = [];

        for (const pkg of packages) {
          for (const cdn of cdnProviders) {
            const resolvedUrl = cdn.url
              .replace('{package}', pkg)
              .replace('{version}', 'latest');

            resolutions.push({
              package: pkg,
              cdn: cdn.name,
              resolvedUrl,
              priority: cdnProviders.indexOf(cdn)
            });
          }
        }

        return resolutions;
      }, "CDN fallback resolution");

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(16); // 4 packages × 4 CDNs

      result.forEach(resolution => {
        expect(resolution).toHaveProperty("package");
        expect(resolution).toHaveProperty("cdn");
        expect(resolution.resolvedUrl).toContain(resolution.package);
      });
    });
  });
});
