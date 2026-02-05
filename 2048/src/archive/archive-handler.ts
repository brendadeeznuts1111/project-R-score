import { configManager } from "../workers/crc32-config";

interface ArchiveDataset {
  files: Record<string, Uint8Array>;
  manifest: {
    version: string;
    timestamp: string;
    totalSize: number;
    fileCount: number;
    checksums: Record<string, string>;
  };
}

interface ArchiveOptions {
  format?: "tar" | "tar.gz" | "gz";
  level?: number;
  algorithms?: string[];
  sizes?: number[];
}

interface ArchiveResult {
  success: boolean;
  filename?: string;
  size: number;
  originalSize: number;
  crc32: string;
  entries: number;
  duration: number;
  error?: string;
}

export async function buildOddsDataset(
  options: ArchiveOptions = {},
): Promise<ArchiveDataset> {
  const config = configManager.getConfig();
  const files: Record<string, Uint8Array> = {};
  const checksums: Record<string, string> = {};

  const sizes = options.sizes || [1024, 16384, 65536, 262144, 1048576];
  const algorithms = options.algorithms || [
    "odds",
    "evens",
    "primes",
    "fibonacci",
  ];

  for (const size of sizes) {
    for (const algo of algorithms) {
      const filename = `benchmark-${algo}-${size}B.bin`;
      const data = generateBenchmarkData(algo, size);
      const crc32 = Bun.hash.crc32(data);

      files[filename] = data;
      checksums[filename] = crc32.toString(16).padStart(8, "0");
    }
  }

  const manifest = {
    version: config.version,
    timestamp: new Date().toISOString(),
    totalSize: Object.values(files).reduce((sum, buf) => sum + buf.length, 0),
    fileCount: Object.keys(files).length,
    checksums,
  };

  files["manifest.json"] = new TextEncoder().encode(
    JSON.stringify(manifest, null, 2),
  );

  // Use Bun's fast JSON serialization for console output
  if (process.env.NODE_ENV !== "production") {
    console.log("%j", manifest); // 3x faster JSON serialization in Bun v1.3.6
  }

  return { files, manifest };
}

