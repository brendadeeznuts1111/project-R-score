#!/usr/bin/env bun
import { buildOddsDataset } from "./routes/crc32-archive";
import { configManager } from "./workers/crc32-config";

async function main() {
  const args = process.argv.slice(2);
  const format =
    args.find((arg) => arg.startsWith("--format="))?.split("=")[1] || "tar.gz";
  const output =
    args.find((arg) => arg.startsWith("--output="))?.split("=")[1] ||
    `crc32-benchmark-${Date.now()}.${format.split(".").pop()}`;
  const level = parseInt(
    args.find((arg) => arg.startsWith("--level="))?.split("=")[1] || "9"
  );

  console.info("🚀 Generating CRC32 benchmark archive...");
  console.info(`📦 Format: ${format}`);
  console.info(`📊 Compression level: ${level}`);
  console.info(`💾 Output: ${output}`);

  try {
    await configManager.loadConfig();
    const config = configManager.getConfig();

    if (
      !(config as unknown as Record<string, boolean>).features?.archiveOutput
    ) {
      console.error("❌ Archive output is disabled in config");
      process.exit(1);
    }

    const { files, manifest } = await buildOddsDataset();

    console.info(`📁 Generated ${manifest.fileCount} benchmark files`);
    console.info(`📏 Total size: ${(manifest.totalSize / 1024).toFixed(2)} KB`);

    const archive = new Bun.Archive(files, {
      compress: format.includes("gz") ? "gzip" : "none",
      level: Math.max(1, Math.min(12, level)),
    });

    const bytes = await archive.bytes();
    const crc32 = Bun.hash.crc32(bytes);

    await Bun.write(output, bytes);

    console.info(`✅ Archive saved: ${output}`);
    console.info(`🔒 Archive CRC32: ${crc32.toString(16).padStart(8, "0")}`);
    console.info(
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
    console.info(`📋 Manifest saved: ${manifestOutput}`);
  } catch (error) {
    console.error("❌ Failed to generate archive:", error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
