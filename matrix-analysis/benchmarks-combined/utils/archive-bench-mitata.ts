/**
 * Archive Benchmark using Mitata
 * Tests tar/tar.gz creation performance
 * 
 * Based on Bun's benchmark structure: https://github.com/oven-sh/bun/tree/main/bench
 */

import { bench, group, run } from "./utils";

const FILE_COUNT = 100;

// Generate test files in memory (matching original implementation)
const files: Record<string, string> = {};
for (let i = 0; i < FILE_COUNT; i++) {
  files[`file-${i.toString().padStart(3, "0")}.txt`] = `Content for file ${i}\n`.repeat(100);
}

group("Archive Creation Performance", () => {
  bench("Create tar (uncompressed)", () => {
    const archive = new Bun.Archive(files);
    return archive;
  });

  bench("Create tar.gz (gzip)", () => {
    const archive = new Bun.Archive(files, { compress: "gzip" });
    return archive;
  });
});

await run();
