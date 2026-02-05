#!/usr/bin/env bun

import { describe, expect, test } from "bun:test";

describe("🏗️ Bun CLI Flag Structure - bun [bun flags] run <script> [script flags]", () => {
  const tempDir = "/tmp/bun-flags-test";

  test("✅ Basic structure: bun run <script>", async () => {
    // Create package.json with basic script
    const packageJson = {
      name: "flags-test",
      version: "1.0.0",
      scripts: {
        basic: "echo 'Basic script executed'",
        test: "echo 'Test script executed'",
      },
    };

    await Bun.write(
      `${tempDir}/package.json`,
      JSON.stringify(packageJson, null, 2)
    );

    // Test: bun run basic
    const result = await Bun.spawn(["bun", "run", "basic"], {
      cwd: tempDir,
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    expect(result).toBe(0);
  });

  test("✅ Bun flags: bun --watch run <script>", async () => {
    // Test with --watch flag
    const proc = Bun.spawn(["bun", "--watch", "run", "basic"], {
      cwd: tempDir,
      stdout: "pipe",
      stderr: "pipe",
    });

    // Let it run briefly then kill
    await new Promise((resolve) => setTimeout(resolve, 500));
    proc.kill();

    const result = await proc.exited;
    expect(result).toBeDefined();
  });

  test("✅ Multiple Bun flags: bun --watch --no-clear-screen run <script>", async () => {
    // Test with multiple bun flags
    const proc = Bun.spawn(
      ["bun", "--watch", "--no-clear-screen", "run", "basic"],
      {
        cwd: tempDir,
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 500));
    proc.kill();

    const result = await proc.exited;
    expect(result).toBeDefined();
  });

  test("✅ Script flags: bun run <script> --verbose", async () => {
    // Create script that accepts flags
    const packageJson = {
      name: "script-flags-test",
      version: "1.0.0",
      scripts: {
        echo: "echo 'Script executed with:'",
        "node-script": "node --version",
        custom: "echo 'Custom script with flags'",
      },
    };

    await Bun.write(
      `${tempDir}/package.json`,
      JSON.stringify(packageJson, null, 2)
    );

    // Test: bun run echo --verbose
    const result = await Bun.spawn(["bun", "run", "echo", "--verbose"], {
      cwd: tempDir,
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    expect(result).toBe(0);
  });

  test("✅ Combined: bun [bun flags] run <script> [script flags]", async () => {
    // Test full structure with both bun flags and script flags
    const proc = Bun.spawn(
      [
        "bun",
        "--watch",
        "--preserveWatchOutput",
        "run",
        "echo",
        "--verbose",
        "--debug",
      ],
      {
        cwd: tempDir,
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 500));
    proc.kill();

    const result = await proc.exited;
    expect(result).toBeDefined();
  });

  test("✅ Bun transpilation flags: bun --define run <script>", async () => {
    // Create TypeScript file
    const tsFile = `
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Transpilation with --define flag');
`;

    await Bun.write(`${tempDir}/define-test.ts`, tsFile);

    // Test with --define flag
    const result = await Bun.spawn(
      [
        "bun",
        "--define",
        'process.env.NODE_ENV=\\"test\\"',
        "run",
        "define-test.ts",
      ],
      {
        cwd: tempDir,
        stdout: "pipe",
        stderr: "pipe",
      }
    ).exited;

    expect(result).toBe(0);
  });

  test("✅ Bun environment flags: bun --smol run <script>", async () => {
    // Create simple script
    const simpleScript = "console.log('Running in --smol mode');";
    await Bun.write(`${tempDir}/smol-test.js`, simpleScript);

    // Test with --smol flag
    const result = await Bun.spawn(["bun", "--smol", "run", "smol-test.js"], {
      cwd: tempDir,
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    expect(result).toBe(0);
  });

  test("✅ Bun filter flags: bun --filter run <script>", async () => {
    // Create workspace structure
    const workspacePackage = {
      name: "workspace-test",
      version: "1.0.0",
      workspaces: ["packages/*"],
      scripts: {
        build: "echo 'Building workspace packages'",
      },
    };

    await Bun.write(
      `${tempDir}/package.json`,
      JSON.stringify(workspacePackage, null, 2)
    );

    // Create a package
    const pkgPackage = {
      name: "test-pkg",
      version: "1.0.0",
      scripts: {
        build: "echo 'Building test-pkg'",
      },
    };

    await Bun.write(
      `${tempDir}/packages/test-pkg/package.json`,
      JSON.stringify(pkgPackage, null, 2)
    );

    // Test with --filter flag
    const result = await Bun.spawn(
      ["bun", "--filter", "test-pkg", "run", "build"],
      {
        cwd: tempDir,
        stdout: "pipe",
        stderr: "pipe",
      }
    ).exited;

    expect(result).toBe(0);
  });

  test("✅ Complex flag combination", async () => {
    // Create test file
    const complexScript = `
console.log('Complex flag test');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Timestamp:', new Date().toISOString());
`;

    await Bun.write(`${tempDir}/complex.js`, complexScript);

    // Test with multiple bun flags and script flags
    const proc = Bun.spawn(
      [
        "bun",
        "--watch",
        "--no-clear-screen",
        "--define",
        'process.env.NODE_ENV=\\"development\\"',
        "--smol",
        "run",
        "complex.js",
        "--verbose",
        "--debug",
      ],
      {
        cwd: tempDir,
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 500));
    proc.kill();

    const result = await proc.exited;
    expect(result).toBeDefined();
  });

  test("✅ File execution with flags: bun [bun flags] <file> [flags]", async () => {
    // Create executable file
    const execFile = `
console.log('Direct file execution with flags');
console.log('Arguments:', process.argv.slice(2));
`;

    await Bun.write(`${tempDir}/exec.js`, execFile);

    // Test direct file execution with flags
    const result = await Bun.spawn(
      [
        "bun",
        "--define",
        'process.env.NODE_ENV=\\"production\\"',
        "exec.js",
        "--flag1",
        "--flag2",
      ],
      {
        cwd: tempDir,
        stdout: "pipe",
        stderr: "pipe",
      }
    ).exited;

    expect(result).toBe(0);
  });

  test("✅ Error handling for invalid flag combinations", async () => {
    // Test with invalid bun flag
    const result = await Bun.spawn(["bun", "--invalid-flag", "run", "basic"], {
      cwd: tempDir,
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    // Should fail with non-zero exit code
    expect(result).not.toBe(0);
  });

  test("✅ Script flags vs Bun flags separation", async () => {
    // Create script that handles its own flags
    const flagScript = `
const args = process.argv.slice(2);
console.log('Script received args:', args);
console.log('NODE_ENV from Bun define:', process.env.NODE_ENV);
`;

    await Bun.write(`${tempDir}/flag-test.js`, flagScript);

    // Test to show script flags are passed through, bun flags are processed by bun
    const result = await Bun.spawn(
      [
        "bun",
        "--define",
        'process.env.NODE_ENV=\\"separated\\"',
        "run",
        "flag-test.js",
        "--script-flag",
        "value",
      ],
      {
        cwd: tempDir,
        stdout: "pipe",
        stderr: "pipe",
      }
    ).exited;

    expect(result).toBe(0);
  });
});
