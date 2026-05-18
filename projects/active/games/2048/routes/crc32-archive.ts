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

export async function buildOddsDataset(): Promise<ArchiveDataset> {
  const config = configManager.getConfig();
  const files: Record<string, Uint8Array> = {};
  const checksums: Record<string, string> = {};

  const sizes = [1024, 16384, 65536, 262144, 1048576];
  const algorithms = ["odds", "evens", "primes", "fibonacci"];

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
    JSON.stringify(manifest, null, 2)
  );

  return { files, manifest };
}

export async function handleArchiveRequest(req: Request): Promise<Response> {
  const config = configManager.getConfig();

  if (!config.features.archiveOutput) {
    return new Response("Archive output is disabled", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "tar.gz";
  const level = parseInt(searchParams.get("level") || "9");
  const includeManifest = searchParams.get("manifest") !== "false";

  try {
    const { files, manifest } = await buildOddsDataset();

    const archive = new Bun.Archive(files, {
      compress: format.includes("gz") ? "gzip" : "none",
      level: Math.max(1, Math.min(12, level)),
    });

    const bytes = await archive.bytes();
    const archiveCrc32 = Bun.hash.crc32(bytes);

    return new Response(bytes, {
      headers: {
        "Content-Type":
          format === "tar" ? "application/x-tar" : "application/gzip",
        "X-CRC32": archiveCrc32.toString(16).padStart(8, "0"),
        "X-Archive-Entries": manifest.fileCount.toString(),
        "X-Archive-Size": bytes.length.toString(),
        "X-Original-Size": manifest.totalSize.toString(),
        "Content-Disposition": `attachment; filename="crc32-benchmark-${Date.now()}.${format
          .split(".")
          .pop()}"`,
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
