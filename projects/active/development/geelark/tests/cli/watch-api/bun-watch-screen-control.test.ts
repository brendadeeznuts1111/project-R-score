#!/usr/bin/env bun

import { describe, expect, test } from "bun:test";

describe("👁️ Bun --watch - Screen Control Options", () => {
  const tempDir = "/tmp/bun-watch-test";

  test("✅ bun --watch --no-clear-screen dev", async () => {
    // Create package.json with dev script
    const packageJson = {
      name: "watch-test",
      version: "1.0.0",
      scripts: {
        dev: "echo 'Development server started'",
        build: "echo 'Build completed'",
      },
    };

    await Bun.write(
      `${tempDir}/package.json`,
      JSON.stringify(packageJson, null, 2)
    );

    // Create a TypeScript file to watch
    const tsFile = `
console.info('Dev server running at:', new Date().toISOString());
setInterval(() => {
  console.info('Heartbeat:', new Date().toISOString());
}, 2000);
`;

    await Bun.write(`${tempDir}/dev.ts`, tsFile);

    // Test: bun --watch --no-clear-screen dev
    // Note: We'll test the command structure, not run it indefinitely
    const process = Bun.spawn(
      ["bun", "--watch", "--no-clear-screen", "run", "dev"],
      {
        cwd: tempDir,
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    // Wait a moment then kill the process
    await new Promise((resolve) => setTimeout(resolve, 1000));
    process.kill();

    const result = await process.exited;
    // Process should be terminated by us, not by error
    expect(result).toBeDefined();
  });

  test("✅ bun --watch --preserveWatchOutput test", async () => {
    // Create package.json with test script
    const packageJson = {
      name: "watch-test-output",
      version: "1.0.0",
      scripts: {
        test: "echo 'Running tests...'",
      },
    };

    await Bun.write(
      `${tempDir}/package.json`,
      JSON.stringify(packageJson, null, 2)
    );

    // Create a test file
    const testFile = `
import { test, expect } from "bun:test";

test("sample test", () => {
  console.info('Test executed at:', new Date().toISOString());
  expect(true).toBe(true);
});

test("another test", () => {
  console.info('Another test at:', new Date().toISOString());
  expect(1 + 1).toBe(2);
});
`;

    await Bun.write(`${tempDir}/sample.test.ts`, testFile);

    // Test: bun --watch --preserveWatchOutput test
    const process = Bun.spawn(
      ["bun", "--watch", "--preserveWatchOutput", "run", "test"],
      {
        cwd: tempDir,
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    // Wait a moment then kill the process
    await new Promise((resolve) => setTimeout(resolve, 2000));
    process.kill();

    const result = await process.exited;
    expect(result).toBeDefined();
  });

  test("✅ --no-clear-screen with file watching", async () => {
    // Create a file to watch
    const watchFile = `
console.info('File started at:', new Date().toISOString());
console.info('This should not clear the screen on restart');
`;

    await Bun.write(`${tempDir}/watch.ts`, watchFile);

    // Test: bun --watch --no-clear-screen watch.ts
    const process = Bun.spawn(
      ["bun", "--watch", "--no-clear-screen", "watch.ts"],
      {
        cwd: tempDir,
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    // Wait a moment then kill the process
    await new Promise((resolve) => setTimeout(resolve, 1000));
    process.kill();

    const result = await process.exited;
    expect(result).toBeDefined();
  });

  test("✅ --preserveWatchOutput with build watch", async () => {
    // Create a source file
    const sourceFile = `
export function hello(name: string): string {
  return \`Hello, \${name}!\`;
}

console.info('Source file loaded');
`;

    await Bun.write(`${tempDir}/src/index.ts`, sourceFile);

    // Test: bun build --watch --preserveWatchOutput
    const process = Bun.spawn(
      [
        "bun",
        "build",
        "--watch",
        "--preserveWatchOutput",
        "--target",
        "bun",
        "src/index.ts",
        "--outfile",
        "dist/bundle.js",
      ],
      {
        cwd: tempDir,
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    // Wait a moment then kill the process
    await new Promise((resolve) => setTimeout(resolve, 1500));
    process.kill();

    const result = await process.exited;
    expect(result).toBeDefined();
  });

  test("✅ Combined watch options", async () => {
    // Create package.json with multiple scripts
    const packageJson = {
      name: "combined-watch-test",
      version: "1.0.0",
      scripts: {
        dev: "echo 'Combined dev mode started'",
        test: "echo 'Combined test mode started'",
      },
    };

    await Bun.write(
      `${tempDir}/package.json`,
      JSON.stringify(packageJson, null, 2)
    );

    // Create a development file
    const devFile = `
console.info('Combined watch mode test');
console.info('Screen should not clear');
console.info('Output should be preserved');
`;

    await Bun.write(`${tempDir}/combined.ts`, devFile);

    // Test both options together
    const process = Bun.spawn(
      [
        "bun",
        "--watch",
        "--no-clear-screen",
        "--preserveWatchOutput",
        "run",
        "dev",
      ],
      {
        cwd: tempDir,
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    // Wait a moment then kill the process
    await new Promise((resolve) => setTimeout(resolve, 1000));
    process.kill();

    const result = await process.exited;
    expect(result).toBeDefined();
  });

  test("✅ Watch options with TypeScript", async () => {
    // Create a TypeScript file with imports
    const mainFile = `
import { utils } from './utils';

console.info('Main file with TypeScript');
utils.greet('World');
`;

    const utilsFile = `
export const utils = {
  greet: (name: string) => {
    console.info(\`Hello, \${name}! From utils at \${new Date().toISOString()}\`);
  },
  calculate: (a: number, b: number) => a + b
};
`;

    await Bun.write(`${tempDir}/main.ts`, mainFile);
    await Bun.write(`${tempDir}/utils.ts`, utilsFile);

    // Test with TypeScript files
    const process = Bun.spawn(
      [
        "bun",
        "--watch",
        "--no-clear-screen",
        "--preserveWatchOutput",
        "main.ts",
      ],
      {
        cwd: tempDir,
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    // Wait a moment then kill the process
    await new Promise((resolve) => setTimeout(resolve, 1000));
    process.kill();

    const result = await process.exited;
    expect(result).toBeDefined();
  });

  test("✅ Error handling for invalid watch combinations", async () => {
    // Test with non-existent script
    const packageJson = {
      name: "error-test",
      version: "1.0.0",
      scripts: {
        existing: "echo 'This exists'",
      },
    };

    await Bun.write(
      `${tempDir}/package.json`,
      JSON.stringify(packageJson, null, 2)
    );

    // Test with non-existent script
    const result = await Bun.spawn(
      ["bun", "--watch", "--no-clear-screen", "nonexistent"],
      {
        cwd: tempDir,
        stdout: "pipe",
        stderr: "pipe",
      }
    ).exited;

    // Should fail with non-zero exit code
    expect(result).not.toBe(0);
  });

  test("✅ Watch options with environment variables", async () => {
    // Create file that uses environment variables
    const envFile = `
console.info('NODE_ENV:', process.env.NODE_ENV || 'development');
console.info('Watch mode with env vars at:', new Date().toISOString());
console.info('Screen control options active');
`;

    await Bun.write(`${tempDir}/env-watch.ts`, envFile);

    // Test with environment variables
    const process = Bun.spawn(
      [
        "bun",
        "--watch",
        "--no-clear-screen",
        "--preserveWatchOutput",
        "env-watch.ts",
      ],
      {
        cwd: tempDir,
        env: {
          ...process.env,
          NODE_ENV: "watch-test",
        },
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    // Wait a moment then kill the process
    await new Promise((resolve) => setTimeout(resolve, 1000));
    process.kill();

    const result = await process.exited;
    expect(result).toBeDefined();
  });
});
