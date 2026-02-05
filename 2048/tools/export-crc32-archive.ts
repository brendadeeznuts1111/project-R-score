#!/usr/bin/env bun
import { buildOddsDataset } from "../routes/crc32-archive";
import { configManager } from "../workers/crc32-config";

interface CliArgs {
  format?: string;
  level?: string;
  output?: string;
  help?: boolean;
}

async function main() {
  const args = Bun.argv.slice(2);
  const flags: CliArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--format=")) flags.format = arg.split("=")[1];
    else if (arg.startsWith("--level=")) flags.level = arg.split("=")[1];
    else if (arg.startsWith("--output=")) flags.output = arg.split("=")[1];
    else if (arg === "--help" || arg === "-h") flags.help = true;
  }

  if (flags.help) {
    console.log(`
CRC32 Archive Export Tool
=========================

Usage: bun run tools/export-crc32-archive.ts [options]

Options:
  --format=<format>   Archive format: tar.gz, tar.gz, tar (default: tar.gz)
  --level=<1-12>      Compression level 1-12 (default: 9)
  --output=<file>     Output filename (default: crc32-benchmark-{timestamp}.{ext})
  --help, -h          Show this help message

Examples:
  bun run tools/export-crc32-archive.ts
  bun run tools/export-crc32-archive.ts --format=tar --level=1 --output=fast.tar
  bun run tools/export-crc32-archive.ts --format=tar.gz --level=12 --output=max.tar.gz

API Access:
  curl -o benchmark.tar.gz "http://localhost:3000/crc32/archive?format=tar.gz&level=9"
`);
    return;
  }

  const format = flags.format || "tar.gz";
  const level = parseInt(flags.level || "9");
  const ext = format.split(".").pop() || "gz";
  const output = flags.output || `crc32-benchmark-${Date.now()}.${ext}`;

  console.log("🚀 Generating CRC32 benchmark archive...");
  console.log(`📦 Format: ${format}`);
  console.log(`📊 Compression level: ${level}`);
  console.log(`💾 Output: ${output}`);

  try {
    await configManager.loadConfig();
    const config = configManager.getConfig();

    if (!config.features.archiveOutput) {
      console.error("❌ Archive output is disabled in config");
      process.exit(1);
    }

    const { files, manifest } = await buildOddsDataset();

    console.log(`📁 Generated ${manifest.fileCount} benchmark files`);
    console.log(`📏 Total size: ${(manifest.totalSize / 1024).toFixed(2)} KB`);

    const archiveOptions: Record<string, unknown> = {
      level: Math.max(1, Math.min(12, level)),
    };

    if (format.includes("gz")) {
      archiveOptions.compress = "gzip";
    }

    const archive = new Bun.Archive(files, archiveOptions);

    const bytes = await archive.bytes();
    const crc32 = Bun.hash.crc32(bytes);

    await Bun.write(output, bytes);

    console.log(`✅ Archive saved: ${output}`);
    console.log(`🔒 Archive CRC32: ${crc32.toString(16).padStart(8, "0")}`);
    console.log(
      `📉 Compression ratio: ${(
        ((manifest.totalSize - bytes.length) / manifest.totalSize) *
        100
      ).toFixed(1)}%`
    );

    const manifestOutput = output.replace(
      /\.(tar|tar\.gz|tgz)$/,
      ".manifest.json"
    );
    await Bun.write(manifestOutput, JSON.stringify(manifest, null, 2));
    console.log(`📋 Manifest saved: ${manifestOutput}`);
  } catch (error) {
    console.error("❌ Failed to generate archive:", error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
