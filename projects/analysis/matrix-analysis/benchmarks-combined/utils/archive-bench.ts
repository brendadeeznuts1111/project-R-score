// scripts/bench/archive-bench.ts - Bun.Archive creation benchmark
const FILE_COUNT = 100;

async function benchArchive() {
  console.log("Bun v1.3.6 Archive Benchmark\n");

  // Generate test files in memory
  const files: Record<string, string> = {};
  for (let i = 0; i < FILE_COUNT; i++) {
    files[`file-${i.toString().padStart(3, "0")}.txt`] = `Content for file ${i}\n`.repeat(100);
  }

  // Benchmark archive creation
  const createTimes: number[] = [];
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    const archive = new Bun.Archive(files);
    createTimes.push(performance.now() - start);
  }

  // Benchmark gzip archive creation
  const gzipTimes: number[] = [];
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    const archive = new Bun.Archive(files, { compress: "gzip" });
    gzipTimes.push(performance.now() - start);
  }

  // Write archive to disk
  const archive = new Bun.Archive(files, { compress: "gzip" });
  await Bun.write("/tmp/bench-archive.tar.gz", archive);
  const archiveSize = (await Bun.file("/tmp/bench-archive.tar.gz").arrayBuffer()).byteLength;

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const totalSize = Object.values(files).reduce((sum, content) => sum + content.length, 0);

  const results = [
    {
      Operation: "Create tar (uncompressed)",
      Files: FILE_COUNT,
      Time: `${avg(createTimes).toFixed(2)} ms`,
      "Input Size": `${(totalSize / 1024).toFixed(1)} KB`,
    },
    {
      Operation: "Create tar.gz (gzip)",
      Files: FILE_COUNT,
      Time: `${avg(gzipTimes).toFixed(2)} ms`,
      "Input Size": `${(totalSize / 1024).toFixed(1)} KB`,
    },
  ];

  console.log(Bun.inspect.table(results, { colors: true }));
  console.log(`\nCompression: ${totalSize} bytes → ${archiveSize} bytes (${((1 - archiveSize/totalSize) * 100).toFixed(1)}% reduction)`);
  console.log("Archive written to: /tmp/bench-archive.tar.gz");
}

benchArchive();
