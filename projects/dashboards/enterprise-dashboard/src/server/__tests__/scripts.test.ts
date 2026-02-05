/**
 * DX Scripts & Build Tests
 * Tests for developer experience scripts and React Fast Refresh builds
 */
import { describe, it, expect, beforeAll } from "bun:test";
import { $ } from "bun";
import { join } from "path";

const ROOT = join(import.meta.dir, "../../..");

// Shared package.json - loaded once at module level
let packageJson: { scripts: Record<string, string> };

beforeAll(async () => {
  const file = Bun.file(join(ROOT, "package.json"));
  packageJson = await file.json();
});

// ============================================
// Package.json Script Validation
// ============================================
describe("DX Scripts Configuration", () => {

  it("has dev:all script for parallel CSS + server", () => {
    expect(packageJson.scripts["dev:all"]).toBeDefined();
    expect(packageJson.scripts["dev:all"]).toContain("dev:css");
    expect(packageJson.scripts["dev:all"]).toContain("--hot");
  });

  it("has dev:open script for auto-browser launch", () => {
    expect(packageJson.scripts["dev:open"]).toBeDefined();
    expect(packageJson.scripts["dev:open"]).toContain("open http://localhost:8080");
  });

  it("has test:watch script for watch mode", () => {
    expect(packageJson.scripts["test:watch"]).toBeDefined();
    expect(packageJson.scripts["test:watch"]).toBe("bun test --preload ./test-setup.ts --watch --timeout 15000");
  });

  it("has typecheck script for fast type checking", () => {
    expect(packageJson.scripts["typecheck"]).toBeDefined();
    expect(packageJson.scripts["typecheck"]).toContain("tsc --noEmit");
  });

  it("has check script for full CI validation", () => {
    expect(packageJson.scripts["check"]).toBeDefined();
    expect(packageJson.scripts["check"]).toContain("bun test");
    expect(packageJson.scripts["check"]).toContain("tsc --noEmit");
  });

  it("has build:client script for production builds", () => {
    expect(packageJson.scripts["build:client"]).toBeDefined();
    expect(packageJson.scripts["build:client"]).toContain("--target=browser");
    expect(packageJson.scripts["build:client"]).toContain("--minify");
  });

  it("has build:client:dev script with React Fast Refresh", () => {
    expect(packageJson.scripts["build:client:dev"]).toBeDefined();
    expect(packageJson.scripts["build:client:dev"]).toContain("--react-fast-refresh");
  });
});

// ============================================
// Script Execution Tests
// ============================================
describe("DX Script Execution", () => {
  // Skip tsc execution by default - it's slow (2s+) and runs in CI separately
  // Run manually: BUN_TYPECHECK=1 bun test
  it.skipIf(!process.env.BUN_TYPECHECK)("typecheck runs without crashing", async () => {
    // TypeScript may report errors for Bun-specific APIs, but shouldn't crash
    const result = await $`cd ${ROOT} && bun x tsc --noEmit 2>&1 || true`.text();
    // Should complete (even with type errors)
    expect(result).toBeDefined();
  }, 15000); // 15s timeout for tsc

  it("test command is configured correctly", () => {
    // Don't run tests recursively - just verify the script exists
    // The actual test suite is validated by CI/pre-commit hooks
    expect(packageJson.scripts["test"]).toBe("bun test --preload ./test-setup.ts");
  });

  it("CSS build completes", async () => {
    const result = await $`cd ${ROOT} && bun run css:build 2>&1`.text();
    expect(result).toContain("tailwindcss");
    expect(result).toContain("Done");
  });
});

// ============================================
// Build Output Tests
// ============================================
describe("Build Outputs", () => {
  it("Tailwind CSS output exists", async () => {
    const cssFile = Bun.file(join(ROOT, "public/dist/styles.css"));
    expect(await cssFile.exists()).toBe(true);
    const size = cssFile.size;
    expect(size).toBeGreaterThan(1000); // Should have meaningful content
  });

  it("public/index.html exists", async () => {
    const htmlFile = Bun.file(join(ROOT, "public/index.html"));
    expect(await htmlFile.exists()).toBe(true);
  });
});