export async function createArchive(
  options: ArchiveOptions = {},
): Promise<ArchiveResult> {
  const start = performance.now();
  const format = options.format || "tar.gz";
  const level = options.level || 9;

  try {
    const { files, manifest } = await buildOddsDataset(options);

    const archive = new Bun.Archive(files, {
      compress: format.includes("gz") ? "gzip" : "none",
      level: Math.max(1, Math.min(12, level)),
    });

    const bytes = await archive.bytes();
    const archiveCrc32 = Bun.hash.crc32(bytes);
    const duration = performance.now() - start;

    return {
      success: true,
      filename: `crc32-benchmark-${Date.now()}.${format.split(".").pop()}`,
      size: bytes.length,
      originalSize: manifest.totalSize,
      crc32: archiveCrc32.toString(16).padStart(8, "0"),
      entries: manifest.fileCount,
      duration,
    };
  } catch (error) {
    return {
      success: false,
      size: 0,
      originalSize: 0,
      crc32: "",
      entries: 0,
      duration: performance.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function handleArchiveRequest(req: Request): Promise<Response> {
  const config = configManager.getConfig();

  if (!config.features.archiveOutput) {
    return new Response("Archive output is disabled", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "tar.gz";
  const level = parseInt(searchParams.get("level") || "9");

  try {
    const result = await createArchive({ format, level });

    if (!result.success) {
      return new Response(result.error || "Archive generation failed", {
        status: 500,
      });
    }

    const { files } = await buildOddsDataset();
    const manifestFile = files["manifest.json"];
    const archive = new Bun.Archive(files, {
      compress: format.includes("gz") ? "gzip" : "none",
      level: Math.max(1, Math.min(12, level)),
    });
    const bytes = await archive.bytes();

    return new Response(bytes, {
      headers: {
        "Content-Type":
          format === "tar" ? "application/x-tar" : "application/gzip",
        "X-CRC32": result.crc32,
        "X-Archive-Entries": result.entries.toString(),
        "X-Archive-Size": result.size.toString(),
        "X-Original-Size": result.originalSize.toString(),
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Archive generation failed:", error);
    return new Response("Failed to generate archive", { status: 500 });
  }
}

function generateBenchmarkData(algorithm: string, size: number): Uint8Array {
  const buffer = new Uint8Array(size);

  switch (algorithm) {
    case "odds":
      for (let i = 0; i < size; i++) {
        buffer[i] = i % 2 === 1 ? i % 256 : 0;
      }
      break;
    case "evens":
      for (let i = 0; i < size; i++) {
        buffer[i] = i % 2 === 0 ? i % 256 : 0;
      }
      break;
    case "primes":
      for (let i = 0; i < size; i++) {
        buffer[i] = isPrime(i) ? i % 256 : 0;
      }
      break;
    case "fibonacci":
      let a = 0,
        b = 1;
      for (let i = 0; i < size; i++) {
        buffer[i] = b % 256;
        [a, b] = [b, (a + b) % 256];
      }
      break;
    default:
      crypto.getRandomValues(buffer);
  }

  return buffer;
}

function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}

interface CliArgs {
  format?: string;
  level?: number;
  algorithms?: string;
  sizes?: string;
  help?: boolean;
}

function parseArgs(): CliArgs {
  const args: CliArgs = {};
  const rawArgs = process.argv.slice(2);

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    const next = rawArgs[i + 1];

    switch (arg) {
      case "-f":
      case "--format":
        if (next) {
          args.format = next;
          i++;
        }
        break;
      case "-l":
      case "--level":
        if (next) {
          args.level = parseInt(next);
          i++;
        }
        break;
      case "-a":
      case "--algorithms":
        if (next) {
          args.algorithms = next;
          i++;
        }
        break;
      case "-s":
      case "--sizes":
        if (next) {
          args.sizes = next;
          i++;
        }
        break;
      case "-h":
      case "--help":
        args.help = true;
        break;
    }
  }

  return args;
}

function printHelp() {
  console.log(`
Archive Generator CLI

Usage: bun run src/archive/archive-handler.ts [options]

Options:
  -f, --format <format>    Archive format: tar, tar.gz, gz (default: tar.gz)
  -l, --level <1-12>       Compression level 1-12 (default: 9)
  -a, --algorithms <list>   Comma-separated algorithms (default: odds,evens,primes,fibonacci)
  -s, --sizes <list>       Comma-separated sizes in bytes (default: 1024,16384,65536,262144,1048576)
  -h, --help               Show this help message

Examples:
  bun run src/archive/archive-handler.ts --format tar.gz --level 6
  bun run src/archive/archive-handler.ts -a odds,primes -s 1024,65536
`);
}

async function main() {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const format = (args.format as ArchiveOptions["format"]) || "tar.gz";
  const level = args.level || 9;
  const algorithms = args.algorithms?.split(",") || [
    "odds",
    "evens",
    "primes",
    "fibonacci",
  ];
  const sizes = args.sizes?.split(",").map(Number) || [
    1024, 16384, 65536, 262144, 1048576,
  ];

  console.log("🚀 Generating CRC32 Benchmark Archive");
  console.log(`📦 Format: ${format}`);
  console.log(`📊 Compression Level: ${level}`);
  console.log(`🔢 Algorithms: ${algorithms.join(", ")}`);
  console.log(`💾 Sizes: ${sizes.map((s) => `${s}B`).join(", ")}`);
  console.log("");

  const result = await createArchive({ format, level, algorithms, sizes });

  if (result.success) {
    console.log("✅ Archive created successfully!");
    console.log(`   Filename: ${result.filename}`);
    console.log(`   Size: ${(result.size / 1024).toFixed(2)} KB`);
    console.log(`   Original: ${(result.originalSize / 1024).toFixed(2)} KB`);
    console.log(
      `   Ratio: ${((result.size / result.originalSize) * 100).toFixed(1)}%`,
    );
    console.log(`   CRC32: 0x${result.crc32}`);
    console.log(`   Entries: ${result.entries}`);
    console.log(`   Duration: ${result.duration.toFixed(2)}ms`);
  } else {
    console.log(`❌ Archive creation failed: ${result.error}`);
    process.exit(1);
  }
}

export { buildOddsDataset, createArchive, handleArchiveRequest, main };

if (import.meta.main) {
  main();
}
