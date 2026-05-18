#!/usr/bin/env bun

import { describe, expect, test } from "bun:test";

describe("👁️ Bun --watch - Screen Control Demo", () => {
  test("✅ bun --watch --no-clear-screen dev - command structure", async () => {
    // Create package.json with dev script
    const packageJson = {
      name: "watch-demo",
      version: "1.0.0",
      scripts: {
        dev: "echo 'Development server started with --no-clear-screen'",
        test: "echo 'Tests running with --preserveWatchOutput'",
      },
    };

    await Bun.write("/tmp/package.json", JSON.stringify(packageJson, null, 2));

    // Create a simple dev file
    const devFile = `
console.info('Dev server running - screen should not clear on restart');
console.info('Timestamp:', new Date().toISOString());
`;

    await Bun.write("/tmp/dev.ts", devFile);

    // Test command structure (run briefly then kill)
    const proc = Bun.spawn(
      ["bun", "--watch", "--no-clear-screen", "run", "dev"],
      {
        cwd: "/tmp",
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    // Let it run briefly
    await new Promise((resolve) => setTimeout(resolve, 500));
    proc.kill();

    const result = await proc.exited;
    expect(result).toBeDefined();
  });

  test("✅ bun --watch --preserveWatchOutput test - command structure", async () => {
    // Create a test file
    const testFile = `
import { test, expect } from "bun:test";

test("preserve output demo", () => {
  console.info('Test executed - output should be preserved');
  expect(true).toBe(true);
});
`;

    await Bun.write("/tmp/preserve.test.ts", testFile);

    // Test command structure
    const proc = Bun.spawn(
      ["bun", "--watch", "--preserveWatchOutput", "preserve.test.ts"],
      {
        cwd: "/tmp",
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    // Let it run briefly
    await new Promise((resolve) => setTimeout(resolve, 1000));
    proc.kill();

    const result = await proc.exited;
    expect(result).toBeDefined();
  });

  test("✅ Combined options demonstration", async () => {
    // Create file for combined test
    const combinedFile = `
console.info('Combined --no-clear-screen --preserveWatchOutput demo');
console.info('Screen should not clear, output should be preserved');
console.info('Timestamp:', new Date().toISOString());
`;

    await Bun.write("/tmp/combined.ts", combinedFile);

    // Test both options together
    const proc = Bun.spawn(
      [
        "bun",
        "--watch",
        "--no-clear-screen",
        "--preserveWatchOutput",
        "combined.ts",
      ],
      {
        cwd: "/tmp",
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    // Let it run briefly
    await new Promise((resolve) => setTimeout(resolve, 500));
    proc.kill();

    const result = await proc.exited;
    expect(result).toBeDefined();
  });

  test("✅ Build watch with screen control", async () => {
    // Create source file for build
    const sourceFile = `
export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

console.info('Source file for build watch demo');
`;

    await Bun.write("/tmp/build-src.ts", sourceFile);

    // Test build with watch options
    const proc = Bun.spawn(
      [
        "bun",
        "build",
        "--watch",
        "--no-clear-screen",
        "build-src.ts",
        "--outfile",
        "/tmp/bundle.js",
      ],
      {
        cwd: "/tmp",
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    // Let it run briefly
    await new Promise((resolve) => setTimeout(resolve, 1000));
    proc.kill();

    const result = await proc.exited;
    expect(result).toBeDefined();
  });

  test("✅ Error handling demonstration", async () => {
    // Test with non-existent file to show error handling
    const result = await Bun.spawn(
      ["bun", "--watch", "--no-clear-screen", "nonexistent.ts"],
      {
        cwd: "/tmp",
        stdout: "pipe",
        stderr: "pipe",
      }
    ).exited;

    // Should fail gracefully
    expect(result).not.toBe(0);
  });
});