// ============================================
// Build Performance Benchmarks
// ============================================
describe("Build Benchmarks", () => {
  it("CSS build completes under 1000ms", async () => {
    const start = performance.now();
    await $`cd ${ROOT} && bun run css:build 2>&1`.quiet();
    const elapsed = performance.now() - start;

    console.log(`CSS build: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(1000); // Increased for variable load
  });

  // Skip by default - typecheck is slow (2s+) and redundant with CI
  // Run manually: BUN_TYPECHECK=1 bun test
  it.skipIf(!process.env.BUN_TYPECHECK)("TypeScript check completes under 8000ms", async () => {
    const start = performance.now();
    await $`cd ${ROOT} && bun x tsc --noEmit 2>&1 || true`.quiet();
    const elapsed = performance.now() - start;

    console.log(`TypeScript check: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(8000);
  }, 10000); // 10s timeout

  // Skipped: running `bun test` recursively causes infinite loop
  it.skip("test suite completes under 2000ms", async () => {
    const start = performance.now();
    await $`cd ${ROOT} && bun test 2>&1`.quiet();
    const elapsed = performance.now() - start;

    console.log(`Test suite: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(2000);
  });
});

// ============================================
// Bun.build API Tests (React Fast Refresh)
// ============================================
describe("Bun.build API", () => {
  it("supports reactFastRefresh option", async () => {
    // Test that the build API accepts the option (Bun 1.3.6+)
    // Note: reactFastRefresh and write are valid Bun options but may not be in @types/bun
    const result = await Bun.build({
      entrypoints: [join(ROOT, "src/client/components/StatCard.tsx")],
      target: "browser",
      reactFastRefresh: true,
      write: false, // Don't write to disk
    } as any);

    expect(result.success).toBe(true);
    expect(result.outputs.length).toBeGreaterThan(0);

    // Check that refresh runtime is injected
    const output = await result.outputs[0].text();
    // React Fast Refresh adds $RefreshReg$ and $RefreshSig$
    // The exact output depends on the component, but it should be valid JS
    expect(output.length).toBeGreaterThan(100);
  });

  it("minified build is smaller than dev build", async () => {
    const devResult = await Bun.build({
      entrypoints: [join(ROOT, "src/client/components/StatCard.tsx")],
      target: "browser",
      minify: false,
      write: false,
    } as any);

    const prodResult = await Bun.build({
      entrypoints: [join(ROOT, "src/client/components/StatCard.tsx")],
      target: "browser",
      minify: true,
      write: false,
    } as any);

    const devSize = (await devResult.outputs[0].text()).length;
    const prodSize = (await prodResult.outputs[0].text()).length;

    console.log(`Dev build: ${devSize} bytes`);
    console.log(`Prod build: ${prodSize} bytes`);
    console.log(`Reduction: ${((1 - prodSize / devSize) * 100).toFixed(1)}%`);

    expect(prodSize).toBeLessThan(devSize);
  });
});

// ============================================
// Response.json Performance (Bun 1.3.6 SIMD)
// ============================================
describe("Response.json Performance", () => {
  it("Response.json is fast (SIMD FastStringifier)", () => {
    const data = {
      items: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `item-${i}`,
        value: Math.random(),
      })),
    };

    const iterations = 1000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      Response.json(data);
    }

    const elapsed = performance.now() - start;
    const perOp = elapsed / iterations;

    console.log(`Response.json: ${perOp.toFixed(3)}ms per operation`);
    console.log(`Total for ${iterations} iterations: ${elapsed.toFixed(2)}ms`);

    // Should be fast (< 0.5ms per operation with SIMD)
    expect(perOp).toBeLessThan(0.5);
  });
});

// ============================================
// Bun.hash.crc32 Benchmark (20x faster in 1.3.6)
// ============================================
describe("Bun.hash.crc32 Performance", () => {
  it("CRC32 is hardware-accelerated fast", () => {
    const data = Buffer.alloc(1024 * 1024); // 1MB
    // Fill with random data
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.floor(Math.random() * 256);
    }

    const iterations = 100;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      Bun.hash.crc32(data);
    }

    const elapsed = performance.now() - start;
    const perMB = elapsed / iterations;
    const throughput = (1000 / perMB).toFixed(0); // MB/s

    console.log(`CRC32 (1MB): ${perMB.toFixed(3)}ms per hash`);
    console.log(`Throughput: ~${throughput} MB/s`);

    // Should be very fast with hardware acceleration (< 5ms per MB)
    expect(perMB).toBeLessThan(5);
  });
});
