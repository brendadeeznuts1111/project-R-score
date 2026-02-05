/**
 * Spawn Benchmark using Mitata
 * Bun.spawn() vs Bun.spawnSync() performance
 * Fixed 30x slowdown on Linux ARM64 in Bun 1.3.6+
 * 
 * Based on Bun's benchmark structure: https://github.com/oven-sh/bun/tree/main/bench
 */

import { bench, group, run } from "./utils";

group("Bun.spawnSync (fd limit optimization - Linux ARM64 fix)", () => {
  bench("Bun.spawn() async", async () => {
    const proc = Bun.spawn(["echo", "test"], { stdout: "pipe" });
    await proc.exited;
  });

  bench("Bun.spawnSync()", () => {
    Bun.spawnSync(["echo", "test"]);
  });
});

await run();
