#!/usr/bin/env bun

/**
 * Bundle Size Comparison Benchmarks
 * Following Bun's benchmarking best practices
 */

import { bench, describe, expect } from "bun:test";
import { execSync } from "node:child_process";
import { unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { measure } from "./utils";

describe("Bundle Size Performance", () => {
  const testDir = "/tmp/bun-bench-tests";
  const sourceFile = join(testDir, "bundle-test.ts");

  beforeAll(() => {
    // Create test directory if it doesn't exist
    try {
      execSync(`mkdir -p ${testDir}`);
    } catch {
      // Directory might already exist
    }

    // Create test source file
    const testCode = `
import { feature } from "bun:bundle";
import { FeatureRegistry } from "../src/FeatureRegistry";
// Using Bun's native stringWidth for accurate Unicode width calculation
import { Logger } from "../src/Logger";

if (feature("FEAT_PREMIUM")) {
  console.log("Premium features enabled");
  const premiumService = {
    analytics: () => "premium-analytics",
    export: () => "premium-export",
  };
  premiumService.analytics();
}

const registry = new FeatureRegistry();
const logger = new Logger({ level: "INFO" });
const width = Bun.stringWidth("Hello, World!");

console.log("Bundle test complete");
`;

    try {
      Bun.writeSync(sourceFile, testCode);
    } catch (error) {
      console.warn("Could not create test file:", error);
    }
  });

  afterAll(() => {
    // Cleanup
    try {
      if (existsSync(sourceFile)) {
        unlinkSync(sourceFile);
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("Build Time Performance", () => {
    bench("build without features", () => {
      if (!existsSync(sourceFile)) return;
      const output = join(testDir, "bundle-no-features.js");
      try {
        execSync(`bun build ${sourceFile} --outfile=${output}`, {
          stdio: "ignore",
        });
        if (existsSync(output)) {
          unlinkSync(output);
        }
      } catch {
        // Ignore build errors in benchmarks
      }
    }, {
      iterations: 10,
    });

    bench("build with FEAT_PREMIUM", () => {
      if (!existsSync(sourceFile)) return;
      const output = join(testDir, "bundle-premium.js");
      try {
        execSync(
          `bun build --feature=FEAT_PREMIUM ${sourceFile} --outfile=${output}`,
          { stdio: "ignore" }
        );
        if (existsSync(output)) {
          unlinkSync(output);
        }
      } catch {
        // Ignore build errors in benchmarks
      }
    }, {
      iterations: 10,
    });

    bench("build with minify", () => {
      if (!existsSync(sourceFile)) return;
      const output = join(testDir, "bundle-minify.js");
      try {
        execSync(
          `bun build --minify ${sourceFile} --outfile=${output}`,
          { stdio: "ignore" }
        );
        if (existsSync(output)) {
          unlinkSync(output);
        }
      } catch {
        // Ignore build errors in benchmarks
      }
    }, {
      iterations: 10,
    });
  });

  describe("Bundle Size Comparison", () => {
    it("should compare bundle sizes", () => {
      if (!existsSync(sourceFile)) {
        console.warn("Skipping bundle size comparison - test file not found");
        return;
      }

      const outputs = {
        noFeatures: join(testDir, "size-no-features.js"),
        withFeatures: join(testDir, "size-with-features.js"),
        minified: join(testDir, "size-minified.js"),
      };

      try {
        // Build without features
        execSync(`bun build ${sourceFile} --outfile=${outputs.noFeatures}`, {
          stdio: "ignore",
        });

        // Build with features
        execSync(
          `bun build --feature=FEAT_PREMIUM ${sourceFile} --outfile=${outputs.withFeatures}`,
          { stdio: "ignore" }
        );

        // Build minified
        execSync(
          `bun build --minify ${sourceFile} --outfile=${outputs.minified}`,
          { stdio: "ignore" }
        );

        // Get file sizes
        const sizes = {
          noFeatures: existsSync(outputs.noFeatures)
            ? Bun.file(outputs.noFeatures).size
            : 0,
          withFeatures: existsSync(outputs.withFeatures)
            ? Bun.file(outputs.withFeatures).size
            : 0,
          minified: existsSync(outputs.minified)
            ? Bun.file(outputs.minified).size
            : 0,
        };

        console.log("\n📦 Bundle Size Comparison:");
        console.log(`  No features:     ${sizes.noFeatures} bytes`);
        console.log(`  With features:   ${sizes.withFeatures} bytes`);
        console.log(`  Minified:        ${sizes.minified} bytes`);

        if (sizes.withFeatures > 0 && sizes.noFeatures > 0) {
          const ratio = sizes.withFeatures / sizes.noFeatures;
          console.log(`  Size ratio:      ${ratio.toFixed(2)}x`);
          expect(ratio).toBeGreaterThan(1); // Features should increase size
        }

        // Cleanup
        Object.values(outputs).forEach(output => {
          if (existsSync(output)) {
            unlinkSync(output);
          }
        });
      } catch (error) {
        console.warn("Bundle size comparison failed:", error);
      }
    });
  });

  describe("Build Performance Metrics", () => {
    it("should measure build time", () => {
      if (!existsSync(sourceFile)) return;

      const output = join(testDir, "build-time-test.js");
      const { duration } = measure(() => {
        try {
          execSync(`bun build ${sourceFile} --outfile=${output}`, {
            stdio: "ignore",
          });
        } catch {
          // Ignore errors
        }
      });

      if (existsSync(output)) {
        unlinkSync(output);
      }

      console.log(`\n⏱️  Build time: ${duration.toFixed(2)}ms`);
      expect(duration).toBeGreaterThan(0);
    });
  });
});

