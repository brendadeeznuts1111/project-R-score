#!/usr/bin/env bun

import { describe, expect, test } from "bun:test";

describe("🔍 Bun --filter - Monorepo Package Filtering", () => {
  const tempDir = "/tmp/bun-filter-test";

  test("✅ Install dependencies for specific packages: bun install --filter './packages/*'", async () => {
    // Create monorepo structure
    await setupMonorepo();

    // Test: bun install --filter './packages/*'
    const result = await Bun.spawn(
      ["bun", "install", "--filter", "./packages/*"],
      {
        cwd: tempDir,
        stdout: "pipe",
        stderr: "pipe",
      }
    ).exited;

    expect(result).toBe(0);
  });

  test("✅ Check outdated dependencies: bun outdated --filter 'pkg-*'", async () => {
    // Ensure monorepo exists
    await setupMonorepo();

    // Test: bun outdated --filter 'pkg-*'
    const result = await Bun.spawn(["bun", "outdated", "--filter", "pkg-*"], {
      cwd: tempDir,
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    expect(result).toBe(0);
  });

  test("✅ Run scripts across matching packages: bun run --filter 'frontend-*' build", async () => {
    // Create monorepo with frontend packages
    await setupFrontendMonorepo();

    // Test: bun run --filter 'frontend-*' build
    const result = await Bun.spawn(
      ["bun", "run", "--filter", "frontend-*", "build"],
      {
        cwd: tempDir,
        stdout: "pipe",
        stderr: "pipe",
      }
    ).exited;

    expect(result).toBe(0);
  });

  test("✅ Run scripts with path glob: bun run --filter './packages/**' test", async () => {
    // Ensure monorepo exists
    await setupMonorepo();

    // Test: bun run --filter './packages/**' test
    const result = await Bun.spawn(
      ["bun", "run", "--filter", "./packages/**", "test"],
      {
        cwd: tempDir,
        stdout: "pipe",
        stderr: "pipe",
      }
    ).exited;

    expect(result).toBe(0);
  });

  test("✅ Filter by exact package name", async () => {
    await setupMonorepo();

    // Test exact package matching
    const result = await Bun.spawn(
      ["bun", "run", "--filter", "pkg-a", "build"],
      {
        cwd: tempDir,
        stdout: "pipe",
        stderr: "pipe",
      }
    ).exited;

    expect(result).toBe(0);
  });

  test("✅ Filter with wildcard patterns", async () => {
    await setupMonorepo();

    // Test wildcard pattern matching
    const result = await Bun.spawn(["bun", "run", "--filter", "pkg-*", "dev"], {
      cwd: tempDir,
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    expect(result).toBe(0);
  });

  test("✅ Filter with exclusion pattern", async () => {
    await setupMonorepo();

    // Test exclusion pattern
    const result = await Bun.spawn(["bun", "install", "--filter", "!pkg-c"], {
      cwd: tempDir,
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    expect(result).toBe(0);
  });

  test("✅ Multiple filter patterns", async () => {
    await setupMonorepo();

    // Test multiple filters (exclude root, include packages)
    const result = await Bun.spawn(
      ["bun", "install", "--filter", "!./", "--filter", "./packages/*"],
      {
        cwd: tempDir,
        stdout: "pipe",
        stderr: "pipe",
      }
    ).exited;

    expect(result).toBe(0);
  });

  test("✅ Filter all packages with '*'", async () => {
    await setupMonorepo();

    // Test running script in all packages
    const result = await Bun.spawn(["bun", "run", "--filter", "*", "clean"], {
      cwd: tempDir,
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    expect(result).toBe(0);
  });

  test("✅ Filter by relative path", async () => {
    await setupMonorepo();

    // Test filtering by specific directory path
    const result = await Bun.spawn(
      ["bun", "run", "--filter", "./packages/pkg-a", "dev"],
      {
        cwd: tempDir,
        stdout: "pipe",
        stderr: "pipe",
      }
    ).exited;

    expect(result).toBe(0);
  });

  async function setupMonorepo() {
    // Create root package.json with workspaces
    const rootPackage = {
      name: "monorepo-root",
      version: "1.0.0",
      workspaces: ["packages/*"],
      scripts: {
        build: "echo 'Root build'",
        test: "echo 'Root test'",
        clean: "echo 'Root clean'",
      },
    };

    await Bun.write(
      `${tempDir}/package.json`,
      JSON.stringify(rootPackage, null, 2)
    );

    // Create packages directory and sub-packages
    const packages = [
      {
        name: "pkg-a",
        version: "1.0.0",
        scripts: {
          build: "echo 'pkg-a build'",
          dev: "echo 'pkg-a dev'",
          test: "echo 'pkg-a test'",
          clean: "echo 'pkg-a clean'",
        },
      },
      {
        name: "pkg-b",
        version: "1.0.0",
        scripts: {
          build: "echo 'pkg-b build'",
          dev: "echo 'pkg-b dev'",
          test: "echo 'pkg-b test'",
          clean: "echo 'pkg-b clean'",
        },
      },
      {
        name: "pkg-c",
        version: "1.0.0",
        scripts: {
          build: "echo 'pkg-c build'",
          dev: "echo 'pkg-c dev'",
          test: "echo 'pkg-c test'",
          clean: "echo 'pkg-c clean'",
        },
      },
    ];

    for (const pkg of packages) {
      const pkgDir = `${tempDir}/packages/${pkg.name}`;
      await Bun.write(`${pkgDir}/package.json`, JSON.stringify(pkg, null, 2));
    }
  }

  async function setupFrontendMonorepo() {
    // Create monorepo with frontend packages
    const rootPackage = {
      name: "frontend-monorepo",
      version: "1.0.0",
      workspaces: ["packages/*"],
      scripts: {
        build: "echo 'Root build'",
        test: "echo 'Root test'",
      },
    };

    await Bun.write(
      `${tempDir}/package.json`,
      JSON.stringify(rootPackage, null, 2)
    );

    const frontendPackages = [
      {
        name: "frontend-web",
        version: "1.0.0",
        scripts: {
          build: "echo 'frontend-web build'",
          dev: "echo 'frontend-web dev'",
          test: "echo 'frontend-web test'",
        },
      },
      {
        name: "frontend-mobile",
        version: "1.0.0",
        scripts: {
          build: "echo 'frontend-mobile build'",
          dev: "echo 'frontend-mobile dev'",
          test: "echo 'frontend-mobile test'",
        },
      },
      {
        name: "backend-api",
        version: "1.0.0",
        scripts: {
          build: "echo 'backend-api build'",
          dev: "echo 'backend-api dev'",
          test: "echo 'backend-api test'",
        },
      },
    ];

    for (const pkg of frontendPackages) {
      const pkgDir = `${tempDir}/packages/${pkg.name}`;
      await Bun.write(`${pkgDir}/package.json`, JSON.stringify(pkg, null, 2));
    }
  }
});
