import { test, describe, expect, beforeEach, afterAll } from "bun:test";
import { $ } from "bun";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "parallel-scripts-"));
  await Bun.write(
    join(tempDir, "package.json"),
    JSON.stringify({
      scripts: {
        "build:app": "echo 'Building app' && sleep 0.1",
        "build:lib": "echo 'Building lib' && sleep 0.2",
        "test:unit": "echo 'Testing unit'",
        "test:e2e": "echo 'Testing e2e' && sleep 0.1",
        lint: "echo 'Linting'",
        clean: "echo 'Cleaning'",
      },
    }),
  );
});

afterAll(async () => {
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
});

describe("bun run --parallel and --sequential", () => {
  test("--parallel runs concurrently (faster than sequential)", async () => {
    const parallelStart = performance.now();
    await $`cd ${tempDir} && bun run --parallel build:app build:lib`.quiet();
    const parallelTime = performance.now() - parallelStart;

    const sequentialStart = performance.now();
    await $`cd ${tempDir} && bun run --sequential build:app build:lib`.quiet();
    const sequentialTime = performance.now() - sequentialStart;

    // Parallel should be noticeably faster since build:app (0.1s) and build:lib (0.2s)
    // run concurrently (~0.2s) vs sequentially (~0.3s)
    expect(parallelTime).toBeLessThan(sequentialTime * 0.9);
  });

  test("--sequential stops at first error", async () => {
    await Bun.write(
      join(tempDir, "package.json"),
      JSON.stringify({
        scripts: {
          step1: "echo 'Step 1'",
          step2: "exit 1",
          step3: "echo 'Step 3'",
        },
      }),
    );

    const result = await $`cd ${tempDir} && bun run --sequential step1 step2 step3`
      .nothrow()
      .quiet();

    expect(result.exitCode).not.toBe(0);
    const output = result.stdout.toString();
    expect(output).toContain("Step 1");
    expect(output).not.toContain("Step 3");
  });

  test("--parallel with glob pattern matching", async () => {
    const result = await $`cd ${tempDir} && bun run --parallel "build:*"`.quiet();
    const output = result.stdout.toString();

    // Both build scripts should have run
    expect(output).toContain("Building app");
    expect(output).toContain("Building lib");
  });

  test("--parallel with --no-exit-on-error collects all results", async () => {
    await Bun.write(
      join(tempDir, "package.json"),
      JSON.stringify({
        scripts: {
          ok: "echo 'success'",
          fail: "exit 1",
        },
      }),
    );

    // --no-exit-on-error lets all scripts finish even if one fails
    const result = await $`cd ${tempDir} && bun run --parallel --no-exit-on-error ok fail`
      .nothrow()
      .quiet();

    const output = result.stdout.toString();
    expect(output).toContain("success");
    // Overall exit code is non-zero because "fail" exited 1
    expect(result.exitCode).not.toBe(0);
  });

  test("--sequential preserves execution order", async () => {
    await Bun.write(
      join(tempDir, "package.json"),
      JSON.stringify({
        scripts: {
          a: "echo 'first'",
          b: "echo 'second'",
          c: "echo 'third'",
        },
      }),
    );

    const result = await $`cd ${tempDir} && bun run --sequential a b c`.quiet();
    const output = result.stdout.toString();

    const firstIdx = output.indexOf("first");
    const secondIdx = output.indexOf("second");
    const thirdIdx = output.indexOf("third");

    expect(firstIdx).toBeLessThan(secondIdx);
    expect(secondIdx).toBeLessThan(thirdIdx);
  });
});
