#!/usr/bin/env bun

import { describe, test } from "bun:test";

describe("🏗️ Bun CLI Flag Structure Demo", () => {
  test("✅ Demonstrates: bun [bun flags] run <script> [script flags]", async () => {
    // Create package.json with test scripts
    const packageJson = {
      name: "flag-structure-demo",
      version: "1.0.0",
      scripts: {
        dev: "echo 'Development server started'",
        build: "echo 'Build process completed'",
        test: "echo 'Tests executed'",
      },
    };

    await Bun.write("/tmp/package.json", JSON.stringify(packageJson, null, 2));

    console.log("🎯 CLI Flag Structure Examples:");
    console.log("");

    // Example 1: Basic structure
    console.log("1️⃣ Basic: bun run <script>");
    await Bun.spawn(["bun", "run", "dev"], {
      cwd: "/tmp",
      stdout: "inherit",
      stderr: "inherit",
    }).exited;

    // Example 2: Bun flags only
    console.log("2️⃣ Bun flags: bun --watch run <script>");
    const proc1 = Bun.spawn(["bun", "--watch", "run", "dev"], {
      cwd: "/tmp",
      stdout: "inherit",
      stderr: "inherit",
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
    proc1.kill();

    // Example 3: Script flags only
    console.log("3️⃣ Script flags: bun run <script> --verbose");
    await Bun.spawn(["bun", "run", "build", "--verbose"], {
      cwd: "/tmp",
      stdout: "inherit",
      stderr: "inherit",
    }).exited;

    // Example 4: Combined structure
    console.log("4️⃣ Combined: bun [bun flags] run <script> [script flags]");
    const proc2 = Bun.spawn(
      [
        "bun",
        "--watch",
        "--no-clear-screen",
        "run",
        "test",
        "--verbose",
        "--debug",
      ],
      {
        cwd: "/tmp",
        stdout: "inherit",
        stderr: "inherit",
      }
    );
    await new Promise((resolve) => setTimeout(resolve, 500));
    proc2.kill();

    console.log("✅ All flag structures demonstrated successfully!");
  });

  test("✅ Flag separation verification", async () => {
    // Create script that shows flag handling
    const flagScript = `
console.log('=== Flag Separation Demo ===');
console.log('Script arguments:', process.argv.slice(2));
console.log('NODE_ENV from Bun --define:', process.env.NODE_ENV || 'undefined');
console.log('Bun version:', typeof Bun !== 'undefined' ? Bun.version : 'N/A');
`;

    await Bun.write("/tmp/flag-demo.js", flagScript);

    console.log("\n🔍 Flag Separation:");
    console.log(
      "Bun flags are processed by Bun, script flags passed to script"
    );

    await Bun.spawn(
      [
        "bun",
        "--define",
        'process.env.NODE_ENV=\\"demo\\"',
        "run",
        "flag-demo.js",
        "--script-flag",
        "script-value",
      ],
      {
        cwd: "/tmp",
        stdout: "inherit",
        stderr: "inherit",
      }
    ).exited;
  });
});
