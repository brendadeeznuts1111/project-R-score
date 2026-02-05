#!/usr/bin/env bun

/**
 * Bun Package.json Script Execution Benchmarks
 * Performance tests for package.json script execution, filtering, and optimization
 *
 * Run with: bun test tests/performance/package-scripts/package-json-benchmarks.test.ts
 */

// @ts-ignore - Bun types are available at runtime
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { PerformanceTracker } from "../../../src/core/benchmark.js";

describe("📦 Bun Package.json Script Execution Benchmarks", () => {

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

  describe("🚀 Script Execution Performance", () => {

    it("should benchmark simple script execution", () => {
      const mockPackageJson = {
        scripts: {
          "clean": "rm -rf dist && echo 'Done.'",
          "dev": "bun server.ts",
          "build": "bun build src/index.ts --outdir dist",
          "test": "bun test",
          "lint": "eslint src/**/*.ts"
        }
      };

      const result = PerformanceTracker.measure(() => {
        // Simulate script execution time measurement
        const scriptTimes = Object.entries(mockPackageJson.scripts).map(([name, script]) => {
          const complexity = script.split(' ').length; // Simple complexity metric
          const simulatedTime = complexity * Math.random() * 5 + 1; // 1-6ms per word

          return {
            name,
            script,
            complexity,
            executionTime: simulatedTime
          };
        });

        return {
          totalScripts: scriptTimes.length,
          averageTime: scriptTimes.reduce((sum, s) => sum + s.executionTime, 0) / scriptTimes.length,
          scripts: scriptTimes
        };
      }, "Simple script execution analysis");

      expect(result.totalScripts).toBe(5);
      expect(result.averageTime).toBeGreaterThan(0);
      expect(result.scripts).toHaveLength(5);
    });

    it("should benchmark script with arguments", () => {
      const scriptsWithArgs = {
        "build:prod": "bun build src/index.ts --outdir dist --minify",
        "build:dev": "bun build src/index.ts --outdir dist --dev",
        "test:watch": "bun test --watch",
        "test:coverage": "bun test --coverage",
        "dev:debug": "bun --inspect src/index.ts"
      };

      const result = PerformanceTracker.measure(() => {
        // Simulate argument parsing and execution
        const parsedScripts = Object.entries(scriptsWithArgs).map(([name, script]) => {
          const parts = script.split(' ');
          const command = parts[0];
          const args = parts.slice(1);

          // Simulate execution time based on arguments
          const argComplexity = args.reduce((sum, arg) => {
            if (arg.startsWith('--')) sum += 2; // Flags are more complex
            else if (arg.includes('.')) sum += 1; // Files
            else sum += 0.5; // Simple args
            return sum;
          }, 0);

          return {
            name,
            command,
            args,
            argCount: args.length,
            argComplexity,
            simulatedTime: argComplexity * 3 + Math.random() * 10
          };
        });

        return {
          scripts: parsedScripts,
          totalArgs: parsedScripts.reduce((sum, s) => sum + s.argCount, 0),
          averageComplexity: parsedScripts.reduce((sum, s) => sum + s.argComplexity, 0) / parsedScripts.length
        };
      }, "Script with arguments analysis");

      expect(result.scripts).toHaveLength(5);
      expect(result.totalArgs).toBeGreaterThan(5);
      expect(result.averageComplexity).toBeGreaterThan(0);
    });

    it("should benchmark lifecycle script execution", () => {
      const lifecycleScripts = {
        "prebuild": "echo 'Starting build process...'",
        "build": "bun build src/index.ts --outdir dist",
        "postbuild": "echo 'Build completed successfully!'",
        "pretest": "bun run lint",
        "test": "bun test",
        "posttest": "bun run coverage",
        "start": "bun src/index.ts"
      };

      const result = PerformanceTracker.measure(() => {
        // Simulate lifecycle script execution order
        const executionOrder = [
          { phase: 'pre', scripts: [] },
          { phase: 'main', scripts: [] },
          { phase: 'post', scripts: [] }
        ];

        Object.entries(lifecycleScripts).forEach(([name, script]) => {
          if (name.startsWith('pre')) {
            executionOrder[0].scripts.push({ name, script });
          } else if (name.startsWith('post')) {
            executionOrder[2].scripts.push({ name, script });
          } else {
            executionOrder[1].scripts.push({ name, script });
          }
        });

        // Calculate total execution time
        const totalTime = executionOrder.reduce((total, phase) => {
          return total + phase.scripts.length * (5 + Math.random() * 10);
        }, 0);

        return {
          phases: executionOrder,
          totalPhases: executionOrder.filter(p => p.scripts.length > 0).length,
          totalScripts: Object.keys(lifecycleScripts).length,
          simulatedTotalTime: totalTime
        };
      }, "Lifecycle script execution");

      expect(result.totalScripts).toBe(7);
      expect(result.totalPhases).toBe(3);
      expect(result.phases[0].scripts.length).toBe(2); // pre scripts
      expect(result.phases[2].scripts.length).toBe(2); // post scripts
    });
  });

  describe("🔍 Script Filtering and Discovery", () => {

    it("should benchmark script filtering performance", () => {
      const largePackageJson = {
        scripts: {
          "build": "bun build src/index.ts --outdir dist",
          "build:dev": "bun build src/index.ts --outdir dist --dev",
          "build:prod": "bun build src/index.ts --outdir dist --minify",
          "build:analyze": "bun build src/index.ts --analyze",
          "test": "bun test",
          "test:unit": "bun test tests/unit",
          "test:integration": "bun test tests/integration",
          "test:e2e": "bun test tests/e2e",
          "test:coverage": "bun test --coverage",
          "dev": "bun src/index.ts",
          "dev:debug": "bun --inspect src/index.ts",
          "dev:watch": "bun --watch src/index.ts",
          "lint": "eslint src/**/*.ts",
          "lint:fix": "eslint src/**/*.ts --fix",
          "clean": "rm -rf dist",
          "start": "bun src/index.ts",
          "deploy": "bun run build && npm publish"
        }
      };

      const filters = ["build*", "test*", "dev*", "*"];

      const result = PerformanceTracker.measure(() => {
        // Simulate script filtering
        const filterResults = filters.map(filter => {
          const regex = new RegExp(filter.replace('*', '.*'));
          const matchedScripts = Object.keys(largePackageJson.scripts).filter(script =>
            regex.test(script)
          );

          return {
            filter,
            pattern: regex,
            matchedCount: matchedScripts.length,
            matches: matchedScripts
          };
        });

        return {
          totalScripts: Object.keys(largePackageJson.scripts).length,
          filterResults,
          averageMatches: filterResults.reduce((sum, f) => sum + f.matchedCount, 0) / filterResults.length
        };
      }, "Script filtering performance");

      expect(result.totalScripts).toBe(17);
      expect(result.filterResults).toHaveLength(4);

      const buildFilter = result.filterResults.find(f => f.filter === "build*");
      expect(buildFilter?.matchedCount).toBe(4);

      const testFilter = result.filterResults.find(f => f.filter === "test*");
      expect(testFilter?.matchedCount).toBe(5);
    });

    it("should benchmark script discovery and validation", () => {
      const packageJsonWithScripts = {
        scripts: {
          "valid": "bun run index.ts",
          "invalid": "",
          "complex": "bun build src/index.ts --outdir dist --minify --target=browser",
          "with-args": "bun test --coverage --reporter=json",
          "chain": "bun run clean && bun run build && bun run test"
        }
      };

      const result = PerformanceTracker.measure(() => {
        // Simulate script discovery and validation
        const scriptAnalysis = Object.entries(packageJsonWithScripts.scripts).map(([name, script]) => {
          const isValid = script.trim().length > 0;
          const hasArgs = script.includes(' --');
          const isChained = script.includes('&&');
          const wordCount = script.split(' ').length;
          const complexity = wordCount + (hasArgs ? 2 : 0) + (isChained ? 3 : 0);

          return {
            name,
            script,
            isValid,
            hasArgs,
            isChained,
            wordCount,
            complexity
          };
        });

        const validScripts = scriptAnalysis.filter(s => s.isValid);
        const complexScripts = scriptAnalysis.filter(s => s.complexity > 5);

        return {
          totalScripts: scriptAnalysis.length,
          validScripts: validScripts.length,
          complexScripts: complexScripts.length,
          averageComplexity: scriptAnalysis.reduce((sum, s) => sum + s.complexity, 0) / scriptAnalysis.length,
          scripts: scriptAnalysis
        };
      }, "Script discovery and validation");

      expect(result.totalScripts).toBe(5);
      expect(result.validScripts).toBe(4); // One empty script
      expect(result.complexScripts).toBeGreaterThan(0);
    });
  });

  describe("⚡ Performance Optimization", () => {

    it("should benchmark script caching", () => {
      const scripts = {
        "build": "bun build src/index.ts --outdir dist",
        "test": "bun test",
        "lint": "eslint src/**/*.ts"
      };

      const result = PerformanceTracker.measure(() => {
        // Simulate script caching
        const cacheResults = Object.entries(scripts).map(([name, script]) => {
          // First execution (cache miss)
          const firstTime = Math.random() * 50 + 20; // 20-70ms

          // Second execution (cache hit)
          const secondTime = Math.random() * 10 + 5; // 5-15ms

          const speedup = firstTime / secondTime;

          return {
            name,
            script,
            firstTime,
            secondTime,
            speedup,
            cacheHit: true
          };
        });

        return {
          scripts: cacheResults,
          averageSpeedup: cacheResults.reduce((sum, s) => sum + s.speedup, 0) / cacheResults.length,
          totalSpeedup: cacheResults.reduce((sum, s) => sum + s.speedup, 0)
        };
      }, "Script caching performance");

      expect(result.scripts).toHaveLength(3);
      expect(result.averageSpeedup).toBeGreaterThan(1);
      result.scripts.forEach(script => {
        expect(script.speedup).toBeGreaterThan(1);
        expect(script.secondTime).toBeLessThan(script.firstTime);
      });
    });

    it("should benchmark parallel script execution", async () => {
      const independentScripts = {
        "test:unit": "bun test tests/unit",
        "test:integration": "bun test tests/integration",
        "lint:ts": "eslint src/**/*.ts",
        "lint:js": "eslint lib/**/*.js",
        "type-check": "tsc --noEmit"
      };

      const sequentialTime = await PerformanceTracker.measureAsync(async () => {
        // Simulate sequential execution
        let totalTime = 0;
        for (const script of Object.values(independentScripts)) {
          const executionTime = Math.random() * 100 + 50; // 50-150ms
          totalTime += executionTime;
          await new Promise(resolve => setTimeout(resolve, 10)); // Simulate work
        }
        return totalTime;
      }, "Sequential script execution");

      const parallelTime = await PerformanceTracker.measureAsync(async () => {
        // Simulate parallel execution
        const promises = Object.values(independentScripts).map(async (script) => {
          const executionTime = Math.random() * 100 + 50; // 50-150ms
          await new Promise(resolve => setTimeout(resolve, 10)); // Simulate work
          return executionTime;
        });

        const results = await Promise.all(promises);
        return Math.max(...results); // Parallel time is the longest task
      }, "Parallel script execution");

      console.log(`📊 Script execution performance:`);
      console.log(`  Sequential: ${sequentialTime.toFixed(2)}ms`);
      console.log(`  Parallel: ${parallelTime.toFixed(2)}ms`);
      console.log(`  Speedup: ${(sequentialTime / parallelTime).toFixed(2)}x`);

      expect(typeof sequentialTime).toBe("number");
      expect(typeof parallelTime).toBe("number");
      expect(parallelTime).toBeLessThan(sequentialTime);
    });

    it("should benchmark script dependency analysis", () => {
      const scriptsWithDeps = {
        "build": "bun run clean && bun run compile",
        "clean": "rm -rf dist",
        "compile": "bun build src/index.ts --outdir dist",
        "test": "bun run build && bun test:unit",
        "test:unit": "bun test tests/unit",
        "deploy": "bun run test && bun run build && npm publish"
      };

      const result = PerformanceTracker.measure(() => {
        // Build dependency graph
        const dependencyGraph = new Map();

        Object.entries(scriptsWithDeps).forEach(([name, script]) => {
          const deps = [];
          const matches = script.match(/bun run (\w+)/g) || [];

          matches.forEach(match => {
            const depName = match.replace('bun run ', '');
            if (depName !== name) { // Avoid self-reference
              deps.push(depName);
            }
          });

          dependencyGraph.set(name, deps);
        });

        // Calculate execution levels (topological sort simulation)
        const levels = new Map();
        const visited = new Set();

        function calculateLevel(scriptName: string): number {
          if (visited.has(scriptName)) return levels.get(scriptName) || 0;
          visited.add(scriptName);

          const deps = dependencyGraph.get(scriptName) || [];
          const maxDepLevel = deps.length > 0
            ? Math.max(...deps.map(dep => calculateLevel(dep)))
            : 0;

          const level = maxDepLevel + 1;
          levels.set(scriptName, level);
          return level;
        }

        Object.keys(scriptsWithDeps).forEach(script => calculateLevel(script));

        return {
          totalScripts: Object.keys(scriptsWithDeps).length,
          dependencyGraph: Object.fromEntries(dependencyGraph),
          executionLevels: Object.fromEntries(levels),
          maxLevel: Math.max(...Array.from(levels.values())),
          averageDeps: Array.from(dependencyGraph.values()).reduce((sum, deps) => sum + deps.length, 0) / dependencyGraph.size
        };
      }, "Script dependency analysis");

      expect(result.totalScripts).toBe(6);
      expect(result.maxLevel).toBeGreaterThan(1);
      expect(result.averageDeps).toBeGreaterThan(0);
    });
  });

  describe("🌐 Real-world Scenarios", () => {

    it("should benchmark monorepo script execution", () => {
      const monorepoScripts = {
        "build": "bun run build:packages && bun run build:apps",
        "build:packages": "bun run build:core && bun run build:utils && bun run build:ui",
        "build:apps": "bun run build:web && bun run build:api",
        "build:core": "cd packages/core && bun build",
        "build:utils": "cd packages/utils && bun build",
        "build:ui": "cd packages/ui && bun build",
        "build:web": "cd apps/web && bun build",
        "build:api": "cd apps/api && bun build",
        "test": "bun run test:packages && bun run test:apps",
        "test:packages": "bun test packages/*",
        "test:apps": "bun test apps/*",
        "dev": "bun run dev:web & bun run dev:api",
        "dev:web": "cd apps/web && bun dev",
        "dev:api": "cd apps/api && bun dev"
      };

      const result = PerformanceTracker.measure(() => {
        // Analyze monorepo script structure
        const categories = {
          packages: [],
          apps: [],
          root: []
        };

        Object.entries(monorepoScripts).forEach(([name, script]) => {
          if (name.includes('packages')) {
            categories.packages.push({ name, script });
          } else if (name.includes('apps')) {
            categories.apps.push({ name, script });
          } else {
            categories.root.push({ name, script });
          }
        });

        // Calculate complexity based on nested calls
        const complexity = Object.entries(monorepoScripts).map(([name, script]) => {
          const nestedCalls = (script.match(/bun run \w+/g) || []).length;
          const hasParallel = script.includes('&');
          const hasCd = script.includes('cd ');

          return {
            name,
            nestedCalls,
            hasParallel,
            hasCd,
            complexity: nestedCalls * 2 + (hasParallel ? 1 : 0) + (hasCd ? 1 : 0)
          };
        });

        return {
          totalScripts: Object.keys(monorepoScripts).length,
          categories,
          complexity: complexity,
          averageComplexity: complexity.reduce((sum, c) => sum + c.complexity, 0) / complexity.length,
          maxNestedCalls: Math.max(...complexity.map(c => c.nestedCalls))
        };
      }, "Monorepo script execution");

      expect(result.totalScripts).toBe(14);
      expect(result.categories.packages.length).toBeGreaterThan(0);
      expect(result.categories.apps.length).toBeGreaterThan(0);
      expect(result.maxNestedCalls).toBeGreaterThan(1);
    });

    it("should benchmark CI/CD script execution", () => {
      const ciScripts = {
        "ci": "bun run lint && bun run test && bun run build && bun run security",
        "lint": "eslint src/**/*.ts && prettier --check src/**/*.{ts,tsx}",
        "test": "bun test --coverage --reporter=json",
        "build": "bun run build:prod && bun run build:analyze",
        "build:prod": "bun build src/index.ts --outdir dist --minify",
        "build:analyze": "bun build src/index.ts --analyze",
        "security": "bun audit && npm audit --audit-level moderate",
        "deploy:staging": "bun run build && aws s3 sync dist/ s3://staging-bucket/",
        "deploy:prod": "bun run build && aws s3 sync dist/ s3://prod-bucket/",
        "rollback": "aws s3 sync s3://backup-bucket/ s3://prod-bucket/"
      };

      const result = PerformanceTracker.measure(() => {
        // Simulate CI/CD pipeline execution
        const pipelineStages = [
          { name: 'lint', scripts: ['lint'] },
          { name: 'test', scripts: ['test'] },
          { name: 'build', scripts: ['build:prod', 'build:analyze'] },
          { name: 'security', scripts: ['security'] },
          { name: 'deploy', scripts: ['deploy:staging', 'deploy:prod'] }
        ];

        const executionPlan = pipelineStages.map(stage => {
          const stageScripts = stage.scripts.map(scriptName => ciScripts[scriptName]);
          const stageComplexity = stageScripts.reduce((sum, script) => {
            return sum + script.split(' ').length + (script.includes('&&') ? 2 : 0);
          }, 0);

          return {
            stage: stage.name,
            scripts: stage.scripts,
            complexity: stageComplexity,
            estimatedTime: stageComplexity * 10 + Math.random() * 100
          };
        });

        const totalTime = executionPlan.reduce((sum, stage) => sum + stage.estimatedTime, 0);

        return {
          totalScripts: Object.keys(ciScripts).length,
          pipelineStages: executionPlan,
          totalEstimatedTime: totalTime,
          averageStageTime: totalTime / executionPlan.length,
          criticalPath: ['lint', 'test', 'build', 'security', 'deploy']
        };
      }, "CI/CD script execution");

      expect(result.totalScripts).toBe(10);
      expect(result.pipelineStages).toHaveLength(5);
      expect(result.criticalPath).toHaveLength(5);
      expect(result.totalEstimatedTime).toBeGreaterThan(0);
    });
  });

  describe("📊 Memory and Resource Usage", () => {

    it("should analyze memory usage during script execution", () => {
      // @ts-ignore - heapStats is available at runtime via bun:jsc
      const heapStats = globalThis.heapStats || (() => {
        return { heapSize: 0, heapCapacity: 0, objectCount: 0 };
      });

      const beforeMemory = heapStats().heapSize;

      // Simulate complex script execution
      const complexScripts = Array.from({ length: 20 }, (_, i) => {
        return `
        // Script ${i}
        const data${i} = Array.from({ length: 1000 }, j => ({ id: j, value: 'item-' + ${i} + '-' + j }));
        const processed${i} = data${i}.map(item => ({ ...item, processed: true }));
        console.log('Script ${i} processed', processed${i}.length, 'items');
        `;
      }).join('\n');

      // Simulate script processing
      const processedScripts = complexScripts.split('\n').filter(line => line.trim());

      const afterMemory = heapStats().heapSize;

      expect(processedScripts.length).toBeGreaterThan(10);

      if (beforeMemory > 0) {
        console.log(`🧠 Memory usage during script execution:`);
        console.log(`  Before: ${(beforeMemory / 1024).toFixed(2)}KB`);
        console.log(`  After: ${(afterMemory / 1024).toFixed(2)}KB`);
        console.log(`  Delta: ${((afterMemory - beforeMemory) / 1024).toFixed(2)}KB`);
      }
    });
  });
});
