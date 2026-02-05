#!/usr/bin/env bun
// [1.0.0.0] Versioned Build Script - Bun Native
// Builds with version management, metadata, and archiving
// Usage: bun run scripts/build-versioned.ts [--archive] [--metadata=value]

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { BuildVersionGenerator, VersionManager } from "../src/version";

interface BuildOptions {
  archive: boolean;
  metadata?: string;
  outdir: string;
  versionFile: string;
}

/**
 * [1.1.0.0] Parse command line arguments
 */
function parseArgs(): BuildOptions {
  const args = Bun.argv.slice(2);
  const options: BuildOptions = {
    archive: args.includes("--archive"),
    metadata: args.find((a) => a.startsWith("--metadata="))?.split("=")[1],
    outdir: "dist",
    versionFile: "dist/version.ts",
  };

  return options;
}

/**
 * [1.2.0.0] Generate version files
 */
async function generateVersionFiles(
  outdir: string,
  metadata?: string
): Promise<string> {
  // Set build metadata if provided
  if (metadata) {
    process.env.BUILD_METADATA = metadata;
  }

  const version = VersionManager.getFullVersion();
  console.log(`📦 Building version: ${version}`);

  // Create output directory
  await mkdir(outdir, { recursive: true });

  // Generate version.ts
  const versionTs = BuildVersionGenerator.generateConstant();
  await writeFile(join(outdir, "version.ts"), versionTs);
  console.log(`✅ Generated: ${outdir}/version.ts`);

  // Generate version.json
  const versionJson = BuildVersionGenerator.generateJSON();
  await writeFile(join(outdir, "version.json"), versionJson);
  console.log(`✅ Generated: ${outdir}/version.json`);

  // Generate version header
  const header = BuildVersionGenerator.generateHeader();
  console.log(header);

  return version;
}

/**
 * [1.3.0.0] Run Bun build
 */
async function runBuild(outdir: string): Promise<void> {
  console.log("\n🔨 Running Bun build...");

  const result = await Bun.build({
    entrypoints: ["./src/index.ts"],
    outdir,
    target: "bun",
    minify: true,
    sourcemap: "linked",
  });

  if (!result.success) {
    console.error("❌ Build failed");
    for (const log of result.logs) {
      console.error(log);
    }
    process.exit(1);
  }

  console.log("✅ Build completed successfully");
  for (const output of result.outputs) {
    console.log(`   📄 ${output.path}`);
  }
}

/**
 * [1.4.0.0] Create versioned archive
 */
async function createArchive(
  outdir: string,
  version: string
): Promise<void> {
  const archiveDir = "archives";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const archiveName = `build-${version.replace(/\+/g, "-")}-${timestamp}`;
  const archivePath = join(archiveDir, archiveName);

  await mkdir(archivePath, { recursive: true });

  console.log(`\n📦 Creating archive: ${archivePath}`);

  // Copy dist files to archive
  const distFiles = await Bun.glob("**/*", { cwd: outdir });
  for (const file of distFiles) {
    const src = join(outdir, file);
    const dst = join(archivePath, file);
    await mkdir(join(archivePath, file.split("/").slice(0, -1).join("/")), {
      recursive: true,
    });
    const content = await Bun.file(src).bytes();
    await writeFile(dst, content);
  }

  // Create manifest
  const manifest = {
    version,
    timestamp: new Date().toISOString(),
    archivePath,
    files: Array.from(distFiles),
  };

  await writeFile(
    join(archivePath, "MANIFEST.json"),
    JSON.stringify(manifest, null, 2)
  );

  console.log(`✅ Archive created: ${archivePath}`);
  console.log(`   📊 Files: ${distFiles.length}`);
}

/**
 * [1.5.0.0] Main build function
 */
async function main(): Promise<void> {
  const options = parseArgs();

  console.log("🚀 Versioned Build System");
  console.log("========================\n");

  try {
    // Generate version files
    const version = await generateVersionFiles(options.outdir, options.metadata);

    // Run build
    await runBuild(options.outdir);

    // Create archive if requested
    if (options.archive) {
      await createArchive(options.outdir, version);
    }

    console.log("\n✅ Build completed successfully!");
    console.log(`   Version: ${version}`);
    console.log(`   Output: ${options.outdir}`);
  } catch (error) {
    console.error("❌ Build failed:", error);
    process.exit(1);
  }
}

main();

