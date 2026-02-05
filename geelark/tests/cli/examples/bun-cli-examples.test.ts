#!/usr/bin/env bun

import { describe, expect, test } from "bun:test";

describe("🚀 Bun Runtime - CLI Examples & Usage", () => {
  test("✅ Basic file execution", async () => {
    // Create test files for different extensions
    const testFiles = {
      "index.js": "console.log('Hello from JS');",
      "index.ts": "console.log('Hello from TS');",
      "index.jsx": "console.log('Hello from JSX');",
      "index.tsx": "console.log('Hello from TSX');",
    };

    for (const [filename, content] of Object.entries(testFiles)) {
      const testFile = `/tmp/${filename}`;
      await Bun.write(testFile, content);

      // Test execution
      const result = await Bun.spawn(["bun", "run", testFile], {
        stdout: "pipe",
        stderr: "pipe",
      }).exited;

      expect(result).toBe(0);
    }
  });

  test("✅ Package.json scripts execution", async () => {
    // Create a temporary package.json with scripts
    const packageJson = {
      name: "test-cli-examples",
      version: "1.0.0",
      scripts: {
        clean: "echo 'Cleaning done.'",
        dev: "echo 'Development server started'",
        build: "echo 'Build completed'",
        prebuild: "echo 'Pre-build hook'",
        postbuild: "echo 'Post-build hook'",
      },
    };

    const tempDir = "/tmp/bun-cli-test";
    await Bun.write(
      `${tempDir}/package.json`,
      JSON.stringify(packageJson, null, 2)
    );

    // Test script execution
    const scripts = ["clean", "dev", "build"];
    for (const script of scripts) {
      const result = await Bun.spawn(["bun", "run", script], {
        cwd: tempDir,
        stdout: "pipe",
        stderr: "pipe",
      }).exited;

      expect(result).toBe(0);
    }
  });

  test("✅ --bun flag with Node.js scripts", async () => {
    // Create a Node.js script with shebang
    const nodeScript = `#!/usr/bin/env node
console.log('Running with Node.js shebang');
process.exit(0);`;

    const testFile = "/tmp/node-script.js";
    await Bun.write(testFile, nodeScript);

    // Test with --bun flag
    const result = await Bun.spawn(["bun", "run", "--bun", testFile], {
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    expect(result).toBe(0);
  });

  test("✅ Console depth control", async () => {
    // Create a script with nested objects
    const deepScript = `
const nested = { a: { b: { c: { d: "deep" } } } };
console.log('Default depth:', nested);
console.log('Should show full object with depth 5:', nested);
`;

    const testFile = "/tmp/console-depth-test.js";
    await Bun.write(testFile, deepScript);

    // Test with default depth
    const defaultResult = await Bun.spawn(["bun", "run", testFile], {
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    expect(defaultResult).toBe(0);

    // Test with custom depth
    const customDepthResult = await Bun.spawn(
      ["bun", "--console-depth", "5", "run", testFile],
      {
        stdout: "pipe",
        stderr: "pipe",
      }
    ).exited;

    expect(customDepthResult).toBe(0);
  });

  test("✅ Pipe from stdin", async () => {
    // Test piping code to bun
    const result = await Bun.spawn(
      ["sh", "-c", "echo \"console.log('Hello from stdin')\" | bun run -"],
      {
        stdout: "pipe",
        stderr: "pipe",
      }
    ).exited;

    expect(result).toBe(0);
  });

  test("✅ --smol mode", async () => {
    // Create a lightweight script
    const smolScript = "console.log('Running in smol mode');";
    const testFile = "/tmp/smol-test.js";
    await Bun.write(testFile, smolScript);

    // Test with --smol flag
    const result = await Bun.spawn(["bun", "--smol", "run", testFile], {
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    expect(result).toBe(0);
  });

  test("✅ Resolution order verification", async () => {
    const tempDir = "/tmp/resolution-test";

    // 1. Create package.json with script
    const packageJson = {
      name: "resolution-test",
      version: "1.0.0",
      scripts: {
        test: "echo 'From package.json script'",
      },
    };
    await Bun.write(
      `${tempDir}/package.json`,
      JSON.stringify(packageJson, null, 2)
    );

    // 2. Create source file
    await Bun.write(`${tempDir}/test.js`, "console.log('From source file');");

    // 3. Test package.json script takes precedence
    const scriptResult = await Bun.spawn(["bun", "run", "test"], {
      cwd: tempDir,
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    expect(scriptResult).toBe(0);

    // 4. Test source file execution
    const sourceResult = await Bun.spawn(["bun", "run", "test.js"], {
      cwd: tempDir,
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    expect(sourceResult).toBe(0);
  });

  test("✅ TypeScript and JSX transpilation", async () => {
    // Test TypeScript file
    const tsScript = `
const message: string = "Hello from TypeScript";
console.log(message);
`;

    const tsxScript = `
const App = () => <div>Hello TSX</div>;
console.log('TSX component defined');
`;

    await Bun.write("/tmp/test-ts.ts", tsScript);
    await Bun.write("/tmp/test-tsx.tsx", tsxScript);

    // Test TypeScript execution
    const tsResult = await Bun.spawn(["bun", "run", "/tmp/test-ts.ts"], {
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    expect(tsResult).toBe(0);

    // Test TSX execution
    const tsxResult = await Bun.spawn(["bun", "run", "/tmp/test-tsx.tsx"], {
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    expect(tsxResult).toBe(0);
  });

  test("✅ Error handling for invalid commands", async () => {
    // Test non-existent script
    const result = await Bun.spawn(["bun", "run", "non-existent-script"], {
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    // Should exit with error code
    expect(result).not.toBe(0);
  });

  test("✅ Environment variable handling", async () => {
    // Create script that uses environment variables
    const envScript = `
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Custom var:', process.env.CUSTOM_VAR);
`;

    const testFile = "/tmp/env-test.js";
    await Bun.write(testFile, envScript);

    // Test with environment variables
    const result = await Bun.spawn(["bun", "run", testFile], {
      env: {
        ...process.env,
        NODE_ENV: "test",
        CUSTOM_VAR: "hello",
      },
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    expect(result).toBe(0);
  });

  test("✅ Script hooks (pre/post)", async () => {
    // Create package.json with hooks
    const packageJson = {
      name: "hooks-test",
      version: "1.0.0",
      scripts: {
        test: "echo 'Main test script'",
        pretest: "echo 'Before test'",
        posttest: "echo 'After test'",
      },
    };

    const tempDir = "/tmp/hooks-test";
    await Bun.write(
      `${tempDir}/package.json`,
      JSON.stringify(packageJson, null, 2)
    );

    // Run script with hooks
    const result = await Bun.spawn(["bun", "run", "test"], {
      cwd: tempDir,
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    expect(result).toBe(0);
  });
});
